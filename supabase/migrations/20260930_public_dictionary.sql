-- M7-9: independent shared dictionary. No seeds, legacy conversion or Study rewrites.
begin;

-- Provision only through trusted SQL after confirming the Auth UUID. No client grants.
create table public.dictionary_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  granted_at timestamptz not null default now()
);
alter table public.dictionary_admins enable row level security;
revoke all on public.dictionary_admins from public, anon, authenticated;
create function public.is_dictionary_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.dictionary_admins where user_id = auth.uid());
$$;
revoke all on function public.is_dictionary_admin() from public, anon;
grant execute on function public.is_dictionary_admin() to authenticated;

-- Source snapshots are immutable and admin-only pending A4 licensing policy.
create table public.dictionary_sources (
  id uuid primary key default gen_random_uuid(),
  citation text not null check (length(btrim(citation)) > 0),
  source_url text,
  license text not null check (length(btrim(license)) > 0),
  license_note text not null default '',
  raw_text text not null,
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  verification text not null default 'unverified' check (verification in ('unverified','pending','verified','disputed')),
  verification_note text not null default '',
  check (verification <> 'verified' or length(btrim(verification_note)) > 0)
);
create table public.dictionary_entries (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('word','prefix','root')),
  headword text not null check (length(btrim(headword)) > 0),
  source_id uuid not null references public.dictionary_sources(id),
  status text not null default 'draft' check (status in ('draft','published')),
  published_at timestamptz,
  revision bigint not null default 1,
  updated_at timestamptz not null default now(),
  check ((status = 'published') = (published_at is not null))
);
-- Deliberately no unique spelling constraint: homographs retain different IDs.
create index dictionary_entries_lookup on public.dictionary_entries(status,kind,headword);
create table public.dictionary_senses (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.dictionary_entries(id),
  part_of_speech text check (part_of_speech is null or length(btrim(part_of_speech)) > 0),
  gloss_zh_tw text not null check (length(btrim(gloss_zh_tw)) > 0),
  source_id uuid not null references public.dictionary_sources(id),
  revision bigint not null default 1,
  updated_at timestamptz not null default now(),
  unique(entry_id,id)
);
create index dictionary_senses_entry on public.dictionary_senses(entry_id);
create table public.dictionary_relations (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null,
  sense_id uuid not null,
  target_entry_id uuid not null,
  target_sense_id uuid not null,
  relation_kind text not null check (relation_kind in ('historical_etymology','learning_decomposition')),
  source_id uuid not null references public.dictionary_sources(id),
  verification text not null default 'unverified' check (verification in ('unverified','pending','verified','disputed')),
  verification_note text not null default '',
  revision bigint not null default 1,
  updated_at timestamptz not null default now(),
  foreign key(entry_id,sense_id) references public.dictionary_senses(entry_id,id),
  foreign key(target_entry_id,target_sense_id) references public.dictionary_senses(entry_id,id),
  check (entry_id <> target_entry_id),
  check (verification <> 'verified' or length(btrim(verification_note)) > 0),
  unique(sense_id,target_sense_id,relation_kind)
);
create index dictionary_relations_entry on public.dictionary_relations(entry_id);
create index dictionary_relations_target on public.dictionary_relations(target_entry_id,target_sense_id);
create table public.dictionary_etymologies (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.dictionary_entries(id),
  sense_id uuid,
  body text not null check (length(btrim(body)) > 0),
  source_id uuid not null references public.dictionary_sources(id),
  verification text not null default 'unverified' check (verification in ('unverified','pending','verified','disputed')),
  verification_note text not null default '',
  revision bigint not null default 1,
  updated_at timestamptz not null default now(),
  foreign key(entry_id,sense_id) references public.dictionary_senses(entry_id,id),
  check (verification <> 'verified' or length(btrim(verification_note)) > 0)
);
create table public.dictionary_learning_notes (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.dictionary_entries(id),
  sense_id uuid,
  kind text not null check (kind in ('learning_decomposition','mnemonic_scenario')),
  body text not null check (length(btrim(body)) > 0),
  source_id uuid not null references public.dictionary_sources(id),
  revision bigint not null default 1,
  updated_at timestamptz not null default now(),
  foreign key(entry_id,sense_id) references public.dictionary_senses(entry_id,id)
);
create index dictionary_etymologies_entry on public.dictionary_etymologies(entry_id);
create index dictionary_learning_notes_entry on public.dictionary_learning_notes(entry_id);

-- Before/after revisions are retained privately; client roles cannot change audit rows.
create table public.dictionary_audit (
  id bigint generated always as identity primary key,
  actor_id uuid,
  database_role text not null,
  table_name text not null,
  record_id uuid not null,
  operation text not null,
  before_row jsonb,
  after_row jsonb,
  occurred_at timestamptz not null default now()
);
create index dictionary_audit_record on public.dictionary_audit(table_name,record_id,id);
create function public.dictionary_audit_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.dictionary_audit(actor_id,database_role,table_name,record_id,operation,before_row,after_row)
  values(auth.uid(),session_user,tg_table_name,new.id,tg_op,
    case when tg_op='UPDATE' then to_jsonb(old) else null end,to_jsonb(new));
  return new;
end $$;
revoke all on function public.dictionary_audit_change() from public,anon,authenticated;

-- A3 is unresolved: only initial publication is enabled. Published edits,
-- unpublishing and deletion are deliberately unavailable, not a versioning policy.
create function public.dictionary_guard_change() returns trigger
language plpgsql set search_path = '' as $$
declare parent public.dictionary_entries; target public.dictionary_entries;
begin
  if tg_table_name = 'dictionary_sources' then
    if tg_op <> 'INSERT' then raise exception 'Source snapshots are immutable'; end if;
    new.sha256 := encode(sha256(convert_to(new.raw_text, 'UTF8')), 'hex');
    return new;
  end if;
  if tg_op = 'UPDATE' then
    if new.id <> old.id then raise exception 'Stable IDs cannot change'; end if;
    new.revision := old.revision + 1;
  else new.revision := 1;
  end if;
  new.updated_at := now();
  if tg_table_name = 'dictionary_entries' then
    if tg_op = 'INSERT' and new.status <> 'draft' then raise exception 'Create a draft before publishing'; end if;
    if tg_op = 'UPDATE' then
      if old.status = 'published' then raise exception 'Published revision changes await A3'; end if;
      if new.kind <> old.kind then raise exception 'Entry kind is immutable'; end if;
    end if;
    if new.status = 'published' then
      if not exists(select 1 from public.dictionary_senses where entry_id=new.id) then raise exception 'At least one sense is required'; end if;
      if exists(select 1 from public.dictionary_relations r join public.dictionary_entries e on e.id=r.target_entry_id where r.entry_id=new.id and e.status<>'published') then
        raise exception 'Related entries must be published first';
      end if;
      new.published_at := now();
    else new.published_at := null;
    end if;
  else
    if tg_op = 'UPDATE' and new.entry_id <> old.entry_id then raise exception 'Sense and content ownership cannot change'; end if;
    -- Same lock as publishing, so concurrent child edits cannot leak into a publication.
    select * into parent from public.dictionary_entries where id=new.entry_id for update;
    if not found then raise exception 'Entry not found'; end if;
    if parent.status <> 'draft' then raise exception 'Published revision changes await A3'; end if;
    if tg_table_name = 'dictionary_senses' then
      if parent.kind = 'word' and new.part_of_speech is null then raise exception 'Word senses require part of speech'; end if;
    elsif tg_table_name = 'dictionary_relations' then
      select * into target from public.dictionary_entries where id=new.target_entry_id;
      if parent.kind <> 'word' or target.kind not in ('prefix','root') then raise exception 'Relations must connect word senses to prefix/root senses'; end if;
    end if;
  end if;
  return new;
end $$;
revoke all on function public.dictionary_guard_change() from public,anon,authenticated;

do $$ declare t text; begin
  foreach t in array array['dictionary_sources','dictionary_entries','dictionary_senses','dictionary_relations','dictionary_etymologies','dictionary_learning_notes'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from public,anon,authenticated',t);
    execute format('grant select,insert,update on public.%I to authenticated',t);
    execute format('create policy dictionary_admin_read on public.%I for select to authenticated using (public.is_dictionary_admin())',t);
    execute format('create policy dictionary_admin_insert on public.%I for insert to authenticated with check (public.is_dictionary_admin())',t);
    execute format('create policy dictionary_admin_update on public.%I for update to authenticated using (public.is_dictionary_admin()) with check (public.is_dictionary_admin())',t);
    execute format('create trigger dictionary_guard before insert or update on public.%I for each row execute function public.dictionary_guard_change()',t);
    execute format('create trigger dictionary_audit after insert or update on public.%I for each row execute function public.dictionary_audit_change()',t);
  end loop;
  foreach t in array array['dictionary_senses','dictionary_relations','dictionary_etymologies','dictionary_learning_notes'] loop
    execute format('create policy dictionary_published_read on public.%I for select to authenticated using (exists(select 1 from public.dictionary_entries e where e.id=entry_id and e.status=''published''))',t);
  end loop;
end $$;
create policy dictionary_published_read on public.dictionary_entries for select to authenticated using (status='published');
alter table public.dictionary_audit enable row level security;
revoke all on public.dictionary_audit from public,anon,authenticated;
grant select on public.dictionary_audit to authenticated;
create policy dictionary_admin_audit on public.dictionary_audit for select to authenticated using (public.is_dictionary_admin());

create function public.publish_dictionary_entry(entry_uuid uuid) returns public.dictionary_entries
language plpgsql security invoker set search_path = '' as $$
declare result public.dictionary_entries;
begin
  if not public.is_dictionary_admin() then raise exception 'Dictionary admin required'; end if;
  update public.dictionary_entries set status='published' where id=entry_uuid and status='draft' returning * into result;
  if not found then raise exception 'Draft not found'; end if;
  return result;
end $$;
revoke all on function public.publish_dictionary_entry(uuid) from public,anon;
grant execute on function public.publish_dictionary_entry(uuid) to authenticated;

-- Same Supabase RPC/RLS access pattern as the existing catalog. No raw source or audit leak.
create function public.get_dictionary_entry(entry_uuid uuid) returns jsonb
language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object('entry',to_jsonb(e),
    'senses',coalesce((select jsonb_agg(s order by s.id) from public.dictionary_senses s where s.entry_id=e.id),'[]'::jsonb),
    'relations',coalesce((select jsonb_agg(r order by r.id) from public.dictionary_relations r where r.entry_id=e.id),'[]'::jsonb),
    'etymologies',coalesce((select jsonb_agg(h order by h.id) from public.dictionary_etymologies h where h.entry_id=e.id),'[]'::jsonb),
    'learning_notes',coalesce((select jsonb_agg(n order by n.id) from public.dictionary_learning_notes n where n.entry_id=e.id),'[]'::jsonb))
  from public.dictionary_entries e where e.id=entry_uuid;
$$;
revoke all on function public.get_dictionary_entry(uuid) from public,anon;
grant execute on function public.get_dictionary_entry(uuid) to authenticated;

-- Future M7-12 link contract. No changes to study_cards.payload or sync/FSRS events.
-- No client write surface until linking and A3 behavior are specified.
create table public.study_card_dictionary_links (
  owner_id uuid not null,
  card_id text not null,
  dictionary_entry_id uuid not null references public.dictionary_entries(id),
  primary key(owner_id,card_id),
  foreign key(owner_id,card_id) references public.study_cards(owner_id,id) on delete cascade
);
alter table public.study_card_dictionary_links enable row level security;
revoke all on public.study_card_dictionary_links from public,anon,authenticated;
grant select on public.study_card_dictionary_links to authenticated;
create policy own_dictionary_links on public.study_card_dictionary_links for select to authenticated using (owner_id=auth.uid());
create index study_card_dictionary_links_entry on public.study_card_dictionary_links(dictionary_entry_id);
create function public.dictionary_guard_card_link() returns trigger
language plpgsql set search_path = '' as $$
begin
  if not exists(select 1 from public.dictionary_entries where id=new.dictionary_entry_id and kind='word' and status='published') then
    raise exception 'Card links require a published word entry';
  end if;
  return new;
end $$;
revoke all on function public.dictionary_guard_card_link() from public,anon,authenticated;
create trigger dictionary_guard_card_link before insert or update on public.study_card_dictionary_links
  for each row execute function public.dictionary_guard_card_link();

-- Manual provisioning (DO NOT replace with an email lookup or client-side role):
-- insert into public.dictionary_admins(user_id) values ('56b6963f-ae33-4649-a388-63e11e8b99bc') on conflict (user_id) do nothing;
-- No administrator or dictionary content is seeded by this migration.
commit;
