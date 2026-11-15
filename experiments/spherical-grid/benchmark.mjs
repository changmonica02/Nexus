// Run: node --expose-gc experiments/spherical-grid/benchmark.mjs
// Median of four measured runs; first is warm-up. Not a browser benchmark.
import {performance} from 'node:perf_hooks';
import {generate,setHeight} from './grid.mjs';
import {oceanConnected,buildCoastalSamples} from './pack.mjs';
import {createSphericalPack} from './pack-mesh.mjs';
const median=xs=>[...xs].sort((a,b)=>a-b)[Math.floor(xs.length/2)];
for(const frequency of [55,60,64]){
 const gridMs=[],coastMs=[],packMeshMs=[],heapMB=[];
 let sizeBytes=0,packPoints=0,inserted=0;
 for(let run=0;run<5;run++){
  global.gc?.();
  const t0=performance.now(),g=generate(frequency),t1=performance.now();
  for(let i=0;i<g.points.length;i++)setHeight(g,i,g.points[i][0]<0?-20:20);
  const seed=g.points.findIndex(p=>p[0]<0);
  const ocean=oceanConnected(g,seed),t2=performance.now();
  const coast=buildCoastalSamples(g,ocean),t3=performance.now();
  const pack=createSphericalPack(g,ocean),t4=performance.now();
  if(coast.coastalEdgeCount===0||pack.inserted!==pack.coastEdges.length||pack.skipped)throw Error('Invalid coast refinement');
  if(run>0){
   gridMs.push(t1-t0);coastMs.push(t3-t2);packMeshMs.push(t4-t3);
   heapMB.push(process.memoryUsage().heapUsed/1048576);
  }
  packPoints=pack.points.length;inserted=pack.inserted;
  if(run===4)sizeBytes=Buffer.byteLength(JSON.stringify({
   points:pack.points,triangles:pack.triangles,sourceIds:pack.sourceIds,heights:[...pack.heights]
  }));
 }
 console.log(JSON.stringify({
  frequency,gridCells:10*frequency*frequency+2,packCells:packPoints,coastalInsertions:inserted,
  repeat:4,gridMsMedian:+median(gridMs).toFixed(1),
  coastMsMedian:+median(coastMs).toFixed(1),
  packMeshMsMedian:+median(packMeshMs).toFixed(1),
  heapUsedMBMedian:+median(heapMB).toFixed(1),
  sampleJsonBytes:sizeBytes,
  memoryKind:'Node heapUsed snapshot; not peak resident memory'
 }));
}
