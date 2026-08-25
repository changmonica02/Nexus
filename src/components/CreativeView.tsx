"use client";
import type { Page } from "../lib/types";
import { useLanguage } from "../lib/LanguageContext";

export default function CreativeView({ pages, onCreateNovel, onCreateCharacter, onSelectPage }: {
  pages: Page[];
  onCreateNovel: () => void;
  onCreateCharacter: () => void;
  onSelectPage: (id: string) => void;
}) {
  const { t } = useLanguage();
  const creativePages = pages.filter((p) => p.kind === "creative" && !p.deleted_at);
  return (
    <main className="flex flex-col flex-1 overflow-y-auto" style={{ backgroundColor: "var(--color-editor-bg)" }}>
      <div className="mx-auto w-full max-w-[900px] p-6">
        <h1 className="text-2xl font-semibold mb-2" style={{ color: "var(--color-text)" }}>✍️ {t("sidebar.nav.creative")}</h1>
        <p className="text-xs opacity-60 mb-6">小說閱讀格式、角色詳細簡介表等創作工具</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button onClick={onCreateNovel} className="rounded-xl border p-4 text-left hover:shadow-md transition-all" style={{ backgroundColor: "var(--color-bg)", borderColor: "var(--color-border)" }}>
            <div className="text-2xl mb-2">📖</div>
            <div className="text-sm font-semibold">小說閱讀格式</div>
            <div className="text-xs opacity-60 mt-1">流動排版，適合長篇閱讀</div>
          </button>
          <button onClick={onCreateCharacter} className="rounded-xl border p-4 text-left hover:shadow-md transition-all" style={{ backgroundColor: "var(--color-bg)", borderColor: "var(--color-border)" }}>
            <div className="text-2xl mb-2">🎭</div>
            <div className="text-sm font-semibold">角色詳細簡介表</div>
            <div className="text-xs opacity-60 mt-1">含姓名/年齡/性格/背景/外觀/能力</div>
          </button>
        </div>
        <div className="mt-6 text-center opacity-40 text-sm">更多創作工具陸續新增中...</div>
        {creativePages.length > 0 && (
          <div className="mt-6">
            <div className="text-xs font-semibold opacity-50 uppercase mb-2">已建立的創作</div>
            {creativePages.map((p) => (
              <button key={p.id} onClick={() => onSelectPage(p.id)} className="w-full text-left rounded-lg border p-3 mb-2 hover:shadow-sm transition-all" style={{ backgroundColor: "var(--color-bg)", borderColor: "var(--color-border)" }}>
                <span className="text-sm font-medium">{p.title || "未命名"}</span>
                <span className="text-xs opacity-40 ml-2">{new Date(p.updated_at).toLocaleDateString()}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
