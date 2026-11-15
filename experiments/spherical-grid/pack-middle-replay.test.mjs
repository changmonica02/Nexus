import test from 'node:test';
import assert from 'node:assert/strict';
import {createGlobalGrid} from './global-config.mjs';
import {oceanConnected} from './pack.mjs';
import {createSphericalPack,replaySphericalPackSuffix,canExtendSphericalPack} from './pack-mesh.mjs';
import {openIndexedTerrain,applyIndexedTerrainEdits} from './indexed-terrain.mjs';

const choices=g=>[1,Math.floor(g.points.length/2),g.points.length-1];
function exact(a,b){
 assert.deepEqual(a.points,b.points);
 assert.deepEqual(a.triangles,b.triangles);
 assert.deepEqual(a.neighbors,b.neighbors);
 assert.deepEqual(a.areas,b.areas);
 assert.deepEqual(a.heights,b.heights);
 assert.deepEqual(a.sourceIds,b.sourceIds);
 assert.deepEqual(a.siteKeys,b.siteKeys);
 assert.deepEqual(a.coastEdges,b.coastEdges);
}
test('36,002: inserting an island in the middle of ordered coastal sites equals full Delaunay rebuild',()=>{
 const g=createGlobalGrid();g.heights.fill(-20);
 const [first,middle,last]=choices(g);
 g.heights[first]=20;g.heights[last]=20;
 const previous=createSphericalPack(g,oceanConnected(g,0));
 g.heights[middle]=20;
 const ocean=oceanConnected(g,0);
 assert.equal(canExtendSphericalPack(g,ocean,previous),false);
 const result=replaySphericalPackSuffix(g,ocean,previous);
 assert.ok(result,'should retain a nonzero unchanged prefix');
 assert.ok(result.retainedCoastalSites>0);
 assert.ok(result.undoneCoastalSites>0);
 assert.ok(result.replayedCoastalSites>result.undoneCoastalSites);
 exact(result.pack,createSphericalPack(g,ocean));
 assert.equal(result.pack.skipped,0);
 assert.equal(result.pack.dualUpdateMode,'incremental');
 assert.ok(result.pack.updatedDualCells<100);
 assert.ok(result.pack.updatedDualFaces<100);
});
test('36,002: deleting a middle island rolls back and replays its coastal suffix',()=>{
 const g=createGlobalGrid();g.heights.fill(-20);
 const [first,middle,last]=choices(g);
 for(const i of [first,middle,last])g.heights[i]=20;
 const previous=createSphericalPack(g,oceanConnected(g,0));
 g.heights[middle]=-20;
 const ocean=oceanConnected(g,0);
 const result=replaySphericalPackSuffix(g,ocean,previous);
 assert.ok(result);
 assert.ok(result.retainedCoastalSites>0);
 assert.ok(result.undoneCoastalSites>0);
 exact(result.pack,createSphericalPack(g,ocean));
 assert.equal(result.pack.dualUpdateMode,'incremental');
 assert.ok(result.pack.updatedDualCells<100);
});
test('36,002: indexed terrain automatically uses middle-coast replay for insertion and removal',()=>{
 const g=createGlobalGrid();g.heights.fill(-20);
 const [first,middle,last]=choices(g);
 g.heights[first]=20;g.heights[last]=20;
 const state=openIndexedTerrain(g,0);
 const added=applyIndexedTerrainEdits(state,[{id:middle,height:20}]);
 assert.equal(added.mode,'incremental-pack-replay');
 exact(state.geography.pack,createSphericalPack(g,oceanConnected(g,0)));
 const removed=applyIndexedTerrainEdits(state,[{id:middle,height:-20}]);
 assert.equal(removed.mode,'incremental-pack-replay');
 exact(state.geography.pack,createSphericalPack(g,oceanConnected(g,0)));
 assert.equal(state.incrementalPackUpdates,2);
 assert.equal(state.fullPackRebuilds,1);
});
test('land/ocean inversion must not retain a matching coastline edge with wrong Grid parent',()=>{
 const g=createGlobalGrid();g.heights.fill(-20);
 const land=g.points.length-1;
 const original=new Uint8Array(g.points.length).fill(1);original[land]=0;
 const initial=createSphericalPack(g,original);
 const inverted=Uint8Array.from(original,v=>v?0:1);
 assert.deepEqual(initial.coastEdges,createSphericalPack(g,inverted).coastEdges);
 assert.equal(canExtendSphericalPack(g,inverted,initial),false);
 assert.equal(replaySphericalPackSuffix(g,inverted,initial),null);
});
test('middle replay cannot claim incremental success without a retained prefix',()=>{
 const g=createGlobalGrid();g.heights.fill(-20);
 g.heights[g.points.length-1]=20;
 const previous=createSphericalPack(g,oceanConnected(g,0));
 g.heights.fill(-20);
 g.heights[1]=20;
 assert.equal(replaySphericalPackSuffix(g,oceanConnected(g,0),previous),null);
});

test('36,002: varied ordered coast changes preserve all dual polygons, adjacency and total area',()=>{
 for(const indices of [[2,15000,35998],[7,19500,35994],[90,17000,35800]]){
  const grid=createGlobalGrid();grid.heights.fill(-20);
  const [first,middle,last]=indices;
  grid.heights[first]=20;grid.heights[last]=20;
  const state=openIndexedTerrain(grid,0);
  for(const height of [20,-20,20]){
   const result=applyIndexedTerrainEdits(state,[{id:middle,height}]);
   const full=createSphericalPack(grid,oceanConnected(grid,0));
   exact(state.geography.pack,full);
   assert.ok(state.geography.pack.areas.every(a=>a>0));
   assert.ok(['incremental-pack-replay','coast-patch-pack-rebuild'].includes(result.mode));
   if(result.mode==='incremental-pack-replay'){
    assert.equal(state.geography.pack.dualUpdateMode,'incremental');
    assert.ok(state.geography.pack.updatedDualCells<grid.points.length/2);
   }
  }
 }
});
