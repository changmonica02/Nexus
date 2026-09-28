"use client";
import { useMenuDismiss } from "./useMenuDismiss";
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
  useMenuDismiss(isOpen,[buttonRef,popupRef],()=>setIsOpen(false));

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
    const onResize = () => updatePos();

    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {

      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [isOpen, updatePos]);

  const fmt = currentFormat || "flow";
  // 2026-08-11：分頁/流動不可轉換。簡報保留 16:9/4:3 切換；其餘只顯示目前模式。

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen((v) => !v)}
        className="flex items-center gap-0.5 rounded px-2 py-1 text-[13px] transition-colors hover:bg-zinc-200/70"
        style={{ border: "none", color: "var(--color-text)", backgroundColor: isOpen ? "rgba(0,0,0,0.07)" : "transparent" }}
        title="檔案選單"
      >
        <span>{t("file.title")}</span>
        <span className="text-[9px] opacity-40">▾</span>
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
          <div className="px-3 pt-1 pb-1 text-[10px] font-semibold tracking-wider text-zinc-400 uppercase flex items-center justify-between"><span>格式</span><span className="text-[9px] normal-case opacity-60">{isPresentation ? "簡報" : "建立時選定"}</span></div>
          <div className="px-2 pb-1">
            {isPresentation ? (
              <div className="grid grid-cols-2 gap-1">
                {[
                  { id: "16:9", label: "16:9 投影", desc: "簡報" },
                  { id: "4:3", label: "4:3 投影", desc: "簡報" },
                ].map((opt) => (
                  <button key={opt.id} onClick={() => { onFormatChange?.(opt.id as PageFormat); setIsOpen(false); }} className={`rounded-md px-2.5 py-2 text-left border transition-all ${fmt === opt.id ? "bg-zinc-800 text-white border-zinc-800" : "bg-transparent hover:bg-zinc-100 border-zinc-200"}`}>
                    <div className="text-xs font-medium">{opt.label}{fmt === opt.id ? " ✓" : ""}</div>
                    <div className="text-[10px] opacity-60">{opt.desc}</div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-md border border-zinc-200 px-2.5 py-2 text-xs opacity-70" style={{ color: "var(--color-text)" }}>
                {isDocument
                  ? "📄 文檔（一律流動）"
                  : fmt === "paged"
                    ? "📑 分頁筆記（手動 A4 頁面）"
                    : "📄 流動筆記（無限捲動）"}
              </div>
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

