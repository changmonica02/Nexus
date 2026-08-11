"use client";
import { useState, useMemo } from "react";
import type { Page } from "../lib/types";
import { useLanguage } from "../lib/LanguageContext";

export default function QuickNotesView({
  pages,
  onCreate,
  onUpdate,
  onDelete,
  onSelectPage,
}: {
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
        <h1 className="text-2xl font-semibold mb-2" style={{ color: "var(--color-text)" }}>📝 {t("quickNote.title")}</h1>
        <p className="text-xs opacity-60 mb-6">類似 Google 記事本，快速記錄靈感，獨立於項目</p>

        <div className="mb-6 rounded-xl border shadow-sm p-3 flex gap-2" style={{ backgroundColor: "var(--color-bg)", borderColor: "var(--color-border)" }}>
          <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAdd()} placeholder={t("quickNote.placeholder")} className="flex-1 bg-transparent outline-none text-sm" style={{ color: "var(--color-text)" }} />
          <button onClick={handleAdd} className="rounded-md px-4 py-1.5 text-sm bg-zinc-800 text-white hover:bg-zinc-700">新增</button>
        </div>

        {quickNotes.length === 0 ? (
          <div className="text-center py-16 opacity-40 text-sm">{t("quickNote.empty")}</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {quickNotes.map((note) => (
              <div key={note.id} className="rounded-xl border p-4 shadow-sm hover:shadow-md transition-all group" style={{ backgroundColor: note.color || "var(--color-bg)", borderColor: "var(--color-border)" }}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-medium text-sm truncate flex-1 cursor-pointer" onClick={() => onSelectPage(note.id)}>{note.title || "未命名"}</h3>
                  <button onClick={() => onDelete(note.id)} className="opacity-0 group-hover:opacity-100 text-xs hover:text-red-600">×</button>
                </div>
                <p className="text-xs opacity-70 line-clamp-4 whitespace-pre-wrap cursor-pointer" onClick={() => onSelectPage(note.id)}>{note.content_text || ""}</p>
                <div className="flex gap-1 mt-3">
                  {["#fef3c7", "#dcfce7", "#dbeafe", "#fce7f3", "#f3e8ff"].map((c) => (
                    <button key={c} onClick={() => onUpdate(note.id, { color: c })} className="w-5 h-5 rounded-full border" style={{ backgroundColor: c, borderColor: note.color === c ? "#000" : "var(--color-border)" }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
