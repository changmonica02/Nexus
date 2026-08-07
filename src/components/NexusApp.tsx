"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type MutableRefObject,
  type ChangeEvent,
} from "react";
import { IndexedDBAdapter } from "../lib/IndexedDBAdapter";
import type {
  Page,
  Attachment,
  WorkspaceBackup,
  StudyItem,
  PageFormat,
  PageMargins,
  CreatePageInput,
} from "../lib/types";
import type { StorageAdapter } from "../lib/StorageAdapter";
import { createResearchNoteContent, titleFromPdfFileName } from "../lib/pdfNote";
import { titleFromMarkdownFileName, createMarkdownContent, pageToMarkdown } from "../lib/markdown";
import { extractWikilinks } from "../lib/wikilinks";
import { downloadTextFile, safeFileName, downloadJsonFile, formatBackupFileName } from "../lib/fileDownload";
import { DEFAULT_LANGUAGE, detectDefaultLanguage, type Language } from "../lib/i18n";
import { LanguageProvider, useLanguage } from "../lib/LanguageContext";
import { getSupabase, isSupabaseConfigured } from "../lib/supabase";
import { SyncEngine, type SyncState } from "../lib/syncEngine";
import Sidebar, { type SortMode } from "./Sidebar";
import { createEmptyPresentation, noteToPresentation } from "../lib/presentation";
import EditorPane from "./EditorPane";
import RightPanel from "./RightPanel";
import StudySetView from "./StudySetView";
import Dashboard from "./Dashboard";
import CommandPalette, { type CommandPaletteAction } from "./CommandPalette";
import ResizablePanel from "./ResizablePanel";
import PresentationView from "./PresentationView";
import QuickNotesView from "./QuickNotesView";
import TodoView from "./TodoView";

export default function NexusApp() {
  const [language, setLanguage] = useState<Language>(DEFAULT_LANGUAGE);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const storageRef = useRef<StorageAdapter | null>(null);

  const handleLanguageChange = useCallback((lang: Language) => {
    setLanguage(lang);
    void storageRef.current?.setLanguagePreference(lang);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const handleThemeChange = useCallback((newTheme: "light" | "dark") => {
    setTheme(newTheme);
    void storageRef.current?.setThemePreference(newTheme);
  }, []);

  return (
    <LanguageProvider initialLanguage={language} onLanguageChange={handleLanguageChange}>
      <NexusAppInner
        storageRef={storageRef}
        onLanguageLoaded={setLanguage}
        theme={theme}
        onThemeChange={handleThemeChange}
      />
    </LanguageProvider>
  );
}

function NexusAppInner({
  storageRef,
  onLanguageLoaded,
  theme,
  onThemeChange,
}: {
  storageRef: MutableRefObject<StorageAdapter | null>;
  onLanguageLoaded: (lang: Language) => void;
  theme: "light" | "dark";
  onThemeChange: (t: "light" | "dark") => void;
}) {
  const { t } = useLanguage();

  const [isReady, setIsReady] = useState(false);
  const [pages, setPages] = useState<Page[]>([]);
  const [trashPages, setTrashPages] = useState<Page[]>([]);
  const [isTrashMode, setIsTrashMode] = useState(false);
  const [isHomeMode, setIsHomeMode] = useState(true);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [activePdfUrl, setActivePdfUrl] = useState<string | null>(null);
  const [pdfLoadError, setPdfLoadError] = useState<string | null>(null);
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("updated");
  const [pendingRenameId, setPendingRenameId] = useState<string | null>(null);
  // Task 3: Split view (Obsidian style) - left/right closable
  const [secondaryActivePageId, setSecondaryActivePageId] = useState<string | null>(null);
  const [secondaryPdfUrl, setSecondaryPdfUrl] = useState<string | null>(null);
  const [secondaryPdfLoadError, setSecondaryPdfLoadError] = useState<string | null>(null);
  const [isQuickNoteMode, setIsQuickNoteMode] = useState(false);
  const [isTodoMode, setIsTodoMode] = useState(false);
  const [isPageNightAdapt, setIsPageNightAdapt] = useState(false);

  const pdfInputRef = useRef<HTMLInputElement | null>(null);
  const markdownInputRef = useRef<HTMLInputElement | null>(null);
  const backupInputRef = useRef<HTMLInputElement | null>(null);
  const activePageRef = useRef<Page | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncEngineRef = useRef<SyncEngine | null>(null);
  const sidebarCreateInFlightRef = useRef(false);
  const [syncState, setSyncState] = useState<SyncState>({ status: "idle", lastSyncAt: 0, error: null, pendingPushes: 0 });

  const activePage = pages.find((p) => p.id === activePageId) || null;
  const activeAttachment = activePage?.primary_attachment_id
    ? attachments.find((a) => a.id === activePage.primary_attachment_id) || null
    : null;
  const secondaryActivePage = pages.find((p) => p.id === secondaryActivePageId) || null;
  const secondaryActiveAttachment = secondaryActivePage?.primary_attachment_id
    ? attachments.find((a) => a.id === secondaryActivePage.primary_attachment_id) || null
    : null;
  activePageRef.current = activePage;

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    async function loadActivePdf() {
      setActivePdfUrl(null);
      setPdfLoadError(null);
      if (!activeAttachment) return;
      if (activeAttachment.kind !== "pdf") {
        setPdfLoadError("This attachment is not a PDF.");
        return;
      }
      if (!storageRef.current) {
        setPdfLoadError("Storage is not ready.");
        return;
      }
      const blob = await storageRef.current.readBinary(activeAttachment.id);
      if (cancelled) return;
      if (!blob) {
        setPdfLoadError("PDF binary data was not found in local storage.");
        return;
      }
      objectUrl = URL.createObjectURL(blob);
      if (!cancelled) setActivePdfUrl(objectUrl);
    }

    loadActivePdf().catch((error) => {
      console.error(error);
      if (!cancelled) {
        setActivePdfUrl(null);
        setPdfLoadError("Failed to load PDF preview.");
      }
    });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [activeAttachment, storageRef]);

  // Task 3: Secondary PDF loading
  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    async function loadSecondaryPdf() {
      setSecondaryPdfUrl(null);
      setSecondaryPdfLoadError(null);
      if (!secondaryActiveAttachment) return;
      if (secondaryActiveAttachment.kind !== "pdf") {
        setSecondaryPdfLoadError("This attachment is not a PDF.");
        return;
      }
      if (!storageRef.current) {
        setSecondaryPdfLoadError("Storage is not ready.");
        return;
      }
      const blob = await storageRef.current.readBinary(secondaryActiveAttachment.id);
      if (cancelled) return;
      if (!blob) {
        setSecondaryPdfLoadError("PDF binary data was not found in local storage.");
        return;
      }
      objectUrl = URL.createObjectURL(blob);
      if (!cancelled) setSecondaryPdfUrl(objectUrl);
    }

    loadSecondaryPdf().catch((error) => {
      console.error(error);
      if (!cancelled) {
        setSecondaryPdfUrl(null);
        setSecondaryPdfLoadError("Failed to load PDF preview.");
      }
    });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [secondaryActiveAttachment, storageRef]);

  useEffect(() => {
    let cancelled = false;
    const adapter = new IndexedDBAdapter();

    async function init() {
      await adapter.init();
      if (cancelled) return;
      storageRef.current = adapter;

      let allPages = await adapter.listPages();
      let allAttachments = await adapter.listAttachments();
      setPages(allPages);
      setAttachments(allAttachments);

      const savedLanguage = await adapter.getLanguagePreference();
      if (savedLanguage === "en" || savedLanguage === "zh-TW") onLanguageLoaded(savedLanguage);
      else onLanguageLoaded(detectDefaultLanguage());

      const savedTheme = await adapter.getThemePreference();
      if (savedTheme === "dark" || savedTheme === "light") onThemeChange(savedTheme);

      const savedNightAdapt = await adapter.getPageNightAdaptPreference();
      if (savedNightAdapt === true) setIsPageNightAdapt(true);

      const savedId = await adapter.getActivePageId();
      const savedPage = savedId ? allPages.find((p) => p.id === savedId && p.deleted_at === null) : null;

      if (savedPage) {
        setActivePageId(savedPage.id);
      } else if (allPages.length > 0) {
        setActivePageId(allPages[0].id);
        await adapter.setActivePageId(allPages[0].id);
      } else {
        const first = await adapter.createPage();
        allPages = [first];
        setPages(allPages);
        setActivePageId(first.id);
        await adapter.setActivePageId(first.id);
      }

      setIsReady(true);

      if (isSupabaseConfigured()) {
        const supabase = getSupabase();
        if (supabase) {
          const deviceId = await adapter.getDeviceId();
          const engine = new SyncEngine(supabase, adapter, deviceId);
          syncEngineRef.current = engine;
          engine.subscribe(setSyncState);
          engine.setOnRemoteChange(async () => {
            const syncedPages = await adapter.listPages();
            const syncedAttachments = await adapter.listAttachments();
            setPages(syncedPages);
            setAttachments(syncedAttachments);
          });
          await engine.fullSync();
          if (cancelled) return;
          allPages = await adapter.listPages();
          allAttachments = await adapter.listAttachments();
          setPages(allPages);
          setAttachments(allAttachments);
          engine.startRealtime();
        }
      }
    }

    init().catch((error) => {
      console.error(error);
      setIsReady(true);
    });

    return () => {
      cancelled = true;
      syncEngineRef.current?.destroy();
      adapter.close?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const flushSave = useCallback(async (pageToSave: Page) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    if (!storageRef.current) return;
    const nextPage = { ...pageToSave, updated_at: Date.now(), revision: pageToSave.revision + 1 };
    await storageRef.current.savePage(nextPage);
    syncEngineRef.current?.pushPage(nextPage);
  }, [storageRef]);

  const scheduleSave = useCallback((page: Page) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => void flushSave(page), 800);
  }, [flushSave]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (activePageRef.current) void flushSave(activePageRef.current);
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [flushSave]);

  const activatePage = useCallback(async (id: string) => {
    setIsHomeMode(false);
    setActivePageId(id);
    if (storageRef.current) await storageRef.current.setActivePageId(id);
  }, [storageRef]);

  const handleSelectPage = useCallback(async (id: string) => {
    if (activePageRef.current) await flushSave(activePageRef.current);
    await activatePage(id);
  }, [activatePage, flushSave]);

  const createAndOpenPage = useCallback(async (input: CreatePageInput) => {
    if (!storageRef.current) return;
    if (activePageRef.current) await flushSave(activePageRef.current);
    const newPage = await storageRef.current.createPage(input);
    setIsTrashMode(false);
    setIsHomeMode(false);
    setPages((prev) => [newPage, ...prev]);
    setActivePageId(newPage.id);
    await storageRef.current.setActivePageId(newPage.id);
    syncEngineRef.current?.pushPage(newPage);
    return newPage;
  }, [flushSave, storageRef]);

  // Task 1 optimization: kind decides default format
  // Document = A4 paper (like Word), Note = flow (infinite)
  const handleCreatePage = useCallback(async (format: PageFormat = "flow") => {
    await createAndOpenPage({ kind: "note", format });
  }, [createAndOpenPage]);

  const handleCreateDocument = useCallback(async (format: PageFormat = "a4") => {
    await createAndOpenPage({ kind: "document", format });
  }, [createAndOpenPage]);

  const handleCreateStudySet = useCallback(async () => {
    await createAndOpenPage({ title: "Untitled Study Set", kind: "study_set" });
  }, [createAndOpenPage]);

  const handleCreatePresentation = useCallback(async (format: PageFormat = "16:9") => {
    if (!storageRef.current) return;
    if (activePageRef.current) await flushSave(activePageRef.current);
    const emptyData = createEmptyPresentation("Untitled Presentation");
    const created = await storageRef.current.createPage({ title: "Untitled Presentation", kind: "presentation", format });
    const pageToSave = { ...created, presentation_data: emptyData, updated_at: Date.now(), revision: created.revision + 1 };
    await storageRef.current.savePage(pageToSave);
    setIsTrashMode(false);
    setIsHomeMode(false);
    setPages((prev) => [pageToSave, ...prev]);
    setActivePageId(pageToSave.id);
    await storageRef.current.setActivePageId(pageToSave.id);
    syncEngineRef.current?.pushPage(pageToSave);
    return pageToSave;
  }, [createAndOpenPage, flushSave]);

  const handleUpdatePresentation = useCallback((data: any) => {
    if (!activePageId) return;
    setPages((prev) => {
      const next = prev.map((p) => (p.id === activePageId ? { ...p, presentation_data: data } : p));
      const updated = next.find((p) => p.id === activePageId);
      if (updated) scheduleSave(updated);
      return next;
    });
  }, [activePageId, scheduleSave]);

  const handleSecondaryUpdatePresentation = useCallback((data: any) => {
    if (!secondaryActivePageId) return;
    setPages((prev) => {
      const next = prev.map((p) => (p.id === secondaryActivePageId ? { ...p, presentation_data: data } : p));
      const updated = next.find((p) => p.id === secondaryActivePageId);
      if (updated) scheduleSave(updated);
      return next;
    });
  }, [secondaryActivePageId, scheduleSave]);

  const handleConvertToPresentation = useCallback(async (id?: string) => {
    const targetId = id || activePageId;
    if (!targetId || !storageRef.current) return;
    const source = pages.find((p) => p.id === targetId);
    if (!source) return;
    if (activePageRef.current) await flushSave(activePageRef.current);
    const presData = noteToPresentation(source);
    const created = await storageRef.current.createPage({ 
      title: `${source.title || "Untitled"} - 簡報`, 
      kind: "presentation", 
      format: "16:9",
      folder: source.folder ?? null,
      tags: source.tags ?? [],
    });
    const pageToSave = { ...created, presentation_data: presData, updated_at: Date.now(), revision: created.revision + 1 };
    await storageRef.current.savePage(pageToSave);
    setIsTrashMode(false);
    setIsHomeMode(false);
    setPages((prev) => [pageToSave, ...prev]);
    setActivePageId(pageToSave.id);
    await storageRef.current.setActivePageId(pageToSave.id);
    syncEngineRef.current?.pushPage(pageToSave);
    return pageToSave;
  }, [activePageId, pages, flushSave]);

  const handleAddSubPage = useCallback(async (parentId: string, kind?: string) => {
    const parent = pages.find((p) => p.id === parentId);
    const pageKind = kind === "document" || kind === "study_set" || kind === "note" ? kind : (parent?.kind ?? "note");
    const newPage = await createAndOpenPage({
      title: "",
      kind: pageKind,
      format: parent?.format ?? "flow",
      parent_id: parentId,
      folder: parent?.folder ?? null,
      tags: parent?.tags ?? [],
    });
    if (newPage) setPendingRenameId(newPage.id);
  }, [createAndOpenPage, pages]);

  const handleMovePage = useCallback(async (draggedId: string, targetId: string, position: "above" | "below" | "child") => {
    if (!storageRef.current) return;
    const draggedPage = pages.find((p) => p.id === draggedId);
    const targetPage = pages.find((p) => p.id === targetId);
    if (!draggedPage || !targetPage) return;
    const now = Date.now();

    if (position === "child") {
      // Only same type can be child, presentation has no child concept
      if ((targetPage.kind || "note") === "presentation") return;
      if ((draggedPage.kind || "note") !== (targetPage.kind || "note")) return;
      const targetDepth = targetPage.parent_id ? 1 : 0;
      if (targetDepth >= 2) return;
      const updated: Page = { ...draggedPage, parent_id: targetId, updated_at: now, revision: draggedPage.revision + 1 };
      await storageRef.current.savePage(updated);
      setPages((prev) => prev.map((p) => (p.id === draggedId ? updated : p)));
      syncEngineRef.current?.pushPage(updated);
      return;
    }

    const newParentId = targetPage.parent_id ?? null;
    const normalizedDraggedPage: Page = draggedPage.parent_id !== newParentId
      ? { ...draggedPage, parent_id: newParentId, updated_at: now, revision: draggedPage.revision + 1 }
      : draggedPage;

    if (normalizedDraggedPage !== draggedPage) {
      await storageRef.current.savePage(normalizedDraggedPage);
      syncEngineRef.current?.pushPage(normalizedDraggedPage);
    }

    const siblings = pages.filter((p) => (p.parent_id ?? null) === newParentId && p.id !== draggedId);
    const targetIdx = siblings.findIndex((p) => p.id === targetId);
    const insertIdx = position === "above" ? targetIdx : targetIdx + 1;
    const newOrder = [...siblings];
    newOrder.splice(insertIdx, 0, normalizedDraggedPage);

    const changed = new Map<string, Page>();
    for (let i = 0; i < newOrder.length; i += 1) {
      const page = newOrder[i];
      if (page.sort_order !== i || (page.id === draggedId && page.parent_id !== draggedPage.parent_id)) {
        const updated: Page = { ...page, sort_order: i, updated_at: now, revision: page.revision + 1 };
        await storageRef.current.savePage(updated);
        syncEngineRef.current?.pushPage(updated);
        changed.set(updated.id, updated);
      }
    }
    setPages((prev) => prev.map((p) => changed.get(p.id) ?? p));
  }, [storageRef, pages]);

  const handleCreateItem = useCallback(async (type: "note" | "document" | "study_set" | "folder" | "presentation") => {
    if (type === "presentation") {
      await handleCreatePresentation("16:9");
      return;
    }
    if (type === "note" || type === "document") {
      // New notes/documents used to be created from NewPageDialog's mount
      // effect. React remounts could run that effect more than once, leaving
      // one Untitled page plus a second page in rename mode. Creation must be
      // a single user event, and repeated clicks while IndexedDB is pending
      // must not create a second page.
      if (sidebarCreateInFlightRef.current) return;
      sidebarCreateInFlightRef.current = true;
      try {
        const newPage = await createAndOpenPage({
          kind: type,
          format: type === "document" ? "a4" : "flow",
          title: "",
        });
        if (newPage) setPendingRenameId(newPage.id);
      } finally {
        sidebarCreateInFlightRef.current = false;
      }
      return;
    }
    const input: CreatePageInput = type === "folder"
      ? { kind: "note", folder: "New Folder", title: "" }
      : { kind: "study_set", title: "" };
    const newPage = await createAndOpenPage(input);
    if (newPage) setPendingRenameId(newPage.id);
  }, [createAndOpenPage, handleCreatePresentation]);

  const handleCancelNewPage = useCallback(async (id: string) => {
    if (!storageRef.current) return;
    await storageRef.current.deletePage(id);
    setPages((prev) => prev.filter((p) => p.id !== id));
    if (activePageId === id) {
      const remaining = pages.filter((p) => p.id !== id);
      if (remaining.length > 0) await activatePage(remaining[0].id);
      else {
        setActivePageId(null);
        await storageRef.current.setActivePageId(null);
      }
    }
  }, [activatePage, activePageId, pages, storageRef]);

  const handleClearPendingRename = useCallback(() => setPendingRenameId(null), []);

  const handleReorderPages = useCallback(async (orderedIds: string[]) => {
    if (!storageRef.current) return;
    const idToIndex = new Map(orderedIds.map((id, idx) => [id, idx]));
    const now = Date.now();
    const changed = new Map<string, Page>();
    for (const page of pages) {
      const newOrder = idToIndex.get(page.id);
      if (newOrder !== undefined && page.sort_order !== newOrder) {
        const updated: Page = { ...page, sort_order: newOrder, updated_at: now, revision: page.revision + 1 };
        await storageRef.current.savePage(updated);
        syncEngineRef.current?.pushPage(updated);
        changed.set(updated.id, updated);
      }
    }
    if (changed.size > 0) setPages((prev) => prev.map((p) => changed.get(p.id) ?? p));
  }, [storageRef, pages]);

  const handleUpdateStudyItems = useCallback((items: StudyItem[]) => {
    if (!activePageId) return;
    setPages((prev) => {
      const next = prev.map((p) => (p.id === activePageId ? { ...p, study_items: items } : p));
      const updated = next.find((p) => p.id === activePageId);
      if (updated) scheduleSave(updated);
      return next;
    });
  }, [activePageId, scheduleSave]);

  const loadTrashPages = useCallback(async () => {
    if (!storageRef.current) return;
    const allPages = await storageRef.current.listPages({ includeDeleted: true });
    setTrashPages(allPages.filter((page) => page.deleted_at !== null));
  }, [storageRef]);

  const handleShowNotes = useCallback(() => { setIsTrashMode(false); setIsHomeMode(false); setIsQuickNoteMode(false); setIsTodoMode(false); }, []);

  // Q-7: night adapt is a global preference, persisted via StorageAdapter (settings store)
  const handleTogglePageNightAdapt = useCallback(() => {
    setIsPageNightAdapt((prev) => {
      const next = !prev;
      void storageRef.current?.setPageNightAdaptPreference?.(next);
      return next;
    });
  }, [storageRef]);
  const handleShowHome = useCallback(() => { setIsTrashMode(false); setIsHomeMode(true); setIsQuickNoteMode(false); setIsTodoMode(false); }, []);
  const handleShowQuickNotes = useCallback(() => { setIsTrashMode(false); setIsHomeMode(false); setIsQuickNoteMode(true); setIsTodoMode(false); }, []);
  const handleShowTodoList = useCallback(() => { setIsTrashMode(false); setIsHomeMode(false); setIsQuickNoteMode(false); setIsTodoMode(true); }, []);
  const handleShowTrash = useCallback(async () => {
    if (activePageRef.current) await flushSave(activePageRef.current);
    await loadTrashPages();
    setIsTrashMode(true);
    setIsHomeMode(false);
    setIsQuickNoteMode(false);
    setIsTodoMode(false);
  }, [flushSave, loadTrashPages]);

  const handleRestorePage = useCallback(async (id: string) => {
    if (!storageRef.current) return;
    const restored = await storageRef.current.restorePage(id);
    setTrashPages((prev) => prev.filter((page) => page.id !== id));
    setPages((prev) => [restored, ...prev.filter((page) => page.id !== id)]);
    setIsTrashMode(false);
    setIsHomeMode(false);
    setActivePageId(restored.id);
    await storageRef.current.setActivePageId(restored.id);
    syncEngineRef.current?.pushPage(restored);
  }, [storageRef]);

  const handlePermanentDeletePage = useCallback(async (id: string) => {
    if (!storageRef.current) return;
    await storageRef.current.permanentDeletePage(id);
    setTrashPages((prev) => prev.filter((page) => page.id !== id));
    syncEngineRef.current?.pushPermanentDeletePage(id);
  }, [storageRef]);

  const handleDuplicatePage = useCallback(async (id: string) => {
    if (!storageRef.current) return;
    const source = pages.find((page) => page.id === id);
    if (!source) return;
    if (activePageRef.current) await flushSave(activePageRef.current);
    const duplicated = await storageRef.current.createPage({
      title: `${source.title || "Untitled"} copy`,
      tags: [...(source.tags || [])],
      folder: source.folder ?? null,
      attachment_ids: [...(source.attachment_ids || [])],
      primary_attachment_id: source.primary_attachment_id ?? null,
      parent_id: source.parent_id ?? null,
      kind: source.kind ?? "note",
      format: source.format ?? "flow",
      margins: source.margins,
    });
    const pageToSave: Page = {
      ...duplicated,
      content_json: source.content_json,
      content_text: source.content_text,
      links: [...(source.links || [])],
      study_items: source.study_items ? source.study_items.map((item) => ({ ...item })) : duplicated.study_items,
      updated_at: Date.now(),
      revision: duplicated.revision + 1,
    };
    await storageRef.current.savePage(pageToSave);
    setIsTrashMode(false);
    setIsHomeMode(false);
    setPages((prev) => [pageToSave, ...prev]);
    setActivePageId(pageToSave.id);
    await storageRef.current.setActivePageId(pageToSave.id);
    syncEngineRef.current?.pushPage(pageToSave);
  }, [flushSave, pages, storageRef]);

  const handleImportPdfClick = useCallback(() => pdfInputRef.current?.click(), []);
  const handleImportMarkdownClick = useCallback(() => markdownInputRef.current?.click(), []);

  const handleExportPageMarkdown = useCallback(async (id: string) => {
    const page = id === activePageRef.current?.id ? activePageRef.current : pages.find((p) => p.id === id);
    if (!page) { alert(t("app.noActivePageToExport")); return; }
    if (activePageRef.current && activePageRef.current.id === id) await flushSave(activePageRef.current);
    downloadTextFile(`${safeFileName(page.title)}.md`, pageToMarkdown(page), "text/markdown;charset=utf-8");
  }, [flushSave, pages, t]);

  const handleExportPageAsNexusJson = useCallback(async (id: string) => {
    const page = id === activePageRef.current?.id ? activePageRef.current : pages.find((p) => p.id === id);
    if (!page) { alert(t("app.noActivePageToExport")); return; }
    if (activePageRef.current && activePageRef.current.id === id) await flushSave(activePageRef.current);
    downloadJsonFile(`${safeFileName(page.title)}.nexus.json`, { schema_version: 1, exported_at: Date.now(), page });
  }, [flushSave, pages, t]);

  const handleExportPageAsPdf = useCallback(async (id: string) => {
    if (activePageRef.current?.id !== id) await handleSelectPage(id);
    if (activePageRef.current) await flushSave(activePageRef.current);
    window.setTimeout(() => window.print(), 50);
  }, [flushSave, handleSelectPage]);

  const handleToggleFavorite = useCallback((id: string) => {
    setPages((prev) => {
      const next = prev.map((p) => (p.id === id ? { ...p, is_favorite: !p.is_favorite } : p));
      const updated = next.find((p) => p.id === id);
      if (updated) scheduleSave(updated);
      return next;
    });
  }, [scheduleSave]);

  const handleRenamePage = useCallback((id: string, title: string) => {
    setPages((prev) => {
      const next = prev.map((p) => (p.id === id ? { ...p, title } : p));
      const updated = next.find((p) => p.id === id);
      if (updated) scheduleSave(updated);
      return next;
    });
  }, [scheduleSave]);

  const handleExportBackup = useCallback(async () => {
    const storage = storageRef.current;
    if (!storage || !storage.exportWorkspaceBackup) { alert(t("app.backupNotAvailable")); return; }
    if (activePageRef.current) await flushSave(activePageRef.current);
    try {
      const backup = await storage.exportWorkspaceBackup();
      downloadJsonFile(formatBackupFileName(), backup);
    } catch (error) { console.error(error); alert(t("app.backupExportFailed")); }
  }, [flushSave, storageRef, t]);

  const handleImportBackupClick = useCallback(() => backupInputRef.current?.click(), []);
  const handleImportBackupFile = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const storage = storageRef.current;
    if (!storage || !storage.importWorkspaceBackup) { alert(t("app.backupNotAvailable")); return; }
    if (!confirm(t("app.confirmImportBackup"))) return;
    try {
      const text = await file.text();
      await storage.importWorkspaceBackup(JSON.parse(text) as WorkspaceBackup);
      alert(t("app.backupImportedReload"));
      window.location.reload();
    } catch (error) { console.error(error); alert(t("app.backupImportFailed")); }
  }, [storageRef, t]);

  const handleImportMarkdownFile = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const lowerName = file.name.toLowerCase();
    const isMarkdown = lowerName.endsWith(".md") || lowerName.endsWith(".markdown") || lowerName.endsWith(".txt") || file.type === "text/markdown" || file.type === "text/plain";
    if (!isMarkdown) { alert(t("app.chooseMarkdownFile")); return; }
    const storage = storageRef.current;
    if (!storage) return;
    try {
      if (activePageRef.current) await flushSave(activePageRef.current);
      const markdown = await file.text();
      const createdPage = await storage.createPage({
        title: titleFromMarkdownFileName(file.name),
        tags: ["imported"],
        folder: "Imports",
        kind: "document",
        format: "flow",
      });
      const importedPage: Page = {
        ...createdPage,
        content_json: createMarkdownContent(markdown),
        content_text: markdown,
        updated_at: Date.now(),
        revision: createdPage.revision + 1,
      };
      await storage.savePage(importedPage);
      setIsTrashMode(false);
      setIsHomeMode(false);
      setPages((prev) => [importedPage, ...prev]);
      setActivePageId(importedPage.id);
      await storage.setActivePageId(importedPage.id);
      syncEngineRef.current?.pushPage(importedPage);
    } catch (error) { console.error(error); alert(t("app.markdownImportFailed")); }
  }, [flushSave, storageRef, t]);

  const handleImportPdfFile = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) { alert(t("app.choosePdfFile")); return; }
    const storage = storageRef.current;
    if (!storage || !storage.createAttachment) { alert(t("app.attachmentNotAvailable")); return; }
    try {
      if (activePageRef.current) await flushSave(activePageRef.current);
      const attachment = await storage.createAttachment({ kind: "pdf", name: file.name, mime_type: file.type || "application/pdf", size_bytes: file.size });
      await storage.attachBinary(attachment.id, file);
      const createdPage = await storage.createPage({ title: titleFromPdfFileName(file.name), tags: ["research"], folder: "Research", attachment_ids: [attachment.id], primary_attachment_id: attachment.id });
      const researchPage: Page = {
        ...createdPage,
        content_json: createResearchNoteContent(file.name),
        content_text: `PDF Notes\nSource PDF: ${file.name}`,
        updated_at: Date.now(),
        revision: createdPage.revision + 1,
      };
      await storage.savePage(researchPage);
      setIsTrashMode(false);
      setIsHomeMode(false);
      setAttachments((prev) => [attachment, ...prev]);
      setPages((prev) => [researchPage, ...prev]);
      setActivePageId(researchPage.id);
      await storage.setActivePageId(researchPage.id);
      syncEngineRef.current?.pushAttachment(attachment);
      syncEngineRef.current?.pushBinary(attachment.id, file);
      syncEngineRef.current?.pushPage(researchPage);
    } catch (error) { console.error(error); alert(t("app.pdfImportFailed")); }
  }, [flushSave, storageRef, t]);

  const handleSelectPageByTitle = useCallback(async (targetTitle: string) => {
    const exists = pages.find((p) => p.title.trim().toLowerCase() === targetTitle.trim().toLowerCase());
    if (exists) { await handleSelectPage(exists.id); return; }
    if (confirm(t("app.confirmCreatePageFromLink", { title: targetTitle }))) {
      const newPage = await createAndOpenPage({ title: targetTitle });
      if (newPage) syncEngineRef.current?.pushPage(newPage);
    }
  }, [pages, handleSelectPage, t, createAndOpenPage]);

  const handleTitleChange = useCallback((title: string) => {
    if (!activePageId) return;
    setPages((prev) => {
      const next = prev.map((p) => (p.id === activePageId ? { ...p, title } : p));
      const updated = next.find((p) => p.id === activePageId);
      if (updated) scheduleSave(updated);
      return next;
    });
  }, [activePageId, scheduleSave]);

  const handleFolderChange = useCallback((newFolder: string | null) => {
    if (!activePageId) return;
    setPages((prev) => {
      const next = prev.map((p) => (p.id === activePageId ? { ...p, folder: newFolder } : p));
      const updated = next.find((p) => p.id === activePageId);
      if (updated) scheduleSave(updated);
      return next;
    });
  }, [activePageId, scheduleSave]);

  const handleTagsChange = useCallback((newTags: string[]) => {
    if (!activePageId) return;
    setPages((prev) => {
      const next = prev.map((p) => (p.id === activePageId ? { ...p, tags: newTags } : p));
      const updated = next.find((p) => p.id === activePageId);
      if (updated) scheduleSave(updated);
      return next;
    });
  }, [activePageId, scheduleSave]);

  // Task 1: PageFormat toggle - any paginated can convert to flow
  const handleFormatChange = useCallback((newFormat: PageFormat) => {
    if (!activePageId) return;
    setPages((prev) => {
      const next = prev.map((p) => (p.id === activePageId ? { ...p, format: newFormat } : p));
      const updated = next.find((p) => p.id === activePageId);
      if (updated) scheduleSave(updated);
      return next;
    });
  }, [activePageId, scheduleSave]);

  // Task 3: Split view handlers (Obsidian style, closable)
  const handleOpenInSplit = useCallback((id: string) => {
    if (id === activePageId) return;
    setSecondaryActivePageId(id);
    setIsHomeMode(false);
    setIsTrashMode(false);
  }, [activePageId]);

  const handleCloseSplit = useCallback(() => {
    setSecondaryActivePageId(null);
    setSecondaryPdfUrl(null);
    setSecondaryPdfLoadError(null);
  }, []);

  const handleSwapSplit = useCallback(() => {
    if (!activePageId || !secondaryActivePageId) return;
    const primary = activePageId;
    const secondary = secondaryActivePageId;
    setActivePageId(secondary);
    setSecondaryActivePageId(primary);
    if (storageRef.current) {
      void storageRef.current.setActivePageId(secondary);
    }
  }, [activePageId, secondaryActivePageId]);

  const handleSecondaryTitleChange = useCallback((title: string) => {
    if (!secondaryActivePageId) return;
    setPages((prev) => {
      const next = prev.map((p) => (p.id === secondaryActivePageId ? { ...p, title } : p));
      const updated = next.find((p) => p.id === secondaryActivePageId);
      if (updated) scheduleSave(updated);
      return next;
    });
  }, [secondaryActivePageId, scheduleSave]);

  const handleSecondaryFolderChange = useCallback((newFolder: string | null) => {
    if (!secondaryActivePageId) return;
    setPages((prev) => {
      const next = prev.map((p) => (p.id === secondaryActivePageId ? { ...p, folder: newFolder } : p));
      const updated = next.find((p) => p.id === secondaryActivePageId);
      if (updated) scheduleSave(updated);
      return next;
    });
  }, [secondaryActivePageId, scheduleSave]);

  const handleSecondaryTagsChange = useCallback((newTags: string[]) => {
    if (!secondaryActivePageId) return;
    setPages((prev) => {
      const next = prev.map((p) => (p.id === secondaryActivePageId ? { ...p, tags: newTags } : p));
      const updated = next.find((p) => p.id === secondaryActivePageId);
      if (updated) scheduleSave(updated);
      return next;
    });
  }, [secondaryActivePageId, scheduleSave]);

  const handleMarginsChange = useCallback((margins: PageMargins) => {
    if (!activePageId) return;
    setPages((prev) => {
      const next = prev.map((p) => (p.id === activePageId ? { ...p, margins } : p));
      const updated = next.find((p) => p.id === activePageId);
      if (updated) scheduleSave(updated);
      return next;
    });
  }, [activePageId, scheduleSave]);

  const handleSecondaryMarginsChange = useCallback((margins: PageMargins) => {
    if (!secondaryActivePageId) return;
    setPages((prev) => {
      const next = prev.map((p) => (p.id === secondaryActivePageId ? { ...p, margins } : p));
      const updated = next.find((p) => p.id === secondaryActivePageId);
      if (updated) scheduleSave(updated);
      return next;
    });
  }, [secondaryActivePageId, scheduleSave]);

  const handleSecondaryFormatChange = useCallback((newFormat: PageFormat) => {
    if (!secondaryActivePageId) return;
    setPages((prev) => {
      const next = prev.map((p) => (p.id === secondaryActivePageId ? { ...p, format: newFormat } : p));
      const updated = next.find((p) => p.id === secondaryActivePageId);
      if (updated) scheduleSave(updated);
      return next;
    });
  }, [secondaryActivePageId, scheduleSave]);

  const handleSecondaryContentChange = useCallback(({ json, text }: { json: any; text: string }) => {
    if (!secondaryActivePageId) return;
    const extractedLinks = extractWikilinks(text);
    setPages((prev) => {
      const next = prev.map((p) => p.id === secondaryActivePageId ? { ...p, content_json: json, content_text: text, links: extractedLinks } : p);
      const updated = next.find((p) => p.id === secondaryActivePageId);
      if (updated) scheduleSave(updated);
      return next;
    });
  }, [secondaryActivePageId, scheduleSave]);

  const handleContentChange = useCallback(({ json, text }: { json: any; text: string }) => {
    if (!activePageId) return;
    const extractedLinks = extractWikilinks(text);
    setPages((prev) => {
      const next = prev.map((p) => p.id === activePageId ? { ...p, content_json: json, content_text: text, links: extractedLinks } : p);
      const updated = next.find((p) => p.id === activePageId);
      if (updated) scheduleSave(updated);
      return next;
    });
  }, [activePageId, scheduleSave]);

  const handleDeletePage = useCallback(async (id: string) => {
    if (!storageRef.current) return;
    if (saveTimerRef.current) { clearTimeout(saveTimerRef.current); saveTimerRef.current = null; }
    if (activePageRef.current && activePageRef.current.id === id) activePageRef.current = null;
    const deletedPage = pages.find((p) => p.id === id);
    const now = Date.now();
    await storageRef.current.deletePage(id);
    // M4-1 fix: push the soft-deleted version to cloud so other devices don't resurrect it
    if (deletedPage) {
      const deletedVersion = { ...deletedPage, deleted_at: now, updated_at: now, revision: deletedPage.revision + 1 };
      syncEngineRef.current?.pushPage(deletedVersion);
    }
    setPages((prev) => prev.filter((p) => p.id !== id));
    if (deletedPage) setTrashPages((prev) => [{ ...deletedPage, deleted_at: now, updated_at: now, revision: deletedPage.revision + 1 }, ...prev.filter((p) => p.id !== id)]);
    if (activePageId === id) {
      const remaining = pages.filter((p) => p.id !== id);
      if (remaining.length > 0) await handleSelectPage(remaining[0].id);
      else { setActivePageId(null); await storageRef.current.setActivePageId(null); }
    }
  }, [activePageId, pages, handleSelectPage, storageRef]);

  const handleBulkDeletePages = useCallback(async (ids: string[]) => {
    if (!storageRef.current || ids.length === 0) return;
    const idSet = new Set(ids);
    if (saveTimerRef.current) { clearTimeout(saveTimerRef.current); saveTimerRef.current = null; }
    if (activePageRef.current && idSet.has(activePageRef.current.id)) activePageRef.current = null;
    const now = Date.now();
    const toDelete = pages.filter((p) => idSet.has(p.id));
    for (const id of ids) await storageRef.current.deletePage(id);
    // M4-1 fix: push each soft-deleted version to cloud so other devices don't resurrect them
    for (const p of toDelete) {
      syncEngineRef.current?.pushPage({ ...p, deleted_at: now, updated_at: now, revision: p.revision + 1 });
    }
    setPages((prev) => prev.filter((p) => !idSet.has(p.id)));
    setTrashPages((prev) => [...toDelete.map((p) => ({ ...p, deleted_at: now, updated_at: now, revision: p.revision + 1 })), ...prev.filter((p) => !idSet.has(p.id))]);
    if (activePageId && idSet.has(activePageId)) {
      const remaining = pages.filter((p) => !idSet.has(p.id));
      if (remaining.length > 0) await handleSelectPage(remaining[0].id);
      else { setActivePageId(null); await storageRef.current.setActivePageId(null); }
    }
  }, [activePageId, pages, handleSelectPage, storageRef]);

  const handleBulkRestorePages = useCallback(async (ids: string[]) => {
    if (!storageRef.current || ids.length === 0) return;
    const idSet = new Set(ids);
    const restoredPages: Page[] = [];
    for (const id of ids) {
      const restored = await storageRef.current.restorePage(id);
      restoredPages.push(restored);
      syncEngineRef.current?.pushPage(restored);
    }
    setTrashPages((prev) => prev.filter((p) => !idSet.has(p.id)));
    setPages((prev) => [...restoredPages, ...prev.filter((p) => !idSet.has(p.id))]);
  }, [storageRef]);

  const handleBulkPermanentDeletePages = useCallback(async (ids: string[]) => {
    if (!storageRef.current || ids.length === 0) return;
    const idSet = new Set(ids);
    for (const id of ids) { await storageRef.current.permanentDeletePage(id); syncEngineRef.current?.pushPermanentDeletePage(id); }
    setTrashPages((prev) => prev.filter((p) => !idSet.has(p.id)));
  }, [storageRef]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().includes("MAC");
      if ((isMac ? event.metaKey : event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const commandPaletteActions: CommandPaletteAction[] = [
    { id: "go-home", label: t("commandPalette.goHome"), icon: "??", keywords: "dashboard home", run: handleShowHome },
    { id: "go-notes", label: t("commandPalette.goNotes"), icon: "??", keywords: "notes", run: handleShowNotes },
    { id: "go-trash", label: t("commandPalette.goTrash"), icon: "??", keywords: "trash", run: () => void handleShowTrash() },
    { id: "new-document", label: t("commandPalette.newDocument"), icon: "??", keywords: "new create document", run: () => void handleCreateDocument() },
    { id: "new-note", label: t("commandPalette.newNote"), icon: "??", keywords: "new create note", run: () => void handleCreatePage() },
    { id: "new-study-set", label: t("commandPalette.newStudySet"), icon: "??", keywords: "study set flashcard", run: () => void handleCreateStudySet() },
    { id: "import-pdf", label: t("commandPalette.importPdf"), icon: "??", keywords: "pdf import", run: handleImportPdfClick },
    { id: "import-markdown", label: t("commandPalette.importMarkdown"), icon: "??", keywords: "markdown md import", run: handleImportMarkdownClick },
    { id: "export-current-page", label: t("commandPalette.exportCurrentPage"), icon: "?", keywords: "export markdown pdf", run: () => {
      const page = activePageRef.current;
      if (!page) return;
      if (page.kind === "document") void handleExportPageMarkdown(page.id);
      else void handleExportPageAsPdf(page.id);
    }},
    { id: "export-backup", label: t("commandPalette.exportBackup"), icon: "??", keywords: "backup export", run: () => void handleExportBackup() },
  ];

  if (!isReady) {
    return <div className="flex h-screen w-screen items-center justify-center text-base" style={{ color: "var(--color-sidebar-text)" }}>{t("common.loading")}</div>;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden gap-3 p-3" style={{ backgroundColor: "var(--color-bg)" }}>
      <input ref={pdfInputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={handleImportPdfFile} />
      <input ref={markdownInputRef} type="file" accept=".md,.markdown,.txt,text/markdown,text/plain" className="hidden" onChange={handleImportMarkdownFile} />
      <input ref={backupInputRef} type="file" accept=".json,application/json" className="hidden" onChange={handleImportBackupFile} />

      <ResizablePanel side="left" defaultWidth={300} minWidth={220} maxWidth={480} isCollapsed={isSidebarCollapsed}>
        <Sidebar
          pages={isTrashMode ? trashPages : pages}
          activePageId={isTrashMode || isHomeMode ? null : activePageId}
          selectedTag={selectedTag}
          isTrashMode={isTrashMode}
          isHomeMode={isHomeMode}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
          onSelectTag={setSelectedTag}
          onSelectPage={handleSelectPage}
          onImportPdf={handleImportPdfClick}
          onImportMarkdown={handleImportMarkdownClick}
          onShowHome={handleShowHome}
          onShowNotes={handleShowNotes}
          onShowTrash={handleShowTrash}
          onDeletePage={handleDeletePage}
          onRestorePage={handleRestorePage}
          onPermanentDeletePage={handlePermanentDeletePage}
          onDuplicatePage={handleDuplicatePage}
          onBulkDeletePages={handleBulkDeletePages}
          onBulkRestorePages={handleBulkRestorePages}
          onBulkPermanentDeletePages={handleBulkPermanentDeletePages}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          onToggleFavorite={handleToggleFavorite}
          onRenamePage={handleRenamePage}
          onExportPageMarkdown={handleExportPageMarkdown}
          onExportPageAsPdf={handleExportPageAsPdf}
          onExportPageAsNexusJson={handleExportPageAsNexusJson}
          onAddSubPage={handleAddSubPage}
          theme={theme}
          onThemeChange={onThemeChange}
          onExportBackup={handleExportBackup}
          onImportBackup={handleImportBackupClick}
          sortMode={sortMode}
          onSortModeChange={setSortMode}
          onReorderPages={handleReorderPages}
          pendingRenameId={pendingRenameId}
          onClearPendingRename={handleClearPendingRename}
          onCancelNewPage={handleCancelNewPage}
          onCreateItem={handleCreateItem}
          syncState={syncState}
          onMovePage={handleMovePage}
          onOpenInSplit={handleOpenInSplit}
          isQuickNoteMode={isQuickNoteMode}
          isTodoMode={isTodoMode}
          onShowQuickNotes={handleShowQuickNotes}
          onShowTodoList={handleShowTodoList}
        />
      </ResizablePanel>

      {isHomeMode ? (
        <Dashboard pages={pages} onSelectPage={handleSelectPage} onCreatePage={handleCreatePage} onCreateDocument={handleCreateDocument} onCreateStudySet={handleCreateStudySet} onImportPdf={handleImportPdfClick} onCreatePresentation={handleCreatePresentation} />
      ) : isQuickNoteMode ? (
        <QuickNotesView
          pages={pages}
          onCreate={(txt) => {
            const title = txt.slice(0, 30) || "隨手記";
            void createAndOpenPage({ title, kind: "quick_note" as any, folder: "QuickNotes" }).then((p) => {
              if (p) {
                const updated = { ...p, content_text: txt, content_json: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: txt }] }] } };
                void storageRef.current?.savePage(updated).then(() => {
                  setPages((prev) => prev.map((pp) => pp.id === p.id ? updated : pp));
                  syncEngineRef.current?.pushPage(updated);
                });
              }
            });
          }}
          onUpdate={(id, patch) => {
            setPages((prev) => {
              const next = prev.map((p) => p.id === id ? { ...p, ...patch, updated_at: Date.now(), revision: p.revision + 1 } : p);
              const upd = next.find((p) => p.id === id);
              if (upd && storageRef.current) { void storageRef.current.savePage(upd); syncEngineRef.current?.pushPage(upd); }
              return next;
            });
          }}
          onDelete={(id) => { void handleDeletePage(id); }}
          onSelectPage={handleSelectPage}
        />
      ) : isTodoMode ? (
        <TodoView
          pages={pages}
          onCreate={(title, due) => {
            void createAndOpenPage({ title, kind: "todo" as any }).then((p) => {
              if (p) {
                const updated = { ...p, title, due_date: due || Date.now(), completed: false, updated_at: Date.now(), revision: p.revision + 1 };
                void storageRef.current?.savePage(updated).then(() => {
                  setPages((prev) => prev.map((pp) => pp.id === p.id ? updated : pp));
                  syncEngineRef.current?.pushPage(updated);
                });
              }
            });
          }}
          onUpdate={(id, patch) => {
            setPages((prev) => {
              const next = prev.map((p) => p.id === id ? { ...p, ...patch, updated_at: Date.now(), revision: p.revision + 1 } : p);
              const upd = next.find((p) => p.id === id);
              if (upd && storageRef.current) { void storageRef.current.savePage(upd); syncEngineRef.current?.pushPage(upd); }
              return next;
            });
          }}
          onDelete={(id) => { void handleDeletePage(id); }}
          onSelectPage={handleSelectPage}
        />
      ) : secondaryActivePageId && secondaryActivePage ? (
        <div className="flex flex-1 overflow-hidden gap-2">
          {/* Primary pane */}
          <div className="flex flex-col flex-1 overflow-hidden rounded-2xl" style={{ border: "1px solid var(--color-border)" }}>
            {activePage?.kind === "study_set" ? (
              <StudySetView page={activePage} onTitleChange={handleTitleChange} onUpdateStudyItems={handleUpdateStudyItems} />
            ) : activePage?.kind === "presentation" ? (
              <PresentationView page={activePage} onTitleChange={handleTitleChange} onUpdatePresentation={handleUpdatePresentation} />
            ) : (
              <EditorPane
                page={activePage}
                attachment={activeAttachment}
                pdfUrl={activePdfUrl}
                pdfLoadError={pdfLoadError}
                onTitleChange={handleTitleChange}
                onFolderChange={handleFolderChange}
                onTagsChange={handleTagsChange}
                onContentChange={handleContentChange}
                onFormatChange={handleFormatChange}
                onMarginsChange={handleMarginsChange}
                margins={activePage?.margins}
                onAddSubPage={handleAddSubPage}
                onExportMarkdown={() => activePage && handleExportPageMarkdown(activePage.id)}
                onExportPdf={() => activePage && handleExportPageAsPdf(activePage.id)}
                onExportNexus={() => activePage && handleExportPageAsNexusJson(activePage.id)}
                onNewNote={() => handleCreatePage("flow")}
                onNewDocument={() => handleCreateDocument("a4")}
                onImportPdf={handleImportPdfClick}
                onImportMd={handleImportMarkdownClick}
                onConvertToPresentation={() => handleConvertToPresentation()}
              
                nightAdapt={isPageNightAdapt}
                onToggleNightAdapt={handleTogglePageNightAdapt}
                isSplitView={!!secondaryActivePageId}
                onCloseSplit={handleCloseSplit}
                onSwapSplit={handleSwapSplit}
              />
            )}
          </div>
          {/* Divider with controls */}
          <div className="flex flex-col items-center gap-1 py-2">
            <button onClick={handleSwapSplit} className="w-7 h-7 rounded-md flex items-center justify-center text-xs hover:bg-zinc-200" title="交換左右">⇄</button>
            <div className="flex-1 w-px bg-zinc-300" />
            <button onClick={handleCloseSplit} className="w-7 h-7 rounded-md flex items-center justify-center text-xs hover:bg-zinc-200" title="關閉右側">✕</button>
          </div>
          {/* Secondary pane - Obsidian style closable */}
          <div className="flex flex-col flex-1 overflow-hidden rounded-2xl" style={{ border: "1px solid var(--color-border)" }}>
            {secondaryActivePage.kind === "study_set" ? (
              <StudySetView page={secondaryActivePage} onTitleChange={handleSecondaryTitleChange} onUpdateStudyItems={(items)=>{ handleSecondaryContentChange({ json: secondaryActivePage.content_json, text: secondaryActivePage.content_text }) }} />
            ) : secondaryActivePage.kind === "presentation" ? (
              <PresentationView page={secondaryActivePage} onTitleChange={handleSecondaryTitleChange} onUpdatePresentation={handleSecondaryUpdatePresentation} />
            ) : (
              <EditorPane
                page={secondaryActivePage}
                attachment={secondaryActiveAttachment}
                pdfUrl={secondaryPdfUrl}
                pdfLoadError={secondaryPdfLoadError}
                onTitleChange={handleSecondaryTitleChange}
                onFolderChange={handleSecondaryFolderChange}
                onTagsChange={handleSecondaryTagsChange}
                onContentChange={handleSecondaryContentChange}
                onFormatChange={handleSecondaryFormatChange}
                onMarginsChange={handleSecondaryMarginsChange}
                margins={secondaryActivePage?.margins}
                onAddSubPage={handleAddSubPage}
                onExportMarkdown={() => secondaryActivePage && handleExportPageMarkdown(secondaryActivePage.id)}
                onExportPdf={() => secondaryActivePage && handleExportPageAsPdf(secondaryActivePage.id)}
                onExportNexus={() => secondaryActivePage && handleExportPageAsNexusJson(secondaryActivePage.id)}
                onNewNote={() => handleCreatePage("flow")}
                onNewDocument={() => handleCreateDocument("a4")}
                onImportPdf={handleImportPdfClick}
                onImportMd={handleImportMarkdownClick}
                onConvertToPresentation={() => handleConvertToPresentation(secondaryActivePageId || undefined)}
              
                nightAdapt={isPageNightAdapt}
                onToggleNightAdapt={handleTogglePageNightAdapt}
                isSplitView={!!secondaryActivePageId}
                onCloseSplit={handleCloseSplit}
                onSwapSplit={handleSwapSplit}
              />
            )}
          </div>
        </div>
      ) : activePage?.kind === "study_set" ? (
        <StudySetView page={activePage} onTitleChange={handleTitleChange} onUpdateStudyItems={handleUpdateStudyItems} />
      ) : activePage?.kind === "presentation" ? (
        <PresentationView page={activePage} onTitleChange={handleTitleChange} onUpdatePresentation={handleUpdatePresentation} />
      ) : (
        <EditorPane
          page={activePage}
          attachment={activeAttachment}
          pdfUrl={activePdfUrl}
          pdfLoadError={pdfLoadError}
          onTitleChange={handleTitleChange}
          onFolderChange={handleFolderChange}
          onTagsChange={handleTagsChange}
          onContentChange={handleContentChange}
          onFormatChange={handleFormatChange}
          onMarginsChange={handleMarginsChange}
          margins={activePage?.margins}
          onAddSubPage={handleAddSubPage}
          onExportMarkdown={() => activePage && handleExportPageMarkdown(activePage.id)}
          onExportPdf={() => activePage && handleExportPageAsPdf(activePage.id)}
          onExportNexus={() => activePage && handleExportPageAsNexusJson(activePage.id)}
          onNewNote={() => handleCreatePage("flow")}
          onNewDocument={() => handleCreateDocument("a4")}
          onImportPdf={handleImportPdfClick}
          onImportMd={handleImportMarkdownClick}
                onConvertToPresentation={() => handleConvertToPresentation()}
        
                nightAdapt={isPageNightAdapt}
                onToggleNightAdapt={handleTogglePageNightAdapt}
                isSplitView={!!secondaryActivePageId}
                onCloseSplit={handleCloseSplit}
                onSwapSplit={handleSwapSplit}
              />
      )}

      {!isHomeMode && (
        <ResizablePanel side="right" defaultWidth={320} minWidth={240} maxWidth={520} isCollapsed={isRightPanelCollapsed}>
          <RightPanel page={activePage} pages={pages} isCollapsed={isRightPanelCollapsed} onToggleCollapse={() => setIsRightPanelCollapsed((prev) => !prev)} onSelectPageTitle={handleSelectPageByTitle} />
        </ResizablePanel>
      )}

      <CommandPalette isOpen={isCommandPaletteOpen} onClose={() => setIsCommandPaletteOpen(false)} pages={pages} actions={commandPaletteActions} onSelectPage={handleSelectPage} />

    </div>
  );
}
