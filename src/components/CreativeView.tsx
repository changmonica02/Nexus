"use client";
import React, { useState } from "react";
import type { Page } from "../lib/types";
import { useLanguage } from "../lib/LanguageContext";

export default function CreativeView({
  pages,
  onCreateNovel,
  onCreateCharacter,
  onSelectPage,
  onDeletePage,
}: {
  pages: Page[];
  onCreateNovel: () => void;
  onCreateCharacter: (templateId?: "fantasy" | "modern" | "blank") => void;
  onSelectPage: (id: string) => void;
  onDeletePage?: (id: string) => void;
}) {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<"all" | "novel" | "character">("all");
  const [charModalOpen, setCharModalOpen] = useState(false);

  const creativePages = pages.filter((p) => p.kind === "creative" && !p.deleted_at);
  const novelPages = creativePages.filter((p) => p.creative_type === "novel" || (!p.creative_type && !p.character_data));
  const characterPages = creativePages.filter((p) => p.creative_type === "character" || !!p.character_data);

  const displayedPages =
    activeTab === "novel" ? novelPages : activeTab === "character" ? characterPages : creativePages;

  return (
    <main className="flex flex-col flex-1 overflow-y-auto" style={{ backgroundColor: "var(--color-editor-bg)" }}>
      <div className="mx-auto w-full max-w-[960px] p-6 sm:p-10 space-y-8">
        {/* 標題與簡介 */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: "var(--color-text)" }}>
            <span>✍️</span>
            <span>{t("sidebar.nav.creative")} 工作台</span>
          </h1>
          <p className="text-xs opacity-60 mt-1">專為小說創作者與世界觀設計者打造的沉浸式寫作閱讀與角色檔案庫</p>
        </div>

        {/* 快速新增區塊 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* 新增小說卡片 */}
          <button
            onClick={onCreateNovel}
            className="group rounded-2xl border p-5 text-left hover:shadow-lg transition-all duration-200 cursor-pointer relative overflow-hidden flex flex-col justify-between"
            style={{ backgroundColor: "var(--color-bg)", borderColor: "var(--color-border)" }}
          >
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-2xl flex items-center justify-center border border-amber-200 dark:border-amber-900 group-hover:scale-105 transition-transform">
                📖
              </div>
              <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-100/60 dark:bg-amber-900/40 px-2 py-0.5 rounded-full">
                沉浸閱讀
              </span>
            </div>
            <div className="mt-4">
              <div className="text-base font-bold group-hover:text-blue-600 transition-colors">小說閱讀格式</div>
              <div className="text-xs opacity-60 mt-1 leading-relaxed">
                支援首行縮排、羊皮紙/護眼紙色、宋體切換、章節導航與閱讀進度
              </div>
            </div>
            <div className="mt-4 pt-3 border-t text-xs font-semibold text-blue-600 flex items-center gap-1" style={{ borderColor: "var(--color-border)" }}>
              <span>＋ 建立新小說</span>
            </div>
          </button>

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
              <span>＋ 選擇範本建立角色</span>
            </div>
          </button>
        </div>

        {/* 角色範本選擇 Modal */}
        {charModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div
              className="w-full max-w-md rounded-2xl border shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150"
              style={{ backgroundColor: "var(--color-bg)", borderColor: "var(--color-border)" }}
            >
              <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: "var(--color-border)" }}>
                <div className="flex items-center gap-2">
                  <span className="text-xl">🎭</span>
                  <h3 className="font-bold text-base">選擇角色簡介範本</h3>
                </div>
                <button onClick={() => setCharModalOpen(false)} className="text-sm opacity-50 hover:opacity-100 p-1">
                  ✕
                </button>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => {
                    onCreateCharacter("fantasy");
                    setCharModalOpen(false);
                  }}
                  className="w-full text-left p-3.5 rounded-xl border hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-all flex items-start gap-3 group"
                  style={{ borderColor: "var(--color-border)" }}
                >
                  <span className="text-2xl mt-0.5">🌟</span>
                  <div>
                    <div className="font-bold text-sm group-hover:text-blue-600">奇幻冒險 / 武俠角色範本</div>
                    <div className="text-xs opacity-60 mt-0.5">包含遊俠/魔劍士設定、陣營、戰鬥五維數值與傳承背景</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    onCreateCharacter("modern");
                    setCharModalOpen(false);
                  }}
                  className="w-full text-left p-3.5 rounded-xl border hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-all flex items-start gap-3 group"
                  style={{ borderColor: "var(--color-border)" }}
                >
                  <span className="text-2xl mt-0.5">🏙️</span>
                  <div>
                    <div className="font-bold text-sm group-hover:text-blue-600">現代懸疑 / 科幻角色範本</div>
                    <div className="text-xs opacity-60 mt-0.5">包含刑偵顧問、犯罪心理分析、履歷檔案與懸案密碼</div>
                  </div>
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
              </div>
            </div>
          </div>
        )}

        {/* 已建立的創作清單與分類標籤 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: "var(--color-border)" }}>
            {/* 分類標籤頁 */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === "all" ? "bg-zinc-800 text-white dark:bg-zinc-200 dark:text-black shadow-sm" : "opacity-60 hover:opacity-100"
                }`}
              >
                全部創作 ({creativePages.length})
              </button>
              <button
                onClick={() => setActiveTab("novel")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                  activeTab === "novel" ? "bg-zinc-800 text-white dark:bg-zinc-200 dark:text-black shadow-sm" : "opacity-60 hover:opacity-100"
                }`}
              >
                <span>📖 小說列表</span>
                <span>({novelPages.length})</span>
              </button>
              <button
                onClick={() => setActiveTab("character")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                  activeTab === "character" ? "bg-zinc-800 text-white dark:bg-zinc-200 dark:text-black shadow-sm" : "opacity-60 hover:opacity-100"
                }`}
              >
                <span>🎭 角色列表</span>
                <span>({characterPages.length})</span>
              </button>
            </div>
          </div>

          {/* 列表內容 */}
          {displayedPages.length === 0 ? (
            <div className="rounded-2xl border border-dashed py-14 text-center opacity-40 text-xs space-y-1">
              <div>目前分類尚無創作作品</div>
              <div>點擊上方按鈕立即建立第一篇小說或角色檔案</div>
            </div>
          ) : (
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
                        className="absolute top-3 right-3 text-xs text-red-500 opacity-0 group-hover:opacity-60 hover:opacity-100! p-1 transition-opacity"
                        title="刪除"
                      >
                        🗑
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
