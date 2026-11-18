// New-world generation only. Persist the resulting heights, never a recipe
// that would regenerate an existing user's world during load.
import {createNaturalLand} from './natural-land.mjs';
import {shapeNaturalRelief} from './natural-relief.mjs';
import {analyzeSphericalPlates} from './tectonic-plates.mjs';
import {generatePlateSeafloor,applyPlateSeafloor,tectonicSeedFromLandMask} from './plate-seafloor.mjs';

export function createNaturalPlanet(settings){
 const draft=createNaturalLand(settings);
 // Drainage-guided valleys and hypsometry follow the template mountains.
 // Preserve the selected land area and ocean seed: only land elevations change.
 const refinement=shapeNaturalRelief(draft.grid,{seed:settings.seed,rawRelief:draft.rawRelief});
 const seed=tectonicSeedFromLandMask(draft.grid);
 // Crust and mountain hints come from the completed terrestrial surface.
 const tectonics=analyzeSphericalPlates(draft.grid,{seed});
 const seafloor=generatePlateSeafloor(draft.grid,{seed,tectonics});
 applyPlateSeafloor(draft.grid,seafloor);
 return {...draft,refinement,tectonics,seafloor,generator:'nexus-natural-planet-v3'};
}
