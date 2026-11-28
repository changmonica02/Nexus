import { control } from "./dashboard/styles";
import { body,str } from "./health/model";
import { defaultCategories,financeRows } from "./finance/model";
import { actionNames,isFinanceAction,type ActionSources,type TaskAction,type ActionKind } from "./taskLink";

export default function TaskLinkFields({action,change,sources}:{action?:TaskAction;change:(value?:TaskAction)=>void;sources?:ActionSources}){
 const set=(key:keyof TaskAction,value:string)=>action&&change({...action,[key]:value});
 const finance=!!action&&isFinanceAction(action.kind);
 const rows=sources?.finance??[],health=sources?.health??[];
 const choices=(label:string,key:keyof TaskAction,values:[string,string][])=>action&&<label className="grid gap-1">{label}<select className={control}
  value={action[key]??""} onChange={event=>set(key,event.target.value)}><option value="">未選擇</option>
  {values.map(([id,title])=><option key={id} value={id}>{title}</option>)}</select></label>;
 const input=(label:string,key:keyof TaskAction,numeric=false)=>action&&<label className="grid gap-1">{label}<input className={control}
  type={numeric?"number":"text"} min={numeric?"0.01":undefined} step={numeric?"any":undefined} value={action[key]??""} onChange={event=>set(key,event.target.value)}/></label>;
 const accounts=financeRows(rows,"account").filter(row=>!row.payload.archived).map(({id,payload}):[string,string]=>[id,payload.title+"（"+payload.currency+"）"]);
 return <fieldset className="grid gap-2 rounded-lg border border-[var(--color-border)] p-2"><legend>連動操作</legend>
  <label className="grid gap-1">連動模組<select value={action?finance?"finance":"health":""} className={control} onChange={event=>change(event.target.value?
   {kind:event.target.value==="finance"?"expense":"water",mode:"form"}:undefined)}>
   <option value="">不連動</option><option value="health">健康管理</option><option value="finance">財務</option></select></label>
  {action&&<>
   <label className="grid gap-1">執行動作<select className={control} value={action.kind} onChange={event=>change({kind:event.target.value as ActionKind,mode:"form"})}>
    {(Object.keys(actionNames) as ActionKind[]).filter(kind=>isFinanceAction(kind)===finance).map(kind=><option key={kind} value={kind}>{actionNames[kind]}</option>)}
   </select></label>
   <label className="grid gap-1">執行方式<select className={control} value={action.mode} onChange={event=>set("mode",event.target.value)}>
    <option value="form">開啟表單</option>{action.kind!=="sleep"&&<option value="quick">快速確認</option>}</select></label>
   {action.kind==="subscription"?choices("週期交易","related",financeRows(rows,"subscription").filter(row=>row.payload.state==="active").map(row=>[row.id,row.payload.title])):
    finance?<div className="grid gap-2 sm:grid-cols-2">{choices("帳戶（含幣別）","account",accounts)}{input("預設金額","amount",true)}
     {action.kind==="transfer"?<>{choices("轉入帳戶","target",accounts)}{input("跨幣別轉入金額","targetAmount",true)}</>:
      choices("分類","category",(financeRows(rows,"preferences")[0]?.payload.categories??defaultCategories).map(value=>[value,value]))}</div>:<>
     {action.kind==="dose"&&choices("照護計畫","related",health.filter(row=>row.kind==="medication").map(row=>[row.id,str(row,"title")]))}
     {action.kind==="meal"&&choices("常用餐點","related",health.filter(row=>row.kind==="recipe"&&!row.data.archived).map(row=>[row.id,str(row,"title")]))}
     {action.kind==="body"&&choices("量測指標","metric",Object.entries(body))}
     {["water","exercise","body"].includes(action.kind)&&input(action.kind==="water"?"預設容量（mL）":action.kind==="exercise"?"預設運動分鐘":"預設量測值","amount",true)}
     {choices("關聯健康目標","goal",health.filter(row=>row.kind==="goal").map(row=>[row.id,str(row,"title")]))}
    </>}
   {input("連動備註","notes")}
  </>}
 </fieldset>;
}
