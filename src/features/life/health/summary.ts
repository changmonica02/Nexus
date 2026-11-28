import { medicationDue, scheduledDose } from "./sensitive";
import { civilAdvance } from "../civilPeriods";
import { localDateInput } from "../../../lib/todoCalendar";
import type { LifeCalendarEvent } from "../calendarSources";
import { allowed, body, medicationTimes, nutrition, num, str, type Fields, type HealthRecord } from "./model";
export type Period="day"|"week"|"month";
export const value=(amount:number|null,unit="")=>amount===null?"尚無紀錄":Number(amount.toFixed(2))+(unit?" "+unit:"");
export function latestMeasurement(rows:HealthRecord[],metric:string,day:string){
 return rows.filter(row=>row.kind==="body"&&str(row,"date")<=day&&num(row.data,metric)!==null)
  .sort((a,b)=>str(b,"date").localeCompare(str(a,"date"))||b.updated_at-a.updated_at)[0];
}
export function latest(rows:HealthRecord[],metric:string,day:string){
 const row=latestMeasurement(rows,metric,day);
 return row?num(row.data,metric):null;
}
export function bmi(rows:HealthRecord[],day:string){
 const height=latest(rows,"height",day), weight=latest(rows,"weight",day);
 return height&&weight!==null?weight/(height/100)**2:null;
}
export const dayOf=(row:HealthRecord)=>row.kind==="sleep"?str(row,"end").slice(0,10):str(row,"date");
export function bounds(day:string,period:Period){
 if(period==="month"){const start=day.slice(0,7)+"-01";return [start,civilAdvance(start,"month",1)];}
 if(period==="week"){const start=civilAdvance(day,"day",-((new Date(day+"T00:00:00Z").getUTCDay()+6)%7));return [start,civilAdvance(start,"day",7)];}
 return [day,civilAdvance(day,"day",1)];
}
export const duration=(row:HealthRecord)=>(Number(row.data.endAt)-Number(row.data.startAt))/3600000;
export function totals(rows:HealthRecord[],from:string,to:string){
 const period=rows.filter(row=>dayOf(row)>=from&&dayOf(row)<to);
 const sum=(values:number[])=>values.length?values.reduce((a,b)=>a+b,0):null;
 const workouts=period.filter(row=>row.kind==="exercise");
 const items=period.filter(row=>row.kind==="meal").flatMap(row=>row.data.items??[]);
 const sleep=new Map<string,number>();
 for(const row of period.filter(row=>row.kind==="sleep")) sleep.set(dayOf(row),(sleep.get(dayOf(row))??0)+duration(row));
 const quality=period.filter(row=>row.kind==="sleep").flatMap(row=>num(row.data,"quality")??[]);
 const nutrients=Object.fromEntries(Object.keys(nutrition).map(key=>{
  const values=items.flatMap(item=>item.values[key]===undefined?[]:[item.values[key]]);
  return [key,{amount:sum(values),missing:items.length-values.length}];
 }));
 return {period,nutrients,water:sum(period.filter(row=>row.kind==="water").map(row=>Number(row.data.amount))),
  sleepTotal:sum([...sleep.values()]),
  sleepQuality:quality.length?sum(quality)!/quality.length:null,
  sleep:sleep.size?sum([...sleep.values()])!/sleep.size:null,minutes:sum(workouts.map(row=>Number(row.data.minutes))),sessions:workouts.length||null,
  distance:sum(workouts.flatMap(row=>typeof row.data.distance==="number"?[row.data.distance]:[])),
  lift:workouts.reduce<number|null>((max,row)=>typeof row.data.lift==="number"?Math.max(max??0,row.data.lift):max,null)};
}
export function progress(rows:HealthRecord[],row:HealthRecord,day:string){
 const metric=str(row,"metric"),start=str(row,"date"),end=str(row,"until"),through=day>end?end:day;
 const configured=str(row,"period");
 const window:Period=configured==="month"||configured==="week"||configured==="day"?configured:metric==="minutes"||metric==="sessions"?"week":"day";
 const [a,b]=bounds(through,window);
 const t=totals(rows,a<start?start:a,b<civilAdvance(through,"day",1)?b:civilAdvance(through,"day",1));
 const bodyValues=t.period.filter(item=>item.kind==="body").flatMap(item=>num(item.data,metric)??[]);
 const bodyAverage=bodyValues.length?bodyValues.reduce((sum,amount)=>sum+amount,0)/bodyValues.length:null;
 const doseCount=t.period.filter(item=>item.kind==="dose"&&item.data.status==="taken"&&(!str(item,"planned")||
  scheduledDose(t.period,{...item,id:str(item,"medication")},dayOf(item),item.data.planned)?.id===item.id)).length;
 const aggregate=str(row,"aggregation");
 const observedKind=metric==="water"?"water":metric==="sessions"||metric==="minutes"?"exercise":metric==="care"?"dose":"meal";
 const span=new Set(t.period.filter(item=>item.kind===observedKind).map(dayOf)).size;
 const flow=metric==="water"?t.water:metric==="minutes"?t.minutes:metric==="sessions"?t.sessions:metric==="care"?doseCount:
  t.nutrients[metric]?.missing===0?t.nutrients[metric].amount:null;
 const current=day<start?null:Object.hasOwn(body,metric)?aggregate==="average"?bodyAverage:latest(rows.filter(item=>dayOf(item)>=start),metric,through)
  :metric==="custom"?num(row.data,"current"):metric==="sleep"?aggregate==="total"?t.sleepTotal:t.sleep:
  flow===null||aggregate!=="average"?flow:span?flow/span:null;
 const goal=Number(row.data.target),base=Number(row.data.baseline);
 const ratio=current===null?null:row.data.mode==="maintain"?current>=goal&&current<=Number(row.data.upper)?100:0:
  Math.max(0,Math.min(100,Math.round((current-base)/(goal-base)*100)));
 return {current,ratio};
}
export const planOn=(row:HealthRecord,day:string)=>str(row,"weekdays")?
 day>=str(row,"date")&&(!row.data.until||day<=str(row,"until"))&&str(row,"weekdays").includes(String(new Date(day+"T00:00:00Z").getUTCDay())):str(row,"date")===day;
export function healthEvents(rows:HealthRecord[],days:Date[],settings:Fields):LifeCalendarEvent[]{
 return days.flatMap(day=>{
  const date=localDateInput(day);
  const events:LifeCalendarEvent[]=[];
  for(const row of rows){
   const base={source:"health" as const,sourceId:row.id,date:day.getTime()};
   if(settings.calendar&&allowed(settings,"exercise")&&(row.kind==="plan"?planOn(row,date):row.kind==="exercise"&&dayOf(row)===date)){
    events.push({...base,title:(row.kind==="plan"?"運動計畫 · ":"運動紀錄 · ")+str(row,"title"),
     startsAt:new Date(date+"T"+str(row,"time")).getTime(),completed:row.kind==="exercise"});
   }
   for(const [kind,group,title] of [["body","body","身體量測"],["meal","diet","飲食紀錄"],["water","diet","飲水紀錄"],["sleep","sleep","睡眠紀錄"]] as const){
    if(row.kind===kind&&settings["calendar_"+group]===true&&allowed(settings,group)&&date===dayOf(row)){
     events.push({...base,title,completed:true,allDay:true});
    }
   }
   if(settings.calendarCycle&&allowed(settings,"cycle")&&row.kind==="cycle"&&date===str(row,"date"))
    events.push({...base,title:"經期紀錄",completed:true});
   if(settings.calendarMedication&&allowed(settings,"medication")&&medicationDue(row,date))for(const time of medicationTimes(row.data)){
    const log=scheduledDose(rows,row,date,time);
    events.push({...base,title:"服用提醒",occurrence:time,startsAt:new Date(date+"T"+time).getTime(),completed:log?.data.status==="taken",allDay:false});
   }
  }
  return events;
 });
}
