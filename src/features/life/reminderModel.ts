import { milestoneTarget } from "./milestoneDates";
import { habitQuantity } from "./habits";
import type { Habit, ScheduleEvent } from "./syncRecords";
import type { LifeData } from "./lists";
import { civilAdvance } from "./civilPeriods";

export type Reminder = { id:string; day:string; title:string; source:string; priority:number };
export type ReminderRule = { id:string; title:string; start:string; interval:number; enabled:boolean; trigger?:"date"|"task-completed"|"overdue-count"|"list-updated"|"budget-percent"|"habit-completed"|"exercise-completed"|"list-number"|"target-days"; targetId?:string; daysBefore?:number; fieldId?:string; numericThreshold?:number; habitId?:string; budgetId?:string; listId?:string; threshold?:number; task?:string; action?:"reminder"|"schedule" };
export type AutomationRun={id:string; title:string; day:string; at:number; error?:string};
export type RuleExercise = { id:string; day:string };
export type RuleListItem={id:string; listId:string; revision:number; day:string; values?:Readonly<Record<string,unknown>>};
export type ReminderStatus = { handled?:boolean; hiddenUntil?:string; priority?:number };
export function ruleOccurrence(rule:ReminderRule, day:string, tasks:readonly {id:string;completed?:boolean;day:string;due?:string}[]=[]):Reminder|null {
  if(rule.trigger==="task-completed"){
    const task=tasks.find(task=>task.id===rule.task&&task.completed);
    if(!rule.enabled||!task||task.day<rule.start)return null;
    return {id:JSON.stringify(["task-completed",rule.id,task.id]),day:task.day,title:rule.title,source:"自訂規則",priority:1};
  }
  if(rule.trigger==="overdue-count"){
    const threshold=rule.threshold??0;
    if(!rule.enabled||day<rule.start||threshold<1||tasks.filter(task=>!task.completed&&task.due&&task.due<day).length<threshold)return null;
    return {id:JSON.stringify(["overdue-count",rule.id,day]),day,title:rule.title,source:"自訂規則",priority:1};
  }
  if(rule.trigger&&rule.trigger!=="date")return null;
  const distance=(Date.parse(day)-Date.parse(rule.start))/86400000;
  if(!rule.enabled||!Number.isSafeInteger(rule.interval)||rule.interval<1||distance<0||distance%rule.interval!==0)return null;
  return {id:JSON.stringify(["rule",rule.id,day]),day,title:rule.title,source:"自訂規則",priority:1};
}
export function ruleOccurrences(rule:ReminderRule,day:string,tasks:Parameters<typeof ruleOccurrence>[2],records:readonly RuleListItem[],budgets:readonly {id:string;percent:number}[]=[],habits:readonly Habit[]=[],exercises:readonly RuleExercise[]=[],targets:readonly ScheduleEvent[]=[]) {
  if(rule.trigger==="target-days"){
    const target=targets.find(row=>row.id===rule.targetId&&row.milestone&&row.deleted_at==null);
    const lead=rule.daysBefore;
    if(!rule.enabled||!target||typeof lead!=="number"||!Number.isInteger(lead)||lead<0||lead>30||day<rule.start)return [];
    const targetDay=new Date(milestoneTarget({...target,milestone:{...target.milestone!,mode:"remaining"}},new Date(day+"T00:00:00"))).toISOString().slice(0,10);
    const due=civilAdvance(targetDay,"day",-lead);
    if(due!==day)return [];
    return [{id:JSON.stringify(["target-days",rule.id,target.id,targetDay]),day,title:rule.title,source:"自訂規則",priority:1}];
  }
  if(rule.trigger==="exercise-completed"){
    if(!rule.enabled)return [];
    return exercises.filter(row=>row.day>=rule.start&&row.day<=day).map(row=>({
      id:JSON.stringify(["exercise-completed",rule.id,row.id]),day:row.day,title:rule.title,source:"自訂規則",priority:1,
    }));
  }
  if(rule.trigger==="habit-completed"){
    const habit=habits.find(row=>row.id===rule.habitId&&row.deleted_at==null);
    if(!rule.enabled||!habit||day<rule.start||day<habit.started_on)return [];
    if(habitQuantity(habit,new Date(day+"T00:00:00"))<habit.goal)return [];
    const weekday=new Date(day+"T00:00:00Z").getUTCDay();
    const period=habit.cadence==="weekly"?civilAdvance(day,"day",-((weekday+6)%7)):day;
    return [{id:JSON.stringify(["habit-completed",rule.id,habit.id,period]),day,title:rule.title,source:"自訂規則",priority:1}];
  }
  if(rule.trigger==="budget-percent"){
    const budget=budgets.find(row=>row.id===rule.budgetId);
    if(!rule.enabled||day<rule.start||!budget||budget.percent<(rule.threshold??1))return [];
    return [{id:JSON.stringify(["budget-percent",rule.id,budget.id,day.slice(0,7)]),day,title:rule.title,source:"自訂規則",priority:1}];
  }
  if(rule.trigger!=="list-updated"&&rule.trigger!=="list-number"){
    const occurrence=ruleOccurrence(rule,day,tasks);
    return occurrence?[occurrence]:[];
  }
  if(!rule.enabled||!rule.listId)return [];
  return records.filter(row=>row.listId===rule.listId&&row.day>=rule.start&&row.day<=day&&(rule.trigger!=="list-number"||matchesNumericThreshold(rule,row))).map(row=>({
    id:JSON.stringify([rule.trigger,rule.id,row.id,row.revision]),day:row.day,title:rule.title,source:"自訂規則",priority:1,
  }));
}
function matchesNumericThreshold(rule:ReminderRule,row:RuleListItem) {
  const value=rule.fieldId?row.values?.[rule.fieldId]:undefined;
  return typeof value==="number"&&Number.isFinite(value)&&typeof rule.numericThreshold==="number"
    &&Number.isFinite(rule.numericThreshold)&&value>=rule.numericThreshold;
}
export function previewRule(rule:ReminderRule, from:string) {
  const distance=(Date.parse(from)-Date.parse(rule.start))/86400000;
  const steps=Math.max(0,Math.ceil(distance/rule.interval));
  if(!Number.isSafeInteger(steps)||!Number.isSafeInteger(rule.interval)||rule.interval<1)return null;
  return civilAdvance(rule.start,"day",steps*rule.interval);
}
export function visibleReminders(rows:Reminder[], status:Record<string,ReminderStatus>, day:string, lead:number, source:string) {
  const end=civilAdvance(day,"day",lead);
  return [...new Map(rows.map(row=>[row.id,row])).values()]
    .filter(row=>row.day<=end&&(!source||source===row.source)&&!status[row.id]?.handled&&!(status[row.id]?.hiddenUntil&&status[row.id].hiddenUntil!>day))
    .map(row=>({...row,priority:status[row.id]?.priority??row.priority}))
    .sort((a,b)=>b.priority-a.priority||a.day.localeCompare(b.day)||a.id.localeCompare(b.id));
}

export type ReminderPreferences={lead:number;rules:ReminderRule[];status:Record<string,ReminderStatus>};
export function isReminderPreferences(value:unknown):value is ReminderPreferences {
  if(!value||typeof value!=="object")return false;
  const {lead,rules,status}=value as ReminderPreferences;
  const date=(value:unknown)=>typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
  return Number.isInteger(lead)&&lead>=0&&lead<=30&&Array.isArray(rules)&&rules.length<=50&&new Set(rules.map(rule=>rule?.id)).size===rules.length
    &&rules.every(rule=>rule&&typeof rule.id==="string"&&rule.id.length<=80&&typeof rule.title==="string"&&!!rule.title.trim()&&rule.title.length<=100
      &&(rule.action===undefined||rule.action==="reminder"||rule.action==="schedule")&&date(rule.start)&&Number.isInteger(rule.interval)&&rule.interval>=1&&rule.interval<=365&&typeof rule.enabled==="boolean"
      &&(rule.trigger===undefined||rule.trigger==="date"||rule.trigger==="task-completed"||rule.trigger==="overdue-count"||rule.trigger==="list-updated"||rule.trigger==="budget-percent"||rule.trigger==="habit-completed"||rule.trigger==="exercise-completed"||rule.trigger==="list-number"||rule.trigger==="target-days")
      &&(rule.trigger!=="target-days"||typeof rule.targetId==="string"&&!!rule.targetId&&rule.targetId.length<=120&&Number.isInteger(rule.daysBefore)&&rule.daysBefore!>=0&&rule.daysBefore!<=30)
      &&(rule.trigger!=="habit-completed"||typeof rule.habitId==="string"&&!!rule.habitId&&rule.habitId.length<=120)
      &&(rule.trigger!=="budget-percent"||typeof rule.budgetId==="string"&&!!rule.budgetId&&rule.budgetId.length<=120)
      &&((rule.trigger!=="list-updated"&&rule.trigger!=="list-number")||typeof rule.listId==="string"&&!!rule.listId&&rule.listId.length<=120)
      &&(rule.trigger!=="list-number"||typeof rule.fieldId==="string"&&!!rule.fieldId&&rule.fieldId.length<=120&&Number.isFinite(rule.numericThreshold))
      && ((rule.trigger!=="overdue-count"&&rule.trigger!=="budget-percent")||Number.isInteger(rule.threshold)&&rule.threshold!>=1&&rule.threshold!<=1000)
      &&(rule.trigger!=="task-completed"||typeof rule.task==="string"&&!!rule.task&&rule.task.length<=120))
    &&!!status&&typeof status==="object"&&!Array.isArray(status)&&Object.entries(status).length<=400
    &&Object.entries(status).every(([key,entry])=>key.length<=1000&&entry&&typeof entry==="object"
      &&(entry.priority===undefined||[1,2,3].includes(entry.priority))
      &&(entry.handled===undefined||typeof entry.handled==="boolean")&&(entry.hiddenUntil===undefined||date(entry.hiddenUntil)));
}


export async function automationScheduleId(occurrenceId:string) {
  const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(occurrenceId));
  return "automation:"+Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,"0")).join("");
}


export function listDateReminders(data:LifeData,from:string,to:string) {
  const lists=new Map(data.life_lists.filter(list=>list.deleted_at==null).flatMap(list=>{
    const fields=list.fields.filter(field=>!field.archived&&field.type==="date"&&field.reminder===true);
    return fields.length?[[list.id,fields] as const]:[];
  }));
  return data.life_items.flatMap(item=>{
    if(item.deleted_at!=null)return [];
    return (lists.get(item.list_id)??[]).flatMap(field=>{
      const date=item.values[field.id];
      if(typeof date!=="string"||date<from||date>to||!/^\d{4}-\d{2}-\d{2}$/.test(date))return [];
      return [{id:JSON.stringify(["list-date",item.list_id,item.id,field.id,date]),listId:item.list_id,
        day:date,title:item.title+" · "+field.name,source:"自訂清單",priority:1}];
    });
  });
}
