"use client";
import { useEffect, useState } from 'react';
import { getSupabase } from '../../../infrastructure/supabase/client';
import { readPublishedEntry } from '../../dictionary/reader';
import { studyComposition, type StudyComposition } from '../../dictionary/studyComposition';
import { useLanguage } from '../../../lib/LanguageContext';

/** Mounted only after reveal. Public reader/cache stays separate from private cards. */
export default function StudyCompositionSummary({entryId,front,answer}:{entryId:string;front:string;answer:string}) {
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
  if(!summary)return null;
  return <section aria-label={t('composition.title')} className="mt-5 space-y-2 border-t pt-4 text-left text-sm leading-relaxed [overflow-wrap:anywhere]">
    <p><span className="font-medium">{t('composition.parts')}：</span>{summary.parts.map(part=>part.name).join(' ＋ ')}</p>
    <p><span className="font-medium">{t('composition.meanings')}：</span>{summary.parts.map(part=>`${part.name}（${part.meaning}）`).join('、')}</p>
    {summary.concept&&<p><span className="font-medium">{t('composition.concept')}：</span>{summary.concept}</p>}
  </section>;
}
