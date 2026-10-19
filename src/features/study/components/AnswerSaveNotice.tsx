"use client";
import { useLanguage } from "../../../lib/LanguageContext";
export default function AnswerSaveNotice({saving,error,onRetry,onReload}:{saving:boolean;error:string;onRetry?:()=>void;onReload:()=>void}) {
  const {t}=useLanguage();
  return <>
    {saving&&<p role="status" className="text-sm">{t('study.saving')}</p>}
    {error&&<div role="alert" className="w-full rounded border border-red-400 p-3 text-sm">{error}
      {onRetry&&<button type="button" className="ml-2 underline" disabled={saving} onClick={onRetry}>{t('study.retryAnswer')}</button>}
      <button type="button" className="ml-2 underline" disabled={saving} onClick={onReload}>{t('study.reload')}</button>
    </div>}
  </>;
}
