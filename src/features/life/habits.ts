import { localDateInput } from "../../lib/todoCalendar";
import type { Habit } from "./syncRecords";
import { civilDay } from "./milestoneDates";

const DAY = 86400000;
const iso = (time: number) => new Date(time).toISOString().slice(0, 10);
const monday = (time: number) => time - ((new Date(time).getUTCDay() + 6) % 7) * DAY;

export function habitQuantity(habit: Habit, date: Date) {
  const time = civilDay(date);
  if (habit.cadence === "daily") return habit.quantities[iso(time)] ?? 0;
  const start = monday(time);
  let total = 0;
  for (let day = start; day <= time; day += DAY) total += habit.quantities[iso(day)] ?? 0;
  return total;
}

export function habitStats(habit: Habit, today: Date) {
  const end = civilDay(today);
  const origin = Date.parse(habit.started_on + "T00:00:00Z");
  const week = habit.cadence === "weekly";
  const step = (week ? 7 : 1) * DAY;
  const first = week ? monday(origin) : origin;
  const current = week ? monday(end) : end;
  const totals = new Map<number, number>();
  for (const [date, quantity] of Object.entries(habit.quantities)) {
    const time = Date.parse(date + "T00:00:00Z");
    if (time < origin || time > end) continue;
    const period = week ? monday(time) : time;
    totals.set(period, (totals.get(period) ?? 0) + quantity);
  }
  const met = (period: number) => (totals.get(period) ?? 0) >= habit.goal;
  let streak = 0;
  for (let period = met(current) ? current : current - step; period >= first && met(period); period -= step) streak++;
  const monthStart = Date.UTC(today.getFullYear(), today.getMonth(), 1);
  const monthFirst = Math.max(first, week ? monday(monthStart) : monthStart);
  let metCount = 0, totalCount = 0;
  for (let period = monthFirst; period <= current; period += step) {
    if (period === current && week && !met(period) && end < period + 6 * DAY) continue;
    totalCount++;
    if (met(period)) metCount++;
  }
  return { streak, percent: totalCount ? Math.round(metCount / totalCount * 100) : 0 };
}

export function newHabit(owner: string | null, today: Date): Habit {
  const stamp = Date.now();
  return {
    id: crypto.randomUUID(), workspace_owner_id: owner, revision: 0, created_at: stamp, updated_at: stamp, deleted_at: null,
    title: "", cadence: "daily", goal: 1, started_on: localDateInput(today), quantities: {},
  };
}
