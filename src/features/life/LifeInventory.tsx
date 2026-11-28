"use client";

import { useRef, useState, type FormEvent } from "react";
import ModalDialog from "../../components/ModalDialog";
import type { LifeRepository } from "./LifeRepository";
import { lifeBase, type LifeItem } from "./lists";
import { stockHeads, stockLabel, stockPath, stockTotals, stockUnits, stockUsage, type StockData, type StockPosition } from "./inventory";

const control="min-h-11 max-w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-editor-bg)] px-2";
const today=()=>new Date().toLocaleDateString("sv-SE");
const format=(value:number)=>value.toLocaleString("zh-TW",{maximumFractionDigits:6});
const sum=(values:Map<string,number>)=>[...values].map(([unit,value])=>format(value)+" "+unit).join("、")||"無庫存";
const stateLabel={sealed:"未開封",open:"使用中",used:"已用完",discarded:"已丟棄"};

export function LifeInventory({item,stock,repo,onChange,onClose,onEdit}:{
 item:LifeItem;stock:StockData;repo:LifeRepository;onChange:()=>Promise<void>;onClose:()=>void;onEdit:()=>void;
}){
 const [receiving,setReceiving]=useState(false);
 const [selected,setSelected]=useState("");
 const [mode,setMode]=useState<"use"|"estimate"|"adjust"|"move">("use");
 const [error,setError]=useState("");
 const [busy,setBusy]=useState(false);
 const running=useRef(false);
 const receipt=useRef("");
 const events=stock.life_stock_events.filter(row=>row.item_id===item.id);
 const containers=stockHeads(events);
 const totals=stockTotals(containers);
 const positions=stock.life_stock_positions.filter(row=>row.deleted_at===null);
 const current=containers.find(row=>row.container_id===selected);
 async function run(action:()=>Promise<void>){
  if(running.current)return;
  running.current=true;setBusy(true);setError("");
  try{await action();await onChange();}
  catch(error){setError(error instanceof Error?error.message:String(error));}
  finally{running.current=false;setBusy(false);}
 }
 function receive(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  const data=new FormData(event.currentTarget);
  const value=(key:string)=>String(data.get(key)??"").trim();
  const price=value("price")||null;
  void run(async()=>{
   await repo.receiveStock(item,receipt.current,Number(value("count")),{
    capacity:Number(value("capacity")),unit:value("unit"),position_id:value("position")||null,
    purchased_on:value("date"),expiry:value("expiry")||null,price,currency:price?value("currency").toUpperCase():null,note:"",
   });
   setReceiving(false);
  });
 }
 function change(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(!current)return;
  const data=new FormData(event.currentTarget);
  if(mode==="move"){
   void run(()=>repo.changeStock(current,mode,{position_id:String(data.get("position")??"")||null}));return;
  }
  const amount=Number(data.get("amount"));
  const remaining=Math.round((mode==="use"?current.remaining-amount:mode==="estimate"?current.capacity*amount/100:amount)*1e6)/1e6;
  void run(()=>repo.changeStock(current,mode,{remaining,state:remaining===0?"used":"open"}));
 }
 return <aside className="min-w-0 space-y-4 rounded-xl border border-[var(--color-border)] p-4" aria-label="物品詳細資料">
  <header className="flex flex-wrap items-center gap-2">
   <h2 className="min-w-0 flex-1 break-words text-lg font-semibold">{item.title}</h2>
   <button className={control} onClick={onEdit}>編輯物品</button>
   <button className={control} onClick={onClose}>關閉詳情</button>
  </header>
  <dl className="grid grid-cols-2 gap-3 rounded-lg bg-emerald-500/10 p-3 text-sm">
   <div><dt>持有容器</dt><dd className="font-semibold">{totals.held}</dd></div>
   <div><dt>未開封</dt><dd className="font-semibold">{totals.sealed}</dd></div>
   <div><dt>使用中用量</dt><dd>{sum(totals.opened)}</dd></div>
   <div><dt>剩餘總量</dt><dd>{sum(totals.volume)}</dd></div>
  </dl>
  {error&&<p role="alert" className="text-red-500">{error}</p>}
  <button className={control} onClick={()=>{receipt.current=crypto.randomUUID();setReceiving(true);}}>新增庫存</button>
  {receiving&&<form onSubmit={receive} className="grid gap-2 sm:grid-cols-2">
   <label className="grid">容器數<input name="count" className={control} type="number" min="1" max="100" defaultValue="1" required/></label>
   <label className="grid">每個容器容量<input name="capacity" className={control} type="number" min="0.000001" step="0.000001" defaultValue="1" required/></label>
   <label className="grid">計量單位<input name="unit" className={control} list="stock-unit" defaultValue="件" maxLength={20} required/></label>
   <datalist id="stock-unit">{stockUnits.map(unit=><option key={unit} value={unit}/>)}</datalist>
   <label className="grid">購入日<input name="date" className={control} type="date" defaultValue={today()} required/></label>
   <label className="grid">保存期限<input name="expiry" className={control} type="date"/></label>
   <label className="grid">位置<PositionSelect positions={positions}/></label>
   <label className="grid">單件購入價格<input name="price" className={control} type="number" min="0" step="0.0001"/></label>
   <label className="grid">幣別<input name="currency" className={control} defaultValue="TWD" maxLength={3}/></label>
   <div className="flex flex-wrap gap-2"><button className={control} disabled={busy}>確認入庫</button><button className={control} type="button" onClick={()=>setReceiving(false)}>取消</button></div>
  </form>}
  <section className="space-y-2">
   <h3 className="font-semibold">庫存容器</h3>
   {!containers.length&&<p className="text-sm">尚未入庫。</p>}
   {containers.map(row=><div key={row.container_id} className="space-y-2 border-t border-[var(--color-border)] py-2 text-sm">
    <p>{stateLabel[row.state]} · {format(row.remaining)} / {format(row.capacity)} {row.unit} · {row.purchased_on}{row.expiry&&" · 到期 "+row.expiry}</p>
    {row.position_id&&<p>{stockPath(positions,row.position_id)}</p>}
    <div className="flex flex-wrap gap-1">
     {row.state==="sealed"&&<button className={control} disabled={busy} onClick={()=>void run(()=>repo.changeStock(row,"open",{state:"open",opened_on:today()}))}>開封</button>}
     {row.state==="open"&&<button className={control} onClick={()=>{setMode("use");setSelected(row.container_id);}}>紀錄用量</button>}
     {["sealed","open"].includes(row.state)&&<>
      <button className={control} onClick={()=>{setMode("move");setSelected(row.container_id);}}>移動</button>
      <button className={control} disabled={busy} onClick={()=>{if(window.confirm("確定丟棄這個容器？"))void run(()=>repo.changeStock(row,"discard",{remaining:0,state:"discarded"}));}}>丟棄</button>
     </>}
     {row.sequence>1&&row.action!=="undo"&&<button className={control} disabled={busy} onClick={()=>void run(()=>repo.changeStock(row,"undo"))}>復原末筆異動</button>}
    </div>
    {current?.id===row.id&&<form key={row.id} onSubmit={change} className="flex flex-wrap items-center gap-1">
     {mode==="move"?<PositionSelect positions={positions} value={row.position_id??""}/>:<>
      <select aria-label="記錄方式" className={control} value={mode} onChange={event=>setMode(event.target.value as typeof mode)}>
       <option value="use">實際使用（{row.unit}）</option><option value="adjust">盤點剩餘（{row.unit}）</option><option value="estimate">估算剩餘（%）</option>
      </select>
      <input key={mode} aria-label="用量" name="amount" className={control+" w-28"} type="number" min={mode==="use"?"0.000001":"0"} max={mode==="use"?row.remaining:mode==="estimate"?100:row.capacity} step="0.000001" required/>
     </>}
     <button className={control} disabled={busy}>儲存異動</button><button className={control} type="button" onClick={()=>setSelected("")}>取消</button>
    </form>}
   </div>)}
  </section>
  <details>
   <summary className="cursor-pointer">消耗與異動紀錄</summary>
   {[...stockUsage(events)].map(([unit,row])=>{
    const first=new Date(row.first).toLocaleDateString("sv-SE");
    const last=new Date(row.last).toLocaleDateString("sv-SE");
    const days=(Date.parse(last)-Date.parse(first))/86400000+1;
    const daily=days>1?row.used/days:null;
    const remaining=totals.volume.get(unit)??0;
    return <p key={unit} className="text-sm">
     已使用 {format(row.used)} {unit} · 每次平均 {format(row.used/row.count)} {unit} · 最近使用 {last}
     <br/>{daily?`每日平均 ${format(daily)} ${unit} · 預估剩餘 ${format(remaining/daily)} 日`:"資料不足，無法估算每日用量"}
    </p>;
   })}
   {[...events].sort((a,b)=>b.created_at-a.created_at||b.sequence-a.sequence).slice(0,60).map(row=><p key={row.id} className="border-b border-[var(--color-border)] py-2 text-sm">{new Date(row.created_at).toLocaleString("zh-TW")} · {stockLabel[row.action]} · 剩餘 {format(row.remaining)} {row.unit}</p>)}
  </details>
 </aside>;
}

function PositionSelect({positions,value="",exclude}:{positions:StockPosition[];value?:string;exclude?:string}){
 return <select name="position" aria-label="存放位置" className={control} defaultValue={value}><option value="">未指定</option>
  {positions.filter(row=>row.id!==exclude).map(row=><option key={row.id} value={row.id}>{stockPath(positions,row.id)}</option>)}
 </select>;
}

export function StockPositions({stock,owner,repo,onChange,onClose}:{
 stock:StockData;owner:string|null;repo:LifeRepository;onChange:()=>Promise<void>;onClose:()=>void;
}){
 const [draft,setDraft]=useState<StockPosition|null>(null);
 const [search,setSearch]=useState("");
 const [error,setError]=useState("");
 const pending=useRef(false);
 const positions=stock.life_stock_positions.filter(row=>row.deleted_at===null);
 const stocked=stockHeads(stock.life_stock_events).filter(row=>["sealed","open"].includes(row.state));
 async function save(position:StockPosition,remove=false){
  if(pending.current)return;
  pending.current=true;setError("");
  try{await repo.saveStockPosition(position,remove);await onChange();setDraft(null);}
  catch(error){setError(error instanceof Error?error.message:String(error));}
  finally{pending.current=false;}
 }
 return <ModalDialog onDismiss={onClose} aria-label="共用存放位置" className="m-auto max-h-[85dvh] w-[min(95vw,40rem)] overflow-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-editor-bg)] p-4 text-[var(--color-text)]">
  <header className="mb-3 flex items-center justify-between"><h2 className="font-semibold">共用存放位置</h2><button className={control} onClick={onClose}>關閉</button></header>
  <div className="space-y-3">
   <div className="flex flex-wrap gap-2"><input aria-label="搜尋位置" className={control} value={search} onChange={event=>setSearch(event.target.value)}/>
    <button className={control} onClick={()=>setDraft({...lifeBase(owner,""),parent_id:null})}>新增位置</button></div>
   {error&&<p role="alert">{error}</p>}
   {draft&&<form className="flex flex-wrap gap-2" key={draft.id} onSubmit={event=>{
    event.preventDefault();const data=new FormData(event.currentTarget);
    void save({...draft,title:String(data.get("title")??"").trim(),parent_id:String(data.get("position")??"")||null});
   }}>
    <input aria-label="位置名稱" name="title" className={control} defaultValue={draft.title} maxLength={120} required/>
    <label className="flex items-center gap-1">上層<PositionSelect positions={positions} value={draft.parent_id??""} exclude={draft.id}/></label>
    <button className={control}>儲存</button>
   </form>}
   {positions.map(row=>({row,path:stockPath(positions,row.id)})).filter(row=>row.path.includes(search)).sort((a,b)=>a.path.localeCompare(b.path,"zh-TW")).map(({row,path})=>
    <div key={row.id} className="flex flex-wrap items-center gap-2 border-t border-[var(--color-border)] pt-2">
     <span className="min-w-0 flex-1 break-words">{path} · {stocked.filter(event=>event.position_id===row.id).length} 個容器</span>
     <button className={control} onClick={()=>setDraft(row)}>編輯</button>
     <button className={control} onClick={()=>{if(window.confirm("確定刪除這個位置？"))void save(row,true);}}>刪除</button>
    </div>)}
  </div>
 </ModalDialog>;
}
