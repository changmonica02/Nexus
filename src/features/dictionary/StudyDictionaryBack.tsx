"use client";
import {useEffect,useState} from 'react';
import {getSupabase} from '../../infrastructure/supabase/client';
import {readPublishedEntry} from './reader';
import {studyDictionaryBack,type BackExample} from './studyDictionaryBack';
import {SafeMarkdown} from './SafeMarkdown';

function Example({example}:{example:BackExample}){
  return <li data-study-example={example.id} className="space-y-0.5 break-words">
    <p className="whitespace-pre-wrap text-sm">{example.english}</p>
    {example.chinese&&<p className="whitespace-pre-wrap text-xs opacity-75">{example.chinese}</p>}
  </li>;
}
/** Supplemental published dictionary content. Grading remains independent of network/cache. */
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
  if(!data)return null;
  const left=!!(data.segments.some(s=>s.meaning)||data.mnemonic.length);
  const right=!!(data.senses.length||data.notes.length||data.etymologies.length);
  if(!left&&!right)return null;
  return <section data-study-dictionary-back aria-label="公共字典補充資訊"
    className="w-full min-w-0 rounded-xl border border-[var(--color-border)] p-4 text-left [overflow-wrap:anywhere]">
    <div className={'grid min-w-0 gap-4 '+(left&&right?'md:grid-cols-2 md:gap-0':'')}>
      {left&&<div data-study-back-shared className={'min-w-0 space-y-4 '+(right?'md:pr-5':'')}>
        {!!data.segments.some(s=>s.meaning)&&<section className="space-y-1">
          <h3 className="font-semibold">構詞</h3>
          <p className="flex flex-wrap gap-x-2 gap-y-1 text-sm">{data.segments.map((s,i)=><span key={i}>
            <span className="font-medium">{s.name}</span>{s.meaning&&<span className="opacity-70">（{s.meaning}）</span>}
          </span>)}</p>
        </section>}
        {!!data.mnemonic.length&&<section className="space-y-1"><h3 className="font-semibold">記憶法</h3>
          {data.mnemonic.map((value,i)=><p key={i} className="whitespace-pre-wrap text-sm">{value}</p>)}
        </section>}
      </div>}
      {right&&<div data-study-back-senses className={'min-w-0 space-y-4 '+(left?'border-t border-[var(--color-border)] pt-4 md:border-l md:border-t-0 md:pl-5 md:pt-0':'')}>
        {!!data.senses.length&&<section className="space-y-3">
          <h3 className="font-semibold">義項</h3>
          {data.senses.map(s=><div data-study-sense={s.id} key={s.id} className="space-y-2">
            <p className="font-medium">{s.partOfSpeech&&<span className="mr-1 text-sm opacity-65">({s.partOfSpeech})</span>}{s.meaning}</p>
            {!!s.derivations.length&&<ul className="ml-4 list-disc space-y-2">
              {s.derivations.map(d=><li key={d.id} data-study-derivation={d.id}>
                <p className="text-sm">{d.meaning}</p>
                {!!d.examples.length&&<ul className="mt-1 space-y-2 pl-1">{d.examples.map(e=><Example key={e.id} example={e}/>)}</ul>}
              </li>)}
            </ul>}
            {!!s.examples.length&&<ul className="space-y-2 border-l border-[var(--color-border)] pl-3">{s.examples.map(e=><Example key={e.id} example={e}/>)}</ul>}
          </div>)}
        </section>}
        {!!data.notes.length&&<section className="space-y-2"><h3 className="font-semibold">公共補充筆記</h3>
          {data.notes.map(n=><SafeMarkdown key={n.id} source={n.body}/>)}
        </section>}
        {!!data.etymologies.length&&<section className="space-y-2"><h3 className="font-semibold">歷史詞源</h3>
          {data.etymologies.map(n=><div key={n.id} className="space-y-1"><p className="whitespace-pre-wrap text-sm">{n.body}</p>
            {n.source&&<p className="whitespace-pre-wrap text-xs opacity-70">來源：{n.source}</p>}</div>)}
        </section>}
      </div>}
    </div>
  </section>;
}
