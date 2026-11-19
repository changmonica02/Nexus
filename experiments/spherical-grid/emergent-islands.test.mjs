import test from 'node:test';
import assert from 'node:assert/strict';
import {createNaturalPlanet} from './natural-planet.mjs';
import {analyzePlanetGeology,proposeEmergentIslands} from './emergent-islands.mjs';
import {km} from './geologic-fields.mjs';
for(const seed of [42,1729,3])test(`bounded geological island chains preserve mainland and upstream plates: ${seed}`,()=>{
 const settings={seed,landPercent:32,continentCores:8},base=createNaturalPlanet(settings,{emergentIslands:false});
 const d=createNaturalPlanet(settings),g=d.grid,genesis=d.islandGenesis;
 assert.ok(genesis?.chains.length>0);assert.ok(genesis.chains.length<=4);
 assert.ok(d.addedIslandLandPercent>0&&d.addedIslandLandPercent<=.12);
 assert.ok(Math.abs(d.measuredLandPercent-base.measuredLandPercent-d.addedIslandLandPercent)<1e-8);
 assert.ok(g.heights[d.oceanSeed]<0);
 const cells=new Set(genesis.cells),centers=genesis.chains.flatMap(c=>c.cells);
 for(let i=0;i<g.heights.length;i++){
  if(cells.has(i)){assert.ok(base.grid.heights[i]<0&&g.heights[i]>0);assert.ok(g.neighbors[i].every(j=>base.grid.heights[j]<0));}
  else if(base.grid.heights[i]>=0)assert.equal(g.heights[i],base.grid.heights[i]);
  else assert.ok(g.heights[i]<0);
 }
 for(let a=0;a<centers.length;a++)for(let b=a+1;b<centers.length;b++)assert.ok(km(g.points[centers[a]],g.points[centers[b]])>=240);
 for(const chain of genesis.chains){
  assert.ok(chain.cells.length>=2&&chain.cells.length<=5);
  for(let k=0;k<chain.cells.length;k++){
   const i=chain.cells[k];assert.equal(d.tectonics.domains.owners[i],chain.plateId);
   if(k)assert.ok(km(g.points[i],g.points[chain.cells[k-1]])<=950);
   const source=base.tectonics.features.volcanoes.find(v=>v.cell===i);
   assert.equal('emergent-'+source.chainId,chain.id);
   if(chain.kind==='volcanic-arc'){assert.equal(source.kind,'volcanic-arc');assert.equal(base.tectonics.boundaryMap.segments[source.segmentId].overridingPlate,chain.plateId);}
   else {assert.ok(chain.agesMa[k]<=24);if(k)assert.ok(chain.agesMa[k]>=chain.agesMa[k-1]);}
  }
 }
 const stored=JSON.parse(JSON.stringify(genesis)),before=g.heights.slice(),loaded=analyzePlanetGeology(g,stored);
 assert.deepEqual(g.heights,before);assert.deepEqual(loaded.domains.owners,base.tectonics.domains.owners);
 assert.deepEqual(loaded.drawing,d.tectonics.drawing);assert.deepEqual(loaded.features.islandChains,d.tectonics.features.islandChains);
 const p=proposeEmergentIslands(base.grid,base.tectonics,seed,base.oceanSeed);
 assert.deepEqual(p.cells,genesis.cells);assert.deepEqual(p.chains,genesis.chains);
});
test('unsuitable geology adds no islands instead of forcing a quota',()=>{
 const d=createNaturalPlanet({seed:42,landPercent:32,continentCores:8},{emergentIslands:false});
 const m={...d.tectonics,features:{...d.tectonics.features,volcanoes:[]}};
 assert.equal(proposeEmergentIslands(d.grid,m,42).cells.length,0);
});
