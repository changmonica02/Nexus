import {createCoastSurface} from '../../src/features/worldMap/core/coastSurface.mjs';
// Azgaar's retained sites / coastal splits / Grid mapping, adapted to a sphere.
// Stereographic Delaunay + the omitted pole closes the convex hull on S².
import Delaunator from 'delaunator';
import {dot,cross,unit,km,EARTH_KM} from './geologic-fields.mjs';
export const toLonLat=p=>[Math.atan2(p[1],p[0])*180/Math.PI,Math.asin(Math.max(-1,Math.min(1,p[2])))*180/Math.PI].map(x=>Math.round(x*1e5)/1e5);
export const fromLonLat=([lon,lat])=>{const a=lon*Math.PI/180,b=lat*Math.PI/180;return [Math.cos(b)*Math.cos(a),Math.cos(b)*Math.sin(a),Math.sin(b)];};
const sub=(a,b)=>a.map((x,k)=>x-b[k]);
const triangleArea=(a,b,c)=>2*Math.atan2(Math.abs(dot(a,cross(b,c))),1+dot(a,b)+dot(b,c)+dot(c,a));
function triangulateSphere(points){
 const pole=points[0],east=unit(Math.abs(pole[2])<.9?cross([0,0,1],pole):cross([0,1,0],pole)),north=cross(pole,east);
 const xy=points.slice(1).map(p=>{const d=Math.max(1e-15,1-dot(p,pole));return [dot(p,east)/d,dot(p,north)/d];});
 const d=Delaunator.from(xy),triangles=[];
 for(let i=0;i<d.triangles.length;i+=3)triangles.push([d.triangles[i]+1,d.triangles[i+1]+1,d.triangles[i+2]+1]);
 for(let i=0;i<d.hull.length;i++)triangles.push([0,d.hull[i]+1,d.hull[(i+1)%d.hull.length]+1]);
 return triangles;
}
export function sphericalMesh(points){
 const triangles=triangulateSphere(points);
 const neighbors=Array.from({length:points.length},()=>new Set()),incident=Array.from({length:points.length},()=>[]),vertices=[];
 triangles.forEach((f,t)=>{
  const [a,b,c]=f.map(i=>points[i]);let v=unit(cross(sub(b,a),sub(c,a)));if(dot(v,a)<0)v=v.map(x=>-x);vertices.push(v);
  for(let k=0;k<3;k++){neighbors[f[k]].add(f[(k+1)%3]);neighbors[f[(k+1)%3]].add(f[k]);incident[f[k]].push(t);}
 });
 const rings=[],areas=new Float64Array(points.length);
 for(let i=0;i<points.length;i++){
  const p=points[i],x=unit(Math.abs(p[2])<.9?cross([0,0,1],p):cross([0,1,0],p)),y=cross(p,x);
  const ring=incident[i].map(t=>vertices[t]).sort((a,b)=>Math.atan2(dot(a,y),dot(a,x))-Math.atan2(dot(b,y),dot(b,x)));rings.push(ring);
  for(let k=0;k<ring.length;k++)areas[i]+=triangleArea(p,ring[k],ring[(k+1)%ring.length])*EARTH_KM**2;
 }
 return {triangles,neighbors:neighbors.map(s=>[...s].sort((a,b)=>a-b)),rings,areas};
}
// Cartographic Pack: use the authoritative ocean mask to mark the first
// coastal ring on both sides and one extra water ring. Keep sparse deep-ocean
// support sites so the spherical triangulation also closes far from land.
export function createPackedCoast(grid,ocean,seed=0){
 const n=grid.points.length,coastal=new Uint8Array(n);
 for(let i=0;i<n;i++)coastal[i]=grid.neighbors[i].some(j=>ocean[j]!==ocean[i])?1:0;
 const points=[],water=[],spacing2=8*Math.PI/(Math.sqrt(3)*n);
 const add=(point,isOcean)=>{points.push(point);water.push(isOcean);};
 for(let i=0;i<n;i++)if(!ocean[i]||coastal[i]||i%24===0||grid.neighbors[i].some(j=>coastal[j]))add(grid.points[i],ocean[i]);
 for(let i=0;i<n;i++)if(coastal[i])for(const j of grid.neighbors[i]){
  if(j<=i||!coastal[j]||ocean[i]!==ocean[j])continue;
  const a=grid.points[i],b=grid.points[j];
  if(2*(1-dot(a,b))<spacing2)continue;
  add(unit(a.map((v,k)=>v+b[k])),ocean[i]);
 }
 if(!ocean.some(Boolean)||!ocean.some(value=>!value))return createCoastSurface(grid,ocean);
 return createCoastSurface({points,triangles:triangulateSphere(points)},water,{seed,voronoi:true});
}

export function generateSphericalPack(grid,{detail=1,oceanMask=Uint8Array.from(grid.heights,h=>h<0?1:0),coastSurface=createPackedCoast(grid,oceanMask)}={}){
 if(![1,2].includes(detail))throw RangeError('Pack detail must be 1 or 2');
 const coast=grid.heights.map((h,i)=>grid.neighbors[i].some(j=>(grid.heights[j]<0)!==(h<0))?1:0);
 const points=[],gridRefs=[],sources=[],heights=[],keys=[];
 const add=(p,source,key)=>{points.push(p);sources.push(source);gridRefs.push(source[0]);heights.push(source.reduce((s,i)=>s+grid.heights[i]*100,0)/source.length);keys.push(key);};
 for(let i=0;i<grid.points.length;i++)if(grid.heights[i]>=0||coast[i]||i%24===0||grid.neighbors[i].some(j=>coast[j]))add(grid.points[i],[i],'g:'+i);
 for(let i=0;i<grid.points.length;i++)if(coast[i])for(const j of grid.neighbors[i])if(j>i&&coast[j]&&(grid.heights[i]<0)===(grid.heights[j]<0)){
  add(unit(grid.points[i].map((x,k)=>x+grid.points[j][k])),[i,j],`e:${i}:${j}`);
  if(detail===2){add(unit(grid.points[i].map((x,k)=>2*x+grid.points[j][k])),[i],`e:${i}:${j}:a`);add(unit(grid.points[i].map((x,k)=>x+2*grid.points[j][k])),[j],`e:${i}:${j}:b`);}
 }
 const mesh=sphericalMesh(points);
 // Land area comes from each parent Grid cell, shared among retained children.
 // Sparse deep-sea Voronoi polygons must not inflate catchment / rainfall area.
 const counts=new Uint16Array(grid.points.length);for(const source of sources)for(const g of source)counts[g]++;
 const catchmentAreas=Float64Array.from(sources,source=>source.reduce((s,g)=>s+grid.areas[g]/counts[g],0));
 const pack={version:1,detail,coastSurface,points,...mesh,gridRefs:Uint32Array.from(gridRefs),sources,keys,heights:Float64Array.from(heights),catchmentAreas};
 const build=ids=>{if(!ids.length)return null;const depth=Math.ceil(Math.log2(ids.length)),axis=depth%3;ids.sort((a,b)=>points[a][axis]-points[b][axis]||a-b);const m=ids.length>>1;return {i:ids[m],axis,left:build(ids.slice(0,m)),right:build(ids.slice(m+1))};};
 const tree=build(points.map((_,i)=>i));
 pack.findCell=position=>{
  const p=position.length===2?fromLonLat(position):position;let best=Infinity,id=0;
  const visit=node=>{if(!node)return;const q=points[node.i],distance=q.reduce((s,x,k)=>s+(x-p[k])**2,0);if(distance<best){best=distance;id=node.i;}const d=p[node.axis]-q[node.axis];visit(d<0?node.left:node.right);if(d*d<best)visit(d<0?node.right:node.left);};visit(tree);return id;
 };
 return pack;
}
export function samplePackClimate(pack,climate){
 return climate.months.map(m=>({temperature:Float32Array.from(pack.sources,s=>s.reduce((a,g)=>a+m.temperature[g],0)/s.length),precipitation:Float32Array.from(pack.sources,s=>s.reduce((a,g)=>a+m.precipitation[g],0)/s.length)}));
}
export const pathLength=points=>points.slice(1).reduce((s,p,i)=>s+km(fromLonLat(points[i]),fromLonLat(p)),0);
