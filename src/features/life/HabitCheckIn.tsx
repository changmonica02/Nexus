import { useState } from "react";
import { localDateInput } from "../../lib/todoCalendar";
import { habitQuantity } from "./habits";
import type { Habit } from "./syncRecords";
import type { LifeRepository } from "./LifeRepository";
import { control } from "./dashboard/styles";
export default function HabitCheckIn({ habit, date, repository }: { habit: Habit; date: Date; repository: LifeRepository }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const day = localDateInput(date), amount = habitQuantity(habit, date), completed = amount >= habit.goal;
  const disabled = day > localDateInput(new Date()) || day < habit.started_on;
  return <div className="flex flex-wrap items-center gap-2">
    <span className="min-w-0 flex-1 text-sm">{amount} / {habit.goal}{completed ? " ✓" : ""}</span>
    <button type="button" className={control} disabled={busy || disabled || completed && !habit.quantities[day]} aria-label={(completed ? "取消打卡 " : "打卡 ") + habit.title} onClick={async () => {
      if (busy || disabled) return;
      setBusy(true); setError("");
      const quantities = { ...habit.quantities };
      if (completed) delete quantities[day];
      else quantities[day] = (quantities[day] ?? 0) + Math.max(0, habit.goal - amount);
      try { await repository.saveHabit({ ...habit, quantities }); }
      catch (error) { setError(error instanceof Error ? error.message : "打卡失敗，請重試"); }
      finally { setBusy(false); }
    }}>{completed ? "取消打卡" : "打卡"}</button>
    {error && <p className="w-full text-sm" role="alert">{error}</p>}
  </div>;
}
