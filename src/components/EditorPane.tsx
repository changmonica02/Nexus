"use client";
import SaveStatus, { type PageSaveState } from "./SaveStatus";
import {SidebarToggle} from "./WorkspaceNavigation";
import { type CSSProperties, useRef, useState, useEffect, useLayoutEffect, useCallback } from "react";
import type { Page, Attachment, PageFormat, PageMargins } from "../lib/types";
import { useLanguage } from "../lib/LanguageContext";
import LessonLayoutPanel from "./LessonLayoutPanel";
import { readLessonLayout, buildLessonIndex, type LessonLayout } from "../lib/lessonDocument";
import TiptapEditor from "./TiptapEditor";
import PageFormatView from "./PageFormatView";
import PaginatedEditorView from "./PaginatedEditorView";
import FileMenu from "./FileMenu";
import ToolbarDropdown from "./ToolbarDropdown";
import DocumentRuler, { getDocumentRulerWidth } from "./DocumentRuler";

export default function EditorPane({
  page,
  attachment,
  pdfUrl,
  pdfLoadError,
  onTitleChange,
  onTagsChange,
  onContentChange,
  onFormatChange,
  onExportMarkdown,
  onExportPdf,
  onExportNexus,
  onNewNote,
  onNewDocument,
  onImportPdf,
  onImportMd,
  onConvertToPresentation,
  isSplitView = false,
  onCloseSplit,
  onSwapSplit,
  nightAdapt = false,
  onToggleNightAdapt = () => {},
  margins,
  onMarginsChange,
  onBackToInterface,
  saveState, onSave,
}: {
  saveState?: PageSaveState;
  onSave?: () => Promise<void>;
  page: Page | null;
  attachment: Attachment | null;
  pdfUrl: string | null;
  pdfLoadError: string | null;
  onTitleChange: (title: string) => void;
  onFolderChange?: (folder: string | null) => void;
  onTagsChange: (tags: string[]) => void;
  onContentChange: (payload: { json: any; text: string }) => void;
  onFormatChange?: (format: PageFormat) => void;
  onExportMarkdown?: () => void;
  onExportPdf?: () => void;
  onExportNexus?: () => void;
  onNewNote?: () => void;
  onNewDocument?: () => void;
  onImportPdf?: () => void;
  onImportMd?: () => void;
  onConvertToPresentation?: () => void;
  isSplitView?: boolean;
  onCloseSplit?: () => void;
  onSwapSplit?: () => void;
  nightAdapt?: boolean;
  onToggleNightAdapt?: () => void;
  margins?: PageMargins;
  onMarginsChange?: (margins: PageMargins) => void;
  /** Returns to the feature's overview instead of exposing global navigation in an editor. */
  onBackToInterface?: () => void;
}) {
  const { t, language } = useLanguage();
  const lessonRootRef = useRef<HTMLElement>(null);
  const lessonMetadataRef = useRef((page?.content_json as { lessonLayout?: LessonLayout } | undefined)?.lessonLayout);
  lessonMetadataRef.current = (page?.content_json as { lessonLayout?: LessonLayout } | undefined)?.lessonLayout;
  const documentMetadataRef = useRef(page?.content_json);
  documentMetadataRef.current = page?.content_json;
  const navigateLesson = (id: string) => {
    Array.from(lessonRootRef.current?.querySelectorAll<HTMLElement>("[data-id]") ?? []).find((element) => element.dataset.id === id)?.scrollIntoView({ behavior: "smooth", block: "center" });
  };
  const [tagInput, setTagInput] = useState("");
  const [showRuler, setShowRuler] = useState(false);
  const [showLineNumbers, setShowLineNumbers] = useState(false);
  const [isWordCountOpen, setIsWordCountOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [isThumbRailOpen, setIsThumbRailOpen] = useState(true);
  const [isPdfCollapsed, setIsPdfCollapsed] = useState(false);
  const [pdfViewerHeight, setPdfViewerHeight] = useState(560);
  const [toolbarTarget, setToolbarTarget] = useState<HTMLElement | null>(null);
  // 2026-08-11：Google Docs 式選單列——編輯/插入/格式 選單內容由 TiptapEditor portal 注入
  const [editToolbarTarget, setEditToolbarTarget] = useState<HTMLElement | null>(null);
  const [insertToolbarTarget, setInsertToolbarTarget] = useState<HTMLElement | null>(null);
  const [formatToolbarTarget, setFormatToolbarTarget] = useState<HTMLElement | null>(null);
  const toolbarPortalRef = useRef<HTMLDivElement>(null);
  const menuRowRef = useRef<HTMLDivElement>(null);
  const [isToolbarCompact, setIsToolbarCompact] = useState(false);

  const setEditMenuTarget = useCallback((element: HTMLDivElement | null) => setEditToolbarTarget(element), []);
  const setInsertMenuTarget = useCallback((element: HTMLDivElement | null) => setInsertToolbarTarget(element), []);
  const setFormatMenuTarget = useCallback((element: HTMLDivElement | null) => setFormatToolbarTarget(element), []);

  useEffect(() => {
    const menuRow = menuRowRef.current;
    if (!menuRow) return;
    const observer = new ResizeObserver(([entry]) => setIsToolbarCompact(entry.contentRect.width < 620));
    observer.observe(menuRow);
    return () => observer.disconnect();
  }, []);

  const handleContentWithAutoSave = useCallback((payload: { json: any; text: string }) => {
    onContentChange({ ...payload, json: { ...documentMetadataRef.current, ...payload.json, ...(lessonMetadataRef.current ? { lessonLayout: lessonMetadataRef.current } : {}) } });
  }, [onContentChange]);
  const handleTitleWithAutoSave = onTitleChange;
  useEffect(() => {
    const save = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "s") return;
      if (!(event.target instanceof Node) || !lessonRootRef.current?.contains(event.target)) return;
      event.preventDefault();
      void onSave?.().catch(() => undefined); // Workspace state retains the failure and pending edit.
    };
    window.addEventListener("keydown", save);
    return () => window.removeEventListener("keydown", save);
  }, [onSave]);

  // The editor toolbar is rendered into this node with a portal.  A normal effect
  // can run while a browser tab is hidden, leaving the portal measured at zero
  // width until a full reload.  Layout effects + visibility recovery keep it in
  // sync when the Nexus tab is revisited.
  const refreshToolbarTarget = useCallback(() => {
    if (toolbarPortalRef.current) setToolbarTarget(toolbarPortalRef.current);
    requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
  }, []);

  useLayoutEffect(() => {
    refreshToolbarTarget();
  }, [refreshToolbarTarget, page?.id]);

  useEffect(() => {
    const recoverToolbar = () => {
      if (document.visibilityState === "visible") refreshToolbarTarget();
    };
    document.addEventListener("visibilitychange", recoverToolbar);
    window.addEventListener("focus", recoverToolbar);
    return () => {
      document.removeEventListener("visibilitychange", recoverToolbar);
      window.removeEventListener("focus", recoverToolbar);
    };
  }, [refreshToolbarTarget]);

  useEffect(() => {
    if (!isWordCountOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsWordCountOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isWordCountOpen]);

  if (!page) {
    return (
      <main className="flex flex-col flex-1 overflow-y-auto items-center justify-center text-base" style={{ backgroundColor: "var(--color-editor-bg)", color: "var(--color-sidebar-text)" }}>
        <div>{t("editor.noPage")}</div>
      </main>
    );
  }

  const lessonLayout = readLessonLayout(page.content_json);
  const lessonEntries = buildLessonIndex(page.content_json);
  const isLessonNote = !page.kind || page.kind === "note";
  const changeLessonLayout = (layout: LessonLayout) => {
    lessonMetadataRef.current = layout;
    handleContentWithAutoSave({ json: { ...page.content_json, lessonLayout: layout }, text: page.content_text || "" });
  };
  const currentTags = page.tags || [];
  // Display legacy notes continuously without changing format or pageBreak
  // nodes in storage. Pagination remains an output concern (F-NOTE #87).
  const effectiveFormat: PageFormat = "flow";
  const currentFormat = effectiveFormat;
  const isDocument = page.kind === "document";
  const isPresentation = page.kind === "presentation";
  const isPaged = false;
  const noteAppearance = (page.content_json as { noteAppearance?: { fullWidth?: boolean } })?.noteAppearance;
  const fullWidth = isLessonNote && noteAppearance?.fullWidth === true;
  const toggleFullWidth = () => {
    const json = { ...page.content_json, noteAppearance: { ...noteAppearance, fullWidth: !fullWidth } };
    documentMetadataRef.current = json;
    handleContentWithAutoSave({ json, text: page.content_text || "" });
  };

  const getTextFromNode = (node: any): string => {
    if (!node) return "";
    if (node.type === "text") return node.text || "";
    if (Array.isArray(node.content)) return node.content.map(getTextFromNode).join("");
    return "";
  };

  const isBlockBlank = (block: any): boolean => {
    const type = block.type;
    if (type === "paragraph" || type === "heading") {
      const txt = getTextFromNode(block).trim();
      return txt.length === 0;
    }
    if (type === "bulletList" || type === "orderedList" || type === "taskList") {
      // blank if all items blank
      const items = block.content || [];
      return items.every((item: any) => {
        const inner = item.content || [];
        return inner.every((c: any) => isBlockBlank(c));
      });
    }
    if (type === "listItem" || type === "taskItem") {
      const inner = block.content || [];
      return inner.every((c: any) => isBlockBlank(c));
    }
    // Keep tables, images, codeBlocks with content, etc.
    if (type === "table" || type === "image" || type === "codeBlock" || type === "blockquote" || type === "callout" || type === "multiColumn" || type === "column") {
      // Consider blank only if no text inside
      const txt = getTextFromNode(block).trim();
      // For table, check if all cells blank
      if (type === "table") {
        const rows = block.content || [];
        return rows.every((row: any) => {
          const cells = row.content || [];
          return cells.every((cell: any) => {
            const cellText = getTextFromNode(cell).trim();
            return cellText.length === 0;
          });
        });
      }
      return txt.length === 0 ? true : false;
    }
    return false;
  };

  const handleDeleteBlankPages = () => {
    const content = page.content_json as any;
    const blocks = (content?.content as any[]) || [];
    const filtered = blocks.filter((b: any) => !isBlockBlank(b));
    // If all filtered out, keep one empty paragraph to avoid empty doc
    const finalBlocks = filtered.length > 0 ? filtered : [{ type: "paragraph" }];
    const newJson = { type: "doc", content: finalBlocks };
    const newText = finalBlocks.map(getTextFromNode).join("\n\n");
    handleContentWithAutoSave({ json: newJson, text: newText });
  };

  const textForCount = page.content_text || "";
  const wordCount = textForCount.trim() ? textForCount.trim().split(/\s+/).length : 0;
  const characterCount = textForCount.length;
  const characterCountWithoutSpaces = textForCount.replace(/\s/g, "").length;

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const val = tagInput.trim().replace(/^#/, "");
      if (val && !currentTags.includes(val)) onTagsChange([...currentTags, val]);
      setTagInput("");
    }
  };

  return (
    <main data-workspace-pane={page.id} ref={lessonRootRef} data-lesson-preset={isLessonNote ? lessonLayout.preset : undefined} className={`relative flex flex-col flex-1 overflow-hidden ${isLessonNote ? "lesson-document" : ""}`} style={{ backgroundColor: "var(--color-editor-bg)", "--lesson-font-size": `${lessonLayout.fontSize}px`, "--lesson-line-height": lessonLayout.lineHeight, "--lesson-heading-scale": lessonLayout.headingScale } as CSSProperties}>
      {/* Title strip（2026-08-11：Google Docs 風格精簡——小字、無邊框、標籤靠右） */}
      <div className="shrink-0 pt-4 pb-2 px-4" style={{ backgroundColor: "var(--color-editor-bg)" }}>
        <div className={`${isLessonNote ? "" : "mx-auto"} w-full flex items-center gap-3`} style={{ maxWidth: isLessonNote ? undefined : "820px" }}>
          <SidebarToggle/>{onBackToInterface && (
            <button
              type="button"
              onClick={onBackToInterface}
              className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full text-lg transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
              title="回到功能介面"
              aria-label="回到功能介面"
            >
              ←
            </button>
          )}
          <input
            type="text"
            value={page.title}
            onChange={(e) => handleTitleWithAutoSave(e.target.value)}
            placeholder={t("editor.title.placeholder")}
            className="flex-1 min-w-0 text-xl font-medium bg-transparent border-none outline-none py-0.5"
            style={{ color: "var(--color-text)", fontFamily: "inherit" }}
          />
          <div className="shrink-0 flex flex-wrap items-center gap-1 justify-end">
            {currentTags.map((tag) => (
              <span key={tag} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-zinc-200/80 text-zinc-700 text-[11px]">#{tag}<button onClick={() => onTagsChange(currentTags.filter((tt) => tt !== tag))} className="hover:text-red-500 font-bold ml-0.5 text-[10px]">×</button></span>
            ))}
            <input type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={handleAddTag} placeholder={currentTags.length === 0 ? t("editor.tags.addFirst") : "+"} className="bg-transparent outline-none px-0.5 py-0.5 w-14 text-[11px]" />
          </div>
        </div>
      </div>

      {/* 選單列（2026-08-11：Google Docs 式——純文字、無圖示、無邊框） */}
      <div className="shrink-0 border-b nexus-print-hide" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-editor-bg)" }}>
        <div ref={menuRowRef} className="lesson-menu-row flex overflow-x-auto items-center px-2 py-0.5 gap-0.5">
          <FileMenu
            currentFormat={currentFormat}
            isDocument={isDocument}
            isPresentation={isPresentation}
            onFormatChange={onFormatChange}
            onExportMarkdown={onExportMarkdown}
            onExportPdf={onExportPdf}
            onExportNexus={onExportNexus}
            onPrint={() => window.print()}
            onNewNote={onNewNote}
            onNewDocument={onNewDocument}
            onImportPdf={onImportPdf}
            onImportMd={onImportMd}
            onConvertToPresentation={onConvertToPresentation}
            onDeleteBlankPages={isLessonNote ? undefined : handleDeleteBlankPages}
          />
          {isToolbarCompact ? (
            <ToolbarDropdown label="⋯" variant="menu">
              <div className="flex flex-col gap-1 p-1 min-w-[240px]">
                <div className="px-3 pt-1 text-[10px] font-semibold uppercase opacity-50">編輯</div>
                <div ref={setEditMenuTarget} className="min-w-[200px]" />
                <div className="px-3 pt-2 text-[10px] font-semibold uppercase opacity-50">插入</div>
                <div ref={setInsertMenuTarget} className="min-w-[220px]" />
                <div className="px-3 pt-2 text-[10px] font-semibold uppercase opacity-50">格式</div>
                <div ref={setFormatMenuTarget} className="min-w-[240px]" />
                <button type="button" onClick={() => setShowLineNumbers((visible) => !visible)} className="px-3 py-2 text-left text-sm hover:bg-zinc-100">{showLineNumbers ? "隱藏行數" : "顯示行數"}</button>
                <button type="button" onClick={() => setShowRuler((visible) => !visible)} className="px-3 py-2 text-left text-sm hover:bg-zinc-100">{showRuler ? "隱藏尺規" : "顯示尺規"}</button>
                <button type="button" onClick={() => setIsWordCountOpen(true)} className="px-3 py-2 text-left text-sm hover:bg-zinc-100">字數統計</button>
                <button type="button" onClick={() => onToggleNightAdapt?.()} className="px-3 py-2 text-left text-sm hover:bg-zinc-100">{nightAdapt ? "原文字顏色" : "適配夜晚"}</button>
                <button type="button" onClick={() => onConvertToPresentation?.()} className="px-3 py-2 text-left text-sm hover:bg-zinc-100">轉為簡報</button>
              </div>
            </ToolbarDropdown>
          ) : <>
          <ToolbarDropdown label="編輯" variant="menu">
            <div ref={setEditMenuTarget} className="min-w-[200px]" />
          </ToolbarDropdown>
          <ToolbarDropdown
            label="檢視"
            variant="menu"
            items={[
              {
                id: "toggle-line-numbers",
                icon: "≣",
                label: showLineNumbers ? "隱藏行數" : "顯示行數",
                onClick: () => setShowLineNumbers((visible) => !visible),
              },
              {
                id: "toggle-ruler",
                icon: "📏",
                label: showRuler ? "隱藏尺規" : "顯示尺規",
                onClick: () => setShowRuler((visible) => !visible),
              },
              {
                id: "word-count",
                icon: "🔤",
                label: "字數統計",
                onClick: () => setIsWordCountOpen(true),
              },
            ]}
          />
          </>}
          {!isToolbarCompact && <>
          <ToolbarDropdown label="插入" variant="menu">
            <div ref={setInsertMenuTarget} className="min-w-[220px]" />
          </ToolbarDropdown>
          <ToolbarDropdown label="格式" variant="menu">
            <div ref={setFormatMenuTarget} className="min-w-[240px]" />
          </ToolbarDropdown>
          <ToolbarDropdown
            label="工具"
            variant="menu"
            items={[
              {
                id: "toggle-night-adapt",
                icon: nightAdapt ? "🌙" : "☀️",
                label: nightAdapt ? "原文字顏色" : "適配夜晚",
                onClick: () => onToggleNightAdapt?.(),
              },
              {
                id: "convert-presentation",
                icon: "📊",
                label: "轉為簡報",
                onClick: () => onConvertToPresentation?.(),
              },
            ]}
          />
          </>}
          <div className="flex-1" />

          {isLessonNote && <ToolbarDropdown label="⋯" variant="menu">
            <div className="px-3 py-2 text-xs opacity-60">{language === "en" ? "Appearance and layout" : "外觀與版面配置"}</div>
            <button type="button" role="switch" aria-checked={fullWidth} onClick={toggleFullWidth} className="w-full px-3 py-2 text-left text-sm">
              {fullWidth ? "✓ " : ""}{language === "en" ? "Full width" : "全寬"}
            </button>
          </ToolbarDropdown>}

          <SaveStatus state={saveState} onRetry={() => { void onSave?.().catch(() => undefined); }} />

          {isSplitView ? (
            <div className="flex items-center gap-1">
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-200 hidden sm:inline">雙開中</span>
              <button onClick={() => onSwapSplit?.()} className="rounded px-2 py-1 text-xs hover:bg-zinc-200/70" style={{ color: "var(--color-text)" }} title="交換左右分頁">⇄ 交換</button>
              <button onClick={() => onCloseSplit?.()} className="rounded px-2 py-1 text-xs hover:bg-zinc-200/70" style={{ color: "var(--color-text)" }} title="關閉右側分頁">✕ 關閉右側</button>
            </div>
          ) : (
            <span className="text-[10px] opacity-40 hidden sm:inline">Ctrl+點擊側邊欄 開啟右側分頁</span>
          )}
        </div>
        {/* 工具列（2026-08-11：Google Docs 式——灰白底、圖示按鈕、分組） */}
        <div className="flex items-center gap-1 px-2 py-1 min-h-[40px]" style={{ borderTop: "1px solid var(--color-border)", borderColor: "var(--color-border)", backgroundColor: "var(--color-panel-bg)" }}>
          {/* 固定：縮圖側邊欄開關（僅分頁模式） */}
          {isPaged && (
            <button
              type="button"
              title={isThumbRailOpen ? "隱藏縮圖預覽" : "顯示縮圖預覽"}
              onClick={() => setIsThumbRailOpen((v) => !v)}
              className="shrink-0 rounded flex items-center justify-center w-6 h-6 text-[12px] transition-colors hover:bg-zinc-200/70"
              style={{ color: "var(--color-text)", backgroundColor: isThumbRailOpen ? "rgba(0,0,0,0.07)" : "transparent" }}
            >
              ▤
            </button>
          )}
          <div ref={toolbarPortalRef} className="flex-1 min-w-0 flex items-center overflow-x-auto" />
          {/* 固定：適配夜晚（最右邊，不受 tab 影響） */}
          <button
            type="button"
            title={nightAdapt ? "切換為原文字顏色（白底黑字）" : "切換為適配夜晚模式顏色"}
            onMouseDown={(e) => { e.preventDefault(); onToggleNightAdapt?.(); }}
            className="shrink-0 ml-auto rounded flex items-center justify-center px-2 h-6 text-[11px] font-medium transition-colors hover:bg-zinc-200/70"
            style={{ color: "var(--color-text)", backgroundColor: nightAdapt ? "rgba(0,0,0,0.07)" : "transparent" }}
          >
            {nightAdapt ? "🌙 適配夜晚" : "☀️ 原文字顏色"}
          </button>
        </div>
      </div>

      {isLessonNote && <LessonLayoutPanel layout={lessonLayout} onChange={changeLessonLayout} entries={lessonEntries} onNavigate={navigateLesson} paged={isPaged} />}
      {/* Content area */}
      {isWordCountOpen && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/30 p-4 nexus-print-hide"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsWordCountOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="word-count-title"
            className="w-full max-w-[360px] rounded-xl border p-5 shadow-2xl"
            style={{ backgroundColor: "var(--color-bg)", borderColor: "var(--color-border)", color: "var(--color-text)" }}
          >
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 id="word-count-title" className="text-base font-semibold">字數統計</h2>
              <button
                type="button"
                onClick={() => setIsWordCountOpen(false)}
                aria-label="關閉字數統計"
                className="flex h-7 w-7 items-center justify-center rounded text-lg leading-none hover:bg-zinc-200"
              >
                ×
              </button>
            </div>
            <dl className="space-y-2 text-sm">
              <div className="flex items-center justify-between gap-6"><dt className="opacity-65">字數</dt><dd className="font-medium tabular-nums">{wordCount}</dd></div>
              <div className="flex items-center justify-between gap-6"><dt className="opacity-65">字元</dt><dd className="font-medium tabular-nums">{characterCount}</dd></div>
              <div className="flex items-center justify-between gap-6"><dt className="opacity-65">字元（不含空白）</dt><dd className="font-medium tabular-nums">{characterCountWithoutSpaces}</dd></div>
            </dl>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                autoFocus
                onClick={() => setIsWordCountOpen(false)}
                className="rounded-md bg-zinc-800 px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-700"
              >
                關閉
              </button>
            </div>
          </section>
        </div>
      )}
      {/* 縮放（Word 右下角） */}
      <div className="absolute bottom-3 right-4 z-30 flex items-center gap-1 nexus-print-hide" style={{ bottom: 12, right: 16 }}>
        <button onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.1).toFixed(2)))} className="rounded w-7 h-7 text-sm font-bold hover:bg-zinc-200" style={{ border: "1px solid var(--color-border)", color: "var(--color-text)", backgroundColor: "var(--color-bg)" }}>−</button>
        <span className="text-[11px] px-1.5 opacity-70" style={{ color: "var(--color-text)" }}>{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom((z) => Math.min(2, +(z + 0.1).toFixed(2)))} className="rounded w-7 h-7 text-sm font-bold hover:bg-zinc-200" style={{ border: "1px solid var(--color-border)", color: "var(--color-text)", backgroundColor: "var(--color-bg)" }}>＋</button>
        <button onClick={() => setZoom(1)} className="rounded px-2 h-7 text-[11px] hover:bg-zinc-200" style={{ border: "1px solid var(--color-border)", color: "var(--color-text)", backgroundColor: "var(--color-bg)" }} title="重設 100%">100%</button>
      </div>
      <div className={`flex-1 min-h-0 ${isPaged ? "flex flex-col overflow-hidden" : "overflow-auto"}`} style={isPaged ? undefined : { zoom }}>
      {isPaged ? (
        <>
          {attachment && (
            <div className="shrink-0 mx-auto w-full max-w-[820px] px-4 pt-4">
              <div className="mb-2 overflow-hidden rounded-xl" style={{ border: "1px solid var(--color-border)", backgroundColor: "var(--color-sidebar-bg)" }}>
                <div className="flex items-center justify-between gap-3 px-3 py-2 text-xs" style={{ borderBottom: "1px solid var(--color-border)", color: "var(--color-text)" }}>
                  <div className="min-w-0 flex items-center gap-2"><span className="shrink-0 font-medium">{t("editor.pdf.preview")}</span><span className="truncate opacity-50">{attachment.name}</span></div>
                  <div className="shrink-0 flex items-center gap-1.5">
                    {([420, 560, 720] as const).map((h) => (
                      <button key={h} type="button" onClick={() => setPdfViewerHeight(h)} className="rounded px-2 py-1 text-xs hover:bg-zinc-200" style={{ border: "1px solid var(--color-border)", color: "var(--color-text)", backgroundColor: pdfViewerHeight === h ? "var(--color-border)" : "transparent" }}>{h === 420 ? t("editor.pdf.small") : h === 560 ? t("editor.pdf.medium") : t("editor.pdf.large")}</button>
                    ))}
                    <button type="button" onClick={() => setIsPdfCollapsed((prev) => !prev)} className="rounded px-2 py-1 text-xs hover:bg-zinc-200" style={{ border: "1px solid var(--color-border)", color: "var(--color-text)" }}>{isPdfCollapsed ? t("editor.pdf.show") : t("editor.pdf.hide")}</button>
                    <button type="button" disabled={!pdfUrl} onClick={() => { if (pdfUrl) window.open(pdfUrl, "_blank", "noopener,noreferrer"); }} className="rounded px-2 py-1 text-xs hover:bg-zinc-200 disabled:opacity-40" style={{ border: "1px solid var(--color-border)", color: "var(--color-text)" }}>{t("editor.pdf.open")}</button>
                  </div>
                </div>
                {!isPdfCollapsed && (
                  <>
                    {pdfUrl ? <iframe key={attachment.id} src={pdfUrl} title={attachment.name} className="w-full bg-white" style={{ height: `${pdfViewerHeight}px` }} /> : pdfLoadError ? (
                      <div className="flex h-[240px] flex-col items-center justify-center gap-2 px-6 text-center text-sm" style={{ color: "var(--color-text)" }}><div className="font-medium text-red-600">{t("editor.pdf.unavailable")}</div><div className="max-w-[520px] opacity-60">{pdfLoadError}</div></div>
                    ) : <div className="flex h-[240px] items-center justify-center text-sm opacity-50" style={{ color: "var(--color-text)" }}>{t("editor.pdf.loading")}</div>}
                  </>
                )}
                {isPdfCollapsed && <div className="flex h-[48px] items-center justify-center text-xs opacity-50" style={{ color: "var(--color-text)" }}>{t("editor.pdf.hiddenNotice")}</div>}
              </div>
            </div>
          )}
          <PaginatedEditorView lessonLayout={lessonLayout} onNavigateLesson={navigateLesson} content={page.content_json} onContentChange={handleContentWithAutoSave} format={currentFormat} toolbarTarget={toolbarTarget} editToolbarTarget={editToolbarTarget} insertToolbarTarget={insertToolbarTarget} formatToolbarTarget={formatToolbarTarget} nightAdapt={nightAdapt} onToggleNightAdapt={onToggleNightAdapt} margins={margins} onMarginsChange={onMarginsChange} toolbarTab="home" showRuler={showRuler} showLineNumbers={showLineNumbers} showThumbRail={isPaged && isThumbRailOpen} paneId={isSplitView ? "secondary" : "primary"} zoom={zoom} />
        </>
      ) : (
        <>
          {showRuler && (
            <div className="sticky top-0 z-20 mx-auto w-full max-w-full nexus-print-hide" style={{ width: getDocumentRulerWidth(currentFormat) }}>
              <DocumentRuler format={currentFormat} margins={margins} />
            </div>
          )}
          <PageFormatView format={currentFormat}>
          <div data-note-width={isLessonNote ? (fullWidth ? "full" : "reading") : undefined} className="flex flex-col w-full nexus-print-target" style={{ maxWidth: fullWidth ? "100%" : "820px", margin: "0 auto", padding: "16px clamp(16px, 5vw, 64px) 48px" }}>
            {attachment && (
              <div className="mb-6 overflow-hidden rounded-xl" style={{ border: "1px solid var(--color-border)", backgroundColor: "var(--color-sidebar-bg)" }}>
                <div className="flex items-center justify-between gap-3 px-3 py-2 text-xs" style={{ borderBottom: "1px solid var(--color-border)", color: "var(--color-text)" }}>
                  <div className="min-w-0 flex items-center gap-2"><span className="shrink-0 font-medium">{t("editor.pdf.preview")}</span><span className="truncate opacity-50">{attachment.name}</span></div>
                  <div className="shrink-0 flex items-center gap-1.5">
                    {([420, 560, 720] as const).map((h) => (
                      <button key={h} type="button" onClick={() => setPdfViewerHeight(h)} className="rounded px-2 py-1 text-xs hover:bg-zinc-200" style={{ border: "1px solid var(--color-border)", color: "var(--color-text)", backgroundColor: pdfViewerHeight === h ? "var(--color-border)" : "transparent" }}>{h === 420 ? t("editor.pdf.small") : h === 560 ? t("editor.pdf.medium") : t("editor.pdf.large")}</button>
                    ))}
                    <button type="button" onClick={() => setIsPdfCollapsed((prev) => !prev)} className="rounded px-2 py-1 text-xs hover:bg-zinc-200" style={{ border: "1px solid var(--color-border)", color: "var(--color-text)" }}>{isPdfCollapsed ? t("editor.pdf.show") : t("editor.pdf.hide")}</button>
                    <button type="button" disabled={!pdfUrl} onClick={() => { if (pdfUrl) window.open(pdfUrl, "_blank", "noopener,noreferrer"); }} className="rounded px-2 py-1 text-xs hover:bg-zinc-200 disabled:opacity-40" style={{ border: "1px solid var(--color-border)", color: "var(--color-text)" }}>{t("editor.pdf.open")}</button>
                  </div>
                </div>
                {!isPdfCollapsed && (
                  <>
                    {pdfUrl ? <iframe key={attachment.id} src={pdfUrl} title={attachment.name} className="w-full bg-white" style={{ height: `${pdfViewerHeight}px` }} /> : pdfLoadError ? (
                      <div className="flex h-[240px] flex-col items-center justify-center gap-2 px-6 text-center text-sm" style={{ color: "var(--color-text)" }}><div className="font-medium text-red-600">{t("editor.pdf.unavailable")}</div><div className="max-w-[520px] opacity-60">{pdfLoadError}</div></div>
                    ) : <div className="flex h-[240px] items-center justify-center text-sm opacity-50" style={{ color: "var(--color-text)" }}>{t("editor.pdf.loading")}</div>}
                  </>
                )}
                {isPdfCollapsed && <div className="flex h-[48px] items-center justify-center text-xs opacity-50" style={{ color: "var(--color-text)" }}>{t("editor.pdf.hiddenNotice")}</div>}
              </div>
            )}
            {isLessonNote && lessonLayout.header && <div className="lesson-page-header">{lessonLayout.header}</div>}
            <TiptapEditor lessonDocument={page.content_json} onNavigateLesson={navigateLesson} key={`${page.id}-${page.kind}-${currentFormat}`} content={page.content_json} onChange={handleContentWithAutoSave} variant={page.kind === "document" ? "plain" : "rich"} toolbarTarget={toolbarTarget} editToolbarTarget={editToolbarTarget} insertToolbarTarget={insertToolbarTarget} formatToolbarTarget={formatToolbarTarget} pageNightAdapt={nightAdapt} onTogglePageNightAdapt={onToggleNightAdapt} showToolbar toolbarTab="home" showLineNumbers={showLineNumbers} />
            {isLessonNote && lessonLayout.footer && <div className="lesson-page-footer">{lessonLayout.footer}</div>}
          </div>
          </PageFormatView>
        </>
      )}
      </div>
    </main>
  );
}
