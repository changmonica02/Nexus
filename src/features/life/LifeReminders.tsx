import { useState } from "react";
import { civilAdvance } from "./civilPeriods";
import { control, surface } from "./dashboard/styles";
import { previewRule, ruleOccurrence, visibleReminders, type Reminder, type ReminderRule, type ReminderStatus } from "./reminderModel";

type Preference = { lead:number; rules:ReminderRule[]; status:Record<string,ReminderStatus> };
const defaults:Preference={lead:3,rules:[],status:{}};

export default function LifeReminders({owner,day,items,open}:{owner:string|null;day:string;items:Reminder[];open:(id:string)=>void}){
  const key="nexus-life-reminders:"+JSON.stringify(owner);
  const [prefs,setPrefs]=useState<Preference>(()=>{
    try{
      const stored=JSON.parse(localStorage.getItem(key)??"null") as Preference|null;
      return stored&&Array.isArray(stored.rules)&&stored.status&&Number.isInteger(stored.lead)?stored:defaults;
    }catch{return defaults;}
  });
  const [source,setSource]=useState("");
  const [error,setError]=useState("");
  const [draft,setDraft]=useState<ReminderRule>();
  const [showHandled,setShowHandled]=useState(false);
  const save=(next:Preference)=>{
    try{localStorage.setItem(key,JSON.stringify(next));setPrefs(next);setError("");}
    catch{setError("提醒設定儲存失敗");}
  };
  const rules=prefs.rules.flatMap(rule=>{
    const occurrence=ruleOccurrence(rule,day);
    return occurrence?[occurrence]:[];
  });
  const all=[...items,...rules];
  const shown=visibleReminders(all,prefs.status,day,prefs.lead,source);
  const changeStatus=(id:string,status:ReminderStatus)=>save({...prefs,status:{...prefs.status,[id]:status}});
  const next=draft&&previewRule(draft,day);
  const handled=Object.entries(prefs.status).filter(([,entry])=>entry.handled);
  return <details className={surface}>
    <summary className="cursor-pointer font-semibold">站內提醒 · {shown.length} 筆</summary>
    <div className="mt-3 flex flex-wrap items-end gap-2">
      <label className="grid gap-1">提前天數<input className={control+" w-24"} type="number" min={0} max={30} value={prefs.lead} onChange={event=>save({...prefs,lead:Math.min(30,Math.max(0,Math.trunc(Number(event.target.value))))})}/></label>
      <label className="grid gap-1">提醒來源<select className={control} value={source} onChange={event=>setSource(event.target.value)}><option value="">全部來源</option>
        {[...new Set(all.map(item=>item.source))].sort().map(name=><option key={name}>{name}</option>)}
      </select></label>
      <button className={control} type="button" onClick={()=>setShowHandled(!showHandled)}>{showHandled?"隱藏已處理":"查看已處理"}</button>
    </div>
    {error&&<p role="alert">{error}</p>}
    {shown.length===0&&<p className="my-2">目前沒有待處理提醒。</p>}
    <ul className="my-3 space-y-2">{shown.map(item=><li className="flex flex-wrap items-center gap-2" key={item.id}>
      <span className="min-w-0 grow break-words">{item.priority>1?"重要 · ":""}{item.day} · {item.title}</span>
      {item.source!=="自訂規則"&&<button className={control} type="button" onClick={()=>open(item.id)}>開啟來源</button>}
      <button className={control} type="button" onClick={()=>changeStatus(item.id,{hiddenUntil:civilAdvance(day,"day",1)})}>隱藏一天</button>
      <button className={control} type="button" onClick={()=>changeStatus(item.id,{handled:true})}>標示已處理</button>
    </li>)}</ul>
    {showHandled&&<ul>{handled.map(([id])=><li className="flex flex-wrap items-center gap-2" key={id}>
      <span>{all.find(row=>row.id===id)?.title??"歷史提醒"}</span>
      <button className={control} type="button" onClick={()=>changeStatus(id,{})}>恢復提醒</button>
    </li>)}</ul>}
    <h3 className="mt-4 font-medium">日期提醒規則</h3>
    <p className="mb-2 text-sm">開啟生活總覽時檢查，設定與處理狀態儲存在此裝置。</p>
    {prefs.rules.map(rule=><div className="my-2 flex flex-wrap items-center gap-2" key={rule.id}>
      <span>{rule.title} · {rule.start} 起每 {rule.interval} 天</span>
      <button className={control} type="button" onClick={()=>save({...prefs,rules:prefs.rules.map(row=>row.id===rule.id?{...row,enabled:!row.enabled}:row)})}>{rule.enabled?"停用":"啟用"}</button>
      <button className={control} type="button" onClick={()=>setDraft(rule)}>編輯規則</button>
      <button className={control} type="button" onClick={()=>save({...prefs,rules:prefs.rules.filter(row=>row.id!==rule.id)})}>刪除規則</button>
    </div>)}
    {draft?<form className="flex flex-wrap items-end gap-2" onSubmit={event=>{
      event.preventDefault();
      if(!next||!draft.title.trim()){setError("請確認提醒名稱與日期");return;}
      save({...prefs,rules:[...prefs.rules.filter(row=>row.id!==draft.id),{...draft,title:draft.title.trim()}]});setDraft(undefined);
    }}>
      <label className="grid gap-1">提醒名稱<input className={control} value={draft.title} maxLength={100} required onChange={event=>setDraft({...draft,title:event.target.value})}/></label>
      <label className="grid gap-1">開始日期<input className={control} type="date" value={draft.start} required onChange={event=>setDraft({...draft,start:event.target.value})}/></label>
      <label className="grid gap-1">間隔天數<input className={control+" w-24"} type="number" min={1} max={365} value={draft.interval} onChange={event=>setDraft({...draft,interval:Number(event.target.value)})}/></label>
      <p>下次預覽 · {next??"請輸入日期與間隔"}</p>
      <button className={control}>儲存規則</button><button className={control} type="button" onClick={()=>setDraft(undefined)}>取消</button>
    </form>:<button className={control} type="button" onClick={()=>setDraft({id:crypto.randomUUID(),title:"",start:day,interval:7,enabled:true})}>新增日期提醒規則</button>}
  </details>;
}
