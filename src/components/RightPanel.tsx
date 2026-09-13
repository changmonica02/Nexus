"use client";
import { useMemo, useState } from "react";
import type { AssistantBlock, Page } from "../lib/types";
import { useLanguage } from "../lib/LanguageContext";

export default function RightPanel({
  page,
  pages,
  isCollapsed,
  onToggleCollapse,
  onSelectPageTitle,
  onUpdateAssistantBlocks,
}: {
  page: Page | null;
  pages: Page[];
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onSelectPageTitle: (title: string) => void;
  onUpdateAssistantBlocks?: (blocks: AssistantBlock[]) => void;
}) {
  const { t } = useLanguage();
  const [expandedAssistantId, setExpandedAssistantId] = useState<string | null>(null);

  const backlinks = useMemo(() => {
    if (!page || !page.title.trim()) return [];
    const currentTitle = page.title.trim().toLowerCase();
    return pages.filter((p) => {
      if (p.id === page.id) return false;
      return (p.links || []).some((link) => link.toLowerCase() === currentTitle);
    });
  }, [page, pages]);

  const outgoingLinks = page?.links || [];
  const assistantBlocks = page?.assistant_blocks || [];

  const addAssistantBlock = () => {
    const now = Date.now();
    const block: AssistantBlock = { id: crypto.randomUUID(), title: "未命名輔助筆記", content: "", created_at: now, updated_at: now };
    onUpdateAssistantBlocks?.([...assistantBlocks, block]);
    setExpandedAssistantId(block.id);
  };

  const updateAssistantBlock = (id: string, patch: Partial<AssistantBlock>) => {
    onUpdateAssistantBlocks?.(assistantBlocks.map((block) => block.id === id ? { ...block, ...patch, updated_at: Date.now() } : block));
  };

  const removeAssistantBlock = (id: string) => {
    onUpdateAssistantBlocks?.(assistantBlocks.filter((block) => block.id !== id));
    if (expandedAssistantId === id) setExpandedAssistantId(null);
  };

  if (isCollapsed) {
    return (
      <aside className="flex flex-col items-center pt-3.5 border select-none transition-all rounded-2xl overflow-hidden w-full h-full" style={{ backgroundColor: "var(--color-panel-bg)", borderColor: "var(--color-border)" }}>
        <button onClick={onToggleCollapse} className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-zinc-200 transition-all text-sm" style={{ color: "var(--color-text)" }} title={t("rightPanel.expand")}>«</button>
      </aside>
    );
  }

  return (
    <aside className="flex flex-col border select-none transition-all rounded-2xl overflow-hidden w-full h-full" style={{ backgroundColor: "var(--color-panel-bg)", borderColor: "var(--color-border)" }}>
      <div className="flex items-center justify-between px-4 py-3.5 border-b text-xs font-semibold tracking-wider opacity-60 uppercase" style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}>
        <span>{t("rightPanel.relations")}</span>
        <button onClick={onToggleCollapse} className="flex items-center justify-center w-7 h-7 rounded-md hover:bg-zinc-200 transition-all normal-case" style={{ border: "1px solid var(--color-border)", color: "var(--color-text)" }} title={t("rightPanel.collapse")}>»</button>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-6 text-sm">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-zinc-400 uppercase tracking-wider"><span>輔助區塊 ({assistantBlocks.length})</span>{page && <button type="button" onClick={addAssistantBlock} className="rounded px-1.5 py-0.5 normal-case text-blue-600 hover:bg-blue-50">+ 新增</button>}</div>
          {assistantBlocks.length === 0 ? <div className="text-xs opacity-40 pl-1 py-1" style={{ color: "var(--color-text)" }}>可在此建立講稿、補充資料或延伸筆記；內容會附屬於目前頁面。</div> : <div className="space-y-1">{assistantBlocks.map((block) => {
            const isExpanded = expandedAssistantId === block.id;
            return <div key={block.id} className="rounded-lg border" style={{ borderColor: "var(--color-border)" }}>
              <div className="flex items-center gap-1 px-1.5 py-1">
                <button type="button" onClick={() => setExpandedAssistantId(isExpanded ? null : block.id)} className="min-w-0 flex-1 truncate px-1 text-left text-sm hover:text-blue-700">{isExpanded ? "⌄" : "›"} {block.title || "未命名輔助筆記"}</button>
                <button type="button" onClick={() => removeAssistantBlock(block.id)} className="rounded px-1 text-xs opacity-45 hover:bg-red-50 hover:text-red-600 hover:opacity-100" aria-label="刪除輔助區塊">×</button>
              </div>
              {isExpanded && <div className="border-t p-2" style={{ borderColor: "var(--color-border)" }}>
                <input value={block.title} onChange={(event) => updateAssistantBlock(block.id, { title: event.target.value })} placeholder="輔助筆記標題" className="mb-2 w-full bg-transparent text-xs font-medium outline-none" />
                <textarea value={block.content} onChange={(event) => updateAssistantBlock(block.id, { content: event.target.value })} placeholder="輸入講稿、補充內容或延伸筆記…" rows={6} className="w-full resize-y bg-transparent text-xs leading-5 outline-none" />
              </div>}
            </div>;
          })}</div>}
        </div>
        <div className="space-y-2">
          <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">{t("rightPanel.backlinks")} ({backlinks.length})</div>
          {backlinks.length === 0 ? (
            <div className="text-xs opacity-40 pl-1 py-1" style={{ color: "var(--color-text)" }}>{t("rightPanel.backlinksEmpty")}</div>
          ) : (
            <div className="space-y-1">
              {backlinks.map((p) => (
                <div key={p.id} onClick={() => onSelectPageTitle(p.title)} className="px-2.5 py-1.5 rounded bg-zinc-200/50 hover:bg-blue-100 hover:text-blue-700 cursor-pointer transition-colors truncate text-sm" title={t("rightPanel.goTo", { title: p.title })}>← {p.title || t("common.untitled")}</div>
              ))}
            </div>
          )}
        </div>
        <div className="space-y-2">
          <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">{t("rightPanel.outgoing")} ({outgoingLinks.length})</div>
          {outgoingLinks.length === 0 ? (
            <div className="text-xs opacity-40 pl-1 py-1" style={{ color: "var(--color-text)" }}>{t("rightPanel.outgoingEmpty")}</div>
          ) : (
            <div className="space-y-1">
              {outgoingLinks.map((linkTitle) => {
                const exists = pages.some((p) => p.title.trim().toLowerCase() === linkTitle.toLowerCase());
                return (
                  <div key={linkTitle} onClick={() => onSelectPageTitle(linkTitle)} className={`px-2.5 py-1.5 rounded cursor-pointer transition-colors truncate text-sm flex items-center justify-between ${exists ? "bg-zinc-200/50 hover:bg-blue-100 hover:text-blue-700" : "bg-amber-50 border border-amber-300 text-amber-800 hover:bg-amber-100"}`} title={exists ? t("rightPanel.goTo", { title: linkTitle }) : t("rightPanel.notCreatedTooltip", { title: linkTitle })}>
                    <span>{exists ? "→" : "✚"} {linkTitle}</span>
                    {!exists && <span className="text-[10px] bg-amber-200 text-amber-900 px-1 rounded">{t("rightPanel.notCreatedBadge")}</span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
