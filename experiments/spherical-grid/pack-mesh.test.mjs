import test from 'node:test';
import assert from 'node:assert/strict';
import {generate,setHeight,RADIUS_KM} from './grid.mjs';
import {oceanConnected} from './pack.mjs';
import {createSphericalPack} from './pack-mesh.mjs';
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
for(const f of [8,20,55,60,64])test('Pack has closed manifold and spherical Delaunay dual, frequency '+f,()=>{
 const g=generate(f);g.points.forEach(([x],i)=>setHeight(g,i,x<0?-20:20));
 const savedPoints=g.points.map(p=>p.slice()),savedHeights=Int8Array.from(g.heights);
 const ocean=oceanConnected(g,g.points.findIndex(p=>p[0]<0));
 const p=createSphericalPack(g,ocean);
 assert.equal(p.skipped,0);
 assert.equal(p.inserted,p.coastEdges.length);
 assert.equal(p.points.length,g.points.length+p.inserted);
 assert.equal(p.triangles.length,2*p.points.length-4);
 assert.equal(p.neighbors.reduce((s,x)=>s+x.length,0)/2,3*p.points.length-6);
 assert.ok(p.inserted>0);
 const expected=4*Math.PI*RADIUS_KM**2;
 assert.ok(Math.abs(p.areas.reduce((a,b)=>a+b,0)-expected)/expected<1e-9);
 const edge=new Map();
 for(const [a,b,c] of p.triangles)for(const [u,v] of [[a,b],[b,c],[c,a]]){
  const key=Math.min(u,v)+':'+Math.max(u,v);edge.set(key,(edge.get(key)||0)+1);
 }
 assert.ok([...edge.values()].every(v=>v===2));
 let violations=0;
 for(const face of p.triangles){
  const [a,b,c]=face.map(i=>p.points[i]),n=cross(sub(b,a),sub(c,a)),length=Math.hypot(...n);
  const center=n.map(v=>v/length),threshold=dot(center,a);
  for(const id of face.flatMap(i=>p.neighbors[i]))if(dot(center,p.points[id])>threshold+1e-10)violations++;
 }
 assert.equal(violations,0);
 assert.ok(p.heights.every((h,i)=>h===g.heights[p.sourceIds[i]]));
 assert.deepEqual(g.points,savedPoints);
 assert.deepEqual(g.heights,savedHeights);
 const again=createSphericalPack(g,ocean);
 assert.deepEqual(again.sourceIds,p.sourceIds);
 assert.equal(again.inserted,p.inserted);
 console.log(JSON.stringify({frequency:f,grid:g.points.length,pack:p.points.length,inserted:p.inserted,flips:p.flips,skipped:p.skipped}));
});
