"use client";
import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import type { PageFormat, PageMargins } from "../lib/types";
import { DEFAULT_PAGE_MARGINS } from "../lib/types";
import TiptapEditor from "./TiptapEditor";

type Block = any;

function getTextFromNode(node: any): string {
  if (!node) return "";
  if (node.type === "text") return node.text || "";
  if (Array.isArray(node.content)) return node.content.map(getTextFromNode).join("");
  return "";
}

function estimateBlockHeight(node: Block): number {
  const type = node.type;
  switch (type) {
    case "heading":
      return node.attrs?.level === 1 ? 70 : node.attrs?.level === 2 ? 55 : 45;
    case "paragraph": {
      const text = getTextFromNode(node);
      const charsPerLine = 70;
      const lines = Math.max(1, Math.ceil(text.length / charsPerLine));
      return lines * 26 + 20;
    }
    case "bulletList":
    case "orderedList":
    case "taskList": {
      let h = 0;
      for (const item of node.content || []) {
        h += estimateBlockHeight(item);
      }
      return Math.max(30, h + 10);
    }
    case "listItem":
    case "taskItem": {
      let h = 0;
      for (const c of node.content || []) {
        h += estimateBlockHeight(c);
      }
      return Math.max(28, h);
    }
    case "table": {
      const rows = node.content?.length || 3;
      return rows * 48 + 50;
    }
    case "blockquote":
      return 70;
    case "codeBlock": {
      const text = getTextFromNode(node);
      const lines = text.split("\n").length;
      return Math.max(70, lines * 22 + 36);
    }
    case "image":
      return 240;
    case "callout": {
      let h = 0;
      for (const c of node.content || []) {
        h += estimateBlockHeight(c);
      }
      return h + 60;
    }
    case "multiColumn": {
      let maxH = 0;
      for (const col of node.content || []) {
        let colH = 0;
        for (const b of col.content || []) {
          colH += estimateBlockHeight(b);
        }
        maxH = Math.max(maxH, colH);
      }
      return maxH + 30;
    }
    case "column": {
      let h = 0;
      for (const b of node.content || []) {
        h += estimateBlockHeight(b);
      }
      return h;
    }
    case "pageBreak":
      return 20;
    default:
      return 50;
  }
}

function splitIntoPages(blocks: Block[], innerHeight: number): Block[][] {
  const pages: Block[][] = [[]];
  let currentHeight = 0;
  let currentPage = pages[0];
  for (const block of blocks) {
    // 手動分頁符：強制換頁（不佔內容）
    if (block.type === "pageBreak") {
      if (currentPage.length > 0) {
        pages.push([]);
        currentPage = pages[pages.length - 1];
        currentHeight = 0;
      }
      continue;
    }
    const h = estimateBlockHeight(block);
    if (h > innerHeight) {
      if (currentPage.length > 0) {
        pages.push([]);
        currentPage = pages[pages.length - 1];
        currentHeight = 0;
      }
      currentPage.push(block);
      pages.push([]);
      currentPage = pages[pages.length - 1];
      currentHeight = 0;
      continue;
    }
    if (currentHeight + h > innerHeight && currentPage.length > 0) {
      pages.push([]);
      currentPage = pages[pages.length - 1];
      currentHeight = 0;
    }
    currentPage.push(block);
    currentHeight += h;
  }
  while (pages.length > 1 && pages[pages.length - 1].length === 0) {
    pages.pop();
  }
  if (pages.length === 0) return [[]];
  return pages;
}

// 依物件引用找出某頁 blocks 在原始 blocks 陣列中的索引範圍
function findPageRange(blocks: Block[], pageBlocks: Block[]): [number, number] {
  const set = new Set(pageBlocks);
  const idxs: number[] = [];
  blocks.forEach((b, i) => { if (set.has(b)) idxs.push(i); });
  if (idxs.length === 0) return [0, 0];
  return [idxs[0], idxs[idxs.length - 1]];
}

// 壓縮連續 pageBreak、移除開頭/結尾 pageBreak
function normalizePageBreaks(blocks: Block[]): Block[] {
  const out: Block[] = [];
  let prevBreak = false;
  for (const b of blocks) {
    const isBreak = b.type === "pageBreak";
    if (isBreak && (prevBreak || out.length === 0)) continue;
    out.push(b);
    prevBreak = isBreak;
  }
  while (out.length > 0 && out[out.length - 1].type === "pageBreak") out.pop();
  return out;
}

function firstHeadingText(pageBlocks: Block[]): string {
  for (const b of pageBlocks) if (b.type === "heading") return getTextFromNode(b).trim();
  return "";
}

export default function PaginatedEditorView({
  content,
  onContentChange,
  format,
  toolbarTarget,
  nightAdapt = false,
  onToggleNightAdapt,
  margins,
  onMarginsChange,
  toolbarTab = "home",
  fileMode = false,
}: {
  content: any;
  onContentChange: (payload: { json: any; text: string }) => void;
  format: PageFormat;
  toolbarTarget: HTMLElement | null;
  nightAdapt?: boolean;
  onToggleNightAdapt?: () => void;
  margins?: PageMargins;
  onMarginsChange?: (margins: PageMargins) => void;
  toolbarTab?: "home" | "insert" | "layout";
  fileMode?: boolean;
}) {
  const blocks: Block[] = useMemo(() => {
    return (content?.content as Block[]) || [];
  }, [content]);

  // 頁邊距（mm→px；A4: 297mm ≈ 1122px）
  const MM_TO_PX = 3.7795;
  const m = margins || DEFAULT_PAGE_MARGINS;
  const marginTopPx = m.top * MM_TO_PX;
  const marginBottomPx = m.bottom * MM_TO_PX;
  const marginLeftPx = m.left * MM_TO_PX;
  const marginRightPx = m.right * MM_TO_PX;

  const innerHeight = useMemo(() => {
    if (format === "a4") return Math.round(1122 - marginTopPx - marginBottomPx);
    if (format === "16:9") return Math.round(540 - marginTopPx - marginBottomPx);
    if (format === "4:3") return Math.round(600 - marginTopPx - marginBottomPx);
    return 800;
  }, [format, marginTopPx, marginBottomPx]);

  const pageHeight = useMemo(() => {
    if (format === "a4") return 1122;
    if (format === "16:9") return 540;
    if (format === "4:3") return 600;
    return 900;
  }, [format]);

  const pagesBlocks = useMemo(() => {
    return splitIntoPages(blocks, innerHeight);
  }, [blocks, innerHeight]);

  const [activePage, setActivePage] = useState(0);
  const redistributeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<{ pageIndex: number; blocks: Block[][] } | null>(null);

  const handlePageChange = useCallback((pageIndex: number, payload: { json: any; text: string }) => {
    const newPageBlocks = (payload.json?.content as Block[]) || [];
    const nextPages = [...pagesBlocks];
    nextPages[pageIndex] = newPageBlocks;

    const mergedBlocksImmediate = nextPages.flat();
    const mergedJsonImmediate = { type: "doc", content: mergedBlocksImmediate.length > 0 ? mergedBlocksImmediate : [{ type: "paragraph" }] };
    const mergedTextImmediate = mergedBlocksImmediate.map(getTextFromNode).join("\n\n");
    onContentChange({ json: mergedJsonImmediate, text: mergedTextImmediate });

    pendingRef.current = { pageIndex, blocks: nextPages };
    if (redistributeTimeoutRef.current) clearTimeout(redistributeTimeoutRef.current);
    redistributeTimeoutRef.current = setTimeout(() => {
      const pending = pendingRef.current;
      if (!pending) return;
      const { pageIndex: pIdx, blocks: curPages } = pending;
      const curPageBlocks = curPages[pIdx] || [];
      const curHeight = curPageBlocks.reduce((sum, b) => sum + estimateBlockHeight(b), 0);
      const buffer = 150;
      if (curHeight > innerHeight + buffer && curPageBlocks.length > 1) {
        const lastBlock = curPageBlocks[curPageBlocks.length - 1];
        const remaining = curPageBlocks.slice(0, -1);
        const newPages = [...curPages];
        newPages[pIdx] = remaining;
        if (pIdx + 1 < newPages.length) {
          newPages[pIdx + 1] = [lastBlock, ...newPages[pIdx + 1]];
        } else {
          newPages.push([lastBlock]);
        }
        const remerged = newPages.flat();
        onContentChange({ json: { type: "doc", content: remerged }, text: remerged.map(getTextFromNode).join("\n\n") });
      }
    }, 800);
  }, [pagesBlocks, innerHeight, onContentChange]);

  const [pageMenu, setPageMenu] = useState<{ x: number; y: number; idx: number } | null>(null);
  const [renamingPage, setRenamingPage] = useState<number | null>(null);
  const [marginsOpen, setMarginsOpen] = useState(false);
  const [draftMargins, setDraftMargins] = useState<PageMargins>(margins || DEFAULT_PAGE_MARGINS);
  const [renameValue, setRenameValue] = useState("");
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const pageMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!pageMenu) return;
    const handler = (e: MouseEvent) => {
      if (pageMenuRef.current && !pageMenuRef.current.contains(e.target as Node)) setPageMenu(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [pageMenu]);

  const persistPages = useCallback((newBlocks: Block[]) => {
    const normalized = normalizePageBreaks(newBlocks);
    const finalBlocks = normalized.length > 0 ? normalized : [{ type: "paragraph" }];
    onContentChange({ json: { type: "doc", content: finalBlocks }, text: finalBlocks.map(getTextFromNode).join("\n\n") });
  }, [onContentChange]);

  const applyRename = useCallback((idx: number, title: string) => {
    const t = (title || "").trim();
    if (!t) return;
    const pageBlocks = pagesBlocks[idx] || [];
    const newBlocks = [...blocks];
    const [start, end] = findPageRange(newBlocks, pageBlocks);
    let headingPos = -1;
    for (let i = start; i <= end; i++) {
      if (newBlocks[i].type === "heading") { headingPos = i; break; }
    }
    if (headingPos !== -1) {
      newBlocks[headingPos] = { ...newBlocks[headingPos], content: [{ type: "text", text: t }] };
    } else {
      newBlocks.splice(start, 0, { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: t }] });
    }
    persistPages(newBlocks);
  }, [blocks, pagesBlocks, persistPages]);

  const handleAddPageBefore = useCallback((idx: number) => {
    const pageBlocks = pagesBlocks[idx] || [];
    const newBlocks = [...blocks];
    const [start] = findPageRange(newBlocks, pageBlocks);
    newBlocks.splice(start, 0, { type: "paragraph" }, { type: "pageBreak" });
    persistPages(newBlocks);
    setActivePage(Math.min(idx, pagesBlocks.length));
  }, [blocks, pagesBlocks, persistPages]);

  const handleAddPageAfter = useCallback((idx: number) => {
    const pageBlocks = pagesBlocks[idx] || [];
    const newBlocks = [...blocks];
    const [, end] = findPageRange(newBlocks, pageBlocks);
    newBlocks.splice(end + 1, 0, { type: "pageBreak" }, { type: "paragraph" }, { type: "pageBreak" });
    persistPages(newBlocks);
    setActivePage(Math.min(idx + 1, pagesBlocks.length));
  }, [blocks, pagesBlocks, persistPages]);

  const handleDeletePage = useCallback((idx: number) => {
    if (pagesBlocks.length <= 1) { alert("至少保留一頁"); return; }
    const pageBlocks = pagesBlocks[idx] || [];
    const newBlocks = [...blocks];
    const [start, end] = findPageRange(newBlocks, pageBlocks);
    newBlocks.splice(start, end - start + 1);
    persistPages(newBlocks);
    setActivePage(Math.min(idx, Math.max(0, pagesBlocks.length - 2)));
  }, [blocks, pagesBlocks, persistPages]);

  return (
    <div className="flex flex-1 min-h-0">
      {/* 需求3：左側分頁縮圖預覽（GoodNotes 風格） */}
      <div className="w-20 shrink-0 border-r overflow-y-auto p-2 flex flex-col gap-2" style={{ borderColor: "var(--color-border)", background: "var(--color-panel-bg)" }}>
        {/* 需求2：邊界設定（Word 版面配置→邊界） */}
        <button
          onClick={() => { setDraftMargins(margins || DEFAULT_PAGE_MARGINS); setMarginsOpen(true); }}
          className="w-full rounded-md py-1.5 text-[10px] flex items-center justify-center gap-1 hover:bg-zinc-200 transition-all"
          style={{ border: "1px solid var(--color-border)", color: "var(--color-text)" }}
          title="頁面邊界"
        >
          ▦ 邊界
        </button>
        {marginsOpen && (
          <div className="rounded-lg p-2 flex flex-col gap-1.5" style={{ border: "1px solid var(--color-border)", background: "var(--color-bg)" }}>
            <div className="text-[9px] font-semibold opacity-60 text-center">頁面邊界 (mm)</div>
            {(["top", "right", "bottom", "left"] as const).map((k) => (
              <label key={k} className="flex items-center justify-between gap-1 text-[10px]">
                <span className="opacity-70">{k === "top" ? "上" : k === "bottom" ? "下" : k === "left" ? "左" : "右"}</span>
                <input
                  type="number"
                  min={0}
                  max={40}
                  value={draftMargins[k]}
                  onChange={(e) => setDraftMargins((prev) => ({ ...prev, [k]: Math.max(0, Math.min(40, Number(e.target.value) || 0)) }))}
                  className="w-12 rounded px-1 py-0.5 text-[10px] text-right outline-none"
                  style={{ border: "1px solid var(--color-border)", color: "var(--color-text)", background: "var(--color-bg)" }}
                />
              </label>
            ))}
            <div className="flex gap-1">
              <button onClick={() => { setDraftMargins(DEFAULT_PAGE_MARGINS); }} className="flex-1 rounded py-1 text-[10px] hover:bg-zinc-200" style={{ border: "1px solid var(--color-border)", color: "var(--color-text)" }}>預設</button>
              <button onClick={() => { onMarginsChange?.(draftMargins); setMarginsOpen(false); }} className="flex-1 rounded py-1 text-[10px] font-medium" style={{ border: "1px solid var(--color-border)", color: "var(--color-text)", backgroundColor: "var(--color-border)" }}>套用</button>
            </div>
          </div>
        )}
        {pagesBlocks.map((pb, idx) => {
          const summary = pb.map(getTextFromNode).join(" ").trim().slice(0, 24);
          const name = firstHeadingText(pb) || "未命名";
          const pageName = `${idx + 1}/${name}`;
          return (
            <div key={idx} className="flex flex-col gap-1">
              {/* 需求1：左鍵點擊 → 編輯區捲動到該頁 */}
              <button
                onClick={() => {
                  setActivePage(idx);
                  pageRefs.current[idx]?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                onContextMenu={(e) => { e.preventDefault(); setPageMenu({ x: e.clientX, y: e.clientY, idx }); }}
                title={`${pageName}${summary ? " — " + summary : ""}`}
                className="rounded-md p-1.5 flex flex-col items-center gap-1 transition-all"
                style={{
                  border: "1px solid",
                  borderColor: activePage === idx ? "#3b82f6" : "var(--color-border)",
                  backgroundColor: activePage === idx ? "rgba(59,130,246,0.12)" : "var(--color-bg)",
                }}
              >
                <div className="w-full aspect-[210/297] rounded-sm" style={{ background: "white", border: "1px solid var(--color-border)", boxShadow: "0 1px 2px rgba(0,0,0,0.1)" }} />
                <span className="text-[9px] opacity-60 truncate w-full text-center">{pageName}</span>
              </button>
              {/* 需求5：行內重新命名 */}
              {renamingPage === idx ? (
                <input
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { applyRename(idx, renameValue); setRenamingPage(null); }
                    if (e.key === "Escape") setRenamingPage(null);
                  }}
                  onBlur={() => { applyRename(idx, renameValue); setRenamingPage(null); }}
                  className="w-full text-[10px] rounded px-1 py-0.5 outline-none"
                  style={{ border: "1px solid #3b82f6", color: "var(--color-text)", background: "var(--color-bg)" }}
                />
              ) : null}
            </div>
          );
        })}
      </div>
      {/* 縮圖右鍵選單（需求1） */}
      {pageMenu && (
        <div
          ref={pageMenuRef}
          className="rounded-xl shadow-2xl z-[10000] overflow-hidden py-1 fixed"
          style={{
            top: Math.min(pageMenu.y, window.innerHeight - 200),
            left: Math.min(pageMenu.x, window.innerWidth - 190),
            width: 180,
            backgroundColor: "var(--color-bg)",
            border: "1px solid var(--color-border)",
          }}
          onMouseDown={(e) => e.preventDefault()}
        >
          <div className="px-3 py-1.5 text-[10px] font-semibold tracking-wider uppercase opacity-60">頁面操作</div>
          <button onClick={() => { setRenameValue(firstHeadingText(pagesBlocks[pageMenu.idx] || [])); setRenamingPage(pageMenu.idx); setPageMenu(null); }} className="w-full text-left px-3 py-2 text-xs hover:bg-zinc-100 flex items-center gap-2"><span>✏️</span> 重新命名</button>
          <button onClick={() => { handleAddPageBefore(pageMenu.idx); setPageMenu(null); }} className="w-full text-left px-3 py-2 text-xs hover:bg-zinc-100 flex items-center gap-2"><span>⬆️</span> 在前添加頁面</button>
          <button onClick={() => { handleAddPageAfter(pageMenu.idx); setPageMenu(null); }} className="w-full text-left px-3 py-2 text-xs hover:bg-zinc-100 flex items-center gap-2"><span>⬇️</span> 在後添加頁面</button>
          <div className="border-t my-1" style={{ borderColor: "var(--color-border)" }} />
          <button onClick={() => { handleDeletePage(pageMenu.idx); setPageMenu(null); }} className="w-full text-left px-3 py-2 text-xs hover:bg-red-50 flex items-center gap-2 text-red-600"><span>🗑️</span> 刪除頁面</button>
        </div>
      )}
      <div className="flex-1 overflow-y-auto flex flex-col items-center" style={{ background: format === "a4" ? "#f5f5f4" : "#0a0a0a", padding: "24px" }}>
      <style>{`
        .nexus-paged-content .ProseMirror {
          min-height: ${innerHeight}px !important;
        }
      `}</style>
      <div className="flex flex-col gap-6 w-full" style={{ width: format === "a4" ? "210mm" : format === "16:9" ? "960px" : format === "4:3" ? "800px" : "100%", maxWidth: "100%" }}>
        {pagesBlocks.map((pageBlocks, idx) => {
          const isAdapt = nightAdapt;
          return (
            <div
              key={idx}
              ref={(el) => { pageRefs.current[idx] = el; }}
              className="relative bg-white rounded-sm"
              style={{
                height: `${pageHeight}px`,
                minHeight: `${pageHeight}px`,
                background: isAdapt ? "var(--color-editor-bg)" : "white",
                color: isAdapt ? "var(--color-text)" : "#1a1a1a",
                boxShadow: "0 1px 3px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.08)",
                overflow: "hidden",
              }}
            >
              <div className="absolute top-2 right-3 text-[9px] opacity-20 select-none">第 {idx + 1} 頁 / 共 {pagesBlocks.length} 頁</div>
              <div className={`${isAdapt ? "nexus-paged-content nexus-paged-adapt" : "nexus-paged-content"}`} style={{ padding: `${m.top}mm ${m.right}mm ${m.bottom}mm ${m.left}mm`, boxSizing: "border-box", height: "100%", overflow: "hidden" }}>
                <TiptapEditor
                  content={{ type: "doc", content: pageBlocks.length > 0 ? pageBlocks : [{ type: "paragraph" }] }}
                  onChange={(payload) => handlePageChange(idx, payload)}
                  variant="rich"
                  toolbarTarget={idx === activePage ? toolbarTarget : null}
                  showToolbar={idx === activePage && !fileMode}
                  toolbarTab={toolbarTab}
                  onFocus={() => setActivePage(idx)}
                  pageNightAdapt={nightAdapt}
                  onTogglePageNightAdapt={onToggleNightAdapt}
                />
              </div>
            </div>
          );
        })}
      </div>
      </div>
    </div>
  );
}
