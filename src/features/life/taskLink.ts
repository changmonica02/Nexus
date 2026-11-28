import type { TaskSlot } from "./taskPlan";
import { dayOf,duration,totals } from "./health/summary";
import { civilAdvance } from "./civilPeriods";
import { num,type HealthRecord } from "./health/model";
import { financeRows,type FinanceRecord } from "./finance/model";
import { currencyDigits } from "./finance/money";

export const actionNames={water:"記錄飲水",meal:"記錄飲食",exercise:"記錄運動",body:"記錄身體數據",sleep:"記錄睡眠",dose:"確認照護",
 expense:"記錄支出",income:"記錄收入",transfer:"記錄轉帳",subscription:"確認預定交易"} as const;
export type ActionKind=keyof typeof actionNames;
export type TaskAction={kind:ActionKind;mode:"form"|"quick";amount?:string;targetAmount?:string;account?:string;target?:string;related?:string;goal?:string;metric?:string;category?:string;notes?:string};
export type TaskLink={task:string;taskOccurrence:string;taskRunOnce:boolean};
export type ActionSources={health:HealthRecord[];finance:FinanceRecord[]};
export const isFinanceAction=(kind:ActionKind)=>["expense","income","transfer","subscription"].includes(kind);

export function validateTaskAction(action:TaskAction){
 if(!Object.hasOwn(actionNames,action.kind)||!["form","quick"].includes(action.mode)||Object.values(action).some(value=>typeof value!=="string"||value.length>4000))
  throw Error("連動設定無效");
 if(action.amount&&!(Number.isFinite(Number(action.amount))&&Number(action.amount)>0))throw Error("請輸入有效的預設數值");
 if(["dose","subscription"].includes(action.kind)&&!action.related)throw Error("請選擇既有計畫");
 if(action.mode==="quick"&&(action.kind==="sleep"||action.kind==="meal"&&!action.related||
  ["water","exercise","body"].includes(action.kind)&&!action.amount||
  isFinanceAction(action.kind)&&action.kind!=="subscription"&&(!action.account||!action.amount||action.kind==="transfer"&&!action.target)))
  throw Error("請填齊快速確認的必要資料");
}

export function projectTaskLink(sources:ActionSources,id:string,slot:TaskSlot,today:string):TaskSlot {
 const action=slot.settings.action;
 if(!action||slot.record?.status==="skipped"||slot.record?.status==="missed")return slot;
 const goal=slot.settings.goal,unit=goal.unit.trim().toLowerCase();
 const within=(date:string)=>date>=slot.day&&date<=slot.through&&date<=today;
 const count=goal.kind==="check"||["次","次數"].includes(unit);
 let values:{date:string;amount:number}[];
 if(isFinanceAction(action.kind)){
  const currencies=new Map(financeRows(sources.finance,"account").map(row=>[row.id,row.payload.currency]));
  values=financeRows(sources.finance,"transaction").flatMap(({payload:p})=>{
   if(p.task!==id||p.taskOccurrence!==slot.key||!within(p.date)||(action.kind==="subscription"?p.source.split("|")[0]!==action.related:p.type!==action.kind))return [];
   const currency=currencies.get(p.account);
   return [{date:p.date,amount:count?1:currency?.toLowerCase()===unit?Number(p.amount)/10**currencyDigits(currency):0}];
  });
 } else {
  values=sources.health.flatMap(row=>{
   const date=dayOf(row);
   if(row.kind!==action.kind||row.data.task!==id||row.data.taskOccurrence!==slot.key||!within(date)
     ||row.kind==="dose"&&(row.data.status!=="taken"||row.data.medication!==action.related))return [];
   let amount=count?1:0;
   if(!count){
    if(row.kind==="water"&&["ml","毫升","l","公升"].includes(unit))amount=(num(row.data,"amount")??0)/(["l","公升"].includes(unit)?1000:1);
    if(row.kind==="exercise"&&(goal.kind==="duration"||["分鐘","min"].includes(unit)))amount=num(row.data,"minutes")??0;
    if(row.kind==="exercise"&&["km","公里"].includes(unit))amount=num(row.data,"distance")??0;
    if(row.kind==="sleep")amount=goal.kind==="duration"||["分鐘","min"].includes(unit)?duration(row)*60:["小時","h"].includes(unit)?duration(row):0;
    if(row.kind==="meal"&&["kcal","大卡"].includes(unit))amount=totals([row],date,civilAdvance(date,"day",1)).nutrients.kcal.amount??0;
   }
   return [{date,amount}];
  });
 }
 let amount=0,completedDay:string|undefined;
 for(const entry of values.sort((a,b)=>a.date.localeCompare(b.date))){
  amount+=entry.amount;
  if(!completedDay&&amount>=goal.target)completedDay=entry.date;
 }
 return {...slot,amount,completedDay,status:completedDay?"complete":slot.through<today?"missed":amount?"partial":"pending"};
}
