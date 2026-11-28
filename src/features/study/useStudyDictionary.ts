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
  const currentId=entryIds[0];
  const [result,setResult]=useState<{id:string;detail:PublishedDetail|null}>();

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
        request=client?readPublishedEntry(client,id).then(
          detail=>detail?.entry.id===id&&detail.entry.status==='published'?detail:null,
          ()=>null,
        ):Promise.resolve(null);
        cache.current.set(id,request);
      }
      if(id===currentId)void request.then(detail=>{
        if(active)setResult(previous=>previous?.id===id&&previous.detail===detail?previous:{id,detail});
      });
    }
    return()=>{active=false;};
  },[currentId,ids,generation]);
  return result?.id===currentId?result?.detail??null:null;
}
