import ModalDialog from "../../components/ModalDialog";
import { useState, type ReactNode } from "react";
import { useUnsavedDraft } from "../dictionary/useUnsavedDraft";
import { confirmDialog } from "../../lib/confirmDialog";
import { localDateInput } from "../../lib/todoCalendar";
import { habitPeriodLabel, habitQuantity, habitTrackingStats } from "./habits";
import { control, surface } from "./dashboard/styles";
import type { LifeRepository } from "./LifeRepository";
import type { Habit } from "./syncRecords";

export function HabitForm({ habit, repository, close, modal = false, modeControl }: { habit: Habit; repository: LifeRepository; close: () => void; modal?:boolean; modeControl?:ReactNode }) {
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
  const dismiss=async()=>{if(!busy&&(draft===habit||await confirmDialog({title:"捨棄修改",message:"要捨棄任務的修改嗎？"})))close();};
  const form = <form className={surface + " space-y-3"} onSubmit={event => { event.preventDefault(); void save(); }}>
    <h3 className="font-semibold">{habit.revision ? "編輯追蹤任務" : "新增追蹤任務"}</h3>
    {modeControl}
    <div className="grid gap-2 sm:grid-cols-3">
      <label className="grid gap-1">名稱<input className={control} required maxLength={160} value={draft.title}
        onChange={event => setDraft({ ...draft, title: event.target.value })}/></label>
      <label className="grid gap-1">頻率<select className={control} value={draft.cadence}
        onChange={event => setDraft({ ...draft, cadence: event.target.value as Habit["cadence"] })}>
        <option value="daily">每日</option><option value="weekly">每週累計</option><option value="monthly">每月累計</option>
      </select></label>
      {!habit.revision && <label className="grid gap-1">開始日期<input required type="date" className={control}
        value={draft.started_on} onChange={event => setDraft({ ...draft, started_on: event.target.value })}/></label>}
      <label className="grid gap-1">目標數量<input className={control} type="number" required min="0.01" max="1000000" step="any" defaultValue={habit.goal}
        onChange={event => setDraft({ ...draft, goal: event.target.valueAsNumber })}/></label>
    </div>
    {problem && <p role="alert">{problem}</p>}
    <div className="flex flex-wrap gap-2">
      <button className={control} disabled={busy}>儲存任務</button>
      <button className={control} type="button" disabled={busy} onClick={()=>void dismiss()}>取消</button>
      {!!habit.revision && <button className={control} type="button" disabled={busy} onClick={async () => {
        if (await confirmDialog({ title: "刪除追蹤任務", message: `確定刪除「${habit.title}」及其紀錄？`, danger: true })) await save(true);
      }}>刪除追蹤任務</button>}
    </div>
  </form>;
  return modal?<ModalDialog aria-label={habit.revision?"編輯追蹤任務":"新增追蹤任務"} busy={busy} onDismiss={()=>void dismiss()} className="m-auto max-h-[90dvh] w-[min(94vw,42rem)] overflow-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4 text-[var(--color-text)] backdrop:bg-black/40">{form}</ModalDialog>:form;
}

export function HabitHistory({ habit, date, today, repository, selectDate }: {
  habit: Habit; date: Date; today: Date; repository: LifeRepository; selectDate: (date: Date) => void;
}) {
  const dayKey = localDateInput(date);
  const todayKey = localDateInput(today);
  const [quantity, setQuantity] = useState(habit.quantities[dayKey] ?? 0);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const year = date.getFullYear(), month = date.getMonth();
  const days = Array.from({ length: new Date(year, month + 1, 0).getDate() }, (_, i) => new Date(year, month, i + 1));
  const stats = habitTrackingStats(habit, today);
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
    <p className="text-sm">當{habitPeriodLabel[habit.cadence]}累計 {amount} / {habit.goal} ・達成率 {stats.percent}% ・目前連續 {stats.streak} ・最長連續 {stats.longest}</p>
    <details>
      <summary className="cursor-pointer text-sm">查看每{habitPeriodLabel[habit.cadence]}紀錄</summary>
      <ul className="max-h-48 overflow-auto text-sm">
        {stats.history.slice().reverse().map(row => <li key={row.period} className="flex flex-wrap justify-between gap-2 border-b border-[var(--color-border)] py-1">
          <time dateTime={row.period}>{row.period}</time><span>{row.amount} / {habit.goal} · {
          { complete: "已完成", partial: "部分完成", missed: "未達成", pending: "待完成" }[row.status]}</span>
        </li>)}
      </ul>
    </details>
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

export function HabitTrackingDialog({ habit, selected, today, repository, edit, close }: {
  habit: Habit; selected: Date; today: Date; repository: LifeRepository; edit: () => void; close: () => void;
}) {
  const [date, setDate] = useState(selected);
  return <ModalDialog aria-label="任務追蹤紀錄" onDismiss={close}
    className="m-auto max-h-[90dvh] w-[min(94vw,42rem)] space-y-3 overflow-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4 text-[var(--color-text)] backdrop:bg-black/40">
    <h2 className="text-lg font-semibold">{habit.title}</h2>
    <label className="flex flex-wrap items-center gap-2">紀錄日期<input type="date" className={control}
      value={localDateInput(date)} onChange={event => { if (event.target.value) setDate(new Date(event.target.value + "T00:00:00")); }}/></label>
    <HabitHistory key={localDateInput(date) + ":" + habit.revision} habit={habit} date={date} today={today} repository={repository} selectDate={setDate}/>
    <div className="flex gap-2">
      <button type="button" className={control} onClick={edit}>編輯任務</button>
      <button type="button" className={control} onClick={close}>關閉</button>
    </div>
  </ModalDialog>;
}

export default function HabitsPanel({ habits, date, today, selectDate, repository }: {
  habits: Habit[]; date: Date; today: Date; selectDate: (date: Date) => void; repository: LifeRepository;
}) {
  const [editor, setEditor] = useState<Habit>();
  const changeMonth = (offset: number) => selectDate(new Date(date.getFullYear(), date.getMonth() + offset, 1));
  return <section className="space-y-3">
    <h3 className="font-semibold">習慣追蹤</h3>
    <div className="flex flex-wrap items-end gap-2">
      <button type="button" className={control} onClick={() => changeMonth(-1)}>上個月</button>
      <label className="grid gap-1">紀錄日期<input type="date" className={control} value={localDateInput(date)} onChange={event => {
        if (event.target.value) selectDate(new Date(event.target.value + "T00:00:00"));
      }}/></label>
      <button type="button" className={control} onClick={() => changeMonth(1)}>下個月</button>
    </div>
    {editor && <HabitForm key={editor.id} modal habit={editor} repository={repository} close={() => setEditor(undefined)}/>}
    {!habits.length && <p className={surface}>尚無追蹤任務。</p>}
    {habits.map(habit => <article key={habit.id} className={surface + " space-y-3"}>
      <div className="flex items-center justify-between gap-2">
        <h4 className="min-w-0 break-words font-semibold">{habit.title}</h4>
        <button className={control + " shrink-0"} onClick={() => setEditor(habit)}>編輯</button>
      </div>
      <HabitHistory key={localDateInput(date) + ":" + habit.revision} habit={habit} date={date} today={today} repository={repository} selectDate={selectDate}/>
    </article>)}
  </section>;
}
