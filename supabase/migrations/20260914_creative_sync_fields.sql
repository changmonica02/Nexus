-- Creative page sync coverage. Run after the initial schema and
-- 20260913_account_isolation.sql.

alter table public.pages add column if not exists creative_type text;
alter table public.pages add column if not exists character_data jsonb;
alter table public.pages add column if not exists novel_settings jsonb;
alter table public.pages add column if not exists assistant_blocks jsonb;

-- Existing RLS policies remain unchanged: these fields inherit the page row's
-- owner_id protection.
