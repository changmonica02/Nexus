import { localDateInput } from "../../lib/todoCalendar";
import type { Habit } from "./syncRecords";
import { civilAdvance } from "./civilPeriods";

export function habitPeriodKey(cadence: Habit["cadence"], day: string) {
  if (cadence === "monthly") return day.slice(0, 7) + "-01";
  if (cadence === "daily") return day;
  const weekday = new Date(day + "T00:00:00Z").getUTCDay();
  return civilAdvance(day, "day", -((weekday + 6) % 7));
}

export const habitPeriodLabel = { daily: "日", weekly: "週", monthly: "月" } as const;
const periodUnit = { daily: "day", weekly: "week", monthly: "month" } as const;

export function habitQuantity(habit: Habit, date: Date) {
  const day = localDateInput(date);
  if (day < habit.started_on) return 0;
  if (habit.cadence === "daily") return habit.quantities[day] ?? 0;
  const start = habitPeriodKey(habit.cadence, day);
  return Object.entries(habit.quantities).reduce((sum, [key, amount]) =>
    key >= start && key <= day && key >= habit.started_on ? sum + amount : sum, 0);
}

export function habitHistory(habit: Habit, today: Date) {
  const end = localDateInput(today);
  if (end < habit.started_on) return [];
  const current = habitPeriodKey(habit.cadence, end);
  const first = habitPeriodKey(habit.cadence, habit.started_on);
  const unit = periodUnit[habit.cadence];
  const totals = new Map<string, number>();
  for (const [day, amount] of Object.entries(habit.quantities)) {
    if (day < habit.started_on || day > end) continue;
    const key = habitPeriodKey(habit.cadence, day);
    totals.set(key, (totals.get(key) ?? 0) + amount);
  }
  const rows: { period: string; amount: number; status: "complete" | "partial" | "missed" | "pending"; closed: boolean }[] = [];
  for (let period = first; period <= current; period = civilAdvance(period, unit, 1)) {
    const amount = totals.get(period) ?? 0;
    const closed = civilAdvance(civilAdvance(period, unit, 1), "day", -1) <= end;
    rows.push({ period, amount, closed,
      status: amount >= habit.goal ? "complete" : closed ? "missed" : amount > 0 ? "partial" : "pending" });
  }
  return rows;
}

export function habitTrackingStats(habit: Habit, today: Date) {
  const history = habitHistory(habit, today);
  const eligible = history.filter(row => row.closed || row.status === "complete");
  let streak = 0, longest = 0;
  for (const row of eligible) {
    streak = row.status === "complete" ? streak + 1 : 0;
    longest = Math.max(longest, streak);
  }
  const complete = eligible.filter(row => row.status === "complete").length;
  const current = history.at(-1);
  if (habit.cadence === "daily" && current?.status !== "complete") streak = trailingCompleted(history.slice(0, -1));
  return { history, streak, longest, percent: eligible.length ? Math.round(complete / eligible.length * 100) : 0 };
}

export function habitStats(habit: Habit, today: Date) {
  const { history, streak } = habitTrackingStats(habit, today);
  const monthStart = localDateInput(new Date(today.getFullYear(), today.getMonth(), 1));
  const first = habitPeriodKey(habit.cadence, monthStart);
  const rows = history.filter(row => row.period >= first && (row.closed || row.status === "complete"));
  const complete = rows.filter(row => row.status === "complete").length;
  return { streak, percent: rows.length ? Math.round(complete / rows.length * 100) : 0 };
}

function trailingCompleted(history: ReturnType<typeof habitHistory>) {
  let index = history.length - 1;
  while (index >= 0 && history[index].status === "complete") index--;
  return history.length - 1 - index;
}

export function newHabit(owner: string | null, today: Date): Habit {
  const stamp = Date.now();
  return {
    id: crypto.randomUUID(), workspace_owner_id: owner, revision: 0, created_at: stamp, updated_at: stamp, deleted_at: null,
    title: "", cadence: "daily", goal: 1, started_on: localDateInput(today), quantities: {},
  };
}
