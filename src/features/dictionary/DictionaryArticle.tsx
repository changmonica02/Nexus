"use client";
import type {ReactNode} from "react";
import Link from "./DictionaryReadLink";
import type {PublishedDetail} from "./reader";
import {inflectionLabels} from "./inflections";
import {DictionaryConnections} from "./DictionaryConnections";
import {browseHref,entryHref} from "./browseRelations";
const kinds={word:"單字",prefix:"字首",root:"字根"};
function DetailSection({title,children}:{title?:ReactNode;children:ReactNode}){return <section className="min-w-0 space-y-3">{title&&<h2 className="text-lg font-semibold">{title}</h2>}{children}</section>;}
function SourceText({text}:{text:string}){return <>{text.split(/(https?:\/\/[^\s]+)/g).map((part,i)=>/^https?:\/\//.test(part)?<a key={i} href={part} target="_blank" rel="noopener noreferrer" className="underline break-all">{part}</a>:part)}</>;}
export function DictionaryArticle({data,from=`/dictionary/${data.entry.id}`,showConnections=true,showHeading=true}:{data:PublishedDetail;from?:string;showConnections?:boolean;showHeading?:boolean}){
  const sections=[...[...data.senses].sort((a,b)=>a.id.localeCompare(b.id)).map((s,i)=>({id:s.id,title:s.gloss_zh_tw,pos:data.entry.kind==='word'?s.part_of_speech:null,label:`義項 ${i+1}`})),{id:null,title:null,pos:null,label:null}];
  const section=(title:string,children:ReactNode)=><section className="space-y-2"><h3 className="font-semibold">{title}</h3>{children}</section>;
  function scoped<T extends {id:string;sense_id:string|null}>(rows:T[],render:(row:T)=>ReactNode,ordered=false){
    if(ordered)return rows.map(row=>{const scope=sections.find(s=>s.id===row.sense_id);return <div key={row.id}>{(row.sense_id!==null&&data.senses.length>1)&&<p className="text-xs opacity-60">{scope?.label}</p>}{render(row)}</div>;});
    return sections.map(scope=>{const own=rows.filter(r=>r.sense_id===scope.id);return own.length?<div key={scope.id??'shared'} className="space-y-2">{(scope.id!==null&&data.senses.length>1)&&<p className="text-xs opacity-60">{scope.label}</p>}{own.map(render)}</div>:null;});
  }
  return <article className="min-w-0 space-y-7 leading-relaxed [overflow-wrap:anywhere]">
    {showHeading&&<header><p className="text-sm opacity-60">{kinds[data.entry.kind]}</p><h1 className="text-3xl font-semibold break-words">{data.entry.headword}</h1></header>}
    {showConnections&&<DictionaryConnections key={data.entry.id} data={data} from={from}/>}
    {sections.map(scope=>{
      const belongs=(row:{sense_id:string|null})=>row.sense_id===scope.id;
      const forms=(data.inflections??[]).filter(belongs).sort((a,b)=>a.sort_order-b.sort_order);
      const relations=data.relations.filter(belongs);
      if(scope.id===null&&!forms.length&&!relations.length)return null;
      return <div key={scope.id??'shared'} id={scope.id?`sense-${scope.id}`:undefined}><DetailSection title={scope.id?<>{scope.pos&&<span>({scope.pos}) </span>}<span>{scope.title||'尚無中文意思'}</span></>:scope.title}>
        <div className="min-w-0 space-y-4">
        {!!relations.length&&section('構詞',relations.map(r=>{const target=data.related.find(t=>t.sense_id===r.target_sense_id);return <div key={r.id}>{target?<><Link className="underline" href={entryHref(target.id,from,target.sense_id)}>{target.headword} · {kinds[target.kind]} · {target.gloss_zh_tw}</Link><Link className="ml-2 text-sm underline" href={browseHref('word',{component:target.id,sense:target.sense_id},from)}>查看使用 {target.headword} 的單字</Link></>:<p>相關詞條尚未提供。</p>}</div>;}))}
        {!!forms.length&&section('詞形變化',<dl className="grid gap-2 sm:grid-cols-2">{forms.map(f=><div key={f.id}><dt className="inline">{inflectionLabels[f.form_kind]}：</dt><dd className="inline">{f.form}</dd></div>)}</dl>)}

        </div>
      </DetailSection></div>;
    })}
    {!!data.pronunciations?.length&&<DetailSection title="讀音">{scoped([...data.pronunciations].sort((a,b)=>a.sort_order-b.sort_order||a.id.localeCompare(b.id)),p=><div key={p.id}><p>{p.locale&&<span className="mr-2 text-sm">{p.locale}</span>}{p.ipa}</p>{p.note&&<p className="whitespace-pre-wrap text-sm">{p.note}</p>}</div>,true)}</DetailSection>}
    {!!data.learning_notes.some(n=>n.body.trim())&&<DetailSection title="核心概念">{scoped(data.learning_notes.filter(n=>n.body.trim()),n=><p key={n.id} className="whitespace-pre-wrap">{n.body}</p>)}</DetailSection>}
    {!!data.etymologies.some(n=>n.body.trim())&&<DetailSection title="歷史詞源">{scoped(data.etymologies.filter(n=>n.body.trim()),h=><div key={h.id}><p className="whitespace-pre-wrap">{h.body}</p>{h.data_source&&<p className="text-sm whitespace-pre-wrap">資料來源：<SourceText text={h.data_source}/></p>}</div>)}</DetailSection>}
    {!!data.lexical_annotations?.length&&<DetailSection title="補充說明">{scoped([...data.lexical_annotations].sort((a,b)=>a.sort_order-b.sort_order),x=><p key={x.id} className="whitespace-pre-wrap">{x.body}</p>,true)}</DetailSection>}
    {!!data.examples?.length&&<DetailSection title="例詞">{scoped([...data.examples].sort((a,b)=>a.sort_order-b.sort_order),x=><p key={x.id} className="whitespace-pre-wrap">{x.body}</p>,true)}</DetailSection>}
  </article>;
}

