import test from 'node:test';
import assert from 'node:assert/strict';
import {generate,setHeight,RADIUS_KM} from './grid.mjs';
import {oceanConnected,buildCoastalSamples} from './pack.mjs';
const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
test('coast layer is derived, does not change Grid geometry, IDs or heights',()=>{
 const grid=generate(20),ids=grid.points.map((_,i)=>i),original=grid.points[0].slice();
 for(let i=0;i<grid.points.length;i++)setHeight(grid,i,grid.points[i][0]<0?-20:20);
 const seed=grid.points.findIndex((p,i)=>grid.heights[i]<0);
 const ocean=oceanConnected(grid,seed),pack=buildCoastalSamples(grid,ocean);
 assert.ok(pack.coast.length>0);assert.equal(pack.samples.length,grid.points.length+2*pack.coast.length);
 assert.deepEqual(grid.points[0],original);assert.deepEqual(grid.points.map((_,i)=>i),ids);
 assert.ok(pack.samples.every(s=>s.height===grid.heights[s.sourceId]));
 assert.ok(pack.samples.every(s=>Math.abs(dot(s.point,s.point)-1)<1e-12));
 assert.ok(pack.coast.every(s=>s.arcKm>0&&s.arcKm<1000));
 const area=grid.areas.reduce((s,x)=>s+x,0);
 assert.ok(Math.abs(area-4*Math.PI*RADIUS_KM**2)/area<1e-10);
 assert.ok(pack.landAreaKm2>0&&pack.landAreaKm2<area);
 const baseline=pack.landAreaKm2;pack.coast[0].start=[1,0,0];assert.equal(pack.landAreaKm2,baseline);
 const rerun=buildCoastalSamples(grid,ocean);assert.equal(rerun.landAreaKm2,baseline);
});
test('enclosed below-sea-level basin is dry, and rejected ocean seed stays rejected',()=>{
 const g=generate(8);g.heights.fill(20);
 let a=0,b=g.points.findIndex((_,i)=>i!==a&&!g.neighbors[a].includes(i));
 setHeight(g,a,-5);setHeight(g,b,-3);
 const ocean=oceanConnected(g,a);
 assert.equal(ocean[a],1);assert.equal(ocean[b],0);
 assert.throws(()=>oceanConnected(g,0===a?1:0),RangeError);
 const result=buildCoastalSamples(g,ocean);assert.equal(result.coast.length,g.neighbors[a].length);
});
test('coast remains valid near longitude seam and polar regions',()=>{
 const grid=generate(20);for(let i=0;i<grid.points.length;i++){
  const [x,y,z]=grid.points[i];const lon=Math.atan2(y,x);
  setHeight(grid,i,Math.abs(lon)>2.6 || z>.85?-20:20);
 }
 const seed=grid.points.findIndex((_,i)=>grid.heights[i]<0&&grid.points[i][2]>.85);
 const ocean=oceanConnected(grid,seed),p=buildCoastalSamples(grid,ocean);
 assert.ok(p.coast.length>0);
 const polar=p.coast.filter(s=>s.gridEdge.some(id=>grid.points[id][2]>.8));
 assert.ok(polar.length>0);
 assert.ok(p.coast.every(s=>Number.isFinite(s.arcKm)));
});
