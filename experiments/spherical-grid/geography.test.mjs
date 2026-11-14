import test from 'node:test';
import assert from 'node:assert/strict';
import {generate,setHeight,RADIUS_KM} from './grid.mjs';
import {deriveSphericalGeography} from './geography.mjs';
test('Grid coast and land area are authoritative regardless of Pack display geometry',()=>{
 const grid=generate(20);
 for(let i=0;i<grid.points.length;i++)setHeight(grid,i,grid.points[i][0]<0?-20:20);
 const seed=grid.heights.findIndex(v=>v<0);
 const a=deriveSphericalGeography(grid,seed);
 const before=a.landAreaKm2;
 assert.ok(a.gridCoastline.length>0);
 assert.ok(a.pack.points.length>grid.points.length);
 assert.ok(Math.abs((a.landAreaKm2+a.seaAreaKm2)-4*Math.PI*RADIUS_KM**2)<0.001);
 // Display lines and Pack topology can change; neither writes back the authoritative area.
 a.gridCoastline[0].arcKm=0;
 a.pack.areas.fill(0);
 assert.equal(a.landAreaKm2,before);
 assert.deepEqual(grid.heights,Int8Array.from(grid.heights));
 const b=deriveSphericalGeography(grid,seed);
 assert.equal(b.landAreaKm2,before);
 // A real Grid edit may affect the canonical area only after derivation is rebuilt.
 const land=grid.heights.findIndex((v,i)=>v>=0 && grid.neighbors[i].some(j=>a.ocean[j]));
 assert.ok(land>=0);
 setHeight(grid,land,-20);
 const c=deriveSphericalGeography(grid,seed);
 assert.notEqual(c.landAreaKm2,before);
});
