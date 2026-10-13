"use client";
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {getSupabase} from '../../infrastructure/supabase/client';
import {readRelationTarget} from './adminQueries';
import {DictionaryModal} from './DictionaryModal';
import type {DictionaryDetail} from './dictionary';
const css='w-full min-w-0 rounded border bg-[var(--color-editor-bg)] p-2';
const button='min-h-11 rounded border px-3 py-2 disabled:opacity-40';
type Target={id:string;headword:string;kind:string;senses:{id:string;gloss_zh_tw:string;part_of_speech:string|null}[]};
export function RelationSelectionDialog({excludeEntryId,excludedSenseIds=[],onSelect,onClose}:{excludeEntryId?:string;excludedSenseIds?:string[];onSelect:(entry:string,sense:string)=>void;onClose:()=>void}){
 const [query,setQuery]=useState(''),[page,setPage]=useState(0),[retry,setRetry]=useState(0),[selected,setSelected]=useState<Target|null>(null);
 const key=JSON.stringify([query,page,retry]);
 const [result,setResult]=useState<{key:string;rows:Target[];more:boolean;error:string}|null>(null);
 const current=result?.key===key?result:null,loading=!current,rows=current?.rows??[],more=current?.more??false,error=current?.error??'';
 useEffect(()=>{let active=true;const timer=setTimeout(()=>{void (async()=>{try{const {data,error}=await getSupabase()!.rpc('search_dictionary_relation_targets',{query_text:query,page_number:page});if(error)throw Error(error.message);if(active)setResult({key,rows:data.items,more:data.has_more,error:''});}catch(e){if(active)setResult({key,rows:[],more:false,error:`查詢失敗：${String(e)}`});}})();},250);return()=>{active=false;clearTimeout(timer);};},[query,page,retry,key]);
 return <DictionaryModal title="選取構詞關聯" onClose={onClose}><label className="block">搜尋詞條或中文義項<input autoFocus className={css} value={query} onChange={e=>{setQuery(e.target.value);setPage(0);setSelected(null);}}/></label><div role="status" aria-live="polite">{loading?'搜尋中…':!rows.length&&!error?'查無可連結的已發布詞條；請取消，另行建立及發布所需詞條。':''}</div>{error&&<p role="alert">{error}<button className={button} onClick={()=>setRetry(n=>n+1)}>重試</button></p>}
 {!selected?<ul className="space-y-2">{rows.map(t=>{const own=t.id===excludeEntryId,duplicate=t.senses.every(s=>excludedSenseIds.includes(s.id));return <li key={t.id}><button className={`${button} w-full text-left`} disabled={loading||own||duplicate||!t.senses.length} onClick={()=>{if(t.senses.length===1)onSelect(t.id,t.senses[0].id);else setSelected(t);}}>{t.headword} · {t.kind==='word'?'Word':t.kind==='prefix'?'Prefix':'Root'}<span className="block text-sm">{t.senses.map(s=>s.gloss_zh_tw).join('；')}{own?'（不能連結自身）':duplicate?'（已選取）':''}</span></button></li>;})}</ul>:<section className="space-y-2"><h3>{selected.headword} · 請選擇義項</h3>{selected.senses.map(s=><button key={s.id} className={`${button} block w-full text-left`} disabled={excludedSenseIds.includes(s.id)} onClick={()=>onSelect(selected.id,s.id)}>{s.part_of_speech} · {s.gloss_zh_tw}{excludedSenseIds.includes(s.id)?'（已選取）':''}</button>)}<button className={button} onClick={()=>setSelected(null)}>返回詞條選擇</button></section>}
 {!selected&&<nav aria-label="候選詞條分頁" className="flex justify-between"><button className={button} disabled={loading||page===0} onClick={()=>setPage(p=>p-1)}>上一頁</button><span>第 {page+1} 頁</span><button className={button} disabled={loading||!more} onClick={()=>setPage(p=>p+1)}>下一頁</button></nav>}<button className={button} onClick={onClose}>取消</button></DictionaryModal>;
}
export function RelationTargetPicker({entryId,senseId,excludeEntryId,excludedSenseIds,onChange}:{entryId:string;senseId:string;excludeEntryId?:string;excludedSenseIds?:string[];onChange:(entry:string,sense:string)=>void}){
 const [open,setOpen]=useState(false),[retry,setRetry]=useState(0);
 const key=JSON.stringify([entryId,retry]);
 const [result,setResult]=useState<{key:string;target:DictionaryDetail|null;error:string}|null>(null);
 const current=result?.key===key?result:null,target=current?.target,loading=!current,error=current?.error??'';
 useEffect(()=>{let active=true;void readRelationTarget(getSupabase()!,entryId).then(target=>{if(active)setResult({key,target,error:''});}).catch(()=>{if(active)setResult({key,target:null,error:'目標讀取失敗'});});return()=>{active=false;};},[entryId,retry,key]);
 const sense=target?.senses.find(s=>s.id===senseId),valid=target?.entry.status==='published'&&sense&&entryId!==excludeEntryId;
 return <div className="min-w-0 space-y-2">{loading?<p role="status">讀取成分…</p>:valid?<Link className="underline" target="_blank" href={`/dictionary/${entryId}#sense-${senseId}`}>{target.entry.headword} · {target.entry.kind==='word'?'Word':target.entry.kind==='prefix'?'Prefix':'Root'} · {sense.gloss_zh_tw}</Link>:<p role="alert">{error||'目標詞條或義項已失效／尚未發布，請更換或移除。'}<button className={button} onClick={()=>setRetry(n=>n+1)}>重試</button></p>}<button type="button" className={button} onClick={()=>setOpen(true)}>更換</button>{open&&<RelationSelectionDialog excludeEntryId={excludeEntryId} excludedSenseIds={excludedSenseIds} onClose={()=>setOpen(false)} onSelect={(entry,sense)=>{onChange(entry,sense);setOpen(false);}}/>}</div>;
}
