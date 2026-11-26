import { useState } from "react";
import { localDateInput, localDateTimeInput } from "../../lib/todoCalendar";
import ModalDialog from "../../components/ModalDialog";
import { confirmDialog } from "../../lib/confirmDialog";
import { useUnsavedDraft } from "../dictionary/useUnsavedDraft";
import type { LifeRepository } from "./LifeRepository";
import { control, surface } from "./dashboard/styles";
import type { ScheduleEvent } from "./syncRecords";

export function newScheduleEvent(owner: string | null, anchor: Date): ScheduleEvent {
  const start = new Date(anchor);
  start.setHours(9, 0, 0, 0);
  return {
    id: crypto.randomUUID(), workspace_owner_id: owner, revision: 0, created_at: Date.now(), updated_at: Date.now(),
    deleted_at: null, title: "", starts_at: start.getTime(), ends_at: start.getTime() + 3600000,
    all_day: false, category: "", notes: "",
  };
}

export function scheduleLabel(event: ScheduleEvent, locale: string) {
  const allDay = event.all_day;
  const format = new Intl.DateTimeFormat(locale, allDay
    ? { dateStyle: "medium", timeZone: "UTC" } : { dateStyle: "medium", timeStyle: "short" });
  return format.formatRange(event.starts_at, event.ends_at) + (allDay ? " · 全天" : "");
}

export function ScheduleForm({ initial, repository, close }: {
  initial: ScheduleEvent; repository: LifeRepository; close: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  const format = (value: number) => initial.all_day ? new Date(value).toISOString().slice(0, 10) : localDateTimeInput(value);
  const [start, setStart] = useState(() => format(initial.starts_at));
  const [end, setEnd] = useState(() => format(initial.ends_at));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dirty = initial !== draft || start !== format(initial.starts_at) || end !== format(initial.ends_at);
  useUnsavedDraft(dirty, busy);
  const dismiss = async () => {
    if (busy) return;
    if (!dirty || await confirmDialog({ title: "捨棄修改", message: "要關閉行程並捨棄變更嗎？" })) close();
  };
  const run = async (remove = false) => {
    if (busy) return;
    setError("");
    setBusy(true);
    try {
      const parse = (value: string) => Date.parse(draft.all_day ? value + "T00:00:00Z" : value);
      await repository.saveSchedule(remove ? initial : {
        ...draft, title: draft.title.trim(), starts_at: parse(start), ends_at: parse(end), updated_at: Date.now(),
      }, remove);
      close();
    } catch (error) {
      setError(error instanceof Error ? error.message : "行程儲存失敗");
    } finally { setBusy(false); }
  };
  return <ModalDialog aria-label={initial.revision ? "編輯行程" : "新增行程"} onDismiss={() => void dismiss()} busy={busy} className="m-auto max-h-[90dvh] w-[min(94vw,36rem)] overflow-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-5 text-[var(--color-text)] backdrop:bg-black/40">
    <h2 className="mb-4 text-xl font-semibold">{initial.revision ? "編輯行程" : "新增行程"}</h2>
    <form className="space-y-4" onSubmit={event => { event.preventDefault(); void run(); }}>
      <label className="grid gap-1">名稱<input className={control} autoFocus required maxLength={160} value={draft.title}
        onChange={event => setDraft({ ...draft, title: event.target.value })}/></label>
      <label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={draft.all_day} onChange={event => {
        const allDay = event.target.checked;
        const convert = (value: string) => !value ? "" : allDay ? localDateInput(new Date(value)) : value + "T09:00";
        setStart(convert(start));
        setEnd(convert(end));
        setDraft({ ...draft, all_day: allDay });
      }}/>全天</label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid min-w-0 gap-1">開始<input className={control} required type={draft.all_day ? "date" : "datetime-local"}
          value={start} onChange={event => setStart(event.target.value)}/></label>
        <label className="grid min-w-0 gap-1">結束<input className={control} required type={draft.all_day ? "date" : "datetime-local"}
          value={end} onChange={event => setEnd(event.target.value)}/></label>
      </div>
      <label className="grid gap-1">分類<input className={control} maxLength={80} value={draft.category}
        onChange={event => setDraft({ ...draft, category: event.target.value })}/></label>
      <label className="grid gap-1">備註<textarea className={control} rows={3} maxLength={4000} value={draft.notes}
        onChange={event => setDraft({ ...draft, notes: event.target.value })}/></label>
      {error && <p role="alert">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button className={control} disabled={busy}>儲存行程</button>
        <button className={control} type="button" disabled={busy} onClick={() => void dismiss()}>取消</button>
        {initial.revision > 0 && <button className={control} type="button" disabled={busy} onClick={async () => {
          if (await confirmDialog({ title: "刪除行程", message: `確定刪除「${initial.title}」？`, danger: true })) await run(true);
        }}>刪除行程</button>}
      </div>
    </form>
  </ModalDialog>;
}

export function SchedulePanel({ events, locale, edit, create }: {
  events: ScheduleEvent[]; locale: string; edit: (event: ScheduleEvent) => void; create: () => void;
}) {
  return <section className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="text-xl font-semibold">我的行程</h2>
      <button className={control} onClick={create}>新增行程</button>
    </div>
    {events.length ? <ul className="space-y-2">{events.map(event => <li key={event.id} className={surface}>
      <button type="button" className="block min-h-11 w-full break-words text-left" onClick={() => edit(event)}>
        <strong>{event.title}</strong>
        <span className="block text-sm opacity-75">{scheduleLabel(event, locale)}{event.category && " · " + event.category}</span>
      </button>
    </li>)}</ul> : <p className={surface}>尚無行程。</p>}
  </section>;
}
