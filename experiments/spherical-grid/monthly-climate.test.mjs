import test from 'node:test';
import assert from 'node:assert/strict';
import {generate} from './grid.mjs';
import {classifyKoppen} from './koppen-climate.mjs';
import {generateSurfaceOcean,seasonalWind,localBasis} from '../../src/features/worldMap/core/surfaceOcean.mjs';
import {climateContext,dailyInsolation,monthlyAtmosphere,transportSST,transportMoisture,generateMonthlyClimate} from './monthly-climate.mjs';
const uniform=x=>Array(12).fill(x);
const seasonal=(winter,summer)=>[winter,winter,winter,summer,summer,summer,summer,summer,summer,winter,winter,winter];
for(const [code,t,p] of [
 ['Af',uniform(25),uniform(100)],['Am',uniform(25),[40,...Array(11).fill(210)]],['Aw',uniform(25),seasonal(5,160)],
 ['BWh',uniform(25),uniform(2)],['BWk',uniform(8),uniform(1)],['BSh',uniform(25),uniform(35)],['BSk',uniform(8),uniform(18)],
 ['Csa',seasonal(10,25),seasonal(130,10)],['Csb',seasonal(10,20),seasonal(130,10)],['Cwa',seasonal(10,25),seasonal(5,180)],['Cfb',seasonal(6,19),uniform(100)],
 ['Dfa',seasonal(-8,24),uniform(100)],['Dwb',seasonal(-10,19),seasonal(5,180)],['Dfd',[-40,-30,-20,0,5,12,13,11,4,-10,-20,-30],uniform(100)],
 ['ET',uniform(10),uniform(50)],['EF',uniform(0),uniform(50)]
])test(`monthly mm thresholds classify ${code}, independent of hemispheric month shift`,()=>{
 assert.equal(classifyKoppen(t,p),code);assert.equal(classifyKoppen([...t.slice(6),...t.slice(0,6)],[...p.slice(6),...p.slice(0,6)]),code);
});
test('classification handles exact 18/22/0/10 degree boundaries and rejects nonphysical input',()=>{
 assert.equal(classifyKoppen(uniform(18),uniform(60)),'Af');
 assert.equal(classifyKoppen(seasonal(0,22),uniform(100)),'Dfa');
 assert.equal(classifyKoppen(seasonal(.01,22),uniform(100)),'Cfa');
 assert.throws(()=>classifyKoppen(uniform(20),uniform(-1)));assert.throws(()=>classifyKoppen([20],uniform(50)));
});
const lon=p=>Math.atan2(p[1],p[0])*180/Math.PI,lat=p=>Math.asin(p[2])*180/Math.PI;
test('solar seasons reverse across hemispheres, include polar night and remain finite at poles',()=>{
 assert.ok(dailyInsolation(60,5)>dailyInsolation(60,11));
 assert.ok(dailyInsolation(-60,11)>dailyInsolation(-60,5));
 assert.equal(dailyInsolation(90,11),0);assert.ok(dailyInsolation(-90,11)>0);
 for(const a of [-90,-60,0,60,90])for(let m=0;m<12;m++)assert.ok(Number.isFinite(dailyInsolation(a,m)));
});
test('surface flux is tangent, ocean-connected, divergence-controlled and independent of bathymetric magnitude',()=>{
 const g=generate(12);g.heights.set(g.points.map(p=>p[0]>.1?4:-20));const before=g.heights.slice(),a=generateSurfaceOcean(g);
 assert.deepEqual(g.heights,before);assert.ok(a.diagnostics.relativeDivergence<.001,JSON.stringify(a.diagnostics));
 for(const e of a.edges)assert.ok(g.heights[e.i]<0&&g.heights[e.j]<0&&Number.isFinite(e.flux));
 for(let i=0;i<g.points.length;i++){const v=a.vectors[i],p=g.points[i];assert.ok(Math.abs(v.reduce((s,x,k)=>s+x*p[k],0))<1e-8);if(g.heights[i]>=0)assert.deepEqual(v,[0,0,0]);}
 for(let i=0;i<g.heights.length;i++)if(g.heights[i]<0)g.heights[i]=-1-i%90;
 assert.deepEqual(generateSurfaceOcean(g).vectors,a.vectors);
});
test('SST transport never connects separated seas',()=>{
 const g=generate(10);g.heights.set(g.points.map(p=>Math.abs(p[2])>.65?-20:2));const o=generateSurfaceOcean(g);
 const eq=Float64Array.from(g.points,p=>p[2]>0?24:4),sst=transportSST(g,o,eq);
 for(let i=0;i<sst.length;i++)if(g.heights[i]<0)assert.ok(Math.abs(sst[i]-eq[i])<1e-5);
});
test('lapse rate uses actual 100m Grid height steps, sea temperatures and terrain are untouched',()=>{
 const g=generate(12);g.heights.set(g.points.map(p=>p[0]>0?1:-20));const c=climateContext(g),sst=new Float32Array(g.heights.length).fill(22),a=monthlyAtmosphere(g,c,sst,6);
 const i=g.heights.findIndex(h=>h>0);g.heights[i]+=10;const b=monthlyAtmosphere(g,c,sst,6);
 assert.ok(Math.abs(a.temperature[i]-b.temperature[i]-6.5)<1e-4);
 for(let j=0;j<g.heights.length;j++)if(g.heights[j]<0)assert.equal(b.temperature[j],22);
});
test('closed spherical moisture budget produces mm/month, windward rain and a downstream shadow',()=>{
 const g=generate(20);g.heights.set(g.points.map(p=>Math.abs(lon(p))<65?2:-20));
 const c=climateContext(g),t=new Float32Array(g.heights.length).fill(20),sst=new Float32Array(g.heights.length).fill(25),winds=g.points.map(p=>localBasis(p).east.map(v=>v*6));
 const flat=transportMoisture(g,c,t,sst,winds,0);
 for(let i=0;i<g.points.length;i++)if(Math.abs(lon(g.points[i]))<9){g.heights[i]=Math.round(2+35*(1-Math.abs(lon(g.points[i]))/9));t[i]-=6.5*(g.heights[i]-2)/10;}
 const mountain=transportMoisture(g,c,t,sst,winds,0);
 const avg=(m,min,max)=>{const ids=g.points.map((p,i)=>({p,i})).filter(({p})=>lat(p)>25&&lat(p)<45&&lon(p)>min&&lon(p)<max).map(x=>x.i);assert.ok(ids.length);return ids.reduce((s,i)=>s+m.precipitation[i],0)/ids.length;};
 assert.ok(avg(mountain,-9,0)>avg(flat,-9,0)*1.3);
 assert.ok(avg(mountain,10,35)<avg(flat,10,35)*.85);
 assert.ok(mountain.diagnostics.relativeBudgetError<1e-9);assert.ok(mountain.diagnostics.meanDailyMm>0&&mountain.diagnostics.meanDailyMm<8);
});
test('monthly model is deterministic, includes seasonal dry-summer / dry-winter contrasts and retains terrain',()=>{
 const g=generate(14);g.heights.set(g.points.map(p=>Math.abs(lon(p))<65?2:-20));const before=g.heights.slice(),a=generateMonthlyClimate(g),b=generateMonthlyClimate(g);
 assert.deepEqual(g.heights,before);assert.deepEqual(a.koppen,b.koppen);assert.equal(a.months.length,12);
 for(let m=0;m<12;m++){
  assert.deepEqual(a.months[m].precipitation,b.months[m].precipitation);
  assert.ok(a.months[m].diagnostics.relativeBudgetError<1e-8);
  assert.ok(a.months[m].temperature.every(x=>Number.isFinite(x)&&x> -100&&x<70));assert.ok(a.months[m].precipitation.every(x=>Number.isFinite(x)&&x>=0));
 }
 const codes=new Set(a.koppen);assert.ok([...codes].some(c=>[8,9,10].includes(c)),'dry summer emerges');assert.ok([...codes].some(c=>[2,11,12,13].includes(c)),'monsoonal seasonality emerges');
 const thermalSigns=[0,6].map(m=>{
  const c=climateContext(g),atm=monthlyAtmosphere(g,c,a.months[m].sst,m);let sum=0,count=0;
  for(let i=0;i<g.points.length;i++)if(g.heights[i]>=0&&lat(g.points[i])>15&&lat(g.points[i])<30&&c.sea.distance[i]<600){const v=atm.winds[i].map((x,k)=>x-seasonalWind(g.points[i],m)[k]);const inward=g.points[i].map((x,k)=>(k===0?1:0)-x*g.points[i][0]);sum+=v.reduce((s,x,k)=>s+x*inward[k],0);count++;}
  return sum/count;
 });
 assert.ok(thermalSigns[1]>thermalSigns[0],'summer continental heating changes onshore moisture winds');
});

test('SST warms coastal air before inland air and increases ocean evaporation / rainfall',()=>{
 const g=generate(10);g.heights.set(g.points.map(p=>p[0]>.3?1:-20));const c=climateContext(g),cold=new Float32Array(g.points.length).fill(20),warm=new Float32Array(g.points.length).fill(24);
 const a=monthlyAtmosphere(g,c,cold,6),b=monthlyAtmosphere(g,c,warm,6);
 const land=Array.from(g.heights,(h,i)=>h>=0?i:-1).filter(i=>i>=0),coast=land.reduce((i,j)=>c.sea.distance[i]<c.sea.distance[j]?i:j),interior=land.reduce((i,j)=>c.sea.distance[i]>c.sea.distance[j]?i:j);
 assert.ok(b.temperature[coast]-a.temperature[coast]>b.temperature[interior]-a.temperature[interior]);
 const winds=g.points.map(p=>localBasis(p).east.map(x=>x*6)),t=new Float32Array(g.points.length).fill(24);
 const dry=transportMoisture(g,c,t,cold,winds,6),wet=transportMoisture(g,c,t,warm,winds,6);
 assert.ok(wet.diagnostics.meanDailyMm>dry.diagnostics.meanDailyMm*1.05);
});
