// New-world generation only. Persist the resulting heights, never a recipe
// that would regenerate an existing user's world during load.
import {createAzgaarSphericalLandLayout} from './azgaar-spherical-land.mjs';
import {refineSphericalTerrain} from './spherical-terrain-refinement.mjs';
import {analyzeSphericalPlates} from './tectonic-plates.mjs';
import {generatePlateSeafloor,applyPlateSeafloor,tectonicSeedFromLandMask} from './plate-seafloor.mjs';

export function createNaturalPlanet(settings){
 const draft=createAzgaarSphericalLandLayout(settings);
 // Seamless multi-scale relief follows the template mountains. Preserve
 // the selected land area and ocean seed: only positive elevations change.
 const refinement=refineSphericalTerrain(draft.grid,{seed:settings.seed,coast:false,relief:true});
 const seed=tectonicSeedFromLandMask(draft.grid);
 // Crust and mountain hints come from the completed terrestrial surface.
 const tectonics=analyzeSphericalPlates(draft.grid,{seed});
 const seafloor=generatePlateSeafloor(draft.grid,{seed,tectonics});
 applyPlateSeafloor(draft.grid,seafloor);
 return {...draft,refinement,tectonics,seafloor,generator:'nexus-natural-planet-v1'};
}
