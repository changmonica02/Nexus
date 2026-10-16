"use client";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Wrench, GripVertical, Trash2 } from "lucide-react";
import type {
  CharacterProfileData,
  CharacterSection,
  Page,
} from "../lib/types";
import {
  CHARACTER_COMPONENT_TYPES,
  normalizeCharacterBlocks,
  characterBlocks,
  replaceCharacterBlocks,
  moveCharacterComponent,
  reorderCharacterBlock,
  updateCharacterComponent,
  newCharacterComponent,
  validateCharacterBlocks,
} from "../lib/characterBlocks";
import CharacterTemplateStructureEditor from "./CharacterTemplateStructureEditor";
import { snapshotCharacterTemplate } from "../lib/characterWorkspace";
import { createBlankTemplate } from "../lib/characterTemplates";
import { confirmDialog } from "../lib/confirmDialog";
import { SidebarToggle } from "./WorkspaceNavigation";
import FloatingPanel from "./FloatingPanel";
import PageItemMenu from "./PageItemMenu";
import { useWorkspaceDialog } from "./WorkspaceDialog";

type ComponentEdit = {
  kind: "component";
  value: CharacterSection;
  baseline?: string;
  block: string;
  before?: string;
  isNew?: boolean;
};
type BasicEdit = {
  kind: "basic";
  value: CharacterProfileData["basic"];
  baseline: string;
};
type Gesture = {
  kind: "component" | "block" | "resize";
  id: string;
  pointer: number;
  x: number;
  y: number;
  active: boolean;
  startWidth: number;
  startHeight: number;
  baseline: string;
  timer?: ReturnType<typeof setTimeout>;
};
export default function CharacterBlockWorkspace({
  page,
  onCommit,
  onBack,
  onSaveTemplate,
  readOnly = false,
  renderComponent,
}: {
  page: Page;
  onCommit: (data: CharacterProfileData) => Promise<void>;
  onBack?: () => void;
  onSaveTemplate?: (name: string, data: CharacterProfileData) => Promise<void>;
  readOnly?: boolean;
  renderComponent: (
    section: CharacterSection,
    mode: "edit" | "card",
    change: (section: CharacterSection) => void,
  ) => ReactNode;
}) {
  const normalized = useMemo(
    () =>
      normalizeCharacterBlocks(
        page.character_data?.isTemplate
          ? snapshotCharacterTemplate(page.character_data)
          : (page.character_data ?? createBlankTemplate()),
        page.id,
      ),
    [page.character_data, page.id],
  );
  const [preview, setPreview] = useState<CharacterProfileData | null>(null),
    [tab, setTab] = useState("base"),
    [editing, setEditing] = useState<ComponentEdit | BasicEdit | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [adding, setAdding] = useState<string | null>(null),
    [addingBlock, setAddingBlock] = useState(false),
    [dragging, setDragging] = useState<"block" | "component" | "resize" | null>(
      null,
    ),
    [columns, setColumns] = useState(4);
  const data = preview ?? normalized,
    blocks = characterBlocks(data, tab),
    root = useRef<HTMLDivElement>(null),
    grid = useRef<HTMLDivElement>(null),
    locked = useRef(false),
    gesture = useRef<Gesture | null>(null),
    draft = useRef<CharacterProfileData | null>(null),
    live = useRef({ data, tab, columns, normalized });
  const contextUntil = useRef(0);
  const { askText, dialog } = useWorkspaceDialog();
  useEffect(() => {
    live.current = { data, tab, columns, normalized };
  }, [data, tab, columns, normalized]);
  useEffect(() => {
    const element = grid.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) =>
      setColumns(
        entry.contentRect.width >= 900
          ? 12
          : entry.contentRect.width >= 560
            ? 8
            : 4,
      ),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const persist = async (next: CharacterProfileData) => {
    if (locked.current || readOnly) return false;
    if (JSON.stringify(next) === JSON.stringify(normalized)) {
      setPreview(null);
      return true;
    }
    locked.current = true;
    setBusy(true);
    setError("");
    try {
      if (data.isTemplate) next = snapshotCharacterTemplate(next);
      validateCharacterBlocks(next);
      setPreview(next);
      await onCommit(next);
      setPreview(null);
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      return false;
    } finally {
      locked.current = false;
      setBusy(false);
    }
  };
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (editing || preview || busy) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [editing, preview, busy]);
  const begin = (
    event: ReactPointerEvent,
    id: string,
    kind: Gesture["kind"],
  ) => {
    if (readOnly || locked.current || event.button !== 0 || gesture.current)
      return;
    if (
      kind !== "resize" &&
      (event.target as HTMLElement).closest("button,input,textarea,select,a")
    )
      return;
    const rect = (
      kind === "resize"
        ? (event.currentTarget.closest("article") ?? event.currentTarget)
        : event.currentTarget
    ).getBoundingClientRect();
    const next: Gesture = {
      kind,
      id,
      pointer: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      active: kind === "resize",
      startWidth: rect.width,
      startHeight: rect.height,
      baseline: JSON.stringify(normalized),
    };
    gesture.current = next;
    draft.current = data;
    if (kind === "resize") {
      event.preventDefault();
      event.stopPropagation();
      setDragging(kind);
      event.currentTarget.setPointerCapture(event.pointerId);
    } else
      next.timer = setTimeout(() => {
        if (gesture.current === next) {
          next.active = true;
          contextUntil.current = Date.now() + 1500;
          setDragging(kind);
        }
      }, 300);
  };
  useEffect(() => {
    const move = (event: PointerEvent) => {
      const current = gesture.current;
      if (!current || current.pointer !== event.pointerId) return;
      if (!current.active) {
        if (
          Math.hypot(event.clientX - current.x, event.clientY - current.y) > 8
        ) {
          clearTimeout(current.timer);
          gesture.current = null;
        }
        return;
      }
      event.preventDefault();
      const { tab, columns } = live.current;
      let value = draft.current ?? live.current.data;
      if (current.kind === "resize") {
        const component = characterBlocks(value, tab)
          .flatMap((b) => b.contents ?? [])
          .find((c) => c.id === current.id);
        if (!component) return;
        const width = grid.current?.getBoundingClientRect().width ?? 320;
        value = updateCharacterComponent(
          value,
          component.id,
          {
            ...component,
            size: {
              span: Math.max(
                4,
                Math.min(
                  12,
                  Math.round(
                    (current.startWidth + event.clientX - current.x) /
                      (width / columns),
                  ),
                ),
              ),
              height: Math.max(
                120,
                Math.min(
                  1600,
                  Math.round(current.startHeight + event.clientY - current.y),
                ),
              ),
            },
          },
          tab,
        );
      } else {
        const target = document
          .elementFromPoint(event.clientX, event.clientY)
          ?.closest<HTMLElement>("[data-character-block]");
        if (!target || !root.current?.contains(target)) return;
        const block = target.dataset.characterBlock!;
        if (current.kind === "block")
          value = reorderCharacterBlock(value, current.id, block, tab);
        else {
          const component = document
            .elementFromPoint(event.clientX, event.clientY)
            ?.closest<HTMLElement>("[data-character-component]")
            ?.dataset.characterComponent;
          value = moveCharacterComponent(
            value,
            current.id,
            block,
            component,
            tab,
          );
        }
        const rect = root.current.getBoundingClientRect();
        if (event.clientY < rect.top + 60) root.current.scrollTop -= 16;
        else if (event.clientY > rect.bottom - 60) root.current.scrollTop += 16;
      }
      draft.current = value;
      setPreview(value);
    };
    const finish = (event: PointerEvent) => {
      const current = gesture.current;
      if (!current || current.pointer !== event.pointerId) return;
      clearTimeout(current.timer);
      gesture.current = null;
      setDragging(null);
      if (!current.active) return;
      contextUntil.current = Date.now() + 600;
      if (event.type === "pointercancel") {
        setPreview(null);
        return;
      }
      if (current.baseline !== JSON.stringify(live.current.normalized)) {
        setError("角色資料已在其他位置更新；拖曳尚未儲存，請重新比對。");
        return;
      }
      if (draft.current) void persist(draft.current);
    };
    const touch = (event: TouchEvent) => {
      if (gesture.current?.active || Date.now() < contextUntil.current)
        event.preventDefault();
    };
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
    window.addEventListener("touchmove", touch, { passive: false });
    return () => {
      clearTimeout(gesture.current?.timer);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
      window.removeEventListener("touchmove", touch);
    };
    // Listeners use live snapshots; onCommit is stable for each mounted page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onCommit, readOnly]);
  const editComponent = (component: CharacterSection, block: string) => {
    setError("");
    setEditing({
      kind: "component",
      value: structuredClone(component),
      baseline: JSON.stringify(component),
      block,
      before: blocks.find((b) => b.id === block)?.contents?.[
        (blocks
          .find((b) => b.id === block)
          ?.contents?.findIndex((c) => c.id === component.id) ?? -1) + 1
      ]?.id,
    });
  };
  const saveEditor = async (close = true) => {
    if (!editing || busy) return;
    let next = data;
    try {
      if (editing.kind === "basic") {
        if (editing.baseline !== JSON.stringify(normalized.basic))
          throw Error("基本資料已更新；請保留輸入後重新比對。");
        next = { ...data, basic: editing.value };
      } else {
        const existing = characterBlocks(normalized, tab)
          .flatMap((b) => b.contents ?? [])
          .find((c) => c.id === editing.value.id);
        if (!editing.isNew && JSON.stringify(existing) !== editing.baseline)
          throw Error("組件已更新；請保留輸入後重新比對。");
        if (editing.isNew) {
          if (!blocks.some((b) => b.id === editing.block))
            throw Error("目標區塊已移除");
          next = replaceCharacterBlocks(
            data,
            blocks.map((b) =>
              b.id === editing.block
                ? { ...b, contents: [...(b.contents ?? []), editing.value] }
                : b,
            ),
            tab,
          );
        } else
          next = updateCharacterComponent(
            data,
            editing.value.id,
            editing.value,
            tab,
          );
        next = moveCharacterComponent(
          next,
          editing.value.id,
          editing.block,
          editing.before,
          tab,
        );
      }
      if (data.isTemplate) next = snapshotCharacterTemplate(next);
      if (await persist(next)) {
        if (close) setEditing(null);
        else {
          const savedValue =
            editing.kind === "basic"
              ? next.basic
              : characterBlocks(next, tab)
                  .flatMap((b) => b.contents ?? [])
                  .find((c) => c.id === editing.value.id)!;
          setEditing(
            (current) =>
              current &&
              ({
                ...current,
                value: savedValue,
                baseline: JSON.stringify(savedValue),
                ...(current.kind === "component" ? { isNew: false } : {}),
              } as ComponentEdit | BasicEdit),
          );
        }
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  };
  const autoSaveRef = useRef(saveEditor);
  useEffect(() => {
    autoSaveRef.current = saveEditor;
  });
  useEffect(() => {
    if (!data.isTemplate || !editing || busy || error) return;
    const current = editing.value;
    if (JSON.stringify(current) === editing.baseline) return;
    const timer = setTimeout(() => void autoSaveRef.current(false), 650);
    return () => clearTimeout(timer);
  }, [editing, data.isTemplate, busy, error]);
  const removeBlock = async (block: CharacterSection) => {
    if (
      block.contents?.length &&
      !(await confirmDialog(
        `刪除「${block.title}」？會連內部 ${block.contents.length} 個組件一起刪除。`,
      ))
    )
      return;
    await persist(
      replaceCharacterBlocks(
        data,
        blocks.filter((b) => b.id !== block.id),
        tab,
      ),
    );
  };
  const removeComponent = async () => {
    if (
      editing?.kind !== "component" ||
      !(await confirmDialog("刪除此組件及其內容？"))
    )
      return;
    const id = editing.value.id;
    if (editing.isNew) {
      setEditing(null);
      return;
    }
    if (
      await persist(
        replaceCharacterBlocks(
          data,
          blocks.map((b) => ({
            ...b,
            contents: b.contents?.filter((c) => c.id !== id),
          })),
          tab,
        ),
      )
    )
      setEditing(null);
  };
  const addBlock = async () => {
    setAddingBlock(false);
    const title = (await askText("區塊名稱", "新區塊"))?.trim();
    if (title)
      await persist(
        replaceCharacterBlocks(
          data,
          [
            ...blocks,
            { id: crypto.randomUUID(), type: "group", title, contents: [] },
          ],
          tab,
        ),
      );
  };
  const control =
    "min-h-11 rounded px-3 py-2 text-sm hover:bg-zinc-500/10 disabled:opacity-40";
  const input =
    "w-full min-w-0 rounded border border-[var(--color-border)] bg-transparent p-2 text-sm";
  return (
    <main
      className="flex h-full min-h-0 min-w-0 flex-1 flex-col bg-[var(--color-editor-bg)] text-[var(--color-text)]"
      data-character-workspace
    >
      {dialog}
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] p-3">
        <div className="flex min-w-0 items-center gap-2">
          <SidebarToggle />
          {onBack && (
            <button className={control} disabled={busy} onClick={onBack}>
              ← 返回創作
            </button>
          )}
          <h1 className="truncate font-semibold">
            {data.isTemplate ? page.title : data.basic.name || page.title}
          </h1>
        </div>
        <div className="flex gap-2">
          {!readOnly && (
            <button
              className={control}
              onClick={() => setAddingBlock(true)}
              disabled={busy}
            >
              ＋新增區塊
            </button>
          )}
          {onSaveTemplate && !readOnly && (
            <PageItemMenu
              title="角色卡更多操作"
              items={[
                {
                  id: "save-template",
                  label: "儲存為模板",
                  onClick: () => {
                    void (async () => {
                      const name = (
                        await askText("模板名稱", page.title + " 模板")
                      )?.trim();
                      if (name) {
                        try {
                          await onSaveTemplate(name, data);
                        } catch (e) {
                          setError(String(e));
                        }
                      }
                    })();
                  },
                },
              ]}
            />
          )}
        </div>
      </header>
      {error && (
        <div
          role="alert"
          className="mx-4 mt-3 rounded border border-red-400 p-3 text-sm"
        >
          {error}
          {preview && !editing && (
            <button
              className={control}
              disabled={busy}
              onClick={() => void persist(preview)}
            >
              重試儲存
            </button>
          )}
        </div>
      )}
      <div ref={root} className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-5">
        <div ref={grid} className="mx-auto max-w-6xl space-y-4">
          {tab === "base" && data.basicBlock?.enabled && (
            <section
              data-character-basic
              className="relative rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4"
            >
              <h2 className="mb-3 font-semibold">角色基本資料</h2>
              {!readOnly && (
                <button
                  className="absolute right-2 top-2 p-3"
                  disabled={busy}
                  aria-label="編輯角色基本資料"
                  onClick={() => {
                    setError("");
                    setEditing({
                      kind: "basic",
                      value: structuredClone(data.basic),
                      baseline: JSON.stringify(normalized.basic),
                    });
                  }}
                >
                  <Wrench size={18} />
                </button>
              )}
              <div className="flex flex-wrap items-start gap-4">
                {data.basic.avatarUrl && (
                  <div
                    role="img"
                    aria-label="角色照片"
                    className="h-24 w-24 rounded bg-cover bg-center"
                    style={{
                      backgroundImage: `url(${JSON.stringify(data.basic.avatarUrl)})`,
                    }}
                  />
                )}
                <dl className="grid min-w-0 flex-1 grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
                  {[
                    ["名字", data.basic.name],
                    ["年齡", data.basic.age],
                    ["性別", data.basic.gender],
                    ["種族", data.basic.race],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-xs opacity-60">{label}</dt>
                      <dd className="break-words">{value || "—"}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </section>
          )}
          {!blocks.length && (
            <p className="py-8 text-center text-sm opacity-60">尚無區塊</p>
          )}
          {blocks.map((block, index) => (
            <section
              key={block.id}
              data-character-block={block.id}
              className="min-w-0 rounded-xl border border-[var(--color-border)] p-3 sm:p-4"
            >
              <header
                onPointerDown={(event) => begin(event, block.id, "block")}
                onContextMenu={(event) => {
                  if (
                    gesture.current?.active ||
                    Date.now() < contextUntil.current
                  )
                    event.preventDefault();
                }}
                className="mb-3 flex min-w-0 select-none items-center justify-between gap-2"
              >
                <h2 className="flex min-w-0 items-center gap-2 font-semibold">
                  <GripVertical size={16} className="shrink-0 opacity-50" />
                  {block.title}
                </h2>
                {!readOnly && (
                  <div className="flex shrink-0 gap-1">
                    <button
                      className={control}
                      disabled={busy || index === 0}
                      aria-label={`上移區塊 ${block.title}`}
                      onClick={() =>
                        void persist(
                          reorderCharacterBlock(
                            data,
                            block.id,
                            blocks[index - 1]?.id,
                            tab,
                          ),
                        )
                      }
                    >
                      ↑
                    </button>
                    <button
                      className={control}
                      disabled={busy || index === blocks.length - 1}
                      aria-label={`下移區塊 ${block.title}`}
                      onClick={() =>
                        void persist(
                          reorderCharacterBlock(
                            data,
                            blocks[index + 1].id,
                            block.id,
                            tab,
                          ),
                        )
                      }
                    >
                      ↓
                    </button>
                    <button
                      className={control}
                      disabled={busy}
                      aria-label={`重新命名區塊 ${block.title}`}
                      onClick={async () => {
                        const title = (
                          await askText("區塊名稱", block.title)
                        )?.trim();
                        if (title)
                          await persist(
                            replaceCharacterBlocks(
                              data,
                              blocks.map((b) =>
                                b.id === block.id ? { ...b, title } : b,
                              ),
                              tab,
                            ),
                          );
                      }}
                    >
                      重新命名
                    </button>
                    <button
                      className={control}
                      disabled={busy}
                      aria-label={`刪除區塊 ${block.title}`}
                      onClick={() => void removeBlock(block)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </header>
              <div hidden={dragging === "block"}>
                {!block.contents?.length && (
                  <p className="py-4 text-sm opacity-50">尚無組件</p>
                )}
                <div
                  className="grid min-w-0 items-start gap-3"
                  style={{
                    gridTemplateColumns: `repeat(${columns},minmax(0,1fr))`,
                    gridAutoFlow: "row dense",
                  }}
                >
                  {block.contents?.map((component) => (
                    <article
                      key={component.id}
                      data-character-component={component.id}
                      onPointerDown={(event) =>
                        begin(event, component.id, "component")
                      }
                      onContextMenu={(event) => {
                        if (
                          gesture.current?.active ||
                          Date.now() < contextUntil.current
                        )
                          event.preventDefault();
                      }}
                      className="relative min-w-0"
                      style={{
                        gridColumn: `span ${Math.min(columns, component.size?.span ?? 4)}`,
                      }}
                    >
                      <div
                        className="min-w-0 overflow-auto"
                        style={
                          component.size?.height
                            ? { height: component.size.height }
                            : undefined
                        }
                      >
                        {renderComponent(component, "card", () => {})}
                      </div>
                      {!readOnly && (
                        <>
                          <button
                            className="absolute right-1 top-1 rounded bg-[var(--color-bg)] p-3"
                            disabled={busy}
                            aria-label={`編輯組件 ${component.title}`}
                            onClick={() => editComponent(component, block.id)}
                          >
                            <Wrench size={18} />
                          </button>
                          <button
                            type="button"
                            className="absolute bottom-0 right-0 h-10 w-10 touch-none text-right text-xl opacity-50"
                            disabled={busy}
                            aria-label={`調整尺寸 ${component.title}`}
                            onPointerDown={(event) =>
                              begin(event, component.id, "resize")
                            }
                          >
                            ◢
                          </button>
                        </>
                      )}
                    </article>
                  ))}
                </div>
                {!readOnly && (
                  <button
                    className={control}
                    disabled={busy}
                    onClick={() => setAdding(block.id)}
                  >
                    ＋新增組件
                  </button>
                )}
              </div>
            </section>
          ))}
          {!readOnly && (
            <p className="py-2 text-xs opacity-50">
              長按組件可移動到其他區塊；長按區塊標題可排序。也可在組件扳手中選擇位置，或用區塊箭頭操作。
            </p>
          )}
        </div>
      </div>
      <footer className="flex shrink-0 flex-wrap items-center gap-2 border-t border-[var(--color-border)] p-2">
        <button
          className={control}
          aria-pressed={tab === "base"}
          onClick={() => setTab("base")}
        >
          基本頁
        </button>
        {data.tabs?.map((item) => (
          <button
            key={item.id}
            className={control}
            aria-pressed={tab === item.id}
            onClick={() => setTab(item.id)}
          >
            {item.title}
          </button>
        ))}
        {!readOnly && (
          <button
            className={control}
            onClick={async () => {
              const title = (await askText("頁面名稱", "補充頁"))?.trim();
              if (title) {
                const id = crypto.randomUUID();
                if (
                  await persist({
                    ...data,
                    tabs: [...(data.tabs ?? []), { id, title, sections: [] }],
                  })
                )
                  setTab(id);
              }
            }}
          >
            ＋新增頁面
          </button>
        )}
        {!readOnly && (
          <PageItemMenu
            title="角色頁面操作"
            items={[
              {
                id: "copy",
                label: "複製目前頁面",
                onClick: () => {
                  const clone = (
                    section: CharacterSection,
                  ): CharacterSection => ({
                    ...structuredClone(section),
                    id: crypto.randomUUID(),
                    contents: section.contents?.map(clone),
                  });
                  const id = crypto.randomUUID();
                  void persist({
                    ...data,
                    tabs: [
                      ...(data.tabs ?? []),
                      {
                        id,
                        title:
                          (data.tabs?.find((t) => t.id === tab)?.title ??
                            "基本頁") + " 副本",
                        sections: blocks.map(clone),
                      },
                    ],
                  }).then((ok) => {
                    if (ok) setTab(id);
                  });
                },
              },
              ...(tab !== "base"
                ? [
                    {
                      id: "rename",
                      label: "重新命名頁面",
                      onClick: () => {
                        void (async () => {
                          const title = (
                            await askText(
                              "頁面名稱",
                              data.tabs?.find((t) => t.id === tab)?.title,
                            )
                          )?.trim();
                          if (title)
                            await persist({
                              ...data,
                              tabs: data.tabs?.map((t) =>
                                t.id === tab ? { ...t, title } : t,
                              ),
                            });
                        })();
                      },
                    },
                    {
                      id: "delete",
                      label: "刪除目前頁面",
                      danger: true,
                      onClick: () => {
                        void (async () => {
                          if (
                            await confirmDialog("刪除此頁面與全部區塊／組件？")
                          )
                            if (
                              await persist({
                                ...data,
                                tabs: data.tabs?.filter((t) => t.id !== tab),
                              })
                            )
                              setTab("base");
                        })();
                      },
                    },
                  ]
                : []),
            ]}
          />
        )}
        {busy && (
          <span role="status" className="text-xs">
            儲存中…
          </span>
        )}
      </footer>
      {addingBlock && (
        <FloatingPanel
          open
          label="新增區塊"
          onClose={() => setAddingBlock(false)}
        >
          <div className="space-y-2">
            <button className={control} onClick={() => void addBlock()}>
              一般區塊
            </button>
            {!data.basicBlock?.enabled && (
              <button
                className={control}
                onClick={() => {
                  setAddingBlock(false);
                  void persist({
                    ...data,
                    basicBlock: {
                      id: data.basicBlock?.id ?? crypto.randomUUID(),
                      enabled: true,
                    },
                  });
                  setTab("base");
                }}
              >
                角色基本資料
              </button>
            )}
          </div>
        </FloatingPanel>
      )}
      {adding && (
        <FloatingPanel open label="新增組件" onClose={() => setAdding(null)}>
          <div className="grid grid-cols-2 gap-2">
            {CHARACTER_COMPONENT_TYPES.map((type) => (
              <button
                key={type.type}
                className={control}
                onClick={() => {
                  setEditing({
                    kind: "component",
                    value: newCharacterComponent(type.type),
                    block: adding,
                    isNew: true,
                  });
                  setAdding(null);
                }}
              >
                {type.label}
              </button>
            ))}
          </div>
        </FloatingPanel>
      )}
      {editing && (
        <FloatingPanel
          open
          wide
          label={editing.kind === "basic" ? "編輯角色基本資料" : "編輯組件"}
          onClose={() => void saveEditor()}
        >
          <div className="space-y-4">
            <header className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold">
                {editing.kind === "basic"
                  ? "角色基本資料"
                  : editing.value.title}
              </h2>
              <button
                className={control}
                disabled={busy}
                onClick={() => void saveEditor()}
              >
                儲存並返回
              </button>
            </header>
            {error && (
              <p role="alert" className="text-sm text-red-600">
                {error}
              </p>
            )}
            <fieldset disabled={busy} className="min-w-0 space-y-4">
              {editing.kind === "basic" ? (
                <>
                  {data.isTemplate && (
                    <p>
                      固定五欄：照片、名字、年齡、性別、種族。模板不儲存個人內容。
                    </p>
                  )}
                  {!data.isTemplate &&
                    (
                      [
                        ["avatarUrl", "照片網址"],
                        ["name", "名字"],
                        ["age", "年齡"],
                        ["gender", "性別"],
                        ["race", "種族"],
                      ] as const
                    ).map(([key, label]) => (
                      <label key={key} className="block text-sm">
                        {label}
                        <input
                          className={input}
                          value={String(editing.value[key] ?? "")}
                          onChange={(event) =>
                            setEditing({
                              ...editing,
                              value: {
                                ...editing.value,
                                [key]: event.target.value,
                              },
                            })
                          }
                        />
                      </label>
                    ))}
                  <button
                    className={control}
                    onClick={async () => {
                      if (
                        await confirmDialog(
                          "移除角色基本資料區塊？可由新增區塊重新加入。",
                        )
                      )
                        if (
                          await persist({
                            ...data,
                            basicBlock: { ...data.basicBlock!, enabled: false },
                          })
                        )
                          setEditing(null);
                    }}
                  >
                    刪除角色基本資料
                  </button>
                </>
              ) : (
                <>
                  {data.isTemplate ? (
                    <CharacterTemplateStructureEditor
                      value={editing.value}
                      onChange={(value) => setEditing({ ...editing, value })}
                    />
                  ) : (
                    renderComponent(editing.value, "edit", (value) =>
                      setEditing({ ...editing, value }),
                    )
                  )}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="text-sm">
                      移動至區塊
                      <select
                        className={input}
                        value={editing.block}
                        onChange={(event) =>
                          setEditing({
                            ...editing,
                            block: event.target.value,
                            before: undefined,
                          })
                        }
                      >
                        {blocks.map((block) => (
                          <option key={block.id} value={block.id}>
                            {block.title}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-sm">
                      位置
                      <select
                        className={input}
                        value={editing.before ?? ""}
                        onChange={(event) =>
                          setEditing({
                            ...editing,
                            before: event.target.value || undefined,
                          })
                        }
                      >
                        <option value="">最後</option>
                        {blocks
                          .find((b) => b.id === editing.block)
                          ?.contents?.filter((c) => c.id !== editing.value.id)
                          .map((component) => (
                            <option key={component.id} value={component.id}>
                              在「{component.title}」之前
                            </option>
                          ))}
                      </select>
                    </label>
                    <label className="text-sm">
                      寬度（4–12）
                      <input
                        aria-label="組件寬度"
                        className={input}
                        type="number"
                        min={4}
                        max={12}
                        value={editing.value.size?.span ?? 4}
                        onChange={(event) =>
                          setEditing({
                            ...editing,
                            value: {
                              ...editing.value,
                              size: {
                                ...editing.value.size,
                                span: Number(event.target.value),
                              },
                            },
                          })
                        }
                      />
                    </label>
                    <label className="text-sm">
                      高度（留白隨內容）
                      <input
                        aria-label="組件高度"
                        className={input}
                        type="number"
                        min={120}
                        max={1600}
                        value={editing.value.size?.height ?? ""}
                        onChange={(event) =>
                          setEditing({
                            ...editing,
                            value: {
                              ...editing.value,
                              size: {
                                span: editing.value.size?.span ?? 4,
                                height: event.target.value
                                  ? Number(event.target.value)
                                  : undefined,
                              },
                            },
                          })
                        }
                      />
                    </label>
                  </div>
                  <button
                    className={control + " text-red-600"}
                    onClick={() => void removeComponent()}
                  >
                    刪除組件
                  </button>
                </>
              )}
            </fieldset>
            <button
              className={control}
              disabled={busy}
              onClick={async () => {
                if (await confirmDialog("放棄這次尚未儲存的編輯？")) {
                  setEditing(null);
                  setPreview(null);
                  setError("");
                }
              }}
            >
              放棄修改
            </button>
          </div>
        </FloatingPanel>
      )}
    </main>
  );
}
