"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type MutableRefObject,
  type ChangeEvent,
  type TouchEvent,
} from "react";
import { IndexedDBAdapter } from "../infrastructure/storage/IndexedDBAdapter";
import { nanoid } from "nanoid";
import type {
  Page,
  NovelChapter,
  CharacterProfileData,
  Attachment,
  WorkspaceBackup,
  PageFormat,
  PageMargins,
  CreatePageInput,
  PageKind,
} from "../lib/types";
import { instantiateCharacterTemplate, snapshotCharacterTemplate } from "../lib/characterWorkspace";
import { emptyNovelDocument, getNovelChapters, getWorkspaceEntryPage, splitLegacyNovel } from "../lib/novelChapters";
import { isNovelPage } from "../lib/types";
import type { StorageAdapter } from "../infrastructure/storage/StorageAdapter";
import { createResearchNoteContent, titleFromPdfFileName } from "../lib/pdfNote";
import { titleFromMarkdownFileName, createMarkdownContent, pageToMarkdown } from "../lib/markdown";
import { extractWikilinks } from "../lib/wikilinks";
import { downloadTextFile, safeFileName, downloadJsonFile, formatBackupFileName } from "../lib/fileDownload";
import { DEFAULT_LANGUAGE, detectDefaultLanguage, type Language } from "../lib/i18n";
import { LanguageProvider, useLanguage } from "../lib/LanguageContext";
import { getSupabase, isSupabaseConfigured } from "../infrastructure/supabase/client";
import { SyncEngine, type SyncState } from "../infrastructure/sync/syncEngine";
import { measureRefreshPull } from "../lib/pullToRefresh";
import type { CreateItemType } from "../lib/creationOptions";
import CreationChoiceDialog from "./CreationChoiceDialog";
import Sidebar, { type SortMode } from "./Sidebar";
import { createEmptyPresentation, noteToPresentation } from "../lib/presentation";
import EditorPane from "./EditorPane";
import RightPanel from "./RightPanel";
import StudySetView from "../features/study/components/StudySetView";
import QuizOfflinePrompt from "../features/study/quiz/QuizOfflinePrompt";
import Dashboard from "./Dashboard";
import CommandPalette, { type CommandPaletteAction } from "./CommandPalette";
import ResizablePanel from "./ResizablePanel";
import PresentationView from "./PresentationView";
import CreativeView from "./CreativeView";
import QuickNotesView from "./QuickNotesView";
import TodoView from "./TodoView";
import NewPageDialog, { type NewPageKindChoice } from "./NewPageDialog";
import NovelReaderView from "./NovelReaderView";
import CharacterProfileView from "./CharacterProfileView";
import UtilityView from "./UtilityView";
import FeatureOverview from "./FeatureOverview";
import DevicePreview from "./DevicePreview";
import { createFantasyTemplate, createModernTemplate, createBlankTemplate, createDnd5eTemplate, createCoc7eTemplate } from "../lib/characterTemplates";
import AccountButton from "./AccountButton";

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
  const [isAuthResolved, setIsAuthResolved] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pages, setPages] = useState<Page[]>([]);
  const [trashPages, setTrashPages] = useState<Page[]>([]);
  const [isTrashMode, setIsTrashMode] = useState(false);
  const [isHomeMode, setIsHomeMode] = useState(true);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isDevicePreviewOpen, setIsDevicePreviewOpen] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(1440);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  // Feature interfaces use a Google-style overlay drawer: it never consumes
  // editor canvas width, and is closed by default.
  const [isNavigationOpen, setIsNavigationOpen] = useState(false);
  const [isAppLauncherOpen, setIsAppLauncherOpen] = useState(false);
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
  const [splitPrimaryWidth, setSplitPrimaryWidth] = useState(50);
  const splitContainerRef = useRef<HTMLDivElement>(null);
  const [secondaryPdfUrl, setSecondaryPdfUrl] = useState<string | null>(null);
  const [secondaryPdfLoadError, setSecondaryPdfLoadError] = useState<string | null>(null);
  const [isQuickNoteMode, setIsQuickNoteMode] = useState(false);
  const [isTodoMode, setIsTodoMode] = useState(false);
  const [isCreativeMode, setIsCreativeMode] = useState(false);
  const [isStudySetMode, setIsStudySetMode] = useState(false);
  const [isNovelMode, setIsNovelMode] = useState(false);
  const [isDocumentMode, setIsDocumentMode] = useState(false);
  const [isNoteMode, setIsNoteMode] = useState(false);
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [utilityMode, setUtilityMode] = useState<"web" | "counter" | "draw" | null>(null);
  const [isPageNightAdapt, setIsPageNightAdapt] = useState(false);
  // 2026-08-11：側邊欄「新增筆記」→ 模式選擇對話框（流動/分頁）
  const [characterTemplatePicker, setCharacterTemplatePicker] = useState(false);
  const [createDialog, setCreateDialog] = useState<{ open: boolean; initialKind: PageKind | null }>({ open: false, initialKind: null });
  // 2026-08-11：Markdown 拖曳匯入提示
  const [isDragImportOver, setIsDragImportOver] = useState(false);
  const dragDepthRef = useRef(0);

  const pdfInputRef = useRef<HTMLInputElement | null>(null);
  const markdownInputRef = useRef<HTMLInputElement | null>(null);
  const backupInputRef = useRef<HTMLInputElement | null>(null);
  const activePageRef = useRef<Page | null>(null);
  // A page owns its own debounce. A single global timer made simultaneous
  // edits in split view cancel one another's saves.
  const saveTimersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const pendingSavesRef = useRef(new Map<string, Page>());
  const activeSavesRef = useRef(new Map<string, Promise<void>>());
  const syncEngineRef = useRef<SyncEngine | null>(null);
  const sidebarCreateInFlightRef = useRef(false);
  const [syncState, setSyncState] = useState<SyncState>({ status: "idle", lastSyncAt: 0, error: null, pendingPushes: 0 });
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [isNovelMoreOpen, setIsNovelMoreOpen] = useState(false);
  const [novelContinueEditSignal, setNovelContinueEditSignal] = useState(0);
  const [globalPullDistance, setGlobalPullDistance] = useState(0);
  const [isGlobalRefreshing, setIsGlobalRefreshing] = useState(false);
  const globalPullStartRef = useRef<{ x: number; y: number; time: number; container: HTMLElement } | null>(null);
  const refreshReadyRef = useRef(false);
  const refreshBusyRef = useRef(false);
  const [refreshReady, setRefreshReady] = useState(false);
  const [refreshError, setRefreshError] = useState("");

  const activePage = pages.find((p) => p.id === activePageId) || null;
  const isActiveNovel = !!activePage && isNovelPage(activePage);
  const activeAttachment = activePage?.primary_attachment_id
    ? attachments.find((a) => a.id === activePage.primary_attachment_id) || null
    : null;
  const secondaryActivePage = pages.find((p) => p.id === secondaryActivePageId) || null;
  const secondaryActiveAttachment = secondaryActivePage?.primary_attachment_id
    ? attachments.find((a) => a.id === secondaryActivePage.primary_attachment_id) || null
    : null;
  useEffect(() => {
    activePageRef.current = activePage;
  }, [activePage]);

  const isFeatureInterface = isHomeMode || isTrashMode || isQuickNoteMode || isTodoMode || isStudySetMode || isNovelMode || isDocumentMode || isNoteMode || isPresentationMode || !!utilityMode ||
    (isCreativeMode && (!activePage || activePage.kind !== "creative"));
  const isTabletViewport = viewportWidth < 1024;
  const isMobileViewport = viewportWidth < 768;

  useEffect(() => {
    const updateViewport = () => setViewportWidth(window.innerWidth);
    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  useEffect(() => {
    if (!isTabletViewport || !secondaryActivePageId) return;
    setSecondaryActivePageId(null);
    setSecondaryPdfUrl(null);
    setSecondaryPdfLoadError(null);
  }, [isTabletViewport, secondaryActivePageId]);

  useEffect(() => {
    // A narrow editor starts with its page switcher tucked away; users can
    // still expand the rail with its own toggle when they need it.
    if (isMobileViewport) setIsSidebarCollapsed(true);
  }, [isMobileViewport]);

  useEffect(() => {
    // On tablets and phones the auxiliary panel is a drawer, never a second
    // column competing with the editor's usable width.
    if (isTabletViewport) setIsRightPanelCollapsed(true);
  }, [isTabletViewport]);

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
    let syncRun = 0;
    let authSubscription: { unsubscribe: () => void } | null = null;
    const adapter = new IndexedDBAdapter();

    async function init() {
      await adapter.init();
      if (cancelled) return;
      storageRef.current = adapter;

      // Resolve an existing session before reading IndexedDB. Without this,
      // a signed-in user could briefly see the anonymous workspace while the
      // app is starting up.
      let hasAuthenticatedSession = false;
      if (isSupabaseConfigured()) {
        const initialSupabase = getSupabase();
        if (initialSupabase) {
          const { data: { session } } = await initialSupabase.auth.getSession();
          if (cancelled) return;
          setAccountEmail(session?.user.email || null);
          setIsAuthenticated(!!session?.user);
          setIsAuthResolved(true);
          if (session?.user) {
            hasAuthenticatedSession = true;
            await adapter.claimAnonymousWorkspace?.(session.user.id);
            adapter.setWorkspaceOwner(session.user.id);
          }
        }
      } else {
        setIsAuthResolved(true);
      }

      let allPages: Page[] = [];
      let allAttachments: Attachment[] = [];
      if (hasAuthenticatedSession) {
        allPages = await adapter.listPages();
        allAttachments = await adapter.listAttachments();
      }

      // 2026-08-11：舊資料遷移——筆記/文檔若為 a4/16:9/4:3/custom，
      // 一律改為流動（分頁已改為「手動 A4 頁面」新模式，舊自動分頁資料以流動顯示）
      const LEGACY_PAGED = new Set(["a4", "16:9", "4:3", "custom"]);
      let migratedAny = false;
      for (const p of allPages) {
        if ((p.kind === "note" || p.kind === "document") && p.format && LEGACY_PAGED.has(p.format)) {
          await adapter.savePage({ ...p, format: "flow" });
          migratedAny = true;
        }
      }
      if (migratedAny) allPages = await adapter.listPages();

      setPages(allPages);
      setAttachments(allAttachments);

      const savedLanguage = await adapter.getLanguagePreference();
      if (savedLanguage === "en" || savedLanguage === "zh-TW") onLanguageLoaded(savedLanguage);
      else onLanguageLoaded(detectDefaultLanguage());

      const savedTheme = await adapter.getThemePreference();
      if (savedTheme === "dark" || savedTheme === "light") onThemeChange(savedTheme);

      const savedNightAdapt = await adapter.getPageNightAdaptPreference();
      if (savedNightAdapt === true) setIsPageNightAdapt(true);

      const savedId = hasAuthenticatedSession ? await adapter.getActivePageId() : null;
      const savedPage = getWorkspaceEntryPage(allPages, savedId);
      setActivePageId(savedPage?.id ?? null);
      await adapter.setActivePageId(savedPage?.id ?? null);

      setIsReady(true);

      if (isSupabaseConfigured()) {
        const supabase = getSupabase();
        if (supabase) {
          const deviceId = await adapter.getDeviceId();
          const startAccountSync = async (userId: string) => {
            const thisRun = ++syncRun;
            syncEngineRef.current?.destroy();
            // A browser's IndexedDB is shared by every account. Select the
            // signed-in account's cache before any pull or push can run.
            await adapter.claimAnonymousWorkspace?.(userId);
            adapter.setWorkspaceOwner(userId);
            const engine = new SyncEngine(supabase, adapter, deviceId, userId);
            syncEngineRef.current = engine;
            engine.subscribe(setSyncState);
            engine.setOnRemoteChange(async () => {
              if (cancelled || thisRun !== syncRun || syncEngineRef.current !== engine) return;
              const syncedPages = await adapter.listPages();
              const syncedAttachments = await adapter.listAttachments();
              if (cancelled || thisRun !== syncRun || syncEngineRef.current !== engine) return;
              setPages(syncedPages);
              setAttachments(syncedAttachments);
            });
            await engine.fullSync();
            if (cancelled || thisRun !== syncRun || syncEngineRef.current !== engine) return;
            // A newly registered account starts truly empty. Creating a
            // placeholder here used to leave every account with an unwanted
            // "Untitled" document, even when the user had not made anything.
            const accountPages = await adapter.listPages();
            setPages(accountPages);
            setAttachments(await adapter.listAttachments());
            const storedActiveId = await adapter.getActivePageId();
            const nextActiveId = getWorkspaceEntryPage(accountPages, storedActiveId)?.id ?? null;
            setActivePageId(nextActiveId);
            await adapter.setActivePageId(nextActiveId);
            engine.startRealtime();
          };

          const { data: { session } } = await supabase.auth.getSession();
          setAccountEmail(session?.user.email || null);
          setIsAuthenticated(!!session?.user);
          setIsAuthResolved(true);
          if (session?.user) await startAccountSync(session.user.id);
          else setSyncState({ status: "offline", lastSyncAt: 0, error: null, pendingPushes: 0 });

          const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
            setAccountEmail(nextSession?.user.email || null);
            setIsAuthenticated(!!nextSession?.user);
            setIsAuthResolved(true);
            if (event === "SIGNED_OUT" || !nextSession?.user) {
              syncRun += 1;
              syncEngineRef.current?.destroy();
              syncEngineRef.current = null;
              adapter.setWorkspaceOwner(null);
              // Remove account state immediately. The anonymous workspace is
              // loaded afterwards, so a slow IndexedDB read can never leave
              // private account pages visible in the signed-out UI.
              setPages([]);
              setAttachments([]);
              setTrashPages([]);
              setActivePageId(null);
              setSecondaryActivePageId(null);
              void Promise.all([adapter.listPages(), adapter.listAttachments()]).then(([localPages, localAttachments]) => {
                if (!cancelled) {
                  setPages(localPages);
                  setAttachments(localAttachments);
                  setActivePageId(getWorkspaceEntryPage(localPages)?.id ?? null);
                }
              });
              setSyncState({ status: "offline", lastSyncAt: 0, error: null, pendingPushes: 0 });
              return;
            }
            void startAccountSync(nextSession.user.id);
          });
          authSubscription = subscription;
        }
      }
    }

    init().catch((error) => {
      console.error(error);
      setIsAuthResolved(true);
      setIsReady(true);
    });

    return () => {
      cancelled = true;
      syncRun += 1;
      authSubscription?.unsubscribe();
      syncEngineRef.current?.destroy();
      // Do not explicitly close this connection here. React Strict Mode can
      // run effect cleanup while its in-flight initial sync is still settling,
      // which otherwise aborts IndexedDB transactions with "connection is closing".
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const flushSave = useCallback(async (pageToSave: Page) => {
    const latestPage = pendingSavesRef.current.get(pageToSave.id) ?? pageToSave;
    const timer = saveTimersRef.current.get(latestPage.id);
    if (timer) clearTimeout(timer);
    saveTimersRef.current.delete(latestPage.id);
    if (!storageRef.current) throw new Error("Storage unavailable");
    pendingSavesRef.current.set(latestPage.id, latestPage);
    const previous = activeSavesRef.current.get(latestPage.id);
    const operation = (async () => {
      // Serialize writes to the same page; a later successful retry supersedes a failed write.
      if (previous) await previous.catch(() => undefined);
      const nextPage = { ...latestPage, updated_at: Date.now(), revision: latestPage.revision + 1 };
      await storageRef.current!.savePage(nextPage);
      if (pendingSavesRef.current.get(latestPage.id) === latestPage) pendingSavesRef.current.delete(latestPage.id);
      syncEngineRef.current?.pushPage(nextPage);
    })();
    activeSavesRef.current.set(latestPage.id, operation);
    try { await operation; }
    finally { if (activeSavesRef.current.get(latestPage.id) === operation) activeSavesRef.current.delete(latestPage.id); }
  }, [storageRef]);
  const flushAllSaves = useCallback(async () => {
    do {
      const pending = [...pendingSavesRef.current.values()];
      await Promise.all(pending.map((page) => flushSave(page)));
      await Promise.all([...activeSavesRef.current.values()]);
    } while (pendingSavesRef.current.size || activeSavesRef.current.size);
  }, [flushSave]);
  const scheduleSave = useCallback((page: Page) => {
    const previousTimer = saveTimersRef.current.get(page.id);
    if (previousTimer) clearTimeout(previousTimer);
    pendingSavesRef.current.set(page.id, page);
    const timer = setTimeout(() => void flushSave(page).catch((error) => { console.error(error); setRefreshError("儲存未完成，內容仍保留在目前頁面，請稍後重試。"); }), 800);
    saveTimersRef.current.set(page.id, timer);
  }, [flushSave]);

  // M1 fix: 統一的 page patch helper——更新欄位時同步 refresh updated_at，
  // 讓「最近編輯」排序在 session 內即時正確（state 不再落後 DB）。
  // revision 維持「持久化版本」語意，仍由 flushSave 在寫入 DB 時 +1。
  const patchPage = useCallback((id: string, patch: Partial<Page>) => {
    setPages((prev) => {
      const next = prev.map((p) => (p.id === id ? { ...p, ...patch, updated_at: Date.now() } : p));
      const updated = next.find((p) => p.id === id);
      if (updated) scheduleSave(updated);
      return next;
    });
  }, [scheduleSave]);

  const chapterMutationRef = useRef(new Set<string>());
  const createNovelChapter = useCallback(async (novelId: string): Promise<NovelChapter> => {
    const storage = storageRef.current;
    const novel = pages.find((page) => page.id === novelId);
    if (!storage || !novel || !novel.novel_settings?.chaptersEnabled) throw new Error("Chapter workspace is not enabled");
    const chapters = getNovelChapters(pages, novelId);
    const now = Date.now();
    const chapter: NovelChapter = {
      id: `chapter_${nanoid()}`, kind: "novel_chapter", parent_id: novelId,
      sort_order: Math.max(-1, ...chapters.map((item) => item.sort_order)) + 1,
      title: `第${chapters.length + 1}章`, content_json: emptyNovelDocument(), content_text: "",
      created_at: now, updated_at: now, deleted_at: null, revision: 1,
      device_id: await storage.getDeviceId(), default_mode: "note", workspace_owner_id: novel.workspace_owner_id,
    };
    await storage.savePage(chapter);
    setPages((prev) => [...prev, chapter]);
    void syncEngineRef.current?.pushPage(chapter);
    return chapter;
  }, [pages]);

  const enableNovelChapters = useCallback(async (novelId: string) => {
    if (chapterMutationRef.current.has(novelId)) return;
    const storage = storageRef.current;
    if (!storage) throw new Error("Storage unavailable");
    chapterMutationRef.current.add(novelId);
    try {
      await flushAllSaves();
      const novel = await storage.getPage(novelId);
      if (!novel || novel.novel_settings?.chaptersEnabled) return;
      const now = Date.now();
      const device_id = await storage.getDeviceId();
      const parts = splitLegacyNovel(novel);
      if (!parts.length) parts.push({ title: "第1章", content_json: emptyNovelDocument(), content_text: "" });
      const chapters: NovelChapter[] = parts.map((part, sort_order) => ({
        ...part, id: `chapter_${nanoid()}`, kind: "novel_chapter", parent_id: novelId, sort_order,
        created_at: now, updated_at: now, deleted_at: null, revision: 1, device_id,
        default_mode: "note", workspace_owner_id: novel.workspace_owner_id,
      }));
      const updated: Page = { ...novel, novel_settings: { ...novel.novel_settings, chaptersEnabled: true },
        content_json: emptyNovelDocument(), content_text: "", updated_at: now, revision: novel.revision + 1 };
      await storage.savePages([...chapters, updated]);
      setPages((prev) => [...prev.map((page) => page.id === novelId ? updated : page), ...chapters]);
      await syncEngineRef.current?.pushPages([...chapters, updated]);
    } finally { chapterMutationRef.current.delete(novelId); }
  }, [flushAllSaves]);

  const saveCharacterTemplate = useCallback(async (source: Page, title: string, data: CharacterProfileData) => {
    const storage = storageRef.current;
    if (!storage) throw new Error("Storage unavailable");
    const now = Date.now();
    const template: Page = {
      id: `template_${nanoid()}`, title, kind: "creative", creative_type: "character",
      character_data: snapshotCharacterTemplate(data), content_json: emptyNovelDocument(), content_text: "",
      default_mode: "note", created_at: now, updated_at: now, deleted_at: null, revision: 1,
      device_id: await storage.getDeviceId(), workspace_owner_id: source.workspace_owner_id,
      attachment_ids: [...(source.attachment_ids || [])],
    };
    await storage.savePage(template);
    setPages((prev) => [template, ...prev]);
    void syncEngineRef.current?.pushPage(template);
  }, []);

  const getNovelCoverBlob = useCallback(async (attachmentId: string) => {
    return storageRef.current?.readBinary(attachmentId) || null;
  }, [storageRef]);

  const uploadNovelCover = useCallback(async (pageId: string, file: File) => {
    const storage = storageRef.current;
    if (!storage?.createAttachment) throw new Error("Attachment storage is unavailable");
    const target = pages.find((item) => item.id === pageId);
    const previousAttachmentId = target?.novel_settings?.coverAttachmentId;
    const attachment = await storage.createAttachment({
      kind: "image",
      name: file.name,
      mime_type: file.type || "image/*",
      size_bytes: file.size,
    });
    await storage.attachBinary(attachment.id, file);
    setAttachments((previous) => [...previous.filter((item) => item.id !== attachment.id), attachment]);
    await syncEngineRef.current?.pushAttachment(attachment);
    await syncEngineRef.current?.pushBinary(attachment.id, file);
    if (target) patchPage(pageId, { novel_settings: { ...target.novel_settings, coverAttachmentId: attachment.id } });

    // Replacing a cover should not leave the previous private image visible in
    // storage forever. Preserve it only when another page deliberately reuses it.
    if (previousAttachmentId) {
      const isStillReferenced = pages.some((item) => item.id !== pageId && (
        item.novel_settings?.coverAttachmentId === previousAttachmentId ||
        item.primary_attachment_id === previousAttachmentId ||
        item.attachment_ids?.includes(previousAttachmentId)
      ));
      const previousAttachment = attachments.find((item) => item.id === previousAttachmentId);
      if (previousAttachment && !isStillReferenced) {
        const removedAttachment = { ...previousAttachment, deleted_at: Date.now(), updated_at: Date.now() };
        await storage.saveAttachment(removedAttachment);
        setAttachments((items) => items.filter((item) => item.id !== previousAttachmentId));
        await syncEngineRef.current?.pushAttachment(removedAttachment);
      }
    }
  }, [attachments, pages, patchPage]);

  const uploadCharacterGalleryImage = useCallback(async (pageId: string, file: File) => {
    const storage = storageRef.current;
    if (!storage?.createAttachment) throw new Error("Attachment storage is unavailable");
    if (!file.type.startsWith("image/")) throw new Error("Gallery files must be images");
    const attachment = await storage.createAttachment({ kind: "image", name: file.name, mime_type: file.type || "image/*", size_bytes: file.size });
    await storage.attachBinary(attachment.id, file);
    setAttachments((current) => [...current.filter((item) => item.id !== attachment.id), attachment]);
    await syncEngineRef.current?.pushAttachment(attachment);
    await syncEngineRef.current?.pushBinary(attachment.id, file);
    const target = pages.find((item) => item.id === pageId);
    if (target) patchPage(pageId, { attachment_ids: [...(target.attachment_ids || []), attachment.id] });
    return attachment.id;
  }, [pages, patchPage]);

  const removeNovelCover = useCallback(async (pageId: string) => {
    const page = pages.find((item) => item.id === pageId);
    const attachmentId = page?.novel_settings?.coverAttachmentId;
    if (!page || !attachmentId) return;

    patchPage(pageId, { novel_settings: { ...page.novel_settings, coverAttachmentId: null } });

    // An attachment can theoretically be reused by another page. Only retire
    // a cover asset when no page still points to it in any attachment field.
    const isStillReferenced = pages.some((item) => item.id !== pageId && (
      item.novel_settings?.coverAttachmentId === attachmentId ||
      item.primary_attachment_id === attachmentId ||
      item.attachment_ids?.includes(attachmentId)
    ));
    const attachment = attachments.find((item) => item.id === attachmentId);
    if (!attachment || isStillReferenced || !storageRef.current) return;

    const removedAttachment = { ...attachment, deleted_at: Date.now(), updated_at: Date.now() };
    await storageRef.current.saveAttachment(removedAttachment);
    setAttachments((items) => items.filter((item) => item.id !== attachmentId));
    await syncEngineRef.current?.pushAttachment(removedAttachment);
  }, [attachments, pages, patchPage]);

  // 2026-08-11：Markdown 拖曳匯入（視窗級 dragover/drop）
  useEffect(() => {
    if (!isAuthenticated) return;
    const hasMarkdownFile = (dt: DataTransfer | null): boolean => {
      if (!dt) return false;
      return Array.from(dt.items || []).some((item) => {
        if (item.kind !== "file") return false;
        const name = (item.getAsFile()?.name || "").toLowerCase();
        return name.endsWith(".md") || name.endsWith(".markdown") || name.endsWith(".txt");
      });
    };
    const onDragOver = (e: DragEvent) => {
      if (hasMarkdownFile(e.dataTransfer)) {
        e.preventDefault();
        if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
      }
    };
    const onDragEnter = (e: DragEvent) => {
      if (hasMarkdownFile(e.dataTransfer)) {
        e.preventDefault();
        dragDepthRef.current += 1;
        setIsDragImportOver(true);
      }
    };
    const onDragLeave = (e: DragEvent) => {
      if (hasMarkdownFile(e.dataTransfer)) {
        dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
        if (dragDepthRef.current === 0) setIsDragImportOver(false);
      }
    };
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      dragDepthRef.current = 0;
      setIsDragImportOver(false);
      const file = Array.from(e.dataTransfer?.files || []).find((f) => {
        const n = f.name.toLowerCase();
        return n.endsWith(".md") || n.endsWith(".markdown") || n.endsWith(".txt") || f.type === "text/markdown" || f.type === "text/plain";
      });
      if (file) void importMarkdownFileRef.current(file);
    };
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("dragenter", onDragEnter);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("dragenter", onDragEnter);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("drop", onDrop);
    };
  }, [isAuthenticated]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (activePageRef.current) void flushSave(activePageRef.current);
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [flushSave]);

  const activatePage = useCallback(async (id: string) => {
    setIsHomeMode(false);
    setIsTrashMode(false);
    setIsQuickNoteMode(false);
    setIsTodoMode(false);
    setIsStudySetMode(false);
    setIsNovelMode(false);
    setIsDocumentMode(false);
    setIsNoteMode(false);
    setIsPresentationMode(false);
    const target = pages.find((p) => p.id === id);
    if (target?.kind === "creative") {
      setIsCreativeMode(true);
    } else {
      setIsCreativeMode(false);
    }
    setActivePageId(id);
    if (storageRef.current) await storageRef.current.setActivePageId(id);
  }, [pages, storageRef]);

  const handleSelectPage = useCallback(async (id: string) => {
    if (activePageRef.current) await flushSave(activePageRef.current);
    await activatePage(id);
  }, [activatePage, flushSave]);

  const createAndOpenPage = useCallback(async (input: CreatePageInput) => {
    if (!storageRef.current) return;
    if (activePageRef.current) await flushSave(activePageRef.current);
    const newPage = await storageRef.current.createPage(input);
    setUtilityMode(input.kind === "web" || input.kind === "counter" || input.kind === "draw" ? input.kind : null);
    setIsTrashMode(false);
    setIsHomeMode(false);
    setIsQuickNoteMode(false);
    setIsTodoMode(false);
    setIsStudySetMode(false);
    setIsNovelMode(false);
    setIsDocumentMode(false);
    setIsNoteMode(false);
    setIsPresentationMode(false);
    if (input.kind === "creative") {
      setIsCreativeMode(true);
    } else {
      setIsCreativeMode(false);
    }
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

  const handleCreateDocument = useCallback(async (format: PageFormat = "flow") => {
    // 2026-08-11：文檔一律流動
    await createAndOpenPage({ kind: "document", format: "flow" });
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
    if (activePageId) patchPage(activePageId, { presentation_data: data });
  }, [activePageId, patchPage]);

  const handleSecondaryUpdatePresentation = useCallback((data: any) => {
    if (secondaryActivePageId) patchPage(secondaryActivePageId, { presentation_data: data });
  }, [secondaryActivePageId, patchPage]);

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

  const handleCreateCharacter = async (templateId = "blank") => {
    let initialData = createBlankTemplate();
    if (templateId === "fantasy") initialData = createFantasyTemplate();
    if (templateId === "modern") initialData = createModernTemplate();
    if (templateId === "blank") initialData = createBlankTemplate();
    if (templateId === "dnd5e") initialData = createDnd5eTemplate();
    if (templateId === "coc7e") initialData = createCoc7eTemplate();
    const customTemplate = pages.find((page) => page.id === templateId && page.character_data?.isTemplate && !page.deleted_at);
    if (customTemplate?.character_data) initialData = customTemplate.character_data;
    initialData = instantiateCharacterTemplate(initialData, customTemplate?.id);

    const p = await createAndOpenPage({
      kind: "creative" as any,
      title: initialData.basic.name || "新角色檔案",
      format: "flow",
    });
    if (p) {
      patchPage(p.id, {
        creative_type: "character",
        character_data: initialData,
        attachment_ids: [...(customTemplate?.attachment_ids || [])],
      });
    }

  };

  const handleCreateItem = useCallback(async (type: CreateItemType) => {
    if (type === "character") { setCharacterTemplatePicker(true); return; }
    if (type === "note_flow" || type === "note_paged") {
      if (sidebarCreateInFlightRef.current) return;
      sidebarCreateInFlightRef.current = true;
      try { await createAndOpenPage({ kind: "note", format: type === "note_flow" ? "flow" : "paged", title: "" }); }
      finally { sidebarCreateInFlightRef.current = false; }
      return;
    }
    if (["novel", "world", "web", "counter", "draw", "quick_note", "todo"].includes(type)) {
      if (sidebarCreateInFlightRef.current) return;
      sidebarCreateInFlightRef.current = true;
      try {
        const titles: Record<string, string> = { novel: "新小說作品", world: "新世界觀", web: "新網頁", counter: "新計數", draw: "新抽選", quick_note: "隨手記", todo: "新事項" };
        const page = await createAndOpenPage({ kind: type === "novel" || type === "world" ? "creative" : type as PageKind, format: "flow", title: titles[type] });
        if (page && type === "novel") patchPage(page.id, { creative_type: "novel", novel_settings: { chaptersEnabled: true, theme: "parchment", fontSize: 18, fontFamily: "serif", lineHeight: 2, paragraphIndent: true, showWordCount: true } });
        if (page && type === "world") { const data = createBlankTemplate(); data.basic.name = titles.world; data.basic.role = "世界觀設定"; patchPage(page.id, { creative_type: "world", character_data: data }); }
        if (page && type === "todo") patchPage(page.id, { due_date: Date.now(), completed: false });
      } finally { sidebarCreateInFlightRef.current = false; }
      return;
    }
    if (type === "presentation") {
      setCreateDialog({ open: true, initialKind: "presentation" });
      return;
    }
    if (type === "note") {
      // 2026-08-11：筆記建立後選「流動 / 分頁」（開啟模式選擇對話框）
      setCreateDialog({ open: true, initialKind: "note" });
      return;
    }
    if (type === "document") {
      // 文檔一律流動，直接建立（單一使用者事件，防重複）
      if (sidebarCreateInFlightRef.current) return;
      sidebarCreateInFlightRef.current = true;
      try {
        const newPage = await createAndOpenPage({ kind: "document", format: "flow", title: "" });
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
  }, [createAndOpenPage, patchPage]);

  // 2026-08-11：模式選擇對話框確認（筆記：流動/分頁）
  const handleConfirmCreateDialog = useCallback(async (kind: NewPageKindChoice, format: PageFormat) => {
    setCreateDialog({ open: false, initialKind: null });
    if (sidebarCreateInFlightRef.current) return;
    sidebarCreateInFlightRef.current = true;
    try {
      const newPage = await createAndOpenPage({ kind, format, title: "" });
      if (newPage) setPendingRenameId(newPage.id);
    } finally {
      sidebarCreateInFlightRef.current = false;
    }
  }, [createAndOpenPage]);

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

  const handlePinPages = useCallback(async (ids: string[]) => {
    if (!storageRef.current || ids.length === 0) return;
    const idSet = new Set(ids);
    const now = Date.now();
    const changed = new Map<string, Page>();
    const allPinned = ids.every((id) => (pages.find((item) => item.id === id)?.sort_order ?? 0) < 0);
    ids.forEach((id, index) => {
      const page = pages.find((item) => item.id === id);
      if (!page) return;
      const updated = { ...page, sort_order: allPinned ? undefined : -10000 + index, updated_at: now, revision: page.revision + 1 };
      changed.set(id, updated);
    });
    for (const page of changed.values()) {
      await storageRef.current.savePage(page);
      syncEngineRef.current?.pushPage(page);
    }
    if (idSet.size) setPages((current) => current.map((page) => changed.get(page.id) ?? page));
  }, [pages, storageRef]);

  const handleSetPagesFolder = useCallback(async (ids: string[], folder: string | null) => {
    if (!storageRef.current || ids.length === 0) return;
    const idSet = new Set(ids);
    const now = Date.now();
    const changed = new Map<string, Page>();
    for (const page of pages) {
      if (!idSet.has(page.id)) continue;
      const updated = { ...page, folder, updated_at: now, revision: page.revision + 1 };
      await storageRef.current.savePage(updated);
      syncEngineRef.current?.pushPage(updated);
      changed.set(page.id, updated);
    }
    setPages((current) => current.map((page) => changed.get(page.id) ?? page));
  }, [pages, storageRef]);

  const cancelGlobalPull = () => {
    globalPullStartRef.current = null;
    refreshReadyRef.current = false;
    setRefreshReady(false);
    setGlobalPullDistance(0);
  };
  const reloadWorkspace = async () => {
    if (refreshBusyRef.current) return;
    refreshBusyRef.current = true;
    setIsGlobalRefreshing(true);
    setRefreshError("");
    try {
      await flushAllSaves();
      window.location.reload();
    } catch (error) {
      console.error("Failed to save before refresh", error);
      setRefreshError("儲存未完成，已取消刷新，請稍後重試。");
      refreshBusyRef.current = false;
      setIsGlobalRefreshing(false);
    }
  };
  const beginGlobalPull = (event: TouchEvent<HTMLDivElement>) => {
    cancelGlobalPull();
    if (event.touches.length !== 1 || refreshBusyRef.current) return;
    const target = event.target as HTMLElement;
    if (target.closest("input, textarea, button, a, select, [contenteditable], [role='dialog'], [data-side-panel]")) return;
    if (!window.getSelection()?.isCollapsed) return;
    const container = target.closest<HTMLElement>("[data-pull-refresh]");
    const touch = event.touches[0];
    if (!container || container.scrollTop > 0 || touch.clientY - container.getBoundingClientRect().top > 80) return;
    // A nested scroller must keep its own gestures, even at its upper edge.
    for (let element = target; element && element !== container; element = element.parentElement!) {
      if (/(auto|scroll)/.test(window.getComputedStyle(element).overflowY) && element.scrollHeight > element.clientHeight) return;
    }
    globalPullStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now(), container };
  };
  const moveGlobalPull = (event: TouchEvent<HTMLDivElement>) => {
    const start = globalPullStartRef.current;
    if (!start) return;
    if (event.touches.length !== 1 || start.container.scrollTop > 0) { cancelGlobalPull(); return; }
    const touch = event.touches[0];
    const pull = measureRefreshPull(touch.clientX - start.x, touch.clientY - start.y, Date.now() - start.time);
    if (pull.cancelled) { cancelGlobalPull(); return; }
    refreshReadyRef.current = pull.ready;
    setRefreshReady(pull.ready);
    setGlobalPullDistance(pull.distance);
  };
  const endGlobalPull = () => {
    const shouldRefresh = refreshReadyRef.current;
    cancelGlobalPull();
    if (shouldRefresh) void reloadWorkspace();
  };

  const closeMobilePanelsWhenEditing = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isTabletViewport || isFeatureInterface || (isSidebarCollapsed && isRightPanelCollapsed)) return;
    const target = event.target as HTMLElement;
    if (target.closest("[data-side-panel], [role='dialog'], dialog")) return;
    if (target.closest("[contenteditable='true'], textarea, input")) {
      setIsSidebarCollapsed(true);
      setIsRightPanelCollapsed(true);
    }
  };



  const loadTrashPages = useCallback(async () => {
    if (!storageRef.current) return;
    const allPages = await storageRef.current.listPages({ includeDeleted: true });
    setTrashPages(allPages.filter((page) => page.deleted_at !== null));
  }, [storageRef]);

  const closeFeatureOverviews = () => { setIsStudySetMode(false); setIsNovelMode(false); setIsDocumentMode(false); setIsNoteMode(false); setIsPresentationMode(false); setUtilityMode(null); };
  const handleShowNotes = useCallback(() => { setIsTrashMode(false); setIsHomeMode(false); setIsQuickNoteMode(false); setIsTodoMode(false); setIsCreativeMode(false); closeFeatureOverviews(); }, []);

  // Q-7: night adapt is a global preference, persisted via StorageAdapter (settings store)
  const handleTogglePageNightAdapt = useCallback(() => {
    setIsPageNightAdapt((prev) => {
      const next = !prev;
      void storageRef.current?.setPageNightAdaptPreference?.(next);
      return next;
    });
  }, [storageRef]);
  const handleShowHome = useCallback(() => { setIsTrashMode(false); setIsHomeMode(true); setIsQuickNoteMode(false); setIsTodoMode(false); setIsCreativeMode(false); closeFeatureOverviews(); }, []);
  const handleShowQuickNotes = useCallback(() => { setIsTrashMode(false); setIsHomeMode(false); setIsQuickNoteMode(true); setIsTodoMode(false); setIsCreativeMode(false); closeFeatureOverviews(); }, []);
  const handleShowTodoList = useCallback(() => { setIsTrashMode(false); setIsHomeMode(false); setIsQuickNoteMode(false); setIsTodoMode(true); setIsCreativeMode(false); closeFeatureOverviews(); }, []);
  const handleShowCreative = useCallback(() => {
    setIsTrashMode(false);
    setIsHomeMode(false);
    setIsQuickNoteMode(false);
    setIsTodoMode(false);
    setIsCreativeMode(true);
    closeFeatureOverviews();
    setActivePageId(null);
  }, []);
  const handleShowStudySets = useCallback(() => { setIsTrashMode(false); setIsHomeMode(false); setIsQuickNoteMode(false); setIsTodoMode(false); setIsCreativeMode(false); setIsNovelMode(false); setIsDocumentMode(false); setIsStudySetMode(true); setActivePageId(null); }, []);
  const handleShowNovels = useCallback(() => { setIsTrashMode(false); setIsHomeMode(false); setIsQuickNoteMode(false); setIsTodoMode(false); setIsCreativeMode(false); setIsStudySetMode(false); setIsDocumentMode(false); setIsNovelMode(true); setActivePageId(null); }, []);
  const handleShowDocuments = useCallback(() => { setIsTrashMode(false); setIsHomeMode(false); setIsQuickNoteMode(false); setIsTodoMode(false); setIsCreativeMode(false); setIsStudySetMode(false); setIsNovelMode(false); setIsDocumentMode(true); setActivePageId(null); }, []);
  const handleShowNotesOverview = useCallback(() => { setIsTrashMode(false); setIsHomeMode(false); setIsQuickNoteMode(false); setIsTodoMode(false); setIsCreativeMode(false); setIsStudySetMode(false); setIsNovelMode(false); setIsDocumentMode(false); setIsPresentationMode(false); setIsNoteMode(true); setActivePageId(null); }, []);
  const handleShowPresentations = useCallback(() => { setIsTrashMode(false); setIsHomeMode(false); setIsQuickNoteMode(false); setIsTodoMode(false); setIsCreativeMode(false); setIsStudySetMode(false); setIsNovelMode(false); setIsDocumentMode(false); setIsNoteMode(false); setIsPresentationMode(true); setActivePageId(null); }, []);
  const handleShowUtility = useCallback((kind: "web" | "counter" | "draw") => { setIsTrashMode(false); setIsHomeMode(false); setIsQuickNoteMode(false); setIsTodoMode(false); setIsCreativeMode(false); setIsStudySetMode(false); setIsNovelMode(false); setIsDocumentMode(false); setIsNoteMode(false); setIsPresentationMode(false); setUtilityMode(kind); setActivePageId(null); }, []);

  useEffect(() => {
    const openUtility = (event: Event) => {
      const kind = (event as CustomEvent<"web" | "counter" | "draw">).detail;
      if (kind === "web" || kind === "counter" || kind === "draw") handleShowUtility(kind);
    };
    window.addEventListener("nexus-open-utility", openUtility);
    return () => window.removeEventListener("nexus-open-utility", openUtility);
  }, [handleShowUtility]);
  const handleShowTrash = useCallback(async () => {
    if (activePageRef.current) await flushSave(activePageRef.current);
    await loadTrashPages();
    setIsTrashMode(true);
    setIsHomeMode(false);
    setIsQuickNoteMode(false);
    setIsTodoMode(false);
    setIsCreativeMode(false);
    closeFeatureOverviews();
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

  const permanentlyDeleteNovelChapters = useCallback(async (novelIds: string[]) => {
    const storage = storageRef.current;
    if (!storage) return;
    const chapters = (await storage.listPages({ includeDeleted: true })).filter((page) => page.kind === "novel_chapter" && novelIds.includes(page.parent_id || ""));
    for (const chapter of chapters) {
      const timer = saveTimersRef.current.get(chapter.id);
      if (timer) clearTimeout(timer);
      saveTimersRef.current.delete(chapter.id);
      pendingSavesRef.current.delete(chapter.id);
      await storage.permanentDeletePage(chapter.id);
      await syncEngineRef.current?.pushPermanentDeletePage(chapter.id);
    }
    const ids = new Set(chapters.map((chapter) => chapter.id));
    setPages((prev) => prev.filter((page) => !ids.has(page.id)));
    setTrashPages((prev) => prev.filter((page) => !ids.has(page.id)));
  }, []);

  const handlePermanentDeletePage = useCallback(async (id: string) => {
    if (!storageRef.current) return;
    const page = trashPages.find((item) => item.id === id);
    const attachmentIds = new Set([page?.primary_attachment_id, ...(page?.attachment_ids || []), page?.novel_settings?.coverAttachmentId].filter(Boolean) as string[]);
    await permanentlyDeleteNovelChapters([id]);
    await storageRef.current.permanentDeletePage(id);
    for (const attachmentId of attachmentIds) {
      const referencedElsewhere = [...pages, ...trashPages].some((item) => item.id !== id && (
        item.primary_attachment_id === attachmentId || item.attachment_ids?.includes(attachmentId) || item.novel_settings?.coverAttachmentId === attachmentId
      ));
      if (!referencedElsewhere) {
        await storageRef.current.permanentDeleteAttachment?.(attachmentId);
        syncEngineRef.current?.pushPermanentDeleteAttachment(attachmentId);
        setAttachments((items) => items.filter((attachment) => attachment.id !== attachmentId));
      }
    }
    setTrashPages((prev) => prev.filter((page) => page.id !== id));
    syncEngineRef.current?.pushPermanentDeletePage(id);
  }, [pages, storageRef, trashPages, permanentlyDeleteNovelChapters]);

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
      creative_type: source.creative_type,
      novel_settings: source.novel_settings ? structuredClone(source.novel_settings) : undefined,
      character_data: source.character_data ? structuredClone(source.character_data) : undefined,
      study_items: source.kind === "study_set" ? [] : duplicated.study_items,
      presentation_data: source.presentation_data ? structuredClone(source.presentation_data) : duplicated.presentation_data,
      updated_at: Date.now(),
      revision: duplicated.revision + 1,
    };
    const chapters = getNovelChapters(pages, source.id).map((chapter) => ({ ...structuredClone(chapter),
      id: `chapter_${nanoid()}`, parent_id: pageToSave.id, created_at: Date.now(), updated_at: Date.now(), revision: 1,
    }));
    await storageRef.current.savePages([pageToSave, ...chapters]);
    if (source.kind === "study_set") {
      const repository = storageRef.current.getStudyRepository();
      const original = await repository.ensureDeck(source);
      await repository.ensureDeck(pageToSave);
      await repository.addCards(pageToSave.id, original.cards.filter(card => !card.deleted_at).map(card => ({ front: card.front, back: card.back })));
      await repository.configure(pageToSave.id, { direction_confirmed: original.settings.direction_confirmed });
    }
    setIsTrashMode(false);
    setIsHomeMode(false);
    setPages((prev) => [pageToSave, ...chapters, ...prev]);
    setActivePageId(pageToSave.id);
    await storageRef.current.setActivePageId(pageToSave.id);
    syncEngineRef.current?.pushPages([pageToSave, ...chapters]);
  }, [flushSave, pages, storageRef]);

  const handleImportPdfClick = useCallback(() => pdfInputRef.current?.click(), []);
  const handleImportMarkdownClick = useCallback(() => markdownInputRef.current?.click(), []);

  // 2026-08-11：Markdown 匯入核心（供檔案選擇與拖曳匯入共用）
  const importMarkdownFile = useCallback(async (file: File) => {
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

  const importMarkdownFileRef = useRef(importMarkdownFile);
  useEffect(() => { importMarkdownFileRef.current = importMarkdownFile; }, [importMarkdownFile]);

  const handleImportMarkdownFile = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    await importMarkdownFile(file);
  }, [importMarkdownFile]);

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
    // L10 fix: 用雙層 requestAnimationFrame 確保頁面切換 + React commit + 瀏覽器 paint
    // 完成後再觸發列印，比固定 setTimeout(50) 更可靠（避免慢機器列印到切換前的頁面）。
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => window.print()));
  }, [flushSave, handleSelectPage]);

  const handleToggleFavorite = useCallback((id: string) => {
    const target = pages.find((p) => p.id === id);
    if (target) patchPage(id, { is_favorite: !target.is_favorite });
  }, [pages, patchPage]);

  const handleRenamePage = useCallback((id: string, title: string) => {
    patchPage(id, { title });
  }, [patchPage]);

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
    if (activePageId) patchPage(activePageId, { title });
  }, [activePageId, patchPage]);

  const handleFolderChange = useCallback((newFolder: string | null) => {
    if (activePageId) patchPage(activePageId, { folder: newFolder });
  }, [activePageId, patchPage]);

  const handleTagsChange = useCallback((newTags: string[]) => {
    if (activePageId) patchPage(activePageId, { tags: newTags });
  }, [activePageId, patchPage]);

  // Task 1: PageFormat toggle - any paginated can convert to flow
  const handleFormatChange = useCallback((newFormat: PageFormat) => {
    if (activePageId) patchPage(activePageId, { format: newFormat });
  }, [activePageId, patchPage]);

  // Task 3: Split view handlers (Obsidian style, closable)
  const handleOpenInSplit = useCallback((id: string) => {
    if (id === activePageId) return;
    const previousPrimaryId = activePageId;
    setActivePageId(id);
    setSecondaryActivePageId(previousPrimaryId);
    if (storageRef.current) void storageRef.current.setActivePageId(id);
    setIsHomeMode(false);
    setIsTrashMode(false);
  }, [activePageId, storageRef]);

  const handleCloseSplit = useCallback(() => {
    if (secondaryActivePageId) {
      setActivePageId(secondaryActivePageId);
      if (storageRef.current) void storageRef.current.setActivePageId(secondaryActivePageId);
    }
    setSecondaryActivePageId(null);
    setSecondaryPdfUrl(null);
    setSecondaryPdfLoadError(null);
  }, [secondaryActivePageId, storageRef]);

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

  const handleSplitResizeStart = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    const bounds = splitContainerRef.current?.getBoundingClientRect();
    if (!bounds) return;
    const onMove = (moveEvent: MouseEvent) => {
      const percentage = ((moveEvent.clientX - bounds.left) / bounds.width) * 100;
      setSplitPrimaryWidth(Math.min(75, Math.max(25, percentage)));
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, []);

  const handleSecondaryTitleChange = useCallback((title: string) => {
    if (secondaryActivePageId) patchPage(secondaryActivePageId, { title });
  }, [secondaryActivePageId, patchPage]);

  const handleSecondaryFolderChange = useCallback((newFolder: string | null) => {
    if (secondaryActivePageId) patchPage(secondaryActivePageId, { folder: newFolder });
  }, [secondaryActivePageId, patchPage]);

  const handleSecondaryTagsChange = useCallback((newTags: string[]) => {
    if (secondaryActivePageId) patchPage(secondaryActivePageId, { tags: newTags });
  }, [secondaryActivePageId, patchPage]);

  const handleMarginsChange = useCallback((margins: PageMargins) => {
    if (activePageId) patchPage(activePageId, { margins });
  }, [activePageId, patchPage]);

  const handleSecondaryMarginsChange = useCallback((margins: PageMargins) => {
    if (secondaryActivePageId) patchPage(secondaryActivePageId, { margins });
  }, [secondaryActivePageId, patchPage]);

  const handleSecondaryFormatChange = useCallback((newFormat: PageFormat) => {
    if (secondaryActivePageId) patchPage(secondaryActivePageId, { format: newFormat });
  }, [secondaryActivePageId, patchPage]);

  const handleSecondaryContentChange = useCallback(({ json, text }: { json: any; text: string }) => {
    if (secondaryActivePageId) patchPage(secondaryActivePageId, { content_json: json, content_text: text, links: extractWikilinks(text) });
  }, [secondaryActivePageId, patchPage]);

  const handleContentChange = useCallback(({ json, text }: { json: any; text: string }) => {
    if (activePageId) patchPage(activePageId, { content_json: json, content_text: text, links: extractWikilinks(text) });
  }, [activePageId, patchPage]);

  // Novel operations identify their target page explicitly. They must not rely
  // on the currently-focused editor, because mobile navigation and split view
  // can change that focus while a new chapter is being created.
  const saveNovelContent = useCallback((pageId: string, json: any, text: string) => {
    patchPage(pageId, { content_json: json, content_text: text, links: extractWikilinks(text) });
  }, [patchPage]);

  const handleDeletePage = useCallback(async (id: string) => {
    if (!storageRef.current) return;
    const timer = saveTimersRef.current.get(id);
    if (timer) clearTimeout(timer);
    saveTimersRef.current.delete(id);
    pendingSavesRef.current.delete(id);
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
      if (isTodoMode) {
        setActivePageId(null);
        if (storageRef.current) await storageRef.current.setActivePageId(null);
      } else if (isQuickNoteMode) {
        setActivePageId(null);
        if (storageRef.current) await storageRef.current.setActivePageId(null);
      } else if (isCreativeMode) {
        // 在創作模式下刪除，維持在創作總覽，不切換到其他非創作頁面
        setActivePageId(null);
        if (storageRef.current) await storageRef.current.setActivePageId(null);
      } else {
        // 一般筆記/文檔模式：只在一般筆記（排除 quick_note, todo, creative）中切換至下一個專案頁面
        const remainingProjectPages = pages.filter(
          (p) => p.id !== id && !p.deleted_at && (p.kind as any) !== "quick_note" && (p.kind as any) !== "todo" && (p.kind as any) !== "creative" && p.kind !== "novel_chapter"
        );
        if (remainingProjectPages.length > 0) {
          await handleSelectPage(remainingProjectPages[0].id);
        } else {
          setActivePageId(null);
          if (storageRef.current) await storageRef.current.setActivePageId(null);
          setIsHomeMode(true);
        }
      }
    }
  }, [activePageId, pages, handleSelectPage, storageRef, isTodoMode, isQuickNoteMode, isCreativeMode]);

  const handleBulkDeletePages = useCallback(async (ids: string[]) => {
    if (!storageRef.current || ids.length === 0) return;
    const idSet = new Set(ids);
    for (const id of ids) {
      const timer = saveTimersRef.current.get(id);
      if (timer) clearTimeout(timer);
      saveTimersRef.current.delete(id);
      pendingSavesRef.current.delete(id);
    }
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
      if (isTodoMode) {
        setActivePageId(null);
        if (storageRef.current) await storageRef.current.setActivePageId(null);
      } else if (isQuickNoteMode) {
        setActivePageId(null);
        if (storageRef.current) await storageRef.current.setActivePageId(null);
      } else if (isCreativeMode) {
        setActivePageId(null);
        if (storageRef.current) await storageRef.current.setActivePageId(null);
      } else {
        const remainingProjectPages = pages.filter(
          (p) => !idSet.has(p.id) && !p.deleted_at && (p.kind as any) !== "quick_note" && (p.kind as any) !== "todo" && (p.kind as any) !== "creative" && p.kind !== "novel_chapter"
        );
        if (remainingProjectPages.length > 0) {
          await handleSelectPage(remainingProjectPages[0].id);
        } else {
          setActivePageId(null);
          await storageRef.current.setActivePageId(null);
          setIsHomeMode(true);
        }
      }
    }
  }, [activePageId, pages, handleSelectPage, storageRef, isTodoMode, isQuickNoteMode, isCreativeMode]);

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
    const deletedPages = trashPages.filter((page) => idSet.has(page.id));
    const candidateAttachmentIds = new Set(deletedPages.flatMap((page) => [page.primary_attachment_id, ...(page.attachment_ids || []), page.novel_settings?.coverAttachmentId].filter(Boolean) as string[]));
    await permanentlyDeleteNovelChapters(ids);
    for (const id of ids) { await storageRef.current.permanentDeletePage(id); syncEngineRef.current?.pushPermanentDeletePage(id); }
    for (const attachmentId of candidateAttachmentIds) {
      const referencedElsewhere = [...pages, ...trashPages].some((page) => !idSet.has(page.id) && (
        page.primary_attachment_id === attachmentId || page.attachment_ids?.includes(attachmentId) || page.novel_settings?.coverAttachmentId === attachmentId
      ));
      if (!referencedElsewhere) {
        await storageRef.current.permanentDeleteAttachment?.(attachmentId);
        syncEngineRef.current?.pushPermanentDeleteAttachment(attachmentId);
        setAttachments((items) => items.filter((attachment) => attachment.id !== attachmentId));
      }
    }
    setTrashPages((prev) => prev.filter((p) => !idSet.has(p.id)));
  }, [pages, storageRef, trashPages, permanentlyDeleteNovelChapters]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().includes("MAC");
      if ((isMac ? event.metaKey : event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
        return;
      }
      if ((isMac ? event.metaKey : event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === "p") {
        event.preventDefault();
        setIsDevicePreviewOpen(true);
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
    { id: "new-note", label: t("commandPalette.newNote"), icon: "??", keywords: "new create note", run: () => setCreateDialog({ open: true, initialKind: "note" }) },
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
    { id: "device-preview", label: "裝置預覽", icon: "▣", keywords: "responsive device mobile tablet preview", run: () => setIsDevicePreviewOpen(true) },
  ];

  if (!isReady || !isAuthResolved) {
    return <div className="flex h-screen w-screen items-center justify-center text-base" style={{ color: "var(--color-sidebar-text)" }}>{t("common.loading")}</div>;
  }

  if (!isAuthenticated) {
    return <AccountButton required />;
  }

  const quizRepository=storageRef.current?.getStudyRepository().getQuizRepository();
  return (
    <div className="relative flex h-[100dvh] w-screen overflow-hidden" style={{ backgroundColor: "var(--color-bg)", paddingBottom: "env(safe-area-inset-bottom)" }} onTouchStartCapture={beginGlobalPull} onTouchMoveCapture={moveGlobalPull} onTouchEndCapture={endGlobalPull} onTouchCancelCapture={cancelGlobalPull} onPointerDownCapture={closeMobilePanelsWhenEditing}>
      {refreshError && <div role="alert" className="fixed inset-x-4 top-4 z-[100] rounded-xl bg-red-100 p-3 text-sm text-red-900" onClick={() => setRefreshError("")}>{refreshError}</div>}
      <div className="pointer-events-none fixed inset-x-0 top-2 z-[70] flex justify-center text-xs font-medium transition-opacity" style={{ opacity: globalPullDistance > 20 || isGlobalRefreshing ? 1 : 0, color: "var(--color-text)" }}>{isGlobalRefreshing ? "正在重新載入…" : refreshReady ? "放開以重新載入" : "繼續下拉以重新載入"}</div>
      {quizRepository&&<QuizOfflinePrompt key={accountEmail} repository={quizRepository}/>}
      <input ref={pdfInputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={handleImportPdfFile} />
      <input ref={markdownInputRef} type="file" accept=".md,.markdown,.txt,text/markdown,text/plain" className="hidden" onChange={handleImportMarkdownFile} />
      <input ref={backupInputRef} type="file" accept=".json,application/json" className="hidden" onChange={handleImportBackupFile} />

      {isFeatureInterface && (
        <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center border-b px-3" style={{ backgroundColor: "var(--color-bg)", borderColor: "var(--color-border)" }}>
          <button type="button" onClick={() => { setIsNavigationOpen((open) => !open); setIsAppLauncherOpen(false); }} className="flex h-10 w-10 items-center justify-center rounded-full text-xl hover:bg-zinc-100 dark:hover:bg-zinc-800" aria-label="開啟導覽" title="開啟導覽">☰</button>
          <button type="button" onClick={handleShowHome} className="ml-2 text-base font-semibold tracking-tight" style={{ color: "var(--color-text)" }}>Nexus</button>
          <div className="flex-1" />
          <div className="relative">
            <button type="button" onClick={() => { setIsAppLauncherOpen((open) => !open); setIsNavigationOpen(false); }} className="grid h-10 w-10 grid-cols-2 gap-1 rounded-full p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800" aria-label="功能總覽" title="功能總覽">
              <i className="rounded-sm bg-current opacity-70" /><i className="rounded-sm bg-current opacity-70" /><i className="rounded-sm bg-current opacity-70" /><i className="rounded-sm bg-current opacity-70" />
            </button>
            {isAppLauncherOpen && (
              <div className="absolute right-0 top-12 grid w-72 grid-cols-2 gap-1 rounded-2xl border p-2 shadow-xl" style={{ backgroundColor: "var(--color-bg)", borderColor: "var(--color-border)" }}>
                {[
                  ["▣", "日曆", handleShowTodoList],
                  ["▤", "字卡", handleShowStudySets],
                  ["✦", "創作", handleShowCreative],
                  ["📖", "小說", handleShowNovels],
                  ["✎", "筆記", handleShowNotesOverview],
                  ["▱", "文檔", handleShowDocuments],
                  ["▰", "簡報", handleShowPresentations],
                  ["⌘", "網頁", () => handleShowUtility("web")],
                  ["＋", "計數", () => handleShowUtility("counter")],
                  ["⤨", "抽選", () => handleShowUtility("draw")],
                ].map(([icon, label, action]) => (
                  <button key={label as string} type="button" onClick={() => { (action as () => void)(); setIsAppLauncherOpen(false); }} className="flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800">
                    <span className="text-lg">{icon as string}</span><span>{label as string}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </header>
      )}

      {!isFeatureInterface && (
        <div className="absolute right-3 top-2 z-40 flex items-center gap-2">
          {isActiveNovel && <div className="relative">
            <button type="button" onClick={() => setIsNovelMoreOpen((open) => !open)} className="grid h-9 w-9 place-items-center rounded-full border text-lg leading-none shadow-sm hover:opacity-80" style={{ borderColor: "var(--color-border)", color: "var(--color-text)", backgroundColor: "var(--color-panel-bg)" }} aria-label="小說更多操作" aria-expanded={isNovelMoreOpen} title="更多操作">⋮</button>
            {isNovelMoreOpen && <div className="absolute right-0 top-11 z-50 min-w-36 overflow-hidden rounded-lg border py-1 shadow-xl" style={{ backgroundColor: "var(--color-bg)", borderColor: "var(--color-border)", color: "var(--color-text)" }}>
              <button type="button" onClick={() => { setIsNovelMoreOpen(false); setNovelContinueEditSignal((signal) => signal + 1); }} className="block w-full px-3 py-2 text-left text-xs font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800">繼續編輯</button>
              <button type="button" onClick={() => { setIsNovelMoreOpen(false); if (activePage && window.confirm(`確定將小說「${activePage.title || "未命名小說"}」移至垃圾桶？`)) { void handleDeletePage(activePage.id); handleShowNovels(); } }} className="block w-full px-3 py-2 text-left text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/25">刪除小說</button>
            </div>}
          </div>}
        </div>
      )}

      {isNavigationOpen && (
        <>
          <button type="button" className="fixed inset-0 z-40 cursor-default bg-black/20" onClick={() => setIsNavigationOpen(false)} aria-label="關閉導覽" />
          <div className="fixed inset-y-0 left-0 z-50 flex h-screen w-[min(360px,100vw)] shadow-2xl [&>div]:h-full">
      <ResizablePanel side="left" defaultWidth={360} minWidth={220} maxWidth={480} isCollapsed={false}>
        <Sidebar
          pages={(isTrashMode ? trashPages : pages).filter((page) => page.kind !== "novel_chapter" && (isTrashMode || !page.character_data?.isTemplate))}
          activePageId={isTrashMode || isHomeMode ? null : activePageId}
          selectedTag={selectedTag}
          isTrashMode={isTrashMode}
          isHomeMode={isHomeMode}
          isCollapsed={false}
          onToggleCollapse={() => setIsNavigationOpen(false)}
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
          utilityMode={utilityMode}
          onCreateItem={handleCreateItem}
          syncState={syncState}
          accountEmail={accountEmail}
          onMovePage={handleMovePage}
          onOpenInSplit={handleOpenInSplit}
          isQuickNoteMode={isQuickNoteMode}
          isTodoMode={isTodoMode}
          isCreativeMode={isCreativeMode}
          isStudySetMode={isStudySetMode}
          isNovelMode={isNovelMode}
          isDocumentMode={isDocumentMode}
          isNoteMode={isNoteMode}
          isPresentationMode={isPresentationMode}
          onShowQuickNotes={handleShowQuickNotes}
          onShowTodoList={handleShowTodoList}
          onShowCreative={handleShowCreative}
          onShowStudySets={handleShowStudySets}
          onShowNovels={handleShowNovels}
          onShowDocuments={handleShowDocuments}
          onShowNotesOverview={handleShowNotesOverview}
          onShowPresentations={handleShowPresentations}
        />
      </ResizablePanel>
          </div>
        </>
      )}

      {/* Editors keep a local, collapsible switcher. It is separate from the
          Google-style interface drawer and lets users change pages or open a
          second editor without leaving their current editing context. */}
      {!isFeatureInterface && (
        <>
        {isMobileViewport && !isSidebarCollapsed && <button type="button" className="fixed inset-0 z-40 cursor-default bg-black/25" onClick={() => setIsSidebarCollapsed(true)} aria-label="關閉左側面板" />}
        <ResizablePanel side="left" defaultWidth={300} minWidth={220} maxWidth={480} collapsedWidth={isMobileViewport ? 0 : 56} isCollapsed={isSidebarCollapsed} overlay={isMobileViewport}>
          <Sidebar
            pages={pages.filter((page) => page.kind !== "novel_chapter" && !page.character_data?.isTemplate)}
            activePageId={activePageId}
            selectedTag={selectedTag}
            isTrashMode={false}
            isHomeMode={false}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={() => setIsSidebarCollapsed((collapsed) => !collapsed)}
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
            utilityMode={utilityMode}
          onCreateItem={handleCreateItem}
            syncState={syncState}
            accountEmail={accountEmail}
            onMovePage={handleMovePage}
            onOpenInSplit={handleOpenInSplit}
            isQuickNoteMode={isQuickNoteMode}
            isTodoMode={isTodoMode}
            isCreativeMode={isCreativeMode}
            isStudySetMode={isStudySetMode}
            isNovelMode={isNovelMode}
            isDocumentMode={isDocumentMode}
            isNoteMode={isNoteMode}
            isPresentationMode={isPresentationMode}
            onShowQuickNotes={handleShowQuickNotes}
            onShowTodoList={handleShowTodoList}
            onShowCreative={handleShowCreative}
            onShowStudySets={handleShowStudySets}
            onShowNovels={handleShowNovels}
            onShowDocuments={handleShowDocuments}
            onShowNotesOverview={handleShowNotesOverview}
            onShowPresentations={handleShowPresentations}
          />
        </ResizablePanel>
        </>
      )}

      {/* 手機版不保留縮起後的垂直軌道；開關直接固定在編輯器最上方左側。 */}
      {!isFeatureInterface && isMobileViewport && isSidebarCollapsed && (
        <button
          type="button"
          onClick={() => { setIsRightPanelCollapsed(true); setIsSidebarCollapsed(false); }}
          className="absolute left-2 top-2 z-30 flex h-10 w-10 items-center justify-center rounded-lg border text-lg shadow-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
          style={{ backgroundColor: "var(--color-panel-bg)", borderColor: "var(--color-border)", color: "var(--color-text)" }}
          aria-label="開啟左側面板"
          title="開啟左側面板"
        >
          ☰
        </button>
      )}

      {!isFeatureInterface && isTabletViewport && !isActiveNovel && (
        <button
          type="button"
          onClick={() => { setIsSidebarCollapsed(true); setIsRightPanelCollapsed((collapsed) => !collapsed); }}
          className="absolute right-3 top-2 z-30 flex h-10 w-10 items-center justify-center rounded-lg border text-base shadow-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
          style={{ backgroundColor: "var(--color-panel-bg)", borderColor: "var(--color-border)", color: "var(--color-text)" }}
          aria-label="開啟輔助頁"
          title="開啟輔助頁"
        >
          {isRightPanelCollapsed ? "☷" : "×"}
        </button>
      )}

      <div className={`flex min-h-0 min-w-0 flex-1 overflow-hidden ${isFeatureInterface ? "mt-16 h-[calc(100dvh-4rem)]" : ""}`}>
      {isHomeMode ? (
        <Dashboard pages={pages.filter((page) => page.kind !== "novel_chapter" && !page.character_data?.isTemplate)} onSelectPage={handleSelectPage} onCreatePage={handleCreatePage} onCreateDocument={handleCreateDocument} onCreateStudySet={handleCreateStudySet} onImportPdf={handleImportPdfClick} onCreatePresentation={handleCreatePresentation} onDeletePages={handleBulkDeletePages} onPinPages={handlePinPages} onReorderPages={handleReorderPages} onSetFolder={handleSetPagesFolder} onRefresh={reloadWorkspace} />
      ) : isQuickNoteMode ? (
        <QuickNotesView
          pages={pages.filter((page) => page.kind !== "novel_chapter" && !page.character_data?.isTemplate)}
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
          pages={pages.filter((page) => page.kind !== "novel_chapter" && !page.character_data?.isTemplate)}
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
      ) : utilityMode ? (
        activePage?.kind === utilityMode ? (
          <UtilityView page={activePage} onBack={() => { setActivePageId(null); }} onUpdate={(patch) => patchPage(activePage.id, patch)} />
        ) : (
          <FeatureOverview
            title={utilityMode === "web" ? "網頁" : utilityMode === "counter" ? "計數" : "抽選"}
            description={utilityMode === "web" ? "建立可整理與公開的個人連結頁。" : utilityMode === "counter" ? "用項目與合計追蹤數值。" : "以標籤篩選你的抽選資料庫。"}
            icon={utilityMode === "web" ? "⌘" : utilityMode === "counter" ? "＋" : "⤨"}
            actionLabel={utilityMode === "web" ? "建立網頁" : utilityMode === "counter" ? "建立計數" : "建立抽選"}
            pages={pages.filter((page) => page.kind === utilityMode && !page.deleted_at)}
            onCreate={() => { const kind = utilityMode; void createAndOpenPage({ kind, title: kind === "web" ? "新網頁" : kind === "counter" ? "新計數" : "新抽選", format: "flow" }); }}
            onSelectPage={handleSelectPage}
          />
        )
      ) : isStudySetMode ? (
        <FeatureOverview
          title="字卡"
          description="建立、整理並練習你的學習卡片。"
          relatedLink={{ href: "/etymology", label: "開啟字源百科" }}
          icon="🗂️"
          actionLabel="建立字卡集"
          pages={pages.filter((p) => p.kind === "study_set" && !p.deleted_at)}
          onCreate={() => void handleCreateStudySet()}
          onSelectPage={handleSelectPage}
        />
      ) : isNovelMode ? (
        <FeatureOverview
          title="小說"
          description="管理小說作品、章節閱讀與沉浸式寫作。"
          icon="📖"
          actionLabel="建立小說"
          pages={pages.filter((p) => isNovelPage(p) && !p.deleted_at)}
          onCreate={() => void handleCreateItem("novel")}
          onSelectPage={handleSelectPage}
        />
      ) : isDocumentMode ? (
        <FeatureOverview
          title="文檔"
          description="以流動式閱讀與撰寫為主的獨立文檔空間。"
          icon="📄"
          actionLabel="建立文檔"
          pages={pages.filter((p) => p.kind === "document" && !p.deleted_at)}
          onCreate={() => void handleCreateDocument("flow")}
          onSelectPage={handleSelectPage}
        />
      ) : isNoteMode ? (
        <FeatureOverview
          title="筆記"
          description="以流動式書寫、頁面連結與輔助頁為核心的筆記空間。"
          icon="📝"
          actionLabel="建立筆記"
          pages={pages.filter((p) => (!p.kind || p.kind === "note") && !p.parent_id && !p.deleted_at)}
          onCreate={() => setCreateDialog({ open: true, initialKind: "note" })}
          onSelectPage={handleSelectPage}
        />
      ) : isPresentationMode ? (
        <FeatureOverview
          title="簡報"
          description="使用圖層、自由文字方塊與圖表建立投影片。"
          icon="📊"
          actionLabel="建立簡報"
          pages={pages.filter((p) => p.kind === "presentation" && !p.deleted_at)}
          onCreate={() => setCreateDialog({ open: true, initialKind: "presentation" })}
          onSelectPage={handleSelectPage}
        />
      ) : isCreativeMode && (!activePage || activePage.kind !== "creative") ? (
        <CreativeView
          pages={pages.filter((page) => page.kind !== "novel_chapter" && !page.character_data?.isTemplate)}
          templates={pages.filter((page) => page.character_data?.isTemplate && !page.deleted_at)}
          onRenameTemplate={(id, title) => patchPage(id, { title })}
          onCreateTemplate={() => { void createAndOpenPage({ kind: "creative", title: "新模板", format: "flow" }).then((page) => { if (page) patchPage(page.id, { creative_type: "character", character_data: { ...createBlankTemplate(), isTemplate: true } }); }); }}
          onCreateCharacter={handleCreateCharacter}
          onCreateWorld={async () => {
            const initialData = createBlankTemplate();
            initialData.basic.name = "新世界觀";
            initialData.basic.role = "世界觀設定";
            const p = await createAndOpenPage({ kind: "creative", title: initialData.basic.name, format: "flow" });
            if (p) patchPage(p.id, { creative_type: "world", character_data: initialData });
          }}
          onSelectPage={handleSelectPage}
          onDeletePage={(id) => { void handleDeletePage(id); }}
        />
      ) : secondaryActivePageId && secondaryActivePage && !isTabletViewport ? (
        <div ref={splitContainerRef} className="flex flex-1 overflow-hidden gap-2">
          {/* Primary pane */}
          <div className="flex flex-col shrink-0 overflow-hidden rounded-2xl" style={{ flexBasis: `calc(${splitPrimaryWidth}% - 18px)`, border: "1px solid var(--color-border)" }}>
            {activePage?.kind === "study_set" ? (
              <StudySetView page={activePage} onTitleChange={handleTitleChange} repository={storageRef.current!.getStudyRepository()} onBackToInterface={handleShowStudySets} />
            ) : activePage?.kind === "presentation" ? (
              <PresentationView page={activePage} onTitleChange={handleTitleChange} onUpdatePresentation={handleUpdatePresentation} onBackToInterface={handleShowHome} />
            ) : activePage?.kind === "creative" ? (
              activePage.creative_type === "character" || !!activePage.character_data ? (
                <CharacterProfileView
                  key={activePage.id}
                  onSaveTemplate={(name, data) => saveCharacterTemplate(activePage, name, data)}
                  page={activePage}
                  worlds={pages.filter((page) => page.creative_type === "world" && !page.deleted_at)}
                  getAttachmentBlob={getNovelCoverBlob}
                  onUploadGalleryImage={(file) => uploadCharacterGalleryImage(activePage.id, file)}
                  onTitleChange={handleTitleChange}
                  onUpdateCharacterData={(cData) => {
                    patchPage(activePage.id, { character_data: cData, title: cData.isTemplate ? activePage.title : cData.basic.name || activePage.title });
                  }}
                  onBackToCreativeOverview={handleShowCreative}
                />
              ) : (
                <NovelReaderView
                  key={activePage.id}
                  page={activePage}
                  chapterRecords={getNovelChapters(pages, activePage.id)}
                  onEnableChapters={() => enableNovelChapters(activePage.id)}
                  onCreateChapter={() => createNovelChapter(activePage.id)}
                  onPatchChapter={patchPage}
                  onTitleChange={handleTitleChange}
                  onContentChange={(json, text) => saveNovelContent(activePage.id, json, text)}
                  onUpdateSettings={(nSettings) => {
                    patchPage(activePage.id, { novel_settings: nSettings });
                  }}
                  getCoverBlob={getNovelCoverBlob}
                  onUploadCover={(file) => uploadNovelCover(activePage.id, file)}
                  onRemoveCover={() => void removeNovelCover(activePage.id)}
                  onBackToNovelList={handleShowNovels}
                  onDeleteNovel={() => { void handleDeletePage(activePage.id); handleShowNovels(); }}
                  continueEditSignal={novelContinueEditSignal}
                />
              )
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
                onExportMarkdown={() => activePage && handleExportPageMarkdown(activePage.id)}
                onExportPdf={() => activePage && handleExportPageAsPdf(activePage.id)}
                onExportNexus={() => activePage && handleExportPageAsNexusJson(activePage.id)}
                onNewNote={() => handleCreatePage("flow")}
                onNewDocument={() => handleCreateDocument("flow")}
                onImportPdf={handleImportPdfClick}
                onImportMd={handleImportMarkdownClick}
                onConvertToPresentation={() => handleConvertToPresentation()}
              
                nightAdapt={isPageNightAdapt}
                onToggleNightAdapt={handleTogglePageNightAdapt}
                onBackToInterface={handleShowHome}
                isSplitView={!!secondaryActivePageId}
                onCloseSplit={handleCloseSplit}
                onSwapSplit={handleSwapSplit}
              />
            )}
          </div>
          {/* Divider with controls */}
          <div onMouseDown={handleSplitResizeStart} className="flex w-7 shrink-0 cursor-col-resize flex-col items-center gap-1 py-2" title="拖曳調整左右編輯器寬度">
            <button onMouseDown={(event) => event.stopPropagation()} onClick={handleSwapSplit} className="w-7 h-7 rounded-md flex items-center justify-center text-xs hover:bg-zinc-200" title="交換左右">⇄</button>
            <div className="flex-1 w-px bg-zinc-300" />
            <button onMouseDown={(event) => event.stopPropagation()} onClick={handleCloseSplit} className="w-7 h-7 rounded-md flex items-center justify-center text-xs hover:bg-zinc-200" title="關閉目前編輯器">✕</button>
          </div>
          {/* Secondary pane - Obsidian style closable */}
          <div className="flex flex-col flex-1 overflow-hidden rounded-2xl" style={{ border: "1px solid var(--color-border)" }}>
            {secondaryActivePage.kind === "study_set" ? (
              <StudySetView page={secondaryActivePage} onTitleChange={handleSecondaryTitleChange} repository={storageRef.current!.getStudyRepository()} onBackToInterface={handleShowStudySets} />
            ) : secondaryActivePage.kind === "presentation" ? (
              <PresentationView page={secondaryActivePage} onTitleChange={handleSecondaryTitleChange} onUpdatePresentation={handleSecondaryUpdatePresentation} onBackToInterface={handleShowHome} />
            ) : secondaryActivePage.kind === "creative" ? (
              secondaryActivePage.creative_type === "character" || !!secondaryActivePage.character_data ? (
                <CharacterProfileView
                  key={secondaryActivePage.id}
                  onSaveTemplate={(name, data) => saveCharacterTemplate(secondaryActivePage, name, data)}
                  page={secondaryActivePage}
                  worlds={pages.filter((page) => page.creative_type === "world" && !page.deleted_at)}
                  getAttachmentBlob={getNovelCoverBlob}
                  onUploadGalleryImage={(file) => uploadCharacterGalleryImage(secondaryActivePage.id, file)}
                  onTitleChange={handleSecondaryTitleChange}
                  onUpdateCharacterData={(cData) => {
                    patchPage(secondaryActivePage.id, { character_data: cData, title: cData.isTemplate ? secondaryActivePage.title : cData.basic.name || secondaryActivePage.title });
                  }}
                  onBackToCreativeOverview={handleShowCreative}
                />
              ) : (
                <NovelReaderView
                  key={secondaryActivePage.id}
                  page={secondaryActivePage}
                  chapterRecords={getNovelChapters(pages, secondaryActivePage.id)}
                  onEnableChapters={() => enableNovelChapters(secondaryActivePage.id)}
                  onCreateChapter={() => createNovelChapter(secondaryActivePage.id)}
                  onPatchChapter={patchPage}
                  onTitleChange={handleSecondaryTitleChange}
                  onContentChange={(json, text) => saveNovelContent(secondaryActivePage.id, json, text)}
                  onUpdateSettings={(nSettings) => {
                    patchPage(secondaryActivePage.id, { novel_settings: nSettings });
                  }}
                  getCoverBlob={getNovelCoverBlob}
                  onUploadCover={(file) => uploadNovelCover(secondaryActivePage.id, file)}
                  onRemoveCover={() => void removeNovelCover(secondaryActivePage.id)}
                  onBackToNovelList={handleShowNovels}
                  onDeleteNovel={() => { void handleDeletePage(secondaryActivePage.id); handleShowNovels(); }}
                  continueEditSignal={novelContinueEditSignal}
                />
              )
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
                onExportMarkdown={() => secondaryActivePage && handleExportPageMarkdown(secondaryActivePage.id)}
                onExportPdf={() => secondaryActivePage && handleExportPageAsPdf(secondaryActivePage.id)}
                onExportNexus={() => secondaryActivePage && handleExportPageAsNexusJson(secondaryActivePage.id)}
                onNewNote={() => handleCreatePage("flow")}
                onNewDocument={() => handleCreateDocument("flow")}
                onImportPdf={handleImportPdfClick}
                onImportMd={handleImportMarkdownClick}
                onConvertToPresentation={() => handleConvertToPresentation(secondaryActivePageId || undefined)}
              
                nightAdapt={isPageNightAdapt}
                onToggleNightAdapt={handleTogglePageNightAdapt}
                onBackToInterface={handleShowHome}
                isSplitView={!!secondaryActivePageId}
                onCloseSplit={handleCloseSplit}
                onSwapSplit={handleSwapSplit}
              />
            )}
          </div>
        </div>
      ) : activePage?.kind === "study_set" ? (
        <StudySetView page={activePage} onTitleChange={handleTitleChange} repository={storageRef.current!.getStudyRepository()} onBackToInterface={handleShowStudySets} />
      ) : activePage?.kind === "presentation" ? (
        <PresentationView page={activePage} onTitleChange={handleTitleChange} onUpdatePresentation={handleUpdatePresentation} onBackToInterface={handleShowHome} />
      ) : activePage?.kind === "creative" ? (
        activePage.creative_type === "character" || !!activePage.character_data ? (
          <CharacterProfileView
            key={activePage.id}
                  onSaveTemplate={(name, data) => saveCharacterTemplate(activePage, name, data)}
                  page={activePage}
            worlds={pages.filter((page) => page.creative_type === "world" && !page.deleted_at)}
            getAttachmentBlob={getNovelCoverBlob}
            onUploadGalleryImage={(file) => uploadCharacterGalleryImage(activePage.id, file)}
            onTitleChange={handleTitleChange}
            onUpdateCharacterData={(cData) => {
              patchPage(activePage.id, { character_data: cData, title: cData.isTemplate ? activePage.title : cData.basic.name || activePage.title });
            }}
            onBackToCreativeOverview={handleShowCreative}
          />
        ) : (
          <NovelReaderView
            key={activePage.id}
                  page={activePage}
                  chapterRecords={getNovelChapters(pages, activePage.id)}
                  onEnableChapters={() => enableNovelChapters(activePage.id)}
                  onCreateChapter={() => createNovelChapter(activePage.id)}
                  onPatchChapter={patchPage}
            onTitleChange={handleTitleChange}
            onContentChange={(json, text) => saveNovelContent(activePage.id, json, text)}
            onUpdateSettings={(nSettings) => {
              patchPage(activePage.id, { novel_settings: nSettings });
            }}
            getCoverBlob={getNovelCoverBlob}
            onUploadCover={(file) => uploadNovelCover(activePage.id, file)}
            onRemoveCover={() => void removeNovelCover(activePage.id)}
            onBackToNovelList={handleShowNovels}
            onDeleteNovel={() => { void handleDeletePage(activePage.id); handleShowNovels(); }}
            continueEditSignal={novelContinueEditSignal}
          />
        )
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
          onExportMarkdown={() => activePage && handleExportPageMarkdown(activePage.id)}
          onExportPdf={() => activePage && handleExportPageAsPdf(activePage.id)}
          onExportNexus={() => activePage && handleExportPageAsNexusJson(activePage.id)}
          onNewNote={() => handleCreatePage("flow")}
          onNewDocument={() => handleCreateDocument("flow")}
          onImportPdf={handleImportPdfClick}
          onImportMd={handleImportMarkdownClick}
                onConvertToPresentation={() => handleConvertToPresentation()}
        
                nightAdapt={isPageNightAdapt}
                onToggleNightAdapt={handleTogglePageNightAdapt}
                onBackToInterface={handleShowHome}
                isSplitView={!!secondaryActivePageId}
                onCloseSplit={handleCloseSplit}
                onSwapSplit={handleSwapSplit}
              />
      )}

      {!isFeatureInterface && isTabletViewport && (
        <>
          {!isRightPanelCollapsed && <button type="button" className="fixed inset-0 z-40 cursor-default bg-black/25" onClick={() => setIsRightPanelCollapsed(true)} aria-label="關閉輔助頁" />}
          <ResizablePanel side="right" defaultWidth={320} minWidth={240} maxWidth={520} collapsedWidth={0} isCollapsed={isRightPanelCollapsed} overlay>
            <RightPanel page={activePage} pages={pages.filter((page) => page.kind !== "novel_chapter" && !page.character_data?.isTemplate)} isCollapsed={isRightPanelCollapsed} onToggleCollapse={() => setIsRightPanelCollapsed((prev) => !prev)} onSelectPageTitle={handleSelectPageByTitle} onUpdateAssistantBlocks={(blocks) => { if (activePage) patchPage(activePage.id, { assistant_blocks: blocks }); }} />
          </ResizablePanel>
        </>
      )}

      {!isFeatureInterface && !isTabletViewport && (
        <ResizablePanel side="right" defaultWidth={320} minWidth={240} maxWidth={520} isCollapsed={isRightPanelCollapsed}>
          <RightPanel page={activePage} pages={pages.filter((page) => page.kind !== "novel_chapter" && !page.character_data?.isTemplate)} isCollapsed={isRightPanelCollapsed} onToggleCollapse={() => setIsRightPanelCollapsed((prev) => !prev)} onSelectPageTitle={handleSelectPageByTitle} onUpdateAssistantBlocks={(blocks) => { if (activePage) patchPage(activePage.id, { assistant_blocks: blocks }); }} />
        </ResizablePanel>
      )}
      </div>

      <CommandPalette isOpen={isCommandPaletteOpen} onClose={() => setIsCommandPaletteOpen(false)} pages={pages.filter((page) => page.kind !== "novel_chapter" && !page.character_data?.isTemplate)} actions={commandPaletteActions} onSelectPage={handleSelectPage} />
      {isDevicePreviewOpen && <DevicePreview onClose={() => setIsDevicePreviewOpen(false)} />}

      {characterTemplatePicker && <CreationChoiceDialog title="選擇角色卡模板" options={[{ id: "blank", label: "全空白" }, { id: "dnd5e", label: "D&D 5e" }, { id: "coc7e", label: "CoC 7e" }, ...pages.filter((page) => page.character_data?.isTemplate && !page.deleted_at).map((page) => ({ id: page.id, label: page.title }))]} onClose={() => setCharacterTemplatePicker(false)} onChoose={(id) => { setCharacterTemplatePicker(false); void handleCreateCharacter(id); }} />}
      <NewPageDialog
        isOpen={createDialog.open}
        initialKind={createDialog.initialKind}
        onClose={() => setCreateDialog({ open: false, initialKind: null })}
        onConfirm={handleConfirmCreateDialog}
      />

      {/* 2026-08-11：Markdown 拖曳匯入提示 */}
      {isDragImportOver && (
        <div className="pointer-events-none fixed inset-0 z-[10000] flex items-center justify-center" style={{ backgroundColor: "rgba(59,130,246,0.10)" }}>
          <div className="rounded-2xl px-8 py-6 text-sm font-medium" style={{ border: "2px dashed #3b82f6", color: "#3b82f6", backgroundColor: "var(--color-bg)" }}>
            {t("app.dropMarkdownHint")}
          </div>
        </div>
      )}

    </div>
  );
}
