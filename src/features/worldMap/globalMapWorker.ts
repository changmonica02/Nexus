import {createNaturalPlanet} from '../../../experiments/spherical-grid/natural-planet.mjs';
import {exportGlobalTerrainSnapshot,importGlobalTerrainSnapshot} from '../../../experiments/spherical-grid/snapshot.mjs';
import {validateGlobalMapProject,validateGlobalSettings,type GlobalMapProject,type GlobalMapSettings} from './globalMapProject';
import {createGlobalMapDrawing} from './globalMapGeometry';
import {analyzeSphericalPlates} from '../../../experiments/spherical-grid/tectonic-plates.mjs';
import {analyzeSphericalPlates as analyzeV2Plates} from '../../../experiments/spherical-grid/tectonic-plates-v2.mjs';
import {analyzeSphericalPlates as analyzeLegacyPlates} from '../../../experiments/spherical-grid/tectonic-plates-legacy.mjs';
import {tectonicSeedFromLandMask} from '../../../experiments/spherical-grid/plate-seafloor.mjs';
// Worker has no storage, credentials or network calls. The parent owns all persistence.
self.onmessage=(event:MessageEvent<{id:number;action:'generate'|'load';settings?:GlobalMapSettings;project?:GlobalMapProject}>)=>{
 const {id,action}=event.data;
 try {
  let project:GlobalMapProject;
  if(action==='generate'){
   validateGlobalSettings(event.data.settings);
   const draft=createNaturalPlanet(event.data.settings);
   const terrain=exportGlobalTerrainSnapshot({grid:draft.grid,oceanSeed:draft.oceanSeed,revision:0}) as GlobalMapProject['terrain'];
   project={format:'nexus-global-map',version:1,geologyVersion:3,settings:{...event.data.settings},terrain};
  } else if(action==='load') {validateGlobalMapProject(event.data.project);project=event.data.project;}
  else throw Error('Unsupported global map operation');
  const state=importGlobalTerrainSnapshot(project.terrain);

  // Stable across ocean-only height edits, exports and reloads. Never
  // recalculate / overwrite saved terrain when opening an existing map.
  const analyze=project.geologyVersion===3?analyzeSphericalPlates:project.geologyVersion===2?analyzeV2Plates:analyzeLegacyPlates;
  const tectonics=analyze(state.grid,{seed:tectonicSeedFromLandMask(state.grid)});
  const drawing=createGlobalMapDrawing(state.grid,state.geography.ocean,state.geography.gridCoastline,tectonics);
  drawing.plateBoundaries=tectonics.drawing;
  drawing.plateCount=tectonics.plateCount;
  self.postMessage({id,project,drawing});
 }catch(error){self.postMessage({id,error:error instanceof Error?error.message:String(error)});}
};
