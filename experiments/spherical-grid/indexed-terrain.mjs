// Coast-indexed prototype editor, separate from the existing safe baseline.
// Azgaar-inspired parent Grid identity and reusable derived coastal graph.
// Pack edits may replay a recorded suffix; unsafe edits use complete reconstruction.
import {setHeight} from './grid.mjs';
import {assertGlobalGrid,HEIGHT_MIN,HEIGHT_MAX} from './global-config.mjs';
import {openGlobalTerrain} from './terrain-edits.mjs';
import {oceanConnected} from './pack.mjs';
import {createSphericalPack,extendSphericalPack,canExtendSphericalPack,canShrinkSphericalPack,shrinkSphericalPack,replaySphericalPackSuffix} from './pack-mesh.mjs';
import {createCoastIndex,updateCoastIndex,coastSegments} from './coast-index.mjs';

const areaTotal=grid=>grid.areas.reduce((s,v)=>s+v,0);
function validDerivedPack(grid,pack){
 if(!pack||pack.skipped!==0||
   pack.points.length!==grid.points.length+pack.coastEdges.length||
   pack.triangles.length!==2*pack.points.length-4||
   pack.areas.length!==pack.points.length||
   pack.sourceIds.length!==pack.points.length||
   pack.heights.length!==pack.points.length)return false;
 let areaSum=0;
 for(const area of pack.areas){if(!Number.isFinite(area)||area<=0)return false;areaSum+=area}
 const expected=4*Math.PI*6371**2;
 return Math.abs(areaSum-expected)/expected<1e-9;
}
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
  let newPack,mode='coast-patch-pack-rebuild',incrementalFallbackReason=null;
  if(patch.changedCells===0){
   newPack={...oldGeography.pack,
    heights:Int8Array.from(oldGeography.pack.sourceIds,id=>state.grid.heights[id])};
   mode='reuse-pack-topology';
  }else{
   try{
    if(canExtendSphericalPack(state.grid,nextOcean,oldGeography.pack)){
     newPack=extendSphericalPack(state.grid,nextOcean,oldGeography.pack);
     mode='incremental-pack-insert';
    }else if(canShrinkSphericalPack(state.grid,nextOcean,oldGeography.pack)){
     newPack=shrinkSphericalPack(state.grid,nextOcean,oldGeography.pack);
     mode='incremental-pack-remove';
    }else{
     const result=replaySphericalPackSuffix(state.grid,nextOcean,oldGeography.pack);
     if(result){
      newPack=result.pack;
      mode='incremental-pack-replay';
     }
    }
    if(newPack&&!validDerivedPack(state.grid,newPack)){
     newPack=null;
     incrementalFallbackReason='Incremental geometry failed basic manifold/area validation';
    }
   }catch(error){
    // Never persist a partially patched mesh. The Grid edit is retained only
    // if a subsequent full rebuild succeeds; otherwise the outer rollback fires.
    newPack=null;
    incrementalFallbackReason=error instanceof Error?error.message:String(error);
   }
   if(!newPack){
    newPack=createSphericalPack(state.grid,nextOcean);
    mode='coast-patch-pack-rebuild';
   }
  }
  if(newPack.skipped!==0)throw Error('Pack refinement sites missing');
  const landAreaKm2=patch.index.landAreaKm2;
  state.coastIndex=patch.index;
  state.geography={
   ocean:nextOcean,pack:newPack,gridCoastline:coastSegments(patch.index),
   landAreaKm2,seaAreaKm2:areaTotal(state.grid)-landAreaKm2
  };
  state.revision++;
  if(mode.startsWith('incremental-pack-'))
   state.incrementalPackUpdates=(state.incrementalPackUpdates??0)+1;
  else if(mode==='coast-patch-pack-rebuild')
   state.fullPackRebuilds++;
  else state.heightOnlySyncs++;
  return {mode,changed:edited.length,changedOceanCells:patch.changedCells,
   touchedCoastEdges:patch.touchedEdges,changedCoastEdges:patch.changedEdges,
   incrementalFallbackReason,revision:state.revision};
 }catch(error){
  for(const [id,v] of oldValues)setHeight(state.grid,id,v);
  state.geography=oldGeography;state.coastIndex=oldIndex;
  throw error;
 }
}
