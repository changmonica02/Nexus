"use client";
import React, { useState, useMemo, useEffect, useRef } from "react";
import type { Page, NovelSettings } from "../lib/types";
import TiptapEditor from "./TiptapEditor";
import katex from "katex";

interface ChapterHeading {
  id: string;
  title: string;
  level: number;
}

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
  onTitleChange,
  onContentChange,
  onUpdateSettings,
  onBackToCreativeOverview,
}: {
  page: Page;
  onTitleChange: (title: string) => void;
  onContentChange: (json: any, text: string) => void;
  onUpdateSettings: (settings: NovelSettings) => void;
  onBackToCreativeOverview?: () => void;
}) {
  const [mode, setMode] = useState<"read" | "edit">("read");
  const [tocOpen, setTocOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [readProgress, setReadProgress] = useState(0);
  const readerScrollRef = useRef<HTMLDivElement>(null);

  const settings: NovelSettings = useMemo(
    () => ({
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

  const currentTheme = THEME_STYLES[settings.theme || "parchment"] || THEME_STYLES.parchment;
  const currentFont = FONT_FAMILIES[settings.fontFamily || "serif"] || FONT_FAMILIES.serif;

  // Extract chapters & headings from content_json
  const chapters: ChapterHeading[] = useMemo(() => {
    const doc = (page.content_json as any) || { content: [] };
    const headings: ChapterHeading[] = [];
    let idx = 0;

    function extract(node: any) {
      if (!node) return;
      if (node.type === "heading" && (node.attrs?.level === 1 || node.attrs?.level === 2)) {
        let text = "";
        if (Array.isArray(node.content)) {
          text = node.content.map((c: any) => c.text || "").join("");
        }
        if (text.trim()) {
          headings.push({
            id: `heading-${idx++}`,
            title: text.trim(),
            level: node.attrs?.level || 1,
          });
        }
      }
      if (Array.isArray(node.content)) {
        node.content.forEach(extract);
      }
    }

    extract(doc);
    return headings;
  }, [page.content_json]);

  // Total word count and reading time
  const stats = useMemo(() => {
    const text = page.content_text || "";
    // Count Chinese characters & words
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const englishWords = (text.match(/[a-zA-Z0-9_-]+/g) || []).length;
    const totalCount = chineseChars + englishWords;
    const readMinutes = Math.max(1, Math.ceil(totalCount / 450));
    return { totalCount, readMinutes };
  }, [page.content_text]);

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
    const doc = (page.content_json as any) || { content: [] };
    if (!doc.content || doc.content.length === 0) {
      return (
        <div className="py-20 text-center opacity-40">
          目前尚無小說內容，請點擊上方「✍️ 編輯模式」開始創作章節！
        </div>
      );
    }

    let headingCounter = 0;

    return doc.content.map((node: any, i: number) => {
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
  }, [page.content_json, settings, currentTheme]);

  const scrollToHeading = (id: string) => {
    if (!readerScrollRef.current) return;
    const el = readerScrollRef.current.querySelector(`#${id}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setTocOpen(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden" style={{ backgroundColor: currentTheme.bg }}>
      {/* 頂部沉浸式導航列 */}
      <header
        className="shrink-0 flex items-center justify-between px-4 py-2.5 border-b select-none z-20 transition-colors duration-200"
        style={{
          backgroundColor: currentTheme.barBg,
          borderColor: currentTheme.border,
          color: currentTheme.text,
        }}
      >
        {/* 左側：標題與章節目錄按鈕 */}
        <div className="flex items-center gap-2 min-w-0">
          {onBackToCreativeOverview && (
            <button
              onClick={onBackToCreativeOverview}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold hover:opacity-80 transition-all cursor-pointer shadow-sm shrink-0"
              style={{ borderColor: currentTheme.border, backgroundColor: currentTheme.bg }}
              title="返回創作總覽工作台"
            >
              <span>« 創作總覽</span>
            </button>
          )}

          <button
            onClick={() => setTocOpen((v) => !v)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium hover:opacity-80 transition-all cursor-pointer shadow-sm shrink-0"
            style={{ borderColor: currentTheme.border, backgroundColor: currentTheme.bg }}
            title="章節目錄大綱"
          >
            <span>📑</span>
            <span>目錄 ({chapters.length})</span>
          </button>

          <input
            value={page.title || ""}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="小說作品名稱"
            className="font-bold text-sm bg-transparent outline-none truncate min-w-[120px] max-w-[280px]"
            style={{ color: currentTheme.text }}
          />

          {settings.showWordCount && (
            <span
              className="text-[11px] px-2 py-0.5 rounded-full border opacity-75 hidden sm:inline-block"
              style={{ borderColor: currentTheme.border, color: currentTheme.subText }}
            >
              ✍️ {stats.totalCount.toLocaleString()} 字 · 約 {stats.readMinutes} 分鐘
            </span>
          )}
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
              className={`px-3 py-1 rounded-md transition-all font-medium flex items-center gap-1 ${
                mode === "read" ? "shadow-sm" : "opacity-60 hover:opacity-100"
              }`}
              style={{
                backgroundColor: mode === "read" ? currentTheme.barBg : "transparent",
                color: currentTheme.text,
              }}
            >
              📖 閱讀模式
            </button>
            <button
              onClick={() => setMode("edit")}
              className={`px-3 py-1 rounded-md transition-all font-medium flex items-center gap-1 ${
                mode === "edit" ? "shadow-sm" : "opacity-60 hover:opacity-100"
              }`}
              style={{
                backgroundColor: mode === "edit" ? currentTheme.barBg : "transparent",
                color: currentTheme.text,
              }}
            >
              ✍️ 編輯模式
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
              ⚙️ 排版
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
      </header>

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
      <div className="flex flex-1 overflow-hidden relative">
        {/* 左側章節目錄側邊欄 / 抽屜 */}
        {tocOpen && (
          <aside
            className="w-64 shrink-0 border-r flex flex-col p-4 z-10 overflow-y-auto transition-all duration-200"
            style={{
              backgroundColor: currentTheme.barBg,
              borderColor: currentTheme.border,
            }}
          >
            <div className="flex items-center justify-between mb-3 pb-2 border-b" style={{ borderColor: currentTheme.border }}>
              <span className="font-bold text-xs" style={{ color: currentTheme.text }}>
                📑 章回大綱目錄
              </span>
              <button onClick={() => setTocOpen(false)} className="text-xs opacity-50 hover:opacity-100">
                ✕
              </button>
            </div>

            {chapters.length === 0 ? (
              <div className="text-xs opacity-50 py-8 text-center" style={{ color: currentTheme.subText }}>
                尚未標記章節標題（在編輯模式使用 H1 或 H2 標題自動生成）
              </div>
            ) : (
              <div className="space-y-1">
                {chapters.map((chap) => (
                  <button
                    key={chap.id}
                    onClick={() => scrollToHeading(chap.id)}
                    className={`w-full text-left text-xs py-2 px-2.5 rounded-lg truncate transition-all ${
                      chap.level === 1 ? "font-bold" : "pl-5 opacity-80"
                    } hover:bg-black/5 dark:hover:bg-white/5`}
                    style={{ color: currentTheme.text }}
                    title={chap.title}
                  >
                    {chap.title}
                  </button>
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
            className="flex-1 overflow-y-auto px-6 sm:px-12 py-10 transition-colors duration-200"
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
                  全文共 {stats.totalCount.toLocaleString()} 字 · 閱讀時間約 {stats.readMinutes} 分鐘
                </div>
              </div>

              {/* 小說正文 */}
              <div className="novel-body selection:bg-amber-200 selection:text-black">
                {renderedContent}
              </div>

              {/* 結尾標誌 */}
              <div className="mt-20 pt-8 pb-16 text-center border-t opacity-40 text-xs" style={{ borderColor: currentTheme.border, color: currentTheme.subText }}>
                ❖ 全文完 · 感謝閱讀 ❖
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: "var(--color-editor-bg)" }}>
            <TiptapEditor
              content={page.content_json}
              onChange={({ json, text }: { json: any; text: string }) => {
                onContentChange(json, text);
              }}
              paneId="novel-editor"
              showToolbar={true}
            />
          </div>
        )}
      </div>
    </div>
  );
}
