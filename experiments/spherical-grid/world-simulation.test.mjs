import test from 'node:test';
import assert from 'node:assert/strict';
import {generate} from './grid.mjs';
import {assignContinentalAreas,planIslandMargins} from '../../src/features/worldMap/core/worldLayout.mjs';
import {generateSurfaceOcean,localBasis} from '../../src/features/worldMap/core/surfaceOcean.mjs';
import {transportSeaSurfaceTemperature as heat} from '../../src/features/worldMap/core/oceanHeat.mjs';
const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0),lon=p=>Math.atan2(p[1],p[0]),lat=p=>Math.asin(p[2])*180/Math.PI;
function basin(frequency){const g=generate(frequency);g.heights.set(g.points.map(p=>Math.abs(lon(p))<1.2?-20:5));return g;}
function samples(grid,ocean,sst,eq,hemisphere,side){
 const ids=grid.points.flatMap((p,i)=>grid.heights[i]<0&&Math.sign(p[2])===hemisphere&&Math.abs(lat(p))>20&&Math.abs(lat(p))<40&&(side==='west'?lon(p)<-.8:lon(p)>.8)?[i]:[]);
 assert.ok(ids.length);const area=ids.reduce((s,i)=>s+grid.areas[i],0);
 return {north:ids.reduce((s,i)=>s+dot(ocean.vectors[i],localBasis(grid.points[i]).north)*grid.areas[i],0)/area,anomaly:ids.reduce((s,i)=>s+(sst[i]-eq[i])*grid.areas[i],0)/area};
}
test('continental spherical-area budgets are deterministic, unequal, bounded and normalized',()=>{
 const cores=Array.from({length:6},(_,index)=>({index,groupId:index<4?0:1,structure:'aggregated'}));
 const a=assignContinentalAreas(cores,42,45),b=assignContinentalAreas(cores,42,45);
 assert.deepEqual(a,b);assert.deepEqual(cores[0],{index:0,groupId:0,structure:'aggregated'});
 assert.ok(Math.abs(a.reduce((s,c)=>s+c.areaBudget,0)-.81)<1e-12);assert.ok(Math.abs(a.reduce((s,c)=>s+c.areaShare,0)-1)<1e-12);
 assert.ok(a.every(c=>c.areaBudget>0&&c.areaBudget<=.22));assert.ok(new Set(a.map(c=>c.radius)).size>3);
 for(const c of a)assert.ok(Math.abs((1-Math.cos(c.radius))/2-c.areaBudget)<1e-12);
 assert.notDeepEqual(a,assignContinentalAreas(cores,43,45));
});
test('island template placement follows ocean-side coastal margins and avoids duplicate clusters',()=>{
 const g=generate(12);g.heights.set(g.points.map(p=>p[0]>0?10:-20));const scores=Float32Array.from(g.heights),snapshot=g.heights.slice();
 const a=planIslandMargins(g,scores,42,'fragmented'),b=planIslandMargins(g,scores,42,'fragmented');assert.deepEqual(a,b);assert.deepEqual(g.heights,snapshot);assert.ok(a.length>=10);
 for(const item of a){assert.ok(Math.abs(dot(item.center,item.center)-1)<1e-10);const nearest=g.points.reduce((best,p,i)=>dot(p,item.center)>dot(g.points[best],item.center)?i:best,0);assert.ok(scores[nearest]<0);assert.ok(Number.isFinite(item.rotation));if(item.placement==='continental-margin')assert.ok(g.neighbors[item.marginCell].some(j=>scores[j]>=0));}
 for(let i=0;i<a.length;i++)for(let j=0;j<i;j++)assert.ok(Math.acos(Math.max(-1,Math.min(1,dot(a[i].center,a[j].center))))>=.10-1e-10);
});
test('basin boundary circulation transports warm water poleward in both hemispheres',()=>{
 const g=basin(18),before=g.heights.slice(),o=generateSurfaceOcean(g),eq=Float64Array.from(g.points,p=>28-38*p[2]**2),sst=heat(g,o,eq);
 assert.deepEqual(g.heights,before);assert.ok(o.diagnostics.relativeDivergence<1e-6);assert.ok(o.diagnostics.maxSpeed<2);
 for(const hemisphere of [1,-1]){const west=samples(g,o,sst,eq,hemisphere,'west'),east=samples(g,o,sst,eq,hemisphere,'east');assert.ok(west.north*hemisphere>0);assert.ok(east.north*hemisphere<0);assert.ok(west.anomaly>1);assert.ok(east.anomaly< -1);}
 assert.ok(sst.diagnostics.cfl<=.8+1e-12);assert.ok(sst.diagnostics.heatBudgetErrorPerArea<1e-9);
});
test('edge heat exchange conserves total ocean heat without atmospheric restoration',()=>{
 const g=basin(16),o=generateSurfaceOcean(g),eq=Float64Array.from(g.points,p=>12+9*p[2]),sst=heat(g,o,eq,{relaxationDays:Infinity});
 const difference=g.areas.reduce((s,a,i)=>s+(g.heights[i]<0?(sst[i]-eq[i])*a:0),0)/g.areas.reduce((s,a,i)=>s+(g.heights[i]<0?a:0),0);
 assert.ok(Math.abs(difference)<1e-6);assert.ok(sst.diagnostics.heatBudgetErrorPerArea<1e-9);assert.ok(sst.every(t=>Number.isFinite(t)&&t>=3-1e-5&&t<=21+1e-5));
 for(let i=0;i<g.heights.length;i++)if(g.heights[i]>=0)assert.ok(Math.abs(sst[i]-eq[i])<1e-6);
});
test('heat transport responds to physical scale, not a fixed weight per grid edge',()=>{
 const results=[];
 for(const frequency of [12,24]){const g=basin(frequency),o=generateSurfaceOcean(g),eq=Float64Array.from(g.points,p=>28-38*p[2]**2),sst=heat(g,o,eq);results.push(samples(g,o,sst,eq,1,'west').anomaly);}
 assert.ok(Math.abs(results[0]-results[1])<.6,JSON.stringify(results));
});
test('ocean transport remains finite with no coast or no ocean',()=>{
 for(const height of [-20,5]){const g=generate(6);g.heights.fill(height);const o=generateSurfaceOcean(g),eq=new Float64Array(g.points.length).fill(20),sst=heat(g,o,eq);assert.ok(o.vectors.every(v=>v.every(Number.isFinite)));assert.ok(sst.every(t=>Math.abs(t-20)<1e-5));if(height>0)assert.equal(o.edges.length,0);}
});
