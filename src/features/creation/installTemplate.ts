import type { StorageAdapter } from "../../infrastructure/storage/StorageAdapter";
import type { Page } from "../../lib/types";
import { snapshotCharacterTemplate } from "../../lib/characterWorkspace";
import type { CreationDownload } from "./templateLibrary";
/** The server receipt's stable private ID makes retry after a lost response safe. */
export async function installCreationTemplate(
  storage: StorageAdapter,
  data: CreationDownload,
  owner: string,
): Promise<Page> {
  const check = () => {
    if (storage.getWorkspaceOwner?.() !== owner)
      throw Error("帳號已切換，請重新開啟資源庫。 / Account changed");
  };
  check();
  const existing = await storage.getPage(data.page_id);
  check();
  if (
    existing &&
    (existing.character_data?.resourceSource?.postId !== data.source_id ||
      !existing.character_data?.isTemplate)
  )
    throw Error("模板來源不一致，停止更新。 / Source mismatch");
  if (existing?.deleted_at)
    throw Error(
      "模板已移至垃圾桶，請先明確復原。 / Restore the deleted template first",
    );
  const now = Date.now();
  const next: Page = {
    ...(existing ?? {}),
    id: data.page_id,
    title: data.title,
    kind: "creative",
    creative_type: data.kind,
    content_json: {},
    content_text: "",
    default_mode: "note",
    created_at: existing?.created_at ?? now,
    updated_at: now,
    revision: (existing?.revision ?? 0) + 1,
    deleted_at: null,
    workspace_owner_id: owner,
    device_id: await storage.getDeviceId(),
    attachment_ids: [],
    character_data: {
      ...snapshotCharacterTemplate(data.structure),
      resourceSource: {
        postId: data.source_id,
        version: data.version,
        author: data.author_name,
        licenseSnapshot: data.license_snapshot,
      },
    },
  };
  check();
  return storage.savePage(next);
}
