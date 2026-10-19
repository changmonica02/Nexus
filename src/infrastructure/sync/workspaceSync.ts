import type { SupabaseClient } from "@supabase/supabase-js";
import { type EntityType, type WorkspaceResult, WorkspacePersistence } from "./workspacePersistence";

/** Keyset pagination remains complete even when the API caps responses below our limit. */
export async function readWorkspaceRows(client: SupabaseClient, table: string, owner: string, columns = "*", alive = () => true): Promise<Record<string, unknown>[]> {
  const rows: Record<string, unknown>[] = [];
  let cursor: string | undefined;
  for (;;) {
    if (!alive()) return rows;
    let query = client.from(table).select(columns).eq("owner_id", owner).order("id", { ascending: true }).limit(200);
    if (cursor !== undefined) query = query.gt("id", cursor);
    const { data: result, error } = await query;
    if (error) throw new Error(`${table}: ${error.message}`);
    const data = result as unknown as Record<string, unknown>[] | null;
    if (!data?.length) return rows;
    const next = String(data[data.length - 1].id);
    // PostgreSQL collation can differ from JavaScript's UTF-16 ordering.
    if (next === cursor) throw new Error(`${table}: invalid pagination cursor`);
    rows.push(...data);
    cursor = next;
  }
}

export function remoteResult(type: EntityType, row: Record<string, unknown>): WorkspaceResult {
  if (!Number.isSafeInteger(Number(row.revision)) || Number(row.revision) < 1) throw new Error(`${type}: missing server revision`);
  return { entity_type: type, entity_id: String(row.id), revision: Number(row.revision),
    deleted_at: row.deleted_at == null ? null : Number(row.deleted_at), hard_deleted: false, row };
}

export async function pullWorkspace(client: SupabaseClient, local: WorkspacePersistence, owner: string, alive = () => true): Promise<void> {
  const attachments = new Map<string, Record<string, unknown>>();
  const pullTombstones = async () => {
    const tombstones = await readWorkspaceRows(client, "workspace_tombstones", owner, "*", alive);
    if (alive()) await local.merge(owner, tombstones.map(row => ({
      entity_type: row.entity_type as EntityType, entity_id: String(row.entity_id),
      revision: Number(row.revision), deleted_at: Number(row.deleted_at), hard_deleted: true,
    })));
  };
  await pullTombstones();
  for (const type of ["pages", "attachments"] as const) {
    const rows = await readWorkspaceRows(client, type, owner, "*", alive);
    if (!alive()) return;
    await local.merge(owner, rows.map(row => remoteResult(type, row)));
    if (type === "attachments") for (const row of rows) attachments.set(String(row.id), row);
  }
  // A delete concurrent with the data pull still wins before any local intents upload.
  await pullTombstones();
  // Listing never includes Base64. Attachment revision is advanced atomically by
  // apply_workspace_operations whenever binary content changes.
  for (const row of await readWorkspaceRows(client, "binaries", owner, "id,owner_id", alive)) {
    if (!alive()) return;
    const id = String(row.id), attachment = attachments.get(id);
    if (!attachment || attachment.deleted_at != null) continue;
    const revision = Number(attachment.revision);
    const token = await local.claimBinary(owner, id, revision);
    if (!token) continue;
    const abort = new AbortController();
    const timeout = setTimeout(() => abort.abort(), 45000);
    try {
      if (!alive()) return;
      const { data, error } = await client.from("binaries").select("id,owner_id,data")
        .eq("owner_id", owner).eq("id", id).abortSignal(abort.signal).maybeSingle();
      if (error) throw new Error(`附件下載未完成：${error.message}`);
      if (!alive() || !data) continue;
      if (data.id !== id || data.owner_id !== owner || typeof data.data !== "string") throw new Error("Invalid binary response");
      // Do not label content with a revision read before a concurrent update/delete.
      const verified = await client.from("attachments").select("id,revision,deleted_at")
        .eq("owner_id", owner).eq("id", id).eq("revision", revision).abortSignal(abort.signal).maybeSingle();
      if (verified.error) throw new Error(verified.error.message);
      if (!alive() || !verified.data || verified.data.deleted_at != null) continue;
      const bytes = Uint8Array.from(atob(data.data), char => char.charCodeAt(0));
      await local.commitBinary(owner, id, revision, token, new Blob([bytes]), alive);
    } finally {
      clearTimeout(timeout);
      await local.releaseBinary(owner, id, token);
    }
  }
}

export async function flushWorkspace(client: SupabaseClient, local: WorkspacePersistence, owner: string, alive = () => true): Promise<void> {
  const blocked = new Set<string>();
  const errors: string[] = [];
  for (const batch of await local.pending(owner)) {
    if (!alive()) return;
    const keys = batch.operations.map(op => `${op.entity_type}:${op.entity_id}`);
    if (keys.some(key => blocked.has(key))) { keys.forEach(key => blocked.add(key)); continue; }
    try {
      const { data, error } = await client.rpc("apply_workspace_operations", { operations: batch.operations });
      if (error) throw new Error(error.message);
      if (!Array.isArray(data) || data.length !== batch.operations.length) throw new Error("Invalid workspace operation response");
      if (data.some((result, index) => result.entity_type !== batch.operations[index].entity_type || result.entity_id !== batch.operations[index].entity_id
        || !Number.isSafeInteger(result.revision) || result.revision < 1 || typeof result.hard_deleted !== "boolean")) throw new Error("Invalid workspace operation receipt");
      if (!alive()) return; // Receipt makes retry safe if the account changes after server commit.
      await local.merge(owner, data as WorkspaceResult[], batch.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await local.fail(batch, message);
      keys.forEach(key => blocked.add(key));
      errors.push(message);
    }
  }
  if (errors.length) throw new Error(`工作區同步尚未完成（操作已保留）：${errors[0]}`);
}
