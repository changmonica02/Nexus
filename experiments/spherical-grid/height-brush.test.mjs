import test from 'node:test';
import assert from 'node:assert/strict';
import {heightBrushChanges} from '../../src/features/worldMap/core/heightBrush.mjs';
const point=(lon,lat=0)=>[Math.cos(lat*Math.PI/180)*Math.cos(lon*Math.PI/180),Math.cos(lat*Math.PI/180)*Math.sin(lon*Math.PI/180),Math.sin(lat*Math.PI/180)];
const grid={points:[point(179),point(-179),point(0)],heights:Int8Array.from([2,-2,40]),neighbors:[[1],[0],[0]]};
const brush={longitude:180,latitude:0,radius:5,strength:10,tool:'lower',mode:'preserve',target:'land'};
test('preserve clamps land and ocean without changing source heights',()=>{
 assert.deepEqual(heightBrushChanges(grid,brush),[{id:0,height:0}]);
 assert.deepEqual(heightBrushChanges(grid,{...brush,target:'ocean',tool:'raise'}),[{id:1,height:-1}]);
 assert.deepEqual([...grid.heights],[2,-2,40]);
});
test('free brush wraps the date line and crosses sea level',()=>{
 assert.deepEqual(heightBrushChanges(grid,{...brush,mode:'free'}),[{id:0,height:-8},{id:1,height:-12}]);
});
test('all brushes have bounded, repeatable results and reject invalid inputs',()=>{
 for(const tool of ['raise','lower','raiseGradient','lowerGradient','smooth','noise']){
  const b={...brush,mode:'free',tool};const a=heightBrushChanges(grid,b);
  assert.deepEqual(a,heightBrushChanges(grid,b));assert.ok(a.every(c=>Number.isInteger(c.height)&&Math.abs(c.height)<=100));
 }
 for(const bad of [{radius:0},{latitude:91},{strength:NaN},{mode:'unknown'}])assert.throws(()=>heightBrushChanges(grid,{...brush,...bad}));
});
test('line brush follows the short great-circle arc over the date line',()=>{
 const changes=heightBrushChanges(grid,{...brush,longitude:170,mode:'free',tool:'line',end:[-170,0]});
 assert.deepEqual(changes,[{id:0,height:12},{id:1,height:8}]);
 assert.throws(()=>heightBrushChanges(grid,{...brush,tool:'line',end:[0,0]}));
});
test('Nexus brush bundles independently without Azgaar or generated tools',async()=>{
 const {build}=await import('esbuild');
 const result=await build({entryPoints:['src/features/worldMap/core/heightBrush.mjs'],bundle:true,write:false,metafile:true,platform:'browser'});
 assert.deepEqual(Object.keys(result.metafile.inputs),['src/features/worldMap/core/heightBrush.mjs']);
});
test('drag strokes use short spherical arcs and commit their final changes atomically',async()=>{
 const {sampleHeightStroke,heightStrokeChanges}=await import('../../src/features/worldMap/core/heightBrush.mjs');
 const settings={...brush,tool:'raise',mode:'free'},stamps=sampleHeightStroke(settings,[[170,0],[-170,0]]);
 assert.ok(stamps.length>2);assert.ok(stamps.every(s=>Math.abs(s.longitude)>160));
 const before=[...grid.heights],changes=heightStrokeChanges(grid,stamps);assert.deepEqual([...grid.heights],before);assert.ok(changes.some(c=>c.id===0));assert.ok(changes.some(c=>c.id===1));assert.ok(!changes.some(c=>c.id===2));
 assert.throws(()=>heightStrokeChanges(grid,[stamps[0],{...stamps[0],radius:0}]));assert.deepEqual([...grid.heights],before);
 assert.throws(()=>sampleHeightStroke(settings,[[0,0],[180,0]]));
});
test('stroke spacing does not depend on pointer event density',async()=>{
 const {sampleHeightStroke}=await import('../../src/features/worldMap/core/heightBrush.mjs');
 const settings={...brush,tool:'raise'},sparse=sampleHeightStroke(settings,[[170,0],[-170,0]]),dense=sampleHeightStroke(settings,[[170,0],[175,0],[179,0],[-175,0],[-170,0]]);
 assert.equal(sparse.length,dense.length);
 sparse.forEach((p,i)=>assert.ok(Math.abs(((p.longitude-dense[i].longitude+540)%360)-180)<1e-6));
});
test('cursor footprint uses the physical angular radius and unwraps seam crossings',async()=>{
 const {sphericalBrushRing}=await import('../../src/features/worldMap/core/heightBrush.mjs');
 const ring=sphericalBrushRing(0,0,5);assert.ok(Math.abs(Math.max(...ring.map(p=>p[1]))-5)<1e-8);assert.ok(Math.abs(Math.min(...ring.map(p=>p[0]))+5)<1e-8);
 const seam=sphericalBrushRing(179,0,5);assert.ok(Math.max(...seam.map(p=>p[0]))-Math.min(...seam.map(p=>p[0]))<11);
 const pole=sphericalBrushRing(0,90,5);assert.ok(pole.every(p=>Math.abs(p[1]-85)<1e-8));assert.ok(pole.slice(1).every((p,i)=>Math.abs(p[0]-pole[i][0])<10));
});
test('preserved smoothing does not bleed ocean heights into coastal land',()=>{
 assert.deepEqual(heightBrushChanges(grid,{...brush,tool:'smooth',strength:100}),[]);
 assert.ok(heightBrushChanges(grid,{...brush,tool:'smooth',strength:100,mode:'free'}).some(c=>c.id===0&&c.height<0));
});
