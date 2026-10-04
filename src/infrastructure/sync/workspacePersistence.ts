import type { IDBPDatabase } from "idb";
import type { Attachment, Page } from "../../lib/types";

export const WORKSPACE_STORES = ["workspace_outbox", "workspace_sync_meta"] as const;
export type EntityType = "pages" | "attachments";
export type WorkspaceRecord = Page | Attachment;
export type OperationKind = "save" | "soft_delete" | "restore" | "hard_delete" | "binary";
export interface WorkspaceOperation {
  id: string;
  entity_type: EntityType;
  entity_id: string;
  kind: OperationKind;
  expected_revision: number;
  value?: WorkspaceRecord;
  data?: string;
}
export interface WorkspaceBatch {
  id: string;
  owner_id: string | null;
  sequence: number;
  operations: WorkspaceOperation[];
  error?: string;
}
export interface WorkspaceResult {
  entity_type: EntityType;
  entity_id: string;
  revision: number;
  deleted_at: number | null;
  hard_deleted: boolean;
  row?: Record<string, unknown>;
}
interface Meta {
  id: string;
  owner_id: string | null;
  revision: number;
  hard_deleted?: boolean;
}
const key = (owner: string | null, type: EntityType, id: string) => JSON.stringify([owner, type, id]);
const notify = () => { if (typeof window !== "undefined") window.dispatchEvent(new Event("nexus-workspace-changed")); };
const stores = ["pages", "attachments", "binaries", ...WORKSPACE_STORES];

/** Local records and immutable upload intents commit together. Remote merges never enqueue. */
export class WorkspacePersistence {
  constructor(private db: IDBPDatabase) {}

  async pending(owner: string): Promise<WorkspaceBatch[]> {
    return (await this.db.getAll("workspace_outbox") as WorkspaceBatch[])
      .filter(batch => batch.owner_id === owner).sort((a, b) => a.sequence - b.sequence);
  }

  async mutate(owner: string | null, changes: { type: EntityType; kind: OperationKind; value: WorkspaceRecord; data?: string; blob?: Blob }[]): Promise<void> {
    const tx = this.db.transaction(stores, "readwrite", { durability: "strict" });
    try {
      const outbox = tx.objectStore("workspace_outbox");
      const metadata = tx.objectStore("workspace_sync_meta");
      const queued = await outbox.getAll() as WorkspaceBatch[];
      const operations: WorkspaceOperation[] = [];
      for (const change of changes) {
        const { type, kind } = change;
        const value = structuredClone(change.value);
        if ((value.workspace_owner_id ?? null) !== owner) throw new Error("Workspace ownership mismatch");
        const store = tx.objectStore(type);
        const old = await store.get(value.id) as WorkspaceRecord | undefined;
        if (old && (old.workspace_owner_id ?? null) !== owner) throw new Error("Workspace ownership mismatch");
        const metaId = key(owner, type, value.id);
        const meta = await metadata.get(metaId) as Meta | undefined;
        if (meta?.hard_deleted) throw new Error("此物件已永久刪除，不能重新儲存。");
        if (kind === "save" && (old?.deleted_at != null || value.deleted_at != null)) throw new Error("已刪除物件只能透過還原操作恢復。");
        if (kind !== "save" && !old) throw new Error("Workspace object not found");
        const previous = queued.filter(b => b.owner_id === owner).sort((a, b) => a.sequence - b.sequence)
          .flatMap(b => b.operations).concat(operations).filter(op => op.entity_type === type && op.entity_id === value.id).at(-1);
        // Existing, pre-outbox caches are not new objects: a missing cloud row must conflict.
        const revision = previous ? previous.expected_revision + 1 : meta?.revision ?? (old ? ("revision" in old ? old.revision ?? 1 : 1) : 0);
        const op: WorkspaceOperation = { id: crypto.randomUUID(), entity_type: type, entity_id: value.id, kind, expected_revision: revision };
        if (kind === "save") op.value = value;
        if (kind === "binary") op.data = change.data;
        operations.push(op);
        await metadata.put({ ...meta, id: metaId, owner_id: owner, revision: meta?.revision ?? revision, hard_deleted: kind === "hard_delete" });
        if (kind === "hard_delete") {
          await store.delete(value.id);
          if (type === "attachments") await tx.objectStore("binaries").delete(value.id);
        } else if (kind === "binary") {
          if (old?.deleted_at != null) throw new Error("Attachment is deleted");
          await tx.objectStore("binaries").put({ id: value.id, blob: change.blob, updated_at: Date.now() });
        } else {
          const next = kind === "save" ? value : { ...old!, deleted_at: kind === "restore" ? null : Date.now(), updated_at: Date.now() };
          await store.put(next);
        }
      }
      const counter = await metadata.get("sequence");
      const sequence = (counter?.value ?? 0) + 1;
      await metadata.put({ id: "sequence", value: sequence });
      await outbox.add({ id: crypto.randomUUID(), owner_id: owner, sequence, operations } satisfies WorkspaceBatch);
      await tx.done;
    } catch (error) {
      try { tx.abort(); } catch {}
      await tx.done.catch(() => undefined);
      throw error;
    }
    notify();
  }

  async fail(batch: WorkspaceBatch, message: string): Promise<void> {
    const tx = this.db.transaction("workspace_outbox", "readwrite");
    const current = await tx.store.get(batch.id);
    if (current) await tx.store.put({ ...current, error: message });
    await tx.done;
  }

  async merge(owner: string, results: WorkspaceResult[], acknowledged?: string): Promise<void> {
    const tx = this.db.transaction(stores, "readwrite", { durability: "strict" });
    try {
      if (acknowledged) await tx.objectStore("workspace_outbox").delete(acknowledged);
      const pending = (await tx.objectStore("workspace_outbox").getAll() as WorkspaceBatch[])
        .filter(b => b.owner_id === owner).flatMap(b => b.operations);
      for (const result of results) {
        const id = key(owner, result.entity_type, result.entity_id);
        const meta = await tx.objectStore("workspace_sync_meta").get(id) as Meta | undefined;
        if ((meta?.revision ?? -1) > result.revision) continue;
        const related = pending.filter(op => op.entity_type === result.entity_type && op.entity_id === result.entity_id);
        const hardDeleted = result.hard_deleted || !!meta?.hard_deleted;
        await tx.objectStore("workspace_sync_meta").put({ id, owner_id: owner, revision: result.revision, hard_deleted: hardDeleted });
        const store = tx.objectStore(result.entity_type);
        const local = await store.get(result.entity_id);
        if (local && (local.workspace_owner_id ?? null) !== owner) throw new Error("Workspace ownership mismatch");
        if (hardDeleted) {
          await store.delete(result.entity_id);
          if (result.entity_type === "attachments") await tx.objectStore("binaries").delete(result.entity_id);
        } else if (result.row && (!related.length || result.deleted_at != null)) {
          const { owner_id: _owner, ...row } = result.row;
          await store.put({ ...row, workspace_owner_id: owner });
        }
      }
      await tx.done;
    } catch (error) {
      try { tx.abort(); } catch {}
      await tx.done.catch(() => undefined);
      throw error;
    }
  }

  async mergeBinary(owner: string, id: string, blob: Blob): Promise<void> {
    const tx = this.db.transaction(["attachments", "binaries", "workspace_sync_meta"], "readwrite");
    const attachment = await tx.objectStore("attachments").get(id);
    const meta = await tx.objectStore("workspace_sync_meta").get(key(owner, "attachments", id));
    if (attachment?.workspace_owner_id === owner && attachment.deleted_at == null && !meta?.hard_deleted && !await tx.objectStore("binaries").get(id)) {
      await tx.objectStore("binaries").put({ id, blob: blob.slice(0, blob.size, attachment.mime_type || "application/octet-stream"), updated_at: Date.now() });
    }
    await tx.done;
  }
}
