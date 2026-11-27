begin;

alter table public.pages
  add column task_start_at bigint,
  add column task_repeat text check (task_repeat in ('daily','weekly','monthly')),
  add column task_repeat_day integer check (task_repeat_day between 1 and 31),
  add column task_steps jsonb check (task_steps is null or (jsonb_typeof(task_steps) = 'array' and octet_length(task_steps::text) <= 65536));


create table public.life_dashboard_configs (
  owner_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  revision bigint not null check (revision > 0),
  created_at bigint not null,
  updated_at bigint not null,
  deleted_at bigint check (deleted_at is null),
  config jsonb not null check (
    jsonb_typeof(config) = 'object' and config @> '{"version":1}'
    and jsonb_typeof(config->'boards') is not distinct from 'array'
    and jsonb_typeof(config->'hiddenModules') is not distinct from 'array'
    and jsonb_typeof(config->'defaultId') is not distinct from 'string'
    and octet_length(config::text) <= 262144
  ),
  primary key (owner_id, id),
  check (id = 'nexus-life-dashboard:' || to_jsonb(owner_id::text)::text)
);

create table public.life_schedule_events (
  owner_id uuid not null references auth.users(id) on delete cascade,
  id text not null check (length(id) between 1 and 100),
  revision bigint not null check (revision > 0),
  created_at bigint not null,
  updated_at bigint not null,
  deleted_at bigint,
  title text not null check (length(btrim(title)) between 1 and 160),
  starts_at bigint not null check (starts_at >= -2208988800000),
  ends_at bigint not null check (ends_at >= starts_at and ends_at <= 253402300799999),
  all_day boolean not null,
  category text not null check (length(category) <= 80),
  notes text not null check (length(notes) <= 4000),
  milestone jsonb check (milestone is null or (
    all_day and starts_at = ends_at and jsonb_typeof(milestone) = 'object'
    and jsonb_typeof(milestone->'yearly') is not distinct from 'boolean'
    and coalesce(milestone->>'mode' in ('remaining','elapsed'), false)
    and coalesce(milestone->>'style' in ('green','sand','plain'), false)
    and coalesce(length(milestone->>'icon') <= 8, false)
    and (milestone->'image' = 'null'::jsonb or
      coalesce(length(milestone->>'image') <= 180000 and milestone->>'image' ~ '^data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$', false))
  )),
  primary key (owner_id, id)
);

create table public.life_habits (
  owner_id uuid not null references auth.users(id) on delete cascade,
  id text not null check (length(id) between 1 and 100),
  revision bigint not null check (revision > 0),
  created_at bigint not null,
  updated_at bigint not null,
  deleted_at bigint,
  title text not null check (length(btrim(title)) between 1 and 160),
  cadence text not null check (cadence in ('daily','weekly')),
  goal double precision not null check (goal > 0 and goal <= 1000000),
  started_on date not null,
  quantities jsonb not null check (jsonb_typeof(quantities) = 'object' and octet_length(quantities::text) <= 262144),
  primary key (owner_id, id)
);

do $$
declare relation text;
begin
  foreach relation in array array['life_dashboard_configs', 'life_schedule_events', 'life_habits'] loop
    execute format('alter table public.%I enable row level security', relation);
    execute format('revoke all on public.%I from public, anon, authenticated', relation);
    execute format('grant select on public.%I to authenticated', relation);
    execute format('create policy read_own on public.%I for select to authenticated using ((select auth.uid()) = owner_id)', relation);
    if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
      execute format('alter publication supabase_realtime add table public.%I', relation);
    end if;
  end loop;
end $$;

-- Keep the current RPC, including its receipt format and retired-column changes.
do $patch$
declare definition text := replace(pg_get_functiondef('public.apply_workspace_operations(jsonb)'::regprocedure), chr(13), '');
begin
  if strpos(definition, $$'life_lists','life_categories','life_items'$$) = 0 then
    raise exception 'Unexpected workspace operation allowlist';
  end if;
  definition := replace(definition,
    $$'life_lists','life_categories','life_items'$$,
    $$'life_lists','life_categories','life_items','life_dashboard_configs','life_schedule_events','life_habits'$$);
  definition := replace(definition, $$if entity like 'life_%' then$$,
    $$if entity = 'life_dashboard_configs' and action <> 'save'
        or entity in ('life_schedule_events','life_habits') and action not in ('save','soft_delete','restore') then
        raise exception 'Unsupported life operation';
      end if;
      if entity in ('life_lists','life_categories','life_items') then$$);
  definition := replace(definition, $$when entity='life_lists' then array['title','fields','schema_version','sort_order']$$,
    $$when entity='life_dashboard_configs' then array['config']
      when entity='life_habits' then array['title','cadence','goal','started_on','quantities']
      when entity='life_schedule_events' then array['title','starts_at','ends_at','all_day','category','notes','milestone']
      when entity='life_lists' then array['title','fields','schema_version','sort_order']$$);
  definition := replace(definition, $$'due_date','priority','completed','color'$$,
    $$'due_date','priority','completed','color','task_start_at','task_steps','task_repeat','task_repeat_day'$$);
  if strpos(definition, 'task_start_at') = 0 then
    raise exception 'Unexpected task field projection';
  end if;
  if strpos(definition, 'Unsupported life operation') = 0 or strpos(definition, $$array['config']$$) = 0 then
    raise exception 'Unexpected workspace operation body';
  end if;
  execute definition;
end $patch$;

commit;
