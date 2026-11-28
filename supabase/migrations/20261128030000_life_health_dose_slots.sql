begin;

-- Existing dose logs retain their IDs and remain readable, including legacy duplicates.
-- Newly managed scheduled doses have one active record per owner, plan, day and time.
create unique index life_health_managed_dose_slot
  on public.life_health_records (owner_id, (data->>'medication'), (data->>'date'), (data->>'planned'))
  where kind='dose' and deleted_at is null and data->>'managedSlot'='true'
    and coalesce(data->>'planned','') <> '';

commit;
