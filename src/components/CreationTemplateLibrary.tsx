"use client";
import { useEffect, useRef, useState } from "react";
import type { CharacterProfileData, Page } from "../lib/types";
import {
  creationTemplateLibrary,
  type CreationTemplateLibrary as LibraryService,
  type CreationPost,
  type CreationDraft,
  type CreationVersion,
  type CreationDownload,
} from "../features/creation/templateLibrary";
import { Pagination } from "./pagination/Pagination";
import { SidebarToggle } from "./WorkspaceNavigation";
import TemplateStructurePreview from "./TemplateStructurePreview";
import FloatingPanel from "./FloatingPanel";
import CharacterBlockWorkspace from "./CharacterBlockWorkspace";
import { useWorkspaceDialog } from "./WorkspaceDialog";
const button =
  "min-h-11 rounded border border-[var(--color-border)] px-3 py-2 text-sm disabled:opacity-50";
export default function CreationTemplateLibraryView({
  templates,
  onClose,
  onDownload,
  service = creationTemplateLibrary,
  initialPostId,
}: {
  templates: Page[];
  onClose: () => void;
  onDownload: (data: CreationDownload) => Promise<void>;
  service?: LibraryService;
  initialPostId?: string | null;
}) {
  const [cap, setCap] = useState<
      { version: number; admin: boolean } | null | undefined
    >(undefined),
    [owner, setOwner] = useState(""),
    [kind, setKind] = useState<"character" | "world">("character"),
    [filter, setFilter] = useState<"all" | "official" | "submitted" | "mine">(
      "all",
    ),
    [search, setSearch] = useState(""),
    [page, setPage] = useState(0),
    [total, setTotal] = useState(0),
    [items, setItems] = useState<CreationPost[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(true),
    [refresh, setRefresh] = useState(0),
    [selected, setSelected] = useState<CreationPost | null>(null),
    [versions, setVersions] = useState<CreationVersion[]>([]),
    [historyPage, setHistoryPage] = useState(1),
    [preview, setPreview] = useState<CreationVersion | null>(null),
    [draft, setDraft] = useState<CreationDraft | null>(null),
    [reports, setReports] = useState<
      { id: string; template_id: string; reason: string }[]
    >([]),
    [editing, setEditing] = useState(false);
  const [creating, setCreating] = useState<{
    id: string;
    title: string;
    author: string;
  } | null>(null);
  const { askText, askConfirm, dialog } = useWorkspaceDialog();
  const generation = useRef(0),
    draftRef = useRef<CreationDraft | null>(null),
    queue = useRef<Promise<unknown>>(Promise.resolve()),
    selectedId = useRef<string | null>(null);
  useEffect(() => {
    let active = true;
    void Promise.all([service.capabilities(), service.owner()])
      .then(([c, o]) => {
        if (active) {
          setCap(c);
          setOwner(o);
        }
      })
      .catch((e) => {
        if (active) {
          setCap(null);
          setError(String(e.message ?? e));
        }
      });
    return () => {
      active = false;
      generation.current = Number.MAX_SAFE_INTEGER;
    };
  }, [service]);
  useEffect(() => {
    if (!cap) return;
    let active = true;
    void service
      .list(kind, filter, page + 1, search)
      .then((result) => {
        if (active) {
          setItems(result.items);
          setTotal(result.count);
          const last = Math.max(0, Math.ceil(result.count / 24) - 1);
          if (page > last) setPage(last);
        }
      })
      .catch((e) => {
        if (active) setError(String(e.message ?? e));
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [service, cap, kind, filter, page, search, refresh]);
  const run = async (task: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await task();
      setRefresh((x) => x + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };
  const open = async (post: CreationPost) => {
    selectedId.current = post.id;
    setSelected(post);
    setEditing(false);
    setVersions([]);
    setDraft(null);
    draftRef.current = null;
    setHistoryPage(1);
    const token = ++generation.current;
    await run(async () => {
      const [v, d] = await Promise.all([
        service.versions(post.id),
        post.owner_id === owner
          ? service.draft(post.id)
          : Promise.resolve(null),
      ]);
      if (token !== generation.current) return;
      setVersions(v);
      setDraft(d);
      draftRef.current = d;
    });
  };
  useEffect(() => {
    if (!cap || !initialPostId || !owner) return;
    let active = true;
    void service
      .post(initialPostId)
      .then((p) => {
        if (active) void open(p);
      })
      .catch((e) => {
        if (active) setError(String(e.message ?? e));
      });
    return () => {
      active = false;
    };
    // Open only the explicitly requested stable link, not on every list refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cap, initialPostId, owner, service]);
  const saveDraft = async (structure: CharacterProfileData, title?: string) => {
    const token = generation.current,
      id = selectedId.current;
    const task = queue.current
      .catch(() => {})
      .then(async () => {
        if (token !== generation.current || !id || !draftRef.current)
          throw Error("草稿已切換，請重新開啟 / Draft changed");
        const current = draftRef.current;
        const saved = await service.save({
          id,
          revision: current.revision,
          title: title ?? current.title,
          structure,
        });
        if (token !== generation.current)
          throw Error("帳號或草稿已切換 / Draft changed");
        draftRef.current = saved;
        setDraft(saved);
      });
    queue.current = task;
    await task;
  };
  const closeSelected = (force = false) => {
    if (busy && !force) return;
    selectedId.current = null;
    generation.current++;
    setSelected(null);
    setDraft(null);
    setEditing(false);
    setRefresh((x) => x + 1);
  };
  const choose = (k: typeof kind) => {
    setKind(k);
    setPage(0);
  };
  if (cap === undefined)
    return <main className="flex-1 p-6">載入創作資源庫… / Loading…</main>;
  if (!cap)
    return (
      <main className="flex-1 p-6 space-y-4">
        <SidebarToggle />
        <button className={button} onClick={onClose}>
          ← 返回創作 / Back
        </button>
        <h1>創作資源庫 / Creation library</h1>
        <p>
          尚未啟用或目前無法連線。私人角色卡與模板仍可使用。 / Not enabled or
          offline. Private content remains available.
        </p>
        {error && <p role="alert">{error}</p>}
      </main>
    );
  const matchingTemplates = templates.filter(
    (t) => (t.creative_type === "world" ? "world" : "character") === kind,
  );
  if (selected && editing && draft) {
    const data =
      selected.kind === "world"
        ? {
            ...draft.structure,
            basicBlock: {
              id: draft.structure.basicBlock?.id ?? `world:${selected.id}`,
              enabled: false,
            },
          }
        : draft.structure;
    const p: Page = {
      id: selected.id,
      title: draft.title,
      kind: "creative",
      creative_type: selected.kind,
      character_data: data,
      content_json: {},
      content_text: "",
      default_mode: "note",
      created_at: 0,
      updated_at: 0,
      revision: draft.revision,
      deleted_at: null,
      device_id: "draft",
    };
    return (
      <div className="min-w-0 flex-1 flex flex-col">
        {dialog}
        <div className="flex flex-wrap gap-2 p-2">
          <button
            className={button}
            onClick={() =>
              void run(async () => {
                const title = await askText("投稿名稱 / Title", draft.title);
                if (title?.trim())
                  await saveDraft(draft.structure, title.trim());
              })
            }
          >
            重新命名 / Rename
          </button>
          <span className="text-sm p-2">
            私人投稿草稿・自動儲存；尚未發布 / Private autosaved draft
          </span>
        </div>
        <CharacterBlockWorkspace
          page={p}
          onBack={() => setEditing(false)}
          onCommit={(data) => saveDraft(data)}
          renderComponent={(component) => (
            <div className="text-sm opacity-65">
              {component.type} ·{" "}
              {(
                component.keyValues?.map((v) => v.key) ??
                component.stats?.map((v) => v.label) ??
                []
              ).join(" / ")}
            </div>
          )}
        />
      </div>
    );
  }
  return (
    <main className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-8 text-[var(--color-text)] bg-[var(--color-editor-bg)]">
      {!selected && !creating && dialog}
      <div className="mx-auto max-w-5xl space-y-4">
        <header className="flex flex-wrap items-center gap-3">
          <SidebarToggle />
          <button className={button} onClick={onClose}>
            ← 返回創作 / Back
          </button>
          <h1 className="flex-1 text-xl font-semibold">
            創作資源庫 / Creation library
          </h1>
          <button
            className={button}
            disabled={busy}
            onClick={() =>
              void run(async () => {
                if (!matchingTemplates.length)
                  throw Error(
                    "請先從角色卡／世界觀儲存私人模板 / Save a private template first",
                  );
                const title = await askText(
                  "投稿名稱 / Submission title",
                  matchingTemplates[0].title,
                );
                if (!title?.trim()) return;
                const author = await askText("作者名稱 / Author name");
                if (!author?.trim()) return;
                // Selection uses stable private template ID, never a list index.
                setSelected(null);
                setPreview(null);
                setCreating({
                  id: crypto.randomUUID(),
                  title: title.trim(),
                  author: author.trim(),
                });
              })
            }
          >
            ＋投稿模板 / Submit
          </button>
          {cap.admin && (
            <button
              className={button}
              onClick={() =>
                void run(async () => setReports(await service.reports()))
              }
            >
              檢舉管理 / Reports
            </button>
          )}
        </header>
        {error && (
          <p role="alert" className="text-red-600">
            {error}
            <button className={button} onClick={() => setRefresh((x) => x + 1)}>
              重新整理 / Retry
            </button>
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["character", "角色卡 / Characters"],
              ["world", "世界觀 / Worlds"],
            ] as const
          ).map(([id, title]) => (
            <button
              key={id}
              className={button}
              aria-pressed={kind === id}
              onClick={() => choose(id)}
            >
              {title}
            </button>
          ))}
          <select
            aria-label="資源來源 / Source"
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value as typeof filter);
              setPage(0);
            }}
            className={button}
          >
            <option value="all">全部 / All</option>
            <option value="official">官方 / Official</option>
            <option value="submitted">投稿 / Submitted</option>
            <option value="mine">我的投稿 / Mine</option>
          </select>
          <input
            aria-label="搜尋模板 / Search"
            className="min-w-0 flex-1 border rounded p-2"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
          />
        </div>
        <Pagination
          page={page}
          total={total}
          pageSize={24}
          loading={busy}
          onPageChange={setPage}
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((post) => (
            <button
              key={post.id}
              className="border rounded-xl p-4 text-left"
              onClick={() => void open(post)}
            >
              <strong>{post.title}</strong>
              <p className="text-sm opacity-60">
                {post.author_name} ·{" "}
                {post.official ? "官方 / Official" : "投稿 / Submitted"} · v
                {post.latest_version} · ↓{post.downloads}
              </p>
              {post.visibility !== "published" && <p>{post.visibility}</p>}
              {post.source_id && (
                <p className="text-xs">改編來源 / Source: {post.source_id}</p>
              )}
            </button>
          ))}
        </div>
        {!items.length && !busy && <p>沒有符合的模板 / No templates found</p>}
        {reports.length > 0 && (
          <section>
            <h2>待處理檢舉 / Open reports</h2>
            {reports.map((r) => (
              <article key={r.id} className="border-b p-2">
                <p>
                  {r.template_id} · {r.reason}
                </p>
                <button
                  className={button}
                  onClick={() =>
                    void run(async () => {
                      await service.mutate("resolve_report", {
                        id: r.template_id,
                        report_id: r.id,
                      });
                      setReports(await service.reports());
                    })
                  }
                >
                  標記已處理 / Resolve
                </button>
                <button
                  className={button}
                  onClick={() =>
                    void run(async () => {
                      if (await askConfirm("下架此投稿？ / Take down?"))
                        await service.mutate("takedown", { id: r.template_id });
                    })
                  }
                >
                  下架 / Take down
                </button>
              </article>
            ))}
          </section>
        )}
      </div>
      {creating && (
        <FloatingPanel
          open
          label="選擇私人模板 / Choose private template"
          onClose={() => {
            if (!busy) setCreating(null);
          }}
        >
          {dialog}
          <h2>選擇私人模板 / Choose private template</h2>
          {error && (
            <p role="alert" className="text-red-600">
              {error}
            </p>
          )}
          {matchingTemplates.map((t) => (
            <button
              className={button + " block w-full my-2"}
              key={t.id}
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  if (
                    !(await askConfirm(
                      "確認投稿並立即公開？ / Submit publicly now?",
                    ))
                  )
                    return;
                  const d = await service.save({
                    id: creating.id,
                    revision: 0,
                    title: creating.title,
                    author_name: creating.author,
                    kind,
                    structure: t.character_data!,
                    ...(t.character_data?.resourceSource
                      ? { source_id: t.character_data?.resourceSource.postId }
                      : {}),
                  });
                  const p = await service.mutate<CreationPost>("publish", {
                    id: d.template_id,
                    revision: d.revision,
                    latest_version: 0,
                  });
                  await open(p);
                  setCreating(null);
                  setFilter("mine");
                  setPage(0);
                })
              }
            >
              {t.title}
            </button>
          ))}
        </FloatingPanel>
      )}
      {selected && (
        <FloatingPanel
          open
          wide
          label={`模板 ${selected.title}`}
          onClose={() => closeSelected()}
        >
          {dialog}
          <div className="space-y-4">
            <h2 className="font-semibold text-lg">{selected.title}</h2>
            <a
              className="text-blue-600 underline"
              href={`/?creation-template=${selected.id}`}
            >
              固定連結 / Permalink
            </a>
            <p>
              {selected.author_name} · ↓{selected.downloads}
            </p>
            <p className="text-sm">
              公開改編：
              {selected.allow_derivatives
                ? "允許 / Allowed"
                : "不允許 / Not allowed"}
            </p>
            {Boolean(selected.source_snapshot) && (
              <details>
                <summary>原作者與授權來源 / Attribution</summary>
                <pre className="whitespace-pre-wrap break-all text-xs">
                  {JSON.stringify(selected.source_snapshot, null, 2)}
                </pre>
              </details>
            )}
            {error && (
              <p role="alert" className="text-red-600">
                {error}
              </p>
            )}
            {selected.visibility === "published" && (
              <button
                disabled={busy}
                className={button}
                onClick={() =>
                  void run(async () => {
                    if (
                      await askConfirm(
                        "下載最新版為私人模板；若已有副本，將取代該模板。已建立角色不受影響。 / Download or replace your private template with the latest version?",
                      )
                    ) {
                      const result = await service.mutate<CreationDownload>(
                        "download",
                        { id: selected.id, version: selected.latest_version },
                      );
                      await onDownload(result);
                    }
                  })
                }
              >
                下載／更新最新版 / Download latest
              </button>
            )}
            <button
              disabled={busy}
              className={button}
              onClick={() =>
                void run(async () => {
                  const reason = await askText("檢舉原因 / Report reason");
                  if (reason?.trim())
                    await service.mutate("report", {
                      id: selected.id,
                      operation_id: crypto.randomUUID(),
                      reason: reason.trim(),
                    });
                })
              }
            >
              檢舉 / Report
            </button>
            {selected.owner_id === owner && (
              <div className="flex flex-wrap gap-2">
                <button
                  disabled={busy || !draft}
                  className={button}
                  onClick={() => setEditing(true)}
                >
                  編輯私人草稿 / Edit draft
                </button>
                <button
                  disabled={busy || !draft}
                  className={button}
                  onClick={() =>
                    void run(async () => {
                      if (
                        await askConfirm(
                          "確認發布新版並立即公開？ / Publish publicly now?",
                        )
                      ) {
                        const p = await service.mutate<CreationPost>(
                          "publish",
                          {
                            id: selected.id,
                            revision: draftRef.current?.revision,
                            latest_version: selected.latest_version,
                          },
                        );
                        await open(p);
                      }
                    })
                  }
                >
                  發布新版 / Publish version
                </button>
                <button
                  disabled={busy || !draft || !selected.latest_version}
                  className={button}
                  onClick={() =>
                    void run(async () => {
                      if (
                        await askConfirm(
                          "捨棄目前草稿修改？ / Discard draft changes?",
                        )
                      ) {
                        const d = await service.mutate<CreationDraft>(
                          "discard",
                          {
                            id: selected.id,
                            revision: draftRef.current?.revision,
                          },
                        );
                        draftRef.current = d;
                        setDraft(d);
                      }
                    })
                  }
                >
                  捨棄草稿 / Discard
                </button>
                <button
                  disabled={busy}
                  className={button}
                  onClick={() =>
                    void run(async () => {
                      const p = await service.mutate<CreationPost>("license", {
                        id: selected.id,
                        value: !selected.allow_derivatives,
                      });
                      setSelected(p);
                    })
                  }
                >
                  切換公開改編許可 / Derivative permission
                </button>
                <button
                  disabled={
                    busy ||
                    !selected.latest_version ||
                    selected.visibility === "taken_down"
                  }
                  className={button}
                  onClick={() =>
                    void run(async () => {
                      if (
                        await askConfirm("變更上架狀態？ / Change visibility?")
                      )
                        setSelected(
                          await service.mutate("visibility", {
                            id: selected.id,
                            value:
                              selected.visibility === "published"
                                ? "delisted"
                                : "published",
                          }),
                        );
                    })
                  }
                >
                  {selected.visibility === "published"
                    ? "下架 / Delist"
                    : "重新上架 / Relist"}
                </button>
                <button
                  disabled={busy}
                  className={button + " text-red-600"}
                  onClick={() =>
                    void run(async () => {
                      if (
                        await askConfirm(
                          "永久刪除投稿與公開歷史？其他私人副本不受影響。 / Delete submission and public history permanently?",
                        )
                      ) {
                        const answer = await askText(
                          "輸入 DELETE 再次確認 / Type DELETE",
                        );
                        if (answer === "DELETE") {
                          await service.mutate("delete", {
                            id: selected.id,
                            confirmation: selected.id,
                          });
                          closeSelected(true);
                        }
                      }
                    })
                  }
                >
                  永久刪除 / Delete permanently
                </button>
              </div>
            )}
            {cap.admin && (
              <div className="flex gap-2">
                <button
                  disabled={busy}
                  className={button}
                  onClick={() =>
                    void run(async () =>
                      setSelected(
                        await service.mutate("official", {
                          id: selected.id,
                          value: !selected.official,
                        }),
                      ),
                    )
                  }
                >
                  切換官方標記 / Official
                </button>
                <button
                  disabled={busy}
                  className={button}
                  onClick={() =>
                    void run(async () => {
                      if (await askConfirm("管理員下架？ / Admin take down?"))
                        setSelected(
                          await service.mutate("takedown", { id: selected.id }),
                        );
                    })
                  }
                >
                  管理員下架 / Take down
                </button>
              </div>
            )}
            <h3>歷史發布版本 / Published versions</h3>
            {versions.map((v) => (
              <div
                key={v.version}
                className="flex flex-wrap items-center gap-2 border-b py-2"
              >
                <span>
                  v{v.version} · {v.title}
                </span>
                <button className={button} onClick={() => setPreview(v)}>
                  預覽 / Preview
                </button>
                {selected.owner_id === owner && (
                  <button
                    disabled={busy}
                    className={button}
                    onClick={() =>
                      void run(async () => {
                        if (
                          await askConfirm(
                            "以此版本建立草稿並取代目前草稿？ / Replace current draft from this version?",
                          )
                        ) {
                          const d = await service.mutate<CreationDraft>(
                            "derive",
                            {
                              id: selected.id,
                              version: v.version,
                              revision: draftRef.current?.revision ?? 0,
                            },
                          );
                          setDraft(d);
                          draftRef.current = d;
                          setEditing(true);
                        }
                      })
                    }
                  >
                    衍生草稿 / Draft from version
                  </button>
                )}
              </div>
            ))}
            <div className="flex gap-2">
              <button
                className={button}
                disabled={historyPage === 1 || busy}
                onClick={() =>
                  void run(async () => {
                    const next = historyPage - 1;
                    setVersions(await service.versions(selected.id, next));
                    setHistoryPage(next);
                  })
                }
              >
                上一頁 / Previous
              </button>
              <button
                className={button}
                disabled={versions.length < 20 || busy}
                onClick={() =>
                  void run(async () => {
                    const next = historyPage + 1;
                    setVersions(await service.versions(selected.id, next));
                    setHistoryPage(next);
                  })
                }
              >
                下一頁 / Next
              </button>
            </div>
          </div>
        </FloatingPanel>
      )}
      {preview && (
        <FloatingPanel
          open
          wide
          label={`預覽 v${preview.version}`}
          onClose={() => setPreview(null)}
        >
          <TemplateStructurePreview data={preview.structure} />
        </FloatingPanel>
      )}
    </main>
  );
  // Hooks for creation dialog are declared before any conditional return below via top-level state.
}
