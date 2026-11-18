import test from 'node:test';
import assert from 'node:assert/strict';
import {generateIslandsAndArchipelagos} from './island-layout-v2.mjs';
import {generateSimplifiedSeafloor,generateCompleteSphericalWorld} from './simplified-seafloor-v2.mjs';
import {SEAFLOOR,tectonicSeedFromLandMask,applyPlateSeafloor} from './plate-seafloor.mjs';

test('stage 3A is ocean-only, deterministic, and does not modify its input when proposing',()=>{
 const first=generateIslandsAndArchipelagos({seed:42,worldType:'ocean'});
 const grid=first.grid,original=grid.heights.slice();
 const a=generateSimplifiedSeafloor(grid,{worldType:'ocean'});
 const b=generateSimplifiedSeafloor(grid,{worldType:'ocean'});
 assert.deepEqual(grid.heights,original);
 assert.deepEqual(a.heights,b.heights);
 assert.deepEqual(a.zones,b.zones);
 assert.deepEqual(a.ridgeLines,b.ridgeLines);
 assert.deepEqual(a.trenchLines,b.trenchLines);
 assert.equal(a.seed,tectonicSeedFromLandMask(grid));
 assert.equal(a.mode,'simplified-skeleton');
 assert.ok(a.ridgeLines.length>=1);
 assert.ok(a.trenchLines.length>=1);
 for(let i=0;i<original.length;i++){
  if(original[i]>=0){assert.equal(a.heights[i],original[i]);assert.equal(a.zones[i],0);}
  else {assert.ok(a.heights[i]<=-1&&a.heights[i]>=-100);assert.ok(a.zones[i]>=1&&a.zones[i]<=6);}
 }
 assert.ok(a.zones.includes(SEAFLOOR.shelf));
 assert.ok(a.zones.includes(SEAFLOOR.slope));
 assert.ok(a.zones.includes(SEAFLOOR.abyssalPlain));
 assert.ok(a.zones.includes(SEAFLOOR.midOceanRidge));
 assert.ok(a.zones.includes(SEAFLOOR.trench));
 assert.ok(a.zones.includes(SEAFLOOR.seamount));
 assert.ok(a.submarineVolcanoes.length>0);
 const applied=applyPlateSeafloor(grid,a);
 assert.ok(applied.changed>0);
 assert.equal(tectonicSeedFromLandMask(grid),a.seed);
 for(let i=0;i<original.length;i++)if(original[i]>=0)assert.equal(grid.heights[i],original[i]);
});
test('three completed world types preserve counts and coastline and include seafloor features',()=>{
 for(const [worldType,seed] of [['ocean',1729],['earthlike',42],['land',3]]){
  const world=generateCompleteSphericalWorld({seed,worldType});
  assert.equal(world.stage,'complete-simplified-bathymetry');
  assert.equal(world.continentCount,worldType==='ocean'?4:6);
  assert.ok(world.islandsGenerated>=9&&world.islandsGenerated<=13);
  assert.ok(world.archipelagosGenerated>=4&&world.archipelagosGenerated<=7);
  assert.ok(world.ridgeCount>=1&&world.trenchCount>=1);
  assert.ok(world.applied.landPreserved&&world.applied.coastPreserved);
  assert.ok(world.grid.heights.every(x=>Number.isInteger(x)&&x>=-100&&x<=100));
  assert.ok(world.seafloor.submarineVolcanoes.every(c=>world.grid.heights[c.gridCell]<0));
 }
});
