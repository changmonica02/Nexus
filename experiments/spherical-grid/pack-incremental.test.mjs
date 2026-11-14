import test from 'node:test';
import assert from 'node:assert/strict';
import {createGlobalGrid} from './global-config.mjs';
import {setHeight} from './grid.mjs';
import {oceanConnected} from './pack.mjs';
import {createSphericalPack,extendSphericalPack,canExtendSphericalPack,canShrinkSphericalPack,shrinkSphericalPack} from './pack-mesh.mjs';
function sameGeometry(actual,expected){
 assert.deepEqual(actual.points,expected.points);
 assert.deepEqual(actual.triangles,expected.triangles);
 assert.deepEqual(actual.neighbors,expected.neighbors);
 assert.deepEqual(actual.areas,expected.areas);
 assert.deepEqual(actual.sourceIds,expected.sourceIds);
 assert.deepEqual(actual.siteKeys,expected.siteKeys);
 assert.deepEqual(actual.heights,expected.heights);
 assert.deepEqual(actual.coastEdges,expected.coastEdges);
}
test('36,002 spherical cells: append-only island coast inserts using existing Pack triangles',()=>{
 const grid=createGlobalGrid();
 grid.heights.fill(-20);
 const seed=0;
 const ocean0=oceanConnected(grid,seed);
 const original=createSphericalPack(grid,ocean0);
 assert.equal(original.coastEdges.length,0);
 // A single new island adds local coastal sites but removes no previous sites.
 const island=grid.points.length-1;
 assert.notEqual(island,seed);
 setHeight(grid,island,20);
 const ocean1=oceanConnected(grid,seed);
 assert.equal(canExtendSphericalPack(grid,ocean1,original),true);
 const beforeFaces=original.triangles.map(face=>face.slice());
 const incremental=extendSphericalPack(grid,ocean1,original);
 const reference=createSphericalPack(grid,ocean1);
 sameGeometry(incremental,reference);
 assert.ok(incremental.inserted>=5&&incremental.inserted<=6);
 assert.equal(incremental.skipped,0);
 assert.deepEqual(original.triangles,beforeFaces,'incremental extension may not mutate old Pack');
 assert.equal(original.points.length,36002);
 assert.equal(new Set(incremental.siteKeys).size,incremental.points.length);
 assert.deepEqual(incremental.siteKeys.slice(0,36002),original.siteKeys);
 assert.ok(incremental.siteKeys.slice(36002).every(key=>key.startsWith('coast:')));
});
test('ordered second island is incrementally inserted without altering previous coast sites',()=>{
 const grid=createGlobalGrid();grid.heights.fill(-20);
 const seed=0;
 // First island's coast edges sort near the beginning of the stable Grid-ID order.
 const first=1;
 setHeight(grid,first,20);
 const ocean1=oceanConnected(grid,seed),p1=createSphericalPack(grid,ocean1);
 let second=-1,ocean2=null;
 for(let i=grid.points.length-1;i>=2;i--){
  if(grid.neighbors[i].includes(first)||grid.neighbors[i].includes(seed))continue;
  setHeight(grid,i,20);
  const candidate=oceanConnected(grid,seed);
  if(canExtendSphericalPack(grid,candidate,p1)){second=i;ocean2=candidate;break}
  setHeight(grid,i,-20);
 }
 assert.ok(second>=0,'At least one append-only coastline should exist');
 const result=extendSphericalPack(grid,ocean2,p1),full=createSphericalPack(grid,ocean2);
 sameGeometry(result,full);
 assert.equal(result.inserted,result.coastEdges.length);
});
test('coastline point removal does not pass append-only eligibility',()=>{
 const grid=createGlobalGrid();grid.heights.fill(-20);
 const seed=0,island=grid.points.length-1;
 setHeight(grid,island,20);
 const before=oceanConnected(grid,seed),p=createSphericalPack(grid,before);
 setHeight(grid,island,-20);
 const after=oceanConnected(grid,seed);
 assert.equal(canExtendSphericalPack(grid,after,p),false);
 assert.throws(()=>extendSphericalPack(grid,after,p),/prefix/);
});

test('36,002: remove appended island by reversing local Delaunay edits exactly',()=>{
 const g=createGlobalGrid();g.heights.fill(-20);
 const seed=0,island=g.points.length-1;
 const initial=createSphericalPack(g,oceanConnected(g,seed));
 setHeight(g,island,20);
 const withIsland=createSphericalPack(g,oceanConnected(g,seed));
 assert.ok(withIsland.journal.length>0);
 setHeight(g,island,-20);
 const after=oceanConnected(g,seed);
 assert.equal(canShrinkSphericalPack(g,after,withIsland),true);
 const reduced=shrinkSphericalPack(g,after,withIsland);
 const full=createSphericalPack(g,after);
 sameGeometry(reduced,full);
 assert.equal(reduced.inserted,0);
 assert.equal(reduced.journal.length,0);
 assert.equal(withIsland.points.length,initial.points.length+withIsland.inserted);
});
test('cannot roll back non-suffix coastal sites',()=>{
 const g=createGlobalGrid();g.heights.fill(-20);
 const seed=0,first=1,last=g.points.length-1;
 setHeight(g,first,20);setHeight(g,last,20);
 const before=createSphericalPack(g,oceanConnected(g,seed));
 setHeight(g,first,-20);
 const ocean=oceanConnected(g,seed);
 assert.equal(canShrinkSphericalPack(g,ocean,before),false);
 assert.throws(()=>shrinkSphericalPack(g,ocean,before),/suffix/);
});

test('adding, removing and re-adding a coastal island preserves exact sphere mesh and stable site keys',()=>{
 const g=createGlobalGrid();g.heights.fill(-20);
 const seed=0,island=g.points.length-1;
 const base=createSphericalPack(g,oceanConnected(g,seed));
 setHeight(g,island,20);
 const ocean1=oceanConnected(g,seed);
 const added=extendSphericalPack(g,ocean1,base);
 setHeight(g,island,-20);
 const ocean2=oceanConnected(g,seed);
 const removed=shrinkSphericalPack(g,ocean2,added);
 sameGeometry(removed,base);
 setHeight(g,island,20);
 const ocean3=oceanConnected(g,seed);
 const again=extendSphericalPack(g,ocean3,removed);
 sameGeometry(again,createSphericalPack(g,ocean3));
 assert.deepEqual(again.siteKeys,added.siteKeys);
});
