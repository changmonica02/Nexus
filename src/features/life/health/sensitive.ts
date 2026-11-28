import { scheduleOccurrence, type ScheduleRule } from "../scheduleRecurrence";
import { civilAdvance } from "../civilPeriods";
import { str, type HealthRecord } from "./model";

const dayMs = 86400000;
export const dayDistance = (from: string, to: string) => (Date.parse(to) - Date.parse(from)) / dayMs;

export function cycleSummary(rows: HealthRecord[]) {
  const records = rows.filter(row => row.kind === "cycle").sort((a,b)=>str(a,"date").localeCompare(str(b,"date")));
  const starts = [...new Set(records.map(row=>str(row,"date")))];
  const intervals = starts.slice(1).map((start,index)=>dayDistance(starts[index],start));
  const durations = records.filter(row=>row.data.until).map(row=>dayDistance(str(row,"date"),str(row,"until"))+1);
  const average = (values:number[]) => values.length ? values.reduce((sum,value)=>sum+value,0)/values.length : null;
  const cycle = average(intervals);
  return { records, cycle, duration:average(durations), next:intervals.length>=2&&cycle!==null?civilAdvance(starts.at(-1)!,"day",Math.round(cycle)):null };
}

export function medicationState(row:HealthRecord,day:string) {
  const events=Array.isArray(row.data.lifecycle)?row.data.lifecycle:[];
  return events.findLast(event=>String(event).slice(0,10)<=day)?.toString().slice(11)??"active";
}

export function medicationDue(row: HealthRecord, day: string) {
  const start = str(row,"date");
  if (row.kind!=="medication" || !start || day<start || row.data.until && day>str(row,"until") || medicationState(row,day)!=="active") return false;
  const frequency=str(row,"frequency");
  if(frequency==="asNeeded")return false;
  const rule:ScheduleRule={
    frequency:frequency==="weekly"?"week":frequency==="monthly"?"month":"day",
    interval: frequency==="interval"||frequency==="monthly"?Number(row.data.interval)||1:1,
    weekdays:frequency==="weekly"?[...str(row,"weekdays")].map(Number):[],
    until:str(row,"until"),count:null,zone:"UTC",anchorDay:Number(start.slice(8,10)),exceptions:[],overrides:{},
  };
  if(rule.frequency==="day")return dayDistance(start,day)%rule.interval===0;
  if(rule.frequency==="week")return rule.weekdays.includes(new Date(day+"T00:00:00Z").getUTCDay());
  const starts_at=Date.parse(start+"T00:00:00Z");
  return !!scheduleOccurrence({...row,starts_at,ends_at:starts_at,all_day:true,title:"",category:"",notes:"",repeat_rule:rule},day);
}

export function scheduledDose(rows:HealthRecord[], medication:HealthRecord, day:string, time=medication.data.time) {
  return rows.filter(log=>log.kind==="dose"&&log.data.medication===medication.id&&log.data.date===day&&log.data.planned===time)
    .sort((a,b)=>b.updated_at-a.updated_at||a.id.localeCompare(b.id))[0];
}

export function doseIsDuplicate(log:HealthRecord, rows:HealthRecord[]) {
  if (!log.data.planned) return false;
  return scheduledDose(rows,{...log,id:str(log,"medication")},str(log,"date"),log.data.planned)?.id!==log.id;
}

export function medicationStock(row:HealthRecord, rows:HealthRecord[]) {
  if (typeof row.data.stock!=="number") return null;
  const logs=rows.filter(log=>log.kind==="dose"&&log.data.medication===row.id)
    .sort((a,b)=>b.updated_at-a.updated_at||a.id.localeCompare(b.id));
  const counted=new Set<string>();
  let used=0;
  for(const log of logs){
    const slot=log.data.planned?str(log,"date")+"T"+str(log,"planned"):log.id;
    if(counted.has(slot))continue;
    counted.add(slot);
    if(log.data.status==="taken")used+=Number(log.data.quantity);
  }
  return row.data.stock-used;
}
