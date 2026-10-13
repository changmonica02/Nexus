"use client";
import {confirmDialog} from '../../lib/confirmDialog';
import {useEffect,useRef,useState} from 'react';
export function navigateDictionary(leave:()=>void){const event=new CustomEvent('dictionary:navigate',{cancelable:true,detail:leave});if(window.dispatchEvent(event))leave();}
/** Links (including parent return controls), history navigation and native unload protection. */
export function useUnsavedDraft(dirty:boolean,busy=false,save?:()=>Promise<boolean>){
  const [pending,setPending]=useState<null|(()=>void)>(null);
  const state=useRef({dirty,busy,save});
  useEffect(()=>{state.current={dirty,busy,save};},[dirty,busy,save]);
  const bypass=useRef(false),queued=useRef(false);
  useEffect(()=>{
    let active=true;let currentURL=window.location.href,currentState=window.history.state;
    const ask=(leave:()=>void)=>{
      if(state.current.busy||queued.current)return;
      queued.current=true;
      if(state.current.save){setPending(()=>leave);return;}
      void confirmDialog({title:'離開編輯',message:'有尚未儲存的修改，確定離開並捨棄修改？',confirmLabel:'捨棄並離開',danger:true}).then(ok=>{queued.current=false;if(active&&ok){bypass.current=true;leave();}});
    };
    const unload=(event:BeforeUnloadEvent)=>{if(!bypass.current&&(state.current.dirty||state.current.busy)){event.preventDefault();event.returnValue='';}};
    const click=(event:MouseEvent)=>{
      if(bypass.current||(!state.current.dirty&&!state.current.busy))return;
      const link=event.target instanceof Element?event.target.closest('a[href]'):null;
      if(!link||event.defaultPrevented||link.getAttribute('target')==='_blank'||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
      const href=link.getAttribute('href');if(!href||href.startsWith('#'))return;
      event.preventDefault();event.stopPropagation();
      ask(()=>{if(link instanceof HTMLElement&&link.isConnected)link.click();else window.location.assign(href);});
    };
    const pop=(event:PopStateEvent)=>{
      if(bypass.current||(!state.current.dirty&&!state.current.busy)){currentURL=window.location.href;currentState=window.history.state;return;}
      const target=window.location.href;
      event.stopImmediatePropagation();window.history.pushState(currentState,'',currentURL);
      ask(()=>window.location.assign(target));
    };
    const navigate=(event:Event)=>{if(bypass.current||(!state.current.dirty&&!state.current.busy))return;event.preventDefault();ask((event as CustomEvent<()=>void>).detail);};
    window.addEventListener('dictionary:navigate',navigate);
    window.addEventListener('beforeunload',unload);document.addEventListener('click',click,true);window.addEventListener('popstate',pop,true);
    return()=>{active=false;window.removeEventListener('dictionary:navigate',navigate);window.removeEventListener('beforeunload',unload);document.removeEventListener('click',click,true);window.removeEventListener('popstate',pop,true);};
  },[]);
  useEffect(()=>{if(dirty)bypass.current=false;},[dirty]);
  const cancel=()=>{queued.current=false;setPending(null);};
  const discard=()=>{if(state.current.busy)return;const leave=pending;cancel();bypass.current=true;leave?.();};
  const saveAndLeave=async()=>{if(state.current.busy)return;if(await state.current.save?.()){const leave=pending;cancel();bypass.current=true;leave?.();}};
  return {pending,cancel,discard,saveAndLeave};
}
