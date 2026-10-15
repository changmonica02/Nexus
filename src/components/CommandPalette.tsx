"use client";
import FeatureIcon from "./FeatureIcon";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Page } from "../lib/types";
import { useLanguage } from "../lib/LanguageContext";

export interface CommandPaletteAction { id: string; label: string; icon: string; keywords?: string; run: () => void; }

export default function CommandPalette({ isOpen, onClose, pages, actions, onSelectPage }: {
  isOpen: boolean; onClose: () => void; pages: Page[]; actions: CommandPaletteAction[]; onSelectPage: (id: string) => void;
}) {
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => { if (isOpen) { setQuery(""); setActiveIndex(0); setTimeout(() => inputRef.current?.focus(), 0); } }, [isOpen]);

  const filteredActions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return actions;
    return actions.filter((a) => a.label.toLowerCase().includes(q) || (a.keywords || "").toLowerCase().includes(q));
  }, [actions, query]);

  const filteredPages = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sorted = [...pages].sort((a, b) => b.updated_at - a.updated_at);
    if (!q) return sorted.slice(0, 8);
    return sorted.filter((p) => (p.title || t("common.untitled")).toLowerCase().includes(q)).slice(0, 20);
  }, [pages, query, t]);

  type ListItem = { type: "action"; action: CommandPaletteAction } | { type: "page"; page: Page };
  const items: ListItem[] = useMemo(() => [
    ...filteredActions.map((action) => ({ type: "action" as const, action })),
    ...filteredPages.map((page) => ({ type: "page" as const, page })),
  ], [filteredActions, filteredPages]);

  useEffect(() => { setActiveIndex(0); }, [query]);
  if (!isOpen) return null;

  const runItem = (item: ListItem) => {
    if (item.type === "action") item.action.run();
    else onSelectPage(item.page.id);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndex((prev) => Math.min(prev + 1, Math.max(items.length - 1, 0))); return; }
    if (e.key === "ArrowUp") { e.preventDefault(); setActiveIndex((prev) => Math.max(prev - 1, 0)); return; }
    if (e.key === "Enter") { e.preventDefault(); const item = items[activeIndex]; if (item) runItem(item); }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-start justify-center pt-[12vh]" style={{ backgroundColor: "rgba(0, 0, 0, 0.25)" }} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-lg rounded-xl overflow-hidden shadow-2xl" style={{ backgroundColor: "var(--color-bg)", border: "1px solid var(--color-border)" }}>
        <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: "var(--color-border)" }}>
          <FeatureIcon feature="search"/>
          <input ref={inputRef} type="text" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={handleKeyDown} placeholder={t("commandPalette.placeholder")} className="w-full bg-transparent outline-none text-sm" style={{ color: "var(--color-text)" }} />
          <button onClick={onClose} className="text-xs opacity-40 hover:opacity-100 px-1.5 py-0.5 rounded" style={{ border: "1px solid var(--color-border)" }}>{t("commandPalette.esc")}</button>
        </div>
        <div className="max-h-[360px] overflow-y-auto p-1.5">
          {items.length === 0 ? (
            <div className="text-sm text-center py-8 opacity-40" style={{ color: "var(--color-text)" }}>{t("commandPalette.noResults")}</div>
          ) : (<>
            {filteredActions.length > 0 && <div className="px-2 pt-1.5 pb-1 text-[10px] font-semibold tracking-wider text-zinc-400 uppercase">{t("commandPalette.actions")}</div>}
            {filteredActions.map((action, index) => (
              <button key={action.id} onMouseEnter={() => setActiveIndex(index)} onClick={() => runItem({ type: "action", action })} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm text-left transition-all" style={{ backgroundColor: index === activeIndex ? "var(--color-border)" : "transparent", color: "var(--color-text)" }}>
                <FeatureIcon feature={action.id.replace(/^go-/,'')}/><span className="truncate">{action.label}</span>
              </button>
            ))}
            {filteredPages.length > 0 && <div className="px-2 pt-2.5 pb-1 text-[10px] font-semibold tracking-wider text-zinc-400 uppercase">{t("commandPalette.pages")}</div>}
            {filteredPages.map((page, index) => {
              const gi = filteredActions.length + index;
              return (
                <button key={page.id} onMouseEnter={() => setActiveIndex(gi)} onClick={() => runItem({ type: "page", page })} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm text-left transition-all" style={{ backgroundColor: gi === activeIndex ? "var(--color-border)" : "transparent", color: "var(--color-text)" }}>
                  <FeatureIcon page={page}/><span className="truncate">{page.title || t("common.untitled")}</span>
                </button>
              );
            })}
          </>)}
        </div>
      </div>
    </div>
  );
}
