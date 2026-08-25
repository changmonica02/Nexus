"use client";

import { useEffect, useMemo, useRef, useState, type DragEvent, type ReactNode } from "react";
import type { Page } from "../lib/types";
import { useLanguage } from "../lib/LanguageContext";
import PageItemMenu, { type PageMenuItem } from "./PageItemMenu";
import AccountSettingsRow from "./AccountSettingsRow";
import type { SyncState } from "../lib/syncEngine";

function getPageIcon(page: Page): string {
  if (page.kind === "study_set") return "🗂️";
  if (page.kind === "document") return "📄";
  if (page.kind === "presentation") return "📊";
  if (page.primary_attachment_id) return "📑";
  return "📝";
}

export type SortMode = "updated" | "custom";

type CreateItemType = "note" | "document" | "study_set" | "folder" | "presentation";

type DropPosition = "above" | "below" | "child";

type SidebarProps = {
  pages: Page[];
  activePageId: string | null;
  selectedTag: string | null;
  isTrashMode: boolean;
  isHomeMode: boolean;
  isQuickNoteMode?: boolean;
  isTodoMode?: boolean;
  isCreativeMode?: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onSelectTag: (tag: string | null) => void;
  onSelectPage: (id: string) => void;
  onImportPdf: () => void;
  onImportMarkdown: () => void;
  onShowHome: () => void;
  onShowNotes: () => void;
  onShowTrash: () => void;
  onShowQuickNotes?: () => void;
  onShowTodoList?: () => void;
  onShowCreative?: () => void;
  onDeletePage: (id: string) => void;
  onRestorePage: (id: string) => void;
  onPermanentDeletePage: (id: string) => void;
  onDuplicatePage: (id: string) => void;
  onBulkDeletePages: (ids: string[]) => void;
  onBulkRestorePages: (ids: string[]) => void;
  onBulkPermanentDeletePages: (ids: string[]) => void;
  onOpenCommandPalette: () => void;
  onToggleFavorite: (id: string) => void;
  onRenamePage: (id: string, title: string) => void;
  onExportPageMarkdown: (id: string) => void;
  onExportPageAsPdf: (id: string) => void;
  onExportPageAsNexusJson: (id: string) => void;
  onAddSubPage: (parentId: string, kind?: string) => void;
  onMovePage?: (draggedId: string, targetId: string, position: DropPosition) => void;
  theme: "light" | "dark";
  onThemeChange: (theme: "light" | "dark") => void;
  onExportBackup: () => void;
  onImportBackup: () => void;
  sortMode: SortMode;
  onSortModeChange: (mode: SortMode) => void;
  onReorderPages: (orderedIds: string[]) => void;
  pendingRenameId: string | null;
  onClearPendingRename: () => void;
  onCancelNewPage: (id: string) => void;
  onCreateItem: (type: CreateItemType) => void;
  syncState?: SyncState;
  onOpenInSplit?: (id: string) => void;
};

export default function Sidebar({
  pages,
  activePageId,
  selectedTag,
  isTrashMode,
  isHomeMode,
  isCollapsed,
  onToggleCollapse,
  onSelectTag,
  onSelectPage,
  onImportPdf,
  onImportMarkdown,
  onShowHome,
  onShowNotes,
  onShowTrash,
  onShowQuickNotes,
  onShowTodoList,
  onShowCreative,
  isQuickNoteMode,
  isTodoMode,
  isCreativeMode,
  onDeletePage,
  onRestorePage,
  onPermanentDeletePage,
  onDuplicatePage,
  onBulkDeletePages,
  onBulkRestorePages,
  onBulkPermanentDeletePages,
  onOpenCommandPalette,
  onToggleFavorite,
  onRenamePage,
  onExportPageMarkdown,
  onExportPageAsPdf,
  onExportPageAsNexusJson,
  onAddSubPage,
  onMovePage,
  theme,
  onThemeChange,
  onExportBackup,
  onImportBackup,
  sortMode,
  onSortModeChange,
  pendingRenameId,
  onClearPendingRename,
  onCancelNewPage,
  onCreateItem,
  syncState,
  onOpenInSplit,
}: SidebarProps) {
  const { t } = useLanguage();

  const [searchQuery, setSearchQuery] = useState("");
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dragOverPosition, setDragOverPosition] = useState<DropPosition>("below");
  const [subPageMenuId, setSubPageMenuId] = useState<string | null>(null);
  const [groupByType, setGroupByType] = useState(false);

  const sortMenuRef = useRef<HTMLDivElement>(null);
  const createMenuRef = useRef<HTMLDivElement>(null);
  const subPageMenuRef = useRef<HTMLDivElement>(null);
  const newlyCreatedRef = useRef<Set<string>>(new Set());
  const lastClickTimeRef = useRef<number>(0);
  const lastClickIdRef = useRef<string | null>(null);

  const createLabel = (key: string) => t(key);

  useEffect(() => {
    setIsSelectMode(false);
    setSelectedIds(new Set());
  }, [isTrashMode]);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      const target = event.target as Node;
      if (showSortMenu && sortMenuRef.current && !sortMenuRef.current.contains(target)) setShowSortMenu(false);
      if (showCreateMenu && createMenuRef.current && !createMenuRef.current.contains(target)) {
        setShowCreateMenu(false);
      }
      if (subPageMenuId && subPageMenuRef.current && !subPageMenuRef.current.contains(target)) setSubPageMenuId(null);
    };

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showSortMenu, showCreateMenu, subPageMenuId]);

  useEffect(() => {
    if (!pendingRenameId) return;
    const page = pages.find((p) => p.id === pendingRenameId);
    if (page) {
      newlyCreatedRef.current.add(pendingRenameId);
      setRenamingId(pendingRenameId);
      setRenameValue("");
    }
    onClearPendingRename();
  }, [pendingRenameId, pages, onClearPendingRename]);

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const startRename = (page: Page) => {
    setRenamingId(page.id);
    setRenameValue(page.title || "");
  };

  const commitRename = (id: string) => {
    const trimmed = renameValue.trim();
    // 2026-08-04：未命名的新建文件不刪除，直接叫「未命名」
    onRenamePage(id, trimmed || t("common.untitled"));
    newlyCreatedRef.current.delete(id);
    setRenamingId(null);
  };


  const filteredPages = pages.filter((page) => {
    const query = searchQuery.trim().toLowerCase();
    const matchQuery = !query || (page.title || "").toLowerCase().includes(query) || (page.content_text || "").toLowerCase().includes(query);
    const matchTag = !selectedTag || (page.tags || []).includes(selectedTag);
    // Projects view (default) excludes quick_note and todo, which are independent per requirement 8
    if (isQuickNoteMode) return (page.kind as any) === "quick_note" && matchQuery && matchTag;
    if (isTodoMode) return (page.kind as any) === "todo" && matchQuery && matchTag;
    if (isCreativeMode) return (page.kind as any) === "creative" && matchQuery && matchTag;
    // In trash/home/projects modes, exclude quick_note, todo, and creative from projects list
    if ((page.kind as any) === "quick_note" || (page.kind as any) === "todo" || (page.kind as any) === "creative") return false;
    return matchQuery && matchTag;
  });

  const topLevelPages = filteredPages.filter((page) => !page.parent_id);

  const childMap = useMemo(() => {
    const map = new Map<string, Page[]>();
    filteredPages.forEach((page) => {
      if (!page.parent_id) return;
      const children = map.get(page.parent_id) || [];
      children.push(page);
      map.set(page.parent_id, children);
    });
    return map;
  }, [filteredPages]);

  const sortedTopLevel = useMemo(() => {
    const copy = [...topLevelPages];
    if (sortMode === "custom") copy.sort((a, b) => (a.sort_order ?? Infinity) - (b.sort_order ?? Infinity));
    return copy;
  }, [topLevelPages, sortMode]);

  const { folderedGroups, unfoldered } = useMemo(() => {
    const foldered: { name: string; pages: Page[] }[] = [];
    const noFolder: Page[] = [];
    const folderMap = new Map<string, Page[]>();

    sortedTopLevel.forEach((page) => {
      const folder = page.folder?.trim();
      if (!folder) {
        noFolder.push(page);
        return;
      }
      if (!folderMap.has(folder)) {
        folderMap.set(folder, []);
        foldered.push({ name: folder, pages: folderMap.get(folder)! });
      }
      folderMap.get(folder)!.push(page);
    });

    return { folderedGroups: foldered, unfoldered: noFolder };
  }, [sortedTopLevel]);

  const handleDragStart = (event: DragEvent, pageId: string) => {
    event.dataTransfer.setData("text/plain", pageId);
    event.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (event: DragEvent, pageId: string) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDragOverId(pageId);

    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const relY = (event.clientY - rect.top) / rect.height;
    if (relY < 0.3) setDragOverPosition("above");
    else if (relY > 0.7) setDragOverPosition("below");
    else setDragOverPosition("child");
  };

  const handleDrop = (event: DragEvent, targetId: string) => {
    event.preventDefault();
    const draggedId = event.dataTransfer.getData("text/plain");
    setDragOverId(null);
    if (!draggedId || draggedId === targetId) return;
    onMovePage?.(draggedId, targetId, dragOverPosition);
  };

  const renderSubPageTypeMenu = (page: Page) => {
    if (subPageMenuId !== page.id) return null;
    const kind = page.kind || "note";
    if (kind === "presentation") return null;
    const options = kind === "document"
      ? [{ k: "document", icon: "📄", label: "文檔" }]
      : kind === "study_set"
        ? [{ k: "study_set", icon: "🗂️", label: "學習集" }]
        : [{ k: "note", icon: "📝", label: "筆記" }];
    return (
      <div ref={subPageMenuRef} className="absolute right-0 top-full mt-1 w-40 rounded-lg overflow-hidden shadow-xl z-40" style={{ backgroundColor: "var(--color-bg)", border: "1px solid var(--color-border)" }}>
        {options.map((opt) => (
          <button key={opt.k} onClick={() => { onAddSubPage(page.id, opt.k); setSubPageMenuId(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-zinc-200" style={{ color: "var(--color-text)" }}><span>{opt.icon}</span> {opt.label}</button>
        ))}
      </div>
    );
  };


  const renderPageItem = (page: Page, depth = 0): ReactNode => {
    const isActive = !isTrashMode && activePageId === page.id;
    const isChecked = selectedIds.has(page.id);
    const isRenaming = renamingId === page.id;
    const children = childMap.get(page.id) || [];
    const hasChildren = children.length > 0;
    const isExpanded = expandedIds.has(page.id);
    const canAddSubPage = !isTrashMode && (page.kind || "note") !== "presentation" && depth < 2;
    const isDragTarget = dragOverId === page.id;

    const menuItems: PageMenuItem[] = [
      page.is_favorite
        ? { id: "unfavorite", icon: "📄", label: t("sidebar.page.removeFavorite"), onClick: () => onToggleFavorite(page.id) }
        : { id: "favorite", icon: "📄", label: t("sidebar.page.addFavorite"), onClick: () => onToggleFavorite(page.id) },
      { id: "rename", icon: "📄", label: t("sidebar.page.rename"), onClick: () => startRename(page) },
      { id: "copy", icon: "📋", label: t("sidebar.page.copy"), onClick: () => onDuplicatePage(page.id) },
    ];

    if (page.kind === "document") {
      menuItems.push({ id: "export-md", icon: "?", label: t("sidebar.page.exportMarkdown"), onClick: () => onExportPageMarkdown(page.id) });
    } else {
      menuItems.push(
        { id: "export-pdf", icon: "📄", label: t("sidebar.page.exportPdf"), onClick: () => onExportPageAsPdf(page.id) },
        { id: "export-nexus", icon: "📄", label: t("sidebar.page.exportNexusJson"), onClick: () => onExportPageAsNexusJson(page.id) },
      );
    }

    menuItems.push({
      id: "delete",
      icon: "📄",
      label: t("sidebar.page.moveToTrash"),
      danger: true,
      onClick: () => {
        if (confirm(t("sidebar.page.confirmDeleteOne", { title: page.title || t("common.untitled") }))) onDeletePage(page.id);
      },
    });

    return (
      <div key={page.id}>
        <div
          draggable={!isTrashMode}
          onDragStart={(event) => handleDragStart(event, page.id)}
          onDragOver={(event) => handleDragOver(event, page.id)}
          onDragLeave={() => setDragOverId(null)}
          onDrop={(event) => handleDrop(event, page.id)}
          onClick={() => {
            if (isRenaming) return;
            if (isSelectMode) {
              toggleSelectOne(page.id);
              return;
            }
            if (!isTrashMode) {
              const now = Date.now();
              if (lastClickIdRef.current === page.id && now - lastClickTimeRef.current < 350) {
                // 雙擊重新命名（依使用者要求改回）
                startRename(page);
                lastClickIdRef.current = null;
                lastClickTimeRef.current = 0;
              } else {
                // UX批次（需求1）：單擊進入頁面；已在此頁面時才開合子頁
                if (isActive && hasChildren) {
                  toggleExpand(page.id);
                }
                onSelectPage(page.id);
                lastClickIdRef.current = page.id;
                lastClickTimeRef.current = now;
              }
            }
          }}
          className={`group relative flex items-center justify-between rounded-md text-sm transition-all ${
            isDragTarget && dragOverPosition === "child" ? "bg-blue-100/60 ring-1 ring-blue-300" : ""
          } ${isTrashMode ? "cursor-default opacity-80" : isActive ? "cursor-pointer font-medium" : "cursor-pointer hover:bg-zinc-200/50 opacity-80 hover:opacity-100"} ${
            !isTrashMode ? "cursor-grab active:cursor-grabbing" : ""
          }`}
          style={{
            paddingLeft: `${8 + depth * 16}px`,
            paddingRight: "6px",
            paddingTop: "4px",
            paddingBottom: "4px",
            backgroundColor: isChecked ? "rgba(37, 99, 235, 0.12)" : isActive && !(isDragTarget && dragOverPosition === "child") ? "var(--color-border)" : undefined,
            color: isActive ? "var(--color-text)" : "var(--color-sidebar-text)",
            borderTop: isDragTarget && dragOverPosition === "above" ? "2px solid #3b82f6" : undefined,
            borderBottom: isDragTarget && dragOverPosition === "below" ? "2px solid #3b82f6" : undefined,
          }}
        >
          {!isTrashMode && <span className="mr-0.5 w-5 text-center text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity text-xs shrink-0 select-none"></span>}

          {isSelectMode && <input type="checkbox" checked={isChecked} onChange={() => toggleSelectOne(page.id)} onClick={(event) => event.stopPropagation()} className="mr-1.5 shrink-0" />}

          {hasChildren && !isTrashMode ? (
            <button
              onClick={(event) => { event.stopPropagation(); toggleExpand(page.id); }}
              className="mr-0.5 w-6 h-6 flex items-center justify-center text-[11px] rounded hover:bg-zinc-300/60 opacity-60 hover:opacity-100 transition-all shrink-0"
            >
              {isExpanded ? "▼" : "▶"}
            </button>
          ) : !isTrashMode ? <span className="mr-0.5 w-6 shrink-0" /> : null}

          {isRenaming ? (
            <input
              type="text"
              value={renameValue}
              autoFocus
              onClick={(event) => event.stopPropagation()}
              onChange={(event) => setRenameValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") commitRename(page.id);
                if (event.key === "Escape") setRenamingId(null);
              }}
              onBlur={() => commitRename(page.id)}
              placeholder={t("sidebar.page.renamePlaceholder")}
              className="flex-1 px-1 bg-transparent outline-none border-b border-blue-400 text-sm"
              style={{ color: "var(--color-text)" }}
            />
          ) : (
            <span className="truncate flex-1 px-0.5 flex items-center gap-1">
              <span className="shrink-0 text-sm">{getPageIcon(page)}</span>
              {page.is_favorite && <span className="shrink-0 text-xs"></span>}
              <span className="truncate">{page.title || t("common.untitled")}</span>
            </span>
          )}

          {isSelectMode || isRenaming ? null : isTrashMode ? (
            <div className="flex shrink-0 items-center gap-0.5">
              <button className="opacity-100 px-2 py-1 hover:bg-zinc-300 rounded-md text-xs transition-all text-zinc-500 hover:text-green-700" onClick={(event) => { event.stopPropagation(); onRestorePage(page.id); }} title={t("sidebar.page.restoreTitle")}>
                {t("sidebar.page.restore")}
              </button>
              <button
                className="opacity-100 px-2 py-1 hover:bg-red-100 rounded-md text-xs transition-all text-zinc-500 hover:text-red-700"
                onClick={(event) => {
                  event.stopPropagation();
                  if (confirm(t("sidebar.page.confirmPermanentDeleteOne", { title: page.title || t("common.untitled") }))) onPermanentDeletePage(page.id);
                }}
                title={t("sidebar.page.deleteTitle")}
              >
                {t("sidebar.page.delete")}
              </button>
            </div>
          ) : (
            <div className="flex shrink-0 items-center opacity-0 transition-all group-hover:opacity-100 gap-0.5" onClick={(event) => event.stopPropagation()}>
              {canAddSubPage && (
                <div className="relative" ref={subPageMenuId === page.id ? subPageMenuRef : undefined}>
                  <button onClick={() => setSubPageMenuId(subPageMenuId === page.id ? null : page.id)} className="flex items-center justify-center w-7 h-7 hover:bg-zinc-300 rounded-md text-sm transition-all text-zinc-500 hover:text-zinc-800" title={t("sidebar.page.addSubPage")}>
                    +
                  </button>
                  {renderSubPageTypeMenu(page)}
                </div>
              )}
              <PageItemMenu items={menuItems} title={t("sidebar.page.menuTitle")} />
            </div>
          )}
        </div>

        {isExpanded && hasChildren && children.map((child) => renderPageItem(child, depth + 1))}
      </div>
    );
  };

  const renderCreateMenu = () => (
    <div className="absolute left-0 top-full mt-1 w-60 rounded-xl overflow-hidden shadow-2xl z-30" style={{ backgroundColor: "var(--color-bg)", border: "1px solid var(--color-border)" }}>
      <div className="px-3 pt-2.5 pb-1 text-[10px] font-semibold tracking-wider text-zinc-400 uppercase select-none">新建</div>
      <button onClick={() => { onCreateItem("document"); setShowCreateMenu(false); }} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left hover:bg-zinc-200" style={{ color: "var(--color-text)" }}><span>📄</span><span>{t("sidebar.create.document")}</span></button>
      <button onClick={() => { onCreateItem("note"); setShowCreateMenu(false); }} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left hover:bg-zinc-200" style={{ color: "var(--color-text)" }}><span>📝</span><span>{t("sidebar.create.note")}</span></button>
      <button onClick={() => { onCreateItem("study_set"); setShowCreateMenu(false); }} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left hover:bg-zinc-200" style={{ color: "var(--color-text)" }}><span>🗂️</span><span>{t("sidebar.create.studySet")}</span></button>
      <button onClick={() => { onCreateItem("presentation" as any); setShowCreateMenu(false); }} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left hover:bg-zinc-200" style={{ color: "var(--color-text)" }}><span>📊</span><span>簡報</span></button>
      <button onClick={() => { onCreateItem("folder"); setShowCreateMenu(false); }} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left hover:bg-zinc-200" style={{ color: "var(--color-text)" }}><span>📁</span><span>{t("sidebar.create.folder")}</span></button>
      <div className="my-1 border-t" style={{ borderColor: "var(--color-border)" }} />
      <div className="px-3 pt-1 pb-1 text-[10px] font-semibold tracking-wider text-zinc-400 uppercase select-none">匯入</div>
      <button onClick={() => { onImportPdf(); setShowCreateMenu(false); }} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left hover:bg-zinc-200" style={{ color: "var(--color-text)" }}><span>📥</span><span>{t("sidebar.import.pdf")}</span></button>
      <button onClick={() => { onImportMarkdown(); setShowCreateMenu(false); }} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left hover:bg-zinc-200" style={{ color: "var(--color-text)" }}><span>📄</span><span>{t("sidebar.import.markdown")}</span></button>
    </div>
  );


  const renderPageSections = () => {
    if (sortedTopLevel.length === 0) {
      return <div className="text-sm text-center py-8 opacity-40 select-none" style={{ color: "var(--color-text)" }}>{isTrashMode ? t("sidebar.empty.trash") : t("sidebar.empty.notes")}</div>;
    }

    if (groupByType) {
      const kindOrder = ["note", "document", "study_set"];
      const kindLabels: Record<string, string> = {
        note: t("sidebar.sort.group.note"),
        document: t("sidebar.sort.group.document"),
        study_set: t("sidebar.sort.group.studySet"),
      };
      const kindIcons: Record<string, string> = { note: "??", document: "??", study_set: "??" };
      const allFlatPages = [...unfoldered, ...folderedGroups.flatMap((group) => group.pages)];

      return kindOrder.map((kind) => {
        const groupPages = allFlatPages.filter((page) => (page.kind || "note") === kind);
        if (groupPages.length === 0) return null;
        return (
          <div key={kind} className="space-y-0.5">
            <div className="flex items-center gap-1.5 px-2 py-1 text-xs font-semibold tracking-wider text-zinc-400 uppercase select-none">
              <span>{kindIcons[kind]}</span><span>{kindLabels[kind]}</span><span className="opacity-50">({groupPages.length})</span>
            </div>
            {groupPages.map((page) => renderPageItem(page, 0))}
          </div>
        );
      });
    }

    return (
      <>
        {unfoldered.map((page) => renderPageItem(page, 0))}
        {folderedGroups.map(({ name, pages: folderPages }) => (
          <div key={name} className="space-y-0.5">
            <div className="flex items-center gap-1.5 px-2 py-1 text-xs font-semibold tracking-wider text-zinc-400 uppercase select-none">
              <span></span><span>{name}</span>
            </div>
            {folderPages.map((page) => renderPageItem(page, 0))}
          </div>
        ))}
      </>
    );
  };

  if (isCollapsed) {
    return (
      <aside className="flex flex-col items-center pt-3.5 gap-3 border select-none transition-all rounded-2xl overflow-hidden w-full h-full" style={{ backgroundColor: "var(--color-sidebar-bg)", borderColor: "var(--color-border)" }}>
        <button onClick={onToggleCollapse} className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-zinc-200 transition-all text-sm" style={{ color: "var(--color-text)" }} title={t("sidebar.expand")}>
          ??        </button>
        <div className="w-2.5 h-2.5 rounded-full bg-zinc-400" />
      </aside>
    );
  }

  return (
    <aside className="flex flex-col border select-none transition-all rounded-2xl overflow-hidden w-full h-full" style={{ backgroundColor: "var(--color-sidebar-bg)", borderColor: "var(--color-border)" }}>
      <div className="flex items-center justify-between px-4 py-3.5 border-b" style={{ borderColor: "var(--color-border)" }}>
        <button onClick={onShowHome} className="flex items-center gap-2 rounded-md px-1 py-1 -ml-1 transition-all hover:bg-zinc-200" title={t("sidebar.logoGoHome")}>
          <div className="w-2.5 h-2.5 rounded-full bg-zinc-400" />
          <span className="text-base font-semibold tracking-wide" style={{ color: "var(--color-text)" }}>Nexus</span>
        </button>
        <button onClick={onToggleCollapse} className="flex items-center justify-center w-9 h-9 rounded-md hover:bg-zinc-200 transition-all text-sm" style={{ border: "1px solid var(--color-border)", color: "var(--color-text)" }} title={t("sidebar.collapse")}>
          ??        </button>
      </div>

      <div className="p-2.5 border-b" style={{ borderColor: "var(--color-border)" }}>
        <button onClick={onShowHome} className="w-full rounded-md px-3 py-2 text-sm font-medium text-left transition-all hover:bg-zinc-200" style={{ border: "1px solid var(--color-border)", color: "var(--color-text)", backgroundColor: isHomeMode ? "var(--color-border)" : "transparent" }}>
          🏠 {t("sidebar.nav.home")}
        </button>
      </div>

      {/* 垃圾桶（獨立按鈕，位於首頁之下） */}
      <div className="px-2.5 pt-2.5">
        <button onClick={() => { if (isTrashMode) onShowNotes(); else onShowTrash(); }} className="w-full rounded-md px-3 py-2 text-sm font-medium text-left transition-all hover:bg-zinc-200" style={{ border: "1px solid var(--color-border)", color: "var(--color-text)", backgroundColor: isTrashMode ? "var(--color-border)" : "transparent" }}>
          🗑️ {t("sidebar.nav.trash")}
        </button>
      </div>

      {/* UX批次（需求6）：兩個類別 — 隨手記/ToDo；選中後展開顯示名稱並保持 */}
      <div className="p-2.5 border-b" style={{ borderColor: "var(--color-border)" }}>
        <div className="flex items-stretch gap-1">
          {[
            { id: "quicknotes", icon: "📝", label: t("sidebar.nav.quickNote"), active: !!isQuickNoteMode, onClick: () => onShowQuickNotes?.() },
            { id: "todo", icon: "✅", label: t("sidebar.nav.todoList"), active: !!isTodoMode, onClick: () => onShowTodoList?.() },
            { id: "creative", icon: "✍️", label: t("sidebar.nav.creative"), active: !!isCreativeMode, onClick: () => onShowCreative?.() },
            { id: "projects", icon: "📚", label: t("sidebar.nav.notes"), active: !isTrashMode && !isHomeMode && !isQuickNoteMode && !isTodoMode && !isCreativeMode, onClick: onShowNotes },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={cat.onClick}
              className="flex items-center justify-center gap-1.5 rounded-md h-10 text-sm font-medium transition-all hover:bg-zinc-200"
              style={{
                flex: cat.active ? "2.4" : "1",
                border: "1px solid var(--color-border)",
                color: "var(--color-text)",
                backgroundColor: cat.active ? "var(--color-border)" : "transparent",
              }}
              title={cat.label}
            >
              <span className="text-base leading-none">{cat.icon}</span>
              {cat.active && <span className="truncate">{cat.label}</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="p-2 border-b flex items-center gap-1" style={{ borderColor: "var(--color-border)" }}>
        <div className="relative flex-1 min-w-0">
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={isTrashMode ? t("sidebar.search.placeholderTrash") : t("sidebar.search.placeholderNotes")}
            className="w-full text-sm pl-2.5 pr-7 py-2 rounded outline-none bg-transparent transition-all focus:ring-1 focus:ring-blue-500"
            style={{ border: "1px solid var(--color-border)", color: "var(--color-text)" }}
          />
          {searchQuery && <button onClick={() => setSearchQuery("")} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-sm opacity-40 hover:opacity-100 p-0.5">✕</button>}
        </div>
        <button onClick={onOpenCommandPalette} title={t("sidebar.commandPalette.title")} className="shrink-0 w-8 h-8 flex items-center justify-center rounded text-[11px] opacity-60 hover:opacity-100 transition-all" style={{ border: "1px solid var(--color-border)", color: "var(--color-text)" }}>⌘K</button>
        {!isTrashMode && (
          <div className="relative shrink-0" ref={createMenuRef}>
            <button onClick={() => { setShowCreateMenu((prev) => !prev); }} className="shrink-0 w-8 h-8 flex items-center justify-center rounded text-lg font-bold hover:bg-zinc-200 transition-all" style={{ border: "1px solid var(--color-border)", color: "var(--color-text)", backgroundColor: showCreateMenu ? "var(--color-border)" : "transparent" }} title="新建">+</button>
            {showCreateMenu && renderCreateMenu()}
          </div>
        )}
        <button onClick={() => setIsSelectMode((prev) => !prev)} className="shrink-0 w-8 h-8 flex items-center justify-center rounded text-xs font-medium hover:bg-zinc-200 transition-all" style={{ border: "1px solid var(--color-border)", color: "var(--color-text)", backgroundColor: isSelectMode ? "var(--color-border)" : "transparent" }} title={t("sidebar.select.title")}>☑</button>
        {!isTrashMode && (
          <div className="relative shrink-0" ref={sortMenuRef}>
            <button onClick={() => setShowSortMenu((prev) => !prev)} className="shrink-0 w-8 h-8 flex items-center justify-center rounded text-xs hover:bg-zinc-200 transition-all" style={{ border: "1px solid var(--color-border)", color: "var(--color-text)" }} title={t("sidebar.sort.title")}>⇅</button>
            {showSortMenu && (
              <div className="absolute right-0 top-full mt-1 w-52 rounded-xl overflow-hidden shadow-2xl z-30" style={{ backgroundColor: "var(--color-bg)", border: "1px solid var(--color-border)" }}>
                <button onClick={() => { onSortModeChange("updated"); setShowSortMenu(false); }} className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left transition-all hover:bg-zinc-200" style={{ color: "var(--color-text)", backgroundColor: sortMode === "updated" ? "var(--color-border)" : "transparent" }}>
                  <span></span><span>{t("sidebar.sort.updated")}</span>{sortMode === "updated" && <span className="ml-auto text-xs"></span>}
                </button>
                <button onClick={() => { onSortModeChange("custom"); setShowSortMenu(false); }} className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left transition-all hover:bg-zinc-200" style={{ color: "var(--color-text)", backgroundColor: sortMode === "custom" ? "var(--color-border)" : "transparent" }}>
                  <span></span><span>{t("sidebar.sort.custom")}</span>{sortMode === "custom" && <span className="ml-auto text-xs"></span>}
                </button>
                <div className="border-t" style={{ borderColor: "var(--color-border)" }}>
                  <label className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left cursor-pointer hover:bg-zinc-200 transition-all" style={{ color: "var(--color-text)" }}>
                    <input type="checkbox" checked={groupByType} onChange={(event) => setGroupByType(event.target.checked)} className="rounded" />
                    <span>{t("sidebar.sort.groupByType")}</span>
                  </label>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {isSelectMode && (
        <div className="flex items-center justify-between gap-2 px-3 py-2 border-b text-xs" style={{ borderColor: "var(--color-border)" }}>
          <label className="flex items-center gap-1.5 cursor-pointer select-none" style={{ color: "var(--color-text)" }}>
            <input
              type="checkbox"
              checked={filteredPages.length > 0 && filteredPages.every((page) => selectedIds.has(page.id))}
              onChange={() => {
                const allIds = filteredPages.map((page) => page.id);
                const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.has(id));
                setSelectedIds((prev) => {
                  if (allSelected) {
                    const next = new Set(prev);
                    allIds.forEach((id) => next.delete(id));
                    return next;
                  }
                  return new Set([...prev, ...allIds]);
                });
              }}
            />
            <span>{t("sidebar.bulk.selectedCount", { count: selectedIds.size })}</span>
          </label>

          <div className="flex items-center gap-1.5">
            {isTrashMode ? (
              <>
                <button disabled={selectedIds.size === 0} onClick={() => { onBulkRestorePages(Array.from(selectedIds)); setSelectedIds(new Set()); }} className="rounded px-2 py-1 hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40 text-green-700" style={{ border: "1px solid var(--color-border)" }}>
                  {t("sidebar.bulk.restore")}
                </button>
                <button disabled={selectedIds.size === 0} onClick={() => { if (confirm(t("sidebar.bulk.confirmPermanentDelete", { count: selectedIds.size }))) { onBulkPermanentDeletePages(Array.from(selectedIds)); setSelectedIds(new Set()); } }} className="rounded px-2 py-1 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40 text-red-700" style={{ border: "1px solid var(--color-border)" }}>
                  {t("sidebar.bulk.delete")}
                </button>
              </>
            ) : (
              <button disabled={selectedIds.size === 0} onClick={() => { if (confirm(t("sidebar.bulk.confirmSoftDelete", { count: selectedIds.size }))) { onBulkDeletePages(Array.from(selectedIds)); setSelectedIds(new Set()); } }} className="rounded px-2 py-1 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40 text-red-700" style={{ border: "1px solid var(--color-border)" }}>
                {t("sidebar.bulk.delete")}
              </button>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-2">
        {renderPageSections()}
      </div>

      <AccountSettingsRow theme={theme} onThemeChange={onThemeChange} onExportBackup={onExportBackup} onImportBackup={onImportBackup} syncState={syncState} />
    </aside>
  );
}
