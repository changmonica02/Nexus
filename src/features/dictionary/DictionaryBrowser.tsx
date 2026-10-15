"use client";
import {SidebarToggle} from "../../components/WorkspaceNavigation";
import {Pagination} from '../../components/pagination/Pagination';
import {usePagedList} from '../../components/pagination/usePagedList';

import {inflectionLabels} from './inflections';
import Link from 'next/link';
import {useRouter,useSearchParams} from 'next/navigation';
import {useEffect,useRef,useState,type ReactNode} from 'react';
import {DictionaryWorkspace} from './DictionaryAdmin';
import {loadBrowsePage,readerNeighbours,swipeDirection} from './readerNavigation';
import {getSupabase} from '../../infrastructure/supabase/client';
import {primaryCategories,prefixCategories,searchGrouping,type GroupedDictionaryItem} from './grouping';
import type {DictionaryKind} from './dictionary';
import {readPublishedEntry,type DictionaryPage,type PublishedDetail} from './reader';
import DictionaryFlashcardActions from './DictionaryFlashcardActions';
import {candidateSummary,type DictionaryCandidate} from './flashcardLinks';
import {DictionaryConnections} from './DictionaryConnections';
import {browseHref,dictionaryReturn,entryHref} from './browseRelations';
const box='rounded-xl border p-4';
const kinds={word:'單字',prefix:'字首',root:'字根'};
const verification={unverified:'未查證',pending:'待審核',verified:'已查證',disputed:'有爭議'};
function DetailSection({title,children,accordion=false}:{title:string;children:ReactNode;accordion?:boolean}){return accordion?<details className={`${box} min-w-0`}><summary className="cursor-pointer font-semibold">{title}</summary><div className="mt-3 min-w-0 space-y-3 [overflow-wrap:anywhere]">{children}</div></details>:<section className={box}><h2 className="mb-3 text-lg font-semibold">{title}</h2>{children}</section>;}
export function DictionaryArticle({data,from=`/dictionary/${data.entry.id}`,accordion=false}:{data:PublishedDetail;from?:string;accordion?:boolean}){
  const sections=[...data.senses.map(s=>({id:s.id,title:s.gloss_zh_tw,pos:s.part_of_speech})),{id:null,title:'詞條共用',pos:null}];
  const section=(title:string,children:ReactNode)=><section className="space-y-2 border-t pt-3"><h3 className="font-semibold">{title}</h3>{children}</section>;
  return <article className="min-w-0 space-y-5 [overflow-wrap:anywhere]">
    <header><p className="text-sm opacity-60">{kinds[data.entry.kind]}</p><h1 className="text-3xl font-semibold break-words">{data.entry.headword}</h1></header>
    {!accordion&&<DictionaryConnections key={data.entry.id} data={data} from={from}/>}
    {sections.map(scope=>{
      const belongs=(row:{sense_id:string|null})=>row.sense_id===scope.id;
      const pronunciations=(data.pronunciations??[]).filter(belongs).sort((a,b)=>a.sort_order-b.sort_order||a.id.localeCompare(b.id));
      const forms=(data.inflections??[]).filter(belongs).sort((a,b)=>a.sort_order-b.sort_order);
      const relations=data.relations.filter(belongs),histories=data.etymologies.filter(belongs),examples=(data.examples??[]).filter(belongs),annotations=(data.lexical_annotations??[]).filter(belongs),notes=data.learning_notes.filter(belongs);
      if(scope.id===null&&!forms.length&&!pronunciations.length&&!relations.length&&!histories.length&&!examples.length&&!annotations.length&&!notes.length)return null;
      return <div key={scope.id??'shared'} id={scope.id?`sense-${scope.id}`:undefined}><DetailSection accordion={accordion} title={scope.id?`${scope.pos?`(${scope.pos}) `:''}${scope.title}`:scope.title}>
        <div className="min-w-0 space-y-4">
        {scope.id&&<div><h3 className="text-sm opacity-60">中文義</h3><p className="whitespace-pre-wrap">{scope.title}</p></div>}
        {!!pronunciations.length&&section('讀音',pronunciations.map(p=><div key={p.id}><p>{p.locale&&<span className="mr-2 text-sm">{p.locale}</span>}{p.ipa}</p>{p.note&&<p className="whitespace-pre-wrap text-sm">{p.note}</p>}</div>))}
        {!!relations.length&&section('構詞',relations.map(r=>{const target=data.related.find(t=>t.sense_id===r.target_sense_id);return <div key={r.id}>{target?<><Link className="underline" href={entryHref(target.id,from,target.sense_id)}>{target.headword} · {kinds[target.kind]} · {target.gloss_zh_tw}</Link><Link className="ml-2 text-sm underline" href={browseHref('word',{component:target.id,sense:target.sense_id},from)}>查看使用 {target.headword} 的單字</Link></>:<p>相關詞條尚未提供。</p>}</div>;}))}
        {!!forms.length&&section('詞形變化',<dl className="grid gap-2 sm:grid-cols-2">{forms.map(f=><div key={f.id}><dt className="inline">{inflectionLabels[f.form_kind]}：</dt><dd className="inline">{f.form}</dd></div>)}</dl>)}
        {!!histories.length&&section('歷史詞源',histories.map(h=><div key={h.id}><p className="text-sm">{verification[h.verification]}{h.verification!=='verified'?'（不是已確認的詞源事實）':''}</p><p className="whitespace-pre-wrap">{h.body}</p>{h.data_source&&<p className="text-sm whitespace-pre-wrap">資料來源：{h.data_source}</p>}</div>))}
        {!!examples.length&&section('例詞',[...examples].sort((a,b)=>a.sort_order-b.sort_order).map(x=><p key={x.id} className="whitespace-pre-wrap">{x.body}</p>))}
        {!!annotations.length&&section('字形與待解析提示',annotations.map(x=><div key={x.id}><h4 className="text-sm">{x.kind==='source_forms'?'原始字形':'待解析構詞提示（尚非確認關聯）'}</h4><p className="whitespace-pre-wrap">{x.body}</p></div>))}
        {([{kind:'learning_decomposition',title:'口訣'},{kind:'mnemonic_scenario',title:'記憶故事'}] as const).map(({kind,title})=>notes.some(n=>n.kind===kind)&&<div key={kind}>{section(title,<div aria-label={kind==='mnemonic_scenario'?'記憶情境':title}>{notes.filter(n=>n.kind===kind).map(n=><p key={n.id} className="whitespace-pre-wrap">{n.body}</p>)}</div>)}</div>)}
        </div>
      </DetailSection></div>;
    })}
  </article>;
}

export function GroupedResult({item,from='/dictionary',summary}:{item:GroupedDictionaryItem;from?:string;summary?:string}){
  return <Link href={entryHref(item.id,from,item.sense_id)} className="block rounded border border-[var(--color-border)] p-3"><span>{item.headword}</span>{item.sense_id&&<p className="mt-1 text-sm">{item.gloss_zh_tw}</p>}{!item.sense_id&&summary&&<p className="mt-1 text-sm">{summary}</p>}</Link>;
}
function GroupPage({kind,query,category,from='/dictionary'}:{kind:'prefix'|'root';query:string;category:string;from?:string}){
  const [page,setPage]=useState(()=>Math.max(0,Math.floor(Number(new URL(from,'https://nexus.invalid').searchParams.get('page'))||0)));
  const resultParams=new URL(from,'https://nexus.invalid');resultParams.searchParams.set('category',category);resultParams.searchParams.set('kind',kind);resultParams.searchParams.set('page',String(page));const resultFrom=resultParams.pathname+resultParams.search;
  const listing=usePagedList(JSON.stringify([kind,query,category]),page,20,async p=>{
    const data=await searchGrouping(getSupabase()!,kind,query,p,category);
    const details=await Promise.all(data.items.map(item=>readPublishedEntry(getSupabase()!,item.id)));
    return {...data,summaries:Object.fromEntries(details.filter((e):e is PublishedDetail=>!!e).map(e=>[e.entry.id,candidateSummary(e)]))};
  },setPage);
  const result=listing.data;const shownFrom=new URL(resultFrom,'https://nexus.invalid');shownFrom.searchParams.set('page',String(result?.page??page));
  return <div className="space-y-3 p-3">
    {listing.loading&&<p role="status">讀取中…</p>}
    {listing.error&&<p role="alert">{listing.error}<button className="ml-2 underline" onClick={listing.retry}>重試</button></p>}
    {result&&<>{!result.items.length?<p>此分類沒有符合的已發布詞條。</p>:<ul className="grid gap-3 sm:grid-cols-2">{result.items.map(e=><li key={e.sense_id??e.id}><GroupedResult item={e} from={shownFrom.pathname+shownFrom.search} summary={result.summaries[e.id]}/></li>)}</ul>}
    <Pagination label="分類分頁" page={result.page} total={result.total} pageSize={20} hasMore={result.has_more} loading={listing.loading} onPageChange={setPage}/></>}
  </div>;

}
export function DictionaryGroups({kind,query,from='/dictionary'}:{kind:'prefix'|'root';query:string;from?:string}){
  const [open,setOpen]=useState<string|null>(null);
  const categories=kind==='prefix'?prefixCategories:primaryCategories;
  return <div className="space-y-3">{[...categories,'未分類'].map((label,i)=>{
    const category=i===categories.length?'__ungrouped__':label;
    return <section key={category} className="rounded border border-[var(--color-border)]"><button className="w-full p-3 text-left" aria-expanded={open===category} onClick={()=>setOpen(open===category?null:category)}>{open===category?'▾':'▸'} {label}</button>{open===category&&<GroupPage key={`${kind}:${query}:${category}`} kind={kind} query={query} category={category} from={from}/>}</section>;
  })}</div>;
}
function Content({path,admin}:{path:string[];admin:boolean}){
  const params=useSearchParams(),router=useRouter();
  const kind:DictionaryKind|'all'=params.get('kind')==='prefix'?'prefix':params.get('kind')==='root'?'root':params.get('kind')==='word'?'word':'all';
  const query=params.get('q')??'',page=Math.max(0,Math.floor(Number(params.get('page'))||0));
  const category=params.get('category')??'';
  const component=kind==='word'?params.get('component')??'':'';
  const variant=(kind==='prefix'||kind==='root')?params.get('variant')??'':'';
  const sense=params.get('sense')??'';
  const [input,setInput]=useState(query),[retry,setRetry]=useState(0);
  const [result,setResult]=useState<{key:string;list?:DictionaryPage;candidates?:DictionaryCandidate[];detail?:PublishedDetail|null;error?:string}|null>(null);
  const id=path[0],from=`/dictionary${id?`/${id}`:''}${params.size?`?${params}`:''}`;
  const key=JSON.stringify([id,kind,query,page,component,sense,variant,category,retry,params.get('edit')]);
  const change=(values:Record<string,string>)=>{const next=new URLSearchParams(params);for(const [k,v]of Object.entries(values)){if(v)next.set(k,v);else next.delete(k);}router.push(`/dictionary?${next}`);};
  useEffect(()=>setInput(query),[query]);
  useEffect(()=>{if(!id)return;let active=true;void readPublishedEntry(getSupabase()!,id).then(detail=>{if(active)setResult({key,detail});}).catch(e=>{if(active)setResult({key,error:String(e)});});return()=>{active=false;};},[id,key]);
  const browse=usePagedList(JSON.stringify([kind,query,component,sense,variant,category,id]),page,20,async p=>{
    if(id||(kind!=='all'&&kind!=='word'&&!variant))return {items:[],has_more:false,total:undefined,page:p,candidates:[]};
    const list=await loadBrowsePage(getSupabase()!,from,p);
    const details=await Promise.all(list.items.map(e=>readPublishedEntry(getSupabase()!,e.id)));
    return {...list,candidates:details.filter((d):d is PublishedDetail=>!!d).map(detail=>({detail,summary:candidateSummary(detail)}))};
  },p=>change({page:String(p)}));
  const browseFrom=new URL(from,'https://nexus.invalid');browseFrom.searchParams.set('page',String(browse.data?.page??page));
  const current:typeof result=id?(result?.key===key?result:null):browse.data?{key,list:browse.data,candidates:browse.data.candidates}:null;
  if(path.length>1)return <p>找不到此詞條。</p>;
  return <>
    {!id&&browse.loading&&<p role="status">讀取中…</p>}
    {!id&&browse.error&&<p role="alert">{browse.error}<button className="ml-2 underline" onClick={browse.retry}>重試</button></p>}
    {!id&&<>
      <h1 className="mb-4 text-2xl font-semibold">字典／百科</h1>
      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="詞條類別">{Object.entries({all:"全部",...kinds}).map(([k,label])=><button key={k} aria-pressed={kind===k} className="rounded border px-4 py-2" onClick={()=>change({kind:k,page:'',category:'',component:'',sense:'',variant:''})}>{label}</button>)}</div>
      <form className="mb-4 flex gap-2" onSubmit={e=>{e.preventDefault();change({q:input.trim(),page:''});}}><input className="min-w-0 flex-1 rounded border bg-transparent p-2" aria-label="搜尋英文單字、字首或字根" placeholder={`搜尋英文${kind==='all'?'單字、字首或字根':kinds[kind]}`} maxLength={120} value={input} onChange={e=>setInput(e.target.value)}/><button className="rounded border px-4 py-2">搜尋</button></form>
      {(kind==='prefix'||kind==='root')&&<div className="mb-4 flex flex-wrap gap-2"><select className="min-w-0 max-w-full rounded border bg-[var(--color-editor-bg)] p-2" aria-label="分類篩選" value={category} onChange={e=>change({category:e.target.value,variant:'',page:''})}><option value="">所有分類</option>{(kind==='prefix'?prefixCategories:primaryCategories).map(c=><option key={c}>{c}</option>)}<option value="__ungrouped__">未分類</option></select><input className="min-w-0 rounded border bg-transparent p-2" aria-label="同字變體篩選" placeholder="同字變體（Enter 搜尋）" defaultValue={variant} key={variant} onKeyDown={e=>{if(e.key==='Enter')change({variant:e.currentTarget.value.trim(),category:'',page:''});}}/></div>}
      {(component||variant||category)&&<div className="mb-4 flex flex-wrap gap-2 text-sm">{component&&<Link className="underline" href={entryHref(component,from,sense)}>目前條件：使用此字首／字根{ sense?'義項':''}的單字</Link>}{variant&&<span>同字變體：{variant}</span>}{category&&<span>分類：{category==='__ungrouped__'?'未分類':category}</span>}<button className="underline" onClick={()=>change({component:'',sense:'',variant:'',category:'',page:''})}>清除條件</button></div>}
    </>}
    {!id&&(kind==='prefix'||kind==='root')&&!variant?(category?<GroupPage key={`${kind}:${query}:${category}`} kind={kind} query={query} category={category} from={from}/>:<DictionaryGroups key={`${kind}:${query}`} kind={kind} query={query} from={from}/>):!current?<p role="status">讀取中…</p>:current.error?<div role="alert"><p>{current.error}</p><button onClick={()=>setRetry(n=>n+1)}>重試</button></div>:id?<ReaderEntry key={id} id={id} data={current.detail??null} from={from} admin={admin}/>:current.list&&<>
      {!current.list.items.length?<p>沒有符合的已發布詞條。</p>:<ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{current.list.items.map(e=><li key={e.id}><Link className={`${box} block`} href={entryHref(e.id,browseFrom.pathname+browseFrom.search)}>{e.headword}{e.inflection_matches?.map((m,i)=><p key={i} className="text-sm">{m.form} · {e.headword} 的{inflectionLabels[m.form_kind]}</p>)}<p className="mt-1 text-sm opacity-70">{current.candidates?.find(c=>c.detail.entry.id===e.id)?.summary}</p></Link></li>)}</ul>}
      <Pagination label="搜尋結果分頁" page={current.list.page} total={current.list.total} pageSize={20} hasMore={current.list.has_more} loading={browse.loading} onPageChange={p=>change({page:String(p)})}/>

    </>}
  </>;
}
export function ReaderEditButton({admin,onClick}:{admin:boolean;onClick:()=>void}){return admin?<button className="rounded border px-3 py-2" onClick={onClick}>編輯</button>:null;}
function ReaderEntry({id,data,from,admin}:{id:string;data:PublishedDetail|null;from:string;admin:boolean}){
 const router=useRouter(),params=useSearchParams();const editing=params.get('edit')==='1'&&admin;
 const [neighbours,setNeighbours]=useState<{previous:string|null;next:string|null}>({previous:null,next:null}),[error,setError]=useState('');
 const [activeSense,setActiveSense]=useState<string|undefined>(undefined);
 useEffect(()=>{const read=()=>setActiveSense(window.location.hash.replace('#sense-','')||undefined);read();window.addEventListener('hashchange',read);return()=>window.removeEventListener('hashchange',read);},[]);
 const move=(href:string)=>{setActiveSense(new URL(href,'https://nexus.invalid').hash.replace('#sense-','')||undefined);router.push(href);};
 const start=useRef<{x:number;y:number;time:number}|null>(null);
 useEffect(()=>{let active=true;setNeighbours({previous:null,next:null});setError('');if(data&&!editing)void readerNeighbours(getSupabase()!,id,data.entry.headword,params.get('from'),activeSense).then(n=>{if(active)setNeighbours(n);}).catch(()=>{if(active)setError('相鄰詞條暫時無法讀取，仍可返回搜尋結果。');});return()=>{active=false;};},[id,data,editing,params,activeSense]);
 if(editing)return <><Link className="mb-4 inline-block underline" href={from.replace(/([?&])edit=1(&|$)/,(_,a,b)=>b?a:'').replace(/[?&]$/,'')}>結束編輯，返回詞條</Link><DictionaryWorkspace key={id} entryId={id} embedded/></>;
 return <div style={{touchAction:'pan-y'}} onTouchStart={e=>{const t=e.touches[0];if(e.touches.length!==1||(e.target instanceof Element&&e.target.closest('button,a,input,textarea,select,summary')))start.current=null;else start.current={x:t.clientX,y:t.clientY,time:Date.now()};}} onTouchMove={e=>{if(e.touches.length!==1)start.current=null;}} onTouchCancel={()=>{start.current=null;}} onTouchEnd={e=>{const s=start.current;start.current=null;if(!s)return;const t=e.changedTouches[0],direction=swipeDirection(t.clientX-s.x,t.clientY-s.y,Date.now()-s.time,editing);if(direction&&neighbours[direction])move(neighbours[direction]!);}}>
 <div className="mb-4 flex justify-end"><ReaderEditButton admin={admin} onClick={()=>{const p=new URLSearchParams(params);p.set('edit','1');router.push(`/dictionary/${id}?${p}`);}}/></div>
 {data?<><nav aria-label="相鄰詞條" className="mb-4 flex justify-between gap-3">{neighbours.previous?<Link href={neighbours.previous} onClick={()=>setActiveSense(new URL(neighbours.previous!,'https://nexus.invalid').hash.replace('#sense-','')||undefined)}>← Previous</Link>:<span className="opacity-40">← Previous</span>}{neighbours.next?<Link href={neighbours.next} onClick={()=>setActiveSense(new URL(neighbours.next!,'https://nexus.invalid').hash.replace('#sense-','')||undefined)}>Next →</Link>:<span className="opacity-40">Next →</span>}</nav>{error&&<p role="status">{error}</p>}<DictionaryArticle data={data} from={from}/>{data.entry.kind==='word'&&<DictionaryFlashcardActions entryId={id}/>}</>:<p>此詞條尚未收錄或尚未發布。</p>}
 </div>;
}
export default function DictionaryBrowser({path}:{path:string[]}){
  const params=useSearchParams();
  const from=params.get('from');
  const back=dictionaryReturn(from,path.length?'/dictionary':'/study');
  const [client]=useState(getSupabase),[owner,setOwner]=useState<string|null|undefined>(undefined);
  const [admin,setAdmin]=useState<{owner:string;allowed:boolean}|null>(null);
  useEffect(()=>{if(!client)return;const {data}=client.auth.onAuthStateChange((_event,session)=>setOwner(session?.user.id??null));return()=>data.subscription.unsubscribe();},[client]);
  useEffect(()=>{if(!client||!owner)return;let active=true;void client.rpc('is_dictionary_admin').then(({data,error})=>{if(active)setAdmin({owner,allowed:!error&&data===true});});return()=>{active=false;};},[client,owner]);
  return <main className="h-full min-w-0 flex-1 overflow-y-auto" style={{background:'var(--color-editor-bg)',color:'var(--color-text)'}}><div className="mx-auto max-w-5xl break-words px-4 py-6 sm:px-8"><nav className="mb-6 flex flex-wrap justify-between gap-3 border-b pb-4"><div className="flex items-center gap-2"><SidebarToggle/><Link href={back}>{back==='/study'?"← 字卡首頁":"← 返回上一頁"}</Link></div>{owner&&admin?.owner===owner&&admin.allowed&&<Link href="/dictionary/admin" className="underline">管理字典</Link>}</nav>
    {!client?<p>資料服務尚未設定，字典目前無法讀取。</p>:owner===undefined?<p role="status">正在確認登入…</p>:!owner?<p>請先回到 Nexus 登入，再搜尋字典。</p>:<Content key={owner} path={path} admin={!!(admin?.owner===owner&&admin.allowed)}/>}
  </div></main>;
}
