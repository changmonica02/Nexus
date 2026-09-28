-- M7-12: only optional link records; no Study content/state/event writes.
begin;
create function public.set_study_dictionary_link(card_uuid text, word_uuid uuid default null)
returns void language plpgsql security definer set search_path='' as $$
declare owner uuid:=auth.uid();
begin
  if owner is null then raise exception 'Authentication required'; end if;
  perform 1 from public.study_cards where owner_id=owner and id=card_uuid
    and payload->>'deleted_at' is null for update;
  if not found then raise exception 'Card missing, deleted or not yet synced'; end if;
  if word_uuid is null then
    delete from public.study_card_dictionary_links where owner_id=owner and card_id=card_uuid;
  else
    -- Existing M7-9 trigger also enforces published Word eligibility.
    insert into public.study_card_dictionary_links(owner_id,card_id,dictionary_entry_id)
    values(owner,card_uuid,word_uuid)
    on conflict(owner_id,card_id) do update set dictionary_entry_id=excluded.dictionary_entry_id;
  end if;
end $$;
revoke all on function public.set_study_dictionary_link(text,uuid) from public,anon;
grant execute on function public.set_study_dictionary_link(text,uuid) to authenticated;
commit;
