"use client";
import { useMemo, useState } from "react";
import type { Page, PageFormat } from "../lib/types";
import { useLanguage } from "../lib/LanguageContext";
import NewPageDialog, { type NewPageKindChoice } from "./NewPageDialog";

export default function Dashboard({ pages, onSelectPage, onCreatePage, onCreateDocument, onCreateStudySet, onCreatePresentation, onImportPdf }: {
  pages: Page[]; onSelectPage: (id: string) => void; onCreatePage: (format: PageFormat) => void;
  onCreateDocument: (format: PageFormat) => void; onCreateStudySet: () => void; onCreatePresentation?: (format: PageFormat) => void; onImportPdf: () => void;
}) {
  const { t } = useLanguage();
  const [isNewPageDialogOpen, setIsNewPageDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [sortMode, setSortMode] = useState<"updated" | "custom">("updated");
  const [openedAt] = useState(() => Date.now());
  const topLevelPages = pages.filter((p) => !p.parent_id);
  const folderGroups = useMemo(() => {
    const sorted = [...topLevelPages].sort((a, b) => sortMode === "updated"
      ? b.updated_at - a.updated_at
      : (a.sort_order ?? Number.MAX_SAFE_INTEGER) - (b.sort_order ?? Number.MAX_SAFE_INTEGER));
    const groups = new Map<string, Page[]>();
    sorted.forEach((page) => {
      const folder = page.folder?.trim() || "未分類";
      groups.set(folder, [...(groups.get(folder) || []), page]);
    });
    return [...groups.entries()].map(([name, items]) => ({ name, items }));
  }, [topLevelPages, sortMode]);

  const formatRelativeTime = (ts: number): string => {
    const diffMs = openedAt - ts;
    const diffMinutes = Math.floor(diffMs / 60000);
    if (diffMinutes < 1) return t("time.justNow");
    if (diffMinutes < 60) return t("time.minutesAgo", { n: diffMinutes });
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return t("time.hoursAgo", { n: diffHours });
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return t("time.daysAgo", { n: diffDays });
    return new Date(ts).toLocaleDateString();
  };

  const handleConfirmNewPage = (kind: NewPageKindChoice, format: PageFormat) => {
    if (kind === "document") onCreateDocument(format);
    else if (kind === "note") onCreatePage(format);
    else if (kind === "presentation") onCreatePresentation?.(format);
    else onCreateStudySet();
  };

  const pageIcon = (page: Page) => {
    if (page.kind === "study_set") return "🗂️";
    if (page.kind === "document") return "📄";
    if (page.kind === "presentation") return "📊";
    if (page.primary_attachment_id) return "📑";
    return "📝";
  };

  const pageKindLabel = (page: Page) => {
    if (page.kind === "study_set") return "字卡";
    if (page.kind === "document") return "文檔";
    if (page.kind === "presentation") return "簡報";
    if (page.kind === "quick_note") return "隨手記";
    if (page.kind === "todo") return "日曆";
    if (page.kind === "creative") return page.creative_type === "novel" ? "小說" : "創作";
    if (page.primary_attachment_id) return "PDF 研究";
    return "筆記";
  };

  return (
    <main className="flex flex-col flex-1 overflow-y-auto" style={{ backgroundColor: "var(--color-editor-bg)" }}>
      <div className="flex flex-col mx-auto w-full" style={{ maxWidth: "820px", padding: "48px 64px" }}>
        <div className="mb-1 text-sm opacity-60" style={{ color: "var(--color-text)" }}>{t("dashboard.home")}</div>
        <h1 className="text-3xl font-semibold mb-6" style={{ color: "var(--color-text)" }}>{t("dashboard.welcome")}</h1>
        <div className="mb-8">
          <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">{t("dashboard.quickCreate")}</div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setIsNewPageDialogOpen(true)} className="rounded-md px-4 py-2 text-sm font-semibold transition-all hover:opacity-90" style={{ backgroundColor: "var(--color-text)", color: "var(--color-bg)" }}>➕ {t("dashboard.newButton")}</button>
            <button onClick={onImportPdf} className="rounded-md px-3.5 py-2 text-sm font-medium transition-all hover:bg-zinc-200" style={{ border: "1px solid var(--color-border)", color: "var(--color-text)" }}>{t("dashboard.importPdf")}</button>
          </div>
        </div>
        <section>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">{t("dashboard.recent")}</div>
            <div className="flex items-center gap-1 rounded-lg border p-1" style={{ borderColor: "var(--color-border)" }} aria-label="首頁顯示與排列方式">
              <div className="flex items-center gap-0.5" aria-label="顯示方式">
                <button type="button" onClick={() => setViewMode("list")} className="rounded-md px-2 py-1 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800" style={{ backgroundColor: viewMode === "list" ? "var(--color-border)" : "transparent" }} title="清單顯示" aria-label="清單顯示">☷</button>
                <button type="button" onClick={() => setViewMode("grid")} className="rounded-md px-2 py-1 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800" style={{ backgroundColor: viewMode === "grid" ? "var(--color-border)" : "transparent" }} title="格狀顯示" aria-label="格狀顯示">▦</button>
              </div>
              <span className="h-4 w-px" style={{ backgroundColor: "var(--color-border)" }} />
              <select value={sortMode} onChange={(event) => setSortMode(event.target.value as "updated" | "custom")} className="bg-transparent px-1.5 py-1 text-xs outline-none" style={{ color: "var(--color-text)" }} aria-label="排列方式">
                <option value="updated">最近編輯</option>
                <option value="custom">自訂順序</option>
              </select>
            </div>
          </div>
          {folderGroups.length === 0 ? (
            <div className="rounded-xl py-10 text-center text-sm opacity-50" style={{ border: "1px dashed var(--color-border)", color: "var(--color-text)" }}>{t("dashboard.emptyState")}</div>
          ) : (
            <div className="space-y-6">
              {folderGroups.map(({ name, items }) => (
                <div key={name}>
                  <div className="mb-2 flex items-center gap-2 text-xs font-medium opacity-60" style={{ color: "var(--color-text)" }}><span>📁</span><span>{name}</span><span className="opacity-60">{items.length}</span></div>
                  <div className={viewMode === "grid" ? "grid grid-cols-1 gap-2 sm:grid-cols-2" : "space-y-1"}>
                    {items.map((page) => (
                      <button key={page.id} onClick={() => onSelectPage(page.id)} className={viewMode === "grid" ? "flex min-h-24 flex-col items-start justify-between rounded-xl border p-3 text-left transition-all hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60" : "flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm transition-all hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60"} style={{ color: "var(--color-text)", borderColor: viewMode === "grid" ? "var(--color-border)" : "transparent" }}>
                        <span className="flex min-w-0 items-center gap-2"><span className="text-base">{pageIcon(page)}</span><span className="min-w-0"><span className="block truncate text-sm">{page.title || t("common.untitled")}</span>{viewMode === "grid" && <span className="mt-1 block text-xs opacity-50">{pageKindLabel(page)}</span>}</span></span>
                        <span className="shrink-0 text-xs opacity-40">{formatRelativeTime(page.updated_at)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
      <NewPageDialog isOpen={isNewPageDialogOpen} onClose={() => setIsNewPageDialogOpen(false)} onConfirm={handleConfirmNewPage} />
    </main>
  );
}
