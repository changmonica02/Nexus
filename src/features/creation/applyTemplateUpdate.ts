import type { StorageAdapter } from "../../infrastructure/storage/StorageAdapter";
import {
  mergeCharacterTemplate,
  withTemplateSnapshot,
  restoreTemplateSnapshot,
} from "../../lib/characterTemplateUpdate";
/** Source and destination guards execute inside the same existing IDB page/outbox transaction. */
export async function applyTemplateUpdate(
  storage: StorageAdapter,
  pageId: string,
  sourceId: string,
  expectedRevision: number,
  expectedSourceRevision: number,
) {
  const owner = storage.getWorkspaceOwner?.();
  if (!owner || !storage.savePageChecked)
    throw Error("需要登入及支援安全交易的儲存空間 / Safe storage required");
  const [page, source] = await Promise.all([
    storage.getPage(pageId),
    storage.getPage(sourceId),
  ]);
  if (
    page?.kind !== "creative" ||
    page.character_data?.isTemplate ||
    !page?.character_data ||
    !source?.character_data?.isTemplate ||
    page.deleted_at ||
    source.deleted_at ||
    page.workspace_owner_id !== owner ||
    source.workspace_owner_id !== owner
  )
    throw Error(
      "角色或模板不存在、已刪除或不屬於目前帳號 / Source unavailable",
    );
  if (
    page.revision !== expectedRevision ||
    source.revision !== expectedSourceRevision
  )
    throw Error("版本已變更，請重新預覽 / Revision conflict");
  const merged = mergeCharacterTemplate(
    page.character_data,
    sourceId,
    source.character_data,
  );
  if (!merged.changed) return page;
  const next = {
    ...page,
    character_data: withTemplateSnapshot(
      page.character_data,
      merged.data,
      sourceId,
      Date.now(),
      { title: page.title, attachmentIds: page.attachment_ids ?? [] },
    ),
    updated_at: Date.now(),
    revision: page.revision + 1,
  };
  if (storage.getWorkspaceOwner?.() !== owner)
    throw Error("帳號已切換 / Account changed");
  return storage.savePageChecked(next, expectedRevision, {
    id: sourceId,
    revision: expectedSourceRevision,
  });
}
export async function restoreCharacterTemplateUpdate(
  storage: StorageAdapter,
  pageId: string,
  snapshotId: string,
  expectedRevision: number,
) {
  const owner = storage.getWorkspaceOwner?.(),
    page = await storage.getPage(pageId);
  if (
    !owner ||
    !storage.savePageChecked ||
    !page?.character_data ||
    page.workspace_owner_id !== owner ||
    page.deleted_at ||
    page.revision !== expectedRevision
  )
    throw Error("角色版本或帳號已變更 / Revision conflict");
  const snapshot = page.character_data.templateUpdateSnapshots?.find(
    (s) => s.id === snapshotId,
  );
  const data = restoreTemplateSnapshot(page.character_data, snapshotId);
  const checkpoint = data.templateUpdateSnapshots!.at(-1)!;
  checkpoint.title = page.title;
  checkpoint.attachmentIds = [...(page.attachment_ids ?? [])];
  const next = {
    ...page,
    title: snapshot?.title ?? data.basic.name ?? page.title,
    attachment_ids: [
      ...new Set([
        ...(page.attachment_ids ?? []),
        ...(snapshot?.attachmentIds ?? []),
      ]),
    ],
    character_data: data,
    updated_at: Date.now(),
    revision: page.revision + 1,
  };
  return storage.savePageChecked(next, expectedRevision);
}
