import TaskLinkFields from "./TaskLinkFields";
import type { ActionSources } from "./taskLink";
import { fromWall, zonalTime, type ScheduleRule } from "./scheduleRecurrence";
import { control } from "./dashboard/styles";
import type { TaskRule, TaskSettings } from "./taskPlan";

export default function TaskPlanFields({ value, change, single = false, sources }: {
  value: TaskSettings;
  change: (value: TaskSettings) => void;
  single?: boolean;
  sources?:ActionSources;
}) {
  const patch = (fields: Partial<TaskSettings>) => change({ ...value, ...fields });
  const recurrence = value.recurrence;
  const fixed = recurrence.mode === "fixed" ? recurrence.rule : undefined;
  const repeat = (fields: Partial<ScheduleRule>) => {
    if (fixed) patch({ recurrence: { mode: "fixed", rule: {...fixed,...fields} } });
  };
  const time = (field: "startsAt" | "endsAt" | "dueAt", title: string) => {
    const current = value[field];
    const display = current == null ? "" : new Date(zonalTime(current,value.zone)).toISOString().slice(0,16);
    return <label className="grid min-w-0 gap-1">{title}<input type="datetime-local" className={control} value={display}
      onChange={event => patch({ [field]:event.target.value ? fromWall(Date.parse(event.target.value+"Z"),value.zone) : null })}/></label>;
  };
  return <div className="grid gap-3">
    <label className="grid gap-1">任務說明<textarea className={control} rows={2} maxLength={4000} value={value.notes} onChange={event=>patch({notes:event.target.value})}/></label>
    <div className="grid gap-2 sm:grid-cols-2">
      <label className="grid gap-1">開始日期<input type="date" required className={control} value={value.anchor} onChange={event=>patch({anchor:event.target.value})}/></label>
      {time("dueAt","截止日期")}
      {recurrence.mode!=="flexible"&&<>{time("startsAt","預定開始")}{time("endsAt","預定結束")}</>}
    </div>
    <p className="text-xs opacity-75">時間以 {value.zone} 為準</p>
    {!single&&<>
      <label className="grid gap-1">重複週期<select aria-label="重複週期" className={control} value={recurrence.mode} onChange={event=>{
        const mode=event.target.value as TaskRule["mode"];
        const rule:TaskRule=mode==="fixed"?{mode,rule:{frequency:"day",interval:1,weekdays:[],until:"",count:null,zone:value.zone,exceptions:[],overrides:{}}}
          :mode==="after"?{mode,days:1}:mode==="flexible"?{mode,period:"weekly"}:{mode:"once"};
        patch({recurrence:rule,...(mode==="once"?{action:undefined}:{}),...(mode==="flexible"?{startsAt:null,endsAt:null}:{})});
      }}>
        <option value="once">不重複</option><option value="fixed">固定日期</option><option value="flexible">週期內彈性達標</option><option value="after">完成後再安排</option>
      </select></label>
      {fixed&&<>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="grid gap-1">頻率<select aria-label="頻率" className={control} value={fixed.frequency} onChange={event=>repeat({frequency:event.target.value as ScheduleRule["frequency"]})}>
            <option value="day">日</option><option value="week">週</option><option value="month">月</option><option value="year">年</option>
          </select></label>
          <label className="grid gap-1">間隔<input type="number" min={1} max={365} className={control} value={fixed.interval} onChange={event=>repeat({interval:Number(event.target.value)})}/></label>
        </div>
        {fixed.frequency==="week"&&<div className="flex flex-wrap gap-2" aria-label="執行星期">
          {["日","一","二","三","四","五","六"].map((label,day)=><label key={day} className="flex items-center gap-1"><input type="checkbox" checked={fixed.weekdays.includes(day)}
            onChange={event=>repeat({weekdays:event.target.checked?[...fixed.weekdays,day]:fixed.weekdays.filter(value=>value!==day)})}/>{label}</label>)}
        </div>}
        {fixed.frequency==="month"&&<div className="grid gap-2 sm:grid-cols-2">
          <label className="grid gap-1">每月依據<select aria-label="每月依據" className={control} value={fixed.monthWeekday?"weekday":"date"}
            onChange={event=>repeat({monthWeekday:event.target.value==="weekday"?{weekday:1,ordinal:1}:undefined})}>
            <option value="date">日期</option><option value="weekday">第幾個星期幾</option>
          </select></label>
          {fixed.monthWeekday?<><label className="grid gap-1">次序<select aria-label="次序" className={control} value={fixed.monthWeekday.ordinal}
            onChange={event=>repeat({monthWeekday:{...fixed.monthWeekday!,ordinal:Number(event.target.value)}})}>
            {[1,2,3,4,5,-1].map(n=><option key={n} value={n}>{n===-1?"最後一次":n}</option>)}
          </select></label>
          <label className="grid gap-1">星期<select aria-label="星期" className={control} value={fixed.monthWeekday.weekday}
            onChange={event=>repeat({monthWeekday:{...fixed.monthWeekday!,weekday:Number(event.target.value)}})}>
            {["日","一","二","三","四","五","六"].map((label,n)=><option key={n} value={n}>{label}</option>)}
          </select></label></>:<label className="grid gap-1">每月日期<input type="number" min={1} max={31} className={control}
            value={fixed.anchorDay??(Number(value.anchor.slice(8,10))||1)} onChange={event=>repeat({anchorDay:Number(event.target.value)})}/></label>}
        </div>}
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="grid gap-1">重複結束日期<input type="date" className={control} value={fixed.until} onChange={event=>repeat({until:event.target.value})}/></label>
          <label className="grid gap-1">重複次數<input type="number" min={1} max={10000} className={control} value={fixed.count??""}
            onChange={event=>repeat({count:event.target.value?Number(event.target.value):null})}/></label>
        </div>
      </>}
      {recurrence.mode==="after"&&<label className="grid gap-1">完成後間隔天數<input type="number" min={1} max={365} className={control} value={recurrence.days}
        onChange={event=>patch({recurrence:{...recurrence,days:Number(event.target.value)}})}/></label>}
      {recurrence.mode==="flexible"&&<label className="grid gap-1">累計週期<select aria-label="累計週期" className={control} value={recurrence.period}
        onChange={event=>patch({recurrence:{...recurrence,period:event.target.value as "weekly"|"monthly"}})}>
        <option value="weekly">每週</option><option value="monthly">每月</option></select></label>}
      {(recurrence.mode==="after"||recurrence.mode==="flexible")&&<div className="grid gap-2 sm:grid-cols-2">
        <label className="grid gap-1">重複結束日期<input type="date" className={control} value={recurrence.until??""}
          onChange={event=>patch({recurrence:{...recurrence,until:event.target.value}})}/></label>
        <label className="grid gap-1">重複次數<input type="number" min={1} max={10000} className={control} value={recurrence.count??""}
          onChange={event=>patch({recurrence:{...recurrence,count:event.target.value?Number(event.target.value):null}})}/></label>
      </div>}
    </>}
    {recurrence.mode!=="once"&&<TaskLinkFields action={value.action} change={action=>patch({action})} sources={sources}/>}
    <label className="flex items-center gap-2"><input type="checkbox" checked={value.tracking} onChange={event=>patch({tracking:event.target.checked})}/>啟用習慣追蹤</label>
    <div className="grid gap-2 sm:grid-cols-3">
      <label className="grid gap-1">目標種類<select aria-label="目標種類" className={control} value={value.goal.kind} onChange={event=>{
        const kind=event.target.value as TaskSettings["goal"]["kind"];
        patch({goal:{kind,target:kind==="check"?1:value.goal.target,unit:kind==="duration"?"分鐘":kind==="quantity"?"次":""}});
      }}><option value="check">勾選完成</option><option value="quantity">數量</option><option value="duration">持續時間</option></select></label>
      {value.goal.kind!=="check"&&<><label className="grid gap-1">目標值<input type="number" min="0.01" max={1000000} step="any" className={control}
        value={value.goal.target} onChange={event=>patch({goal:{...value.goal,target:Number(event.target.value)}})}/></label>
      <label className="grid gap-1">單位<input className={control} maxLength={30} readOnly={value.goal.kind==="duration"} value={value.goal.unit}
        onChange={event=>patch({goal:{...value.goal,unit:event.target.value}})}/></label></>}
    </div>
  </div>;
}
