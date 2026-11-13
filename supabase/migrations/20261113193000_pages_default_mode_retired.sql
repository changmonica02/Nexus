-- Physical retirement of Page.default_mode. Page.kind is the sole type authority.
-- The RPC fingerprint is computed on the original operation JSON BEFORE projection:
-- previously queued offline operations keep their ID/payload and remain idempotent.
-- This migration changes only the SQL write projection, not operation receipts.
begin;

lock table public.pages in access exclusive mode;

do $retire$
declare
  definition text;
  from_fragment constant text := '''content_text'',''default_mode'',''device_id''';
  to_fragment constant text := '''content_text'',''device_id''';
  download_from constant text := '''content_text'','''',''default_mode'',''note'',''created_at''';
  download_to constant text := '''content_text'','''',''created_at''';
begin
  definition := pg_get_functiondef('public.apply_workspace_operations(jsonb)'::regprocedure);
  if definition is null or strpos(definition,from_fragment)=0
     or strpos(replace(definition,from_fragment,''),from_fragment)>0 then
    raise exception 'Unexpected workspace RPC version: default_mode projection not unique';
  end if;
  execute replace(definition,from_fragment,to_fragment);

  definition := pg_get_functiondef('public.download_official_study_pack(text)'::regprocedure);
  if definition is null or strpos(definition,download_from)=0
     or strpos(replace(definition,download_from,''),download_from)>0 then
    raise exception 'Unexpected official download RPC version: default_mode payload not unique';
  end if;
  execute replace(definition,download_from,download_to);

  if exists(
    select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.prokind='f'
      and pg_get_functiondef(p.oid) ilike '%default_mode%'
  ) then
    raise exception 'Remaining public SQL functions reference pages.default_mode';
  end if;
end
$retire$;

-- RESTRICT intentionally fails when an unseen view or SQL dependency remains.
alter table public.pages drop column default_mode restrict;
notify pgrst, 'reload schema';
commit;
