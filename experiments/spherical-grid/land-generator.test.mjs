import test from 'node:test';
import assert from 'node:assert/strict';
import {createLandLayout,confirmLandLayout,reopenConfirmedLandLayout} from './land-generator.mjs';

test('the three land presets are area-weighted, not pixel-count weighted',()=>{
 for(const landPercent of [25,32,45]){
  const result=createLandLayout({seed:1729,landPercent,continentCores:8});
  assert.equal(result.grid.points.length,36002);
  assert.ok(Math.abs(result.measuredLandPercent-landPercent)<=result.tolerancePercent);
  assert.ok(result.grid.heights.every(h=>h===20||h===-20));
  assert.equal(result.grid.heights[result.oceanSeed],-20);
 }
});
test('same seed and settings reproduce identical global terrain',()=>{
 const a=createLandLayout({seed:88123,landPercent:32,continentCores:9});
 const b=createLandLayout({seed:88123,landPercent:32,continentCores:9});
 assert.deepEqual(a.grid.heights,b.grid.heights);
 assert.equal(a.oceanSeed,b.oceanSeed);
});
test('invalid generation settings fail before constructing grid',()=>{
 for(const opts of [
  {seed:-1},{seed:1.2},{seed:1,landPercent:31},
  {seed:1,continentCores:5},{seed:1,continentCores:11}
 ])assert.throws(()=>createLandLayout(opts),RangeError);
});
test('large-scale layout changes with different seeds',()=>{
 const a=createLandLayout({seed:100,landPercent:45,continentCores:6});
 const b=createLandLayout({seed:200,landPercent:45,continentCores:6});
 assert.notDeepEqual(a.grid.heights,b.grid.heights);
});

test('confirmed land layout survives versioned snapshot and reopening',()=>{
 const draft=createLandLayout({seed:654,landPercent:25,continentCores:7});
 const confirmed=confirmLandLayout(draft);
 assert.equal(confirmed.stage,'confirmed-land');
 const reopened=reopenConfirmedLandLayout(confirmed);
 assert.deepEqual(reopened.state.grid.heights,draft.grid.heights);
 assert.equal(reopened.state.oceanSeed,draft.oceanSeed);
 assert.deepEqual(reopened.settings,confirmed.settings);
});
