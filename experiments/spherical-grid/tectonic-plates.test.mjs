import test from 'node:test';
import assert from 'node:assert/strict';
import {createGlobalGrid} from './global-config.mjs';
import {analyzeSphericalPlates} from './tectonic-plates.mjs';

function preparedGrid(){
 const grid=createGlobalGrid();
 grid.heights.set(grid.points.map(([x,y,z])=>x+.18*Math.sin(7*y)>0?Math.max(1,Math.round(20+20*z*z)):-20));
 return grid;
}
test('spherical tectonic plate analysis preserves authoritative terrain and reproduces deterministic derived data',()=>{
 const grid=preparedGrid(),before=grid.heights.slice();
 const a=analyzeSphericalPlates(grid,{seed:271828,plateCount:8});
 const b=analyzeSphericalPlates(grid,{seed:271828,plateCount:8});
 assert.deepEqual(grid.heights,before);
 assert.deepEqual(a.domains.owners,b.domains.owners);
 assert.deepEqual(a.drawing,b.drawing);
 assert.equal(a.plateCount,8);
 assert.equal(a.domains.plates.length,8);
 assert.ok(a.domains.owners.every(id=>id>=0&&id<8));
 assert.ok(a.domains.plates.every(p=>p.areaKm2>0));
 assert.ok(a.boundaries.length>20);
 assert.ok(a.drawing.every(seg=>seg.length===2&&Math.abs(seg[0][0]-seg[1][0])<=180));
 assert.ok(a.boundaries.every(b=>b.plates[0]!==b.plates[1]));
 assert.ok(new Set(a.boundaries.map(b=>b.type)).size>=2);
});
test('each major plate is a connected component and boundary lines are dual-mesh segments',()=>{
 const g=preparedGrid(),a=analyzeSphericalPlates(g,{seed:13,plateCount:10});
 const visited=new Uint8Array(g.points.length);
 for(let id=0;id<a.plateCount;id++){
  const start=a.domains.plates[id].seedCell,queue=[start];visited[start]=1;
  for(let head=0;head<queue.length;head++)for(const n of g.neighbors[queue[head]])
   if(a.domains.owners[n]===id&&!visited[n]){queue.push(n);visited[n]=1;}
  assert.equal(queue.length,a.domains.owners.filter(v=>v===id).length,'plate should not be disconnected');
 }
 assert.equal(a.boundaries.length,a.drawing.length);
 for(const b of a.boundaries){
  assert.ok(g.neighbors[b.a].includes(b.b));
  assert.ok(b.start.every(Number.isFinite)&&b.end.every(Number.isFinite));
  assert.ok(b.mode&&b.type);
 }
});
test('seed determines 6..12 plates and distinct seeds change plate domains',()=>{
 const grid=preparedGrid(),a=analyzeSphericalPlates(grid,{seed:11}),b=analyzeSphericalPlates(grid,{seed:12});
 assert.ok(a.plateCount>=6&&a.plateCount<=12);
 assert.notDeepEqual(a.domains.owners,b.domains.owners);
 assert.throws(()=>analyzeSphericalPlates(grid,{seed:-1}),RangeError);
 assert.throws(()=>analyzeSphericalPlates(grid,{seed:1,plateCount:5}),RangeError);
});
test('tectonic crust categories are not coastline and plates can span land and sea',()=>{
 const grid=preparedGrid(),a=analyzeSphericalPlates(grid,{seed:213,plateCount:7});
 assert.ok(a.crust.crust.includes(0)&&a.crust.crust.includes(1)&&a.crust.crust.includes(2));
 assert.ok(a.domains.plates.some(p=>p.landAreaKm2>0&&p.landAreaKm2<p.areaKm2),'a major plate must span continent and ocean');
});
