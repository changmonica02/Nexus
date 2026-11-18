require('../loadStudy.cjs');
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {unwrapRing,createGlobalMapDrawing}=require('../../src/features/worldMap/globalMapGeometry.ts');
test('spherical display unwraps date-line polygons and closes polar caps without changing source coordinates',()=>{
 const input=[[179,10],[-179,11],[-178,9]],copy=structuredClone(input),ring=unwrapRing(input);
 assert.deepEqual(input,copy);assert.ok(ring.every((p,i)=>!i||Math.abs(p[0]-ring[i-1][0])<180));
 const polar=unwrapRing([[-170,88],[-60,88],[60,88],[170,88]],90);
 assert.equal(polar.at(-1)[1],90);assert.equal(polar.at(-2)[1],90);
});
test('global worker builds the authoritative mask and loads stored heights instead of regenerating from settings',()=>{
 const messages=[],scope={postMessage:v=>messages.push(v)},context=vm.createContext({self:scope,performance,console,Uint8Array,Int8Array,Float64Array,Int16Array,Set,Map});
 vm.runInContext(fs.readFileSync('.cache/global-map-worker.js','utf8'),context);
 scope.onmessage({data:{id:1,action:'generate',settings:{seed:42,landPercent:32,continentCores:8,gridCells:36002}}});
 const first=messages.pop();assert.equal(first.error,undefined);assert.equal(first.project.geologyVersion,2);assert.ok(first.drawing.geology);assert.equal(first.drawing.plates.length,first.drawing.plateCount);assert.equal(first.project.terrain.heights.length,36002);assert.ok(first.drawing.land.length>1000);assert.ok(first.drawing.coast.length>100);
 assert.equal(first.drawing.relief.reduce((n,band)=>n+band.rings.length,0),36002,'all land and seabed cells must be represented in the height preview');
 assert.ok(first.drawing.relief.filter(band=>band.rings.length).length>=8,'preview distinguishes shallow/deep ocean and land elevations');
 assert.ok(first.drawing.plateCount>=6&&first.drawing.plateCount<=12,'plate domains should be derived from terrain');
 assert.ok(first.drawing.plateBoundaries.length>100,'boundaries are an overlay, not shorelines');
 assert.ok(first.drawing.plateBoundaries.every(line=>line.length===2&&Math.abs(line[0][0]-line[1][0])<=180));
 // Seed is provenance; a valid snapshot's terrain remains authoritative even if it differs from a new generation.
 const copy=JSON.parse(JSON.stringify(first.project));copy.settings.seed=99;
 scope.onmessage({data:{id:2,action:'load',project:copy}});const loaded=messages.pop();
 assert.equal(loaded.error,undefined);assert.deepEqual(JSON.parse(JSON.stringify(loaded.drawing)),JSON.parse(JSON.stringify(first.drawing)));
 const legacy=JSON.parse(JSON.stringify(first.project));delete legacy.geologyVersion;scope.onmessage({data:{id:20,action:'load',project:legacy}});const old=messages.pop();assert.equal(old.error,undefined);assert.equal(old.drawing.geology,undefined,'legacy projects retain the prior tectonic analysis');assert.deepEqual(old.project.terrain,legacy.terrain);
 const unknown=JSON.parse(JSON.stringify(first.project));unknown.geologyVersion=99;scope.onmessage({data:{id:21,action:'load',project:unknown}});assert.ok(messages.pop().error);
 copy.terrain.heights[0]=101;scope.onmessage({data:{id:3,action:'load',project:copy}});assert.ok(messages.pop().error);
 scope.onmessage({data:{id:4,action:'generate',settings:{seed:-1,landPercent:32,continentCores:8,gridCells:36002}}});assert.ok(messages.pop().error);
});
