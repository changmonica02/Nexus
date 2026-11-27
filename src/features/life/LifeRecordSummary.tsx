import { localDateInput } from "../../lib/todoCalendar";
import { useState } from "react";
import type { Formula, StatisticPreset } from "./listConfiguration";
import type { LifeField, LifeItem } from "./lists";
import { civilAdvance } from "./civilPeriods";
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

export default function LifeRecordSummary({fields,items,categories,open,presets,savePresets,formulaValue}:{fields:LifeField[];items:LifeItem[];categories:{id:string;title:string}[];open:(item:LifeItem)=>void;presets:StatisticPreset[];savePresets:(presets:StatisticPreset[])=>Promise<void>;formulaValue:(formula:Formula,values:Record<string,unknown>)=>number|null}){
  const [presetName,setPresetName]=useState("");
  const [activePreset,setActivePreset]=useState("");
  const [error,setError]=useState("");
  const [saving,setSaving]=useState(false);
  const [fieldId,setField]=useState("");
  const [start,setStart]=useState("");
  const [end,setEnd]=useState("");
  const [mode,setMode]=useState("stats");
  const [group,setGroup]=useState("month");
  const [chart,setChart]=useState("bar");
  const [month,setMonth]=useState(()=>new Date().toLocaleDateString("sv-SE").slice(0,7));
  const active=fields.filter(field=>!field.archived);
  const field=active.find(field=>field.id===fieldId);
  const dateField=active.find(field=>field.type==="date");
  const dates=new Map(items.map(item=>[item.id,dateField?String(item.values[dateField.id]??""):localDateInput(new Date(item.created_at))]));
  const dateOf=(item:LifeItem)=>dates.get(item.id)??"";
  const filtered=items.filter(item=>(!start||dateOf(item)>=start)&&(!end||dateOf(item)&&dateOf(item)<=end));
  const values=field?filtered.map(item=>field.formula?formulaValue(field.formula,item.values):item.values[field.id]):[];
  const numbers=values.filter((value):value is number=>typeof value==="number"&&Number.isFinite(value));
  const sum=numbers.reduce((total,value)=>total+value,0);
  const checked=values.filter(value=>value===true).length;
  const represented=values.filter(value=>typeof value==="boolean").length;
  const dated=groups(filtered.filter(item=>dateOf(item)),dateOf);
  const days=[...dated.keys()].sort();
  const buckets=group==="category"?groups(filtered,item=>item.category_id??""):groups(filtered.filter(item=>dateOf(item)),item=>{
    const date=dateOf(item);
    if(group==="day")return date;
    if(group==="year")return date.slice(0,4);
    if(group==="week")return civilAdvance(date,"day",-((new Date(date+"T00:00:00Z").getUTCDay()+6)%7));
    return date.slice(0,7);
  });
  const sorted=[...buckets].sort(([a],[b])=>a.localeCompare(b));
  const max=sorted.reduce((largest,[,rows])=>Math.max(largest,rows.length),1);
  const colors=["#5b8f71","#9e785b","#738ab4","#926ab0","#ab8654","#5e9293"];
  const chartTotal=sorted.reduce((total,[,rows])=>total+rows.length,0);
  let used=0;
  const segments=chart==="donut"&&chartTotal?sorted.map(([,rows],index)=>{
    const start=100*used/chartTotal;
    used+=rows.length;
    return colors[index%colors.length]+" "+start+"% "+100*used/chartTotal+"%";
  }):[];
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
    {mode==="stats"&&<div className="mt-3 flex flex-wrap gap-2">
      <label className="grid gap-1">統計設定<select className={control} value={activePreset} onChange={event=>{
        const id=event.target.value;setActivePreset(id);
        const selected=presets.find(row=>row.id===id);
        if(selected){setPresetName(selected.title);setField(selected.field);setStart(selected.start);setEnd(selected.end);setGroup(selected.group);setChart(selected.chart);}
        else setPresetName("");
      }}><option value="">新設定</option>{presets.map(row=><option key={row.id} value={row.id}>{row.title}</option>)}</select></label>
      <label className="grid gap-1">設定名稱<input className={control} maxLength={100} value={presetName} onChange={event=>setPresetName(event.target.value)}/></label>
      <button className={control+" self-end"} disabled={saving||!presetName.trim()||(!activePreset&&presets.length>=12)} type="button" onClick={async()=>{
        setSaving(true);setError("");
        const id=activePreset||crypto.randomUUID();
        try{await savePresets([...presets.filter(row=>row.id!==id),{id,title:presetName.trim(),field:fieldId,start,end,group,chart}]);setActivePreset(id);}
        catch(error){setError(error instanceof Error?error.message:"無法儲存統計設定");}
        finally{setSaving(false);}
      }}>儲存統計設定</button>
      {activePreset&&<button className={control+" self-end"} disabled={saving} type="button" onClick={async()=>{
        setSaving(true);setError("");
        try{await savePresets(presets.filter(row=>row.id!==activePreset));setActivePreset("");setPresetName("");}
        catch(error){setError(error instanceof Error?error.message:"無法刪除統計設定");}
        finally{setSaving(false);}
      }}>刪除統計設定</button>}
    </div>}
    {error&&<p role="alert">{error}</p>}
    <p className="my-2">{filtered.length} 筆 · 日期來源：{dateField?.name??"建立日期"}</p>
    {mode==="stats"?<>
      {numbers.length>0&&<p>加總 {sum.toLocaleString()} · 平均 {(sum/numbers.length).toLocaleString()} · 最小 {numbers.reduce((a,b)=>Math.min(a,b))} · 最大 {numbers.reduce((a,b)=>Math.max(a,b))}</p>}
      {represented>0&&<p>完成 {checked} / {represented} · {Math.round(checked/represented*100)}% <progress value={checked} max={represented} aria-label="完成比例"/></p>}
      <div className="my-2 flex flex-wrap gap-2">
        <label>分組 <select className={control} value={group} onChange={event=>setGroup(event.target.value)}>
          <option value="day">日</option><option value="week">週</option><option value="month">月</option><option value="year">年</option><option value="category">分類</option>
        </select></label>
        <label>呈現方式 <select className={control} value={chart} onChange={event=>setChart(event.target.value)}>
          <option value="bar">長條</option><option value="numbers">數值</option><option value="donut">環形</option>
        </select></label>
      </div>
      {segments.length>0&&<div role="img" aria-label={`分組環形圖，共 ${chartTotal} 筆，明細如下`} className="relative my-3 size-28 rounded-full" style={{backgroundImage:`conic-gradient(${segments.join(",")})`}}>
        <div className="absolute inset-5 rounded-full bg-[var(--color-editor-bg)]"/>
      </div>}
      <ul aria-label="分組紀錄筆數" className="mt-3 space-y-1">{sorted.map(([key,rows],index)=>{
        const name=group==="category"?categories.find(category=>category.id===key)?.title??"未分類":key;
        return <li key={key} className="flex flex-wrap items-center gap-2">{chart==="donut"&&<span aria-hidden="true" className="size-3 rounded-full" style={{backgroundColor:colors[index%colors.length]}}/>}{name} {chart==="bar"&&<meter min={0} max={max} value={rows.length} aria-label={name+"筆數"}/>} {rows.length} 筆</li>;
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
