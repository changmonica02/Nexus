-- B phase: atomic public Word note persistence for Draft and Review.
-- Depends on dictionary_public_notes and existing B2 Draft/Review patches.
begin;
create function public.dictionary_apply_public_notes(eid uuid,d jsonb,allow_edits boolean)
returns boolean language plpgsql security definer set search_path='' as $body$
declare r jsonb; old_row public.dictionary_public_notes; rid uuid; updated boolean:=false;
begin
 if not public.is_dictionary_admin() then raise exception 'Dictionary admin required';end if;
 if jsonb_typeof(d->'public_notes') is distinct from 'array'
   or jsonb_array_length(d->'public_notes')>1 then
  raise exception 'Invalid public notes array';
 end if;
 if not exists(select 1 from public.dictionary_entries e where e.id=eid and e.kind='word' and e.status='draft')
 then raise exception 'Public notes require a Word draft';end if;
 for r in select value from jsonb_array_elements(d->'public_notes') loop
  if jsonb_typeof(r) is distinct from 'object'
    or exists(select 1 from jsonb_object_keys(r) k where k not in
      ('id','entry_id','body','revision'))
    or r->>'entry_id' is distinct from eid::text
    or jsonb_typeof(r->'body') is distinct from 'string'
    or length(btrim(r->>'body'))=0 or length(r->>'body')>100000
  then raise exception 'Invalid public note content';end if;
  rid:=(r->>'id')::uuid;
  select * into old_row from public.dictionary_public_notes where id=rid for update;
  if found then
   if old_row.entry_id<>eid then raise exception 'Public note ownership immutable';end if;
   if old_row.body is distinct from r->>'body' then
    if not allow_edits or old_row.revision is distinct from (r->>'revision')::bigint
    then raise exception 'Public note revision conflict';end if;
    update public.dictionary_public_notes set body=r->>'body',revision=revision+1,updated_at=now() where id=rid;
    updated:=true;
   end if;
  else
   if exists(select 1 from public.dictionary_public_notes where entry_id=eid)
   then raise exception 'Public note stable ID cannot be replaced';end if;
   insert into public.dictionary_public_notes(id,entry_id,body) values(rid,eid,r->>'body');
   updated:=true;
  end if;
 end loop;
 if coalesce((d->>'replace_editor_children')::boolean,false) then
  if not allow_edits then raise exception 'Public note deletion requires editor save';end if;
  if jsonb_array_length(d->'public_notes')=0 then
   if exists(select 1 from public.dictionary_public_notes where entry_id=eid) then updated:=true;end if;
   delete from public.dictionary_public_notes where entry_id=eid;
  end if;
 end if;
 return updated;
end $body$;
revoke all on function public.dictionary_apply_public_notes(uuid,jsonb,boolean) from public,anon,authenticated;

do $patch$
declare f text; anchor text; injected text;
begin
 f:=pg_get_functiondef('public.apply_dictionary_drafts(jsonb,boolean,boolean)'::regprocedure);
 anchor:='  if d ? ''component_order'' then';
 if strpos(f,anchor)=0 or strpos(f,'dictionary_apply_public_notes')>0
 then raise exception 'Unexpected Draft RPC while adding public notes';end if;
 injected:='  if d ? ''public_notes'' then '
   ||'if public.dictionary_apply_public_notes(eid,d,allow_edits) then changed:=true;end if;'
   ||'end if;'||chr(10)||anchor;
 f:=replace(f,anchor,injected);
 execute f;

 f:=pg_get_functiondef('public.dictionary_snapshot_candidate(jsonb)'::regprocedure);
 anchor:='  ''pronunciations'',coalesce(';
 if strpos(f,anchor)=0 or strpos(f,'''public_notes'',coalesce(')>0
 then raise exception 'Unexpected Review snapshot candidate';end if;
 f:=replace(f,anchor,
    '  ''public_notes'',coalesce((select jsonb_agg(value-''updated_at'') '
    ||'from jsonb_array_elements(coalesce(s->''detail''->''public_notes'',''[]''::jsonb))),''[]''::jsonb),'
    ||chr(10)||anchor);
 execute f;

 f:=pg_get_functiondef('public.dictionary_overlay_candidate(jsonb,jsonb)'::regprocedure);
 anchor:='''annotations'',''inflections'',''pronunciations'',''derivations''';
 if strpos(f,anchor)=0 or strpos(f,'''public_notes''')>0
 then raise exception 'Unexpected Review candidate overlay';end if;
 f:=replace(f,anchor,'''annotations'',''inflections'',''pronunciations'',''derivations'',''public_notes''');
 execute f;

 f:=pg_get_functiondef('public.dictionary_materialize_review(uuid,jsonb)'::regprocedure);
 anchor:=' if not(c ? ''inflections'') then';
 if strpos(f,anchor)=0 or strpos(f,'dictionary_public_notes')>0 then
  raise exception 'Unexpected Review materialize RPC';
 end if;
 f:=replace(f,anchor,
   ' if c#>>''{bundle,dictionary_entries,0,kind}'' <> ''word'' then '
   ||'c:=c-''public_notes'';end if;'
   ||chr(10)||
   ' if not(c ? ''public_notes'') and c#>>''{bundle,dictionary_entries,0,kind}'' = ''word'' then '
   ||'c:=jsonb_set(c,''{public_notes}'',coalesce((select jsonb_agg(to_jsonb(n)-''updated_at'') '
   ||'from public.dictionary_public_notes n where n.entry_id=eid),''[]''::jsonb));end if;'
   ||chr(10)||anchor);
 anchor:=' perform public.apply_dictionary_drafts(jsonb_build_array(c),false,true);';
 if strpos(f,anchor)=0 then raise exception 'Unexpected Review materialize write boundary';end if;
 injected:=
   ' if c ? ''public_notes'' then '
   ||'if jsonb_typeof(c->''public_notes'') is distinct from ''array'' then '
   ||'raise exception ''Invalid Review public notes'';end if;'
   ||chr(10)||
   ' nextrows:=''[]''::jsonb;'
   ||chr(10)||
   ' for r in select value from jsonb_array_elements(c->''public_notes'') loop'
   ||chr(10)||
   '   if r->>''entry_id'' is distinct from eid::text then '
   ||'raise exception ''Review public note owner mismatch'';end if;'
   ||chr(10)||
   '   select to_jsonb(x) into current_row from public.dictionary_public_notes x '
   ||'where x.id=(r->>''id'')::uuid;'
   ||chr(10)||
   '   if current_row is not null and current_row->>''entry_id'' is distinct from eid::text '
   ||'then raise exception ''Public note stable ID belongs to another entry'';end if;'
   ||chr(10)||
   '   r:=r-''revision''-''updated_at'';'
   ||chr(10)||
   '   if current_row is not null then r:=r||jsonb_build_object(''revision'',current_row->''revision'');end if;'
   ||chr(10)||
   '   nextrows:=nextrows||jsonb_build_array(r);'
   ||chr(10)||
   ' end loop;'
   ||chr(10)||
   ' c:=jsonb_set(c,''{public_notes}'',nextrows);'
   ||chr(10)||
   ' c:=jsonb_set(c,''{replace_editor_children}'',''true''::jsonb);end if;'
   ||chr(10)||anchor;
 f:=replace(f,anchor,injected);
 execute f;
end $patch$;
notify pgrst,'reload schema';
commit;
