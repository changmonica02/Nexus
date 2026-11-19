import test from 'node:test';
import assert from 'node:assert/strict';
import {createGlobalGrid} from './global-config.mjs';
import {createAzgaarSphericalLandLayout} from './azgaar-spherical-land.mjs';
import {analyzeSphericalPlates} from './tectonic-plates.mjs';
import {generatePlateSeafloor,applyPlateSeafloor,tectonicSeedFromLandMask,SEAFLOOR} from './plate-seafloor.mjs';
import {exportGlobalTerrainSnapshot,importGlobalTerrainSnapshot} from './snapshot.mjs';

function syntheticWorld(){
 const grid=createGlobalGrid();
 grid.heights.set(grid.points.map(([x,y,z])=>x+.18*Math.sin(7*y)>0?
  Math.max(1,Math.round(20+20*z*z)):-20));
 return grid;
}
test('plate-guided seafloor is repeatable, protects all land, and returns bounded negative ocean heights',()=>{
 const grid=syntheticWorld(),original=grid.heights.slice();
 const seed=tectonicSeedFromLandMask(grid);
 const plate=analyzeSphericalPlates(grid,{seed,plateCount:8});
 const first=generatePlateSeafloor(grid,{seed,tectonics:plate});
 const second=generatePlateSeafloor(grid,{seed,tectonics:plate});
 assert.deepEqual(grid.heights,original,'proposal must be pure');
 assert.deepEqual(first.heights,second.heights,'same seed and terrain reproducible');
 assert.deepEqual(first.zones,second.zones);
 assert.equal(first.oceanCells,original.filter(x=>x<0).length);
 for(let i=0;i<original.length;i++){
  if(original[i]>=0){assert.equal(first.heights[i],original[i]);assert.equal(first.zones[i],0);}
  else {assert.ok(first.heights[i]<0&&first.heights[i]>=-100);assert.ok(first.zones[i]>=1&&first.zones[i]<=6);}
 }
 assert.ok(first.zones.includes(SEAFLOOR.shelf));
 assert.ok(first.zones.includes(SEAFLOOR.slope));
 assert.ok(first.zones.includes(SEAFLOOR.abyssalPlain));
 assert.ok(first.zones.includes(SEAFLOOR.midOceanRidge));
 assert.ok(first.zones.includes(SEAFLOOR.trench));
 assert.ok(first.zones.includes(SEAFLOOR.seamount));
 assert.ok(first.submarineVolcanoes.length>0);
 assert.ok(first.submarineVolcanoes.every(x=>original[x.gridCell]<0&&x.uplift>0));
});
test('applying seafloor keeps the land mask, seed and land height while producing a valid snapshot',()=>{
 const grid=syntheticWorld(),original=grid.heights.slice();
 const oceanSeed=original.findIndex(x=>x<0);
 const seed=tectonicSeedFromLandMask(grid);
 const model=generatePlateSeafloor(grid,{seed});
 const summary=applyPlateSeafloor(grid,model);
 assert.ok(summary.changed>100);
 assert.equal(tectonicSeedFromLandMask(grid),seed);
 for(let i=0;i<original.length;i++){
  assert.equal(grid.heights[i]>=0,original[i]>=0);
  if(original[i]>=0)assert.equal(grid.heights[i],original[i]);
 }
 const snapshot=exportGlobalTerrainSnapshot({grid,oceanSeed,revision:0});
 const loaded=importGlobalTerrainSnapshot(snapshot);
 assert.deepEqual(loaded.grid.heights,grid.heights);
 assert.equal(tectonicSeedFromLandMask(loaded.grid),seed);
});
test('invalid seafloor proposals reject atomically instead of changing land/coast',()=>{
 const grid=syntheticWorld(),before=grid.heights.slice(),seed=tectonicSeedFromLandMask(grid);
 const proposal=generatePlateSeafloor(grid,{seed});
 const land=before.findIndex(v=>v>=0);
 proposal.heights[land]=-1;
 assert.throws(()=>applyPlateSeafloor(grid,proposal),RangeError);
 assert.deepEqual(grid.heights,before);
});
test('new Azgaar terrain supports ocean floor features without modifying land or changing plate boundaries on reload',()=>{
 const draft=createAzgaarSphericalLandLayout({seed:1729,landPercent:32,continentCores:8});
 const grid=draft.grid,initial=grid.heights.slice(),seed=tectonicSeedFromLandMask(grid);
 const model=analyzeSphericalPlates(grid,{seed});
 const bathymetry=generatePlateSeafloor(grid,{seed,tectonics:model});
 applyPlateSeafloor(grid,bathymetry);
 assert.equal(tectonicSeedFromLandMask(grid),seed);
 const loaded=importGlobalTerrainSnapshot(exportGlobalTerrainSnapshot({grid,oceanSeed:draft.oceanSeed,revision:0}));
 const after=analyzeSphericalPlates(loaded.grid,{seed:tectonicSeedFromLandMask(loaded.grid)});
 assert.deepEqual(after.domains.owners,model.domains.owners);
 assert.deepEqual(after.drawing,model.drawing);
 assert.ok(Math.abs(draft.measuredLandPercent-32)<=draft.tolerancePercent);
 for(let i=0;i<initial.length;i++)if(initial[i]>=0)assert.equal(loaded.grid.heights[i],initial[i]);
});
