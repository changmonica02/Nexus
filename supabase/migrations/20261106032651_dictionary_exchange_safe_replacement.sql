-- #163. Additive RPCs only; no table, existing content rewrite or automatic publication.
-- Apply after the Word segments / IPA retirement migrations, only after separate approval.
begin;

create function public.dictionary_transfer_pending(i jsonb,n integer) returns boolean
language sql immutable set search_path='' as $$
 select n>0 or i->>'status' in ('failed','stale');
$$;
create function public.dictionary_transfer_reviews(entry_key text) returns jsonb
language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(to_jsonb(r)||jsonb_build_object('version',md5(to_jsonb(r)::text)) order by r.id),'[]')
 from public.dictionary_import_review_items r
 where r.entry_id=entry_key and public.dictionary_transfer_pending(r.item,r.pending_count);
$$;

create function public.dictionary_exchange_transfer_capabilities() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not public.is_dictionary_admin() then raise exception 'Dictionary admin required';end if;
 return '{"version":1,"pending_export":true,"safe_replacement":true}'::jsonb;
end$$;

-- Same exchange record authority and scope version; an overload keeps the original five-argument RPC intact.
-- A missing canonical Entry is explicitly null, never a fabricated Published snapshot.
create function public.export_dictionary_exchange_page(kind_filters text[],status_filters text[],query_text text,after_id text,expected_scope text,pending_only boolean,preview_only boolean)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare keys text[]; canonical_ids uuid[]; batch text[]; stamp text; review_stamp text; result jsonb:='[]'; k text; record jsonb; sources jsonb; last_key text;
begin
 if auth.uid() is null or not public.is_dictionary_admin() then raise exception 'Dictionary admin required';end if;
 if kind_filters is null or cardinality(kind_filters)=0 or pending_only is null or preview_only is null
 or exists(select 1 from unnest(kind_filters) v where v is null or v not in ('word','prefix','root'))
 or status_filters is null or exists(select 1 from unnest(status_filters) v where v is null or v not in ('draft','published')) then raise exception 'Invalid exchange scope';end if;
 with pending as (
  select distinct r.entry_id,min(r.item->'draft'->>'kind') kind,min(r.item->'draft'->>'headword') headword
  from public.dictionary_import_review_items r where public.dictionary_transfer_pending(r.item,r.pending_count) group by r.entry_id
 ), selected as (
  select e.id::text key from public.dictionary_entries e
  where e.kind=any(kind_filters) and (cardinality(status_filters)=0 or e.status=any(status_filters))
  and position(lower(btrim(coalesce(query_text,''))) in lower(e.headword))>0
  and (not pending_only or exists(select 1 from pending p where p.entry_id=e.id::text)
    or exists(select 1 from public.dictionary_review_drafts d where d.entry_id=e.id and d.state='active'))
  union
  select p.entry_id from pending p where not exists(select 1 from public.dictionary_entries e where e.id::text=p.entry_id)
  and p.kind=any(kind_filters) and (cardinality(status_filters)=0 or 'draft'=any(status_filters))
  and position(lower(btrim(coalesce(query_text,''))) in lower(coalesce(p.headword,'')))>0
 ) select coalesce(array_agg(key order by key),'{}') into keys from selected;
 select coalesce(array_agg(e.id order by e.id),'{}') into canonical_ids from public.dictionary_entries e where e.id::text=any(keys);
 select md5(coalesce(string_agg(md5(to_jsonb(r)::text),'' order by r.id),'')) into review_stamp
 from public.dictionary_import_review_items r where r.entry_id=any(keys) and public.dictionary_transfer_pending(r.item,r.pending_count);
 stamp:='transfer-v1:'||md5(jsonb_build_array(keys,public.dictionary_exchange_scope_version(canonical_ids),review_stamp)::text);
 if expected_scope is not null and expected_scope<>stamp then raise exception 'Export scope changed; restart export';end if;
 if not preview_only then
  select array_agg(key order by key) into batch from (select key from unnest(keys) key where after_id is null or key>after_id order by key limit 100) p;
  foreach k in array coalesce(batch,'{}') loop
   select public.dictionary_exchange_record(e.id) into record from public.dictionary_entries e where e.id::text=k;
   sources:=public.dictionary_transfer_reviews(k);
   result:=result||jsonb_build_array(coalesce(record,jsonb_build_object('snapshot',null,'reviews','[]'::jsonb,'version',null))||jsonb_build_object('entry_id',k,'import_reviews',sources)||case when jsonb_array_length(sources)=1 then jsonb_build_object('import_candidate',sources->0->'item'->'draft') else '{}'::jsonb end);
   last_key:=k;
  end loop;
 end if;
 return jsonb_build_object('records',result,'total',cardinality(keys),'scope_version',stamp,'cursor',last_key,'has_more',exists(select 1 from unnest(keys) key where last_key is null or key>last_key));
end$$;

-- Add the original pending records without changing the existing full canonical context/version contract.
create or replace function public.inspect_dictionary_exchange(drafts jsonb) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare d jsonb;c jsonb;record jsonb;result jsonb:='[]';targets jsonb;eid uuid;
begin
 if not public.is_dictionary_admin() then raise exception 'Dictionary admin required';end if;
 if jsonb_typeof(drafts) is distinct from 'array' or jsonb_array_length(drafts)>25 then raise exception 'Expected at most 25 drafts';end if;
 for d in select value from jsonb_array_elements(drafts) loop
  eid:=(d->'bundle'->'dictionary_entries'->0->>'id')::uuid;
  c:=public.dictionary_import_context(d);record:=public.dictionary_exchange_record(eid);
  select coalesce(jsonb_agg(jsonb_build_object('entry_id',s.entry_id,'sense_id',s.id)),'[]') into targets from public.dictionary_senses s
  where exists(select 1 from jsonb_array_elements(coalesce(d->'bundle'->'dictionary_relations','[]')) r where r->>'target_entry_id'=s.entry_id::text and r->>'target_sense_id'=s.id::text);
  result:=result||jsonb_build_array(c||jsonb_build_object('exchange',jsonb_build_object('version',record->'version','reviews',coalesce(record->'reviews','[]'),'targets',targets,'import_review_refs',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'entry_id',r.entry_id,'revision',r.revision,'version',md5(to_jsonb(r)::text)) order by r.id) from public.dictionary_import_review_items r where r.entry_id=eid::text and public.dictionary_transfer_pending(r.item,r.pending_count)),'[]'::jsonb))));
 end loop;
 return result;
end$$;

-- The client classification is only a preview. Independently reject overwrites, scope changes,
-- duplicate-by-content new IDs and old-order changes at the write boundary.
create function public.dictionary_assert_safe_transfer(c jsonb,base jsonb) returns void
language plpgsql immutable set search_path='' as $$
declare section text;rows jsonb;old_rows jsonb;r jsonb;old_row jsonb;other jsonb;f text;field_value jsonb;old_value jsonb;key_name text;new_sense boolean:=false;
begin
 if jsonb_typeof(c) is distinct from 'object' or c ? 'ai' then raise exception 'Invalid safe import candidate';end if;
 if base is not null and (c->'bundle'->'dictionary_entries'->0->>'id' is distinct from base->'bundle'->'dictionary_entries'->0->>'id'
 or c->'bundle'->'dictionary_entries'->0->>'kind' is distinct from base->'bundle'->'dictionary_entries'->0->>'kind'
 or c->'bundle'->'dictionary_entries'->0->>'headword' is distinct from base->'bundle'->'dictionary_entries'->0->>'headword') then raise exception 'Existing Entry identity/content requires review';end if;
 if c->'bundle'->'dictionary_entries'->0 ? 'word_segments'
 and c->'bundle'->'dictionary_entries'->0->'word_segments' is distinct from base->'bundle'->'dictionary_entries'->0->'word_segments'
 and coalesce(base->'bundle'->'dictionary_entries'->0->'word_segments','null')<>'null'::jsonb then raise exception 'Existing word segments require review';end if;
 foreach section in array array['dictionary_senses','dictionary_relations','dictionary_etymologies','dictionary_learning_notes','examples','annotations','pronunciations','inflections','sense_groups'] loop
  rows:=coalesce(case when section like 'dictionary_%' then c->'bundle'->section else c->section end,'[]');
  old_rows:=coalesce(case when section like 'dictionary_%' then base->'bundle'->section else base->section end,'[]');
  key_name:=case when section='sense_groups' then 'sense_id' else 'id' end;
  for r in select value from jsonb_array_elements(rows) loop
   select value into old_row from jsonb_array_elements(old_rows) where value->>key_name=r->>key_name;
   if old_row is not null then
    for f,field_value in select key,value from jsonb_each(r) loop
     if f in ('id','revision','updated_at','row') then continue;end if;
     old_value:=old_row->f;
     if field_value is not distinct from old_value or field_value='null'::jsonb and old_value is null then continue;end if;
     if f in ('entry_id','sense_id','target_entry_id','target_sense_id','form_kind','kind','sort_order')
      or not (old_value is null or old_value in ('null'::jsonb,'""'::jsonb,'[]'::jsonb)) then raise exception 'Existing content or ownership requires review: %',f;end if;
    end loop;
   else
    if section='dictionary_senses' then new_sense:=true;end if;
    for other in select value from jsonb_array_elements(old_rows||rows) where value->>key_name<>r->>key_name loop
     if section='dictionary_senses' and lower(btrim(coalesce(other->>'part_of_speech','')))=lower(btrim(coalesce(r->>'part_of_speech','')))
       and lower(btrim(other->>'gloss_zh_tw'))=lower(btrim(r->>'gloss_zh_tw'))
     or section='dictionary_relations' and other->'sense_id' is not distinct from r->'sense_id' and other->>'target_sense_id'=r->>'target_sense_id'
     or section='inflections' and other->'sense_id' is not distinct from r->'sense_id' and other->>'form_kind'=r->>'form_kind'
     or section='pronunciations' and other->'sense_id' is not distinct from r->'sense_id' and other->>'ipa'=r->>'ipa'
     or section in ('dictionary_etymologies','dictionary_learning_notes','examples','annotations') and other->'sense_id' is not distinct from r->'sense_id' and other->'kind' is not distinct from r->'kind' and lower(btrim(other->>'body'))=lower(btrim(r->>'body')) then raise exception 'Potential duplicate content requires review';end if;
    end loop;
   end if;
  end loop;
 end loop;
 if new_sense then
  foreach section in array array['dictionary_etymologies','dictionary_learning_notes','examples','annotations','pronunciations','inflections'] loop
   old_rows:=coalesce(case when section like 'dictionary_%' then base->'bundle'->section else base->section end,'[]');
   if exists(select 1 from jsonb_array_elements(old_rows) v where v->>'sense_id' is null) then raise exception 'New Sense with existing shared content requires review';end if;
  end loop;
 end if;
 if jsonb_typeof(c->'group_data')='object' then
  for f,field_value in select key,value from jsonb_each(c->'group_data') loop
   old_value:=base->'group_data'->f;
   if field_value is distinct from old_value and not ((old_value is null or old_value in ('null'::jsonb,'""'::jsonb,'[]'::jsonb)) and (field_value='null'::jsonb or field_value is not null)) then raise exception 'Existing grouping requires review';end if;
  end loop;
 end if;
 if c ? 'component_order' and coalesce(base->'component_order','[]')<>'[]'::jsonb and c->'component_order' is distinct from base->'component_order' then
  if (select coalesce(jsonb_agg(v order by n),'[]') from jsonb_array_elements(c->'component_order') with ordinality x(v,n) where n<=jsonb_array_length(base->'component_order')) is distinct from base->'component_order' then raise exception 'Existing component order requires review';end if;
 end if;
end$$;

-- Exact issue coverage: a safe new row or actual blank-field fill under the same stable target.
create function public.dictionary_transfer_covers(issue jsonb,c jsonb,base jsonb) returns boolean
language plpgsql immutable set search_path='' as $$
declare section text:=issue->'target'->>'section';row_id text:=issue->'target'->>'id';field text:=issue->'target'->>'field';rows jsonb;old_rows jsonb;r jsonb;old_row jsonb;incoming jsonb;
begin
 if coalesce((issue->>'applied')::boolean,false) then return false;end if;
 if section='entry' and field in ('word_segments','component_order') then
  r:=case when field='word_segments' then c->'bundle'->'dictionary_entries'->0->field else c->field end;old_row:=case when field='word_segments' then base->'bundle'->'dictionary_entries'->0->field else base->field end;
  return r is not null and r<>'null'::jsonb and r is distinct from old_row and (old_row is null or old_row in ('null'::jsonb,'[]'::jsonb));
 elsif section='grouping' and field in ('primary_category','tags','variant_group') then
  r:=c->'group_data'->field;old_row:=base->'group_data'->field;return r is not null and r<>'null'::jsonb and r is distinct from old_row and (old_row is null or old_row in ('null'::jsonb,'""'::jsonb,'[]'::jsonb));
 end if;
 if row_id is null or section not in ('senses','relations','etymologies','learning_notes','examples','relation_hints','pronunciations','inflections') then return false;end if;
 section:=case section when 'relation_hints' then 'annotations' when 'senses' then 'dictionary_senses' when 'relations' then 'dictionary_relations' when 'etymologies' then 'dictionary_etymologies' when 'learning_notes' then 'dictionary_learning_notes' else section end;
 rows:=coalesce(case when section like 'dictionary_%' then c->'bundle'->section else c->section end,'[]');
 old_rows:=coalesce(case when section like 'dictionary_%' then base->'bundle'->section else base->section end,'[]');
 select value into r from jsonb_array_elements(rows) where value->>'id'=row_id;
 select value into old_row from jsonb_array_elements(old_rows) where value->>'id'=row_id;
 if r is null then return false;end if;
 if field is not null then return old_row is not null and r->field is distinct from old_row->field and (old_row->field is null or old_row->field in ('null'::jsonb,'""'::jsonb,'[]'::jsonb));end if;
 incoming:=issue->'incoming';
 return old_row is null and (incoming->>'id' is null or incoming->>'id'=row_id)
 and coalesce(incoming->'sense_id','null') is not distinct from coalesce(r->'sense_id','null');
end$$;

create function public.apply_dictionary_safe_import_reviews(operations jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare request jsonb;r public.dictionary_import_review_items;old public.dictionary_import_review_items;receipt public.dictionary_import_operations;oid uuid;c jsonb;ctx jsonb;base jsonb;editor_count integer;ref jsonb;issue jsonb;issues jsonb;covered jsonb;ids jsonb;reply jsonb;results jsonb:='[]';entry_key text;
begin
 if auth.uid() is null or not public.is_dictionary_admin() then raise exception 'Dictionary admin required';end if;
 if jsonb_typeof(operations) is distinct from 'array' or jsonb_array_length(operations)>25 then raise exception 'Expected at most 25 operations';end if;
 perform pg_advisory_xact_lock(710,1);
 for request in select value from jsonb_array_elements(operations) loop
  begin
   select * into r from public.dictionary_import_review_items where id=(request->>'id')::uuid for update;
   if not found then raise exception 'Unknown import review';end if;
   oid:=md5(r.id::text||':'||(request->>'revision')||':apply')::uuid;
   select * into receipt from public.dictionary_import_operations where owner_id=auth.uid() and operation_id=oid;
   if found then
    if receipt.request->'durable_request' is distinct from request or receipt.result->>'safe_replacement' is distinct from 'true' then raise exception 'Safe import operation identity collision';end if;
    results:=results||jsonb_build_array(to_jsonb(r));continue;
   end if;
   if request->>'revision' is null or r.revision<>(request->>'revision')::bigint then raise exception 'Import review revision conflict; reanalyze';end if;
   c:=request->'candidate';entry_key:=c->'bundle'->'dictionary_entries'->0->>'id';
   if c is null or c='null'::jsonb or entry_key is distinct from r.entry_id then raise exception 'Invalid safe import identity';end if;
   lock table public.dictionary_entries,public.dictionary_senses,public.dictionary_relations,public.dictionary_etymologies,public.dictionary_learning_notes,public.dictionary_entry_groups,public.dictionary_sense_groups,public.dictionary_examples,public.dictionary_lexical_annotations,public.dictionary_pronunciations,public.dictionary_inflections,public.dictionary_ai_metadata,public.dictionary_review_drafts in share row exclusive mode;
   ctx:=public.dictionary_import_context(r.item->'observed');
   base:=case when ctx->'snapshot'='null'::jsonb or ctx->'snapshot' is null then null else public.dictionary_snapshot_candidate(ctx->'snapshot') end;
   select count(*) into editor_count from public.dictionary_review_drafts where entry_id=entry_key::uuid and state='active';
   if editor_count>1 then raise exception 'Multiple active Reviews';end if;
   if editor_count=1 then select candidate into base from public.dictionary_review_drafts where entry_id=entry_key::uuid and state='active' for update;end if;
   if exists(select 1 from jsonb_array_elements(r.item->'issues') i where not coalesce((i->>'applied')::boolean,false) and i->>'type' in ('identity_kind','identity_owner','homograph','invalid','revision_conflict','preview_changed','batch_homograph','apply_failed','legacy_operation','invalid_reference','invalid_content')) then raise exception 'Blocked proposal cannot use safe import';end if;
   perform public.dictionary_assert_safe_transfer(c,base);
   if jsonb_typeof(coalesce(request->'replaces','[]')) is distinct from 'array' then raise exception 'Invalid replacement references';end if;
   -- Lock in stable ID order, before the original import authority writes anything.
   for ref in select value from jsonb_array_elements(coalesce(request->'replaces','[]')) order by value->>'id' loop
    select * into old from public.dictionary_import_review_items where id=(ref->>'id')::uuid for update;
    if not found or old.id=r.id or old.entry_id<>entry_key or old.item->'draft'->>'kind' is distinct from c->'bundle'->'dictionary_entries'->0->>'kind' or old.revision<>(ref->>'revision')::bigint or md5(to_jsonb(old)::text) is distinct from ref->>'version' then raise exception 'Replacement source changed; reanalyze';end if;
    ids:=ref->'issue_ids';
    if jsonb_typeof(ids) is distinct from 'array' or jsonb_array_length(ids)<>(select count(distinct v) from jsonb_array_elements_text(ids) v) then raise exception 'Invalid replacement issue IDs';end if;
    for issue in select value from jsonb_array_elements(old.item->'issues') where ids ? (value->>'id') loop
     if not public.dictionary_transfer_covers(issue,c,base) then raise exception 'Replacement content correspondence is unproven';end if;
    end loop;
    if jsonb_array_length(ids)<>(select count(*) from jsonb_array_elements(old.item->'issues') v where ids ? (v->>'id')) then raise exception 'Unknown replacement issue';end if;
   end loop;
   reply:=public.apply_dictionary_import_reviews(jsonb_build_array(request))->0;
   if reply->>'request_conflict' is not null then raise exception '%',reply->>'request_conflict';end if;
   if reply->'result'->>'status'='applied' then
    covered:='[]';
    for ref in select value from jsonb_array_elements(coalesce(request->'replaces','[]')) loop
     if jsonb_array_length(ref->'issue_ids')=0 then continue;end if;
     select * into old from public.dictionary_import_review_items where id=(ref->>'id')::uuid;
     select jsonb_agg(case when ref->'issue_ids' ? (v->>'id') then v||'{"applied":true}'::jsonb else v end) into issues from jsonb_array_elements(old.item->'issues') v;
     old.item:=jsonb_set(old.item,'{issues}',issues);old.pending_count:=public.dictionary_import_pending(old.item);
     if old.pending_count=0 then old.item:=jsonb_set(old.item,'{status}','"applied"');end if;
     update public.dictionary_import_review_items set item=old.item,pending_count=old.pending_count,revision=revision+1,updated_by=auth.uid(),updated_at=now(),result=coalesce(result,'{}')||jsonb_build_object('safe_replaced_by',oid,'replaced_issue_ids',ref->'issue_ids') where id=old.id;
     covered:=covered||jsonb_build_array(ref->'id');
    end loop;
    update public.dictionary_import_operations set result=result||jsonb_build_object('safe_replacement',true,'cleared',covered) where owner_id=auth.uid() and operation_id=oid;
    update public.dictionary_import_review_items set result=result||jsonb_build_object('safe_replacement',true,'cleared',covered) where id=r.id returning * into r;
    reply:=to_jsonb(r);
   elsif exists(select 1 from jsonb_array_elements(coalesce(request->'replaces','[]')) source where jsonb_array_length(source->'issue_ids')>0) then
    -- Unchanged/stale/failed cannot consume any replacement proof or leave a partial write.
    raise exception 'Safe write did not commit; old reviews retained: %',reply->'result'->>'status';
   else
    update public.dictionary_import_operations set result=result||'{"safe_replacement":true}' where owner_id=auth.uid() and operation_id=oid;
   end if;
   results:=results||jsonb_build_array(reply);
  exception when others then
   select * into r from public.dictionary_import_review_items where id=(request->>'id')::uuid;
   results:=results||jsonb_build_array(to_jsonb(r)||jsonb_build_object('request_conflict',sqlerrm));
  end;
 end loop;
 return results;
end$$;

revoke all on function public.dictionary_transfer_pending(jsonb,integer),public.dictionary_transfer_reviews(text),public.dictionary_assert_safe_transfer(jsonb,jsonb),public.dictionary_transfer_covers(jsonb,jsonb,jsonb) from public,anon,authenticated;
revoke all on function public.dictionary_exchange_transfer_capabilities(),public.export_dictionary_exchange_page(text[],text[],text,text,text,boolean,boolean),public.apply_dictionary_safe_import_reviews(jsonb) from public,anon;
grant execute on function public.dictionary_exchange_transfer_capabilities(),public.export_dictionary_exchange_page(text[],text[],text,text,text,boolean,boolean),public.apply_dictionary_safe_import_reviews(jsonb) to authenticated;
do $$begin
 if exists(select 1 from pg_roles where rolname='service_role') then
  revoke all on function public.dictionary_transfer_pending(jsonb,integer),public.dictionary_transfer_reviews(text),public.dictionary_assert_safe_transfer(jsonb,jsonb),public.dictionary_transfer_covers(jsonb,jsonb,jsonb) from service_role;
 end if;
end$$;
commit;
