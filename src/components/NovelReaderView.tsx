"use client";
import {SidebarToggle} from "./WorkspaceNavigation";
import {confirmDialog} from '../lib/confirmDialog';

import ToolbarDropdown from "./ToolbarDropdown";
import React, { useState, useMemo, useEffect, useRef } from "react";
import type { Page, NovelSettings, NovelChapter } from "../lib/types";
import { emptyNovelDocument } from "../lib/novelChapters";
import { useWorkspaceDialog } from "./WorkspaceDialog";
import TiptapEditor from "./TiptapEditor";
import katex from "katex";

type ChapterHeading = NovelChapter & { level: number };

const THEME_STYLES: Record<
  NonNullable<NovelSettings["theme"]>,
  { bg: string; text: string; subText: string; border: string; barBg: string; name: string; icon: string }
> = {
  parchment: {
    bg: "#fcf8ec",
    text: "#2c2621",
    subText: "#786c5f",
    border: "#e7dec8",
    barBg: "#f5edd6",
    name: "羊皮紙",
    icon: "📜",
  },
  cream: {
    bg: "#f7f4ed",
    text: "#33302b",
    subText: "#837d74",
    border: "#e5ded4",
    barBg: "#ede6da",
    name: "經典米白",
    icon: "🥛",
  },
  eye_care: {
    bg: "#eef5e8",
    text: "#20331f",
    subText: "#5f775d",
    border: "#d5e5cc",
    barBg: "#deeed3",
    name: "護眼綠",
    icon: "🍃",
  },
  dark: {
    bg: "#18191c",
    text: "#dcdad5",
    subText: "#888680",
    border: "#2d2f34",
    barBg: "#222428",
    name: "夜間深色",
    icon: "🌙",
  },
  pure_white: {
    bg: "#ffffff",
    text: "#1f2937",
    subText: "#6b7280",
    border: "#e5e7eb",
    barBg: "#f9fafb",
    name: "極簡純白",
    icon: "⚪",
  },
};

const FONT_FAMILIES = {
  serif: {
    name: "宋體 / 明體",
    family: "'Noto Serif TC', 'Source Han Serif TC', 'Songti TC', 'SimSun', serif",
  },
  sans: {
    name: "黑體",
    family: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang TC', 'Microsoft JhengHei', sans-serif",
  },
  kai: {
    name: "楷體",
    family: "'Kaiti TC', 'STKaiti', 'DFKai-SB', 'BiauKai', serif",
  },
};

export default function NovelReaderView({
  page,
  chapterRecords,
  onEnableChapters,
  onCreateChapter,
  onPatchChapter,
  onTitleChange,
  onContentChange,
  onUpdateSettings,
  onBackToNovelList,
  getCoverBlob,
  onUploadCover,
  onRemoveCover,
  onDeleteNovel,
  continueEditSignal = 0,
}: {
  page: Page;
  chapterRecords: NovelChapter[];
  onEnableChapters: () => Promise<void>;
  onCreateChapter: () => Promise<NovelChapter>;
  onPatchChapter: (id: string, patch: Partial<NovelChapter>) => void;
  onTitleChange: (title: string) => void;
  onContentChange: (json: any, text: string) => void;
  onUpdateSettings: (settings: NovelSettings) => void;
  onBackToNovelList?: () => void;
  getCoverBlob?: (attachmentId: string) => Promise<Blob | null>;
  onUploadCover?: (file: File) => Promise<void>;
  onRemoveCover?: () => void;
  onDeleteNovel?: () => void;
  /** Raised by the application-level menu next to the account button. */
  continueEditSignal?: number;
}) {
  const { askText, askConfirm, dialog } = useWorkspaceDialog();
  // 小說先以作品總覽呈現；讀者可從目錄選擇章節後再進入閱讀或編輯。
  const [mode, setMode] = useState<"overview" | "read" | "edit">("overview");
  const [tocOpen, setTocOpen] = useState(true); // 預設開啟目錄，如小說軟體
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [readProgress, setReadProgress] = useState(0);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "just_saved">("saved");
  const [lastSavedTime, setLastSavedTime] = useState<string>("");
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const readerScrollRef = useRef<HTMLDivElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [coverError, setCoverError] = useState<string | null>(null);
  const [chapterError, setChapterError] = useState<string | null>(null);
  const [chapterBusy, setChapterBusy] = useState(false);
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const activeChapterIndex = Math.max(0, chapterRecords.findIndex((chapter) => chapter.id === activeChapterId));
  const activeChapter = chapterRecords[activeChapterIndex];
  const setActiveChapterIndex = (index: number) => setActiveChapterId(chapterRecords[index]?.id ?? null);
  const modeRef = useRef(mode);
  // Keep the selected record stable when another chapter moves or disappears.
  useEffect(() => {
    if (activeChapter?.id !== activeChapterId) setActiveChapterId(activeChapter?.id ?? null);
  }, [activeChapter?.id, activeChapterId]);

  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { if (continueEditSignal > 0) setMode("edit"); }, [continueEditSignal]);

  // Mobile browser/hardware Back has no SPA history entry by default, so it
  // would close the tab instead of leaving the novel editor. Reserve one
  // in-app history entry and return to the novel list first.
  useEffect(() => {
    if (window.innerWidth >= 768) return;
    const marker = { ...(window.history.state || {}), nexusNovelNavigation: true };
    window.history.pushState(marker, "");
    const onPopState = () => {
      if (modeRef.current !== "overview") {
        setMode("overview");
        setTocOpen(true);
      } else {
        onBackToNovelList?.();
      }
      window.history.pushState(marker, "");
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [onBackToNovelList]);

  const settings: NovelSettings = useMemo(
    () => ({
      ...page.novel_settings,
      synopsis: page.novel_settings?.synopsis || "",
      coverAttachmentId: page.novel_settings?.coverAttachmentId || null,
      theme: page.novel_settings?.theme || "parchment",
      fontSize: page.novel_settings?.fontSize || 18,
      fontFamily: page.novel_settings?.fontFamily || "serif",
      lineHeight: page.novel_settings?.lineHeight || 2.0,
      paragraphIndent: page.novel_settings?.paragraphIndent ?? true,
      showWordCount: page.novel_settings?.showWordCount ?? true,
    }),
    [page.novel_settings]
  );

  const updateSettings = (patch: Partial<NovelSettings>) => {
    onUpdateSettings({ ...settings, ...patch });
  };

  useEffect(() => {
    const coverId = settings.coverAttachmentId;
    if (!coverId || !getCoverBlob) { setCoverUrl(null); return; }
    let active = true;
    let objectUrl: string | null = null;
    void getCoverBlob(coverId).then((blob) => {
      if (!active || !blob) return;
      objectUrl = URL.createObjectURL(blob);
      setCoverUrl(objectUrl);
    });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [settings.coverAttachmentId, getCoverBlob]);

  const handleCoverFile = async (file?: File) => {
    if (!file || !onUploadCover) return;
    if (!file.type.startsWith("image/")) { setCoverError("封面請使用圖片檔。 "); return; }
    if (file.size > 3 * 1024 * 1024) { setCoverError("封面圖片請小於 3 MB。 "); return; }
    setCoverError(null);
    try { await onUploadCover(file); } catch { setCoverError("封面上傳失敗，請稍後再試。 "); }
  };

  const currentTheme = THEME_STYLES[settings.theme || "parchment"] || THEME_STYLES.parchment;
  const currentFont = FONT_FAMILIES[settings.fontFamily || "serif"] || FONT_FAMILIES.serif;
  const enabled = !!page.novel_settings?.chaptersEnabled;
  const documentContent = enabled ? activeChapter?.content_json ?? emptyNovelDocument() : page.content_json;
  const chapters: ChapterHeading[] = useMemo(() => chapterRecords.map((chapter) => ({ ...chapter, level: 1 })), [chapterRecords]);
  const chapterPages = chapters;

  // Total word count (移除預估閱讀時間)
  const stats = useMemo(() => {
    const text = enabled ? chapterRecords.map((chapter) => chapter.content_text).join("\n") : page.content_text || "";
    // Count Chinese characters & words
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const englishWords = (text.match(/[a-zA-Z0-9_-]+/g) || []).length;
    const totalCount = chineseChars + englishWords;
    return { totalCount };
  }, [page.content_text, enabled, chapterRecords]);

  // 封裝內容與標題變更的自動存檔狀態
  const handleContentWithAutoSave = (json: any, text: string) => {
    setSaveStatus("saving");
    if (enabled) {
      if (!activeChapter) return;
      onPatchChapter(activeChapter.id, { content_json: json, content_text: text });
    } else onContentChange(json, text);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      setSaveStatus("saved");
      const now = new Date();
      setLastSavedTime(`${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`);
    }, 800);
  };

  const handleTitleWithAutoSave = (title: string) => {
    setSaveStatus("saving");
    onTitleChange(title);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      setSaveStatus("saved");
      const now = new Date();
      setLastSavedTime(`${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`);
    }, 800);
  };

  // 鍵盤 Ctrl+S / Cmd+S 手動立即儲存
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        setSaveStatus("just_saved");
        const now = new Date();
        setLastSavedTime(`${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`);
        setTimeout(() => {
          setSaveStatus("saved");
        }, 1500);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleAddChapter = async () => {
    if (chapterBusy) return;
    setChapterBusy(true);
    setChapterError(null);
    try {
      if (!enabled) await onEnableChapters();
      else {
        const chapter = await onCreateChapter();
        setActiveChapterId(chapter.id);
      }
      setMode("edit");
      setTocOpen(true);
    } catch {
      setChapterError("章節儲存失敗，請重試。");
    } finally { setChapterBusy(false); }
  };
  const renameChapter = async (chapter: ChapterHeading) => {
    const title = (await askText("章節名稱", chapter.title))?.trim();
    if (title) onPatchChapter(chapter.id, { title });
  };
  const moveChapter = (chapter: ChapterHeading, direction: -1 | 1) => {
    const index = chapters.findIndex((item) => item.id === chapter.id);
    const target = index + direction;
    if (target < 0 || target >= chapters.length) return;
    const reordered = [...chapters];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    reordered.forEach((item, sort_order) => onPatchChapter(item.id, { sort_order }));
  };
  const deleteChapter = async (chapter: ChapterHeading) => {
    if (await askConfirm(`刪除「${chapter.title}」及其內容？`)) onPatchChapter(chapter.id, { deleted_at: Date.now() });
  };

  // Handle scroll progress in reader mode
  const handleScroll = () => {
    if (!readerScrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = readerScrollRef.current;
    const total = scrollHeight - clientHeight;
    if (total <= 0) {
      setReadProgress(100);
      return;
    }
    const pct = Math.min(100, Math.max(0, Math.round((scrollTop / total) * 100)));
    setReadProgress(pct);
  };

  // Render HTML / Structured Text for Reader Mode
  const renderedContent = useMemo(() => {
    const doc = (documentContent as any) || { content: [] };
    if (!doc.content || doc.content.length === 0) {
      return (
        <div className="py-20 text-center opacity-40">
          目前尚無小說內容，請點擊上方「✍️ 編輯模式」開始創作章節！
        </div>
      );
    }

    const visibleNodes = doc.content;
    let headingCounter = 0;

    return visibleNodes.map((node: any, i: number) => {
      if (node.type === "heading") {
        const text = (node.content || []).map((c: any) => c.text || "").join("");
        const hId = `heading-${headingCounter++}`;
        if (node.attrs?.level === 1) {
          return (
            <h1
              key={i}
              id={hId}
              className="font-bold text-center mt-12 mb-6 tracking-wide"
              style={{ fontSize: `${(settings.fontSize || 18) * 1.6}px`, color: currentTheme.text }}
            >
              {text}
            </h1>
          );
        }
        return (
          <h2
            key={i}
            id={hId}
            className="font-bold mt-8 mb-4 tracking-normal"
            style={{ fontSize: `${(settings.fontSize || 18) * 1.3}px`, color: currentTheme.text }}
          >
            {text}
          </h2>
        );
      }

      if (node.type === "paragraph") {
        const text = (node.content || []).map((c: any) => c.text || "").join("");
        if (!text.trim()) {
          return <div key={i} className="h-4" />;
        }
        return (
          <p
            key={i}
            className="my-3 text-justify"
            style={{
              textIndent: settings.paragraphIndent ? "2em" : "0",
              lineHeight: settings.lineHeight,
              fontSize: `${settings.fontSize}px`,
              letterSpacing: "0.04em",
              color: currentTheme.text,
            }}
          >
            {text}
          </p>
        );
      }

      if (node.type === "blockquote") {
        const text = (node.content || []).map((c: any) => c.text || "").join("");
        return (
          <blockquote
            key={i}
            className="my-4 pl-4 border-l-4 italic opacity-85"
            style={{ borderColor: currentTheme.border, color: currentTheme.text }}
          >
            {text}
          </blockquote>
        );
      }

      if (node.type === "blockMath") {
        const latex = node.attrs?.latex || "";
        let renderedHtml = "";
        try {
          renderedHtml = katex.renderToString(latex, { displayMode: true, throwOnError: false });
        } catch {
          renderedHtml = latex;
        }
        return (
          <div
            key={i}
            className="my-6 overflow-x-auto text-center"
            dangerouslySetInnerHTML={{ __html: renderedHtml }}
          />
        );
      }

      return null;
    });
  }, [documentContent, settings, currentTheme, mode, chapterPages, activeChapterIndex]);

  const openChapter = (id: string) => {
    const nextIndex = chapterPages.findIndex((chapter) => chapter.id === id);
    if (nextIndex >= 0) setActiveChapterIndex(nextIndex);
    setMode((current) => current === "edit" ? "edit" : "read");
    requestAnimationFrame(() => { if (readerScrollRef.current) readerScrollRef.current.scrollTop = 0; });
  };

  const switchChapter = (nextIndex: number) => {
    if (nextIndex < 0 || nextIndex >= chapterPages.length) return;
    setActiveChapterIndex(nextIndex);
    requestAnimationFrame(() => readerScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" }));
  };

  const chapterNavigation = (position: string) => chapterPages.length > 0 && (
                <nav className="my-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-y py-5 text-sm" style={{ borderColor: currentTheme.border }} aria-label={`${position}章節翻頁`}>
                  <button type="button" onClick={() => switchChapter(activeChapterIndex - 1)} disabled={activeChapterIndex === 0} className="justify-self-start rounded-lg border px-3 py-2 disabled:opacity-35" style={{ borderColor: currentTheme.border, color: currentTheme.text }}>← 上一章</button>
                  <label className="relative">
                    <span className="sr-only">選擇章節</span>
                    <select value={activeChapterIndex} onChange={(event) => switchChapter(Number(event.target.value))} className="max-w-[35vw] sm:max-w-64 rounded-lg border bg-transparent px-2 py-2 text-center text-xs outline-none" style={{ borderColor: currentTheme.border, color: currentTheme.text }}>
                      {chapterPages.map((chapter, index) => <option key={chapter.id} value={index}>{String(index + 1).padStart(2, "0")}　{chapter.title}</option>)}
                    </select>
                  </label>
                  <button type="button" onClick={() => switchChapter(activeChapterIndex + 1)} disabled={activeChapterIndex >= chapterPages.length - 1} className="justify-self-end rounded-lg border px-3 py-2 disabled:opacity-35" style={{ borderColor: currentTheme.border, color: currentTheme.text }}>下一章 →</button>
                </nav>
              );

  const moreMenu = <ToolbarDropdown label="更多操作" variant="menu" items={[
    {id:"continue",icon:"",label:"繼續編輯",onClick:()=>setMode("edit")},
    ...(onDeleteNovel?[{id:"delete",icon:"",label:"刪除小說",onClick:async ()=>{if(await confirmDialog(`確定將小說「${page.title || "未命名小說"}」移至垃圾桶？`))onDeleteNovel();}}]:[])
  ]}/>;
  if (mode === "overview") {
    return (
      <div className="flex flex-1 flex-col overflow-y-auto" style={{ backgroundColor: currentTheme.bg, color: currentTheme.text }}>
        <header className="sticky top-0 z-20 flex shrink-0 items-center justify-between border-b py-3 pl-14 pr-4 md:px-4" style={{ backgroundColor: currentTheme.barBg, borderColor: currentTheme.border }}>
          <div className="flex min-w-0 items-center gap-3">
            {onBackToNovelList && <button onClick={onBackToNovelList} className="rounded-lg border px-2.5 py-1.5 text-xs font-semibold hover:opacity-75" style={{ borderColor: currentTheme.border, backgroundColor: currentTheme.bg }}>← 小說</button>}
            <span className="truncate text-sm font-semibold">小說作品總覽</span>
          </div>
          {moreMenu}
        </header>

        <div className="mx-auto w-full max-w-6xl px-5 py-7 pb-[calc(2rem+env(safe-area-inset-bottom))] sm:px-8">
          <section className="grid items-start gap-7 md:grid-cols-[190px_minmax(0,1fr)]">
            <div className="w-full max-w-[190px]">
              <button type="button" onClick={() => coverInputRef.current?.click()} className="relative flex aspect-[2/3] w-full flex-col justify-between overflow-hidden rounded-xl border p-5 text-left shadow-lg hover:opacity-90" style={{ backgroundColor: currentTheme.barBg, borderColor: currentTheme.border }} title="更換作品封面">
                {coverUrl ? <img src={coverUrl} alt={`${page.title || "小說"}封面`} className="absolute inset-0 h-full w-full object-cover" /> : <><span className="text-4xl opacity-75">▤</span><div><p className="mb-2 text-xs font-medium opacity-60">NEXUS NOVEL</p><h1 className="line-clamp-4 text-xl font-bold leading-relaxed">{page.title || "未命名小說"}</h1></div></>}
                <span className="absolute inset-x-0 bottom-0 bg-black/55 px-3 py-2 text-center text-xs font-medium text-white">{coverUrl ? "更換封面" : "上傳封面"}</span>
              </button>
              <input ref={coverInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => { void handleCoverFile(event.target.files?.[0]); event.currentTarget.value = ""; }} />
              {coverUrl && <button type="button" onClick={onRemoveCover} className="mt-2 text-xs opacity-60 hover:opacity-100">移除封面</button>}
              {coverError && <p className="mt-2 text-xs text-red-600">{coverError}</p>}
            </div>
            <div className="min-w-0 py-1">
              <p className="mb-2 text-xs font-semibold tracking-[0.18em] opacity-60">作品概述</p>
              <input
                value={page.title}
                onChange={(event) => handleTitleWithAutoSave(event.target.value)}
                aria-label="作品名稱"
                placeholder="未命名小說"
                className="mb-4 w-full max-w-3xl bg-transparent text-3xl font-bold tracking-wide outline-none placeholder:opacity-35"
                style={{ color: currentTheme.text }}
              />
              <textarea
                value={settings.synopsis || ""}
                onChange={(event) => updateSettings({ synopsis: event.target.value })}
                aria-label="作品概述"
                placeholder="在這裡撰寫作品概述…"
                rows={5}
                className="block w-full max-w-3xl resize-y rounded-lg border bg-transparent px-3 py-2 text-sm leading-7 outline-none focus:ring-2 focus:ring-blue-400/50"
                style={{ borderColor: currentTheme.border, color: currentTheme.text }}
              />
              <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm opacity-70"><span>{chapters.length} 個章節</span><span>{stats.totalCount.toLocaleString()} 字</span><span>{currentTheme.name} 閱讀主題</span></div>
              <div className="mt-6 flex flex-wrap gap-3">
                <button onClick={() => setMode("read")} className="rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-85" style={{ backgroundColor: settings.theme === "dark" ? "#5f8fce" : "#476e9e" }}>開始閱讀</button>
                <button type="button" onClick={handleAddChapter} className="rounded-lg border px-4 py-2 text-sm font-semibold hover:opacity-75" style={{ borderColor: currentTheme.border }} disabled={chapterBusy}>{enabled ? "＋ 新增章節" : "啟用章節工作區"}</button>
              </div>
            </div>
          </section>

          {chapterError && <p role="alert" className="mt-4 text-red-600">{chapterError}</p>}
          <section className="mt-10 border-t pt-6" style={{ borderColor: currentTheme.border }}>
            <div className="mb-4 flex items-center justify-between gap-3"><div><p className="text-lg font-bold">完整目錄</p><p className="mt-1 text-xs opacity-60">點選章節即可從該處開始閱讀</p></div><span className="text-xs opacity-60">共 {chapters.length} 節</span></div>
            {chapters.length === 0 ? (
              <button type="button" onClick={handleAddChapter} className="w-full rounded-xl border border-dashed px-4 py-8 text-center text-sm opacity-70 hover:opacity-100" style={{ borderColor: currentTheme.border }}>{enabled ? "尚未建立章節，點此新增第一章" : "啟用章節工作區（先轉存舊正文，再清空作品正文）"}</button>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {chapters.map((chapter, index) => <button key={chapter.id} onClick={() => openChapter(chapter.id)} className="flex min-w-0 items-center gap-3 rounded-lg border px-4 py-3 text-left transition-opacity hover:opacity-70" style={{ borderColor: currentTheme.border, backgroundColor: currentTheme.barBg }}><span className="shrink-0 text-xs opacity-50">{String(index + 1).padStart(2, "0")}</span><span className={`truncate text-sm ${chapter.level === 2 ? "pl-3 opacity-80" : "font-semibold"}`}>{chapter.title}</span></button>)}
              </div>
            )}
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="isolate flex min-h-0 flex-1 flex-col overflow-hidden" style={{ backgroundColor: currentTheme.bg }} onPasteCapture={() => requestAnimationFrame(() => window.dispatchEvent(new Event("resize")))}>
      {/* 頂部沉浸式導航列 */}
      <header
        className="shrink-0 hidden md:flex items-center justify-between gap-2 border-b px-4 py-2.5 select-none z-20 transition-colors duration-200"
        style={{
          backgroundColor: currentTheme.barBg,
          borderColor: currentTheme.border,
          color: currentTheme.text,
        }}
      >
        {/* 左側：標題與章節目錄按鈕、新增章節與字數 */}
        <div className="flex items-center gap-2 min-w-0">
          <SidebarToggle/>{onBackToNovelList && (
            <button
              onClick={onBackToNovelList}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold hover:opacity-80 transition-all cursor-pointer shadow-sm shrink-0"
              style={{ borderColor: currentTheme.border, backgroundColor: currentTheme.bg }}
              title="返回小說列表"
            >
              <span className="hidden sm:inline">« 小說列表</span><span className="sm:hidden">←</span>
            </button>
          )}

          <button
            onClick={() => setTocOpen((v) => !v)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium hover:opacity-80 transition-all cursor-pointer shadow-sm shrink-0 ${
              tocOpen ? "ring-1 ring-blue-500 font-bold" : ""
            }`}
            style={{ borderColor: currentTheme.border, backgroundColor: currentTheme.bg }}
            title={tocOpen ? "收合目錄大綱" : "展開目錄大綱"}
          >
            <span>📑</span><span className="hidden sm:inline">目錄 ({chapters.length})</span>
          </button>

          {/* 直覺新增章節快捷按鈕 */}
          <button
            onClick={handleAddChapter}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-all cursor-pointer shadow-sm shrink-0"
            title="新增下一章節"
          >
            <span>＋</span><span className="hidden sm:inline">新增章節</span>
          </button>

          <input
            value={page.title || ""}
            onChange={(e) => handleTitleWithAutoSave(e.target.value)}
            placeholder="小說作品名稱"
            className="font-bold text-sm bg-transparent outline-none truncate min-w-[72px] max-w-[240px] px-1 focus:ring-1 focus:ring-blue-500 rounded"
            style={{ color: currentTheme.text }}
          />

          {settings.showWordCount && (
            <span
              className="text-[11px] px-2 py-0.5 rounded-full border opacity-75 hidden sm:inline-block shrink-0"
              style={{ borderColor: currentTheme.border, color: currentTheme.subText }}
            >
              ✍️ {stats.totalCount.toLocaleString()} 字
            </span>
          )}

          {/* 自動存檔即時狀態指示器 */}
          <div className="hidden md:flex items-center gap-1 text-[11px] opacity-75 px-1.5 py-0.5 rounded shrink-0">
            {saveStatus === "saving" && (
              <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1 animate-pulse">
                <span>🟡</span>
                <span>正在儲存...</span>
              </span>
            )}
            {saveStatus === "just_saved" && (
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <span>✓</span>
                <span>已立即手動存檔</span>
              </span>
            )}
            {saveStatus === "saved" && (
              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <span>🟢</span>
                <span>已自動儲存{lastSavedTime ? ` (${lastSavedTime})` : ""}</span>
              </span>
            )}
          </div>
        </div>

        {/* 右側：模式切換與閱讀排版設定 */}
        <div className="flex items-center gap-2">
          {/* 模式切換 */}
          <div
            className="flex items-center rounded-lg p-0.5 border text-xs shadow-inner"
            style={{ borderColor: currentTheme.border, backgroundColor: currentTheme.bg }}
          >
            <button
              onClick={() => setMode("read")}
              className={`px-2 sm:px-3 py-1 rounded-md transition-all font-medium flex items-center gap-1 ${
                mode === "read" ? "shadow-sm" : "opacity-60 hover:opacity-100"
              }`}
              style={{
                backgroundColor: mode === "read" ? currentTheme.barBg : "transparent",
                color: currentTheme.text,
              }}
            >
              <span>📖</span><span className="hidden sm:inline">閱讀模式</span>
            </button>
            <button
              onClick={() => setMode("edit")}
              className={`px-2 sm:px-3 py-1 rounded-md transition-all font-medium flex items-center gap-1 ${
                mode === "edit" ? "shadow-sm" : "opacity-60 hover:opacity-100"
              }`}
              style={{
                backgroundColor: mode === "edit" ? currentTheme.barBg : "transparent",
                color: currentTheme.text,
              }}
            >
              <span>✍️</span><span className="hidden sm:inline">編輯模式</span>
            </button>
          </div>

          {/* 排版設定按鈕 */}
          <div className="relative">
            <button
              onClick={() => setSettingsOpen((v) => !v)}
              className="p-1.5 rounded-lg border text-xs font-medium hover:opacity-80 transition-all cursor-pointer shadow-sm flex items-center gap-1"
              style={{ borderColor: currentTheme.border, backgroundColor: currentTheme.bg }}
              title="閱讀排版與主題設定"
            >
              <span>⚙️</span><span className="hidden sm:inline">排版</span>
            </button>

            {/* 排版設定彈窗 */}
            {settingsOpen && (
              <div
                className="absolute right-0 top-full mt-2 w-72 rounded-xl shadow-2xl p-4 z-50 text-xs border space-y-4"
                style={{
                  backgroundColor: currentTheme.barBg,
                  borderColor: currentTheme.border,
                  color: currentTheme.text,
                }}
              >
                <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: currentTheme.border }}>
                  <span className="font-bold text-sm">小說閱讀排版設定</span>
                  <button onClick={() => setSettingsOpen(false)} className="opacity-50 hover:opacity-100">✕</button>
                </div>

                {/* 閱讀底色主題 */}
                <div>
                  <div className="opacity-70 mb-2 font-medium">閱讀紙張氛圍</div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(Object.keys(THEME_STYLES) as Array<NonNullable<NovelSettings["theme"]>>).map((thKey) => {
                      const th = THEME_STYLES[thKey];
                      const active = settings.theme === thKey;
                      return (
                        <button
                          key={thKey}
                          onClick={() => updateSettings({ theme: thKey })}
                          className={`flex items-center justify-center gap-1 py-1.5 rounded-lg border transition-all text-xs ${
                            active ? "ring-2 ring-blue-500 font-bold" : "opacity-80 hover:opacity-100"
                          }`}
                          style={{
                            backgroundColor: th.bg,
                            color: th.text,
                            borderColor: th.border,
                          }}
                        >
                          <span>{th.icon}</span>
                          <span>{th.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 字體選擇 */}
                <div>
                  <div className="opacity-70 mb-2 font-medium">閱讀字體</div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(Object.keys(FONT_FAMILIES) as Array<keyof typeof FONT_FAMILIES>).map((fKey) => {
                      const active = settings.fontFamily === fKey;
                      return (
                        <button
                          key={fKey}
                          onClick={() => updateSettings({ fontFamily: fKey })}
                          className={`py-1.5 px-2 rounded-lg border text-center transition-all ${
                            active ? "ring-2 ring-blue-500 font-bold" : "opacity-80 hover:opacity-100"
                          }`}
                          style={{
                            borderColor: currentTheme.border,
                            backgroundColor: currentTheme.bg,
                          }}
                        >
                          {FONT_FAMILIES[fKey].name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 字體大小 */}
                <div>
                  <div className="flex items-center justify-between opacity-70 mb-1.5 font-medium">
                    <span>字體大小</span>
                    <span className="font-mono">{settings.fontSize}px</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateSettings({ fontSize: Math.max(14, (settings.fontSize || 18) - 1) })}
                      className="px-3 py-1 rounded border hover:opacity-80 font-bold"
                      style={{ borderColor: currentTheme.border, backgroundColor: currentTheme.bg }}
                    >
                      A-
                    </button>
                    <input
                      type="range"
                      min={14}
                      max={26}
                      step={1}
                      value={settings.fontSize || 18}
                      onChange={(e) => updateSettings({ fontSize: Number(e.target.value) })}
                      className="flex-1 accent-blue-600"
                    />
                    <button
                      onClick={() => updateSettings({ fontSize: Math.min(26, (settings.fontSize || 18) + 1) })}
                      className="px-3 py-1 rounded border hover:opacity-80 font-bold"
                      style={{ borderColor: currentTheme.border, backgroundColor: currentTheme.bg }}
                    >
                      A+
                    </button>
                  </div>
                </div>

                {/* 行高調整 */}
                <div>
                  <div className="flex items-center justify-between opacity-70 mb-1.5 font-medium">
                    <span>行距間隔</span>
                    <span className="font-mono">{(settings.lineHeight || 2.0).toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min={1.6}
                    max={2.6}
                    step={0.1}
                    value={settings.lineHeight || 2.0}
                    onChange={(e) => updateSettings({ lineHeight: Number(e.target.value) })}
                    className="w-full accent-blue-600"
                  />
                </div>

                {/* 段落縮排開關 */}
                <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: currentTheme.border }}>
                  <span className="font-medium">段落首行縮排 (2 字元)</span>
                  <input
                    type="checkbox"
                    checked={settings.paragraphIndent}
                    onChange={(e) => updateSettings({ paragraphIndent: e.target.checked })}
                    className="w-4 h-4 accent-blue-600 cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
        {moreMenu}
      </header>

      {dialog}
      {/* Mobile keeps the essential actions in a compact, non-wrapping bar.
          The desktop toolbar cannot fit a phone once the editor is active. */}
      <header
        className="relative z-40 md:hidden flex shrink-0 items-center gap-1 border-b px-2 py-2 shadow-sm"
        style={{ backgroundColor: currentTheme.barBg, borderColor: currentTheme.border, color: currentTheme.text }}
      >
        <SidebarToggle/>{onBackToNovelList && (
          <button onClick={onBackToNovelList} className="rounded-md border px-2 py-1.5 text-sm font-semibold" style={{ borderColor: currentTheme.border, backgroundColor: currentTheme.bg }} title="返回小說列表">←</button>
        )}
        <button onClick={() => setTocOpen((value) => !value)} className="rounded-md border px-2 py-1.5 text-sm" style={{ borderColor: currentTheme.border, backgroundColor: currentTheme.bg }} title={tocOpen ? "收合目錄" : "開啟目錄"}>📑</button>
        <div className="min-w-0 flex-1 truncate px-1 text-xs font-semibold">{page.title || "未命名小說"}</div>
        <span className={`shrink-0 text-[10px] ${saveStatus === "saving" ? "text-amber-600" : "text-emerald-600"}`} title={saveStatus === "saving" ? "正在儲存" : "已自動儲存"}>{saveStatus === "saving" ? "儲存中" : "已儲存"}</span>
        <button onClick={() => setMode(mode === "edit" ? "read" : "edit")} className="rounded-md border px-2 py-1.5 text-xs font-semibold" style={{ borderColor: currentTheme.border, backgroundColor: currentTheme.bg }} title={mode === "edit" ? "查看閱讀結果" : "回到編輯"}>{mode === "edit" ? "閱讀" : "編輯"}</button>
        {moreMenu}
      </header>

      {chapterError && <p role="alert" className="p-3 text-red-600">{chapterError}</p>}
      {/* 閱讀進度條 */}
      {mode === "read" && (
        <div className="w-full h-1 bg-zinc-200/40 relative overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-150"
            style={{ width: `${readProgress}%` }}
          />
        </div>
      )}

      {/* 主要內容展示區 */}
      <div className="flex min-h-0 flex-1 overflow-hidden relative">
        {/* 左側章節目錄側邊欄 / 抽屜 */}
        {tocOpen && (
          <aside
            className="absolute inset-y-0 left-0 z-30 flex w-[min(20rem,82vw)] flex-col overflow-y-auto border-r p-4 shadow-xl transition-all duration-200 md:static md:w-64 md:shrink-0 md:shadow-none touch-pan-y overscroll-contain"
            style={{
              backgroundColor: currentTheme.barBg,
              borderColor: currentTheme.border,
            }}
          >
            <div className="flex items-center justify-between mb-3 pb-2 border-b" style={{ borderColor: currentTheme.border }}>
              <span className="font-bold text-xs flex items-center gap-1.5" style={{ color: currentTheme.text }}>
                <span>📑</span>
                <span>章節工作區</span>
              </span>
              <button onClick={() => setTocOpen(false)} className="text-xs opacity-50 hover:opacity-100 p-1 cursor-pointer" title="關閉目錄">
                ✕
              </button>
            </div>

            {/* 目錄側邊欄內的直覺「＋ 新增章節」按鈕 */}
            <button
              onClick={handleAddChapter}
              className="w-full mb-3 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border text-xs font-semibold hover:opacity-90 transition-all cursor-pointer shadow-xs"
              style={{
                backgroundColor: currentTheme.bg,
                borderColor: currentTheme.border,
                color: currentTheme.text,
              }}
            >
              <span className="text-blue-600 dark:text-blue-400 font-bold">＋</span>
              <span>{enabled ? "新增章節" : "啟用章節工作區"}</span>
            </button>

            {chapters.length === 0 ? (
              <div className="text-xs opacity-60 py-8 text-center flex flex-col items-center gap-3" style={{ color: currentTheme.subText }}>
                <span>尚未建立章節</span>
                <button
                  onClick={handleAddChapter}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
                >
                  {enabled ? "＋ 建立第一章" : "啟用章節工作區"}
                </button>
              </div>
            ) : (
              <div className="space-y-1">
                {chapters.map((chap, cIdx) => (
                  <div key={chap.id} className={`group flex items-center gap-1 rounded-lg ${chap.level === 1 ? "font-bold" : "pl-3 opacity-80"} hover:bg-black/5 dark:hover:bg-white/5`}>
                    <button onClick={() => openChapter(chap.id)} className="min-w-0 flex-1 truncate px-2.5 py-2 text-left text-xs" style={{ color: currentTheme.text }} title={chap.title}>
                      <span className="mr-2 opacity-40 text-[10px] font-mono">{String(cIdx + 1).padStart(2, "0")}</span><span>{chap.title}</span>
                    </button>
                    {mode === "edit" && chap.level === 1 && (
                      <div className="flex shrink-0 items-center pr-1 text-[10px] opacity-100 md:opacity-0 md:group-hover:opacity-100">
                        <button onClick={() => renameChapter(chap)} className="rounded px-1 py-1 hover:bg-black/10" title="重新命名章節">✎</button>
                        <button onClick={() => moveChapter(chap, -1)} disabled={!chapters.slice(0, cIdx).some((item) => item.level === 1)} className="rounded px-1 py-1 hover:bg-black/10 disabled:opacity-25" title="上移章節">↑</button>
                        <button onClick={() => moveChapter(chap, 1)} disabled={!chapters.slice(cIdx + 1).some((item) => item.level === 1)} className="rounded px-1 py-1 hover:bg-black/10 disabled:opacity-25" title="下移章節">↓</button>
                        <button onClick={() => deleteChapter(chap)} className="rounded px-1 py-1 text-red-600 hover:bg-red-500/10" title="刪除章節">×</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </aside>
        )}

        {/* 閱讀檢視或編輯器檢視 */}
        {mode === "read" ? (
          <div
            ref={readerScrollRef}
            onScroll={handleScroll}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain touch-pan-y px-5 py-8 pb-[calc(8rem+env(safe-area-inset-bottom))] sm:px-12 sm:py-10 transition-colors duration-200"
            style={{
              backgroundColor: currentTheme.bg,
              fontFamily: currentFont.family,
            }}
          >
            <div className="max-w-[760px] mx-auto min-h-[90vh]">
              {/* 小說主標題 */}
              <div className="text-center mb-10 pb-6 border-b" style={{ borderColor: currentTheme.border }}>
                <h1
                  className="font-bold tracking-widest mb-2"
                  style={{ fontSize: `${(settings.fontSize || 18) * 1.8}px`, color: currentTheme.text }}
                >
                  {page.title || "未命名小說"}
                </h1>
                <div className="text-xs opacity-60" style={{ color: currentTheme.subText }}>
                  全文共 {stats.totalCount.toLocaleString()} 字
                </div>
              </div>

              {chapterNavigation("頂部")}
              {/* 小說正文 */}
              <div className="novel-body selection:bg-amber-200 selection:text-black">
                {enabled && activeChapter && <h2 className="mb-6 text-center text-2xl font-bold">{activeChapter.title}</h2>}
                {renderedContent}
              </div>

              {chapterNavigation("底部")}

              {/* 結尾標誌 */}
              <div className="mt-12 pt-8 pb-16 text-center border-t opacity-40 text-xs" style={{ borderColor: currentTheme.border, color: currentTheme.subText }}>
                {activeChapterIndex >= chapterPages.length - 1 ? "❖ 全文完 · 感謝閱讀 ❖" : "❖ 本章完 ❖"}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden" style={{ backgroundColor: "var(--color-editor-bg)" }}>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain touch-pan-y pb-[calc(8rem+env(safe-area-inset-bottom))]">
              {chapterNavigation("頂部")}
              {enabled && activeChapter && <input aria-label="章節標題" value={activeChapter.title} onChange={(event) => onPatchChapter(activeChapter.id, { title: event.target.value })} className="w-full border-b bg-transparent p-5 text-xl font-bold" />}
              {(!enabled || activeChapter) ? <TiptapEditor
                key={activeChapter?.id ?? page.id}
                content={documentContent}
                onChange={({ json, text }: { json: any; text: string }) => {
                  handleContentWithAutoSave(json, text);
                }}
                paneId={`novel-editor-${activeChapter?.id ?? page.id}`}
                variant="novel"
                showToolbar={true}
              /> : <button onClick={handleAddChapter} className="p-8">＋ 建立第一章</button>}
              {chapterNavigation("底部")}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
