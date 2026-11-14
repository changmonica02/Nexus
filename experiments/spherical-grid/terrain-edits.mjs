// Isolated edit coordinator. No persistence, Supabase or Azgaar runtime side effects.
import {setHeight} from './grid.mjs';
import {deriveSphericalGeography} from './geography.mjs';
import {assertGlobalGrid,HEIGHT_MIN,HEIGHT_MAX} from './global-config.mjs';

export function openGlobalTerrain(grid, oceanSeed) {
 assertGlobalGrid(grid);
 return {grid,oceanSeed,geography:deriveSphericalGeography(grid,oceanSeed),
  revision:0,fullPackRebuilds:1,heightOnlySyncs:0};
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
  if(!Number.isInteger(change.height) || change.height<HEIGHT_MIN || change.height>HEIGHT_MAX)
   throw RangeError('Height must be an integer within [-100,100]');
  if(updates.has(change.id))throw Error('Repeated Grid cell ID in a batch');
  updates.set(change.id,change.height);
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
   const next=deriveSphericalGeography(grid,state.oceanSeed);
   state.geography=next;
   state.fullPackRebuilds++;
  }else{
   const {pack}=state.geography;
   // Pack source IDs remain stable for purely vertical edits.
   for(let i=0;i<pack.sourceIds.length;i++)if(updates.has(pack.sourceIds[i]))
    pack.heights[i]=grid.heights[pack.sourceIds[i]];
   state.heightOnlySyncs++;
  }
 }catch(error){
  for(const [id,height] of prior)setHeight(grid,id,height);
  throw error;
 }
 state.revision++;
 return {changed:edited.length,mode:changesCoast?'full-pack-rebuild':'height-only',revision:state.revision};
}
