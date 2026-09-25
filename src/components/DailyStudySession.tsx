"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { StudyRepository } from "../lib/StudyRepository";
import { intervalLabel, previewStudy, type Grade, type StudySnapshot } from "../lib/studyFSRS";
import { freezingInterval, type SessionMode, type StudySession } from "../lib/studySessions";

/** Both modes share session mastery; only their official-review policy differs. */
export default function DailyStudySession({repository,deckId,mode="daily",onExit}:{repository:StudyRepository;deckId:string;mode?:SessionMode;onExit:()=>void}) {
  const [data,setData]=useState<{session:StudySession;snapshot:StudySnapshot}|null>(null);
  const [revealed,setRevealed]=useState(false),[error,setError]=useState(""),[saving,setSaving]=useState(false);
  const [previewTime,setPreviewTime]=useState(()=>Date.now());
  const sessionId=useRef<string|null>(null),active=useRef(true),busy=useRef(false);
  const actionId=useRef(crypto.randomUUID());
  const opening=useRef<Promise<StudySession>|null>(null);
  const load=useCallback(async()=>{
    if(!sessionId.current)return;
    const next=await repository.readSession(sessionId.current);
    if(active.current){setData(next);setRevealed(false);setPreviewTime(Date.now());actionId.current=crypto.randomUUID();}
  },[repository]);
  useEffect(()=>{
    active.current=true;
    opening.current??=repository.startSession(deckId,mode);
    void opening.current.then(async session=>{sessionId.current=session.id;await load();}).catch(e=>{if(active.current)setError(String(e));});
    const changed=()=>{if(!busy.current)void load().catch(e=>{if(active.current)setError(String(e));});};
    window.addEventListener("nexus-study-changed",changed);
    return()=>{active.current=false;window.removeEventListener("nexus-study-changed",changed);};
  },[repository,deckId,mode,load]);
  const session=data?.session;
  const target=session?.targets.find(t=>t.card_id===session.queue[0]);
  const card=data?.snapshot.cards.find(c=>c.id===target?.card_id);
  const state=data?.snapshot.states.find(s=>s.id===target?.card_id);
  const official=mode==="free" && target && !target.official_event_id;
  const preview=official && revealed && state ? previewStudy(state,previewTime):null;
  const interval=state?freezingInterval(state):null;
  const mark=async(rating:Grade)=>{
    if(!session || !card || !state || !revealed || busy.current)return;
    busy.current=true;setSaving(true);setError("");
    try{
      await repository.rateSession({sessionId:session.id,cardId:card.id,revision:session.revision,contentRevision:card.content_revision,expectedHead:state.head,rating,actionId:actionId.current,now:Date.now()});
      await load();
    }catch(e){if(active.current)setError(e instanceof Error?e.message:String(e));}
    finally{busy.current=false;if(active.current)setSaving(false);}
  };
  const restart=async()=>{
    if(busy.current)return;busy.current=true;setSaving(true);setError("");
    try{const next=await repository.startSession(deckId,mode);sessionId.current=next.id;await load();}
    catch(e){setError(String(e));}finally{busy.current=false;setSaving(false);}
  };
  return <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-5 py-6">
    <h2 className="text-lg font-semibold">{mode==="daily"?"每日學習":"單字複習"}・英 → 中</h2>
    {session&&<p className="text-sm opacity-60">完成 {session.targets.filter(t=>t.easy_at!=null).length} / {session.targets.length} 字・已作答 {session.answers} 次{mode==="daily"?`・批次 ${session.day}`:""}</p>}
    <p className="text-xs leading-5 opacity-60">{mode==="daily"?"本輪每張卡都取得 Easy 才完成。新字首次學會後成為待複習的新卡；重練不改排程。":"每張卡本輪第一次評分更新 FSRS；之後只練到 Easy，不改第一次決定的冷凍時間。"}</p>
    {saving&&<p role="status" className="text-sm">正在儲存作答…</p>}
    {error&&<div role="alert" className="rounded border border-red-400 p-3 text-sm text-red-600">{error}<button disabled={saving} className="ml-2 underline" onClick={()=>{setError("");void (sessionId.current?load():restart()).catch(e=>setError(String(e)));}}>重新載入練習</button></div>}
    {card&&state&&target?<>
      <div className="w-full rounded-2xl border p-8 text-center" style={{borderColor:"var(--color-border)",background:"var(--color-sidebar-bg)"}}>
        <p className="whitespace-pre-wrap break-words text-2xl font-medium" lang="en">{card.front}</p>
        {revealed&&<p className="mt-6 whitespace-pre-wrap break-words border-t pt-6 text-xl" lang="zh">{card.back}</p>}
      </div>
      {!revealed?<><p className="text-sm opacity-60">先回想中文，再顯示答案。</p><button disabled={!!error||saving} className="rounded-lg border px-6 py-3" onClick={()=>{setPreviewTime(Date.now());setRevealed(true);}}>顯示答案</button></>:<>
        {mode==="free"&&<p className="text-sm">{official?"本卡本輪首次正式評分：以下時間為 FSRS 排程預覽。":"本輪後續練習：只有 Easy 出箱，不再更新 FSRS。"}</p>}
        <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4">
          {([[1,"忘記","Again"],[2,"困難","Hard"],[3,"記得","Good"],[4,"簡單","Easy"]] as const).map(([rating,label,en])=><button key={rating} disabled={saving||!!error} onClick={()=>void mark(rating)} className="rounded-lg border px-2 py-3 disabled:opacity-40">
            <span className="block font-medium">{label}</span><span className="block text-xs opacity-60">{en}</span>
            {preview&&<span className="mt-2 block text-sm">{intervalLabel(preview[rating].card.due.getTime(),previewTime)}</span>}
          </button>)}
        </div>
        <p className="text-xs opacity-60">忘記＝沒想起來或答錯；困難＝成功但吃力；記得＝正常回想；簡單＝立即想起。</p>
        {mode==="free"&&!official&&<p className="text-sm">本輪練習，不變更排程。冷凍時間：{interval==null?"尚未排程":intervalLabel(interval,0)}</p>}
      </>}
    </>:<div className="space-y-3 py-8 text-center">
      <p>{!session?"正在恢復練習…":session.targets.length?"本次練習完成，每張字卡都已取得 Easy。":mode==="daily"?"今日批次沒有可學的新字。":"目前沒有已學字卡，請先完成每日學習中的 Easy。"}</p>
      {session&&<button disabled={saving} className="rounded border px-4 py-2" onClick={()=>void restart()}>再練一次</button>}
    </div>}
    <button disabled={saving} onClick={onExit} className="text-sm underline opacity-70">返回全部預覽</button>
  </div>;
}
