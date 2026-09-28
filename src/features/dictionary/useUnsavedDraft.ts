"use client";
import {useEffect} from 'react';
export function useUnsavedDraft(dirty:boolean,busy=false){
  useEffect(()=>{
    if(!dirty&&!busy)return;
    let leaving=false;
    const unload=(event:BeforeUnloadEvent)=>{if(!leaving){event.preventDefault();event.returnValue='';}};
    const click=(event:MouseEvent)=>{
      const link=event.target instanceof Element?event.target.closest('a[href]'):null;
      if(!link||event.defaultPrevented||link.getAttribute('target')==='_blank'||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
      const href=link.getAttribute('href');if(!href||href.startsWith('#'))return;
      if(busy||!window.confirm('有尚未儲存的修改，確定離開並捨棄修改？')){event.preventDefault();event.stopPropagation();}else leaving=true;
    };
    window.addEventListener('beforeunload',unload);document.addEventListener('click',click,true);
    return()=>{window.removeEventListener('beforeunload',unload);document.removeEventListener('click',click,true);};
  },[dirty,busy]);
}
