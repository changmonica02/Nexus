begin;

alter table public.pages add column if not exists task_plan jsonb;

create table if not exists public.life_task_executions (
  owner_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  revision bigint not null check (revision > 0),
  created_at bigint not null,
  updated_at bigint not null,
  deleted_at bigint,
  task_id text not null,
  occurrence text not null,
  day date not null,
  scheduled_start bigint,
  scheduled_end bigint,
  due_at bigint,
  completed_at bigint,
  amount numeric not null check (amount between 0 and 1000000),
  status text not null check (status in ('pending','partial','complete','skipped','missed')),
  goal jsonb not null,
  imported boolean not null default false,
  primary key (owner_id,id),
  unique (owner_id,task_id,occurrence),
  check (id::jsonb = jsonb_build_array(task_id,occurrence)),
  check (length(task_id) between 1 and 160 and length(occurrence) between 1 and 160),
  check ((status = 'complete' and (completed_at is not null or imported)) or (status <> 'complete' and completed_at is null)),
  check (scheduled_end is null or scheduled_start is not null and scheduled_end > scheduled_start),
  check (coalesce(goal->>'kind' in ('check','quantity','duration') and jsonb_typeof(goal->'target') = 'number'
     and (goal->>'target')::numeric > 0 and (goal->>'target')::numeric <= 1000000
     and jsonb_typeof(goal->'unit') = 'string' and length(goal->>'unit') <= 30
     and (status <> 'complete' or amount >= (goal->>'target')::numeric)
     and (status <> 'pending' or amount = 0)
     and (status <> 'partial' or (amount > 0 and amount < (goal->>'target')::numeric)), false))
);

create index if not exists life_task_executions_pull on public.life_task_executions(owner_id,updated_at,id);
alter table public.life_task_executions enable row level security;
revoke all on public.life_task_executions from public,anon,authenticated;
grant select on public.life_task_executions to authenticated;

do $migration$
declare definition text := pg_get_functiondef('public.apply_workspace_operations(jsonb)'::regprocedure);
begin
  if not exists(select 1 from pg_constraint where conrelid='public.pages'::regclass and conname='pages_task_plan_check') then
    alter table public.pages add constraint pages_task_plan_check check (task_plan is null or
      coalesce(kind='todo' and jsonb_typeof(task_plan)='object' and jsonb_typeof(task_plan->'segments')='array'
      and octet_length(task_plan::text)<=524288,false));
  end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='life_task_executions' and policyname='read_own') then
    create policy read_own on public.life_task_executions for select to authenticated using ((select auth.uid())=owner_id);
  end if;
  if exists(select from pg_publication where pubname='supabase_realtime') and not exists(
      select from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='life_task_executions') then
    alter publication supabase_realtime add table public.life_task_executions;
  end if;
  if strpos(definition, $$when entity='life_task_executions'$$)>0 then return; end if;
  definition := replace(definition, $$'life_health_records','life_automation_runs')$$, $$'life_health_records','life_automation_runs','life_task_executions')$$);
  definition := replace(definition, $$current_row->>'task_repeat' is not null$$,
    $$current_row->>'task_repeat' is not null or current_row->>'task_plan' is not null$$);
  definition := replace(definition, $$'task_repeat','task_repeat_day'$$, $$'task_repeat','task_repeat_day','task_plan'$$);
  definition := replace(definition, $$when entity='life_automation_runs' then array['run']$$,
    $$when entity='life_automation_runs' then array['run']
      when entity='life_task_executions' then array['task_id','occurrence','day','scheduled_start','scheduled_end','due_at','completed_at','amount','status','goal','imported']$$);
  definition := replace(definition, $$    if current_revision <> expected then raise exception 'Workspace revision conflict'; end if;$$,
    $$    if entity='pages' and action='save' and expected=0 and current_revision>0
      and current_row->>'deleted_at' is null and current_row->'task_plan'->>'legacyHabitId'=entity_id
      and op->'value'->'task_plan'->>'legacyHabitId'=entity_id and current_row->'task_plan'=op->'value'->'task_plan' then
      result := jsonb_build_object('entity_type',entity,'entity_id',entity_id,'revision',current_row->'revision',
        'deleted_at',current_row->'deleted_at','hard_deleted',false,'row',current_row);
      insert into public.workspace_operation_receipts(owner_id,id,fingerprint,result) values(actor,operation_id,fingerprint,result-'row');
      results := results || jsonb_build_array(result);
      continue;
    end if;
    if entity='life_task_executions' then
      if action<>'save' or not exists(select 1 from public.pages p where p.owner_id=actor and p.id=op->'value'->>'task_id'
        and p.kind='todo' and p.task_plan is not null and p.deleted_at is null) then
        raise exception 'Task execution requires a task in this workspace';
      end if;
      if expected=0 and current_revision<>expected and current_row->>'status'=op->'value'->>'status'
        and current_row->'amount'=op->'value'->'amount' and current_row->'goal'=op->'value'->'goal' then
        result := jsonb_build_object('entity_type',entity,'entity_id',entity_id,'revision',current_row->'revision',
          'deleted_at',current_row->'deleted_at','hard_deleted',false,'row',current_row);
        insert into public.workspace_operation_receipts(owner_id,id,fingerprint,result) values(actor,operation_id,fingerprint,result-'row');
        results := results || jsonb_build_array(result);
        continue;
      end if;
    end if;
    if current_revision <> expected then raise exception 'Workspace revision conflict'; end if;$$);
  if strpos(definition, $$'life_automation_runs','life_task_executions')$$)=0
    or strpos(definition, $$'task_repeat_day','task_plan'$$)=0
    or strpos(definition, $$when entity='life_task_executions'$$)=0
    or strpos(definition, $$Task execution requires a task in this workspace$$)=0 then
    raise exception 'Unable to install task execution sync';
  end if;
  execute definition;
end $migration$;
commit;
