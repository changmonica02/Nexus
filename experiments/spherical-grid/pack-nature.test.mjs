import test from 'node:test';
import assert from 'node:assert/strict';
import {generate} from './grid.mjs';
import {generateSphericalPack,fromLonLat,toLonLat} from './spherical-pack.mjs';
import {generateNaturalGeography,deriveHydrology,validateLakeLevel,drainageOrder,lakeRimForBed} from './pack-hydrology.mjs';
import {validateNaturalGeography,editNaturalGeography} from './natural-geography.mjs';
import {monthlyWaterBalance,potentialEvapotranspiration,classifyPotentialEcosystem,ECOSYSTEMS} from './ecosystem-water.mjs';
import {derivePackEcosystems} from './pack-ecosystems.mjs';
import {km} from './geologic-fields.mjs';
const world=()=>{const g=generate(20);g.heights.set(g.points.map(p=>p[0]<-.2?-20:Math.round(4+5*p[0])));let pit=0,best=-Infinity;g.points.forEach((p,i)=>{if(p[0]>best){best=p[0];pit=i;}});g.heights[pit]=1;for(const j of g.neighbors[pit])g.heights[j]=12;return g;};
const climate=g=>({months:Array.from({length:12},(_,m)=>({temperature:Float32Array.from(g.points,p=>14+8*Math.sin(2*Math.PI*(m-3)/12)*Math.sign(p[2])),precipitation:Float32Array.from(g.points,()=>90)}))});
let fixture;
function data(){if(!fixture){const grid=world(),c=climate(grid),pack=generateSphericalPack(grid),base=generateNaturalGeography(pack,c,123),hydro=deriveHydrology(pack,c,base);fixture={grid,c,pack,base,hydro};}return fixture;}
for(const detail of [1,2])test(`Pack detail ${detail} closes sphere, maps Grid and preserves catchment area`,()=>{
 const {grid}=data(),before=grid.heights.slice(),p=generateSphericalPack(grid,{detail}),n=p.points.length;
 assert.deepEqual(grid.heights,before);assert.equal(p.triangles.length,2*n-4);
 assert.ok(p.neighbors.every((ns,i)=>ns.every(j=>p.neighbors[j].includes(i))));
 assert.ok(p.areas.every(a=>Number.isFinite(a)&&a>0));assert.ok(Math.abs(p.areas.reduce((s,a)=>s+a,0)/(4*Math.PI*6371**2)-1)<1e-8);
 const land=p.catchmentAreas.reduce((s,a,i)=>s+(p.heights[i]>=0?a:0),0),expected=grid.areas.reduce((s,a,i)=>s+(grid.heights[i]>=0?a:0),0);assert.ok(Math.abs(land/expected-1)<1e-10);
 assert.ok(p.keys.some(k=>k.startsWith('e:')));assert.ok(p.sources.every(s=>s.every(i=>i>=0&&i<grid.points.length)));
 for(let i=0;i<n;i+=31){assert.equal(p.findCell(p.points[i]),i);assert.ok(Math.abs(Math.hypot(...p.points[i])-1)<1e-10);}
});
test('river topology has sources, tributaries, lakes and ocean outlets with permanent non-Pack IDs',()=>{
 const {pack,base,hydro}=data();validateNaturalGeography(base);assert.ok(base.rivers.length>0);assert.ok(base.lakes.length>0);
 assert.ok(base.rivers.some(r=>r.parentId));assert.ok(base.rivers.some(r=>pack.heights[pack.findCell(r.geometry.at(-1))]<0));
 assert.ok(hydro.order.length===pack.points.length);assert.ok(base.rivers.every(r=>r.id.startsWith('river-123-')));
 for(const r of base.rivers)assert.ok(r.geometry.every(p=>p.every(Number.isFinite)));
 for(const l of base.lakes)assert.ok(l.waterLevelM<=validateLakeLevel(pack,l));
 for(const l of hydro.lakes)for(const m of l.months)assert.ok(Math.abs(m.balanceErrorM3)<Math.max(1,m.inflowM3)*1e-10);
 assert.throws(()=>drainageOrder(new Int32Array([1,0])),/cycle/);
});
test('rebuilding Pack density retains every entity, custom name, geometry, rim and relations',()=>{
 const {grid,c,base}=data(),saved=JSON.parse(JSON.stringify(base));saved.rivers[0].name='自訂主河';saved.lakes[0].name='自訂湖泊';
 const snapshot=JSON.stringify(saved),p2=generateSphericalPack(grid,{detail:2}),h=deriveHydrology(p2,c,saved);
 assert.equal(JSON.stringify(saved),snapshot);assert.deepEqual(h.rivers.map(r=>r.id),saved.rivers.map(r=>r.id));assert.deepEqual(h.lakes.map(l=>l.id),saved.lakes.map(l=>l.id));
 assert.equal(saved.rivers[0].name,'自訂主河');assert.equal(saved.lakes[0].name,'自訂湖泊');
});
test('drought lowers discharge without erasing channels / lakes or user names',()=>{
 const {pack,c,base,hydro}=data(),dry={months:c.months.map(m=>({...m,precipitation:new Float32Array(m.precipitation.length)}))},snapshot=JSON.stringify(base),h=deriveHydrology(pack,dry,base);
 assert.equal(JSON.stringify(base),snapshot);assert.equal(h.rivers.length,base.rivers.length);
 assert.ok(h.rivers.every((r,i)=>r.monthlyDischargeM3s.reduce((s,x)=>s+x,0)<=hydro.rivers[i].monthlyDischargeM3s.reduce((s,x)=>s+x,0)+1e-6));
 assert.ok(h.rivers.some(r=>r.seasonalDryMonths===12));
});
test('lake edit is atomic, rejects over-rim levels, and separates bed, surface and extent',()=>{
 const {pack,c,base}=data(),l=base.lakes[0],snapshot=JSON.stringify(base),spill=validateLakeLevel(pack,l);
 assert.throws(()=>editNaturalGeography(pack,c,base,{id:l.id,waterLevelM:spill+1}),/Lake level/);assert.equal(JSON.stringify(base),snapshot);
 const level=(Math.min(...l.bed.map(b=>b.floorM))+spill)/2,edited=editNaturalGeography(pack,c,base,{id:l.id,name:'低水位湖',waterLevelM:level});
 assert.equal(edited.lakes[0].id,l.id);assert.deepEqual(edited.lakes[0].bed,l.bed);assert.equal(edited.lakes[0].waterLevelM,level);assert.equal(JSON.stringify(base),snapshot);
 const duplicate=JSON.parse(snapshot);duplicate.rivers[0].id=l.id;assert.throws(()=>validateNaturalGeography(duplicate),/identity/);
 const loop=base.rivers[0].geometry;assert.throws(()=>editNaturalGeography(pack,c,base,{id:base.rivers[0].id,geometry:[...loop,loop[0]]}),/loops|cycle/);
});
test('channel geometry and lake bed / shore edits persist independently from Grid terrain',()=>{
 const {pack,c,base,grid}=data(),original=grid.heights.slice(),r=base.rivers[0],geometry=r.geometry.map(p=>[...p]);geometry[0][0]+=.001;
 const channel=editNaturalGeography(pack,c,base,{id:r.id,geometry,notes:'河道編輯'});
 assert.equal(channel.rivers[0].id,r.id);assert.deepEqual(channel.rivers[0].geometry,geometry);assert.equal(channel.rivers[0].notes,'河道編輯');
 const lake=base.lakes[0],rows=lake.bed.map(b=>[...b.position,b.floorM-5]),bottom=editNaturalGeography(pack,c,base,{id:lake.id,bed:rows});
 assert.equal(bottom.lakes[0].id,lake.id);assert.equal(bottom.lakes[0].bed[0].floorM,lake.bed[0].floorM-5);
 const center=pack.findCell(lake.bed[0].position),ids=new Set(lake.bed.map(b=>pack.findCell(b.position))),next=pack.neighbors[center].find(j=>!ids.has(j)&&pack.heights[j]>0);
 if(next!==undefined){
  const position=toLonLat(pack.points[next]),bed=[...lake.bed,{position,floorM:lake.bed[0].floorM,areaKm2:pack.catchmentAreas[next],ring:pack.rings[next].map(toLonLat)}],rim=lakeRimForBed(pack,bed),spill=Math.min(...rim.map(r=>r.heightM));
  const edited=editNaturalGeography(pack,c,base,{id:lake.id,bed:bed.map(b=>[...b.position,b.floorM]),waterLevelM:(spill+Math.min(...bed.map(b=>b.floorM)))/2});
  assert.equal(edited.lakes[0].bed.length,lake.bed.length+1);assert.equal(edited.lakes[0].id,lake.id);
 }
 assert.deepEqual(grid.heights,original);
});
test('monthly soil / snow water balance has mm units and closes without invented dry-land water',()=>{
 const t=[-5,-3,2,8,14,20,23,22,15,8,2,-2],p=Array(12).fill(60),w=monthlyWaterBalance(t,p,45);
 for(let m=0;m<12;m++)assert.ok(Math.abs(p[m]-w.aet[m]-w.runoff[m]-w.storageChange[m]-w.snowChange[m])<1e-8);
 assert.ok(w.pet.every(x=>Number.isFinite(x)&&x>=0));assert.equal(potentialEvapotranspiration(Array(12).fill(-10),60).reduce((s,x)=>s+x,0),0);
 const dry=monthlyWaterBalance(Array(12).fill(25),Array(12).fill(0),25);assert.ok(dry.runoff.every(x=>x===0));
});
test('IUCN Level 2 is the sole main catalog; marine depth layers and evidence-aware subterranean handling',()=>{
 const {pack,hydro}=data(),e=derivePackEcosystems(pack,hydro);assert.equal(e.level,2);assert.equal(e.riverHabitats.length,hydro.rivers.length);assert.ok(e.riverHabitats.every(r=>r.biome==='F1'));assert.ok(Array.from(e.surface).every(i=>e.catalog[i][0]!=='F1'),'linear rivers must not replace an entire land cell');assert.equal(e.subterraneanInferred,false);assert.ok(e.catalog.every(c=>/^(T[1-6]|F[12]|M[123]|S1|TF1)$/.test(c[0])));
 assert.ok(!Array.from(e.surface).some(i=>e.catalog[i][0]==='S1'));
 const warm=Array(12).fill(25),rain=Array(12).fill(140),w=monthlyWaterBalance(warm,rain,0);
 assert.equal(classifyPotentialEcosystem(warm,rain,w,{ocean:true,depth:150}),'M1');assert.equal(classifyPotentialEcosystem(warm,rain,w,{ocean:true,depth:3000}),'M2');
 assert.equal(classifyPotentialEcosystem(warm,rain,w,{lake:true}),'F2');assert.equal(classifyPotentialEcosystem(warm,rain,w,{river:true}),'F1');assert.equal(classifyPotentialEcosystem(warm,rain,w,{wetland:true}),'TF1');
 assert.equal(classifyPotentialEcosystem(warm,rain,w),'T1');const cold=Array(12).fill(2);assert.equal(classifyPotentialEcosystem(cold,rain,monthlyWaterBalance(cold,rain,70)),'T6');
 for(let i=0;i<pack.points.length;i++)if(pack.heights[i]< -200)assert.equal(ECOSYSTEMS[e.seabed[i]][0],'M3');
 assert.ok(km(fromLonLat([179.9,0]),fromLonLat([-179.9,0]))<25);
});

test('fantasy overlays do not override IUCN natural baseline or hydrological identity',()=>{
 const {pack,c,base,hydro}=data(),natural=derivePackEcosystems(pack,hydro),overlay=JSON.parse(JSON.stringify(base));overlay.overlays.push({id:'magic-zone',name:'奇幻環境',description:'獨立覆蓋',geometry:[[0,0],[1,0],[0,1]]});validateNaturalGeography(overlay);
 const recomputed=derivePackEcosystems(pack,deriveHydrology(pack,c,overlay));assert.deepEqual(recomputed.surface,natural.surface);assert.deepEqual(overlay.rivers,base.rivers);
 const pet=Array(12).fill(100);assert.equal(classifyPotentialEcosystem(Array(12).fill(15),Array(12).fill(60),{pet}),'T3');assert.equal(classifyPotentialEcosystem(Array(12).fill(25),Array(12).fill(60),{pet}),'T4');assert.equal(classifyPotentialEcosystem(Array(12).fill(25),Array(12).fill(5),{pet}),'T5');assert.equal(classifyPotentialEcosystem(Array(12).fill(10),Array(12).fill(150),{pet}),'T2');
});

test('generated rivers have no bare-land terminals and preserve existing lake definitions on regeneration',()=>{
 const {pack,c,base}=data(),again=generateNaturalGeography(pack,c,123,'zh-TW',{lakes:base.lakes});
 const byId=new Map(again.rivers.map(r=>[r.id,r]));
 for(const r of again.rivers){
  const mouth=pack.findCell(r.geometry.at(-1));
  assert.ok(r.parentId||r.mouthLakeId||pack.heights[mouth]<0,`orphan ${r.id}`);
  if(r.parentId)assert.ok(byId.get(r.parentId).geometry.some(p=>p.every((x,k)=>Math.abs(x-r.geometry.at(-1)[k])<1e-6)));
 }
 assert.deepEqual(again.lakes.map(({inletIds,outletId,...l})=>l),base.lakes.map(({inletIds,outletId,...l})=>l));
});
test('extreme heat still evaporates water; seasonal rainfall distinguishes dry-summer shrubland from moist forest',()=>{
 const heat=potentialEvapotranspiration(Array(12).fill(55),20);
 assert.ok(heat.every(p=>p>100));
 const t=[8,9,12,16,21,26,29,29,25,19,13,9],dry=[180,150,120,60,15,3,1,2,10,70,150,180],wet=Array(12).fill(120);
 assert.equal(classifyPotentialEcosystem(t,dry,monthlyWaterBalance(t,dry,35)),'T3');
 assert.equal(classifyPotentialEcosystem(t,wet,monthlyWaterBalance(t,wet,35)),'T2');
});

test('terrain capacity varies with slope and all capacities conserve monthly water',async()=>{
 const {terrainWaterCapacity}=await import('./ecosystem-water.mjs');
 const pack={points:[fromLonLat([0,0]),fromLonLat([.1,0]),fromLonLat([-.1,0])],neighbors:[[1,2],[0],[0]],heights:[100,100,100]};
 const flat=terrainWaterCapacity(pack,0);pack.heights[0]=1000;const steep=terrainWaterCapacity(pack,0);assert.ok(flat.capacityMm>steep.capacityMm);assert.ok(steep.capacityMm>=60&&flat.capacityMm<=240);
 for(const capacityMm of [60,150,240]){const t=[-5,-3,2,8,14,20,23,22,15,8,2,-2],p=Array(12).fill(60),w=monthlyWaterBalance(t,p,45,{capacityMm});assert.ok(w.soil.every(s=>s>=0&&s<=capacityMm));for(let m=0;m<12;m++)assert.ok(Math.abs(p[m]-w.aet[m]-w.runoff[m]-w.storageChange[m]-w.snowChange[m])<1e-8);}
});
test('habitats distinguish seasonal water, cold forests and deserts without random categories',async()=>{
 const {classifyPotentialHabitat,HABITATS}=await import('./ecosystem-water.mjs');
 const samples=[
  {t:Array(12).fill(25),p:Array(12).fill(160),lat:0,expect:'rainforest'},
  {t:Array(12).fill(25),p:[20,20,20,120,180,200,200,180,180,120,80,50],lat:10,expect:'seasonal-forest'},
  {t:[-12,-10,-3,5,12,17,20,18,12,5,-3,-9],p:Array(12).fill(90),lat:55,expect:'boreal'},
  {t:[4,5,7,10,13,16,18,18,15,11,7,5],p:Array(12).fill(180),lat:45,expect:'temperate-rainforest'},
  {t:Array(12).fill(28),p:Array(12).fill(1),lat:25,expect:'hot-desert'},
  {t:Array(12).fill(-8),p:Array(12).fill(20),lat:80,expect:'snow-ice'},
 ];
 for(const s of samples){const w=monthlyWaterBalance(s.t,s.p,s.lat),h=classifyPotentialHabitat(s.t,s.p,w);assert.equal(h,s.expect);assert.ok(HABITATS.some(c=>c[0]===h));}
 const e=derivePackEcosystems(data().pack,data().hydro);assert.equal(e.habitatCatalog.length,24);assert.ok(e.landSurface.every(h=>!HABITATS[h][4].startsWith('M')));assert.ok(e.seaSurface.every(h=>HABITATS[h][4].startsWith('M')));
});
test('changed-mesh river projection repairs derived loops without inventing inland outlets',async()=>{
 const {reconnectDrainage}=await import('./pack-hydrology.mjs');
 const pack={points:[0,1,2,3].map(x=>fromLonLat([x,0])),heights:[-10,10,20,30],neighbors:[[1],[0,2],[1,3],[2]]};
 const receivers=new Int32Array([-1,2,1,2]),locked=new Uint8Array([0,1,1,0]);assert.throws(()=>reconnectDrainage(pack,receivers.slice(),locked.slice()),/cycle/);
 reconnectDrainage(pack,receivers,locked,{repairProjection:true});assert.equal(drainageOrder(receivers).order.length,4);assert.equal(receivers[0],-1);assert.ok(Array.from(receivers).slice(1).every(j=>j>=0));
});
