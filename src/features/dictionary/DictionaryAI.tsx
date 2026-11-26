"use client";
import {confirmDialog} from '../../lib/confirmDialog';

import {useState} from 'react';
import type {SupabaseClient} from '@supabase/supabase-js';
import {getSupabase} from '../../infrastructure/supabase/client';
import {matchAIEntry,parseAI,readAI,planAI,submitAI,type AIEntry,type AIPlan,type AISnapshot} from './aiDictionary';
const button='rounded border border-[var(--color-border)] px-3 py-2 disabled:opacity-40';
const labels:Record<string,string>={pronunciations:'讀音',headword:'單字／字首／字根',classification:'分類',meanings:'中文義',components:'構詞關聯',etymology:'歷史詞源',core_concept:'概念'};
async function targetsFor(client:SupabaseClient,s:AISnapshot|null,input?:AIEntry){
 const ids=new Set([...(s?.detail.relations.map(r=>r.target_entry_id)??[]),...(input?.components?.map(c=>c.target_id)??[])]);
 return new Map(await Promise.all([...ids].map(async id=>[id,await readAI(client,id)] as const)));
}
interface Row {input:AIEntry;plan?:AIPlan;error?:string;status?:'accepted'|'ignored'}
export function AIImport({raw,onBusy,onSaved}:{raw:string;onBusy:(b:boolean)=>void;onSaved:()=>Promise<void>}){
 const [rows,setRows]=useState<Row[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function build(input:AIEntry,rebase=false):Promise<AIPlan>{
  const client=getSupabase()!;const match=await matchAIEntry(client,structuredClone(input));const adjusted=match.input;const current=match.current;
  if(rebase&&current)adjusted.revision=current.detail.entry.revision;
  const plan=planAI(adjusted,current,await targetsFor(client,current,adjusted));
  if(match.matched)plan.warnings.push('同類同拼寫已存在：使用既有 Entry，新增語義保存為新義項，請確認 Diff。');

  if(!plan.conflict){const result=await submitAI(client,plan,true) as {warnings?:unknown[]};if(result?.warnings?.length)plan.warnings.push('發現同拼寫或相似內容，請人工確認；同類同拼寫不能建立第二 Entry。');}
  return plan;
 }
 async function run(work:()=>Promise<void>){setBusy(true);onBusy(true);setError('');try{await work();}catch(e){setError(e instanceof Error?e.message:String(e));}finally{setBusy(false);onBusy(false);}}
 async function preview(){await run(async()=>{setRows([]);const doc=parseAI(raw),next:Row[]=[];for(const input of doc.entries){try{next.push({input,plan:await build(input)});}catch(e){next.push({input,error:e instanceof Error?e.message:String(e)});}}setRows(next);});}
 const replace=(index:number,row:Row)=>setRows(rows=>rows.map((r,i)=>i===index?row:r));
 return <div className="space-y-4"><p className="text-sm">逐詞條人工確認。漏掉的義項、構詞、來源與內容會保留；AI 不會刪除或發布資料。新來源及修改內容待審核。</p>
 <button className={button} disabled={busy||!raw} onClick={()=>void preview()}>驗證 AI JSON 並產生 Diff</button>
 {error&&<p role="alert">{error}</p>}
 {rows.map((row,i)=><section key={i} className="space-y-3 rounded border border-[var(--color-border)] p-3"><h3 className="font-semibold">{row.input.headword??row.input.id??'新增詞條'} {row.status==='accepted'?'· 已寫入草稿':row.status==='ignored'?'· 已忽略':''}</h3>
 {row.error&&<p role="alert">格式／資料錯誤：{row.error}</p>}
 {row.plan&&<><p>{row.plan.baseline?.detail.entry.status==='published'?'Published → 審核草稿':row.plan.baseline?'更新 Draft':'新增 Draft'}</p>
 {row.plan.conflict&&<p role="alert">Revision conflict：匯出版本與目前版本不同，不可覆蓋。</p>}
 {row.plan.warnings.map((w,j)=><p key={j} className="text-sm">⚠ {w}</p>)}
 <p className="text-xs opacity-70">下方為原資料與 AI 提案；提案缺少的內容不代表刪除，會保留原資料。</p>
 {row.plan.changes.map((d,j)=><div key={j} className="space-y-1"><h4>{d.kind} · {labels[d.label]??d.label}</h4><div className="grid gap-2 sm:grid-cols-2"><pre className="overflow-auto whitespace-pre-wrap break-all rounded bg-[var(--color-panel-bg)] p-2 text-xs">原：{JSON.stringify(d.before,null,2)}</pre><pre className="overflow-auto whitespace-pre-wrap break-all rounded bg-[var(--color-panel-bg)] p-2 text-xs">新：{JSON.stringify(d.after,null,2)}</pre></div></div>)}
 </>}
 {!row.status&&<div className="flex flex-wrap gap-2"><button className={button} disabled={busy||!row.plan||row.plan.conflict||!row.plan.changes.some(c=>c.kind!=='缺少')} onClick={()=>void run(async()=>{if(!await confirmDialog('接受這筆 AI 修改並寫入草稿？不會發布或刪除原資料。'))return;try{await submitAI(getSupabase()!,row.plan!,false);replace(i,{...row,status:'accepted'});await onSaved();}catch(e){replace(i,{...row,error:`儲存未確認：${e instanceof Error?e.message:String(e)}。請刷新或重新產生 Diff 後確認。`});}})}>接受這筆修改</button><button className={button} disabled={busy} onClick={()=>replace(i,{...row,status:'ignored'})}>忽略</button>
 <button className={button} disabled={busy} onClick={()=>void run(async()=>{if(!await confirmDialog('重新讀取目前版本並產生新的 Diff？仍須再次接受才寫入。'))return;replace(i,{input:row.input,plan:await build(row.input,true)});})}>重新對目前版本產生 Diff</button></div>}
 </section>)}
 </div>;
}
