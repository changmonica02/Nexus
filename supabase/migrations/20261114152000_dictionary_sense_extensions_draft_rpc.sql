-- B2 atomic draft persistence and reader support. Requires the additive B2 schema.
begin;
create function public.dictionary_apply_sense_extensions(eid uuid,d jsonb,allow_edits boolean)
returns boolean language plpgsql security definer set search_path='' as $$
declare r jsonb; prior public.dictionary_sense_derivations; ex public.dictionary_examples;
  ids uuid[]:='{}'; rid uuid; modified boolean:=false; translated text; linked uuid;
begin
 if not public.is_dictionary_admin() then raise exception 'Dictionary admin required';end if;
 if jsonb_typeof(d->'derivations') is distinct from 'array' then raise exception 'Invalid derivations array';end if;
 if not exists(select 1 from public.dictionary_entries where id=eid and kind='word' and status='draft')
 then raise exception 'Sense extensions require a Word draft';end if;
 for r in select value from jsonb_array_elements(d->'derivations') loop
  if r->>'entry_id' is distinct from eid::text or
     exists(select 1 from jsonb_object_keys(r) k where k not in ('id','entry_id','sense_id','gloss_zh_tw','sort_order','revision')) or
     nullif(btrim(r->>'gloss_zh_tw'),'') is null or
     jsonb_typeof(r->'sort_order') is distinct from 'number'
  then raise exception 'Invalid derivation';end if;
  rid:=(r->>'id')::uuid;
  if rid=any(ids) then raise exception 'Duplicate derivation ID';end if;
  ids:=array_append(ids,rid);
  if not exists(select 1 from public.dictionary_senses where entry_id=eid and id=(r->>'sense_id')::uuid)
  then raise exception 'Unknown derivation Sense';end if;
  select * into prior from public.dictionary_sense_derivations where id=rid for update;
  if found then
   if prior.entry_id<>eid or prior.sense_id<>(r->>'sense_id')::uuid
   then raise exception 'Derivation ownership immutable';end if;
   if prior.gloss_zh_tw is distinct from r->>'gloss_zh_tw' or prior.sort_order is distinct from (r->>'sort_order')::integer then
    if not allow_edits or prior.revision is distinct from (r->>'revision')::bigint then raise exception 'Derivation revision conflict';end if;
    update public.dictionary_sense_derivations
     set gloss_zh_tw=r->>'gloss_zh_tw',sort_order=(r->>'sort_order')::integer,revision=revision+1,updated_at=now()
     where id=rid;
    modified:=true;
   end if;
  else
   insert into public.dictionary_sense_derivations(id,entry_id,sense_id,gloss_zh_tw,sort_order)
    values(rid,eid,(r->>'sense_id')::uuid,r->>'gloss_zh_tw',(r->>'sort_order')::integer);
   modified:=true;
  end if;
 end loop;
 for r in select value from jsonb_array_elements(coalesce(d->'examples','[]'::jsonb)) loop
  if r ? 'translation_zh_tw' or r ? 'derivation_id' then
   select * into ex from public.dictionary_examples where id=(r->>'id')::uuid and entry_id=eid for update;
   if not found or ex.sense_id is distinct from (r->>'sense_id')::uuid
   then raise exception 'Example Sense ownership mismatch';end if;
   if (r ? 'translation_zh_tw' and jsonb_typeof(r->'translation_zh_tw') not in ('string','null'))
     or (r ? 'derivation_id' and jsonb_typeof(r->'derivation_id') not in ('string','null'))
   then raise exception 'Invalid bilingual Example fields';end if;
   translated:=case when r ? 'translation_zh_tw' then r->>'translation_zh_tw' else ex.translation_zh_tw end;
   linked:=case when r ? 'derivation_id' then nullif(r->>'derivation_id','')::uuid else ex.derivation_id end;
   if ex.translation_zh_tw is distinct from translated or ex.derivation_id is distinct from linked then
    update public.dictionary_examples set translation_zh_tw=translated,derivation_id=linked,
     revision=revision+1,updated_at=now() where id=ex.id;
    modified:=true;
   end if;
  end if;
 end loop;
 if coalesce((d->>'replace_editor_children')::boolean,false) then
  if not allow_edits then raise exception 'Derivation replacement requires editor save';end if;
  if exists(select 1 from public.dictionary_sense_derivations where entry_id=eid and not(id=any(ids))) then modified:=true;end if;
  -- Foreign keys RESTRICT deletion of still-linked derivations.
  delete from public.dictionary_sense_derivations where entry_id=eid and not(id=any(ids));
 end if;
 return modified;
end $$;
revoke all on function public.dictionary_apply_sense_extensions(uuid,jsonb,boolean) from public,anon,authenticated;

do $patch$
declare f text;
begin
 f:=pg_get_functiondef('public.apply_dictionary_drafts(jsonb,boolean,boolean)'::regprocedure);
 if strpos(f,'declare d jsonb;')=0
    or strpos(f,'d:=public.dictionary_current_morphology_json(d);b:=d->''bundle'';')=0
    or strpos(f,'  if d ? ''component_order'' then')=0
 then raise exception 'Unexpected Draft RPC; cannot safely extend';end if;
 f:=replace(f,'declare d jsonb;','declare b2_input jsonb; d jsonb;');
 f:=replace(f,'d:=public.dictionary_current_morphology_json(d);b:=d->''bundle'';',
   'd:=public.dictionary_current_morphology_json(d);b2_input:=d;'
   ||'if d ? ''derivations'' then d:=jsonb_set(d,''{examples}'','
   ||'coalesce((select jsonb_agg(value - ''translation_zh_tw'' - ''derivation_id'') '
   ||'from jsonb_array_elements(coalesce(d->''examples'',''[]''::jsonb))),''[]''::jsonb));end if;'
   ||'b:=d->''bundle'';');
 f:=replace(f,'  if d ? ''component_order'' then',
   '  if b2_input ? ''derivations'' then '
   ||'if public.dictionary_apply_sense_extensions(eid,b2_input,allow_edits) then changed:=true;end if;'
   ||'end if;'||chr(10)||'  if d ? ''component_order'' then');
 execute f;

 f:=pg_get_functiondef('public.get_dictionary_entry(uuid)'::regprocedure);
 if strpos(f,'''inflections'',coalesce(')=0 then raise exception 'Unexpected entry RPC';end if;
 f:=replace(f,'''inflections'',coalesce(',
   '''derivations'',coalesce((select jsonb_agg(x order by x.sort_order,x.id) '
   ||'from public.dictionary_sense_derivations x where x.entry_id=entry_uuid),''[]''::jsonb),'
   ||chr(10)||'    ''inflections'',coalesce(');
 execute f;

 f:=pg_get_functiondef('public.get_published_dictionary_entry(uuid)'::regprocedure);
 if strpos(f,'''inflections'',coalesce(')=0 or
   strpos(f,'select id,entry_id,sense_id,body,sort_order from public.dictionary_examples')=0
 then raise exception 'Unexpected published reader RPC';end if;
 f:=replace(f,'''inflections'',coalesce(',
   '''derivations'',coalesce((select jsonb_agg(x order by x.sort_order,x.id) '
   ||'from (select id,entry_id,sense_id,gloss_zh_tw,sort_order from public.dictionary_sense_derivations '
   ||'where entry_id=v.id) x),''[]''::jsonb),'
   ||chr(10)||'    ''inflections'',coalesce(');
 f:=replace(f,'select id,entry_id,sense_id,body,sort_order from public.dictionary_examples',
  'select id,entry_id,sense_id,body,sort_order,translation_zh_tw,derivation_id from public.dictionary_examples');
 execute f;
end $patch$;
notify pgrst,'reload schema';
commit;
