-- Deterministic core-concept consolidation; application write guards and RLS are never disabled.
begin;
set local lock_timeout='5s';
set local statement_timeout='120s';
select pg_advisory_xact_lock(710,1);
create schema if not exists dictionary_core_backup;
revoke all on schema dictionary_core_backup from public,anon,authenticated;
create table if not exists dictionary_core_backup.migration_state(id boolean primary key default true check(id),done boolean not null default false);
insert into dictionary_core_backup.migration_state values(true,false) on conflict do nothing;
revoke all on all tables in schema dictionary_core_backup from public,anon,authenticated;
do $migration$begin
 if (select done from dictionary_core_backup.migration_state) then return;end if;
 execute $ddl$
lock table public.dictionary_learning_notes,public.dictionary_review_drafts in share row exclusive mode;
create table dictionary_core_backup.notes as table public.dictionary_learning_notes;
create table dictionary_core_backup.reviews as select * from public.dictionary_review_drafts where state='active';
create table dictionary_core_backup.integrity(table_name text primary key,row_count bigint,digest text);
do $fingerprint$declare t text;n bigint;d text;begin
 foreach t in array array['dictionary_entries','dictionary_senses','dictionary_relations','dictionary_etymologies','dictionary_pronunciations','dictionary_inflections','dictionary_examples','dictionary_lexical_annotations','dictionary_ai_metadata','dictionary_published_revisions'] loop
  execute format('select count(*),md5(coalesce(string_agg(md5(to_jsonb(r)::text),'''' order by md5(to_jsonb(r)::text)),'''')) from public.%I r',t) into n,d;
  insert into dictionary_core_backup.integrity values(t,n,d);
 end loop;
end $fingerprint$;

create table dictionary_core_backup.functions as select p.oid::regprocedure::text identity,pg_get_functiondef(p.oid) definition from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('dictionary_normalize_snapshot','dictionary_guard_change');

create or replace function public.dictionary_core_content(v jsonb) returns jsonb
language plpgsql immutable set search_path='' as $fn$
declare result jsonb; k text; x jsonb; grp jsonb; representative jsonb; merged jsonb;
begin
 if jsonb_typeof(v)='object' then
  result:='{}';
  for k,x in select * from jsonb_each(v) loop
   if k in ('raw_candidate','operation') then result:=result||jsonb_build_object(k,x);
   else result:=result||jsonb_build_object(k,public.dictionary_core_content(x));end if;
  end loop;
  if v ? 'body' and v->>'kind' in ('learning_decomposition','mnemonic_scenario') and v ? 'revision' then result:=jsonb_set(result,'{revision}',to_jsonb((v->>'revision')::bigint+1));end if;
  return result;
 elsif jsonb_typeof(v)='array' then
  select coalesce(jsonb_agg(public.dictionary_core_content(a.x) order by a.n),'[]') into result from jsonb_array_elements(v) with ordinality a(x,n);
  if not exists(select 1 from jsonb_array_elements(result) r where r ? 'body' and r->>'kind' in ('learning_decomposition','mnemonic_scenario')) then return result;end if;
  merged:='[]';
  -- Keep unrelated array elements and merge only legacy note groups by Entry AND Sense.
  for x in select value from jsonb_array_elements(result) where not(value ? 'body' and coalesce(value->>'kind','') in ('learning_decomposition','mnemonic_scenario')) loop merged:=merged||jsonb_build_array(x);end loop;
  for grp in select jsonb_agg(r order by case r->>'kind' when 'learning_decomposition' then 0 else 1 end,r->>'id') from jsonb_array_elements(result) r where r ? 'body' and r->>'kind' in ('learning_decomposition','mnemonic_scenario') group by r->>'entry_id',r->>'sense_id' order by min(r->>'id') loop
   representative:=grp->0;
   select string_agg(value->>'body',E'\n\n' order by n) into k from jsonb_array_elements(grp) with ordinality a(value,n);
   merged:=merged||jsonb_build_array(representative||jsonb_build_object('kind','core_concept','body',k));
  end loop;
  select coalesce(jsonb_agg(value order by value->>'id'),'[]') into merged from jsonb_array_elements(merged);
  return merged;
 end if;
 return v;
end $fn$;
revoke all on function public.dictionary_core_content(jsonb) from public,anon,authenticated;

create table dictionary_core_backup.merged_notes as select x.* from jsonb_populate_recordset(null::public.dictionary_learning_notes,public.dictionary_core_content(coalesce((select jsonb_agg(to_jsonb(n)) from dictionary_core_backup.notes n),'[]'))) x;
-- Schema conversion, not an unapproved publication: textual content is only joined, never authored.
-- Original source IDs and each original child row remain in operator-only notes.
create function dictionary_core_backup.merged_body(key uuid,original text) returns text language sql stable set search_path='' as $fn$select coalesce((select body from dictionary_core_backup.merged_notes where id=key),original)$fn$;
create function dictionary_core_backup.next_revision(key uuid,original bigint) returns bigint language sql stable set search_path='' as $fn$select original+case when exists(select 1 from dictionary_core_backup.notes where id=key and kind in ('learning_decomposition','mnemonic_scenario')) then 1 else 0 end$fn$;
alter table public.dictionary_learning_notes drop constraint dictionary_learning_notes_kind_check;
alter table public.dictionary_learning_notes alter column body type text using dictionary_core_backup.merged_body(id,body);
alter table public.dictionary_learning_notes alter column kind type text using 'core_concept'::text;
alter table public.dictionary_learning_notes alter column revision type bigint using dictionary_core_backup.next_revision(id,revision);
alter table public.dictionary_learning_notes add constraint dictionary_learning_notes_kind_check check(kind='core_concept');
-- A merged-away Stable ID must not be silently recreated by an old partial exchange file.
create table public.dictionary_core_aliases(legacy_id uuid primary key,entry_id uuid not null,canonical_id uuid references public.dictionary_learning_notes(id) on delete set null);
alter table public.dictionary_core_aliases enable row level security;
revoke all on public.dictionary_core_aliases from public,anon,authenticated;
grant select on public.dictionary_core_aliases to authenticated;
create policy dictionary_core_aliases_admin_read on public.dictionary_core_aliases for select to authenticated using(public.is_dictionary_admin());
insert into public.dictionary_core_aliases(legacy_id,entry_id,canonical_id)
 select n.id,n.entry_id,m.id from dictionary_core_backup.notes n join dictionary_core_backup.merged_notes m on m.id=(select b.id from dictionary_core_backup.notes b where b.entry_id=n.entry_id and b.sense_id is not distinct from n.sense_id and b.kind in ('learning_decomposition','mnemonic_scenario') order by case b.kind when 'learning_decomposition' then 0 else 1 end,b.id limit 1) where n.id<>m.id and not exists(select 1 from dictionary_core_backup.merged_notes retained where retained.id=n.id);
create or replace function public.dictionary_guard_change() returns trigger
language plpgsql security definer set search_path = '' as $$
declare parent public.dictionary_entries; target public.dictionary_entries;
begin
  if tg_table_name='dictionary_learning_notes' and tg_op='INSERT' and exists(select 1 from public.dictionary_core_aliases where legacy_id=new.id) then raise exception 'Merged legacy core ID; re-export or recompare before import';end if;
  if tg_table_name = 'dictionary_sources' then
    if tg_op <> 'INSERT' then raise exception 'Source snapshots are immutable'; end if;
    new.sha256 := encode(sha256(convert_to(new.raw_text, 'UTF8')), 'hex');
    return new;
  end if;
  if (tg_op='INSERT' and new.source_id is not null) or (tg_op='UPDATE' and new.source_id is distinct from old.source_id) then raise exception 'source_id is retired; omit legacy attribution'; end if;
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
end $$;
-- Redundant legacy rows are backed up; representative Stable ID is never regenerated.
insert into public.dictionary_audit(actor_id,database_role,table_name,record_id,operation,before_row)
 select auth.uid(),session_user,'dictionary_learning_notes',n.id,'DELETE',to_jsonb(n) from dictionary_core_backup.notes n where not exists(select 1 from dictionary_core_backup.merged_notes m where m.id=n.id);
delete from public.dictionary_learning_notes n where not exists(select 1 from dictionary_core_backup.merged_notes m where m.id=n.id);
drop function dictionary_core_backup.merged_body(uuid,text);
drop function dictionary_core_backup.next_revision(uuid,bigint);
create or replace function public.dictionary_normalize_snapshot(s jsonb) returns jsonb language sql immutable set search_path='' as $fn$
 select public.dictionary_core_content(public.dictionary_without_verification(case when s is null then null else jsonb_set(jsonb_set(s,'{detail,inflections}',coalesce(s->'detail'->'inflections','[]'::jsonb)),'{detail,relations}',coalesce((select jsonb_agg(value-'relation_kind'-'verification'-'verification_note' order by value->>'id') from jsonb_array_elements(coalesce(s->'detail'->'relations','[]'::jsonb))),'[]'::jsonb)) end));
$fn$;
update public.dictionary_review_drafts set candidate=public.dictionary_core_content(candidate),base_snapshot=public.dictionary_core_content(base_snapshot),revision=revision+1,updated_at=now()
 where state='active' and (candidate is distinct from public.dictionary_core_content(candidate) or base_snapshot is distinct from public.dictionary_core_content(base_snapshot));
do $work$begin
 if to_regclass('public.dictionary_import_review_items') is not null then
  lock table public.dictionary_import_review_items in share row exclusive mode;
  create table dictionary_core_backup.import_items as table public.dictionary_import_review_items;
  update public.dictionary_import_review_items set item=public.dictionary_core_content(item)||jsonb_build_object('status','stale','message','口訣與記憶故事已整合為核心概念；請重新比對，原始資料與其他決策保留。'),revision=revision+1,updated_at=now()
   where item is distinct from public.dictionary_core_content(item);
 end if;
end $work$;
create table dictionary_core_backup.reviews_after as select * from public.dictionary_review_drafts where id in(select id from dictionary_core_backup.reviews);
revoke all on all tables in schema dictionary_core_backup from public,anon,authenticated;
do $fingerprint$declare b record;n bigint;d text;begin
 for b in select * from dictionary_core_backup.integrity loop
  execute format('select count(*),md5(coalesce(string_agg(md5(to_jsonb(r)::text),'''' order by md5(to_jsonb(r)::text)),'''')) from public.%I r',b.table_name) into n,d;
  if n<>b.row_count or d is distinct from b.digest then raise exception 'Unexpected dictionary change: %',b.table_name;end if;
 end loop;
end $fingerprint$;
do $check$begin
 if exists(select 1 from public.dictionary_learning_notes n full join dictionary_core_backup.merged_notes m using(id) where (to_jsonb(n)-'kind') is distinct from (to_jsonb(m)-'kind')) then raise exception 'Core concept integrity mismatch';end if;
 if exists(select 1 from dictionary_core_backup.notes n where not exists(select 1 from public.dictionary_learning_notes m where m.entry_id=n.entry_id and m.sense_id is not distinct from n.sense_id and position(n.body in m.body)>0)) then raise exception 'Lost legacy core content';end if;
end $check$;
update dictionary_core_backup.migration_state set done=true;
$ddl$;
end $migration$;
notify pgrst,'reload schema';
commit;
