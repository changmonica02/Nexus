import { useRef,useState } from "react";
import ModalDialog from "../../components/ModalDialog";
import { confirmDialog } from "../../lib/confirmDialog";
import { localDateInput } from "../../lib/todoCalendar";
import { control,surface } from "./dashboard/styles";
import { HealthEditor } from "./health/HealthWorkspace";
import { allowed,body,kindGroup,makeHealth,medicationTimes,str,type Entry,type HealthRecord } from "./health/model";
import { medicationDue,scheduledDose } from "./health/sensitive";
import { dayOf } from "./health/summary";
import { civilAdvance } from "./civilPeriods";
import FinanceEditor from "./finance/FinanceEditor";
import { defaultPreferences,financeRow,financeRows,type FinanceRecord } from "./finance/model";
import { minorUnits,money } from "./finance/money";
import { recurringTerms } from "./finance/ledger";
import type { LifeRepository } from "./LifeRepository";
import type { TaskSlot } from "./taskPlan";
import { actionNames,isFinanceAction,type ActionSources,type TaskLink } from "./taskLink";

export default function TaskLinkRunner({slot,task,owner,sources,hideAmounts,repository,close}:{
 slot:TaskSlot;task:{id:string;title:string};owner:string|null;sources:ActionSources;hideAmounts:boolean;repository:LifeRepository;close:()=>void;
}){
 const action=slot.settings.action!, label=actionNames[action.kind], {health,finance}=sources;
 const today=localDateInput(new Date()), day=today>=slot.day&&today<=slot.through?today:slot.day;
 const clock=new Date().toTimeString().slice(0,5);
 const link:TaskLink={task:task.id,taskOccurrence:slot.key,taskRunOnce:slot.settings.goal.kind==="check"};
 const prefs=health.find(row=>row.kind==="privacy")?.data??{}, financial=isFinanceAction(action.kind);
 const financePrefs=financeRows(finance,"preferences")[0]?.payload??defaultPreferences;
 const plan=health.find(row=>row.kind==="medication"&&row.id===action.related);
 const due=plan&&medicationDue(plan,day)?medicationTimes(plan.data):[];
 const [time,setTime]=useState(due[0]??"");
 const [error,setError]=useState(""),[busy,setBusy]=useState(false);
 const [doseDraft,setDoseDraft]=useState<HealthRecord>();
 const running=useRef(false);
 const kind=action.kind as Entry;
 const [draft]=useState(()=>{
  if(financial||kind==="dose")return undefined;
  const amount=action.amount?Number(action.amount):undefined;
  const recipe=health.find(row=>row.kind==="recipe"&&row.id===action.related&&!row.data.archived);
  return makeHealth(owner,kind,{date:day,time:clock,title:task.title,notes:action.notes??"",healthGoal:action.goal??"",...link,
   ...(kind==="water"?{amount}:kind==="body"?{[action.metric&&Object.hasOwn(body,action.metric)?action.metric:"weight"]:amount}:
    kind==="exercise"?{minutes:amount}:kind==="meal"?{meal:"早餐",items:recipe?.data.items??[]}:
    kind==="sleep"?{start:civilAdvance(day,"day",-1)+"T23:00",end:day+"T07:00",quality:3}:{})});
 });
 const ok=(date:string)=>date>=slot.day&&date<=slot.through&&date<=today;
 const duplicate=link.taskRunOnce&&(health.some(row=>row.data.task===task.id&&row.data.taskOccurrence===slot.key)||
  financeRows(finance,"transaction").some(row=>row.payload.task===task.id&&row.payload.taskOccurrence===slot.key));
 const enabled=financial||Object.hasOwn(kindGroup,kind)&&allowed(prefs,kindGroup[kind]);
 const canExecute=ok(day)&&!duplicate&&enabled;
 const saveHealth=async(row:HealthRecord)=>{
  if(!ok(dayOf(row)))throw Error("日期須在本次任務期間內");
  if(row.kind==="dose"&&(!plan||row.data.medication!==plan.id||row.data.date!==day||row.data.planned!==time))throw Error("請保留所選照護時段");
  await repository.saveHealth({...row,data:{...row.data,...link}});
 };
 const saveFinance=async(row:FinanceRecord)=>{
  if(row.kind!=="transaction"||!ok(row.payload.date)||row.payload.type!==action.kind)throw Error("交易須符合本次任務日期及類型");
  await repository.saveFinance({...row,payload:{...row.payload,...link}});
 };
 const execute=async()=>{
  if(!canExecute||running.current)return;
  running.current=true;setBusy(true);setError("");
  try{
   if(action.kind==="dose"){
    if(!plan||!due.includes(time))throw Error("此日沒有待確認的服用時段");
    const existing=scheduledDose(health,plan,day,time);
    if(existing?.data.taskOccurrence&&(existing.data.task!==task.id||existing.data.taskOccurrence!==slot.key))throw Error("此照護紀錄已連結其他任務期別");
    const dose=existing??makeHealth(owner,"dose",{date:day,actual:day+"T"+clock,medication:plan.id,title:str(plan,"title"),status:"taken",
     quantity:plan.data.quantity,planned:time,healthGoal:action.goal??"",notes:action.notes??"",...link});
    if(action.mode==="form"){setDoseDraft(dose);return;}
    if(!await confirmDialog({title:label,message:str(plan,"title")+" · "+day+" "+time+(existing?" · 連結原服用紀錄":"")}))return;
    await saveHealth(dose);
   }else if(action.kind==="subscription"){
    const candidates=financeRows(finance,"transaction").filter(row=>row.payload.source.split("|")[0]===action.related
     &&ok(row.payload.date)&&ok(row.payload.source.split("|")[1]??"")&&!row.payload.taskOccurrence);
    if(candidates.length>1)throw Error("本期有多筆已入帳交易，請使用較窄的執行期間");
    if(candidates.length===1){
     const original=candidates[0];
     if(!await confirmDialog({title:label,message:"連結既有交易 · "+original.payload.title+" · "+original.payload.date}))return;
     await repository.saveFinance({...original,payload:{...original.payload,...link}});close();return;
    }
    const row=financeRows(finance,"subscription").find(row=>row.id===action.related);
    if(!row||!ok(row.payload.next))throw Error("此任務期間沒有待確認的交易");
    const terms=recurringTerms(row.payload,row.payload.next);
    if(!await confirmDialog({title:label,message:terms.title+" · "+row.payload.next+(hideAmounts?"":" · "+money(BigInt(terms.amount),terms.currency))}))return;
    await repository.resolveRecurringFinance(row,day,link);
   }else if(financial){
    const account=financeRows(finance,"account").find(row=>row.id===action.account&&!row.payload.archived);
    const target=financeRows(finance,"account").find(row=>row.id===action.target&&!row.payload.archived);
    if(!account||!action.amount||action.kind==="transfer"&&!target)throw Error("帳戶或金額未設定");
    const currency=account.payload.currency, amount=minorUnits(action.amount,currency);
    const targetAmount=target?(target.payload.currency===currency?amount:minorUnits(action.targetAmount??"",target.payload.currency)):BigInt(0);
    if(!await confirmDialog({title:label,message:task.title+" · "+day+(hideAmounts?"":" · "+money(amount,currency))}))return;
    await saveFinance(financeRow(owner,"transaction",{title:task.title,notes:action.notes??"",type:action.kind as "expense"|"income"|"transfer",
     date:day,amount:String(amount),account:account.id,target:target?.id??"",targetAmount:String(targetAmount),category:action.category??"",attachment:"",source:""}));
   }else{
    if(!draft)throw Error("缺少健康資料");
    if(!await confirmDialog({title:label,message:task.title+" · "+day+(action.amount?" · "+action.amount:"")}))return;
    await saveHealth(draft);
   }
   close();
  }catch(problem){setError(problem instanceof Error?problem.message:String(problem));}
  finally{running.current=false;setBusy(false);}
 };
 const renderedDraft=doseDraft??(action.mode==="form"?draft:undefined);
 if(canExecute&&renderedDraft)return <HealthEditor row={renderedDraft} rows={health.filter(row=>row.kind!=="privacy"&&allowed(prefs,kindGroup[row.kind]))}
  tasks={[task]} habits={[]} preferences={prefs} close={close} save={saveHealth}/>;
 if(canExecute&&financial&&action.mode==="form"&&action.kind!=="subscription")return <FinanceEditor
  editor={{kind:"transaction",preset:{title:task.title,date:day,type:action.kind,account:action.account??"",target:action.target??"",
   amount:action.amount??"",targetAmount:action.targetAmount??"",category:action.category??"",notes:action.notes??""}}}
  records={finance} base={financePrefs.currency} categories={financePrefs.categories} date={new Date(day+"T00:00:00")} repository={repository}
  owner={owner} close={close} hideAmounts={hideAmounts} saveLinked={saveFinance}/>;
 return <ModalDialog aria-label={label} busy={busy} onDismiss={close} className={surface+" m-auto w-[min(94vw,28rem)] bg-[var(--color-bg)] text-[var(--color-text)]"}>
  <div className="grid gap-3"><h2 className="font-semibold">{label}</h2><p>{task.title} · {day}</p>
   {due.length>0&&<label>預定時段<select className={control} value={time} onChange={event=>setTime(event.target.value)}>
    {due.map(value=><option key={value}>{value}</option>)}</select></label>}
   {!ok(day)&&<p>尚未到可執行日期。</p>}{duplicate&&<p>本次已有正式紀錄。</p>}{!enabled&&<p>請先啟用相關功能。</p>}
   {error&&<p role="alert">{error}</p>}
   <div className="flex gap-2"><button type="button" className={control} disabled={!canExecute||busy} onClick={()=>void execute()}>{action.mode==="form"&&kind==="dose"?"開啟服用表單":"繼續確認"}</button>
    <button type="button" className={control} disabled={busy} onClick={close}>取消</button></div>
  </div>
 </ModalDialog>;
}
