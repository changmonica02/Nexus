import type { LifeCategory, LifeField, LifeItem } from "./lists";
export type ListView = "list" | "cards" | "table" | "tree";
export interface ViewPreferences {
  version: 1;
  view: ListView;
  query: string;
  category: string;
  columnOrder: string[];
  hidden: string[];
  sorting: { id: string; desc: boolean }[];
  filters: Record<string, string>;
  group: string;
  collapsed: string[];
  page: number;
}
export const defaultViewPreferences = (): ViewPreferences => ({
  version: 1,
  view: "list",
  query: "",
  category: "*",
  columnOrder: [],
  hidden: [],
  sorting: [{ id: "title", desc: false }],
  filters: {},
  group: "",
  collapsed: [],
  page: 0,
});
export const viewPreferenceKey = (owner: string | null, listId: string) =>
  "nexus-life-view:" + JSON.stringify([owner, listId]);
export function readViewPreferences(raw: string): ViewPreferences {
  const initial = defaultViewPreferences();
  try {
    const p = JSON.parse(raw);
    if (p?.version !== 1) return initial;
    const strings = (v: unknown): string[] =>
      Array.isArray(v) ? [...new Set(v.filter((s): s is string => typeof s === "string"))] : [];
    return {
      ...initial,
      view: ["list", "cards", "table", "tree"].includes(p.view) ? p.view : "list",
      query: typeof p.query === "string" ? p.query : "",
      category: typeof p.category === "string" ? p.category : "*",
      columnOrder: strings(p.columnOrder),
      hidden: strings(p.hidden),
      sorting: Array.isArray(p.sorting)
        ? p.sorting.filter(
            (s: unknown): s is { id: string; desc: boolean } =>
              !!s &&
              typeof s === "object" &&
              typeof (s as { id?: unknown }).id === "string" &&
              typeof (s as { desc?: unknown }).desc === "boolean",
          )
        : initial.sorting,
      filters:
        p.filters && typeof p.filters === "object" && !Array.isArray(p.filters)
          ? (Object.fromEntries(Object.entries(p.filters).filter(([, v]) => typeof v === "string")) as Record<
              string,
              string
            >)
          : {},
      group: typeof p.group === "string" ? p.group : "",
      collapsed: strings(p.collapsed),
      page: Number.isSafeInteger(p.page) && p.page >= 0 ? p.page : 0,
    };
  } catch {
    return initial;
  }
}
export function categoryPath(id: string | null, categories: LifeCategory[]): string {
  const names: string[] = [],
    seen = new Set<string>();
  while (id && !seen.has(id)) {
    seen.add(id);
    const c = categories.find((c) => c.id === id);
    if (!c) break;
    names.unshift(c.title);
    id = c.parent_id;
  }
  return names.join(" → ");
}
export function categoryScope(id: string, categories: LifeCategory[]): Set<string> {
  const ids = new Set([id]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const c of categories)
      if (c.parent_id && ids.has(c.parent_id) && !ids.has(c.id)) {
        ids.add(c.id);
        changed = true;
      }
  }
  return ids;
}
/** Decimal comparison without rounding monetary values through a JS float. */
export function compareDecimal(a: string, b: string): number {
  const parts = (s: string) => {
    const [whole, fraction = ""] = s.replace(/^-/, "").split(".");
    return {
      negative: s.startsWith("-"),
      whole: whole.replace(/^0+(?=\d)/, ""),
      fraction: fraction.replace(/0+$/, ""),
    };
  };
  const x = parts(a),
    y = parts(b);
  const xZero = x.whole === "0" && !x.fraction,
    yZero = y.whole === "0" && !y.fraction;
  if (xZero && yZero) return 0;
  if (x.negative !== y.negative) return x.negative ? -1 : 1;
  const width = Math.max(x.fraction.length, y.fraction.length),
    order =
      x.whole.length - y.whole.length ||
      x.whole.localeCompare(y.whole) ||
      x.fraction.padEnd(width, "0").localeCompare(y.fraction.padEnd(width, "0"));
  return Math.sign(order) * (x.negative ? -1 : 1);
}
export function displayValue(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "object" && !Array.isArray(value) && "amount" in value && "currency" in value)
    return `${value.amount} ${value.currency}`;
  return Array.isArray(value) ? value.join(" ") : String(value);
}
export function compareValues(a: unknown, b: unknown, field?: LifeField): number {
  if (a == null || a === "") return b == null || b === "" ? 0 : 1;
  if (b == null || b === "") return -1;
  if (field?.type === "number") return Number(a) - Number(b);
  if (field?.type === "checkbox") return Number(a) - Number(b);
  if (field?.type === "money") {
    const x = a as { currency: string; amount: string },
      y = b as typeof x;
    return x.currency.localeCompare(y.currency) || compareDecimal(x.amount, y.amount);
  }
  return displayValue(a).localeCompare(displayValue(b), undefined, { numeric: true });
}
export function matchesField(value: unknown, filter: string, field?: LifeField): boolean {
  if (!filter) return true;
  if (field?.type === "checkbox") return String(value ?? false) === filter;
  if (field?.type === "select") return value === filter;
  return displayValue(value).toLocaleLowerCase().includes(filter.toLocaleLowerCase());
}
export function orderedFields(fields: LifeField[], order: string[]): LifeField[] {
  const active = fields.filter((f) => !f.archived),
    rank = new Map(order.map((id, i) => [id, i]));
  return [...active].sort((a, b) => (rank.get(a.id) ?? Infinity) - (rank.get(b.id) ?? Infinity));
}
export function searchItem(item: LifeItem, query: string, fields: LifeField[]): boolean {
  return [item.title, ...fields.filter((f) => !f.archived).map((f) => displayValue(item.values[f.id]))]
    .join(" ")
    .toLocaleLowerCase()
    .includes(query.trim().toLocaleLowerCase());
}
