import { validateTaskAction,type TaskAction } from "./taskLink";
import type { Page } from "../../lib/types";
import { localDateInput } from "../../lib/todoCalendar";
import { civilAdvance } from "./civilPeriods";
import { habitPeriodKey } from "./habits";
import { scheduleOccurrences, zonalTime, fromWall, type ScheduleRule } from "./scheduleRecurrence";
import { isCivilDate, type Habit, type LifeSyncBase } from "./syncRecords";

export type TaskStatus = "pending" | "partial" | "complete" | "skipped" | "missed";
export type TaskGoal = { kind: "check" | "quantity" | "duration"; target: number; unit: string };
export type TaskRule =
  | { mode: "once" }
  | { mode: "fixed"; rule: ScheduleRule }
  | { mode: "flexible"; period: "weekly" | "monthly"; until?: string; count?: number | null }
  | { mode: "after"; days: number; until?: string; count?: number | null };
export type TaskSettings = {
  anchor: string;
  zone: string;
  notes: string;
  startsAt: number | null;
  endsAt: number | null;
  dueAt: number | null;
  tracking: boolean;
  goal: TaskGoal;
  recurrence: TaskRule;
  action?:TaskAction;
};
export type TaskSegment = { id: string; keyPrefix?: string; sequenceBase?: number; since?: string; through?: string; settings: TaskSettings };
export type TaskPlan = { segments: TaskSegment[]; excluded: string[]; overrides: Record<string, TaskSettings>; retired?: boolean; retiredOn?: string; legacyHabitId?: string };
export type TaskExecution = LifeSyncBase & {
  task_id: string;
  occurrence: string;
  day: string;
  scheduled_start: number | null;
  scheduled_end: number | null;
  due_at: number | null;
  completed_at: number | null;
  amount: number;
  status: TaskStatus;
  goal: TaskGoal;
  imported?: boolean;
};
export type TaskSlot = {
  key: string;
  segmentId?: string;
  ordinal?: number;
  day: string;
  through: string;
  settings: TaskSettings;
  startsAt: number | null;
  endsAt: number | null;
  dueAt: number | null;
  record?: TaskExecution;
  completedDay?:string;
  status: TaskStatus;
  amount: number;
};

export const statusLabels: Record<TaskStatus, string> = {
  pending: "尚未完成", partial: "部分完成", complete: "已完成", skipped: "已跳過", missed: "未達成",
};
const utcDay = (day: string) => Date.parse(day + "T00:00:00Z");
const dayKey = (time: number) => new Date(time).toISOString().slice(0, 10);
const dayMs = 86_400_000;
const isTime = (value: number | null) => value === null || Number.isSafeInteger(value) && value >= -2208988800000 && value <= 253402300799999;
const goalValid = (goal: TaskGoal) => !!goal && ["check", "quantity", "duration"].includes(goal.kind)
  && Number.isFinite(goal.target) && goal.target > 0 && goal.target <= 1_000_000 && typeof goal.unit === "string" && goal.unit.length <= 30;

export function defaultTaskSettings(date: Date): TaskSettings {
  return { anchor: localDateInput(date), zone: Intl.DateTimeFormat().resolvedOptions().timeZone, notes: "",
    startsAt: null, endsAt: null, dueAt: null, tracking: false,
    goal: { kind: "check", target: 1, unit: "" }, recurrence: { mode: "once" } };
}

export function validateTaskSettings(settings: TaskSettings) {
  if (!isCivilDate(settings.anchor) || typeof settings.notes !== "string" || settings.notes.length > 4000
    || typeof settings.tracking !== "boolean" || !goalValid(settings.goal)
    || ![settings.startsAt, settings.endsAt, settings.dueAt].every(isTime)
    || (settings.startsAt === null) !== (settings.endsAt === null)
    || (settings.startsAt != null && settings.endsAt! <= settings.startsAt)
    || !["once", "fixed", "flexible", "after"].includes(settings.recurrence.mode)) throw Error("請確認任務日期、目標及時間");
  new Intl.DateTimeFormat("en", { timeZone: settings.zone });
  if(settings.action)validateTaskAction(settings.action);
  const recurrence = settings.recurrence;
  if ((recurrence.mode==="after"||recurrence.mode==="flexible") &&
    (recurrence.until&&(!isCivilDate(recurrence.until)||recurrence.until<settings.anchor)
       || recurrence.count!=null&&(!Number.isInteger(recurrence.count)||recurrence.count<1||recurrence.count>10000))) throw Error("請確認重複結束條件");
  if (recurrence.mode === "flexible" && !["weekly", "monthly"].includes(recurrence.period)) throw Error("請選擇累計週期");
  if (recurrence.mode === "after" && (!Number.isInteger(recurrence.days) || recurrence.days < 1 || recurrence.days > 365)) throw Error("請確認完成後的間隔天數");
  if (recurrence.mode === "fixed") {
    const rule = recurrence.rule;
    if (!["day", "week", "month", "year"].includes(rule.frequency) || !Number.isInteger(rule.interval) || rule.interval < 1 || rule.interval > 365
      || !Array.isArray(rule.weekdays) || rule.weekdays.some(day => !Number.isInteger(day) || day < 0 || day > 6)
      || rule.until && (!isCivilDate(rule.until) || rule.until < settings.anchor)
      || rule.count != null && (!Number.isInteger(rule.count) || rule.count < 1 || rule.count > 10000)
      || rule.monthWeekday && (![-1,1,2,3,4,5].includes(rule.monthWeekday.ordinal) || !Number.isInteger(rule.monthWeekday.weekday) || rule.monthWeekday.weekday < 0 || rule.monthWeekday.weekday > 6)
      || rule.anchorDay != null && (!Number.isInteger(rule.anchorDay) || rule.anchorDay < 1 || rule.anchorDay > 31)) throw Error("請確認日期型重複規則");
  }
}

export function validateTaskPlan(plan:TaskPlan) {
  if (!Array.isArray(plan.segments)||plan.segments.length>500||!Array.isArray(plan.excluded)
    || !plan.overrides||typeof plan.overrides!=="object"||Array.isArray(plan.overrides)
    || plan.retiredOn!=null&&!isCivilDate(plan.retiredOn)
    || plan.segments.some(segment=>!segment || !/^[0-9a-z-]{1,80}$/i.test(segment.id)
      || segment.through!=null&&!isCivilDate(segment.through) || segment.since!=null&&!isCivilDate(segment.since))) throw Error("任務週期格式無效");
  for (const segment of plan.segments) validateTaskSettings(segment.settings);
  for (const settings of Object.values(plan.overrides)) validateTaskSettings(settings);
}

export function validateTaskExecution(row: TaskExecution) {
  if (!row.task_id || !row.occurrence || row.task_id.length>160 || row.occurrence.length>160 || row.id !== executionId(row.task_id, row.occurrence) || !isCivilDate(row.day)
    || !Object.hasOwn(statusLabels, row.status) || !Number.isFinite(row.amount) || row.amount < 0 || row.amount > 1_000_000
    || ![row.scheduled_start, row.scheduled_end, row.due_at, row.completed_at].every(isTime)
    || !goalValid(row.goal) || (row.completed_at !== null && row.status !== "complete")
    || (row.status === "complete" && row.completed_at === null && !row.imported)
    || row.status === "complete" && row.amount < row.goal.target
    || row.status === "pending" && row.amount !== 0
    || row.status === "partial" && (row.amount <= 0 || row.amount >= row.goal.target)) throw Error("任務執行紀錄格式無效");
}

export const executionId = (task: string, occurrence: string) => JSON.stringify([task, occurrence]);

function shift(time: number | null, settings: TaskSettings, day: string) {
  if (time === null || day === settings.anchor) return time;
  return fromWall(zonalTime(time, settings.zone) + utcDay(day) - utcDay(settings.anchor), settings.zone);
}

export function taskSlots(plan: TaskPlan, executions: TaskExecution[], from: string, until: string, now = Date.now(), project?:(slot:TaskSlot)=>TaskSlot): TaskSlot[] {
  const records = new Map(executions.map(row => [row.occurrence, row]));
  const slots = new Map<string, TaskSlot>();
  const excluded = new Set(plan.excluded);
  if (plan.retiredOn && plan.retiredOn < until) until = plan.retiredOn;
  for (const segment of plan.segments) {
    const { settings } = segment;
    const rule = settings.recurrence;
    const prefix=segment.keyPrefix??segment.id;
    const today = dayKey(zonalTime(now, settings.zone));
    const earlyDays = Math.max(0,...[settings.startsAt,settings.endsAt,settings.dueAt].filter(time=>time!=null)
      .map(time=>Math.round((utcDay(settings.anchor)-utcDay(dayKey(zonalTime(time,settings.zone))))/dayMs)));
    const horizonDay = civilAdvance(until,"day",earlyDays);
    const limit = segment.through && segment.through < horizonDay ? segment.through : horizonDay;
    const add = (key: string, original: string, through = original, ordinal?:number) => {
      if (excluded.has(key) || segment.since && through < segment.since) return;
      if (segment.since && original < segment.since) original=segment.since;
      const record = records.get(key);
      const override = plan.overrides[key];
      const details = override ?? settings;
      const day = override?.anchor ?? record?.day ?? original;
      const startsAt = override || !record ? shift(details.startsAt, details, day) : record.scheduled_start;
      const shiftedEnd = override || !record ? shift(details.endsAt, details, day) : record.scheduled_end;
      const endsAt = startsAt!=null&&shiftedEnd!=null&&shiftedEnd<=startsAt
        ? startsAt+Math.max(60_000,(details.endsAt??0)-(details.startsAt??0)) : shiftedEnd;
      const dueAt = override || !record ? shift(details.dueAt, details, day) : record.due_at;
      const last = override ? day : through < day ? day : through;
      const endDay = endsAt == null ? last : dayKey(zonalTime(endsAt - 1, settings.zone));
      const dueDay = dueAt == null ? last : dayKey(zonalTime(dueAt, settings.zone));
      const startDay = startsAt == null ? day : dayKey(zonalTime(startsAt, settings.zone));
      const visibleFrom = [day,startDay,dueDay].sort()[0];
      const visibleUntil = [last,endDay,dueDay].sort().at(-1)!;
      const visible=visibleUntil>=from&&visibleFrom<=until;
      const saved = record?.status ?? "pending";
      const missed = (dueAt == null ? last < today : dueAt < now) && details.tracking && (saved === "pending" || saved === "partial");
      const base:TaskSlot={key,segmentId:segment.id,ordinal,day,through:last,settings:details,startsAt,endsAt,dueAt,record,
       status:missed?"missed":saved,amount:record?.amount??0};
      const projected=project?.(base)??base;
      if(visible)slots.set(key,projected);
      return projected;
    };
    if (rule.mode === "fixed") {
      const stamp = utcDay(settings.anchor);
      const horizon = Object.entries(plan.overrides).reduce((end,[key,value]) =>
        key.startsWith(prefix + ":") && value.anchor <= until && key.slice(prefix.length + 1) > end
          ? key.slice(prefix.length + 1) : end, civilAdvance(limit,"day",2));
      const schedule: Parameters<typeof scheduleOccurrences>[0] = {
        id: segment.id, workspace_owner_id: null, revision: 0, deleted_at: null, created_at: stamp, updated_at: stamp,
        all_day: true, starts_at: stamp, ends_at: stamp, category: "", title: "", notes: "",
        repeat_rule: { ...rule.rule, zone: settings.zone, overrides: {}, exceptions: [] },
      };
      for (const { key,index } of scheduleOccurrences(schedule, horizon, true)) {
        if (segment.through && key > segment.through || plan.retiredOn && key > plan.retiredOn) break;
        add(prefix + ":" + key, key, key, index);
      }
    } else if (rule.mode === "flexible") {
      const unit = rule.period === "weekly" ? "week" : "month";
      const through = rule.until && rule.until < limit ? rule.until : limit;
      const cutoff=[segment.through,rule.until].filter(Boolean).sort()[0];
      let ordinal=0;
      for (let day = habitPeriodKey(rule.period, settings.anchor); day <= through && ordinal < (rule.count??Infinity);
        day = civilAdvance(day,unit,1), ordinal++) {
        const end = civilAdvance(civilAdvance(day,unit,1),"day",-1);
        add(prefix + ":" + day, day < settings.anchor ? settings.anchor : day, cutoff && end > cutoff ? cutoff : end,ordinal);
      }
    } else if (rule.mode === "after") {
      let day = settings.anchor;
      if (segment.since && day < segment.since && !records.has(prefix + ":after:" + (segment.sequenceBase??0))) day=segment.since;
      for (let index = 0; index <= (project?10000:executions.length) && index < (rule.count??Infinity); index++) {
        if (segment.through && day > segment.through || rule.until && day > rule.until) break;
        const ordinal=(segment.sequenceBase??0)+index;
        const key = prefix + ":after:" + ordinal;
        const slot=add(key,day,day,index);
        const execution=records.get(key);
        const completed=slot?.settings.action?slot.completedDay:execution?.status==="complete"&&execution.completed_at!=null
          ?dayKey(zonalTime(execution.completed_at,settings.zone)):slot?.completedDay;
        if(!completed)break;
        day=civilAdvance(completed,"day",rule.days);
        if(day>horizonDay)break;
      }
    } else if (!segment.through || settings.anchor <= segment.through) {
      add(prefix + ":" + settings.anchor, settings.anchor);
    }
  }
  return [...slots.values()].sort((a,b) => a.day.localeCompare(b.day) || a.key.localeCompare(b.key));
}

export function makeExecution(page: Page, slot: TaskSlot, status: TaskStatus, amount: number, now = Date.now(), completedAt?:number): TaskExecution {
  const goal = slot.record?.goal ?? slot.settings.goal;
  const value = status === "complete" ? Math.max(amount,goal.target) : status === "pending" ? 0 : amount;
  return { id: executionId(page.id,slot.key), workspace_owner_id: page.workspace_owner_id ?? null,
    task_id: page.id, occurrence: slot.key, day: slot.day, revision: slot.record?.revision ?? 0,
    created_at: slot.record?.created_at ?? now, updated_at: now, deleted_at: null,
    scheduled_start: slot.startsAt, scheduled_end: slot.endsAt, due_at: slot.dueAt,
    completed_at: status === "complete" ? completedAt ?? slot.record?.completed_at ?? now : null, status, amount: value, goal };
}

export function taskStatistics(slots: TaskSlot[], today: string, group: "daily" | "weekly" | "monthly") {
  const periods = new Map<string,{attempted:number; completed:number; amount:number; target:number}>();
  let current = 0, longest = 0, completed = 0, attempted = 0;
  for (const slot of slots) {
    if (slot.day > today || slot.status === "skipped") continue;
    if (slot.through >= today && slot.status !== "complete" && slot.status !== "missed") continue;
    const met = slot.status === "complete";
    attempted++;
    completed += Number(met);
    current = met ? current + 1 : 0;
    longest = Math.max(longest,current);
    const rule = slot.settings.recurrence;
    const trend = rule.mode==="flexible" && (rule.period==="monthly" || group==="daily") ? rule.period : group;
    const day = habitPeriodKey(trend,slot.day);
    const period = periods.get(day) ?? {attempted:0,completed:0,amount:0,target:0};
    period.attempted++;
    period.completed += Number(met);
    period.amount += slot.amount;
    period.target += (slot.record?.goal ?? slot.settings.goal).target;
    periods.set(day,period);
  }
  return { current,longest,rate:attempted ? Math.round(100*completed/attempted) : 0, periods:[...periods.entries()].reverse() };
}

export type TaskScope = "one" | "future" | "all";

export function editTaskPlan(plan: TaskPlan, slot: TaskSlot | undefined, scope: TaskScope, settings: TaskSettings | null): TaskPlan {
  if (settings) validateTaskSettings(settings);
  if (!slot || scope === "all") {
    const current = plan.segments.at(-1);
    if (!settings) return { ...plan,retired:true,retiredOn:localDateInput(new Date()) };
    const active = { ...plan, retired:false };
    delete active.retiredOn;
    if (!current) return { ...active,segments:[{id:crypto.randomUUID(),settings}] };
    if (sameTaskData(settings,current.settings) && !plan.retired) return plan;
    const since=localDateInput(new Date());
    const yesterday=civilAdvance(since,"day",-1);
    const past=plan.segments.flatMap(segment=>{
      if ((segment.since??segment.settings.anchor)>=since) return [];
      return [{...segment,through:segment.through&&segment.through<yesterday?segment.through:yesterday}];
    });
    const sameMode=settings.recurrence.mode===current.settings.recurrence.mode;
    const segment:TaskSegment={id:crypto.randomUUID(),since,settings,
      ...(sameMode?{keyPrefix:current.keyPrefix??current.id}:{}),
      ...(sameMode&&current.sequenceBase!=null?{sequenceBase:current.sequenceBase}:{}),
    };
    return { ...active,segments:[...past,segment] };
  }
  if (scope === "one") {
    if (!settings) return { ...plan, excluded: [...new Set([...plan.excluded,slot.key])] };
    return { ...plan, overrides: { ...plan.overrides, [slot.key]: settings } };
  }
  const id = slot.key.split(":")[0];
  const index = plan.segments.findIndex(segment => segment.id === (slot.segmentId??id));
  if (index < 0) throw Error("這筆歷史紀錄的週期已封存");
  const pivot = slot.key.includes(":after:") ? slot.record?.day ?? slot.day : slot.key.slice(id.length + 1);
  const prior = civilAdvance(pivot,"day",-1);
  const segments = plan.segments.slice(0,index);
  const previous = plan.segments[index];
  if (prior >= (previous.since??previous.settings.anchor)) segments.push({ ...previous, through: prior });
  if (settings) {
    const sameMode=previous.settings.recurrence.mode===settings.recurrence.mode;
    segments.push({ id:crypto.randomUUID(), settings,
      ...(sameMode?{keyPrefix:previous.keyPrefix??previous.id}:{}),
      ...(sameMode&&settings.recurrence.mode==="after"?{sequenceBase:Number(slot.key.split(":").at(-1))||0}:{}),
    });
  }
  return { ...plan, segments, retired: !segments.length };
}

export function executionHistory(plan: TaskPlan, rows: TaskExecution[], today: string, project?:(slot:TaskSlot)=>TaskSlot) {
  const from = [...plan.segments.map(segment => segment.settings.anchor), ...rows.map(row => row.day)].sort()[0] ?? today;
  const slots = taskSlots(plan,rows,from,today,Date.now(),project);
  const keys = new Set(slots.map(slot => slot.key));
  for (const record of rows) {
    if (keys.has(record.occurrence)) continue;
    slots.push({ key:record.occurrence, day:record.day, through:record.day, record,
      settings:{ ...defaultTaskSettings(new Date(record.day+"T00:00:00")), goal:record.goal },
      startsAt:record.scheduled_start,endsAt:record.scheduled_end,dueAt:record.due_at,status:record.status,amount:record.amount });
  }
  return slots.sort((a,b)=>a.day.localeCompare(b.day)||a.key.localeCompare(b.key));
}

export function legacyTaskSettings(page: Page) {
  const anchor = new Date(page.due_date ?? page.task_start_at ?? Date.now());
  const settings = defaultTaskSettings(anchor);
  const repeat = page.task_repeat;
  if (repeat === "after_completion") settings.recurrence = {mode:"after",days:page.task_repeat_day??1};
  else if (repeat) settings.recurrence = {mode:"fixed",rule:{
    frequency:repeat==="monthly"?"month":repeat==="weekly"?"week":"day", interval:1, weekdays:[],
    anchorDay:page.task_repeat_day??undefined, until:"",count:null,zone:settings.zone,exceptions:[],overrides:{},
  }};
  settings.dueAt = page.due_date ?? null;
  settings.notes = page.content_text?.slice(0,4000) ?? "";
  if (page.task_start_at!=null && page.due_date!=null && page.task_start_at<page.due_date) {
    settings.startsAt=page.task_start_at;
    settings.endsAt=page.due_date;
  }
  return settings;
}

export function convertHabit(habit:Habit) {
  const settings:TaskSettings = {
    anchor:habit.started_on, zone:"UTC", notes:"", startsAt:null, endsAt:null, dueAt:null, tracking:true,
    goal:{kind:"quantity",target:habit.goal,unit:"次"},
    recurrence:habit.cadence==="daily"?{mode:"fixed",rule:{
      frequency:"day",interval:1,weekdays:[],until:"",count:null,zone:"UTC",exceptions:[],overrides:{},
    }}:{mode:"flexible",period:habit.cadence},
  };
  const plan:TaskPlan={segments:[{id:"legacy",settings}],excluded:[],overrides:{},legacyHabitId:habit.id};
  const totals=new Map<string,number>();
  for(const [day,amount] of Object.entries(habit.quantities)){
    const period=habitPeriodKey(habit.cadence,day);
    totals.set(period,(totals.get(period)??0)+amount);
  }
  const records:TaskExecution[]=[...totals].map(([period,total])=>{
    const occurrence="legacy:"+period;
    return {id:executionId(habit.id,occurrence),task_id:habit.id,occurrence,day:period<habit.started_on?habit.started_on:period,
      workspace_owner_id:habit.workspace_owner_id,revision:0,updated_at:habit.updated_at,created_at:habit.created_at,deleted_at:null,
      scheduled_start:null,scheduled_end:null,due_at:null,completed_at:null,
      status:total>=habit.goal?"complete":total>0?"partial":"pending",amount:total,goal:settings.goal,imported:true};
  });
  return {plan,records};
}

/** Postgres JSONB canonicalizes keys, so object insertion order cannot be used as a revision signal. */
export function sameTaskData(left: unknown, right: unknown) {
  const canonical = (value:unknown) => JSON.stringify(value,(_key,item)=>{
    if (!item || typeof item!=="object" || Array.isArray(item)) return item;
    return Object.fromEntries(Object.keys(item).sort().map(key=>[key,item[key]]));
  });
  return canonical(left)===canonical(right);
}
