// Ordered spherical shoreline loops shared by land fill, shore strokes and
// river mouths. Corner refinement follows the same graph; it never invents bays.
import {unit,clamp} from '../../../../experiments/spherical-grid/geologic-fields.mjs';
const mix=(a,b,t)=>unit(a.map((v,k)=>v*(1-t)+b[k]*t));
const project=p=>[Math.atan2(p[1],p[0])*180/Math.PI,Math.asin(clamp(p[2]))*180/Math.PI];
export function insideProjectedRing(point,ring){let hit=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>point[1])!==(b[1]>point[1])&&point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit;}
export function projectShoreRing(points){
 const ring=points.map(project);for(let i=1;i<ring.length;i++){while(ring[i][0]-ring[i-1][0]>180)ring[i][0]-=360;while(ring[i][0]-ring[i-1][0]< -180)ring[i][0]+=360;}
 if(Math.abs(ring.at(-1)[0]-ring[0][0])>180){const pole=points.reduce((s,p)=>s+p[2],0)>=0?90:-90;ring.push([ring.at(-1)[0],pole],[ring[0][0],pole]);}
 const shift=Math.floor((ring.reduce((s,p)=>s+p[0],0)/ring.length+180)/360)*360;return ring.map(([x,y])=>[x-shift,y]);
}
/** @returns {{land:number[][][],coast:number[][][],inverse:boolean}} */
export function createCoastSurface(grid,ocean){
 // Trace the categorical sea-level contour through crossed primal edges.
 // Circumcenters can sit outside an obtuse triangle and send the coast
 // across a neighbouring cell; midpoint crossings stay on the actual edge.
 const edges=new Map();
 grid.triangles.forEach((face,t)=>face.forEach((a,k)=>{
  const b=face[(k+1)%3];if(ocean[a]===ocean[b])return;
  const key=a<b?a*grid.points.length+b:b*grid.points.length+a;
  if(edges.has(key))edges.get(key).faces.push(t);
  else edges.set(key,{faces:[t],point:mix(grid.points[a],grid.points[b],.5)});
 }));
 const adjacency=new Map();
 for(const {faces,point} of edges.values()){
  if(faces.length!==2)throw Error('Shoreline requires a closed sphere');
  for(let i=0;i<2;i++){
   if(!adjacency.has(faces[i]))adjacency.set(faces[i],[]);
   adjacency.get(faces[i]).push({face:faces[1-i],point});
  }
 }
 const visited=new Set(),loops=[];
 for(const start of adjacency.keys())if(!visited.has(start)){
  const raw=[];let current=start,previous=-1;
  do{
   if(visited.has(current))throw Error('Shoreline does not form disjoint loops');
   visited.add(current);
   const next=adjacency.get(current);
   if(next.length!==2)throw Error('Shoreline is not manifold');
   const crossing=next.find(edge=>edge.face!==previous);
   raw.push(crossing.point);previous=current;current=crossing.face;
  }while(current!==start);
  const refined=[];
  for(let i=0;i<raw.length;i++){
   const a=raw[i],b=raw[(i+1)%raw.length];
   refined.push(mix(a,b,.12),mix(a,b,.88));
  }
  refined.push(refined[0]);loops.push(refined);
 }
 const land=loops.map(projectShoreRing),probeIndex=Math.max(0,grid.points.findIndex(p=>Math.abs(p[2])<.999999)),probe=project(grid.points[probeIndex]);let parity=false;
 for(const ring of land)for(const shift of [-360,0,360])if(insideProjectedRing([probe[0]+shift,probe[1]],ring))parity=!parity;
 const inverse=parity!==(ocean[probeIndex]===0),coast=[];
 for(const loop of loops)for(let i=1;i<loop.length;i++){const a=project(loop[i-1]),b=project(loop[i]);while(b[0]-a[0]>180)b[0]-=360;while(b[0]-a[0]< -180)b[0]+=360;coast.push([a,b]);}
 return {land,coast,inverse};
}
export function shorelineIntersection(a,b,coast){
 // Local unwrapped segments are sufficient because routing steps are short.
 const unwrap=(p,reference)=>{const q=[...p];while(q[0]-reference>180)q[0]-=360;while(q[0]-reference< -180)q[0]+=360;return q;};
 const end=unwrap(b,a[0]),dx=end[0]-a[0],dy=end[1]-a[1];let best=null,minimum=Infinity;
 for(const [rawC,rawD] of coast){const c=unwrap(rawC,a[0]),d=unwrap(rawD,c[0]),ex=d[0]-c[0],ey=d[1]-c[1],den=dx*ey-dy*ex;if(Math.abs(den)<1e-12)continue;const t=((c[0]-a[0])*ey-(c[1]-a[1])*ex)/den,u=((c[0]-a[0])*dy-(c[1]-a[1])*dx)/den;if(t>=0&&t<=1&&u>=0&&u<=1&&t<minimum){minimum=t;best=[((a[0]+t*dx+180)%360+360)%360-180,a[1]+t*dy];}}
 return best;
}
