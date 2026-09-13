-- Nexus account isolation. Apply this in the Supabase SQL editor before
-- enabling account sync in production.
--
-- Existing shared rows deliberately remain owner_id = NULL: assign them to
-- a specific auth user manually before enabling RLS, rather than exposing
-- them to the first person who signs in.

alter table public.pages add column if not exists owner_id uuid references auth.users(id) on delete cascade;
alter table public.attachments add column if not exists owner_id uuid references auth.users(id) on delete cascade;
alter table public.binaries add column if not exists owner_id uuid references auth.users(id) on delete cascade;

create index if not exists pages_owner_id_idx on public.pages(owner_id);
create index if not exists attachments_owner_id_idx on public.attachments(owner_id);
create index if not exists binaries_owner_id_idx on public.binaries(owner_id);

alter table public.pages enable row level security;
alter table public.attachments enable row level security;
alter table public.binaries enable row level security;

-- Remove the legacy shared-workspace policies. Leaving any of these in place
-- would bypass the per-account policies below because Supabase policies are ORed.
drop policy if exists "allow all pages" on public.pages;
drop policy if exists "allow all attachments" on public.attachments;
drop policy if exists "allow all binaries" on public.binaries;

drop policy if exists "Nexus users manage their own pages" on public.pages;
create policy "Nexus users manage their own pages" on public.pages
  for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "Nexus users manage their own attachments" on public.attachments;
create policy "Nexus users manage their own attachments" on public.attachments
  for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "Nexus users manage their own binaries" on public.binaries;
create policy "Nexus users manage their own binaries" on public.binaries
  for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- To assign legacy shared data to its owner, run this once with the user's UUID:
-- update public.pages set owner_id = '<auth-user-uuid>' where owner_id is null;
-- update public.attachments set owner_id = '<auth-user-uuid>' where owner_id is null;
-- update public.binaries set owner_id = '<auth-user-uuid>' where owner_id is null;
