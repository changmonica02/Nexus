"use client";
import {useId,type ReactNode} from 'react';
import ModalDialog from '../../components/ModalDialog';
/** Native dialog provides the same focus/escape behaviour as the card editor. */
export function DictionaryModal({title,children,onClose,busy=false,dismissOnBackdrop=false,headerActions}:{title:string;children:ReactNode;onClose:()=>void;busy?:boolean;dismissOnBackdrop?:boolean;headerActions?:ReactNode}){
  const id=useId();
  return <ModalDialog aria-labelledby={id} onDismiss={onClose} busy={busy} dismissOnBackdrop={dismissOnBackdrop} className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-3xl overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] shadow-xl backdrop:bg-black/50">
    <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-bg)] p-4"><h2 id={id} className="font-semibold">{title}</h2><div className="ml-auto flex flex-wrap items-center justify-end gap-2"><button type="button" disabled={busy} className="rounded border border-[var(--color-border)] px-3 py-2 disabled:opacity-40" onClick={onClose}>關閉</button>{headerActions}</div></header>
    <div className="space-y-4 p-4">{children}</div>
  </ModalDialog>;
}
