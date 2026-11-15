// Reproducible fixed-36,002 terrain edit and save/load measurement.
import {performance} from 'node:perf_hooks';
import {createGlobalGrid,GLOBAL_GRID_CELLS} from './global-config.mjs';
import {setHeight} from './grid.mjs';
import {openGlobalTerrain,applyGlobalHeightEdits} from './terrain-edits.mjs';
import {exportGlobalTerrainSnapshot,importGlobalTerrainSnapshot} from './snapshot.mjs';
const median=a=>[...a].sort((x,y)=>x-y)[Math.floor(a.length/2)];
const timings={heightOnlyMs:[],coastRebuildMs:[],serializeMs:[],restoreMs:[]};
let savedBytes=0;
for(let run=0;run<5;run++){
 global.gc?.();
 const grid=createGlobalGrid();
 grid.points.forEach(([x],i)=>setHeight(grid,i,x<0?-20:20));
 const seed=grid.heights.findIndex(h=>h<0);
 const state=openGlobalTerrain(grid,seed);
 const inland=grid.heights.findIndex(h=>h>0);
 const coastal=grid.heights.findIndex((h,i)=>h>0&&grid.neighbors[i].some(j=>state.geography.ocean[j]));
 const t0=performance.now();const vertical=applyGlobalHeightEdits(state,[{id:inland,height:40}]);const t1=performance.now();
 const coast=applyGlobalHeightEdits(state,[{id:coastal,height:-20}]);const t2=performance.now();
 const json=JSON.stringify(exportGlobalTerrainSnapshot(state));const t3=performance.now();
 const restored=importGlobalTerrainSnapshot(JSON.parse(json));const t4=performance.now();
 if(vertical.mode!=='height-only'||coast.mode!=='full-pack-rebuild'||
   restored.grid.heights[coastal]!==-20||restored.grid.points.length!==GLOBAL_GRID_CELLS)
  throw Error('Failed terrain benchmark contract');
 if(run){timings.heightOnlyMs.push(t1-t0);timings.coastRebuildMs.push(t2-t1);timings.serializeMs.push(t3-t2);timings.restoreMs.push(t4-t3);}
 savedBytes=Buffer.byteLength(json);
}
console.log(JSON.stringify({gridCells:GLOBAL_GRID_CELLS,repeat:4,
 ...Object.fromEntries(Object.entries(timings).map(([key,val])=>[key+'Median',+median(val).toFixed(2)])),
 snapshotJsonBytes:savedBytes,
 note:'Node.js CI measurements, not browser/device performance'}));
