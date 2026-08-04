"use client";

import { useEffect, useRef, useState } from "react";
import { SUPPORTED_LANGUAGES } from "../lib/i18n";
import { useLanguage } from "../lib/LanguageContext";

/**
 * PreferencesMenu：Sidebar 左?角??好設??口??
 *
 * ??????好設定??是??言??之??????好設?（?如主題、?體大小??
 * ?以?接??一???選?裡???塊?不?要更?觸????位置??
 * 語?清單?接?SUPPORTED_LANGUAGES 讀????語???要在 i18n.ts ???
 * ?裡完全不?要修??
 */
export default function PreferencesMenu() {
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
    <div ref={containerRef} className="relative">
      {isOpen && (
        <div
          className="absolute bottom-full left-0 mb-2 w-56 rounded-xl overflow-hidden shadow-2xl z-30"
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
        className="w-full flex items-center gap-2 rounded-md px-2.5 py-2 text-sm font-medium transition-all hover:bg-zinc-200"
        style={{
          border: "1px solid var(--color-border)",
          color: "var(--color-text)",
          backgroundColor: isOpen ? "var(--color-border)" : "transparent",
        }}
        title={t("preferences.title")}
      >
        <span>??</span>
        <span>{t("preferences.title")}</span>
      </button>
    </div>
  );
}
