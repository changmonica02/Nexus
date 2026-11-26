import { civilAdvance } from "./civilPeriods";

export type Reminder = { id:string; day:string; title:string; source:string; priority:number };
export type ReminderRule = { id:string; title:string; start:string; interval:number; enabled:boolean };
export type ReminderStatus = { handled?:boolean; hiddenUntil?:string };
export function ruleOccurrence(rule:ReminderRule, day:string):Reminder|null {
  const distance=(Date.parse(day)-Date.parse(rule.start))/86400000;
  if(!rule.enabled||!Number.isSafeInteger(rule.interval)||rule.interval<1||distance<0||distance%rule.interval!==0)return null;
  return {id:JSON.stringify(["rule",rule.id,day]),day,title:rule.title,source:"自訂規則",priority:1};
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
    .sort((a,b)=>b.priority-a.priority||a.day.localeCompare(b.day)||a.id.localeCompare(b.id));
}
