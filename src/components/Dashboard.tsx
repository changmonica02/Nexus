"use client";
import { useMemo, useState } from "react";
import type { Page, PageFormat } from "../lib/types";
import { useLanguage } from "../lib/LanguageContext";
import NewPageDialog, { type NewPageKindChoice } from "./NewPageDialog";

function isResearchPage(page: Page): boolean { return !!page.primary_attachment_id; }
function isPlainNote(page: Page): boolean { return (!page.kind || page.kind === "note") && !isResearchPage(page) && !page.parent_id; }
function isDocumentPage(page: Page): boolean { return page.kind === "document" && !page.parent_id; }

function StatCard({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl px-4 py-3.5" style={{ border: "1px solid var(--color-border)", backgroundColor: "var(--color-sidebar-bg)" }}>
      <div className="text-2xl leading-none">{icon}</div>
      <div>
        <div className="text-xl font-semibold" style={{ color: "var(--color-text)" }}>{value}</div>
        <div className="text-xs opacity-60" style={{ color: "var(--color-text)" }}>{label}</div>
      </div>
    </div>
  );
}

export default function Dashboard({ pages, onSelectPage, onCreatePage, onCreateDocument, onCreateStudySet, onCreatePresentation, onImportPdf }: {
  pages: Page[]; onSelectPage: (id: string) => void; onCreatePage: (format: PageFormat) => void;
  onCreateDocument: (format: PageFormat) => void; onCreateStudySet: () => void; onCreatePresentation?: (format: PageFormat) => void; onImportPdf: () => void;
}) {
  const { t } = useLanguage();
  const [isNewPageDialogOpen, setIsNewPageDialogOpen] = useState(false);
  const topLevelPages = pages.filter((p) => !p.parent_id);
  const stats = useMemo(() => ({
    total: topLevelPages.length,
    notes: topLevelPages.filter(isPlainNote).length,
    documents: topLevelPages.filter(isDocumentPage).length,
    research: topLevelPages.filter(isResearchPage).length,
    studySets: topLevelPages.filter((p) => p.kind === "study_set").length,
    presentations: topLevelPages.filter((p) => p.kind === "presentation").length,
  }), [topLevelPages]);
  const recentPages = useMemo(() => [...topLevelPages].sort((a, b) => b.updated_at - a.updated_at).slice(0, 8), [topLevelPages]);

  const formatRelativeTime = (ts: number): string => {
    const diffMs = Date.now() - ts;
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

  return (
    <main className="flex flex-col flex-1 overflow-y-auto" style={{ backgroundColor: "var(--color-editor-bg)" }}>
      <div className="flex flex-col mx-auto w-full" style={{ maxWidth: "820px", padding: "48px 64px" }}>
        <div className="mb-1 text-sm opacity-60" style={{ color: "var(--color-text)" }}>{t("dashboard.home")}</div>
        <h1 className="text-3xl font-semibold mb-6" style={{ color: "var(--color-text)" }}>{t("dashboard.welcome")}</h1>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
          <StatCard label={t("dashboard.stats.total")} value={stats.total} icon="📚" />
          <StatCard label={t("dashboard.stats.documents")} value={stats.documents} icon="📄" />
          <StatCard label={t("dashboard.stats.notes")} value={stats.notes} icon="📝" />
          <StatCard label={t("dashboard.stats.research")} value={stats.research} icon="📑" />
          <StatCard label={t("dashboard.stats.studySets")} value={stats.studySets} icon="🗂️" />
          <StatCard label="簡報" value={stats.presentations} icon="📊" />
        </div>
        <div className="mb-8">
          <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">{t("dashboard.quickCreate")}</div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setIsNewPageDialogOpen(true)} className="rounded-md px-4 py-2 text-sm font-semibold transition-all hover:opacity-90" style={{ backgroundColor: "var(--color-text)", color: "var(--color-bg)" }}>➕ {t("dashboard.newButton")}</button>
            <button onClick={onImportPdf} className="rounded-md px-3.5 py-2 text-sm font-medium transition-all hover:bg-zinc-200" style={{ border: "1px solid var(--color-border)", color: "var(--color-text)" }}>{t("dashboard.importPdf")}</button>
          </div>
        </div>
        <div>
          <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">{t("dashboard.recent")}</div>
          {recentPages.length === 0 ? (
            <div className="rounded-xl py-10 text-center text-sm opacity-50" style={{ border: "1px dashed var(--color-border)", color: "var(--color-text)" }}>{t("dashboard.emptyState")}</div>
          ) : (
            <div className="space-y-1">
              {recentPages.map((page) => (
                <button key={page.id} onClick={() => onSelectPage(page.id)} className="w-full flex items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm transition-all hover:bg-zinc-200/60" style={{ color: "var(--color-text)" }}>
                  <span className="truncate flex items-center gap-1.5"><span>{pageIcon(page)}</span><span className="truncate">{page.title || t("common.untitled")}</span></span>
                  <span className="shrink-0 text-xs opacity-40">{formatRelativeTime(page.updated_at)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <NewPageDialog isOpen={isNewPageDialogOpen} onClose={() => setIsNewPageDialogOpen(false)} onConfirm={handleConfirmNewPage} />
    </main>
  );
}
