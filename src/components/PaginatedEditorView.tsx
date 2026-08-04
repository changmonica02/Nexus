"use client";
import { useState, useMemo, useCallback, useRef } from "react";
import type { PageFormat } from "../lib/types";
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

export default function PaginatedEditorView({
  content,
  onContentChange,
  format,
  toolbarTarget,
  nightAdapt = false,
  onToggleNightAdapt,
}: {
  content: any;
  onContentChange: (payload: { json: any; text: string }) => void;
  format: PageFormat;
  toolbarTarget: HTMLElement | null;
  nightAdapt?: boolean;
  onToggleNightAdapt?: () => void;
}) {
  const blocks: Block[] = useMemo(() => {
    return (content?.content as Block[]) || [];
  }, [content]);

  const innerHeight = useMemo(() => {
    if (format === "a4") return 971;
    if (format === "16:9") return 476;
    if (format === "4:3") return 536;
    return 800;
  }, [format]);

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

  return (
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
              <div className={`${isAdapt ? "nexus-paged-content nexus-paged-adapt" : "nexus-paged-content"}`} style={{ padding: format === "a4" ? "20mm 18mm" : "32px 40px", boxSizing: "border-box", height: "100%", overflow: "hidden" }}>
                <TiptapEditor
                  content={{ type: "doc", content: pageBlocks.length > 0 ? pageBlocks : [{ type: "paragraph" }] }}
                  onChange={(payload) => handlePageChange(idx, payload)}
                  variant="rich"
                  toolbarTarget={idx === activePage ? toolbarTarget : null}
                  showToolbar={idx === activePage}
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
  );
}
