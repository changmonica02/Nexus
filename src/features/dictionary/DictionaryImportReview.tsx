"use client";
import {useEffect,useState} from 'react';
import {getSupabase} from '../../infrastructure/supabase/client';
import {confirmDialog} from '../../lib/confirmDialog';
import {parseDictionaryCSVPreview,exportDictionaryCSV} from './dictionaryCSV';
import {normalizeDictionaryBundle,parseDictionaryImport} from './adminImport';
import {loadImportSession,persistImportSession} from './importSessionStore';
import {actionLabels,applyBatchDecision,applyImportItems,buildImportSession,canBatchDecision,chooseIssue,sessionCounts,type ImportAction,type ImportItem,type ImportSession} from './importReview';
import {DraftValidationError,type DictionaryDraftInput,type DraftIssue} from './draftPipeline';
const button='rounded border border-[var(--color-border)] bg-[var(--color-panel-bg)] px-3 py-2 text-sm disabled:opacity-40';
const control='w-full min-w-0 rounded border border-[var(--color-border)] bg-[var(--color-editor-bg)] p-2 text-sm';
const value=(v:unknown)=>v===undefined||v===null?'（空白）':typeof v==='string'?v:JSON.stringify(v,null,2);

export function DictionaryImportReview({raw,format,onSaved,onBusy}:{raw:string;format:'csv'|'json'|'md';onSaved:()=>Promise<unknown>;onBusy:(busy:boolean)=>void}){
  const [owner,setOwner]=useState(''),[session,setSession]=useState<ImportSession|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[onlyPending,setOnlyPending]=useState(true);
  useEffect(()=>{let active=true;void(async()=>{try{const {data,error}=await getSupabase()!.auth.getUser();if(error||!data.user)throw Error('請重新登入');const stored=await loadImportSession(data.user.id);if(active){setOwner(data.user.id);setSession(stored);}}catch(e){if(active)setMessage(String(e));}})();return()=>{active=false;};},[]);
  const persist=async(s:ImportSession)=>{await persistImportSession(s);setSession(structuredClone(s));};
  const run=async(fn:()=>Promise<void>)=>{setBusy(true);onBusy(true);setMessage('');try{await fn();}catch(e){setMessage(e instanceof Error?e.message:String(e));}finally{setBusy(false);onBusy(false);}};
  async function preview(){
    if(session&&session.items.some(i=>!['applied','unchanged','skipped'].includes(i.status))&&!await confirmDialog('建立新預覽會取代此裝置尚未處理的審核清單，已寫入內容不會刪除。繼續？'))return;
    let drafts:DictionaryDraftInput[]=[],issues:DraftIssue[]=[];
    if(format==='csv')({drafts,issues}=await parseDictionaryCSVPreview(raw));
    else{
      const bundle=await parseDictionaryImport(raw,format);
      const ids=new Set([...(bundle.dictionary_entries??[]).map(e=>String(e.id)),...Object.entries(bundle).filter(([t])=>t!=='dictionary_entries').flatMap(([,rows])=>rows.map(r=>String(r.entry_id)))]);
      for(const id of ids){const part=Object.fromEntries(Object.entries(bundle).map(([table,rows])=>[table,rows.filter(r=>table==='dictionary_entries'?r.id===id:r.entry_id===id)]));
        try{drafts.push(...await normalizeDictionaryBundle(getSupabase()!,part));}catch(e){const d:DictionaryDraftInput={entry_id:id,kind:'word',headword:String(part.dictionary_entries?.[0]?.headword??'待審核內容'),row:drafts.length+1,senses:[],etymologies:[],examples:[],learning_notes:[],lexical_annotations:[],relation_hints:[],relations:[]};drafts.push(d);issues.push({row:d.row!,kind:d.kind,field:'legacy_mapping',error:String(e)});}
      }
    }
    if(!drafts.length&&issues.length)throw new DraftValidationError(issues);
    const source=format==='csv'&&!raw.replace(/^\uFEFF/,'').split(/\r?\n/,1)[0].split(',').includes('kind')?'legacy_csv':format;
    const next=await buildImportSession(getSupabase()!,owner,source,drafts,issues);await persist(next);
  }
  async function recheck(item:ImportItem){
    if(!session)return;
    // A lost response must first retry its exact operation; otherwise a committed write could be forgotten.
    if(item.status==='failed'&&item.operation)throw Error('此操作可能已成功，請先重試原操作以確認結果。');
    const next=await buildImportSession(getSupabase()!,owner,session.source_type,[item.draft],[],session.id);
    await persist({...session,items:session.items.map(i=>i.id===item.id?next.items[0]:i)});
  }
  const counts=session?sessionCounts(session):null;
  const unresolved=(i:ImportItem)=>['stale','failed'].includes(i.status)||(i.status==='pending'&&i.issues.some(x=>!x.selectedAction||x.selectedAction==='later'));
  const reviews=session?.items.filter(i=>i.bucket==='review'&&(!onlyPending||unresolved(i)))??[];
  const apply=async(includeReview:boolean)=>{if(!session||!await confirmDialog(includeReview?'寫入無誤項目與已完成審核項目？未處理項目會保留。':'直接寫入無誤項目？需要人工審核的內容會保留。'))return;await applyImportItems(getSupabase()!,session,includeReview,persist);await onSaved();};
  return <section className="min-w-0 space-y-3">
    <button className={button} disabled={busy||!owner||!raw} onClick={()=>void run(preview)}>產生匯入預覽</button>
    {session&&counts&&<>
      <h3 className="font-semibold">匯入預覽</h3><p className="break-all text-xs opacity-70">{session.source_type} · {session.preview_at} · Session {session.id}</p>
      <p>✓ 可直接寫入 {counts.safeTotal}（新增 {session.items.filter(i=>i.bucket==='safe'&&i.safeAction==='new').length}、已存在相同 {session.items.filter(i=>i.bucket==='safe'&&i.safeAction==='unchanged').length}）· 已處理 {counts.safeApplied}</p>
      <button className={button} disabled={busy||!session.items.some(i=>i.bucket==='safe'&&['pending','failed'].includes(i.status))} onClick={()=>void run(()=>apply(false))}>直接寫入無誤項目</button>
      <p>⚠ 需要人工審核 {session.items.filter(i=>i.bucket==='review').length} · 未處理 {counts.reviewUnresolved} · 已決策 {counts.reviewResolved}</p>
      <label className="flex gap-2 text-sm"><input type="checkbox" checked={onlyPending} onChange={e=>setOnlyPending(e.target.checked)}/>只看未處理</label>
      {reviews.map(item=><article key={item.id} className="space-y-3 rounded border border-[var(--color-border)] p-3">
        <h4 className="font-semibold">第 {item.draft.row??1} 列 · {item.draft.kind} · {item.draft.headword}</h4>
        {item.issues.map(issue=><div key={issue.id} className="space-y-2 border-t border-[var(--color-border)] pt-2">
          <p>第 {issue.row} 列 · {issue.kind} · {issue.type} · {issue.field} · {issue.reason}</p>
          <div className="grid min-w-0 gap-2 sm:grid-cols-2"><div>現有<pre className="whitespace-pre-wrap break-words text-xs">{value(issue.existing)}</pre></div><div>匯入<pre className="whitespace-pre-wrap break-words text-xs">{value(issue.incoming)}</pre></div></div>
          <select aria-label={`第 ${issue.row} 列 ${issue.field} 的審核操作`} className={control} disabled={busy||item.status!=='pending'||!!item.operation} value={issue.selectedAction??''} onChange={e=>{const action=e.target.value as ImportAction;if(!action)return;void run(()=>persist({...session,items:session.items.map(i=>i.id===item.id?chooseIssue(i,issue.id,action):i)}));}}><option value="">選擇操作</option>{issue.allowedActions.map(a=><option key={a} value={a}>{actionLabels[a]}</option>)}</select>
          {issue.selectedAction&&issue.batchKey&&(()=>{const action=issue.selectedAction!;const n=session.items.filter(i=>i.status==='pending'&&!i.operation).flatMap(i=>i.issues).filter(other=>other.id!==issue.id&&canBatchDecision(issue,other,action)).length;return n>0&&<button className={button} disabled={busy} onClick={()=>void run(async()=>{if(await confirmDialog(`將此決策套用到其他 ${n} 筆相同分類補值條件？`))await persist(applyBatchDecision(session,item.id,issue.id,action));})}>套用到其他 {n} 筆相同情況</button>;})()}
        </div>)}
      </article>)}
      <button className={button} disabled={busy} onClick={()=>void run(()=>apply(true))}>寫入無誤項目＋已完成審核項目</button>
      <p className="text-sm">未選擇或「暫不處理」會保留，關閉視窗後可在此裝置繼續。選「略過」會略過整個詞條；不會刪除既有內容。</p>
      {session.items.filter(i=>i.status==='stale'||i.status==='failed').map(i=><div key={i.id} role="alert" className="space-y-2 rounded border p-2"><p>{i.draft.headword}：{i.message}</p>{i.status==='failed'&&i.operation?<button className={button} disabled={busy} onClick={()=>void run(()=>apply(true))}>重試原操作</button>:<button className={button} disabled={busy} onClick={()=>void run(()=>recheck(i))}>重新審核此項</button>}</div>)}
      <p className="text-sm">過期 {counts.stale} · 失敗 {counts.failed} · 已影響 {counts.affectedIDs.length} 個詞條</p>
      {['csv','legacy_csv'].includes(session.source_type)&&session.items.some(i=>i.appliedDraft&&['applied','unchanged'].includes(i.status))&&<button className={button} onClick={()=>void run(async()=>{const data=exportDictionaryCSV(session.items.filter(i=>i.appliedDraft&&['applied','unchanged'].includes(i.status)).map(i=>i.appliedDraft!));const url=URL.createObjectURL(new Blob(['\uFEFF'+data],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='dictionary_master_v1.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);})}>下載已寫入項目 CSV（含永久 ID）</button>}
    </>}
    {message&&<p role="alert" className="whitespace-pre-wrap break-words">{message}</p>}
  </section>;
}
