import test from 'node:test';
import assert from 'node:assert/strict';
import {CONTINENT_WORLD_TYPES,PAIR_CONTINENT_OVERLAP_MAX,TOTAL_CONTINENT_OVERLAP_MAX,
 generateContinentsFirst,planContinentalAreas} from './continent-layout-v2.mjs';

test('area plan respects each world type and does not prescribe a global land percentage',()=>{
 for(const [worldType,seed] of [['ocean',42],['earthlike',1729],['land',3]]){
  const plan=planContinentalAreas(seed,worldType);
  const rule=CONTINENT_WORLD_TYPES[worldType];
  assert.equal(plan.length,rule.count);
  assert.deepEqual(plan,planContinentalAreas(seed,worldType));
  assert.ok(plan.every(p=>p.targetPercent>=p.minPercent&&p.targetPercent<=p.maxPercent));
  assert.ok(plan.every(p=>p.minPercent===rule.ranges[p.sizeClass][0]));
  const count=kind=>plan.filter(p=>p.sizeClass===kind).length;
  if(worldType==='ocean'){
   assert.ok(count('large')<=1);
   assert.ok(count('largeMedium')>=1&&count('largeMedium')<=2);
   assert.equal(count('smallMedium'),0);
  }else if(worldType==='earthlike'){
   assert.ok(count('large')<=1);
   assert.equal(count('largeMedium'),2);
   assert.ok(count('smallMedium')>=1&&count('smallMedium')<=2);
  }else{
   assert.deepEqual([count('large'),count('largeMedium'),count('medium'),count('smallMedium')],[1,2,2,1]);
  }
 }
 assert.throws(()=>planContinentalAreas(3,'unknown'),RangeError);
 assert.throws(()=>planContinentalAreas(-1,'ocean'),RangeError);
});
test('stage-one worlds have correct count, measured continental areas and preserved ocean',()=>{
 for(const [worldType,seed] of [['ocean',1729],['earthlike',42],['land',3]]){
  const world=generateContinentsFirst({worldType,seed});
  assert.equal(world.stage,'continents-only');
  assert.equal(world.grid.heights.length,36002);
  assert.equal(world.continentCount,CONTINENT_WORLD_TYPES[worldType].count);
  assert.equal(world.continents.length,world.continentCount);
  assert.equal(world.islandsGenerated,0);
  assert.equal(world.archipelagosGenerated,0);
  assert.ok(world.grid.heights[world.oceanSeed]<0);
  assert.ok(world.grid.heights.every(h=>h>=-100&&h<=100));
  assert.ok(world.grid.heights.some(h=>h<0)&&world.grid.heights.some(h=>h>0));
  const total=world.grid.areas.reduce((a,b)=>a+b,0);
  const observed=world.grid.areas.reduce((a,x,i)=>a+(world.grid.heights[i]>0?x:0),0);
  assert.ok(Math.abs(world.measuredLandPercent-100*observed/total)<1e-8);
  for(const c of world.diagnostics){
   assert.ok(c.visiblePercent>=CONTINENT_WORLD_TYPES[worldType].ranges[c.sizeClass][0]-1e-8,c.sizeClass);
   assert.ok(c.visiblePercent<=CONTINENT_WORLD_TYPES[worldType].ranges[c.sizeClass][1]+1e-8,c.sizeClass);
   assert.ok(c.maxPairOverlap<=PAIR_CONTINENT_OVERLAP_MAX+1e-8);
   assert.ok(c.overlapRatio<=TOTAL_CONTINENT_OVERLAP_MAX+1e-8);
   assert.ok(c.dominantFraction>=.55);
  }
 }
});
test('continent layouts are deterministic without island or global quantile fallback',()=>{
 const a=generateContinentsFirst({worldType:'ocean',seed:3});
 const b=generateContinentsFirst({worldType:'ocean',seed:3});
 assert.deepEqual(a.grid.heights,b.grid.heights);
 assert.deepEqual(a.diagnostics,b.diagnostics);
 assert.ok(a.grid.heights.some(h=>h===-40),'baseline sea must remain without global land filling');
});
