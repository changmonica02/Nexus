// Marching triangles on the spherical Grid. Join crossings by mesh edge,
// so neighbouring faces share vertices even across the longitude seam.
import {insideProjectedRing,projectShoreRing} from './coastSurface.mjs';

export function traceScalarBand(mesh,values,level){
 const {points,triangles}=mesh;
 const crossings=new Map();
 const edge=(a,b)=>{
  if(a>b)[a,b]=[b,a];
  const key=a*points.length+b;
  if(!crossings.has(key)){
   const t=(level-values[a])/(values[b]-values[a]);
   const p=points[a].map((v,k)=>v+t*(points[b][k]-v));
   const length=Math.hypot(...p);
   crossings.set(key,{point:p.map(v=>v/length),links:[]});
  }
  return crossings.get(key);
 };
 for(const [a,b,c] of triangles){
  const aboveA=values[a]>=level,aboveB=values[b]>=level,aboveC=values[c]>=level;
  if(aboveA===aboveB&&aboveB===aboveC)continue;
  const first=aboveA!==aboveB?edge(a,b):edge(b,c);
  const second=aboveA!==aboveC?edge(c,a):edge(b,c);
  first.links.push(second);
  second.links.push(first);
 }
 const rings=[];
 for(const start of crossings.values()){
  if(start.visited)continue;
  const loop=[];
  let previous,current=start;
  do{
   loop.push(current.point);
   current.visited=true;
   const next=current.links.find(link=>link!==previous);
   previous=current;
   current=next;
  }while(current&&current!==start&&!current.visited);
  if(current===start&&loop.length>=3)rings.push(projectShoreRing([...loop,loop[0]]));
 }
 // A real sample settles which side of the loops is above the threshold,
 // including polar caps and levels that cover the entire sphere.
 const probeIndex=values.findIndex((value,i)=>value!==level&&Math.abs(points[i][2])<.999999);
 if(probeIndex<0)return {rings,inverse:values[0]>=level};
 const [x,y,z]=points[probeIndex];
 const lon=Math.atan2(y,x)*180/Math.PI,lat=Math.asin(Math.max(-1,Math.min(1,z)))*180/Math.PI;
 let parity=false;
 for(const ring of rings)for(const shift of [-360,0,360]){
  if(insideProjectedRing([lon+shift,lat],ring))parity=!parity;
 }
 return {rings,inverse:parity!==(values[probeIndex]>=level)};
}

export function buildScalarBands(mesh,values,levels,colors){
 return [
  {color:colors[0],rings:[],inverse:true},
  ...levels.map((level,i)=>({color:colors[i+1],...traceScalarBand(mesh,values,level)})),
 ];
}

// Relax the display surface on each side independently so deep water
// never pulls down the adjacent land colors and the sign stays authoritative.
export function smoothDisplayHeights(mesh,values){
 const totals=new Float64Array(values.length),counts=new Uint8Array(values.length);
 for(const [a,b,c] of mesh.triangles){
  for(const [i,j] of [[a,b],[b,c],[c,a]]){
   if((values[i]<0)!==(values[j]<0))continue;
   totals[i]+=values[j];counts[i]++;
   totals[j]+=values[i];counts[j]++;
  }
 }
 return Float64Array.from(values,(h,i)=>counts[i]?h*.72+totals[i]/counts[i]*.28:h);
}
