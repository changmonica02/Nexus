import type { Attachment, Page, WorldMapRecord } from "../../lib/types";
import type { StorageAdapter } from "../../infrastructure/storage/StorageAdapter";

/** Fixed source for the integration. This module does not execute imported SVG. */
export const AZGAAR_SOURCE = {
  repository: "https://github.com/Azgaar/Fantasy-Map-Generator",
  version: "1.154.2",
  commit: "b4a0dcb933586a57242508f558f775da16c35c64",
} as const;

export class WorldMapError extends Error {
  constructor(public readonly code: "owner" | "world" | "map" | "conflict" | "project" | "unavailable", message: string) {
    super(message);
    this.name = "WorldMapError";
  }
}

/** Structural validation only; NOT an SVG/HTML sanitizer or permission to render. */
export async function inspectMapProject(blob: Blob): Promise<{ sha256: string; size: number }> {
  if (!blob.size) throw new WorldMapError("project", "Empty map project");
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let text: string;
  try {
    const source = bytes[0] === 0x1f && bytes[1] === 0x8b
      ? await new Response(blob.stream().pipeThrough(new DecompressionStream("gzip"))).text()
      : new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    text = source.substring(0, 10).includes("|") ? source : decodeURIComponent(atob(source.trim()));
    // Azgaar uses CRLF between fields, but permits CRLF inside the SVG field.
    text = text.replace(/<svg\b[\s\S]*?<\/svg>/i, svg => svg.replace(/\r\n/g, "\n"));
    const fields = text.split("\r\n");
    const version = fields[0]?.split("|")[0];
    if (version !== AZGAAR_SOURCE.version || fields.length < 12
      || !/<svg\b[^>]*\bid=["']map["']/i.test(fields[5] ?? "")
      || !fields[5].includes("</svg>")) throw new Error("Unsupported map format or version");
    const settings: unknown = JSON.parse(fields[1]);
    const grid: unknown = JSON.parse(fields[6]);
    if (!settings || typeof settings !== "object" || Array.isArray(settings)
      || !grid || typeof grid !== "object" || Array.isArray(grid)) throw new Error("Invalid map settings or grid");
  } catch {
    throw new WorldMapError("project", "Invalid or unsupported map project; the original file was not changed");
  }
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return { sha256: Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join(""), size: blob.size };
}

function requireOwner(storage: StorageAdapter, expected?: string): string {
  const owner = storage.getWorkspaceOwner?.();
  if (!owner || (expected !== undefined && owner !== expected)) throw new WorldMapError("owner", "Workspace account changed or is signed out");
  return owner;
}

function requireWorld(page: Page | null, owner: string): Page {
  if (!page || page.workspace_owner_id !== owner) throw new WorldMapError("owner", "World does not belong to this account");
  if (page.kind !== "creative" || page.creative_type !== "world" || page.deleted_at != null
    || !page.character_data || page.character_data.isTemplate) throw new WorldMapError("world", "An active world is required");
  return page;
}

function mapsOf(world: Page): WorldMapRecord[] {
  const maps = world.character_data!.world_maps ?? [];
  if (!Array.isArray(maps)) throw new WorldMapError("map", "Invalid map collection; nothing was changed");
  const ids = new Set<string>();
  for (const map of maps) {
    if (!map || (map.metadata_version !== undefined && map.metadata_version !== 1) || !map.id || ids.has(map.id) || map.world_id !== world.id || !Number.isSafeInteger(map.revision) || map.revision < 1
      || map.engine !== "azgaar" || map.engine_version !== AZGAAR_SOURCE.version
      || ((map.attachment_id === null) !== (map.project_sha256 === null))
      || (map.attachment_id !== null && (typeof map.attachment_id !== "string" || !/^[a-f0-9]{64}$/.test(map.project_sha256 ?? "")))) {
      throw new WorldMapError("map", "Invalid map ownership or revision; nothing was changed");
    }
    ids.add(map.id);
  }
  return maps;
}

function mapOf(world: Page, id: string, revision?: number, includeDeleted = false): WorldMapRecord {
  const map = mapsOf(world).find(item => item.id === id);
  if (!map || (!includeDeleted && map.deleted_at != null)) throw new WorldMapError("map", "Map is unavailable");
  if (revision !== undefined && map.revision !== revision) throw new WorldMapError("conflict", "Map changed; keep your project and reload before retrying");
  return map;
}

function titleOf(title: string): string {
  const value = title.trim();
  if (!value) throw new WorldMapError("map", "A map title is required");
  return value;
}

/** One repository per editing session. Callers must flush pending world edits before mutations,
 * then adopt the returned world, never overwrite it with an older React snapshot.
 * Every project is immutable: metadata, new binary and the world reference commit together.
 * No background timer, automatic upload loop, or direct Supabase access lives here.
 */
export class WorldMapRepository {
  private readonly owner: string;
  constructor(private readonly storage: StorageAdapter) {
    this.owner = requireOwner(storage);
  }

  private async world(id: string): Promise<Page> {
    requireOwner(this.storage, this.owner);
    const page = await this.storage.getPage(id);
    requireOwner(this.storage, this.owner);
    return requireWorld(page, this.owner);
  }

  async list(worldId: string, includeDeleted = false): Promise<WorldMapRecord[]> {
    return structuredClone(mapsOf(await this.world(worldId)).filter(map => includeDeleted || map.deleted_at == null));
  }

  private async commit(world: Page, maps: WorldMapRecord[], project?: { attachment: Attachment; blob: Blob }): Promise<Page> {
    const device = await this.storage.getDeviceId();
    // Encode before opening the IDB transaction; async blob reads would close it.
    let data: string | undefined;
    if (project) {
      const bytes = new Uint8Array(await project.blob.arrayBuffer());
      const chunks: string[] = [];
      for (let i = 0; i < bytes.length; i += 0x8000) chunks.push(String.fromCharCode(...bytes.subarray(i, i + 0x8000)));
      data = btoa(chunks.join(""));
    }
    requireOwner(this.storage, this.owner);
    const next: Page = {
      ...world, character_data: { ...world.character_data!, world_maps: maps },
      attachment_ids: [...new Set([...(world.attachment_ids ?? []), ...(project ? [project.attachment.id] : [])])],
      updated_at: Date.now(), revision: world.revision + 1, device_id: device,
    };
    // Existing attachment/binary intents and the page share the existing atomic outbox batch.
    await this.storage.getWorkspacePersistence().mutate(this.owner, [
      ...(project ? [
        { type: "attachments" as const, kind: "save" as const, value: project.attachment },
        { type: "attachments" as const, kind: "binary" as const, value: project.attachment, data, blob: project.blob },
      ] : []),
      { type: "pages", kind: "save", value: next },
    ], [{ type: "pages", id: world.id, revision: world.revision }]);
    requireOwner(this.storage, this.owner);
    return next;
  }

  private async project(blob: Blob): Promise<{ attachment: Attachment; blob: Blob; sha256: string }> {
    const info = await inspectMapProject(blob);
    const now = Date.now(), id = `att_${crypto.randomUUID()}`;
    const attachment: Attachment = {
      id, kind: "file", name: `${id}.map`, mime_type: "application/octet-stream", size_bytes: info.size,
      storage_key: `bin_${crypto.randomUUID()}`, created_at: now, updated_at: now, deleted_at: null,
      device_id: await this.storage.getDeviceId(), workspace_owner_id: this.owner,
    };
    requireOwner(this.storage, this.owner);
    return { attachment, blob, sha256: info.sha256 };
  }

  async create(worldId: string, title: string, blob?: Blob): Promise<{ world: Page; map: WorldMapRecord }> {
    const name = titleOf(title);
    const world = await this.world(worldId);
    const project = blob ? await this.project(blob) : undefined;
    const now = Date.now();
    const map: WorldMapRecord = {
      metadata_version: 1, id: `map_${crypto.randomUUID()}`, world_id: world.id, title: name, engine: "azgaar", engine_version: AZGAAR_SOURCE.version,
      attachment_id: project?.attachment.id ?? null, project_sha256: project?.sha256 ?? null,
      revision: 1, created_at: now, updated_at: now, deleted_at: null,
    };
    return { world: await this.commit(world, [...mapsOf(world), map], project), map };
  }

  async read(worldId: string, id: string): Promise<{ map: WorldMapRecord; blob: Blob | null }> {
    const world = await this.world(worldId), map = mapOf(world, id);
    if (!map.attachment_id) return { map: structuredClone(map), blob: null };
    if (!world.attachment_ids?.includes(map.attachment_id)) throw new WorldMapError("map", "World is missing its project reference");
    const attachment = await this.storage.getAttachment(map.attachment_id);
    if (!attachment || attachment.workspace_owner_id !== this.owner || attachment.deleted_at != null) {
      throw new WorldMapError("unavailable", "Project attachment is unavailable; retry synchronization without replacing the map");
    }
    const blob = await this.storage.readBinary(map.attachment_id);
    requireOwner(this.storage, this.owner);
    if (!blob) throw new WorldMapError("unavailable", "Project is not on this device yet; retry synchronization");
    const info = await inspectMapProject(blob);
    if (info.sha256 !== map.project_sha256 || info.size !== attachment.size_bytes) throw new WorldMapError("project", "Project integrity check failed");
    // Do not hand an editor stale content after deletion/account switch during an async read.
    const latest = mapOf(await this.world(worldId), id, map.revision);
    return { map: structuredClone(latest), blob };
  }

  async save(worldId: string, id: string, expectedRevision: number, blob: Blob): Promise<{ world: Page; map: WorldMapRecord; changed: boolean }> {
    const world = await this.world(worldId), current = mapOf(world, id, expectedRevision);
    const project = await this.project(blob);
    if (project.sha256 === current.project_sha256) {
      mapOf(await this.world(worldId), id, expectedRevision);
      return { world, map: structuredClone(current), changed: false };
    }
    const map = { ...current, attachment_id: project.attachment.id, project_sha256: project.sha256,
      revision: current.revision + 1, updated_at: Date.now() };
    return { world: await this.commit(world, mapsOf(world).map(item => item.id === id ? map : item), project), map, changed: true };
  }

  async stageDraft(worldId: string, id: string, revision: number, blob: Blob): Promise<string> {
    mapOf(await this.world(worldId), id, revision);
    await inspectMapProject(blob);
    requireOwner(this.storage, this.owner);
    return this.storage.getWorkspacePersistence().writeMapDraft(this.owner, worldId, id, revision, blob);
  }

  async readDraft(worldId: string, id: string) {
    mapOf(await this.world(worldId), id);
    const draft = await this.storage.getWorkspacePersistence().readMapDraft(this.owner, worldId, id);
    requireOwner(this.storage, this.owner);
    return draft;
  }

  async clearDraft(worldId: string, id: string, token: string): Promise<void> {
    await this.world(worldId);
    await this.storage.getWorkspacePersistence().clearMapDraft(this.owner, worldId, id, token);
    requireOwner(this.storage, this.owner);
  }

  async rename(worldId: string, id: string, expectedRevision: number, title: string): Promise<Page> {
    const name = titleOf(title);
    return this.update(worldId, id, expectedRevision, map => ({ ...map, title: name }));
  }

  async setPresentation(worldId: string, id: string, expectedRevision: number, scope: string, parentId: string | null): Promise<Page> {
    if (!/^[a-z][a-z0-9_-]{0,63}$/.test(scope)) throw new WorldMapError("map", "Invalid map scope");
    const world = await this.world(worldId), current = mapOf(world, id, expectedRevision);
    let ancestor = parentId;
    const seen = new Set([id]);
    while (ancestor) {
      if (seen.has(ancestor)) throw new WorldMapError("map", "A map cannot contain a cyclic detail link");
      seen.add(ancestor);
      ancestor = mapOf(world, ancestor).parent_map_id ?? null;
    }
    const map = {...current, scope, parent_map_id: parentId, revision: current.revision + 1, updated_at: Date.now()};
    return this.commit(world, mapsOf(world).map(item => item.id === id ? map : item));
  }

  async remove(worldId: string, id: string, expectedRevision: number): Promise<Page> {
    return this.update(worldId, id, expectedRevision, map => ({ ...map, deleted_at: Date.now() }));
  }

  async restore(worldId: string, id: string, expectedRevision: number): Promise<Page> {
    return this.update(worldId, id, expectedRevision, map => ({ ...map, deleted_at: null }), true);
  }

  private async update(worldId: string, id: string, revision: number, change: (map: WorldMapRecord) => WorldMapRecord, includeDeleted = false): Promise<Page> {
    const world = await this.world(worldId), current = mapOf(world, id, revision, includeDeleted);
    const map = { ...change(current), revision: current.revision + 1, updated_at: Date.now() };
    return this.commit(world, mapsOf(world).map(item => item.id === id ? map : item));
  }

  async duplicate(worldId: string, id: string, expectedRevision: number, title: string): Promise<{ world: Page; map: WorldMapRecord }> {
    const { map, blob } = await this.read(worldId, id);
    if (map.revision !== expectedRevision) throw new WorldMapError("conflict", "Map changed before duplication");
    // Source guard and creation share the same world revision, including async encoding.
    const world = await this.world(worldId);
    mapOf(world, id, expectedRevision);
    const project = blob ? await this.project(blob) : undefined;
    const now = Date.now();
    const copy: WorldMapRecord = { ...map, id: `map_${crypto.randomUUID()}`, title: titleOf(title),
      attachment_id: project?.attachment.id ?? null, project_sha256: project?.sha256 ?? null,
      created_at: now, updated_at: now, deleted_at: null, revision: 1 };
    return { world: await this.commit(world, [...mapsOf(world), copy], project), map: copy };
  }
}

