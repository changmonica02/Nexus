import test from 'node:test';
import assert from 'node:assert/strict';
import {createGlobalGrid} from './global-config.mjs';
import {analyzeSphericalPlates,classifyLocalBoundary} from './tectonic-plates.mjs';
import {generatePlateSeafloor,applyPlateSeafloor,tectonicSeedFromLandMask,SEAFLOOR} from './plate-seafloor.mjs';
import {createTectonicSymbols} from './tectonic-drawing.mjs';
import {warpPlateCoordinates} from './tectonic-plates.mjs';
import {createNaturalPlanet} from './natural-planet.mjs';
const world=()=>{const g=createGlobalGrid();g.heights.set(g.points.map(([x,y,z])=>x+.18*Math.sin(7*y)>0?Math.max(1,Math.round(20+20*z*z)):-20));return g;};
for(const plateCount of [6,8,12])test(`${plateCount} unequal connected primary domains cover a sphere and cross crust types`,()=>{
 const g=world(),before=g.heights.slice(),m=analyzeSphericalPlates(g,{seed:271828,plateCount});
 assert.deepEqual(g.heights,before);assert.equal(m.plateCount,plateCount);
 const sizes=m.domains.plates.map(p=>p.areaPercent);
 assert.ok(Math.max(...sizes)/Math.min(...sizes)>=1.8,'major plate areas must not be almost equal');
 assert.ok(Math.min(...sizes)>.5,'do not retain accidental microplates');
 assert.ok(Math.abs(sizes.reduce((s,x)=>s+x,0)-100)<1e-6);
 assert.ok(m.domains.plates.some(p=>p.continentalCrustAreaKm2>0&&p.oceanicCrustAreaKm2>0));
 for(let i=0;i<g.heights.length;i++){
  const parent=m.domains.parents[i];if(parent>=0){assert.equal(m.domains.owners[parent],m.domains.owners[i]);assert.ok(g.neighbors[i].includes(parent));}
 }
 const inland=m.boundaries.filter(b=>(g.heights[b.a]>=0)===(g.heights[b.b]>=0));
 assert.ok(inland.length>m.boundaries.length*.6,'boundaries must not be shorelines');
 assert.ok(m.boundaryMap.segments.every(s=>s.boundaryIndices.every(i=>m.boundaries[i].segmentId===s.id)));
});
test('local motion, shear precedence, old oceanic crust and opposite boundary sides classify independently',()=>{
 const domains={owners:new Int16Array([0,1]),plates:[{pole:[1,0,0],angularSpeed:0},{pole:[0,3,-1],angularSpeed:.03}]};
 const crust={crust:new Uint8Array([1,0]),oceanicAgeMa:new Float32Array([0,140])};
 const b={a:0,b:1,plates:[0,1],center:[1,0,0]},normal=[0,1,0];
 const a=classifyLocalBoundary({},crust,domains,b,normal);
 assert.equal(a.mode,'subduction');assert.equal(a.preciseMode,'oblique-subduction');
 assert.equal(a.subductingPlate,1);assert.equal(a.overridingPlate,0);assert.equal(a.subductingOceanicAgeMa,140);
 crust.crust[0]=0;crust.oceanicAgeMa[0]=170;
 assert.equal(classifyLocalBoundary({},crust,domains,b,normal).subductingPlate,0,'older oceanic crust sinks');
 const opposite=classifyLocalBoundary({},crust,domains,{...b,center:[-1,0,0]},normal);
 assert.equal(opposite.mode,'mid-ocean-ridge','same pair, different local motion');
 crust.crust.set([1,1]);assert.equal(classifyLocalBoundary({},crust,domains,b,normal).mode,'collision');
 assert.equal(classifyLocalBoundary({},crust,domains,{...b,center:[-1,0,0]},normal).mode,'rift');
});
test('history remains distinct from activity; volcano arcs and hotspot tracks have side/age/plate context',()=>{
 const g=world(),m=analyzeSphericalPlates(g,{seed:271828,plateCount:8}),f=m.features;
 assert.ok(m.orogenProvinces.historicalCells>0);assert.ok(m.orogenProvinces.activeCells>0);
 for(let i=0;i<g.heights.length;i++){
  assert.equal(m.orogenProvinces.activeMask[i]+m.orogenProvinces.historicalMask[i],m.history.mountainMemory[i]);
 }
 for(const b of m.boundaries.filter(b=>b.mode==='subduction')){
  assert.notEqual(b.subductingPlate,b.overridingPlate);assert.ok(b.subductingOceanicAgeMa>=0);
 }
 for(const v of f.volcanoes){
  assert.ok(g.heights[v.cell]<0);assert.equal(m.domains.owners[v.cell],v.plateId);
  if(v.kind==='volcanic-arc'){assert.ok(!f.trenchCells.includes(v.cell));const s=m.boundaryMap.segments[v.segmentId];assert.equal(s.mode,'subduction');}
 }
 for(const c of f.seamountChains){assert.equal(new Set(c.cells).size,c.cells.length);assert.ok(c.cells.every(i=>m.domains.owners[i]===c.plateId&&g.heights[i]<0));}
 const proposed=generatePlateSeafloor(g,{seed:271828,tectonics:m});
 for(const zone of [SEAFLOOR.trench,SEAFLOOR.midOceanRidge,SEAFLOOR.seamount,SEAFLOOR.abyssalPlain])assert.ok(proposed.zones.includes(zone));
 const before=g.heights.slice();applyPlateSeafloor(g,proposed);
 for(let i=0;i<g.heights.length;i++){assert.equal(g.heights[i]>=0,before[i]>=0);if(before[i]>=0)assert.equal(g.heights[i],before[i]);}
 const after=analyzeSphericalPlates(g,{seed:271828,plateCount:8});
 assert.deepEqual(after.domains.owners,m.domains.owners);assert.deepEqual(after.features.islandChains,m.features.islandChains);
});
for(const [seed,landPercent] of [[42,25],[42,32],[42,45],[1729,25],[1729,32],[1729,45]])test(`terrain and seafloor retain crust ownership: ${seed}/${landPercent}`,()=>{
 const r=createNaturalPlanet({seed,landPercent,continentCores:8},{emergentIslands:false}),g=r.grid;
 assert.ok(g.heights.every(Number.isFinite));
 assert.ok(g.heights.some(h=>h>0)&&g.heights.some(h=>h<0));
 assert.equal(r.tectonics.version,3);
 assert.ok(r.tectonics.features.islandChains.every(c=>c.existingLandOnly&&c.cells.every(i=>g.heights[i]>=0)));
 assert.equal(tectonicSeedFromLandMask(g),r.seafloor.seed);
 const before=g.heights.slice();applyPlateSeafloor(g,r.seafloor);
 for(let i=0;i<before.length;i++)if(before[i]>=0)assert.equal(g.heights[i],before[i]);
});

test('warped sphere and tectonic marks retain local sides, finite projection and owned motion origins',()=>{
 const g=world(),m=analyzeSphericalPlates(g,{seed:271828,plateCount:8}),symbols=createTectonicSymbols(g,m);
 const warped=warpPlateCoordinates(g.points,271828);
 assert.deepEqual(warped,warpPlateCoordinates(g.points,271828));
 assert.ok(warped.some((p,i)=>Math.hypot(...p.map((x,k)=>x-g.points[i][k]))>.08));
 for(const p of warped)assert.ok(Math.abs(Math.hypot(...p)-1)<1e-10);
 const xyz=([lon,lat])=>{const a=lon*Math.PI/180,b=lat*Math.PI/180;return [Math.cos(b)*Math.cos(a),Math.cos(b)*Math.sin(a),Math.sin(b)];};
 const dot=(a,b)=>a.reduce((s,x,k)=>s+x*b[k],0);
 assert.ok(symbols.marks.some(x=>x.mode==='subduction'));
 assert.ok(symbols.marks.some(x=>x.mode==='mid-ocean-ridge'));
 for(const mark of symbols.marks){
  for(const line of mark.arrows){assert.ok(line.flat().every(Number.isFinite));assert.ok(Math.abs(line[1][0]-line[0][0])<=180);}
  if(mark.mode!=='subduction')continue;
  const b=m.boundaries[mark.boundaryIndex],direction=b.smoothedNormal.map(v=>v*(b.subductingPlate===b.plates[0]?1:-1));
  assert.equal(mark.lower,b.subductingPlate);assert.equal(mark.upper,b.overridingPlate);
  assert.ok(dot(xyz(mark.tooth[1]),direction)>0,'tooth must be on overriding side');
  const [a,z]=mark.arrows[0].map(xyz);assert.ok(dot(z,direction)>dot(a,direction),'subduction arrow points from sinking side under overriding plate');
 }
 for(const motion of symbols.motion){assert.equal(m.domains.owners[motion.cell],motion.plateId);assert.ok(motion.arrow.flat().every(Number.isFinite));assert.ok(Math.abs(motion.arrow[1][0]-motion.arrow[0][0])<=180);}
});
