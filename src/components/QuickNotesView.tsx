"use client";
import FeatureIcon from "./FeatureIcon";
import PageCollection,{type PageActions} from "./PageCollection";
import { useState, useMemo } from "react";
import type { Page } from "../lib/types";
import { useLanguage } from "../lib/LanguageContext";

export default function QuickNotesView({
  pages,
  onCreate,
  onUpdate,
  onDelete,
  onSelectPage,
  onRenamePage,onDuplicatePage,
}: PageActions & {
  pages: Page[];
  onCreate: (text: string) => void;
  onUpdate: (id: string, patch: Partial<Page>) => void;
  onDelete: (id: string) => void;
  onSelectPage: (id: string) => void;
}) {
  const { t } = useLanguage();
  const [input, setInput] = useState("");

  const quickNotes = useMemo(() => pages.filter((p) => (p.kind as any) === "quick_note" || p.folder === "QuickNotes").sort((a, b) => b.updated_at - a.updated_at), [pages]);

  const handleAdd = () => {
    const text = input.trim();
    if (!text) return;
    onCreate(text);
    setInput("");
  };

  return (
    <main className="flex flex-col flex-1 overflow-y-auto" style={{ backgroundColor: "var(--color-editor-bg)" }}>
      <div className="mx-auto w-full max-w-[900px] p-6">
        <h1 className="text-2xl font-semibold mb-2" style={{ color: "var(--color-text)" }}><FeatureIcon feature="quicknotes"/> {t("quickNote.title")}</h1>
        <p className="text-xs opacity-60 mb-6">類似 Google 記事本，快速記錄靈感，獨立於項目</p>

        <div className="mb-6 rounded-xl border shadow-sm p-3 flex gap-2" style={{ backgroundColor: "var(--color-bg)", borderColor: "var(--color-border)" }}>
          <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAdd()} placeholder={t("quickNote.placeholder")} className="flex-1 bg-transparent outline-none text-sm" style={{ color: "var(--color-text)" }} />
          <button onClick={handleAdd} className="rounded-md px-4 py-1.5 text-sm bg-zinc-800 text-white hover:bg-zinc-700">新增</button>
        </div>

        <PageCollection pages={quickNotes} viewStorageKey="nexus-quicknotes-view" onSelectPage={onSelectPage} onRenamePage={onRenamePage} onDuplicatePage={onDuplicatePage} onDeletePage={onDelete} renderCardFooter={note=><div className="flex gap-1">{["#fef3c7", "#dcfce7", "#dbeafe", "#fce7f3", "#f3e8ff"].map(color=><button type="button" key={color} aria-label={t('ui.noteColor',{color})} aria-pressed={note.color===color} onClick={()=>onUpdate(note.id,{color})} className="h-8 w-8 rounded-full border" style={{backgroundColor:color,borderColor:note.color===color?'var(--color-text)':'var(--color-border)'}}/>)}</div>}/>

      </div>
    </main>
  );
}
