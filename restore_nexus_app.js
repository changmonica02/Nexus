const fs = require('fs');

const code = `"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type MutableRefObject,
  type ChangeEvent,
} from "react";
import type {
  Page,
  Attachment,
  WorkspaceBackup,
  StudyItem,
  PageFormat,
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
import { useUiModes } from "../hooks/useUiModes";
import { usePagesStorage } from "../hooks/usePagesStorage";
import { WorkspaceProvider } from "../contexts/WorkspaceContext";
import Sidebar, { type SortMode } from "./Sidebar";
import EditorPane from "./EditorPane";
import RightPanel from "./RightPanel";
import StudySetView from "./StudySetView";
import Dashboard from "./Dashboard";
import CommandPalette, { type CommandPaletteAction } from "./CommandPalette";
import ResizablePanel from "./ResizablePanel";
import NewPageDialog from "./NewPageDialog";

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

  const ui = useUiModes();
  const storage = usePagesStorage(
    storageRef,
    onLanguageLoaded,
    onThemeChange,
    ui.setIsHomeMode,
    ui.setIsTrashMode,
    ui.setPendingRenameId
  );

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const isMac = navigator.platform.toUpperCase().includes("MAC");
    if ((isMac ? e.metaKey : e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      ui.setIsCommandPaletteOpen((prev) => !prev);
    }
  }, [ui]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const commandActions: CommandPaletteAction[] = [
    { id: "go-home", label: t("commandPalette.goHome"), icon: "icon", keywords: "dashboard home", run: ui.showHome },
    { id: "go-notes", label: t("commandPalette.goNotes"), icon: "icon", keywords: "notes", run: ui.showNotes },
    { id: "go-trash", label: t("commandPalette.goTrash"), icon: "icon", keywords: "trash", run: ui.showTrash },
    { id: "new-document", label: t("commandPalette.newDocument"), icon: "icon", keywords: "new create document", run: storage.handleCreateDocument },
    { id: "new-note", label: t("commandPalette.newNote"), icon: "icon", keywords: "new create note", run: storage.handleCreatePage },
    { id: "new-study-set", label: t("commandPalette.newStudySet"), icon: "icon", keywords: "study set flashcard", run: storage.handleCreateStudySet },
    { id: "import-pdf", label: t("commandPalette.importPdf"), icon: "icon", keywords: "pdf import", run: () => storage.pdfInputRef.current?.click() },
    { id: "import-markdown", label: t("commandPalette.importMarkdown"), icon: "icon", keywords: "markdown md import", run: () => storage.markdownInputRef.current?.click() },
    { id: "export-current-page", label: t("commandPalette.exportCurrentPage"), icon: "icon", keywords: "export markdown pdf", run: () => {
      const page = storage.activePage;
      if (!page) return;
      if (page.kind === "document") void storage.handleExportPageMarkdown(page.id);
      else void storage.handleExportPageAsPdf(page.id);
    }},
    { id: "export-backup", label: t("commandPalette.exportBackup"), icon: "icon", keywords: "backup export", run: storage.handleExportBackup },
  ];

  if (!storage.isReady) {
    return <div className="flex h-screen w-screen items-center justify-center text-base" style={{ color: "var(--color-sidebar-text)" }}>{t("common.loading")}</div>;
  }

  return (
    <WorkspaceProvider value={{ ui, storage, theme, setTheme: onThemeChange }}>
      <div className="flex h-screen w-screen overflow-hidden gap-3 p-3" style={{ backgroundColor: "var(--color-bg)" }}>
        <input ref={storage.pdfInputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={storage.handleImportPdfFile} />
        <input ref={storage.markdownInputRef} type="file" accept=".md,.markdown,.txt,text/markdown,text/plain" className="hidden" onChange={storage.handleImportMarkdownFile} />
        <input ref={storage.backupInputRef} type="file" accept=".json,application/json" className="hidden" onChange={storage.handleImportBackupFile} />

        <Sidebar />

        <main className="flex-1 flex flex-col min-w-0 bg-white rounded-2xl shadow-sm border overflow-hidden relative" style={{ backgroundColor: "var(--color-editor-bg)", borderColor: "var(--color-border)" }}>
          {ui.isHomeMode ? (
            <Dashboard />
          ) : ui.isTrashMode ? (
            <div className="flex-1 flex items-center justify-center text-sm opacity-50" style={{ color: "var(--color-text)" }}>
              {t("app.trashModeView")}
            </div>
          ) : storage.activePage ? (
            storage.activePage.kind === "study_set" ? (
              <StudySetView />
            ) : (
              <EditorPane />
            )
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-sm opacity-50" style={{ color: "var(--color-text)" }}>
              <p>{t("app.noPageSelected")}</p>
              <div className="mt-4 flex gap-2">
                <button onClick={() => storage.handleCreatePage()} className="px-4 py-2 rounded-lg bg-zinc-100 hover:bg-zinc-200 transition-colors" style={{ color: "var(--color-text)", backgroundColor: "var(--color-sidebar-bg)" }}>
                  {t("sidebar.create.note")}
                </button>
                <button onClick={() => storage.handleCreateDocument()} className="px-4 py-2 rounded-lg bg-zinc-100 hover:bg-zinc-200 transition-colors" style={{ color: "var(--color-text)", backgroundColor: "var(--color-sidebar-bg)" }}>
                  {t("sidebar.create.document")}
                </button>
              </div>
            </div>
          )}
        </main>

        {!ui.isRightPanelCollapsed && !ui.isHomeMode && (
          <RightPanel />
        )}

        <CommandPalette actions={commandActions} />
        <NewPageDialog />
      </div>
    </WorkspaceProvider>
  );
}
`;

fs.writeFileSync('/home/user/nexus/src/components/NexusApp.tsx', code);
