"use client";
import {Pagination} from '../../components/pagination/Pagination';
import {usePagedList} from '../../components/pagination/usePagedList';

import {useEffect,useState,useRef} from 'react';
import Link from 'next/link';
import {getSupabase} from '../../infrastructure/supabase/client';
import {readRelationTarget} from './adminQueries';
import {useDictionaryAdminAccess} from './useDictionaryAdminAccess';
import {invalidateDictionary} from './dictionaryInvalidation';
import {DictionaryModal} from './DictionaryModal';
import type {DictionaryDetail} from './dictionary';
const css='w-full min-w-0 rounded border bg-[var(--color-editor-bg)] p-2';
const button='min-h-11 rounded border px-3 py-2 disabled:opacity-40';
type Target={id:string;headword:string;kind:string;senses:{id:string;gloss_zh_tw:string;part_of_speech:string|null}[]};
function QuickComponent({query,onCreated,onClose}:{query:string;onCreated:(target:Target)=>void;onClose:()=>void}){
 const [name,setName]=useState(query),[kind,setKind]=useState<'prefix'|'root'>('prefix'),[confirmed,setConfirmed]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const operation=useRef<{key:string;id:string}|null>(null);
 async function create(){
  if(busy||!confirmed||!name.trim())return;
  const key=JSON.stringify([kind,name.trim()]);if(operation.current?.key!==key)operation.current={key,id:crypto.randomUUID()};
  setBusy(true);setError('');
  try{const {data,error}=await getSupabase()!.rpc('quick_create_dictionary_component',{operation_uuid:operation.current.id,component_kind:kind,component_name:name.trim(),content_verified:true});if(error)throw Error(error.message);invalidateDictionary();onCreated(data as Target);}catch(e){setError(String(e));}finally{setBusy(false);}
 }
 return <DictionaryModal title="建立新字首／字根" busy={busy} onClose={onClose}><label className="block">詞條名稱<input autoFocus maxLength={120} disabled={busy} className={css} value={name} onChange={e=>{setName(e.target.value);setConfirmed(false);}}/></label><label className="block">詞條類型<select className={css} disabled={busy} value={kind} onChange={e=>{setKind(e.target.value as 'prefix'|'root');setConfirmed(false);}}><option value="prefix">字首</option><option value="root">字根</option></select></label><p className="text-sm">建立並發布僅含名稱的詞條，中文意思可日後補充。相符的已發布詞條會直接重用；目前編輯中的詞條不會發布。</p><label className="flex items-start gap-2"><input type="checkbox" disabled={busy} checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>我已確認名稱、類型與構詞用途，同意發布。</label>{error&&<p role="alert">{error}</p>}<div className="flex flex-wrap gap-2"><button className={button} disabled={busy||!confirmed||!name.trim()} onClick={()=>void create()}>{busy?'建立中…':'確認建立並發布'}</button><button className={button} disabled={busy} onClick={onClose}>取消</button></div></DictionaryModal>;
}
export function RelationSelectionDialog({excludeEntryId,excludedSenseIds=[],onSelect,onClose}:{excludeEntryId?:string;excludedSenseIds?:string[];onSelect:(entry:string,sense:string)=>void;onClose:()=>void}){
 const {access}=useDictionaryAdminAccess();
 const [creating,setCreating]=useState(false),[selectionError,setSelectionError]=useState('');
 const [query,setQuery]=useState(''),[page,setPage]=useState(0),[selected,setSelected]=useState<Target|null>(null);
 const listing=usePagedList(query,page,20,async p=>{
  await new Promise(resolve=>setTimeout(resolve,250));
  const {data,error}=await getSupabase()!.rpc('search_dictionary_relation_targets',{query_text:query,page_number:p});
  if(error)throw Error(error.message);return {...data,page:p} as {items:Target[];has_more:boolean;page:number;total?:number};
 },setPage);
 const rows=listing.data?.items??[],loading=listing.loading,error=listing.error;
 function choose(target:Target){
  if(target.id===excludeEntryId||!target.senses?.length){setSelectionError('詞條已建立，但無法加入此關聯；請重新搜尋。');return;}
  const available=target.senses.filter(s=>!excludedSenseIds.includes(s.id));
  if(!available.length){setSelectionError('此詞條已存在，但義項已被選取；沒有新增重複關聯。');return;}
  if(available.length===1)onSelect(target.id,available[0].id);else setSelected(target);
 }
 return <DictionaryModal title="選取構詞關聯" onClose={onClose}><label className="block">搜尋詞條或中文義項<input autoFocus className={css} value={query} onChange={e=>{setQuery(e.target.value);setPage(0);setSelected(null);}}/></label><div role="status" aria-live="polite">{loading?'搜尋中…':!rows.length&&!error?'查無可連結的已發布詞條。可建立所需的字首／字根。':''}</div>{error&&<p role="alert">{error}<button className={button} onClick={listing.retry}>重試</button></p>}
 {!selected?<ul className="space-y-2">{rows.map(t=>{const own=t.id===excludeEntryId,duplicate=t.senses.every(s=>excludedSenseIds.includes(s.id));return <li key={t.id}><button className={`${button} w-full text-left`} disabled={loading||own||duplicate||!t.senses.length} onClick={()=>{if(t.senses.length===1)onSelect(t.id,t.senses[0].id);else setSelected(t);}}>{t.headword} · {t.kind==='word'?'Word':t.kind==='prefix'?'Prefix':'Root'}<span className="block text-sm">{t.senses.map(s=>s.gloss_zh_tw).join('；')}{own?'（不能連結自身）':duplicate?'（已選取）':''}</span></button></li>;})}</ul>:<section className="space-y-2"><h3>{selected.headword} · 請選擇義項</h3>{selected.senses.map(s=><button key={s.id} className={`${button} block w-full text-left`} disabled={excludedSenseIds.includes(s.id)} onClick={()=>onSelect(selected.id,s.id)}>{s.part_of_speech} · {s.gloss_zh_tw}{excludedSenseIds.includes(s.id)?'（已選取）':''}</button>)}<button className={button} onClick={()=>setSelected(null)}>返回詞條選擇</button></section>}
 {selectionError&&<p role="alert">{selectionError}</p>}{access?.allowed&&<button type="button" className={button} onClick={()=>setCreating(true)}>＋ 建立新字首／字根</button>}{creating&&<QuickComponent query={query} onClose={()=>setCreating(false)} onCreated={target=>{setCreating(false);listing.retry();choose(target);}}/>}
 {!selected&&<Pagination label="候選詞條分頁" page={listing.data?.page??0} total={listing.data?.total} pageSize={20} hasMore={listing.data?.has_more} loading={loading} disabled={!listing.data} onPageChange={setPage}/>}<button className={button} onClick={onClose}>取消</button></DictionaryModal>;
}
export function RelationTargetPicker({entryId,senseId,excludeEntryId,excludedSenseIds,onChange}:{entryId:string;senseId:string;excludeEntryId?:string;excludedSenseIds?:string[];onChange:(entry:string,sense:string)=>void}){
 const [open,setOpen]=useState(false);
 const [retry,setRetry]=useState(0);
 const key=JSON.stringify([entryId,retry]);
 const [result,setResult]=useState<{key:string;target:DictionaryDetail|null;error:string}|null>(null);
 const current=result?.key===key?result:null,target=current?.target,loading=!current,error=current?.error??'';
 useEffect(()=>{let active=true;void readRelationTarget(getSupabase()!,entryId).then(target=>{if(active)setResult({key,target,error:''});}).catch(()=>{if(active)setResult({key,target:null,error:'目標讀取失敗'});});return()=>{active=false;};},[entryId,retry,key]);
 const sense=target?.senses.find(s=>s.id===senseId),valid=target?.entry.status==='published'&&sense&&entryId!==excludeEntryId;
 return <div className="flex min-w-0 flex-wrap items-center gap-2">{loading?<p role="status">讀取成分…</p>:valid?<Link className="underline" target="_blank" href={`/dictionary/${entryId}#sense-${senseId}`}>{target.entry.headword} · {target.entry.kind==='word'?'Word':target.entry.kind==='prefix'?'Prefix':'Root'} · {sense.gloss_zh_tw}</Link>:<p role="alert">{error||'目標詞條或義項已失效／尚未發布，請更換或移除。'}<button className={button} onClick={()=>setRetry(n=>n+1)}>重試</button></p>}<button type="button" className={button} onClick={()=>setOpen(true)}>更換</button>{open&&<RelationSelectionDialog excludeEntryId={excludeEntryId} excludedSenseIds={excludedSenseIds} onClose={()=>setOpen(false)} onSelect={(entry,sense)=>{onChange(entry,sense);setOpen(false);}}/>}</div>;
}
