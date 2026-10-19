"use client";
import {useSyncExternalStore} from 'react';
import ModalDialog from './ModalDialog';
import {currentDialog,subscribeDialog,finishDialog,type DialogRequest} from '../lib/confirmDialog';
export function ConfirmDialog({request,onResult}:{request:DialogRequest;onResult:(value:boolean)=>void}){
  return <ModalDialog aria-labelledby="nexus-confirm-title" aria-describedby="nexus-confirm-message" onDismiss={()=>onResult(false)} className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-xl border p-5 shadow-xl backdrop:bg-black/50" style={{background:'var(--color-bg)',color:'var(--color-text)',borderColor:'var(--color-border)'}}>
    <h2 id="nexus-confirm-title" className="text-lg font-semibold">{request.title??'確認操作'}</h2>
    <p id="nexus-confirm-message" className="my-4 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{request.message}</p>
    <div className="flex flex-wrap justify-end gap-2">{!request.notice&&<button autoFocus type="button" className="rounded border px-4 py-2" onClick={()=>onResult(false)}>{request.cancelLabel??'取消'}</button>}<button autoFocus={request.notice} type="button" className={`rounded border px-4 py-2 ${request.danger?'bg-red-600 text-white':'bg-[var(--color-panel-bg)]'}`} onClick={()=>onResult(true)}>{request.confirmLabel??'確認'}</button></div>
  </ModalDialog>;
}
export default function ConfirmDialogHost(){const request=useSyncExternalStore(subscribeDialog,currentDialog,()=>null);return request?<ConfirmDialog key={request.id} request={request} onResult={value=>finishDialog(request.id,value)}/>:null;}
