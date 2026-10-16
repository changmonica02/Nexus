-- Retire only unstructured source_forms, never structured dictionary_inflections.
-- Recovery copies are isolated from PostgREST and all application roles.
begin;
set local lock_timeout='5s';
set local statement_timeout='120s';
select pg_advisory_xact_lock(710,1);
lock table public.dictionary_lexical_annotations, public.dictionary_review_drafts,
 public.dictionary_import_review_items in share row exclusive mode;
create schema if not exists dictionary_retirement_backup;
revoke all on schema dictionary_retirement_backup from public,anon,authenticated;
create table dictionary_retirement_backup.source_forms as
 select * from public.dictionary_lexical_annotations where kind='source_forms';
create table dictionary_retirement_backup.review_drafts as
 select * from public.dictionary_review_drafts where state='active';
create table dictionary_retirement_backup.import_review_items as
 select * from public.dictionary_import_review_items;
revoke all on all tables in schema dictionary_retirement_backup from public,anon,authenticated;

-- Fingerprint live structured content; any unexpected change aborts the transaction.
create table dictionary_retirement_backup.integrity(table_name text primary key,row_count bigint,digest text);
do $$declare t text; n bigint; d text;begin
 foreach t in array array['dictionary_entries','dictionary_senses','dictionary_relations','dictionary_etymologies','dictionary_learning_notes','dictionary_pronunciations','dictionary_inflections','dictionary_entry_groups','dictionary_sense_groups','dictionary_ai_metadata','dictionary_published_revisions','dictionary_import_operations','dictionary_lexical_annotations'] loop
  execute format($q$select count(*),md5(coalesce(string_agg(md5(to_jsonb(r)::text),'' order by md5(to_jsonb(r)::text)),'')) from public.%I r %s$q$,t,case when t='dictionary_lexical_annotations' then $f$where kind='relation_hint'$f$ else '' end) into n,d;
  insert into dictionary_retirement_backup.integrity values(t,n,d);
 end loop;
end$$;
revoke all on dictionary_retirement_backup.integrity from public,anon,authenticated;

-- One-time data transformation, removed before commit (not an application API).
create function dictionary_retirement_backup.clean(value jsonb) returns jsonb
language plpgsql immutable set search_path='' as $$
declare result jsonb; k text; v jsonb;
begin
 if jsonb_typeof(value)='object' then
  result:='{}';
  for k,v in select * from jsonb_each(value) loop
   if k in ('raw_candidate','operation') then result:=result||jsonb_build_object(k,v);continue;end if;
   if k='source_forms' or (k='lexical_annotations' and value ? 'headword' and value ? 'entry_id') then continue; end if;
   if k='lexical_annotations' and jsonb_typeof(v)='array' then
    select coalesce(jsonb_agg(x order by n),'[]') into v from jsonb_array_elements(v) with ordinality a(x,n) where x->>'kind'='relation_hint';
   end if;
   if k='issues' and jsonb_typeof(v)='array' then
    select coalesce(jsonb_agg(x order by n),'[]') into v from jsonb_array_elements(v) with ordinality a(x,n) where coalesce(x->'target'->>'section','')<>'lexical_annotations';
   end if;
   result:=result||jsonb_build_object(k,dictionary_retirement_backup.clean(v));
  end loop;
  return result;
 elsif jsonb_typeof(value)='array' then
  select coalesce(jsonb_agg(dictionary_retirement_backup.clean(x) order by n),'[]') into result from jsonb_array_elements(value) with ordinality a(x,n) where coalesce(x->>'kind','')<>'source_forms';
  return result;
 end if;
 return value;
end $$;
revoke all on function dictionary_retirement_backup.clean(jsonb) from public,anon,authenticated;
-- History, audit, operation receipts and raw source archives remain immutable.
update public.dictionary_review_drafts set
 candidate=dictionary_retirement_backup.clean(candidate),
 base_snapshot=dictionary_retirement_backup.clean(base_snapshot),
 revision=revision+1,updated_at=now()
where state='active' and (candidate is distinct from dictionary_retirement_backup.clean(candidate)
 or base_snapshot is distinct from dictionary_retirement_backup.clean(base_snapshot));
update public.dictionary_import_review_items set
 item=dictionary_retirement_backup.clean(item)||jsonb_build_object('status','stale','message','舊字形註釋已退場；請重新比對後套用，其他決策保留。'),
 pending_count=public.dictionary_import_pending(dictionary_retirement_backup.clean(item)),
 revision=revision+1,updated_at=now()
where item is distinct from dictionary_retirement_backup.clean(item);
delete from public.dictionary_lexical_annotations where kind='source_forms';
alter table public.dictionary_lexical_annotations drop constraint dictionary_lexical_annotations_kind_check;
alter table public.dictionary_lexical_annotations add constraint dictionary_lexical_annotations_kind_check check(kind='relation_hint');
create table dictionary_retirement_backup.review_drafts_after as select * from public.dictionary_review_drafts where id in (select id from dictionary_retirement_backup.review_drafts);
create table dictionary_retirement_backup.import_review_items_after as select * from public.dictionary_import_review_items;
revoke all on all tables in schema dictionary_retirement_backup from public,anon,authenticated;
drop function dictionary_retirement_backup.clean(jsonb);
do $$declare b record; n bigint; d text;begin
 for b in select * from dictionary_retirement_backup.integrity loop
  execute format($q$select count(*),md5(coalesce(string_agg(md5(to_jsonb(r)::text),'' order by md5(to_jsonb(r)::text)),'')) from public.%I r %s$q$,b.table_name,case when b.table_name='dictionary_lexical_annotations' then $f$where kind='relation_hint'$f$ else '' end) into n,d;
  if n<>b.row_count or d is distinct from b.digest then raise exception 'Unexpected dictionary change: %',b.table_name;end if;
 end loop;
end$$;

notify pgrst,'reload schema';
commit;
