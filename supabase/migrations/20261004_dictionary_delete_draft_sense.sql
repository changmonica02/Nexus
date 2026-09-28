begin;
-- Narrow delete operation; no table DELETE grants or cascades are added.
create function public.delete_dictionary_draft_sense(entry_uuid uuid, sense_uuid uuid, expected_entry_revision bigint, expected_sense_revision bigint)
returns bigint language plpgsql security definer set search_path='' as $$
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
  insert into public.dictionary_audit(actor_id,database_role,table_name,record_id,operation,before_row,after_row)
    values(auth.uid(),session_user,'dictionary_senses',sense_uuid,'DELETE',to_jsonb(sense_row),null);
  update public.dictionary_entries set headword=headword where id=entry_uuid returning revision into next_revision;
  return next_revision;
exception when foreign_key_violation then
  raise exception 'Sense is referenced; deletion cancelled';
end $$;
revoke all on function public.delete_dictionary_draft_sense(uuid,uuid,bigint,bigint) from public,anon;
grant execute on function public.delete_dictionary_draft_sense(uuid,uuid,bigint,bigint) to authenticated;
commit;
