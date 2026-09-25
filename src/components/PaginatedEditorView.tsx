"use client";
import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import type { PageFormat, PageMargins } from "../lib/types";
import { DEFAULT_PAGE_MARGINS } from "../lib/types";
import { paginateLessonBlocks, type LessonLayout } from "../lib/lessonDocument";
import TiptapEditor from "./TiptapEditor";
import DocumentRuler, { getDocumentRulerWidth } from "./DocumentRuler";
import PageThumbnail from "./PageThumbnail";

type Block = any;

// A4 紙張（96dpi）：210mm ≈ 794px、297mm ≈ 1123px
const A4_W_PX = 794;
const A4_H_PX = 1123;

function getTextFromNode(node: any): string {
  if (!node) return "";
  if (node.type === "text") return node.text || "";
  if (Array.isArray(node.content)) return node.content.map(getTextFromNode).join("");
  return "";
}

/**
 * 手動分頁：僅以 pageBreak 節點切分頁面（不自動分頁、不估算高度）。
 * 這是 2026-08-11 定案的「分頁筆記」模型——每張紙獨立、內容不會被自動搬移。
 */
function splitByPageBreaks(blocks: Block[]): Block[][] {
  const pages: Block[][] = [];
  let current: Block[] = [];
  for (const block of blocks) {
    if (block.type === "pageBreak") {
      pages.push(current);
      current = [];
    } else {
      current.push(block);
    }
  }
  pages.push(current);
  // 移除開頭的空頁（若文件以 pageBreak 起始）
  while (pages.length > 0 && pages[0].length === 0) pages.shift();
  return pages.length > 0 ? pages : [[]];
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

// 依物件引用找出某頁 blocks 在原始 blocks 陣列中的索引範圍
function findPageRange(blocks: Block[], pageBlocks: Block[]): [number, number] {
  const set = new Set(pageBlocks);
  const idxs: number[] = [];
  blocks.forEach((b, i) => { if (set.has(b)) idxs.push(i); });
  if (idxs.length === 0) return [0, 0];
  return [idxs[0], idxs[idxs.length - 1]];
}

function firstHeadingText(pageBlocks: Block[]): string {
  for (const b of pageBlocks) if (b.type === "heading") return getTextFromNode(b).trim();
  return "";
}

// 行號計數（邏輯行，與 editor gutter 一致；跨頁連續）
function countLogicalLines(node: Block): number {
  switch (node?.type) {
    case "paragraph":
    case "heading":
    case "horizontalRule":
      return 1;
    case "codeBlock":
      return Math.max(1, getTextFromNode(node).split("\n").length);
    case "listItem":
    case "taskItem":
      return 1 + (node.content || [])
        .filter((child: Block) => child.type !== "paragraph")
        .reduce((total: number, child: Block) => total + countLogicalLines(child), 0);
    case "bulletList":
    case "orderedList":
    case "taskList":
    case "blockquote":
    case "callout":
    case "multiColumn":
    case "column":
      return (node.content || []).reduce((total: number, child: Block) => total + countLogicalLines(child), 0);
    case "table":
      return Math.max(1, node.content?.length || 0);
    case "pageBreak":
    case "image":
      return 0;
    default:
      return (node.content || []).reduce((total: number, child: Block) => total + countLogicalLines(child), 0);
  }
}

function countPageLines(pageBlocks: Block[]): number {
  return pageBlocks.reduce((total, block) => total + countLogicalLines(block), 0);
}

export default function PaginatedEditorView({
  content,
  lessonLayout,
  onNavigateLesson,
  onContentChange,
  format,
  toolbarTarget,
  editToolbarTarget,
  insertToolbarTarget,
  formatToolbarTarget,
  nightAdapt = false,
  onToggleNightAdapt,
  margins,
  onMarginsChange,
  toolbarTab = "home",
  fileMode = false,
  showRuler = false,
  showLineNumbers = false,
  showThumbRail = true,
  paneId = "primary",
  zoom = 1,
}: {
  content: any;
  lessonLayout?: LessonLayout;
  onNavigateLesson?: (id: string) => void;
  onContentChange: (payload: { json: any; text: string }) => void;
  format: PageFormat;
  toolbarTarget: HTMLElement | null;
  editToolbarTarget?: HTMLElement | null;
  insertToolbarTarget?: HTMLElement | null;
  formatToolbarTarget?: HTMLElement | null;
  nightAdapt?: boolean;
  onToggleNightAdapt?: () => void;
  margins?: PageMargins;
  onMarginsChange?: (margins: PageMargins) => void;
  toolbarTab?: "home";
  fileMode?: boolean;
  showRuler?: boolean;
  showLineNumbers?: boolean;
  showThumbRail?: boolean;
  paneId?: string;
  zoom?: number;
}) {
  const blocks: Block[] = useMemo(() => (content?.content as Block[]) || [], [content]);

  const m = margins || DEFAULT_PAGE_MARGINS;
  const pagePaddingPx = useMemo(() => ({
    top: Math.max(Math.round(m.top * 3.7795), lessonLayout?.header ? 64 : 0),
    right: Math.round(m.right * 3.7795),
    bottom: Math.max(Math.round(m.bottom * 3.7795), lessonLayout?.footer ? 64 : lessonLayout?.pageNumbers !== false ? 40 : 0),
    left: Math.round(m.left * 3.7795),
  }), [m, lessonLayout?.header, lessonLayout?.footer, lessonLayout?.pageNumbers]);

  // 頁面 = 以手動分頁符切分
  const pagesBlocks = useMemo(() => splitByPageBreaks(blocks), [blocks]);

  // 行號跨頁連續
  const pageLineStarts = useMemo(() => (
    pagesBlocks.map((_, index) => (
      1 + pagesBlocks.slice(0, index).reduce((total, page) => total + countPageLines(page), 0)
    ))
  ), [pagesBlocks]);

  const [layoutRevision, setLayoutRevision] = useState(0);
  const [layoutMessage, setLayoutMessage] = useState("");
  const [lastLayout, setLastLayout] = useState<{ before: Block[]; after: string } | null>(null);
  const [activePage, setActivePage] = useState(0);
  const [pageMenu, setPageMenu] = useState<{ x: number; y: number; idx: number } | null>(null);
  const [renamingPage, setRenamingPage] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const pageMenuRef = useRef<HTMLDivElement | null>(null);
  // 紙張是否長高超過 A4 邊界（決定是否顯示虛線提示）
  const [grownPages, setGrownPages] = useState<boolean[]>([]);

  // 偵測每張紙是否超過 A4 高度 → 顯示分頁虛線
  useEffect(() => {
    const observers: ResizeObserver[] = [];
    const nextGrown = new Array(pagesBlocks.length).fill(false);
    let changed = false;
    pagesBlocks.forEach((_, idx) => {
      const el = pageRefs.current[idx];
      if (!el) return;
      const obs = new ResizeObserver(() => {
        const h = el.offsetHeight;
        const grown = h > A4_H_PX + 2;
        if (nextGrown[idx] !== grown) {
          nextGrown[idx] = grown;
          changed = true;
          setGrownPages((prev) => {
            const copy = [...prev];
            copy[idx] = grown;
            return copy;
          });
        }
      });
      obs.observe(el);
      observers.push(obs);
    });
    // 初始同步一次
    if (changed) setGrownPages([...nextGrown]);
    return () => observers.forEach((o) => o.disconnect());
  }, [pagesBlocks.length]);

  useEffect(() => {
    if (!pageMenu) return;
    const handler = (e: MouseEvent) => {
      if (pageMenuRef.current && !pageMenuRef.current.contains(e.target as Node)) setPageMenu(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [pageMenu]);

  // 單頁編輯：只更新該頁區塊，不觸發任何自動搬移。
  // 注意：pagesBlocks 是切分後的頁面（不含 pageBreak 節點），合併回 doc 時
  // 必須在頁與頁之間重新插入 pageBreak，否則手動分頁符會遺失、頁面崩塌。
  const handlePageChange = useCallback((pageIndex: number, payload: { json: any; text: string }) => {
    const newPageBlocks = (payload.json?.content as Block[]) || [];
    const nextPages = [...pagesBlocks];
    nextPages[pageIndex] = newPageBlocks;
    const merged: Block[] = [];
    nextPages.forEach((page, i) => {
      if (i > 0) merged.push({ type: "pageBreak" });
      merged.push(...page);
    });
    // M4 fix: 壓縮連續 pageBreak（使用者在頁內插入分頁符時，會與頁間系統分隔疊加），
    // 避免下次 splitByPageBreaks 產生空白頁。
    const finalBlocks = normalizePageBreaks(merged);
    onContentChange({
      json: { type: "doc", content: finalBlocks.length > 0 ? finalBlocks : [{ type: "paragraph" }] },
      text: finalBlocks.map(getTextFromNode).join("\n\n"),
    });
  }, [pagesBlocks, onContentChange]);

  const persistPages = useCallback((newBlocks: Block[]) => {
    const normalized = normalizePageBreaks(newBlocks);
    const finalBlocks = normalized.length > 0 ? normalized : [{ type: "paragraph" }];
    onContentChange({
      json: { type: "doc", content: finalBlocks },
      text: finalBlocks.map(getTextFromNode).join("\n\n"),
    });
  }, [onContentChange]);

  const arrangePages = () => {
    if (pageRefs.current.some((root) => root?.querySelector('[data-lesson-kind="answer"][data-collapsed="true"]'))) { setLayoutMessage("請先展開解答，再整理分頁；列印會包含完整解答。"); return; }
    const heights: number[] = [];
    let measurementFailed = false;
    pagesBlocks.forEach((page, index) => {
      const root = pageRefs.current[index];
      const editor = root?.querySelector(".ProseMirror");
      const children = Array.from(editor?.children ?? []) as HTMLElement[];
      const scale = root ? root.getBoundingClientRect().width / A4_W_PX : 1;
      if (children.length !== page.length) measurementFailed = true;
      if (index > 0) heights.push(0);
      children.forEach((element) => {
        const style = window.getComputedStyle(element);
        heights.push(element.getBoundingClientRect().height / scale + (parseFloat(style.marginTop) || 0) + (parseFloat(style.marginBottom) || 0));
      });
    });
    if (measurementFailed || heights.length !== blocks.length) { setLayoutMessage("編輯器尚未完成排版，請稍後再試。"); return; }
    const result = paginateLessonBlocks(blocks, heights, A4_H_PX - pagePaddingPx.top - pagePaddingPx.bottom - 24);
    setLastLayout({ before: blocks, after: JSON.stringify(normalizePageBreaks(result.blocks)) });
    persistPages(result.blocks);
    setLayoutRevision((revision) => revision + 1);
    setLayoutMessage(result.oversized ? `已整理分頁；${result.oversized} 個區塊超出單頁高度，請拆分長表格／段落或縮小圖片後再整理。` : "已依 A4 整理分頁，保留原有手動分頁位置。");
  };
  const undoArrange = () => {
    if (!lastLayout || JSON.stringify(blocks) !== lastLayout.after) return;
    persistPages(lastLayout.before);
    setLastLayout(null);
    setLayoutRevision((revision) => revision + 1);
    setLayoutMessage("已還原整理前的分頁。");
  };

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

  const handleAddPageAfter = useCallback((idx: number) => {
    const pageBlocks = pagesBlocks[idx] || [];
    const newBlocks = [...blocks];
    const [, end] = findPageRange(newBlocks, pageBlocks);
    newBlocks.splice(end + 1, 0, { type: "pageBreak" }, { type: "paragraph" });
    persistPages(newBlocks);
    setActivePage(Math.min(idx + 1, pagesBlocks.length));
  }, [blocks, pagesBlocks, persistPages]);

  const handleAddPageBefore = useCallback((idx: number) => {
    const pageBlocks = pagesBlocks[idx] || [];
    const newBlocks = [...blocks];
    const [start] = findPageRange(newBlocks, pageBlocks);
    newBlocks.splice(start, 0, { type: "pageBreak" }, { type: "paragraph" });
    persistPages(newBlocks);
    setActivePage(Math.min(idx, pagesBlocks.length));
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

  const handleAppendPage = useCallback(() => {
    const newBlocks = [...blocks];
    if (newBlocks.length > 0) newBlocks.push({ type: "pageBreak" });
    newBlocks.push({ type: "paragraph" });
    persistPages(newBlocks);
    setActivePage(pagesBlocks.length);
  }, [blocks, pagesBlocks, persistPages]);

  return (
    <div className="flex flex-1 min-h-0">
      {/* 左側分頁縮圖列（GoodNotes 風格） */}
      {showThumbRail && (
        <div className="w-20 shrink-0 border-r overflow-hidden flex flex-col" style={{ borderColor: "var(--color-border)", background: "var(--color-panel-bg)" }}>
          <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2">
            {pagesBlocks.map((pb, idx) => {
            const summary = pb.map(getTextFromNode).join(" ").trim().slice(0, 24);
            const name = firstHeadingText(pb) || "未命名";
            return (
              <div key={idx} className="flex flex-col gap-1">
                <button
                  onClick={() => {
                    setActivePage(idx);
                    pageRefs.current[idx]?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  onContextMenu={(e) => { e.preventDefault(); setPageMenu({ x: e.clientX, y: e.clientY, idx }); }}
                  title={`第 ${idx + 1} 頁 / ${name}${summary ? " — " + summary : ""}`}
                  className="rounded-md p-1.5 flex flex-col items-center gap-1 transition-all"
                  style={{
                    border: "1px solid",
                    borderColor: activePage === idx ? "#3b82f6" : "var(--color-border)",
                    backgroundColor: activePage === idx ? "rgba(59,130,246,0.12)" : "var(--color-bg)",
                  }}
                >
                  <PageThumbnail blocks={pb} format={format} margins={m} nightAdapt={nightAdapt} />
                  <span className="text-[9px] opacity-60 truncate w-full text-center">{idx + 1}/{name}</span>
                </button>
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
          <div className="shrink-0 border-t p-2" style={{ borderColor: "var(--color-border)" }}>
            <button type="button" onClick={handleAppendPage} className="flex w-full flex-col items-center gap-0.5 rounded-md border py-1.5 text-[10px] hover:bg-zinc-100 dark:hover:bg-zinc-800" style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }} title="新增頁面">
              <span className="text-base leading-none">＋</span><span>新增頁面</span>
            </button>
          </div>
        </div>
      )}

      {/* 縮圖右鍵選單 */}
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

      {/* 主捲動區 */}
      <div className="lesson-paper-scroll flex-1 overflow-auto flex flex-col items-center" style={{ background: "#f5f5f4", padding: "24px", zoom }}>
        <div className="nexus-print-hide mb-3 flex w-full flex-wrap items-center gap-2 text-sm">
          <button type="button" className="rounded-lg border bg-white px-3 py-2 text-zinc-800" onClick={arrangePages}>依 A4 整理分頁</button>
          <button type="button" className="rounded-lg border bg-white px-3 py-2 text-zinc-800 disabled:opacity-40" disabled={!lastLayout || JSON.stringify(blocks) !== lastLayout.after} onClick={undoArrange}>復原分頁整理</button>
          {layoutMessage && <span role="status" className="text-xs text-zinc-600">{layoutMessage}</span>}
        </div>
        {showRuler && (
          <div className="sticky top-0 z-20 mb-4 flex w-full justify-center nexus-print-hide" style={{ background: "#f5f5f4" }}>
            <div style={{ width: getDocumentRulerWidth("paged") }}>
              <DocumentRuler format="paged" margins={m} />
            </div>
          </div>
        )}
        <div className="nexus-print-target lesson-paper-stack flex flex-col gap-6 w-full items-center">
          {pagesBlocks.map((pageBlocks, idx) => {
            const isAdapt = nightAdapt;
            const grown = grownPages[idx] || false;
            return (
              <div
                key={`${layoutRevision}-${idx}`}
                ref={(el) => { pageRefs.current[idx] = el; }}
                data-page={idx}
                className="lesson-paper relative rounded-sm"
                style={{
                  width: A4_W_PX,
                  minHeight: A4_H_PX,
                  background: isAdapt ? "var(--color-editor-bg)" : "white",
                  color: isAdapt ? "var(--color-text)" : "#1a1a1a",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.08)",
                  boxSizing: "border-box",
                }}
              >
                {lessonLayout?.header && <div className="lesson-paper-header" style={{ left: pagePaddingPx.left, right: pagePaddingPx.right }}>{lessonLayout.header}</div>}
                <div className="lesson-paper-footer" style={{ left: pagePaddingPx.left, right: pagePaddingPx.right }}><span>{lessonLayout?.footer}</span>{lessonLayout?.pageNumbers !== false && <span>{idx + 1} / {pagesBlocks.length}</span>}</div>
                <div
                  className={isAdapt ? "nexus-paged-content nexus-paged-adapt" : "nexus-paged-content"}
                  style={{
                    padding: `${pagePaddingPx.top}px ${pagePaddingPx.right}px ${pagePaddingPx.bottom}px ${pagePaddingPx.left}px`,
                    boxSizing: "border-box",
                    minHeight: A4_H_PX,
                  }}
                >
                  <TiptapEditor
                    lessonDocument={content}
                    onNavigateLesson={onNavigateLesson}
                    content={{ type: "doc", content: pageBlocks.length > 0 ? pageBlocks : [{ type: "paragraph" }] }}
                    onChange={(payload) => handlePageChange(idx, payload)}
                    variant="rich"
                    toolbarTarget={idx === activePage ? toolbarTarget : null}
                    editToolbarTarget={idx === activePage ? editToolbarTarget : null}
                    insertToolbarTarget={idx === activePage ? insertToolbarTarget : null}
                    formatToolbarTarget={idx === activePage ? formatToolbarTarget : null}
                    showToolbar={idx === activePage && !fileMode}
                    toolbarTab={toolbarTab}
                    showLineNumbers={showLineNumbers}
                    lineNumberStart={pageLineStarts[idx]}
                    margins={margins}
                    onMarginsChange={onMarginsChange}
                    paneId={paneId}
                    pageIndex={idx}
                    onFocus={() => setActivePage(idx)}
                    pageNightAdapt={nightAdapt}
                    onTogglePageNightAdapt={onToggleNightAdapt}
                  />
                </div>
                {/* 紙張長高超過 A4 邊界 → 虛線提示（A4 分頁線） */}
                {grown && (
                  <div
                    className="nexus-print-hide pointer-events-none select-none absolute"
                    style={{
                      left: pagePaddingPx.left,
                      right: pagePaddingPx.right,
                      top: A4_H_PX,
                      borderTop: "2px dashed #94a3b8",
                    }}
                  >
                    <span
                      className="absolute text-[10px] text-slate-400"
                      style={{ right: 0, top: -9, background: isAdapt ? "var(--color-editor-bg)" : "white", padding: "0 4px" }}
                    >
                      A4 分頁線
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {/* 新增頁面（手動） */}
        <button
          onClick={handleAppendPage}
          className="mt-6 mb-4 rounded-lg px-4 py-2 text-sm font-medium hover:bg-zinc-200 transition-all nexus-print-hide"
          style={{ border: "1px solid var(--color-border)", color: "var(--color-text)", backgroundColor: "var(--color-bg)" }}
        >
          ＋ 新增頁面
        </button>
      </div>
    </div>
  );
}
