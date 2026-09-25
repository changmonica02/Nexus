"use client";
import { useEffect, useRef, useState } from "react";
import type { QuizRepository } from "../lib/quizPersistence";

export default function QuizOfflinePrompt({repository}:{repository:QuizRepository}) {
  const [ids,setIds]=useState<string[]|null>(null),[count,setCount]=useState(0);
  const [busy,setBusy]=useState(false),[error,setError]=useState("");
  const snapshot=useRef<string[]|null>(null),later=useRef(false),locked=useRef(false);
  const [connected,setConnected]=useState(false);
  useEffect(()=>{
    let active=true,readVersion=0;
    const read=async()=>{
      const version=++readVersion,online=repository.canOfferUpload();
      const pending=await repository.awaiting();
      if(!active||version!==readVersion)return;
      setConnected(online);setCount(pending.length);
      if(snapshot.current){
        // Another tab may already have authorized these IDs. Remove them, never add late arrivals.
        const awaiting=new Set(pending.map(a=>a.id));
        snapshot.current=snapshot.current.filter(id=>awaiting.has(id));
        if(!snapshot.current.length)snapshot.current=null;
        setIds(snapshot.current);
      }else if(online&&pending.length&&!later.current){
        snapshot.current=pending.map(a=>a.id);setIds(snapshot.current);
      }
    };
    const changed=()=>{void read().catch(e=>{if(active)setError(String(e));});};
    changed();
    window.addEventListener("nexus-study-changed",changed);
    window.addEventListener("nexus-quiz-connectivity",changed);
    window.addEventListener("offline",changed);
    return()=>{active=false;window.removeEventListener("nexus-study-changed",changed);window.removeEventListener("nexus-quiz-connectivity",changed);window.removeEventListener("offline",changed);};
  },[repository]);
  const decide=async(decision:"upload"|"discard"|"later")=>{
    if(!snapshot.current||locked.current)return;
    locked.current=true;setBusy(true);setError("");
    try{
      await repository.decide([...snapshot.current],decision);
      later.current=true;snapshot.current=null;setIds(null);setCount((await repository.awaiting()).length);
    }catch(e){setError(String(e));}
    finally{locked.current=false;setBusy(false);}
  };
  const reopen=async()=>{
    if(locked.current)return;locked.current=true;setBusy(true);
    try{snapshot.current=(await repository.awaiting()).map(a=>a.id);setIds(snapshot.current.length?snapshot.current:null);}
    catch(e){setError(String(e));}finally{locked.current=false;setBusy(false);}
  };
  if(!connected||(!count&&!ids&&!error))return null;
  return <aside aria-label="離線測驗結果" className="fixed bottom-4 right-4 z-[90] max-w-sm rounded-xl border p-4 shadow-xl" style={{background:"var(--color-bg)",color:"var(--color-text)"}}>
    {error&&<p role="alert" className="text-sm text-red-600">{error}</p>}
    {ids?<><p role="status">有 {ids.length} 筆離線測驗結果尚未上傳。</p>
      <div className="mt-3 flex flex-wrap gap-2 text-sm">
        <button disabled={busy} className="rounded border p-2" onClick={()=>void decide("upload")}>上傳並更新跨裝置錯題權重</button>
        <button disabled={busy} className="rounded border p-2" onClick={()=>void decide("discard")}>捨棄</button>
        <button disabled={busy} className="rounded border p-2" onClick={()=>void decide("later")}>稍後決定</button>
      </div></>:<button disabled={busy} className="text-sm underline" onClick={()=>void reopen()}>處理 {count} 筆離線測驗結果</button>}
  </aside>;
}
