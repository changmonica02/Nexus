import { useState } from "react";
import type { Page, TaskSchedulingFields } from "../../lib/types";
import { localDateInput, localDateTimeInput } from "../../lib/todoCalendar";
import { confirmDialog } from "../../lib/confirmDialog";
import ModalDialog from "../../components/ModalDialog";
import { control } from "./dashboard/styles";
import type { LifeRepository } from "./LifeRepository";
import type { TaskHealthKind } from "./health/taskProgress";
import TaskDetails from "./TaskDetails";
import TaskPlanFields from "./TaskPlanFields";
import { defaultTaskSettings, editTaskPlan, executionHistory, statusLabels, taskStatistics,
  type TaskExecution, type TaskScope, type TaskSettings, type TaskSlot, type TaskStatus } from "./taskPlan";

export default function TaskOccurrenceEditor({ page, slot, executions, repository, update, close, project, recordHealth }: {
  page: Page;
  slot?: TaskSlot;
  executions: TaskExecution[];
  repository: LifeRepository;
  update: (id:string, patch:Partial<Page>)=>void | Promise<unknown>;
  close: () => void;
  project?: (slot:TaskSlot)=>TaskSlot;
  recordHealth?: (id:string,kind:TaskHealthKind,day:string)=>void;
}) {
  const plan = page.task_plan!;
  const [tab,setTab] = useState<"record"|"settings"|"history">(slot?"record":plan.retired?"history":"settings");
  const [scope,setScope] = useState<TaskScope>(slot?"one":"all");
  const [title,setTitle] = useState(page.title);
  const [settings,setSettings] = useState<TaskSettings>(()=>slot?settingsForSlot(slot):plan.segments.at(-1)?.settings??defaultTaskSettings(new Date()));
  const [selected,setSelected] = useState(slot?.key);
  const [group,setGroup] = useState<"daily"|"weekly"|"monthly">("daily");
  const today = localDateInput(new Date());
  const history = executionHistory(plan,executions,today).map(item=>project?.(item)??item);
  const current = (selected && history.find(row => row.key === selected)) || slot;
  const [amount,setAmount] = useState(slot?.record?.amount ?? 0);
  const [completedTime,setCompletedTime]=useState(localDateTimeInput(slot?.record?.completed_at));
  const [details,setDetails]=useState<TaskSchedulingFields>({});
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  const run = async (action:()=>void|Promise<unknown>, dismiss = false) => {
    if (busy) return;
    setBusy(true); setError("");
    try { await action(); if (dismiss) close(); }
    catch (error) { setError(error instanceof Error ? error.message : "儲存失敗"); }
    finally { setBusy(false); }
  };
  const record = (status:TaskStatus) => current && run(()=>repository.saveTaskExecution(page,current,status,amount,completedTime?Date.parse(completedTime):undefined));
  const changeScope = (scope:TaskScope) => {
    setScope(scope);
    const definition = plan.segments.at(-1)?.settings;
    if (scope==="all" && definition) setSettings(definition);
    else if (slot) setSettings(settingsForSlot(slot,scope==="future"));
  };
  const savePlan = (remove = false) => run(async()=>{
    if (!remove && !title.trim()) throw Error("請輸入任務名稱");
    const task_plan = editTaskPlan(plan,slot,scope,remove?null:settings);
    await update(page.id,{ task_plan, ...(scope==="all"&&!remove?{...details,title:title.trim(),due_date:settings.dueAt}:{}),
      task_repeat:null,task_repeat_day:null });
  },true);
  const stats = taskStatistics(history,today,group);
  return <ModalDialog aria-label="週期任務" busy={busy} onDismiss={close}
    className="m-auto max-h-[90dvh] w-[min(94vw,44rem)] space-y-3 overflow-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4 text-[var(--color-text)] backdrop:bg-black/40">
    <h2 className="break-words text-lg font-semibold">{page.title}</h2>
    <nav className="flex flex-wrap gap-2" aria-label="任務操作">
      {current&&<button type="button" className={control} aria-pressed={tab==="record"} onClick={()=>setTab("record")}>本次執行</button>}
      {!plan.retired&&<button type="button" className={control} aria-pressed={tab==="settings"} onClick={()=>setTab("settings")}>任務設定</button>}
      <button type="button" className={control} aria-pressed={tab==="history"} onClick={()=>setTab("history")}>歷史與趨勢</button>
    </nav>
    {tab==="record"&&current&&<section className="grid gap-2">
      <p>{current.day}{current.day!==current.through?" 至 "+current.through:""} · {statusLabels[current.status]}</p>
      {current.startsAt!=null&&<p className="text-sm">預定時段 {localDateTimeInput(current.startsAt).replace("T"," ")} 至 {localDateTimeInput(current.endsAt).replace("T"," ")}</p>}
      {current.dueAt!=null&&<p className="text-sm">截止時間 {localDateTimeInput(current.dueAt).replace("T"," ")}</p>}
      {current.record?.completed_at!=null&&<p className="text-sm">完成時間 {localDateTimeInput(current.record.completed_at).replace("T"," ")}</p>}
      <p>{current.amount} / {(current.record?.goal??current.settings.goal).target} {(current.record?.goal??current.settings.goal).unit}</p>
      {!current.record&&current.amount>0&&<p className="text-sm">進度來自已關聯的健康紀錄。</p>}
      {recordHealth&&current.day<=today&&<details><summary>記錄健康資料</summary><div className="flex flex-wrap gap-2 py-2">
        {([["water","飲水"],["exercise","運動"],["body","體重"]] as const).map(([kind,label])=>
          <button key={kind} type="button" className={control} onClick={()=>recordHealth(page.id,kind,current.day)}>記錄{label}</button>)}
      </div></details>}
      <label className="grid gap-1">實際完成時間<input type="datetime-local" className={control}
        value={completedTime} onChange={event=>setCompletedTime(event.target.value)}/></label>
      {(current.record?.goal??current.settings.goal).kind!=="check"&&<label className="grid gap-1">實際完成量
        <input type="number" min={0} max={1000000} step="any" className={control} value={amount} onChange={event=>setAmount(Number(event.target.value))}/>
      </label>}
      <div className="flex flex-wrap gap-2">
        <button type="button" className={control} disabled={busy} onClick={()=>void record("complete")}>標記完成</button>
        {(current.record?.goal??current.settings.goal).kind!=="check"&&<button type="button" className={control} disabled={busy}
          onClick={()=>void record(amount >= (current.record?.goal??current.settings.goal).target?"complete":amount>0?"partial":"pending")}>儲存進度</button>}
        <button type="button" className={control} disabled={busy} onClick={()=>void record("skipped")}>跳過本次</button>
        <button type="button" className={control} disabled={busy} onClick={()=>void record("missed")}>記為未達成</button>
        <button type="button" className={control} disabled={busy} onClick={()=>void record("pending")}>恢復為未完成</button>
      </div>
    </section>}
    {tab==="settings"&&<form className="grid gap-3" onSubmit={event=>{event.preventDefault();void savePlan();}}>
      {slot&&<label className="grid gap-1">套用範圍<select aria-label="套用範圍" className={control} value={scope} onChange={event=>changeScope(event.target.value as TaskScope)}>
        <option value="one">僅本次</option><option value="future">本次及後續</option><option value="all">整個系列</option>
      </select></label>}
      {scope==="all"&&<label className="grid gap-1">名稱<input className={control} value={title} required maxLength={500} onChange={event=>setTitle(event.target.value)}/></label>}
      <TaskPlanFields value={settings} change={setSettings} single={scope==="one"}/>
      {scope==="all"&&<TaskDetails page={{...page,...details}} legacyScheduling={false} apply={patch=>setDetails(current=>({...current,...patch}))}/>}
      <div className="flex flex-wrap gap-2">
        <button className={control} disabled={busy}>儲存任務</button>
        <button type="button" className={control} disabled={busy} onClick={async()=>{
          if (await confirmDialog({title:"刪除排程",message:"依選擇的範圍移除排程並保留執行紀錄？",danger:true})) await savePlan(true);
        }}>刪除排程</button>
      </div>
    </form>}
    {tab==="history"&&<section className="grid gap-2">
      <p>完成率 {stats.rate}% · 目前連續 {stats.current} · 最長連續 {stats.longest}</p>
      <label className="grid gap-1">趨勢區間<select aria-label="趨勢區間" className={control} value={group} onChange={event=>setGroup(event.target.value as typeof group)}>
        <option value="daily">每日</option><option value="weekly">每週</option><option value="monthly">每月</option></select></label>
      <p className="text-xs opacity-75">跳過與尚未到期的週期不列入完成率。已到期的部分完成列為未達成。</p>
      <ul className="max-h-36 overflow-auto text-sm">{stats.periods.map(([day,result])=><li key={day} className="border-b border-[var(--color-border)] py-1">
        {day} · {result.completed} / {result.attempted} 期 · 進度 {result.amount} / {result.target}
      </li>)}</ul>
      <h3 className="font-semibold">執行紀錄</h3>
      <ul className="max-h-48 overflow-auto">{history.slice().reverse().map(row=><li key={row.key}>
        <button type="button" className={control+" w-full text-left"} onClick={()=>{setSelected(row.key);setAmount(row.record?.amount??0);setCompletedTime(localDateTimeInput(row.record?.completed_at));setTab("record");}}>
          {row.day} · {statusLabels[row.status]} · {row.amount} / {(row.record?.goal??row.settings.goal).target}
        </button>
      </li>)}</ul>
    </section>}
    {error&&<p role="alert">{error}</p>}
    <button type="button" className={control} onClick={close} disabled={busy}>關閉</button>
  </ModalDialog>;
}

function settingsForSlot(slot:TaskSlot,future = false):TaskSettings {
  let recurrence=slot.settings.recurrence;
  if(future&&recurrence.mode==="fixed"&&recurrence.rule.count!=null) {
    recurrence={...recurrence,rule:{...recurrence.rule,count:Math.max(1,recurrence.rule.count-(slot.ordinal??0))}};
  } else if(future&&(recurrence.mode==="flexible"||recurrence.mode==="after")&&recurrence.count!=null){
    recurrence={...recurrence,count:Math.max(1,recurrence.count-(slot.ordinal??0))};
  }
  return { ...slot.settings, recurrence, anchor:slot.day, startsAt:slot.startsAt, endsAt:slot.endsAt, dueAt:slot.dueAt };
}
