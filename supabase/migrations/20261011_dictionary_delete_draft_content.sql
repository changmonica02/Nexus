begin;
create function public.delete_dictionary_draft_content(entry_uuid uuid, content_table text, content_uuid uuid, expected_entry_revision bigint, expected_content_revision bigint)
returns bigint language plpgsql security definer set search_path='' as $$
declare parent public.dictionary_entries; content jsonb; next_revision bigint;
begin
  if not public.is_dictionary_admin() then raise exception 'Dictionary admin required'; end if;
  if content_table is null or content_table not in ('dictionary_etymologies','dictionary_learning_notes') then raise exception 'Invalid content table'; end if;
  select * into parent from public.dictionary_entries where id=entry_uuid for update;
  if not found then raise exception 'Entry not found'; end if;
  if parent.status<>'draft' then raise exception 'Published content cannot be deleted'; end if;
  execute format('select to_jsonb(r) from public.%I r where id=$1 and entry_id=$2 for update',content_table) into content using content_uuid,entry_uuid;
  if content is null then raise exception 'Content not found'; end if;
  if parent.revision is distinct from expected_entry_revision or (content->>'revision')::bigint is distinct from expected_content_revision then raise exception 'Revision conflict; reload before deleting'; end if;
  execute format('delete from public.%I where id=$1 and entry_id=$2',content_table) using content_uuid,entry_uuid;
  insert into public.dictionary_audit(actor_id,database_role,table_name,record_id,operation,before_row,after_row)
    values(auth.uid(),session_user,content_table,content_uuid,'DELETE',content,null);
  update public.dictionary_entries set headword=headword where id=entry_uuid returning revision into next_revision;
  return next_revision;
end $$;
revoke all on function public.delete_dictionary_draft_content(uuid,text,uuid,bigint,bigint) from public,anon;
grant execute on function public.delete_dictionary_draft_content(uuid,text,uuid,bigint,bigint) to authenticated;
commit;
