-- Keep legacy columns readable for JSON exchange, review drafts and old clients.
-- The product no longer accepts locale/note content on pronunciation rows.
-- Clearing legacy values is intentional; preserve IPA, identity, sense and revisions.
update public.dictionary_pronunciations
   set locale = null, note = null
 where locale is not null or note is not null;

create or replace function public.dictionary_pronunciation_ipa_only()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.locale := null;
  new.note := null;
  return new;
end;
$$;

drop trigger if exists dictionary_pronunciation_ipa_only on public.dictionary_pronunciations;
create trigger dictionary_pronunciation_ipa_only
before insert or update on public.dictionary_pronunciations
for each row execute function public.dictionary_pronunciation_ipa_only();
