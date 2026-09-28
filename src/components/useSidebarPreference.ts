"use client";
import {useCallback,useEffect,useState,type SetStateAction} from 'react';
// Keep the existing two sidebar states; persist desktop choices only.
export function useSidebarPreference(key:string,initial:boolean){
  const [value,setValue]=useState(initial);
  useEffect(()=>{
    let desktop=false;
    const restore=()=>{const next=window.innerWidth>=768;if(next&&!desktop){try{const saved=localStorage.getItem(key);if(saved==='true'||saved==='false')setValue(saved==='true');}catch{/* Storage may be unavailable. */}}desktop=next;};
    restore();window.addEventListener('resize',restore);return()=>window.removeEventListener('resize',restore);
  },[key]);
  const update=useCallback((action:SetStateAction<boolean>)=>setValue(previous=>{
    const next=typeof action==='function'?action(previous):action;
    if(window.innerWidth>=768){try{localStorage.setItem(key,String(next));}catch{/* Keep in-memory behavior. */}}
    return next;
  }),[key]);
  return [value,update] as const;
}
