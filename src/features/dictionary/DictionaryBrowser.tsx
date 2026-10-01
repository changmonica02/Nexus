"use client";
import Link from 'next/link';
import {useSearchParams} from 'next/navigation';
import {useEffect,useState} from 'react';
import {getSupabase} from '../../infrastructure/supabase/client';
import {primaryCategories} from './grouping';
import type {DictionaryKind} from './dictionary';
import {readPublishedEntry,searchDictionary,sourceUrl,type DictionaryPage,type PublishedDetail} from './reader';
const box='rounded-xl border p-4';
const kinds={word:'單字',prefix:'字首',root:'字根'};
const verification={unverified:'未查證',pending:'待審核',verified:'已查證',disputed:'有爭議'};
export function DictionaryArticle({data}:{data:PublishedDetail}){
  const source=(id:string)=><a className="text-xs underline" href={`#source-${id}`}>查看來源</a>;
  const sense=(id:string|null)=>id?data.senses.find(s=>s.id===id)?.gloss_zh_tw:'整個詞條';
  return <article className="space-y-5">
    <header><p className="text-sm opacity-60">{kinds[data.entry.kind]}</p><h1 className="text-3xl font-semibold break-words">{data.entry.headword}</h1>{source(data.entry.source_id)}</header>
    <section className={box}><h2 className="mb-3 text-lg font-semibold">詞性與繁體中文義項</h2><ol className="space-y-3">{data.senses.map(s=><li key={s.id} id={`sense-${s.id}`}><p className="whitespace-pre-wrap">{s.part_of_speech&&<span className="mr-2 font-medium">{s.part_of_speech}</span>}{s.gloss_zh_tw}</p>{source(s.source_id)}</li>)}</ol></section>
    <section className={box}><h2 className="mb-3 text-lg font-semibold">相關字首／字根</h2>{!data.relations.length&&<p>尚無構詞關聯。</p>}<ul className="space-y-3">{data.relations.map(r=>{
      const target=data.related.find(t=>t.sense_id===r.target_sense_id);return <li key={r.id}>
        <p>義項：{sense(r.sense_id)}</p>
        {target?<Link className="underline" href={`/dictionary/${target.id}?from=${encodeURIComponent(`/dictionary/${data.entry.id}`)}#sense-${target.sense_id}`}>{target.headword} · {target.gloss_zh_tw}</Link>:<p>相關詞條尚未提供。</p>}
        <p className="text-sm">{r.relation_kind==='historical_etymology'?'歷史詞源關聯':'學習用拆解（不代表歷史詞源）'} · {verification[r.verification]}</p>
        {source(r.source_id)}
      </li>;
    })}</ul></section>
    <section className={box}><h2 className="mb-3 text-lg font-semibold">歷史詞源</h2>{!data.etymologies.length&&<p>尚無詞源說明。</p>}{data.etymologies.map(h=><div className="mb-4" key={h.id}><p className="text-sm">{sense(h.sense_id)} · {verification[h.verification]}{h.verification!=='verified'?'（不是已確認的詞源事實）':''}</p><p className="my-2 whitespace-pre-wrap">{h.body}</p>{source(h.source_id)}</div>)}</section>
    <section className={box}><h2 className="text-lg font-semibold">學習拆解與記憶聯想</h2><p className="mb-3 text-sm opacity-70">以下內容輔助記憶，不是經查證的歷史事實。</p>{!data.learning_notes.length&&<p>尚無記憶補充。</p>}{data.learning_notes.map(n=><div className="mb-4" key={n.id}><h3 className="font-medium">{n.kind==='mnemonic_scenario'?'記憶情境':'學習用構詞分析'} · {sense(n.sense_id)}</h3><p className="my-2 whitespace-pre-wrap">{n.body}</p>{source(n.source_id)}</div>)}</section>
    <section className={box}><h2 className="mb-3 text-lg font-semibold">來源與授權資訊</h2>{data.sources.map(s=><div className="mb-4" id={`source-${s.id}`} key={s.id}><p>{s.citation}</p>{sourceUrl(s.source_url)&&<a className="underline text-sm" href={sourceUrl(s.source_url)!} target="_blank" rel="noopener noreferrer">原始來源網站</a>}<p className="text-sm">授權：{s.license} · 來源查證：{verification[s.verification]}</p><details className="mt-1 text-xs"><summary>來源識別</summary><p className="break-all">SHA-256：{s.sha256}</p></details></div>)}</section>
  </article>;
}
function GroupPage({kind,query,category}:{kind:DictionaryKind;query:string;category:string}){
  const [page,setPage]=useState(0),[retry,setRetry]=useState(0);
  const [result,setResult]=useState<DictionaryPage|null>(null),[error,setError]=useState('');
  useEffect(()=>{let active=true;setResult(null);setError('');
    void Promise.resolve(getSupabase()!.rpc('search_grouped_dictionary',{category:kind,query_text:query,page_number:page,primary_category_filter:category})).then(({data,error})=>{if(active){if(error)setError('分類暫時無法讀取，請稍後重試或確認分類資料服務已啟用。');else setResult(data);}}).catch(()=>{if(active)setError('分類讀取失敗，請重試。');});
    return()=>{active=false;};
  },[kind,query,category,page,retry]);
  return <div className="space-y-3 p-3">{error?<p role="alert">{error}<button className="ml-2 underline" onClick={()=>setRetry(n=>n+1)}>重試</button></p>:!result?<p role="status">讀取中…</p>:<>
    {!result.items.length?<p>此分類沒有符合的已發布詞條。</p>:<ul className="grid gap-3 sm:grid-cols-2">{result.items.map(e=><li key={e.id}><Link href={`/dictionary/${e.id}`} className="block rounded border border-[var(--color-border)] p-3">{e.headword}</Link></li>)}</ul>}
    <nav aria-label="分類分頁" className="flex justify-between gap-2"><button disabled={!page} onClick={()=>setPage(p=>p-1)}>上一頁</button><span>第 {page+1} 頁</span><button disabled={!result.has_more} onClick={()=>setPage(p=>p+1)}>下一頁</button></nav>
  </>}</div>;
}
export function DictionaryGroups({kind,query}:{kind:DictionaryKind;query:string}){
  const [open,setOpen]=useState<string|null>(null);
  return <div className="space-y-3">{[...primaryCategories,'未分類'].map((label,i)=>{
    const category=i===primaryCategories.length?'__ungrouped__':label;
    return <section key={category} className="rounded border border-[var(--color-border)]"><button className="w-full p-3 text-left" aria-expanded={open===category} onClick={()=>setOpen(open===category?null:category)}>{open===category?'▾':'▸'} {label}</button>{open===category&&<GroupPage key={`${kind}:${query}:${category}`} kind={kind} query={query} category={category}/>}</section>;
  })}</div>;
}
function Content({path}:{path:string[]}){
  const [kind,setKind]=useState<DictionaryKind>('word'),[input,setInput]=useState(''),[query,setQuery]=useState(''),[page,setPage]=useState(0),[retry,setRetry]=useState(0);
  const [result,setResult]=useState<{key:string;list?:DictionaryPage;detail?:PublishedDetail|null;error?:string}|null>(null);
  const id=path[0];const key=JSON.stringify([path,kind,query,page,retry]);
  useEffect(()=>{if(!id&&kind!=='word')return;let active=true;const client=getSupabase()!;
    const load=id?readPublishedEntry(client,id).then(detail=>({key,detail})):searchDictionary(client,kind,query,page).then(list=>({key,list}));
    void load.then(value=>{if(active)setResult(value);}).catch(e=>{if(active)setResult({key,error:e instanceof Error?e.message:'讀取失敗'});});
    return()=>{active=false;};
  },[id,key,kind,query,page]);
  const current=result?.key===key?result:null;
  if(path.length>1)return <p>找不到此詞條。</p>;
  return <>
    {!id&&<>
      <h1 className="mb-4 text-2xl font-semibold">字典／百科</h1>
      <div className="mb-4 flex gap-2" role="group" aria-label="詞條類別">{Object.entries(kinds).map(([k,label])=><button key={k} aria-pressed={kind===k} className={`rounded border px-4 py-2 ${kind===k?'bg-blue-600 text-white':''}`} onClick={()=>{setKind(k as DictionaryKind);setPage(0);}}>{label}</button>)}</div>
      <form className="mb-5 flex gap-2" onSubmit={e=>{e.preventDefault();setQuery(input.trim());setPage(0);}}><input className="min-w-0 flex-1 rounded border bg-transparent p-2" aria-label="搜尋英文單字、字首或字根" placeholder={`搜尋英文${kinds[kind]}`} maxLength={120} value={input} onChange={e=>setInput(e.target.value)}/><button className="rounded border px-4 py-2">搜尋</button></form>
    </>}
    {!id&&kind!=='word'?<DictionaryGroups key={`${kind}:${query}`} kind={kind} query={query}/>:!current?<p role="status">讀取中…</p>:current.error?<div role="alert"><p>{current.error}</p><button className="mt-3 rounded border px-3 py-2" onClick={()=>setRetry(n=>n+1)}>重試</button></div>:id?current.detail?<DictionaryArticle data={current.detail}/>:<p>此詞條尚未收錄或尚未發布。</p>:current.list&&<>
      {!current.list.items.length?<p className={box}>{query?'沒有符合的結果，請嘗試其他拼寫或類別。':'目前此類別尚無已發布詞條。'}</p>:<ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{current.list.items.map(e=><li key={e.id}><Link className={`${box} block h-full hover:bg-blue-500/10`} href={`/dictionary/${e.id}`}><h2 className="break-words text-lg font-medium">{e.headword}</h2><p className="text-sm opacity-60">{kinds[e.kind]}</p></Link></li>)}</ul>}
      <nav aria-label="搜尋結果分頁" className="mt-5 flex items-center justify-between gap-3"><button className="rounded border px-3 py-2 disabled:opacity-40" disabled={page===0} onClick={()=>setPage(n=>n-1)}>上一頁</button><span role="status">第 {page+1} 頁 · 每頁最多 20 筆</span><button className="rounded border px-3 py-2 disabled:opacity-40" disabled={!current.list.has_more} onClick={()=>setPage(n=>n+1)}>下一頁</button></nav>
    </>}
  </>;
}
export default function DictionaryBrowser({path}:{path:string[]}){
  const params=useSearchParams();
  const from=params.get('from');
  const back=path.length&&from&&/^\/dictionary\/[0-9a-f-]{36}$/i.test(from)?from:path.length?'/dictionary':'/study';
  const [client]=useState(getSupabase),[owner,setOwner]=useState<string|null|undefined>(undefined);
  const [admin,setAdmin]=useState<{owner:string;allowed:boolean}|null>(null);
  useEffect(()=>{if(!client)return;const {data}=client.auth.onAuthStateChange((_event,session)=>setOwner(session?.user.id??null));return()=>data.subscription.unsubscribe();},[client]);
  useEffect(()=>{if(!client||!owner)return;let active=true;void client.rpc('is_dictionary_admin').then(({data,error})=>{if(active)setAdmin({owner,allowed:!error&&data===true});});return()=>{active=false;};},[client,owner]);
  return <main className="h-dvh overflow-y-auto" style={{background:'var(--color-editor-bg)',color:'var(--color-text)'}}><div className="mx-auto max-w-5xl break-words px-4 py-6 sm:px-8"><nav className="mb-6 flex flex-wrap justify-between gap-3 border-b pb-4"><Link href={back}>{path.length?(back==='/dictionary'?"← 字典總覽":"← 返回詞條"):"← 字卡首頁"}</Link>{owner&&admin?.owner===owner&&admin.allowed&&<Link href="/dictionary/admin" className="underline">管理公共字典</Link>}</nav>
    {!client?<p>資料服務尚未設定，字典目前無法讀取。</p>:owner===undefined?<p role="status">正在確認登入…</p>:!owner?<p>請先回到 Nexus 登入，再搜尋公共字典。</p>:<Content key={owner} path={path}/>}
  </div></main>;
}
