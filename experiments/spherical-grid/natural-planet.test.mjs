import test from 'node:test';
import assert from 'node:assert/strict';
import {createNaturalLand} from './natural-land.mjs';
import {createNaturalPlanet} from './natural-planet.mjs';
import {exportGlobalTerrainSnapshot,importGlobalTerrainSnapshot} from './snapshot.mjs';
import {analyzePlanetGeology} from './emergent-islands.mjs';
import {SEAFLOOR} from './plate-seafloor.mjs';

for(const [seed,landPercent] of [[0,25],[1729,32],[0xffffffff,45]]){
 test(`natural planet seed ${seed}, ${landPercent}% survives confirmation/reload`,()=>{
  const settings={seed,landPercent,continentCores:8,gridCells:36002};
  const landDraft=createNaturalLand(settings),draft=createNaturalPlanet(settings,{landDraft}),again=createNaturalPlanet(settings);
  assert.equal(draft.grid,landDraft.grid,'confirmation consumes the already-computed preview terrain');
  assert.deepEqual(draft.grid.heights,again.grid.heights);
  assert.ok(Math.abs(draft.measuredLandPercent-landPercent)<=draft.tolerancePercent);
  assert.equal(draft.refinement.landToSea,0);
  assert.equal(draft.refinement.seaToLand,0);
  assert.ok(draft.refinement.reliefChanges>0);
  assert.ok(draft.templatePlacements.some(p=>p.type==='continent'));
  assert.ok(draft.seafloor.zones.includes(SEAFLOOR.shelf));
  assert.ok(draft.seafloor.zones.includes(SEAFLOOR.abyssalPlain));
  assert.ok(draft.seafloor.zones.includes(SEAFLOOR.midOceanRidge));
  assert.ok(draft.seafloor.submarineVolcanoes.length>0);
  const snapshot=exportGlobalTerrainSnapshot({grid:draft.grid,oceanSeed:draft.oceanSeed,revision:0});
  const loaded=importGlobalTerrainSnapshot(snapshot);
  assert.deepEqual(loaded.grid.heights,draft.grid.heights);
  const plates=analyzePlanetGeology(loaded.grid,draft.islandGenesis);
  assert.deepEqual(plates.domains.owners,draft.tectonics.domains.owners);
 });
}
test('invalid seed cannot silently wrap to a different preview',()=>{
 for(const seed of [-1,4294967296,1.5,NaN])assert.throws(()=>createNaturalPlanet({seed}),RangeError);
});
