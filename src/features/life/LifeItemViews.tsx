"use client";
import { useEffect, useMemo, type ReactNode } from "react";
import {
  tableFeatures,
  useTable,
  functionalUpdate,
  columnFilteringFeature,
  columnGroupingFeature,
  columnOrderingFeature,
  columnVisibilityFeature,
  rowSortingFeature,
  rowExpandingFeature,
  createFilteredRowModel,
  createGroupedRowModel,
  createSortedRowModel,
  createExpandedRowModel,
  type ColumnDef,
} from "@tanstack/react-table";
import { useLanguage } from "../../lib/LanguageContext";
import { Pagination } from "../../components/pagination/Pagination";
import type { LifeCategory, LifeField, LifeItem, LifeList } from "./lists";
import {
  categoryPath,
  categoryScope,
  compareValues,
  displayValue,
  matchesField,
  orderedFields,
  searchItem,
  viewPreferenceKey,
} from "./listViewModel";
import { useListViewPreferences } from "./useListViewPreferences";
import CategoryTree from "./CategoryTree";
const features = tableFeatures({
  columnFilteringFeature,
  columnGroupingFeature,
  columnOrderingFeature,
  columnVisibilityFeature,
  rowSortingFeature,
  rowExpandingFeature,
  filteredRowModel: createFilteredRowModel(),
  groupedRowModel: createGroupedRowModel(),
  sortedRowModel: createSortedRowModel(),
  expandedRowModel: createExpandedRowModel(),
});
const button =
  "min-h-11 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm hover:bg-zinc-500/10 disabled:opacity-50";
const fieldKey = (field: LifeField) => "field:" + field.id;
const input =
  "min-h-11 w-full min-w-0 rounded border border-[var(--color-border)] bg-[var(--color-editor-bg)] px-2 py-2";
export default function LifeItemViews({
  list,
  items,
  categories,
  owner,
  renderValue,
  onEdit,
  onRemove,
  busy,
  onCategoryChange,
}: {
  list: LifeList;
  items: LifeItem[];
  categories: LifeCategory[];
  owner: string | null;
  renderValue: (f: LifeField, item: LifeItem) => ReactNode;
  onEdit: (item: LifeItem) => void;
  onRemove: (item: LifeItem) => void;
  busy: boolean;
  onCategoryChange: (id: string) => void;
}) {
  const { language } = useLanguage(),
    label = (zh: string, en: string) => (language === "en" ? en : zh);
  const [prefs, update] = useListViewPreferences(viewPreferenceKey(owner, list.id));
  const fields = useMemo(() => list.fields.filter((f) => !f.archived), [list.fields]);
  const fieldOrder = useMemo(
      () =>
        orderedFields(
          fields,
          prefs.columnOrder.map((id) => (id.startsWith("field:") ? id.slice(6) : id)),
        ),
      [fields, prefs.columnOrder],
    ),
    ids = useMemo(() => new Set(["title", "category", ...fields.map(fieldKey)]), [fields]);
  const selected =
    prefs.category === "*" || prefs.category === "" || categories.some((c) => c.id === prefs.category)
      ? prefs.category
      : "*";
  useEffect(() => onCategoryChange(selected), [selected, onCategoryChange]);
  const scoped = useMemo(() => {
    const scope = categoryScope(selected, categories);
    return items.filter(
      (item) =>
        (selected === "*" || (selected === "" ? item.category_id == null : scope.has(item.category_id ?? ""))) &&
        searchItem(item, prefs.query, fields),
    );
  }, [items, selected, categories, prefs.query, fields]);
  const definitions = useMemo<ColumnDef<typeof features, LifeItem>[]>(
    () =>
      [
        {
          id: "title",
          accessorFn: (r: LifeItem) => r.title,
          header: language === "en" ? "Name" : "名稱",
          enableHiding: false,
        },
        {
          id: "category",
          accessorFn: (r: LifeItem) => categoryPath(r.category_id, categories),
          header: language === "en" ? "Category" : "分類",
          getGroupingValue: (r: LifeItem) => r.category_id ?? "",
        },
        ...fields.map((f) => ({
          id: fieldKey(f),
          accessorFn: (r: LifeItem) => r.values[f.id],
          header: f.name,
          getGroupingValue: (r: LifeItem) => displayValue(r.values[f.id]),
        })),
      ].map((def) => ({
        ...def,
        filterFn: (row, id, filter) =>
          matchesField(
            row.getValue(id),
            String(filter ?? ""),
            fields.find((f) => fieldKey(f) === id),
          ),
        sortFn: (a, b, id) =>
          compareValues(
            a.getValue(id),
            b.getValue(id),
            fields.find((f) => fieldKey(f) === id),
          ),
      })),
    [fields, categories, language],
  );
  const sorting = useMemo(() => {
    const valid = prefs.sorting.filter((s) => ids.has(s.id));
    return valid.length ? valid : [{ id: "title", desc: false }];
  }, [prefs.sorting, ids]);
  const visibility = useMemo(
    () => Object.fromEntries([...ids].map((id) => [id, id === "title" || !prefs.hidden.includes(id)])),
    [ids, prefs.hidden],
  );
  const table = useTable({
    features,
    data: scoped,
    columns: definitions,
    getRowId: (r) => "item:" + r.id,
    groupedColumnMode: false,
    initialState: { expanded: true },
    state: {
      sorting,
      columnFilters: Object.entries(prefs.filters)
        .filter(([id, value]) => ids.has(id) && value)
        .map(([id, value]) => ({ id, value })),
      columnVisibility: visibility,
      columnOrder: ["title", "category", ...fieldOrder.map(fieldKey)],
      grouping: ids.has(prefs.group) ? [prefs.group] : [],
    },
    onSortingChange: (u) => update({ sorting: functionalUpdate(u, sorting), page: 0 }),
    onColumnVisibilityChange: (u) => {
      const next = functionalUpdate(u, visibility);
      update({
        hidden: [
          ...new Set([
            ...prefs.hidden.filter((id) => !ids.has(id)),
            ...Object.keys(next).filter((id) => id !== "title" && !next[id]),
          ]),
        ],
      });
    },
  });
  const allRows = table.getRowModel().rows,
    total = allRows.length,
    currentPage = Math.min(prefs.page, Math.max(0, Math.ceil(total / 50) - 1)),
    rows = allRows.slice(currentPage * 50, currentPage * 50 + 50);
  const visibleFields = fieldOrder.filter((f) => visibility[fieldKey(f)]);
  const move = (id: string, delta: number) => {
    const order = fieldOrder.map(fieldKey),
      index = order.indexOf(id),
      next = index + delta;
    if (next < 0 || next >= order.length) return;
    [order[index], order[next]] = [order[next], order[index]];
    update({ columnOrder: order });
  };
  const actions = (item: LifeItem) => (
    <div className="flex flex-wrap gap-2">
      <button className={button} onClick={() => onEdit(item)}>
        {label("編輯項目", "Edit item")}
      </button>
      <button className={button} disabled={busy} onClick={() => onRemove(item)}>
        {label("刪除", "Delete")}
      </button>
    </div>
  );
  const groupHeading = (row: (typeof rows)[number]) => (
    <button
      className={button + " w-full break-words text-left font-semibold"}
      aria-expanded={row.getIsExpanded()}
      onClick={row.getToggleExpandedHandler()}
    >
      {row.getIsExpanded() ? "▾" : "▸"}{" "}
      {(row.groupingColumnId === "category"
        ? categoryPath(String(row.groupingValue ?? ""), categories)
        : String(row.groupingValue ?? "")) || label("未設定", "Not set")}{" "}
      · {row.getLeafRows().length} {label("個項目", "items")}
    </button>
  );
  return (
    <div className="min-w-0 space-y-3" data-life-item-views>
      <div className="flex flex-wrap gap-2" role="group" aria-label={label("清單檢視", "List views")}>
        {(["list", "cards", "table", "tree"] as const).map((v, i) => (
          <button
            type="button"
            key={v}
            className={button}
            aria-pressed={prefs.view === v}
            onClick={() => update({ view: v })}
          >
            {
              [label("清單", "List"), label("卡片", "Cards"), label("表格", "Table"), label("分類樹", "Category tree")][
                i
              ]
            }
          </button>
        ))}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <input
          type="search"
          className={input}
          aria-label={label("搜尋項目", "Search items")}
          placeholder={label("搜尋項目", "Search items")}
          value={prefs.query}
          onChange={(e) => update({ query: e.target.value, page: 0 })}
        />
        <select
          className={input}
          aria-label={label("篩選分類", "Filter category")}
          value={selected}
          onChange={(e) => update({ category: e.target.value, page: 0 })}
        >
          <option value="*">{label("全部分類", "All categories")}</option>
          <option value="">{label("未分類", "Uncategorized")}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {categoryPath(c.id, categories)}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <label>
          {label("排序欄位", "Sort by")}
          <select
            className={input}
            value={sorting[0].id}
            onChange={(e) => update({ sorting: [{ id: e.target.value, desc: sorting[0].desc ?? false }], page: 0 })}
          >
            {definitions.map((c) => (
              <option key={c.id} value={c.id}>
                {String(c.header)}
              </option>
            ))}
          </select>
        </label>
        <button
          className={button + " self-end"}
          onClick={() => update({ sorting: [{ id: sorting[0].id, desc: !sorting[0].desc }], page: 0 })}
        >
          {sorting[0].desc ? label("降冪", "Descending") : label("升冪", "Ascending")}
        </button>
        <label>
          {label("分組欄位", "Group by")}
          <select
            className={input}
            value={ids.has(prefs.group) ? prefs.group : ""}
            onChange={(e) => update({ group: e.target.value, page: 0 })}
          >
            <option value="">{label("不分組", "No grouping")}</option>
            {definitions.map((c) => (
              <option key={c.id} value={c.id}>
                {String(c.header)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <details>
        <summary className="cursor-pointer py-2">{label("欄位顯示、順序與篩選", "Columns, order and filters")}</summary>
        <div className="min-w-0 space-y-2 pt-2">
          {[
            { id: "title", name: label("名稱", "Name") },
            { id: "category", name: label("分類", "Category") },
            ...fieldOrder.map((f) => ({ ...f, id: fieldKey(f) })),
          ].map((f, i) => {
            const field = fields.find((field) => fieldKey(field) === f.id);
            return (
              <div
                key={f.id}
                className="grid min-w-0 gap-2 rounded border border-[var(--color-border)] p-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
              >
                <label className="flex min-h-11 min-w-0 items-center gap-2 break-words">
                  <input
                    type="checkbox"
                    disabled={f.id === "title"}
                    checked={visibility[f.id]}
                    onChange={(e) => table.getColumn(f.id)?.toggleVisibility(e.target.checked)}
                  />
                  {label("顯示：", "Show: ")}
                  {f.name}
                </label>
                {field?.type === "select" || field?.type === "checkbox" ? (
                  <select
                    className={input}
                    aria-label={label("欄位篩選：", "Filter: ") + f.name}
                    value={prefs.filters[f.id] ?? ""}
                    onChange={(e) => update({ filters: { ...prefs.filters, [f.id]: e.target.value }, page: 0 })}
                  >
                    <option value="">{label("不限", "Any")}</option>
                    {(field.type === "checkbox" ? ["true", "false"] : (field.options ?? [])).map((v) => (
                      <option key={v} value={v}>
                        {field.type === "checkbox"
                          ? v === "true"
                            ? label("已勾選", "Checked")
                            : label("未勾選", "Unchecked")
                          : v}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    className={input}
                    aria-label={label("欄位篩選：", "Filter: ") + f.name}
                    type={field?.type === "date" ? "date" : "search"}
                    value={prefs.filters[f.id] ?? ""}
                    onChange={(e) => update({ filters: { ...prefs.filters, [f.id]: e.target.value }, page: 0 })}
                  />
                )}
                <div className="flex gap-1">
                  {i > 1 && (
                    <>
                      <button
                        className={button}
                        disabled={i === 2}
                        aria-label={label("上移：", "Move up: ") + f.name}
                        onClick={() => move(f.id, -1)}
                      >
                        ↑
                      </button>
                      <button
                        className={button}
                        disabled={i === fieldOrder.length + 1}
                        aria-label={label("下移：", "Move down: ") + f.name}
                        onClick={() => move(f.id, 1)}
                      >
                        ↓
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
          <button className={button} onClick={() => update({ filters: {}, query: "", category: "*", page: 0 })}>
            {label("清除篩選", "Clear filters")}
          </button>
        </div>
      </details>
      {prefs.view === "tree" && (
        <CategoryTree
          categories={categories}
          selected={selected}
          collapsed={prefs.collapsed}
          onSelect={(category) => update({ category, page: 0 })}
          onCollapse={(collapsed) => update({ collapsed })}
          label={label}
        />
      )}
      <p className="text-sm opacity-60">
        {table.getFilteredRowModel().rows.length} {label("個項目", "items")}
        {selected !== "*" && selected !== "" ? " · " + label("包含子分類", "Includes subcategories") : ""}
      </p>
      {prefs.view === "table" ? (
        <div
          role="region"
          aria-label={label("項目表格", "Items table")}
          tabIndex={0}
          className="max-w-full overflow-x-auto overscroll-x-contain rounded border border-[var(--color-border)]"
        >
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr>
                {table.getVisibleLeafColumns().map((c) => (
                  <th
                    scope="col"
                    key={c.id}
                    className="min-w-40 max-w-xs border-b border-[var(--color-border)] p-2"
                    aria-sort={
                      c.getIsSorted() === "asc" ? "ascending" : c.getIsSorted() === "desc" ? "descending" : "none"
                    }
                  >
                    <button className="min-h-11 w-full break-words text-left" onClick={c.getToggleSortingHandler()}>
                      {String(c.columnDef.header)}{" "}
                      {c.getIsSorted() === "asc" ? "↑" : c.getIsSorted() === "desc" ? "↓" : ""}
                    </button>
                  </th>
                ))}
                <th className="min-w-36 border-b p-2" scope="col">
                  {label("操作", "Actions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) =>
                row.getIsGrouped() ? (
                  <tr key={row.id}>
                    <td className="p-2" colSpan={table.getVisibleLeafColumns().length + 1}>
                      {groupHeading(row)}
                    </td>
                  </tr>
                ) : (
                  <tr key={row.id} data-life-item={row.original.id}>
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className="max-w-xs break-words border-b border-[var(--color-border)] p-2 align-top"
                      >
                        {cell.column.id === "title"
                          ? row.original.title
                          : cell.column.id === "category"
                            ? categoryPath(row.original.category_id, categories) || label("未分類", "Uncategorized")
                            : renderValue(
                                fields.find((f) => fieldKey(f) === cell.column.id)!,
                                row.original,
                              )}
                      </td>
                    ))}
                    <td className="border-b p-2">{actions(row.original)}</td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className={prefs.view === "cards" ? "grid min-w-0 gap-3 sm:grid-cols-2" : "min-w-0 space-y-2"}>
          {rows.map((row) =>
            row.getIsGrouped() ? (
              <div key={row.id} className="sm:col-span-2">
                {groupHeading(row)}
              </div>
            ) : (
              <article
                key={row.id}
                data-life-item={row.original.id}
                className="min-w-0 space-y-2 rounded-lg border border-[var(--color-border)] p-3"
              >
                <h3 className="break-words font-medium">{row.original.title}</h3>
                {visibility.category && (
                  <p className="break-words text-xs opacity-60">
                    {categoryPath(row.original.category_id, categories) || label("未分類", "Uncategorized")}
                  </p>
                )}
                {visibleFields
                  .filter((f) => row.original.values[f.id] != null)
                  .map((f) => (
                    <div key={f.id} className="min-w-0 break-words text-sm">
                      <span className="opacity-60">{f.name}：</span>
                      {renderValue(f, row.original)}
                    </div>
                  ))}
                {actions(row.original)}
              </article>
            ),
          )}
        </div>
      )}
      {!table.getFilteredRowModel().rows.length && <p>{label("沒有符合的項目。", "No matching items.")}</p>}
      <Pagination page={currentPage} total={total} pageSize={50} onPageChange={(page) => update({ page })} />
    </div>
  );
}
