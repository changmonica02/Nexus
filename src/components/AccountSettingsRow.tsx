"use client";
import { useState } from "react";
import type { SyncState } from "../infrastructure/sync/syncEngine";
import PreferencesMenu from "./PreferencesMenu";
import { getSupabase, isSupabaseConfigured } from "../infrastructure/supabase/client";


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
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
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
      <div className="flex items-center justify-between gap-1.5 px-2.5 py-2.5 border-t shrink-0 select-none" style={{ borderColor: "var(--color-border)" }}>
        {/* 左側帳號按鈕（登入／登出與同步狀態） */}
        <button
          type="button"
          onClick={() => setIsAccountOpen(true)}
          className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors truncate max-w-[170px]"
          style={{ color: "var(--color-text)" }}
          title={accountEmail ? `已登入: ${accountEmail}` : "帳號登入與同步"}
        >
          <span className="text-sm">👤</span>
          <div className="flex flex-col items-start min-w-0 text-left">
            <span className="truncate w-full font-semibold">{accountEmail ? accountEmail.split("@")[0] : "登入帳號"}</span>
            <span className="text-[10px] opacity-60 leading-none">{syncLabel}</span>
          </div>
        </button>

        <PreferencesMenu theme={theme} onThemeChange={onThemeChange} onExportBackup={onExportBackup} onImportBackup={onImportBackup} />
      </div>

      {/* 帳號登入/註冊/登出 Modal */}
      {isAccountOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/35 p-4" onMouseDown={() => setIsAccountOpen(false)}>
          <div className="w-full max-w-sm rounded-2xl border p-5 shadow-2xl" style={{ backgroundColor: "var(--color-bg)", borderColor: "var(--color-border)", color: "var(--color-text)" }} onMouseDown={(event) => event.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-base">帳號與同步</h2>
                <p className="mt-1 text-xs opacity-60">登入後可在你的各個裝置間同步資料。</p>
              </div>
              <button onClick={() => setIsAccountOpen(false)} className="rounded-md px-2 py-1 text-lg opacity-60 hover:opacity-100">×</button>
            </div>
            {!isSupabaseConfigured() ? (
              <p className="rounded-lg border p-3 text-sm leading-6 opacity-75" style={{ borderColor: "var(--color-border)" }}>
                尚未連接雲端帳號服務。設定 <code>NEXT_PUBLIC_SUPABASE_URL</code> 與 <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> 後即可啟用。
              </p>
            ) : accountEmail ? (
              <div>
                <div className="rounded-lg border p-3 text-sm" style={{ borderColor: "var(--color-border)" }}>
                  <div className="text-xs opacity-60 mb-1">目前登入帳號</div>
                  <div className="font-semibold truncate">{accountEmail}</div>
                </div>
                <button onClick={handleSignOut} className="mt-4 w-full rounded-lg border px-3 py-2 text-sm font-medium hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 transition-colors" style={{ borderColor: "var(--color-border)" }}>
                  登出帳號
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex rounded-lg border p-1" style={{ borderColor: "var(--color-border)" }}>
                  <button onClick={() => setAuthMode("signIn")} className="flex-1 rounded-md py-1.5 text-sm" style={{ backgroundColor: authMode === "signIn" ? "var(--color-border)" : "transparent" }}>登入</button>
                  <button onClick={() => setAuthMode("signUp")} className="flex-1 rounded-md py-1.5 text-sm" style={{ backgroundColor: authMode === "signUp" ? "var(--color-border)" : "transparent" }}>註冊</button>
                </div>
                <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="電子郵件" className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none" style={{ borderColor: "var(--color-border)" }} />
                <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="密碼（至少 6 個字元）" className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none" style={{ borderColor: "var(--color-border)" }} />
                <button disabled={isAuthenticating || !email || password.length < 6} onClick={handleAuth} className="w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-45 hover:bg-blue-700 transition-colors">
                  {isAuthenticating ? "處理中…" : authMode === "signIn" ? "登入" : "建立帳號"}
                </button>
                {authMessage && <p className="text-xs leading-5 opacity-70 text-amber-600 dark:text-amber-400">{authMessage}</p>}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
