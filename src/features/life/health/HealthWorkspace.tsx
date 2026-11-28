import { useEffect, useRef, useState } from "react";
import { Activity, CalendarDays, ChevronLeft, ChevronRight, Droplets, Moon, Pencil, Plus, Scale, Settings, Utensils } from "lucide-react";
import { localDateInput } from "../../../lib/todoCalendar";
import AddMenu from "../AddMenu";
import { useUnsavedDraft } from "../../dictionary/useUnsavedDraft";
import ModalDialog from "../../../components/ModalDialog";
import { confirmDialog } from "../../../lib/confirmDialog";
import { downloadJsonFile } from "../../../lib/fileDownload";
import type { LifeRepository } from "../LifeRepository";
import { civilAdvance } from "../civilPeriods";
import { control, surface } from "../dashboard/styles";
import { allowed, body, medicationTimes, groups, kindGroup, labels, makeHealth, metricGroup, metrics, nutrition, num, str, toItem, type Entry, type Fields, type Group, type HealthRecord, type Item } from "./model";
import { cycleSummary, doseIsDuplicate, medicationDue, medicationState, medicationStock, scheduledDose } from "./sensitive";
import { bmi, dayOf, duration, latest, latestMeasurement, planOn, progress, totals, value } from "./summary";

type Reference={id:string;title:string};
type Field=[key:string,label:string,type?:string,options?:Record<string,string>];
const overviewLabels={body:"身體",meal:"飲食",water:"飲水",exercise:"運動",sleep:"睡眠",recent:"近期紀錄"} as const;
type OverviewBlock=keyof typeof overviewLabels;
const localDay=(day:string)=>new Date(day+"T12:00:00").toLocaleDateString("zh-TW",{year:"numeric",month:"numeric",day:"numeric",weekday:"short"});
const sections = {
 overview:"總覽", body:"身體", diet:"飲食", activity:"活動與休息", medication:"照護", analysis:"分析",
} as const;
type HealthSection = keyof typeof sections;
const legacySections = {
 cycle:"body", foods:"diet", exercise:"activity", sleep:"activity", care:"medication", goal:"analysis", goals:"analysis", settings:"privacy",
} as const;
export function healthTabFromUrl(){
 if(typeof window==="undefined")return undefined;
 const key=new URLSearchParams(window.location.search).get("health");
 if(!key)return undefined;
 if(key==="privacy"||Object.hasOwn(sections,key))return key as HealthSection|"privacy";
 return Object.hasOwn(legacySections,key)?legacySections[key as keyof typeof legacySections]:undefined;
}
const sectionGroups: Partial<Record<HealthSection, Group[]>> = {
 body:["body","cycle"], diet:["diet"], activity:["exercise","sleep"], medication:["medication"],
};
const sectionEntries: Record<HealthSection, Entry[]> = {
 overview:["body","meal","water","exercise","sleep","cycle","medication","goal"],
 body:["body","cycle","goal"], diet:["meal","water","food","recipe","goal"],
 activity:["exercise","sleep","goal"], medication:["medication","goal"], analysis:["goal"],
};
const fields:Record<Entry,Field[]> = {
 cycle:[["date","經期開始","date"],["until","經期結束","date"],["flow","經血量"],["symptoms","症狀"],["pain","疼痛程度（0–10）","number"],["mood","情緒"],["temperature","基礎體溫（°C）","number"]],
 medication:[["title","名稱"],["category","類型","select",{medicine:"藥品",vitamin:"維生素",supplement:"保健食品"}],["quantity","每次數量","number"],["unit","單位"],["date","起始日期","date"],["until","結束日期","date"],["frequency","服用週期","select",{daily:"每日",weekly:"指定星期",monthly:"每月",interval:"固定間隔",asNeeded:"需要時"}],["weekdays","星期（日 0 至六 6）"],["interval","間隔（日／月）","number"],["times","預定時間（以逗號分隔，例如 08:00,20:00）"],["meal","餐前／餐後"],["stock","起始庫存","number"],["expiry","效期","date"]],
 dose:[["status","服用狀態","select",{taken:"已服用",missed:"未服用",skipped:"略過"}],["date","紀錄日期","date"],["planned","預定時間","time"],["actual","實際服用時間","datetime-local"],["quantity","實際服用數量","number"]],
 body:[["date","日期","date"],...Object.entries(body).map(([key,label]):Field=>[key,label,"number"]),["task","關聯任務","task"]],
 goal:[["title","名稱"],["metric","指標","select",metrics],["mode","方向","select",{increase:"增加",decrease:"減少",maintain:"維持範圍"}],["date","起始日期","date"],["until","目標日期","date"],["baseline","起始值","number"],["target","目標值／範圍下限","number"],["upper","範圍上限","number"],["current","自訂指標目前值","number"],["period","統計週期","select",{"":"依指標預設",day:"日",week:"週",month:"月"}],["aggregation","彙整方式","select",{"":"依指標預設",total:"累計",average:"每日平均"}],["habit","關聯習慣","habit"]],
 food:[["title","名稱"],["unit","營養標示基準","select",{g:"每 100 g",ml:"每 100 ml","份":"每份"}],["grams","一份等於幾公克","number"],["ml","一份等於幾毫升","number"],...Object.entries(nutrition).map(([key,label]):Field=>[key,label,"number"]),["archived","封存","checkbox"]],
 recipe:[["title","名稱"],["archived","封存","checkbox"]],
 meal:[["title","名稱"],["date","日期","date"],["time","時間","time"],["meal","餐別","meal"]],
 water:[["date","日期","date"],["time","時間","time"],["amount","容量（ml）","number"],["task","關聯任務","task"]],
 plan:[["title","名稱"],["date","開始日期","date"],["time","時間","time"],["minutes","預計分鐘","number"],["weekdays","重複星期（日 0 至六 6，單次留空）"],["until","重複截止日","date"],["task","關聯任務","task"]],
 exercise:[["title","名稱"],["date","日期","date"],["time","時間","time"],["type","運動類型","exerciseType"],["intensity","強度"],["minutes","實際分鐘","number"],["distance","距離（km）","number"],["lift","重量（kg）","number"],["reps","次數","number"],["sets","組數","number"],["kcal","手動消耗熱量（kcal）","number"],["task","關聯任務","task"]],
 sleep:[["start","入睡時間","datetime-local"],["end","起床時間","datetime-local"],["nap","午睡","checkbox"],["quality","品質（1–5）","number"],["wakes","夜間醒來次數","number"]],
};
const element=(label:string,action:()=>void)=><button className={control} type="button" onClick={action}>{label}</button>;
export function HealthEditor({row,rows,save,close,tasks,habits,preferences}:{row:HealthRecord;rows:HealthRecord[];save:(row:HealthRecord,remove?:boolean)=>Promise<void>;close:()=>void;tasks:Reference[];habits:Reference[];preferences:Fields}){
 const [draft,set]=useState(row.kind==="medication"?{...row.data,times:medicationTimes(row.data).join(", ")}:row.data),[busy,setBusy]=useState(false),[error,setError]=useState("");
 const dirty = JSON.stringify(draft) !== JSON.stringify(row.kind === "medication"
  ? {...row.data, times:medicationTimes(row.data).join(", ")} : row.data);
 useUnsavedDraft(dirty,busy);
 const dismiss=async()=>{if(!busy&&(!dirty||await confirmDialog({title:"捨棄修改",message:"要捨棄尚未儲存的健康紀錄嗎？"})))close();};
 const [foodQuery,setFoodQuery]=useState("");
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
 return <ModalDialog aria-label={label} busy={busy} onDismiss={()=>void dismiss()}
  className="m-auto max-h-[90dvh] w-[min(94vw,42rem)] overflow-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-5 text-[var(--color-text)] backdrop:bg-black/40">
  <h2 className="mb-4 text-xl font-semibold">{label}</h2>
  <form className="space-y-4" onSubmit={event=>{event.preventDefault();void run();}}>
   <fieldset disabled={busy} className="grid gap-3 sm:grid-cols-2">{fields[kind].map(([key,title,type,options])=><label key={key} className="grid min-w-0 gap-1 text-sm">{title}
    {options||type==="task"||type==="habit"?<select className={control} aria-label={title} value={String(draft[key]??"")} onChange={event=>write(key,event.target.value)}>
     {Object.entries(options??choices(type==="task"?tasks:habits)).map(([id,name])=><option key={id} value={id}>{String(name)}</option>)}
    </select>:type==="checkbox"?<input className="size-5" type="checkbox" checked={!!draft[key]} onChange={event=>write(key,event.target.checked)}/>:
     <input className={control} aria-label={title} list={type==="meal"||type==="exerciseType"?"health-"+type:undefined}
      type={type==="meal"||type==="exerciseType"?"text":type??"text"} step={type==="number"?"any":undefined} min={type==="number"?0:undefined} value={String(draft[key]??"")}
      onChange={event=>write(key,type==="number"?event.target.value===""?undefined:event.target.valueAsNumber:event.target.value)}/>}
   </label>)}</fieldset>
   {kind==="meal"&&<datalist id="health-meal">{String(preferences.mealTypes??"早餐、午餐、晚餐、點心").split(/[、,，]/).map(value=><option key={value} value={value}/>)}</datalist>}
   {kind==="exercise"&&<datalist id="health-exerciseType">{String(preferences.exerciseTypes??"步行、跑步、阻力訓練、伸展").split(/[、,，]/).map(value=><option key={value} value={value}/>)}</datalist>}
   {(kind==="meal"||kind==="recipe")&&<fieldset className="space-y-3 rounded-xl border border-[var(--color-border)] p-3">
    <legend>食品與份量</legend>
    <ul>{items.map((item,index)=><li className="flex flex-wrap items-center justify-between gap-2" key={index}>{item.title} · {item.amount} {item.unit} · {value(item.values.kcal??null,"kcal")}
     {element("移除",()=>write("items",items.filter((_,i)=>i!==index)))}</li>)}</ul>
    <div className="flex flex-wrap items-end gap-2">
     <label className="grid gap-1">搜尋常用食品<input type="search" className={control} value={foodQuery} onChange={event=>setFoodQuery(event.target.value)}/></label>
     <label className="grid gap-1">常用食品<select aria-label="常用食品" className={control} value={food} onChange={event=>{
      const id=event.target.value;
      setFood(id);
      const title=rows.find(item=>item.id===id)?.data.title;
      const snapshot=rows.filter(item=>item.kind==="meal").sort((a,b)=>b.updated_at-a.updated_at)
       .flatMap(item=>item.data.items??[]).find(item=>item.title===title);
      if(snapshot){setAmount(String(snapshot.amount));setUnit(snapshot.unit);}
     }}><option value="">選擇食品</option>
      {rows.filter(item=>item.kind==="food"&&!item.data.archived&&str(item,"title").toLowerCase().includes(foodQuery.toLowerCase())).map(item=><option key={item.id} value={item.id}>{str(item,"title")}</option>)}</select></label>
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
   <div className="flex gap-2"><button className={control} disabled={busy}>儲存</button>{element("取消",()=>void dismiss())}
    {!!row.revision&&<button className={control} disabled={busy} type="button" onClick={async()=>{
     if(await confirmDialog({title:"永久刪除健康紀錄",message:"確定永久刪除這筆健康紀錄？",danger:true}))await run(true);
    }}>刪除</button>}</div>
  </form>
 </ModalDialog>;
}
export function GoalList({rows,day,open,linked,addWater,group}:{rows:HealthRecord[];day:string;open:(row:HealthRecord)=>void;linked?:Reference[];addWater?:()=>void;group?:Group}){
 return <div className="grid gap-3 sm:grid-cols-2">{rows.filter(row=>row.kind==="goal"&&(!group||metricGroup(str(row,"metric"))===group)&&(!linked||linked.some(item=>item.id===row.data.habit))).map(row=>{
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
function RestingEnergyEstimate({height,weight}:{height:number|null;weight:number|null}){
 const [age,setAge]=useState("");
 const [coefficient,setCoefficient]=useState("");
 const years=Number(age);
 const estimate=height&&weight&&Number.isInteger(years)&&years>=19&&years<=78&&coefficient
  ? Math.round(10*weight+6.25*height-5*years+Number(coefficient)):null;
 return <details className={surface}><summary>選用估算 · 靜息能量消耗</summary>
  <p className="my-2 text-sm">Mifflin–St Jeor 公式使用最新身高與體重。估算結果以 kcal／日顯示，與手動基礎代謝率紀錄分開。</p>
  <div className="flex flex-wrap gap-2"><label className="grid gap-1">年齡（19–78 歲）
   <input className={control} type="number" min={19} max={78} value={age} onChange={event=>setAge(event.target.value)}/></label>
   <label className="grid gap-1">公式係數<select className={control} value={coefficient} onChange={event=>setCoefficient(event.target.value)}>
    <option value="">請選擇</option><option value="5">男性公式</option><option value="-161">女性公式</option>
   </select></label></div>
  <p className="my-2">{estimate===null?"請確認身高、體重、年齡及公式選項。":estimate+" kcal／日（估算）"}</p>
  <a href="https://pubmed.ncbi.nlm.nih.gov/2305711/" target="_blank" rel="noreferrer" className="underline">公式來源</a>
 </details>;
}

export default function HealthWorkspace({rows,owner,day:initial,taskOpen,tasks,habits,repository,focused,plannedTime,taskFocus,planExercise}:{
 rows:HealthRecord[];owner:string|null;day:string;taskOpen:(id:string)=>void;tasks:Reference[];habits:Reference[];repository:LifeRepository;focused?:string;plannedTime?:string;taskFocus?:{id:string;kind:"water"|"body"|"exercise"};planExercise?:(day:string)=>void;
}){
 const focusRow=rows.find(row=>row.id===focused);
 const focusGroup=focusRow?.kind && focusRow.kind!=="privacy"?kindGroup[focusRow.kind]:undefined;
 const [tab,setTab]=useState<HealthSection|"privacy">(()=>focusGroup==="medication"?"medication":
  focusGroup==="cycle"||focusGroup==="body"?"body":focusGroup==="exercise"||focusGroup==="sleep"?"activity":
  focusGroup==="diet"||focused==="new-water"?"diet":healthTabFromUrl()??"overview");
 const [day,setDay]=useState(initial),[period,setPeriod]=useState(7),[query,setQuery]=useState("");
 const [custom,setCustom]=useState({from:"",to:""});
 const [waterManage,setWaterManage]=useState(false);
 const [shortcut,setShortcut]=useState<number>();
 const [allRecords,setAllRecords]=useState(false);
 const [undo,setUndo]=useState<{row:HealthRecord; action:"create"|"delete"}>();
 const [replacedPlan,setReplacedPlan]=useState<HealthRecord>();
 const navigation=useRef<HTMLElement>(null);
 const today=localDateInput(new Date());
 const [edit,setEdit]=useState(()=>{
  const clock=new Date().toTimeString().slice(0,5);
  if(taskFocus)return makeHealth(owner,taskFocus.kind,{date:initial,time:clock,amount:250,minutes:30,task:taskFocus.id});
  if(focused==="new-water")return makeHealth(owner,"water",{date:initial,time:clock,amount:250});
  if(focusRow?.kind==="plan"&&planOn(focusRow,initial)){
   return rows.find(row=>row.kind==="exercise"&&row.data.planId===focusRow.id&&dayOf(row)===initial)??makeHealth(owner,"exercise",{date:initial,title:focusRow.data.title,minutes:focusRow.data.minutes,time:focusRow.data.time,task:focusRow.data.task,planId:focusRow.id});
  }
  if(focusRow?.kind==="medication"&&plannedTime&&medicationDue(focusRow,initial)&&medicationTimes(focusRow.data).includes(plannedTime)){
   return scheduledDose(rows,focusRow,initial,plannedTime)??makeHealth(owner,"dose",{date:initial,actual:initial+"T"+clock,
    medication:focusRow.id,title:str(focusRow,"title"),status:"taken",quantity:focusRow.data.quantity,planned:plannedTime});
  }
  return focusRow;
 });
 const [error,setError]=useState(""),[busy,setBusy]=useState(false),[trend,setTrend]=useState("weight");
 const [foodLibrary,setFoodLibrary]=useState(()=>typeof window!=="undefined"&&new URLSearchParams(window.location.search).get("health")==="foods");
 const [activityView,setActivityView]=useState<"all"|"exercise"|"sleep">("all");
 const [careView,setCareView]=useState<"today"|"plans"|"history">("today");
 const pref=rows.find(row=>row.kind==="privacy"),privacy=pref?.data??{},enabled=(group:Group)=>allowed(privacy,group);
 const safe=rows.filter(row=>row.kind!=="privacy"&&enabled(kindGroup[row.kind])&&(row.kind!=="goal"||enabled(metricGroup(str(row,"metric")))));
 const active=tab==="privacy"||!sectionGroups[tab]||sectionGroups[tab].some(enabled)?tab:"overview";
 useEffect(()=>{
  const current=navigation.current?.querySelector<HTMLButtonElement>('[aria-pressed="true"]');
  const nav=navigation.current;
  if(current&&nav){
   const selected=current.getBoundingClientRect(),frame=nav.getBoundingClientRect();
   if(selected.left<frame.left)nav.scrollLeft+=selected.left-frame.left;
   else if(selected.right>frame.right)nav.scrollLeft+=selected.right-frame.right;
  }
 },[active]);
 const cycle=cycleSummary(safe);
 const displayWeight=(amount:number|null)=>privacy.weightUnit==="lb"?value(amount===null?null:amount/0.45359237,"lb"):value(amount,"kg");
 const displayDistance=(amount:number|null)=>privacy.distanceUnit==="mi"?value(amount===null?null:amount/1.609344,"mi"):value(amount,"km");
 const visibleBlock=(key:OverviewBlock)=>privacy["overview_"+key]!==false;
 const quick=(key:OverviewBlock)=>privacy["quick_"+key]!==false;
 const customValid=period===0&&custom.from&&custom.to&&custom.from<=custom.to;
 const useCustom=active==="analysis"&&customValid;
 const rangeEnd=useCustom?custom.to:day;
 const to=civilAdvance(rangeEnd,"day",1);
 const from=useCustom?custom.from:civilAdvance(day,"day",1-(period||7));
 const summary=totals(safe,active==="overview"?day:from,to);
 const dayRows=summary.period.filter(row=>dayOf(row)===day);
 const selectedPeriod=active==="overview"?7:Math.round((Date.parse(to)-Date.parse(from))/86400000);
 const visiblePoints=active==="overview"||active==="analysis"&&(period!==0||customValid);
 const start=(kind:Entry,patch:Fields={})=>setEdit(makeHealth(owner,kind,{date:day,time:new Date().toTimeString().slice(0,5),quantity:1,frequency:"daily",interval:1,category:"medicine",unit:"份",metric:"weight",mode:"decrease",until:kind==="goal"?civilAdvance(day,"day",30):"",
  start:civilAdvance(day,"day",-1)+"T23:00",end:day+"T07:00",quality:3,meal:"早餐",amount:250,minutes:30,...patch}));
 const change=async(patch:Fields)=>{
  if(busy)return;setBusy(true);setError("");
  try{await repository.saveHealth(pref?{...pref,data:{...privacy,...patch}}:makeHealth(owner,"privacy",patch));}
  catch(error){setError(error instanceof Error?error.message:"儲存失敗");return false;}finally{setBusy(false);}
  return true;
 };
 const list=(kind:Entry,details:(row:HealthRecord)=>React.ReactNode,all=false,match:(row:HealthRecord)=>boolean=()=>true)=>{
  const matches=(all?safe:summary.period).filter(row=>row.kind===kind&&match(row)&&str(row,"title").toLowerCase().includes(query.toLowerCase()))
   .sort((a,b)=>dayOf(b).localeCompare(dayOf(a))||b.updated_at-a.updated_at);
  return matches.length?<ul className="divide-y divide-[var(--color-border)]">{matches.map(row=><li className="py-2" key={row.id}>
   <button className="min-h-11 w-full break-words text-left font-semibold" type="button" onClick={()=>setEdit(row)}>{str(row,"title")||labels[kind]}</button>{details(row)}
  </li>)}</ul>:<p className={surface}>尚無{labels[kind]}紀錄。</p>;
 };

 const byDay=new Map<string,HealthRecord[]>();
 for(const row of safe){
  const date=dayOf(row);
  const entries=byDay.get(date);
  if(entries)entries.push(row);
  else byDay.set(date,[row]);
 }
 const point=(date:string)=>{
  const entries=byDay.get(date)??[];
  const data=totals(entries,date,civilAdvance(date,"day",1));
  return Object.hasOwn(body,trend)?latest(entries,trend,date):
   trend==="care"?entries.filter(row=>row.kind==="dose"&&row.data.status==="taken"&&!doseIsDuplicate(row,safe)).length||null:
   trend==="quality"?data.sleepQuality:trend==="sessions"?data.sessions:trend==="water"?data.water:trend==="sleep"?data.sleep:trend==="minutes"?data.minutes:trend==="distance"?data.distance:trend==="lift"?data.lift:data.nutrients[trend]?.amount??null;
 };
 const trendGroup=(key:string)=>key==="care"?"medication":key==="quality"?"sleep":key==="distance"||key==="lift"?"exercise":metricGroup(key);
 const points=visiblePoints&&enabled(trendGroup(trend))?Array.from({length:Math.min(selectedPeriod,366)},(_,index)=>{
  const count=Math.min(selectedPeriod,366),offset=Math.floor(index*(selectedPeriod-1)/Math.max(1,count-1));
  const date=civilAdvance(active==="overview"?civilAdvance(day,"day",-6):from,"day",offset);
  return {date,amount:point(date)};
 }):[];
 const max=Math.max(1,...points.map(item=>item.amount??0));
 const taskLink=(row:HealthRecord)=>tasks.some(task=>task.id===row.data.task)?element("開啟關聯任務",()=>taskOpen(str(row,"task"))):null;
 const goalFor=(group:Group)=>enabled("goal")&&<GoalList rows={safe} day={day} open={setEdit} group={group}/>;
 const waterPresets=[num(privacy,"waterShortcut1"),num(privacy,"waterShortcut2")];
 const waterValue=(amount:number|null)=>privacy.waterUnit==="L"?value(amount===null?null:amount/1000,"L"):value(amount,"mL");
 const logWater=async(amount:number)=>{
  if(busy)return;
  setBusy(true);setError("");
  try{
   const row=makeHealth(owner,"water",{date:day,time:new Date().toTimeString().slice(0,5),amount});
   await repository.saveHealth(row);
   setUndo({row,action:"create"});
  }
  catch(error){setError(error instanceof Error?error.message:String(error));}
  finally{setBusy(false);}
 };
 const waterActions=<div className="flex flex-wrap gap-1">
  <button type="button" className={control+" px-2"} aria-label="新增飲水" onClick={()=>start("water",{amount:undefined})}><Plus size={16}/></button>
  {waterPresets.map((amount,index)=><button key={index} type="button" className={control+" px-2"} disabled={busy}
   aria-label={amount?"記錄 "+amount+" mL":"設定飲水快捷 "+(index+1)}
   onClick={()=>amount?void logWater(amount):setShortcut(index+1)}>{amount?"＋"+waterValue(amount):"＋自訂"}</button>)}
  <button type="button" className={control+" px-2"} aria-label="管理飲水" onClick={()=>setWaterManage(true)}><Pencil size={16}/></button>
 </div>;
 const cards=["water","meal","exercise","sleep","body"] as const;
 const order=[...new Set([...String(privacy.overviewOrder??"").split(",").filter((key):key is typeof cards[number]=>cards.some(card=>card===key)),...cards])];
 const icons={water:Droplets,meal:Utensils,exercise:Activity,sleep:Moon,body:Scale};
 const bodyMetric=Object.hasOwn(body,String(privacy.overviewBodyMetric))?String(privacy.overviewBodyMetric):"weight";
 const bodyEntry=latestMeasurement(safe,bodyMetric,day);
 const waterGoals=safe.filter(row=>row.kind==="goal"&&row.data.metric==="water");
 const history=safe.filter(row=>dayOf(row)&&(!["goal","plan","medication"].includes(row.kind))&&dayOf(row)<=day&&(allRecords||dayOf(row)>=civilAdvance(day,"day",-6)))
  .sort((a,b)=>dayOf(b).localeCompare(dayOf(a))||b.created_at-a.created_at);
 const recent=allRecords?history:history.slice(0,5);
 const metricValue=(kind:typeof cards[number],records:HealthRecord[],date:string)=>{
  const summary=totals(records,date,civilAdvance(date,"day",1));
  return kind==="water"?summary.water:kind==="meal"?summary.nutrients.kcal.amount:kind==="exercise"?summary.minutes:
   kind==="sleep"?summary.sleep:latest(records,bodyMetric,date);
 };
 const historyLabel=(row:HealthRecord)=>{
  const stats=totals([row],dayOf(row),civilAdvance(dayOf(row),"day",1));
  return row.kind==="water"?waterValue(stats.water):row.kind==="meal"?value(stats.nutrients.kcal.amount,"kcal"):
   row.kind==="sleep"?value(duration(row),"小時"):row.kind==="exercise"?value(stats.minutes,"分鐘"):
   row.kind==="body"?Object.entries(body).filter(([key])=>num(row.data,key)!==null).slice(0,2).map(([key,label])=>label+" "+num(row.data,key)).join(" · "):"";
 };
 const goalsWithProgress=safe.filter(row=>row.kind==="goal"&&str(row,"date")<=rangeEnd&&str(row,"until")>=from).map(row=>progress(safe,row,rangeEnd).ratio);
 const knownGoals=goalsWithProgress.filter(ratio=>ratio!==null);
 const careLogs=active==="analysis"?summary.period.filter(row=>row.kind==="dose"&&!doseIsDuplicate(row,safe)):[];
 const careStatus=(dose?:HealthRecord,time="")=>dose?({taken:"已執行",missed:"未執行",skipped:"已跳過"}[str(dose,"status")]??"已記錄"):day<today||day===today&&time&&time<=new Date().toTimeString().slice(0,5)?"待確認":"預定";
 const changeCare=async(row:HealthRecord,state:"paused"|"active"|"ended")=>{
  if(busy||!await confirmDialog({title:{paused:"暫停計畫",active:"恢復計畫",ended:"終止計畫"}[state],message:"變更自今天起生效，保留既有服用紀錄。"}))return;
  setBusy(true);setError("");
  try{
   const lifecycle=(Array.isArray(row.data.lifecycle)?row.data.lifecycle.map(String):[]).filter(event=>event.slice(0,10)<today);
   await repository.saveHealth({...row,data:{...row.data,lifecycle:[...lifecycle,today+":"+state]}});
  }catch(error){setError(error instanceof Error?error.message:String(error));}
  finally{setBusy(false);}
 };
 const startFuturePlan=(row:HealthRecord)=>{
  setReplacedPlan(row);
  const next=civilAdvance(today,"day",1);
  setEdit(makeHealth(owner,"medication",{...row.data,date:next,lifecycle:[],stock:undefined}));
 };
 const openDose=(row:HealthRecord,time:string,dose?:HealthRecord)=>setEdit(dose??makeHealth(owner,"dose",{
  date:day,actual:day+"T"+new Date().toTimeString().slice(0,5),medication:row.id,title:str(row,"title"),status:"taken",quantity:row.data.quantity,planned:time,
 }));
 return <section className="min-w-0 space-y-3" aria-label="健康管理">
  <header className="flex flex-wrap items-center gap-2">
   <div className="flex min-w-0 items-center gap-1">
   <button type="button" aria-label="前一天" className={control+" px-2"} onClick={()=>setDay(civilAdvance(day,"day",-1))}><ChevronLeft size={16}/></button>
   <label className={control+" relative inline-flex items-center gap-2 whitespace-nowrap focus-within:ring-2"}>
    <span aria-hidden="true">{day.slice(5,7).replace(/^0/,"")+" 月 "+day.slice(8).replace(/^0/,"")+" 日 "+new Date(day+"T12:00:00").toLocaleDateString("zh-TW",{weekday:"short"})}</span><CalendarDays size={16} aria-hidden="true"/>
    <input aria-label="紀錄日期" type="date" lang="zh-TW" className="absolute inset-0 size-full cursor-pointer opacity-0"
     value={day} onChange={event=>event.target.value&&setDay(event.target.value)}/>
   </label>
   <button type="button" aria-label="後一天" className={control+" px-2"} onClick={()=>setDay(civilAdvance(day,"day",1))}><ChevronRight size={16}/></button>
   {day!==today&&<button type="button" className={control} onClick={()=>setDay(today)}>今天</button>}</div>
   {active!=="overview"&&active!=="privacy"&&<select aria-label="統計期間" className={control} value={period}
    onChange={event=>setPeriod(Number(event.target.value))}>{[7,30,90,365].map(value=><option key={value} value={value}>{value===365?"一年":value+" 日"}</option>)}{active==="analysis"&&<option value={0}>自訂期間</option>}</select>}
   {active!=="privacy"&&<AddMenu iconOnly items={[
    ...sectionEntries[active].filter(kind=>enabled(kindGroup[kind])).map(kind=>({
     label:"新增"+labels[kind],action:()=>start(kind,kind==="medication"?{unit:""}:kind==="goal"&&active==="medication"?{metric:"care",mode:"increase"}:{})
    })),
    ...(active==="activity"&&enabled("exercise")&&planExercise?[{label:"安排運動任務",action:()=>planExercise(day)}]:[]),
   ]}/>}
   <button type="button" className={control+" ml-auto"} aria-label="隱私與資料" aria-pressed={active==="privacy"}
    onClick={()=>setTab(active==="privacy"?"overview":"privacy")}><Settings size={17}/></button>
  </header>
  <nav ref={navigation} aria-label="健康功能" className="flex gap-1 overflow-x-auto rounded-xl bg-[var(--color-panel-bg)] p-1">
   {(Object.keys(sections) as HealthSection[]).filter(key=>!sectionGroups[key]||sectionGroups[key].some(enabled)).map(key=>
    <button key={key} type="button" aria-pressed={active===key} className={"min-h-11 flex-1 shrink-0 whitespace-nowrap rounded-lg px-3 text-sm "+(active===key?"bg-zinc-500/15 font-semibold":"")}
     onClick={()=>{setQuery("");setFoodLibrary(false);setTab(key);}}>{sections[key]}</button>)}</nav>
  {error&&<p role="alert">{error}</p>}
  {active==="overview"&&<>
   <div className="grid items-start gap-2 sm:grid-cols-2 xl:grid-cols-3">
    {order.filter(kind=>enabled(kindGroup[kind])&&visibleBlock(kind)).map(kind=>{
     const Icon=icons[kind], group=kind==="water"||kind==="meal"?"diet":kind;
     const metric=kind==="body"?latest(safe,bodyMetric,day):metricValue(kind,dayRows,day);
     const target=kind==="body"?"body":kind==="water"||kind==="meal"?"diet":"activity";
     const inCard=(key:string)=>kind==="water"?key==="water":kind==="meal"?key!=="water"&&metricGroup(key)==="diet":metricGroup(key)===group;
     const trend=Array.from({length:7},(_,index)=>{
      const date=civilAdvance(day,"day",index-6);
      return metricValue(kind,byDay.get(date)??[],date);
     });
     const peak=Math.max(1,...trend.map(point=>point??0));
     return <section key={kind} className={surface+" grid min-w-0 gap-2 "+(kind==="water"?"border-emerald-600/35":"")}>
      <div className="flex items-center justify-between"><h3 className="flex items-center gap-2 font-semibold"><Icon size={17} className="text-emerald-700 dark:text-emerald-400"/>{overviewLabels[kind]}</h3>
       <button type="button" className="min-h-11 px-2 text-xs hover:underline" onClick={()=>{setFoodLibrary(false);setTab(target);}}>詳細</button></div>
      <p className="text-xl font-semibold tabular-nums">{kind==="water"?waterValue(metric):kind==="body"&&bodyMetric==="weight"?displayWeight(metric):
       value(metric,kind==="meal"?"kcal":kind==="exercise"?"分鐘":kind==="sleep"?"小時":"")}</p>
      {kind==="meal"&&<p className="text-xs opacity-75">{Object.entries(nutrition).filter(([key])=>key!=="kcal").flatMap(([key,name])=>{
       const entry=summary.nutrients[key];
       return entry.amount===null?[]:[name+" "+value(entry.amount)+(entry.missing?"（部分）":"")];
      }).slice(0,3).join(" · ")}</p>}
      {kind==="meal"&&dayRows.filter(row=>row.kind==="meal").map(row=><p key={row.id} className="text-xs opacity-75">{str(row,"meal")} · {str(row,"title")}</p>)}
      {kind==="exercise"&&summary.sessions!==null&&<p className="text-xs opacity-75">{summary.sessions} 次運動</p>}
      {kind==="body"&&bodyEntry&&<p className="text-xs opacity-75">{body[bodyMetric as keyof typeof body]} · {dayOf(bodyEntry)}</p>}
      {kind==="sleep"&&dayRows.filter(row=>row.kind==="sleep").map(row=><p key={row.id} className="text-xs opacity-75">{str(row,"start").replace("T"," ")} 至 {str(row,"end").replace("T"," ")} · 品質 {str(row,"quality")}/5</p>)}
      {enabled("goal")&&privacy.overviewTargets!==false&&safe.filter(row=>row.kind==="goal"&&row.data.paused!==true&&inCard(str(row,"metric"))&&str(row,"date")<=day&&str(row,"until")>=day).map(row=>{
       const ratio=progress(safe,row,day).ratio;
       return <div key={row.id} className="text-xs"><p>{str(row,"title")} · 目標 {kind==="water"?waterValue(num(row.data,"target")):str(row,"target")}</p>
        {ratio!==null&&<progress aria-label={str(row,"title")} max={100} value={ratio} className="w-full accent-emerald-600"/>}</div>;
      })}
      {privacy.overviewTrends!==false&&trend.filter(point=>point!==null).length>=2&&<div role="img" aria-label="近七日趨勢" className="flex h-5 items-end gap-1">
       {trend.map((point,index)=><span key={index} className="w-2 rounded-sm bg-emerald-600/60" style={{height:point===null?0:Math.max(8,point/peak*100)+"%"}}/>)}</div>}
      {kind==="water"?waterActions:quick(kind)&&element("新增"+labels[kind],()=>start(kind))}
     </section>;
    })}
   </div>
   {visibleBlock("recent")&&<section className={surface+" space-y-2"}><div className="flex items-center justify-between gap-2"><h3 className="font-semibold">近期紀錄</h3>
    {element(allRecords?"收合紀錄":"查看全部紀錄",()=>setAllRecords(!allRecords))}</div>
    {[...new Set(recent.map(dayOf))].map(date=><section key={date}><h4 className="text-xs opacity-75">{localDay(date)}</h4>
     <ul className="divide-y divide-[var(--color-border)]">{recent.filter(row=>dayOf(row)===date).map(row=>{
      const Icon=icons[row.kind as keyof typeof icons]??Activity;
      return <li key={row.id}><button type="button" onClick={()=>setEdit(row)} className="flex min-h-11 w-full items-center gap-2 text-left">
       <Icon size={16}/><span className="min-w-0 flex-1 truncate">{str(row,"title")||labels[row.kind as Entry]} {row.kind==="meal"&&str(row,"meal")}</span>
       <span className="text-xs opacity-75">{str(row,"time")||str(row,"end").slice(11)}</span><strong className="text-sm">{historyLabel(row)}</strong>
      </button></li>;
     })}</ul></section>)}
    {!recent.length&&<p>尚無紀錄</p>}
   </section>}
  </>}
  {active==="analysis"&&<>
   {active==="analysis"&&<>
    {period===0&&<div className="flex flex-wrap gap-1">
     <label>開始日期<input type="date" className={control} value={custom.from} onChange={event=>setCustom({...custom,from:event.target.value})}/></label>
     <label>結束日期<input type="date" className={control} value={custom.to} onChange={event=>setCustom({...custom,to:event.target.value})}/></label>
    </div>}
    <p className="text-sm">{period===0&&!customValid?"請選擇有效起訖日期":localDay(from)+" 至 "+localDay(rangeEnd)}{selectedPeriod>366?" · 圖表取樣 366 日":""}</p>
    {(period!==0||customValid)&&<dl className={surface+" grid grid-cols-2 gap-3 sm:grid-cols-4"}>
     {enabled("diet")&&<div><dt>期間飲水</dt><dd>{value(summary.water,"ml")}</dd></div>}
     {enabled("diet")&&<div><dt>期間熱量</dt><dd>{value(summary.nutrients.kcal.amount,"kcal")}{summary.nutrients.kcal.missing?"（部分）":""}</dd></div>}
     {enabled("exercise")&&<div><dt>運動時間</dt><dd>{value(summary.minutes,"分鐘")}</dd></div>}
     {enabled("sleep")&&<div><dt>平均睡眠</dt><dd>{value(summary.sleep,"小時")}</dd></div>}
    </dl>}
    {(period!==0||customValid)&&enabled("medication")&&careLogs.length>0&&<section className={surface}>
     <h3 className="font-semibold">期間照護紀錄</h3>
     <ul className="flex flex-wrap gap-3 text-sm">{([["taken","已執行"],["missed","未執行"],["skipped","已跳過"]] as const).map(([status,label])=>
      <li key={status}>{label} {careLogs.filter(row=>row.data.status===status).length} 次</li>)}</ul>
    </section>}
    {enabled("goal")&&<section className="space-y-2"><h3 className="font-semibold">健康目標</h3>
     {knownGoals.length>0&&<p className="text-sm">期末已達成 {knownGoals.filter(ratio=>ratio===100).length} ／ {knownGoals.length} 項可評估目標
      {goalsWithProgress.length>knownGoals.length?" · "+(goalsWithProgress.length-knownGoals.length)+" 項缺少紀錄":""}</p>}
     <GoalList rows={safe} day={rangeEnd} open={setEdit}/>
    </section>}
   </>}
   <section className={surface+" space-y-3"}><h3 className="font-semibold">健康趨勢</h3><select aria-label="趨勢指標" className={control} value={trend} onChange={event=>setTrend(event.target.value)}>
    {[...Object.keys(body),...Object.keys(nutrition),"water","sleep","quality","minutes","sessions","distance","lift","care"].filter(key=>enabled(trendGroup(key))).map(key=><option key={key} value={key}>{metrics[key as keyof typeof metrics]??({distance:"運動距離（km）",lift:"運動重量（kg）",quality:"睡眠品質（1–5）",care:"已執行照護（次）"}[key])}</option>)}</select>
    {points.some(point=>point.amount!==null)?<><div className="flex h-24 items-end gap-px" aria-hidden="true">{points.map(item=>
     <span className={item.amount===null?"h-px min-w-0 flex-1 bg-zinc-500/25":"min-w-0 flex-1 rounded-t bg-emerald-600/65"} key={item.date} style={item.amount===null?{}:{height:Math.max(2,item.amount/max*100)+"%"}}/>)}</div>
     <details><summary>檢視每日數值</summary>{points.map(item=><p key={item.date}>{item.date} · {value(item.amount)}</p>)}</details></>:<p>尚無這項數據。</p>}
   </section>
  </>}
  {active==="body"&&enabled("body")&&<>{goalFor("body")}<dl className={surface+" grid grid-cols-2 gap-3 sm:grid-cols-3"}>
   {Object.entries(body).map(([key,label])=>{
    const measurement=latestMeasurement(safe,key,day);
    return <div key={key}><dt>{label}</dt><dd className="font-semibold">{key==="weight"&&privacy.weightUnit==="lb"?displayWeight(latest(safe,key,day)):value(latest(safe,key,day))}</dd>
     {measurement&&<button className="min-h-11 text-sm underline-offset-4 hover:underline" type="button" onClick={()=>{setTrend(key);setTab("analysis");}}>{dayOf(measurement)} · 趨勢</button>}</div>;
   })}
   <div><dt>BMI</dt><dd className="font-semibold">{value(bmi(safe,day))}</dd></div></dl>
   <RestingEnergyEstimate height={latest(safe,"height",day)} weight={latest(safe,"weight",day)}/>
   {list("body",row=><p>{dayOf(row)} · {Object.entries(body).filter(([key])=>row.data[key]!==undefined).map(([key,label])=>label+" "+row.data[key]).join(" ・")}</p>)}{goalFor("cycle")}</>}
  {active==="diet"&&<div className="flex flex-wrap gap-2">
   {element(foodLibrary?"返回飲食紀錄":"常用食品",()=>{setQuery("");setFoodLibrary(!foodLibrary);})}
   {!foodLibrary&&waterActions}
  </div>}
  {active==="diet"&&!foodLibrary&&<>{goalFor("diet")}
   <dl className={surface+" grid grid-cols-2 gap-3 sm:grid-cols-4"}>{Object.entries(nutrition).map(([key,label])=><div key={key}><dt>{label}</dt><dd>{value(summary.nutrients[key].amount)}{summary.nutrients[key].missing?"（"+summary.nutrients[key].missing+" 項未填）":""}</dd></div>)}<div><dt>飲水（ml）</dt><dd>{value(summary.water)}</dd></div></dl>
   {[...new Set([...String(privacy.mealTypes??"早餐、午餐、晚餐、點心").split(/[、,，]/),...summary.period.filter(row=>row.kind==="meal").map(row=>str(row,"meal")||"未分類")])].map(meal=>
    <section key={meal}><h3 className="font-semibold">{meal}</h3>{list("meal",row=><div><p>{dayOf(row)} {str(row,"time")} · {row.data.items?.map(item=>item.title).join("、")}</p>
     <p>{value(totals([row],dayOf(row),civilAdvance(dayOf(row),"day",1)).nutrients.kcal.amount,"kcal")}</p>
     {element("複製餐點",()=>start("meal",{...row.data,date:day,time:new Date().toTimeString().slice(0,5)}))}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    {row.data.image&&<img alt="餐點紀錄" className="max-h-32 rounded-lg object-cover" src={str(row,"image")}/>}</div>,false,row=>(str(row,"meal")||"未分類")===meal)}</section>)}
   {list("water",row=><p>{dayOf(row)} {str(row,"time")} · {str(row,"amount")} ml</p>)}
  </>}
  {active==="diet"&&foodLibrary&&<>
   <div className="flex flex-wrap gap-2">
    <input aria-label="搜尋食品及餐點" type="search" className={control} value={query} onChange={event=>setQuery(event.target.value)}/></div>
   {list("food",row=><p>{row.data.archived?"已封存 · ":""}{value(num(row.data,"kcal"),"kcal")} ／{row.data.unit==="份"?"份":"100 "+row.data.unit}</p>,true)}
   {list("recipe",row=><p>{row.data.archived?"已封存 · ":""}{row.data.items?.length} 個項目</p>,true)}
  </>}
  {active==="activity"&&<nav aria-label="活動與休息檢視" className="flex flex-wrap gap-1">
   {([["all","活動摘要"],["exercise","運動"],["sleep","睡眠"]] as const).filter(([key])=>key==="all"||enabled(key)).map(([key,label])=>
    <button key={key} type="button" className={control} aria-pressed={activityView===key} onClick={()=>setActivityView(key)}>{label}</button>)}
  </nav>}
  {active==="activity"&&activityView!=="sleep"&&enabled("exercise")&&<>{goalFor("exercise")}
   <div className="flex flex-wrap gap-2">
    <input aria-label="篩選運動名稱" type="search" className={control} value={query} onChange={event=>setQuery(event.target.value)}/></div>
   <div className={surface}>完成 {value(summary.sessions,"次")} ・{value(summary.minutes,"分鐘")} ・{displayDistance(summary.distance)}</div>
   {safe.some(row=>row.kind==="plan")&&<section><h3 className="font-semibold">既有運動計畫</h3>{list("plan",row=><div className="space-y-2"><p>{dayOf(row)} · {str(row,"time")} · 預計 {str(row,"minutes")} 分鐘{row.data.weekdays?" · 每週 "+str(row,"weekdays").split("").map(value=>"日一二三四五六"[Number(value)]).join("、"):""}</p>
    {planOn(row,day)&&!dayRows.some(item=>item.kind==="exercise"&&item.data.planId===row.id)&&element("記錄實際完成",()=>start("exercise",{title:row.data.title,minutes:row.data.minutes,time:row.data.time,task:row.data.task,planId:row.id}))} {taskLink(row)}</div>,true)}</section>}
   {list("exercise",row=><div><p>{dayOf(row)} {str(row,"time")} · {str(row,"minutes")} 分鐘{row.data.distance!==undefined?" · "+row.data.distance+" km":""}{row.data.lift!==undefined?" · "+row.data.lift+" kg":""}</p>{taskLink(row)}</div>)}
  </>}
  {active==="activity"&&activityView!=="exercise"&&enabled("sleep")&&<>{goalFor("sleep")}<div className={surface}>期間平均 {value(summary.sleep,"小時")}</div>
   {list("sleep",row=><p>{row.data.nap?"午睡":"睡眠"} · {str(row,"start")} 至 {str(row,"end")} · {value(duration(row),"小時")} · 品質 {str(row,"quality")}/5</p>)}</>}
  {active==="body"&&enabled("cycle")&&<>
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
   <nav aria-label="照護檢視" className="flex flex-wrap gap-1">
    {([["today","所選日照護"],["plans","照護計畫"],["history","歷史紀錄"]] as const).map(([key,label])=>
     <button key={key} type="button" className={control} aria-pressed={careView===key} onClick={()=>setCareView(key)}>{label}</button>)}
   </nav>
   {goalFor("medication")}
   {careView==="today"&&<>
    <h3 className="font-semibold">預定服用</h3>
    {list("medication",row=>{
     const due=medicationDue(row,day),stock=medicationStock(row,safe);
     const slots=due?medicationTimes(row.data):row.data.frequency==="asNeeded"&&medicationState(row,day)==="active"?[""]:[];
     return <div className="space-y-1"><p>{str(row,"quantity")} {str(row,"unit")} · {str(row,"meal")}</p>
      {stock!==null&&<p>剩餘庫存 {value(stock,str(row,"unit"))}{stock<=0?" · 庫存不足":""}</p>}
      {slots.map(time=>{
       const dose=time?scheduledDose(safe,row,day,time):undefined;
       return <div key={time} className="flex flex-wrap items-center gap-2">
        {time&&<span>{time} · {careStatus(dose,time)}</span>}
        {element(dose?"查看當日服用紀錄":"新增服用紀錄",()=>openDose(row,time,dose))}
       </div>;
      })}
     </div>;
    },true,row=>medicationDue(row,day)||row.data.frequency==="asNeeded"&&medicationState(row,day)==="active"&&day>=str(row,"date")&&(!row.data.until||day<=str(row,"until")))}
   </>}
   {careView==="plans"&&list("medication",row=>{
    const state=medicationState(row,today),stock=medicationStock(row,safe),expiry=str(row,"expiry");
    return <div className="space-y-1">
     <p>{str(row,"date")} 起{row.data.until?" 至 "+str(row,"until"):""} · {{active:"進行中",paused:"暫停",ended:"已終止"}[state]}</p>
     <p>{str(row,"quantity")} {str(row,"unit")} · {medicationTimes(row.data).filter(Boolean).join("、")}</p>
     {stock!==null&&<p>剩餘庫存 {value(stock,str(row,"unit"))}</p>}
     {expiry&&<p>有效期限 {expiry}{expiry<today?" · 已到期":expiry<=civilAdvance(today,"day",7)?" · 即將到期":""}</p>}
     {state!=="ended"&&<div className="flex flex-wrap gap-1">
      {state==="paused"?element("恢復計畫",()=>void changeCare(row,"active")):element("暫停計畫",()=>void changeCare(row,"paused"))}
      {element("終止計畫",()=>void changeCare(row,"ended"))}
      {str(row,"date")<=today&&(!row.data.until||str(row,"until")>today)&&element("修改未來計畫",()=>startFuturePlan(row))}
     </div>}
    </div>;
   },true)}
   {careView==="history"&&<><h3 className="font-semibold">歷史服用紀錄</h3>
    {list("dose",row=><p>{str(row,"date")} · {careStatus(row)} · {str(row,"actual").replace("T"," ")}{doseIsDuplicate(row,safe)?" · 同時段重複，未計入庫存":""}</p>,true)}
   </>}
  </>}
  {active==="privacy"&&<div className={surface+" space-y-4"}><p>健康資料預設僅在健康管理顯示。</p>
   <fieldset disabled={busy} className="space-y-2"><legend className="font-semibold">總覽配置</legend>
    {Object.entries(overviewLabels).map(([key,label])=><div key={key} className="flex flex-wrap gap-3">
     <label><input type="checkbox" checked={visibleBlock(key as OverviewBlock)} onChange={event=>void change({["overview_"+key]:event.target.checked})}/> 顯示{label}</label>
     {["body","meal","water","exercise","sleep"].includes(key)&&<label><input type="checkbox" checked={quick(key as OverviewBlock)}
      onChange={event=>void change({["quick_"+key]:event.target.checked})}/> 快捷紀錄</label>}
    </div>)}
   </fieldset>
   <form className="flex flex-wrap items-end gap-2" onSubmit={event=>{
    event.preventDefault();const form=new FormData(event.currentTarget);
    void change({mealTypes:String(form.get("mealTypes")).trim(),exerciseTypes:String(form.get("exerciseTypes")).trim()});
   }}>
    <label className="grid gap-1">常用餐別<input className={control} name="mealTypes" defaultValue={String(privacy.mealTypes??"早餐、午餐、晚餐、點心")}/></label>
    <label className="grid gap-1">常用運動類型<input className={control} name="exerciseTypes" defaultValue={String(privacy.exerciseTypes??"步行、跑步、阻力訓練、伸展")}/></label>
    <button className={control} disabled={busy}>儲存常用選項</button>
   </form>
   <fieldset disabled={busy} className="flex flex-wrap gap-2"><legend className="font-semibold">顯示單位</legend>
    <label className="grid gap-1">體重<select className={control} value={String(privacy.weightUnit??"kg")} onChange={event=>void change({weightUnit:event.target.value})}><option>kg</option><option>lb</option></select></label>
    <label className="grid gap-1">運動距離<select className={control} value={String(privacy.distanceUnit??"km")} onChange={event=>void change({distanceUnit:event.target.value})}><option>km</option><option>mi</option></select></label>
   </fieldset>
   <fieldset disabled={busy} className="space-y-2"><legend>子功能與跨頁顯示</legend>
    {Object.entries(groups).map(([key,label])=><div key={key} className="flex flex-wrap gap-4">
     <label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={enabled(key as Group)} onChange={event=>void change({["off_"+key]:!event.target.checked})}/>啟用{label}</label>
     <label className="flex min-h-11 items-center gap-2"><input type="checkbox" disabled={!enabled(key as Group)} checked={enabled(key as Group)&&privacy["share_"+key]===true}
      onChange={event=>void change({["share_"+key]:event.target.checked})}/>允許顯示{label}摘要</label></div>)}
    <label className="flex min-h-11 items-center gap-2"><input type="checkbox" disabled={!enabled("exercise")} checked={enabled("exercise")&&privacy.calendar===true}
     onChange={event=>void change({calendar:event.target.checked})}/>在行事曆顯示運動</label>
    <label className="flex min-h-11 items-center gap-2"><input type="checkbox" disabled={!enabled("goal")} checked={enabled("goal")&&privacy.habits===true}
     onChange={event=>void change({habits:event.target.checked})}/>在習慣頁顯示已授權的關聯健康目標</label></fieldset>
   <div className="flex flex-wrap gap-4">{([["cycle","calendarCycle","經期"],["medication","calendarMedication","服用提醒"],["body","calendar_body","身體數據"],["diet","calendar_diet","飲食飲水"],["sleep","calendar_sleep","睡眠"]] as const).map(([group,key,label])=><label key={key} className="flex min-h-11 items-center gap-2">
    <input type="checkbox" disabled={busy||!enabled(group)} checked={enabled(group)&&privacy[key]===true} onChange={event=>void change({[key]:event.target.checked})}/>在行事曆顯示{label}</label>)}</div>
   <fieldset className="flex flex-wrap gap-2"><legend>卡片排列與指標</legend>
    {order.map((key,index)=><button key={key} type="button" className={control} disabled={busy||index===0}
     onClick={()=>{const ordered=[...order];[ordered[index-1],ordered[index]]=[ordered[index],ordered[index-1]];void change({overviewOrder:ordered.join(",")});}}>上移{overviewLabels[key]}</button>)}
    <label>身體主要指標<select className={control} value={bodyMetric} onChange={event=>void change({overviewBodyMetric:event.target.value})}>
     {Object.entries(body).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
    <label><input type="checkbox" checked={privacy.overviewTargets!==false} onChange={event=>void change({overviewTargets:event.target.checked})}/> 顯示目標</label>
    <label><input type="checkbox" checked={privacy.overviewTrends!==false} onChange={event=>void change({overviewTrends:event.target.checked})}/> 顯示趨勢</label>
   </fieldset>
   {element("匯出我的健康資料",()=>downloadJsonFile("nexus-health-"+day+".json",{version:1,records:rows.map(({id,kind,data,created_at,updated_at})=>({id,kind,data,created_at,updated_at}))}))}
  </div>}
  {shortcut!==undefined&&<ModalDialog aria-label="飲水快捷容量" busy={busy} onDismiss={()=>setShortcut(undefined)} className={surface+" m-auto w-[min(90vw,22rem)] bg-[var(--color-bg)] text-[var(--color-text)]"}>
   <form className="grid gap-3" onSubmit={async event=>{
    event.preventDefault();const amount=Number(new FormData(event.currentTarget).get("amount"));
    if(!Number.isFinite(amount)||amount<0||amount>100000)return;
    if(await change({["waterShortcut"+shortcut]:amount}))setShortcut(undefined);
   }}>
    <label>快捷 {shortcut}（mL）<input className={control+" w-full"} name="amount" type="number" min="0.01" max="100000" step="any" defaultValue={waterPresets[shortcut-1]||""}/></label>
    <p className="text-xs">留空可清除快捷。</p>{error&&<p role="alert">{error}</p>}<div className="flex gap-2"><button className={control} disabled={busy}>儲存</button>{element("取消",()=>setShortcut(undefined))}</div>
   </form>
  </ModalDialog>}
  {waterManage&&shortcut===undefined&&!edit&&<ModalDialog aria-label="飲水管理" busy={busy} onDismiss={()=>setWaterManage(false)} className={surface+" m-auto max-h-[85dvh] w-[min(94vw,36rem)] overflow-y-auto bg-[var(--color-bg)] text-[var(--color-text)]"}>
   <div className="grid gap-3"><h2 className="font-semibold">飲水管理</h2>
    <section><h3>飲水目標</h3>{element("新增飲水目標",()=>start("goal",{metric:"water",mode:"increase",baseline:0}))}
     <ul className="divide-y divide-[var(--color-border)]">{waterGoals.map(row=><li key={row.id} className="flex flex-wrap items-center gap-1 py-1">
      <span className="flex-1">{str(row,"title")}</span>{element("修改目標",()=>setEdit(row))}
      <button type="button" className={control} disabled={busy} onClick={async()=>{
       setBusy(true);setError("");
       try{await repository.saveHealth({...row,data:{...row.data,paused:row.data.paused!==true}});}
       catch(error){setError(error instanceof Error?error.message:String(error));}
       finally{setBusy(false);}
      }}>{row.data.paused?"恢復目標":"停用目標"}</button>
     </li>)}</ul>
    </section>
    <section><h3>快捷容量</h3><div className="flex gap-1">{waterPresets.map((amount,index)=>
     <button key={index} type="button" className={control} onClick={()=>setShortcut(index+1)}>修改快捷 {index+1}{amount?" · "+waterValue(amount):""}</button>)}</div></section>
    <label>顯示單位<select className={control} value={String(privacy.waterUnit??"mL")} onChange={event=>void change({waterUnit:event.target.value})}><option>mL</option><option>L</option></select></label>
    <section><h3>{localDay(day)}飲水紀錄</h3>{list("water",row=><p>{str(row,"time")} · {waterValue(num(row.data,"amount"))}</p>,true,row=>dayOf(row)===day)}</section>
    {element("關閉",()=>setWaterManage(false))}
   </div>
  </ModalDialog>}
  {undo&&<aside className="sticky bottom-0 flex items-center justify-between gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1 text-sm" role="status">
   {undo.action==="create"?"已記錄":"已刪除"} {str(undo.row,"amount")} ml
   <button type="button" className={control} disabled={busy} onClick={async()=>{
    setBusy(true);
    try{
     if(undo.action==="create"){
      const current=(await repository.readHealth()).find(row=>row.id===undo.row.id);
      if(!current||JSON.stringify(current.data)!==JSON.stringify(undo.row.data))throw Error("飲水紀錄已變更，請由清單編輯。");
      await repository.saveHealth(current,true);
     }else{
      const {row}=undo;
      await repository.saveHealth({...makeHealth(owner,"water",row.data),created_at:row.created_at});
     }
     setUndo(undefined);
    }
    catch(error){setError(error instanceof Error?error.message:String(error));}
    finally{setBusy(false);}
   }}>復原</button>
  </aside>}
  {edit&&edit.kind!=="privacy"&&enabled(kindGroup[edit.kind])&&<HealthEditor key={edit.id} row={edit} rows={safe} tasks={tasks} habits={habits} preferences={privacy} close={()=>{setEdit(undefined);setReplacedPlan(undefined);}} save={async(row,remove)=>{
    if(replacedPlan)await repository.replaceMedication(replacedPlan,row,today);
    else await repository.saveHealth(row,remove);
    if(row.kind==="water"){if(remove)setUndo({row:edit,action:"delete"});else if(!edit.revision)setUndo({row,action:"create"});}
   }}/>}
 </section>;
}
