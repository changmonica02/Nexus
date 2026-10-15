"use client";
import { List, LayoutGrid } from "lucide-react";
import { useLanguage } from "../lib/LanguageContext";
export default function CollectionControls({
  view,
  onView,
  sort,
  onSort,
  ascending = false,
  sortOptions = ["updated_at", "title", "kind", "created_at", "size"],
}: {
  view: "list" | "cards";
  onView: (mode: "list" | "cards") => void;
  sort: string;
  onSort: (key: string, ascending: boolean) => void;
  ascending?: boolean;
  sortOptions?: string[];
}) {
  const { t } = useLanguage();
  return (
    <div
      aria-label={t("ui.viewSort")}
      className="inline-flex max-w-full items-center gap-1 rounded-lg bg-zinc-500/5 p-1 text-[var(--color-text)]"
    >
      <div className="flex items-center gap-1">
        {(["list", "cards"] as const).map((mode) => {
          const Icon = mode === "list" ? List : LayoutGrid;
          return (
            <button
              type="button"
              key={mode}
              aria-label={t("ui." + mode)}
              title={t("ui." + mode)}
              aria-pressed={view === mode}
              onClick={() => onView(mode)}
              className="flex h-10 w-10 items-center justify-center rounded-md hover:bg-zinc-500/10"
              style={{
                background: view === mode ? "var(--color-border)" : undefined,
              }}
            >
              <Icon size={18} strokeWidth={1.75} />
            </button>
          );
        })}
      </div>
      <span aria-hidden="true" className="h-4 w-px bg-[var(--color-border)]" />
      <select
        aria-label={t("ui.sort")}
        value={sort + ":" + (ascending && sort !== "custom" ? "asc" : "desc")}
        onChange={(e) => {
          const [key, direction] = e.target.value.split(":");
          onSort(key, direction === "asc");
        }}
        className="h-10 min-w-0 max-w-[50vw] border-0 bg-transparent px-2 text-xs outline-none"
      >
        {sortOptions.flatMap((key) =>
          (key === "custom" ? ["desc"] : ["desc", "asc"]).map((direction) => (
            <option key={key + direction} value={key + ":" + direction}>
              {t("ui.sort." + key)}
              {key !== "custom"
                ? " · " +
                  t(direction === "asc" ? "ui.ascending" : "ui.descending")
                : ""}
            </option>
          )),
        )}
      </select>
    </div>
  );
}
