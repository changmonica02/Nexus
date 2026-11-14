// Run: node --expose-gc experiments/spherical-grid/benchmark.mjs
import {performance} from 'node:perf_hooks';
import {generate,setHeight} from './grid.mjs';
import {oceanConnected,buildCoastalSamples} from './pack.mjs';
const median=xs=>[...xs].sort((a,b)=>a-b)[Math.floor(xs.length/2)];
for(const frequency of [55,60,64]){
 const gridMs=[],coastMs=[],heapMB=[];
 for(let run=0;run<5;run++){
  global.gc?.();
  const t0=performance.now(),g=generate(frequency),t1=performance.now();
  for(let i=0;i<g.points.length;i++)setHeight(g,i,g.points[i][0]<0?-20:20);
  const seed=g.points.findIndex(p=>p[0]<0);
  const ocean=oceanConnected(g,seed),t2=performance.now(),pack=buildCoastalSamples(g,ocean),t3=performance.now();
  if(run>0){gridMs.push(t1-t0);coastMs.push(t3-t2);heapMB.push(process.memoryUsage().heapUsed/1048576)}
  if(pack.coastalEdgeCount===0)throw Error('No coastal edges');
 }
 console.log(JSON.stringify({frequency,cells:10*frequency*frequency+2,repeat:4,gridMsMedian:+median(gridMs).toFixed(1),coastMsMedian:+median(coastMs).toFixed(1),heapUsedMBMedian:+median(heapMB).toFixed(1),memoryKind:'Node.js heapUsed snapshot (not peak RSS or device memory)'}));
}
