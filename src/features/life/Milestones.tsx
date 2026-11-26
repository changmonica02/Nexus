import { useState } from "react";
import ModalDialog from "../../components/ModalDialog";
import { confirmDialog } from "../../lib/confirmDialog";
import { useUnsavedDraft } from "../dictionary/useUnsavedDraft";
import { control, surface } from "./dashboard/styles";
import { civilDay, milestoneText } from "./milestoneDates";
import { newScheduleEvent } from "./SchedulePanel";
import type { LifeRepository } from "./LifeRepository";
import type { ScheduleEvent } from "./syncRecords";

type Milestone = NonNullable<ScheduleEvent["milestone"]>;
const defaultDetails: Milestone = { yearly: false, mode: "remaining", icon: "◆", style: "green", image: null };
const styles = { green: "bg-emerald-500/10", sand: "bg-amber-500/10", plain: "bg-[var(--color-panel-bg)]" };

export function newMilestone(owner: string | null, anchor: Date): ScheduleEvent {
  return { ...newScheduleEvent(owner, anchor), starts_at: civilDay(anchor), ends_at: civilDay(anchor), all_day: true, milestone: defaultDetails };
}

export function MilestoneRow({ event, anchor, open }: { event: ScheduleEvent; anchor: Date; open: () => void }) {
  const details = event.milestone ?? defaultDetails;
  return <button type="button" className={`flex min-h-16 w-full min-w-0 items-center gap-3 rounded-xl p-3 text-left ${styles[details.style]}`} onClick={open}>
    {/* Images come from a validated local upload and have no remote URL. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    {details.image ? <img alt="" src={details.image} className="size-12 shrink-0 rounded-lg object-cover"/> : <span aria-hidden="true">{details.icon}</span>}
    <span className="min-w-0 break-words"><strong>{event.title}</strong><span className="block text-sm opacity-75">{milestoneText(event, anchor)}</span></span>
  </button>;
}

export function MilestoneForm({ initial, repository, close }: {
  initial: ScheduleEvent; repository: LifeRepository; close: () => void;
}) {
  const [details, setDetails] = useState(initial.milestone ?? defaultDetails);
  const [name, setName] = useState(initial.title);
  const initialDate = new Date(initial.starts_at).toISOString().slice(0, 10);
  const [date, setDate] = useState(initialDate);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dirty = name !== initial.title || date !== initialDate || details !== initial.milestone;
  useUnsavedDraft(dirty, busy);
  const dismiss = async () => {
    if (!busy && (!dirty || await confirmDialog({ title: "捨棄修改", message: "要離開重要日期編輯嗎？" }))) close();
  };
  const submit = async (remove = false) => {
    setBusy(true);
    setError("");
    try {
      const time = Date.parse(date + "T00:00:00Z");
      await repository.saveSchedule(remove ? initial : { ...initial, title: name.trim(),
        starts_at: time, ends_at: time, milestone: details, updated_at: Date.now() }, remove);
      close();
    } catch (error) {
      setError(error instanceof Error ? error.message : "重要日期儲存失敗");
    } finally { setBusy(false); }
  };
  return <ModalDialog aria-label="重要日期編輯" onDismiss={() => void dismiss()} busy={busy}
    className="m-auto max-h-[90dvh] w-[min(94vw,34rem)] overflow-auto rounded-2xl border bg-[var(--color-bg)] p-5 text-[var(--color-text)] backdrop:bg-black/40">
    <h2 className="mb-4 text-xl font-semibold">{initial.revision ? "編輯重要日期" : "新增重要日期"}</h2>
    <form className="space-y-3" onSubmit={event => { event.preventDefault(); if (!busy) void submit(); }}>
      <label className="grid gap-1">名稱<input required className={control} maxLength={160} value={name} onChange={event => setName(event.target.value)}/></label>
      <label className="grid gap-1">日期<input required className={control} type="date" value={date} onChange={event => setDate(event.target.value)}/></label>
      <label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={details.yearly}
        onChange={event => setDetails({ ...details, yearly: event.target.checked })}/>每年重複</label>
      <label className="grid gap-1">天數顯示<select className={control} value={details.mode}
        onChange={event => setDetails({ ...details, mode: event.target.value as Milestone["mode"] })}>
        <option value="remaining">倒數至下次日期</option><option value="elapsed">自上次日期累計</option>
      </select></label>
      <label className="grid gap-1">圖示<input className={control} maxLength={8} value={details.icon} onChange={event => setDetails({ ...details, icon: event.target.value })}/></label>
      <label className="grid gap-1">卡片樣式<select className={control} value={details.style}
        onChange={event => setDetails({ ...details, style: event.target.value as Milestone["style"] })}>
        <option value="green">霧綠</option><option value="sand">暖沙</option><option value="plain">素面</option>
      </select></label>
      <label className="grid gap-1">圖片（PNG、JPEG、WebP，最多 128 KiB）<input className={control} type="file" accept="image/png,image/jpeg,image/webp"
        onChange={event => {
          const file = event.target.files?.[0];
          if (!file) return;
          if (file.size > 131072 || !["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
            setError("請選擇符合格式及大小的圖片。");
            return;
          }
          setError("");
          setBusy(true);
          const reader = new FileReader();
          reader.onload = () => setDetails(current => ({ ...current, image: String(reader.result) }));
          reader.onerror = () => setError("無法讀取圖片。");
          reader.onloadend = () => setBusy(false);
          reader.readAsDataURL(file);
        }}/></label>
      {details.image && <button type="button" className={control} disabled={busy} onClick={() => setDetails({ ...details, image: null })}>移除圖片</button>}
      {error && <p role="alert">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button className={control} disabled={busy}>儲存重要日期</button>
        <button type="button" className={control} disabled={busy} onClick={() => void dismiss()}>取消</button>
        {!!initial.revision && <button type="button" className={control} disabled={busy} onClick={async () => {
          if (await confirmDialog({ title: "刪除重要日期", message: `確定刪除「${initial.title}」？`, danger: true })) await submit(true);
        }}>刪除重要日期</button>}
      </div>
    </form>
  </ModalDialog>;
}

export function MilestonesPanel({ events, anchor, open, create }: {
  events: ScheduleEvent[]; anchor: Date; open: (event: ScheduleEvent) => void; create: () => void;
}) {
  return <section className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="text-xl font-semibold">重要日期</h2><button className={control} onClick={create}>新增重要日期</button>
    </div>
    {events.length ? <ul className="grid gap-3 sm:grid-cols-2">{events.map(event =>
      <li key={event.id}><MilestoneRow event={event} anchor={anchor} open={() => open(event)}/></li>)}</ul> : <p className={surface}>尚無重要日期。</p>}
  </section>;
}
