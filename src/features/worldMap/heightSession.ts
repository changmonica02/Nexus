import {heightBrushChanges,heightStrokeChanges,sampleHeightStroke} from './core/heightBrush.mjs';
import {heightChecksum,type GlobalMapProject} from './globalMapProject';
import type {GlobalMapDrawing} from './globalMapGeometry';
import type {HeightBrush,HeightStroke,GlobalMapResult} from './globalMapClient';

/** Local source-grid preview only. No environment derivation or worker request. */
export function heightSessionDrawing(project:GlobalMapProject,drawing:GlobalMapDrawing):GlobalMapDrawing {
 const mesh=drawing.scalarMesh;
 if(!mesh)return drawing;
 return {...drawing,scalarMesh:{...mesh,heights:project.terrain.heights,tintHeights:undefined,oceanMask:Uint8Array.from(project.terrain.heights,h=>h<0?1:0)}};
}
export function applyHeightSession(value:GlobalMapResult,operation:{brush?:HeightBrush;stroke?:HeightStroke}):GlobalMapResult {
 const mesh=value.drawing.scalarMesh;
 if(!mesh?.neighbors||!mesh.heights)throw Error('Height grid is not ready');
 const terrain=value.project.terrain,grid={...mesh,neighbors:mesh.neighbors,heights:terrain.heights};
 const edits=operation.stroke?heightStrokeChanges(grid,sampleHeightStroke(operation.stroke.brush,operation.stroke.points)):heightBrushChanges(grid,operation.brush);
 const changed=edits.filter(({id,height}:{id:number;height:number})=>terrain.heights[id]!==Math.fround(height));
 if(!changed.length)return value;
 const heights=terrain.heights.slice();for(const {id,height} of changed)heights[id]=Math.fround(height);
 let oceanSeed=terrain.oceanSeed;
 if(changed.some(({id,height}:{id:number;height:number})=>(terrain.heights[id]<0)!==(height<0))){
  const seen=new Uint8Array(heights.length);let largest=0;
  for(let i=0;i<heights.length;i++)if(heights[i]<0&&!seen[i]){
   const queue=[i];seen[i]=1;
   for(let k=0;k<queue.length;k++)for(const j of mesh.neighbors[queue[k]])if(heights[j]<0&&!seen[j]){seen[j]=1;queue.push(j);}
   const area=queue.reduce((s,c)=>s+(mesh.areas?.[c]??1),0);
   if(area>largest){largest=area;oceanSeed=i;}
  }
  if(!largest)throw Error('At least one ocean cell must remain');
 }
 const project:GlobalMapProject={...value.project,environmentTerrain:value.project.climateVersion===2?(value.project.environmentTerrain??terrain):undefined,terrain:{...terrain,heights,oceanSeed,checksum:heightChecksum(heights),revision:terrain.revision+1}};
 return {project,drawing:heightSessionDrawing(project,value.drawing)};
}
