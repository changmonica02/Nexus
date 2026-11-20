import {quantizeHeight} from '../../src/features/worldMap/core/terrainField.mjs';
// Isolated edit coordinator. No persistence, Supabase or Azgaar runtime side effects.
import {setHeight} from './grid.mjs';
import {oceanConnected} from './pack.mjs';
import {deriveSphericalGeography} from './geography.mjs';
import {assertGlobalGrid,HEIGHT_MIN,HEIGHT_MAX} from './global-config.mjs';

// The editor's rendering and hydrology already build their own meshes.
// Consumers of this lightweight state only need the canonical ocean mask.
const deriveOceanMask=(grid,oceanSeed)=>({ocean:oceanConnected(grid,oceanSeed)});
export function openGlobalTerrain(grid, oceanSeed, {oceanMaskOnly=false}={}) {
 assertGlobalGrid(grid);
 const deriveGeography=oceanMaskOnly?deriveOceanMask:deriveSphericalGeography;
 return {grid,oceanSeed,geography:deriveGeography(grid,oceanSeed),
  revision:0,fullPackRebuilds:oceanMaskOnly?0:1,heightOnlySyncs:0};
}
export function applyGlobalHeightEdits(state,changes) {
 const {grid}=state;
 assertGlobalGrid(grid);
 if (!Array.isArray(changes)) throw TypeError('Changes must be an array');
 // Validate the complete batch before writing anything.
 const updates=new Map();
 for(const change of changes){
  if(!change || !Number.isInteger(change.id) || change.id<0 || change.id>=grid.heights.length)
   throw RangeError('Invalid Grid cell ID');
  if(!Number.isFinite(change.height) || change.height<HEIGHT_MIN || change.height>HEIGHT_MAX)
   throw RangeError('Height must be finite within [-100,100]');
  if(updates.has(change.id))throw Error('Repeated Grid cell ID in a batch');
  updates.set(change.id,Math.fround(quantizeHeight(change.height)));
 }
 const edited=[...updates].filter(([id,h])=>grid.heights[id]!==h);
 if(!edited.length)return {changed:0,mode:'unchanged',revision:state.revision};
 const newSeedHeight=updates.get(state.oceanSeed)??grid.heights[state.oceanSeed];
 if(newSeedHeight>=0)throw RangeError('Ocean seed cannot become land; choose a different negative-height seed first');
 const changesCoast=edited.some(([id,height])=>(grid.heights[id]<0)!==(height<0));
 // A same-sign height edit cannot change the ocean mask or Pack topology.
 // Copy original values to allow rollback if a derived rebuild throws.
 const prior=edited.map(([id])=>[id,grid.heights[id]]);
 try{
  for(const [id,height] of edited)setHeight(grid,id,height);
  if(changesCoast){
   const next=(state.geography.pack?deriveSphericalGeography:deriveOceanMask)(grid,state.oceanSeed);
   state.geography=next;
   if(next.pack)state.fullPackRebuilds++;
  }else{
   const {pack}=state.geography;
   // Pack source IDs remain stable for purely vertical edits.
   for(let i=0;pack&&i<pack.sourceIds.length;i++)if(updates.has(pack.sourceIds[i]))
    pack.heights[i]=grid.heights[pack.sourceIds[i]];
   state.heightOnlySyncs++;
  }
 }catch(error){
  for(const [id,height] of prior)setHeight(grid,id,height);
  throw error;
 }
 state.revision++;
 return {changed:edited.length,mode:changesCoast?(state.geography.pack?'full-pack-rebuild':'ocean-mask-rebuild'):'height-only',revision:state.revision};
}
