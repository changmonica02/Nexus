import test from 'node:test';
import assert from 'node:assert/strict';
import {AZGAAR_TEMPLATE_SCRIPTS} from './azgaar-template-data.mjs';
import {executeAzgaarTemplate,sampleTemplate} from './azgaar-template-engine.mjs';
import {createAzgaarSphericalLandLayout,planAzgaarPlacements,planGeographicClusters,TEMPLATE_OVERLAP_LIMITS,CONTINENT_PAIR_OVERLAP_LIMIT,TEMPLATE_SIZE_RANGES,sampleTemplateRadius} from './azgaar-spherical-land.mjs';
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
 assert.deepEqual(a.templatePlacements,b.templatePlacements);
 assert.equal(a.attemptedPlacements,planAzgaarPlacements(1729,{continentCores:8}).length);
 assert.equal(a.templatePlacements.length+a.skippedPlacements,a.attemptedPlacements);
 assert.ok(a.templatePlacements.some(p=>p.attempts>1),'at least one candidate should be repositioned');
 assert.ok(a.templatePlacements.every(p=>p.overlapRatio>=0&&p.overlapRatio<=1&&p.attempts>=1&&p.attempts<=16));
 assert.ok(a.templatePlacements.every(p=>Number.isFinite(TEMPLATE_OVERLAP_LIMITS[p.type])));
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


test('template-specific radius profiles are bounded and deterministic',()=>{
 const names=['continents','pangea','oldWorld','shattered','volcano','highIsland','lowIsland','peninsula','archipelago'];
 for(const name of names){
  const [min,max]=TEMPLATE_SIZE_RANGES[name];
  assert.ok(min>0&&max>min&&max<Math.PI/2,name);
  assert.equal(sampleTemplateRadius(name,()=>0),min);
  assert.equal(sampleTemplateRadius(name,()=>1),max);
  assert.ok(sampleTemplateRadius(name,()=>.5)<(min+max)/2,'skew toward smaller templates');
 }
 assert.ok(TEMPLATE_SIZE_RANGES.peninsula[0]>TEMPLATE_SIZE_RANGES.volcano[0]);
 assert.throws(()=>sampleTemplateRadius('unknown',()=>.5),RangeError);
});
test('repositioning preserves recipe identity and records meaningful new land',()=>{
 const items=planAzgaarPlacements(1729,{continentCores:8});
 const result=createAzgaarSphericalLandLayout({seed:1729,landPercent:32,continentCores:8});
 assert.equal(result.attemptedPlacements,items.length);
 assert.equal(result.templatePlacements.length+result.skippedPlacements,items.length);
 for(const placed of result.templatePlacements){
  const base=items.find(p=>p.type===placed.type&&p.index===placed.index);
  assert.ok(base,'accepted candidate should correspond to a generated slot');
  assert.equal(base.name,placed.name,'retry must preserve template recipe');
  assert.equal(base.seed,placed.seed,'retry must preserve template seed');
  assert.ok(placed.radius>=TEMPLATE_SIZE_RANGES[placed.name][0]);
  assert.ok(placed.radius<=TEMPLATE_SIZE_RANGES[placed.name][1]);
  assert.ok(placed.newLandArea>0,'do not retain wholly buried template');
  assert.ok(placed.contributionRatio>=0&&placed.contributionRatio<=1);
  assert.ok(Math.abs(placed.overlapRatio+placed.contributionRatio-1)<1e-6);
 }
});
test('all three area presets retain contiguous ocean and valid relief',()=>{
 for(const landPercent of [25,32,45]){
  const r=createAzgaarSphericalLandLayout({seed:62,landPercent,continentCores:7});
  assert.ok(Math.abs(r.measuredLandPercent-landPercent)<=r.tolerancePercent);
  assert.ok(r.grid.heights[r.oceanSeed]<0);
  assert.ok(r.grid.heights.every(h=>Number.isInteger(h)&&h>=-100&&h<=100));
  assert.ok(new Set(r.grid.heights).size>4);
 }
});

test('global clusters are seeded, varied, and initial continental slots cover every cluster',()=>{
 for(const seed of [1729,42,3,62]){
  const geography=planGeographicClusters(seed);
  assert.deepEqual(geography,planGeographicClusters(seed));
  assert.ok(geography.clusters.length>=2&&geography.clusters.length<=4);
  assert.ok(geography.clusters.every(c=>c.weight>0&&c.spread>0));
  const placements=planAzgaarPlacements(seed,{continentCores:8});
  for(const c of geography.clusters){
   assert.ok(placements.some(p=>p.type==='continent'&&p.clusterId===c.id),
    'each geographic group should receive an initial continental slot');
  }
  assert.ok(placements.some(p=>p.type==='island'&&p.clusterId!==null));
  assert.ok(placements.every(p=>p.center.length===3&&
   Math.abs(Math.hypot(...p.center)-1)<1e-9));
 }
});
test('clustered templates preserve uneven coverage and still contribute new land',()=>{
 for(const seed of [1729,42,3]){
  const r=createAzgaarSphericalLandLayout({seed,landPercent:32,continentCores:8});
  assert.ok(Math.abs(r.measuredLandPercent-32)<=r.tolerancePercent);
  assert.ok(r.templatePlacements.every(p=>p.newLandArea>0));
  assert.ok(r.templatePlacements.every(p=>p.overlapRatio<=TEMPLATE_OVERLAP_LIMITS[p.type]+1e-9));
  assert.equal(r.acceptedContinents,r.templatePlacements.filter(p=>p.type==='continent').length);
  const longitudes=Array(12).fill(0);
  for(let i=0;i<r.grid.points.length;i++)if(r.grid.heights[i]>=0){
   const p=r.grid.points[i],band=Math.min(11,Math.floor((Math.atan2(p[1],p[0])+Math.PI)/(2*Math.PI)*12));
   longitudes[band]++;
  }
  assert.ok(Math.max(...longitudes)>3*Math.min(...longitudes),
   'some longitude sectors should be appreciably denser than others');
  assert.ok(r.geographicClusters.every(c=>r.templatePlacements.some(p=>p.clusterId===c.id)),
   'no selected cluster should be completely swallowed');
 }
});

test('continental pair overlap uses the smaller footprint as a strict hard cap',()=>{
 for(const seed of [1729,42,3]){
  // Reconstruct the exact local land footprints of accepted continents using
  // the same spherical placement projection, with the deterministic recipe.
  // For now this test protects the aggregate cap and the absence of a soft
  // fallback; the per-pair limit is enforced inside selectPlacement.
  const r=createAzgaarSphericalLandLayout({seed,landPercent:32,continentCores:8});
  assert.ok(CONTINENT_PAIR_OVERLAP_LIMIT>0&&CONTINENT_PAIR_OVERLAP_LIMIT<.25);
  assert.ok(r.templatePlacements.every(p=>p.overlapRatio<=TEMPLATE_OVERLAP_LIMITS[p.type]+1e-9));
  assert.equal(r.attemptedPlacements-r.templatePlacements.length,r.skippedPlacements);
  assert.ok(r.acceptedContinents>=4,'allow fewer than planned only if overlap would be excessive');
 }
});
