// Whole-edit benchmark: indexed canonical coast + full Pack fallback vs full geography rebuild.
// node --expose-gc experiments/spherical-grid/indexed-terrain-benchmark.mjs
import {performance} from 'node:perf_hooks';
import {createGlobalGrid} from './global-config.mjs';
import {setHeight} from './grid.mjs';
import {openGlobalTerrain} from './terrain-edits.mjs';
import {applyComparedTerrainEdits} from './pack-update-comparison.mjs';
import {openIndexedTerrain,applyIndexedTerrainEdits} from './indexed-terrain.mjs';
const median=xs=>[...xs].sort((a,b)=>a-b)[Math.floor(xs.length/2)];
const prepare=indexed=>{
 const g=createGlobalGrid();
 for(let i=0;i<g.points.length;i++)setHeight(g,i,g.points[i][0]<0?-20:20);
 const seed=g.heights.findIndex(h=>h<0);
 return indexed?openIndexedTerrain(g,seed):openGlobalTerrain(g,seed);
};
for(const scenario of ['coast-change','dry-basin']){
 const indexedMs=[],fullMs=[];let result,oldMode;
 for(let run=0;run<5;run++){
  const a=prepare(true),b=prepare(false);
  const target=a.grid.heights.findIndex((h,i)=>h>0&&
   (scenario==='coast-change'
    ?a.grid.neighbors[i].some(j=>a.geography.ocean[j])
    :a.grid.neighbors[i].every(j=>a.grid.heights[j]>0)));
  if(target<0)throw Error('No test edit cell');
  global.gc?.();
  const t0=performance.now();
  result=applyIndexedTerrainEdits(a,[{id:target,height:-20}]);
  const t1=performance.now();
  oldMode=applyComparedTerrainEdits(b,[{id:target,height:-20}],{strategy:'full'}).mode;
  const t2=performance.now();
  if(a.geography.pack.triangles.length!==b.geography.pack.triangles.length||
   a.geography.pack.points.length!==b.geography.pack.points.length||
   Math.abs(a.geography.landAreaKm2-b.geography.landAreaKm2)>1e-4)throw Error('Non-equivalent geography');
  if(run){indexedMs.push(t1-t0);fullMs.push(t2-t1)}
 }
 const indexed=+median(indexedMs).toFixed(2),full=+median(fullMs).toFixed(2);
 console.log(JSON.stringify({scenario,gridCells:36002,repeat:4,indexedMode:result.mode,
  fullMode:oldMode,indexedMsMedian:indexed,fullMsMedian:full,
  speedup:+(full/indexed).toFixed(2),
  warning:'measured editor update only; index construction excluded; ocean BFS and Pack fallback included'}));
}
