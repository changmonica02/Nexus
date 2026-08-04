"use client";
import { useRef, useState, useEffect } from "react";
import type { Page, Attachment, PageFormat, PageMargins } from "../lib/types";
import { useLanguage } from "../lib/LanguageContext";
import TiptapEditor from "./TiptapEditor";
import PageFormatView from "./PageFormatView";
import PaginatedEditorView from "./PaginatedEditorView";
import FileMenu from "./FileMenu";

export default function EditorPane({
  page,
  attachment,
  pdfUrl,
  pdfLoadError,
  onTitleChange,
  onTagsChange,
  onContentChange,
  onFormatChange,
  onAddSubPage,
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
}: {
  page: Page | null;
  attachment: Attachment | null;
  pdfUrl: string | null;
  pdfLoadError: string | null;
  onTitleChange: (title: string) => void;
  onFolderChange?: (folder: string | null) => void;
  onTagsChange: (tags: string[]) => void;
  onContentChange: (payload: { json: any; text: string }) => void;
  onFormatChange?: (format: PageFormat) => void;
  onAddSubPage?: (parentId: string) => void;
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
}) {
  const { t } = useLanguage();
  const [tagInput, setTagInput] = useState("");
  const [activeTab, setActiveTab] = useState<"file" | "home" | "insert" | "layout" | "review">("home");
  const [showRuler, setShowRuler] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [isThumbRailOpen, setIsThumbRailOpen] = useState(true);
  const [isPdfCollapsed, setIsPdfCollapsed] = useState(false);
  const [pdfViewerHeight, setPdfViewerHeight] = useState(560);
  const [toolbarTarget, setToolbarTarget] = useState<HTMLElement | null>(null);
  const toolbarPortalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (toolbarPortalRef.current) setToolbarTarget(toolbarPortalRef.current);
  }, []);

  if (!page) {
    return (
      <main className="flex flex-col flex-1 overflow-y-auto items-center justify-center text-base" style={{ backgroundColor: "var(--color-editor-bg)", color: "var(--color-sidebar-text)" }}>
        <div>{t("editor.noPage")}</div>
      </main>
    );
  }

  const currentTags = page.tags || [];
  const currentFormat = (page.format || "flow") as PageFormat;
  const isDocument = page.kind === "document";
  const isPresentation = page.kind === "presentation";
  const isPaged = currentFormat !== "flow";

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
    onContentChange({ json: newJson, text: newText });
  };

  const charCount = (page.content_text || "").replace(/\s/g, "").length;
  const wordCount = (page.content_text || "").trim() ? (page.content_text || "").trim().split(/\s+/).length : 0;

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const val = tagInput.trim().replace(/^#/, "");
      if (val && !currentTags.includes(val)) onTagsChange([...currentTags, val]);
      setTagInput("");
    }
  };

  return (
    <main className="relative flex flex-col flex-1 overflow-hidden" style={{ backgroundColor: "var(--color-editor-bg)" }}>
      {/* Title area */}
      <div className="shrink-0 pt-8 pb-3 px-4" style={{ backgroundColor: "var(--color-editor-bg)" }}>
        <div className="mx-auto w-full" style={{ maxWidth: "820px" }}>
          <div className="flex items-start gap-4">
            <input
              type="text"
              value={page.title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder={t("editor.title.placeholder")}
              className="flex-1 min-w-0 text-3xl font-semibold bg-transparent border-none outline-none pb-1"
              style={{ color: "var(--color-text)", fontFamily: "inherit", borderBottom: "2px solid transparent" }}
              onFocus={(e) => (e.target.style.borderBottomColor = "var(--color-border)")}
              onBlur={(e) => (e.target.style.borderBottomColor = "transparent")}
            />
            <div className="shrink-0 flex flex-col items-end gap-1 pt-1.5">
              <div className="flex flex-wrap items-center gap-1 justify-end">
                {currentTags.map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-zinc-200/80 text-zinc-700 text-[11px]">#{tag}<button onClick={() => onTagsChange(currentTags.filter((tt) => tt !== tag))} className="hover:text-red-500 font-bold ml-0.5 text-[10px]">×</button></span>
                ))}
                <input type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={handleAddTag} placeholder={currentTags.length === 0 ? t("editor.tags.addFirst") : "+"} className="bg-transparent outline-none px-0.5 py-0.5 w-14 text-[11px]" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 需求3：兩行工具列（Word Ribbon 風格） */}
      <div className="shrink-0 border-b nexus-print-hide" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-editor-bg)" }}>
        <div className="flex items-center px-2 pt-1.5 gap-0.5">
          {([
            { id: "file" as const, label: "檔案" },
            { id: "home" as const, label: "常用" },
            { id: "insert" as const, label: "插入" },
            { id: "layout" as const, label: "版面配置" },
            { id: "review" as const, label: "查閱" },
          ]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="rounded-t-md px-3 py-1.5 text-sm font-medium"
              style={{
                color: "var(--color-text)",
                backgroundColor: activeTab === tab.id ? "var(--color-border)" : "transparent",
                border: "1px solid var(--color-border)",
                borderBottom: activeTab === tab.id ? "none" : "1px solid var(--color-border)",
              }}
            >
              {tab.label}
            </button>
          ))}
          <div className="flex-1" />
          {isSplitView ? (
            <div className="flex items-center gap-1 pb-1.5">
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-200 hidden sm:inline">雙開中</span>
              <button onClick={() => onSwapSplit?.()} className="rounded px-2.5 py-1 text-xs font-medium border hover:bg-zinc-200" style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }} title="交換左右分頁">⇄ 交換</button>
              <button onClick={() => onCloseSplit?.()} className="rounded px-2.5 py-1 text-xs font-medium bg-zinc-800 text-white hover:bg-zinc-700" title="關閉右側分頁">✕ 關閉右側</button>
            </div>
          ) : (
            <span className="text-[10px] opacity-40 hidden sm:inline pb-1.5">Ctrl+點擊側邊欄 開啟右側分頁</span>
          )}
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 min-h-[44px]" style={{ borderTop: "1px solid var(--color-border)", borderColor: "var(--color-border)" }}>
          {/* 固定：縮圖側邊欄開關（僅分頁模式） */}
          {isPaged && (
            <button
              type="button"
              title={isThumbRailOpen ? "隱藏縮圖預覽" : "顯示縮圖預覽"}
              onClick={() => setIsThumbRailOpen((v) => !v)}
              className="shrink-0 rounded flex items-center justify-center w-[30px] h-[30px] text-[12px] transition-all hover:bg-zinc-200"
              style={{ border: "1px solid var(--color-border)", color: "var(--color-text)", backgroundColor: isThumbRailOpen ? "var(--color-border)" : "transparent" }}
            >
              ▤
            </button>
          )}
          {activeTab === "review" ? (
            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={() => setShowRuler((v) => !v)}
                className="rounded flex items-center gap-1.5 px-2 h-[30px] text-[11px] font-medium hover:bg-zinc-200 border"
                style={{ borderColor: "var(--color-border)", color: "var(--color-text)", backgroundColor: showRuler ? "var(--color-border)" : "transparent" }}
                title="顯示/隱藏尺規"
              >
                📏 顯示尺規
              </button>
              <span className="text-[11px] opacity-60">字數：{wordCount} 字 ・ 字元：{charCount}</span>
            </div>
          ) : activeTab === "file" ? (
            <div className="flex items-center gap-2 flex-wrap">
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
                onDeleteBlankPages={handleDeleteBlankPages}
              />
              <span className="text-[11px] opacity-40">檔案操作（新建／匯入／格式／匯出／列印）</span>
            </div>
          ) : (
            <div ref={toolbarPortalRef} className="flex-1 min-w-0 flex items-center overflow-x-auto" />
          )}
          {/* 固定：適配夜晚（最右邊，不受 tab 影響） */}
          <button
            type="button"
            title={nightAdapt ? "切換為原文字顏色（白底黑字）" : "切換為適配夜晚模式顏色"}
            onMouseDown={(e) => { e.preventDefault(); onToggleNightAdapt?.(); }}
            className="shrink-0 ml-auto rounded flex items-center justify-center px-2 h-[30px] text-[11px] font-medium transition-all hover:bg-zinc-200 border"
            style={{ borderColor: "var(--color-border)", color: "var(--color-text)", backgroundColor: nightAdapt ? "var(--color-border)" : "transparent" }}
          >
            {nightAdapt ? "🌙 適配夜晚" : "☀️ 原文字顏色"}
          </button>
        </div>
      </div>

      {/* Content area */}
      {/* 尺規（查閱 tab 開啟時顯示；寬度對齊內容） */}
      {showRuler && (
        <div className="shrink-0 mx-auto overflow-hidden nexus-print-hide" style={{ width: isPaged ? (currentFormat === "a4" ? "210mm" : currentFormat === "16:9" ? "960px" : currentFormat === "4:3" ? "800px" : "820px") : "820px", maxWidth: "100%" }}>
          <div
            className="h-5 relative select-none"
            style={{
              backgroundImage:
                "repeating-linear-gradient(to right, rgba(0,0,0,0.25) 0 1px, transparent 1px 7.56px), repeating-linear-gradient(to right, rgba(0,0,0,0.5) 0 1px, transparent 1px 37.8px)",
              borderBottom: "1px solid var(--color-border)",
            }}
          >
            {Array.from({ length: 22 }).map((_, i) => (
              <span key={i} className="absolute top-0.5 text-[8px] opacity-50" style={{ left: i * 37.8 + 2 }}>{i}</span>
            ))}
          </div>
        </div>
      )}
      {/* 縮放（Word 右下角） */}
      <div className="absolute bottom-3 right-4 z-30 flex items-center gap-1 nexus-print-hide" style={{ bottom: 12, right: 16 }}>
        <button onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.1).toFixed(2)))} className="rounded w-7 h-7 text-sm font-bold hover:bg-zinc-200" style={{ border: "1px solid var(--color-border)", color: "var(--color-text)", backgroundColor: "var(--color-bg)" }}>−</button>
        <span className="text-[11px] px-1.5 opacity-70" style={{ color: "var(--color-text)" }}>{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom((z) => Math.min(2, +(z + 0.1).toFixed(2)))} className="rounded w-7 h-7 text-sm font-bold hover:bg-zinc-200" style={{ border: "1px solid var(--color-border)", color: "var(--color-text)", backgroundColor: "var(--color-bg)" }}>＋</button>
        <button onClick={() => setZoom(1)} className="rounded px-2 h-7 text-[11px] hover:bg-zinc-200" style={{ border: "1px solid var(--color-border)", color: "var(--color-text)", backgroundColor: "var(--color-bg)" }} title="重設 100%">100%</button>
      </div>
      <div className="flex-1 min-h-0 overflow-auto" style={{ zoom }}>
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
          <PaginatedEditorView content={page.content_json} onContentChange={onContentChange} format={currentFormat} toolbarTarget={toolbarTarget} nightAdapt={nightAdapt} onToggleNightAdapt={onToggleNightAdapt} margins={margins} onMarginsChange={onMarginsChange} toolbarTab={activeTab === "file" || activeTab === "review" ? "home" : activeTab} fileMode={activeTab === "file" || activeTab === "review"} showThumbRail={isPaged && isThumbRailOpen} />
        </>
      ) : (
        <PageFormatView format={currentFormat}>
          <div className="flex flex-col w-full nexus-print-target" style={{ maxWidth: currentFormat === "flow" ? "820px" : "100%", margin: currentFormat === "flow" ? "0 auto" : undefined, padding: currentFormat === "flow" ? "16px 64px 48px" : "0" }}>
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
            <TiptapEditor key={`${page.id}-${page.kind}-${currentFormat}`} content={page.content_json} onChange={onContentChange} variant={page.kind === "document" ? "plain" : "rich"} toolbarTarget={toolbarTarget} pageNightAdapt={nightAdapt} onTogglePageNightAdapt={onToggleNightAdapt} showToolbar={activeTab !== "file" && activeTab !== "review"} toolbarTab={activeTab === "file" || activeTab === "review" ? "home" : activeTab} />
          </div>
        </PageFormatView>
      )}
      </div>
    </main>
  );
}
