import type {CharacterProfileData, CharacterSection, Page, WorldMapBlockView} from './types';
import {normalizeCharacterBlocks} from './characterBlocks';

export function newWorldMapBlock(id: string, view?: WorldMapBlockView): CharacterSection {
  return {id, type:'group', title:'地圖區塊', contents:[], worldMapView:structuredClone(view ?? {layer:'physical',overlays:['lakes','rivers','scaleBar'],detailsOpen:false})};
}
/** Lazy and deterministic: removing the last window must not resurrect the legacy preview. */
export function withWorldMapBlocks(data:CharacterProfileData,worldId:string):CharacterProfileData {
  const normalized=normalizeCharacterBlocks(data,worldId);
  // Canonical geography and entity bodies stay on the Page, not in a new legacy snapshot.
  if(data.blocks_version!==1&&normalized.legacyCharacterSnapshot){
    const snapshot=normalized.legacyCharacterSnapshot as Partial<CharacterProfileData>;
    delete snapshot.world_maps;
    delete snapshot.world_entities;
  }
  if(normalized.worldMapBlocksVersion===1)return normalized;
  return {...normalized,worldMapBlocksVersion:1,sections:[newWorldMapBlock(`legacy-map-window:${worldId}`),...normalized.sections]};
}
export function placedWorldEntities(world:Page,mapId:string) {
  const ids=new Set(world.character_data?.world_maps?.find(m=>m.id===mapId&&m.deleted_at===null)?.placements?.filter(p=>p.deletedAt===null).map(p=>p.entityId));
  return (world.character_data?.world_entities??[]).filter(e=>ids.has(e.entityId));
}

export function preferredWorldMap(world:Page,selected?:string|null){
  const maps=(world.character_data?.world_maps??[]).filter(m=>m.deleted_at===null);
  return maps.find(m=>m.id===selected)??maps.find(m=>m.scope==='surface')??maps.find(m=>!['underground','sky'].includes(m.scope??''))??maps[0];
}
