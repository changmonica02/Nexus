-- Route current Word bilingual examples through one atomic B2 writer.
-- The legacy example writer omits derivation_id, which is now NOT NULL.
-- Preserve the existing shared Draft/Review RPC, CAS checks and authorization.
begin;

create or replace function public.dictionary_apply_sense_extensions(eid uuid,d jsonb,allow_edits boolean)
returns boolean language plpgsql security definer set search_path='' as $$
declare
 r jsonb; prior public.dictionary_sense_derivations; ex public.dictionary_examples;
 ids uuid[]:='{}'; example_ids uuid[]:='{}'; rid uuid; sid uuid;
 modified boolean:=false; translated text; linked uuid; example_body text; ordering integer;
begin
 if not public.is_dictionary_admin() then raise exception 'Dictionary admin required';end if;
 if jsonb_typeof(d->'derivations') is distinct from 'array'
    or jsonb_typeof(coalesce(d->'examples','[]'::jsonb)) is distinct from 'array'
 then raise exception 'Invalid Sense extensions arrays';end if;
 if not exists(select 1 from public.dictionary_entries where id=eid and kind='word' and status='draft')
 then raise exception 'Sense extensions require a Word draft';end if;

 for r in select value from jsonb_array_elements(d->'derivations') loop
  if r->>'entry_id' is distinct from eid::text
     or exists(select 1 from jsonb_object_keys(r) k where k not in ('id','entry_id','sense_id','gloss_zh_tw','sort_order','revision'))
     or nullif(btrim(r->>'gloss_zh_tw'),'') is null
     or jsonb_typeof(r->'sort_order') is distinct from 'number'
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
      set gloss_zh_tw=r->>'gloss_zh_tw',sort_order=(r->>'sort_order')::integer,
          revision=revision+1,updated_at=now() where id=rid;
    modified:=true;
   end if;
  else
   insert into public.dictionary_sense_derivations(id,entry_id,sense_id,gloss_zh_tw,sort_order)
    values(rid,eid,(r->>'sense_id')::uuid,r->>'gloss_zh_tw',(r->>'sort_order')::integer);
   modified:=true;
  end if;
 end loop;

 -- Unlike the retired writer, new examples are inserted with their required link.
 for r in select value from jsonb_array_elements(coalesce(d->'examples','[]'::jsonb)) loop
  if r->>'entry_id' is distinct from eid::text
     or exists(select 1 from jsonb_object_keys(r) k
       where k not in ('id','entry_id','sense_id','body','sort_order','revision','translation_zh_tw','derivation_id'))
     or nullif(btrim(r->>'body'),'') is null
     or (r ? 'translation_zh_tw' and jsonb_typeof(r->'translation_zh_tw') not in ('string','null'))
     or jsonb_typeof(r->'derivation_id') is distinct from 'string'
     or (r ? 'sort_order' and jsonb_typeof(r->'sort_order') is distinct from 'number')
  then raise exception 'Invalid bilingual Example fields';end if;
  rid:=(r->>'id')::uuid;
  sid:=(r->>'sense_id')::uuid;
  linked:=(r->>'derivation_id')::uuid;
  if rid=any(example_ids) then raise exception 'Duplicate example ID';end if;
  example_ids:=array_append(example_ids,rid);
  if not linked=any(ids) or not exists(
    select 1 from public.dictionary_sense_derivations
     where id=linked and entry_id=eid and sense_id=sid)
  then raise exception 'Example must link a derivation of the same Word and Sense';end if;
  translated:=r->>'translation_zh_tw';
  example_body:=r->>'body';
  ordering:=coalesce((r->>'sort_order')::integer,0);
  select * into ex from public.dictionary_examples where id=rid for update;
  if found then
   if ex.entry_id<>eid or ex.sense_id is distinct from sid
      or ex.derivation_id is distinct from linked
   then raise exception 'Example ownership immutable';end if;
   if ex.body is distinct from example_body
      or ex.translation_zh_tw is distinct from translated
      or ex.sort_order is distinct from ordering then
    if not allow_edits or ex.revision is distinct from (r->>'revision')::bigint
    then raise exception 'Example revision conflict';end if;
    update public.dictionary_examples
      set body=example_body,translation_zh_tw=translated,sort_order=ordering,
          revision=revision+1,updated_at=now() where id=rid;
    modified:=true;
   end if;
  else
   insert into public.dictionary_examples(id,entry_id,sense_id,derivation_id,body,translation_zh_tw,sort_order)
    values(rid,eid,sid,linked,example_body,translated,ordering);
   modified:=true;
  end if;
 end loop;

 if coalesce((d->>'replace_editor_children')::boolean,false) then
  if not allow_edits then raise exception 'Derivation replacement requires editor save';end if;
  if exists(select 1 from public.dictionary_sense_derivations where entry_id=eid and not(id=any(ids)))
  then modified:=true;end if;
  -- The parent RPC has already removed omitted examples; RESTRICT remains in force.
  delete from public.dictionary_sense_derivations where entry_id=eid and not(id=any(ids));
 end if;
 return modified;
end $$;

do $patch$
declare f text; target text; replacement text;
begin
 f:=pg_get_functiondef('public.apply_dictionary_drafts(jsonb,boolean,boolean)'::regprocedure);
 target:='foreach tbl in array array[''dictionary_examples'',''dictionary_lexical_annotations'',''dictionary_pronunciations''] loop';
 replacement:='foreach tbl in array (case when b2_input ? ''derivations'' then '
    ||'array[''dictionary_lexical_annotations'',''dictionary_pronunciations''] '
    ||'else array[''dictionary_examples'',''dictionary_lexical_annotations'',''dictionary_pronunciations''] end) loop';
 if strpos(f,'declare b2_input jsonb;')=0
    or strpos(f,'public.dictionary_apply_sense_extensions(eid,b2_input,allow_edits)')=0
    or strpos(f,target)=0
 then raise exception 'Unexpected Draft RPC layout; refusing unsafe replacement';end if;
 f:=replace(f,target,replacement);
 -- After removed Examples are deleted but before removed Senses are deleted,
 -- remove omitted Derivations. Otherwise their RESTRICT FK blocks Sense deletion.
 target:='execute format(''delete from public.%I where entry_id=$1 and not(id in(select (x->>''''id'''')::uuid from jsonb_array_elements($2) x))'',tbl)';
 replacement:='if tbl=''dictionary_senses'' and b2_input ? ''derivations'' then '
    ||'delete from public.dictionary_sense_derivations x where x.entry_id=eid '
    ||'and not exists(select 1 from jsonb_array_elements(b2_input->''derivations'') v '
    ||'where (v->>''id'')::uuid=x.id);end if;'||chr(10)||target;
 if strpos(f,target)=0 then raise exception 'Unexpected Draft deletion loop';end if;
 f:=replace(f,target,replacement);
 execute f;
end $patch$;
commit;
