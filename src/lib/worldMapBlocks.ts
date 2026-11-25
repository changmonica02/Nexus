import type {CharacterProfileData, CharacterSection, WorldMapBlockView} from './types';
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
