begin;
-- Atomic, admin-only deletion. No client table DELETE grants.
create function public.delete_dictionary_drafts(targets jsonb)
returns integer language plpgsql security definer set search_path='' as $$
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
  -- Keep immutable source snapshots and audit history. Delete only selected entries' content.
  foreach t in array array['dictionary_relations','dictionary_etymologies','dictionary_learning_notes','dictionary_senses','dictionary_entries'] loop
    execute format('with removed as (delete from public.%I where %I=any($1) returning *) insert into public.dictionary_audit(actor_id,database_role,table_name,record_id,operation,before_row,after_row) select auth.uid(),session_user,$2,id,''DELETE'',to_jsonb(removed),null from removed',t,case when t='dictionary_entries' then 'id' else 'entry_id' end) using ids,t;
  end loop;
  affected:=cardinality(ids);
  return affected;
exception when foreign_key_violation then
  raise exception 'Entry is still referenced; entire deletion cancelled';
end $$;
revoke all on function public.delete_dictionary_drafts(jsonb) from public,anon;
grant execute on function public.delete_dictionary_drafts(jsonb) to authenticated;
commit;
