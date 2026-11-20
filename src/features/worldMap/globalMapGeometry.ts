export type NaturalMapDrawing={
 pack:{cells:number;gridParents:Uint32Array;rings:number[][][];detail:number};
 ecosystems:{surface:Uint8Array;seabed:Uint8Array;evidence:Uint8Array;catalog:string[][];scheme:string;level:number;subterraneanInferred:boolean};
 rivers:{id:string;name:string;parentId:string|null;lines:number[][][];monthly:number[];catchmentAreaKm2:number;lengthKm:number;basinId:string}[];
 lakes:{id:string;name:string;rings:number[][][];waterLevelM:number;spillM:number;areaKm2:number;months:{inflowM3:number;evaporationM3:number;outflowM3:number;storageM3:number;storageChangeM3:number;balanceErrorM3:number;dry:boolean}[]}[];
};
import {projectClimate} from '../../../experiments/spherical-grid/climate-display.mjs';
import {createTectonicSymbols} from '../../../experiments/spherical-grid/tectonic-drawing.mjs';
/** Spherical Voronoi cell polygons, projected only for display; no heights are changed. */
export type GlobalMapDrawing={contours?:{height:number;lines:number[][][]}[];land:number[][][];coast:number[][][];landPercent:number;natural?:NaturalMapDrawing;climate?:ReturnType<typeof projectClimate>;plateBoundaries?:number[][][];plateCount?:number;tectonicSymbols?:ReturnType<typeof createTectonicSymbols>;relief?:{color:string;rings:number[][][]}[];plates?:{id:number;areaPercent:number;color:string;rings:number[][][]}[];
 geology?:{segments:{mode:string;activity:number;lines:number[][][]}[];volcanoes:number[][];islandChains:number[][][];activeMountains:number;historicalMountains:number}};
type Grid={points:number[][];triangles:number[][];areas:Float64Array;heights?:ArrayLike<number>};
const dot=(a:number[],b:number[])=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const sub=(a:number[],b:number[])=>a.map((v,i)=>v-b[i]);
const cross=(a:number[],b:number[])=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const unit=(a:number[])=>{const n=Math.hypot(...a);return a.map(v=>v/n);};
const project=(p:number[])=>[Math.atan2(p[1],p[0])*180/Math.PI,Math.asin(Math.max(-1,Math.min(1,p[2])))*180/Math.PI];
export function unwrapRing(points:number[][],pole?:number){
 const out=points.map(p=>[...p]);
 for(let i=1;i<out.length;i++){
  while(out[i][0]-out[i-1][0]>180)out[i][0]-=360;
  while(out[i][0]-out[i-1][0]<-180)out[i][0]+=360;
 }
 if(pole!==undefined&&out.length&&Math.abs(out.at(-1)![0]-out[0][0])>180)
  out.push([out.at(-1)![0],pole],[out[0][0],pole]);
 const shift=Math.floor((out.reduce((s,p)=>s+p[0],0)/out.length+180)/360)*360;
 return out.map(([x,y])=>[x-shift,y]);
}
type TectonicDrawingInput={version:number;domains:{owners:Int16Array;plates:{id:number;areaPercent?:number;areaKm2:number;seedCell:number;pole:number[];angularSpeed:number}[]};
 boundaries:{type:string;normal?:number[];smoothedNormal?:number[];center?:number[];plates:number[];subductingPlate?:number|null;overridingPlate?:number|null;mode:string;activity?:number;segmentId?:number;start:number[];end:number[]}[];
 features?:{displaySegmentIds:number[];volcanoes:{cell:number}[];islandChains:{cells:number[]}[];orogenProvinces:{activeCells:number;historicalCells:number}}};
export function createGlobalMapDrawing(grid:Grid,ocean:Uint8Array,coast:{start:number[];end:number[]}[],tectonics?:TectonicDrawingInput,climate?:Parameters<typeof projectClimate>[1]):GlobalMapDrawing {
 const around:number[][][]=Array.from({length:grid.points.length},()=>[]);
 for(const face of grid.triangles){
  const [a,b,c]=face.map(i=>grid.points[i]);let center=unit(cross(sub(b,a),sub(c,a)));
  if(dot(center,a)<0)center=center.map(v=>-v);
  for(const i of face)around[i].push(center);
 }
 const cellRings:number[][][]=new Array(grid.points.length);
 const land:number[][][]=[];let area=0,total=0;
 const palette=['#17364e','#20506b','#2b6b86','#418fa6','#76b6c6','#b3d6d4','#8eb57a','#b4bf85','#bba776','#9e876c','#d1c6b5','#eeeae2'];
 const relief=palette.map(color=>({color,rings:[] as number[][][]}));
 const totalArea=grid.areas.reduce((s,a)=>s+a,0);
 const plates=tectonics?.domains.plates.map(p=>({id:p.id,areaPercent:p.areaPercent??100*p.areaKm2/totalArea,
  color:`hsl(${Math.round(p.id*137.508)%360} 48% 65%)`,rings:[] as number[][][]}));
 for(let i=0;i<grid.points.length;i++){
  total+=grid.areas[i];if(!ocean[i])area+=grid.areas[i];
  if(ocean[i]&&!grid.heights&&!plates)continue;
  const p=grid.points[i],x=unit(Math.abs(p[2])<.9?cross([0,0,1],p):cross([0,1,0],p)),y=cross(p,x);
  around[i].sort((a,b)=>Math.atan2(dot(a,y),dot(a,x))-Math.atan2(dot(b,y),dot(b,x)));
  const ring=unwrapRing(around[i].map(project),p[2]>0?90:-90);
  cellRings[i]=ring;
  if(!ocean[i])land.push(ring);
  if(plates&&tectonics)plates[tectonics.domains.owners[i]].rings.push(ring);
  if(grid.heights){
   const h=grid.heights[i];
   const band=h<0?(h< -65?0:h< -45?1:h< -25?2:h< -10?3:h< -3?4:5):6+Math.min(5,Math.floor(h/17));
   relief[band].rings.push(ring);
  }
 }
 const geology=tectonics?.features?{
  segments:tectonics.boundaries.filter(b=>['subduction','mid-ocean-ridge'].includes(b.mode)&&tectonics.features!.displaySegmentIds.includes(b.segmentId!)).map(b=>({mode:b.mode,activity:b.activity??0,lines:[unwrapRing([project(b.start),project(b.end)])]})),
  volcanoes:tectonics.features.volcanoes.map(v=>project(grid.points[v.cell])),
  islandChains:tectonics.features.islandChains.map(c=>unwrapRing(c.cells.map(i=>project(grid.points[i])))),
  activeMountains:tectonics.features.orogenProvinces.activeCells,historicalMountains:tectonics.features.orogenProvinces.historicalCells}:undefined;
 return {land,plates,geology,contours:grid.heights?createHeightContours(grid):undefined,climate:climate?projectClimate(grid,climate,cellRings):undefined,tectonicSymbols:tectonics?.version===3?createTectonicSymbols(grid,tectonics):undefined,relief:grid.heights?relief:undefined,coast:coast.map(c=>unwrapRing([project(c.start),project(c.end)])),landPercent:area/total*100};
}

/** Piecewise-linear isolines on spherical triangles; never draw whole cell borders as contours. */
export function createHeightContours(grid:Grid){
 const bands=[-65,-45,-25,-10,-3,0,17,34,51,68,85].map(height=>({height:height*100,lines:[] as number[][][]}));
 if(!grid.heights)return bands;
 for(const face of grid.triangles){
  const heights=face.map(i=>grid.heights![i]),low=Math.min(...heights),high=Math.max(...heights);
  for(const band of bands){const level=band.height/100;if(level<=low||level>high)continue;
   const hits:number[][]=[];
   for(let i=0;i<3;i++){const j=(i+1)%3,a=heights[i],b=heights[j];if((a<level)===(b<level))continue;const t=(level-a)/(b-a),p=grid.points[face[i]],q=grid.points[face[j]];hits.push(project(unit(p.map((v,k)=>v+(q[k]-v)*t))));}
   if(hits.length===2)band.lines.push(unwrapRing(hits));
  }
 }
 return bands;
}
