"use client";
import {useCallback,useEffect,useRef,useState} from 'react';
import type {ComponentProps} from 'react';
import type {WorldMapBlockView} from '../lib/types';
import WorldMapManager from './WorldMapManager';

type Props=Omit<ComponentProps<typeof WorldMapManager>,'blockView'|'onBlockViewChange'|'worldContent'> & {
  blockId:string; view:WorldMapBlockView; onViewCommit:(view:WorldMapBlockView)=>Promise<void>;
};
/** Coalesce view events, but participate in the existing save/leave barrier. */
export default function WorldMapBlock({blockId,view,onViewCommit,registerFlush,...props}:Props){
  const latest=useRef(onViewCommit);
  useEffect(()=>{latest.current=onViewCommit;},[onViewCommit]);
  const pending=useRef<WorldMapBlockView|null>(null),timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined),running=useRef<Promise<void>|null>(null);
  const saved=useRef(JSON.stringify(view));
  const [error,setError]=useState(''),[saving,setSaving]=useState(false);
  const flush=useCallback(async()=>{
    clearTimeout(timer.current);
    if(running.current){await running.current;if(!pending.current)return;}
    const task=(async()=>{
      setSaving(true);
      try{while(pending.current){const next=pending.current;pending.current=null;
        try{await latest.current(next);saved.current=JSON.stringify(next);setError('');}
        catch(cause){pending.current??=next;setError(String(cause));throw cause;}
      }}finally{setSaving(false);}
    })();running.current=task;
    try{await task;}finally{if(running.current===task)running.current=null;}
  },[]);
  const change=useCallback((next:WorldMapBlockView)=>{
    if(props.readOnly||JSON.stringify(next)===saved.current&&!pending.current)return;
    pending.current=next;clearTimeout(timer.current);timer.current=setTimeout(()=>void flush().catch(()=>{}),700);
  },[flush,props.readOnly]);
  useEffect(()=>registerFlush?.(`map-block:${blockId}`,flush),[registerFlush,blockId,flush]);
  useEffect(()=>{
    const warn=(event:BeforeUnloadEvent)=>{if(pending.current||running.current){event.preventDefault();event.returnValue='';}};
    window.addEventListener('beforeunload',warn);
    return ()=>{clearTimeout(timer.current);window.removeEventListener('beforeunload',warn);};
  },[]);
  return <div data-world-map-block={blockId} className="min-w-0">
    <WorldMapManager {...props} beforeSave={async()=>{await flush();await props.beforeSave();}} registerFlush={registerFlush} blockView={view} onBlockViewChange={change}/>
    <div role="status" className="flex justify-end gap-2 px-3 text-xs">{error?<><span className="text-red-600">{error}</span><button onClick={()=>void flush().catch(()=>{})}>重試儲存顯示設定</button></>:saving?'顯示設定儲存中…':null}</div>
  </div>;
}
