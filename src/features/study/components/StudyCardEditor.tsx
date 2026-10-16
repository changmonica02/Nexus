"use client";
import {confirmDialog} from '../../../lib/confirmDialog';

import { useEffect, useId, useRef, useState } from "react";
import type { StudyCard } from "../studyFSRS";
import DictionaryLinkPicker from "../../dictionary/DictionaryLinkPicker";

export default function StudyCardEditor({ card, requiresScheduleChoice, onSave, onClose, onCopy, fixedEntryId, officialSource=false, lockDictionaryLink=false }: {
  card: Pick<StudyCard, "front" | "back"> & { id?: string };
  requiresScheduleChoice: boolean;
  fixedEntryId?:string; officialSource?:boolean; lockDictionaryLink?:boolean;
  onSave: (values: { front: string; back: string; dictionaryEntryId?:string|null }, reset: boolean) => Promise<void>;
  onClose: () => void;
  onCopy: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const formId=useId();
  const saving = useRef(false);
  const [front, setFront] = useState(card.front);
  const [back, setBack] = useState(card.back);
  const [dictionaryEntryId,setDictionaryEntryId]=useState<string|null|undefined>(undefined);
  const [choice, setChoice] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const confirmDiscard=async ()=>front===card.front&&back===card.back&&dictionaryEntryId===undefined||await confirmDialog("有尚未儲存的修改，確定關閉並捨棄修改？");
  const close=async()=>{if(!saving.current&&await confirmDiscard())onClose();};
  useEffect(() => {
    const element = dialog.current!;
    element.showModal();
    return () => element.close();
  }, []);
  const save = async (reset: boolean) => {
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    setError("");
    try {
      await onSave({ front, back, ...(dictionaryEntryId!==undefined?{dictionaryEntryId}:{}) }, reset);
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      saving.current = false;
      setBusy(false);
    }
  };
  return <dialog ref={dialog} aria-labelledby="study-card-editor-title"
    onCancel={event => { event.preventDefault(); close(); }}
    className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-xl border p-5 shadow-xl backdrop:bg-black/30"
    style={{ background: "var(--color-bg)", color: "var(--color-text)", borderColor: "var(--color-border)" }}>
    <header className="sticky top-0 z-10 -mx-5 -mt-5 mb-4 flex items-center justify-between gap-3 border-b p-4" style={{background:"var(--color-bg)",borderColor:"var(--color-border)"}}>
      <h2 id="study-card-editor-title" className="min-w-0 text-lg font-semibold">{card.id ? "編輯單字" : "新增單字"}</h2>
      <div className="flex shrink-0 gap-2"><button type="submit" form={formId} disabled={busy||choice} className="rounded bg-blue-600 px-3 py-2 text-sm text-white disabled:opacity-50">{busy?"儲存中…":"儲存"}</button><button type="button" disabled={busy} onClick={close} className="rounded border px-3 py-2 text-sm">關閉</button></div>
    </header>
    <form id={formId} onSubmit={event => {
      event.preventDefault();
      if (requiresScheduleChoice && front !== card.front) setChoice(true);
      else void save(false);
    }}>
      <fieldset disabled={busy || choice} className="space-y-4 disabled:opacity-60">
        <label className="block text-sm">英文<textarea aria-label="英文" autoFocus value={front} onChange={event => setFront(event.target.value)} rows={3}
          className="mt-1 block w-full resize-y rounded border bg-transparent p-2 outline-none focus:ring-2 focus:ring-blue-500" /></label>
        <label className="block text-sm">中文<textarea aria-label="中文" value={back} onChange={event => setBack(event.target.value)} rows={5}
          className="mt-1 block w-full resize-y rounded border bg-transparent p-2 outline-none focus:ring-2 focus:ring-blue-500" /></label>
      </fieldset>
      {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
      {choice ? <div className="mt-4 space-y-3 text-sm">
        <p>英文題面已修改。要保留原排程，還是重新設為 New？兩者都保留歷史。</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={busy} className="rounded border p-2" onClick={() => void save(false)}>保留排程</button>
          <button type="button" disabled={busy} className="rounded border p-2" onClick={() => void save(true)}>重設為新卡</button>
          <button type="button" disabled={busy} className="rounded border p-2" onClick={() => setChoice(false)}>返回編輯</button>
          <button type="button" disabled={busy} className="rounded border p-2" onClick={close}>取消修改</button>
        </div>
      </div> : <div className="mt-5 flex flex-wrap justify-end gap-2">
        {card.id && !fixedEntryId && !officialSource && <button type="button" disabled={busy} onClick={async()=>{if(await confirmDiscard())onCopy();}} className="mr-auto rounded border px-3 py-2 text-sm">複製為新卡</button>}
      </div>}
    </form>
    <div className="mt-5">{fixedEntryId||lockDictionaryLink?<p className="text-sm">私人英文與中文可自行修改；字典連結與單卡刪除需啟用官方來源相容更新。</p>:<DictionaryLinkPicker cardId={card.id} front={front} back={back} disabled={busy||choice} onChange={setDictionaryEntryId}/>}</div>
  </dialog>;
}
