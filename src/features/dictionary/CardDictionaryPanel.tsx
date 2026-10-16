"use client";
import {useDictionaryAdminAccess} from './useDictionaryAdminAccess';
import {DictionaryModal} from './DictionaryModal';
import {navigateDictionary} from './useUnsavedDraft';
import {Pagination} from '../../components/pagination/Pagination';
import {usePagedList} from '../../components/pagination/usePagedList';

import {lazy,Suspense,useEffect,useRef,useState} from 'react';
const StudyDictionaryWorkspace=lazy(()=>import('./DictionaryAdmin').then(module=>({default:module.DictionaryWorkspace})));
import {getSupabase} from '../../infrastructure/supabase/client';
import {DictionaryArticle} from './DictionaryBrowser';
import {readPublishedEntry,type PublishedDetail} from './reader';
import {searchCandidates} from './flashcardLinks';
import {readCardDictionaryLink,setCardDictionaryLink} from './cardDictionary';

/** No StudyRepository mutation or rating access: cloud information is supplementary. */
export default function CardDictionaryPanel({cardId,front,fixedEntryId,onEditingChange}:{cardId:string;front:string;fixedEntryId?:string;onEditingChange?:(editing:boolean)=>void}){
  const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const [linked,setLinked]=useState<string|null>(null),[detail,setDetail]=useState<PublishedDetail|null>(null);
  const [query,setQuery]=useState(front.slice(0,120));
  const [searched,setSearched]=useState(''),[missing,setMissing]=useState(false);
  const generation=useRef(0);
  const [editing,setEditing]=useState(false);
  const {access}=useDictionaryAdminAccess(open&&!!linked);
  const editingAllowed=editing&&!!access?.allowed;
  useEffect(()=>{onEditingChange?.(editingAllowed);return()=>onEditingChange?.(false);},[editingAllowed,onEditingChange]);
  const closeEditor=()=>navigateDictionary(()=>{setEditing(false);void load();});
  const [targetPage,setTargetPage]=useState(0),[searchReady,setSearchReady]=useState(false);const [searchVersion,setSearchVersion]=useState(0);
  const candidates=usePagedList(JSON.stringify([cardId,searched,searchVersion,open,linked,searchReady]),targetPage,20,async p=>!open||linked||!searchReady?{items:[],total:0,page:0,has_more:false}:searchCandidates(getSupabase()!,searched,p),setTargetPage);
  useEffect(()=>{generation.current++;setOpen(false);setBusy(false);setDetail(null);setSearchReady(false);setLinked(null);setError('');setQuery(front.slice(0,120));},[cardId,front,fixedEntryId]);
  useEffect(()=>{const invalidate=()=>{generation.current++;setEditing(false);};const client=getSupabase();const {data}=client?.auth.onAuthStateChange(()=>{
    invalidate();setOpen(false);setBusy(false);setDetail(null);setSearchReady(false);setLinked(null);setError('');
  })??{};return()=>{invalidate();data?.subscription.unsubscribe();};},[]);
  async function run(work:(valid:()=>boolean)=>Promise<void>){
    const serial=++generation.current;const valid=()=>serial===generation.current;
    setBusy(true);setError('');
    try{if(!getSupabase())throw new Error('字典服務尚未設定，仍可正常評分。');await work(valid);}catch(e){if(valid())setError(e instanceof Error?e.message:String(e));}finally{if(valid())setBusy(false);}
  }
  async function search(text:string,page=0){setSearched(text);setSearchReady(true);setTargetPage(page);setSearchVersion(n=>n+1);setDetail(null);setMissing(false);}
  async function load(){await run(async valid=>{
    const client=getSupabase()!;const entryId=fixedEntryId??await readCardDictionaryLink(client,cardId);if(!valid())return;setLinked(entryId);
    if(entryId){const result=await readPublishedEntry(client,entryId);if(valid()){setDetail(result);setMissing(!result);setSearchReady(false);}}
    else if(valid()){setSearched(front.slice(0,120));setSearchReady(true);setTargetPage(0);setDetail(null);setMissing(false);}
  });}
  const currentList=candidates.data;
  const choose=(id:string)=>run(async valid=>{const result=await readPublishedEntry(getSupabase()!,id);if(valid()){setDetail(result);setMissing(!result);}});
  const link=(id:string|null)=>run(async valid=>{await setCardDictionaryLink(getSupabase()!,cardId,id);if(valid())setLinked(id);});
  return <section className="w-full space-y-3 rounded-xl border p-3 sm:p-4" aria-label="字典詳情">
    <button type="button" aria-expanded={open} className="w-full text-left font-medium" onClick={()=>{if(open){generation.current++;setBusy(false);setOpen(false);}else{setOpen(true);void load();}}}>{open?'▾':'▸'} 字典詳情</button>
    {open&&<div className="space-y-4 break-words">
      <p className="text-xs opacity-70">字典僅提供補充資訊，不會改寫你的英文、中文或學習紀錄。連結需連線且字卡已同步。</p>
      {linked&&<div className="flex flex-wrap gap-3 text-sm"><span>已依穩定詞條 ID 連結</span>{!fixedEntryId&&<button type="button" disabled={busy} className="underline" onClick={()=>void link(null)}>解除連結</button>}</div>}
      {!linked&&<form className="flex gap-2" onSubmit={e=>{e.preventDefault();void search(query.trim());}}><input aria-label="搜尋此卡的字典詞條" maxLength={120} className="min-w-0 flex-1 rounded border bg-transparent p-2" value={query} onChange={e=>setQuery(e.target.value)}/><button disabled={busy} className="rounded border px-3">搜尋</button></form>}
      {(busy||candidates.loading)&&<p role="status">正在讀取／儲存字典連結…</p>}
      {error&&<div role="alert"><p>{error}</p><button type="button" disabled={busy} className="underline" onClick={()=>void load()}>重新讀取字典</button><p className="text-xs">連結失敗時可再次按「連結此詞條」；不影響評分。</p></div>}
      {candidates.error&&<p role="alert">{candidates.error}<button onClick={candidates.retry}>重試</button></p>}{missing&&<p>此詞條尚未收錄或尚未發布。已存連結不會自動改配其他詞條，仍可正常評分。</p>}
      {currentList&&!linked&&<div className="space-y-2"><p>請依義項選擇詞條；即使只有一筆也不會自動配對。</p>{!currentList.items.length&&<p>目前沒有符合的已發布单字，仍可正常評分。</p>}{currentList.items.map(item=><button type="button" disabled={busy} key={item.detail.entry.id} className="block w-full rounded border p-2 text-left" onClick={()=>void choose(item.detail.entry.id)}>{item.detail.entry.headword}<span className="block whitespace-pre-wrap break-words text-sm opacity-70">{item.summary}</span></button>)}<Pagination page={currentList.page} total={currentList.total} pageSize={20} hasMore={currentList.has_more} loading={candidates.loading} disabled={busy} onPageChange={p=>{setTargetPage(p);setDetail(null);}}/></div>}
      {linked&&detail&&access?.allowed&&<button type="button" className="rounded border px-3 py-2 text-sm" disabled={busy} onClick={()=>setEditing(true)}>編輯詞條</button>}
      {detail&&<><DictionaryArticle data={detail} accordion/>{linked!==detail.entry.id&&<button type="button" disabled={busy} className="rounded border px-3 py-2" onClick={()=>void link(detail.entry.id)}>連結此詞條（不改寫字卡）</button>}</>}
    </div>}
    {editingAllowed&&linked&&<DictionaryModal title="編輯詞條" onClose={closeEditor} dismissOnBackdrop><Suspense fallback={<p role="status">正在讀取詞條編輯器…</p>}><StudyDictionaryWorkspace key={access!.owner+":"+linked} entryId={linked} embedded onCommitted={()=>{setEditing(false);void load();}}/></Suspense></DictionaryModal>}
  </section>;
}
