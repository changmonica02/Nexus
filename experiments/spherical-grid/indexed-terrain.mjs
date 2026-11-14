// Coast-indexed prototype editor, separate from the existing safe baseline.
// Azgaar-inspired parent Grid identity and reusable derived coastal graph.
// The Pack Delaunay triangulation is STILL globally rebuilt when the ocean mask changes.
import {setHeight} from './grid.mjs';
import {assertGlobalGrid,HEIGHT_MIN,HEIGHT_MAX} from './global-config.mjs';
import {openGlobalTerrain} from './terrain-edits.mjs';
import {oceanConnected} from './pack.mjs';
import {createSphericalPack,extendSphericalPack,canExtendSphericalPack,canShrinkSphericalPack,shrinkSphericalPack,replaySphericalPackSuffix} from './pack-mesh.mjs';
import {createCoastIndex,updateCoastIndex,coastSegments} from './coast-index.mjs';

const areaTotal=grid=>grid.areas.reduce((s,v)=>s+v,0);
export function openIndexedTerrain(grid,oceanSeed){
 const state=openGlobalTerrain(grid,oceanSeed);
 state.coastIndex=createCoastIndex(grid,state.geography.ocean);
 return state;
}
export function applyIndexedTerrainEdits(state,changes){
 assertGlobalGrid(state.grid);
 if(!state.coastIndex)throw Error('Open with openIndexedTerrain() first');
 if(!Array.isArray(changes))throw TypeError('Changes must be an array');
 const seen=new Set(),edited=[];
 for(const e of changes){
  if(!e||!Number.isInteger(e.id)||e.id<0||e.id>=state.grid.heights.length)
   throw RangeError('Invalid Grid ID');
  if(!Number.isInteger(e.height)||e.height<HEIGHT_MIN||e.height>HEIGHT_MAX)
   throw RangeError('Height outside allowed range');
  if(seen.has(e.id))throw Error('Duplicate Grid ID');
  seen.add(e.id);
  if(state.grid.heights[e.id]!==e.height)edited.push([e.id,e.height]);
 }
 if(!edited.length)return {mode:'unchanged',changed:0,revision:state.revision};
 if(edited.some(([id,h])=>id===state.oceanSeed&&h>=0))
  throw RangeError('Ocean seed cannot become land');
 const oldValues=edited.map(([id])=>[id,state.grid.heights[id]]);
 const oldGeography=state.geography,oldIndex=state.coastIndex;
 try{
  for(const [id,height] of edited)setHeight(state.grid,id,height);
  const nextOcean=oceanConnected(state.grid,state.oceanSeed);
  const patch=updateCoastIndex(oldIndex,nextOcean);
  const appendOnly=patch.changedCells!==0&&
   canExtendSphericalPack(state.grid,nextOcean,oldGeography.pack);
  const deleteSuffix=patch.changedCells!==0&&!appendOnly&&
   canShrinkSphericalPack(state.grid,nextOcean,oldGeography.pack);
  const replay=patch.changedCells!==0&&!appendOnly&&!deleteSuffix
   ?replaySphericalPackSuffix(state.grid,nextOcean,oldGeography.pack):null;
  const newPack=patch.changedCells===0
   ?{...oldGeography.pack,heights:Int8Array.from(oldGeography.pack.sourceIds,id=>state.grid.heights[id])}
   :appendOnly
    ?extendSphericalPack(state.grid,nextOcean,oldGeography.pack)
    :deleteSuffix
     ?shrinkSphericalPack(state.grid,nextOcean,oldGeography.pack)
     :replay
      ?replay.pack
      :createSphericalPack(state.grid,nextOcean);
  if(newPack.skipped!==0)throw Error('Pack refinement sites missing');
  const landAreaKm2=patch.index.landAreaKm2;
  state.coastIndex=patch.index;
  state.geography={
   ocean:nextOcean,pack:newPack,gridCoastline:coastSegments(patch.index),
   landAreaKm2,seaAreaKm2:areaTotal(state.grid)-landAreaKm2
  };
  state.revision++;
  if(patch.changedCells&&(appendOnly||deleteSuffix||replay))
   state.incrementalPackUpdates=(state.incrementalPackUpdates??0)+1;
  else if(patch.changedCells)
   state.fullPackRebuilds++;
  else state.heightOnlySyncs++;
  return {mode:patch.changedCells?(appendOnly?'incremental-pack-insert':deleteSuffix?'incremental-pack-remove':replay?'incremental-pack-replay':'coast-patch-pack-rebuild'):'reuse-pack-topology',
   changed:edited.length,changedOceanCells:patch.changedCells,
   touchedCoastEdges:patch.touchedEdges,changedCoastEdges:patch.changedEdges,
   revision:state.revision};
 }catch(error){
  for(const [id,v] of oldValues)setHeight(state.grid,id,v);
  state.geography=oldGeography;state.coastIndex=oldIndex;
  throw error;
 }
}
