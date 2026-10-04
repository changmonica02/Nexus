import type { SupabaseClient } from "@supabase/supabase-js";
import { type EntityType, type WorkspaceResult, WorkspacePersistence } from "./workspacePersistence";

/** Keyset pagination remains complete even when the API caps responses below our limit. */
export async function readWorkspaceRows(client: SupabaseClient, table: string, owner: string): Promise<Record<string, unknown>[]> {
  const rows: Record<string, unknown>[] = [];
  let cursor: string | undefined;
  for (;;) {
    let query = client.from(table).select("*").eq("owner_id", owner).order("id", { ascending: true }).limit(200);
    if (cursor !== undefined) query = query.gt("id", cursor);
    const { data, error } = await query;
    if (error) throw new Error(`${table}: ${error.message}`);
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
  const pullTombstones = async () => {
    const tombstones = await readWorkspaceRows(client, "workspace_tombstones", owner);
    if (alive()) await local.merge(owner, tombstones.map(row => ({
      entity_type: row.entity_type as EntityType, entity_id: String(row.entity_id),
      revision: Number(row.revision), deleted_at: Number(row.deleted_at), hard_deleted: true,
    })));
  };
  await pullTombstones();
  for (const type of ["pages", "attachments"] as const) {
    const rows = await readWorkspaceRows(client, type, owner);
    if (!alive()) return;
    await local.merge(owner, rows.map(row => remoteResult(type, row)));
  }
  // A delete concurrent with the data pull still wins before any local intents upload.
  await pullTombstones();
  for (const row of await readWorkspaceRows(client, "binaries", owner)) {
    if (!alive()) return;
    if (typeof row.data !== "string") continue;
    const bytes = Uint8Array.from(atob(row.data), char => char.charCodeAt(0));
    await local.mergeBinary(owner, String(row.id), new Blob([bytes]));
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
