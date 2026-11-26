import { useEffect, useState } from "react";
import { civilAdvance } from "./civilPeriods";
import { control, surface } from "./dashboard/styles";
import { previewRule, ruleOccurrence, visibleReminders, isReminderPreferences, type ReminderPreferences, type Reminder, type ReminderRule, type ReminderStatus } from "./reminderModel";

type Preference = ReminderPreferences;
const defaults:Preference={lead:3,rules:[],status:{}};

export default function LifeReminders({owner,day,items,open,synced,saveSynced,tasks,runSchedule,existingSchedules}:{owner:string|null;day:string;items:Reminder[];open:(id:string)=>void;synced?:Preference;saveSynced?:(value:Preference)=>Promise<void>;tasks:{id:string;title:string;completed?:boolean;day:string;due?:string}[];runSchedule?:(occurrence:Reminder)=>Promise<void>;existingSchedules:{id:string;title:string;day:string}[]}){
  const key="nexus-life-reminders:"+JSON.stringify(owner);
  const [local,setPrefs]=useState<Preference>(()=>{
    try{
      const stored=JSON.parse(localStorage.getItem(key)??"null") as Preference|null;
      return isReminderPreferences(stored)?stored:defaults;
    }catch{return defaults;}
  });
  const prefs=synced??local;
  const [saving,setSaving]=useState(false);
  const [source,setSource]=useState("");
  const [error,setError]=useState("");
  const [draft,setDraft]=useState<ReminderRule>();
  const [showHandled,setShowHandled]=useState(false);
  const save=async(next:Preference)=>{
    if(saving)return;
    if(!isReminderPreferences(next)){setError("設定超出可儲存範圍，請檢查規則或清除歷史。");return;}
    setSaving(true);
    try{
      if(saveSynced)await saveSynced(next);
      else{localStorage.setItem(key,JSON.stringify(next));setPrefs(next);}
      setError("");
      return true;
    }
    catch(error){setError(error instanceof Error?error.message:"提醒設定儲存失敗");}
    finally{setSaving(false);}
  };
  const [runError,setRunError]=useState("");
  const [retry,setRetry]=useState(0);
  const candidates=prefs.rules.filter(rule=>rule.action==="schedule").flatMap(rule=>ruleOccurrence(rule,day,tasks)??[]).filter(occurrence=>occurrence.day<=day);
  const candidateSnapshot=JSON.stringify(candidates);
  useEffect(()=>{
    if(!runSchedule)return;
    let active=true;
    const run=async()=>{
      for(const occurrence of JSON.parse(candidateSnapshot) as Reminder[]){
        if(!active)return;
        try{
          await runSchedule(occurrence);
        }catch(error){if(active)setRunError(error instanceof Error?error.message:"自動化執行失敗");}
      }
    };
    void run();
    return ()=>{active=false;};
  },[candidateSnapshot,runSchedule,retry]);
  const rules=prefs.rules.filter(rule=>rule.action!=="schedule").flatMap(rule=>{
    if(rule.trigger==="task-completed"||rule.trigger==="overdue-count"){
      const occurrence=ruleOccurrence(rule,day,tasks);
      return occurrence?[occurrence]:[];
    }
    return Array.from({length:prefs.lead+1},(_,offset)=>ruleOccurrence(rule,civilAdvance(day,"day",offset))).filter((row):row is Reminder=>row!==null);
  });
  const all=[...items,...rules];
  const shown=visibleReminders(all,prefs.status,day,prefs.lead,source);
  const changeStatus=(id:string,status:ReminderStatus)=>save({...prefs,status:{...prefs.status,[id]:{...prefs.status[id],...status}}});
  const clearStatus=(id:string)=>save({...prefs,status:Object.fromEntries(Object.entries(prefs.status).filter(([key])=>key!==id))});
  const next=draft&&(!draft.trigger||draft.trigger==="date")&&previewRule(draft,day);
  const handled=Object.entries(prefs.status).filter(([,entry])=>entry.handled);
  return <details className={surface}>
    <summary className="cursor-pointer font-semibold">站內提醒 · {shown.length} 筆</summary>
    <fieldset disabled={saving}>
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
      <label>重要程度 <select className={control} value={item.priority} onChange={event=>void changeStatus(item.id,{priority:Number(event.target.value)})}><option value={1}>一般</option><option value={2}>重要</option><option value={3}>最高</option></select></label>
      <button className={control} type="button" onClick={()=>changeStatus(item.id,{hiddenUntil:civilAdvance(day,"day",1)})}>隱藏一天</button>
      <button className={control} type="button" onClick={()=>changeStatus(item.id,{handled:true})}>標示已處理</button>
    </li>)}</ul>
    {showHandled&&<ul>{handled.map(([id])=><li className="flex flex-wrap items-center gap-2" key={id}>
      <span>{all.find(row=>row.id===id)?.title??"歷史提醒"}</span>
      <button className={control} type="button" onClick={()=>clearStatus(id)}>恢復提醒</button>
    </li>)}</ul>}
    <h3 className="mt-4 font-medium">生活自動化規則</h3>
    {runError&&<p role="alert">{runError} <button className={control} type="button" onClick={()=>{setRunError("");setRetry(value=>value+1);}}>重試自動化</button></p>}
    {existingSchedules.length>0&&<details><summary>已建立的自動化行程</summary><ul>{existingSchedules.map(row=><li key={row.id}>{row.day} · {row.title}</li>)}</ul></details>}
    <p className="mb-2 text-sm">開啟生活總覽時檢查，登入時，設定及處理狀態隨生活儀表板同步。</p>
    {prefs.rules.map(rule=><div className="my-2 flex flex-wrap items-center gap-2" key={rule.id}>
      <span>{rule.title} · {rule.trigger==="task-completed"?"任務完成時":rule.trigger==="overdue-count"?"逾期任務達 "+rule.threshold+" 筆":rule.start+" 起每 "+rule.interval+" 天"}</span>
      <button className={control} type="button" onClick={()=>save({...prefs,rules:prefs.rules.map(row=>row.id===rule.id?{...row,enabled:!row.enabled}:row)})}>{rule.enabled?"停用":"啟用"}</button>
      <button className={control} type="button" onClick={()=>setDraft(rule)}>編輯規則</button>
      <button className={control} type="button" onClick={()=>save({...prefs,rules:prefs.rules.filter(row=>row.id!==rule.id)})}>刪除規則</button>
    </div>)}
    {draft?<form className="flex flex-wrap items-end gap-2" onSubmit={async event=>{
      event.preventDefault();
      if((draft.trigger==="task-completed"?!draft.task:draft.trigger==="overdue-count"?!draft.threshold:!next)||!draft.title.trim()){setError("請確認提醒名稱與日期");return;}
      if(await save({...prefs,rules:[...prefs.rules.filter(row=>row.id!==draft.id),{...draft,title:draft.title.trim()}]}))setDraft(undefined);
    }}>
      <label className="grid gap-1">提醒名稱<input className={control} value={draft.title} maxLength={100} required onChange={event=>setDraft({...draft,title:event.target.value})}/></label>
      <label className="grid gap-1">開始日期<input className={control} type="date" value={draft.start} required onChange={event=>setDraft({...draft,start:event.target.value})}/></label>
      <label className="grid gap-1">觸發條件<select className={control} value={draft.trigger??"date"} onChange={event=>setDraft({...draft,trigger:event.target.value as ReminderRule["trigger"]})}>
        <option value="date">日期週期</option><option value="task-completed">任務完成</option><option value="overdue-count">逾期任務筆數達門檻</option>
      </select></label>
      {draft.trigger==="task-completed"?<label className="grid gap-1">指定任務<select className={control} value={draft.task??""} onChange={event=>setDraft({...draft,task:event.target.value})} required>
        <option value="">請選擇</option>{tasks.map(task=><option key={task.id} value={task.id}>{task.title}</option>)}
      </select></label>:draft.trigger==="overdue-count"?<label className="grid gap-1">逾期任務門檻<input className={control} type="number" min={1} max={1000} required value={draft.threshold??""} onChange={event=>setDraft({...draft,threshold:Number(event.target.value)})}/></label>:<label className="grid gap-1">間隔天數<input className={control+" w-24"} type="number" min={1} max={365} value={draft.interval} onChange={event=>setDraft({...draft,interval:Number(event.target.value)})}/></label>}
      <label className="grid gap-1">執行動作<select className={control} value={draft.action??"reminder"} onChange={event=>setDraft({...draft,action:event.target.value==="schedule"?"schedule":"reminder"})}>
        <option value="reminder">顯示站內提醒</option><option value="schedule" disabled={!runSchedule}>建立全天行程</option>
      </select></label>
      <p>下次預覽 · {draft.trigger==="task-completed"?"指定任務完成後執行":draft.trigger==="overdue-count"?"達門檻時，每日執行一次":next??"請輸入日期與間隔"}</p>
      <button className={control}>儲存規則</button><button className={control} type="button" onClick={()=>setDraft(undefined)}>取消</button>
    </form>:<button className={control} type="button" onClick={()=>setDraft({id:crypto.randomUUID(),title:"",start:day,interval:7,enabled:true})}>新增日期提醒規則</button>}
    </fieldset>
  </details>;
}
