-- Word entries have zero or one pronunciation, mnemonic, and etymology row.
-- Prefix/root/suffix content is unchanged; existing Word data is not rewritten.
do $$
begin
 if exists(select 1 from public.dictionary_entries e
   join public.dictionary_pronunciations p on p.entry_id=e.id
   where e.kind='word' group by e.id having count(*)>1)
   then raise exception 'Word contains multiple pronunciations'; end if;
 if exists(select 1 from public.dictionary_entries e
   join public.dictionary_learning_notes n on n.entry_id=e.id
   where e.kind='word' group by e.id having count(*)>1)
   then raise exception 'Word contains multiple learning notes'; end if;
 if exists(select 1 from public.dictionary_entries e
   join public.dictionary_etymologies h on h.entry_id=e.id
   where e.kind='word' group by e.id having count(*)>1)
   then raise exception 'Word contains multiple etymologies'; end if;
end $$;

create or replace function public.dictionary_word_singleton_section_guard()
returns trigger language plpgsql as $$
declare entry_kind text; duplicate_row boolean;
begin
  select kind into entry_kind from public.dictionary_entries
  where id=new.entry_id for update;
  if entry_kind='word' then
    execute format('select exists(select 1 from public.%I where entry_id=$1 and id<>$2)',tg_table_name)
      into duplicate_row using new.entry_id,new.id;
    if duplicate_row then
      raise exception 'Word % permits at most one row',tg_table_name;
    end if;
  end if;
  return new;
end $$;

create trigger dictionary_word_pronunciation_singleton
before insert or update of entry_id on public.dictionary_pronunciations
for each row execute function public.dictionary_word_singleton_section_guard();
create trigger dictionary_word_learning_note_singleton
before insert or update of entry_id on public.dictionary_learning_notes
for each row execute function public.dictionary_word_singleton_section_guard();
create trigger dictionary_word_etymology_singleton
before insert or update of entry_id on public.dictionary_etymologies
for each row execute function public.dictionary_word_singleton_section_guard();
