begin;

alter table public.life_schedule_events
  add column repeat_rule jsonb check (repeat_rule is null or (jsonb_typeof(repeat_rule) = 'object' and octet_length(repeat_rule::text) <= 262144));

create table public.life_finance_records (
  owner_id uuid not null references auth.users(id) on delete cascade,
  id text not null check (length(id) between 1 and 200),
  revision bigint not null check (revision > 0),
  created_at bigint not null,
  updated_at bigint not null,
  deleted_at bigint,
  kind text not null check (kind in ('account','transaction','preferences','budget','subscription','asset','goal','contribution','instrument','trade')),
  payload jsonb not null check (jsonb_typeof(payload) = 'object' and octet_length(payload::text) <= 32768),
  primary key (owner_id, id),
  check (kind <> 'preferences' or id = 'finance-preferences:' || to_jsonb(owner_id::text)::text),
  check (kind <> 'transaction' or nullif(payload->>'source','') is null or id = 'subscription:' || (payload->>'source'))
);
create unique index life_finance_subscription_period on public.life_finance_records (owner_id, (payload->>'source'))
  where kind = 'transaction' and nullif(payload->>'source','') is not null;

create unique index life_finance_month_budget on public.life_finance_records (owner_id,(payload->>'month'),(payload->>'category'))
  where kind='budget' and deleted_at is null;

create table public.life_timer_results (
  owner_id uuid not null references auth.users(id) on delete cascade,
  id text not null check (length(id) between 1 and 100),
  revision bigint not null check (revision > 0),
  created_at bigint not null,
  updated_at bigint not null,
  deleted_at bigint,
  ended_at bigint not null,
  elapsed_ms bigint not null check (elapsed_ms > 0),
  mode text not null check (mode in ('countdown','stopwatch','pomodoro')),
  task_id text,
  study_session_id text,
  primary key (owner_id, id)
);

do $access$
declare relation text;
begin
  foreach relation in array array['life_finance_records','life_timer_results'] loop
    execute format('alter table public.%I enable row level security', relation);
    execute format('revoke all on public.%I from public, anon, authenticated', relation);
    execute format('grant select on public.%I to authenticated', relation);
    execute format('create policy read_own on public.%I for select to authenticated using ((select auth.uid()) = owner_id)', relation);
    if exists (select 1 from pg_publication where pubname='supabase_realtime') then
      execute format('alter publication supabase_realtime add table public.%I', relation);
    end if;
  end loop;
end $access$;

create function public.validate_life_finance(actor uuid) returns void
language plpgsql set search_path = '' as $fn$
begin
  if exists (
    select 1 from public.life_finance_records r
    where r.owner_id=actor and r.deleted_at is null and (
      case r.kind
        when 'account' then coalesce(r.payload->>'opening','') !~ '^-?[0-9]{1,24}$'
          or coalesce(r.payload->>'currency','') !~ '^[A-Z]{3}$'
        when 'transaction' then coalesce(r.payload->>'amount','') !~ '^-?[0-9]{1,24}$'
          or coalesce(r.payload->>'account','') = ''
          or coalesce(r.payload->>'type','') not in ('income','expense','transfer','cardPayment','adjustment','repayment')
          or coalesce(r.payload->>'date','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
          or (r.payload->>'type' in ('transfer','cardPayment','repayment') and (
            coalesce(r.payload->>'target','') = '' or r.payload->>'target' = r.payload->>'account'
            or coalesce(r.payload->>'targetAmount','') !~ '^[0-9]{1,24}$'))
        when 'budget' then coalesce(r.payload->>'month','') !~ '^[0-9]{4}-[0-9]{2}$'
          or coalesce(r.payload->>'amount','') !~ '^[0-9]{1,24}$'
        when 'subscription' then coalesce(r.payload->>'amount','') !~ '^[0-9]{1,24}$'
          or coalesce(r.payload->>'next','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
        when 'asset' then coalesce(r.payload->>'amount','') !~ '^[0-9]{1,24}$'
        when 'goal' then coalesce(r.payload->>'amount','') !~ '^[0-9]{1,24}$'
        when 'contribution' then coalesce(r.payload->>'amount','') !~ '^-?[0-9]{1,24}$' or coalesce(r.payload->>'goal','') = ''
        when 'trade' then coalesce(r.payload->>'price','') !~ '^[0-9]{1,24}$'
          or coalesce(r.payload->>'fee','') !~ '^[0-9]{1,24}$' or coalesce(r.payload->>'instrument','') = ''
        else false
      end
    )
  ) then raise exception 'Invalid finance data'; end if;
  if exists (
    select 1 from public.life_finance_records r
    cross join lateral (values
      ('account', case when r.kind in ('transaction','subscription','goal','trade') then nullif(r.payload->>'account','') end),
      ('account', case when r.kind='transaction' then nullif(r.payload->>'target','') end),
      ('goal', case when r.kind='contribution' then r.payload->>'goal' end),
      ('instrument', case when r.kind='trade' then r.payload->>'instrument' end),
      ('subscription', case when r.kind='transaction' then nullif(split_part(r.payload->>'source','|',1),'') end)
    ) ref(kind, id)
    where r.owner_id=actor and r.deleted_at is null and ref.id is not null
      and not exists (select 1 from public.life_finance_records target
        where target.owner_id=actor and target.id=ref.id and target.kind=ref.kind and target.deleted_at is null)
  ) then raise exception 'Finance relationship is missing'; end if;
  if exists(
    select 1 from public.life_finance_records t
    join public.life_finance_records a on a.owner_id=actor and a.kind='account' and a.id=t.payload->>'account'
    join public.life_finance_records b on b.owner_id=actor and b.kind='account' and b.id=t.payload->>'target'
    where t.owner_id=actor and t.deleted_at is null and t.kind='transaction'
      and t.payload->>'type' in ('transfer','repayment','cardPayment')
      and ((a.payload->>'currency'=b.payload->>'currency' and (t.payload->>'amount')::numeric<>(t.payload->>'targetAmount')::numeric)
        or (t.payload->>'type'='cardPayment' and b.payload->>'type'<>'card')
        or (t.payload->>'type'='repayment' and b.payload->>'type'<>'loan'))
  ) then raise exception 'Invalid transfer or settlement'; end if;
  if exists (
    select 1 from public.life_finance_records t
    where t.owner_id=actor and t.kind='trade' and t.deleted_at is null and
      (t.payload->>'type' not in ('buy','sell','dividend') or (t.payload->>'quantity') !~ '^[0-9]{1,24}$')
  ) then raise exception 'Invalid investment transaction'; end if;
  if exists (
    select 1 from (
      select sum(case p.payload->>'type' when 'buy' then (p.payload->>'quantity')::numeric
        when 'sell' then -(p.payload->>'quantity')::numeric else 0 end)
      over (partition by p.payload->>'instrument' order by p.payload->>'date',p.created_at,p.id) as quantity
      from public.life_finance_records p where p.owner_id=actor and p.kind='trade' and p.deleted_at is null
    ) position where position.quantity < 0
  ) then raise exception 'Investment sale exceeds position'; end if;
end $fn$;
revoke all on function public.validate_life_finance(uuid) from public, anon, authenticated;

do $patch$
declare definition text := pg_get_functiondef('public.apply_workspace_operations(jsonb)'::regprocedure);
begin
  definition := replace(definition,
    $$'life_dashboard_configs','life_schedule_events','life_habits')$$,
    $$'life_dashboard_configs','life_schedule_events','life_habits','life_finance_records','life_timer_results')$$);
  definition := replace(definition,
    $$entity in ('life_schedule_events','life_habits') and action not in$$,
    $$entity in ('life_schedule_events','life_habits','life_finance_records','life_timer_results') and action not in$$);
  definition := replace(definition,
    $$when entity='life_schedule_events' then array['title','starts_at','ends_at','all_day','category','notes','milestone']$$,
    $$when entity='life_schedule_events' then array['title','starts_at','ends_at','all_day','category','notes','milestone','repeat_rule']
      when entity='life_finance_records' then array['kind','payload']
      when entity='life_timer_results' then array['ended_at','elapsed_ms','mode','task_id','study_session_id']$$);
  definition := replace(definition, $$allowed := case when entity = 'pages' then array[$$,
    $$if entity = 'life_finance_records' and current_row is not null then
      if current_row->>'kind' is distinct from op->'value'->>'kind' then raise exception 'Finance kind is immutable'; end if;
      if current_row->>'kind' in ('account','goal','instrument') and
        current_row->'payload'->>'currency' is distinct from op->'value'->'payload'->>'currency'
      then raise exception 'Finance currency is immutable'; end if;
      end if;
      allowed := case when entity = 'pages' then array[$$);
  definition := replace(definition, $$if life_changed then perform public.validate_life_workspace(actor);end if;$$,
    $$if life_changed then perform public.validate_life_workspace(actor);end if;
      if exists(select 1 from jsonb_array_elements(operations) entry where entry->>'entity_type'='life_finance_records')
      then perform public.validate_life_finance(actor);end if;$$);
  if strpos(definition, $$array['kind','payload']$$)=0 or strpos(definition,'validate_life_finance(actor)')=0 or strpos(definition,'Finance currency is immutable')=0
    or strpos(definition, $$'life_finance_records','life_timer_results')$$)=0 then raise exception 'Unexpected workspace RPC definition'; end if;
  execute definition;
end $patch$;

commit;
