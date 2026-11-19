import test from 'node:test';
import assert from 'node:assert/strict';
import {createAzgaarCommandTools} from '../../.cache/azgaar-command-tools.mjs';
import {executeNativeAzgaarPatch,createAzgaarPatchGraph} from './azgaar-native-patch.mjs';
import {planNaturalGeography,createNaturalLand} from './natural-land.mjs';
import {geographyDiagnostics} from './geography-diagnostics.mjs';
function tinyGraph(neighbors){return {points:neighbors.map((_,i)=>[i+.5,.5]),cellsX:neighbors.length,cellsY:1,cells:{c:neighbors,h:new Uint8Array(neighbors.length)}};}
test('Azgaar fractional command counts are probabilistic, not ceil(count)',()=>{
 for(const [coin,expected] of [[.49,20],[.51,10]]){
  let first=true;const random=()=>{if(first){first=false;return coin;}return .5;};
  const t=createAzgaarCommandTools(random,()=>0);
  t.setGraph(tinyGraph([[]]),{points:10000,width:1,height:1});
  t.addStep('Hill','1.5','10','50','50');assert.equal(t.heights[0],expected);
 }
});
test('Azgaar Uint8 height propagation truncates and density selects native decay',()=>{
 const t=createAzgaarCommandTools(()=>.5,()=>0);
 t.setGraph(tinyGraph([[1],[0]]),{points:5000,width:2,height:1});
 t.addStep('Hill','1','15','50','50');
 assert.equal(t.blobPower,.97);assert.equal(t.linePower,.79);
 assert.equal(t.heights[1],13,'15**.97 is truncated in a Uint8 change field');
});
test('native graph is an irregular reciprocal Delaunay graph and commands retain original order',()=>{
 const {graph}=createAzgaarPatchGraph(42);
 assert.ok(graph.cells.c.every((ns,i)=>ns.every(j=>graph.cells.c[j].includes(i))));
 assert.ok(new Set(graph.cells.c.map(ns=>ns.length)).size>2,'not a square 8-neighbour lattice');
 const map=executeNativeAzgaarPatch('continents',42,{trace:true});
 assert.equal(map.blobPower,.98);assert.equal(map.linePower,.81);
 assert.match(map.steps[0].command,/^Hill 1 80-85/);
 assert.ok(map.steps.findIndex(s=>s.command.startsWith('Strait'))>map.steps.findIndex(s=>s.command.startsWith('Range')));
 assert.match(map.steps.at(-1).command,/^Mask 4/);
});
test('cluster planning preserves unequal group populations, ocean reserve and seed variety',()=>{
 const counts=new Set(),groupCounts=new Set();
 for(const seed of [0,1,3,7,42,62,1729,0xffffffff]){
  const p=planNaturalGeography(seed);assert.deepEqual(p,planNaturalGeography(seed));
  counts.add(p.cores.length);groupCounts.add(p.groups.length);
  if(p.structure!=='fragmented')assert.ok(p.cores.filter(c=>c.groupId===0).length>=p.cores.filter(c=>c.groupId===1).length);
  // Fragmented structure deliberately permits similarly populated groups.
  assert.ok(['aggregated','balanced','fragmented'].includes(p.structure));
  assert.ok(p.groups.every(g=>p.cores.some(c=>c.groupId===g.id)));
  for(const c of p.cores){const g=p.groups[c.groupId],distance=Math.acos(Math.max(-1,Math.min(1,c.center.reduce((s,v,k)=>s+v*g.center[k],0))));assert.ok(distance<=g.spread+1e-8,'no uniform-global retry');}
 }
 assert.ok(counts.size>1);assert.ok(groupCounts.size>1);
});
test('land-mask evidence measures uneven density and local command-scale coast correction',()=>{
 for(const seed of [42,1729]){
  const r=createNaturalLand({seed}),d=geographyDiagnostics(r.grid);
  assert.ok(Math.abs(r.areaCorrectionLevel)<.5,'global scale handles coverage, not a large sea-level shift');
  assert.ok(d.emptySectors>=10,'retain a meaningful broad-ocean region');
  assert.ok(d.denseSectors>=3,'retain dense continental regions');
  assert.ok(d.densityDeviation>.20,'do not spread land evenly around the world');
  assert.ok(d.largestOceanShare>.8,'most below-sea cells share the ocean');
  assert.ok(r.templatePlacements.filter(p=>p.type!=='continent').some(p=>p.placement==='continental-margin'));
 }
});
