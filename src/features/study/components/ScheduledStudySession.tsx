"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import type { StudyRepository } from '../StudyRepository';
import { previewStudy, type Grade, type StudySnapshot } from '../studyFSRS';
import type { StudySession } from '../studySessions';
import { scheduledStatus } from '../scheduledStudy';
import { useLanguage } from '../../../lib/LanguageContext';
import CardDictionaryPanel from '../../dictionary/CardDictionaryPanel';
import { getSupabase } from '../../../infrastructure/supabase/client';
import { syncStudy } from '../studySync';

type Data={session:StudySession;snapshot:StudySnapshot};
export default function ScheduledStudySession({repository,deckId,onExit}:{repository:StudyRepository;deckId:string;onExit:()=>void}) {
  const {t,language}=useLanguage();
  const [data,setData]=useState<Data|null>(null),[revealed,setRevealed]=useState(false),[saving,setSaving]=useState(false),[error,setError]=useState(''),[hasAttempt,setHasAttempt]=useState(false);
  const [now,setNow]=useState(()=>Date.now());
  const alive=useRef(true),busy=useRef(false),opening=useRef<Promise<StudySession>|null>(null),current=useRef<string|null>(null),formal=useRef<string|null>(null);
  const revealButton=useRef<HTMLButtonElement>(null),firstRating=useRef<HTMLButtonElement>(null);
  const availability=useRef<{nextDue:number|null;day:string}|null>(null);
  const question=useRef<string|null>(null);
  const loading=useRef<Promise<void>|null>(null);
  const attempt=useRef<(Parameters<StudyRepository['rateSession']>[0]&{practice?:boolean})|null>(null);
  const load=useCallback(()=>{
    if(loading.current)return loading.current;
    if(!current.current||!alive.current)return Promise.resolve();
    const id=current.current;
    const task=(async()=>{
      const next=await repository.readSession(id);
      if(!alive.current||current.current!==id)return;
      const presented=next.session.mode==='scheduled'?await repository.presentScheduled(id):next;
      if(alive.current&&current.current===id){
        const cardId=presented.session.queue[0];
        const key=JSON.stringify([id,cardId,presented.snapshot.states.find(s=>s.id===cardId)?.head,presented.snapshot.cards.find(c=>c.id===cardId)?.content_revision]);
        setData(presented);
        if(question.current!==key){question.current=key;setRevealed(false);setNow(Date.now());}
        else if(!cardId)setNow(Date.now());
      }
    })().finally(()=>{loading.current=null;});
    loading.current=task;return task;
  },[repository]);
  const start=useCallback(async()=>{
    // Online starts synchronize the shared daily introduction history before selecting a new batch.
    const client=getSupabase();
    if(client&&navigator.onLine){const {data:{user},error}=await client.auth.getUser();if(error)throw error;if(user)await syncStudy(repository,client,user.id);}
    return repository.startSession(deckId,'scheduled');
  },[repository,deckId]);
  useEffect(()=>{
    alive.current=true;
    opening.current??=start();
    void opening.current.then(async session=>{current.current=session.id;formal.current=session.id;await load();}).catch(e=>{if(alive.current)setError(String(e));});
    const changed=()=>{if(!busy.current)void load().catch(e=>{if(alive.current)setError(String(e));});};
    window.addEventListener('nexus-study-changed',changed);
    const timer=window.setInterval(()=>{const schedule=availability.current;if(schedule&&(schedule.nextDue!=null&&schedule.nextDue<=Date.now()||schedule.day!==new Date().toDateString())&&!busy.current&&!document.hidden)void load().catch(e=>{if(alive.current)setError(String(e));});},1000);
    return()=>{alive.current=false;window.removeEventListener('nexus-study-changed',changed);window.clearInterval(timer);};
  },[load,start]);
  const session=data?.session, practice=session?.mode==='practice';
  const card=data?.snapshot.cards.find(c=>c.id===session?.queue[0]);
  const state=data?.snapshot.states.find(s=>s.id===card?.id);
  const cardId=card?.id,head=state?.head;
  useEffect(()=>{if(cardId){if(revealed)firstRating.current?.focus();else revealButton.current?.focus();}},[cardId,head,revealed]);
  const status=session&&data?scheduledStatus(session,data.snapshot,now):null;
  useEffect(()=>{availability.current=status?{nextDue:status.nextDue,day:new Date().toDateString()}:null;},[status]);
  const preview=!practice&&state&&revealed?previewStudy(state,now):null;
  async function mark(rating:Grade){
    if(!session||!card||!state||!revealed||busy.current)return;
    busy.current=true;setSaving(true);setError('');setHasAttempt(true);
    try{
      attempt.current??={sessionId:session.id,cardId:card.id,revision:session.revision,contentRevision:card.content_revision,expectedHead:state.head,rating,actionId:crypto.randomUUID(),now:Date.now(),practice};
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
      if(kind==='batch'||(!current.current&&kind==='reload')){const next=await start();current.current=next.id;formal.current=next.id;}
      await load();
    }catch(e){if(alive.current)setError(String(e));}
    finally{busy.current=false;if(alive.current)setSaving(false);}
  }
  const interval=(due:number)=>{const mins=Math.max(1,Math.round((due-now)/60000));return mins<60?t('study.minutes',{n:mins}):mins<1440?t('study.hours',{n:Math.round(mins/60)}):t('study.days',{n:Math.round(mins/1440)});};
  return <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-5 px-2 pt-6 pb-8">
    <h2 className="text-lg font-semibold">{t(practice?'study.practice':'study.start')} · {t('study.direction')}</h2>
    {session&&status&&<p aria-live="polite" className="text-sm opacity-70">{practice?t('study.practiceAnswers',{n:session.answers}):t('study.progress',{done:status.completed,total:session.targets.length,slots:status.slots,limit:session.quota_limit??50})}</p>}
    <p className="text-xs leading-6 opacity-70">{t(practice?'study.endlessHint':'study.formalHint')}</p>
    {typeof navigator!=='undefined'&&!navigator.onLine&&<p role="status" className="text-xs">{t('study.offlineHint')}</p>}
    {card&&state?<>
      <div className="w-full rounded-2xl border bg-[var(--color-sidebar-bg)] p-6 text-center sm:p-8">
        <p className="whitespace-pre-wrap break-words text-2xl font-medium" lang="en">{card.front}</p>
        {revealed&&<p className="mt-6 whitespace-pre-wrap break-words border-t pt-6 text-xl" lang="zh">{card.back}</p>}
      </div>
      {!revealed?<button ref={revealButton} type="button" disabled={saving||!!error} className="rounded-lg border px-6 py-3 disabled:opacity-40" onClick={()=>{setNow(Date.now());setRevealed(true);}}>{t('study.showAnswer')}</button>:<>
        <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4">{([1,2,3,4] as const).map(rating=><button ref={rating===1?firstRating:undefined} type="button" key={rating} disabled={saving||!!error} className="rounded-lg border px-2 py-3 disabled:opacity-40" onClick={()=>void mark(rating)}><span className="block font-medium">{t(`study.rating${rating}`)}</span>{preview&&<span className="mt-2 block text-sm">{interval(preview[rating].card.due.getTime())}</span>}</button>)}</div>
        <CardDictionaryPanel key={`${session!.id}:${card.id}:${session!.answers}`} cardId={card.id} front={card.front} fixedEntryId={card.dictionary_entry_id}/>
      </>}
    </>:<div className="space-y-3 py-8 text-center">
      <p role="status">{!session?t('study.restoring'):practice?t('study.noPractice'):status?.blocked?t('study.blocked',{n:status.blocked}):status?.waiting?t('study.waiting',{n:status.waiting,time:new Date(status.nextDue!).toLocaleTimeString(language)}):t('study.finished',{n:status?.completed??0})}</p>
      {!practice&&session?.completed_at!=null&&<>


      </>}
    </div>}
    {saving&&<p role="status" className="text-sm">{t('study.saving')}</p>}
    {error&&<div role="alert" className="w-full rounded border border-red-400 p-3 text-sm">{error}{hasAttempt&&<button type="button" className="ml-2 underline" disabled={saving} onClick={()=>void mark(attempt.current!.rating)}>{t('study.retryAnswer')}</button>}<button type="button" className="ml-2 underline" disabled={saving} onClick={()=>void change('reload')}>{t('study.reload')}</button></div>}
    <button type="button" disabled={saving} className="text-sm underline opacity-70" onClick={onExit}>{t(practice?'study.stopPractice':'study.back')}</button>
  </div>;
}
