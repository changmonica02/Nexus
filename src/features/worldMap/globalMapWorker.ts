import {createAzgaarSphericalLandLayout} from '../../../experiments/spherical-grid/azgaar-spherical-land.mjs';
import {exportGlobalTerrainSnapshot,importGlobalTerrainSnapshot} from '../../../experiments/spherical-grid/snapshot.mjs';
import {validateGlobalMapProject,validateGlobalSettings,type GlobalMapProject,type GlobalMapSettings} from './globalMapProject';
import {createGlobalMapDrawing} from './globalMapGeometry';
import {analyzeSphericalPlates} from '../../../experiments/spherical-grid/tectonic-plates.mjs';
// Worker has no storage, credentials or network calls. The parent owns all persistence.
self.onmessage=(event:MessageEvent<{id:number;action:'generate'|'load';settings?:GlobalMapSettings;project?:GlobalMapProject}>)=>{
 const {id,action}=event.data;
 try {
  let project:GlobalMapProject;
  if(action==='generate'){
   validateGlobalSettings(event.data.settings);
   const draft=createAzgaarSphericalLandLayout(event.data.settings);
   const terrain=exportGlobalTerrainSnapshot({grid:draft.grid,oceanSeed:draft.oceanSeed,revision:0}) as GlobalMapProject['terrain'];
   project={format:'nexus-global-map',version:1,settings:{...event.data.settings},terrain};
  } else if(action==='load') {validateGlobalMapProject(event.data.project);project=event.data.project;}
  else throw Error('Unsupported global map operation');
  const state=importGlobalTerrainSnapshot(project.terrain);
  const drawing=createGlobalMapDrawing(state.grid,state.geography.ocean,state.geography.gridCoastline);
  // Derived from authoritative heights, not mutable project settings. Changing
  // the seed field in a loaded project cannot silently change existing lines.
  const tectonics=analyzeSphericalPlates(state.grid,{seed:parseInt(project.terrain.checksum,16)>>>0});
  drawing.plateBoundaries=tectonics.drawing;
  drawing.plateCount=tectonics.plateCount;
  self.postMessage({id,project,drawing});
 }catch(error){self.postMessage({id,error:error instanceof Error?error.message:String(error)});}
};
