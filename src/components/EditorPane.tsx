"use client";
import { useRef, useState, useEffect } from "react";
import type { Page, Attachment, PageFormat } from "../lib/types";
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
}) {
  const { t } = useLanguage();
  const [tagInput, setTagInput] = useState("");
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

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const val = tagInput.trim().replace(/^#/, "");
      if (val && !currentTags.includes(val)) onTagsChange([...currentTags, val]);
      setTagInput("");
    }
  };

  return (
    <main className="flex flex-col flex-1 overflow-hidden" style={{ backgroundColor: "var(--color-editor-bg)" }}>
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

      {/* Toolbar bar */}
      <div className="shrink-0 flex items-center gap-2 px-3 py-1.5 border-b nexus-print-hide" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-editor-bg)" }}>
        <div className="shrink-0 flex items-center">
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
        </div>
        <div className="h-5 w-px bg-zinc-300 mx-1 shrink-0" />
        <div ref={toolbarPortalRef} className="flex-1 min-w-0 flex items-center overflow-x-auto" />
        <div className="shrink-0 ml-auto flex items-center gap-1 border-l pl-2" style={{ borderColor: "var(--color-border)" }}>
          {isSplitView ? (
            <>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-200 hidden sm:inline">雙開中</span>
              <button onClick={() => onSwapSplit?.()} className="rounded px-2.5 py-1 text-xs font-medium border hover:bg-zinc-200" style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }} title="交換左右分頁">⇄ 交換</button>
              <button onClick={() => onCloseSplit?.()} className="rounded px-2.5 py-1 text-xs font-medium bg-zinc-800 text-white hover:bg-zinc-700" title="關閉右側分頁">✕ 關閉右側</button>
            </>
          ) : (
            <span className="text-[10px] opacity-40 hidden sm:inline">Ctrl+點擊側邊欄 開啟右側分頁</span>
          )}
        </div>
      </div>

      {/* Content area */}
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
          <PaginatedEditorView content={page.content_json} onContentChange={onContentChange} format={currentFormat} toolbarTarget={toolbarTarget} nightAdapt={nightAdapt} onToggleNightAdapt={onToggleNightAdapt} />
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
            <TiptapEditor key={`${page.id}-${page.kind}-${currentFormat}`} content={page.content_json} onChange={onContentChange} variant={page.kind === "document" ? "plain" : "rich"} toolbarTarget={toolbarTarget} pageNightAdapt={nightAdapt} onTogglePageNightAdapt={onToggleNightAdapt} />
          </div>
        </PageFormatView>
      )}
    </main>
  );
}
