// Benchmark exact suffix deletion against rebuilding all spherical Pack sites.
// node --expose-gc experiments/spherical-grid/pack-shrink-benchmark.mjs
import {performance} from 'node:perf_hooks';
import {createGlobalGrid} from './global-config.mjs';
import {oceanConnected} from './pack.mjs';
import {createSphericalPack,canShrinkSphericalPack,shrinkSphericalPack} from './pack-mesh.mjs';
const median=a=>[...a].sort((x,y)=>x-y)[Math.floor(a.length/2)];
const times={incremental:[],full:[]};
let affected=0,total=0;
for(let iteration=0;iteration<5;iteration++){
 global.gc?.();
 const g=createGlobalGrid();g.heights.fill(-20);
 const seed=0,island=g.points.length-1;g.heights[island]=20;
 const before=createSphericalPack(g,oceanConnected(g,seed));
 g.heights[island]=-20;
 const ocean=oceanConnected(g,seed);
 if(!canShrinkSphericalPack(g,ocean,before))throw Error('Expected suffix-only removal');
 const start=performance.now(),undo=shrinkSphericalPack(g,ocean,before),middle=performance.now();
 const full=createSphericalPack(g,ocean),end=performance.now();
 if(undo.triangles.length!==full.triangles.length||undo.points.length!==full.points.length)throw Error('count mismatch');
 for(let i=0;i<undo.triangles.length;i++)for(let j=0;j<3;j++)
  if(undo.triangles[i][j]!==full.triangles[i][j])throw Error('triangular mesh mismatch');
 for(let i=0;i<undo.areas.length;i++)if(undo.areas[i]!==full.areas[i])throw Error('dual area mismatch');
 if(iteration){times.incremental.push(middle-start);times.full.push(end-middle)}
 affected=before.triangles.length-undo.triangles.length;
 total=undo.triangles.length;
}
const incrementalMs=+median(times.incremental).toFixed(2),fullMs=+median(times.full).toFixed(2);
console.log(JSON.stringify({gridCells:36002,scenario:'undo last isolated island',repeat:4,
 incrementalMsMedian:incrementalMs,fullMsMedian:fullMs,
 speedup:+(fullMs/incrementalMs).toFixed(2),removedTriangleCount:affected,
 remainingTriangleCount:total,exactMatch:true,
 limitation:'reverse only a recorded trailing sequence of coastal sites; dual reconstruction still global'}));
