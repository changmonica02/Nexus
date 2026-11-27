import { useState } from "react";
import { useUnsavedDraft } from "../dictionary/useUnsavedDraft";
import { confirmDialog } from "../../lib/confirmDialog";
import { localDateInput } from "../../lib/todoCalendar";
import { habitQuantity, habitStats, newHabit } from "./habits";
import { control, surface } from "./dashboard/styles";
import type { LifeRepository } from "./LifeRepository";
import type { Habit } from "./syncRecords";

function HabitForm({ habit, repository, close }: { habit: Habit; repository: LifeRepository; close: () => void }) {
  const [draft, setDraft] = useState(habit);
  const [problem, setProblem] = useState("");
  const [busy, setBusy] = useState(false);
  useUnsavedDraft(draft !== habit, busy);
  async function save(remove = false) {
    if (busy) return;
    setBusy(true);
    setProblem("");
    try { await repository.saveHabit(draft, remove); close(); }
    catch (error) { setProblem(error instanceof Error ? error.message : "儲存失敗"); }
    finally { setBusy(false); }
  }
  return <form className={surface + " space-y-3"} onSubmit={event => { event.preventDefault(); void save(); }}>
    <h3 className="font-semibold">{habit.revision ? "編輯習慣" : "新增習慣"}</h3>
    <div className="grid gap-2 sm:grid-cols-3">
      <label className="grid gap-1">名稱<input className={control} required maxLength={160} value={draft.title}
        onChange={event => setDraft({ ...draft, title: event.target.value })}/></label>
      <label className="grid gap-1">頻率<select className={control} value={draft.cadence}
        onChange={event => setDraft({ ...draft, cadence: event.target.value as Habit["cadence"] })}>
        <option value="daily">每日</option><option value="weekly">每週</option>
      </select></label>
      {!habit.revision && <label className="grid gap-1">開始日期<input required type="date" className={control}
        value={draft.started_on} onChange={event => setDraft({ ...draft, started_on: event.target.value })}/></label>}
      <label className="grid gap-1">目標數量<input className={control} type="number" required min="0.01" max="1000000" step="any" defaultValue={habit.goal}
        onChange={event => setDraft({ ...draft, goal: event.target.valueAsNumber })}/></label>
    </div>
    {problem && <p role="alert">{problem}</p>}
    <div className="flex flex-wrap gap-2">
      <button className={control} disabled={busy}>儲存習慣</button>
      <button className={control} type="button" disabled={busy} onClick={close}>取消</button>
      {!!habit.revision && <button className={control} type="button" disabled={busy} onClick={async () => {
        if (await confirmDialog({ title: "刪除習慣", message: `確定刪除「${habit.title}」及其紀錄？`, danger: true })) await save(true);
      }}>刪除習慣</button>}
    </div>
  </form>;
}

function HabitHistory({ habit, date, today, repository, selectDate }: {
  habit: Habit; date: Date; today: Date; repository: LifeRepository; selectDate: (date: Date) => void;
}) {
  const dayKey = localDateInput(date);
  const todayKey = localDateInput(today);
  const [quantity, setQuantity] = useState(habit.quantities[dayKey] ?? 0);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const year = date.getFullYear(), month = date.getMonth();
  const days = Array.from({ length: new Date(year, month + 1, 0).getDate() }, (_, i) => new Date(year, month, i + 1));
  const stats = habitStats(habit, today);
  const amount = habitQuantity(habit, date);
  const canLog = dayKey >= habit.started_on && dayKey <= todayKey;
  const save = async (value: number) => {
    if (!canLog || busy) return;
    setBusy(true);
    setProblem("");
    const quantities = { ...habit.quantities };
    if (value === 0) delete quantities[dayKey];
    else quantities[dayKey] = value;
    try { await repository.saveHabit({ ...habit, quantities }); setQuantity(value); }
    catch (error) { setProblem(error instanceof Error ? error.message : "紀錄儲存失敗"); }
    finally { setBusy(false); }
  };
  return <>
    <p className="text-sm">{habit.cadence === "weekly" ? "當週累計" : "當日累計"} {amount} / {habit.goal} ・連續 {stats.streak} {habit.cadence === "weekly" ? "週" : "天"} ・本月達成率 {stats.percent}%</p>
    <div className="grid grid-cols-7 gap-1" role="group" aria-label="月度熱度圖">
      {["日","一","二","三","四","五","六"].map(label => <span key={label} aria-hidden="true" className="text-center text-xs opacity-70">{label}</span>)}
      {Array.from({ length: days[0].getDay() }, (_, index) => <span key={index} aria-hidden="true"/>)}
      {days.map(day => {
        const key = localDateInput(day), value = habit.quantities[key] ?? 0;
        return <button key={key} className={`min-h-9 rounded-md text-sm ${value >= habit.goal ? "bg-emerald-600/50" : value ? "bg-emerald-500/25" : "bg-zinc-500/10"} ${key === dayKey ? "ring-2 ring-inset ring-emerald-500" : ""}`}
          aria-label={`${key}，紀錄 ${value}`} aria-pressed={key === dayKey} onClick={() => selectDate(day)}>{day.getDate()}</button>;
      })}
    </div>
    {canLog && <form className="flex flex-wrap items-end gap-2" onSubmit={event => { event.preventDefault(); void save(quantity); }}>
      <label className="grid gap-1">{dayKey} 的數量<input className={control + " w-32"} type="number" min="0" max="1000000" step="any"
        value={Number.isFinite(quantity) ? quantity : ""} required onChange={event => setQuantity(event.target.valueAsNumber)}/></label>
      <button className={control} disabled={busy}>儲存數量</button>
      {habit.cadence === "daily" && <button type="button" className={control} disabled={busy}
        onClick={() => void save(amount >= habit.goal ? 0 : habit.goal)}>{amount >= habit.goal ? "清除該日完成" : "標記完成"}</button>}
    </form>}
    {problem && <p role="alert">{problem}</p>}
  </>;
}

export default function HabitsPanel({ habits, date, today, selectDate, repository, owner, focusId, startCreating }: {
  habits: Habit[]; date: Date; today: Date; selectDate: (date: Date) => void;
  repository: LifeRepository; owner: string | null; focusId?: string; startCreating: boolean;
}) {
  const [editor, setEditor] = useState<Habit | undefined>(() => startCreating ? newHabit(owner, today) : undefined);
  const changeMonth = (offset: number) => selectDate(new Date(date.getFullYear(), date.getMonth() + offset, 1));
  return <section className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-xl font-semibold">習慣養成</h2>
      <button className={control} onClick={() => setEditor(newHabit(owner, today))}>新增習慣</button></div>
    <div className="flex flex-wrap items-end gap-2">
      <button type="button" className={control} onClick={() => changeMonth(-1)}>上個月</button>
      <label className="grid gap-1">紀錄日期<input type="date" className={control} value={localDateInput(date)} onChange={event => {
        if (event.target.value) selectDate(new Date(event.target.value + "T00:00:00"));
      }}/></label>
      <button type="button" className={control} onClick={() => changeMonth(1)}>下個月</button>
    </div>
    {editor && <HabitForm key={editor.id} habit={editor} repository={repository} close={() => setEditor(undefined)}/>}
    {!habits.length && !editor && <p className={surface}>尚無習慣。</p>}
    {habits.map(habit => <article key={habit.id} className={surface + " space-y-3"} data-focused={focusId === habit.id || undefined}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="min-w-0 break-words font-semibold">{habit.title}</h3>
        <button className={control + " shrink-0"} onClick={() => setEditor(habit)}>編輯</button>
      </div>
      <HabitHistory key={localDateInput(date) + ":" + habit.revision} habit={habit} date={date} today={today} repository={repository} selectDate={selectDate}/>
    </article>)}
  </section>;
}
