// Benchmark: ONLY canonical coastline/area updating, NOT full Pack retriangulation.
// node --expose-gc experiments/spherical-grid/coast-index-benchmark.mjs
import {performance} from 'node:perf_hooks';
import {createGlobalGrid} from './global-config.mjs';
import {setHeight} from './grid.mjs';
import {oceanConnected,buildCoastalSamples} from './pack.mjs';
import {createCoastIndex,updateCoastIndex,coastSegments} from './coast-index.mjs';
const median=v=>[...v].sort((a,b)=>a-b)[Math.floor(v.length/2)];
const times={indexBuild:[],oceanBfs:[],localCoast:[],fullCoast:[]};
let touchedEdges=0,changedEdges=0,changedCells=0;
for(let run=0;run<6;run++){
 global.gc?.();
 const grid=createGlobalGrid();
 grid.points.forEach(([x],id)=>setHeight(grid,id,x<0?-20:20));
 const seed=grid.heights.findIndex(h=>h<0);
 const ocean=oceanConnected(grid,seed),t0=performance.now();
 const indexed=createCoastIndex(grid,ocean),t1=performance.now();
 const coast=grid.heights.findIndex((h,i)=>h>0&&grid.neighbors[i].some(j=>ocean[j]));
 setHeight(grid,coast,-20);
 const nextOcean=oceanConnected(grid,seed),t2=performance.now();
 const patched=updateCoastIndex(indexed,nextOcean),t3=performance.now();
 const rebuilt=buildCoastalSamples(grid,nextOcean),t4=performance.now();
 if(coastSegments(patched.index).length!==rebuilt.coast.length||
     Math.abs(patched.index.landAreaKm2-rebuilt.landAreaKm2)>1e-4)
  throw Error('Local canonical coast mismatch');
 touchedEdges=patched.touchedEdges;changedEdges=patched.changedEdges;changedCells=patched.changedCells;
 if(run){times.indexBuild.push(t1-t0);times.oceanBfs.push(t2-t1);
  times.localCoast.push(t3-t2);times.fullCoast.push(t4-t3)}
}
console.log(JSON.stringify({
 gridCells:36002,repeat:5,
 ...Object.fromEntries(Object.entries(times).map(([key,val])=>[key+'MsMedian',+median(val).toFixed(3)])),
 changedCells,touchedEdges,changedEdges,scope:'canonical coastline/area cache only; Pack itself remains full rebuild',
 warning:'index construction is a one-time expense per Grid; patch uses cached edge geometry'
}));
