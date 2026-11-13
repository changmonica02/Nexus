-- Installs an explicit, admin-only maintenance transaction. Does not clear any data.
begin;
create function public.preview_dictionary_review_cleanup() returns jsonb
language plpgsql stable security definer set search_path='' as $body$
begin
 if not public.is_dictionary_admin() then raise exception 'Dictionary admin required';end if;
 return jsonb_build_object(
  'reviews',coalesce((select jsonb_agg(jsonb_build_object('id',id,'revision',revision,'hash',md5(to_jsonb(r)::text)) order by id) from public.dictionary_review_drafts r where state='active'),'[]'),
  'imports',coalesce((select jsonb_agg(jsonb_build_object('id',id,'revision',revision,'hash',md5(to_jsonb(r)::text)) order by id) from public.dictionary_import_review_items r where public.dictionary_transfer_pending(item,pending_count)),'[]'));
end $body$;
create function public.clear_dictionary_pending_reviews(expected jsonb, operation_uuid uuid) returns jsonb
language plpgsql security definer set search_path='' as $body$
declare current_manifest jsonb; saved public.dictionary_import_operations; result jsonb; review_count integer; import_count integer; invalidated_sessions jsonb;
begin
 if not public.is_dictionary_admin() then raise exception 'Dictionary admin required';end if;
 if operation_uuid is null or jsonb_typeof(expected) is distinct from 'object'
  or jsonb_typeof(expected->'reviews') is distinct from 'array' or jsonb_typeof(expected->'imports') is distinct from 'array'
  or exists(select 1 from jsonb_object_keys(expected) k where k not in ('reviews','imports')) then raise exception 'Invalid cleanup manifest';end if;
 perform pg_advisory_xact_lock(710,1);
 lock table public.dictionary_review_drafts,public.dictionary_import_review_items in share row exclusive mode;
 select * into saved from public.dictionary_import_operations where owner_id=auth.uid() and operation_id=operation_uuid for update;
 if found then
  if saved.request is distinct from jsonb_build_object('maintenance','review_cleanup','expected',expected) then raise exception 'Cleanup operation identity conflict';end if;
  return saved.result;
 end if;
 current_manifest:=public.preview_dictionary_review_cleanup();
 if current_manifest is distinct from expected then raise exception 'Pending reviews changed; refresh cleanup preview and backup';end if;
 select coalesce(jsonb_agg(distinct source->>'session_id'),'[]') into invalidated_sessions from public.dictionary_import_review_items where public.dictionary_transfer_pending(item,pending_count);
 -- Exact IDs, still-pending states and revisions. Completed work and normal drafts remain.
 delete from public.dictionary_review_drafts r using jsonb_array_elements(expected->'reviews') x
 where r.id=(x->>'id')::uuid and r.revision=(x->>'revision')::bigint and r.state='active';
 get diagnostics review_count=row_count;
 delete from public.dictionary_import_review_items r using jsonb_array_elements(expected->'imports') x
 where r.id=(x->>'id')::uuid and r.revision=(x->>'revision')::bigint and public.dictionary_transfer_pending(r.item,r.pending_count);
 get diagnostics import_count=row_count;
 if review_count<>jsonb_array_length(expected->'reviews') or import_count<>jsonb_array_length(expected->'imports') then raise exception 'Cleanup row count conflict';end if;
 result:=jsonb_build_object('operation_id',operation_uuid,'reviews_cleared',review_count,'imports_cleared',import_count,'invalidated_sessions',invalidated_sessions);
 -- Reuse existing expiring operation receipts; never remove older retry protection.
 insert into public.dictionary_import_operations(owner_id,operation_id,session_id,source_type,preview_at,request,result,created_at)
 values(auth.uid(),operation_uuid,operation_uuid,'json',clock_timestamp(),jsonb_build_object('maintenance','review_cleanup','expected',expected),result,clock_timestamp());
 return result;
end $body$;
revoke all on function public.preview_dictionary_review_cleanup(),public.clear_dictionary_pending_reviews(jsonb,uuid) from public,anon;
grant execute on function public.preview_dictionary_review_cleanup(),public.clear_dictionary_pending_reviews(jsonb,uuid) to authenticated;

-- An old browser's stage retry must not recreate cleared proposals. Receipts expire
-- under the existing retention policy, so previews are also bounded to that window.
create or replace function public.stage_dictionary_import_reviews(proposals jsonb) returns jsonb
language plpgsql security definer set search_path='' as $body$
declare p jsonb; r public.dictionary_import_review_items; result jsonb:='[]'; k text; source_preview_at timestamptz;
begin
 if not public.is_dictionary_admin() then raise exception 'Dictionary admin required';end if;
 if jsonb_typeof(proposals) is distinct from 'array' or jsonb_array_length(proposals)>25 then raise exception 'Expected at most 25 proposals';end if;
 perform pg_advisory_xact_lock(710,1);
 for p in select value from jsonb_array_elements(proposals) loop
  if coalesce(p->>'key','')='' or jsonb_typeof(p->'item'->'draft') is distinct from 'object' or p->'item'->'draft'->>'entry_id' is null or p->'source'->>'type' is null or p->'source'->>'type' not in ('csv','legacy_csv','json','md') or jsonb_typeof(p->'item'->'issues') is distinct from 'array' then raise exception 'Invalid proposal';end if;
  if exists(select 1 from jsonb_array_elements(p->'item'->'issues') x where x#>>'{target,section}'='grouping' or x#>>'{target,field}' in ('primary_category','variant_group','category')) then raise exception '舊構詞分類已退役，請重新分析匯入內容。';end if;
  p:=jsonb_set(p,'{item,draft}',public.dictionary_current_morphology_json(p#>'{item,draft}'));
  if p#>'{item,original}' is not null then p:=jsonb_set(p,'{item,original}',public.dictionary_current_morphology_json(p#>'{item,original}'));end if;
  if p->'source'->>'session_id' is null or p->'source'->>'preview_at' is null then raise exception 'Missing source identity';end if;
  perform (p->'source'->>'session_id')::uuid;source_preview_at:=(p->'source'->>'preview_at')::timestamptz;
  if source_preview_at<clock_timestamp()-interval '3 days' or source_preview_at>clock_timestamp()+interval '1 minute'
   or exists(select 1 from public.dictionary_import_operations o where o.request->>'maintenance'='review_cleanup' and (o.created_at>=source_preview_at or coalesce(o.result->'invalidated_sessions','[]') ? (p->'source'->>'session_id'))) then raise exception '舊匯入預覽已失效，請重新分析；不會重建已清除的待審核工作。';end if;
  k:=encode(sha256(convert_to(p->>'key','UTF8')),'hex');
  insert into public.dictionary_import_review_items(proposal_key,entry_id,source,item,pending_count,created_by,updated_by)
  values(k,p->'item'->'draft'->>'entry_id',p->'source',p->'item',public.dictionary_import_pending(p->'item'),auth.uid(),auth.uid()) on conflict(proposal_key) do nothing;
  select * into r from public.dictionary_import_review_items where proposal_key=k;
  result:=result||jsonb_build_array(to_jsonb(r));
 end loop;
 return result;
end $body$;
commit;
