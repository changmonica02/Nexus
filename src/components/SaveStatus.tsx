"use client";
import { useLanguage } from "../lib/LanguageContext";
export type PageSaveState = { status: "saving" | "saved" | "error"; error?: string };
export default function SaveStatus({ state, onRetry }: { state?: PageSaveState; onRetry?: () => void }) {
  const { language } = useLanguage();
  const en = language === "en";
  if (!state) return null;
  return <div role={state.status === "error" ? "alert" : "status"} className="flex items-center gap-2 px-2 text-xs" data-save-status={state.status}>
    {state.status === "saving" ? (en ? "Saving…" : "正在儲存…") : state.status === "saved" ? (en ? "Saved to this device" : "已儲存至此裝置") : <>
      <span title={state.error}>{en ? "Save failed; changes retained" : "儲存未完成，修改仍保留"}</span>
      {onRetry && <button type="button" className="underline" onClick={onRetry}>{en ? "Retry save" : "重試儲存"}</button>}
    </>}
  </div>;
}
