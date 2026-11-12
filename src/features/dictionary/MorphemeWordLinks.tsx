"use client";
import {useEffect,useRef,useState} from 'react';
import {getSupabase} from '../../infrastructure/supabase/client';
import {reviewFailure,reviewFailureText} from './reviewApproval';
import {usePaginationLanguage} from '../../lib/LanguageContext';
import {editMorphemeWordLink,readMorphemeWordLinks,type MorphemeWordLink} from './morphemeLinks';
import {listAdminEntries} from './adminQueries';
import type {DictionaryEntry} from './dictionary';
export default function MorphemeWordLinks({entryId,senseId,beforeWrite,afterWrite}:{entryId:string;senseId:string;beforeWrite:()=>Promise<boolean>;afterWrite:()=>void}){
 const {language,t}=usePaginationLanguage(),en=language==='en';const text=(zh:string,english:string)=>en?english:zh;
 const [open,setOpen]=useState(false),[rows,setRows]=useState<MorphemeWordLink[]>([]),[query,setQuery]=useState(''),[results,setResults]=useState<DictionaryEntry[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState(false),[epoch,setEpoch]=useState(0),[page,setPage]=useState(0),[more,setMore]=useState(false);
 const running=useRef(false),identities=useRef(new Map<string,string>());
 useEffect(()=>{if(!open)return;let active=true;const client=getSupabase();if(client)void readMorphemeWordLinks(client,entryId,senseId,page).then(r=>{if(active){setRows(r.items);setMore(r.has_more);}}).catch(e=>{if(active)setError(e.message.startsWith('morpheme.')?t(e.message):reviewFailureText(reviewFailure(e),t));});return()=>{active=false;};},[open,entryId,senseId,epoch,page,t]);
 const run=async(work:()=>Promise<void>)=>{if(running.current)return;running.current=true;setBusy(true);setError('');try{await work();}catch(e){setError(e instanceof Error&&e.message.startsWith('morpheme.')?t(e.message):reviewFailureText(reviewFailure(e),t));}finally{running.current=false;setBusy(false);}};
 const edit=async(wordId:string,id?:string)=>run(async()=>{try{if(!await beforeWrite())throw Error('morpheme.saveFirst');const key=wordId+':'+senseId;const relation=id??identities.current.get(key)??crypto.randomUUID();identities.current.set(key,relation);await editMorphemeWordLink(getSupabase()!,wordId,entryId,senseId,relation,!!id);setEpoch(n=>n+1);}finally{afterWrite();}});
 return <details data-morpheme-links className="min-w-0 rounded border border-[var(--color-border)] p-2" onToggle={e=>setOpen(e.currentTarget.open)}><summary className="min-h-11 cursor-pointer py-2">{text('連結單字','Linked words')}</summary>{open&&<div className="space-y-2">
  <form className="flex min-w-0 gap-1" onSubmit={e=>{e.preventDefault();void run(async()=>{const r=await listAdminEntries(getSupabase()!,{kinds:['word'],statuses:[],query:query.trim(),page:0});setResults(r.items.slice(0,20));});}}><input aria-label={text('搜尋連結單字','Search linked words')} maxLength={120} className="min-h-11 min-w-0 flex-1 rounded border bg-transparent p-2" value={query} onChange={e=>setQuery(e.target.value)}/><button type="submit" className="min-h-11 rounded border px-2" disabled={busy}>{text('搜尋','Search')}</button></form>
  {results.map(e=><div key={e.id} className="flex min-w-0 justify-between gap-2"><span className="break-all">{e.headword}</span><button type="button" className="min-h-11 shrink-0 px-2 underline" disabled={busy} onClick={()=>void edit(e.id)}>{text('連結','Link')}</button></div>)}
  {rows.map(r=><div key={r.id+String(r.review_id)} className="flex min-w-0 items-center justify-between gap-2"><a className="min-w-0 break-words underline" href={'/dictionary/admin?entry='+encodeURIComponent(r.entry_id)}>{r.headword}{r.removed?' · '+text('草稿待解除','Draft removal pending'):r.ambiguous?' · '+text('多份草稿，請至單字編輯器選擇','Multiple drafts; choose in the Word editor'):r.pending?' · '+text('草稿待發布','Draft pending publication'):''}</a><button type="button" className="min-h-11 shrink-0 px-2" disabled={busy||r.removed||r.ambiguous} onClick={()=>void edit(r.entry_id,r.id)}>{text('解除關聯','Unlink')}</button></div>)}
  {(page>0||more)&&<div className="flex gap-2"><button type="button" className="min-h-11 rounded border px-2" disabled={busy||!page} onClick={()=>setPage(n=>n-1)}>{text('上一頁','Previous')}</button><button type="button" className="min-h-11 rounded border px-2" disabled={busy||!more} onClick={()=>setPage(n=>n+1)}>{text('下一頁','Next')}</button></div>}
  {!rows.length&&<p className="text-sm opacity-60">{text('尚無連結單字','No linked words')}</p>}
  <p className="text-xs opacity-60">{text('已發布單字的變更會儲存至草稿，仍需人工發布。','Changes to published words are saved as drafts for manual publication.')}</p>
  {error&&<p role="alert" className="whitespace-pre-wrap text-sm">{error}</p>}
 </div>}</details>;
}
