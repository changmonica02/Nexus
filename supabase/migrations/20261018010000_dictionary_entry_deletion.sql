-- No data deletion at deployment. History keeps stable IDs after the live Entry is removed.
-- Existing Draft-only RPC remains unchanged; this explicit single-target RPC adds Published deletion.
begin;
set local lock_timeout='5s';
alter table public.dictionary_published_revisions drop constraint dictionary_published_revisions_entry_id_fkey;
alter table public.dictionary_review_drafts drop constraint dictionary_review_drafts_entry_id_fkey;
-- Retain all history columns, PKs, RLS and grants. No CASCADE from an Entry into history.
create function public.guard_deleted_dictionary_identity() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.dictionary_audit where table_name='dictionary_entries' and record_id=new.id and operation='DELETE_ENTRY') then raise exception 'This Entry ID was permanently deleted; recompare the import';end if;
 return new;
end $$;
revoke all on function public.guard_deleted_dictionary_identity() from public,anon,authenticated;
create trigger dictionary_deleted_identity before insert on public.dictionary_entries for each row execute function public.guard_deleted_dictionary_identity();

create function public.delete_dictionary_entry(entry_uuid uuid,expected_revision bigint,expected_snapshot jsonb,operation_uuid uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare e public.dictionary_entries;receipt public.dictionary_import_operations;request jsonb;answer jsonb;t text;unlinked integer;
begin
 if not public.is_dictionary_admin() then raise exception 'Dictionary admin required';end if;
 if entry_uuid is null or expected_revision is null or expected_revision<1 or operation_uuid is null or expected_snapshot is null then raise exception 'Invalid deletion request';end if;
 request:=jsonb_build_object('action','delete_entry_v1','entry_id',entry_uuid,'revision',expected_revision,'snapshot',expected_snapshot);
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
 update public.dictionary_review_drafts set state='discarded',revision=revision+1,updated_at=now(),updated_by=auth.uid() where entry_id=entry_uuid and state='active';
 -- No DELETE of Review/history/backup. Delete only owned live children, dependencies first.
 foreach t in array array['dictionary_relations','dictionary_inflections','dictionary_pronunciations','dictionary_examples','dictionary_lexical_annotations','dictionary_etymologies','dictionary_learning_notes'] loop
  execute format('with removed as (delete from public.%I where entry_id=$1 returning *) insert into public.dictionary_audit(actor_id,database_role,table_name,record_id,operation,before_row) select auth.uid(),session_user,$2,id,''DELETE'',to_jsonb(removed) from removed',t) using entry_uuid,t;
 end loop;
 delete from public.dictionary_sense_groups where sense_id in(select id from public.dictionary_senses where entry_id=entry_uuid);
 delete from public.dictionary_entry_groups where id=entry_uuid;
 delete from public.dictionary_ai_metadata where entry_id=entry_uuid;
 with removed as (delete from public.dictionary_senses where entry_id=entry_uuid returning *)
 insert into public.dictionary_audit(actor_id,database_role,table_name,record_id,operation,before_row) select auth.uid(),session_user,'dictionary_senses',id,'DELETE',to_jsonb(removed) from removed;
 insert into public.dictionary_audit(actor_id,database_role,table_name,record_id,operation,before_row) values(auth.uid(),session_user,'dictionary_entries',entry_uuid,'DELETE_ENTRY',to_jsonb(e));
 delete from public.dictionary_entries where id=entry_uuid;
 answer:=jsonb_build_object('deleted',true,'entry_id',entry_uuid,'unlinked_cards',unlinked);
 insert into public.dictionary_import_operations(owner_id,operation_id,session_id,source_type,preview_at,request,result) values(auth.uid(),operation_uuid,operation_uuid,'delete_entry',now(),request,answer);
 return answer;
exception when foreign_key_violation then raise exception 'Entry is still referenced; no data was deleted';
end $$;
revoke all on function public.delete_dictionary_entry(uuid,bigint,jsonb,uuid) from public,anon;
grant execute on function public.delete_dictionary_entry(uuid,bigint,jsonb,uuid) to authenticated;
notify pgrst,'reload schema';
commit;
