// New-world generation only. Persist the resulting heights, never a recipe
// that would regenerate an existing user's world during load.
import {createNaturalLand} from './natural-land.mjs';
import {shapeNaturalRelief} from './natural-relief.mjs';
import {analyzeSphericalPlates} from './tectonic-plates.mjs';
import {generatePlateSeafloor,applyPlateSeafloor,tectonicSeedFromLandMask,SEAFLOOR} from './plate-seafloor.mjs';

import {proposeEmergentIslands,attachEmergentIslands} from './emergent-islands.mjs';

export function createNaturalPlanet(settings,{emergentIslands=true}={}){
 const draft=createNaturalLand(settings);
 // Drainage-guided valleys and hypsometry follow the template mountains.
 // Preserve the selected land area and ocean seed: only land elevations change.
 const refinement=shapeNaturalRelief(draft.grid,{seed:settings.seed,rawRelief:draft.rawRelief});
 const seed=tectonicSeedFromLandMask(draft.grid);
 // Crust and mountain hints come from the completed terrestrial surface.
 const tectonics=analyzeSphericalPlates(draft.grid,{seed});
 const seafloor=generatePlateSeafloor(draft.grid,{seed,tectonics});
 applyPlateSeafloor(draft.grid,seafloor);
 const proposal=emergentIslands?proposeEmergentIslands(draft.grid,tectonics,settings.seed,draft.oceanSeed):null;
 const islandGenesis=proposal?.cells.length?{version:1,cells:proposal.cells,chains:proposal.chains}:undefined;
 if(proposal)for(const c of [...proposal.submergedChanges,...proposal.changes])draft.grid.heights[c.cell]=c.height;
 attachEmergentIslands(tectonics,islandGenesis,draft.grid);
 if(islandGenesis){
  seafloor.heights=draft.grid.heights.slice();seafloor.oceanCells-=islandGenesis.cells.length;
  for(const i of islandGenesis.cells)seafloor.zones[i]=0;
  for(const c of proposal.submergedChanges)seafloor.zones[c.cell]=SEAFLOOR.seamount;
  seafloor.submarineVolcanoes=seafloor.submarineVolcanoes.filter(v=>!islandGenesis.cells.includes(v.gridCell));
  seafloor.islandChains=tectonics.features.islandChains;
 }
 const total=draft.grid.areas.reduce((s,a)=>s+a,0);
 const measuredLandPercent=100*draft.grid.areas.reduce((s,a,i)=>s+(draft.grid.heights[i]>=0?a:0),0)/total;
 return {...draft,measuredLandPercent,tolerancePercent:draft.tolerancePercent+(emergentIslands ? .12 : 0),islandGenesis,
  addedIslandLandPercent:proposal?.addedAreaPercent??0,refinement,tectonics,seafloor,generator:'nexus-natural-planet-v4'};
}
