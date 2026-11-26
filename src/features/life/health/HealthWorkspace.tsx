import { useState } from "react";
import ModalDialog from "../../../components/ModalDialog";
import { confirmDialog } from "../../../lib/confirmDialog";
import { downloadJsonFile } from "../../../lib/fileDownload";
import type { LifeRepository } from "../LifeRepository";
import { civilAdvance } from "../civilPeriods";
import { control, surface } from "../dashboard/styles";
import { allowed, body, groups, kindGroup, labels, makeHealth, metricGroup, metrics, nutrition, num, str, toItem, type Entry, type Fields, type Group, type HealthRecord, type Item } from "./model";
import { cycleSummary, medicationDue, medicationStock, scheduledDose } from "./sensitive";
import { bmi, bounds, dayOf, duration, latest, planOn, progress, totals, value, type Period } from "./summary";

type Reference={id:string;title:string};
type Field=[key:string,label:string,type?:string,options?:Record<string,string>];
const fields:Record<Entry,Field[]> = {
 cycle:[["date","經期開始","date"],["until","經期結束","date"],["flow","經血量"],["symptoms","症狀"],["pain","疼痛程度（0–10）","number"],["mood","情緒"],["temperature","基礎體溫（°C）","number"]],
 medication:[["title","名稱"],["category","類型","select",{medicine:"藥品",vitamin:"維生素",supplement:"保健食品"}],["quantity","每次數量","number"],["unit","單位"],["date","起始日期","date"],["until","結束日期","date"],["frequency","服用週期","select",{daily:"每日",weekly:"指定星期",interval:"固定間隔",asNeeded:"需要時"}],["weekdays","星期（日 0 至六 6）"],["interval","間隔天數","number"],["time","預定時間","time"],["meal","餐前／餐後"],["stock","起始庫存","number"],["expiry","效期","date"]],
 dose:[["status","服用狀態","select",{taken:"已服用",missed:"未服用",skipped:"略過"}],["date","紀錄日期","date"],["planned","預定時間","time"],["actual","實際服用時間","datetime-local"],["quantity","實際服用數量","number"]],
 body:[["date","日期","date"],...Object.entries(body).map(([key,label]):Field=>[key,label,"number"])],
 goal:[["title","名稱"],["metric","指標","select",metrics],["mode","方向","select",{increase:"增加",decrease:"減少",maintain:"維持範圍"}],["date","起始日期","date"],["until","目標日期","date"],["baseline","起始值","number"],["target","目標值／範圍下限","number"],["upper","範圍上限","number"],["current","自訂指標目前值","number"],["habit","關聯習慣","habit"]],
 food:[["title","名稱"],["unit","營養標示基準","select",{g:"每 100 g",ml:"每 100 ml","份":"每份"}],["grams","一份等於幾公克","number"],["ml","一份等於幾毫升","number"],...Object.entries(nutrition).map(([key,label]):Field=>[key,label,"number"]),["archived","封存","checkbox"]],
 recipe:[["title","名稱"],["archived","封存","checkbox"]],
 meal:[["title","名稱"],["date","日期","date"],["time","時間","time"],["meal","餐別","select",{"早餐":"早餐","午餐":"午餐","晚餐":"晚餐","點心":"點心"}]],
 water:[["date","日期","date"],["time","時間","time"],["amount","容量（ml）","number"]],
 plan:[["title","名稱"],["date","開始日期","date"],["time","時間","time"],["minutes","預計分鐘","number"],["weekdays","重複星期（日 0 至六 6，單次留空）"],["until","重複截止日","date"],["task","關聯任務","task"]],
 exercise:[["title","名稱"],["date","日期","date"],["time","時間","time"],["minutes","實際分鐘","number"],["distance","距離（km）","number"],["lift","重量（kg）","number"],["reps","次數","number"],["sets","組數","number"],["kcal","手動消耗熱量（kcal）","number"],["task","關聯任務","task"]],
 sleep:[["start","入睡時間","datetime-local"],["end","起床時間","datetime-local"],["nap","午睡","checkbox"],["quality","品質（1–5）","number"],["wakes","夜間醒來次數","number"]],
};
const element=(label:string,action:()=>void)=><button className={control} type="button" onClick={action}>{label}</button>;
function Editor({row,rows,save,close,tasks,habits}:{row:HealthRecord;rows:HealthRecord[];save:(row:HealthRecord,remove?:boolean)=>Promise<void>;close:()=>void;tasks:Reference[];habits:Reference[]}){
 const [draft,set]=useState(row.data),[busy,setBusy]=useState(false),[error,setError]=useState("");
 const [food,setFood]=useState(""),[recipe,setRecipe]=useState(""),[amount,setAmount]=useState("1"),[unit,setUnit]=useState("份"),[manual,setManual]=useState<Fields>({});
 if(row.kind==="privacy")return null;
 const kind=row.kind,label=(row.revision?"編輯":"新增")+labels[kind],write=(key:string,v:Fields[string])=>set(current=>({...current,[key]:v}));
 const choices=(source:Reference[])=>Object.fromEntries([["","未關聯"],...source.map(item=>[item.id,item.title])]);
 const items=draft.items??[];
 const report=(error:unknown)=>setError(error instanceof Error?error.message:"操作失敗");
 const run=async(remove=false)=>{
  if(busy)return;
  setBusy(true);setError("");
  try{
   let data=draft;
   if(kind==="sleep"&&!remove)data={...data,startAt:draft.start===row.data.start&&row.data.startAt?row.data.startAt:Date.parse(String(draft.start)),
    endAt:draft.end===row.data.end&&row.data.endAt?row.data.endAt:Date.parse(String(draft.end))};
   if(kind==="goal"&&row.revision&&["metric","mode","baseline","target","upper","date","until"].some(key=>draft[key]!==row.data[key])){
    data={...data,history:[...(row.data.history??[]),`${row.data.date} 至 ${row.data.until} · ${row.data.baseline} → ${row.data.target}${row.data.upper!==undefined?"–"+row.data.upper:""}`]};
   }
   await save({...row,data},remove);close();
  }catch(error){report(error);}finally{setBusy(false);}
 };
 return <ModalDialog aria-label={label} busy={busy} onDismiss={close}
  className="m-auto max-h-[90dvh] w-[min(94vw,42rem)] overflow-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-5 text-[var(--color-text)] backdrop:bg-black/40">
  <h2 className="mb-4 text-xl font-semibold">{label}</h2>
  <form className="space-y-4" onSubmit={event=>{event.preventDefault();void run();}}>
   <fieldset disabled={busy} className="grid gap-3 sm:grid-cols-2">{fields[kind].map(([key,title,type,options])=><label key={key} className="grid min-w-0 gap-1 text-sm">{title}
    {options||type==="task"||type==="habit"?<select className={control} aria-label={title} value={String(draft[key]??"")} onChange={event=>write(key,event.target.value)}>
     {Object.entries(options??choices(type==="task"?tasks:habits)).map(([id,name])=><option key={id} value={id}>{String(name)}</option>)}
    </select>:type==="checkbox"?<input className="size-5" type="checkbox" checked={!!draft[key]} onChange={event=>write(key,event.target.checked)}/>:
     <input className={control} aria-label={title} type={type??"text"} step={type==="number"?"any":undefined} min={type==="number"?0:undefined} value={String(draft[key]??"")}
      onChange={event=>write(key,type==="number"?event.target.value===""?undefined:event.target.valueAsNumber:event.target.value)}/>}
   </label>)}</fieldset>
   {(kind==="meal"||kind==="recipe")&&<fieldset className="space-y-3 rounded-xl border border-[var(--color-border)] p-3">
    <legend>食品與份量</legend>
    <ul>{items.map((item,index)=><li className="flex flex-wrap items-center justify-between gap-2" key={index}>{item.title} · {item.amount} {item.unit} · {value(item.values.kcal??null,"kcal")}
     {element("移除",()=>write("items",items.filter((_,i)=>i!==index)))}</li>)}</ul>
    <div className="flex flex-wrap items-end gap-2">
     <label className="grid gap-1">常用食品<select aria-label="常用食品" className={control} value={food} onChange={event=>setFood(event.target.value)}><option value="">選擇食品</option>
      {rows.filter(item=>item.kind==="food"&&!item.data.archived).map(item=><option key={item.id} value={item.id}>{str(item,"title")}</option>)}</select></label>
     <label className="grid gap-1">份量<input className={control+" w-24"} type="number" step="any" min="0.001" value={amount} onChange={event=>setAmount(event.target.value)}/></label>
     <label className="grid gap-1">單位<select className={control} value={unit} onChange={event=>setUnit(event.target.value)}>{["份","g","ml"].map(key=><option key={key}>{key}</option>)}</select></label>
     {element("加入食品",()=>{const item=rows.find(item=>item.id===food);if(item)try{write("items",[...items,toItem(item,Number(amount),unit)]);setError("");}catch(error){report(error);}})}
    </div>
    {kind==="meal"&&<div className="flex flex-wrap items-end gap-2"><label className="grid gap-1">常用餐點<select className={control} value={recipe} onChange={event=>setRecipe(event.target.value)}>
     <option value="">選擇餐點</option>{rows.filter(item=>item.kind==="recipe"&&!item.data.archived).map(item=><option key={item.id} value={item.id}>{str(item,"title")}</option>)}</select></label>
     {element("帶入餐點",()=>{const item=rows.find(item=>item.kind==="recipe"&&item.id===recipe);if(item)write("items",[...items,...(item.data.items??[])]);})}</div>}
    <details><summary>手動輸入食品</summary><div className="my-2 grid gap-2 sm:grid-cols-2">
     <label className="grid gap-1">食品名稱<input className={control} value={String(manual.title??"")} onChange={event=>setManual({...manual,title:event.target.value})}/></label>
     {Object.entries(nutrition).map(([key,label])=><label key={key} className="grid gap-1">{label}<input className={control} type="number" min="0" step="any"
      value={String(manual[key]??"")} onChange={event=>setManual({...manual,[key]:event.target.value===""?undefined:event.target.valueAsNumber})}/></label>)}</div>
     {element("加入手動食品",()=>{if(manual.title&&Number(amount)>0){const item:Item={title:String(manual.title),amount:Number(amount),unit,values:Object.fromEntries(Object.keys(nutrition).flatMap(key=>num(manual,key)===null?[]:[[key,num(manual,key)!]]))};
       write("items",[...items,item]);setManual({});}})}</details>
   </fieldset>}
   {kind==="meal"&&<label className="grid gap-1">餐點圖片（最多 128 KiB）<input className={control} type="file" accept="image/png,image/jpeg,image/webp" onChange={event=>{
    const file=event.target.files?.[0];if(!file)return;if(file.size>131072||!["image/png","image/jpeg","image/webp"].includes(file.type)){setError("圖片格式或大小不符");return;}
    setBusy(true);const reader=new FileReader();reader.onload=()=>write("image",String(reader.result));reader.onerror=()=>setError("圖片讀取失敗");reader.onloadend=()=>setBusy(false);
    reader.readAsDataURL(file);
   }}/></label>}
   {draft.image&&element("移除餐點圖片",()=>write("image",undefined))}
   <label className="grid gap-1">備註<textarea className={control} value={String(draft.notes??"")} onChange={event=>write("notes",event.target.value)}/></label>
   {kind==="goal"&&draft.history?.length?<details><summary>目標修改歷史</summary>{draft.history.map((line,index)=><p key={index}>{line}</p>)}</details>:null}
   {error&&<p role="alert">{error}</p>}
   <div className="flex gap-2"><button className={control} disabled={busy}>儲存</button>{element("取消",close)}
    {!!row.revision&&<button className={control} disabled={busy} type="button" onClick={async()=>{
     if(await confirmDialog({title:"永久刪除健康紀錄",message:"確定永久刪除這筆健康紀錄？",danger:true}))await run(true);
    }}>刪除</button>}</div>
  </form>
 </ModalDialog>;
}
export function GoalList({rows,day,open,linked,addWater}:{rows:HealthRecord[];day:string;open:(row:HealthRecord)=>void;linked?:Reference[];addWater?:()=>void}){
 return <div className="grid gap-3 sm:grid-cols-2">{rows.filter(row=>row.kind==="goal"&&(!linked||linked.some(item=>item.id===row.data.habit))).map(row=>{
  const p=progress(rows,row,day);
  const habit=linked?.find(item=>item.id===row.data.habit);
  return <article className={surface+" space-y-2"} key={row.id}>
   {element(str(row,"title"),()=>open(row))}
   <p>{metrics[str(row,"metric") as keyof typeof metrics]} · {value(p.current)} / {str(row,"target")}{row.data.mode==="maintain"?"–"+row.data.upper:""}</p>
   {habit&&<p className="text-sm">關聯習慣：{habit.title}</p>}
   {addWater&&row.data.metric==="water"&&element("記錄飲水",addWater)}
   <p className="text-sm opacity-75">{str(row,"date")} 至 {str(row,"until")}</p>
   {p.ratio!==null&&<><progress className="w-full accent-emerald-600" aria-label="目標進度" max={100} value={p.ratio}/>
    <p>{row.data.mode==="maintain"?p.ratio===100?"在範圍內":"超出範圍":p.ratio+"%"}</p></>}
  </article>;
 })}</div>;
}
export default function HealthWorkspace({rows,owner,day:initial,taskOpen,tasks,habits,repository,focused}:{
 rows:HealthRecord[];owner:string|null;day:string;taskOpen:(id:string)=>void;tasks:Reference[];habits:Reference[];repository:LifeRepository;focused?:string;
}){
 const [tab,setTab]=useState("overview"),[day,setDay]=useState(initial),[period,setPeriod]=useState<Period>("day"),[query,setQuery]=useState("");
 const [edit,setEdit]=useState(()=>focused==="new-water"?makeHealth(owner,"water",{date:initial,time:new Date().toTimeString().slice(0,5),amount:250}):rows.find(row=>row.id===focused)),[error,setError]=useState(""),[busy,setBusy]=useState(false),[trend,setTrend]=useState("weight");
 const pref=rows.find(row=>row.kind==="privacy"),privacy=pref?.data??{},enabled=(group:Group)=>allowed(privacy,group);
 const safe=rows.filter(row=>row.kind!=="privacy"&&enabled(kindGroup[row.kind])&&(row.kind!=="goal"||enabled(metricGroup(str(row,"metric")))));
 const active=(tab==="foods"&&!enabled("diet")||Object.hasOwn(groups,tab)&&!enabled(tab as Group))?"overview":tab;
 const cycle=cycleSummary(safe);
 const [from,to]=bounds(day,period),summary=totals(safe,from,to);
 const start=(kind:Entry,patch:Fields={})=>setEdit(makeHealth(owner,kind,{date:day,time:"08:00",quantity:1,frequency:"daily",category:"medicine",unit:"份",metric:"weight",mode:"decrease",until:kind==="goal"?civilAdvance(day,"day",30):"",
  start:civilAdvance(day,"day",-1)+"T23:00",end:day+"T07:00",quality:3,meal:"早餐",amount:250,minutes:30,...patch}));
 const change=async(patch:Fields)=>{
  if(busy)return;setBusy(true);setError("");
  try{await repository.saveHealth(pref?{...pref,data:{...privacy,...patch}}:makeHealth(owner,"privacy",patch));}
  catch(error){setError(error instanceof Error?error.message:"儲存失敗");}finally{setBusy(false);}
 };
 const list=(kind:Entry,details:(row:HealthRecord)=>React.ReactNode,all=false)=>{
  const matches=(all?safe:summary.period).filter(row=>row.kind===kind&&str(row,"title").toLowerCase().includes(query.toLowerCase()))
   .sort((a,b)=>dayOf(b).localeCompare(dayOf(a))||b.updated_at-a.updated_at);
  return matches.length?<ul className="space-y-2">{matches.map(row=><li className={surface} key={row.id}>
   <button className="min-h-11 w-full break-words text-left font-semibold" type="button" onClick={()=>setEdit(row)}>{str(row,"title")||labels[kind]}</button>{details(row)}
  </li>)}</ul>:<p className={surface}>尚無{labels[kind]}紀錄。</p>;
 };
 const point=(date:string)=>{
  const data=totals(safe,date,civilAdvance(date,"day",1));
  return Object.hasOwn(body,trend)?latest(safe.filter(row=>dayOf(row)===date),trend,date):
   trend==="water"?data.water:trend==="sleep"?data.sleep:trend==="minutes"?data.minutes:trend==="distance"?data.distance:trend==="lift"?data.lift:data.nutrients[trend]?.amount??null;
 };
 const trendGroup=(key:string)=>key==="distance"||key==="lift"?"exercise":metricGroup(key);
 const points=enabled(trendGroup(trend))?Array.from({length:14},(_,index)=>{const date=civilAdvance(day,"day",index-13);return {date,amount:point(date)};}):[];
 const max=Math.max(1,...points.map(item=>item.amount??0));
 const taskLink=(row:HealthRecord)=>tasks.some(task=>task.id===row.data.task)?element("開啟關聯任務",()=>taskOpen(str(row,"task"))):null;
 return <section className="min-w-0 space-y-4" aria-label="健康管理">
  <header className="flex flex-wrap items-end justify-between gap-3"><h2 className="text-2xl font-semibold">健康管理</h2><div className="flex flex-wrap gap-2">
   <label className="grid gap-1 text-sm">紀錄日期<input type="date" className={control} value={day} onChange={event=>event.target.value&&setDay(event.target.value)}/></label>
   <label className="grid gap-1 text-sm">統計期間<select className={control} value={period} onChange={event=>setPeriod(event.target.value as Period)}><option value="day">日</option><option value="week">週</option><option value="month">月</option></select></label></div></header>
  <nav aria-label="健康功能" className="flex gap-1 overflow-x-auto rounded-xl bg-[var(--color-panel-bg)] p-1">
   {Object.entries({overview:"健康總覽",...groups,foods:"常用食品",privacy:"隱私與資料"}).filter(([key])=>key==="foods"?enabled("diet"):!Object.hasOwn(groups,key)||enabled(key as Group)).map(([key,label])=>
    <button key={key} type="button" aria-pressed={active===key} className={"min-h-11 shrink-0 rounded-lg px-3 text-sm "+(active===key?"bg-zinc-500/15 font-semibold":"")} onClick={()=>{setQuery("");setTab(key);}}>{label}</button>)}</nav>
  {error&&<p role="alert">{error}</p>}
  {active==="overview"&&<>
   <div className="rounded-3xl bg-[#2e483c] p-6 text-white"><h3 className="mb-3 text-xl font-semibold">健康摘要</h3><dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
    {enabled("body")&&<div><dt>最新體重</dt><dd className="text-lg font-semibold">{value(latest(safe,"weight",day),"kg")}</dd></div>}
    {enabled("diet")&&<><div><dt>期間熱量</dt><dd className="text-lg font-semibold">{value(summary.nutrients.kcal.amount,"kcal")}{summary.nutrients.kcal.missing?"（部分）":""}</dd></div>
     <div><dt>期間飲水</dt><dd className="text-lg font-semibold">{value(summary.water,"ml")}</dd></div></>}
    {enabled("sleep")&&<div><dt>平均睡眠</dt><dd className="text-lg font-semibold">{value(summary.sleep,"小時")}</dd></div>}
   </dl></div>
   <div className="flex flex-wrap gap-2">{(["body","goal","meal","water","exercise","sleep"] as const).filter(kind=>enabled(kindGroup[kind])).map(kind=>
    <button key={kind} className={control} type="button" onClick={()=>start(kind)}>新增{labels[kind]}</button>)}</div>
   {enabled("exercise")&&<div className={surface}>期間運動 {value(summary.sessions,"次")} ・{value(summary.minutes,"分鐘")}</div>}
   {enabled("cycle")&&cycle.records.length>0&&<p className={surface}>經期 · 最近開始 {str(cycle.records.at(-1)!,"date")}</p>}
   {enabled("medication")&&safe.some(row=>medicationDue(row,day))&&<p className={surface}>用藥 · 當日有預定事項</p>}
   {enabled("goal")&&<GoalList rows={safe} day={day} open={setEdit}/>}
   <section className={surface+" space-y-3"}><h3 className="font-semibold">近 14 日趨勢</h3><select aria-label="趨勢指標" className={control} value={trend} onChange={event=>setTrend(event.target.value)}>
    {[...Object.keys(body),"kcal","water","sleep","minutes","distance","lift"].filter(key=>enabled(trendGroup(key))).map(key=><option key={key} value={key}>{metrics[key as keyof typeof metrics]??(key==="distance"?"運動距離":"運動重量")}</option>)}</select>
    {points.some(point=>point.amount!==null)?<><div className="grid h-24 grid-cols-14 items-end gap-1" aria-hidden="true">{points.map(item=>
     <span className={item.amount===null?"h-px bg-zinc-500/25":"rounded-t bg-emerald-600/65"} key={item.date} style={item.amount===null?{}:{height:Math.max(2,item.amount/max*100)+"%"}}/>)}</div>
     <details><summary>檢視每日數值</summary>{points.map(item=><p key={item.date}>{item.date} · {value(item.amount)}</p>)}</details></>:<p>尚無這項數據。</p>}
   </section>
  </>}
  {active==="body"&&<>{element("新增身體數據",()=>start("body"))}<dl className={surface+" grid grid-cols-2 gap-3 sm:grid-cols-3"}>
   {Object.entries(body).map(([key,label])=><div key={key}><dt>{label}</dt><dd className="font-semibold">{value(latest(safe,key,day))}</dd></div>)}
   <div><dt>BMI</dt><dd className="font-semibold">{value(bmi(safe,day))}</dd></div></dl>
   {list("body",row=><p>{dayOf(row)} · {Object.entries(body).filter(([key])=>row.data[key]!==undefined).map(([key,label])=>label+" "+row.data[key]).join(" ・")}</p>)}</>}
  {active==="goal"&&<>{element("新增健康目標",()=>start("goal"))}<GoalList rows={safe} day={day} open={setEdit}/></>}
  {active==="diet"&&<>
   <div className="flex flex-wrap gap-2">{element("新增飲食",()=>start("meal"))}{element("新增飲水",()=>start("water"))}{element("常用食品",()=>setTab("foods"))}
    {String(privacy.presets??"150,250,500").split(",").map(Number).filter(amount=>amount>0).map(amount=>
     <button key={amount} type="button" className={control} disabled={busy} onClick={async()=>{setBusy(true);try{await repository.saveHealth(makeHealth(owner,"water",{date:day,time:new Date().toTimeString().slice(0,5),amount}));}catch(error){setError(String(error));}finally{setBusy(false);}}}>記錄 {amount} ml</button>)}</div>
   <dl className={surface+" grid grid-cols-2 gap-3 sm:grid-cols-4"}>{Object.entries(nutrition).map(([key,label])=><div key={key}><dt>{label}</dt><dd>{value(summary.nutrients[key].amount)}{summary.nutrients[key].missing?"（"+summary.nutrients[key].missing+" 項未填）":""}</dd></div>)}<div><dt>飲水（ml）</dt><dd>{value(summary.water)}</dd></div></dl>
   {list("meal",row=><div><p>{dayOf(row)} {str(row,"time")} · {str(row,"meal")} ・{row.data.items?.map(item=>item.title).join("、")}</p>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    {row.data.image&&<img alt="餐點紀錄" className="max-h-32 rounded-lg object-cover" src={str(row,"image")}/>}</div>)}
   {list("water",row=><p>{dayOf(row)} {str(row,"time")} · {str(row,"amount")} ml</p>)}
  </>}
  {active==="foods"&&<>
   <div className="flex flex-wrap gap-2">{element("新增常用食品",()=>start("food"))}{element("新增常用餐點",()=>start("recipe"))}
    <input aria-label="搜尋食品及餐點" type="search" className={control} value={query} onChange={event=>setQuery(event.target.value)}/></div>
   {list("food",row=><p>{row.data.archived?"已封存 · ":""}{value(num(row.data,"kcal"),"kcal")} ／{row.data.unit==="份"?"份":"100 "+row.data.unit}</p>,true)}
   {list("recipe",row=><p>{row.data.archived?"已封存 · ":""}{row.data.items?.length} 個項目</p>,true)}
  </>}
  {active==="exercise"&&<>
   <div className="flex flex-wrap gap-2">{element("新增運動計畫",()=>start("plan"))}{element("新增運動紀錄",()=>start("exercise"))}
    <input aria-label="篩選運動名稱" type="search" className={control} value={query} onChange={event=>setQuery(event.target.value)}/></div>
   <div className={surface}>完成 {value(summary.sessions,"次")} ・{value(summary.minutes,"分鐘")} ・{value(summary.distance,"km")}</div>
   {list("plan",row=><div className="space-y-2"><p>{dayOf(row)} · {str(row,"time")} · 預計 {str(row,"minutes")} 分鐘{row.data.weekdays?" · 每週 "+str(row,"weekdays").split("").map(value=>"日一二三四五六"[Number(value)]).join("、"):""}</p>
    {planOn(row,day)&&element("記錄實際完成",()=>start("exercise",{title:row.data.title,minutes:row.data.minutes,time:row.data.time,task:row.data.task,planId:row.id}))} {taskLink(row)}</div>,true)}
   {list("exercise",row=><div><p>{dayOf(row)} {str(row,"time")} · {str(row,"minutes")} 分鐘{row.data.distance!==undefined?" · "+row.data.distance+" km":""}{row.data.lift!==undefined?" · "+row.data.lift+" kg":""}</p>{taskLink(row)}</div>)}
  </>}
  {active==="sleep"&&<>{element("新增睡眠",()=>start("sleep"))}<div className={surface}>期間平均 {value(summary.sleep,"小時")}</div>
   {list("sleep",row=><p>{row.data.nap?"午睡":"睡眠"} · {str(row,"start")} 至 {str(row,"end")} · {value(duration(row),"小時")} · 品質 {str(row,"quality")}/5</p>)}</>}
  {active==="cycle"&&<>
   {element("新增經期紀錄",()=>start("cycle"))}
   <section className={surface+" space-y-2"}><p>平均週期 {value(cycle.cycle,"天")} · 平均經期 {value(cycle.duration,"天")}</p>
    <p>下次估計 {cycle.next??"至少需要三次不同的開始日期"}</p>
    <p className="text-sm">估計日期僅供個人紀錄參考。</p>
    <h3 className="font-semibold">{day.slice(0,7)} 經期月曆</h3>
    <div className="grid grid-cols-7 gap-1">{Array.from({length:new Date(Number(day.slice(0,4)),Number(day.slice(5,7)),0).getDate()},(_,index)=>{
      const date=day.slice(0,8)+String(index+1).padStart(2,"0");
      const recorded=cycle.records.some(row=>str(row,"date")<=date&&date<=(str(row,"until")||str(row,"date")));
      const label=recorded?"已記錄":date===cycle.next?"估計開始":"";
      return <button key={date} type="button" className={control+(recorded?" bg-emerald-600/20":label?" border-dashed":"")} aria-label={date+" "+label} onClick={()=>setDay(date)}>{index+1}</button>;
    })}</div></section>
   {list("cycle",row=><p>{str(row,"date")} 至 {str(row,"until")||"尚未填寫結束日期"} · {str(row,"symptoms")}</p>,true)}
  </>}
  {active==="medication"&&<>
   {element("新增用藥項目",()=>start("medication",{meal:"",unit:"",frequency:"daily"}))}
   {list("medication",row=>{
     const due=medicationDue(row,day), stock=medicationStock(row,safe);
     const done=scheduledDose(safe,row,day);
     const expiry=str(row,"expiry");
     return <div className="space-y-2"><p>{str(row,"quantity")} {str(row,"unit")} · {str(row,"meal")}</p>
       {stock!==null&&<p>剩餘庫存 {value(stock,str(row,"unit"))}{stock<=0?" · 庫存不足":""}</p>}
       {expiry&&<p>有效期限 {expiry}{expiry<day?" · 已到期":expiry<=civilAdvance(day,"day",7)?" · 即將到期":""}</p>}
       {due&&!done&&<p>當日待記錄 · {str(row,"time")}</p>}
       {due&&done&&element("查看當日服用紀錄",()=>setEdit(done))}
       {(due&&!done||row.data.frequency==="asNeeded")&&element("新增服用紀錄",()=>{
         const data={date:day,actual:day+"T"+new Date().toTimeString().slice(0,5),medication:row.id,title:str(row,"title"),status:"taken",quantity:row.data.quantity,planned:due?row.data.time:""};
         setEdit(makeHealth(owner,"dose",data));
       })}
     </div>;
   },true)}
   <h3 className="font-semibold">歷史服用紀錄</h3>
   {list("dose",row=><p>{str(row,"date")} · {{taken:"已服用",missed:"未服用",skipped:"略過"}[str(row,"status")]} · {str(row,"actual").replace("T"," ")}</p>,true)}
  </>}
  {active==="privacy"&&<div className={surface+" space-y-4"}><p>健康資料預設僅在健康管理顯示。</p>
   <fieldset disabled={busy} className="space-y-2"><legend>子功能與跨頁顯示</legend>
    {Object.entries(groups).map(([key,label])=><div key={key} className="flex flex-wrap gap-4">
     <label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={enabled(key as Group)} onChange={event=>void change({["off_"+key]:!event.target.checked})}/>啟用{label}</label>
     <label className="flex min-h-11 items-center gap-2"><input type="checkbox" disabled={!enabled(key as Group)} checked={enabled(key as Group)&&privacy["share_"+key]===true}
      onChange={event=>void change({["share_"+key]:event.target.checked})}/>允許顯示{label}摘要</label></div>)}
    <label className="flex min-h-11 items-center gap-2"><input type="checkbox" disabled={!enabled("exercise")} checked={enabled("exercise")&&privacy.calendar===true}
     onChange={event=>void change({calendar:event.target.checked})}/>在行事曆顯示運動</label>
    <label className="flex min-h-11 items-center gap-2"><input type="checkbox" disabled={!enabled("goal")} checked={enabled("goal")&&privacy.habits===true}
     onChange={event=>void change({habits:event.target.checked})}/>在習慣頁顯示已授權的關聯健康目標</label></fieldset>
   <div className="flex flex-wrap gap-4">{([["cycle","calendarCycle","經期"],["medication","calendarMedication","服用提醒"]] as const).map(([group,key,label])=><label key={key} className="flex min-h-11 items-center gap-2">
    <input type="checkbox" disabled={busy||!enabled(group)} checked={enabled(group)&&privacy[key]===true} onChange={event=>void change({[key]:event.target.checked})}/>在行事曆顯示{label}</label>)}</div>
   <form className="flex flex-wrap items-end gap-2" onSubmit={event=>{event.preventDefault();const values=[...new Set(String(new FormData(event.currentTarget).get("water")).split(/[,，\s]+/).filter(Boolean).map(Number))];
    if(values.length>10||values.some(value=>!Number.isFinite(value)||value<=0)){setError("請輸入最多 10 個正數");return;}void change({presets:values.join(",")});}}>
    <label className="grid gap-1">常用飲水容量（ml，以逗號分隔）<input className={control} name="water" defaultValue={String(privacy.presets??"150,250,500")}/></label>
    <button disabled={busy} className={control}>儲存容量</button></form>
   {element("匯出我的健康資料",()=>downloadJsonFile("nexus-health-"+day+".json",{version:1,records:rows.map(({id,kind,data,created_at,updated_at})=>({id,kind,data,created_at,updated_at}))}))}
  </div>}
  {edit&&edit.kind!=="privacy"&&enabled(kindGroup[edit.kind])&&<Editor key={edit.id} row={edit} rows={safe} tasks={tasks} habits={habits} close={()=>setEdit(undefined)} save={(row,remove)=>repository.saveHealth(row,remove)}/>}
 </section>;
}
