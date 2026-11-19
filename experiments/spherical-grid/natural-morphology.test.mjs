import test from 'node:test';
import assert from 'node:assert/strict';
import {createNaturalPlanet} from './natural-planet.mjs';
import {createNaturalLand} from './natural-land.mjs';
import {executeNativeAzgaarPatch} from './azgaar-native-patch.mjs';
import {AZGAAR_TEMPLATE_SCRIPTS} from './azgaar-template-data.mjs';
import {drainageReceivers,shapeNaturalRelief} from './natural-relief.mjs';
import {createGlobalGrid} from './global-config.mjs';
import {SEAFLOOR} from './plate-seafloor.mjs';

test('upstream-style operations support every selected local recipe without flooding the entire patch',()=>{
 for(const name of Object.keys(AZGAAR_TEMPLATE_SCRIPTS)){
  const a=executeNativeAzgaarPatch(name,42),b=executeNativeAzgaarPatch(name,42);
  assert.deepEqual(a.heights,b.heights);
  assert.ok(a.heights.some(h=>h>=20),name);
  assert.ok(a.heights.some(h=>h<20),name+' should retain actual sea, not a canvas-sized stamp');
 }
});
test('drainage crosses closed depressions on a routing surface, reaches a coast and preserves actual ocean',()=>{
 const grid=createGlobalGrid();
 for(let i=0;i<grid.heights.length;i++){
  const [x,y,z]=grid.points[i];
  grid.heights[i]=x<0?-30:Math.round(2+30*x+5*Math.sin(15*y)*Math.cos(10*z));
  if(x>=0)grid.heights[i]=Math.max(1,grid.heights[i]);
 }
 const initial=grid.heights.slice(),h=Float64Array.from(initial,x=>Math.max(0,x));
 const {receivers,order}=drainageReceivers(grid,h),position=new Int32Array(order.length);
 order.forEach((id,index)=>position[id]=index);
 assert.equal(order.length,36002);
 for(let i=0;i<initial.length;i++)if(initial[i]>=0){
  assert.ok(receivers[i]>=0);
  assert.ok(position[receivers[i]]<position[i],'every receiver has an earlier order: no cycles');
 }
 const result=shapeNaturalRelief(grid,{seed:42});
 assert.ok(result.carvedCells>1000);assert.ok(result.removedVolume>0);
 for(let i=0;i<initial.length;i++){
  assert.equal(grid.heights[i]>=0,initial[i]>=0);
  if(initial[i]<0)assert.equal(grid.heights[i],initial[i]);
 }
});
for(const seed of [0,3,42,62,1729,0xffffffff])for(const landPercent of [25,32,45]){
 test(`natural morphology seed ${seed} at ${landPercent}% retains lowlands, sparse peaks and coherent ocean`,()=>{
  const r=createNaturalPlanet({seed,landPercent,continentCores:8}),g=r.grid;
  assert.ok(Math.abs(r.measuredLandPercent-landPercent)<=r.tolerancePercent);
  assert.ok(r.areaCorrectionLevel> -8,'must not raise distant background to meet land coverage');
  assert.ok(r.acceptedContinents>=4);
  assert.ok(r.refinement.lowlandFraction>.45&&r.refinement.lowlandFraction<.7,'continuous lowland area');
  assert.ok(r.refinement.mountainFraction>.01&&r.refinement.mountainFraction<.12,'high mountains stay sparse');
  assert.ok(Math.max(...g.heights)<70,'no large 100-height saturation plateaus');
  assert.ok(Math.max(...g.heights)>35,'retain actual high relief');
  let edges=0,difference=0;
  for(let i=0;i<g.heights.length;i++){
   if(r.seafloor.zones[i]!==SEAFLOOR.abyssalPlain)continue;
   for(const j of g.neighbors[i])if(j>i&&r.seafloor.zones[j]===SEAFLOOR.abyssalPlain){edges++;difference+=Math.abs(g.heights[i]-g.heights[j]);}
  }
  assert.ok(edges>1000);
  assert.ok(difference/edges<1.5,'abyssal plain must not use independent per-cell speckle');
 });
}
test('same seed gives identical fitted coastlines and different seeds change the geography',()=>{
 const a=createNaturalLand({seed:7}),b=createNaturalLand({seed:7}),c=createNaturalLand({seed:8});
 assert.deepEqual(a.grid.heights,b.grid.heights);assert.deepEqual(a.templatePlacements,b.templatePlacements);
 assert.notDeepEqual(a.grid.heights,c.grid.heights);
});
