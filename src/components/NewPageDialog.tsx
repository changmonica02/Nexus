"use client";
import { useState, useEffect } from "react";
import { useLanguage } from "../lib/LanguageContext";
import type { PageFormat, PageKind } from "../lib/types";

export type NewPageKindChoice = PageKind;
// 2026-08-11：建立流程
// - 筆記：選「流動 / 分頁」兩種模式（建立後不可轉換）
// - 文檔：一律流動（直接建立）
// - 學習集：直接建立（flow）
// - 簡報：選 16:9 / 4:3
const FORMAT_OPTIONS_BY_KIND: Record<string, PageFormat[]> = {
  presentation: ["16:9", "4:3"],
};
const NOTE_MODE_OPTIONS: { value: PageFormat; icon: string }[] = [
  { value: "flow", icon: "📄" },
  { value: "paged", icon: "📑" },
];
const DEFAULT_FORMAT_BY_KIND: Record<string, PageFormat> = {
  document: "flow",
  study_set: "flow",
};

export default function NewPageDialog({ isOpen, onClose, onConfirm, initialKind }: {
  isOpen: boolean; onClose: () => void; onConfirm: (kind: NewPageKindChoice, format: PageFormat) => void;
  initialKind?: PageKind | null;
}) {
  const { t } = useLanguage();
  const [step, setStep] = useState<"kind" | "noteMode" | "format">("kind");
  const [selectedKind, setSelectedKind] = useState<NewPageKindChoice | null>(null);

  useEffect(() => {
    if (isOpen && initialKind) {
      if (initialKind === "note") {
        setSelectedKind(initialKind);
        setStep("noteMode");
      } else if (initialKind === "study_set") {
        onConfirm(initialKind, "flow");
        onClose();
      } else if (initialKind === "presentation") {
        setSelectedKind(initialKind);
        setStep("format");
      } else {
        // document：直接建立（一律流動）
        onConfirm(initialKind, DEFAULT_FORMAT_BY_KIND[initialKind] || "flow");
        onClose();
      }
    } else if (isOpen) {
      setStep("kind");
      setSelectedKind(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialKind]);

  if (!isOpen) return null;

  const kindOptions = [
    { id: "document" as const, icon: "📄", label: t("newPage.kind.document"), desc: t("newPage.kind.document.desc") },
    { id: "note" as const, icon: "📝", label: t("newPage.kind.note"), desc: t("newPage.kind.note.desc") },
    { id: "study_set" as const, icon: "🗂️", label: t("newPage.kind.studySet"), desc: t("newPage.kind.studySet.desc") },
    { id: "presentation" as const, icon: "📊", label: "簡報", desc: "投影片：圖表/版面/示圖/目錄" },
  ];

  const formatLabel = (f: PageFormat) => {
    if (f === "flow") return t("newPage.format.flow");
    if (f === "paged") return t("newPage.format.paged");
    if (f === "a4") return t("newPage.format.a4");
    if (f === "16:9") return t("newPage.format.169");
    if (f === "4:3") return t("newPage.format.43");
    return t("newPage.format.custom");
  };

  const handleSelectKind = (kind: NewPageKindChoice) => {
    if (kind === "note") {
      setSelectedKind(kind);
      setStep("noteMode");
      return;
    }
    if (kind === "study_set") { onConfirm(kind, "flow"); handleClose(); return; }
    if (kind === "presentation") {
      setSelectedKind(kind);
      setStep("format");
      return;
    }
    // document：不選格式，一律流動
    onConfirm(kind, DEFAULT_FORMAT_BY_KIND[kind] || "flow");
    handleClose();
  };

  const handleSelectNoteMode = (format: PageFormat) => {
    if (!selectedKind) return;
    onConfirm(selectedKind, format);
    handleClose();
  };
  const handleSelectFormat = (format: PageFormat) => {
    if (!selectedKind) return;
    onConfirm(selectedKind, format);
    handleClose();
  };
  const handleClose = () => { setStep("kind"); setSelectedKind(null); onClose(); };

  const showKindStep = step === "kind" && !initialKind;
  const showNoteModeStep = step === "noteMode" && selectedKind === "note";
  const showFormatStep = step === "format" && selectedKind === "presentation";

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center" style={{ backgroundColor: "rgba(0, 0, 0, 0.25)" }} onMouseDown={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
      <div className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl" style={{ backgroundColor: "var(--color-bg)", border: "1px solid var(--color-border)" }}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--color-border)" }}>
          <span className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
            {showFormatStep ? t("newPage.formatTitle") : showNoteModeStep ? t("newPage.noteModeTitle") : t("newPage.title")}
          </span>
          <button onClick={handleClose} className="text-sm opacity-40 hover:opacity-100 px-1.5 py-0.5 rounded" style={{ border: "1px solid var(--color-border)" }}>{t("commandPalette.esc")}</button>
        </div>
        <div className="p-4 space-y-2">
          {showKindStep && kindOptions.map((option) => (
            <button key={option.id} onClick={() => handleSelectKind(option.id)} className="w-full flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-all hover:bg-zinc-100" style={{ border: "1px solid var(--color-border)" }}>
              <span className="text-2xl">{option.icon}</span>
              <span><span className="block text-sm font-medium" style={{ color: "var(--color-text)" }}>{option.label}</span><span className="block text-xs opacity-60" style={{ color: "var(--color-text)" }}>{option.desc}</span></span>
            </button>
          ))}
          {showNoteModeStep && NOTE_MODE_OPTIONS.map((option) => (
            <button key={option.value} onClick={() => handleSelectNoteMode(option.value)} className="w-full flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-all hover:bg-zinc-100" style={{ border: "1px solid var(--color-border)" }}>
              <span className="text-2xl">{option.icon}</span>
              <span>
                <span className="block text-sm font-medium" style={{ color: "var(--color-text)" }}>{formatLabel(option.value)}</span>
                <span className="block text-xs opacity-60" style={{ color: "var(--color-text)" }}>
                  {option.value === "flow" ? t("newPage.noteMode.flowDesc") : t("newPage.noteMode.pagedDesc")}
                </span>
              </span>
            </button>
          ))}
          {showFormatStep && (FORMAT_OPTIONS_BY_KIND[selectedKind as string] || ["flow"]).map((format) => (
            <button key={format} onClick={() => handleSelectFormat(format)} className="w-full flex items-center justify-between rounded-xl px-4 py-3 text-left transition-all hover:bg-zinc-100" style={{ border: "1px solid var(--color-border)", color: "var(--color-text)" }}>
              <span className="text-sm font-medium">{formatLabel(format as PageFormat)}</span>
            </button>
          ))}
        </div>

      </div>
    </div>
  );
}
