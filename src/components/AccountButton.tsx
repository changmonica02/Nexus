"use client";

import { useState } from "react";
import { getSupabase, isSupabaseConfigured } from "../lib/supabase";

export default function AccountButton({ accountEmail, required = false }: { accountEmail?: string | null; required?: boolean }) {
  const [isOpen, setIsOpen] = useState(required);
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async () => {
    const supabase = getSupabase();
    if (!supabase) { setMessage("尚未設定 Supabase 雲端服務。"); return; }
    setIsSubmitting(true); setMessage(null);
    const result = mode === "signIn" ? await supabase.auth.signInWithPassword({ email, password }) : await supabase.auth.signUp({ email, password });
    setIsSubmitting(false);
    if (result.error) { setMessage(result.error.message); return; }
    setMessage(mode === "signUp" && !result.data.session ? "註冊完成，請至信箱確認後再登入。" : "已登入，正在同步工作區。");
    if (mode === "signIn" || result.data.session) setTimeout(() => setIsOpen(false), 700);
  };

  const signInWithGoogle = async () => {
    const supabase = getSupabase();
    if (!supabase) { setMessage("尚未設定 Supabase 雲端服務。"); return; }
    setMessage(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) setMessage(error.message);
  };

  return <>
    {!required && <button type="button" onClick={() => setIsOpen(true)} className="flex h-9 min-w-9 items-center justify-center rounded-full border px-2 text-sm font-semibold shadow-sm hover:opacity-80" style={{ borderColor: "var(--color-border)", color: "var(--color-text)", backgroundColor: "var(--color-panel-bg)" }} aria-label={accountEmail ? "帳號設定" : "登入或建立帳號"} title={accountEmail || "登入"}>{accountEmail ? accountEmail.slice(0, 1).toUpperCase() : "◉"}</button>}
    {isOpen && <div className={`fixed inset-0 z-[1000] flex items-center justify-center p-4 ${required ? "bg-[var(--color-bg)]" : "bg-black/35"}`} onMouseDown={() => { if (!required) setIsOpen(false); }}><div className="w-full max-w-sm rounded-2xl border p-5 shadow-2xl" style={{ backgroundColor: "var(--color-bg)", borderColor: "var(--color-border)", color: "var(--color-text)" }} onMouseDown={(event) => event.stopPropagation()}>
      <div className="mb-4 flex items-center justify-between"><div><h2 className="font-semibold">{required ? "登入 Nexus" : "帳號與同步"}</h2><p className="mt-1 text-xs opacity-60">登入後可在你的裝置間同步資料，也可在離線時繼續編輯。</p></div>{!required && <button onClick={() => setIsOpen(false)} className="rounded-md px-2 py-1 text-lg opacity-60">×</button>}</div>
      {!isSupabaseConfigured() ? <p className="rounded-lg border p-3 text-sm leading-6 opacity-75" style={{ borderColor: "var(--color-border)" }}>尚未連接雲端帳號服務。</p> : accountEmail ? <div><p className="rounded-lg border p-3 text-sm" style={{ borderColor: "var(--color-border)" }}>目前登入：{accountEmail}</p><button onClick={async () => { await getSupabase()?.auth.signOut(); setIsOpen(false); }} className="mt-4 w-full rounded-lg border px-3 py-2 text-sm font-medium" style={{ borderColor: "var(--color-border)" }}>登出</button></div> : <div className="space-y-3"><button onClick={signInWithGoogle} className="flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-zinc-50" style={{ borderColor: "var(--color-border)" }}><span className="text-base">G</span> 使用 Google 登入</button><div className="flex items-center gap-2 text-xs opacity-45"><span className="h-px flex-1 bg-current" />或<span className="h-px flex-1 bg-current" /></div><div className="flex rounded-lg border p-1" style={{ borderColor: "var(--color-border)" }}><button onClick={() => setMode("signIn")} className="flex-1 rounded-md py-1.5 text-sm" style={{ backgroundColor: mode === "signIn" ? "var(--color-border)" : "transparent" }}>登入</button><button onClick={() => setMode("signUp")} className="flex-1 rounded-md py-1.5 text-sm" style={{ backgroundColor: mode === "signUp" ? "var(--color-border)" : "transparent" }}>註冊</button></div><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="電子郵件" className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none" style={{ borderColor: "var(--color-border)" }} /><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="密碼（至少 6 個字元）" className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none" style={{ borderColor: "var(--color-border)" }} /><button disabled={isSubmitting || !email || password.length < 6} onClick={submit} className="w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-45">{isSubmitting ? "處理中…" : mode === "signIn" ? "登入" : "建立帳號"}</button>{message && <p className="text-xs leading-5 opacity-70">{message}</p>}</div>}
    </div></div>}
  </>;
}
