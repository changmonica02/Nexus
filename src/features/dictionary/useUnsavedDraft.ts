"use client";
import {confirmDialog} from '../../lib/confirmDialog';
import {useEffect} from 'react';
export function useUnsavedDraft(dirty:boolean,busy=false){
  useEffect(()=>{
    if(!dirty&&!busy)return;
    let leaving=false,pending=false,active=true;
    const unload=(event:BeforeUnloadEvent)=>{if(!leaving){event.preventDefault();event.returnValue='';}};
    const click=(event:MouseEvent)=>{
      if(leaving)return;
      const link=event.target instanceof Element?event.target.closest('a[href]'):null;
      if(!link||event.defaultPrevented||link.getAttribute('target')==='_blank'||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
      const href=link.getAttribute('href');if(!href||href.startsWith('#'))return;
      event.preventDefault();event.stopPropagation();
      if(busy||pending)return;
      pending=true;
      void confirmDialog({title:'離開編輯',message:'有尚未儲存的修改，確定離開並捨棄修改？',confirmLabel:'捨棄並離開',danger:true}).then(accepted=>{pending=false;if(active&&accepted&&link instanceof HTMLElement&&link.isConnected){leaving=true;link.click();}});
    };
    window.addEventListener('beforeunload',unload);document.addEventListener('click',click,true);
    return()=>{active=false;window.removeEventListener('beforeunload',unload);document.removeEventListener('click',click,true);};
  },[dirty,busy]);
}
