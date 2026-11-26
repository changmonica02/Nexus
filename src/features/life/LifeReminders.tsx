import type { Habit, ScheduleEvent } from "./syncRecords";
import { useEffect, useState } from "react";
import { currencies } from "./finance/money";
import type { LifeField } from "./lists";
import { civilAdvance } from "./civilPeriods";
import { control, surface } from "./dashboard/styles";
import { automationRunId, validAutomationAction, previewRule, ruleOccurrence, ruleOccurrences, type AutomationRunStatus, type RuleListItem, type RuleExercise, visibleReminders, isReminderPreferences, type ReminderPreferences, type Reminder, type ReminderRule, type ReminderStatus } from "./reminderModel";

type Preference = ReminderPreferences;
type ActionTargets = {kind:NonNullable<LifeField["relation"]>;id:string;title:string}[];
const actionTitles = { reminder:"顯示站內提醒", schedule:"建立全天行程", task:"建立待辦事項",
  estimate:"建立預估支出", relation:"建立關聯紀錄", "update-task":"更新待辦欄位或狀態" } as const;
const defaults:Preference={lead:3,rules:[],status:{}};

export default function LifeReminders({owner,day,items,open,synced,saveSynced,tasks,execute,allowSchedule,allowTasks,allowFinance,relationSources,existingSchedules,readRuns,ruleLists,ruleRecords,ruleBudgets,ruleHabits,ruleExercises,ruleTargets}:{owner:string|null;day:string;items:Reminder[];open:(id:string)=>void;synced?:Preference;saveSynced?:(value:Preference)=>Promise<void>;tasks:{id:string;title:string;completed?:boolean;day:string;due?:string}[];execute?:(occurrence:Reminder,rule:ReminderRule)=>Promise<void>;allowSchedule:boolean;allowTasks:boolean;allowFinance:boolean;relationSources:ActionTargets;existingSchedules:{id:string;title:string;day:string}[];readRuns:()=>Promise<AutomationRunStatus[]>;ruleLists:{id:string;title:string;numericFields:{id:string;name:string}[];relationFields:{id:string;name:string;relation:NonNullable<LifeField["relation"]>}[]}[];ruleRecords:RuleListItem[];ruleBudgets:{id:string;title:string;percent:number}[];ruleHabits:readonly Habit[];ruleExercises:readonly RuleExercise[];ruleTargets:readonly ScheduleEvent[]}){
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
  const [page,setPage]=useState(0);
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
  const [retrying,setRetrying]=useState(false);
  const [refreshCount,setRefreshCount]=useState(0);
  const [runs,setRuns]=useState<AutomationRunStatus[]>([]);
  const eligibleRules=prefs.rules.filter(rule=>rule.trigger!=="list-number"||ruleLists.some(list=>
    list.id===rule.listId&&list.numericFields.some(field=>field.id===rule.fieldId)));
  const actionAllowed=(action:ReminderRule["action"])=>{
    switch(action){
      case "schedule": return allowSchedule;
      case "task": case "update-task": return allowTasks;
      case "estimate": return allowFinance;
      case "relation": return ruleLists.length>0;
      default: return true;
    }
  };
  const relationField=(rule:ReminderRule)=>ruleLists.find(list=>list.id===rule.destinationList)?.relationFields.find(field=>field.id===rule.relationField);
  const relationAvailable=(rule:ReminderRule)=>relationSources.some(row=>row.kind===relationField(rule)?.relation&&row.id===rule.relationId);
  const candidates=eligibleRules.filter(rule=>execute&&rule.action&&rule.action!=="reminder"&&actionAllowed(rule.action)
      &&(rule.action!=="relation"||relationAvailable(rule)))
    .flatMap(rule=>ruleOccurrences(rule,day,tasks,ruleRecords,ruleBudgets,ruleHabits,ruleExercises,ruleTargets)
      .filter(occurrence=>occurrence.day<=day).map(occurrence=>({occurrence,rule,runId:automationRunId(rule.action,occurrence.id)})));
  useEffect(()=>{
    const refresh=()=>{if(document.visibilityState==="visible")setRefreshCount(value=>value+1);};
    document.addEventListener("visibilitychange",refresh);
    window.addEventListener("nexus-workspace-refreshed",refresh);
    return ()=>{
      document.removeEventListener("visibilitychange",refresh);
      window.removeEventListener("nexus-workspace-refreshed",refresh);
    };
  },[]);
  const candidateSnapshot=JSON.stringify(candidates);
  useEffect(()=>{

    let active=true;
    const run=async()=>{
      let completed=new Set<string>();
      try{completed=new Set((await readRuns()).map(row=>row.id));}
      catch(error){if(active)setRunError(error instanceof Error?error.message:"無法讀取執行歷史");}
      for(const {rule,occurrence} of (JSON.parse(candidateSnapshot) as typeof candidates).filter(row=>!completed.has(row.runId)).slice(0,50)){
        if(!active)break;
        try{
          await execute?.(occurrence,rule);
        }catch(error){if(active)setRunError(error instanceof Error?error.message:"自動化執行失敗");}
      }
      try{const history=await readRuns();if(active)setRuns(history);}
      catch(error){if(active)setRunError(error instanceof Error?error.message:"無法讀取執行歷史");}
    };
    void run();
    return ()=>{active=false;};
  },[candidateSnapshot,execute,readRuns,refreshCount]);
  function retryRule(run:AutomationRunStatus) {
    const start=run.id.indexOf("[");
    if(start<0)return;
    const id=run.id.slice(start);
    try{
      const [,ruleId]=JSON.parse(id);
      const rule=eligibleRules.find(row=>row.id===ruleId&&row.enabled&&actionAllowed(row.action)
        &&row.action&&row.action!=="reminder"&&automationRunId(row.action,id)===run.id);
      if(rule&&(rule.action!=="relation"||relationAvailable(rule)))return {rule,id};
    }catch{}
  }

  async function retryRun(run:AutomationRunStatus) {
    const target=retryRule(run);
    if(!execute||!target||retrying)return;
    setRetrying(true);
    setRunError("");
    try{
      await execute({id:target.id,day:run.day,title:target.rule.title,source:"自訂規則",priority:1},target.rule);
      setRuns(await readRuns());
    }catch(error){
      setRunError(error instanceof Error?error.message:"自動化執行失敗");
      setRuns(await readRuns().catch(()=>runs));
    }finally{setRetrying(false);}
  }

  const rules=eligibleRules.filter(rule=>(rule.action??"reminder")==="reminder").flatMap(rule=>{
    if(rule.trigger==="target-days")return Array.from({length:prefs.lead+1},(_,offset)=>ruleOccurrences(rule,civilAdvance(day,"day",offset),tasks,ruleRecords,ruleBudgets,ruleHabits,ruleExercises,ruleTargets)).flat();
    if(rule.trigger==="list-updated"||rule.trigger==="budget-percent"||rule.trigger==="habit-completed"||rule.trigger==="exercise-completed"||rule.trigger==="list-number")return ruleOccurrences(rule,day,tasks,ruleRecords,ruleBudgets,ruleHabits,ruleExercises,ruleTargets);
    if(rule.trigger==="task-completed"||rule.trigger==="overdue-count"){
      const occurrence=ruleOccurrence(rule,day,tasks);
      return occurrence?[occurrence]:[];
    }
    return Array.from({length:prefs.lead+1},(_,offset)=>ruleOccurrence(rule,civilAdvance(day,"day",offset))).filter((row):row is Reminder=>row!==null);
  });
  const all=[...items,...rules];
  const shown=visibleReminders(all,prefs.status,day,prefs.lead,source);
  const pageIndex=Math.min(page,Math.max(0,Math.ceil(shown.length/50)-1));
  const changeStatus=(id:string,status:ReminderStatus)=>save({...prefs,status:{...prefs.status,[id]:{...prefs.status[id],...status}}});
  const clearStatus=(id:string)=>save({...prefs,status:Object.fromEntries(Object.entries(prefs.status).filter(([key])=>key!==id))});
  const next=draft&&(!draft.trigger||draft.trigger==="date")&&previewRule(draft,day);
  const handled=Object.entries(prefs.status).filter(([,entry])=>entry.handled);
  return <details className={surface}>
    <summary className="cursor-pointer font-semibold">站內提醒 · {shown.length} 筆</summary>
    <fieldset disabled={saving}>
    <div className="mt-3 flex flex-wrap items-end gap-2">
      <label className="grid gap-1">提前天數<input className={control+" w-24"} type="number" min={0} max={30} value={prefs.lead} onChange={event=>save({...prefs,lead:Math.min(30,Math.max(0,Math.trunc(Number(event.target.value))))})}/></label>
      <label className="grid gap-1">提醒來源<select className={control} value={source} onChange={event=>{setSource(event.target.value);setPage(0);}}><option value="">全部來源</option>
        {[...new Set(all.map(item=>item.source))].sort().map(name=><option key={name}>{name}</option>)}
      </select></label>
      <button className={control} type="button" onClick={()=>setShowHandled(!showHandled)}>{showHandled?"隱藏已處理":"查看已處理"}</button>
    </div>
    {error&&<p role="alert">{error}</p>}
    {shown.length===0&&<p className="my-2">目前沒有待處理提醒。</p>}
    <ul className="my-3 space-y-2">{shown.slice(pageIndex*50,pageIndex*50+50).map(item=><li className="flex flex-wrap items-center gap-2" key={item.id}>
      <span className="min-w-0 grow break-words">{item.priority>1?"重要 · ":""}{item.day} · {item.title}</span>
      {item.source!=="自訂規則"&&<button className={control} type="button" onClick={()=>open(item.id)}>開啟來源</button>}
      <label>重要程度 <select className={control} value={item.priority} onChange={event=>void changeStatus(item.id,{priority:Number(event.target.value)})}><option value={1}>一般</option><option value={2}>重要</option><option value={3}>最高</option></select></label>
      <button className={control} type="button" onClick={()=>changeStatus(item.id,{hiddenUntil:civilAdvance(day,"day",1)})}>隱藏一天</button>
      <button className={control} type="button" onClick={()=>changeStatus(item.id,{handled:true})}>標示已處理</button>
    </li>)}</ul>
    {shown.length>50&&<nav aria-label="提醒分頁" className="flex flex-wrap items-center gap-2">
      <button className={control} type="button" disabled={pageIndex===0} onClick={()=>setPage(pageIndex-1)}>上一頁提醒</button>
      <span>第 {pageIndex+1} / {Math.ceil(shown.length/50)} 頁</span>
      <button className={control} type="button" disabled={(pageIndex+1)*50>=shown.length} onClick={()=>setPage(pageIndex+1)}>下一頁提醒</button>
    </nav>}
    {showHandled&&<ul>{handled.map(([id])=><li className="flex flex-wrap items-center gap-2" key={id}>
      <span>{all.find(row=>row.id===id)?.title??"歷史提醒"}</span>
      <button className={control} type="button" onClick={()=>clearStatus(id)}>恢復提醒</button>
    </li>)}</ul>}
    <h3 className="mt-4 font-medium">生活自動化規則</h3>
    {runError&&<p role="alert">{runError}</p>}
    {runs.length>0&&<details><summary>執行紀錄</summary><ul>{runs.slice(0,100).map(row=><li key={row.id} className="my-1 flex flex-wrap items-center gap-2">
      <span>{row.day} · {row.title} · {row.syncError?"同步失敗":row.error??(row.pending?"已儲存，等待同步":"已儲存")}
        {row.attempts>1&&" · "+row.attempts+" 次嘗試"}</span>
      {row.attempts>1&&<details className="basis-full text-sm"><summary>查看嘗試明細</summary><ol>
        {row.history.map((attempt,index)=><li key={index}>
          {new Date(attempt.at).toLocaleString("zh-TW")} · {attempt.syncError?"同步失敗":attempt.error??(attempt.pending?"等待同步":"已儲存")}
        </li>)}
      </ol></details>}
      {row.error&&retryRule(row)&&<button className={control} type="button" disabled={retrying} onClick={()=>void retryRun(row)}>重試</button>}
      {row.syncError&&<button className={control} type="button" onClick={()=>window.dispatchEvent(new Event("nexus-workspace-refresh-request"))}>重試同步</button>}
    </li>)}</ul></details>}
    {existingSchedules.length>0&&<details><summary>已建立的自動化行程</summary><ul>{existingSchedules.map(row=><li key={row.id}>{row.day} · {row.title}</li>)}</ul></details>}
    <p className="mb-2 text-sm">開啟生活總覽時檢查，登入時，設定及處理狀態隨生活儀表板同步。</p>
    {prefs.rules.map(rule=><div className="my-2 flex flex-wrap items-center gap-2" key={rule.id}>
      <span>{rule.title} · {actionTitles[rule.action??"reminder"]} · {rule.trigger==="exercise-completed"?"記錄實際運動時":rule.trigger==="habit-completed"?"習慣達標時":rule.trigger==="task-completed"?"任務完成時":rule.trigger==="overdue-count"?"逾期任務達 "+rule.threshold+" 筆":rule.start+" 起每 "+rule.interval+" 天"}</span>
      <button className={control} type="button" onClick={()=>save({...prefs,rules:prefs.rules.map(row=>row.id===rule.id?{...row,enabled:!row.enabled}:row)})}>{rule.enabled?"停用":"啟用"}</button>
      <button className={control} type="button" onClick={()=>setDraft(rule)}>編輯規則</button>
      <button className={control} type="button" onClick={()=>save({...prefs,rules:prefs.rules.filter(row=>row.id!==rule.id)})}>刪除規則</button>
    </div>)}
    {draft?<form className="flex flex-wrap items-end gap-2" onSubmit={async event=>{
      event.preventDefault();
      if((draft.trigger==="target-days"?!(draft.targetId&&Number.isInteger(draft.daysBefore)):draft.trigger==="list-number"?!(draft.listId&&draft.fieldId&&Number.isFinite(draft.numericThreshold)):draft.trigger==="exercise-completed"?false:draft.trigger==="habit-completed"?!draft.habitId:draft.trigger==="task-completed"?!draft.task:draft.trigger==="overdue-count"?!draft.threshold:draft.trigger==="list-updated"?!draft.listId:draft.trigger==="budget-percent"?!(draft.budgetId&&draft.threshold):!next)||!draft.title.trim()||!validAutomationAction(draft)||draft.action==="relation"&&!relationAvailable(draft)){setError("請確認規則名稱、條件及動作設定");return;}
      if(await save({...prefs,rules:[...prefs.rules.filter(row=>row.id!==draft.id),{...draft,title:draft.title.trim()}]}))setDraft(undefined);
    }}>
      <label className="grid gap-1">提醒名稱<input className={control} value={draft.title} maxLength={100} required onChange={event=>setDraft({...draft,title:event.target.value})}/></label>
      <label className="grid gap-1">開始日期<input className={control} type="date" value={draft.start} required onChange={event=>setDraft({...draft,start:event.target.value})}/></label>
      <label className="grid gap-1">觸發條件<select className={control} value={draft.trigger??"date"} onChange={event=>setDraft({...draft,trigger:event.target.value as ReminderRule["trigger"]})}>
        <option value="date">日期週期</option><option value="task-completed">任務完成</option><option value="habit-completed">習慣達標</option><option value="exercise-completed">記錄實際運動</option><option value="overdue-count">逾期任務筆數達門檻</option><option value="target-days">距重要日期天數</option><option value="list-number">清單數值達門檻</option><option value="list-updated">清單項目新增或修改</option><option value="budget-percent">預算用量達門檻</option>
      </select></label>
      {draft.trigger==="target-days"?<>
        <label className="grid gap-1">重要日期<select className={control} required value={draft.targetId??""} onChange={event=>setDraft({...draft,targetId:event.target.value})}>
          <option value="">請選擇</option>{ruleTargets.map(target=><option key={target.id} value={target.id}>{target.title}</option>)}
        </select></label>
        <label className="grid gap-1">提前天數<input className={control} type="number" min={0} max={30} required value={draft.daysBefore??""} onChange={event=>setDraft({...draft,daysBefore:event.target.value===""?undefined:event.target.valueAsNumber})}/></label>
      </>:draft.trigger==="exercise-completed"?<p>需在健康隱私設定中允許顯示運動摘要。</p>:draft.trigger==="habit-completed"?<label className="grid gap-1">指定習慣<select className={control} value={draft.habitId??""} onChange={event=>setDraft({...draft,habitId:event.target.value})} required>
        <option value="">請選擇</option>{ruleHabits.map(habit=><option key={habit.id} value={habit.id}>{habit.title}</option>)}
      </select></label>:draft.trigger==="task-completed"?<label className="grid gap-1">指定任務<select className={control} value={draft.task??""} onChange={event=>setDraft({...draft,task:event.target.value})} required>
        <option value="">請選擇</option>{tasks.map(task=><option key={task.id} value={task.id}>{task.title}</option>)}
      </select></label>:draft.trigger==="budget-percent"?<>
        <label className="grid gap-1">預算<select className={control} value={draft.budgetId??""} onChange={event=>setDraft({...draft,budgetId:event.target.value})} required>
          <option value="">請選擇</option>{ruleBudgets.map(row=><option key={row.id} value={row.id}>{row.title}</option>)}
        </select></label>
        <label className="grid gap-1">用量門檻（%）<input className={control} type="number" min={1} max={1000} required value={draft.threshold??""} onChange={event=>setDraft({...draft,threshold:Number(event.target.value)})}/></label>
      </>:draft.trigger==="list-updated"||draft.trigger==="list-number"?<><label className="grid gap-1">指定清單<select className={control} value={draft.listId??""} onChange={event=>setDraft({...draft,listId:event.target.value,fieldId:undefined})} required>
        <option value="">請選擇</option>{ruleLists.map(list=><option key={list.id} value={list.id}>{list.title}</option>)}
      </select></label>{draft.trigger==="list-number"&&<>
        <label className="grid gap-1">數字欄位<select className={control} required value={draft.fieldId??""} onChange={event=>setDraft({...draft,fieldId:event.target.value})}>
          <option value="">請選擇</option>{ruleLists.find(list=>list.id===draft.listId)?.numericFields.map(field=><option key={field.id} value={field.id}>{field.name}</option>)}
        </select></label>
        <label className="grid gap-1">數值門檻<input className={control} type="number" step="any" required value={draft.numericThreshold??""} onChange={event=>setDraft({...draft,numericThreshold:event.target.value===""?undefined:event.target.valueAsNumber})}/></label>
      </>}</>:draft.trigger==="overdue-count"?<label className="grid gap-1">逾期任務門檻<input className={control} type="number" min={1} max={1000} required value={draft.threshold??""} onChange={event=>setDraft({...draft,threshold:Number(event.target.value)})}/></label>:<label className="grid gap-1">間隔天數<input className={control+" w-24"} type="number" min={1} max={365} value={draft.interval} onChange={event=>setDraft({...draft,interval:Number(event.target.value)})}/></label>}
      <label className="grid gap-1">執行動作<select className={control} value={draft.action??"reminder"} onChange={event=>setDraft({...draft,action:event.target.value as ReminderRule["action"]})}>
        {Object.entries(actionTitles).map(([key,title])=><option key={key} value={key} disabled={!actionAllowed(key as ReminderRule["action"])}>{title}</option>)}
      </select></label>
      {draft.action==="estimate"&&<>
        <label className="grid gap-1">幣別<select className={control} required value={draft.currency??""} onChange={event=>setDraft({...draft,currency:event.target.value})}>
          <option value="">請選擇</option>{currencies.map(currency=><option key={currency}>{currency}</option>)}
        </select></label>
        <label className="grid gap-1">預估金額<input className={control} inputMode="decimal" required maxLength={26}
          value={draft.amount??""} onChange={event=>setDraft({...draft,amount:event.target.value})}/></label>
      </>}
      {draft.action==="relation"&&<>
        <label className="grid gap-1">存入清單<select className={control} required value={draft.destinationList??""}
          onChange={event=>setDraft({...draft,destinationList:event.target.value,relationField:undefined,relationId:undefined})}>
          <option value="">請選擇</option>{ruleLists.filter(list=>list.relationFields.length>0).map(list=><option key={list.id} value={list.id}>{list.title}</option>)}
        </select></label>
        <label className="grid gap-1">關聯欄位<select className={control} required value={draft.relationField??""}
          onChange={event=>setDraft({...draft,relationField:event.target.value,relationId:undefined})}>
          <option value="">請選擇</option>{ruleLists.find(list=>list.id===draft.destinationList)?.relationFields.map(field=><option key={field.id} value={field.id}>{field.name}</option>)}
        </select></label>
        <label className="grid gap-1">關聯來源<select className={control} required value={draft.relationId??""}
          onChange={event=>setDraft({...draft,relationId:event.target.value})}>
          <option value="">請選擇</option>{relationSources.filter(row=>row.kind===relationField(draft)?.relation).map(row=><option key={row.id} value={row.id}>{row.title}</option>)}
        </select></label>
      </>}
      {draft.action==="update-task"&&<>
        <label className="grid gap-1">要更新的待辦<select className={control} required value={draft.updateTask??""}
          onChange={event=>setDraft({...draft,updateTask:event.target.value})}>
          <option value="">請選擇</option>{tasks.map(task=><option key={task.id} value={task.id}>{task.title}</option>)}
        </select></label>
        <label className="grid gap-1">更新欄位<select className={control} required value={draft.updateField??""}
          onChange={event=>setDraft({...draft,updateField:event.target.value as ReminderRule["updateField"],updateValue:undefined})}>
          <option value="">請選擇</option><option value="title">名稱</option><option value="priority">優先程度</option><option value="completed">完成狀態</option>
        </select></label>
        {draft.updateField==="title"?<label className="grid gap-1">新名稱<input className={control} required maxLength={100}
          value={draft.updateValue??""} onChange={event=>setDraft({...draft,updateValue:event.target.value})}/></label>:
          draft.updateField&&<label className="grid gap-1">新值<select className={control} required value={draft.updateValue??""}
            onChange={event=>setDraft({...draft,updateValue:event.target.value})}>
            <option value="">請選擇</option>{draft.updateField==="priority"?<><option value="low">低</option><option value="medium">中</option><option value="high">高</option></>:
              <><option value="true">已完成</option><option value="false">未完成</option></>}
          </select></label>}
        {draft.updateField==="completed"&&<p className="text-sm">週期待辦的完成狀態由待辦介面操作。</p>}
      </>}
      <p>下次預覽 · {draft.trigger==="target-days"?"每次重要日期前依設定天數執行一次":draft.trigger==="list-number"?"欄位達門檻時，每個符合的項目版本執行一次":draft.trigger==="exercise-completed"?"每筆實際運動紀錄執行一次":draft.trigger==="habit-completed"?"指定習慣達標後，每個習慣週期執行一次":draft.trigger==="task-completed"?"指定任務完成後執行":draft.trigger==="overdue-count"?"達門檻時，每日執行一次":draft.trigger==="list-updated"?"每個項目版本執行一次":draft.trigger==="budget-percent"?"達門檻後每月執行一次":next??"請輸入日期與間隔"}</p>
      <button className={control}>儲存規則</button><button className={control} type="button" onClick={()=>setDraft(undefined)}>取消</button>
    </form>:<button className={control} type="button" onClick={()=>setDraft({id:crypto.randomUUID(),title:"",start:day,interval:7,enabled:true})}>新增日期提醒規則</button>}
    </fieldset>
  </details>;
}
