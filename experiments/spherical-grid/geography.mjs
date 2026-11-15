// Read-only authoritative Grid coastline/area paired with a derived spherical Pack.
// Keeping these separate prevents visual refinement from changing world area.
import {buildCoastalSamples,oceanConnected} from './pack.mjs';
import {createSphericalPack} from './pack-mesh.mjs';
export function deriveSphericalGeography(grid,oceanSeed){
 const ocean=oceanConnected(grid,oceanSeed);
 const canonical=buildCoastalSamples(grid,ocean);
 const pack=createSphericalPack(grid,ocean);
 if(pack.skipped!==0)throw Error('Incomplete Pack coastline refinement');
 return {
  ocean,pack,
  gridCoastline:canonical.coast,
  landAreaKm2:canonical.landAreaKm2,
  seaAreaKm2:grid.areas.reduce((sum,area,i)=>sum+(ocean[i]?area:0),0)
 };
}
