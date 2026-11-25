import {createBlankTemplate} from '../../lib/characterTemplates';
import {GLOBAL_MAP_ENGINE,GLOBAL_MAP_VERSION,readGlobalMapProject} from "./globalMapProject";
import type { Attachment, Page, WorldMapRecord, WorldEntity, WorldMapPlacement, CharacterProfileData, WorldRegionGeometry, WorldMapBlockView } from "../../lib/types";
import {withWorldMapBlocks} from "../../lib/worldMapBlocks";
import {validateCharacterBlocks} from "../../lib/characterBlocks";
import type { StorageAdapter } from "../../infrastructure/storage/StorageAdapter";

/** Fixed source for the integration. This module does not execute imported SVG. */
export const AZGAAR_SOURCE = {
  repository: "https://github.com/Azgaar/Fantasy-Map-Generator",
  version: "1.154.2",
  commit: "b4a0dcb933586a57242508f558f775da16c35c64",
} as const;

export class WorldMapError extends Error {
  constructor(public readonly code: "owner" | "world" | "map" | "conflict" | "project" | "unavailable" | "entity", message: string) {
    super(message);
    this.name = "WorldMapError";
  }
}

/** Structural validation only; NOT an SVG/HTML sanitizer or permission to render. */
export async function inspectMapProject(blob: Blob): Promise<{ sha256: string; size: number; engine: WorldMapRecord["engine"]; engineVersion:string }> {
  if (!blob.size) throw new WorldMapError("project", "Empty map project");
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let text: string;
  let engine:WorldMapRecord["engine"]="azgaar",engineVersion:string=AZGAAR_SOURCE.version;
  try {
    const source = bytes[0] === 0x1f && bytes[1] === 0x8b
      ? await new Response(blob.stream().pipeThrough(new DecompressionStream("gzip"))).text()
      : new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    if(source.trimStart().startsWith('{')) {
      // Validate the actual stored bytes with the same reader used by the editor.
      // In particular, native gzip support must not accept unreadable global files.
      await readGlobalMapProject(blob);engine=GLOBAL_MAP_ENGINE;engineVersion=GLOBAL_MAP_VERSION;
    } else {
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
    }
  } catch {
    throw new WorldMapError("project", "Invalid or unsupported map project; the original file was not changed");
  }
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return { sha256: Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join(""), size: blob.size, engine, engineVersion };
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

const entityTypes = new Set(["country", "administrative_area", "settlement", "culture", "religion", "geographic_region", "site"]);
function entityError(message: string): never { throw new WorldMapError("entity", message); }
function validId(id: unknown): id is string { return typeof id === "string" && /^[a-zA-Z0-9_-]{1,160}$/.test(id); }
function validRevision(value: number): boolean { return Number.isSafeInteger(value) && value >= 1; }
function validTime(value: number): boolean { return Number.isSafeInteger(value) && value >= 0; }
function validPoint(point: WorldMapPlacement["geometry"]): boolean {
  return !!point && point.type === "point" && Number.isFinite(point.x) && Number.isFinite(point.y) && point.x >= 0 && point.y >= 0;
}

function validRegion(geometry: WorldMapPlacement["geometry"]): geometry is WorldRegionGeometry {
  return !!geometry && geometry.type === "cells" && /^[a-f0-9]{64}$/.test(geometry.meshId)
    && Number.isSafeInteger(geometry.cellCount) && geometry.cellCount > 0 && geometry.cellCount <= 1000000
    && Array.isArray(geometry.cells) && geometry.cells.length <= geometry.cellCount
    && geometry.cells.every((cell, index) => Number.isSafeInteger(cell) && cell >= 0 && cell < geometry.cellCount && (!index || cell > geometry.cells[index - 1]));
}
export function entityParent(entity: WorldEntity): string | undefined { return entity.relations.find(relation => relation.type === "parent")?.entityId; }

/** Used before metadata mutations and before any backup restore writes. Missing legacy fields are valid.
 * No names are used as foreign keys; even tombstones must retain valid references. */
export function validateWorldEntities(world: Pick<Page, "id" | "character_data">): void {
  const data = world.character_data;
  if(data?.worldMapBlocksVersion===1)validateCharacterBlocks(data);
  if (!data) return;
  const entities = data.world_entities ?? [];
  if (!Array.isArray(entities)) entityError("Invalid world entity collection");
  const ids = new Set<string>();
  for (const entity of entities) {
    if (!entity || entity.schemaVersion !== 1 || !validId(entity.entityId) || ids.has(entity.entityId)
      || entity.worldId !== world.id || !entityTypes.has(entity.type) || typeof entity.name !== "string" || !entity.name.trim()
      || !Array.isArray(entity.aliases) || entity.aliases.some(alias => typeof alias !== "string")
      || !Array.isArray(entity.relations) || !validRevision(entity.revision) || !validTime(entity.createdAt) || !validTime(entity.updatedAt)
      || (entity.summary !== undefined && typeof entity.summary !== "string")
      || (entity.cultureSettings !== undefined && (entity.type !== "culture" || !entity.cultureSettings || typeof entity.cultureSettings !== "object" || Array.isArray(entity.cultureSettings) || Object.entries(entity.cultureSettings).some(([key,value])=>!["language","customs"].includes(key)||typeof value!=="string")))
      || (entity.subtype !== undefined && typeof entity.subtype !== "string")
      || (entity.content !== undefined && (!entity.content || typeof entity.content !== "object" || Array.isArray(entity.content)))) entityError("Invalid world entity identity or content");
    if(entity.fields!==undefined&&(!Array.isArray(entity.fields)||entity.fields.some(f=>!f||typeof f.id!=='string'||!f.id||typeof f.name!=='string'||!f.name.trim()||!['text','number','relation'].includes(f.type)||(f.value!==null&&(f.type==='number'?typeof f.value!=='number'||!Number.isFinite(f.value):typeof f.value!=='string')))||new Set(entity.fields.map(f=>f.id)).size!==entity.fields.length))entityError("Invalid world entity identity or content");
    ids.add(entity.entityId);
  }
  for (const entity of entities) for (const relation of entity.relations) {
    if (!relation || typeof relation.type !== "string" || !relation.type.trim() || !ids.has(relation.entityId)) entityError("Invalid world entity relation");
  }
  for(const entity of entities)for(const f of entity.fields??[])if(f.type==='relation'&&f.value&&!ids.has(String(f.value)))entityError('Invalid world entity relation');
  const byId = new Map(entities.map(entity => [entity.entityId, entity]));
  const reserved = new Set(["parent", "capital", "center", "culture", "religion"]);
  for (const entity of entities) {
    const seen = new Set<string>();
    for (const relation of entity.relations) {
      if (relation.type.startsWith("distribution:")) {
        const allowed:Record<string,string[]>={country:["country"],region:["geographic_region"],culture:["culture"],site:["site"],branch:["religion"],group:["culture"]};
        const kind=relation.type.slice(13),target=byId.get(relation.entityId)!;
        if (!["culture","religion"].includes(entity.type)||!allowed[kind]?.includes(target.type)||target.entityId===entity.entityId||seen.has(relation.type+":"+relation.entityId)) entityError("Incompatible distribution relation");
        seen.add(relation.type+":"+relation.entityId);continue;
      }
      if (!reserved.has(relation.type)) continue;
      if (seen.has(relation.type)) entityError("Duplicate structured relation");
      seen.add(relation.type);
      const target = byId.get(relation.entityId)!;
      const compatible = relation.type === "parent" ? ["settlement", "administrative_area"].includes(entity.type) && ["country", "administrative_area"].includes(target.type)
        : relation.type === "capital" ? entity.type === "country" && target.type === "settlement"
        : relation.type === "center" ? entity.type === "administrative_area" && target.type === "settlement"
        : entity.type === "country" && target.type === relation.type;
      if (!compatible) entityError("Incompatible structured relation");
    }
    const ancestors = new Set([entity.entityId]);
    let parent = entityParent(entity);
    while (parent) {
      if (ancestors.has(parent)) entityError("Cyclic administrative relationship");
      ancestors.add(parent);parent = entityParent(byId.get(parent)!);
    }
  }
  const placements = new Set<string>();
  if (data.world_maps !== undefined && !Array.isArray(data.world_maps)) entityError("Invalid map collection");
  for (const map of data.world_maps ?? []) {
    if (map.world_id !== world.id) throw new WorldMapError("map", "Invalid map ownership");
    if (map.placements !== undefined && !Array.isArray(map.placements)) entityError("Invalid placement collection");
    for (const placement of map.placements ?? []) {
      if (!placement || placement.schemaVersion !== 1 || !validId(placement.placementId) || placements.has(placement.placementId)
        || placement.mapId !== map.id || !ids.has(placement.entityId) || (!validPoint(placement.geometry) && !validRegion(placement.geometry))
        || typeof placement.visible !== "boolean" || !validRevision(placement.revision)
        || !validTime(placement.createdAt) || !validTime(placement.updatedAt)
        || (placement.deletedAt !== null && !validTime(placement.deletedAt))
        || (placement.label !== undefined && (!placement.label || typeof placement.label.visible !== "boolean"))
        || (placement.icon !== undefined && typeof placement.icon !== "string")) entityError("Invalid map entity reference or geometry");
      if (placement.geometry.type === "cells" && !["country", "administrative_area", "culture", "religion"].includes(byId.get(placement.entityId)!.type)) entityError("Region requires a supported entity");
      if (placement.distribution !== undefined) {
        const d=placement.distribution;
        if (!["culture","religion"].includes(byId.get(placement.entityId)!.type)||placement.geometry.type!=="cells"||!d||typeof d!=="object"||Array.isArray(d)
          || (d.color!==undefined&&!/^#[a-f0-9]{6}$/i.test(d.color)) || (d.opacity!==undefined&&(!Number.isFinite(d.opacity)||d.opacity<0||d.opacity>1))
          || (d.category!==undefined&&!["primary","secondary"].includes(d.category)) || (d.influence!==undefined&&(!Number.isFinite(d.influence)||d.influence<0||d.influence>1))) entityError("Invalid distribution settings");
      }
      placements.add(placement.placementId);
    }
    const claimed = new Set<string>(), configured = new Set<string>();
    for (const placement of map.placements ?? []) {
      if (placement.deletedAt !== null || placement.geometry.type !== "cells") continue;
      if (configured.has(placement.entityId)) entityError("Entity already has a region on this map");
      configured.add(placement.entityId);
      if (byId.get(placement.entityId)!.type !== "country") continue;
      for (const cell of placement.geometry.cells) {
        const key = placement.geometry.meshId + ":" + cell;
        if (claimed.has(key)) entityError("Country territories overlap");
        claimed.add(key);
      }
    }
  }
}

/** Independent world copies receive independent entity IDs; map copies within one world do not. */
export function cloneWorldReferences(data: CharacterProfileData, worldId: string): CharacterProfileData {
  const copy = structuredClone(data);
  const maps = new Map((copy.world_maps ?? []).map(map => [map.id, `map_${crypto.randomUUID()}`]));
  const entities = new Map((copy.world_entities ?? []).map(entity => [entity.entityId, `entity_${crypto.randomUUID()}`]));
  copy.world_entities = copy.world_entities?.map(entity => ({ ...entity, entityId: entities.get(entity.entityId)!, worldId,
    revision: 1, relations: entity.relations.map(relation => ({ ...relation, entityId: entities.get(relation.entityId)! })) }));
  copy.world_maps = copy.world_maps?.map(map => ({ ...map, id: maps.get(map.id)!, world_id: worldId,
    parent_map_id: map.parent_map_id ? maps.get(map.parent_map_id) ?? null : map.parent_map_id, revision: 1,
    placements: map.placements?.map(placement => ({ ...placement, placementId: `placement_${crypto.randomUUID()}`,
      mapId: maps.get(map.id)!, entityId: entities.get(placement.entityId)!, revision: 1 })) }));
  validateWorldEntities({ id: worldId, character_data: copy });
  return copy;
}

function mapsOf(world: Page): WorldMapRecord[] {
  validateWorldEntities(world);
  const maps = world.character_data!.world_maps ?? [];
  if (!Array.isArray(maps)) throw new WorldMapError("map", "Invalid map collection; nothing was changed");
  const ids = new Set<string>();
  for (const map of maps) {
    if (!map || (map.metadata_version !== undefined && map.metadata_version !== 1) || !map.id || ids.has(map.id) || map.world_id !== world.id || !Number.isSafeInteger(map.revision) || map.revision < 1
      || !((map.engine === "azgaar" && map.engine_version === AZGAAR_SOURCE.version)||(map.engine === GLOBAL_MAP_ENGINE && map.engine_version === GLOBAL_MAP_VERSION))
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
    const world = requireWorld(page, this.owner);
    validateWorldEntities(world);
    return world;
  }

  async list(worldId: string, includeDeleted = false): Promise<WorldMapRecord[]> {
    return structuredClone(mapsOf(await this.world(worldId)).filter(map => includeDeleted || map.deleted_at == null));
  }

  private async commit(world: Page, maps: WorldMapRecord[], project?: { attachment: Attachment; blob: Blob }, newWorld=false): Promise<Page> {
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
    validateWorldEntities(next);
    // Existing attachment/binary intents and the page share the existing atomic outbox batch.
    await this.storage.getWorkspacePersistence().mutate(this.owner, [
      ...(project ? [
        { type: "attachments" as const, kind: "save" as const, value: project.attachment },
        { type: "attachments" as const, kind: "binary" as const, value: project.attachment, data, blob: project.blob },
      ] : []),
      { type: "pages", kind: "save", value: next },
    ], newWorld?[]:[{ type: "pages", id: world.id, revision: world.revision }]);
    requireOwner(this.storage, this.owner);
    return next;
  }

  private async project(blob: Blob): Promise<{ attachment: Attachment; blob: Blob; sha256: string; engine:WorldMapRecord["engine"]; engineVersion:string }> {
    const info = await inspectMapProject(blob);
    const now = Date.now(), id = `att_${crypto.randomUUID()}`;
    const attachment: Attachment = {
      id, kind: "file", name: `${id}.${info.engine===GLOBAL_MAP_ENGINE?"nexus-map.json":"map"}`, mime_type: info.engine===GLOBAL_MAP_ENGINE?"application/json":"application/octet-stream", size_bytes: info.size,
      storage_key: `bin_${crypto.randomUUID()}`, created_at: now, updated_at: now, deleted_at: null,
      device_id: await this.storage.getDeviceId(), workspace_owner_id: this.owner,
    };
    requireOwner(this.storage, this.owner);
    return { attachment, blob, sha256: info.sha256, engine:info.engine,engineVersion:info.engineVersion };
  }

  /** Confirmed creation only: world, map, attachment and bytes share one transaction. */
  async createWorldWithMap(title:string,blob:Blob):Promise<{world:Page;map:WorldMapRecord}>{
    const name=titleOf(title),project=await this.project(blob),now=Date.now(),id=`world_${crypto.randomUUID()}`;
    const character_data=createBlankTemplate();character_data.basic.name=name;character_data.basic.role='世界觀設定';
    const world:Page={id,title:name,kind:'creative',creative_type:'world',character_data,content_json:{type:'doc',content:[]},content_text:'',format:'flow',attachment_ids:[],created_at:now,updated_at:now,deleted_at:null,revision:0,device_id:await this.storage.getDeviceId(),workspace_owner_id:this.owner};
    const map:WorldMapRecord={metadata_version:1,id:`map_${crypto.randomUUID()}`,world_id:id,title:name,engine:project.engine,engine_version:project.engineVersion,scope:'surface',parent_map_id:null,attachment_id:project.attachment.id,project_sha256:project.sha256,revision:1,created_at:now,updated_at:now,deleted_at:null};
    return {world:await this.commit(world,[map],project,true),map};
  }

  async create(worldId: string, title: string, blob?: Blob, presentation?: {scope:string;parentId:string}): Promise<{ world: Page; map: WorldMapRecord }> {
    const name = titleOf(title);
    const world = await this.world(worldId);
    if (presentation) {
      if (!/^[a-z][a-z0-9_-]{0,63}$/.test(presentation.scope)) throw new WorldMapError("map", "Invalid map scope");
      mapOf(world, presentation.parentId);
    }
    const project = blob ? await this.project(blob) : undefined;
    if(project?.engine==='nexus-global'&&(presentation||mapsOf(world).some(m=>m.deleted_at==null&&!['underground','sky'].includes(m.scope??''))))throw new WorldMapError('map','A world can only have one surface map');
    const now = Date.now();
    const map: WorldMapRecord = {
      metadata_version: 1, id: `map_${crypto.randomUUID()}`, world_id: world.id, title: name, engine: project?.engine ?? "azgaar", engine_version: project?.engineVersion ?? AZGAAR_SOURCE.version,
      attachment_id: project?.attachment.id ?? null, project_sha256: project?.sha256 ?? null,
      ...(presentation ? {scope:presentation.scope,parent_map_id:presentation.parentId} : {}),
      revision: 1, created_at: now, updated_at: now, deleted_at: null,
    };
    return { world: await this.commit(world, [...mapsOf(world), map], project), map };
  }

  async createSpace(worldId:string,title:string,scope:'surface'|'underground'|'sky',blob?:Blob){
    const world=await this.world(worldId),active=mapsOf(world).filter(m=>m.deleted_at==null);
    if(scope==='surface'&&active.some(m=>m.scope==='surface'||!['underground','sky'].includes(m.scope??'')))throw new WorldMapError('map','A main surface map already exists');
    const project=blob?await this.project(blob):undefined,now=Date.now();
    const map:WorldMapRecord={metadata_version:1,id:`map_${crypto.randomUUID()}`,world_id:worldId,title:titleOf(title),engine:project?.engine??'azgaar',engine_version:project?.engineVersion??AZGAAR_SOURCE.version,scope,parent_map_id:null,attachment_id:project?.attachment.id??null,project_sha256:project?.sha256??null,revision:1,created_at:now,updated_at:now,deleted_at:null};
    return {world:await this.commit(world,[...mapsOf(world),map],project),map};
  }
  async saveMapBlockView(worldId:string,blockId:string,view:WorldMapBlockView){
    const world=await this.world(worldId),data=withWorldMapBlocks(world.character_data!,worldId);
    let found=false;
    const update=(sections:CharacterProfileData['sections'])=>sections.map(block=>{
      if(block.id!==blockId||!block.worldMapView)return block;
      found=true;return {...block,worldMapView:structuredClone(view)};
    });
    const next={...data,sections:update(data.sections),tabs:data.tabs?.map(tab=>({...tab,sections:update(tab.sections)}))};
    if(!found)throw new WorldMapError('conflict','Map block was removed; display settings were not written');
    validateCharacterBlocks(next);
    return this.commit({...world,character_data:next},mapsOf(world));
  }
  async saveWorldContent(worldId:string,revision:number,data:CharacterProfileData){
    const world=await this.world(worldId);if(world.revision!==revision)throw new WorldMapError('conflict','World content changed; reload before retrying');
    return this.commit({...world,character_data:{...world.character_data!,...data,world_maps:mapsOf(world),world_entities:world.character_data!.world_entities}},mapsOf(world));
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
    if (info.engine !== map.engine || info.engineVersion !== map.engine_version || info.sha256 !== map.project_sha256 || info.size !== attachment.size_bytes) throw new WorldMapError("project", "Project integrity check failed");
    // Do not hand an editor stale content after deletion/account switch during an async read.
    const latest = mapOf(await this.world(worldId), id, map.revision);
    return { map: structuredClone(latest), blob };
  }

  async save(worldId: string, id: string, expectedRevision: number, blob: Blob): Promise<{ world: Page; map: WorldMapRecord; changed: boolean }> {
    const world = await this.world(worldId), current = mapOf(world, id, expectedRevision);
    const project = await this.project(blob);
    if(project.engine!==current.engine||project.engineVersion!==current.engine_version)throw new WorldMapError("project","Map engine cannot change during save");
    if (project.sha256 === current.project_sha256) {
      mapOf(await this.world(worldId), id, expectedRevision);
      return { world, map: structuredClone(current), changed: false };
    }
    const map = { ...current, attachment_id: project.attachment.id, project_sha256: project.sha256,
      revision: current.revision + 1, updated_at: Date.now() };
    return { world: await this.commit(world, mapsOf(world).map(item => item.id === id ? map : item), project), map, changed: true };
  }

  async stageDraft(worldId: string, id: string, revision: number, blob: Blob): Promise<string> {
    const map=mapOf(await this.world(worldId), id, revision);
    const info=await inspectMapProject(blob);
    if(info.engine!==map.engine||info.engineVersion!==map.engine_version)throw new WorldMapError("project","Draft engine mismatch");
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
    if(current.engine==='nexus-global'&&(parentId||(scope==='surface'&&mapsOf(world).some(m=>m.id!==id&&m.deleted_at==null&&!['underground','sky'].includes(m.scope??'')))))throw new WorldMapError('map','Surface maps cannot be nested or duplicated');
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
    return this.update(worldId, id, expectedRevision, map => {if(map.scope==='surface')throw new WorldMapError('map','The main surface map cannot be removed');return { ...map, deleted_at: Date.now() };});
  }

  async restore(worldId: string, id: string, expectedRevision: number): Promise<Page> {
    const world=await this.world(worldId),current=mapOf(world,id,expectedRevision,true);
    if(current.scope==='surface'&&mapsOf(world).some(m=>m.id!==id&&m.deleted_at==null&&!['underground','sky'].includes(m.scope??'')))throw new WorldMapError('map','A main surface map already exists');
    return this.update(worldId, id, expectedRevision, map => ({ ...map, deleted_at: null }), true);
  }

  private async update(worldId: string, id: string, revision: number, change: (map: WorldMapRecord) => WorldMapRecord, includeDeleted = false): Promise<Page> {
    const world = await this.world(worldId), current = mapOf(world, id, revision, includeDeleted);
    const map = { ...change(current), revision: current.revision + 1, updated_at: Date.now() };
    return this.commit(world, mapsOf(world).map(item => item.id === id ? map : item));
  }

  async duplicate(worldId: string, id: string, expectedRevision: number, title: string): Promise<{ world: Page; map: WorldMapRecord }> {
    if(mapOf(await this.world(worldId),id,expectedRevision).scope==='surface')throw new WorldMapError('map','The main surface map cannot be duplicated');
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
    copy.placements = map.placements?.map(placement => ({ ...placement, placementId: `placement_${crypto.randomUUID()}`, mapId: copy.id, revision: 1 }));
    return { world: await this.commit(world, [...mapsOf(world), copy], project), map: copy };
  }
}
