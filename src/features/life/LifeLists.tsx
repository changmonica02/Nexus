"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { StorageAdapter } from "../../infrastructure/storage/StorageAdapter";
import type { Attachment } from "../../lib/types";
import { useLanguage } from "../../lib/LanguageContext";
import { confirmDialog } from "../../lib/confirmDialog";
import ModalDialog from "../../components/ModalDialog";
import { Pagination } from "../../components/pagination/Pagination";
import { navigateDictionary, useUnsavedDraft } from "../dictionary/useUnsavedDraft";
import {
  attachmentIds,
  emptyLife,
  FIELD_TYPES,
  lifeBase,
  type LifeField,
  type LifeItem,
  type LifeList,
  type LifeCategory,
  type LifeRecord,
  type LifeStore,
} from "./lists";
const button =
  "min-h-11 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm hover:bg-zinc-500/10 disabled:opacity-50";
const input =
  "min-h-11 w-full min-w-0 rounded border border-[var(--color-border)] bg-[var(--color-editor-bg)] px-2 py-2";
type Editor = { type: LifeStore; row: LifeRecord } | { type: "field"; row: LifeField; listRevision: number };
export default function LifeLists({ storage }: { storage: StorageAdapter }) {
  const { language } = useLanguage(),
    en = language === "en",
    label = (zh: string, english: string) => (en ? english : zh);
  const repo = useMemo(() => storage.getLifeRepository(), [storage]),
    [data, setData] = useState(emptyLife),
    [listId, setListId] = useState<string | null>(null),
    [error, setError] = useState(""),
    [editor, setEditor] = useState<Editor | null>(null),
    [busy, setBusy] = useState(false),
    [attachments, setAttachments] = useState<Attachment[]>([]),
    [query, setQuery] = useState(""),
    [categoryId, setCategoryId] = useState("*"),
    [view, setView] = useState<"list" | "cards">("list"),
    [page, setPage] = useState(0);
  const refreshSequence = useRef(0);
  const refresh = useCallback(async () => {
    const sequence = ++refreshSequence.current;
    const [next, files] = await Promise.all([repo.read(), storage.listAttachments()]);
    if (sequence === refreshSequence.current) {
      setData(next);
      setAttachments(files);
    }
  }, [repo, storage]);
  useEffect(() => {
    let active = true;
    const load = () => {
      void refresh().catch((e) => {
        if (active) setError(String(e.message));
      });
    };
    load();
    window.addEventListener("nexus-workspace-changed", load);
    return () => {
      active = false;
      window.removeEventListener("nexus-workspace-changed", load);
    };
  }, [refresh]);
  const list = data.life_lists.find((l) => l.id === listId && l.deleted_at == null),
    categories = data.life_categories.filter((c) => c.list_id === listId && c.deleted_at == null),
    items = data.life_items.filter((i) => i.list_id === listId && i.deleted_at == null);
  const path = (category: LifeCategory) => {
    const names = [category.title],
      seen = new Set([category.id]);
    let id = category.parent_id;
    while (id) {
      const p = categories.find((c) => c.id === id);
      if (!p || seen.has(id)) break;
      seen.add(id);
      names.unshift(p.title);
      id = p.parent_id;
    }
    return names.join(" → ");
  };
  const filtered = items
    .filter(
      (i) =>
        (categoryId === "*" || (i.category_id ?? "") === categoryId) &&
        (
          i.title +
          " " +
          Object.values(i.values)
            .filter((v) => typeof v === "string" || typeof v === "number")
            .join(" ")
        )
          .toLocaleLowerCase()
          .includes(query.toLocaleLowerCase()),
    )
    .sort((a, b) => a.title.localeCompare(b.title, language) || a.id.localeCompare(b.id));
  const currentPage = Math.min(page, Math.max(0, Math.ceil(filtered.length / 50) - 1));
  const run = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await action();
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };
  const remove = async (type: LifeStore, row: LifeRecord) => {
    if (
      await confirmDialog({
        title: label("刪除", "Delete"),
        message: label(
          `確定刪除「${row.title}」？刪除清單會一併移除其中的分類與項目；刪除分類需先移走內容。`,
          `Delete “${row.title}”? Deleting a list also removes its categories and items. Categories must be empty.`,
        ),
        danger: true,
      })
    )
      await run(() => repo.remove(type, row));
  };
  const newRecord = (type: LifeStore) => {
    const base = lifeBase(storage.getWorkspaceOwner?.() ?? null, "");
    setEditor(
      type === "life_lists"
        ? { type, row: { ...base, fields: [], schema_version: 1 } }
        : type === "life_categories"
          ? {
              type,
              row: {
                ...base,
                list_id: list!.id,
                parent_id: categoryId === "*" || !categoryId ? null : categoryId,
              },
            }
          : {
              type,
              row: {
                ...base,
                list_id: list!.id,
                category_id: categoryId === "*" || !categoryId ? null : categoryId,
                schema_version: list!.schema_version,
                values: {},
                attachment_ids: [],
              },
            },
    );
  };
  const save = async (next: Editor) => {
    if (next.type === "field") {
      if (next.listRevision !== list!.revision)
        throw Error(label("清單設定已更新，請關閉後重新編輯", "List settings changed; close and reopen the editor"));
      const existing = list!.fields.find((f) => f.id === next.row.id),
        fields = existing
          ? list!.fields.map((f) => (f.id === next.row.id ? next.row : f))
          : [...list!.fields, next.row];
      await repo.save("life_lists", {
        ...list!,
        fields,
        schema_version: list!.schema_version + (!existing || existing.type !== next.row.type ? 1 : 0),
        updated_at: Date.now(),
      });
    } else {
      const row =
        next.type === "life_items"
          ? {
              ...next.row,
              attachment_ids: attachmentIds(next.row as LifeItem, list!),
            }
          : next.row;
      await repo.save(next.type, { ...row, updated_at: Date.now() });
    }
    await refresh();
    setEditor(null);
  };
  return (
    <section data-life-lists className="min-w-0 space-y-4">
      <header className="flex flex-wrap items-center gap-2">
        {list && (
          <button
            className={button}
            onClick={() => {
              setListId(null);
              setCategoryId("*");
              setQuery("");
              setPage(0);
            }}
          >
            {label("返回我的清單", "Back to my lists")}
          </button>
        )}
        <h2 className="min-w-0 flex-1 break-words text-xl font-semibold">
          {list?.title ?? label("我的清單", "My lists")}
        </h2>
        <button className={button} onClick={() => newRecord(list ? "life_items" : "life_lists")}>
          {list ? label("新增項目", "Add item") : label("新增清單", "New list")}
        </button>
      </header>
      {error && (
        <p role="alert" className="break-words text-red-500">
          {error}
        </p>
      )}
      {!list ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {data.life_lists
            .filter((l) => l.deleted_at == null)
            .map((l) => (
              <article key={l.id} className="min-w-0 rounded-lg border border-[var(--color-border)] p-3">
                <button
                  className="min-h-11 w-full break-words text-left font-medium"
                  onClick={() => {
                    setListId(l.id);
                    setCategoryId("*");
                    setQuery("");
                    setPage(0);
                  }}
                >
                  {l.title}
                </button>
                <div className="flex flex-wrap gap-2">
                  <button className={button} onClick={() => setEditor({ type: "life_lists", row: l })}>
                    {label("重新命名", "Rename")}
                  </button>
                  <button className={button} disabled={busy} onClick={() => void remove("life_lists", l)}>
                    {label("刪除", "Delete")}
                  </button>
                </div>
              </article>
            ))}
          {!data.life_lists.some((l) => l.deleted_at == null) && (
            <p>{label("建立第一份清單。", "Create your first list.")}</p>
          )}
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <button className={button} onClick={() => setEditor({ type: "life_lists", row: list })}>
              {label("清單名稱", "List name")}
            </button>
            <button className={button} onClick={() => newRecord("life_categories")}>
              {label("新增分類", "Add category")}
            </button>
            <button
              className={button}
              onClick={() =>
                setEditor({
                  type: "field",
                  listRevision: list.revision,
                  row: { id: crypto.randomUUID(), name: "", type: "text" },
                })
              }
            >
              {label("新增欄位", "Add field")}
            </button>
            <button className={button} aria-pressed={view === "list"} onClick={() => setView("list")}>
              {label("清單", "List")}
            </button>
            <button className={button} aria-pressed={view === "cards"} onClick={() => setView("cards")}>
              {label("卡片", "Cards")}
            </button>
          </div>
          <details>
            <summary className="cursor-pointer py-2">{label("管理分類與欄位", "Manage categories and fields")}</summary>
            <div className="space-y-2">
              {categories
                .sort((a, b) => path(a).localeCompare(path(b)))
                .map((c) => (
                  <div key={c.id} className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="min-w-0 flex-1 break-words">{path(c)}</span>
                    <button className={button} onClick={() => setEditor({ type: "life_categories", row: c })}>
                      {label("編輯／移動", "Edit / move")}
                    </button>
                    <button className={button} disabled={busy} onClick={() => void remove("life_categories", c)}>
                      {label("刪除", "Delete")}
                    </button>
                  </div>
                ))}
              {list.fields.map((f) => (
                <div key={f.id} className="flex flex-wrap items-center gap-2">
                  <span className="min-w-0 flex-1 break-words">
                    {f.name}
                    {f.archived ? label("（已隱藏，原值保留）", " (hidden, values retained)") : ""}
                  </span>
                  <button
                    className={button}
                    onClick={() =>
                      setEditor({
                        type: "field",
                        listRevision: list.revision,
                        row: f,
                      })
                    }
                  >
                    {label("設定欄位", "Field settings")}
                  </button>
                </div>
              ))}
            </div>
          </details>
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              type="search"
              aria-label={label("搜尋項目", "Search items")}
              placeholder={label("搜尋項目", "Search items")}
              className={input}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
            />
            <select
              aria-label={label("篩選分類", "Filter category")}
              className={input}
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                setPage(0);
              }}
            >
              <option value="*">{label("全部分類", "All categories")}</option>
              <option value="">{label("未分類", "Uncategorized")}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {path(c)}
                </option>
              ))}
            </select>
          </div>
          <p className="text-sm opacity-60">
            {filtered.length} {label("個項目", "items")}
          </p>
          <div className={view === "cards" ? "grid min-w-0 gap-3 sm:grid-cols-2" : "min-w-0 space-y-2"}>
            {filtered.slice(currentPage * 50, currentPage * 50 + 50).map((item) => (
              <article key={item.id} className="min-w-0 space-y-2 rounded-lg border border-[var(--color-border)] p-3">
                <h3 className="break-words font-medium">{item.title}</h3>
                {list.fields
                  .filter((f) => !f.archived && item.values[f.id] != null)
                  .map((f) => (
                    <div key={f.id} className="min-w-0 break-words text-sm">
                      <span className="opacity-60">{f.name}：</span>
                      <FieldValue field={f} value={item.values[f.id]} attachments={attachments} storage={storage} />
                    </div>
                  ))}
                <div className="flex flex-wrap gap-2">
                  <button
                    className={button}
                    onClick={() =>
                      setEditor({
                        type: "life_items",
                        row: { ...item, schema_version: list.schema_version },
                      })
                    }
                  >
                    {label("編輯項目", "Edit item")}
                  </button>
                  <button className={button} disabled={busy} onClick={() => void remove("life_items", item)}>
                    {label("刪除", "Delete")}
                  </button>
                </div>
              </article>
            ))}
          </div>
          <Pagination page={currentPage} total={filtered.length} pageSize={50} onPageChange={setPage} />
        </>
      )}
      {editor && (
        <LifeEditor
          key={editor.type + editor.row.id}
          initial={editor}
          list={list}
          categories={categories}
          attachments={attachments}
          storage={storage}
          onSave={save}
          onClose={() => setEditor(null)}
        />
      )}
    </section>
  );
}
function LifeImage({ id, storage, name }: { id: string; storage: StorageAdapter; name: string }) {
  const [image, setImage] = useState<{ id: string; url: string } | null>(null);
  useEffect(() => {
    let alive = true,
      url: string | undefined;
    void storage
      .readBinary(id)
      .then((blob) => {
        if (!alive || !blob) return;
        url = URL.createObjectURL(blob);
        setImage({ id, url });
      })
      .catch(() => {});
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [id, storage]);
  // Local Blob URLs cannot use Next's remote image optimizer.
  return image?.id === id ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={image.url}
      alt={name}
      loading="lazy"
      className="max-h-40 max-w-full rounded object-contain"
      onError={() => setImage(null)}
    />
  ) : null;
}
function FieldValue({
  field,
  value,
  attachments,
  storage,
}: {
  field: LifeField;
  value: unknown;
  attachments: Attachment[];
  storage: StorageAdapter;
}) {
  const { language } = useLanguage(),
    [error, setError] = useState("");
  if (field.type === "image" || field.type === "attachment")
    return (
      <>
        {(value as string[]).map((id) => (
          <button
            key={id}
            type="button"
            className="min-h-11 max-w-full break-all px-1 underline"
            onClick={() => {
              void (async () => {
                try {
                  const blob = await storage.readBinary(id);
                  if (!blob)
                    throw Error(
                      language === "en"
                        ? "Attachment not downloaded; reconnect first."
                        : "附件尚未下載，請連線後再試。",
                    );
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = attachments.find((a) => a.id === id)?.name ?? "attachment";
                  a.click();
                  setTimeout(() => URL.revokeObjectURL(url), 1000);
                } catch (e) {
                  setError((e as Error).message);
                }
              })();
            }}
          >
            {field.type === "image" && (
              <LifeImage id={id} storage={storage} name={attachments.find((a) => a.id === id)?.name ?? field.name} />
            )}
            {attachments.find((a) => a.id === id)?.name ?? id}
          </button>
        ))}
        {error && <span role="alert">{error}</span>}
      </>
    );
  if (field.type === "money") {
    const money = value as { amount: string; currency: string };
    return (
      <span>
        {money.amount} {money.currency}
      </span>
    );
  }
  return (
    <span className="whitespace-pre-wrap">{typeof value === "boolean" ? (value ? "✓" : "—") : String(value)}</span>
  );
}
function LifeEditor({
  initial,
  list,
  categories,
  attachments,
  storage,
  onSave,
  onClose,
}: {
  initial: Editor;
  list: LifeList | undefined;
  categories: LifeCategory[];
  attachments: Attachment[];
  storage: StorageAdapter;
  onSave: (e: Editor) => Promise<void>;
  onClose: () => void;
}) {
  const { language } = useLanguage(),
    en = language === "en",
    label = (zh: string, english: string) => (en ? english : zh);
  const [draft, setDraft] = useState(() => structuredClone(initial)),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  useUnsavedDraft(dirty, busy);
  const close = () => navigateDictionary(onClose),
    row = draft.row;
  const patch = (value: Record<string, unknown>) => setDraft({ ...draft, row: { ...draft.row, ...value } } as Editor);
  const item = draft.type === "life_items" ? (draft.row as LifeItem) : null;
  const value = (id: string, v: unknown) => patch({ values: { ...item!.values, [id]: v } });
  const fieldNames: Record<string, string> = en
    ? {
        text: "Text",
        longtext: "Long text",
        number: "Number",
        money: "Money",
        date: "Date",
        select: "Option",
        checkbox: "Checkbox",
        image: "Image",
        attachment: "Attachment",
      }
    : {
        text: "文字",
        longtext: "長文字",
        number: "數字",
        money: "金額",
        date: "日期",
        select: "選項",
        checkbox: "勾選",
        image: "圖片",
        attachment: "附件",
      };
  const save = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await onSave(draft);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <ModalDialog
      aria-label={label("清單編輯", "List editor")}
      onDismiss={close}
      busy={busy}
      className="m-auto max-h-[90dvh] w-[min(36rem,calc(100%_-_1rem))] max-w-full overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-editor-bg)] p-4 text-[var(--color-text)] backdrop:bg-black/40"
    >
      <form
        className="min-w-0 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <h2 className="text-lg font-semibold">
          {draft.type === "field"
            ? label("欄位設定", "Field settings")
            : draft.type === "life_lists"
              ? label("清單名稱", "List name")
              : draft.type === "life_categories"
                ? label("分類設定", "Category settings")
                : label("編輯項目", "Edit item")}
        </h2>
        <label className="block">
          {label("名稱", "Name")}
          <input
            autoFocus
            required
            maxLength={500}
            className={input}
            value={"title" in row ? row.title : row.name}
            onChange={(e) => patch(draft.type === "field" ? { name: e.target.value } : { title: e.target.value })}
          />
        </label>
        {draft.type === "field" && (
          <>
            <label className="block">
              {label("型別", "Type")}
              <select className={input} value={draft.row.type} onChange={(e) => patch({ type: e.target.value })}>
                {FIELD_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {fieldNames[t]}
                  </option>
                ))}
              </select>
            </label>
            {draft.row.type === "select" && (
              <label className="block">
                {label("選項（每行一項）", "Options (one per line)")}
                <textarea
                  className={input}
                  value={(draft.row.options ?? []).join("\n")}
                  onChange={(e) => patch({ options: e.target.value.split("\n") })}
                />
              </label>
            )}
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!draft.row.archived}
                onChange={(e) => patch({ archived: e.target.checked })}
              />
              {label(
                "封存欄位（從表單移除，保留原值，可還原）",
                "Archive field (remove from forms; retain values; reversible)",
              )}
            </label>
            <p className="text-sm opacity-60">
              {label(
                "已有資料的欄位不可直接更換型別；請新增欄位。",
                "A field with values cannot change type; add a new field instead.",
              )}
            </p>
          </>
        )}
        {(draft.type === "life_categories" || item) && (
          <label className="block">
            {label("移至分類", "Move to category")}
            <select
              className={input}
              value={item ? (item.category_id ?? "") : ((draft.row as LifeCategory).parent_id ?? "")}
              onChange={(e) =>
                patch(item ? { category_id: e.target.value || null } : { parent_id: e.target.value || null })
              }
            >
              <option value="">{label("最上層／未分類", "Top level / uncategorized")}</option>
              {categories
                .filter((c) => c.id !== row.id)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
            </select>
          </label>
        )}
        {item &&
          list?.fields
            .filter((f) => !f.archived)
            .map((f) => {
              const v = item.values[f.id];
              return (
                <label key={f.id} className="block min-w-0">
                  {f.name}
                  {f.type === "longtext" ? (
                    <textarea className={input} value={String(v ?? "")} onChange={(e) => value(f.id, e.target.value)} />
                  ) : f.type === "checkbox" ? (
                    <input
                      className="ml-3 h-5 w-5"
                      type="checkbox"
                      checked={v === true}
                      onChange={(e) => value(f.id, e.target.checked)}
                    />
                  ) : f.type === "select" ? (
                    <select className={input} value={String(v ?? "")} onChange={(e) => value(f.id, e.target.value)}>
                      <option value="">—</option>
                      {f.options?.map((o) => (
                        <option key={o}>{o}</option>
                      ))}
                    </select>
                  ) : f.type === "image" || f.type === "attachment" ? (
                    <>
                      <select
                        multiple
                        aria-label={f.name + label("：既有附件", ": existing attachments")}
                        className={input}
                        value={Array.isArray(v) ? (v as string[]) : []}
                        onChange={(e) =>
                          value(
                            f.id,
                            Array.from(e.target.selectedOptions, (o) => o.value),
                          )
                        }
                      >
                        {attachments
                          .filter((a) => f.type !== "image" || a.kind === "image")
                          .map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name}
                            </option>
                          ))}
                      </select>
                      <input
                        aria-label={f.name + label("：上傳", ": upload")}
                        type="file"
                        accept={f.type === "image" ? "image/*" : undefined}
                        disabled={busy}
                        className="block min-h-11 w-full min-w-0 max-w-full text-sm"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setBusy(true);
                          void (async () => {
                            try {
                              if (!storage.createAttachment) throw Error("Attachments unavailable");
                              const a = await storage.createAttachment({
                                kind: f.type === "image" ? "image" : "file",
                                name: file.name,
                                mime_type: file.type || "application/octet-stream",
                                size_bytes: file.size,
                              });
                              await storage.attachBinary(a.id, file);
                              value(f.id, [...(Array.isArray(v) ? v : []), a.id]);
                            } catch (e) {
                              setError((e as Error).message);
                            } finally {
                              setBusy(false);
                            }
                          })();
                        }}
                      />
                      <span className="text-xs opacity-60">
                        {Array.isArray(v)
                          ? v.map((id) => attachments.find((a) => a.id === id)?.name ?? id).join("、")
                          : ""}
                      </span>
                    </>
                  ) : f.type === "money" ? (
                    <div className="grid grid-cols-[1fr_5rem] gap-2">
                      <input
                        aria-label={f.name + label("金額", " amount")}
                        className={input}
                        inputMode="decimal"
                        value={(v as { amount?: string })?.amount ?? ""}
                        onChange={(e) =>
                          value(
                            f.id,
                            e.target.value
                              ? {
                                  amount: e.target.value,
                                  currency: (v as { currency?: string })?.currency ?? "TWD",
                                }
                              : null,
                          )
                        }
                      />
                      <input
                        aria-label={f.name + label("幣別", " currency")}
                        className={input}
                        maxLength={3}
                        value={(v as { currency?: string })?.currency ?? "TWD"}
                        onChange={(e) =>
                          value(f.id, {
                            amount: (v as { amount?: string })?.amount ?? "0",
                            currency: e.target.value.toUpperCase(),
                          })
                        }
                      />
                    </div>
                  ) : (
                    <input
                      className={input}
                      type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                      step={f.type === "number" ? "any" : undefined}
                      value={String(v ?? "")}
                      onChange={(e) =>
                        value(
                          f.id,
                          f.type === "number"
                            ? e.target.value === ""
                              ? null
                              : Number(e.target.value)
                            : e.target.value,
                        )
                      }
                    />
                  )}
                </label>
              );
            })}
        {error && (
          <p role="alert" className="break-words text-red-500">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" className={button} disabled={busy} onClick={close}>
            {label("取消", "Cancel")}
          </button>
          <button className={button} disabled={busy}>
            {label("儲存", "Save")}
          </button>
        </div>
      </form>
    </ModalDialog>
  );
}
