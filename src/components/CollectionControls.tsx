"use client";
import { useEffect, useRef, useState } from "react";
import { List, LayoutGrid, Check, ArrowUp, ArrowDown } from "lucide-react";
import { useLanguage } from "../lib/LanguageContext";
import FloatingPanel from "./FloatingPanel";
/** Field default directions: date/size descending; names/types/due ascending. */
export function defaultSortAscending(key: string) {
  return ["title", "kind", "due_date", "custom"].includes(key);
}
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
  const [open, setOpen] = useState(false);
  const menu = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (open)
      menu.current
        ?.querySelector<HTMLButtonElement>('[aria-checked="true"]')
        ?.focus();
  }, [open]);
  const direction = t(ascending ? "ui.ascending" : "ui.descending");
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
      <span aria-hidden className="h-4 w-px bg-[var(--color-border)]" />
      <button
        type="button"
        aria-label={t("ui.sort")}
        aria-haspopup="menu"
        aria-expanded={open}
        title={t("ui.sort." + sort) + " · " + direction}
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 min-w-0 items-center gap-2 px-2 text-xs"
      >
        <span className="truncate">{t("ui.sort." + sort)}</span>
        {ascending ? <ArrowUp size={15} /> : <ArrowDown size={15} />}
      </button>
      {open && (
        <FloatingPanel open onClose={() => setOpen(false)} label={t("ui.sort")}>
          <button
            type="button"
            aria-label={t("ui.sort")}
            aria-expanded="true"
            onClick={() => setOpen(false)}
            className="mb-2 flex min-h-11 w-full items-center justify-between text-sm font-medium"
          >
            {t("ui.sort")}
            <span aria-hidden>×</span>
          </button>
          <div
            ref={menu}
            role="menu"
            aria-label={t("ui.sort")}
            onKeyDown={(e) => {
              const buttons = Array.from(
                e.currentTarget.querySelectorAll<HTMLButtonElement>(
                  '[role="menuitemradio"]',
                ),
              );
              let index = buttons.indexOf(
                document.activeElement as HTMLButtonElement,
              );
              if (e.key === "ArrowDown") index = (index + 1) % buttons.length;
              else if (e.key === "ArrowUp")
                index = (index - 1 + buttons.length) % buttons.length;
              else if (e.key === "Home") index = 0;
              else if (e.key === "End") index = buttons.length - 1;
              else return;
              e.preventDefault();
              buttons[index]?.focus();
            }}
          >
            {[...new Set(sortOptions)].map((key) => (
              <button
                type="button"
                key={key}
                role="menuitemradio"
                aria-checked={key === sort}
                aria-label={
                  t("ui.sort." + key) +
                  (key === sort ? " · " + direction : "")
                }
                onClick={() =>
                  onSort(
                    key,
                    key === sort ? !ascending : defaultSortAscending(key),
                  )
                }
                className="flex min-h-11 w-full items-center gap-2 rounded px-3 text-left text-sm hover:bg-zinc-500/10"
              >
                <span className="w-4">
                  {key === sort && <Check size={16} aria-hidden />}
                </span>
                <span className="flex-1">{t("ui.sort." + key)}</span>
                {key === sort &&
                  (ascending ? (
                    <ArrowUp size={16} aria-hidden />
                  ) : (
                    <ArrowDown size={16} aria-hidden />
                  ))}
              </button>
            ))}
          </div>
        </FloatingPanel>
      )}
    </div>
  );
}
