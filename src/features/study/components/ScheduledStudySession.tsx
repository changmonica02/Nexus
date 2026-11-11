"use client";
import {EyeOff} from "lucide-react";
import ModalDialog from "../../../components/ModalDialog";
import {useOfficialContent} from "../useOfficialContent";
import { useCallback, useEffect, useRef, useState } from 'react';
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
import type { StudyStyle } from "../studyStyles";

type Data={session:StudySession;snapshot:StudySnapshot};
const presentedKey=(value:Data)=>{const cardId=value.session.queue[0];return JSON.stringify([value.session.id,cardId,value.snapshot.states.find(s=>s.id===cardId)?.head,value.snapshot.cards.find(c=>c.id===cardId)?.content_revision]);};
export default function ScheduledStudySession({repository,deckId,readingStyle,onProgress,registerExit}:{repository:StudyRepository;deckId:string;onExit:()=>void;readingStyle?:StudyStyle;onProgress?:(done:number,total:number)=>void;registerExit?:(exit:()=>Promise<void>)=>void}) {
  const {t,language}=useLanguage();
  const [data,setData]=useState<Data|null>(null),[revealed,setRevealed]=useState(false),[saving,setSaving]=useState(false),[error,setError]=useState(''),[hasAttempt,setHasAttempt]=useState(false);
  const [phase,setPhase]=useState<'local'|'account'|'cloud'>('local');
  const [hidePrompt,setHidePrompt]=useState(false);
  const [dictionaryEditing,setDictionaryEditing]=useState(false);
  const dictionaryOpen=useRef(false);
  const editingChanged=useCallback((open:boolean)=>{dictionaryOpen.current=open;setDictionaryEditing(open);},[]);
  const [now,setNow]=useState(()=>Date.now());
  const alive=useRef(true),busy=useRef(false),opening=useRef<Promise<Data>|null>(null),current=useRef<string|null>(null),formal=useRef<string|null>(null);
  const revealButton=useRef<HTMLButtonElement>(null);
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
    if(question.current!==key){question.current=key;setRevealed(false);setNow(Date.now());}
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
  const [card]=useOfficialContent(rawCard?[rawCard]:[],`${session?.id}:${session?.revision}`);
  const state=data?.snapshot.states.find(s=>s.id===card?.id);
  const cardId=card?.id,head=state?.head;
  const readingQuestion=JSON.stringify([session?.id,cardId,head,card?.content_revision]);
  useEffect(()=>{if(cardId)revealButton.current?.focus();},[cardId,head]);
  const status=session&&data?scheduledStatus(session,data.snapshot,now):null;
  useEffect(()=>{availability.current=status?{nextDue:status.nextDue,day:new Date().toDateString()}:null;},[status]);
  useEffect(()=>onProgress?.(status?.completed??0,status?.slots??0),[status?.completed,status?.slots,onProgress]);
  const reading=readingStyle??session?.settings_snapshot;
  const preview=!practice&&state&&revealed?previewStudy(state,now,session?.settings_snapshot):null;
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
      if(input.practice)await repository.ratePractice(input);else await repository.rateSession(input);
      await load();attempt.current=null;if(alive.current)setHasAttempt(false);
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
  const flip=()=>{if(!saving&&!error&&!dictionaryOpen.current){setNow(Date.now());setRevealed(value=>!value);}};
  return <div className="mx-auto flex min-h-[65dvh] w-full max-w-4xl flex-col items-center justify-center gap-4 pb-[max(1rem,env(safe-area-inset-bottom))]" data-scheduled-study>
    {session?.compatibility_notice&&<p role="status" className="text-xs">{t('styles.legacySession')}</p>}
    {card&&state?<>
      <article className="relative flex min-h-[min(52dvh,30rem)] w-full flex-col justify-center rounded-3xl border bg-[var(--color-sidebar-bg)] p-5 pb-12 text-center shadow-sm sm:p-10 sm:pb-12" data-study-card data-side={revealed?'back':'front'}>
        <button ref={revealButton} type="button" className="absolute inset-0 rounded-3xl focus-visible:outline-2 focus-visible:outline-offset-4" aria-label={t(revealed?'study.flipFront':'study.flipBack')} aria-pressed={revealed} disabled={saving||!!error||dictionaryEditing} onClick={flip}/>
        <div className="pointer-events-none relative grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,max-content)_minmax(0,1fr)] items-start gap-x-2">
          <p className={'col-start-2 row-start-2 w-fit min-w-0 max-w-full justify-self-center whitespace-pre-wrap break-words text-center [overflow-wrap:anywhere] '+(revealed?'text-2xl opacity-60 sm:text-3xl':'text-4xl font-medium sm:text-6xl')} lang={card.direction==='en-zh'?'en':undefined}>{revealed&&card.dictionary_entry_id?<StudyCompositionSummary inline entryId={card.dictionary_entry_id} front={card.front} answer={card.back}/>:card.front}</p>
          <span className="contents" data-card-audio><StudyPronunciation inlineCard key={readingQuestion} question={readingQuestion} text={card.front} direction={card.direction} frontVisible={!revealed} automatic={reading?.auto_speech??true} rate={reading?.speech_rate??0.9} active={!saving&&!dictionaryEditing}/></span>
        </div>
        <div className="pointer-events-none relative motion-safe:animate-[study-flip_160ms_ease-out]" key={revealed?'back-content':'front-content'}>
          {revealed&&<><p className="my-7 whitespace-pre-wrap break-words text-3xl font-semibold sm:text-5xl" lang={card.direction==='en-zh'?'zh':undefined}>{card.back}</p></>}
        </div>
        {revealed&&<button type="button" className="absolute right-1 top-1 flex min-h-11 w-11 items-center justify-center rounded" aria-label={t('study.hideCard')} disabled={saving||!!error||dictionaryEditing} onClick={()=>setHidePrompt(true)}><EyeOff size={20}/></button>}
        <p className="pointer-events-none absolute inset-x-3 bottom-3 text-xs opacity-50">{t(revealed?'study.flipHintBack':'study.flipHintFront')}</p>
      </article>
      {revealed&&<><CardDictionaryPanel onOpenChange={editingChanged} key={`${session!.id}:${card.id}:${session!.answers}`} fixedEntryId={card.dictionary_entry_id} rate={reading?.speech_rate??0.9}/>
        <div className="grid w-full grid-cols-3 gap-1.5 sm:gap-2">{([1,2,3] as const).map(rating=><button type="button" key={rating} disabled={saving||!!error||dictionaryEditing} className="min-h-14 min-w-0 rounded-lg border px-1 py-3 text-sm disabled:opacity-40 sm:px-3 sm:text-base" onClick={()=>void mark(rating)}><span className="block font-medium">{t(`interval.response${rating}`)}</span>{preview&&<span className="mt-1 block break-words text-xs sm:text-sm">{interval(preview[rating].card.due.getTime())}</span>}</button>)}</div>
      </>}
    </>:<div className="space-y-3 py-8 text-center"><p role="status">{!session?t('study.loading.'+phase):practice?t('study.noPractice'):status?.blocked?t('study.blocked',{n:status.blocked}):status?.waiting?t('study.waiting',{n:status.waiting,time:new Date(status.nextDue!).toLocaleTimeString(language)}):t('interval.finished')}</p></div>}
    {hidePrompt&&<ModalDialog aria-labelledby="hide-card-title" busy={saving} onDismiss={()=>setHidePrompt(false)} className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border bg-[var(--color-editor-bg)] p-5 text-[var(--color-text)] backdrop:bg-black/30"><h2 id="hide-card-title" className="text-lg font-semibold">{t('study.hideCard')}</h2><p className="my-4">{t('study.hideExplanation')}</p><div className="flex justify-end gap-2"><button type="button" autoFocus disabled={saving} className="min-h-11 rounded border px-4" onClick={()=>setHidePrompt(false)}>{t('ui.cancel')}</button><button type="button" disabled={saving} className="min-h-11 rounded border px-4" onClick={()=>void hideCard()}>{t('study.hideConfirm')}</button></div></ModalDialog>}
    <AnswerSaveNotice saving={saving} error={error} onRetry={hasAttempt?()=>void mark(attempt.current!.rating):undefined} onReload={()=>void change('reload')}/>
  </div>;
}
