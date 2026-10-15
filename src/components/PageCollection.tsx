"use client";
import { useState } from "react";
import type { Page } from "../lib/types";
import { useLanguage } from "../lib/LanguageContext";
import { confirmDialog } from "../lib/confirmDialog";
import PageItemMenu from "./PageItemMenu";
import { useEffect, useRef, useSyncExternalStore } from "react";

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
}: PageActions & { page: Page }) {
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
  icon = "▱",
  previews,
  viewStorageKey,
  ...actions
}: PageActions & {
  pages: Page[];
  onSelectPage: (id: string) => void;
  icon?: string;
  previews?: Record<string, string>;
  viewStorageKey?: string;
}) {
  const { t, language } = useLanguage();
  const [view, setView] = useState<"cards" | "list">("cards");
  const [sort, setSort] = useState("updated_at"),
    [ascending, setAscending] = useState(false);
  const storedView = useSyncExternalStore(
    (cb) => {
      window.addEventListener("storage", cb);
      window.addEventListener("nexus-view-changed", cb);
      return () => {
        window.removeEventListener("storage", cb);
        window.removeEventListener("nexus-view-changed", cb);
      };
    },
    () => {
      try {
        return viewStorageKey ? localStorage.getItem(viewStorageKey) : null;
      } catch {
        return null;
      }
    },
    () => null,
  );
  const visibleView = storedView
    ? storedView === "icons"
      ? "cards"
      : "list"
    : view;
  const ordered = [...pages].sort((a, b) => {
    const result =
      sort === "title"
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
      <div className="flex flex-wrap justify-end gap-2">
        <select
          aria-label={t("ui.sort")}
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="min-h-10 rounded border bg-transparent px-2 text-sm"
        >
          {["updated_at", "title", "kind", "created_at", "size"].map((key) => (
            <option key={key} value={key}>
              {t("ui.sort." + key)}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="min-h-10 rounded border px-2"
          onClick={() => setAscending((v) => !v)}
          aria-label={t(ascending ? "ui.ascending" : "ui.descending")}
        >
          {ascending ? "↑" : "↓"}
        </button>
        {(["cards", "list"] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            aria-pressed={visibleView === mode}
            className="min-h-10 rounded border px-3 text-sm"
            onClick={() => {
              setView(mode);
              if (viewStorageKey)
                try {
                  localStorage.setItem(
                    viewStorageKey,
                    mode === "cards" ? "icons" : "list",
                  );
                  window.dispatchEvent(new Event("nexus-view-changed"));
                } catch {
                  /* Keep in-memory mode. */
                }
            }}
          >
            {t("ui." + mode)}
          </button>
        ))}
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
              className="flex min-w-0 items-start gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-3 text-[var(--color-text)]"
            >
              <button
                type="button"
                onClick={() => onSelectPage(page.id)}
                className="min-w-0 flex-1 text-left"
              >
                <span className="block truncate font-medium">
                  {icon} {page.title || t("common.untitled")}
                </span>
                {visibleView === "cards" && (
                  <span className="my-3 block min-h-12 whitespace-pre-wrap break-words text-sm opacity-70 line-clamp-3">
                    {previews?.[page.id] ||
                      pagePreview(page) ||
                      t("ui.noPreview")}
                  </span>
                )}
                <span className="mt-2 block text-xs opacity-50">
                  {new Date(page.updated_at).toLocaleDateString(language)}
                </span>
              </button>
              <CollectionItemMenu page={page} {...actions} />
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
