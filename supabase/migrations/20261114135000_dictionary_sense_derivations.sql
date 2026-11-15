-- B2 phase 1: additive, no rewrite of existing senses/examples and no new write RPC.
-- Keep existing Word/Sense/Example IDs, contents, revisions and learning links intact.
begin;

create table public.dictionary_sense_derivations (
  id uuid primary key,
  entry_id uuid not null,
  sense_id uuid not null,
  gloss_zh_tw text not null check (length(btrim(gloss_zh_tw)) > 0),
  sort_order integer not null default 0 check (sort_order >= 0),
  revision bigint not null default 1,
  updated_at timestamptz not null default now(),
  constraint dictionary_sense_derivations_owner_fkey
    foreign key (entry_id,sense_id) references public.dictionary_senses(entry_id,id) on delete restrict,
  constraint dictionary_sense_derivations_owner_id_unique unique (entry_id,sense_id,id)
);
create index dictionary_sense_derivations_sense_order
  on public.dictionary_sense_derivations(entry_id,sense_id,sort_order,id);

-- Nullable until the administrator explicitly supplies an accurate translation or relation.
alter table public.dictionary_examples
  add column translation_zh_tw text,
  add column derivation_id uuid;
alter table public.dictionary_examples
  add constraint dictionary_examples_derivation_requires_sense
    check (derivation_id is null or sense_id is not null),
  add constraint dictionary_examples_derivation_owner_fkey
    foreign key (entry_id,sense_id,derivation_id)
    references public.dictionary_sense_derivations(entry_id,sense_id,id)
    on delete restrict;
create index dictionary_examples_derivation_lookup
  on public.dictionary_examples(derivation_id) where derivation_id is not null;

-- New rows are not writable by direct PostgREST table access. A later, reviewed
-- patch will extend the existing admin Draft / Review / CAS publication RPCs.
alter table public.dictionary_sense_derivations enable row level security;
revoke all on public.dictionary_sense_derivations from public,anon,authenticated;
grant select on public.dictionary_sense_derivations to authenticated;
create policy dictionary_sense_derivations_read
  on public.dictionary_sense_derivations for select to authenticated
  using (
    public.is_dictionary_admin()
    or exists (
      select 1 from public.dictionary_entries e
      where e.id = entry_id and e.status = 'published'
    )
  );

-- The existing example table's RLS and write protection remain unchanged.
commit;
