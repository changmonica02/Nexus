"use client";
import {useDictionaryText} from './useDictionaryText';
import {useEffect,useState,type ReactNode} from "react";
import {getSupabase} from "../../infrastructure/supabase/client";
import {readPublishedTargets} from "./reader";
import Link from "./DictionaryReadLink";
import type {PublishedDetail} from "./reader";
import {inflectionLabels} from "./inflections";
import {DictionaryConnections} from "./DictionaryConnections";
import {browseHref,entryHref} from "./browseRelations";
import {validateWordSegments} from './wordSegments';
const kinds={word:"單字",prefix:"字首",root:"字根"};
function DetailSection({title,children}:{title?:ReactNode;children:ReactNode}){return <section className="min-w-0 space-y-3">{title&&<h2 className="text-lg font-semibold">{title}</h2>}{children}</section>;}
function SourceText({text}:{text:string}){return <>{text.split(/(https?:\/\/[^\s]+)/g).map((part,i)=>/^https?:\/\//.test(part)?<a key={i} href={part} target="_blank" rel="noopener noreferrer" className="underline break-all">{part}</a>:part)}</>;}
function WordComposition({data,from}:{data:PublishedDetail;from:string}) {
  const tr=useDictionaryText();
  const ids=JSON.stringify([...new Set((data.entry.word_segments??[]).flatMap(segment=>{const r=data.relations.find(r=>r.id===segment.relation_id);return r?[r.target_entry_id]:[];}))]);
  const [loaded,setLoaded]=useState<{key:string;targets:Map<string,PublishedDetail>}|null>(null);
  useEffect(()=>{let active=true;const client=getSupabase();if(client)void readPublishedTargets(client,JSON.parse(ids),()=>active).then(targets=>{if(active)setLoaded({key:ids,targets});});return()=>{active=false;};},[ids,data]);
  return <DetailSection title={tr('構詞')}><div data-composition-tiles className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-[repeat(auto-fit,minmax(10rem,1fr))] max-[359px]:grid-cols-1">{data.entry.word_segments!.map(segment=>{
    const relation=data.relations.find(r=>r.id===segment.relation_id);
    const target=relation&&loaded?.key===ids?loaded.targets.get(relation.target_entry_id):null;
    const sense=target?.senses.find(s=>s.id===relation?.target_sense_id);
    const related=relation?data.related.find(r=>r.id===relation.target_entry_id&&r.sense_id===relation.target_sense_id):null;
    const history=target&&sense?(target.etymologies??[]).filter(h=>(h.sense_id===null||h.sense_id===sense.id)&&h.body.trim()):[];
    return <div key={segment.id} data-composition-tile className="min-w-0 rounded-lg border border-[var(--color-border)] p-3 text-sm [overflow-wrap:anywhere]">
      <h3 className="font-semibold">{segment.text}{segment.hint&&' · '+segment.hint}</h3>
      {related&&<Link className="block underline" href={entryHref(related.id,from,related.sense_id)}>{related.headword} · {related.gloss_zh_tw}</Link>}
      {related&&<Link className="block text-xs underline" href={browseHref('word',{component:related.id,sense:related.sense_id},from)}>{tr('查看使用')}{related.headword} {tr('的單字')}</Link>}
      {relation?.sense_id&&data.senses.length>1&&<p className="text-xs opacity-60">{data.senses.find(s=>s.id===relation.sense_id)?.gloss_zh_tw}</p>}
      {history.map(h=><div key={h.id} className="mt-2 whitespace-pre-wrap"><p>{h.body}</p>{h.data_source&&<p className="text-xs opacity-70">{tr('資料來源：')}<SourceText text={h.data_source}/></p>}</div>)}
    </div>;
  })}</div></DetailSection>;
}
export function DictionaryArticle({data,from=`/dictionary/${data.entry.id}`,showConnections=true,showHeading=true}:{data:PublishedDetail;from?:string;showConnections?:boolean;showHeading?:boolean}){
  const tr=useDictionaryText();
  const sections=[...[...data.senses].sort((a,b)=>a.id.localeCompare(b.id)).map((s,i)=>({id:s.id,title:s.gloss_zh_tw,pos:data.entry.kind==='word'?s.part_of_speech:null,label:`義項 ${i+1}`})),{id:null,title:null,pos:null,label:null}];
  const section=(title:string,children:ReactNode)=><section className="space-y-2"><h3 className="font-semibold">{title}</h3>{children}</section>;
  function scoped<T extends {id:string;sense_id:string|null}>(rows:T[],render:(row:T)=>ReactNode,ordered=false){
    if(ordered)return rows.map(row=>{const scope=sections.find(s=>s.id===row.sense_id);return <div key={row.id}>{(row.sense_id!==null&&data.senses.length>1)&&<p className="text-xs opacity-60">{scope?.label}</p>}{render(row)}</div>;});
    return sections.map(scope=>{const own=rows.filter(r=>r.sense_id===scope.id);return own.length?<div key={scope.id??'shared'} className="space-y-2">{(scope.id!==null&&data.senses.length>1)&&<p className="text-xs opacity-60">{scope.label}</p>}{own.map(render)}</div>:null;});
  }
  return <article className="min-w-0 space-y-7 leading-relaxed [overflow-wrap:anywhere]">
    {showHeading&&<header><p className="text-sm opacity-60">{tr(kinds[data.entry.kind])}</p><h1 className="text-3xl font-semibold break-words">{data.entry.headword}</h1></header>}
    {showConnections&&<DictionaryConnections key={data.entry.id} data={data} from={from}/>}
    {data.entry.kind==='word'&&data.entry.word_segments&&!validateWordSegments(data.entry.word_segments,data.entry.headword,'word',data.relations)&&<WordComposition data={data} from={from}/>}
    {!!data.learning_notes.some(n=>n.body.trim())&&<DetailSection title={tr("概念")}>{scoped(data.learning_notes.filter(n=>n.body.trim()),n=><p key={n.id} className="whitespace-pre-wrap">{n.body}</p>)}</DetailSection>}
    {sections.map(scope=>{
      const belongs=(row:{sense_id:string|null})=>row.sense_id===scope.id;
      const forms=(data.inflections??[]).filter(belongs).sort((a,b)=>a.sort_order-b.sort_order);
      const segmented=data.entry.kind==='word'&&data.entry.word_segments&&!validateWordSegments(data.entry.word_segments,data.entry.headword,'word',data.relations);
      const represented=new Set(segmented?data.entry.word_segments!.map(s=>s.relation_id):[]);
      const relations=data.relations.filter(belongs).filter(r=>!represented.has(r.id));
      if(scope.id===null&&!forms.length&&!relations.length)return null;
      return <div key={scope.id??'shared'} id={scope.id?`sense-${scope.id}`:undefined}><DetailSection title={scope.id?<>{scope.pos&&<span>({scope.pos}) </span>}<span>{scope.title||tr('尚無中文意思')}</span></>:scope.title}>
        <div className="min-w-0 space-y-4">
        {!!relations.length&&section(tr('構詞'),relations.map(r=>{const target=data.related.find(t=>t.sense_id===r.target_sense_id);return <div key={r.id}>{target?<><Link className="underline" href={entryHref(target.id,from,target.sense_id)}>{target.headword} · {tr(kinds[target.kind])} · {target.gloss_zh_tw}</Link><Link className="ml-2 text-sm underline" href={browseHref('word',{component:target.id,sense:target.sense_id},from)}>{tr("查看使用")}{target.headword} {tr("的單字")}</Link></>:<p>{tr("相關詞條尚未提供。")}</p>}</div>;}))}
        {!!forms.length&&section(tr('詞形變化'),<dl className="grid gap-2 sm:grid-cols-2">{forms.map(f=><div key={f.id}><dt className="inline">{inflectionLabels[f.form_kind]}：</dt><dd className="inline">{f.form}</dd></div>)}</dl>)}

        </div>
      </DetailSection></div>;
    })}
    {!!data.pronunciations?.length&&<DetailSection title={tr("讀音")}>{scoped([...data.pronunciations].sort((a,b)=>a.sort_order-b.sort_order||a.id.localeCompare(b.id)),p=><p key={p.id}>{p.ipa}</p>,true)}</DetailSection>}
    {!!data.etymologies.some(n=>n.body.trim())&&<DetailSection title={tr("歷史詞源")}>{scoped(data.etymologies.filter(n=>n.body.trim()),h=><div key={h.id}><p className="whitespace-pre-wrap">{h.body}</p>{h.data_source&&<p className="text-sm whitespace-pre-wrap">{tr("資料來源：")}<SourceText text={h.data_source}/></p>}</div>)}</DetailSection>}
    {!!data.lexical_annotations?.length&&<DetailSection title={tr("補充說明")}>{scoped([...data.lexical_annotations].sort((a,b)=>a.sort_order-b.sort_order),x=><p key={x.id} className="whitespace-pre-wrap">{x.body}</p>,true)}</DetailSection>}
    {!!data.examples?.length&&<DetailSection title={tr("例詞")}>{scoped([...data.examples].sort((a,b)=>a.sort_order-b.sort_order),x=><p key={x.id} className="whitespace-pre-wrap">{x.body}</p>,true)}</DetailSection>}
  </article>;
}
