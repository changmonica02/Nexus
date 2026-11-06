"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Volume2 } from 'lucide-react';
import { useLanguage } from '../../../lib/LanguageContext';

import {englishFront,StudySpeechPlayer} from '../studySpeech';
export {englishFront} from '../studySpeech';
export default function StudyPronunciation({text,direction,question,frontVisible,automatic,rate,active=true,inlineCard=false}:{
  text:string;direction:string|undefined;question:string;frontVisible:boolean;automatic:boolean;rate:number;active?:boolean;inlineCard?:boolean;
}) {
  const {t}=useLanguage();
  const [notice,setNotice]=useState('');
  const attempted=useRef(false),english=englishFront(text,direction);
  const player=useMemo(()=>new StudySpeechPlayer({engine:()=>typeof SpeechSynthesisUtterance==='undefined'?undefined:window.speechSynthesis,utterance:value=>new SpeechSynthesisUtterance(value),visible:()=>!document.hidden,notify:setNotice,activated:()=>navigator.userActivation?.isActive??false}),[]);
  const stop=useCallback(()=>player.stop(),[player]);
  const play=useCallback((manual=false)=>{if(!active||document.hidden)return;if(!english){setNotice('speech.language');return;}attempted.current=true;player.play(english,rate,manual);},[active,english,player,rate]);
  useEffect(()=>{attempted.current=false;stop();const reset=setTimeout(()=>setNotice(''),0);return()=>{clearTimeout(reset);stop();};},[question,english,stop]);
  useEffect(()=>{const hidden=()=>{if(document.hidden)stop();};document.addEventListener('visibilitychange',hidden);window.addEventListener('pagehide',stop);return()=>{document.removeEventListener('visibilitychange',hidden);window.removeEventListener('pagehide',stop);stop();};},[stop]);
  useEffect(()=>{if(!active||!automatic)stop();},[active,automatic,stop]);
  useEffect(()=>{if(!active||!automatic||!frontVisible||attempted.current)return;const pending=setTimeout(()=>{if(!attempted.current)play();},0);return()=>clearTimeout(pending);},[question,frontVisible,automatic,active,play]);
  return <span className={inlineCard?"contents":"relative inline-flex max-w-full flex-col items-center text-center"}>
    <button type="button" disabled={!active} aria-label={t('speech.replay')} title={t('speech.replay')} onClick={event=>{event.stopPropagation();play(true);}} className={"pointer-events-auto inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-sm disabled:opacity-40 "+(inlineCard?"col-start-3 row-start-2 justify-self-start":"")}><Volume2 size={22} aria-hidden="true"/></button>
    {notice&&<span role="status" className={"pointer-events-none min-w-0 break-words rounded-lg border bg-[var(--color-editor-bg)] p-2 text-xs [overflow-wrap:anywhere] "+(inlineCard?"col-span-3 col-start-1 row-start-1 mb-3":"mt-1")}>{t(notice)}</span>}
  </span>;
}
