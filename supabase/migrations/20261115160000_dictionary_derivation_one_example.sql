-- One derivative meaning may have at most one bilingual example.
-- A missing example or Chinese translation is allowed; no existing rows are altered.
-- Existing cross-entry / cross-sense ownership remains enforced by the B2 composite FK.
do $$
begin
  if exists (
    select 1 from public.dictionary_examples
    where derivation_id is not null
    group by derivation_id having count(*) > 1
  ) then
    raise exception 'dictionary examples have multiple rows for one derivation';
  end if;
end $$;

create unique index dictionary_examples_one_per_derivation
  on public.dictionary_examples (derivation_id)
  where derivation_id is not null;
