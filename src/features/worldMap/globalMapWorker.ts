import type {GenerationProgress} from './globalMapProgress';
import {heightBrushChanges,heightStrokeChanges,sampleHeightStroke} from './core/heightBrush.mjs';
import {applyGlobalHeightEdits} from '../../../experiments/spherical-grid/terrain-edits.mjs';
import type {HeightBrush,HeightStroke} from './globalMapClient';
import {generateSphericalPack,createPackedCoast} from '../../../experiments/spherical-grid/spherical-pack.mjs';
import {generateNaturalGeography,deriveHydrology} from '../../../experiments/spherical-grid/pack-hydrology.mjs';
import {editNaturalGeography,relinkNaturalRivers} from '../../../experiments/spherical-grid/natural-geography.mjs';
import {derivePackEcosystems} from '../../../experiments/spherical-grid/pack-ecosystems.mjs';
import {projectNaturalGeography} from '../../../experiments/spherical-grid/natural-display.mjs';
import {generateMonthlyClimate} from '../../../experiments/spherical-grid/monthly-climate.mjs';
import {createNaturalPlanet} from '../../../experiments/spherical-grid/natural-planet.mjs';
import {oceanConnected} from '../../../experiments/spherical-grid/pack.mjs';
import {createNaturalLand,largestOceanSeed} from '../../../experiments/spherical-grid/natural-land.mjs';
import {exportGlobalTerrainSnapshot,importGlobalTerrainSnapshot} from '../../../experiments/spherical-grid/snapshot.mjs';
import {validateGlobalMapProject,validateGlobalSettings,type GlobalMapProject,type GlobalMapSettings,type NaturalFeaturePatch} from './globalMapProject';
import {createGlobalMapDrawing,type NaturalMapDrawing} from './globalMapGeometry';
import {analyzePlanetGeology} from '../../../experiments/spherical-grid/emergent-islands.mjs';
let landPreviewCache:{key:string;draft:ReturnType<typeof createNaturalLand>}|undefined;
let climateCache:{key:string;heights:number[];value:ReturnType<typeof generateMonthlyClimate>}|undefined;
// Shoreline detail follows the saved physical reference, not editable seed provenance.
let coastCache:{seed:number;mask:Uint8Array;surface:ReturnType<typeof createPackedCoast>}|undefined;
function packedCoast(grid:ReturnType<typeof importGlobalTerrainSnapshot>['grid'],mask:Uint8Array,seed:number){
 if(coastCache?.seed!==seed||coastCache.mask.some((value,i)=>value!==mask[i]))coastCache={seed,mask,surface:createPackedCoast(grid,mask,seed)};
 return coastCache.surface;
}
let naturalCache:{climate:ReturnType<typeof generateMonthlyClimate>;key:string;drawing:NaturalMapDrawing}|undefined;
// Worker has no storage, credentials or network calls. The parent owns all persistence.
self.onmessage=(event:MessageEvent<{id:number;action:'preview'|'generate'|'load'|'editRivers'|'editNatural'|'rebuildPack'|'initializeNatural'|'regenerateRivers'|'editHeight'|'recalculateNature';previewFirst?:boolean;brush?:HeightBrush;stroke?:HeightStroke;patch?:NaturalFeaturePatch;language?:string;settings?:GlobalMapSettings;project?:GlobalMapProject}>)=>{
 const {id,action}=event.data;
 const report=(progress:GenerationProgress)=>self.postMessage({id,progress});
 try {
  if(action==='preview'){
   validateGlobalSettings(event.data.settings);
   const key=JSON.stringify(event.data.settings);
   if(landPreviewCache?.key!==key)landPreviewCache={key,draft:createNaturalLand(event.data.settings)};
   const draft=landPreviewCache.draft;
   const ocean=oceanConnected(draft.grid,draft.oceanSeed);
   const drawing=createGlobalMapDrawing({...draft.grid,heights:undefined},ocean,[],undefined,undefined,packedCoast(draft.grid,ocean,draft.oceanSeed));
   self.postMessage({id,project:null,drawing});
   return;
  }
  let project:GlobalMapProject;
  if(action==='generate'){
   validateGlobalSettings(event.data.settings);
   const landDraft=landPreviewCache?.key===JSON.stringify(event.data.settings)?landPreviewCache.draft:undefined;
   landPreviewCache=undefined; // Full generation consumes and mutates this draft once.
   const draft=createNaturalPlanet(event.data.settings,{onProgress:report,landDraft});
   const terrain=exportGlobalTerrainSnapshot({grid:draft.grid,oceanSeed:draft.oceanSeed,revision:0}) as GlobalMapProject['terrain'];
   project={format:'nexus-global-map',version:1,geologyVersion:4,climateVersion:2,islandGenesis:draft.islandGenesis as GlobalMapProject['islandGenesis'],settings:{...event.data.settings},terrain};
  } else if(['load','editRivers','editNatural','rebuildPack','initializeNatural','regenerateRivers','editHeight','recalculateNature'].includes(action)) {validateGlobalMapProject(event.data.project);project={...event.data.project!};}
  else throw Error('Unsupported global map operation');
  if(action==='generate'||action==='initializeNatural')project={...project,climateVersion:2,packSettings:project.packSettings??{version:1,detail:1}};
  if(action==='rebuildPack'){if(!project.packSettings)throw Error('Pack is not initialized');project.packSettings={version:1,detail:project.packSettings.detail===1?2:1};}
  validateGlobalMapProject(project);
  const state=importGlobalTerrainSnapshot(project.terrain,{oceanMaskOnly:true});
  if(action==='load'&&event.data.previewFirst){
   const {grid,geography}=state;
   const coast=packedCoast(grid,geography.ocean,project.terrain.oceanSeed);
   const previewDrawing=createGlobalMapDrawing({...grid,heights:undefined},geography.ocean,[],undefined,undefined,coast);
   self.postMessage({id,previewDrawing});
  }
  if(action==='editHeight'){
   const brushGrid={...state.grid,oceanMask:state.geography.ocean};
   const changes:{id:number;height:number}[]=event.data.stroke?heightStrokeChanges(brushGrid,sampleHeightStroke(event.data.stroke.brush,event.data.stroke.points)):heightBrushChanges(brushGrid,event.data.brush);
   if(changes.length&&project.climateVersion===2)project.environmentTerrain??=project.terrain;
   // A newly enclosed inland depression cannot become the global ocean.
   if(changes.some(({id,height})=>(state.grid.heights[id]<0)!==(height<0))){
    const heights=state.grid.heights.slice();
    for(const {id,height} of changes)heights[id]=height;
    state.oceanSeed=largestOceanSeed({...state.grid,heights});
   }
   applyGlobalHeightEdits(state,changes);
   project.terrain=exportGlobalTerrainSnapshot(state) as GlobalMapProject['terrain'];
  }

  if(action==='editRivers')delete project.riverEdit;
  if(action==='recalculateNature')delete project.environmentTerrain;
  const environment=project.environmentTerrain?importGlobalTerrainSnapshot(project.environmentTerrain,{oceanMaskOnly:true}):state;
  // Stable across ocean-only height edits, exports and reloads. Never
  // recalculate / overwrite saved terrain when opening an existing map.
  const tectonics=analyzePlanetGeology(state.grid,project.islandGenesis);
  let climate;
  if(project.climateVersion===2){
   const key='climate-v2:'+(project.environmentTerrain??project.terrain).checksum;
   if(climateCache?.key!==key||climateCache.heights.some((h,i)=>h!==environment.grid.heights[i]))climateCache={key,heights:Array.from(environment.grid.heights),value:generateMonthlyClimate(environment.grid,{onProgress:report})};
   climate=climateCache!.value;
  }
  let natural;
  if(project.packSettings&&climate){
   report({stage:'hydrology',fraction:.90});
   const keyForNatural=()=>JSON.stringify([project.settings.seed,environment.oceanSeed,project.packSettings,project.naturalGeography]);
   if(action!=='editRivers'&&action!=='editNatural'&&action!=='regenerateRivers'&&naturalCache?.climate===climate&&naturalCache.key===keyForNatural()){
    natural=naturalCache.drawing;
   }else{
    const pack=generateSphericalPack(environment.grid,{...project.packSettings,oceanMask:Uint8Array.from(environment.geography.ocean),coastSurface:packedCoast(environment.grid,environment.geography.ocean,(project.environmentTerrain??project.terrain).oceanSeed)});
    if(!project.naturalGeography&&(action==='generate'||action==='initializeNatural'))project.naturalGeography=generateNaturalGeography(pack,climate,project.settings.seed,event.data.language) as GlobalMapProject['naturalGeography'];
    if(action==='regenerateRivers')project.naturalGeography=generateNaturalGeography(pack,climate,project.settings.seed,event.data.language,{lakes:project.naturalGeography?.lakes}) as GlobalMapProject['naturalGeography'];
    if(action==='editNatural'){if(!project.naturalGeography||!event.data.patch)throw Error('Missing natural feature');project.naturalGeography=editNaturalGeography(pack,climate,project.naturalGeography,event.data.patch);}
    if(project.naturalGeography){
     const hydro=deriveHydrology(pack,climate,project.naturalGeography,{repairProjection:action!=='editRivers'||event.data.project?.riverEdit?.geometryChanged===false});
     if(action==='editRivers')project.naturalGeography=relinkNaturalRivers(pack,project.naturalGeography,hydro);
     report({stage:'ecosystems',fraction:.95});
     natural=projectNaturalGeography(pack,project.naturalGeography,hydro,derivePackEcosystems(pack,hydro)) as NaturalMapDrawing;
     naturalCache={climate,key:keyForNatural(),drawing:natural};
    }
   }
  }
  validateGlobalMapProject(project);
  report({stage:'drawing',fraction:.98});
  const drawing=createGlobalMapDrawing(state.grid,state.geography.ocean,[],tectonics,climate,packedCoast(state.grid,state.geography.ocean,project.terrain.oceanSeed));
  drawing.natural=natural;
  drawing.plateBoundaries=tectonics.drawing;
  drawing.plateCount=tectonics.plateCount;
  report({stage:'complete',fraction:1});
  self.postMessage({id,project,drawing});
 }catch(error){self.postMessage({id,error:error instanceof Error?error.message:String(error)});}
};
