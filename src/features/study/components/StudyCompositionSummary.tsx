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
    void readPublishedEntry(client,entryId).then(detail=>{if(active)setResult({key,summary:studyComposition(detail,front,answer)});}).catch(()=>{/* Reading aids never block reveal or grading. */});
    return()=>{active=false;};
  },[entryId,front,answer,key]);
  const summary=result?.key===key?result.summary:null;
  const word=useRef<HTMLSpanElement>(null),[hintHeight,setHintHeight]=useState(0);
  useLayoutEffect(()=>{
    if(!inline||!word.current)return;
    const hints=word.current.querySelectorAll<HTMLElement>('[data-segment-hint]');
    const measure=()=>setHintHeight(Math.max(0,...Array.from(hints,h=>h.getBoundingClientRect().height)));
    const observer=new ResizeObserver(measure);hints.forEach(h=>observer.observe(h));measure();return()=>observer.disconnect();
  },[inline,summary]);
  if(inline){
    if(!summary||summary.parts.length===1&&!summary.parts[0].meaning)return <>{front}</>;
    return <span ref={word} data-word-annotation aria-label={front} style={{display:'inline-block',maxWidth:'100%',paddingBottom:hintHeight+5}}>{summary.parts.map((part,i)=><span key={i} data-word-segment style={{display:'inline-block',position:'relative',verticalAlign:'top',maxWidth:'100%'}}><span data-segment-spelling style={{borderBottom:'1px solid currentColor'}}>{part.name}</span><span data-segment-hint aria-hidden="true" style={{position:'absolute',left:0,top:'100%',width:'100%',paddingTop:3,textAlign:'center',fontSize:'.55em',lineHeight:1.3,overflowWrap:'anywhere',whiteSpace:'normal'}}>{part.meaning}</span></span>)}</span>;
  }
  if(!summary?.concept)return null;
  return <section aria-label={t('composition.title')} className="mt-5 space-y-2 border-t pt-4 text-left text-sm leading-relaxed [overflow-wrap:anywhere]">
    {summary.concept&&<p><span className="font-medium">{t('composition.concept')}：</span>{summary.concept}</p>}
  </section>;
}
