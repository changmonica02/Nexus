begin;
alter table public.workspace_tombstones drop constraint workspace_tombstones_entity_type_check;
alter table public.workspace_tombstones add constraint workspace_tombstones_entity_type_check
  check (entity_type in ('pages','attachments','life_health_records'));

create table public.life_health_records (
  owner_id uuid not null references auth.users(id) on delete cascade,
  id text not null check (length(id) between 1 and 200),
  revision bigint not null check (revision > 0),
  created_at bigint not null,
  updated_at bigint not null,
  deleted_at bigint,
  kind text not null check (kind in ('privacy','body','goal','food','recipe','meal','water','exercise','plan','sleep')),
  data jsonb not null check (jsonb_typeof(data)='object' and octet_length(data::text)<=262144),
  primary key(owner_id,id),
  check (kind<>'privacy' or id='health:'||to_jsonb(owner_id::text)::text),
  check (kind not in ('meal','recipe') or coalesce(jsonb_typeof(data->'items')='array',false)),
  check (kind<>'sleep' or coalesce(jsonb_typeof(data->'startAt')='number' and jsonb_typeof(data->'endAt')='number'
    and (data->>'endAt')::numeric>(data->>'startAt')::numeric,false))
);
alter table public.life_health_records enable row level security;
revoke all on public.life_health_records from public, anon, authenticated;
grant select on public.life_health_records to authenticated;
create policy read_own on public.life_health_records for select to authenticated using ((select auth.uid())=owner_id);
-- Health payloads reconcile through authenticated pulls and stay outside Realtime publication.

do $patch$
declare definition text := pg_get_functiondef('public.apply_workspace_operations(jsonb)'::regprocedure);
begin
  definition := replace(definition,
    $$'life_finance_records','life_timer_results')$$,
    $$'life_finance_records','life_timer_results','life_health_records')$$);
  definition := replace(definition,
    $$entity in ('life_schedule_events','life_habits','life_finance_records','life_timer_results','life_health_records') and action not in$$,
    $$entity in ('life_schedule_events','life_habits','life_finance_records','life_timer_results') and action not in$$);
  definition := replace(definition,
    $$if entity = 'life_dashboard_configs' and action <> 'save'$$,
    $$if entity = 'life_health_records' and (action not in ('save','hard_delete')
      or current_row is not null and action='save' and current_row->>'kind' is distinct from op->'value'->>'kind')
    then raise exception 'Invalid health operation'; end if;
    if entity = 'life_dashboard_configs' and action <> 'save'$$);
  definition := replace(definition,
    $$when entity='life_finance_records' then array['kind','payload']$$,
    $$when entity='life_finance_records' then array['kind','payload']
      when entity='life_health_records' then array['kind','data']$$);
  if strpos(definition,'Invalid health operation')=0
    or strpos(definition,$$when entity='life_health_records' then array['kind','data']$$)=0
    or strpos(definition,$$'life_timer_results','life_health_records')$$)=0
    then raise exception 'Unexpected workspace RPC definition'; end if;
  execute definition;
end $patch$;
commit;
