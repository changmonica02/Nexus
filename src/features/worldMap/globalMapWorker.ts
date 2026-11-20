import {heightBrushChanges} from '../../../experiments/spherical-grid/height-brush.mjs';
import {applyGlobalHeightEdits} from '../../../experiments/spherical-grid/terrain-edits.mjs';
import type {HeightBrush} from './globalMapClient';
import {generateSphericalPack} from '../../../experiments/spherical-grid/spherical-pack.mjs';
import {generateNaturalGeography,deriveHydrology} from '../../../experiments/spherical-grid/pack-hydrology.mjs';
import {editNaturalGeography} from '../../../experiments/spherical-grid/natural-geography.mjs';
import {derivePackEcosystems} from '../../../experiments/spherical-grid/pack-ecosystems.mjs';
import {projectNaturalGeography} from '../../../experiments/spherical-grid/natural-display.mjs';
import {generateMonthlyClimate} from '../../../experiments/spherical-grid/monthly-climate.mjs';
import {createNaturalPlanet} from '../../../experiments/spherical-grid/natural-planet.mjs';
import {createNaturalLand} from '../../../experiments/spherical-grid/natural-land.mjs';
import {exportGlobalTerrainSnapshot,importGlobalTerrainSnapshot} from '../../../experiments/spherical-grid/snapshot.mjs';
import {validateGlobalMapProject,validateGlobalSettings,type GlobalMapProject,type GlobalMapSettings,type NaturalFeaturePatch} from './globalMapProject';
import {createGlobalMapDrawing} from './globalMapGeometry';
import {analyzePlanetGeology} from '../../../experiments/spherical-grid/emergent-islands.mjs';
import {analyzeSphericalPlates as analyzeV2Plates} from '../../../experiments/spherical-grid/tectonic-plates-v2.mjs';
import {analyzeSphericalPlates as analyzeLegacyPlates} from '../../../experiments/spherical-grid/tectonic-plates-legacy.mjs';
import {tectonicSeedFromLandMask} from '../../../experiments/spherical-grid/plate-seafloor.mjs';
let climateCache:{key:string;heights:number[];value:ReturnType<typeof generateMonthlyClimate>}|undefined;
// Worker has no storage, credentials or network calls. The parent owns all persistence.
self.onmessage=(event:MessageEvent<{id:number;action:'preview'|'generate'|'load'|'editNatural'|'rebuildPack'|'initializeNatural'|'editHeight'|'recalculateNature';brush?:HeightBrush;patch?:NaturalFeaturePatch;language?:string;settings?:GlobalMapSettings;project?:GlobalMapProject}>)=>{
 const {id,action}=event.data;
 try {
  if(action==='preview'){
   validateGlobalSettings(event.data.settings);
   const draft=createNaturalLand(event.data.settings);
   const ocean=Uint8Array.from(draft.grid.heights,(height:number)=>height<0?1:0);
   const drawing=createGlobalMapDrawing({...draft.grid,heights:undefined},ocean,[]);
   self.postMessage({id,project:null,drawing});
   return;
  }
  let project:GlobalMapProject;
  if(action==='generate'){
   validateGlobalSettings(event.data.settings);
   const draft=createNaturalPlanet(event.data.settings);
   const terrain=exportGlobalTerrainSnapshot({grid:draft.grid,oceanSeed:draft.oceanSeed,revision:0}) as GlobalMapProject['terrain'];
   project={format:'nexus-global-map',version:1,geologyVersion:4,climateVersion:1,islandGenesis:draft.islandGenesis as GlobalMapProject['islandGenesis'],settings:{...event.data.settings},terrain};
  } else if(['load','editNatural','rebuildPack','initializeNatural','editHeight','recalculateNature'].includes(action)) {validateGlobalMapProject(event.data.project);project={...event.data.project!};}
  else throw Error('Unsupported global map operation');
  if(action==='generate'||action==='initializeNatural')project={...project,climateVersion:1,packSettings:project.packSettings??{version:1,detail:1}};
  if(action==='rebuildPack'){if(!project.packSettings)throw Error('Pack is not initialized');project.packSettings={version:1,detail:project.packSettings.detail===1?2:1};}
  validateGlobalMapProject(project);
  const state=importGlobalTerrainSnapshot(project.terrain);
  if(action==='editHeight'){
   const changes=heightBrushChanges(state.grid,event.data.brush);
   if(changes.length&&project.climateVersion===1)project.environmentTerrain??=project.terrain;
   // Move the ocean anchor before a free brush raises its former cell.
   const updates=new Map<number,number>(changes.map((c:{id:number;height:number})=>[c.id,c.height]));
   if((updates.get(state.oceanSeed)??state.grid.heights[state.oceanSeed])>=0){
    const seed=state.grid.heights.findIndex((h:number,i:number)=>(updates.get(i)??h)<0);
    if(seed<0)throw Error('A planet must retain an ocean cell');state.oceanSeed=seed;
   }
   applyGlobalHeightEdits(state,changes);
   project.terrain=exportGlobalTerrainSnapshot(state) as GlobalMapProject['terrain'];
  }

  if(action==='recalculateNature')delete project.environmentTerrain;
  const environment=project.environmentTerrain?importGlobalTerrainSnapshot(project.environmentTerrain):state;
  // Stable across ocean-only height edits, exports and reloads. Never
  // recalculate / overwrite saved terrain when opening an existing map.
  const tectonics=(project.geologyVersion===3||project.geologyVersion===4)?analyzePlanetGeology(state.grid,project.islandGenesis):
   (project.geologyVersion===2?analyzeV2Plates:analyzeLegacyPlates)(state.grid,{seed:tectonicSeedFromLandMask(state.grid)});
  let climate;
  if(project.climateVersion===1){
   const key='climate-v1:'+(project.environmentTerrain??project.terrain).checksum;
   if(climateCache?.key!==key||climateCache.heights.some((h,i)=>h!==environment.grid.heights[i]))climateCache={key,heights:Array.from(environment.grid.heights),value:generateMonthlyClimate(environment.grid)};
   climate=climateCache!.value;
  }
  let natural;
  if(project.packSettings&&climate){
   const pack=generateSphericalPack(environment.grid,project.packSettings);
   if(!project.naturalGeography&&(action==='generate'||action==='initializeNatural'))project.naturalGeography=generateNaturalGeography(pack,climate,project.settings.seed,event.data.language) as GlobalMapProject['naturalGeography'];
   if(action==='editNatural'){if(!project.naturalGeography||!event.data.patch)throw Error('Missing natural feature');project.naturalGeography=editNaturalGeography(pack,climate,project.naturalGeography,event.data.patch);}
   if(project.naturalGeography){const hydro=deriveHydrology(pack,climate,project.naturalGeography);natural=projectNaturalGeography(pack,project.naturalGeography,hydro,derivePackEcosystems(pack,hydro));}
  }
  validateGlobalMapProject(project);
  const drawing=createGlobalMapDrawing(state.grid,state.geography.ocean,state.geography.gridCoastline,tectonics,climate);
  drawing.natural=natural;
  drawing.plateBoundaries=tectonics.drawing;
  drawing.plateCount=tectonics.plateCount;
  self.postMessage({id,project,drawing});
 }catch(error){self.postMessage({id,error:error instanceof Error?error.message:String(error)});}
};
