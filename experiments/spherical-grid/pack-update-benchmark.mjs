// Apples-to-apples full rebuild vs strictly safe Pack topology reuse.
// Run: node --expose-gc experiments/spherical-grid/pack-update-benchmark.mjs
import {performance} from 'node:perf_hooks';
import {createGlobalGrid,GLOBAL_GRID_CELLS} from './global-config.mjs';
import {setHeight} from './grid.mjs';
import {openGlobalTerrain} from './terrain-edits.mjs';
import {applyComparedTerrainEdits} from './pack-update-comparison.mjs';
const median=v=>{const sorted=[...v].sort((a,b)=>a-b);return sorted[Math.floor(sorted.length/2)]};
function prepare(){
 const grid=createGlobalGrid();
 for(let i=0;i<grid.points.length;i++)setHeight(grid,i,grid.points[i][0]<0?-20:20);
 return openGlobalTerrain(grid,grid.heights.findIndex(h=>h<0));
}
function choose(state,scenario){
 const g=state.grid;
 if(scenario==='dry-basin')return g.heights.findIndex((h,i)=>h>0&&g.neighbors[i].every(j=>g.heights[j]>0));
 if(scenario==='coast-change')return g.heights.findIndex((h,i)=>h>0&&g.neighbors[i].some(j=>state.geography.ocean[j]));
 if(scenario==='height-only')return g.heights.findIndex(h=>h>0);
 throw Error('Invalid scenario');
}
function compare(a,b){
 if(a.geography.landAreaKm2!==b.geography.landAreaKm2||
    a.geography.seaAreaKm2!==b.geography.seaAreaKm2||
    a.geography.pack.points.length!==b.geography.pack.points.length)
  throw Error('Pack area or topology count mismatch');
 const A=a.geography.pack,B=b.geography.pack;
 for(let i=0;i<A.points.length;i++){
  if(A.sourceIds[i]!==B.sourceIds[i]||A.heights[i]!==B.heights[i]||
      A.areas[i]!==B.areas[i])throw Error('Pack site / area mismatch '+i);
  for(let k=0;k<3;k++)if(A.points[i][k]!==B.points[i][k])throw Error('Pack point mismatch');
 }
 if(A.triangles.length!==B.triangles.length)throw Error('Pack face count mismatch');
 for(let i=0;i<A.triangles.length;i++)for(let k=0;k<3;k++)
  if(A.triangles[i][k]!==B.triangles[i][k])throw Error('Pack topology mismatch');
}
for(const scenario of ['height-only','dry-basin','coast-change']){
 const timings={selective:[],full:[]},modes={};
 for(let iteration=0;iteration<5;iteration++){
  const states=[prepare(),prepare()];
  const cell=choose(states[0],scenario);
  if(cell<0)throw Error('No candidate for '+scenario);
  const height=scenario==='height-only'?60:-20;
  for(const [key,state] of [['selective',states[0]],['full',states[1]]]){
   global.gc?.();
   const t0=performance.now();
   const result=applyComparedTerrainEdits(state,[{id:cell,height}],{strategy:key});
   const elapsed=performance.now()-t0;
   modes[key]=result.mode;
   if(iteration)timings[key].push(elapsed);
  }
  compare(states[0],states[1]);
 }
 const selectiveMs=+median(timings.selective).toFixed(3);
 const fullMs=+median(timings.full).toFixed(3);
 console.log(JSON.stringify({
  scenario,gridCells:GLOBAL_GRID_CELLS,repeat:4,selectiveMode:modes.selective,
  referenceMode:modes.full,geometryEqual:true,
  selectiveMs,fullMs,speedup: +(fullMs/selectiveMs).toFixed(2),
  comment:scenario==='coast-change'?'fallback: no locally retriangulated Pack yet':'topology reused after ocean-mask equality'
 }));
}
