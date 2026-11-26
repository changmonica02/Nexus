"use client";
import { coverClasses, evaluateFormula, previewFieldConversion, type Formula, type StatisticPreset } from "./listConfiguration";
import { listTemplates, templateFields } from "./listTemplates";
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { StorageAdapter } from "../../infrastructure/storage/StorageAdapter";
import type { Attachment } from "../../lib/types";
import { useLanguage } from "../../lib/LanguageContext";
import { confirmDialog } from "../../lib/confirmDialog";
import { downloadBlobFile } from "../../lib/fileDownload";
import ModalDialog from "../../components/ModalDialog";
import { categoryPath } from "./listViewModel";
import { navigateDictionary, useUnsavedDraft } from "../dictionary/useUnsavedDraft";
import {
  attachmentIds,
  emptyLife,
  FIELD_TYPES,
  lifeBase,
  validateRequiredFields,
  type LifeField,
  type LifeItem,
  type LifeList,
  type LifeCategory,
  type LifeRecord,
  type LifeStore,
} from "./lists";
const LifeItemViews = lazy(() => import("./LifeItemViews"));
const button =
  "min-h-11 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm hover:bg-zinc-500/10 disabled:opacity-50";
const input =
  "min-h-11 w-full min-w-0 rounded border border-[var(--color-border)] bg-[var(--color-editor-bg)] px-2 py-2";
type Editor = { type: LifeStore; row: LifeRecord } | { type: "field"; row: LifeField; listRevision: number };
function newListEditor(owner: string | null): Editor {
  return { type: "life_lists", row: { ...lifeBase(owner, ""), fields: [], schema_version: 1 } };
}
type RelationTarget={kind:NonNullable<LifeField["relation"]>;id:string;title:string};
export default function LifeLists({ storage, startCreating = false, relations=[], openRelation }: { storage: StorageAdapter; startCreating?: boolean;relations?:RelationTarget[];openRelation?:(target:RelationTarget)=>void }) {
  const { language } = useLanguage(),
    en = language === "en",
    label = (zh: string, english: string) => (en ? english : zh);
  const repo = useMemo(() => storage.getLifeRepository(), [storage]),
    [data, setData] = useState(emptyLife),
    [listId, setListId] = useState<string | null>(null),
    [error, setError] = useState(""),
    [editor, setEditor] = useState<Editor | null>(() => startCreating ? newListEditor(storage.getWorkspaceOwner?.() ?? null) : null),
    [busy, setBusy] = useState(false),
    [attachments, setAttachments] = useState<Attachment[]>([]),
    [categoryId, setCategoryId] = useState("*");
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
  const { list, categories, items } = useMemo(
    () => ({
      list: data.life_lists.find((l) => l.id === listId && l.deleted_at == null),
      categories: data.life_categories.filter((c) => c.list_id === listId && c.deleted_at == null),
      items: data.life_items.filter((i) => i.list_id === listId && i.deleted_at == null),
    }),
    [data, listId],
  );
  const path = (category: LifeCategory) => categoryPath(category.id, categories);
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
    const owner = storage.getWorkspaceOwner?.() ?? null;
    if (type === "life_lists") {
      setEditor(newListEditor(owner));
      return;
    }
    const base = lifeBase(owner, "");
    setEditor(
      type === "life_categories"
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
                values: Object.fromEntries(list!.fields.filter(field=>!field.archived&&field.defaultValue!==undefined).map(field=>[field.id,structuredClone(field.defaultValue)])),
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
      if(next.type==="life_items")validateRequiredFields(list!,next.row as LifeItem);
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
              <article key={l.id} className={"min-w-0 rounded-lg border border-[var(--color-border)] p-3 "+(coverClasses[l.configuration?.cover??""]??"")}>
                <button
                  className="min-h-11 w-full break-words text-left font-medium"
                  onClick={() => {
                    setListId(l.id);
                    setCategoryId("*");
                  }}
                >
                  {l.configuration?.icon&&<span aria-hidden="true" className="mr-2">{l.configuration.icon}</span>}{l.title}
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
          </div>
          <details>
            <summary className="cursor-pointer py-2">{label("管理分類與欄位", "Manage categories and fields")}</summary>
            <div className="space-y-2">
              {[...categories]
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
                    {f.name}{f.unit?"（"+f.unit+"）":""}{f.required?" *":""}
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
          <Suspense fallback={<p role="status">{label("載入檢視…", "Loading views…")}</p>}>
            <LifeItemViews
              key={JSON.stringify([storage.getWorkspaceOwner?.() ?? null, list.id])}
              onCategoryChange={setCategoryId}
              list={list}
              items={items}
              saveStatistics={async(statistics:StatisticPreset[])=>{
                await repo.save("life_lists",{...list,configuration:{...list.configuration,statistics},updated_at:Date.now()});
                await refresh();
              }}
              categories={categories}
              owner={storage.getWorkspaceOwner?.() ?? null}
              renderValue={(f,item)=>{
                const stored=item.values[f.id];
                if(f.relation&&typeof stored==="string"&&stored){
                  const target=relations.find(row=>row.kind===f.relation&&row.id===stored);
                  return target&&openRelation?<button type="button" className="min-h-11 break-words underline" onClick={()=>openRelation(target)}>{target.title}</button>:<span>來源已隱藏或無法使用</span>;
                }
                return <FieldValue field={f} value={f.formula?evaluateFormula(f.formula,item.values):stored} attachments={attachments} storage={storage}/>;
              }}
              onEdit={(item) =>
                setEditor({ type: "life_items", row: { ...item, schema_version: list.schema_version } })
              }
              onRemove={(item) => {
                void remove("life_items", item);
              }}
              busy={busy}
            />
          </Suspense>
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
          relations={relations}
          conversionItems={items}
          onConvert={async(fieldId,target)=>{
            if(!list) return;
            await repo.convertField(list,fieldId,target,items);
            await refresh();
            setEditor(null);
          }}
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
                  const name = attachments.find((a) => a.id === id)?.name ?? "attachment";
                  downloadBlobFile(name, blob);
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
  conversionItems,
  relations,
  onConvert,
  onClose,
}: {
  initial: Editor;
  list: LifeList | undefined;
  categories: LifeCategory[];
  attachments: Attachment[];
  storage: StorageAdapter;
  onSave: (e: Editor) => Promise<void>;
  conversionItems:LifeItem[];
  relations:RelationTarget[];
  onConvert:(fieldId:string,target:"text"|"number")=>Promise<void>;
  onClose: () => void;
}) {
  const { language } = useLanguage(),
    en = language === "en",
    label = (zh: string, english: string) => (en ? english : zh);
  const [draft, setDraft] = useState(() => structuredClone(initial)),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [conversion,setConversion]=useState(false);
  const original=initial.type==="field"?list?.fields.find(field=>field.id===initial.row.id&&!field.archived&&!field.formula):undefined;
  const target=original?.type==="number"?"text":original&&["text","longtext"].includes(original.type)?"number":undefined;
  const preview=conversion&&target&&original?previewFieldConversion(conversionItems,original.id,target):undefined;
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  useUnsavedDraft(dirty, busy);
  const close = () => navigateDictionary(onClose),
    row = draft.row;
  // Async attachment uploads must merge into the latest draft, not a stale render snapshot.
  const patch = (change: Record<string, unknown>) =>
    setDraft((current) => ({ ...current, row: { ...current.row, ...change } }) as Editor);
  const item = draft.type === "life_items" ? (draft.row as LifeItem) : null;
  const value = (id: string, v: unknown) =>
    setDraft((current) => {
      if (current.type !== "life_items") return current;
      const item = current.row as LifeItem;
      return { ...current, row: { ...item, values: { ...item.values, [id]: v } } } as Editor;
    });
  const fieldNames: Record<string, string> = en
    ? {
        time:"Time", url:"URL", rating:"Rating (0–5)", duration:"Duration (minutes)", multiselect:"Multiple options",
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
        time:"時間", url:"網址", rating:"評分（0–5）", duration:"時長（分鐘）", multiselect:"多選",
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
        {draft.type==="life_lists"&&!("revision" in initial.row&&initial.row.revision)&&<label className="grid gap-1">{label("生活紀錄模板","Life record template")}
          <select className={input} defaultValue="" onChange={event=>{
            const name=event.target.value;
            patch({title:name,fields:templateFields(name)});
          }}><option value="">{label("空白清單","Blank list")}</option>
            {Object.keys(listTemplates).map(name=><option key={name}>{name}</option>)}</select>
        </label>}
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
        {draft.type==="life_lists"&&"fields" in row&&<div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1">清單圖示<input className={input} maxLength={12} value={row.configuration?.icon??""}
            onChange={event=>patch({configuration:{...row.configuration,icon:event.target.value}})}/></label>
          <label className="grid gap-1">清單封面<select className={input} value={row.configuration?.cover??""}
            onChange={event=>patch({configuration:{...row.configuration,cover:event.target.value||undefined}})}>
            <option value="">無封面</option><option value="sage">鼠尾草綠</option><option value="sand">沙色</option><option value="sky">天空藍</option><option value="plum">梅紫</option>
          </select></label>
        </div>}
        {draft.type === "field" && (
          <>
            <label className="block">
              {label("型別", "Type")}
              <select className={input} value={draft.row.type} onChange={(e) => patch({ type: e.target.value, defaultValue:undefined, unit:undefined, formula:undefined, relation:undefined })}>
                {FIELD_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {fieldNames[t]}
                  </option>
                ))}
              </select>
            </label>
            {(draft.row.type === "select" || draft.row.type === "multiselect") && (
              <label className="block">
                {label("選項（每行一項）", "Options (one per line)")}
                <textarea
                  className={input}
                  value={(draft.row.options ?? []).join("\n")}
                  onChange={(e) => patch({ options: e.target.value.split("\n") })}
                />
              </label>
            )}
            {["number","duration","rating"].includes(draft.row.type)&&<label className="block">顯示單位
              <input className={input} maxLength={20} value={draft.row.unit??""} onChange={event=>patch({unit:event.target.value})}/>
            </label>}
            {draft.row.type==="text"&&<label className="grid gap-1">資料關聯<select className={input} value={draft.row.relation??""}
              onChange={event=>patch({relation:event.target.value||undefined,defaultValue:undefined})}>
              <option value="">一般文字</option><option value="task">任務</option><option value="schedule">行程</option><option value="milestone">重要日期</option>
            </select></label>}
            {!draft.row.relation&&!draft.row.formula&&["text","longtext","number","rating","duration","date","time","url","checkbox"].includes(draft.row.type)&&<label className="block">新項目預設值
              {draft.row.type==="checkbox"?<select className={input} value={String(draft.row.defaultValue??"")} onChange={event=>patch({defaultValue:event.target.value===""?undefined:event.target.value==="true"})}>
                <option value="">未設定</option><option value="true">已勾選</option><option value="false">未勾選</option>
              </select>:<input className={input} value={String(draft.row.defaultValue??"")}
                type={["number","rating","duration"].includes(draft.row.type)?"number":["date","time","url"].includes(draft.row.type)?draft.row.type:"text"} step="any"
                onChange={event=>patch({defaultValue:event.target.value===""?undefined:event.target.type==="number"?event.target.valueAsNumber:event.target.value})}/>}
            </label>}
            <label className="flex items-center gap-2"><input type="checkbox" checked={!!draft.row.required} disabled={!!draft.row.formula} onChange={event=>patch({required:event.target.checked})}/>必要欄位</label>
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
            {draft.row.type==="number"&&<fieldset className="space-y-2"><legend>簡易公式</legend>
              <label><input type="checkbox" checked={!!draft.row.formula} onChange={event=>patch({formula:event.target.checked?{left:"",right:"",operation:"+"}:undefined,defaultValue:undefined,required:false})}/> 以兩個數值欄位計算</label>
              {draft.row.formula&&<div className="grid gap-2 sm:grid-cols-3">
                {(["left","right"] as const).map(side=><label key={side}>{side==="left"?"左欄位":"右欄位"}<select className={input} value={draft.row.formula![side]} required
                  onChange={event=>patch({formula:{...draft.row.formula,[side]:event.target.value}})}>
                  <option value="">請選擇</option>{list?.fields.filter(field=>field.id!==draft.row.id&&!field.formula&&!field.archived&&["number","rating","duration"].includes(field.type)).map(field=><option key={field.id} value={field.id}>{field.name}</option>)}
                </select></label>)}
                <label>運算<select className={input} value={draft.row.formula.operation} onChange={event=>patch({formula:{...draft.row.formula,operation:event.target.value as Formula["operation"]}})}>
                  {["+","-","*","/"].map(op=><option key={op}>{op}</option>)}
                </select></label>
              </div>}
            </fieldset>}
            {original&&target&&<section className="space-y-2">
              <button className={button} type="button" onClick={()=>setConversion(!conversion)}>{conversion?"收起轉換預覽":"預覽型別轉換"}</button>
              {preview&&<><p>轉為{target==="number"?"數字":"文字"} · 可轉換 {Object.keys(preview.converted).length} 筆，無法轉換 {preview.rejected.length} 筆。原欄位會封存並保留資料。</p>
                {preview.rejected.length>0&&<ul>{conversionItems.filter(item=>preview.rejected.includes(item.id)).slice(0,5).map(item=><li key={item.id}>{item.title}</li>)}</ul>}
                <button className={button} type="button" disabled={busy||!!preview.rejected.length} onClick={async()=>{
                  setBusy(true);setError("");
                  try{await onConvert(original.id,target);}
                  catch(error){setError(error instanceof Error?error.message:"欄位轉換失敗");}
                  finally{setBusy(false);}
                }}>確認轉換並封存原欄位</button>
              </>}
            </section>}
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
                    {categoryPath(c.id, categories)}
                  </option>
                ))}
            </select>
          </label>
        )}
        {item &&
          list?.fields
            .filter((f) => !f.archived&&!f.formula)
            .map((f) => {
              const v = item.values[f.id];
              const numeric=["number","duration","rating"].includes(f.type);
              return (
                <label key={f.id} className="block min-w-0">
                  {f.name}{f.unit?"（"+f.unit+"）":""}{f.required?" *":""}
                  {f.relation?<select className={input} value={String(v??"")} onChange={event=>value(f.id,event.target.value)}>
                    <option value="">未設定</option>
                    {typeof v==="string"&&v&&!relations.some(row=>row.kind===f.relation&&row.id===v)&&<option value={String(v)}>保留目前來源</option>}
                    {relations.filter(row=>row.kind===f.relation).map(row=><option key={row.id} value={row.id}>{row.title}</option>)}
                  </select>:f.type === "longtext" ? (
                    <textarea className={input} value={String(v ?? "")} onChange={(e) => value(f.id, e.target.value)} />
                  ) : f.type === "checkbox" ? (
                    <input
                      className="ml-3 h-5 w-5"
                      type="checkbox"
                      checked={v === true}
                      onChange={(e) => value(f.id, e.target.checked)}
                    />
                  ) : f.type === "multiselect" ? (
                    <select multiple className={input} value={Array.isArray(v)?v:[]} onChange={event=>value(f.id,Array.from(event.target.selectedOptions,option=>option.value))}>
                      {f.options?.map(option=><option key={option}>{option}</option>)}
                    </select>
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
                      type={numeric ? "number" : ["date","time","url"].includes(f.type) ? f.type : "text"}
                      step={numeric ? f.type==="rating"?1:"any" : undefined}
                      min={f.type==="rating"||f.type==="duration"?0:undefined} max={f.type==="rating"?5:undefined}
                      value={String(v ?? "")}
                      onChange={(e) =>
                        value(
                          f.id,
                          numeric
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
