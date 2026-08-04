"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import type { PageFormat } from "../lib/types";
import { useLanguage } from "../lib/LanguageContext";

export default function FileMenu({
  currentFormat,
  isDocument,
  isPresentation = false,
  onFormatChange,
  onExportMarkdown,
  onExportPdf,
  onExportNexus,
  onPrint,
  onNewNote,
  onNewDocument,
  onImportPdf,
  onImportMd,
  onConvertToPresentation,
  onDeleteBlankPages,
}: {
  currentFormat: PageFormat;
  isDocument: boolean;
  isPresentation?: boolean;
  onFormatChange?: (f: PageFormat) => void;
  onExportMarkdown?: () => void;
  onExportPdf?: () => void;
  onExportNexus?: () => void;
  onPrint?: () => void;
  onNewNote?: () => void;
  onNewDocument?: () => void;
  onImportPdf?: () => void;
  onImportMd?: () => void;
  onConvertToPresentation?: () => void;
  onDeleteBlankPages?: () => void;
}) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const updatePos = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    let left = rect.left;
    let top = rect.bottom + 6;
    const w = 272;
    if (left + w > window.innerWidth - 8) left = window.innerWidth - w - 8;
    if (top + 520 > window.innerHeight - 8) {
      top = rect.top - 520 - 6;
      if (top < 8) top = 8;
    }
    setPos({ top, left });
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    updatePos();
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (buttonRef.current && buttonRef.current.contains(target)) return;
      if (popupRef.current && popupRef.current.contains(target)) return;
      setIsOpen(false);
    };
    const onResize = () => updatePos();
    document.addEventListener("mousedown", handler);
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      document.removeEventListener("mousedown", handler);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [isOpen, updatePos]);

  const fmt = currentFormat || "flow";
  const canRestoreToFlow = fmt !== "flow";

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium hover:bg-zinc-200 transition-all"
        style={{ border: "1px solid transparent", color: "var(--color-text)" }}
        title="檔案選單"
      >
        <span>{t("file.title")}</span>
        <span className="text-[10px] opacity-50">▾</span>
      </button>

      {mounted && isOpen && createPortal(
        <div
          ref={popupRef}
          className="rounded-xl overflow-hidden shadow-2xl z-[9999] max-h-[80vh] overflow-y-auto"
          style={{
            position: "fixed",
            top: pos.top,
            left: pos.left,
            width: 272,
            backgroundColor: "var(--color-bg)",
            border: "1px solid var(--color-border)",
          }}
          onMouseDown={(e) => e.preventDefault()}
        >
          <div className="px-3 pt-2.5 pb-1 text-[10px] font-semibold tracking-wider text-zinc-400 uppercase">新建</div>
          <button onClick={() => { onNewNote?.(); setIsOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-zinc-100" style={{ color: "var(--color-text)" }}><span>📝</span> 新建筆記 (流動預設)</button>
          <button onClick={() => { onNewDocument?.(); setIsOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-zinc-100" style={{ color: "var(--color-text)" }}><span>📄</span> 新建文檔 (A4預設)</button>

          <div className="my-1 border-t" style={{ borderColor: "var(--color-border)" }} />
          <div className="px-3 pt-1 pb-1 text-[10px] font-semibold tracking-wider text-zinc-400 uppercase">匯入</div>
          <button onClick={() => { onImportPdf?.(); setIsOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-zinc-100" style={{ color: "var(--color-text)" }}><span>📥</span> 匯入 PDF</button>
          <button onClick={() => { onImportMd?.(); setIsOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-zinc-100" style={{ color: "var(--color-text)" }}><span>📄</span> 匯入 Markdown → 文檔</button>

          <div className="my-1 border-t" style={{ borderColor: "var(--color-border)" }} />
          <div className="px-3 pt-1 pb-1 text-[10px] font-semibold tracking-wider text-zinc-400 uppercase">簡報</div>
          <button onClick={() => { onConvertToPresentation?.(); setIsOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-zinc-100" style={{ color: "var(--color-text)" }}><span>📊</span> 轉為簡報 (用筆記製作簡報)</button>

          <div className="my-1 border-t" style={{ borderColor: "var(--color-border)" }} />
          <div className="px-3 pt-1 pb-1 text-[10px] font-semibold tracking-wider text-zinc-400 uppercase flex items-center justify-between"><span>格式</span><span className="text-[9px] normal-case opacity-60">{canRestoreToFlow ? "可還原為流動" : "流動為源"}</span></div>
          <div className="px-2 pb-1">
            <div className="grid grid-cols-2 gap-1">
              {(
                isPresentation
                  ? [
                      { id: "16:9", label: "16:9 投影", desc: "簡報" },
                      { id: "4:3", label: "4:3 投影", desc: "簡報" },
                    ]
                  : [
                      { id: "flow", label: "流動", desc: "無限長卷" },
                      { id: "a4", label: "A4 分頁", desc: "自動加頁" },
                    ]
              ).map((opt) => (
                <button key={opt.id} onClick={() => { onFormatChange?.(opt.id as PageFormat); setIsOpen(false); }} className={`rounded-md px-2.5 py-2 text-left border transition-all ${fmt === opt.id ? "bg-zinc-800 text-white border-zinc-800" : "bg-transparent hover:bg-zinc-100 border-zinc-200"}`}>
                  <div className="text-xs font-medium">{opt.label}{fmt === opt.id ? " ✓" : ""}</div>
                  <div className="text-[10px] opacity-60">{opt.desc}</div>
                </button>
              ))}
            </div>
            {canRestoreToFlow && (
              <button onClick={() => { onFormatChange?.("flow"); setIsOpen(false); }} className="mt-2 w-full rounded-md bg-blue-50 text-blue-700 border border-blue-200 px-3 py-2 text-xs font-medium hover:bg-blue-100 text-center">↩ 還原為流動 (可還原)</button>
            )}
          </div>

          <div className="my-1 border-t" style={{ borderColor: "var(--color-border)" }} />
          <div className="px-3 pt-1 pb-1 text-[10px] font-semibold tracking-wider text-zinc-400 uppercase">頁面管理</div>
          <button onClick={() => { onDeleteBlankPages?.(); setIsOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-zinc-100" style={{ color: "var(--color-text)" }}><span>🧹</span> 刪除空白頁</button>

          <div className="my-1 border-t" style={{ borderColor: "var(--color-border)" }} />
          <div className="px-3 pt-1 pb-1 text-[10px] font-semibold tracking-wider text-zinc-400 uppercase">匯出 / 列印</div>
          {isDocument ? (
            <button onClick={() => { onExportMarkdown?.(); setIsOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-zinc-100" style={{ color: "var(--color-text)" }}><span>📤</span> 匯出為 Markdown</button>
          ) : (
            <>
              <button onClick={() => { onExportPdf?.(); setIsOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-zinc-100" style={{ color: "var(--color-text)" }}><span>🖨️</span> 匯出為 PDF</button>
              <button onClick={() => { onExportNexus?.(); setIsOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-zinc-100" style={{ color: "var(--color-text)" }}><span>💾</span> 匯出為 Nexus JSON</button>
            </>
          )}
          <button onClick={() => { onPrint?.(); setIsOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-zinc-100" style={{ color: "var(--color-text)" }}><span>🖨️</span> 列印 (瀏覽器列印)</button>
        </div>,
        document.body
      )}
    </>
  );
}
