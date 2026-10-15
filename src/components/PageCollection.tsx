"use client";
import CollectionControls from "./CollectionControls";
import EditedTime from "./EditedTime";
import FeatureIcon, { featureForPage } from "./FeatureIcon";
import { useCollectionPreferences } from "./useCollectionPreferences";
import { useState } from "react";
import type { Page } from "../lib/types";
import { useLanguage } from "../lib/LanguageContext";
import { confirmDialog } from "../lib/confirmDialog";
import PageItemMenu, { type PageMenuItem } from "./PageItemMenu";
import { useEffect, useRef } from "react";

export interface PageActions {
  onRenamePage?: (id: string, title: string) => void | Promise<void>;
  onDuplicatePage?: (id: string) => void | Promise<void>;
  onDeletePage?: (id: string) => void | Promise<void>;
}
/** Shared collection operations. Persistence, permissions and safe cloning stay in the workspace. */
export function CollectionItemMenu({
  page,
  onRenamePage,
  onDuplicatePage,
  onDeletePage,
  extraItems = [],
}: PageActions & { page: Page; extraItems?: PageMenuItem[] }) {
  const { t } = useLanguage();
  const [rename, setRename] = useState(false),
    [name, setName] = useState(page.title);
  const [error, setError] = useState(""),
    [saving, setSaving] = useState(false);
  const run = (work: () => void | Promise<void>) => {
    setError("");
    void Promise.resolve()
      .then(work)
      .catch((e) => setError(String(e)));
  };
  const dialog = useRef<HTMLDialogElement>(null),
    input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (rename) {
      dialog.current?.showModal();
      input.current?.select();
    } else dialog.current?.close();
  }, [rename]);
  const items = [
    ...extraItems,
    ...(onRenamePage
      ? [
          {
            id: "rename",
            icon: "✎",
            label: t("ui.rename"),
            onClick: () => {
              setName(page.title);
              setRename(true);
            },
          },
        ]
      : []),
    ...(onDuplicatePage && !page.official_pack_id
      ? [
          {
            id: "copy",
            icon: "⧉",
            label: t("ui.copy"),
            onClick: () => run(() => onDuplicatePage(page.id)),
          },
        ]
      : []),
    ...(onDeletePage
      ? [
          {
            id: "delete",
            icon: "⌫",
            label: t("ui.delete"),
            danger: true,
            onClick: () => {
              void confirmDialog({
                title: t("ui.delete"),
                message: t("ui.deleteConfirm", { name: page.title }),
                confirmLabel: t("ui.delete"),
                cancelLabel: t("ui.cancel"),
                danger: true,
              }).then((ok) => {
                if (ok) run(() => onDeletePage(page.id));
              });
            },
          },
        ]
      : []),
  ];
  return (
    <>
      {error && !rename && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      <PageItemMenu title={t("ui.more") + " " + page.title} items={items} />
      <dialog
        ref={dialog}
        onCancel={() => setRename(false)}
        aria-label={t("ui.rename")}
        className="m-auto w-[min(90vw,420px)] rounded-xl border bg-[var(--color-bg)] p-5 text-[var(--color-text)] backdrop:bg-black/30"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim() && !saving) {
              setSaving(true);
              setError("");
              void Promise.resolve()
                .then(() => onRenamePage?.(page.id, name.trim()))
                .then(() => setRename(false))
                .catch((e) => setError(String(e)))
                .finally(() => setSaving(false));
            }
          }}
          className="space-y-4"
        >
          <label className="block">
            {t("ui.rename")}
            <input
              ref={input}
              autoFocus
              aria-label={t("ui.name")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-2 w-full rounded border bg-transparent p-2"
            />
          </label>
          <button
            type="submit"
            disabled={!name.trim() || saving}
            className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-40"
          >
            {t("ui.save")}
          </button>
          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}
          <button
            disabled={saving}
            type="button"
            onClick={() => setRename(false)}
            className="ml-2 rounded border px-4 py-2"
          >
            {t("ui.cancel")}
          </button>
        </form>
      </dialog>
    </>
  );
}
export function pagePreview(page: Page): string {
  const data = page.content_json as {
    intro?: string;
    links?: { label: string }[];
    counters?: { name: string; value: number }[];
    draws?: { label: string }[];
  } | null;
  if (page.kind === "web")
    return [data?.intro, ...(data?.links ?? []).map((x) => x.label)]
      .filter(Boolean)
      .join(" · ")
      .slice(0, 180);
  if (page.kind === "counter")
    return (data?.counters ?? [])
      .map((x) => `${x.name}: ${x.value}`)
      .join(" · ")
      .slice(0, 180);
  if (page.kind === "draw")
    return (data?.draws ?? [])
      .map((x) => x.label)
      .join(" · ")
      .slice(0, 180);
  if (page.kind === "presentation")
    return `${page.presentation_data?.slides?.length ?? 0} ▰`;
  if (page.kind === "study_set") return "▤"; // Schedules and answers are never embedded in Page previews.
  if (page.kind === "creative")
    return (
      page.character_data?.basic?.name || page.content_text?.slice(0, 180) || ""
    );
  return (page.content_text ?? "").slice(0, 180);
}
export default function PageCollection({
  pages,
  onSelectPage,
  previews,
  viewStorageKey,
  extraMenuItems,
  renderCardFooter,
  leadingControl,
  initialView = "cards",
  initialSort = "updated_at",
  initialAscending = false,
  sortOptions,
  ...actions
}: PageActions & {
  pages: Page[];
  onSelectPage: (id: string) => void;
  icon?: string;
  previews?: Record<string, string>;
  viewStorageKey?: string;
  extraMenuItems?: (page: Page) => PageMenuItem[];
  renderCardFooter?: (page: Page) => React.ReactNode;
  leadingControl?: (page: Page) => React.ReactNode;
  initialView?: "cards" | "list";
  initialSort?: string;
  initialAscending?: boolean;
  sortOptions?: string[];
}) {
  const { t } = useLanguage();
  const [{ view: visibleView, sort, ascending }, setPreferences] =
    useCollectionPreferences(
      viewStorageKey ??
        "nexus-" + (pages[0] ? featureForPage(pages[0]) : "items") + "-view",
      { view: initialView, sort: initialSort, ascending: initialAscending },
    );
  const ordered = [...pages].sort((a, b) => {
    const result =
      sort === "due_date"
        ? (a.due_date ?? 0) - (b.due_date ?? 0)
        : sort === "title"
          ? a.title.localeCompare(b.title)
          : sort === "kind"
            ? (a.creative_type ?? a.kind ?? "").localeCompare(
                b.creative_type ?? b.kind ?? "",
              )
            : sort === "created_at"
              ? a.created_at - b.created_at
              : sort === "size"
                ? (a.content_text ?? "").length - (b.content_text ?? "").length
                : a.updated_at - b.updated_at;
    return ascending ? result : -result;
  });
  return (
    <section aria-label={t("ui.items")} className="space-y-3">
      <div className="flex justify-end">
        <CollectionControls
          view={visibleView}
          onView={(view) => setPreferences({ view })}
          sort={sort}
          onSort={(sort, ascending) => setPreferences({ sort, ascending })}
          ascending={ascending}
          sortOptions={sortOptions}
        />
      </div>
      {!pages.length ? (
        <p className="rounded-xl border border-dashed p-10 text-center text-sm opacity-60">
          {t("ui.empty")}
        </p>
      ) : (
        <div
          className={
            visibleView === "cards"
              ? "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
              : "space-y-2"
          }
        >
          {ordered.map((page) => (
            <article
              key={page.id}
              style={
                visibleView === "cards" && page.kind === "quick_note"
                  ? { backgroundColor: page.color || undefined }
                  : undefined
              }
              data-collection-row={visibleView}
              className={
                visibleView === "cards"
                  ? "flex flex-wrap min-w-0 items-start gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-3 text-[var(--color-text)]"
                  : "flex min-h-14 min-w-0 items-center gap-2 px-2 text-[var(--color-text)] hover:bg-zinc-500/10"
              }
            >
              {leadingControl?.(page)}
              <button
                type="button"
                onClick={() => onSelectPage(page.id)}
                className={
                  visibleView === "cards"
                    ? "min-w-0 flex-1 text-left"
                    : "flex min-h-14 min-w-0 flex-1 items-center justify-between gap-3 text-left"
                }
              >
                <span className="flex min-w-0 items-center gap-2 font-medium">
                  <FeatureIcon page={page} />
                  <span className="truncate">
                    {page.title || t("common.untitled")}
                  </span>
                </span>
                {visibleView === "cards" && (
                  <span className="my-3 block min-h-12 whitespace-pre-wrap break-words text-sm opacity-70 line-clamp-3">
                    {previews?.[page.id] ||
                      pagePreview(page) ||
                      t("ui.noPreview")}
                  </span>
                )}
                <EditedTime
                  timestamp={page.updated_at}
                  className="shrink-0 text-xs opacity-50"
                />
              </button>
              <CollectionItemMenu
                page={page}
                {...(page.official_pack_id ? {} : actions)}
                extraItems={extraMenuItems?.(page)}
              />
              {visibleView === "cards" && renderCardFooter && (
                <div className="basis-full">{renderCardFooter(page)}</div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
