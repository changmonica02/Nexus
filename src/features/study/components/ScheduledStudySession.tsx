"use client";
import {EyeOff} from "lucide-react";
import ModalDialog from "../../../components/ModalDialog";
import {useStudyDictionary} from "../useStudyDictionary";
import {useOfficialContent} from "../useOfficialContent";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { StudyRepository } from '../StudyRepository';
import { previewStudy, type Grade, type StudySnapshot } from '../studyFSRS';
import type { StudySession } from '../studySessions';
import { scheduledStatus } from '../scheduledStudy';
import { useLanguage } from '../../../lib/LanguageContext';
import AnswerSaveNotice from "./AnswerSaveNotice";
import CardDictionaryPanel from '../../dictionary/CardDictionaryPanel';
import { getSupabase } from '../../../infrastructure/supabase/client';
import { syncStudy,studyErrorMessage } from '../studySync';

import StudyPronunciation from "./StudyPronunciation";
import StudyCompositionSummary from "./StudyCompositionSummary";
import type { PublishedDetail } from '../../dictionary/reader';
import StudyDictionaryBack from '../../dictionary/StudyDictionaryBack';
import type { StudyStyle } from "../studyStyles";

type Data={session:StudySession;snapshot:StudySnapshot};
const presentedKey=(value:Data)=>{const cardId=value.session.queue[0];return JSON.stringify([value.session.id,cardId,value.snapshot.states.find(s=>s.id===cardId)?.head,value.snapshot.cards.find(c=>c.id===cardId)?.content_revision]);};
export default function ScheduledStudySession({repository,deckId,readingStyle,onProgress,registerExit}:{repository:StudyRepository;deckId:string;onExit:()=>void;readingStyle?:StudyStyle;onProgress?:(done:number,total:number)=>void;registerExit?:(exit:()=>Promise<void>)=>void}) {
  const {t,language}=useLanguage();
  const [data,setData]=useState<Data|null>(null),[revealed,setRevealed]=useState(false),[saving,setSaving]=useState(false),[error,setError]=useState(''),[hasAttempt,setHasAttempt]=useState(false);
  const [answerComposition,setAnswerComposition]=useState<{front:string;detail:PublishedDetail|null}|null>(null);
  const [phase,setPhase]=useState<'local'|'account'|'cloud'>('local');
  const [hidePrompt,setHidePrompt]=useState(false);
  const [dictionaryEditing,setDictionaryEditing]=useState(false);
  const dictionaryOpen=useRef(false);
  const editingChanged=useCallback((open:boolean)=>{dictionaryOpen.current=open;setDictionaryEditing(open);},[]);
  const [now,setNow]=useState(()=>Date.now());
  const alive=useRef(true),busy=useRef(false),opening=useRef<Promise<Data>|null>(null),current=useRef<string|null>(null),formal=useRef<string|null>(null);
  const revealButton=useRef<HTMLButtonElement>(null);
  const scroll=useRef<HTMLDivElement>(null);
  const viewport=useRef<HTMLDivElement>(null),footer=useRef<HTMLElement>(null);
  const [space,setSpace]=useState({height:0,footer:0});
  useLayoutEffect(()=>{
    const measure=()=>{
      if(!viewport.current||!footer.current)return;
      const bottom=footer.current.getBoundingClientRect();
      const top=viewport.current.getBoundingClientRect().top;
      const height=Math.max(0,bottom.top-Math.max(0,top));
      setSpace(old=>old.height===height&&old.footer===bottom.height?old:{height,footer:bottom.height});
    };
    const observer=new ResizeObserver(measure);
    if(footer.current)observer.observe(footer.current);
    if(viewport.current?.parentElement)observer.observe(viewport.current.parentElement);
    window.addEventListener('resize',measure);
    window.visualViewport?.addEventListener('resize',measure);
    measure();
    return()=>{observer.disconnect();window.removeEventListener('resize',measure);window.visualViewport?.removeEventListener('resize',measure);};
  },[]);
  const availability=useRef<{nextDue:number|null;day:string}|null>(null);
  const question=useRef<string|null>(null);
  const presentedCard=useRef<string|null>(null);
  const loading=useRef<Promise<void>|null>(null);
  const mutation=useRef<Promise<void>|null>(null);
  const attempt=useRef<(Parameters<StudyRepository['rateSession']>[0]&{practice?:boolean})|null>(null);
  const accept=useCallback((presented:Data)=>{
    const cardId=presented.session.queue[0];
    const key=presentedKey(presented);
    presentedCard.current=cardId??null;
    setData(presented);
    if(question.current!==key){question.current=key;setRevealed(false);setAnswerComposition(null);setNow(Date.now());}
    else if(!cardId)setNow(Date.now());
  },[]);
  const load=useCallback((background=false)=>{
    if(loading.current)return loading.current;
    if(!current.current||!alive.current)return Promise.resolve();
    const id=current.current;
    const task=(background&&presentedCard.current?repository.readSession(id):repository.readPresentedSession(id)).then(presented=>{
      if(!alive.current||current.current!==id)return;
      if(background&&presentedCard.current&&presentedKey(presented)!==question.current){setError(t('study.questionChanged'));return;}
      accept(presented);
    }).catch(error=>{
      if(alive.current&&error instanceof Error&&error.message==='study.sessionCleared'){current.current=null;formal.current=null;attempt.current=null;setHasAttempt(false);setData(null);}
      throw error;
    }).finally(()=>{loading.current=null;});
    loading.current=task;return task;
  },[repository,accept,t]);
  const start=useCallback(async()=>{
    // Online starts synchronize the shared daily introduction history before selecting a new batch.
    const client=getSupabase();
    if(client&&navigator.onLine){if(alive.current)setPhase('account');const {data:{user},error}=await client.auth.getUser();if(error)throw error;if(user){if(alive.current)setPhase('cloud');await syncStudy(repository,client,user.id);}}
    if(!alive.current)throw new DOMException('Study view closed','AbortError');
    setPhase('local');
    return repository.openScheduledSession(deckId);
  },[repository,deckId]);
  useEffect(()=>{
    alive.current=true;
    opening.current??=start();
    void opening.current.then(next=>{if(!alive.current)return;current.current=next.session.id;formal.current=next.session.id;accept(next);}).catch(e=>{if(alive.current)setError(studyErrorMessage(e,t));});
    const changed=()=>{if(!busy.current&&!dictionaryOpen.current)void load(true).catch(e=>{if(alive.current)setError(studyErrorMessage(e,t));});};
    window.addEventListener('nexus-study-changed',changed);
    const timer=window.setInterval(()=>{const schedule=availability.current;if(!presentedCard.current&&schedule&&(schedule.nextDue!=null&&schedule.nextDue<=Date.now()||schedule.day!==new Date().toDateString())&&!busy.current&&!dictionaryOpen.current&&!document.hidden)void load().catch(e=>{if(alive.current)setError(studyErrorMessage(e,t));});},1000);
    return()=>{alive.current=false;window.removeEventListener('nexus-study-changed',changed);window.clearInterval(timer);};
  },[load,start,t,accept]);
  useEffect(()=>{
    registerExit?.(async()=>{
      if(dictionaryOpen.current)throw Error(t('study.exitPending'));
      if(opening.current)await opening.current;
      if(mutation.current)await mutation.current;
      if(loading.current)await loading.current;
      if(busy.current||attempt.current)throw Error(t('study.exitPending'));
      if(current.current)await repository.endSession(current.current);
    });
    return()=>registerExit?.(async()=>{throw Error("study.exitPending");});
  },[registerExit,repository,t]);
  const session=data?.session, practice=session?.mode==='practice';
  const rawCard=data?.snapshot.cards.find(c=>c.id===session?.queue[0]);
  const [card]=useOfficialContent(rawCard?[rawCard]:[]);
  const linkedIds=useMemo(()=>data?.session.queue.slice(0,3).map(id=>data.snapshot.cards.find(c=>c.id===id)?.dictionary_entry_id)??[],[data]);
  const dictionary=useStudyDictionary(linkedIds);
  const state=data?.snapshot.states.find(s=>s.id===card?.id);
  const cardId=card?.id,head=state?.head;
  const readingQuestion=JSON.stringify([session?.id,cardId,head,card?.content_revision]);
  useLayoutEffect(()=>{if(scroll.current)scroll.current.scrollTop=0;},[readingQuestion,revealed]);
  useEffect(()=>{if(cardId)revealButton.current?.focus({preventScroll:true});},[cardId,head]);
  const status=useMemo(()=>data?scheduledStatus(data.session,data.snapshot,now):null,[data,now]);
  useEffect(()=>{availability.current=status?{nextDue:status.nextDue,day:new Date().toDateString()}:null;},[status]);
  useEffect(()=>onProgress?.(status?.completed??0,status?.slots??0),[status?.completed,status?.slots,onProgress]);
  const reading=readingStyle??session?.settings_snapshot;
  const preview=useMemo(()=>!practice&&state?previewStudy(state,now,session?.settings_snapshot):null,[practice,state,now,session?.settings_snapshot]);
  function mark(rating:Grade){
    if(mutation.current)return mutation.current;
    const task=saveMark(rating).finally(()=>{mutation.current=null;});mutation.current=task;return task;
  }
  async function saveMark(rating:Grade){
    if(!session||!card||!state||!revealed||busy.current||dictionaryOpen.current)return;
    busy.current=true;setSaving(true);setError('');setHasAttempt(true);
    try{
      attempt.current??={sessionId:session.id,cardId:card.id,revision:session.revision,contentRevision:card.content_revision,displayContent:{front:card.front,back:card.back},expectedHead:state.head,rating,actionId:crypto.randomUUID(),now:Date.now(),practice};
      const input=attempt.current;
      if(input.practice){
        await repository.ratePractice(input);
        await load();
      }else{
        const next=await repository.rateSession(input,true);
        if(alive.current)accept(next);
      }
      attempt.current=null;if(alive.current)setHasAttempt(false);
    }catch(e){if(alive.current)setError(e instanceof Error?e.message:String(e));}
    finally{busy.current=false;if(alive.current)setSaving(false);}
  }
  async function change(kind:'batch'|'reload'){
    if(busy.current)return;busy.current=true;setSaving(true);setError('');
    try{
      attempt.current=null;setHasAttempt(false);
      if(kind==='batch'||(!current.current&&kind==='reload')){const next=await start();current.current=next.session.id;formal.current=next.session.id;accept(next);return;}
      await load();
    }catch(e){if(alive.current)setError(studyErrorMessage(e,t));}
    finally{busy.current=false;if(alive.current)setSaving(false);}
  }
  const interval=(due:number)=>{if(session?.settings_snapshot?.scheduling_method==='fixed'){const seconds=Math.max(1,Math.round((due-now)/1000));const unit=[86400,3600,60,1].find(u=>seconds%u===0)!;return `${seconds/unit} ${t('styles.unit'+unit)}`;}const mins=Math.max(1,Math.round((due-now)/60000));return mins<60?t('study.minutes',{n:mins}):mins<1440?t('study.hours',{n:Math.round(mins/60)}):t('study.days',{n:Math.round(mins/1440)});};
  async function hideCard(){
    if(!card||busy.current||attempt.current||dictionaryOpen.current)return;
    busy.current=true;setSaving(true);setError('');
    try{await repository.setCardHidden(deckId,card.id,true);await load();setHidePrompt(false);}
    catch(e){if(alive.current)setError(studyErrorMessage(e,t));}
    finally{busy.current=false;if(alive.current)setSaving(false);}
  }
  const flip=()=>{
    if(!card||busy.current||error||dictionaryOpen.current)return;
    // Keep the spelling and answer in place while late examples load below them.
    if(!revealed)setAnswerComposition({front:card.front,detail:dictionary});
    setRevealed(value=>!value);
  };
  return <div ref={viewport} className="mx-auto w-full max-w-4xl" style={{paddingBottom:space.footer}} data-scheduled-study>
    <div className="flex w-full flex-col items-center justify-center gap-4 py-3" style={{minHeight:space.height||'65dvh'}} data-study-card-space>
    {card&&state?<>
      <article className="relative h-[clamp(12rem,52dvh,30rem)] w-full rounded-3xl border bg-[var(--color-sidebar-bg)] text-center shadow-sm" data-study-card data-side={revealed?'back':'front'}>
        <div ref={scroll} className="absolute inset-x-0 bottom-8 top-0 overflow-y-auto overscroll-contain rounded-t-3xl [scrollbar-gutter:stable_both-edges]" data-study-card-scroll>
          <div className="relative flex min-h-full flex-col px-5 pb-4 pt-5 sm:px-10 sm:pt-10">
            <button ref={revealButton} type="button" className="absolute inset-0 rounded-3xl focus-visible:outline-2 focus-visible:-outline-offset-4" aria-label={t(revealed?'study.flipFront':'study.flipBack')} aria-pressed={revealed} disabled={saving||!!error||dictionaryEditing} onClick={flip}/>
            <div className={"pointer-events-none relative w-full min-w-0 "+(revealed?"":"my-auto")}>
              <div className={"grid w-full min-w-0 grid-cols-[minmax(3.25rem,1fr)_fit-content(calc(100%-6.5rem))_minmax(3.25rem,1fr)] items-start "+(revealed?"text-2xl leading-8 [--study-word-line:2rem] sm:text-3xl sm:leading-9 sm:[--study-word-line:2.25rem]":"text-4xl leading-10 [--study-word-line:2.5rem] sm:text-6xl sm:leading-none sm:[--study-word-line:3.75rem]")}>
                <p className={'col-start-2 row-start-2 w-fit min-w-0 max-w-full justify-self-center whitespace-pre-wrap break-words text-center [overflow-wrap:anywhere] '+(revealed?'opacity-60':'font-medium')} lang={card.direction==='en-zh'?'en':undefined}>{revealed&&card.dictionary_entry_id?<StudyCompositionSummary inline detail={answerComposition?.front===card.front?answerComposition.detail:null} front={card.front}/>:card.front}</p>
                <span className="contents" data-card-audio><StudyPronunciation inlineCard key={readingQuestion} question={readingQuestion} text={card.front} direction={card.direction} frontVisible={!revealed} automatic={reading?.auto_speech??true} rate={reading?.speech_rate??0.9} active={!saving&&!dictionaryEditing}/></span>
              </div>
              <div hidden={!revealed}>
                {revealed&&<p className="mb-7 mt-[1.167rem] whitespace-pre-wrap text-3xl font-semibold [overflow-wrap:anywhere] sm:text-5xl" lang={card.direction==='en-zh'?'zh':undefined}>{card.back}</p>}
              </div>
              {revealed&&card.dictionary_entry_id&&<StudyDictionaryBack key={`${session!.id}:${card.id}:${session!.answers}`} detail={dictionary} front={card.front}/>}
            </div>
          </div>
        </div>
        {revealed&&<button type="button" className="absolute right-1 top-1 flex min-h-11 w-11 items-center justify-center rounded" aria-label={t('study.hideCard')} disabled={saving||!!error||dictionaryEditing} onClick={()=>setHidePrompt(true)}><EyeOff size={20}/></button>}
        <p className="pointer-events-none absolute inset-x-3 bottom-3 text-xs opacity-50">{t(revealed?'study.flipHintBack':'study.flipHintFront')}</p>
      </article>

    </>:<div className="space-y-3 py-8 text-center"><p role="status">{!session?t('study.loading.'+phase):practice?t('study.noPractice'):status?.blocked?t('study.blocked',{n:status.blocked}):status?.waiting?t('study.waiting',{n:status.waiting,time:new Date(status.nextDue!).toLocaleTimeString(language)}):t('interval.finished')}</p></div>}
    </div>
    {hidePrompt&&<ModalDialog aria-labelledby="hide-card-title" busy={saving} onDismiss={()=>setHidePrompt(false)} className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border bg-[var(--color-editor-bg)] p-5 text-[var(--color-text)] backdrop:bg-black/30"><h2 id="hide-card-title" className="text-lg font-semibold">{t('study.hideCard')}</h2><p className="my-4">{t('study.hideExplanation')}</p><div className="flex justify-end gap-2"><button type="button" autoFocus disabled={saving} className="min-h-11 rounded border px-4" onClick={()=>setHidePrompt(false)}>{t('ui.cancel')}</button><button type="button" disabled={saving} className="min-h-11 rounded border px-4" onClick={()=>void hideCard()}>{t('study.hideConfirm')}</button></div></ModalDialog>}
    <footer ref={footer} className="fixed inset-x-0 bottom-0 z-20 border-t border-[var(--color-border)] bg-[var(--color-sidebar-bg)] px-4 pt-2 pb-[max(0.25rem,env(safe-area-inset-bottom))]" data-study-answer-footer>
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-2">
        {card&&state&&<div className={"flex flex-col gap-2 "+(revealed?"":"invisible")} inert={!revealed}>
          <CardDictionaryPanel compact onOpenChange={editingChanged} key={`${session!.id}:${card.id}:${session!.answers}`} fixedEntryId={card.dictionary_entry_id} rate={reading?.speech_rate??0.9}/>
          <div className="grid w-full grid-cols-2 gap-1.5 sm:gap-2">{([1,3] as const).map(rating=><button type="button" key={rating} disabled={saving||!!error||dictionaryEditing} className="min-h-14 min-w-0 rounded-lg border px-1 py-2 text-sm disabled:opacity-40 sm:px-3 sm:text-base" onClick={()=>void mark(rating)}><span className="block font-medium">{t(`interval.response${rating}`)}</span>{preview&&<span className="mt-1 block break-words text-xs sm:text-sm">{interval(preview[rating].card.due.getTime())}</span>}</button>)}</div>
        </div>}
        <div className="flex min-h-6 max-h-20 items-center justify-center overflow-y-auto text-center" data-study-save-status>
          <AnswerSaveNotice saving={saving} error={error} onRetry={hasAttempt?()=>void mark(attempt.current!.rating):undefined} onReload={()=>void change('reload')}/>
        </div>
      </div>
    </footer>
  </div>;
}
