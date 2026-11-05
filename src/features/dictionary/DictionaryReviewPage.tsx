"use client";
import Link from "next/link";
import {PageHeader} from "../../components/WorkspaceNavigation";
import {usePaginationLanguage} from "../../lib/LanguageContext";
import {getSupabase} from "../../infrastructure/supabase/client";
import {useDictionaryAdminAccess} from "./useDictionaryAdminAccess";
import {PersistentReviewPanel} from "./PersistentImportReview";

export default function DictionaryReviewPage({entryId}:{entryId?:string}) {
  const {access,error}=useDictionaryAdminAccess();
  const {t}=usePaginationLanguage();
  return <main className="h-full min-w-0 flex-1 overflow-y-auto" style={{color:"var(--color-text)",background:"var(--color-bg)"}}>
    <div className="mx-auto max-w-5xl space-y-5 p-4 sm:p-6">
      <PageHeader title={t("persistent.queue")} backHref="/dictionary/admin"/>
      <Link className="underline" href="/dictionary/admin">返回字典管理</Link>
      {!getSupabase()?<p role="alert">尚未設定資料服務。</p>
        :error?<p role="alert">{error}</p>
        :access?.allowed?<PersistentReviewPanel entryId={entryId}/>
        :access?<p role="alert">此帳號沒有字典管理權限。</p>
        :<p role="status">{t("common.loading")}</p>}
    </div>
  </main>;
}
