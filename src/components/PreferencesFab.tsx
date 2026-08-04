"use client";

import { useEffect, useRef, useState } from "react";
import { SUPPORTED_LANGUAGES } from "../lib/i18n";
import { useLanguage } from "../lib/LanguageContext";

/**
 * PreferencesFab：畫?左下???形浮?????代?本?在 Sidebar 底部??
 * ?好設???（? D-127）?
 *
 * 設?說??
 *   使用????好設定?位置??觀，???Next.js ?發模?左?角?
 *   ?發?工?浮??示?Route / Static / Bundler / Turbopack / Preferences 等???
 *   但那??示是 Next.js 框架?建?????模式?next dev）顯示?封??件?
 *   沒?官方?援?擴?方式?????（next build + next start）?不??現?
 *   ?此???????好設????」那?既??件?
 *   ?為??實?一顆固定在?面左?角??形??，?覺?模仿?樣??位??形外??
 *   點?展??好設??板，?不??發 / ????影響，?????
 *
 * 定?策略?
 *   fixed 定???body 層?（由 NexusApp ????外層，???Sidebar ??
 *   overflow-y-auto 影響）?z-index 高於一?內容?確??任何畫???能點???
 */
export default function PreferencesFab() {
  const { language, setLanguage, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as globalThis.Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div ref={containerRef} className="fixed left-4 bottom-4 z-50">
      {isOpen && (
        <div
          className="absolute bottom-full left-0 mb-2 w-56 rounded-xl overflow-hidden shadow-2xl"
          style={{ backgroundColor: "var(--color-bg)", border: "1px solid var(--color-border)" }}
        >
          <div
            className="px-3 py-2 text-xs font-semibold tracking-wider uppercase opacity-60"
            style={{ borderBottom: "1px solid var(--color-border)", color: "var(--color-text)" }}
          >
            {t("preferences.title")}
          </div>
          <div className="p-2.5 space-y-1.5">
            <div className="text-xs opacity-60 px-0.5" style={{ color: "var(--color-text)" }}>
              {t("preferences.language")}
            </div>
            {SUPPORTED_LANGUAGES.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  setLanguage(option.value);
                  setIsOpen(false);
                }}
                className="w-full flex items-center justify-between rounded-md px-2.5 py-1.5 text-sm transition-all hover:bg-zinc-200"
                style={{
                  backgroundColor: language === option.value ? "var(--color-border)" : "transparent",
                  color: "var(--color-text)",
                }}
              >
                <span>{option.label}</span>
                {language === option.value && <span>??/span>}
              </button>
            ))}
          </div>
        </div>
      )}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center justify-center w-11 h-11 rounded-full shadow-lg transition-all hover:scale-105 active:scale-95"
        style={{
          backgroundColor: isOpen ? "var(--color-text)" : "var(--color-bg)",
          color: isOpen ? "var(--color-bg)" : "var(--color-text)",
          border: "1px solid var(--color-border)",
        }}
        title={t("preferences.title")}
      >
        <span className="text-lg leading-none">??</span>
      </button>
    </div>
  );
}
