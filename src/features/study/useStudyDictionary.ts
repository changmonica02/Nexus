"use client";
import {useEffect,useMemo,useRef,useState} from 'react';
import {getSupabase} from '../../infrastructure/supabase/client';
import {observeDictionaryInvalidation} from '../dictionary/dictionaryInvalidation';
import {readPublishedEntry,type PublishedDetail} from '../dictionary/reader';

/** A small session window over the public reader, shared by all back projections.
 * Never writes private cards or loads an entire deck. Failed/slow aids are optional. */
export function useStudyDictionary(entryIds:(string|undefined)[]) {
  const key=JSON.stringify([...new Set(entryIds.filter((id):id is string=>!!id))].slice(0,3));
  const ids=useMemo(()=>JSON.parse(key) as string[],[key]);
  const [generation,setGeneration]=useState(0);
  const cache=useRef(new Map<string,Promise<PublishedDetail|null>>());
  const [result,setResult]=useState(new Map<string,PublishedDetail|null>());
  useEffect(()=>{
    const refresh=()=>{cache.current.clear();setGeneration(n=>n+1);};
    const stop=observeDictionaryInvalidation(refresh);
    window.addEventListener('online',refresh);
    return()=>{stop();window.removeEventListener('online',refresh);};
  },[]);
  useEffect(()=>{
    let active=true;
    const client=getSupabase();
    // Keep only the visible card and its two successors, including in-flight work.
    for(const id of cache.current.keys())if(!ids.includes(id))cache.current.delete(id);
    for(const id of ids){
      let request=cache.current.get(id);
      if(!request){
        request=new Promise<PublishedDetail|null>(resolve=>{
          const timer=setTimeout(()=>resolve(null),2500);
          if(!client){clearTimeout(timer);resolve(null);return;}
          void readPublishedEntry(client,id).then(detail=>{
            clearTimeout(timer);resolve(detail?.entry.id===id&&detail.entry.status==='published'?detail:null);
          },()=>{clearTimeout(timer);resolve(null);});
        });
        cache.current.set(id,request);
      }
      void request.then(detail=>{
        if(!active)return;
        setResult(previous=>{
          const entries=new Map(previous);
          for(const old of entries.keys())if(!ids.includes(old))entries.delete(old);
          entries.set(id,detail);
          return entries;
        });
      });
    }
    return()=>{active=false;};
  },[ids,generation]);
  const id=entryIds[0];
  // Keep a displayed answer stable while publication changes refresh in the background.
  const ready=!id||result.has(id);
  return {detail:id&&ready?result.get(id)??null:null,pending:!ready};
}
