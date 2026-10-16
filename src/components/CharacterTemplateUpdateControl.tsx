"use client";
import { useState } from "react";
import type { Page } from "../lib/types";
import type { StorageAdapter } from "../infrastructure/storage/StorageAdapter";
import {
  mergeCharacterTemplate,
  type TemplateUpdateSummary,
} from "../lib/characterTemplateUpdate";
import {
  applyTemplateUpdate,
  restoreCharacterTemplateUpdate,
} from "../features/creation/applyTemplateUpdate";
import FloatingPanel from "./FloatingPanel";
import { confirmDialog } from "../lib/confirmDialog";
const button =
  "min-h-11 rounded border border-[var(--color-border)] px-3 py-2 text-sm disabled:opacity-50";
export default function CharacterTemplateUpdateControl({
  page,
  storage: injectedStorage,
  resolveStorage,
  onBeforeRead,
  onApplied,
}: {
  page: Page;
  storage?: StorageAdapter;
  resolveStorage?: () => StorageAdapter | null;
  onBeforeRead: () => Promise<void>;
  onApplied: (page: Page) => void;
}) {
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [prepared, setPrepared] = useState<{
      page: Page;
      source: Page;
      summary: TemplateUpdateSummary;
      changed: boolean;
    } | null>(null),
    [current, setCurrent] = useState<Page | null>(null);
  const getStorage = () => {
    const storage = injectedStorage ?? resolveStorage?.();
    if (!storage) throw Error("Storage unavailable");
    return storage;
  };
  const load = async () => {
    setOpen(true);
    setBusy(true);
    setError("");
    setPrepared(null);
    try {
      const storage = getStorage();
      await onBeforeRead();
      const latest = await storage.getPage(page.id);
      if (
        !latest?.character_data ||
        latest.workspace_owner_id !== storage.getWorkspaceOwner?.()
      )
        throw Error("角色不存在 / Character missing");
      setCurrent(latest);
      const sourceId = latest.character_data.templateSourceId;
      if (!sourceId)
        throw Error("此角色尚未綁定模板；仍可使用已有快照 / No bound source");
      const source = await storage.getPage(sourceId);
      if (
        !source?.character_data?.isTemplate ||
        source.deleted_at ||
        source.workspace_owner_id !== storage.getWorkspaceOwner?.()
      )
        throw Error(
          "來源模板已刪除或無法存取；角色資料保留 / Source unavailable",
        );
      const merge = mergeCharacterTemplate(
        latest.character_data,
        sourceId,
        source.character_data,
      );
      setPrepared({
        page: latest,
        source,
        summary: merge.summary,
        changed: merge.changed,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };
  const snapshots = current?.character_data?.templateUpdateSnapshots ?? [];
  if (
    page.character_data?.isTemplate ||
    (!page.character_data?.templateSourceId &&
      !page.character_data?.templateUpdateSnapshots?.length)
  )
    return null;
  return (
    <>
      <button className={button} onClick={() => void load()}>
        模板更新／還原 / Template updates
      </button>
      {open && (
        <FloatingPanel
          open
          wide
          label="同來源模板更新 / Same-source update"
          onClose={() => {
            if (!busy) setOpen(false);
          }}
        >
          <div className="space-y-4">
            <h2 className="font-semibold">
              同來源模板更新 / Same-source template update
            </h2>
            <p className="text-sm opacity-70">
              只更新目前綁定的模板。保留角色內容與個人覆寫；移除或不相容的舊組件移至「保留內容」。
              / Preserves personal content and overrides.
            </p>
            {error && (
              <p role="alert" className="text-red-600">
                {error}
              </p>
            )}
            {busy && <p role="status">處理中… / Working…</p>}
            {prepared && (
              <>
                <p>來源 / Source: {prepared.source.title}</p>
                <dl className="grid grid-cols-2 gap-2">
                  {(
                    [
                      ["新增空白結構 / Added", prepared.summary.added],
                      ["保留內容 / Retained", prepared.summary.retained],
                      ["重新命名 / Renamed", prepared.summary.renamed],
                      ["移動 / Moved", prepared.summary.moved],
                      [
                        "保護個人覆寫 / Overrides",
                        prepared.summary.preservedOverrides,
                      ],
                    ] as const
                  ).map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-xs opacity-65">{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
                {!prepared.changed && <p>已是目前模板版本 / Up to date</p>}
                <button
                  className={button}
                  disabled={busy || !prepared.changed}
                  onClick={async () => {
                    if (
                      !(await confirmDialog(
                        "建立還原快照並套用此同來源模板更新？ / Create a snapshot and apply this update?",
                      ))
                    )
                      return;
                    setBusy(true);
                    setError("");
                    try {
                      const storage = getStorage();
                      await onBeforeRead();
                      const saved = await applyTemplateUpdate(
                        storage,
                        page.id,
                        prepared.source.id,
                        prepared.page.revision,
                        prepared.source.revision,
                      );
                      if (
                        storage.getWorkspaceOwner?.() !==
                        saved.workspace_owner_id
                      )
                        throw Error("帳號已切換 / Account changed");
                      onApplied(saved);
                      setCurrent(saved);
                      setPrepared(null);
                      setOpen(false);
                    } catch (e) {
                      setError(e instanceof Error ? e.message : String(e));
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  確認套用新版 / Apply update
                </button>
              </>
            )}
            <button
              className={button}
              disabled={busy}
              onClick={() => void load()}
            >
              重新比對 / Compare again
            </button>
            {snapshots.length > 0 && (
              <section>
                <h3>更新前快照 / Restore snapshots</h3>
                {[...snapshots].reverse().map((snapshot) => (
                  <div
                    key={snapshot.id}
                    className="flex flex-wrap items-center justify-between gap-2 border-b py-2"
                  >
                    <span className="text-sm">
                      {new Date(snapshot.at).toLocaleString()}
                    </span>
                    <button
                      className={button}
                      disabled={busy}
                      onClick={async () => {
                        if (
                          !(await confirmDialog(
                            "還原此角色快照？目前內容也會先保留為新快照。 / Restore this snapshot? Current content will also be snapshotted.",
                          ))
                        )
                          return;
                        setBusy(true);
                        setError("");
                        try {
                          const storage = getStorage();
                          await onBeforeRead();
                          const saved = await restoreCharacterTemplateUpdate(
                            storage,
                            page.id,
                            snapshot.id,
                            current!.revision,
                          );
                          if (
                            storage.getWorkspaceOwner?.() !==
                            saved.workspace_owner_id
                          )
                            throw Error("帳號已切換 / Account changed");
                          onApplied(saved);
                          setCurrent(saved);
                          setPrepared(null);
                          setOpen(false);
                        } catch (e) {
                          setError(e instanceof Error ? e.message : String(e));
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      還原 / Restore
                    </button>
                  </div>
                ))}
              </section>
            )}
          </div>
        </FloatingPanel>
      )}
    </>
  );
}
