"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import { Volume2 } from 'lucide-react';
import { useLanguage } from '../../../lib/LanguageContext';

// The existing card direction declares English on the front. Do not force Han
// text, other scripts or unknown directions through an English voice.
export function englishFront(text:string,direction:string|undefined):string|null {
  const value=text.trim();
  return direction==='en-zh'&&/[A-Za-z]/.test(value)&&/^[A-Za-z\s'’.,!?()\-–]+$/u.test(value)?value:null;
}
let activeUtterance:SpeechSynthesisUtterance|null=null;
export default function StudyPronunciation({text,direction,question,frontVisible,automatic,rate,active=true}:{
  text:string;direction:string|undefined;question:string;frontVisible:boolean;automatic:boolean;rate:number;active?:boolean;
}) {
  const {t}=useLanguage();
  const [notice,setNotice]=useState(''),[voicesVersion,setVoicesVersion]=useState(0);
  const attempted=useRef(false),utterance=useRef<SpeechSynthesisUtterance|null>(null),timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
  const english=englishFront(text,direction);
  const stop=useCallback(()=>{
    clearTimeout(timer.current);
    if(utterance.current&&activeUtterance===utterance.current){activeUtterance=null;try{window.speechSynthesis?.cancel();}catch{/* Engine shutdown must not block learning. */}}
    utterance.current=null;
  },[]);
  const play=useCallback(()=>{
    if(!active||document.hidden)return;
    if(!english){setNotice('speech.language');return;}
    const synth=window.speechSynthesis;
    if(!synth||typeof SpeechSynthesisUtterance==='undefined'){setNotice('speech.unsupported');return;}
    try {
      const voices=synth.getVoices().filter(voice=>/^en(?:-|$)/i.test(voice.lang)&&(navigator.onLine||voice.localService));
      voices.sort((a,b)=>Number(b.localService)-Number(a.localService)||Number(b.lang.toLowerCase()==='en-us')-Number(a.lang.toLowerCase()==='en-us'));
      if(!voices.length){setNotice('speech.noVoice');return;}
      attempted.current=true;stop();synth.cancel();
      const next=new SpeechSynthesisUtterance(english);next.voice=voices[0];next.lang=voices[0].lang;next.rate=rate;
      utterance.current=next;activeUtterance=next;
      const current=()=>utterance.current===next&&activeUtterance===next;
      next.onstart=()=>{if(current()){clearTimeout(timer.current);setNotice('');}};
      next.onend=()=>{if(current()){clearTimeout(timer.current);activeUtterance=null;utterance.current=null;setNotice('');}};
      next.onerror=()=>{if(current()){stop();setNotice('speech.retry');}};
      // Some iOS engines silently ignore autoplay rather than emitting an error.
      timer.current=setTimeout(()=>{if(current()){stop();setNotice('speech.retry');}},2500);
      synth.resume();synth.speak(next);
    } catch {stop();setNotice('speech.retry');}
  },[active,english,rate,stop]);
  useEffect(()=>{
    const synth=window.speechSynthesis;
    const changed=()=>setVoicesVersion(version=>version+1);
    synth?.addEventListener?.('voiceschanged',changed);
    const hidden=()=>{if(document.hidden)stop();};
    document.addEventListener('visibilitychange',hidden);window.addEventListener('pagehide',stop);
    return()=>{synth?.removeEventListener?.('voiceschanged',changed);document.removeEventListener('visibilitychange',hidden);window.removeEventListener('pagehide',stop);stop();};
  },[stop]);
  useEffect(()=>{
    if(!active||!automatic)stop();
  },[active,automatic,stop]);
  useEffect(()=>{
    if(!active||!automatic||!frontVisible||attempted.current)return;
    // Deferred until the card is committed; Strict Mode cleanup cancels the
    // first setup, so rerenders and reveal never enqueue a duplicate utterance.
    const pending=setTimeout(()=>{if(!attempted.current)play();},0);
    return()=>clearTimeout(pending);
  },[question,frontVisible,automatic,active,play,voicesVersion]);
  return <div className="space-y-1 text-center">
    <button type="button" disabled={!active} onClick={play} className="inline-flex min-h-11 items-center gap-2 rounded-lg border px-3 py-2 text-sm disabled:opacity-40"><Volume2 size={18} aria-hidden="true"/>{t('speech.replay')}</button>
    {notice&&<p role="status" className="text-xs opacity-65">{t(notice)}</p>}
  </div>;
}
