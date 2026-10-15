"use client";
import {useLanguage} from "../lib/LanguageContext";
import { useEffect, useRef } from "react";

export default function CreationChoiceDialog({ title, options, onChoose, onClose }: {
  title: string;
  options: { id: string; label: string }[];
  onChoose: (id: string) => void;
  onClose: () => void;
}) {
  const {t}=useLanguage();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current; dialog?.showModal(); return () => dialog?.close(); }, []);
  return <dialog ref={ref} onCancel={onClose} className="m-auto w-[min(90vw,420px)] max-h-[80dvh] overflow-y-auto rounded-2xl border p-5 backdrop:bg-black/40" style={{ background: "var(--color-bg)", color: "var(--color-text)", borderColor: "var(--color-border)" }} aria-labelledby="creation-choice-title">
    <h2 id="creation-choice-title" className="mb-4 text-lg font-semibold">{title}</h2>
    <div className="grid gap-2">{options.map((option) => <button key={option.id} type="button" onClick={() => onChoose(option.id)} className="rounded-lg border p-3 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800" style={{ borderColor: "var(--color-border)" }}>{option.label}</button>)}</div>
    <button type="button" onClick={onClose} className="mt-4 rounded-lg px-3 py-2 text-sm">{t("ui.cancel")}</button>
  </dialog>;
}
