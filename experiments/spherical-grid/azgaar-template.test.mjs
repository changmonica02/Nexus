import test from 'node:test';
import assert from 'node:assert/strict';
import {AZGAAR_TEMPLATE_SCRIPTS} from './azgaar-template-data.mjs';
import {executeAzgaarTemplate,sampleTemplate} from './azgaar-template-engine.mjs';
import {createAzgaarSphericalLandLayout,planAzgaarPlacements} from './azgaar-spherical-land.mjs';
import {exportGlobalTerrainSnapshot,importGlobalTerrainSnapshot} from './snapshot.mjs';

test('every selected Azgaar recipe executes deterministically with finite heights',()=>{
 for(const name of Object.keys(AZGAAR_TEMPLATE_SCRIPTS)){
  const a=executeAzgaarTemplate(name,71),b=executeAzgaarTemplate(name,71);
  assert.deepEqual(a.heights,b.heights, name);
  assert.ok(a.heights.some(h=>h>20),name+' needs land');
  assert.ok(a.heights.every(h=>Number.isFinite(h)&&h>=0&&h<=100),name);
  assert.equal(sampleTemplate(a,-.1,.5),0);
 }
});
test('placement counts follow the selected spec groups',()=>{
 const items=planAzgaarPlacements(33,{continentCores:8});
 const counts=type=>items.filter(item=>item.type===type).length;
 assert.equal(counts('continent'),8);
 assert.ok(counts('island')>=15&&counts('island')<=20);
 assert.ok(counts('archipelago')>=4&&counts('archipelago')<=12);
 assert.ok(items.every(x=>x.radius>0&&x.seed>=0));
});
test('spherical experiment retains fixed grid, area-weighted fraction and seed reproducibility',()=>{
 const a=createAzgaarSphericalLandLayout({seed:1729,landPercent:32,continentCores:8});
 const b=createAzgaarSphericalLandLayout({seed:1729,landPercent:32,continentCores:8});
 assert.equal(a.grid.heights.length,36002);
 assert.deepEqual(a.grid.heights,b.grid.heights);
 assert.equal(a.oceanSeed,b.oceanSeed);
 assert.ok(Math.abs(a.measuredLandPercent-32)<=a.tolerancePercent);
 assert.ok(a.grid.heights.every(h=>Number.isInteger(h)&&h>=-100&&h<=100));
 assert.ok(a.grid.heights[a.oceanSeed]<0);
 assert.ok(new Set(a.grid.heights).size>4,'template relief should survive');
 const snapshot=exportGlobalTerrainSnapshot({grid:a.grid,oceanSeed:a.oceanSeed,revision:0});
 assert.deepEqual(importGlobalTerrainSnapshot(snapshot).grid.heights,a.grid.heights);
});
test('different seeds and land presets produce valid distinct terrain',()=>{
 const first=createAzgaarSphericalLandLayout({seed:3,landPercent:25,continentCores:6});
 const second=createAzgaarSphericalLandLayout({seed:4,landPercent:45,continentCores:6});
 assert.notDeepEqual(first.grid.heights,second.grid.heights);
 for(const [value,target] of [[first,25],[second,45]])
  assert.ok(Math.abs(value.measuredLandPercent-target)<=value.tolerancePercent);
});
test('invalid settings rejected before allocating the Grid',()=>{
 for(const params of [{seed:-1},{seed:1,landPercent:30},{seed:1,continentCores:5}])
  assert.throws(()=>createAzgaarSphericalLandLayout(params),RangeError);
});
