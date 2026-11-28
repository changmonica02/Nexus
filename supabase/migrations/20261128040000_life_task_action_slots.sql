begin;

-- Preserve legacy link data and independently recorded cumulative events.
create unique index life_health_task_action_slot on public.life_health_records
  (owner_id, (data->>'task'), (data->>'taskOccurrence'))
  where deleted_at is null and data->>'taskRunOnce'='true' and data ? 'taskOccurrence';

create unique index life_finance_task_action_slot on public.life_finance_records
  (owner_id, (payload->>'task'), (payload->>'taskOccurrence'))
  where kind='transaction' and deleted_at is null and payload->>'taskRunOnce'='true' and payload ? 'taskOccurrence';

commit;
