import {createAzgaarSphericalLandLayout} from '../../../experiments/spherical-grid/azgaar-spherical-land-legacy.mjs';
import {exportGlobalTerrainSnapshot,importGlobalTerrainSnapshot} from '../../../experiments/spherical-grid/snapshot.mjs';
import {validateGlobalMapProject,validateGlobalSettings,type GlobalMapProject,type GlobalMapSettings} from './globalMapProject';
import {createGlobalMapDrawing} from './globalMapGeometry';
import {analyzeSphericalPlates} from '../../../experiments/spherical-grid/tectonic-plates.mjs';
import {generatePlateSeafloor,applyPlateSeafloor,tectonicSeedFromLandMask} from '../../../experiments/spherical-grid/plate-seafloor.mjs';
// Worker has no storage, credentials or network calls. The parent owns all persistence.
self.onmessage=(event:MessageEvent<{id:number;action:'generate'|'load';settings?:GlobalMapSettings;project?:GlobalMapProject}>)=>{
 const {id,action}=event.data;
 try {
  let project:GlobalMapProject;
  if(action==='generate'){
   validateGlobalSettings(event.data.settings);
   const draft=createAzgaarSphericalLandLayout(event.data.settings);
   // New world only: derive tectonics from existing coasts, then shape seabed.
   // Do not touch any land height or change whether a cell is land/ocean.
   const tectonicSeed=tectonicSeedFromLandMask(draft.grid);
   const tectonics=analyzeSphericalPlates(draft.grid,{seed:tectonicSeed});
   const seabed=generatePlateSeafloor(draft.grid,{seed:tectonicSeed,tectonics});
   applyPlateSeafloor(draft.grid,seabed);
   const terrain=exportGlobalTerrainSnapshot({grid:draft.grid,oceanSeed:draft.oceanSeed,revision:0}) as GlobalMapProject['terrain'];
   project={format:'nexus-global-map',version:1,settings:{...event.data.settings},terrain};
  } else if(action==='load') {validateGlobalMapProject(event.data.project);project=event.data.project;}
  else throw Error('Unsupported global map operation');
  const state=importGlobalTerrainSnapshot(project.terrain);
  const drawing=createGlobalMapDrawing(state.grid,state.geography.ocean,state.geography.gridCoastline);
  // Stable across ocean-only height edits, exports and reloads. Never
  // recalculate / overwrite saved terrain when opening an existing map.
  const tectonics=analyzeSphericalPlates(state.grid,{seed:tectonicSeedFromLandMask(state.grid)});
  drawing.plateBoundaries=tectonics.drawing;
  drawing.plateCount=tectonics.plateCount;
  self.postMessage({id,project,drawing});
 }catch(error){self.postMessage({id,error:error instanceof Error?error.message:String(error)});}
};
