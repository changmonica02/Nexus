import { useState } from "react";
import type { LifeField, LifeItem } from "./lists";
import { control, surface } from "./dashboard/styles";

function groups<T>(items:T[], key:(item:T)=>string) {
  const grouped=new Map<string,T[]>();
  for(const item of items){
    const name=key(item);
    const bucket=grouped.get(name);
    if(bucket)bucket.push(item);
    else grouped.set(name,[item]);
  }
  return grouped;
}

export default function LifeRecordSummary({fields,items,open}:{fields:LifeField[];items:LifeItem[];open:(item:LifeItem)=>void}){
  const [fieldId,setField]=useState("");
  const [start,setStart]=useState("");
  const [end,setEnd]=useState("");
  const [mode,setMode]=useState("stats");
  const [month,setMonth]=useState(()=>new Date().toLocaleDateString("sv-SE").slice(0,7));
  const active=fields.filter(field=>!field.archived);
  const field=active.find(field=>field.id===fieldId);
  const dateField=active.find(field=>field.type==="date");
  const dateOf=(item:LifeItem)=>dateField?String(item.values[dateField.id]??""):new Date(item.created_at).toLocaleDateString("sv-SE");
  const filtered=items.filter(item=>(!start||dateOf(item)>=start)&&(!end||dateOf(item)&&dateOf(item)<=end));
  const values=field?filtered.map(item=>item.values[field.id]):[];
  const numbers=values.filter((value):value is number=>typeof value==="number"&&Number.isFinite(value));
  const sum=numbers.reduce((total,value)=>total+value,0);
  const checked=values.filter(value=>value===true).length;
  const represented=values.filter(value=>typeof value==="boolean").length;
  const dated=groups(filtered.filter(item=>dateOf(item)),dateOf);
  const days=[...dated.keys()].sort();
  const months=groups(days,date=>date.slice(0,7));
  const max=Math.max(1,...Array.from(months.values(),dates=>dates.reduce((n,date)=>n+(dated.get(date)?.length??0),0)));
  return <details className={surface}><summary className="cursor-pointer font-medium">日期檢視與統計</summary>
    <div className="mt-3 flex flex-wrap gap-2">
      <label className="grid gap-1">檢視<select className={control} value={mode} onChange={event=>setMode(event.target.value)}>
        <option value="stats">統計</option><option value="timeline">時間軸</option><option value="calendar">月曆</option>
      </select></label>
      <label className="grid gap-1">起始日期<input className={control} type="date" value={start} onChange={event=>setStart(event.target.value)}/></label>
      <label className="grid gap-1">結束日期<input className={control} type="date" value={end} onChange={event=>setEnd(event.target.value)}/></label>
      {mode==="calendar"&&<label className="grid gap-1">月份<input className={control} type="month" value={month} onChange={event=>event.target.value&&setMonth(event.target.value)}/></label>}
      {mode==="stats"&&<label className="grid gap-1">統計欄位<select className={control} value={fieldId} onChange={event=>setField(event.target.value)}>
        <option value="">僅統計筆數</option>{active.filter(field=>["number","rating","duration","checkbox"].includes(field.type)).map(field=><option key={field.id} value={field.id}>{field.name}</option>)}
      </select></label>}
    </div>
    <p className="my-2">{filtered.length} 筆 · 日期來源：{dateField?.name??"建立日期"}</p>
    {mode==="stats"?<>
      {numbers.length>0&&<p>加總 {sum.toLocaleString()} · 平均 {(sum/numbers.length).toLocaleString()} · 最小 {numbers.reduce((a,b)=>Math.min(a,b))} · 最大 {numbers.reduce((a,b)=>Math.max(a,b))}</p>}
      {represented>0&&<p>完成 {checked} / {represented} · {Math.round(checked/represented*100)}% <progress value={checked} max={represented} aria-label="完成比例"/></p>}
      <ul aria-label="每月紀錄筆數" className="mt-3 space-y-1">{Array.from(months,([month,dates])=>{
        const count=dates.reduce((n,date)=>n+(dated.get(date)?.length??0),0);
        return <li key={month} className="flex flex-wrap items-center gap-2">{month} <meter min={0} max={max} value={count} aria-label={month+"筆數"}/> {count} 筆</li>;
      })}</ul>
    </>:mode==="calendar"?<div className="overflow-x-auto">
      <div className="grid min-w-[30rem] grid-cols-7 gap-1 text-xs">
        {"日一二三四五六".split("").map(label=><span key={label} className="text-center">{label}</span>)}
        {Array.from({length:42},(_,index)=>{
          const [year,monthNumber]=month.split("-").map(Number);
          const first=new Date(year,monthNumber-1,1);
          const date=new Date(year,monthNumber-1,index-first.getDay()+1);
          const key=date.toLocaleDateString("sv-SE");
          return <div key={key} className={"min-h-16 min-w-0 rounded border border-[var(--color-border)] p-1 "+(date.getMonth()===first.getMonth()?"":"opacity-60")}>
            <span>{date.getDate()}</span>{dated.get(key)?.map(item=><button className="block min-h-8 max-w-full truncate text-left underline" title={item.title} type="button" key={item.id} onClick={()=>open(item)}>{item.title}</button>)}
          </div>;
        })}
      </div>
    </div>:<ul className="space-y-2">{[...days].reverse().map(date=><li key={date} className="min-w-0 rounded-lg border border-[var(--color-border)] p-2">
      <h3 className="font-medium">{date}</h3>
      {dated.get(date)?.map(item=><button className={control+" my-1 block max-w-full break-words text-left"} type="button" onClick={()=>open(item)} key={item.id}>{item.title}</button>)}
    </li>)}</ul>}
  </details>;
}
