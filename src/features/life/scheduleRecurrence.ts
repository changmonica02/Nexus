import { civilAdvance } from "./civilPeriods";
import type { ScheduleEvent } from "./syncRecords";

export type RepeatFrequency = "day" | "week" | "month" | "year";
export type OccurrenceOverride = Pick<ScheduleEvent,"title"|"starts_at"|"ends_at"|"all_day"|"category"|"notes">;
export type ScheduleRule = {
  frequency: RepeatFrequency;
  interval: number;
  weekdays: number[];
  until: string;
  count: number | null;
  zone: string;
  anchorDay?: number;
  exceptions: string[];
  overrides: Record<string, OccurrenceOverride>;
};
const keyOf = (time: number) => new Date(time).toISOString().slice(0,10);
const dayNum = (key: string) => new Date(key+"T00:00:00Z").getUTCDay();

const formatters=new Map<string,Intl.DateTimeFormat>();
function zonalTime(time: number, zone: string) {
  const fmt = formatters.get(zone)??new Intl.DateTimeFormat("en-CA", {
    timeZone:zone, hourCycle:"h23", year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit", second:"2-digit",
  });
  formatters.set(zone,fmt);
  const parts=Object.fromEntries(fmt.formatToParts(time).map(part=>[part.type,part.value]));
  return Date.parse(`${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}Z`);
}

function fromWall(wall: number, zone: string) {
  const offsets = [...new Set([-86400000,0,86400000].map(delta => zonalTime(wall+delta,zone)-wall-delta))];
  const candidates=offsets.map(offset=>wall-offset).sort((a,b)=>a-b);
  return candidates.find(time=>zonalTime(time,zone)===wall) ??
    candidates.find(time=>zonalTime(time,zone)>wall) ?? candidates.at(-1)!;
}

export function recurrenceAnchorDay(event: ScheduleEvent) {
  return Number(keyOf(event.all_day?event.starts_at:zonalTime(event.starts_at,event.repeat_rule?.zone??"UTC")).slice(8,10));
}

export function scheduleOccurrences(event: ScheduleEvent, through: string) {
  const rule=event.repeat_rule;
  if(!rule)return [];
  const wall=event.all_day?event.starts_at:zonalTime(event.starts_at,rule.zone);
  const first=keyOf(wall), dayStart=Date.parse(first+"T00:00:00Z");
  const until=rule.until&&rule.until<through?rule.until:through;
  const rows:{key:string;index:number;event:ScheduleEvent}[]=[];
  const weekStart=civilAdvance(first,"day",-dayNum(first));
  const days=rule.frequency==="week"&&rule.weekdays.length?[...new Set(rule.weekdays)].sort((a,b)=>a-b):[dayNum(first)];
  let ordinal=0;
  for(let step=0;step<100000;step++){
    const start=rule.frequency==="week"?civilAdvance(weekStart,"week",step*rule.interval):civilAdvance(first,rule.frequency,step*rule.interval,rule.anchorDay);
    if(start>until)break;
    const keys=rule.frequency==="week"?days.map(day=>civilAdvance(start,"day",day)):[step===0?first:start];
    for(const key of keys){
      if(key<first||key>until)continue;
      if(rule.count!==null&&ordinal>=rule.count)return rows;
      const index=ordinal++;
      if(rule.exceptions.includes(key))continue;
      const occurrenceWall=Date.parse(key+"T00:00:00Z")+wall-dayStart;
      const starts_at=event.all_day?occurrenceWall:fromWall(occurrenceWall,rule.zone);
      const ends_at=starts_at+(event.ends_at-event.starts_at);
      const override = rule.overrides[key] as OccurrenceOverride | undefined;
      rows.push({key,index,event:{...event,...(override??{starts_at,ends_at}),repeat_rule:null}});
    }
  }
  return rows;
}

export function scheduleOccurrence(event: ScheduleEvent,key:string) {
  return scheduleOccurrences(event,key).find(row=>row.key===key);
}
