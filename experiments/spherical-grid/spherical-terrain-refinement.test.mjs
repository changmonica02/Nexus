import test from 'node:test';
import assert from 'node:assert/strict';
import {createAzgaarSphericalLandLayout} from './azgaar-spherical-land-legacy.mjs';
import {refineSphericalTerrain} from './spherical-terrain-refinement.mjs';
const area=(g)=>g.heights.reduce((sum,h,i)=>sum+(h>=0?g.areas[i]:0),0);
test('refinement is reproducible, area-constrained and leaves deep oceans untouched',()=>{
 const options={seed:1729,landPercent:32,continentCores:8};
 const a=createAzgaarSphericalLandLayout(options),b=createAzgaarSphericalLandLayout(options);
 const before=a.grid.heights.slice(),landBefore=area(a.grid);
 const x=refineSphericalTerrain(a.grid,{seed:1729});
 const y=refineSphericalTerrain(b.grid,{seed:1729});
 assert.deepEqual(a.grid.heights,b.grid.heights);
 assert.deepEqual(x,y);
 assert.ok(Math.abs(area(a.grid)-landBefore)<=x.maxCellArea+1e-6);
 assert.ok(x.reliefChanges>0);
 for(let i=0;i<before.length;i++){
  if(before[i]<-5)assert.equal(a.grid.heights[i],before[i]);
  assert.ok(a.grid.heights[i]>=-100&&a.grid.heights[i]<=100);
 }
});
test('no-refinement switches are identity',()=>{
 const a=createAzgaarSphericalLandLayout({seed:42,landPercent:25,continentCores:8});
 const before=a.grid.heights.slice();
 const r=refineSphericalTerrain(a.grid,{seed:42,coast:false,relief:false});
 assert.deepEqual(a.grid.heights,before);
 assert.equal(r.landToSea,0);assert.equal(r.seaToLand,0);
});
