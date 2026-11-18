import test from 'node:test';
import assert from 'node:assert/strict';
import {executeOriginalAzgaarContinent} from './azgaar-original-continent.mjs';
import {createGlobalGrid} from './global-config.mjs';
import {pose,project} from './continent-layout-v2.mjs';
import {templateRng} from './azgaar-template-engine.mjs';

test('upstream-style continent recipes produce deterministic real height arrays',()=>{
 for(const template of ['continents','pangea','oldWorld','shattered']){
  const first=executeOriginalAzgaarContinent(template,1729);
  const second=executeOriginalAzgaarContinent(template,1729);
  assert.deepEqual(first.heights,second.heights);
  assert.equal(first.heights.length,4096);
  assert.ok(first.heights.some(x=>x>=20),template);
  assert.ok(first.heights.every(x=>x>=0&&x<=100));
 }
});
test('continental projection does not permit a square patch edge to become a coastline',()=>{
 const map=executeOriginalAzgaarContinent('pangea',42),grid=createGlobalGrid();
 const candidate=project(grid,map,pose(templateRng(42)),.8,true);
 assert.ok(candidate.area>0,'land should remain');
 assert.ok(candidate.area<grid.areas.reduce((a,b)=>a+b,0)*.2,'patch should not cover entire planet');
});
