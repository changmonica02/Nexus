import test from 'node:test';
import assert from 'node:assert/strict';
import {createGlobalGrid} from './global-config.mjs';
import {setHeight} from './grid.mjs';
import {openGlobalTerrain} from './terrain-edits.mjs';
import {deriveSphericalGeography} from './geography.mjs';
import {openIndexedTerrain,applyIndexedTerrainEdits} from './indexed-terrain.mjs';
const sorted=coast=>coast.map(s=>({id:[...s.gridEdge].sort((a,b)=>a-b).join(':'),start:s.start,end:s.end,arcKm:s.arcKm}))
 .sort((a,b)=>a.id.localeCompare(b.id));
function create(){
 const g=createGlobalGrid();
 g.points.forEach(([x],i)=>setHeight(g,i,x<0?-20:20));
 return openIndexedTerrain(g,g.heights.findIndex(h=>h<0));
}
function compare(state){
 const full=deriveSphericalGeography(state.grid,state.oceanSeed);
 assert.deepEqual(full.ocean,state.geography.ocean);
 assert.deepEqual(sorted(full.gridCoastline),sorted(state.geography.gridCoastline));
 assert.ok(Math.abs(full.landAreaKm2-state.geography.landAreaKm2)<1e-4);
 assert.ok(Math.abs(full.seaAreaKm2-state.geography.seaAreaKm2)<1e-4);
 assert.deepEqual(full.pack.points,state.geography.pack.points);
 assert.deepEqual(full.pack.triangles,state.geography.pack.triangles);
 assert.deepEqual(full.pack.neighbors,state.geography.pack.neighbors);
 assert.deepEqual(full.pack.areas,state.geography.pack.areas);
 assert.deepEqual(full.pack.sourceIds,state.geography.pack.sourceIds);
 assert.deepEqual(full.pack.heights,state.geography.pack.heights);
}
test('indexed patch: single coastal edit equals full spherical regeneration',()=>{
 const state=create(),g=state.grid,coast=g.heights.findIndex((h,i)=>h>0&&g.neighbors[i].some(j=>state.geography.ocean[j]));
 const result=applyIndexedTerrainEdits(state,[{id:coast,height:-20}]);
 assert.equal(result.mode,'coast-patch-pack-rebuild');
 assert.equal(result.changedOceanCells,1);
 assert.ok(result.touchedCoastEdges<=6);
 assert.equal(state.fullPackRebuilds,2);
 compare(state);
});
test('indexed patch: same-sign edit reuses Pack topology exactly',()=>{
 const state=create(),id=state.grid.heights.findIndex(h=>h>0),points=state.geography.pack.points;
 const result=applyIndexedTerrainEdits(state,[{id,height:90}]);
 assert.equal(result.mode,'reuse-pack-topology');
 assert.strictEqual(state.geography.pack.points,points);
 compare(state);
});
test('indexed patch: isolated below-zero basin remains dry',()=>{
 const state=create(),g=state.grid;
 const id=g.heights.findIndex((h,i)=>h>0&&g.neighbors[i].every(j=>g.heights[j]>0));
 const result=applyIndexedTerrainEdits(state,[{id,height:-20}]);
 assert.equal(result.changedOceanCells,0);
 assert.equal(state.geography.ocean[id],0);
 compare(state);
});
test('indexed patch: bad batch rejected without mutating Grid or cached coastline',()=>{
 const state=create(),old=state.geography,index=state.coastIndex;
 const inland=state.grid.heights.findIndex(h=>h>0),prior=state.grid.heights[inland];
 assert.throws(()=>applyIndexedTerrainEdits(state,[{id:inland,height:90},{id:inland,height:40}]));
 assert.throws(()=>applyIndexedTerrainEdits(state,[{id:inland,height:101}]),RangeError);
 assert.throws(()=>applyIndexedTerrainEdits(state,[{id:state.oceanSeed,height:60}]),RangeError);
 assert.equal(state.grid.heights[inland],prior);
 assert.strictEqual(state.geography,old);
 assert.strictEqual(state.coastIndex,index);
});

test('indexed all-ocean world creates first island via incremental spherical Pack insertion',()=>{
 const g=createGlobalGrid();g.heights.fill(-20);
 const state=openIndexedTerrain(g,0),island=g.points.length-1;
 const original=state.geography.pack;
 const result=applyIndexedTerrainEdits(state,[{id:island,height:20}]);
 assert.equal(result.mode,'incremental-pack-insert');
 assert.equal(state.incrementalPackUpdates,1);
 assert.equal(state.fullPackRebuilds,1);
 assert.equal(result.changedOceanCells,1);
 assert.ok(state.geography.pack.points.length>original.points.length);
 assert.equal(state.geography.pack.skipped,0);
 compare(state);
});
test('indexed island deletion can undo recorded suffix insertions safely',()=>{
 const g=createGlobalGrid();g.heights.fill(-20);
 const island=g.points.length-1;setHeight(g,island,20);
 const state=openIndexedTerrain(g,0);
 const result=applyIndexedTerrainEdits(state,[{id:island,height:-20}]);
 assert.equal(result.mode,'incremental-pack-remove');
 assert.equal(state.incrementalPackUpdates,1);
 assert.equal(state.fullPackRebuilds,1);
 assert.equal(state.geography.pack.points.length,g.points.length);
 compare(state);
});

test('indexed non-suffix coastal point deletion uses full rebuild fallback',()=>{
 const g=createGlobalGrid();g.heights.fill(-20);
 const first=1,last=g.points.length-1;
 setHeight(g,first,20);setHeight(g,last,20);
 const state=openIndexedTerrain(g,0);
 const result=applyIndexedTerrainEdits(state,[{id:first,height:-20}]);
 assert.equal(result.mode,'coast-patch-pack-rebuild');
 assert.equal(state.fullPackRebuilds,2);
 compare(state);
});
