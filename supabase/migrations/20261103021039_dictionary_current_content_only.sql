-- Refs #128. Irreversible content-history retirement; no production execution here.
-- Apply after the 20261021 dictionary migrations. Old RPC callers keep current
-- read/edit/publish semantics; a committed review is deleted, never archived.
begin;
set local lock_timeout='5s';
set local statement_timeout='120s';
select pg_advisory_xact_lock(710,1);
lock table public.dictionary_entries,public.dictionary_senses,public.dictionary_relations,
 public.dictionary_etymologies,public.dictionary_learning_notes,public.dictionary_review_drafts,
 public.dictionary_import_operations in share row exclusive mode;

create table public.dictionary_deleted_ids(id uuid primary key);
alter table public.dictionary_deleted_ids enable row level security;
revoke all on public.dictionary_deleted_ids from public,anon,authenticated;
-- Do not retain actor, time, content or old versions. Never tombstone a live ID.
insert into public.dictionary_deleted_ids
select distinct a.record_id from public.dictionary_audit a
where a.table_name='dictionary_entries' and a.operation in ('DELETE','DELETE_ENTRY')
 and a.record_id is not null and not exists(select 1 from public.dictionary_entries e where e.id=a.record_id);

drop trigger if exists "dictionary_audit" on public."dictionary_sources";
drop trigger if exists "dictionary_audit" on public."dictionary_entries";
drop trigger if exists "dictionary_audit" on public."dictionary_senses";
drop trigger if exists "dictionary_audit" on public."dictionary_relations";
drop trigger if exists "dictionary_audit" on public."dictionary_etymologies";
drop trigger if exists "dictionary_audit" on public."dictionary_learning_notes";
drop trigger if exists "dictionary_groups_audit" on public."dictionary_entry_groups";
drop trigger if exists "dictionary_sense_groups_audit" on public."dictionary_sense_groups";
drop trigger if exists "dictionary_examples_audit" on public."dictionary_examples";
drop trigger if exists "dictionary_lexical_annotations_audit" on public."dictionary_lexical_annotations";
drop trigger if exists "dictionary_review_audit" on public."dictionary_review_drafts";
drop trigger if exists "dictionary_pronunciations_audit" on public."dictionary_pronunciations";
drop trigger if exists "dictionary_inflections_audit" on public."dictionary_inflections";
drop trigger if exists "dictionary_import_review_audit" on public."dictionary_import_review_items";

CREATE OR REPLACE FUNCTION public.guard_deleted_dictionary_identity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 if exists(select 1 from public.dictionary_deleted_ids where id=new.id) then raise exception 'This Entry ID was permanently deleted; recompare the import';end if;
 return new;
end $function$;


CREATE OR REPLACE FUNCTION public.create_dictionary_review(entry_uuid uuid, expected_snapshot jsonb, patch jsonb DEFAULT NULL::jsonb, source_type text DEFAULT 'manual'::text, preview boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare s jsonb; c jsonb; result jsonb; saved public.dictionary_review_drafts;
begin
 if not public.is_dictionary_admin() then raise exception 'Dictionary admin required';end if;
 perform pg_advisory_xact_lock(710,1);
 perform 1 from public.dictionary_entries where id=entry_uuid for update;
 s:=public.get_dictionary_ai_snapshot(entry_uuid);
 if public.dictionary_normalize_snapshot(s) is distinct from public.dictionary_normalize_snapshot(expected_snapshot) then raise exception 'Stale Published snapshot; regenerate Diff';end if;
 if s->'detail'->'entry'->>'status' is distinct from 'published' then raise exception 'Published entry required';end if;
 c:=public.dictionary_snapshot_candidate(s);
 if patch is not null then c:=public.dictionary_overlay_candidate(c,patch);end if;
 -- Exercise the real constraints, then roll back every validation change from validation.
 begin perform public.dictionary_materialize_review(entry_uuid,c);raise exception using errcode='ZX714';exception when sqlstate 'ZX714' then null;end;
 if preview then return jsonb_build_object('preview',true,'inserted',0,'updated',0,'skipped',0,'warnings','[]'::jsonb);end if;
 insert into public.dictionary_review_drafts(entry_id,base_revision,base_snapshot,candidate,created_by,updated_by,source) values(entry_uuid,(s->'detail'->'entry'->>'revision')::bigint,s,c,auth.uid(),auth.uid(),source_type) returning * into saved;
 return to_jsonb(saved);
end $function$;


CREATE OR REPLACE FUNCTION public.approve_dictionary_review(review_uuid uuid, expected_revision bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare r public.dictionary_review_drafts; s jsonb; next_snapshot jsonb;
begin
 if not public.is_dictionary_admin() then raise exception 'Dictionary admin required';end if;
 perform pg_advisory_xact_lock(710,1);
 select * into r from public.dictionary_review_drafts where id=review_uuid for update;
 if not found or r.revision<>expected_revision then raise exception 'Review revision conflict';end if;
 if r.state<>'active' then raise exception 'Review not active';end if;
 perform 1 from public.dictionary_entries where id=r.entry_id for update;
 s:=public.get_dictionary_ai_snapshot(r.entry_id);
 if public.dictionary_normalize_snapshot(s) is distinct from public.dictionary_normalize_snapshot(r.base_snapshot) or (s->'detail'->'entry'->>'revision')::bigint<>r.base_revision then raise exception 'Stale Review Draft; Published changed';end if;
 perform public.dictionary_materialize_review(r.entry_id,r.candidate);
 next_snapshot:=public.get_dictionary_ai_snapshot(r.entry_id);
 delete from public.dictionary_review_drafts where id=review_uuid;
 return jsonb_build_object('entry_id',r.entry_id,'published',true,'revision',(next_snapshot->'detail'->'entry'->>'revision')::bigint);
end $function$;


CREATE OR REPLACE FUNCTION public.discard_dictionary_review(review_uuid uuid, expected_revision bigint)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 if not public.is_dictionary_admin() then raise exception 'Dictionary admin required';end if;
 delete from public.dictionary_review_drafts where id=review_uuid and state='active' and revision=expected_revision;
 if not found then raise exception 'Review revision conflict';end if;
end $function$;


CREATE OR REPLACE FUNCTION public.dictionary_materialize_review(eid uuid, c jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare t text; rows jsonb; r jsonb; current_row jsonb; b jsonb; field text; nextrows jsonb; rev bigint;
begin
 if not public.is_dictionary_admin() then raise exception 'Dictionary admin required';end if;
 if c ? 'ai' or jsonb_array_length(c->'bundle'->'dictionary_entries')<>1 or c->'bundle'->'dictionary_entries'->0->>'id' is distinct from eid::text then raise exception 'Stable entry identity required';end if;
 if c->'bundle'->'dictionary_entries'->0->>'kind' is distinct from (select kind from public.dictionary_entries where id=eid) then raise exception 'Entry kind immutable';end if;
 if not(c ? 'inflections') then c:=jsonb_set(c,'{inflections}',coalesce((select jsonb_agg(to_jsonb(i)-'updated_at') from public.dictionary_inflections i where i.entry_id=eid),'[]'));end if;
 insert into public.dictionary_approval_capability values(txid_current(),eid);
 update public.dictionary_entries set status='draft' where id=eid and status='published';
 if not found then raise exception 'Expected current Published';end if;
 -- Remove omitted dependent content before senses. External references reject, never cascade.
 foreach t in array array['dictionary_inflections','dictionary_pronunciations','dictionary_relations','dictionary_etymologies','dictionary_learning_notes','dictionary_examples','dictionary_lexical_annotations','dictionary_senses'] loop
  rows:=coalesce(case when t='dictionary_inflections' then c->'inflections' when t='dictionary_pronunciations' then c->'pronunciations' when t='dictionary_examples' then c->'examples' when t='dictionary_lexical_annotations' then c->'annotations' else c->'bundle'->t end,'[]');
  execute format('delete from public.%I where entry_id=$1 and not(id in(select (value->>''id'')::uuid from jsonb_array_elements($2)))',t) using eid,rows;
 end loop;
 -- Rebase technical child revisions only after the complete base snapshot was checked.
 foreach t in array array['dictionary_entries','dictionary_senses','dictionary_relations','dictionary_etymologies','dictionary_learning_notes','dictionary_examples','dictionary_lexical_annotations','dictionary_pronunciations','dictionary_inflections'] loop
  field:=case when t='dictionary_inflections' then 'inflections' when t='dictionary_pronunciations' then 'pronunciations' when t='dictionary_examples' then 'examples' when t='dictionary_lexical_annotations' then 'annotations' else t end;
  rows:=coalesce(case when t in ('dictionary_examples','dictionary_lexical_annotations','dictionary_pronunciations','dictionary_inflections') then c->field else c->'bundle'->t end,'[]');nextrows:='[]';
  for r in select value from jsonb_array_elements(rows) loop
   execute format('select to_jsonb(x) from public.%I x where id=$1',t) into current_row using (r->>'id')::uuid;
   if t<>'dictionary_entries' and r->>'entry_id' is distinct from eid::text then raise exception 'Content ownership immutable';end if;
   if t<>'dictionary_entries' and current_row is not null and current_row->>'entry_id' is distinct from eid::text then raise exception 'Stable child ID belongs to another entry';end if;
   r:=r-'revision'-'updated_at'-'status'-'published_at';
   if t='dictionary_relations' then r:=r-'relation_kind'-'verification'-'verification_note';end if;
   if current_row is not null then r:=r||jsonb_build_object('revision',current_row->'revision');end if;
   nextrows:=nextrows||jsonb_build_array(r);
  end loop;
  c:=jsonb_set(c,case when t in ('dictionary_examples','dictionary_lexical_annotations','dictionary_pronunciations','dictionary_inflections') then array[field] else array['bundle',t] end,nextrows);
 end loop;
 perform public.apply_dictionary_drafts(jsonb_build_array(c),false,true);
 if c ? 'component_order' then
  insert into public.dictionary_ai_metadata(entry_id,component_order) values(eid,array(select jsonb_array_elements_text(c->'component_order'))::uuid[])
  on conflict(entry_id) do update set component_order=excluded.component_order;
 end if;
 update public.dictionary_entries set status='published' where id=eid;
 delete from public.dictionary_approval_capability where transaction_id=txid_current();
end $function$;


CREATE OR REPLACE FUNCTION public.delete_dictionary_drafts(targets jsonb)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare ids uuid[]; blocked text; t text; affected integer;
begin
  if not public.is_dictionary_admin() then raise exception 'Dictionary admin required'; end if;
  if targets is null or jsonb_typeof(targets)<>'array' then raise exception 'Invalid deletion targets'; end if;
  if jsonb_array_length(targets)=0 then raise exception 'No deletion targets'; end if;
  if exists(select 1 from jsonb_array_elements(targets) x where x->>'id' is null or x->>'revision' is null) then raise exception 'Missing ID or revision'; end if;
  select array_agg((x->>'id')::uuid) into ids from jsonb_array_elements(targets) x;
  if cardinality(ids)<>(select count(distinct v) from unnest(ids) v) then raise exception 'Duplicate deletion ID'; end if;
  -- Same parent locks used by publication and child edits, acquired in stable order.
  perform id from public.dictionary_entries where id=any(ids) order by id for update;
  if (select count(*) from public.dictionary_entries where id=any(ids))<>cardinality(ids) then raise exception 'Entry missing; reload before deleting'; end if;
  select string_agg(headword||' ('||id::text||')',', ' order by id) into blocked
    from public.dictionary_entries where id=any(ids) and status<>'draft';
  if blocked is not null then raise exception 'Cannot delete Published: %',blocked; end if;
  if exists(select 1 from public.dictionary_entries e join jsonb_array_elements(targets) x on e.id=(x->>'id')::uuid where e.revision<>(x->>'revision')::bigint) then raise exception 'Revision conflict; reload before deleting'; end if;
  if exists(select 1 from public.dictionary_relations where target_entry_id=any(ids) and not(entry_id=any(ids))) then raise exception 'Entry is referenced by another entry; deletion cancelled'; end if;
  -- Stable deleted IDs protect against delayed re-import, without retaining content.
  insert into public.dictionary_deleted_ids select unnest(ids) on conflict do nothing;
  delete from public.dictionary_review_drafts where entry_id=any(ids);
  delete from public.dictionary_inflections where entry_id=any(ids);
  delete from public.dictionary_pronunciations where entry_id=any(ids);
  delete from public.dictionary_examples where entry_id=any(ids);
  delete from public.dictionary_lexical_annotations where entry_id=any(ids);
  foreach t in array array['dictionary_relations','dictionary_etymologies','dictionary_learning_notes','dictionary_senses','dictionary_entries'] loop
    execute format('delete from public.%I where %I=any($1)',t,case when t='dictionary_entries' then 'id' else 'entry_id' end) using ids;
  end loop;
  affected:=cardinality(ids);
  return affected;
exception when foreign_key_violation then
  raise exception 'Entry is still referenced; entire deletion cancelled';
end $function$;


CREATE OR REPLACE FUNCTION public.delete_dictionary_draft_sense(entry_uuid uuid, sense_uuid uuid, expected_entry_revision bigint, expected_sense_revision bigint)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare entry_row public.dictionary_entries; sense_row public.dictionary_senses; next_revision bigint;
begin
  if not public.is_dictionary_admin() then raise exception 'Dictionary admin required'; end if;
  select * into entry_row from public.dictionary_entries where id=entry_uuid for update;
  if not found then raise exception 'Entry not found'; end if;
  if entry_row.status<>'draft' then raise exception 'Published revision changes await A3'; end if;
  select * into sense_row from public.dictionary_senses where id=sense_uuid and entry_id=entry_uuid for update;
  if not found then raise exception 'Sense not found'; end if;
  if entry_row.revision is distinct from expected_entry_revision or sense_row.revision is distinct from expected_sense_revision then raise exception 'Revision conflict; reload before deleting'; end if;
  if exists(select 1 from public.dictionary_relations where sense_id=sense_uuid or target_sense_id=sense_uuid)
    or exists(select 1 from public.dictionary_etymologies where sense_id=sense_uuid)
    or exists(select 1 from public.dictionary_learning_notes where sense_id=sense_uuid) then
    raise exception 'Sense is referenced by a relation, etymology or learning note';
  end if;
  delete from public.dictionary_senses where id=sense_uuid and entry_id=entry_uuid;
  update public.dictionary_entries set headword=headword where id=entry_uuid returning revision into next_revision;
  return next_revision;
exception when foreign_key_violation then
  raise exception 'Sense is referenced; deletion cancelled';
end $function$;


CREATE OR REPLACE FUNCTION public.delete_dictionary_draft_content(entry_uuid uuid, content_table text, content_uuid uuid, expected_entry_revision bigint, expected_content_revision bigint)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare parent public.dictionary_entries; content jsonb; next_revision bigint;
begin
  if not public.is_dictionary_admin() then raise exception 'Dictionary admin required'; end if;
  if content_table is null or content_table not in ('dictionary_etymologies','dictionary_learning_notes','dictionary_examples','dictionary_lexical_annotations','dictionary_pronunciations') then raise exception 'Invalid content table'; end if;
  select * into parent from public.dictionary_entries where id=entry_uuid for update;
  if not found then raise exception 'Entry not found'; end if;
  if parent.status<>'draft' then raise exception 'Published content cannot be deleted'; end if;
  execute format('select to_jsonb(r) from public.%I r where id=$1 and entry_id=$2 for update',content_table) into content using content_uuid,entry_uuid;
  if content is null then raise exception 'Content not found'; end if;
  if parent.revision is distinct from expected_entry_revision or (content->>'revision')::bigint is distinct from expected_content_revision then raise exception 'Revision conflict; reload before deleting'; end if;
  execute format('delete from public.%I where id=$1 and entry_id=$2',content_table) using content_uuid,entry_uuid;
  update public.dictionary_entries set headword=headword where id=entry_uuid returning revision into next_revision;
  return next_revision;
end $function$;


CREATE OR REPLACE FUNCTION public.publish_dictionary_entry(entry_uuid uuid, content_verified boolean)
 RETURNS dictionary_entries
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare result public.dictionary_entries;
begin
 if not public.is_dictionary_admin() then raise exception 'Dictionary admin required';end if;
 if content_verified is distinct from true then raise exception 'Content verification confirmation required';end if;
 insert into public.dictionary_publication_confirmation values(txid_current(),auth.uid()) on conflict do nothing;
 result:=public.publish_dictionary_entry(entry_uuid);
 delete from public.dictionary_publication_confirmation where transaction_id=txid_current() and actor_id=auth.uid();
 return result;
end $function$;


CREATE OR REPLACE FUNCTION public.approve_dictionary_review(review_uuid uuid, expected_revision bigint, content_verified boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare result jsonb;
begin
 if not public.is_dictionary_admin() then raise exception 'Dictionary admin required';end if;
 if content_verified is distinct from true then raise exception 'Content verification confirmation required';end if;
 insert into public.dictionary_publication_confirmation values(txid_current(),auth.uid()) on conflict do nothing;
 result:=public.approve_dictionary_review(review_uuid,expected_revision);
 delete from public.dictionary_publication_confirmation where transaction_id=txid_current() and actor_id=auth.uid();
 return result;
end $function$;


CREATE OR REPLACE FUNCTION public.publish_dictionary_bulk(kind_filters text[], query_text text, expected_signature text, content_verified boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare result jsonb;
begin
 if not public.is_dictionary_admin() then raise exception 'Dictionary admin required';end if;
 if content_verified is distinct from true then raise exception 'Content verification confirmation required';end if;
 insert into public.dictionary_publication_confirmation values(txid_current(),auth.uid()) on conflict do nothing;
 result:=public.publish_dictionary_bulk(kind_filters,query_text,expected_signature);
 delete from public.dictionary_publication_confirmation where transaction_id=txid_current() and actor_id=auth.uid();
 return result;
end $function$;


CREATE OR REPLACE FUNCTION public.quick_create_dictionary_component(operation_uuid uuid, component_kind text, component_name text, content_verified boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare e public.dictionary_entries;sid uuid;answer jsonb;receipt public.dictionary_import_operations;request jsonb;key text:=public.dictionary_component_key(component_name);
begin
 if not public.is_dictionary_admin() then raise exception 'Dictionary admin required';end if;
 if content_verified is distinct from true then raise exception 'Content verification confirmation required';end if;
 if operation_uuid is null or component_kind is null or component_kind not in ('prefix','root') or key is null or key='' or length(component_name)>120 or component_name ~ '[[:cntrl:]]' then raise exception 'Invalid component name or kind';end if;
 request:=jsonb_build_object('kind',component_kind,'name',key,'action','quick_component_v1');
 request:=jsonb_build_object('fingerprint',encode(sha256(convert_to(request::text,'UTF8')),'hex'));
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||operation_uuid::text,0));
 select * into receipt from public.dictionary_import_operations where owner_id=auth.uid() and operation_id=operation_uuid;
 if found then
  if receipt.request is distinct from request then raise exception 'Operation ID reused for different request';end if;
  -- Re-read current publication, not a stale receipt snapshot.
  select * into e from public.dictionary_entries where id=(receipt.result->>'id')::uuid and status='published';
  if not found then raise exception 'Created target changed; search again';end if;
 else
  -- Also serializes with regular editor inserts: their unique index arbitrates races.
  perform pg_advisory_xact_lock(hashtextextended(component_kind||':'||key,0));
  select * into e from public.dictionary_entries where kind=component_kind and public.dictionary_component_key(headword)=key for update;
  if found then
   if e.status<>'published' then raise exception 'Matching draft exists; complete its normal publication first';end if;
  else
   begin
    insert into public.dictionary_entries(kind,headword) values(component_kind,btrim(component_name)) returning * into e;
   exception when unique_violation then
    select * into e from public.dictionary_entries where kind=component_kind and public.dictionary_component_key(headword)=key for update;
    if not found or e.status<>'published' then raise exception 'Matching entry changed or is a draft; search again';end if;
   end;
   if e.status='draft' then
    insert into public.dictionary_senses(entry_id,part_of_speech,gloss_zh_tw) values(e.id,null,'') returning id into sid;
    e:=public.publish_dictionary_entry(e.id,true);
   end if;
  end if;
 end if;
 answer:=jsonb_build_object('id',e.id,'headword',e.headword,'kind',e.kind,'senses',(select jsonb_agg(jsonb_build_object('id',s.id,'part_of_speech',s.part_of_speech,'gloss_zh_tw',s.gloss_zh_tw) order by s.id) from public.dictionary_senses s where s.entry_id=e.id));
 if answer->'senses'='null'::jsonb then raise exception 'Target has no valid Sense';end if;
 insert into public.dictionary_import_operations(owner_id,operation_id,session_id,source_type,preview_at,request,result) values(auth.uid(),operation_uuid,operation_uuid,'quick_component',now(),request,jsonb_build_object('id',e.id)) on conflict(owner_id,operation_id) do nothing;
 return answer;
end $function$;


CREATE OR REPLACE FUNCTION public.delete_dictionary_entry(entry_uuid uuid, expected_revision bigint, expected_snapshot jsonb, operation_uuid uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare e public.dictionary_entries;receipt public.dictionary_import_operations;request jsonb;answer jsonb;t text;unlinked integer;
begin
 if not public.is_dictionary_admin() then raise exception 'Dictionary admin required';end if;
 if entry_uuid is null or expected_revision is null or expected_revision<1 or operation_uuid is null or expected_snapshot is null then raise exception 'Invalid deletion request';end if;
 request:=jsonb_build_object('action','delete_entry_v1','entry_id',entry_uuid,'revision',expected_revision,'snapshot',expected_snapshot);
 request:=jsonb_build_object('fingerprint',encode(sha256(convert_to(request::text,'UTF8')),'hex'));
 perform pg_advisory_xact_lock(710,1);
 select * into receipt from public.dictionary_import_operations where owner_id=auth.uid() and operation_id=operation_uuid;
 if found then
  if receipt.request is distinct from request then raise exception 'Operation ID reused for different request';end if;
  return receipt.result;
 end if;
 select * into e from public.dictionary_entries where id=entry_uuid for update;
 if not found then raise exception 'Entry no longer exists; check the management list';end if;
 if e.revision<>expected_revision or public.get_dictionary_ai_snapshot(entry_uuid) is distinct from expected_snapshot then raise exception 'Entry changed; reopen it before deleting';end if;
 if exists(select 1 from public.dictionary_relations where target_entry_id=entry_uuid and entry_id<>entry_uuid) then raise exception 'Other entries reference this component; remove those relations first';end if;
 if exists(select 1 from public.dictionary_review_drafts r cross join jsonb_array_elements(coalesce(r.candidate->'bundle'->'dictionary_relations','[]'::jsonb)) c where r.state='active' and r.entry_id<>entry_uuid and c->>'target_entry_id'=entry_uuid::text) then raise exception 'Another active Review references this entry; resolve that review first';end if;
 if exists(select 1 from public.dictionary_ai_metadata where published_entry_id=entry_uuid and entry_id<>entry_uuid) then raise exception 'A legacy Review references this entry; resolve it first';end if;
 if exists(select 1 from public.official_study_pack_entries where dictionary_entry_id=entry_uuid) then raise exception 'Official study packs reference this entry; update the official manifest first';end if;
 -- Lock/CAS above is shared with publication/child/import flows. New FK references
 -- also require a conflicting parent key lock; failures roll back this entire operation.
 delete from public.study_card_dictionary_links where dictionary_entry_id=entry_uuid;
 get diagnostics unlinked=row_count;
 delete from public.dictionary_review_drafts where entry_id=entry_uuid;
 -- Preserve only the deleted UUID and the compact retry receipt.
 insert into public.dictionary_deleted_ids values(entry_uuid) on conflict do nothing;
 foreach t in array array['dictionary_relations','dictionary_inflections','dictionary_pronunciations','dictionary_examples','dictionary_lexical_annotations','dictionary_etymologies','dictionary_learning_notes'] loop
  execute format('delete from public.%I where entry_id=$1',t) using entry_uuid;
 end loop;
 delete from public.dictionary_sense_groups where sense_id in(select id from public.dictionary_senses where entry_id=entry_uuid);
 delete from public.dictionary_entry_groups where id=entry_uuid;
 delete from public.dictionary_ai_metadata where entry_id=entry_uuid;
 delete from public.dictionary_senses where entry_id=entry_uuid;
 delete from public.dictionary_entries where id=entry_uuid;
 answer:=jsonb_build_object('deleted',true,'entry_id',entry_uuid,'unlinked_cards',unlinked);
 insert into public.dictionary_import_operations(owner_id,operation_id,session_id,source_type,preview_at,request,result) values(auth.uid(),operation_uuid,operation_uuid,'delete_entry',now(),request,answer);
 return answer;
exception when foreign_key_violation then raise exception 'Entry is still referenced; no data was deleted';
end $function$;


CREATE OR REPLACE FUNCTION public.dictionary_guard_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare parent public.dictionary_entries; target public.dictionary_entries;
begin
  if tg_table_name='dictionary_learning_notes' and tg_op='INSERT' and exists(select 1 from public.dictionary_core_aliases where legacy_id=new.id) then raise exception 'Merged legacy core ID; re-export or recompare before import';end if;
  if tg_op = 'UPDATE' then
    if new.id <> old.id then raise exception 'Stable IDs cannot change'; end if;
    new.revision := old.revision + 1;
    if tg_table_name='dictionary_entries' then
      if exists(select 1 from public.dictionary_approval_capability where transaction_id=txid_current() and entry_id=new.id) and new.status<>'published' then new.revision:=old.revision;end if;
    end if;
  else new.revision := 1;
  end if;
  new.updated_at := now();
  if tg_table_name = 'dictionary_entries' then
    if tg_op = 'INSERT' and new.status <> 'draft' then raise exception 'Create a draft before publishing'; end if;
    if tg_op = 'UPDATE' then
      if old.status = 'published' and not exists(select 1 from public.dictionary_approval_capability where transaction_id=txid_current() and entry_id=new.id) then raise exception 'Published changes require Review approval'; end if;
      if new.kind <> old.kind then raise exception 'Entry kind is immutable'; end if;
    end if;
    if new.status = 'published' then
      if not exists(select 1 from public.dictionary_publication_confirmation where transaction_id=txid_current() and actor_id=auth.uid())
      and not exists(select 1 from public.dictionary_approval_capability where transaction_id=txid_current() and entry_id=new.id)
      then raise exception 'Content verification confirmation required';end if;
      if not exists(select 1 from public.dictionary_senses where entry_id=new.id) then raise exception 'At least one sense is required'; end if;
      if exists(select 1 from public.dictionary_inflections i where i.entry_id=new.id and not exists(select 1 from public.dictionary_senses s where s.entry_id=new.id and (i.sense_id is null or i.sense_id=s.id) and case when i.form_kind in ('past','past_participle','present_participle','third_person_singular') then lower(btrim(s.part_of_speech)) in ('v','v.','verb','動詞') when i.form_kind='plural' then lower(btrim(s.part_of_speech)) in ('n','n.','noun','名詞') else lower(btrim(s.part_of_speech)) in ('adj','adj.','adjective','形容詞','adv','adv.','adverb','副詞') end)) then raise exception 'Inflection kind does not match sense POS';end if;
      if exists(select 1 from public.dictionary_relations r join public.dictionary_entries e on e.id=r.target_entry_id where r.entry_id=new.id and e.status<>'published') then
        raise exception 'Related entries must be published first';
      end if;
      new.published_at := now();
    else new.published_at := null;
    end if;
  else
    if tg_op = 'UPDATE' and new.entry_id <> old.entry_id then raise exception 'Sense and content ownership cannot change'; end if;
    -- Same lock as publishing, so concurrent child edits cannot leak into a publication.
    select * into parent from public.dictionary_entries where id=new.entry_id for update;
    if not found then raise exception 'Entry not found'; end if;
    if parent.status <> 'draft' then raise exception 'Published changes require Review approval'; end if;
    if tg_table_name = 'dictionary_senses' then
      if parent.kind = 'word' and new.part_of_speech is null then raise exception 'Word senses require part of speech'; end if;
    elsif tg_table_name = 'dictionary_relations' then
      select * into target from public.dictionary_entries where id=new.target_entry_id;
      if new.entry_id=new.target_entry_id then raise exception 'Cannot link entry to itself';end if;
      if parent.kind <> 'word' or target.kind not in ('word','prefix','root') then raise exception 'Relations must connect word senses to component senses'; end if;
    end if;
  end if;
  return new;
end $function$;


CREATE OR REPLACE FUNCTION public.apply_dictionary_bundle(bundle jsonb, preview boolean DEFAULT true, allow_edits boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  t text; row_data jsonb; existing jsonb; incoming jsonb; cols text; vals text; key text;
  permitted text[]; inserted integer:=0; skipped integer:=0; updated integer:=0; result jsonb;
  warnings jsonb:='[]'::jsonb; matches jsonb; comparison text;
begin
  if not public.is_dictionary_admin() then raise exception 'Dictionary admin required'; end if;
  if jsonb_typeof(bundle) is distinct from 'object' then raise exception 'Expected bundle object'; end if;
  if exists(select 1 from jsonb_object_keys(bundle) k where k not in ('dictionary_entries','dictionary_senses','dictionary_relations','dictionary_etymologies','dictionary_learning_notes')) then
    raise exception 'Unknown bundle table';
  end if;
  -- Serialize bundle operations; row locks/revisions also protect against direct API edits.
  perform pg_advisory_xact_lock(710,1);
  begin
    foreach t in array array['dictionary_entries','dictionary_senses','dictionary_relations','dictionary_etymologies','dictionary_learning_notes'] loop
      if jsonb_typeof(coalesce(bundle->t,'[]')) <> 'array' then raise exception 'Expected array: %',t; end if;
      if exists(select 1 from jsonb_array_elements(coalesce(bundle->t,'[]')) r group by r->>'id' having count(*)>1) then raise exception 'Duplicate ID in %',t; end if;
      permitted := case t
        when 'dictionary_entries' then array['id','kind','headword','revision']
        when 'dictionary_senses' then array['id','entry_id','part_of_speech','gloss_zh_tw','revision']
        when 'dictionary_relations' then array['id','entry_id','sense_id','target_entry_id','target_sense_id','relation_kind','verification_note','revision']
        when 'dictionary_etymologies' then array['id','entry_id','sense_id','body','data_source','revision']
        else array['id','entry_id','sense_id','kind','body','revision'] end;
      for row_data in select value from jsonb_array_elements(coalesce(bundle->t,'[]')) loop
        if jsonb_typeof(row_data) <> 'object' or row_data->>'id' is null then raise exception 'Missing row ID in %',t; end if;
        for key in select jsonb_object_keys(row_data) loop
          if not key=any(permitted) then raise exception 'Unexpected field %.%',t,key; end if;
        end loop;
        execute format('select to_jsonb(r) from public.%I r where id=$1::uuid for update',t) into existing using row_data->>'id';
        if t='dictionary_relations' then row_data:=row_data-'relation_kind'-'verification'-'verification_note';end if;
        incoming := row_data - 'revision';
        if existing is not null then
          if existing @> incoming then skipped:=skipped+1; continue; end if;
          if not allow_edits then raise exception 'ID conflict in %: %',t,row_data->>'id'; end if;
          if row_data->>'revision' is null or (row_data->>'revision')::bigint <> (existing->>'revision')::bigint then raise exception 'Revision conflict in %: %',t,row_data->>'id'; end if;
          select string_agg(format('%I = p.%I',k,k),',') into cols from jsonb_object_keys(incoming) k where k<>'id';
          execute format('update public.%I r set %s from jsonb_populate_record(null::public.%I,$1) p where r.id=p.id',t,cols,t) using incoming;
          updated:=updated+1;
        else
          select string_agg(format('%I',k),','),string_agg(format('p.%I',k),',') into cols,vals from jsonb_object_keys(incoming) k;
          execute format('insert into public.%I (%s) select %s from jsonb_populate_record(null::public.%I,$1) p',t,cols,vals,t) using incoming;
          inserted:=inserted+1;
        end if;
      end loop;
    end loop;
    -- Advisory only: homographs/different origins keep independent stable IDs.
    -- Run after staged inserts so both existing data and this batch are compared.
    foreach t in array array['dictionary_entries','dictionary_senses','dictionary_etymologies','dictionary_learning_notes'] loop
      comparison:=case t
        when 'dictionary_entries' then 'a.kind=b.kind and lower(btrim(a.headword))=lower(btrim(b.headword))'
        when 'dictionary_senses' then 'a.entry_id=b.entry_id and a.part_of_speech is not distinct from b.part_of_speech and btrim(a.gloss_zh_tw)=btrim(b.gloss_zh_tw)'
        when 'dictionary_etymologies' then 'a.entry_id=b.entry_id and a.sense_id is not distinct from b.sense_id and btrim(a.body)=btrim(b.body)'
        else 'a.entry_id=b.entry_id and a.sense_id is not distinct from b.sense_id and a.kind=b.kind and btrim(a.body)=btrim(b.body)' end;
      for row_data in select value from jsonb_array_elements(coalesce(bundle->t,'[]')) loop
        execute format('select coalesce(jsonb_agg(x.id),''[]''::jsonb) from (select b.id from public.%I a join public.%I b on a.id<>b.id and %s where a.id=$1::uuid order by b.id limit 5) x',t,t,comparison)
          into matches using row_data->>'id';
        if jsonb_array_length(matches)>0 then
          warnings:=warnings||jsonb_build_array(jsonb_build_object('table',t,'id',row_data->>'id','similar_ids',matches));
        end if;
      end loop;
    end loop;
    result:=jsonb_build_object('inserted',inserted,'updated',updated,'skipped',skipped,'preview',preview,'warnings',warnings);
    -- Roll back all preview writes, using a private subtransaction.
    if preview then raise exception using errcode='ZX710',detail=result::text; end if;
    return result;
  exception when sqlstate 'ZX710' then
    get stacked diagnostics vals=pg_exception_detail;
    return vals::jsonb;
  end;
end $function$;

CREATE OR REPLACE FUNCTION public.apply_dictionary_drafts(drafts jsonb, preview boolean DEFAULT true, allow_edits boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare d jsonb; b jsonb; r jsonb; old_row jsonb; stored jsonb; total jsonb; item jsonb; g jsonb;
 eid uuid; tbl text; k text; before_rev bigint; changed boolean; result jsonb;
begin
 if not public.is_dictionary_admin() then raise exception 'Dictionary admin required'; end if;
 if jsonb_typeof(drafts) is distinct from 'array' or jsonb_array_length(drafts)=0 then raise exception 'Expected drafts'; end if;
 perform pg_advisory_xact_lock(710,1);
 begin
 total:=jsonb_build_object('inserted',0,'updated',0,'skipped',0,'warnings','[]'::jsonb,'preview',preview,'items','[]'::jsonb);
 for d in select value from jsonb_array_elements(drafts) order by (value->'bundle'->'dictionary_entries'->0->>'kind'='word') loop
  if jsonb_typeof(coalesce(d->'inflections','[]')) is distinct from 'array' then raise exception 'Expected inflections array';end if;
  if exists(select 1 from jsonb_array_elements(coalesce(d->'inflections','[]')) x group by x->>'id' having count(*)>1) then raise exception 'Duplicate inflection ID';end if;
  b:=d->'bundle';
  if jsonb_array_length(b->'dictionary_entries')<>1 then raise exception 'Expected one entry per draft'; end if;
  eid:=(b->'dictionary_entries'->0->>'id')::uuid;
  select revision into before_rev from public.dictionary_entries where id=eid for update;
  if not(d ? 'ai') and exists(select 1 from public.dictionary_entries where id=eid and status<>'draft') then raise exception 'Published content requires AI review draft'; end if;
  if before_rev is not null and allow_edits and before_rev is distinct from (b->'dictionary_entries'->0->>'revision')::bigint then raise exception 'Revision conflict'; end if;
  if coalesce((d->>'replace_editor_children')::boolean,false) then
   if not allow_edits or before_rev is null or exists(select 1 from public.dictionary_entries where id=eid and status<>'draft') then raise exception 'Full editor save requires existing Draft';end if;
   delete from public.dictionary_inflections where entry_id=eid and not(id in(select (x->>'id')::uuid from jsonb_array_elements(coalesce(d->'inflections','[]')) x));
   delete from public.dictionary_relations where entry_id=eid and not(id in(select (x->>'id')::uuid from jsonb_array_elements(coalesce(b->'dictionary_relations','[]')) x));
  end if;
  if d ? 'ai' then
   result:=public.apply_dictionary_ai_change((d->'ai'->>'entry_uuid')::uuid,nullif(d->'ai'->'expected_snapshot','null'::jsonb),b,
    coalesce(nullif(d->'group_data','null'::jsonb),'{"primary_category":null,"tags":[],"variant_group":null}'::jsonb),d->'sense_groups',
    array(select jsonb_array_elements_text(d->'ai'->'component_order'))::uuid[],d->'ai'->'origin_ids',false);
   -- Omissions cannot remove existing published extension rows when creating its review draft.
   if d->'ai'->'expected_snapshot'->'detail'->'entry'->>'status'='published' then
    for item in select value from jsonb_array_elements(coalesce(d->'ai'->'expected_snapshot'->'detail'->'examples','[]')) loop
     if not exists(select 1 from jsonb_array_elements(d->'examples') x where x->>'id'=d->'ai'->'origin_ids'->>(item->>'id')) then raise exception 'Published examples must be retained';end if;
    end loop;
    for item in select value from jsonb_array_elements(coalesce(d->'ai'->'expected_snapshot'->'detail'->'lexical_annotations','[]')) loop
     if not exists(select 1 from jsonb_array_elements(d->'annotations') x where x->>'id'=d->'ai'->'origin_ids'->>(item->>'id')) then raise exception 'Published lexical annotations must be retained';end if;
    end loop;
   end if;
   if d->'ai'->'expected_snapshot'->'detail'->'entry'->>'status'='published' and jsonb_array_length(coalesce(d->'ai'->'expected_snapshot'->'detail'->'inflections','[]'))>0 then raise exception 'Published inflections require snapshot review';end if;
   result:=result->'result';
  else
  -- Verify the complete bundle under its normal allow_edits policy before grouping RPCs.
  result:=public.apply_dictionary_bundle(b,true,allow_edits);
  g:=d->'group_data';
  if b->'dictionary_entries'->0->>'kind'='prefix' and (jsonb_array_length(coalesce(d->'sense_groups','[]'))>0 or g<>'null'::jsonb) then
   if g is null or g='null'::jsonb then
    select jsonb_build_object('tags',tags,'variant_group',variant_group) into g from public.dictionary_entry_groups where id=eid;
    g:=coalesce(g,'{"tags":[],"variant_group":null}'::jsonb);
   end if;
   -- Replayed unchanged imports must not bump the parent merely to rewrite identical grouping.
   if not exists(select 1 from public.dictionary_entry_groups where id=eid) or exists(
    select 1 from jsonb_array_elements(d->'sense_groups') x left join public.dictionary_sense_groups s on s.sense_id=(x->>'sense_id')::uuid
    where s.sense_id is null or s.primary_category is distinct from x->>'primary_category'
   ) or exists(select 1 from public.dictionary_entry_groups where id=eid and (to_jsonb(tags) is distinct from g->'tags' or variant_group is distinct from g->>'variant_group')) then
    b:=jsonb_set(b,'{dictionary_entries,0,revision}',to_jsonb(coalesce(before_rev,0)));
    result:=public.save_dictionary_prefix_draft(b,g-'primary_category',coalesce(d->'sense_groups','[]'));
   else result:=public.apply_dictionary_bundle(b,false,allow_edits); end if;
  elsif b->'dictionary_entries'->0->>'kind'='root' and g is not null and g<>'null'::jsonb then
   if not exists(select 1 from public.dictionary_entry_groups where id=eid and primary_category is not distinct from g->>'primary_category' and to_jsonb(tags)=g->'tags' and variant_group is not distinct from g->>'variant_group') then
    b:=jsonb_set(b,'{dictionary_entries,0,revision}',to_jsonb(coalesce(before_rev,0)));
    result:=public.save_dictionary_grouped_draft(b,g);
   else result:=public.apply_dictionary_bundle(b,false,allow_edits); end if;
  else result:=public.apply_dictionary_bundle(b,false,allow_edits); end if;
  end if;
  foreach k in array array['inserted','updated','skipped'] loop total:=jsonb_set(total,array[k],to_jsonb((total->>k)::int+(result->>k)::int));end loop;
  total:=jsonb_set(total,'{warnings}',(total->'warnings')||coalesce(result->'warnings','[]'));
  changed:=false;
  foreach tbl in array array['dictionary_examples','dictionary_lexical_annotations','dictionary_pronunciations','dictionary_inflections'] loop
   for r in select value from jsonb_array_elements(coalesce(d->case when tbl='dictionary_examples' then 'examples' when tbl='dictionary_inflections' then 'inflections' when tbl='dictionary_pronunciations' then 'pronunciations' else 'annotations' end,'[]')) loop
    if r->>'entry_id' is distinct from eid::text then raise exception 'Content belongs to another entry'; end if;
    if tbl='dictionary_inflections' then
     if jsonb_typeof(r->'form') is distinct from 'string' or jsonb_typeof(r->'form_kind') is distinct from 'string' or (r ? 'sort_order' and jsonb_typeof(r->'sort_order') is distinct from 'number') then raise exception 'Invalid inflection fields';end if;
     if exists(select 1 from jsonb_object_keys(r) x where x not in ('id','entry_id','sense_id','form_kind','form','sort_order','revision')) then raise exception 'Unknown inflection field';end if;
    elsif tbl='dictionary_pronunciations' then
     if jsonb_typeof(r->'ipa') is distinct from 'string'
       or (r ? 'locale' and jsonb_typeof(r->'locale') not in ('string','null'))
       or (r ? 'note' and jsonb_typeof(r->'note') not in ('string','null'))
       or (r ? 'sort_order' and jsonb_typeof(r->'sort_order') is distinct from 'number') then raise exception 'Invalid pronunciation fields';end if;
     if exists(select 1 from jsonb_object_keys(r) x where x not in ('id','entry_id','sense_id','locale','ipa','note','sort_order','revision')) then raise exception 'Unknown pronunciation field';end if;
    elsif exists(select 1 from jsonb_object_keys(r) x where x not in ('id','entry_id','sense_id','body','sort_order','revision','kind')) or (tbl='dictionary_examples' and r ? 'kind') then raise exception 'Unknown extension field';end if;
    execute format('select to_jsonb(t) from public.%I t where id=$1 for update',tbl) into old_row using (r->>'id')::uuid;
    if old_row is not null then
     if old_row->>'entry_id' is distinct from eid::text then raise exception 'Content ownership immutable';end if;
     if not exists(select 1 from jsonb_each(r-'revision') x where old_row->x.key is distinct from x.value) then
      total:=jsonb_set(total,'{skipped}',to_jsonb((total->>'skipped')::int+1));continue;
     end if;
     if not allow_edits or r->>'revision' is distinct from old_row->>'revision' then raise exception 'Revision conflict';end if;
     if tbl='dictionary_inflections' then
      update public.dictionary_inflections set form=r->>'form',form_kind=r->>'form_kind',sense_id=(r->>'sense_id')::uuid,sort_order=coalesce((r->>'sort_order')::int,0),revision=revision+1,updated_at=now() where id=(r->>'id')::uuid;
     elsif tbl='dictionary_pronunciations' then
      update public.dictionary_pronunciations set ipa=r->>'ipa',locale=r->>'locale',note=r->>'note',sense_id=(r->>'sense_id')::uuid,
       sort_order=coalesce((r->>'sort_order')::int,0),revision=revision+1,updated_at=now() where id=(r->>'id')::uuid;
     else
     execute format('update public.%I set body=$1,sense_id=$2,sort_order=$3,revision=revision+1,updated_at=now() where id=$4',tbl)
     using r->>'body',(r->>'sense_id')::uuid,coalesce((r->>'sort_order')::int,0),(r->>'id')::uuid;
     end if;
     if tbl='dictionary_lexical_annotations' and old_row->>'kind' is distinct from r->>'kind' then raise exception 'Annotation kind immutable';end if;
     k:='updated';
    else
     if tbl='dictionary_inflections' then
      insert into public.dictionary_inflections(id,entry_id,sense_id,form_kind,form,sort_order) values((r->>'id')::uuid,eid,(r->>'sense_id')::uuid,r->>'form_kind',r->>'form',coalesce((r->>'sort_order')::int,0));
     elsif tbl='dictionary_pronunciations' then
      insert into public.dictionary_pronunciations(id,entry_id,sense_id,locale,ipa,note,sort_order)
       values((r->>'id')::uuid,eid,(r->>'sense_id')::uuid,r->>'locale',r->>'ipa',r->>'note',coalesce((r->>'sort_order')::int,0));
     elsif tbl='dictionary_examples' then
      insert into public.dictionary_examples(id,entry_id,sense_id,body,sort_order) values((r->>'id')::uuid,eid,(r->>'sense_id')::uuid,r->>'body',coalesce((r->>'sort_order')::int,0));
     else insert into public.dictionary_lexical_annotations(id,entry_id,sense_id,kind,body,sort_order) values((r->>'id')::uuid,eid,(r->>'sense_id')::uuid,r->>'kind',r->>'body',coalesce((r->>'sort_order')::int,0));end if;
     k:='inserted';
    end if;
    changed:=true;total:=jsonb_set(total,array[k],to_jsonb((total->>k)::int+1));
   end loop;
  end loop;
  if d ? 'component_order' then
   if exists(select 1 from public.dictionary_ai_metadata where entry_id=eid and to_jsonb(component_order) is distinct from d->'component_order') or (not exists(select 1 from public.dictionary_ai_metadata where entry_id=eid) and jsonb_array_length(d->'component_order')>0) then changed:=true;end if;
   insert into public.dictionary_ai_metadata(entry_id,component_order) values(eid,array(select jsonb_array_elements_text(d->'component_order'))::uuid[]) on conflict(entry_id) do update set component_order=excluded.component_order;
  end if;
  if coalesce((d->>'replace_editor_children')::boolean,false) then changed:=true;end if;
  if changed and before_rev is not null then update public.dictionary_entries set revision=revision+1 where id=eid and revision=before_rev;end if;
  total:=jsonb_set(total,'{items}',(total->'items')||jsonb_build_array(jsonb_build_object('entry_id',eid,'kind',b->'dictionary_entries'->0->>'kind','headword',b->'dictionary_entries'->0->>'headword','status',case when before_rev is null then 'new' when changed or (result->>'updated')::int>0 or (result->>'inserted')::int>0 or exists(select 1 from public.dictionary_entries where id=eid and revision<>before_rev) then 'modified' else 'unchanged' end)));

 end loop;
 if preview then raise exception using errcode='ZX713',detail=total::text;end if;
 return total;
 exception when sqlstate 'ZX713' then get stacked diagnostics k=pg_exception_detail;return k::jsonb;
 when others then raise exception using message=sqlerrm,errcode=sqlstate,detail=coalesce(d->'origin','{}'::jsonb)::text;
 end;
end $function$;

-- Completed review bodies have no remaining product reader. Active bases remain
-- necessary for pending edits, comparison and publication CAS.
delete from public.dictionary_review_drafts where state<>'active';
alter table public.dictionary_review_drafts drop column approved_revision;
alter table public.dictionary_review_drafts drop constraint dictionary_review_drafts_state_check;
alter table public.dictionary_review_drafts add constraint dictionary_review_drafts_state_check check(state='active');
drop index public.dictionary_review_entry;
create index dictionary_review_entry on public.dictionary_review_drafts(entry_id);

-- Compact non-import safety receipts, not an archive of deleted words or old
-- component definitions. CSV/JSON import receipts still expire after 3 days.
update public.dictionary_import_operations
set request=jsonb_build_object('fingerprint',encode(sha256(convert_to(request::text,'UTF8')),'hex'))
where source_type in ('delete_entry','quick_component') and not(request ? 'fingerprint');
update public.dictionary_import_operations set result=jsonb_build_object('id',result->'id') where source_type='quick_component';
delete from public.dictionary_import_operations where source_type in ('csv','json') and created_at<now()-interval '3 days';
delete from public.dictionary_import_review_items where pending_count=0 and item->>'status' in ('applied','unchanged','skipped') and updated_at<now()-interval '3 days';
delete from public.dictionary_bulk_publish_previews where expires_at<now();

-- Existing maintenance job, same name and schedule; no parallel cron mechanism.
do $maintenance$
declare jid bigint; command text := $job$
DELETE FROM public.dictionary_import_operations WHERE source_type IN ('csv','json') AND created_at < now() - interval '3 days';
DELETE FROM public.dictionary_import_review_items WHERE pending_count=0 AND item->>'status' IN ('applied','unchanged','skipped') AND updated_at < now() - interval '3 days';
DELETE FROM public.dictionary_bulk_publish_previews WHERE expires_at < now();
$job$;
begin
 if to_regclass('cron.job') is not null then
  execute 'select jobid from cron.job where jobname=$1' into jid using 'nexus-import-history-3d';
  if jid is null then
   execute 'select cron.schedule($1,$2,$3)' into jid using 'nexus-import-history-3d','15 3 * * *',command;
  else
   execute 'select cron.alter_job($1,command:=$2)' using jid,command;
  end if;
 end if;
end $maintenance$;

-- Retired source snapshots have no live references. A changed database aborts
-- instead of silently clearing attribution. Drop no current word/sense content.
do $sources$
declare t text; used boolean;
begin
 foreach t in array array['dictionary_entries','dictionary_senses','dictionary_relations','dictionary_etymologies','dictionary_learning_notes'] loop
  execute format('select exists(select 1 from public.%I where source_id is not null)',t) into used;
  if used then raise exception 'Live source references in %; retirement cancelled',t;end if;
 end loop;
end $sources$;
alter table public.dictionary_entries drop column source_id;
alter table public.dictionary_senses drop column source_id;
alter table public.dictionary_relations drop column source_id;
alter table public.dictionary_etymologies drop column source_id;
alter table public.dictionary_learning_notes drop column source_id;
drop table public.dictionary_sources;

drop function public.dictionary_audit_change();
drop function public.audit_dictionary_extension();
drop function public.audit_dictionary_sense_group();
drop table public.dictionary_published_revisions;
drop table public.dictionary_audit;
revoke all on function public.guard_deleted_dictionary_identity() from public,anon,authenticated;

-- Restrict rather than CASCADE: unexpected dependencies or non-table objects
-- abort the whole migration, including the preceding DDL and content cleanup.
do $backups$
declare ns text; t record;
begin
 foreach ns in array array['dictionary_core_backup','dictionary_verification_backup','dictionary_retirement_backup'] loop
  if exists(select 1 from pg_proc p where p.pronamespace='public'::regnamespace and p.prosrc like '%'||ns||'%') then raise exception 'Unexpected function reference to %',ns;end if;
  for t in select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname=ns and c.relkind='r' loop
   execute format('drop table %I.%I',ns,t.relname);
  end loop;
  execute format('drop schema if exists %I',ns);
 end loop;
end $backups$;

-- study_sync_changes already coalesces each (owner,entity,id) by UPSERT. Every
-- current sequence is used by offline pulls and FSRS resolution CAS. Its delete
-- markers must still reach devices absent for years. No time-based deletion,
-- review-event deletion, cursor reset or second synchronization system is added.
-- Reclaim obsolete physical tuple/index versions with the separate, reviewed
-- maintenance SQL, which must run outside this transaction.
-- No attachments/binaries are deleted: production inventory found zero binaries
-- lacking metadata AND every page reference (including trash/world-map JSON).
commit;
