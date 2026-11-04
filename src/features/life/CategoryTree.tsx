"use client";
import type { LifeCategory } from "./lists";
const button = "min-h-11 rounded border border-[var(--color-border)] px-2 py-2 text-sm";
export default function CategoryTree({
  categories,
  selected,
  collapsed,
  onSelect,
  onCollapse,
  label,
}: {
  categories: LifeCategory[];
  selected: string;
  collapsed: string[];
  onSelect: (id: string) => void;
  onCollapse: (ids: string[]) => void;
  label: (zh: string, en: string) => string;
}) {
  const children = new Map<string | null, LifeCategory[]>();
  for (const c of categories) {
    const key = c.parent_id && categories.some((p) => p.id === c.parent_id) ? c.parent_id : null;
    const group = children.get(key) ?? [];
    group.push(c);
    children.set(key, group);
  }
  const render = (parent: string | null, seen: Set<string>) => (
    <ul className="min-w-0 space-y-1">
      {(children.get(parent) ?? [])
        .sort((a, b) => a.sort_order - b.sort_order || a.title.localeCompare(b.title))
        .filter((c) => !seen.has(c.id))
        .map((c) => {
          const closed = collapsed.includes(c.id),
            hasChildren = children.has(c.id),
            next = new Set([...seen, c.id]);
          return (
            <li key={c.id} className="min-w-0">
              <div className="flex min-w-0 gap-1">
                {hasChildren ? (
                  <button
                    type="button"
                    className={button + " shrink-0"}
                    aria-label={label("展開／收合：", "Expand / collapse: ") + c.title}
                    aria-expanded={!closed}
                    onClick={() => onCollapse(closed ? collapsed.filter((id) => id !== c.id) : [...collapsed, c.id])}
                  >
                    {closed ? "▸" : "▾"}
                  </button>
                ) : (
                  <span className="w-7 shrink-0" />
                )}
                <button
                  type="button"
                  className={button + " min-w-0 flex-1 break-words text-left"}
                  aria-pressed={selected === c.id}
                  onClick={() => onSelect(c.id)}
                >
                  {c.title}
                </button>
              </div>
              {hasChildren && !closed && (
                <div className="ml-3 min-w-0 border-l border-[var(--color-border)] pl-2">{render(c.id, next)}</div>
              )}
            </li>
          );
        })}
    </ul>
  );
  return (
    <nav
      aria-label={label("分類樹", "Category tree")}
      className="min-w-0 space-y-2 rounded-lg border border-[var(--color-border)] p-2"
    >
      <div className="flex flex-wrap gap-2">
        <button className={button} aria-pressed={selected === "*"} onClick={() => onSelect("*")}>
          {label("全部分類", "All categories")}
        </button>
        <button className={button} aria-pressed={selected === ""} onClick={() => onSelect("")}>
          {label("未分類", "Uncategorized")}
        </button>
        <button className={button} onClick={() => onCollapse([])}>
          {label("全部展開", "Expand all")}
        </button>
        <button
          className={button}
          onClick={() => onCollapse(categories.filter((c) => children.has(c.id)).map((c) => c.id))}
        >
          {label("全部收合", "Collapse all")}
        </button>
      </div>
      {render(null, new Set())}
    </nav>
  );
}
