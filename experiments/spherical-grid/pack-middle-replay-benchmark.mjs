// Benchmarks middle-coast insertion and deletion with exact full reconstruction
// as reference. Run with: node --expose-gc experiments/spherical-grid/pack-middle-replay-benchmark.mjs
import {performance} from 'node:perf_hooks';
import {createGlobalGrid} from './global-config.mjs';
import {oceanConnected} from './pack.mjs';
import {createSphericalPack,replaySphericalPackSuffix} from './pack-mesh.mjs';
const median=xs=>[...xs].sort((a,b)=>a-b)[Math.floor(xs.length/2)];
for(const scenario of ['middle-insert','middle-remove']){
 const incremental=[],full=[];
 let retained=0,undone=0,replayed=0,sites=0;
 for(let iteration=0;iteration<5;iteration++){
  global.gc?.();
  const g=createGlobalGrid();g.heights.fill(-20);
  const ids=[1,Math.floor(g.points.length/2),g.points.length-1];
  for(const id of (scenario==='middle-insert'?[ids[0],ids[2]]:ids))g.heights[id]=20;
  const before=createSphericalPack(g,oceanConnected(g,0));
  g.heights[ids[1]]=scenario==='middle-insert'?20:-20;
  const nextOcean=oceanConnected(g,0);
  const t0=performance.now(),result=replaySphericalPackSuffix(g,nextOcean,before),t1=performance.now();
  if(!result)throw Error('Expected a retained prefix for middle-coast edit');
  const reference=createSphericalPack(g,nextOcean),t2=performance.now();
  if(result.pack.triangles.length!==reference.triangles.length)throw Error('triangle count');
  for(let i=0;i<result.pack.triangles.length;i++)for(let j=0;j<3;j++)
   if(result.pack.triangles[i][j]!==reference.triangles[i][j])throw Error('topology mismatch');
  for(let i=0;i<result.pack.areas.length;i++)
   if(result.pack.areas[i]!==reference.areas[i])throw Error('area mismatch');
  retained=result.retainedCoastalSites;undone=result.undoneCoastalSites;
  replayed=result.replayedCoastalSites;sites=result.pack.points.length;
  if(iteration){incremental.push(t1-t0);full.push(t2-t1)}
 }
 const incrementalMs=+median(incremental).toFixed(2),fullMs=+median(full).toFixed(2);
 console.log(JSON.stringify({gridCells:36002,scenario,repeat:4,retained,undone,replayed,
  packSites:sites,incrementalMs,fullMs,speedup:+(fullMs/incrementalMs).toFixed(2),
  exactMatch:true,note:'journal suffix replay, not arbitrary bounded local mesh update; global dual area still recalculated'}));
}
