"use client";
import {notifyDialog} from '../lib/confirmDialog';


import { useState } from "react";
import { getSupabase } from "../infrastructure/supabase/client";
import { clearAccountCache } from "../infrastructure/storage/clearAccountCache";

export default function DeleteAccount({ email }: { email: string }) {
  const [expanded, setExpanded] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const remove = async () => {
    const client = getSupabase();
    if (!client || busy || confirmation !== "刪除帳號") return;
    setBusy(true);
    setMessage("");
    try {
      const { data, error: authError } = await client.auth.getUser();
      if (authError || !data.user || data.user.email?.toLowerCase() !== email.toLowerCase()) {
        throw new Error("登入狀態已變更，請重新登入後再試。");
      }
      const { error } = await client.rpc("delete_own_account", {
        confirmation_email: email, confirmation_text: confirmation,
      });
      if (error) {
        if (error.code === "PGRST202") throw new Error("刪除帳號功能尚未在伺服器啟用，請稍後再試。");
        throw new Error("未能確認刪除結果，請檢查連線並重新登入確認。未收到成功回覆前，本機資料會保留。");
      }
      // Local sign-out immediately stops this app's sync through its auth listener.
      await client.auth.signOut({ scope: "local" });
      try {
        await clearAccountCache(data.user.id);
      } catch {
        await notifyDialog("帳號已刪除，但此裝置的離線快取未能清除。請在瀏覽器設定中清除此網站的資料。");
      }
      window.location.replace("/");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "刪除失敗，請稍後再試。");
      setBusy(false);
    }
  };
  if (!expanded) return <button type="button" className="mt-3 w-full rounded-lg px-3 py-2 text-sm text-red-600" onClick={() => setExpanded(true)}>刪除帳號…</button>;
  return <section aria-label="刪除帳號確認" className="mt-4 space-y-3 rounded-lg border border-red-500/40 p-3">
    <p className="text-sm font-semibold text-red-600">永久刪除帳號</p>
    <p className="text-xs leading-5">將永久刪除 {email} 與其雲端筆記、附件、字卡、學習紀錄及百科資料，並清除此裝置的帳號快取。此操作無法復原。需要保留資料時，請先取消並匯出備份。其他裝置已下載的離線副本不會遠端抹除。</p>
    <label className="block text-xs">請輸入「刪除帳號」確認
      <input disabled={busy} value={confirmation} onChange={event => setConfirmation(event.target.value)} autoComplete="off" className="mt-2 w-full rounded border bg-transparent px-3 py-2" />
    </label>
    <div className="flex gap-2">
      <button type="button" disabled={busy} onClick={() => { setExpanded(false); setConfirmation(""); setMessage(""); }} className="flex-1 rounded border px-3 py-2 text-sm disabled:opacity-40">取消</button>
      <button type="button" disabled={busy || confirmation !== "刪除帳號"} onClick={remove} className="flex-1 rounded bg-red-600 px-3 py-2 text-sm text-white disabled:opacity-40">{busy ? "刪除中…" : "永久刪除"}</button>
    </div>
    {message && <p role="alert" className="text-xs leading-5 text-red-600">{message}</p>}
  </section>;
}
