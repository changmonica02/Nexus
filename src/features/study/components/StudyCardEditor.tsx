"use client";
import { useEffect, useRef, useState } from "react";
import type { StudyCard } from "../studyFSRS";

export default function StudyCardEditor({ card, requiresScheduleChoice, onSave, onClose, onCopy }: {
  card: Pick<StudyCard, "front" | "back"> & { id?: string };
  requiresScheduleChoice: boolean;
  onSave: (values: { front: string; back: string }, reset: boolean) => Promise<void>;
  onClose: () => void;
  onCopy: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const saving = useRef(false);
  const [front, setFront] = useState(card.front);
  const [back, setBack] = useState(card.back);
  const [choice, setChoice] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
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
      await onSave({ front, back }, reset);
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      saving.current = false;
      setBusy(false);
    }
  };
  return <dialog ref={dialog} aria-labelledby="study-card-editor-title"
    onCancel={event => { event.preventDefault(); if (!saving.current) onClose(); }}
    className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-xl border p-5 shadow-xl backdrop:bg-black/30"
    style={{ background: "var(--color-bg)", color: "var(--color-text)", borderColor: "var(--color-border)" }}>
    <form onSubmit={event => {
      event.preventDefault();
      if (requiresScheduleChoice && front !== card.front) setChoice(true);
      else void save(false);
    }}>
      <h2 id="study-card-editor-title" className="mb-4 text-lg font-semibold">{card.id ? "編輯單字" : "新增單字"}</h2>
      <fieldset disabled={busy || choice} className="space-y-4 disabled:opacity-60">
        <label className="block text-sm">英文<textarea autoFocus value={front} onChange={event => setFront(event.target.value)} rows={3}
          className="mt-1 block w-full resize-y rounded border bg-transparent p-2 outline-none focus:ring-2 focus:ring-blue-500" /></label>
        <label className="block text-sm">中文<textarea value={back} onChange={event => setBack(event.target.value)} rows={5}
          className="mt-1 block w-full resize-y rounded border bg-transparent p-2 outline-none focus:ring-2 focus:ring-blue-500" /></label>
      </fieldset>
      {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
      {choice ? <div className="mt-4 space-y-3 text-sm">
        <p>英文題面已修改。要保留原排程，還是重新設為 New？兩者都保留歷史。</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={busy} className="rounded border p-2" onClick={() => void save(false)}>保留排程</button>
          <button type="button" disabled={busy} className="rounded border p-2" onClick={() => void save(true)}>重設為新卡</button>
          <button type="button" disabled={busy} className="rounded border p-2" onClick={() => setChoice(false)}>返回編輯</button>
          <button type="button" disabled={busy} className="rounded border p-2" onClick={onClose}>取消修改</button>
        </div>
      </div> : <div className="mt-5 flex flex-wrap justify-end gap-2">
        {card.id && <button type="button" disabled={busy} onClick={onCopy} className="mr-auto rounded border px-3 py-2 text-sm">複製為新卡</button>}
        <button type="button" disabled={busy} onClick={onClose} className="rounded border px-3 py-2 text-sm">取消</button>
        <button type="submit" disabled={busy} className="rounded bg-blue-600 px-3 py-2 text-sm text-white disabled:opacity-50">{busy ? "儲存中…" : "儲存"}</button>
      </div>}
    </form>
  </dialog>;
}
