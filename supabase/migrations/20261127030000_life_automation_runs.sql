begin;
create table public.life_automation_runs (
  owner_id uuid not null references auth.users(id) on delete cascade,
  id text not null check (id ~ '^[a-f0-9-]{36}$'),
  revision bigint not null check (revision = 1),
  created_at bigint not null,
  updated_at bigint not null,
  deleted_at bigint check (deleted_at is null),
  run jsonb not null,
  primary key(owner_id,id),
  check (coalesce(jsonb_typeof(run)='object'
    and jsonb_typeof(run->'id')='string' and length(run->>'id') between 1 and 1000
    and jsonb_typeof(run->'title')='string' and length(run->>'title')<=100
    and jsonb_typeof(run->'day')='string' and run->>'day' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
    and jsonb_typeof(run->'at')='number' and run->>'at' ~ '^[0-9]{1,16}$'
    and (not run ? 'error' or jsonb_typeof(run->'error')='string' and length(run->>'error') between 1 and 240)
    and (run - array['id','title','day','at','error'])='{}'::jsonb,false))
);
alter table public.life_automation_runs enable row level security;
revoke all on public.life_automation_runs from public,anon,authenticated;
grant select on public.life_automation_runs to authenticated;
create policy read_own on public.life_automation_runs for select to authenticated using ((select auth.uid())=owner_id);

do $patch$
declare definition text := pg_get_functiondef('public.apply_workspace_operations(jsonb)'::regprocedure);
begin
  definition := replace(definition,
    $$'life_timer_results','life_health_records')$$,
    $$'life_timer_results','life_health_records','life_automation_runs')$$);
  definition := replace(definition,
    $$when entity='life_health_records' then array['kind','data']$$,
    $$when entity='life_health_records' then array['kind','data']
      when entity='life_automation_runs' then array['run']$$);
  definition := replace(definition,
    $$    if current_revision <> expected then raise exception 'Workspace revision conflict'; end if;$$,
    $$    if entity='life_automation_runs' and action='save' and expected=0
      and current_row->'run'=op->'value'->'run' then
      results := results || jsonb_build_array(jsonb_build_object('entity_type',entity,'entity_id',entity_id,
        'revision',current_row->'revision','deleted_at',current_row->'deleted_at','hard_deleted',false,'row',current_row));
      continue;
    end if;
    if entity='life_automation_runs' and (action<>'save' or expected<>0 or current_row is not null) then
      raise exception 'Automation history is append-only';
    end if;
    if current_revision <> expected then raise exception 'Workspace revision conflict'; end if;$$);
  if strpos(definition,$$'life_health_records','life_automation_runs')$$)=0
    or strpos(definition,$$when entity='life_automation_runs' then array['run']$$)=0
    or strpos(definition,'Automation history is append-only')=0 then
    raise exception 'Unexpected workspace RPC definition';
  end if;
  execute definition;
end $patch$;
commit;
