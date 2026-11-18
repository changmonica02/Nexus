"use client";
import {useEffect,useState} from 'react';
import {getSupabase} from '../../infrastructure/supabase/client';
import {readPublishedEntry} from './reader';
import {studyDictionaryBack,type BackExample} from './studyBackProjection';

function Example({example}:{example:BackExample}){
  return <div data-study-example={example.id} className="space-y-0 break-words">
    <p className="whitespace-pre-wrap text-base leading-snug sm:text-lg">{example.english}</p>
    {example.chinese&&<p className="whitespace-pre-wrap text-sm leading-snug opacity-70 sm:text-base">{example.chinese}</p>}
  </div>;
}
/** Read-only extensions inside the existing card; morphology, mnemonic and core meanings
 * are already shown above by StudyCompositionSummary and the private card answer.
 * Older unlinked or multiple examples stay visible rather than being silently discarded. */
export default function StudyDictionaryBack({entryId,front}:{entryId:string;front:string}){
  const [read,setRead]=useState<{key:string;detail:Awaited<ReturnType<typeof readPublishedEntry>>}|null>(null);
  const key=JSON.stringify([entryId,front]);
  useEffect(()=>{
    let active=true;
    const client=getSupabase();
    if(client)void readPublishedEntry(client,entryId).then(detail=>{
      if(active)setRead({key,detail});
    }).catch(()=>{/* Supplemental content cannot block flipping or rating. */});
    return()=>{active=false;};
  },[entryId,front,key]);
  const data=read?.key===key?studyDictionaryBack(read.detail,front):null;
  const senses=data?.senses.filter(s=>s.derivations.length||s.examples.length)??[];
  if(!senses.length)return null;
  return <section data-study-dictionary-back aria-label="衍生與例句"
    className="pointer-events-none relative mt-2 w-full min-w-0 border-t border-[var(--color-border)] pt-5 text-left [overflow-wrap:anywhere]">
    <div className="grid min-w-0 gap-5 md:grid-cols-2">
      {senses.map(s=><section data-study-sense={s.id} key={s.id} className="min-w-0 space-y-3 md:even:border-l md:even:border-[var(--color-border)] md:even:pl-5">
        {senses.length>1&&<p className="text-xs opacity-60">{s.partOfSpeech? `(${s.partOfSpeech})` : '義項補充'}</p>}
        {s.derivations.map(d=><div key={d.id} data-study-derivation={d.id} className="space-y-2">
          <p className="text-sm font-semibold sm:text-base">{d.meaning}</p>
          {d.examples.map(e=><Example key={e.id} example={e}/>)}
        </div>)}
        {!!s.examples.length&&<div className="space-y-3">{s.examples.map(e=><Example key={e.id} example={e}/>)}</div>}
      </section>)}
    </div>
  </section>;
}
