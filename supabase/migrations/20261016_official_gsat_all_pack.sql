-- Enable the fourth official GSAT study pack. Applied to production via Supabase migration
-- 'official_gsat_all_pack_constraints'; this repository migration preserves reproducibility.
-- Vocabulary membership is maintained separately from the canonical dictionary.
alter table public.official_study_packs
  drop constraint if exists official_study_packs_id_check;
alter table public.official_study_packs
  add constraint official_study_packs_id_check
  check (id in ('gsat-1-2','gsat-3-4','gsat-5-6','gsat-all'));

alter table public.official_study_pack_entries
  drop constraint if exists official_study_pack_entries_check;
alter table public.official_study_pack_entries
  add constraint official_study_pack_entries_check
  check (
    (pack_id='gsat-1-2' and level between 1 and 2)
    or (pack_id='gsat-3-4' and level between 3 and 4)
    or (pack_id='gsat-5-6' and level between 5 and 6)
    or (pack_id='gsat-all' and level between 1 and 6)
  );

insert into public.official_study_packs(id,name,version)
values ('gsat-all','學測單字全',1)
on conflict (id) do nothing;
