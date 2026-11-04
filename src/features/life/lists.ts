/** Canonical records; views never own copies of items. */
export const LIFE_STORES = ["life_lists", "life_categories", "life_items"] as const;
export type LifeStore = (typeof LIFE_STORES)[number];
export type FieldType =
  "text" | "longtext" | "number" | "money" | "date" | "select" | "checkbox" | "image" | "attachment";
export const FIELD_TYPES: FieldType[] = [
  "text",
  "longtext",
  "number",
  "money",
  "date",
  "select",
  "checkbox",
  "image",
  "attachment",
];
export interface LifeField {
  id: string;
  name: string;
  type: FieldType;
  options?: string[];
  archived?: boolean;
}
interface Base {
  id: string;
  title: string;
  workspace_owner_id: string | null;
  revision: number;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
  sort_order: number;
}
export interface LifeList extends Base {
  fields: LifeField[];
  schema_version: number;
}
export interface LifeCategory extends Base {
  list_id: string;
  parent_id: string | null;
}
export interface LifeItem extends Base {
  list_id: string;
  category_id: string | null;
  schema_version: number;
  values: Record<string, unknown>;
  attachment_ids: string[];
}
export type LifeRecord = LifeList | LifeCategory | LifeItem;
export interface LifeData {
  life_lists: LifeList[];
  life_categories: LifeCategory[];
  life_items: LifeItem[];
}
export const emptyLife = (): LifeData => ({
  life_lists: [],
  life_categories: [],
  life_items: [],
});
export function lifeBase(owner: string | null, title: string): Base {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    title,
    workspace_owner_id: owner,
    revision: 0,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    sort_order: now,
  };
}
export function attachmentIds(item: LifeItem, list: LifeList): string[] {
  return [
    ...new Set(
      list.fields
        .filter((f) => f.type === "image" || f.type === "attachment")
        .flatMap((f) => (Array.isArray(item.values[f.id]) ? (item.values[f.id] as string[]) : [])),
    ),
  ].sort();
}
export function validateLife(
  data: LifeData,
  owner: string | null,
  attachments: {
    id: string;
    deleted_at: number | null;
    workspace_owner_id?: string | null;
  }[],
) {
  const rows = [...data.life_lists, ...data.life_categories, ...data.life_items];
  for (const group of LIFE_STORES)
    if (new Set(data[group].map((r) => r.id)).size !== data[group].length) throw Error("清單資料有重複 ID");
  for (const row of rows)
    if (
      !row.id ||
      typeof row.title !== "string" ||
      !row.title.trim() ||
      row.title.length > 500 ||
      row.workspace_owner_id !== owner ||
      !Number.isSafeInteger(row.revision) ||
      row.revision < 0 ||
      !Number.isFinite(row.sort_order)
    )
      throw Error("清單資料或帳號不符");
  const lists = new Map(data.life_lists.map((l) => [l.id, l])),
    categories = new Map(data.life_categories.map((c) => [c.id, c]));
  for (const list of data.life_lists) {
    if (
      !Number.isSafeInteger(list.schema_version) ||
      list.schema_version < 1 ||
      !Array.isArray(list.fields) ||
      list.fields.length > 100 ||
      new Set(list.fields.map((f) => f.id)).size !== list.fields.length
    )
      throw Error("欄位結構無效");
    for (const f of list.fields)
      if (
        typeof f.id !== "string" ||
        !f.id ||
        typeof f.name !== "string" ||
        (f.archived !== undefined && typeof f.archived !== "boolean") ||
        !f.name?.trim() ||
        !FIELD_TYPES.includes(f.type) ||
        (f.options !== undefined &&
          (!Array.isArray(f.options) ||
            f.options.some((v) => typeof v !== "string") ||
            new Set(f.options).size !== f.options.length))
      )
        throw Error("欄位設定無效");
  }
  for (const category of data.life_categories) {
    const list = lists.get(category.list_id);
    if (!list || (category.deleted_at == null && list.deleted_at != null)) throw Error("分類所屬清單無效");
    const seen = new Set([category.id]);
    let id = category.parent_id;
    while (id) {
      const parent = categories.get(id);
      if (
        seen.has(id) ||
        !parent ||
        parent.list_id !== category.list_id ||
        (category.deleted_at == null && parent.deleted_at != null)
      )
        throw Error("分類循環或跨清單引用");
      seen.add(id);
      id = parent.parent_id;
    }
  }
  for (const item of data.life_items) {
    const list = lists.get(item.list_id),
      category = item.category_id ? categories.get(item.category_id) : null;
    if (
      !list ||
      (item.deleted_at == null && list.deleted_at != null) ||
      (item.category_id &&
        (!category || category.list_id !== item.list_id || (item.deleted_at == null && category.deleted_at != null)))
    )
      throw Error("項目所屬清單或分類無效");
    if (
      !item.values ||
      typeof item.values !== "object" ||
      Array.isArray(item.values) ||
      !Number.isSafeInteger(item.schema_version) ||
      item.schema_version < 1 ||
      item.schema_version > list.schema_version
    )
      throw Error("項目欄位結構無效");
    for (const [id, value] of Object.entries(item.values)) {
      const f = list.fields.find((f) => f.id === id);
      if (!f) throw Error("未知欄位，請先同步清單結構");
      if (value == null || value === "") continue;
      const valid =
        f.type === "checkbox"
          ? typeof value === "boolean"
          : f.type === "number"
            ? typeof value === "number" && Number.isFinite(value)
            : f.type === "money"
              ? typeof value === "object" &&
                !Array.isArray(value) &&
                typeof (value as { amount?: unknown }).amount === "string" &&
                /^-?\d+(\.\d+)?$/.test((value as { amount: string }).amount) &&
                /^[A-Z]{3}$/.test(String((value as { currency?: unknown }).currency))
              : f.type === "image" || f.type === "attachment"
                ? Array.isArray(value) && value.every((id) => typeof id === "string")
                : typeof value === "string" &&
                  (f.type !== "date" ||
                    (/^\d{4}-\d{2}-\d{2}$/.test(value) &&
                      !Number.isNaN(Date.parse(value)) &&
                      new Date(value).toISOString().slice(0, 10) === value)) &&
                  (f.type !== "select" || (f.options ?? []).includes(value));
      if (!valid) throw Error("欄位值與型別不符：" + f.name);
    }
    const ids = attachmentIds(item, list);
    if (JSON.stringify(ids) !== JSON.stringify([...item.attachment_ids].sort())) throw Error("附件引用不符");
    if (item.deleted_at == null)
      for (const id of ids)
        if (!attachments.some((a) => a.id === id && a.workspace_owner_id === owner && a.deleted_at == null))
          throw Error("附件不存在或帳號不符");
  }
}
export function validateFieldChange(before: LifeList, after: LifeList, items: LifeItem[]) {
  if (after.schema_version < before.schema_version || after.schema_version > before.schema_version + 1)
    throw Error("欄位結構版本不符");
  for (const old of before.fields) {
    const next = after.fields.find((f) => f.id === old.id);
    if (!next) throw Error("欄位需封存並保留原值，不可直接移除");
    if (
      old.type !== next.type &&
      items.some((i) => i.list_id === before.id && i.values[old.id] != null && i.values[old.id] !== "")
    )
      throw Error("此欄位已有資料，請新增不同型別的欄位");
  }
  if (
    before.fields.some((f) => after.fields.find((n) => n.id === f.id)?.type !== f.type) ||
    after.fields.some((f) => !before.fields.some((o) => o.id === f.id))
  )
    if (after.schema_version !== before.schema_version + 1) throw Error("欄位結構版本不符");
}
