"use client";
import Link from 'next/link';
import {useRouter,useSearchParams} from 'next/navigation';
import {useEffect,useState,type ReactNode} from 'react';
import {getSupabase} from '../../infrastructure/supabase/client';
import {primaryCategories,prefixCategories,searchGrouping,type GroupedDictionaryPage,type GroupedDictionaryItem} from './grouping';
import type {DictionaryKind} from './dictionary';
import {readPublishedEntry,searchDictionary,type DictionaryPage,type PublishedDetail} from './reader';
import DictionaryFlashcardActions from './DictionaryFlashcardActions';
import {searchCandidates,candidateSummary,type DictionaryCandidate} from './flashcardLinks';
import {DictionaryConnections} from './DictionaryConnections';
import {browseHref,dictionaryReturn,entryHref,searchRelations} from './browseRelations';
const box='rounded-xl border p-4';
const kinds={word:'單字',prefix:'字首',root:'字根'};
const verification={unverified:'未查證',pending:'待審核',verified:'已查證',disputed:'有爭議'};
function DetailSection({title,children,accordion=false}:{title:string;children:ReactNode;accordion?:boolean}){return accordion?<details className={`${box} min-w-0`}><summary className="cursor-pointer font-semibold">{title}</summary><div className="mt-3 min-w-0 space-y-3 [overflow-wrap:anywhere]">{children}</div></details>:<section className={box}><h2 className="mb-3 text-lg font-semibold">{title}</h2>{children}</section>;}
export function DictionaryArticle({data,from=`/dictionary/${data.entry.id}`,accordion=false}:{data:PublishedDetail;from?:string;accordion?:boolean}){
  const sense=(id:string|null)=>id?data.senses.find(s=>s.id===id)?.gloss_zh_tw:'詞條共用（不限定義項）';
  return <article className="space-y-5">
    <header><p className="text-sm opacity-60">{kinds[data.entry.kind]}</p><h1 className="text-3xl font-semibold break-words">{data.entry.headword}</h1></header>
    {!accordion&&<DictionaryConnections key={data.entry.id} data={data} from={from}/>}
    {!!data.senses.length&&<DetailSection accordion={accordion} title="中文義項"><ol className="space-y-3">{data.senses.map(s=><li key={s.id} id={`sense-${s.id}`}><p className="whitespace-pre-wrap">{s.part_of_speech&&<span className="mr-2 font-medium">{s.part_of_speech}</span>}{s.gloss_zh_tw}</p></li>)}</ol></DetailSection>}
    {!!data.relations.length&&<DetailSection accordion={accordion} title="構詞關聯"><ul className="space-y-3">{data.relations.map(r=>{
      const target=data.related.find(t=>t.sense_id===r.target_sense_id);return <li key={r.id}>
        <p>義項：{sense(r.sense_id)}</p>
        {target?<Link className="underline" href={entryHref(target.id,from,target.sense_id)}>{target.headword} · {target.gloss_zh_tw}</Link>:<p>相關詞條尚未提供。</p>}
        {target&&<Link className="ml-2 text-sm underline" href={browseHref('word',{component:target.id,sense:target.sense_id},from)}>查看使用 {target.headword} 的單字</Link>}
        <p className="text-sm">{r.relation_kind==='historical_etymology'?'歷史詞源關聯':'學習用拆解（不代表歷史詞源）'} · {verification[r.verification]}</p>

      </li>;
    })}</ul></DetailSection>}
    {!!data.pronunciations?.length&&<DetailSection accordion={accordion} title="讀音">{[...data.pronunciations].sort((a,b)=>a.sort_order-b.sort_order||a.id.localeCompare(b.id)).map(p=><div key={p.id} className="min-w-0 break-words"><p className="text-sm">{sense(p.sense_id)}{p.locale?` · ${p.locale}`:''}</p><p className="text-lg">{p.ipa}</p>{p.note&&<p className="whitespace-pre-wrap text-sm">{p.note}</p>}</div>)}</DetailSection>}
    {!!data.etymologies.length&&<DetailSection accordion={accordion} title="歷史詞源">{data.etymologies.map(h=><div className="mb-4" key={h.id}><p className="text-sm">{sense(h.sense_id)} · {verification[h.verification]}{h.verification!=='verified'?'（不是已確認的詞源事實）':''}</p><p className="my-2 whitespace-pre-wrap">{h.body}</p>{h.data_source&&<p className="whitespace-pre-wrap text-sm">資料來源：{h.data_source}</p>}</div>)}</DetailSection>}
    {!!data.examples?.length&&<DetailSection accordion={accordion} title="例詞">{data.examples.map(x=><div key={x.id}><p className="text-sm">{sense(x.sense_id)}</p><p className="whitespace-pre-wrap">{x.body}</p></div>)}</DetailSection>}
    {!!data.lexical_annotations?.length&&<DetailSection accordion={accordion} title="字形與待解析提示">{data.lexical_annotations.map(x=><div key={x.id}><p className="text-sm">{sense(x.sense_id)}</p><h3>{x.kind==='source_forms'?'原始字形':'待解析構詞提示（尚非確認關聯）'}</h3><p className="whitespace-pre-wrap">{x.body}</p></div>)}</DetailSection>}
    {([{kind:'learning_decomposition',title:'口訣'},{kind:'mnemonic_scenario',title:'記憶故事'}] as const).filter(({kind})=>data.learning_notes.some(n=>n.kind===kind)).map(({kind,title})=><DetailSection key={kind} title={title} accordion={accordion}><div aria-label={kind==='mnemonic_scenario'?'記憶情境':title}>{data.learning_notes.filter(n=>n.kind===kind).map(n=><div key={n.id}><p className="text-sm">{sense(n.sense_id)}</p><p className="my-2 whitespace-pre-wrap">{n.body}</p></div>)}</div></DetailSection>)}
    {accordion&&data.related.length>0&&<DetailSection title="相關詞條" accordion><div className="flex flex-wrap gap-2">{data.related.map(r=><Link key={r.sense_id} className="rounded border p-2" href={entryHref(r.id,from,r.sense_id)}>{r.headword} · {r.gloss_zh_tw}</Link>)}</div></DetailSection>}

  </article>;
}
export function GroupedResult({item,from='/dictionary',summary}:{item:GroupedDictionaryItem;from?:string;summary?:string}){
  return <Link href={entryHref(item.id,from,item.sense_id)} className="block rounded border border-[var(--color-border)] p-3"><span>{item.headword}</span>{item.sense_id&&<p className="mt-1 text-sm">{item.gloss_zh_tw}</p>}{!item.sense_id&&summary&&<p className="mt-1 text-sm">{summary}</p>}</Link>;
}
function GroupPage({kind,query,category,from='/dictionary'}:{kind:'prefix'|'root';query:string;category:string;from?:string}){
  const [page,setPage]=useState(()=>Math.max(0,Number(new URL(from,'https://nexus.invalid').searchParams.get('page'))||0)),[retry,setRetry]=useState(0);
  const resultParams=new URL(from,'https://nexus.invalid');resultParams.searchParams.set('category',category);resultParams.searchParams.set('kind',kind);resultParams.searchParams.set('page',String(page));const resultFrom=resultParams.pathname+resultParams.search;
  const [result,setResult]=useState<GroupedDictionaryPage|null>(null),[error,setError]=useState('');
  const [summaries,setSummaries]=useState<Record<string,string>>({});
  useEffect(()=>{let active=true;setResult(null);setError('');
    void searchGrouping(getSupabase()!,kind,query,page,category).then(async data=>{const entries=await Promise.all(data.items.map(item=>readPublishedEntry(getSupabase()!,item.id)));if(active){setResult(data);setSummaries(Object.fromEntries(entries.filter((e):e is PublishedDetail=>!!e).map(e=>[e.entry.id,candidateSummary(e)])));}}).catch(e=>{if(active)setError(e instanceof Error?e.message:'分類讀取失敗，請重試。');});
    return()=>{active=false;};
  },[kind,query,category,page,retry]);
  return <div className="space-y-3 p-3">{error?<p role="alert">{error}<button className="ml-2 underline" onClick={()=>setRetry(n=>n+1)}>重試</button></p>:!result?<p role="status">讀取中…</p>:<>
    {!result.items.length?<p>此分類沒有符合的已發布詞條。</p>:<ul className="grid gap-3 sm:grid-cols-2">{result.items.map(e=><li key={e.sense_id??e.id}><GroupedResult item={e} from={resultFrom} summary={summaries[e.id]}/></li>)}</ul>}
    <nav aria-label="分類分頁" className="flex justify-between gap-2"><button disabled={!page} onClick={()=>setPage(p=>p-1)}>上一頁</button><span>第 {page+1} 頁</span><button disabled={!result.has_more} onClick={()=>setPage(p=>p+1)}>下一頁</button></nav>
  </>}</div>;
}
export function DictionaryGroups({kind,query,from='/dictionary'}:{kind:'prefix'|'root';query:string;from?:string}){
  const [open,setOpen]=useState<string|null>(null);
  const categories=kind==='prefix'?prefixCategories:primaryCategories;
  return <div className="space-y-3">{[...categories,'未分類'].map((label,i)=>{
    const category=i===categories.length?'__ungrouped__':label;
    return <section key={category} className="rounded border border-[var(--color-border)]"><button className="w-full p-3 text-left" aria-expanded={open===category} onClick={()=>setOpen(open===category?null:category)}>{open===category?'▾':'▸'} {label}</button>{open===category&&<GroupPage key={`${kind}:${query}:${category}`} kind={kind} query={query} category={category} from={from}/>}</section>;
  })}</div>;
}
function Content({path}:{path:string[]}){
  const params=useSearchParams(),router=useRouter();
  const kind:DictionaryKind|'all'=params.get('kind')==='prefix'?'prefix':params.get('kind')==='root'?'root':params.get('kind')==='word'?'word':'all';
  const query=params.get('q')??'',page=Math.max(0,Number(params.get('page'))||0);
  const category=params.get('category')??'';
  const component=kind==='word'?params.get('component')??'':'';
  const variant=(kind==='prefix'||kind==='root')?params.get('variant')??'':'';
  const sense=params.get('sense')??'';
  const [input,setInput]=useState(query),[retry,setRetry]=useState(0);
  const [result,setResult]=useState<{key:string;list?:DictionaryPage;candidates?:DictionaryCandidate[];detail?:PublishedDetail|null;error?:string}|null>(null);
  const id=path[0],from=`/dictionary${id?`/${id}`:''}${params.size?`?${params}`:''}`;
  const key=JSON.stringify([id,kind,query,page,component,sense,variant,category,retry]);
  const change=(values:Record<string,string>)=>{const next=new URLSearchParams(params);for(const [k,v]of Object.entries(values)){if(v)next.set(k,v);else next.delete(k);}router.push(`/dictionary?${next}`);};
  useEffect(()=>setInput(query),[query]);
  useEffect(()=>{if(!id&&(kind==='prefix'||kind==='root')&&!variant)return;let active=true;const client=getSupabase()!;
    const load=id?readPublishedEntry(client,id).then(detail=>({key,detail})):(component||variant?searchRelations(client,kind==='all'?'word':kind,query,page,{component,sense,variant}).then(list=>({key,list})):searchCandidates(client,query,page,kind).then(r=>({key,list:{...r,items:r.items.map(c=>c.detail.entry)},candidates:r.items})));
    void load.then(value=>{if(active)setResult(value);}).catch(e=>{if(active)setResult({key,error:e instanceof Error?e.message:'讀取失敗'});});return()=>{active=false;};
  },[id,key,kind,query,page,component,sense,variant]);
  const current=result?.key===key?result:null;
  if(path.length>1)return <p>找不到此詞條。</p>;
  return <>
    {!id&&<>
      <h1 className="mb-4 text-2xl font-semibold">字典／百科</h1>
      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="詞條類別">{Object.entries({all:"全部",...kinds}).map(([k,label])=><button key={k} aria-pressed={kind===k} className="rounded border px-4 py-2" onClick={()=>change({kind:k,page:'',category:'',component:'',sense:'',variant:''})}>{label}</button>)}</div>
      <form className="mb-4 flex gap-2" onSubmit={e=>{e.preventDefault();change({q:input.trim(),page:''});}}><input className="min-w-0 flex-1 rounded border bg-transparent p-2" aria-label="搜尋英文單字、字首或字根" placeholder={`搜尋英文${kind==='all'?'單字、字首或字根':kinds[kind]}`} maxLength={120} value={input} onChange={e=>setInput(e.target.value)}/><button className="rounded border px-4 py-2">搜尋</button></form>
      {(kind==='prefix'||kind==='root')&&<div className="mb-4 flex flex-wrap gap-2"><select className="min-w-0 max-w-full rounded border bg-[var(--color-editor-bg)] p-2" aria-label="分類篩選" value={category} onChange={e=>change({category:e.target.value,variant:'',page:''})}><option value="">所有分類</option>{(kind==='prefix'?prefixCategories:primaryCategories).map(c=><option key={c}>{c}</option>)}<option value="__ungrouped__">未分類</option></select><input className="min-w-0 rounded border bg-transparent p-2" aria-label="同字變體篩選" placeholder="同字變體（Enter 搜尋）" defaultValue={variant} key={variant} onKeyDown={e=>{if(e.key==='Enter')change({variant:e.currentTarget.value.trim(),category:'',page:''});}}/></div>}
      {(component||variant||category)&&<div className="mb-4 flex flex-wrap gap-2 text-sm">{component&&<Link className="underline" href={entryHref(component,from,sense)}>目前條件：使用此字首／字根{ sense?'義項':''}的單字</Link>}{variant&&<span>同字變體：{variant}</span>}{category&&<span>分類：{category==='__ungrouped__'?'未分類':category}</span>}<button className="underline" onClick={()=>change({component:'',sense:'',variant:'',category:'',page:''})}>清除條件</button></div>}
    </>}
    {!id&&(kind==='prefix'||kind==='root')&&!variant?(category?<GroupPage key={`${kind}:${query}:${category}`} kind={kind} query={query} category={category} from={from}/>:<DictionaryGroups key={`${kind}:${query}`} kind={kind} query={query} from={from}/>):!current?<p role="status">讀取中…</p>:current.error?<div role="alert"><p>{current.error}</p><button onClick={()=>setRetry(n=>n+1)}>重試</button></div>:id?current.detail?<><DictionaryArticle data={current.detail} from={from}/>{current.detail.entry.kind==='word'&&<DictionaryFlashcardActions entryId={current.detail.entry.id}/>}</>:<p>此詞條尚未收錄或尚未發布。</p>:current.list&&<>
      {!current.list.items.length?<p>沒有符合的已發布詞條。</p>:<ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{current.list.items.map(e=><li key={e.id}><Link className={`${box} block`} href={entryHref(e.id,from)}>{e.headword}<p className="mt-1 text-sm opacity-70">{current.candidates?.find(c=>c.detail.entry.id===e.id)?.summary}</p></Link></li>)}</ul>}
      <nav aria-label="搜尋結果分頁" className="mt-5 flex justify-between gap-3"><button disabled={!page} onClick={()=>change({page:String(page-1)})}>上一頁</button><span>第 {page+1} 頁</span><button disabled={!current.list.has_more} onClick={()=>change({page:String(page+1)})}>下一頁</button></nav>
    </>}
  </>;
}
export default function DictionaryBrowser({path}:{path:string[]}){
  const params=useSearchParams();
  const from=params.get('from');
  const back=dictionaryReturn(from,path.length?'/dictionary':'/study');
  const [client]=useState(getSupabase),[owner,setOwner]=useState<string|null|undefined>(undefined);
  const [admin,setAdmin]=useState<{owner:string;allowed:boolean}|null>(null);
  useEffect(()=>{if(!client)return;const {data}=client.auth.onAuthStateChange((_event,session)=>setOwner(session?.user.id??null));return()=>data.subscription.unsubscribe();},[client]);
  useEffect(()=>{if(!client||!owner)return;let active=true;void client.rpc('is_dictionary_admin').then(({data,error})=>{if(active)setAdmin({owner,allowed:!error&&data===true});});return()=>{active=false;};},[client,owner]);
  return <main className="h-dvh overflow-y-auto" style={{background:'var(--color-editor-bg)',color:'var(--color-text)'}}><div className="mx-auto max-w-5xl break-words px-4 py-6 sm:px-8"><nav className="mb-6 flex flex-wrap justify-between gap-3 border-b pb-4"><Link href={back}>{back==='/study'?"← 字卡首頁":"← 返回字典"}</Link>{owner&&admin?.owner===owner&&admin.allowed&&<Link href="/dictionary/admin" className="underline">管理公共字典</Link>}</nav>
    {!client?<p>資料服務尚未設定，字典目前無法讀取。</p>:owner===undefined?<p role="status">正在確認登入…</p>:!owner?<p>請先回到 Nexus 登入，再搜尋公共字典。</p>:<Content key={owner} path={path}/>}
  </div></main>;
}
