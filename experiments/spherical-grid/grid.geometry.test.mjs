import test from 'node:test';
import assert from 'node:assert/strict';
import {generate} from './grid.mjs';
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const sub=(a,b)=>a.map((x,i)=>x-b[i]);
for(const f of [55,60,64])test('geometric dual and closed edges at frequency '+f,()=>{
 const grid=generate(f),edgeCount=new Map();let badCircles=0,wrapped=0;
 for(const face of grid.triangles){
  const [a,b,c]=face.map(i=>grid.points[i]);const n=cross(sub(b,a),sub(c,a));const length=Math.hypot(...n);
  const center=n.map(x=>x/length),d=dot(center,a);
  assert.ok(d>0);
  const candidates=new Set(face.flatMap(i=>grid.neighbors[i]));
  for(const j of candidates)if(dot(center,grid.points[j])>d+1e-10)badCircles++;
  for(let k=0;k<3;k++){
   const a=face[k],b=face[(k+1)%3];const key=Math.min(a,b)+':'+Math.max(a,b);
   edgeCount.set(key,(edgeCount.get(key)||0)+1);
  }
 }
 assert.equal(badCircles,0);assert.equal(edgeCount.size,3*grid.points.length-6);
 assert.ok([...edgeCount.values()].every(n=>n===2));
 for(let i=0;i<grid.points.length;i++){
  const [x,y]=grid.points[i];const lon=Math.atan2(y,x);
  if(Math.abs(lon)<3)continue;
  for(const j of grid.neighbors[i]){
   const [u,v]=grid.points[j],other=Math.atan2(v,u);
   if(Math.abs(lon-other)>Math.PI)wrapped++;
  }
 }
 assert.ok(wrapped>0);assert.ok(grid.areas.every(area=>area>0));
});
