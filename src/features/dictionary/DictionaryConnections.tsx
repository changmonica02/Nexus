"use client";
import {useEffect,useState} from 'react';
import Link from './DictionaryReadLink';
import {entryHref} from './browseRelations';
import type {PublishedDetail} from './reader';
import {getSupabase} from '../../infrastructure/supabase/client';
import {useDictionaryText} from './useDictionaryText';
type RelatedSense={id:string;headword:string;sense_id:string;part_of_speech:string|null;gloss_zh_tw:string};
export function DictionaryConnections({data,from}:{data:PublishedDetail;from:string}){
 const tr=useDictionaryText(),[rows,setRows]=useState<RelatedSense[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(false),[retry,setRetry]=useState(0);
 const id=data.entry.id,kind=data.entry.kind;
 useEffect(()=>{
  if(kind==='word')return;
  let active=true;setRows([]);setLoading(true);setError(false);
  void(async()=>{
   const client=getSupabase();if(!client)throw Error('Dictionary unavailable');
   const found=new Map<string,RelatedSense>();let expected:number|undefined;
   for(let page=0;active;page++){
    const {data:result,error}=await client.rpc('dictionary_related_word_senses',{component_uuid:id,page_number:page});
    if(!active)return;
    if(error||!result||!Array.isArray(result.items)||typeof result.total!=='number')throw Error('Related words unavailable');
    if(expected!==undefined&&expected!==result.total)throw Error('Related words changed');
    expected=result.total;
    for(const row of result.items as RelatedSense[])found.set(row.id+':'+row.sense_id,row);
    setRows([...found.values()]);
    if(!result.has_more){if(found.size!==expected)throw Error('Related words changed');break;}
    if(!result.items.length||page>=100000)throw Error('Invalid related word page');
   }
  })().catch(()=>{if(active)setError(true);}).finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;};
 },[id,kind,retry]);
 if(kind==='word')return null;
 const groups=new Map<string,RelatedSense[]>();
 for(const row of rows){const group=groups.get(row.id)??[];group.push(row);groups.set(row.id,group);}
 return <section className="min-w-0 space-y-3" aria-label={tr('相關單字')}>
  <h2 className="text-lg font-semibold">{tr('相關單字')}</h2>
  {!!groups.size&&<ul className="space-y-2">{[...groups.values()].map(group=><li key={group[0].id} className="min-w-0 rounded-lg border border-[var(--color-border)] p-3">
   <Link className="font-medium underline" href={entryHref(group[0].id,from)}>{group[0].headword}</Link>
   <ul className="mt-1 space-y-1">{group.map(row=><li key={row.sense_id}><Link className="block text-sm whitespace-pre-wrap [overflow-wrap:anywhere]" href={entryHref(row.id,from,row.sense_id)}>{row.part_of_speech?'('+row.part_of_speech+') ':''}{row.gloss_zh_tw||tr('尚無中文意思')}</Link></li>)}</ul>
  </li>)}</ul>}
  {loading&&<p role="status" className="text-sm opacity-70">{tr('讀取相關單字…')}</p>}
  {error&&<p role="alert" className="text-sm">{tr('相關單字無法讀取。')} <button type="button" className="min-h-11 underline" onClick={()=>setRetry(n=>n+1)}>{tr('重試')}</button></p>}
  {!loading&&!error&&!rows.length&&<p className="text-sm opacity-70">{tr('尚無相關單字')}</p>}
 </section>;
}
