-- Run AFTER 20261021 on a confirmed isolated Supabase staging project.
-- Read-only catalog assertions: no migration, data write or publication occurs here.
-- Passing these checks is not a substitute for Auth JWT / PostgREST / UI acceptance.
begin read only;
do $$
declare signature text; function_oid oid;
begin
 if to_regclass('public.dictionary_publication_confirmation') is null then
  raise exception '20261021 migration is not installed';
 end if;
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='dictionary_relations' and column_name='sense_id' and is_nullable='YES') then
  raise exception 'Source Sense must support entry-shared NULL';
 end if;
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='dictionary_relations' and column_name='target_sense_id' and is_nullable='NO') then
  raise exception 'Target Sense contract must remain required';
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.dictionary_relations'::regclass and conname='dictionary_relations_source_entry_fkey' and confrelid='public.dictionary_entries'::regclass) then
  raise exception 'Direct source Entry FK missing (reverse embed requires this FK)';
 end if;
 if (select count(*) from information_schema.columns where table_schema='public' and table_name='dictionary_relations' and column_name in ('relation_kind','verification','verification_note'))<>3 then
  raise exception 'Legacy compatibility columns must remain intact';
 end if;
 if exists(select 1 from pg_class where oid in ('public.dictionary_relations'::regclass,'public.dictionary_publication_confirmation'::regclass,'public.dictionary_review_drafts'::regclass,'public.dictionary_published_revisions'::regclass) and not relrowsecurity) then
  raise exception 'RLS disabled on protected dictionary table';
 end if;
 foreach signature in array array['public.publish_dictionary_entry(uuid)','public.approve_dictionary_review(uuid,bigint)','public.publish_dictionary_bulk(text[],text,text)','public.guard_dictionary_composition_scope()','public.dictionary_materialize_review(uuid,jsonb)','public.dictionary_normalize_snapshot(jsonb)'] loop
  function_oid:=to_regprocedure(signature);
  if function_oid is null then raise exception 'Missing function %',signature;end if;
  if has_function_privilege('anon',function_oid,'EXECUTE') or has_function_privilege('authenticated',function_oid,'EXECUTE') then
   raise exception 'Client can execute private/legacy function %',signature;
  end if;
 end loop;
 foreach signature in array array['public.publish_dictionary_entry(uuid,boolean)','public.approve_dictionary_review(uuid,bigint,boolean)','public.publish_dictionary_bulk(text[],text,text,boolean)'] loop
  function_oid:=to_regprocedure(signature);
  if function_oid is null then raise exception 'Missing verified publication overload %',signature;end if;
  if has_function_privilege('anon',function_oid,'EXECUTE') or not has_function_privilege('authenticated',function_oid,'EXECUTE') then
   raise exception 'Incorrect public RPC role privileges %',signature;
  end if;
 end loop;
 if has_table_privilege('anon','public.dictionary_publication_confirmation','SELECT,INSERT,UPDATE,DELETE') or has_table_privilege('authenticated','public.dictionary_publication_confirmation','SELECT,INSERT,UPDATE,DELETE') then
  raise exception 'Client can access private publication capability';
 end if;
end $$;
select 'PASS: catalog, nullable source/required target, legacy preservation, FK, RLS, RPC and capability privileges' as result;
commit;
