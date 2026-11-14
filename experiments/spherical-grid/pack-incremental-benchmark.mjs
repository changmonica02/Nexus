// Reproducible isolated append-only Delaunay insertion benchmark, 36,002 Grid cells.
// Run: node --expose-gc experiments/spherical-grid/pack-incremental-benchmark.mjs
import {performance} from 'node:perf_hooks';
import {createGlobalGrid} from './global-config.mjs';
import {oceanConnected} from './pack.mjs';
import {createSphericalPack,extendSphericalPack,canExtendSphericalPack} from './pack-mesh.mjs';
const median=a=>[...a].sort((x,y)=>x-y)[Math.floor(a.length/2)];
const results={extendMs:[],fullMs:[]};
let total=0,changedFaces=0;
for(let pass=0;pass<5;pass++){
 global.gc?.();
 const grid=createGlobalGrid();grid.heights.fill(-20);
 const initial=createSphericalPack(grid,oceanConnected(grid,0));
 const island=grid.points.length-1;grid.heights[island]=20;
 const ocean=oceanConnected(grid,0);
 if(!canExtendSphericalPack(grid,ocean,initial))throw Error('Expected append-only coastline');
 const t0=performance.now(),incremental=extendSphericalPack(grid,ocean,initial),t1=performance.now();
 const reference=createSphericalPack(grid,ocean),t2=performance.now();
 if(incremental.triangles.length!==reference.triangles.length)throw Error('triangle count mismatch');
 let affected=0;
 for(let i=0;i<initial.triangles.length;i++){
  if(incremental.triangles[i].some((v,j)=>v!==initial.triangles[i][j]))affected++;
 }
 for(let i=0;i<incremental.triangles.length;i++)
  if(incremental.triangles[i].some((v,j)=>v!==reference.triangles[i][j]))
   throw Error('incremental geometry does not match full build');
 for(let i=0;i<incremental.areas.length;i++)
  if(incremental.areas[i]!==reference.areas[i])throw Error('area mismatch');
 if(pass){results.extendMs.push(t1-t0);results.fullMs.push(t2-t1)}
 changedFaces=affected+(incremental.triangles.length-initial.triangles.length);
 total=incremental.triangles.length;
}
const extendMs=+median(results.extendMs).toFixed(2),fullMs=+median(results.fullMs).toFixed(2);
console.log(JSON.stringify({gridCells:36002,scenario:'first isolated island in all-ocean world',
 repeat:4,incrementalMsMedian:extendMs,fullMsMedian:fullMs,
 speedup:+(fullMs/extendMs).toFixed(2),trianglesChanged:changedFaces,totalTriangles:total,
 exactMatch:true,note:'append-only coastal insertion only; source/grid count and global dual area assembly remain O(N)'}));
