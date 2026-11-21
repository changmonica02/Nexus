// Ordered spherical shoreline loops shared by land fill, shore strokes and
// river mouths. Refinement rounds vertices and adds bounded shoreline detail.
import {unit,clamp,cross,dot} from '../../../../experiments/spherical-grid/geologic-fields.mjs';
import {valueNoise3} from '../../../../experiments/spherical-grid/spherical-terrain-refinement.mjs';
const subtract=(a,b)=>a.map((v,k)=>v-b[k]);
function faceVertex(points,[i,j,k]){
 const a=points[i],b=points[j],c=points[k];
 const normal=unit(cross(subtract(b,a),subtract(c,a)));
 return dot(normal,a)<0?normal.map(v=>-v):normal;
}
function refineCoast(raw,seed){
 const result=[];
 function addDetail(a,b,depth){
  const midpoint=mix(a,b,.5),length=Math.hypot(...subtract(a,b));
  const terrain=.65*valueNoise3(midpoint,9,seed)+.35*valueNoise3(midpoint,18,seed^0x55fa);
  const roughness=clamp(terrain+.53,0,1);
  if(roughness<.43||length<.0018||depth===0)return;
  // The same edge bends the same way if feature traversal reverses.
  const forward=(a[0]-b[0]||a[1]-b[1]||a[2]-b[2])<0;
  const normal=unit(forward?cross(a,b):cross(b,a));
  const noise=valueNoise3(midpoint,depth===2?390:790,seed^0x5f27);
  const offset=length*(depth===2?.13:.085)*roughness*noise;
  const displaced=unit(midpoint.map((v,k)=>v+normal[k]*offset));
  addDetail(a,displaced,depth-1);
  result.push(displaced);
  addDetail(displaced,b,depth-1);
 }
 for(let i=0;i<raw.length;i++){
  const a=raw[i],b=raw[(i+1)%raw.length];
  if(Math.hypot(...subtract(a,b))<1e-8)continue;
  const before=mix(a,b,.14),after=mix(a,b,.86);
  const previous=raw[(i+raw.length-1)%raw.length],incoming=mix(previous,a,.86);
  // Sample the quadratic corner in 3D before projecting it. The same
  // samples are then used for line drawing, clipping and river intersections.
  for(const t of [.25,.5,.75]){
   const u=1-t;
   result.push(unit(a.map((v,k)=>u*u*incoming[k]+2*u*t*v+t*t*before[k])));
  }
  result.push(before);
  if(seed!==undefined)addDetail(before,after,2);
  result.push(after);
 }
 return result;
}
const mix=(a,b,t)=>unit(a.map((v,k)=>v*(1-t)+b[k]*t));
const project=p=>[Math.atan2(p[1],p[0])*180/Math.PI,Math.asin(clamp(p[2]))*180/Math.PI];
export function insideProjectedRing(point,ring){let hit=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>point[1])!==(b[1]>point[1])&&point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit;}
export function projectShoreRing(points){
 const ring=points.map(project);for(let i=1;i<ring.length;i++){while(ring[i][0]-ring[i-1][0]>180)ring[i][0]-=360;while(ring[i][0]-ring[i-1][0]< -180)ring[i][0]+=360;}
 if(Math.abs(ring.at(-1)[0]-ring[0][0])>180){const pole=points.reduce((s,p)=>s+p[2],0)>=0?90:-90;ring.push([ring.at(-1)[0],pole],[ring[0][0],pole]);}
 const shift=Math.floor((ring.reduce((s,p)=>s+p[0],0)/ring.length+180)/360)*360;return ring.map(([x,y])=>[x-shift,y]);
}
/** @returns {{land:number[][][],coast:number[][][],inverse:boolean;shorelines:number[][][]}} */
export function createCoastSurface(grid,ocean,{seed=undefined,voronoi=false,smooth=true}={}){
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
   raw.push(voronoi?faceVertex(grid.points,grid.triangles[current]):crossing.point);previous=current;current=crossing.face;
  }while(current!==start);
  const refined=smooth?refineCoast(raw,seed):raw;
  if(refined.length>=3){refined.push(refined[0]);loops.push(refined);}
 }
 const land=loops.map(projectShoreRing),probeIndex=Math.max(0,grid.points.findIndex(p=>Math.abs(p[2])<.999999)),probe=project(grid.points[probeIndex]);let parity=false;
 for(const ring of land)for(const shift of [-360,0,360])if(insideProjectedRing([probe[0]+shift,probe[1]],ring))parity=!parity;
 const inverse=parity!==(ocean[probeIndex]===0),coast=[];
 for(const loop of loops)for(let i=1;i<loop.length;i++){const a=project(loop[i-1]),b=project(loop[i]);while(b[0]-a[0]>180)b[0]-=360;while(b[0]-a[0]< -180)b[0]+=360;coast.push([a,b]);}
 // The fill can need a pole cap in this projection. The shoreline ends
 // before those synthetic cap vertices, so it never strokes the map frame.
 const shorelines=land.map((ring,i)=>ring.slice(0,loops[i].length));
 return {land,coast,inverse,shorelines};
}
const latitudeIndex=new WeakMap();
function coastNearSegment(coast,a,b){
 let index=latitudeIndex.get(coast);
 const band=lat=>Math.floor((lat+90)/2);
 if(!index){
  index=Array.from({length:91},()=>[]);
  for(const segment of coast){
   const [p,q]=segment;
   for(let i=band(Math.min(p[1],q[1]));i<=band(Math.max(p[1],q[1]));i++)index[i].push(segment);
  }
  latitudeIndex.set(coast,index);
 }
 const first=band(Math.min(a[1],b[1])),last=band(Math.max(a[1],b[1]));
 return first===last?index[first]:new Set(index.slice(first,last+1).flat());
}
export function shorelineIntersection(a,b,coast){
 // Local unwrapped segments are sufficient because routing steps are short.
 const unwrap=(p,reference)=>{const q=[...p];while(q[0]-reference>180)q[0]-=360;while(q[0]-reference< -180)q[0]+=360;return q;};
 const end=unwrap(b,a[0]),dx=end[0]-a[0],dy=end[1]-a[1];let best=null,minimum=Infinity;
 for(const [rawC,rawD] of coastNearSegment(coast,a,b)){const c=unwrap(rawC,a[0]),d=unwrap(rawD,c[0]),ex=d[0]-c[0],ey=d[1]-c[1],den=dx*ey-dy*ex;if(Math.abs(den)<1e-12)continue;const t=((c[0]-a[0])*ey-(c[1]-a[1])*ex)/den,u=((c[0]-a[0])*dy-(c[1]-a[1])*dx)/den;if(t>=0&&t<=1&&u>=0&&u<=1&&t<minimum){minimum=t;best=[((a[0]+t*dx+180)%360+360)%360-180,a[1]+t*dy];}}
 return best;
}
