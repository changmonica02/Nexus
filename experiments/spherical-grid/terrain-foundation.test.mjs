import test from 'node:test';
import assert from 'node:assert/strict';
import {buildIrregularSphere} from '../../src/features/worldMap/core/irregularSphere.mjs';
import {heightFieldChecksum,isTerrainHeight} from '../../src/features/worldMap/core/terrainField.mjs';
import {buildDrainageGraph} from '../../src/features/worldMap/core/drainage.mjs';
import {createCoastSurface,shorelineIntersection} from '../../src/features/worldMap/core/coastSurface.mjs';
import {shapeRiverCourse} from '../../src/features/worldMap/core/riverCourse.mjs';
import {createGlobalGrid} from './global-config.mjs';
import {openGlobalTerrain} from './terrain-edits.mjs';
import {exportGlobalTerrainSnapshot,importGlobalTerrainSnapshot} from './snapshot.mjs';
import {generateSphericalPack,createPackedCoast} from './spherical-pack.mjs';
import {generateNaturalGeography,deriveHydrology,reconnectDrainage,drainageOrder} from './pack-hydrology.mjs';
const point=(lon,lat=0)=>{lon*=Math.PI/180;lat*=Math.PI/180;return [Math.cos(lat)*Math.cos(lon),Math.cos(lat)*Math.sin(lon),Math.sin(lat)];};
test('irregular Grid keeps a closed sphere with varied adjacency and deterministic geometry',()=>{
 const a=buildIrregularSphere(12),b=buildIrregularSphere(12),n=a.points.length;
 assert.equal(n,1442);assert.equal(a.triangles.length,2*n-4);assert.deepEqual(a,b);assert.ok(a.neighbors.filter(ns=>ns.length!==6).length>n*.1);
 assert.ok(a.points.every(p=>Math.abs(Math.hypot(...p)-1)<1e-12));assert.ok(a.areas.every(x=>x>0));assert.ok(Math.abs(a.areas.reduce((s,x)=>s+x,0)/(4*Math.PI*6371**2)-1)<1e-9);
 assert.ok(a.neighbors.every((ns,i)=>ns.every(j=>a.neighbors[j].includes(i))));
});
test('metre-scale heights survive compact JSON and checksum detects sub-100-metre edits',()=>{
 const grid=createGlobalGrid();grid.heights.set(grid.points.map(p=>p[0]>0?3.47:-20));const state=openGlobalTerrain(grid,grid.heights.findIndex(h=>h<0)),snapshot=exportGlobalTerrainSnapshot(state),restored=importGlobalTerrainSnapshot(JSON.parse(JSON.stringify(snapshot)));
 assert.equal(snapshot.version,2);assert.ok(snapshot.heights.includes(3.47));assert.deepEqual(restored.grid.heights,grid.heights);assert.deepEqual(restored.grid.points,grid.points);
 assert.notEqual(heightFieldChecksum([3.47]),heightFieldChecksum([3.48]));assert.equal(isTerrainHeight(3.47),true);assert.equal(isTerrainHeight(.0001),false);assert.equal(isTerrainHeight(NaN),false);
});
test('flat drainage follows outlet distance without adding fake elevations or traversal-order slopes',()=>{
 const positions=[0,.1,1,2,3,3.9,4],grid={points:positions.map(x=>point(x)),heights:Float32Array.from([-1,10,10,10,10,10,-1]),neighbors:positions.map((_,i)=>[i-1,i+1].filter(j=>j>=0&&j<positions.length))},before=grid.heights.slice(),a=buildDrainageGraph(grid);
 assert.deepEqual(grid.heights,before);assert.ok([...a.filled].slice(1,-1).every(x=>x===10));assert.equal(a.receivers[2],1);assert.equal(a.receivers[4],5);
 for(let i=0;i<a.receivers.length;i++)if(a.receivers[i]>=0)assert.ok(a.rank[a.receivers[i]]<a.rank[i]);
 const reverse={points:[...grid.points].reverse(),heights:Float32Array.from([...grid.heights].reverse()),neighbors:[...grid.neighbors].reverse().map(ns=>ns.map(j=>6-j))},b=buildDrainageGraph(reverse);
 for(const i of [1,2,4,5])assert.equal(6-b.receivers[6-i],a.receivers[i]);
});
function inside(p,ring){let hit=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit;}
for(const axis of [0,2])test(`closed coast and land fill agree at Grid sites including pole / seam case ${axis}`,()=>{
 const grid=buildIrregularSphere(12),ocean=Uint8Array.from(grid.points,p=>p[axis]>.15?0:1),surface=createCoastSurface(grid,ocean);
 assert.ok(surface.coast.length>0);assert.ok(surface.coast.every(([a,b])=>Math.abs(a[0]-b[0])<=180));
 let errors=0;
 for(let i=0;i<grid.points.length;i++){const p=grid.points[i],ll=[Math.atan2(p[1],p[0])*180/Math.PI,Math.asin(p[2])*180/Math.PI];let parity=surface.inverse;for(const ring of surface.land)for(const shift of [-360,0,360])if(inside([ll[0]+shift,ll[1]],ring))parity=!parity;if(parity!==(ocean[i]===0))errors++;}
 assert.equal(errors,0,'smoothing must not reverse the classification at a Grid site');
});
test('coast intersection handles horizontal map wrapping',()=>{
 const hit=shorelineIntersection([179,10],[-179,10],[[[179.9,9],[179.9,11]]]);assert.ok(hit);assert.ok(Math.abs(hit[0]-179.9)<1e-8);assert.equal(hit[1],10);
});
test('river curves keep confluence anchors, truncate sea mouths and retain source geometry',()=>{
 const grid={...buildIrregularSphere(14)};grid.heights=Float32Array.from(grid.points,p=>p[0]<-.2?-20:Math.round((4+6*p[0])*100)/100);
 const pack=generateSphericalPack(grid),climate={months:Array.from({length:12},()=>({temperature:new Float32Array(grid.points.length).fill(18),precipitation:new Float32Array(grid.points.length).fill(120)}))},base=generateNaturalGeography(pack,climate,42),hydro=deriveHydrology(pack,climate,base),before=JSON.stringify(base);
 assert.ok(base.rivers.length>0);let clipped=0;
 for(const river of base.rivers.slice(0,40)){
  const shaped=shapeRiverCourse(pack,river),last=shaped.points.at(-1);assert.deepEqual(shaped.points[0],river.geometry[0]);assert.equal(shaped.sourceSegments.length,shaped.points.length-1);
  assert.ok(shaped.points.every(p=>p.every(Number.isFinite)));
  for(const p of river.geometry.slice(0,-1))assert.ok(shaped.points.some(q=>q[0]===p[0]&&q[1]===p[1]));
  if(river.parentId){assert.deepEqual(last,river.geometry.at(-1));const child=hydro.rivers.find(r=>r.id===river.id),parent=hydro.rivers.find(r=>r.id===river.parentId);assert.ok(parent.streamOrder>=child.streamOrder);}
  if(!river.parentId&&!river.mouthLakeId&&pack.heights[pack.findCell(river.geometry.at(-1))]<0){assert.notDeepEqual(last,river.geometry.at(-1));clipped++;}
 }
 assert.ok(clipped>0);assert.equal(JSON.stringify(base),before);
});

test('Pack reprojection reconnects surrounding drainage without moving authored channels',()=>{
 const pack={points:[0,1,2,3].map(x=>point(x)),heights:[-1,2,4,6],neighbors:[[1],[0,2],[1,3],[2]]};
 const receiver=new Int32Array([-1,2,1,2]),locked=new Uint8Array([0,0,1,0]);
 reconnectDrainage(pack,receiver,locked);assert.equal(receiver[2],1);assert.equal(receiver[1],0);assert.equal(drainageOrder(receiver).order.length,4);
 const invalid=new Int32Array([-1,2,1,2]);assert.throws(()=>reconnectDrainage(pack,invalid,new Uint8Array([0,1,1,0])),/cycle/);
});

test('packed coast refines a stable land and sea mask across the date line and pole',()=>{
 const grid=buildIrregularSphere(12);
 for(const axis of [0,2]){
  const ocean=Uint8Array.from(grid.points,p=>p[axis]>.15?0:1);
  const surface=createPackedCoast(grid,ocean,42);
  assert.deepEqual(surface,createPackedCoast(grid,ocean,42));
  assert.notDeepEqual(surface.coast,createPackedCoast(grid,ocean,81).coast);
  assert.ok(surface.coast.length>createCoastSurface(grid,ocean).coast.length);
  assert.ok(surface.coast.every(([a,b])=>Math.abs(a[0]-b[0])<=180));
  assert.ok(surface.shorelines.every((line,i)=>line.length<=surface.land[i].length));
  for(const [i,p] of grid.points.entries()){
   const lon=Math.atan2(p[1],p[0])*180/Math.PI,lat=Math.asin(p[2])*180/Math.PI;
   let land=surface.inverse;
   for(const ring of surface.land)for(const shift of [-360,0,360])
    if(inside([lon+shift,lat],ring))land=!land;
   assert.equal(land,!ocean[i]);
  }
 }
});
