"use client";
import {useEffect,useRef,useState} from 'react';
import {getSupabase} from '../../infrastructure/supabase/client';
import {DictionaryArticle} from './DictionaryBrowser';
import {readPublishedEntry,type PublishedDetail} from './reader';
import {searchCandidates} from './flashcardLinks';
import {readCardDictionaryLink,setCardDictionaryLink} from './cardDictionary';

/** No StudyRepository mutation or rating access: cloud information is supplementary. */
export default function CardDictionaryPanel({cardId,front,fixedEntryId}:{cardId:string;front:string;fixedEntryId?:string}){
  const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const [linked,setLinked]=useState<string|null>(null),[detail,setDetail]=useState<PublishedDetail|null>(null);
  const [list,setList]=useState<Awaited<ReturnType<typeof searchCandidates>>|null>(null),[query,setQuery]=useState(front.slice(0,120));
  const [searched,setSearched]=useState(''),[missing,setMissing]=useState(false);
  const generation=useRef(0);
  useEffect(()=>{generation.current++;setOpen(false);setBusy(false);setDetail(null);setList(null);setLinked(null);setError('');setQuery(front.slice(0,120));},[cardId,front,fixedEntryId]);
  useEffect(()=>{const invalidate=()=>{generation.current++;};const client=getSupabase();const {data}=client?.auth.onAuthStateChange(()=>{
    invalidate();setOpen(false);setBusy(false);setDetail(null);setList(null);setLinked(null);setError('');
  })??{};return()=>{invalidate();data?.subscription.unsubscribe();};},[]);
  async function run(work:(valid:()=>boolean)=>Promise<void>){
    const serial=++generation.current;const valid=()=>serial===generation.current;
    setBusy(true);setError('');
    try{if(!getSupabase())throw new Error('百科服務尚未設定，仍可正常評分。');await work(valid);}catch(e){if(valid())setError(e instanceof Error?e.message:String(e));}finally{if(valid())setBusy(false);}
  }
  async function search(text:string,page=0){await run(async valid=>{const result=await searchCandidates(getSupabase()!,text,page);if(valid()){setList(result);setSearched(text);setDetail(null);setMissing(false);}});}
  async function load(){await run(async valid=>{
    const client=getSupabase()!;const entryId=fixedEntryId??await readCardDictionaryLink(client,cardId);if(!valid())return;setLinked(entryId);
    if(entryId){const result=await readPublishedEntry(client,entryId);if(valid()){setDetail(result);setMissing(!result);setList(null);}}
    else{const result=await searchCandidates(client,front.slice(0,120));if(valid()){setList(result);setSearched(front.slice(0,120));setDetail(null);setMissing(false);}}
  });}
  const choose=(id:string)=>run(async valid=>{const result=await readPublishedEntry(getSupabase()!,id);if(valid()){setDetail(result);setMissing(!result);}});
  const link=(id:string|null)=>run(async valid=>{await setCardDictionaryLink(getSupabase()!,cardId,id);if(valid())setLinked(id);});
  return <section className="w-full space-y-3 rounded-xl border p-3 sm:p-4" aria-label="字典詳情">
    <button type="button" aria-expanded={open} className="w-full text-left font-medium" onClick={()=>{if(open){generation.current++;setBusy(false);setOpen(false);}else{setOpen(true);void load();}}}>{open?'▾':'▸'} 字典詳情</button>
    {open&&<div className="space-y-4 break-words">
      <p className="text-xs opacity-70">公共百科僅提供補充資訊，不會改寫你的英文、中文或學習紀錄。連結需連線且字卡已同步。</p>
      {linked&&<div className="flex flex-wrap gap-3 text-sm"><span>已依穩定詞條 ID 連結</span>{!fixedEntryId&&<button type="button" disabled={busy} className="underline" onClick={()=>void link(null)}>解除連結</button>}</div>}
      {!linked&&<form className="flex gap-2" onSubmit={e=>{e.preventDefault();void search(query.trim());}}><input aria-label="搜尋此卡的公共單字" maxLength={120} className="min-w-0 flex-1 rounded border bg-transparent p-2" value={query} onChange={e=>setQuery(e.target.value)}/><button disabled={busy} className="rounded border px-3">搜尋</button></form>}
      {busy&&<p role="status">正在讀取／儲存百科連結…</p>}
      {error&&<div role="alert"><p>{error}</p><button type="button" disabled={busy} className="underline" onClick={()=>void load()}>重新讀取百科</button><p className="text-xs">連結失敗時可再次按「連結此詞條」；不影響評分。</p></div>}
      {missing&&<p>此詞條尚未收錄或尚未發布。已存連結不會自動改配其他詞條，仍可正常評分。</p>}
      {list&&!linked&&<div className="space-y-2"><p>請依義項選擇詞條；即使只有一筆也不會自動配對。</p>{!list.items.length&&<p>目前沒有符合的已發布单字，仍可正常評分。</p>}{list.items.map(item=><button type="button" disabled={busy} key={item.detail.entry.id} className="block w-full rounded border p-2 text-left" onClick={()=>void choose(item.detail.entry.id)}>{item.detail.entry.headword}<span className="block whitespace-pre-wrap break-words text-sm opacity-70">{item.summary}</span></button>)}<div className="flex justify-between"><button type="button" disabled={busy||list.page===0} onClick={()=>void search(searched,list.page-1)}>上一頁</button><span>第 {list.page+1} 頁</span><button type="button" disabled={busy||!list.has_more} onClick={()=>void search(searched,list.page+1)}>下一頁</button></div></div>}
      {detail&&<><DictionaryArticle data={detail} accordion/>{linked!==detail.entry.id&&<button type="button" disabled={busy} className="rounded border px-3 py-2" onClick={()=>void link(detail.entry.id)}>連結此詞條（不改寫字卡）</button>}</>}
    </div>}
  </section>;
}
