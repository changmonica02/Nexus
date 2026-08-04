"use client";
import { useEffect, useRef, useState } from "react";
import { SUPPORTED_LANGUAGES } from "../lib/i18n";
import { useLanguage } from "../lib/LanguageContext";
import type { SyncState } from "../lib/syncEngine";
import HelpGuide from "./HelpGuide";

export default function AccountSettingsRow({
  theme,
  onThemeChange,
  onExportBackup,
  onImportBackup,
  syncState,
}: {
  theme: "light" | "dark";
  onThemeChange: (theme: "light" | "dark") => void;
  onExportBackup: () => void;
  onImportBackup: () => void;
  syncState?: SyncState;
}) {
  const { language, setLanguage, t } = useLanguage();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isSettingsOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as globalThis.Node)) setIsSettingsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isSettingsOpen]);

  const syncLabel =
    syncState?.status === "syncing" ? "同步中..." :
    syncState?.status === "error" ? "同步錯誤" :
    syncState?.status === "connected" ? "已同步" :
    syncState?.status === "offline" ? "離線" : "本機";

  return (
    <>
      <div className="flex items-center justify-between gap-1.5 px-2.5 py-2.5 border-t shrink-0" style={{ borderColor: "var(--color-border)" }}>
        <div className="flex items-center gap-1.5 text-xs opacity-60 px-1">
          <span style={{ color: "var(--color-text)" }}>{syncLabel}</span>
        </div>
        <div ref={settingsRef} className="relative shrink-0">
          {isSettingsOpen && (
            <div className="absolute bottom-full right-0 mb-2 w-64 rounded-xl overflow-hidden shadow-2xl z-30" style={{ backgroundColor: "var(--color-bg)", border: "1px solid var(--color-border)" }}>
              <div className="px-3 py-2 text-xs font-semibold tracking-wider uppercase opacity-60" style={{ borderBottom: "1px solid var(--color-border)", color: "var(--color-text)" }}>
                {t("preferences.title")}
              </div>
              <div className="p-2.5 space-y-2">
                <div>
                  <div className="text-xs opacity-60 px-0.5 mb-1" style={{ color: "var(--color-text)" }}>{t("preferences.language")}</div>
                  <div className="space-y-0.5">
                    {SUPPORTED_LANGUAGES.map((option) => (
                      <button key={option.value} onClick={() => setLanguage(option.value)} className="w-full flex items-center justify-between rounded-md px-2.5 py-2 text-sm" style={{ backgroundColor: language === option.value ? "var(--color-border)" : "transparent", color: "var(--color-text)" }}>
                        <span>{option.label}</span>
                        {language === option.value && <span>✓</span>}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-xs opacity-60 px-0.5 mb-1" style={{ color: "var(--color-text)" }}>{t("preferences.theme")}</div>
                  <div className="flex gap-1">
                    <button onClick={() => onThemeChange("light")} className="flex-1 rounded-md px-2.5 py-2 text-sm" style={{ backgroundColor: theme === "light" ? "var(--color-border)" : "transparent", color: "var(--color-text)", border: "1px solid var(--color-border)" }}>淺色</button>
                    <button onClick={() => onThemeChange("dark")} className="flex-1 rounded-md px-2.5 py-2 text-sm" style={{ backgroundColor: theme === "dark" ? "var(--color-border)" : "transparent", color: "var(--color-text)", border: "1px solid var(--color-border)" }}>深色</button>
                  </div>
                </div>
                <div className="pt-1" style={{ borderTop: "1px solid var(--color-border)" }}>
                  <button onClick={() => { setIsHelpOpen(true); setIsSettingsOpen(false); }} className="w-full rounded-md px-3 py-2 text-sm text-left hover:bg-zinc-100 flex items-center gap-2" style={{ color: "var(--color-text)" }}>
                    <span>📖</span> 使用說明
                  </button>
                </div>
                <div className="pt-1" style={{ borderTop: "1px solid var(--color-border)" }}>
                  <div className="text-xs opacity-60 px-0.5 mb-1.5" style={{ color: "var(--color-text)" }}>備份</div>
                  <div className="flex gap-1">
                    <button onClick={() => { onExportBackup(); setIsSettingsOpen(false); }} className="flex-1 rounded-md px-2 py-2 text-xs font-medium" style={{ border: "1px solid var(--color-border)", color: "var(--color-text)" }}>匯出</button>
                    <button onClick={() => { onImportBackup(); setIsSettingsOpen(false); }} className="flex-1 rounded-md px-2 py-2 text-xs font-medium" style={{ border: "1px solid var(--color-border)", color: "var(--color-text)" }}>匯入</button>
                  </div>
                </div>
              </div>
            </div>
          )}
          <button onClick={() => setIsSettingsOpen((prev) => !prev)} className="flex items-center justify-center w-9 h-9 rounded-md transition-all hover:bg-zinc-200" style={{ border: "1px solid var(--color-border)", backgroundColor: isSettingsOpen ? "var(--color-border)" : "transparent" }} title={t("preferences.title")}>
            <span className="text-base leading-none">⚙️</span>
          </button>
        </div>
      </div>
      <HelpGuide isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </>
  );
}