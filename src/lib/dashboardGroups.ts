import { isNovelPage, type Page } from "./types";
import type { FeatureFilter } from "./featurePreferences";
export type DashboardGrouping = "none" | "folder" | "feature";
export function dashboardGrouping(value: string | null): DashboardGrouping {
  return value === "folder" || value === "feature" ? value : "none";
}
/** Navigation grouping only; never changes page kind, IDs or folder membership. */
export function dashboardFeature(page: Page): FeatureFilter {
  if (page.kind === "creative")
    return isNovelPage(page) ? "novels" : "creative";
  switch (page.kind) {
    case "document":
      return "documents";
    case "presentation":
      return "presentations";
    case "study_set":
      return "study";
    case "quick_note":
      return "quicknotes";
    case "counter":
    case "draw":
      return "tools";
    case "todo":
      return "calendar";
    case "web":
      return "web";
    case "score":
      return "score";
    default:
      return "notes";
  }
}
export function dashboardGroups(
  pages: Page[],
  grouping: DashboardGrouping,
  query: string,
  sort: string,
  ascending: boolean,
) {
  const needle = query.trim().toLocaleLowerCase();
  const sorted = pages
    .filter(
      (p) =>
        !p.parent_id &&
        !p.deleted_at &&
        (!needle ||
          `${p.title}\n${p.content_text ?? ""}`
            .toLocaleLowerCase()
            .includes(needle)),
    )
    .sort((a, b) => {
      const pinnedA = (a.sort_order ?? 0) < 0,
        pinnedB = (b.sort_order ?? 0) < 0;
      if (pinnedA !== pinnedB) return pinnedA ? -1 : 1;
      return (
        (ascending ? 1 : -1) *
        (sort === "custom"
          ? (a.sort_order ?? Number.MAX_SAFE_INTEGER) -
            (b.sort_order ?? Number.MAX_SAFE_INTEGER)
          : a.updated_at - b.updated_at)
      );
    });
  const groups = new Map<string, Page[]>();
  for (const page of sorted) {
    const key =
      grouping === "none"
        ? ""
        : grouping === "folder"
          ? page.folder?.trim() || ""
          : dashboardFeature(page);
    const items = groups.get(key) ?? [];
    items.push(page);
    groups.set(key, items);
  }
  return [...groups].map(([key, items]) => ({ key, items }));
}
