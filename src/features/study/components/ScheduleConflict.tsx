"use client";
import {dueAt} from '../scheduledStudy';
import {useState} from 'react';
import {confirmDialog} from '../../../lib/confirmDialog';
import {getSupabase} from '../../../infrastructure/supabase/client';
import type {StudyRepository} from '../StudyRepository';
import type {StudyState} from '../studyFSRS';
import {syncStudy} from '../studySync';
export default function ScheduleConflict({repository,state,label}:{repository:StudyRepository;state:StudyState;label:string}){
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[later,setLater]=useState(false);
  const resolve=async(choice:'device'|'cloud'|'relearn')=>{
    if(choice==='relearn'&&!await confirmDialog('將目前排程重新設為未學？全部歷史作答仍會保留。'))return;
    setBusy(true);setError('');try{
      const client=getSupabase();if(!client)throw Error('請登入後同步處理。');
      const {data:{user}}=await client.auth.getUser();if(!user)throw Error('請先登入。');
      await repository.resolveSchedule(state.id,choice);
      await syncStudy(repository,client,user.id);
    }catch(e){setError(String(e));}finally{setBusy(false);}
  };
  const due=(s:StudyState|null|undefined)=>{const at=s?dueAt(s,s.introduced_at??Infinity):Infinity;return Number.isFinite(at)?new Date(at).toLocaleString():'未排程';};
  if(state.ambiguity?.pending)return <div className="mb-2 rounded border p-3 text-sm"><p>「{label}」排程已明確調整，等待同步確認。</p><button disabled={busy} className="underline" onClick={async()=>{setBusy(true);setError('');try{const client=getSupabase();if(!client)throw Error('請先登入');const {data:{user}}=await client.auth.getUser();if(!user)throw Error('請先登入');await syncStudy(repository,client,user.id);}catch(e){setError(String(e));}finally{setBusy(false);}}}>重試同步</button>{error&&<p role="alert">{error}</p>}</div>;
  return <div className="mb-2 rounded border border-amber-400 p-3 text-sm"><p>「{label}」的事件順序無法可靠判定。所有作答均保留；選擇只調整目前排程。</p>
    {!later?<><p className="my-2">此裝置：{due(state.ambiguity?.device)}／雲端：{due(state.ambiguity?.cloud)}</p><div className="flex flex-wrap gap-2">
      <button disabled={busy} onClick={()=>void resolve('relearn')} className="rounded border p-2">保留歷史並重新學習</button>
      <button disabled={busy} onClick={()=>setLater(true)} className="rounded border p-2">稍後處理</button>
    </div></>:<button className="underline" onClick={()=>setLater(false)}>繼續處理（此卡暫停排程）</button>}
    {error&&<p role="alert">{error}</p>}
  </div>;
}
