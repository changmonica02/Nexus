"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupabase } from "../../infrastructure/supabase/client";
import { claimLabel, entryHref, kindLabel, loadCatalog, searchEntries, wordHref, type Catalog, type Claim, type Family } from "./catalog";

const panel = "mb-4 rounded-xl border p-4";
const border = { borderColor: "var(--color-border)" };

function SourceNote({ catalog, id }: { catalog: Catalog; id: string }) {
  const source = catalog.sources.find(source=>source.id===id)!;
  return <details className="mt-3 text-xs opacity-75"><summary className="cursor-pointer">原始來源：{source.path}</summary>
    <p className="mt-2 break-all">SHA-256：{source.sha256}</p>
    <pre className="mt-2 whitespace-pre-wrap break-words">{JSON.stringify(source.metadata,null,2)}</pre>
    <pre className="mt-2 whitespace-pre-wrap break-words">{source.raw_markdown}</pre>
  </details>;
}

function Claims({ catalog, claims }: { catalog: Catalog; claims: Claim[] }) {
  return <>{claims.map(claim=><section key={claim.id} className={panel} style={border}>
    <h3 className="font-semibold">{claimLabel(claim.kind)}</h3>
    <p className="mt-3 whitespace-pre-wrap break-words">{claim.body}</p>
    {claim.data_source&&<p className="mt-2 whitespace-pre-wrap text-sm">資料來源：{claim.data_source}</p>}
    {claim.review_note&&<p className="mt-2 whitespace-pre-wrap text-sm">補充說明：{claim.review_note}</p>}
    <SourceNote catalog={catalog} id={claim.source_id}/>
  </section>)}</>;
}

export function EtymologyContent({ catalog, path = [] }: { catalog: Catalog; path?: string[] }) {
  const [query,setQuery] = useState("");
  const [category,setCategory] = useState("");
  const section = path[0]??"prefixes";
  const id = path[1];
  if (path.length>2 || !["prefixes","roots","words"].includes(section)) return <p role="alert">找不到此百科頁面。</p>;
  if (section==="words" && id) {
    const word=catalog.words.find(word=>word.id===id);
    if (!word) return <p role="alert">找不到此單字。</p>;
    return <article><Link href="/etymology/words" className="underline">← 衍生單字</Link>
      <h1 className="mt-4 text-3xl font-semibold">{word.lemma}</h1><p className="my-4 whitespace-pre-wrap">{word.definition}</p>
      <Claims catalog={catalog} claims={catalog.claims.filter(claim=>claim.word_id===id)}/>
      <h2 className="mb-3 text-xl font-semibold">相關字首／字根與義項</h2>
      {catalog.word_senses.filter(link=>link.word_id===id).map(link=>{
        const entry=catalog.entries.find(entry=>entry.id===link.entry_id)!;
        const sense=catalog.senses.find(sense=>sense.id===link.sense_id)!;
        return <section key={`${link.sense_id}-${link.relation_kind}`} className={panel} style={border}>
          <Link className="underline" href={`${entryHref(entry)}#${encodeURIComponent(`sense-${sense.id}`)}`}>{entry.label} — {sense.gloss}</Link>
          <p className="text-sm">{kindLabel[entry.kind]} · {claimLabel(link.relation_kind)}</p>
          {link.data_source&&<p className="whitespace-pre-wrap text-sm">資料來源：{link.data_source}</p>}
          <SourceNote catalog={catalog} id={link.source_id}/>
        </section>;
      })}
      {!catalog.word_senses.some(link=>link.word_id===id)&&<p>尚無已整理的構詞關聯；不依拼字推測。</p>}
      <SourceNote catalog={catalog} id={word.source_id}/>
    </article>;
  }
  const family: Family = section==="roots"?"root":"prefix";
  if (id) {
    const entry=catalog.entries.find(entry=>entry.id===id&&entry.family===family);
    if (!entry) return <p role="alert">找不到此條目。</p>;
    const original=catalog.entries.find(candidate=>candidate.id===entry.variant_of);
    return <article><Link className="underline" href={`/etymology/${section}`}>← {family==="root"?"字根":"字首"}分類</Link>
      <h1 className="mt-4 text-3xl font-semibold">{entry.label}</h1>
      <p className="my-2 text-sm opacity-70">{kindLabel[entry.kind]} · {entry.id}</p>
      <p className="mb-4 text-sm">分類：{catalog.entry_categories.filter(link=>link.entry_id===id).map(link=>catalog.categories.find(category=>category.id===link.category_id)!.label).join("、")||"未分類"}</p>
      {original&&<p className="mb-3">變體所屬條目：<Link href={entryHref(original)} className="underline">{original.label}</Link></p>}
      {catalog.entries.filter(candidate=>candidate.variant_of===id).map(variant=><p key={variant.id}>變體：<Link className="underline" href={entryHref(variant)}>{variant.label}</Link></p>)}
      <Claims catalog={catalog} claims={catalog.claims.filter(claim=>claim.entry_id===id)}/>
      <h2 className="mb-3 text-xl font-semibold">獨立義項</h2>
      {catalog.senses.filter(sense=>sense.entry_id===id).map(sense=><section id={`sense-${sense.id}`} key={sense.id} className={panel} style={border}>
        <h3 className="font-semibold">{sense.gloss}</h3><p className="mb-3 break-all text-xs opacity-65">義項 ID：{sense.id}</p>
        <Claims catalog={catalog} claims={catalog.claims.filter(claim=>claim.sense_id===sense.id)}/>
        <h4 className="my-2 font-medium">衍生單字</h4>
        <ul className="space-y-2">{catalog.word_senses.filter(link=>link.sense_id===sense.id).map(link=>{
          const word=catalog.words.find(word=>word.id===link.word_id)!;
          return <li key={`${link.word_id}-${link.relation_kind}`}><Link href={wordHref(word)} className="underline">{word.lemma}</Link>
            <span className="ml-2 text-xs opacity-70">{claimLabel(link.relation_kind)}</span></li>;
        })}</ul>
        <SourceNote catalog={catalog} id={sense.source_id}/>
      </section>)}
      {!catalog.senses.some(sense=>sense.entry_id===id)&&<p>尚未整理義項，請參閱完整來源。</p>}
      <SourceNote catalog={catalog} id={entry.source_id}/>
    </article>;
  }
  const heading=section==="words"?"衍生單字":family==="root"?"字根分類":"字首分類";
  const categories=catalog.categories.filter(category=>catalog.entry_categories.some(link=>link.category_id===category.id&&catalog.entries.some(entry=>entry.id===link.entry_id&&entry.family===family)));
  const entries=searchEntries(catalog,family,query,category);
  const words=catalog.words.filter(word=>`${word.lemma} ${word.definition}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())).sort((a,b)=>a.lemma.localeCompare(b.lemma,"en"));
  const count=section==="words"?words.length:entries.length;
  return <section><h1 className="mb-5 text-3xl font-semibold">{heading}</h1>
    <div className="mb-5 flex flex-wrap gap-3">
      <label className="flex-1">搜尋<input aria-label="搜尋字源百科" value={query} onChange={event=>setQuery(event.target.value)} placeholder="英文、中文義項" className="mt-1 block w-full rounded-lg border bg-transparent p-2" style={border}/></label>
      {section!=="words"&&<label>分類<select aria-label="百科分類" value={category} onChange={event=>setCategory(event.target.value)} className="mt-1 block rounded-lg border bg-transparent p-2" style={border}>
        <option value="">全部分類</option>{categories.map(category=><option key={category.id} value={category.id}>{category.label}</option>)}
      </select></label>}
    </div>
    <p role="status" className="mb-3 text-sm opacity-60">{count} 個結果</p>
    {!count&&<p className={panel} style={border}>{catalog.entries.length||catalog.words.length?"沒有符合的條目。":"尚無百科資料。請先提供第八批原始資料並完成審核匯入；此頁不含示例詞源。"}</p>}
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{section==="words"?words.map(word=><Link key={word.id} href={wordHref(word)} className={panel} style={border}><h2 className="font-semibold">{word.lemma}</h2><p className="mt-2 text-sm">{word.definition}</p></Link>):entries.map(entry=><Link key={entry.id} href={entryHref(entry)} className={panel} style={border}>
      <h2 className="font-semibold">{entry.label}</h2><p className="mt-1 text-xs opacity-60">{kindLabel[entry.kind]}</p>
      <p className="mt-2 text-sm">{catalog.senses.filter(sense=>sense.entry_id===entry.id).map(sense=>sense.gloss).join("；")||"義項待整理"}</p>
    </Link>)}</div>
  </section>;
}

export default function EtymologyBrowser({path}: {path: string[]}) {
  const [client]=useState(getSupabase);
  const [owner,setOwner]=useState<string|null|undefined>(undefined);
  const [result,setResult]=useState<{owner:string;catalog?:Catalog;error?:string}|null>(null);
  const [retry,setRetry]=useState(0);
  useEffect(()=>{
    if (!client) return;
    // Supabase emits INITIAL_SESSION and future account changes through the existing auth client.
    const {data}=client.auth.onAuthStateChange((_event,session)=>setOwner(session?.user.id??null));
    return ()=>data.subscription.unsubscribe();
  },[client]);
  useEffect(()=>{
    if (!client||!owner) return;
    let active=true;
    void loadCatalog(client).then(catalog=>{if(active)setResult({owner,catalog});})
      .catch(error=>{if(active)setResult({owner,error:String(error)});});
    return ()=>{active=false;};
  },[client,owner,retry]);
  const current=result?.owner===owner?result:null;
  return <main className="h-dvh overflow-y-auto" style={{background:"var(--color-editor-bg)",color:"var(--color-text)"}}>
    <div className="mx-auto max-w-5xl break-words px-4 py-8 sm:px-8">
      <nav aria-label="字源百科導覽" className="mb-6 flex flex-wrap gap-4 border-b pb-4" style={border}>
        <Link href="/">← Nexus</Link><Link href="/etymology/prefixes">字首</Link><Link href="/etymology/roots">字根</Link><Link href="/etymology/words">衍生單字</Link>
      </nav>
      <p className="mb-5 text-sm opacity-65">字源百科 · 學習拆解與記憶故事不等同詞源史實。字根原文保留，不表示均已核對。</p>
      {!client?<p>未設定資料服務，百科目前無法讀取。</p>:owner===undefined?<p role="status">正在確認帳號…</p>:!owner?<p>請回到 Nexus 使用既有帳號登入，再開啟百科。</p>:current?.catalog?<EtymologyContent key={JSON.stringify(path)} path={path} catalog={current.catalog}/>:current?.error?<div role="alert"><p>{current.error}</p><button className="mt-3 rounded border px-3 py-2" onClick={()=>{setResult(null);setRetry(value=>value+1);}}>重試</button></div>:<p role="status">正在讀取百科…</p>}
    </div>
  </main>;
}
