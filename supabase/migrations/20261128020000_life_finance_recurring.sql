begin;

-- The subscription record is the existing recurring series. Legacy rows omit
-- type/target and continue to represent an expense.
alter table public.life_finance_records
  add constraint life_finance_recurring_type check (
    kind <> 'subscription' or deleted_at is not null or (
      coalesce(payload->>'type', 'expense') in ('expense', 'income', 'transfer')
      and (
        coalesce(payload->>'type', 'expense') <> 'transfer'
        or (
          coalesce(payload->>'account', '') <> ''
          and coalesce(payload->>'target', '') <> ''
          and payload->>'account' <> payload->>'target'
          and coalesce(payload->>'targetAmount', '') ~ '^[0-9]{1,24}$'
          and coalesce(payload->>'targetAmount', '') !~ '^0+$'
        )
      )
    )
  );

alter table public.life_finance_records
  add constraint life_finance_repayment_interest check (
    kind <> 'transaction' or deleted_at is not null or not (payload ? 'interest')
    or (payload->>'type' = 'repayment' and coalesce(payload->>'interest', '') ~ '^[0-9]{1,24}$')
  );

-- A linked account can drive one open goal at a time.
create unique index life_finance_open_goal_balance_account
  on public.life_finance_records (owner_id, (payload->>'account'))
  where kind = 'goal' and deleted_at is null
    and payload->>'progress' = 'balance'
    and coalesce(payload->>'state', 'active') in ('active', 'paused');

do $migration$
declare
  definition text := pg_get_functiondef('public.validate_life_finance(uuid)'::regprocedure);
  previous text := $match$('account', case when r.kind='transaction' then nullif(r.payload->>'target','') end),$match$;
  replacement text := $match$('account', case when r.kind='transaction' or (r.kind='subscription' and r.payload->>'type'='transfer') then nullif(r.payload->>'target','') end),$match$;
begin
  if strpos(definition, previous) = 0 then
    raise exception 'Unexpected finance validation definition';
  end if;
  execute replace(definition, previous, replacement);
end
$migration$;

commit;
