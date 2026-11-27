-- Extend the existing owner-scoped tracking records without rewriting IDs or check-ins.
alter table public.life_habits
  drop constraint life_habits_cadence_check,
  add constraint life_habits_cadence_check check (cadence in ('daily', 'weekly', 'monthly'));

-- The interval uses task_repeat_day in completion-driven mode and retains
-- the original month-day meaning for monthly tasks.
alter table public.pages
  drop constraint pages_task_repeat_check,
  add constraint pages_task_repeat_check check (task_repeat in ('daily', 'weekly', 'monthly', 'after_completion'));
