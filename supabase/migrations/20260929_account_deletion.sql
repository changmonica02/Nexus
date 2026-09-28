-- Account deletion is opt-in through delete_own_account. Applying this migration
-- does not delete any data. NOT VALID preserves any legacy orphan rows while
-- enforcing ownership for new writes (including writes from a stale JWT).
begin;
do $$
declare table_name text;
begin
  foreach table_name in array array[
    'pages','attachments','binaries',
    'study_cards','study_card_states','study_review_events','study_deck_settings',
    'study_card_quiz_states','study_quiz_attempt_receipts',
    'etymology_sources','etymology_entries','etymology_senses','etymology_categories',
    'etymology_entry_categories','etymology_words','etymology_word_senses','etymology_claims'
  ] loop
    if to_regclass('public.' || table_name) is not null then
      execute format('alter table public.%I add constraint %I foreign key (owner_id) references auth.users(id) on delete cascade not valid',
        table_name, table_name || '_account_deletion_owner_fk');
    end if;
  end loop;
end $$;

create function public.delete_own_account(confirmation_email text, confirmation_text text)
returns void language plpgsql security definer set search_path = '' as $$
declare account_id uuid := auth.uid(); account_email text;
begin
  if account_id is null then raise exception 'Authentication required'; end if;
  select email into account_email from auth.users where id = account_id for update;
  if not found then raise exception 'Account no longer exists'; end if;
  if confirmation_text is distinct from '刪除帳號'
     or account_email is null
     or lower(btrim(confirmation_email)) is distinct from lower(account_email) then
    raise exception 'Account deletion confirmation does not match';
  end if;
  -- Auth sessions and all supported owner data cascade in this same transaction.
  -- Any foreign-key/storage failure rolls back the entire deletion.
  delete from auth.users where id = account_id;
end $$;
revoke all on function public.delete_own_account(text,text) from public, anon;
grant execute on function public.delete_own_account(text,text) to authenticated;
commit;
