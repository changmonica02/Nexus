import test from 'node:test';
import assert from 'node:assert/strict';
import {generateContinentsFirst} from './continent-layout-v2.mjs';
import {ISLAND_AREA_RULES,planIslandAreas,generateIslandsAndArchipelagos} from './island-layout-v2.mjs';

test('the two island classes and archipelago counts and global area bands are independently seeded',()=>{
 for(const seed of [1729,42,3]){
  const plan=planIslandAreas(seed);
  assert.deepEqual(plan,planIslandAreas(seed));
  for(const [kind,rule] of Object.entries(ISLAND_AREA_RULES)){
   const items=plan.filter(p=>p.kind===kind);
   assert.ok(items.length>=rule.minCount&&items.length<=rule.maxCount);
   assert.ok(items.every(p=>p.minPercent===rule.minPercent&&p.maxPercent===rule.maxPercent));
   assert.ok(items.every(p=>p.targetPercent>=rule.minPercent&&p.targetPercent<=rule.maxPercent));
  }
 }
 assert.throws(()=>planIslandAreas(-1),RangeError);
});
test('islands and archipelagos add only positive ocean land to the existing continental grid',()=>{
 for(const [worldType,seed] of [['ocean',1729],['earthlike',42],['land',3]]){
  const first=generateContinentsFirst({seed,worldType});
  const continentHeights=first.grid.heights.slice();
  const world=generateIslandsAndArchipelagos({seed,worldType,continents:first});
  assert.equal(world.stage,'continents-islands-archipelagos');
  assert.ok(world.preservedContinentalHeights);
  assert.ok(world.addedLandPercent>0);
  assert.equal(world.islandsGenerated,world.islands.filter(p=>p.kind!=='archipelago').length);
  assert.equal(world.archipelagosGenerated,world.islands.filter(p=>p.kind==='archipelago').length);
  assert.equal(world.islandsGenerated+world.archipelagosGenerated,world.plannedIslands.length);
  assert.ok(world.measuredLandPercent>first.measuredLandPercent-world.addedLandPercent-1e-8);
  assert.ok(world.grid.heights.every(h=>h>=-100&&h<=100));
  for(let i=0;i<continentHeights.length;i++)if(continentHeights[i]>0)
   assert.ok(world.grid.heights[i]>=continentHeights[i],'existing continent relief must remain');
  for(const patch of world.islands){
   const rule=ISLAND_AREA_RULES[patch.kind];
   assert.ok(rule);
   assert.ok(patch.visiblePercent>=rule.minPercent-1e-8);
   assert.ok(patch.visiblePercent<=rule.maxPercent+1e-8);
   assert.ok(patch.overlapRatio<=.68+1e-8);
   assert.ok(['volcano','highIsland','lowIsland','archipelago'].includes(patch.recipe));
  }
 }
});
test('complete terrain with islands and archipelagos is reproducible',()=>{
 const first=generateIslandsAndArchipelagos({seed:3,worldType:'ocean'});
 const second=generateIslandsAndArchipelagos({seed:3,worldType:'ocean'});
 assert.deepEqual(first.grid.heights,second.grid.heights);
 assert.deepEqual(first.islands,second.islands);
 assert.deepEqual(first.plannedContinents,second.plannedContinents);
});
test('mismatched or already augmented stages are rejected',()=>{
 const first=generateContinentsFirst({seed:42,worldType:'ocean'});
 assert.throws(()=>generateIslandsAndArchipelagos({seed:41,worldType:'ocean',continents:first}),RangeError);
});
