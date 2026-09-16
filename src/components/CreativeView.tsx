"use client";
import React, { useState, useMemo, useEffect } from "react";
import { isCreativeCharacterPage, type Page } from "../lib/types";
import CharacterTemplateManager from "./CharacterTemplateManager";
import { useLanguage } from "../lib/LanguageContext";

// 書本封面主題配色庫
const BOOK_COVER_THEMES = [
  { bg: "linear-gradient(145deg, #1e1b4b 0%, #312e81 60%, #4338ca 100%)", border: "#4338ca", accent: "#fbbf24", spine: "#17143a" },
  { bg: "linear-gradient(145deg, #450a0a 0%, #7f1d1d 60%, #991b1b 100%)", border: "#991b1b", accent: "#fef08a", spine: "#310505" },
  { bg: "linear-gradient(145deg, #064e3b 0%, #065f46 60%, #047857 100%)", border: "#047857", accent: "#a7f3d0", spine: "#033427" },
  { bg: "linear-gradient(145deg, #18181b 0%, #27272a 60%, #3f3f46 100%)", border: "#3f3f46", accent: "#e4e4e7", spine: "#09090b" },
  { bg: "linear-gradient(145deg, #4c1d95 0%, #6d28d9 60%, #7c3aed 100%)", border: "#7c3aed", accent: "#fbcfe8", spine: "#37146e" },
  { bg: "linear-gradient(145deg, #451a03 0%, #78350f 60%, #92400e 100%)", border: "#92400e", accent: "#fde68a", spine: "#2e1001" },
];

function getNovelStats(page: Page) {
  const text = page.content_text || "";
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const englishWords = (text.match(/[a-zA-Z0-9_-]+/g) || []).length;
  const totalCount = chineseChars + englishWords;

  const doc = (page.content_json as any) || { content: [] };
  let chapterCount = 0;
  function countHeadings(node: any) {
    if (!node) return;
    if (node.type === "heading" && (node.attrs?.level === 1 || node.attrs?.level === 2)) {
      chapterCount++;
    }
    if (Array.isArray(node.content)) node.content.forEach(countHeadings);
  }
  countHeadings(doc);

  return { totalCount, chapterCount: Math.max(chapterCount, 1) };
}

export default function CreativeView({
  pages,
  onCreateCharacter,
  onCreateWorld,
  onSelectPage,
  onDeletePage,
  templates = [],
  onCreateTemplate,
  onRenameTemplate,
}: {
  pages: Page[];
  onCreateCharacter: (templateId?: string) => void;
  templates?: Page[];
  onCreateTemplate: () => void;
  onRenameTemplate: (id: string, title: string) => void;
  onCreateWorld: () => void;
  onSelectPage: (id: string) => void;
  onDeletePage?: (id: string) => void;
}) {
  const { t } = useLanguage();
  const [charModalOpen, setCharModalOpen] = useState(false);
  const [templateManagerOpen, setTemplateManagerOpen] = useState(false);

  // Windows 總管三種檢視模式：圖示 (icons)、清單 (list)、詳細資料 (details)
  const [viewMode, setViewMode] = useState<"icons" | "list" | "details">("icons");

  // 詳細資料模式排序狀態
  const [sortField, setSortField] = useState<"title" | "type" | "size" | "updated_at" | "created_at">("updated_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    const savedMode = localStorage.getItem("nexus_creative_view_mode") as "icons" | "list" | "details" | null;
    if (savedMode === "icons" || savedMode === "list" || savedMode === "details") {
      setViewMode(savedMode);
    }
  }, []);

  const handleSetViewMode = (mode: "icons" | "list" | "details") => {
    setViewMode(mode);
    localStorage.setItem("nexus_creative_view_mode", mode);
  };

  const creativePages = useMemo(() => {
    // 小說有專屬入口；創作工作台只管理角色與創作素材。
    return pages.filter((p) => !p.deleted_at && !p.character_data?.isTemplate && isCreativeCharacterPage(p));
  }, [pages]);

  const characterPages = useMemo(() => {
    return creativePages;
  }, [creativePages]);

  const displayedPages = useMemo(() => {
    const baseList = creativePages;

    return [...baseList].sort((a, b) => {
      let cmp = 0;
      if (sortField === "title") {
        cmp = (a.title || "").localeCompare(b.title || "");
      } else if (sortField === "type") {
        const aType = a.creative_type || (a.character_data ? "character" : "novel");
        const bType = b.creative_type || (b.character_data ? "character" : "novel");
        cmp = aType.localeCompare(bType);
      } else if (sortField === "size") {
        const aSize = (a.content_text || "").length;
        const bSize = (b.content_text || "").length;
        cmp = aSize - bSize;
      } else if (sortField === "created_at") {
        cmp = (a.created_at || 0) - (b.created_at || 0);
      } else {
        cmp = (a.updated_at || 0) - (b.updated_at || 0);
      }
      return sortOrder === "asc" ? cmp : -cmp;
    });
  }, [creativePages, sortField, sortOrder]);

  const toggleSort = (field: "title" | "type" | "size" | "updated_at" | "created_at") => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  return (
    <main className="flex flex-col flex-1 overflow-y-auto" style={{ backgroundColor: "var(--color-editor-bg)" }}>
      {templateManagerOpen && <CharacterTemplateManager templates={templates} onClose={() => setTemplateManagerOpen(false)} onCreate={onCreateTemplate} onEdit={onSelectPage} onRename={onRenameTemplate} onDelete={(id) => onDeletePage?.(id)} onUse={onCreateCharacter} />}
      <div className="mx-auto w-full max-w-[960px] p-6 sm:p-10 space-y-8">
        {/* 標題與簡介 */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: "var(--color-text)" }}>
            <span>✍️</span>
            <span>{t("sidebar.nav.creative")} 工作台</span>
          </h1>
          <p className="text-xs opacity-60 mt-1">管理世界觀、角色檔案與創作素材；小說請從獨立的「小說」功能進入。</p>
        </div>

        <button onClick={() => setTemplateManagerOpen(true)} className="rounded-lg border px-4 py-2 text-sm" style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}>模板管理</button>
        {/* 快速新增區塊 */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* 新增角色卡片 */}
          <button
            onClick={() => setCharModalOpen(true)}
            className="group rounded-2xl border p-5 text-left hover:shadow-lg transition-all duration-200 cursor-pointer relative overflow-hidden flex flex-col justify-between"
            style={{ backgroundColor: "var(--color-bg)", borderColor: "var(--color-border)" }}
          >
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-2xl flex items-center justify-center border border-indigo-200 dark:border-indigo-900 group-hover:scale-105 transition-transform">
                🎭
              </div>
              <span className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-100/60 dark:bg-indigo-900/40 px-2 py-0.5 rounded-full">
                動態組件
              </span>
            </div>
            <div className="mt-4">
              <div className="text-base font-bold group-hover:text-blue-600 transition-colors">角色詳細簡介表</div>
              <div className="text-xs opacity-60 mt-1 leading-relaxed">
                結構化角色檔案、外貌心理、自訂屬性數值條、人際關係與履歷卡
              </div>
            </div>
            <div className="mt-4 pt-3 border-t text-xs font-semibold text-blue-600 flex items-center gap-1" style={{ borderColor: "var(--color-border)" }}>
              <span>＋ 選擇模板建立角色</span>
            </div>
          </button>
          <button onClick={onCreateWorld} className="group rounded-2xl border p-5 text-left hover:shadow-lg transition-all" style={{ backgroundColor: "var(--color-bg)", borderColor: "var(--color-border)" }}>
            <div className="text-base font-bold group-hover:text-blue-600">建立世界觀</div>
            <div className="mt-2 text-xs leading-relaxed opacity-60">以相同的區塊式資料頁整理世界設定、地點、歷史與規則。</div>
            <div className="mt-4 text-xs font-semibold text-blue-600">＋ 建立世界觀</div>
          </button>
        </div>

        {/* 角色模板選擇 Modal */}
        {charModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div
              className="max-h-[85dvh] overflow-y-auto w-full max-w-md rounded-2xl border shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150"
              style={{ backgroundColor: "var(--color-bg)", borderColor: "var(--color-border)" }}
            >
              <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: "var(--color-border)" }}>
                <div className="flex items-center gap-2">
                  <span className="text-xl">🎭</span>
                  <h3 className="font-bold text-base">選擇角色簡介模板</h3>
                </div>
                <button onClick={() => setCharModalOpen(false)} className="text-sm opacity-50 hover:opacity-100 p-1">
                  ✕
                </button>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => { onCreateCharacter("dnd5e"); setCharModalOpen(false); }}
                  className="w-full text-left p-3.5 rounded-xl border hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-all flex items-start gap-3 group"
                  style={{ borderColor: "var(--color-border)" }}
                >
                  <div><div className="font-bold text-sm group-hover:text-blue-600">D&amp;D 5e 角色模板</div><div className="text-xs opacity-60 mt-0.5">冒險者基本資料、能力評分與背景欄位</div></div>
                </button>
                <button
                  onClick={() => { onCreateCharacter("coc7e"); setCharModalOpen(false); }}
                  className="w-full text-left p-3.5 rounded-xl border hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-all flex items-start gap-3 group"
                  style={{ borderColor: "var(--color-border)" }}
                >
                  <div><div className="font-bold text-sm group-hover:text-blue-600">CoC 7e 調查員模板</div><div className="text-xs opacity-60 mt-0.5">調查員資料、專業能力與履歷欄位</div></div>
                </button>
                <button
                  onClick={() => {
                    onCreateCharacter("blank");
                    setCharModalOpen(false);
                  }}
                  className="w-full text-left p-3.5 rounded-xl border hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-all flex items-start gap-3 group"
                  style={{ borderColor: "var(--color-border)" }}
                >
                  <span className="text-2xl mt-0.5">📄</span>
                  <div>
                    <div className="font-bold text-sm group-hover:text-blue-600">空白自訂角色檔案</div>
                    <div className="text-xs opacity-60 mt-0.5">純淨空白，隨心所欲自由新增鍵值、標籤、數值與關係組件</div>
                  </div>
                </button>
                {templates.length > 0 && <div className="border-t pt-3"><p className="mb-2 text-xs opacity-60">自訂模板</p>{templates.map((template) => <button key={template.id} onClick={() => { onCreateCharacter(template.id); setCharModalOpen(false); }} className="mb-2 w-full rounded-lg border p-3 text-left text-sm" style={{ borderColor: "var(--color-border)" }}>{template.title}</button>)}</div>}
              </div>
            </div>
          </div>
        )}

        {/* 已建立的創作清單區塊 */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3" style={{ borderColor: "var(--color-border)" }}>
            <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold">
              <span>🎭 角色檔案</span><span className="opacity-55">({characterPages.length})</span>
            </div>

            {/* Windows 檔案總管三種檢視切換器 */}
            <div
              className="flex items-center rounded-lg border p-0.5 text-xs shadow-inner"
              style={{ backgroundColor: "var(--color-bg)", borderColor: "var(--color-border)" }}
            >
              <button
                onClick={() => handleSetViewMode("icons")}
                className={`px-2.5 py-1 rounded-md transition-all font-medium flex items-center gap-1.5 cursor-pointer ${
                  viewMode === "icons"
                    ? "bg-zinc-800 text-white dark:bg-zinc-200 dark:text-black shadow-xs font-bold"
                    : "opacity-65 hover:opacity-100"
                }`}
                title="圖示檢視（如小說軟體般顯示封面）"
              >
                <span>🔲</span>
                <span>圖示</span>
              </button>
              <button
                onClick={() => handleSetViewMode("list")}
                className={`px-2.5 py-1 rounded-md transition-all font-medium flex items-center gap-1.5 cursor-pointer ${
                  viewMode === "list"
                    ? "bg-zinc-800 text-white dark:bg-zinc-200 dark:text-black shadow-xs font-bold"
                    : "opacity-65 hover:opacity-100"
                }`}
                title="清單檢視（卡片清單模式）"
              >
                <span>☰</span>
                <span>清單</span>
              </button>
              <button
                onClick={() => handleSetViewMode("details")}
                className={`px-2.5 py-1 rounded-md transition-all font-medium flex items-center gap-1.5 cursor-pointer ${
                  viewMode === "details"
                    ? "bg-zinc-800 text-white dark:bg-zinc-200 dark:text-black shadow-xs font-bold"
                    : "opacity-65 hover:opacity-100"
                }`}
                title="詳細資料檢視（參照 Windows 檔案總管表格與排序）"
              >
                <span>📋</span>
                <span>詳細資料</span>
              </button>
            </div>
          </div>

          {/* 列表內容區域 */}
          {displayedPages.length === 0 ? (
            <div className="rounded-2xl border border-dashed py-14 text-center opacity-40 text-xs space-y-1" style={{ borderColor: "var(--color-border)" }}>
              <div>目前尚無角色檔案</div>
              <div>點擊上方按鈕建立第一位角色</div>
            </div>
          ) : viewMode === "icons" ? (
            /* 1. 圖示模式：立體書本封面 (Book Cover) 與立體角色肖像卡 */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
              {displayedPages.map((p, idx) => {
                const isChar = p.creative_type === "character" || !!p.character_data;
                const char = p.character_data;
                const novelStats = !isChar ? getNovelStats(p) : null;
                const theme = BOOK_COVER_THEMES[idx % BOOK_COVER_THEMES.length];
                const dateStr = new Date(p.updated_at).toLocaleDateString();

                if (isChar) {
                  // 角色立體檔案卡
                  return (
                    <div
                      key={p.id}
                      onClick={() => onSelectPage(p.id)}
                      className="group relative rounded-xl border p-4 text-left hover:shadow-xl transition-all duration-200 cursor-pointer flex flex-col justify-between overflow-hidden hover:-translate-y-1"
                      style={{
                        backgroundColor: "var(--color-bg)",
                        borderColor: "var(--color-border)",
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-2xl flex items-center justify-center border border-indigo-200 dark:border-indigo-900 shadow-inner group-hover:scale-110 transition-transform">
                          🎭
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-indigo-100/60 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                          角色
                        </span>
                      </div>

                      <div className="mt-3 flex-1 min-w-0">
                        <h4 className="font-bold text-sm truncate group-hover:text-blue-600 transition-colors">
                          {p.title || char?.basic?.name || "未命名角色"}
                        </h4>
                        {char?.basic?.role && (
                          <p className="text-xs opacity-60 mt-0.5 truncate">{char.basic.role}</p>
                        )}
                        {char?.basic?.affiliation && (
                          <p className="text-[11px] opacity-40 truncate">{char.basic.affiliation}</p>
                        )}
                      </div>

                      <div className="mt-4 pt-2 border-t flex items-center justify-between text-[11px] opacity-50" style={{ borderColor: "var(--color-border)" }}>
                        <span>{char?.sections?.length || 0} 組件</span>
                        <span>{dateStr}</span>
                      </div>

                      {/* 刪除按鈕 */}
                      {onDeletePage && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`確定要刪除角色「${p.title || "此創作"}」嗎？`)) {
                              onDeletePage(p.id);
                            }
                          }}
                          className="absolute top-2 right-2 text-xs text-red-500 opacity-0 group-hover:opacity-60 hover:opacity-100! p-1 transition-opacity cursor-pointer"
                          title="刪除"
                        >
                          🗑
                        </button>
                      )}
                    </div>
                  );
                }

                // 小說立體書本封面 (Novel 3D Book Cover)
                return (
                  <div
                    key={p.id}
                    onClick={() => onSelectPage(p.id)}
                    className="group cursor-pointer flex flex-col items-center select-none"
                  >
                    {/* 3D 書本容器 */}
                    <div
                      className="w-full aspect-[2/3] rounded-r-xl rounded-l-xs relative shadow-md group-hover:shadow-2xl transition-all duration-300 group-hover:-translate-y-1.5 flex flex-col justify-between p-4 overflow-hidden border border-black/10"
                      style={{
                        background: theme.bg,
                        color: "#ffffff",
                      }}
                    >
                      {/* 書脊立體折痕光影 (Book spine) */}
                      <div
                        className="absolute inset-y-0 left-0 w-3.5 pointer-events-none opacity-40"
                        style={{
                          background: "linear-gradient(to right, rgba(0,0,0,0.6) 0%, rgba(255,255,255,0.2) 30%, rgba(0,0,0,0.3) 100%)",
                          boxShadow: "inset -1px 0 2px rgba(0,0,0,0.4)",
                        }}
                      />

                      {/* 精裝燙金裝飾框 */}
                      <div
                        className="absolute inset-2.5 rounded border pointer-events-none opacity-30"
                        style={{ borderColor: theme.accent }}
                      />

                      {/* 書本頂部資訊標籤 */}
                      <div className="relative z-10 pl-2 flex items-center justify-between">
                        <span className="text-[10px] tracking-widest uppercase font-mono opacity-70">
                          NOVEL
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/30 backdrop-blur-xs font-semibold">
                          {novelStats?.chapterCount || 1} 章
                        </span>
                      </div>

                      {/* 書名大字 */}
                      <div className="relative z-10 pl-2 my-auto text-center">
                        <div
                          className="font-bold text-base sm:text-lg tracking-wider line-clamp-3 leading-snug drop-shadow-md"
                          style={{
                            fontFamily: "'Noto Serif TC', 'Source Han Serif TC', serif",
                          }}
                        >
                          {p.title || "未命名小說"}
                        </div>
                        <div className="w-8 h-0.5 mx-auto mt-2 rounded-full opacity-60" style={{ backgroundColor: theme.accent }} />
                      </div>

                      {/* 書本底部資訊腰封 */}
                      <div className="relative z-10 pl-2 pt-1 border-t border-white/20 flex items-center justify-between text-[10px] opacity-80">
                        <span>✍️ {novelStats?.totalCount.toLocaleString()} 字</span>
                        <span className="text-[9px] opacity-60">Nexus</span>
                      </div>

                      {/* 刪除按鈕 */}
                      {onDeletePage && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`確定要刪除「${p.title || "此創作"}」嗎？`)) {
                              onDeletePage(p.id);
                            }
                          }}
                          className="absolute top-2 right-2 text-xs text-white/70 hover:text-red-400 opacity-0 group-hover:opacity-100 p-1 transition-opacity z-20 cursor-pointer"
                          title="刪除"
                        >
                          🗑
                        </button>
                      )}
                    </div>

                    {/* 書籍下方文字名稱與日期 */}
                    <div className="w-full text-center mt-2 px-1">
                      <div className="font-semibold text-xs truncate group-hover:text-blue-600 transition-colors" style={{ color: "var(--color-text)" }}>
                        {p.title || "未命名小說"}
                      </div>
                      <div className="text-[10px] opacity-40 mt-0.5">更新於 {dateStr}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : viewMode === "list" ? (
            /* 2. 清單模式：優雅的卡片清單 */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {displayedPages.map((p) => {
                const isChar = p.creative_type === "character" || !!p.character_data;
                const char = p.character_data;
                const dateStr = new Date(p.updated_at).toLocaleDateString();

                return (
                  <div
                    key={p.id}
                    onClick={() => onSelectPage(p.id)}
                    className="group rounded-xl border p-4 text-left hover:shadow-md transition-all duration-200 cursor-pointer flex items-start gap-3.5 relative"
                    style={{ backgroundColor: "var(--color-bg)", borderColor: "var(--color-border)" }}
                  >
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${
                        isChar ? "bg-indigo-50 dark:bg-indigo-950/40" : "bg-amber-50 dark:bg-amber-950/40"
                      }`}
                    >
                      {isChar ? "🎭" : "📖"}
                    </div>

                    <div className="flex-1 min-w-0 pr-6">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm truncate group-hover:text-blue-600 transition-colors">
                          {p.title || (isChar ? "未命名角色" : "未命名小說")}
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${
                            isChar
                              ? "bg-indigo-100/60 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"
                              : "bg-amber-100/60 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                          }`}
                        >
                          {isChar ? "角色" : "小說"}
                        </span>
                      </div>

                      {isChar && char?.basic?.role && (
                        <div className="text-xs opacity-60 mt-0.5 truncate">
                          {char.basic.role} {char.basic.affiliation ? `· ${char.basic.affiliation}` : ""}
                        </div>
                      )}

                      {!isChar && p.content_text && (
                        <div className="text-xs opacity-50 mt-1 truncate">
                          {p.content_text.slice(0, 45)}
                        </div>
                      )}

                      <div className="text-[11px] opacity-40 mt-2">更新於 {dateStr}</div>
                    </div>

                    {/* 刪除按鈕 */}
                    {onDeletePage && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`確定要刪除「${p.title || "此創作"}」嗎？`)) {
                            onDeletePage(p.id);
                          }
                        }}
                        className="absolute top-3 right-3 text-xs text-red-500 opacity-0 group-hover:opacity-60 hover:opacity-100! p-1 transition-opacity cursor-pointer"
                        title="刪除"
                      >
                        🗑
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* 3. 詳細資料模式：參照 Windows 檔案總管表格，支援欄位點選排序 */
            <div
              className="rounded-xl border overflow-hidden shadow-xs"
              style={{ backgroundColor: "var(--color-bg)", borderColor: "var(--color-border)" }}
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr
                      className="border-b select-none font-semibold text-zinc-500 dark:text-zinc-400"
                      style={{ backgroundColor: "var(--color-editor-bg)", borderColor: "var(--color-border)" }}
                    >
                      <th
                        onClick={() => toggleSort("title")}
                        className="py-2.5 px-4 cursor-pointer hover:text-blue-600 transition-colors"
                      >
                        <div className="flex items-center gap-1">
                          <span>名稱</span>
                          {sortField === "title" && (
                            <span className="text-[10px]">{sortOrder === "asc" ? "▲" : "▼"}</span>
                          )}
                        </div>
                      </th>
                      <th
                        onClick={() => toggleSort("type")}
                        className="py-2.5 px-3 cursor-pointer hover:text-blue-600 transition-colors w-24"
                      >
                        <div className="flex items-center gap-1">
                          <span>類型</span>
                          {sortField === "type" && (
                            <span className="text-[10px]">{sortOrder === "asc" ? "▲" : "▼"}</span>
                          )}
                        </div>
                      </th>
                      <th
                        onClick={() => toggleSort("size")}
                        className="py-2.5 px-3 cursor-pointer hover:text-blue-600 transition-colors w-32"
                      >
                        <div className="flex items-center gap-1">
                          <span>內容規模</span>
                          {sortField === "size" && (
                            <span className="text-[10px]">{sortOrder === "asc" ? "▲" : "▼"}</span>
                          )}
                        </div>
                      </th>
                      <th
                        onClick={() => toggleSort("updated_at")}
                        className="py-2.5 px-3 cursor-pointer hover:text-blue-600 transition-colors w-40"
                      >
                        <div className="flex items-center gap-1">
                          <span>修改日期</span>
                          {sortField === "updated_at" && (
                            <span className="text-[10px]">{sortOrder === "asc" ? "▲" : "▼"}</span>
                          )}
                        </div>
                      </th>
                      <th
                        onClick={() => toggleSort("created_at")}
                        className="py-2.5 px-3 cursor-pointer hover:text-blue-600 transition-colors w-32 hidden sm:table-cell"
                      >
                        <div className="flex items-center gap-1">
                          <span>建立日期</span>
                          {sortField === "created_at" && (
                            <span className="text-[10px]">{sortOrder === "asc" ? "▲" : "▼"}</span>
                          )}
                        </div>
                      </th>
                      <th className="py-2.5 px-3 text-right w-16">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: "var(--color-border)" }}>
                    {displayedPages.map((p) => {
                      const isChar = p.creative_type === "character" || !!p.character_data;
                      const char = p.character_data;
                      const novelStats = !isChar ? getNovelStats(p) : null;

                      const updatedDate = new Date(p.updated_at);
                      const updatedStr = `${updatedDate.getFullYear()}/${String(updatedDate.getMonth() + 1).padStart(2, "0")}/${String(updatedDate.getDate()).padStart(2, "0")} ${String(updatedDate.getHours()).padStart(2, "0")}:${String(updatedDate.getMinutes()).padStart(2, "0")}`;

                      const createdDate = new Date(p.created_at || p.updated_at);
                      const createdStr = `${createdDate.getFullYear()}/${String(createdDate.getMonth() + 1).padStart(2, "0")}/${String(createdDate.getDate()).padStart(2, "0")}`;

                      return (
                        <tr
                          key={p.id}
                          onClick={() => onSelectPage(p.id)}
                          className="group hover:bg-blue-50/50 dark:hover:bg-blue-950/20 cursor-pointer transition-colors"
                        >
                          <td className="py-2.5 px-4 font-medium flex items-center gap-2.5">
                            <span className="text-base shrink-0">{isChar ? "🎭" : "📖"}</span>
                            <span className="truncate group-hover:text-blue-600 transition-colors">
                              {p.title || (isChar ? "未命名角色" : "未命名小說")}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                isChar
                                  ? "bg-indigo-100/60 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"
                                  : "bg-amber-100/60 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                              }`}
                            >
                              {isChar ? "角色簡介" : "小說文稿"}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-zinc-500 dark:text-zinc-400">
                            {isChar
                              ? `${char?.sections?.length || 0} 個組件`
                              : `${novelStats?.chapterCount || 1} 章 · ${novelStats?.totalCount.toLocaleString()} 字`}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-zinc-500 dark:text-zinc-400">
                            {updatedStr}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-zinc-500 dark:text-zinc-400 hidden sm:table-cell">
                            {createdStr}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {onDeletePage && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm(`確定要刪除「${p.title || "此創作"}」嗎？`)) {
                                    onDeletePage(p.id);
                                  }
                                }}
                                className="text-xs text-red-500 opacity-0 group-hover:opacity-80 hover:opacity-100! p-1 transition-opacity cursor-pointer"
                                title="刪除"
                              >
                                🗑
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
