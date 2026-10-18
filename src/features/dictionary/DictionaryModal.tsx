"use client";
import {useEffect,useId,useRef,type ReactNode} from 'react';
/** Native dialog provides the same focus/escape behaviour as the card editor. */
export function DictionaryModal({title,children,onClose,busy=false,dismissOnBackdrop=false,headerActions}:{title:string;children:ReactNode;onClose:()=>void;busy?:boolean;dismissOnBackdrop?:boolean;headerActions?:ReactNode}){
  const ref=useRef<HTMLDialogElement>(null),id=useId();
  const returnFocus=useRef<HTMLElement|null>(typeof document==='undefined'?null:document.activeElement as HTMLElement);
  useEffect(()=>{const dialog=ref.current!;dialog.showModal();return()=>{dialog.close();const opener=returnFocus.current;queueMicrotask(()=>{if(opener?.isConnected)opener.focus();});};},[]);
  return <dialog ref={ref} aria-labelledby={id} onClick={event=>{if(!dismissOnBackdrop||busy||event.target!==event.currentTarget)return;const rect=event.currentTarget.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)onClose();}} onCancel={e=>{e.preventDefault();if(!busy)onClose();}} className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-3xl overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] shadow-xl backdrop:bg-black/50">
    <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-bg)] p-4"><h2 id={id} className="font-semibold">{title}</h2><div className="ml-auto flex flex-wrap items-center justify-end gap-2"><button type="button" disabled={busy} className="rounded border border-[var(--color-border)] px-3 py-2 disabled:opacity-40" onClick={onClose}>關閉</button>{headerActions}</div></header>
    <div className="space-y-4 p-4">{children}</div>
  </dialog>;
}
