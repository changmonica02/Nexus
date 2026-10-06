"use client";
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useEffect,useState} from 'react';
import {getSupabase} from '../../infrastructure/supabase/client';
import {readGrouping,readSenseGroups,type DictionaryGrouping,type SenseGroupMap} from './grouping';
import {parseVariants,type Variant} from './variants';
import {browseHref,entryHref,resolveVariant} from './browseRelations';
import type {PublishedDetail,DictionaryPage} from './reader';
const chip='inline-block rounded border border-[var(--color-border)] px-3 py-1 text-sm';
function VariantLink({row,data,from}:{row:Variant;data:PublishedDetail;from:string}){
  const router=useRouter();
  const [items,setItems]=useState<DictionaryPage['items']|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  return <div><button className={chip} disabled={busy} onClick={async()=>{setBusy(true);setError('');try{const matches=await resolveVariant(getSupabase()!,data.entry.kind,row.variant);if(matches.length===1&&matches[0].id!==data.entry.id)router.push(entryHref(matches[0].id,from));else setItems(matches);}catch(e){setError(String(e));}finally{setBusy(false);}}}>{row.variant||'未命名變體'}</button>
    {items&&<div className="my-2 space-y-2 text-sm"><p>{row.condition||'尚未提供出現條件。'}</p>{!items.length&&<p>此變體尚無獨立詞條。</p>}{items.map(item=><Link className={`${chip} mr-2`} key={item.id} href={entryHref(item.id,from)}>{item.headword} · 查看詞條</Link>)}<Link className="block underline" href={browseHref(data.entry.kind,{variant:row.variant},from)}>查看包含此變體的詞條</Link></div>}
    {error&&<p role="alert">{error}</p>}
  </div>;
}
export function DictionaryConnections({data,from}:{data:PublishedDetail;from:string}){
  const [groups,setGroups]=useState<{id:string;entry:DictionaryGrouping;senses:SenseGroupMap}|null>(null),[error,setError]=useState(''),[retry,setRetry]=useState(0);
  useEffect(()=>{if(data.entry.kind==='word')return;let active=true;setError('');
    const client=getSupabase();if(!client)return;
    void Promise.all([readGrouping(client,data.entry.id),data.entry.kind==='prefix'?readSenseGroups(client,data.senses.map(s=>s.id)):Promise.resolve({})]).then(([entry,senses])=>{if(active)setGroups({id:data.entry.id,entry,senses});}).catch(()=>{if(active)setError('關聯分類暫時無法讀取。');});return()=>{active=false;};
  },[data.entry.id,data.entry.kind,data.senses,retry]);
  const current=groups?.id===data.entry.id?groups:null;
  return <section className="space-y-3" aria-label="關聯瀏覽">
    <Link className={chip} href={browseHref(data.entry.kind,{},from)}>全部{data.entry.kind==='word'?'單字':data.entry.kind==='prefix'?'字首':'字根'}</Link>
    {data.entry.kind!=='word'&&<Link className={`${chip} ml-2`} href={browseHref('word',{component:data.entry.id},from)}>使用此{data.entry.kind==='prefix'?'字首':'字根'}的單字</Link>}
    {data.senses.length>1&&<nav className="flex flex-wrap gap-2" aria-label="切換義項">{data.senses.map((s,i)=><a className={chip} key={s.id} href={`#sense-${s.id}`}>{i+1}. {s.gloss_zh_tw}</a>)}</nav>}
    {current&&<>
      {data.entry.kind==='root'&&current.entry.primary_category&&<Link className={chip} href={browseHref('root',{category:current.entry.primary_category},from)}>{current.entry.primary_category}</Link>}
      {data.entry.kind==='prefix'&&data.senses.map(s=><div key={s.id} className="flex flex-wrap gap-2">{current.senses[s.id]&&<Link className={chip} href={browseHref('prefix',{category:current.senses[s.id]!},from)}>{s.gloss_zh_tw} · {current.senses[s.id]}</Link>}<Link className={chip} href={browseHref('word',{component:data.entry.id,sense:s.id},from)}>使用「{s.gloss_zh_tw}」的單字</Link></div>)}
      {parseVariants(current.entry.variant_group).length>0&&<div className="space-y-2"><h2 className="font-semibold">同字變體</h2>{parseVariants(current.entry.variant_group).map((row,i)=><VariantLink key={`${data.entry.id}:${i}`} row={row} data={data} from={from}/>)}</div>}
    </>}
    {error&&<p role="alert">{error}<button className="ml-2 underline" onClick={()=>setRetry(n=>n+1)}>重試</button></p>}
  </section>;
}
