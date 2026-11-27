begin;
alter table public.life_health_records drop constraint life_health_records_kind_check;
alter table public.life_health_records add constraint life_health_records_kind_check
  check (kind in ('privacy','body','goal','food','recipe','meal','water','exercise','plan','sleep','cycle','medication','dose'));
commit;
