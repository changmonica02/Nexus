"use client";
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { getSupabase } from '../../../infrastructure/supabase/client';
import { readPublishedEntry } from '../../dictionary/reader';
import { studyComposition, type StudyComposition } from '../../dictionary/studyComposition';
import { useLanguage } from '../../../lib/LanguageContext';

/** Mounted only after reveal. Public reader/cache stays separate from private cards. */
export default function StudyCompositionSummary({entryId,front,answer,inline=false}:{entryId:string;front:string;answer:string;inline?:boolean}) {
  const {t}=useLanguage();
  const [result,setResult]=useState<{key:string;summary:StudyComposition|null}|null>(null);
  const key=JSON.stringify([entryId,front,answer]);
  useEffect(()=>{
    let active=true;
    const client=getSupabase();if(!client)return;
    void readPublishedEntry(client,entryId).then(detail=>{if(active)setResult({key,summary:studyComposition(detail,front)});}).catch(()=>{/* Reading aids never block reveal or grading. */});
    return()=>{active=false;};
  },[entryId,front,answer,key]);
  const summary=result?.key===key?result.summary:null;
  const word=useRef<HTMLSpanElement>(null),[hintHeight,setHintHeight]=useState(0),[conceptHeight,setConceptHeight]=useState(0);
  useLayoutEffect(()=>{
    if(!inline||!word.current)return;
    const hints=word.current.querySelectorAll<HTMLElement>('[data-segment-hint]');
    const concept=word.current.querySelector<HTMLElement>('[data-word-concept]');
    const measure=()=>{
      setHintHeight(Math.max(0,...Array.from(hints,h=>h.getBoundingClientRect().height)));
      setConceptHeight(concept?.getBoundingClientRect().height??0);
    };
    const observer=new ResizeObserver(measure);
    hints.forEach(h=>observer.observe(h));
    if(concept)observer.observe(concept);
    measure();return()=>observer.disconnect();
  },[inline,summary]);
  if(inline){
    if(!summary)return <>{front}</>;
    const annotated=summary.parts.length>1||!!summary.parts[0].meaning;
    if(!annotated&&!summary.concept)return <>{front}</>;
    // The word alone determines the centered line width. Hints and concept never push the speaker away.
    return <span role="region" aria-label={t('composition.title')} className="relative inline-block max-w-full align-top" style={{paddingBottom:summary.concept?conceptHeight+8:0}}>
      <span ref={word} data-word-annotation aria-label={front} className="relative inline-block max-w-full" style={{paddingBottom:annotated?hintHeight+5:0}}>{summary.parts.map((part,i)=><span key={i} data-word-segment className="relative inline-block max-w-full align-top"><span data-segment-spelling className="relative">{part.name}{annotated&&<span data-segment-underline aria-hidden="true" style={{position:'absolute',bottom:-1,left:1,right:1,borderBottom:'1px solid currentColor'}}/>}</span>{annotated&&part.meaning&&<span data-segment-hint aria-hidden="true" className="absolute left-1/2 top-full -translate-x-1/2 whitespace-nowrap text-center" style={{paddingTop:3,fontSize:'.55em',lineHeight:1.3}}>{part.meaning}</span>}</span>)}
        {summary.concept&&<span data-word-concept className="absolute left-1/2 top-full block max-w-[min(80vw,32rem)] -translate-x-1/2 whitespace-pre-wrap text-center [overflow-wrap:anywhere]" style={{width:'max-content',fontSize:'.55em',lineHeight:1.3}}>＝ {summary.concept}</span>}
      </span>
    </span>;
  }
  if(!summary?.concept)return null;
  return <section aria-label={t('composition.title')} className="mt-5 space-y-2 border-t pt-4 text-left text-sm leading-relaxed [overflow-wrap:anywhere]">
    {summary.concept&&<p><span className="font-medium">{t('composition.concept')}：</span>{summary.concept}</p>}
  </section>;
}
