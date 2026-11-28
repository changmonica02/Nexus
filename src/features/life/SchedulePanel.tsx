import { civilAdvance } from "./civilPeriods";
import { recurrenceAnchorDay, scheduleOccurrence, type ScheduleRule } from "./scheduleRecurrence";
import { useState } from "react";
import { localDateInput, localDateTimeInput } from "../../lib/todoCalendar";
import ModalDialog from "../../components/ModalDialog";
import { confirmDialog } from "../../lib/confirmDialog";
import { useUnsavedDraft } from "../dictionary/useUnsavedDraft";
import type { LifeRepository } from "./LifeRepository";
import { control, surface } from "./dashboard/styles";
import type { ScheduleEvent } from "./syncRecords";

export function newScheduleEvent(owner: string | null, anchor: Date, keepTime = false): ScheduleEvent {
  const start = new Date(anchor);
  if (!keepTime) start.setHours(9, 0, 0, 0);
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

export function ScheduleForm({ initial, repository, close, occurrence }: {
  initial: ScheduleEvent; repository: LifeRepository; close: () => void; occurrence?: string;
}) {
  const [scope, setScope] = useState(occurrence ? "single" : "series");
  const item = occurrence ? scheduleOccurrence(initial, occurrence) : undefined;
  if (!item || !occurrence || !initial.repeat_rule) return <ScheduleFields initial={initial} close={close}
    persist={(event,remove)=>repository.saveSchedule(event,remove)}/>;
  const rule=initial.repeat_rule;
  const source=scopedSchedule(initial, item, scope);
  return <ScheduleFields key={scope} initial={source} close={close} scopeOptions={<OccurrenceScope value={scope} change={setScope}/>}
    single={scope==="single"} persist={(event,remove)=>saveScopedSchedule(repository,initial,item,scope,event,remove)}/>;
}

export function OccurrenceScope({ value, change }: { value: string; change: (value: string) => void }) {
  return <label className="grid gap-1">套用範圍<select aria-label="套用範圍" className={control} value={value} onChange={event=>change(event.target.value)}>
    <option value="series">整個系列</option><option value="single">僅本次</option><option value="future">本次及後續</option>
  </select></label>;
}

type ScheduleOccurrence = NonNullable<ReturnType<typeof scheduleOccurrence>>;

export function scopedSchedule(initial:ScheduleEvent, item:ScheduleOccurrence, scope:string) {
  const rule=initial.repeat_rule!;
  return scope==="series"?initial:{...item.event,repeat_rule:scope==="single"?null:{
    ...rule, anchorDay:rule.anchorDay??recurrenceAnchorDay(initial), count:rule.count===null?null:rule.count-item.index,
    exceptions:rule.exceptions.filter(key=>key>=item.key),
    overrides:Object.fromEntries(Object.entries(rule.overrides).filter(([key])=>key>item.key)),
  }};
}

export async function saveScopedSchedule(repository:LifeRepository, initial:ScheduleEvent, item:ScheduleOccurrence, scope:string, event:ScheduleEvent, remove:boolean) {
  const rule=initial.repeat_rule!;
  const key=item.key;
  if(scope==="series"){await repository.saveSchedule(event,remove);return;}
  if(scope==="single"){
    const overrides={...rule.overrides};
    if(remove)delete overrides[key];
    else {
      if(!event.title||!Number.isSafeInteger(event.starts_at)||!Number.isSafeInteger(event.ends_at)||event.ends_at<event.starts_at)throw Error("請確認起訖時間");
      const {title,starts_at,ends_at,all_day,category,notes,milestone}=event;
      overrides[key]={title,starts_at,ends_at,all_day,category,notes,...(milestone?{milestone}:{})};
    }
    const exceptions=remove?[...new Set([...rule.exceptions,key])]:rule.exceptions.filter(day=>day!==key);
    await repository.saveSchedule({...initial,repeat_rule:{...rule,exceptions,overrides}});
    return;
  }
  if(item.index===0){await repository.saveSchedule(event,remove);return;}
  const prior=civilAdvance(key,"day",-1);
  const before={...initial,repeat_rule:{...rule,until:rule.until&&rule.until<prior?rule.until:prior,
    exceptions:rule.exceptions.filter(day=>day<key),
    overrides:Object.fromEntries(Object.entries(rule.overrides).filter(([day])=>day<key))}};
  await repository.saveScheduleSplit(before,remove?undefined:{...event,id:crypto.randomUUID(),revision:0,created_at:Date.now()});
}

function ScheduleFields({ initial, close, persist, scopeOptions, single }: {
  initial: ScheduleEvent; close: () => void; persist: (event: ScheduleEvent, remove: boolean)=>Promise<void>;
  scopeOptions?: React.ReactNode; single?: boolean;
}) {
  const [draft, setDraft] = useState(initial);
  const format = (value: number) => initial.all_day ? new Date(value).toISOString().slice(0, 10) : localDateTimeInput(value);
  const [start, setStart] = useState(() => format(initial.starts_at));
  const [end, setEnd] = useState(() => format(initial.ends_at));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [exceptions,setExceptions]=useState(initial.repeat_rule?.exceptions.join(", ")??"");
  const repeat=draft.repeat_rule;
  const setRepeat=(patch:Partial<ScheduleRule>)=>setDraft({...draft,repeat_rule:{
    frequency:"week",interval:1,weekdays:[],until:"",count:null,zone:Intl.DateTimeFormat().resolvedOptions().timeZone,
    exceptions:[],overrides:{},...repeat,...patch,
  }});
  const dirty = initial !== draft || start !== format(initial.starts_at) || end !== format(initial.ends_at) || exceptions !== (initial.repeat_rule?.exceptions.join(", ")??"");
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
      await persist(remove ? initial : {
        ...draft, repeat_rule:repeat?{...repeat,anchorDay:start.slice(0,10)===format(initial.starts_at).slice(0,10)?repeat.anchorDay:Number(start.slice(8,10)),exceptions:exceptions.split(/[,，\s]+/).filter(Boolean)}:null, title: draft.title.trim(), starts_at: parse(start), ends_at: parse(end), updated_at: Date.now(),
      }, remove);
      close();
    } catch (error) {
      setError(error instanceof Error ? error.message : "行程儲存失敗");
    } finally { setBusy(false); }
  };
  return <ModalDialog aria-label={initial.revision ? "編輯行程" : "新增行程"} onDismiss={() => void dismiss()} busy={busy} className="m-auto max-h-[90dvh] w-[min(94vw,36rem)] overflow-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-5 text-[var(--color-text)] backdrop:bg-black/40">
    <h2 className="mb-4 text-xl font-semibold">{initial.revision ? "編輯行程" : "新增行程"}</h2>
    <form className="space-y-4" onSubmit={event => { event.preventDefault(); void run(); }}>
      {scopeOptions}
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
      {!single&&<fieldset className="grid gap-3 rounded-xl border border-[var(--color-border)] p-3">
        <legend className="px-1">行程重複</legend>
        <label className="grid gap-1">頻率<select aria-label="頻率" className={control} value={repeat?.frequency??""} onChange={event=>{
          if(!event.target.value)setDraft({...draft,repeat_rule:null});
          else setRepeat({frequency:event.target.value as ScheduleRule["frequency"]});
        }}><option value="">不重複</option><option value="day">每日</option><option value="week">每週</option>
          <option value="month">每月</option><option value="year">每年</option></select></label>
        {repeat&&<>
          <label className="grid gap-1">重複間隔<input type="number" min="1" max="365" required className={control} value={repeat.interval}
            onChange={event=>setRepeat({interval:Number(event.target.value)})}/></label>
          {repeat.frequency==="week"&&<div className="flex flex-wrap gap-3">{["日","一","二","三","四","五","六"].map((label,day)=>
            <label key={day} className="flex items-center gap-1"><input type="checkbox" checked={repeat.weekdays.includes(day)} onChange={event=>
              setRepeat({weekdays:event.target.checked?[...repeat.weekdays,day]:repeat.weekdays.filter(value=>value!==day)})}/>{label}</label>)}</div>}
          {repeat.frequency==="month"&&<div className="flex flex-wrap gap-2">
            <label className="grid gap-1">每月依據<select className={control} value={repeat.monthWeekday?"weekday":"date"}
              onChange={event=>setRepeat({monthWeekday:event.target.value==="weekday"?{weekday:1,ordinal:1}:undefined})}>
              <option value="date">開始日期</option><option value="weekday">特定星期</option>
            </select></label>
            {repeat.monthWeekday&&<>
              <label className="grid gap-1">第幾次<select className={control} value={repeat.monthWeekday.ordinal}
                onChange={event=>setRepeat({monthWeekday:{...repeat.monthWeekday!,ordinal:Number(event.target.value)}})}>
                {[1,2,3,4,5,-1].map(value=><option key={value} value={value}>{value===-1?"最後一次":`第 ${value} 次`}</option>)}
              </select></label>
              <label className="grid gap-1">星期<select className={control} value={repeat.monthWeekday.weekday}
                onChange={event=>setRepeat({monthWeekday:{...repeat.monthWeekday!,weekday:Number(event.target.value)}})}>
                {["日","一","二","三","四","五","六"].map((label,index)=><option key={label} value={index}>星期{label}</option>)}
              </select></label>
            </>}
          </div>}
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="grid gap-1">結束日期<input type="date" className={control} value={repeat.until} onChange={event=>setRepeat({until:event.target.value})}/></label>
            <label className="grid gap-1">重複次數<input type="number" min="1" max="10000" className={control} value={repeat.count??""}
              onChange={event=>setRepeat({count:event.target.value?Number(event.target.value):null})}/></label>
          </div>
          <label className="grid gap-1">例外日期（以逗號分隔）<input className={control} placeholder="2026-12-25, 2027-01-01"
            value={exceptions} onChange={event=>setExceptions(event.target.value)}/></label>
          <p className="text-sm opacity-75">定時系列時區 · {repeat.zone}</p>
        </>}
      </fieldset>}
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
