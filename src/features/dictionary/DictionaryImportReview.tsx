"use client";
import {PersistentImportReview} from './PersistentImportReview';
import {persistentImportAvailable} from './persistentImport';
import {useEffect,useRef,useState} from 'react';
import {Pagination} from '../../components/pagination/Pagination';
import {usePaginationLanguage} from '../../lib/LanguageContext';
import {parseExchange,previewExchange,recheckExchangeItem,exchangeCategory,importReport,exchangeFormat} from './dictionaryExchange';
import {downloadDictionaryJSON} from './exchangeExport';
import {getSupabase} from '../../infrastructure/supabase/client';
import {confirmDialog} from '../../lib/confirmDialog';
import {parseDictionaryCSVPreview,exportDictionaryCSV} from './dictionaryCSV';
import {normalizeDictionaryBundle,parseDictionaryImport} from './adminImport';
import {loadImportSession,persistImportSession} from './importSessionStore';
import {applyBatchDecision,applyImportItems,buildImportSession,canBatchDecision,chooseIssue,sessionCounts,type ImportAction,type ImportItem,type ImportSession} from './importReview';
import {DraftValidationError,type DictionaryDraftInput,type DraftIssue} from './draftPipeline';
const button='rounded border border-[var(--color-border)] bg-[var(--color-panel-bg)] px-3 py-2 text-sm disabled:opacity-40';
const control='w-full min-w-0 rounded border border-[var(--color-border)] bg-[var(--color-editor-bg)] p-2 text-sm';
const value=(v:unknown)=>v===undefined||v===null?'（空白）':typeof v==='string'?v:JSON.stringify(v,null,2);

function LegacyDictionaryImportReview({raw,format,onSaved,onBusy}:{raw:string;format:'csv'|'json'|'md';onSaved:()=>Promise<unknown>;onBusy:(busy:boolean)=>void}){
  const {t}=usePaginationLanguage();const controller=useRef<AbortController|null>(null);
  const [previewProgress,setPreviewProgress]=useState({done:0,total:0}),[reviewPage,setReviewPage]=useState(0);
  const [owner,setOwner]=useState(''),[session,setSession]=useState<ImportSession|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[onlyPending,setOnlyPending]=useState(true);
  useEffect(()=>{let active=true;void(async()=>{try{const {data,error}=await getSupabase()!.auth.getUser();if(error||!data.user)throw Error('請重新登入');const stored=await loadImportSession(data.user.id);if(active){setOwner(data.user.id);setSession(stored);}}catch(e){if(active)setMessage(String(e));}})();return()=>{active=false;controller.current?.abort();};},[]);
  const persist=async(s:ImportSession,changed?:ImportItem[])=>{await persistImportSession(s,changed);setSession(structuredClone(s));};
  const run=async(fn:()=>Promise<void>)=>{setBusy(true);onBusy(true);setMessage('');try{await fn();}catch(e){setMessage(e instanceof Error?e.message:String(e));}finally{setBusy(false);onBusy(false);}};
  async function preview(){
    if(session?.items.some(i=>i.operation&&['pending','failed'].includes(i.status)))throw Error(t('exchange.pendingReply'));
    if(session&&session.items.some(i=>!['applied','unchanged','skipped'].includes(i.status))&&!await confirmDialog({title:t('exchange.preview'),message:t('exchange.replacePreview'),confirmLabel:t('exchange.preview')}))return;
    if(format==='json'&&JSON.parse(raw.replace(/^\uFEFF/,''))?.format===exchangeFormat){setReviewPage(0);const next=await previewExchange(getSupabase()!,owner,parseExchange(raw),(done,total)=>setPreviewProgress({done,total}));await persist(next);return;}
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
    const next=await buildImportSession(getSupabase()!,owner,source,drafts,issues,crypto.randomUUID(),{onProgress:(done,total)=>setPreviewProgress({done,total})});setReviewPage(0);await persist(next);
  }
  async function recheck(item:ImportItem){
    if(!session)return;
    // A lost response must first retry its exact operation; otherwise a committed write could be forgotten.
    if(item.status==='failed'&&item.operation)throw Error(t('exchange.pendingReply'));
    const replacement=item.exchange_version!==undefined?await recheckExchangeItem(getSupabase()!,item):(await buildImportSession(getSupabase()!,owner,session.source_type,[item.draft],[],session.id)).items[0];
    await persist({...session,confirmed_scope:undefined,items:session.items.map(i=>i.id===item.id?replacement:i)});
  }
  const counts=session?sessionCounts(session):null;
  const unresolved=(i:ImportItem)=>['stale','failed'].includes(i.status)||(i.status==='pending'&&i.issues.some(x=>!x.selectedAction||x.selectedAction==='later'));
  const reviews=session?.items.filter(i=>(i.bucket==='review'||i.safeAction==='normalize')&&(!onlyPending||unresolved(i)||i.status==='pending'))??[];
  const visibleReviews=reviews.slice(reviewPage*50,(reviewPage+1)*50);
  const apply=async(includeReview:boolean)=>{if(!session)return;const scope=includeReview?'reviewed':'safe';
    if(session.confirmed_scope!==scope&&!await confirmDialog({title:t('exchange.confirmImport'),message:t('exchange.verifyImport'),confirmLabel:t('exchange.confirmImport')}))return;
    const authorized={...session,confirmed_scope:scope} as ImportSession;await persist(authorized);
    controller.current=new AbortController();await applyImportItems(getSupabase()!,authorized,includeReview,persist,{batched:true,signal:controller.current.signal});await onSaved();};
  return <section className="min-w-0 space-y-3">
    <button className={button} disabled={busy||!owner||!raw} onClick={()=>void run(preview)}>{t("exchange.preview")}</button>
    {busy&&<button type="button" className={button} onClick={()=>controller.current?.abort()}>{t("exchange.pause")}</button>}
    {busy&&previewProgress.total>0&&<p role="status">{t("exchange.previewProgress",previewProgress)}</p>}
    {session&&counts&&<>
      <h3 className="font-semibold">{t("exchange.preview")}</h3>
      <p>{(["new","modified","unchanged","review","invalid","conflict"] as const).map(c=>t(`exchange.${c}`)+" "+session.items.filter(i=>exchangeCategory(i)===c).length).join(" · ")}</p>
      <p role="status">{t("exchange.importProgress",{total:session.items.length,done:session.items.filter(i=>["applied","unchanged","skipped"].includes(i.status)).length,failed:counts.failed,remaining:session.items.filter(i=>i.status==="pending").length})}</p>
      <button type="button" className={button} disabled={busy} onClick={()=>downloadDictionaryJSON(importReport(session),"dictionary-import-results.json")}>{t("exchange.report")}</button><p className="break-all text-xs opacity-70">{session.source_type} · {session.preview_at} · Session {session.id}</p>
      <p>{t('exchange.safeSummary',{total:counts.safeTotal,done:counts.safeApplied})}</p>
      <button className={button} disabled={busy||!session.items.some(i=>i.bucket==='safe'&&['pending','failed'].includes(i.status))} onClick={()=>void run(()=>apply(false))}>{t("exchange.applySafe")}</button>
      <p>{t('exchange.reviewSummary',{total:session.items.filter(i=>i.bucket==='review').length,pending:counts.reviewUnresolved,done:counts.reviewResolved})}</p>
      <label className="flex gap-2 text-sm"><input type="checkbox" checked={onlyPending} onChange={e=>setOnlyPending(e.target.checked)}/>{t('exchange.onlyPending')}</label>
      {visibleReviews.map(item=><article key={item.id} className="space-y-3 rounded border border-[var(--color-border)] p-3">
        <h4 className="font-semibold">{t('exchange.row',{n:item.draft.row??1})} · {item.draft.kind} · {item.context?.snapshot?<a className="underline" href={`/dictionary/admin?entry=${encodeURIComponent(item.draft.entry_id)}`}>{item.draft.headword}</a>:item.draft.headword}</h4>
        {item.issues.map(issue=><div key={issue.id} className="space-y-2 border-t border-[var(--color-border)] pt-2">
          <p>{t('exchange.row',{n:issue.row})} · {issue.kind} · {issue.type} · {issue.field} · {issue.reason}</p>
          <div className="grid min-w-0 gap-2 sm:grid-cols-2"><div>{t("exchange.existing")}<pre className="whitespace-pre-wrap break-words text-xs">{value(issue.existing)}</pre></div><div>{t("exchange.incoming")}<pre className="whitespace-pre-wrap break-words text-xs">{value(issue.incoming)}</pre></div></div>
          <select aria-label={t('exchange.reviewAction',{n:issue.row,field:issue.field})} className={control} disabled={busy||item.status!=='pending'||!!item.operation} value={issue.selectedAction??''} onChange={e=>{const action=e.target.value as ImportAction;if(!action)return;void run(()=>persist({...session,confirmed_scope:undefined,items:session.items.map(i=>i.id===item.id?chooseIssue(i,issue.id,action):i)}));}}><option value="">{t('exchange.chooseAction')}</option>{issue.allowedActions.map(a=><option key={a} value={a}>{t('exchange.action.'+a)}</option>)}</select>
          {issue.selectedAction&&issue.batchKey&&(()=>{const action=issue.selectedAction!;const n=session.items.filter(i=>i.status==='pending'&&!i.operation).flatMap(i=>i.issues).filter(other=>other.id!==issue.id&&canBatchDecision(issue,other,action)).length;return n>0&&<button className={button} disabled={busy} onClick={()=>void run(async()=>{if(await confirmDialog({title:t('exchange.applyReviewed'),message:t('exchange.batchDecision',{n}),confirmLabel:t('exchange.applyReviewed')}))await persist({...applyBatchDecision(session,item.id,issue.id,action),confirmed_scope:undefined});})}>{t('exchange.batchDecision',{n})}</button>;})()}
        </div>)}
      </article>)}
      <Pagination label={t("exchange.previewPages")} page={reviewPage} total={reviews.length} pageSize={50} disabled={busy} onPageChange={setReviewPage}/>
      <button className={button} disabled={busy} onClick={()=>void run(()=>apply(true))}>{t("exchange.applyReviewed")}</button>
      <p className="text-sm">{t('exchange.recoveryHint')}</p>
      {session.items.filter(i=>i.status==='stale'||i.status==='failed').map(i=><div key={i.id} role="alert" className="space-y-2 rounded border p-2"><p>{i.draft.headword}：{i.message}</p>{i.status==='failed'&&i.operation?<button className={button} disabled={busy} onClick={()=>void run(()=>apply(true))}>{t('exchange.retryOperation')}</button>:<button className={button} disabled={busy} onClick={()=>void run(()=>recheck(i))}>{t('exchange.recheck')}</button>}</div>)}
      {session.items.some(i=>i.review_id)&&<div className="space-y-2"><p>{t("exchange.savedReviews",{n:session.items.filter(i=>i.review_id).length})}</p>{session.items.filter(i=>i.review_id).slice(0,50).map(i=><a className="mr-3 inline-block underline" key={i.id} href={`/dictionary/admin?entry=${encodeURIComponent(i.draft.entry_id)}`}>{i.draft.headword}</a>)}</div>}
      <p className="text-sm">{t('exchange.results',{stale:counts.stale,failed:counts.failed,affected:counts.affectedIDs.length})}</p>
      {['csv','legacy_csv'].includes(session.source_type)&&session.items.some(i=>i.appliedDraft&&['applied','unchanged'].includes(i.status))&&<button className={button} onClick={()=>void run(async()=>{const data=exportDictionaryCSV(session.items.filter(i=>i.appliedDraft&&['applied','unchanged'].includes(i.status)).map(i=>i.appliedDraft!));const url=URL.createObjectURL(new Blob(['\uFEFF'+data],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='dictionary_master_v1.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);})}>{t('exchange.downloadCSV')}</button>}
    </>}
    {message&&<p role="alert" className="whitespace-pre-wrap break-words">{message}</p>}
  </section>;
}

export function DictionaryImportReview(props:Parameters<typeof PersistentImportReview>[0]){
 const [available,setAvailable]=useState<boolean|null>(null),[error,setError]=useState('');
 useEffect(()=>{let active=true;const client=getSupabase();if(client)void persistentImportAvailable(client).then(v=>{if(active)setAvailable(v);}).catch(e=>{if(active)setError(String(e));});return()=>{active=false;};},[]);
 if(error)return <p role="alert">{error}</p>;
 if(available===null)return <p role="status">…</p>;
 return available?<PersistentImportReview {...props}/>:<><p>新版常駐審核尚未啟用，目前保留原匯入流程。 / Persistent review is not enabled; the existing import remains available.</p><LegacyDictionaryImportReview {...props}/></>;
}
