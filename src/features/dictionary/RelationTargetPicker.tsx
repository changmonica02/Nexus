"use client";
import {useEffect,useState} from 'react';
import {getSupabase} from '../../infrastructure/supabase/client';
import {searchRelationTargets,readRelationTarget} from './adminQueries';
import type {DictionarySense} from './dictionary';
export function RelationTargetPicker({entryId,senseId,onChange}:{entryId:string;senseId:string;onChange:(entry:string,sense:string)=>void}){
 const [query,setQuery]=useState(''),[targets,setTargets]=useState<Awaited<ReturnType<typeof searchRelationTargets>>>([]),[senses,setSenses]=useState<DictionarySense[]>([]),[error,setError]=useState(''),[selectedName,setSelectedName]=useState('目前已選詞條');
 useEffect(()=>{let active=true;const timer=setTimeout(()=>{void searchRelationTargets(getSupabase()!,query).then(rows=>{if(active){setTargets(rows);setError('');}}).catch(e=>{if(active)setError(String(e));});},200);return()=>{active=false;clearTimeout(timer);};},[query]);
 useEffect(()=>{let active=true;setSenses([]);setSelectedName('讀取目前詞條…');if(entryId)void readRelationTarget(getSupabase()!,entryId).then(detail=>{if(active){setSenses(detail?.senses??[]);setSelectedName(detail?.entry.headword??'詞條無法讀取');}}).catch(e=>{if(active)setError(String(e));});return()=>{active=false;};},[entryId]);
 const css='w-full min-w-0 rounded border bg-[var(--color-editor-bg)] p-2';
 return <div className="min-w-0 space-y-2"><label className="block text-sm">搜尋字首／字根<input className={css} value={query} onChange={e=>setQuery(e.target.value)} placeholder="輸入英文搜尋（最多 20 筆）"/></label><select aria-label="字首／字根詞條" className={css} value={entryId} onChange={e=>onChange(e.target.value,'')}><option value="">請選擇詞條</option>{entryId&&!targets.some(t=>t.id===entryId)&&<option value={entryId}>{selectedName}</option>}{targets.map(t=><option key={t.id} value={t.id}>{t.headword} · {t.kind==='prefix'?'字首':'字根'}{t.status==='draft'?' · 草稿':''}</option>)}</select><select aria-label="字首／字根中文義" className={css} value={senseId} onChange={e=>onChange(entryId,e.target.value)} disabled={!entryId}><option value="">請選擇中文義</option>{senses.map(s=><option key={s.id} value={s.id}>{s.gloss_zh_tw}</option>)}</select>{error&&<p role="alert">{error}</p>}</div>;
}
