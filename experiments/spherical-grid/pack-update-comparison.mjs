// Experimental selective Pack update comparison. This is NOT a local Delaunay patcher.
// Only skips geometric rebuild when the derived ocean mask is unchanged.
// If ANY ocean membership changes, falls back to the verified full rebuild.
import {setHeight} from './grid.mjs';
import {assertGlobalGrid,HEIGHT_MIN,HEIGHT_MAX} from './global-config.mjs';
import {oceanConnected} from './pack.mjs';
import {deriveSphericalGeography} from './geography.mjs';

function changedCells(state,changes) {
 assertGlobalGrid(state.grid);
 if(!Array.isArray(changes))throw TypeError('Changes must be an array');
 const seen=new Set(),updated=[];
 for(const entry of changes){
  if(!entry||!Number.isInteger(entry.id)||entry.id<0||entry.id>=state.grid.heights.length)
   throw RangeError('Invalid Grid ID');
  if(!Number.isInteger(entry.height)||entry.height<HEIGHT_MIN||entry.height>HEIGHT_MAX)
   throw RangeError('Invalid height');
  if(seen.has(entry.id))throw Error('Repeated Grid ID');
  seen.add(entry.id);
  if(state.grid.heights[entry.id]!==entry.height)updated.push([entry.id,entry.height]);
 }
 if(updated.some(([id,height])=>id===state.oceanSeed && height>=0))
  throw RangeError('Ocean seed cannot become land');
 return updated;
}
function masksEqual(a,b) {
 if(a.length!==b.length)return false;
 for(let i=0;i<a.length;i++)if(a[i]!==b[i])return false;
 return true;
}
export function applyComparedTerrainEdits(state,changes,{strategy='selective'}={}){
 if(strategy!=='selective'&&strategy!=='full')throw RangeError('Invalid strategy');
 const edited=changedCells(state,changes);
 if(!edited.length)return {mode:'unchanged',changed:0,revision:state.revision};
 const original=edited.map(([id])=>[id,state.grid.heights[id]]);
 const originalGeography=state.geography;
 const originalRevision=state.revision;
 try{
  for(const [id,height] of edited)setHeight(state.grid,id,height);
  // For comparison, always calculate the authoritative ocean mask from the edited heights.
  const ocean=oceanConnected(state.grid,state.oceanSeed);
  if(strategy==='selective'&&masksEqual(ocean,originalGeography.ocean)){
   // No ocean-membership change: all Pack sites, edges and areas are invariant.
   // Stage all updates before changing any state for atomicity.
   const newPackHeights=Int8Array.from(originalGeography.pack.sourceIds,id=>state.grid.heights[id]);
   const nextPack={...originalGeography.pack,heights:newPackHeights};
   state.geography={...originalGeography,pack:nextPack};
   state.revision++;
   state.heightOnlySyncs++;
   return {mode:'reuse-pack-topology',changed:edited.length,revision:state.revision};
  }
  // Includes a strict complete-rebuild reference implementation and all coast changes.
  state.geography=deriveSphericalGeography(state.grid,state.oceanSeed);
  state.fullPackRebuilds++;
  state.revision++;
  return {mode:'full-pack-rebuild',changed:edited.length,revision:state.revision};
 }catch(error){
  for(const [id,height] of original)setHeight(state.grid,id,height);
  state.geography=originalGeography;state.revision=originalRevision;
  throw error;
 }
}
