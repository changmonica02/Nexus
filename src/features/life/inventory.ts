import type { LifeSyncBase } from "./syncRecords";

export const stockUnits=["件","瓶","盒","包","顆","g","kg","mL","L"] as const;
export const stockActions=["purchase","open","use","estimate","adjust","move","discard","undo"] as const;
export type StockAction=typeof stockActions[number];
export const stockLabel:Record<StockAction,string>={purchase:"入庫",open:"開封",use:"使用",estimate:"估算",adjust:"盤點調整",move:"移動",discard:"丟棄",undo:"復原"};
export type StockEvent=LifeSyncBase & {
 item_id:string;container_id:string;lot_id:string;sequence:number;action:StockAction;
 capacity:number;remaining:number;unit:string;position_id:string|null;
 purchased_on:string;expiry:string|null;opened_on:string|null;state:"sealed"|"open"|"used"|"discarded";
 note:string;price:string|null;currency:string|null;
};
export type StockPosition=LifeSyncBase & {title:string;parent_id:string|null};
export type StockData={life_stock_events:StockEvent[];life_stock_positions:StockPosition[]};
export const emptyStock=():StockData=>({life_stock_events:[],life_stock_positions:[]});
export const stockId=(container:string,sequence:number)=>container+":"+sequence;
const civilDate=(value:string)=>{
 const date=new Date(value+"T00:00:00Z");
 return /^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value;
};
const quantity=(value:number)=>Number.isFinite(value)&&value>=0&&value<=1000000000&&Math.abs(Math.round(value*1e6)-value*1e6)<0.001;
const id=(value:string)=>typeof value==="string"&&value.length>0&&value.length<=160;
export function validateStockEvent(row:StockEvent){
 if(!id(row.item_id)||!id(row.container_id)||!id(row.lot_id)||!Number.isSafeInteger(row.sequence)||row.sequence<1||row.id!==stockId(row.container_id,row.sequence)
  ||!stockActions.includes(row.action)||!quantity(row.capacity)||!quantity(row.remaining)||row.capacity<=0||row.remaining>row.capacity
  ||!id(row.unit)||row.unit.length>20||!civilDate(row.purchased_on)||row.expiry!==null&&!civilDate(row.expiry)
  ||row.opened_on!==null&&(!civilDate(row.opened_on)||row.opened_on<row.purchased_on)
  ||row.position_id!==null&&!id(row.position_id)||typeof row.note!=="string"||row.note.length>1000
  ||(row.price===null)!==(row.currency===null)||row.price!==null&&(!/^\d{1,14}(\.\d{1,4})?$/.test(row.price)||!/^[A-Z]{3}$/.test(row.currency!))
  ||!["sealed","open","used","discarded"].includes(row.state)||row.state==="sealed"&&(row.opened_on!==null||row.remaining!==row.capacity)
  ||row.state==="open"&&(row.opened_on===null||row.remaining<=0)||["used","discarded"].includes(row.state)&&row.remaining!==0
  ||(row.sequence===1)!==(row.action==="purchase")||row.action==="purchase"&&row.state!=="sealed"||row.deleted_at!==null){
  throw Error("庫存紀錄格式無效");
 }
}
export function validateStockPosition(row:StockPosition){
 if(typeof row.title!=="string"||!row.title.trim()||row.title.length>120||row.parent_id!==null&&!id(row.parent_id)||row.parent_id===row.id){
  throw Error("存放位置格式無效");
 }
}
const movementFields=["remaining","state","opened_on","position_id"] as const;
export function validateStockTransition(next:StockEvent,previous:StockEvent|undefined,prior:StockEvent|undefined){
 validateStockEvent(next);
 if(!previous){if(next.sequence!==1)throw Error("庫存異動缺少前一筆紀錄");return;}
 for(const field of ["item_id","container_id","lot_id","capacity","unit","purchased_on","expiry","price","currency"] as const){
  if(next[field]!==previous[field])throw Error("已入庫的批次資料不可透過異動覆寫");
 }
 if(next.sequence!==previous.sequence+1)throw Error("庫存已更新，請重新載入");
 const changed=movementFields.filter(field=>next[field]!==previous[field]);
 const only=(...fields:typeof movementFields[number][])=>changed.every(field=>fields.includes(field));
 const action=next.action;
 const active=previous.state==="open"||previous.state==="sealed";
 const valid=action==="open"&&previous.state==="sealed"&&next.state==="open"&&only("state","opened_on")
  ||action==="use"&&previous.state==="open"&&["open","used"].includes(next.state)&&next.remaining<previous.remaining&&only("remaining","state")
  ||(action==="estimate"||action==="adjust")&&previous.state==="open"&&["open","used"].includes(next.state)&&only("remaining","state")
  ||action==="discard"&&active&&next.state==="discarded"&&only("remaining","state")
  ||action==="move"&&active&&only("position_id")&&changed.includes("position_id")
  ||action==="undo"&&previous.action!=="undo"&&!!prior&&movementFields.every(field=>next[field]===prior[field]);
 if(!valid)throw Error("此庫存狀態不支援該操作");
}
export function stockHeads(rows:StockEvent[]){
 const heads=new Map<string,StockEvent>();
 for(const row of rows)if((heads.get(row.container_id)?.sequence??0)<row.sequence)heads.set(row.container_id,row);
 return [...heads.values()];
}
export function stockTotals(rows:StockEvent[]){
 const held=rows.filter(row=>row.state==="sealed"||row.state==="open");
 const volume=new Map<string,number>(), opened=new Map<string,number>();
 for(const row of held){
  const unit=row.unit==="L"?"mL":row.unit==="kg"?"g":row.unit;
  const amount=row.remaining*(row.unit===unit?1:1000);
  volume.set(unit,(volume.get(unit)??0)+amount);
  if(row.state==="open")opened.set(unit,(opened.get(unit)??0)+amount);
 }
 return {held:held.length,sealed:held.filter(row=>row.state==="sealed").length,volume,opened};
}
export function stockPath(positions:StockPosition[],key:string|null){
 const path:string[]=[],seen=new Set<string>();
 let current=key;
 while(current&&!seen.has(current)){
  seen.add(current);
  const row=positions.find(row=>row.id===current&&row.deleted_at===null);
  if(!row)break;
  path.unshift(row.title);current=row.parent_id;
 }
 return path.join(" / ");
}
export function stockUsage(rows:StockEvent[]){
 const byId=new Map(rows.map(row=>[row.id,row]));
 const reversed=new Set(rows.filter(row=>row.action==="undo").map(row=>stockId(row.container_id,row.sequence-1)));
 const totals=new Map<string,{used:number;count:number;first:number;last:number}>();
 for(const row of rows){
  if(row.action!=="use"||reversed.has(row.id))continue;
  const previous=byId.get(stockId(row.container_id,row.sequence-1));
  if(!previous)continue;
  const unit=row.unit==="L"?"mL":row.unit==="kg"?"g":row.unit;
  const amount=(previous.remaining-row.remaining)*(unit===row.unit?1:1000);
  const entry=totals.get(unit)??{used:0,count:0,first:row.created_at,last:row.created_at};
  entry.used+=amount;entry.count++;entry.first=Math.min(entry.first,row.created_at);entry.last=Math.max(entry.last,row.created_at);
  totals.set(unit,entry);
 }
 return totals;
}
