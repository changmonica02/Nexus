import test from 'node:test';
import assert from 'node:assert/strict';
import {heightBrushChanges} from './height-brush.mjs';
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
