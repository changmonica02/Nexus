"use client";
import { useState } from "react";
import type { Page } from "../lib/types";
import { useLanguage } from "../lib/LanguageContext";
import { confirmDialog } from "../lib/confirmDialog";
import FeatureIcon from "./FeatureIcon";
import { SidebarToggle } from "./WorkspaceNavigation";
import EditedTime from "./EditedTime";
export default function TrashPage({
  pages,
  loading,
  error,
  onRetry,
  onBack,
  onRestore,
  onDelete,
}: {
  pages: Page[];
  loading: boolean;
  error: string;
  onRetry: () => void;
  onBack: () => void;
  onRestore: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const { t } = useLanguage();
  const [busy, setBusy] = useState(false),
    [failure, setFailure] = useState("");
  const act = async (page: Page, remove = false) => {
    if (busy) return;
    if (
      remove &&
      !(await confirmDialog({
        title: t("trash.permanent"),
        message: t("sidebar.page.confirmPermanentDeleteOne", {
          title: page.title || t("common.untitled"),
        }),
        confirmLabel: t("trash.permanent"),
        cancelLabel: t("ui.cancel"),
        danger: true,
      }))
    )
      return;
    setBusy(true);
    setFailure("");
    try {
      await (remove ? onDelete : onRestore)(page.id);
    } catch (e) {
      setFailure(String(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="min-w-0 flex-1 overflow-y-auto bg-[var(--color-editor-bg)] text-[var(--color-text)]">
      <section className="mx-auto max-w-5xl space-y-4 p-4 sm:p-8">
        <header className="flex items-center gap-2">
          <SidebarToggle />
          <button type="button" onClick={onBack} className="min-h-11 px-2">
            ← {t("trash.back")}
          </button>
          <h1 className="flex items-center gap-2 text-xl font-semibold">
            <FeatureIcon feature="trash" />
            {t("sidebar.nav.trash")}
          </h1>
        </header>
        {loading && <p role="status">{t("common.loading")}</p>}
        {(error || failure) && (
          <p role="alert">
            {error || failure}
            <button className="ml-2 underline" onClick={onRetry}>
              {t("persistent.reload")}
            </button>
          </p>
        )}
        {!loading && !pages.length && <p>{t("trash.empty")}</p>}
        <ul>
          {pages.map((page) => (
            <li
              key={page.id}
              className="flex min-w-0 flex-wrap items-center gap-3 border-b border-[var(--color-border)] py-3"
            >
              <FeatureIcon page={page} />
              <span className="min-w-0 flex-1 break-words">
                {page.title || t("common.untitled")}
              </span>
              <EditedTime
                timestamp={page.updated_at}
                className="text-xs opacity-60"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void act(page)}
                  className="min-h-11 rounded px-3 hover:bg-zinc-500/10"
                >
                  {t("trash.restore")}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void act(page, true)}
                  className="min-h-11 rounded px-3 text-red-600 hover:bg-red-500/10"
                >
                  {t("trash.permanent")}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
