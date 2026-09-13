"use client";
import { useEffect, useRef, useState } from "react";
import { SUPPORTED_LANGUAGES } from "../lib/i18n";
import { useLanguage } from "../lib/LanguageContext";
import type { SyncState } from "../lib/syncEngine";
import HelpGuide from "./HelpGuide";
import { getSupabase, isSupabaseConfigured } from "../lib/supabase";

export default function AccountSettingsRow({
  theme,
  onThemeChange,
  onExportBackup,
  onImportBackup,
  syncState,
  accountEmail,
}: {
  theme: "light" | "dark";
  onThemeChange: (theme: "light" | "dark") => void;
  onExportBackup: () => void;
  onImportBackup: () => void;
  syncState?: SyncState;
  accountEmail?: string | null;
}) {
  const { language, setLanguage, t } = useLanguage();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
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

  const handleAuth = async () => {
    const supabase = getSupabase();
    if (!supabase) { setAuthMessage("尚未設定 Supabase，請先設定雲端服務環境變數。"); return; }
    setIsAuthenticating(true);
    setAuthMessage(null);
    const result = authMode === "signIn"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });
    setIsAuthenticating(false);
    if (result.error) { setAuthMessage(result.error.message); return; }
    setAuthMessage(authMode === "signUp" && !result.data.session ? "註冊完成，請至信箱確認後再登入。" : "已登入，正在同步你的工作區。");
    if (authMode === "signIn" || result.data.session) setTimeout(() => setIsAccountOpen(false), 700);
  };

  const handleSignOut = async () => {
    await getSupabase()?.auth.signOut();
    setIsAccountOpen(false);
  };

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
      {isAccountOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/35 p-4" onMouseDown={() => setIsAccountOpen(false)}>
          <div className="w-full max-w-sm rounded-2xl border p-5 shadow-2xl" style={{ backgroundColor: "var(--color-bg)", borderColor: "var(--color-border)", color: "var(--color-text)" }} onMouseDown={(event) => event.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between"><div><h2 className="font-semibold">帳號與同步</h2><p className="mt-1 text-xs opacity-60">登入後可在你的裝置間同步資料。</p></div><button onClick={() => setIsAccountOpen(false)} className="rounded-md px-2 py-1 text-lg opacity-60">×</button></div>
            {!isSupabaseConfigured() ? <p className="rounded-lg border p-3 text-sm leading-6 opacity-75" style={{ borderColor: "var(--color-border)" }}>尚未連接雲端帳號服務。設定 <code>NEXT_PUBLIC_SUPABASE_URL</code> 與 <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> 後即可啟用。</p> : accountEmail ? (
              <div><p className="rounded-lg border p-3 text-sm" style={{ borderColor: "var(--color-border)" }}>目前登入：{accountEmail}</p><button onClick={handleSignOut} className="mt-4 w-full rounded-lg border px-3 py-2 text-sm font-medium" style={{ borderColor: "var(--color-border)" }}>登出</button></div>
            ) : (
              <div className="space-y-3"><div className="flex rounded-lg border p-1" style={{ borderColor: "var(--color-border)" }}><button onClick={() => setAuthMode("signIn")} className="flex-1 rounded-md py-1.5 text-sm" style={{ backgroundColor: authMode === "signIn" ? "var(--color-border)" : "transparent" }}>登入</button><button onClick={() => setAuthMode("signUp")} className="flex-1 rounded-md py-1.5 text-sm" style={{ backgroundColor: authMode === "signUp" ? "var(--color-border)" : "transparent" }}>註冊</button></div><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="電子郵件" className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none" style={{ borderColor: "var(--color-border)" }} /><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="密碼（至少 6 個字元）" className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none" style={{ borderColor: "var(--color-border)" }} /><button disabled={isAuthenticating || !email || password.length < 6} onClick={handleAuth} className="w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-45">{isAuthenticating ? "處理中…" : authMode === "signIn" ? "登入" : "建立帳號"}</button>{authMessage && <p className="text-xs leading-5 opacity-70">{authMessage}</p>}</div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
