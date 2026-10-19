import type { IDBPDatabase } from "idb";
import type { Attachment, Page } from "../../lib/types";
import {OFFICIAL_CLEANUP_STORES,purgeOfficialDeck} from '../../features/study/officialPackCleanup';

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
  official_deck_deleted?:boolean;
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

  async mutate(owner: string | null, changes: { type: EntityType; kind: OperationKind; value: WorkspaceRecord; data?: string; blob?: Blob }[], guards: {type: EntityType; id:string; revision:number}[] = []): Promise<void> {
    const tx = this.db.transaction(stores, "readwrite", { durability: "strict" });
    try {
      for (const guard of guards) {
        const record=await tx.objectStore(guard.type).get(guard.id) as WorkspaceRecord|undefined;
        if (!record || (record.workspace_owner_id??null)!==owner || record.deleted_at!=null || !("revision" in record) || record.revision!==guard.revision) throw new Error("資料版本已變更，請重新預覽。 / Revision conflict");
      }
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
          await tx.objectStore("binaries").put({ id: value.id, owner_id: owner, blob: change.blob, updated_at: Date.now() });
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
    const tx = this.db.transaction([...stores,...OFFICIAL_CLEANUP_STORES.filter(name=>this.db.objectStoreNames.contains(name))], "readwrite", { durability: "strict" });
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
        const nextMeta={...meta,id, owner_id: owner, revision: result.revision, hard_deleted: hardDeleted};
        await tx.objectStore("workspace_sync_meta").put(nextMeta);
        const store = tx.objectStore(result.entity_type);
        const local = await store.get(result.entity_id);
        if (local && (local.workspace_owner_id ?? null) !== owner) throw new Error("Workspace ownership mismatch");
        if (hardDeleted) {
          if(result.hard_deleted&&result.entity_type==='pages'&&await purgeOfficialDeck(tx,owner,result.entity_id,!!local?.official_pack_id))await tx.objectStore('workspace_sync_meta').put({...nextMeta,official_deck_deleted:true});
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

  /** Shared IndexedDB lease works across tabs, including browsers without Web Locks.
   * Expiration recovers crashed tabs; downloads have a shorter network deadline.
   * The token is checked again at commit, so a late old response cannot win. */
  async claimBinary(owner: string, id: string, revision: number): Promise<string | null> {
    if (!Number.isSafeInteger(revision) || revision < 1) throw new Error("Invalid attachment revision");
    const tx = this.db.transaction(["attachments", "binaries", ...WORKSPACE_STORES], "readwrite");
    const attachment = await tx.objectStore("attachments").get(id);
    const meta = await tx.objectStore("workspace_sync_meta").get(key(owner, "attachments", id));
    const binary = await tx.objectStore("binaries").get(id);
    const pending = (await tx.objectStore("workspace_outbox").getAll() as WorkspaceBatch[])
      .some(b => b.owner_id === owner && b.operations.some(op => op.entity_type === "attachments" && op.entity_id === id));
    const leaseKey = JSON.stringify(["binary-lease", owner, id]);
    const lease = await tx.objectStore("workspace_sync_meta").get(leaseKey);
    const cached = binary?.owner_id === owner && binary.server_revision === revision
      && binary.blob instanceof Blob && binary.blob.size === binary.verified_size;
    let token: string | null = null;
    if (attachment?.workspace_owner_id === owner && attachment.deleted_at == null && !meta?.hard_deleted
      && meta?.revision === revision && !pending && !cached && !(lease?.expires_at > Date.now())) {
      token = crypto.randomUUID();
      await tx.objectStore("workspace_sync_meta").put({ id: leaseKey, owner_id: owner, token, expires_at: Date.now() + 60000 });
    }
    await tx.done;
    return token;
  }

  async releaseBinary(owner: string, id: string, token: string): Promise<void> {
    const tx = this.db.transaction("workspace_sync_meta", "readwrite");
    const leaseKey = JSON.stringify(["binary-lease", owner, id]);
    if ((await tx.store.get(leaseKey))?.token === token) await tx.store.delete(leaseKey);
    await tx.done;
  }

  async commitBinary(owner: string, id: string, revision: number, token: string, blob: Blob, alive = () => true): Promise<void> {
    const tx = this.db.transaction(["attachments", "binaries", ...WORKSPACE_STORES], "readwrite");
    const attachment = await tx.objectStore("attachments").get(id);
    const meta = await tx.objectStore("workspace_sync_meta").get(key(owner, "attachments", id));
    const lease = await tx.objectStore("workspace_sync_meta").get(JSON.stringify(["binary-lease", owner, id]));
    const pending = (await tx.objectStore("workspace_outbox").getAll() as WorkspaceBatch[])
      .some(b => b.owner_id === owner && b.operations.some(op => op.entity_type === "attachments" && op.entity_id === id));
    if (alive() && attachment?.workspace_owner_id === owner && attachment.deleted_at == null && !meta?.hard_deleted
      && meta?.revision === revision && !pending && lease?.token === token && lease.expires_at > Date.now()) {
      await tx.objectStore("binaries").put({ id, owner_id: owner, server_revision: revision, verified_size: blob.size,
        blob: blob.slice(0, blob.size, attachment.mime_type || "application/octet-stream"), updated_at: Date.now() });
    }
    await tx.done;
  }
}
