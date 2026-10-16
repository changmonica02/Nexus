"use client";
import {
  dashboardFeature,
  dashboardGroups,
  type DashboardGrouping,
} from "../lib/dashboardGroups";
import { useDashboardGrouping } from "./useDashboardGrouping";
import { useCollectionPreferences } from "./useCollectionPreferences";
import CollectionControls from "./CollectionControls";
import EditedTime from "./EditedTime";
import FeatureIcon from "./FeatureIcon";
import { CollectionItemMenu, type PageActions } from "./PageCollection";
import { confirmDialog } from "../lib/confirmDialog";

import { useMemo, useState } from "react";
import { type Page } from "../lib/types";
import { useLanguage } from "../lib/LanguageContext";

export default function Dashboard({
  pages,
  onSelectPage,
  onDeletePages,
  onPinPages,
  onReorderPages,
  onSetFolder,
  ...itemActions
}: PageActions & {
  pages: Page[];
  onSelectPage: (id: string) => void;
  onDeletePages: (ids: string[]) => void;
  onPinPages: (ids: string[]) => void;
  onReorderPages: (orderedIds: string[]) => void;
  onSetFolder: (ids: string[], folder: string | null) => void;
}) {
  const { t } = useLanguage();
  const [preferences, setPreferences] = useCollectionPreferences(
    "nexus-dashboard-view",
    { view: "list", sort: "updated_at", ascending: false },
  );
  const viewMode = preferences.view === "cards" ? "grid" : "list",
    sortMode = preferences.sort === "custom" ? "custom" : "updated",
    ascending = preferences.ascending;
  const [grouping, setGrouping] = useDashboardGrouping();
  const [query, setQuery] = useState("");
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const groups = useMemo(
    () => dashboardGroups(pages, grouping, query, preferences.sort, ascending),
    [pages, grouping, query, preferences.sort, ascending],
  );

  const visiblePages = useMemo(
    () => groups.flatMap((group) => group.items),
    [groups],
  );
  const allSelectedPinned =
    selectedIds.size > 0 &&
    [...selectedIds].every(
      (id) => (pages.find((page) => page.id === id)?.sort_order ?? 0) < 0,
    );
  const toggleSelection = (id: string) =>
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const finishSelection = () => {
    setIsSelecting(false);
    setSelectedIds(new Set());
  };
  const movePage = (id: string, direction: -1 | 1) => {
    const ids = visiblePages.map((page) => page.id);
    const index = ids.indexOf(id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    onReorderPages(ids);
  };

  const renderItems = (items: Page[]) => (
    <div
      className={
        viewMode === "grid"
          ? "grid grid-cols-1 gap-2 sm:grid-cols-2"
          : "space-y-1"
      }
    >
      {items.map((page) => (
        <div
          key={page.id}
          className={
            viewMode === "grid"
              ? "flex min-h-24 items-start rounded-xl border p-3 transition-all hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60"
              : "flex w-full items-center gap-1 rounded-md px-3 py-2 text-sm transition-all hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60"
          }
          style={{
            color: "var(--color-text)",
            borderColor:
              viewMode === "grid" ? "var(--color-border)" : "transparent",
          }}
        >
          {isSelecting && (
            <input
              type="checkbox"
              checked={selectedIds.has(page.id)}
              onChange={() => toggleSelection(page.id)}
              className="mr-2 mt-1 h-4 w-4 shrink-0 accent-blue-600"
              aria-label={t("dashboard.selectItem", {
                name: page.title || t("common.untitled"),
              })}
            />
          )}
          <button
            onClick={() =>
              isSelecting ? toggleSelection(page.id) : onSelectPage(page.id)
            }
            className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left"
          >
            <span className="flex min-w-0 items-center gap-2">
              <span className="text-base">
                <FeatureIcon page={page} />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm">
                  {page.title || t("common.untitled")}
                  {(page.sort_order ?? 0) < 0 && (
                    <FeatureIcon feature="pin" size={14} className="ml-1" />
                  )}
                </span>
                {viewMode === "grid" && (
                  <span className="mt-1 block text-xs opacity-50">
                    {t("ui.feature." + dashboardFeature(page))}
                  </span>
                )}
              </span>
            </span>
            <span className="shrink-0 text-xs opacity-40">
              <EditedTime timestamp={page.updated_at} />
            </span>
          </button>
          <CollectionItemMenu page={page} {...itemActions} />
          {sortMode === "custom" && !isSelecting && (
            <span className="ml-1 flex shrink-0 flex-col">
              <button
                onClick={() => movePage(page.id, -1)}
                className="px-1 text-xs opacity-55 hover:opacity-100"
                title="上移"
              >
                ↑
              </button>
              <button
                onClick={() => movePage(page.id, 1)}
                className="px-1 text-xs opacity-55 hover:opacity-100"
                title="下移"
              >
                ↓
              </button>
            </span>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <main
      data-pull-refresh
      className="relative flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain touch-pan-y"
      style={{ backgroundColor: "var(--color-editor-bg)" }}
    >
      <div className="mx-auto flex min-h-full w-full max-w-5xl min-w-0 flex-col p-4 sm:p-8">
        <div
          className="mb-1 text-sm opacity-60"
          style={{ color: "var(--color-text)" }}
        >
          {t("dashboard.home")}
        </div>
        <h1
          className="text-3xl font-semibold mb-6"
          style={{ color: "var(--color-text)" }}
        >
          {t("dashboard.welcome")}
        </h1>
        <section className="min-w-0">
          <input
            aria-label={t("dashboard.search")}
            placeholder={t("dashboard.search")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="mb-3 w-full min-w-0 rounded border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
          />
          <div
            data-dashboard-toolbar
            className="mb-3 flex min-w-0 flex-wrap items-center justify-between gap-2"
          >
            <div
              data-dashboard-group-controls
              className="flex shrink-0 flex-nowrap items-center gap-2 whitespace-nowrap rounded-lg bg-zinc-500/5 p-1"
            >
              <select
                aria-label={t("dashboard.grouping")}
                value={grouping}
                onChange={(e) =>
                  setGrouping(e.target.value as DashboardGrouping)
                }
                className="min-h-10 rounded bg-transparent px-2 text-sm"
              >
                <option value="none">{t("dashboard.groupNone")}</option>
                <option value="folder">{t("dashboard.groupFolder")}</option>
                <option value="feature">{t("dashboard.groupFeature")}</option>
              </select>
              <button
                type="button"
                aria-pressed={isSelecting}
                onClick={() =>
                  isSelecting ? finishSelection() : setIsSelecting(true)
                }
                className="min-h-10 rounded px-2 text-sm hover:bg-zinc-500/10"
              >
                {t(isSelecting ? "dashboard.done" : "dashboard.selectFiles")}
              </button>
            </div>
            <CollectionControls
              view={viewMode === "grid" ? "cards" : "list"}
              onView={(view) => setPreferences({ view })}
              sort={sortMode === "updated" ? "updated_at" : "custom"}
              onSort={(sort, ascending) => setPreferences({ sort, ascending })}
              ascending={ascending}
              sortOptions={["updated_at", "custom"]}
            />
          </div>
          {isSelecting && (
            <p role="status" className="mb-2 text-xs opacity-60">
              {t("dashboard.selected", { n: selectedIds.size })}
            </p>
          )}
          {isSelecting && selectedIds.size > 0 && (
            <div
              className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border p-2"
              style={{
                borderColor: "var(--color-border)",
                backgroundColor: "var(--color-bg)",
              }}
            >
              <button
                type="button"
                onClick={() => onPinPages([...selectedIds])}
                className="rounded-md border px-2.5 py-1.5 text-xs"
                style={{ borderColor: "var(--color-border)" }}
              >
                <FeatureIcon feature="pin" size={16} />{" "}
                {allSelectedPinned ? "取消置頂" : "置頂"}
              </button>
              <button
                type="button"
                onClick={() => {
                  const name = window.prompt(
                    "資料夾名稱（留白代表未分類）",
                    "",
                  );
                  if (name !== null)
                    onSetFolder([...selectedIds], name.trim() || null);
                }}
                className="rounded-md border px-2.5 py-1.5 text-xs"
                style={{ borderColor: "var(--color-border)" }}
              >
                <FeatureIcon feature="folder" size={16} /> 分類
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (
                    await confirmDialog(
                      `將 ${selectedIds.size} 個檔案移至垃圾桶？`,
                    )
                  ) {
                    onDeletePages([...selectedIds]);
                    finishSelection();
                  }
                }}
                className="rounded-md border border-red-200 px-2.5 py-1.5 text-xs text-red-600"
              >
                移至垃圾桶
              </button>
            </div>
          )}
          {groups.length === 0 ? (
            <div className="py-10 text-center text-sm opacity-50">
              {t("dashboard.emptyState")}
            </div>
          ) : grouping === "none" ? (
            renderItems(groups[0].items)
          ) : (
            <div className="space-y-3">
              {groups.map(({ key, items }) => (
                <details
                  key={grouping + ":" + key}
                  data-dashboard-group
                  className="min-w-0"
                >
                  <summary className="cursor-pointer py-3 text-sm font-medium">
                    <FeatureIcon
                      feature={grouping === "folder" ? "folder" : key}
                    />
                    <span className="ml-2">
                      {grouping === "folder"
                        ? key || t("dashboard.unfiled")
                        : t("ui.feature." + key)}
                    </span>
                    <span className="ml-2 text-xs opacity-60">
                      {items.length}
                    </span>
                  </summary>
                  {renderItems(items)}
                </details>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
