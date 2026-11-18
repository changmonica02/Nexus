// Wind-driven surface transport on closed spherical ocean components.
// A graph pressure projection enforces no-through-land / near-zero divergence.
// No seabed heights, trenches, ridges or 3D water columns enter the forcing.
import {dot,cross,unit,clamp,km} from './geologic-fields.mjs';
export const tangent=(p,q)=>unit(q.map((x,k)=>x-p[k]*dot(p,q)));
export function localBasis(p){const east=unit(Math.abs(p[2])<.999999?[-p[1],p[0],0]:[0,1,0]);return {east,north:unit(cross(p,east))};}
export function seasonalWind(p,month=2.5){
 const lat=Math.asin(clamp(p[2]))*180/Math.PI,season=Math.cos(2*Math.PI*(month-6)/12),shift=8*season;
 const a=Math.abs(lat-shift),sign=Math.sign(lat-shift)||1;
 // Smooth trade / westerly / polar-easterly transitions, moving seasonally.
 const west=6*Math.tanh((a-30)/5)*Math.tanh((62-a)/6),polar=.5+.5*Math.tanh((a-60)/5),north=(1-polar)*(-sign*2.8*Math.tanh((30-a)/6))-polar*sign*2.5;
 const b=localBasis(p);return b.east.map((v,k)=>v*west+b.north[k]*north);
}
function oceanEdges(grid){
 const edges=[];
 for(let i=0;i<grid.points.length;i++)if(grid.heights[i]<0)for(const j of grid.neighbors[i])if(j>i&&grid.heights[j]<0)edges.push({i,j,d:km(grid.points[i],grid.points[j]),ti:tangent(grid.points[i],grid.points[j]),tj:tangent(grid.points[j],grid.points[i])});
 return edges;
}
export function generateSurfaceOcean(grid,{iterations=650,tolerance=1e-5}={}){
 const n=grid.points.length,edges=oceanEdges(grid),forcing=grid.points.map((p,i)=>{
  if(grid.heights[i]>=0)return [0,0,0];
  const w=[0,0,0];for(let m=0;m<12;m++){const wind=seasonalWind(p,m);for(let k=0;k<3;k++)w[k]+=wind[k]/12;}const right=cross(w,p),f=p[2];
  return w.map((v,k)=>.035*(v+1.1*f*right[k])/(1+.8*f*f));
 });
 const b=new Float64Array(n),degree=new Float64Array(n);
 for(const e of edges){e.flux=.5*(dot(forcing[e.i],e.ti)-dot(forcing[e.j],e.tj))*e.d;b[e.i]+=e.flux;b[e.j]-=e.flux;degree[e.i]++;degree[e.j]++;}
 const pressure=new Float64Array(n),r=b.slice(),z=Float64Array.from(r,(v,i)=>v/(degree[i]||1)),p=z.slice(),ap=new Float64Array(n);
 const sumdot=(x,y)=>x.reduce((s,v,i)=>s+v*y[i],0);
 let rz=sumdot(r,z),initial=Math.sqrt(sumdot(b,b)),steps=0;
 for(;steps<iterations&&Math.sqrt(sumdot(r,r))>tolerance*Math.max(initial,1e-20);steps++){
  ap.fill(0);for(const e of edges){const q=p[e.i]-p[e.j];ap[e.i]+=q;ap[e.j]-=q;}
  const denom=sumdot(p,ap);if(denom<=1e-24)break;const alpha=rz/denom;
  for(let i=0;i<n;i++){pressure[i]+=alpha*p[i];r[i]-=alpha*ap[i];z[i]=r[i]/(degree[i]||1);}
  const next=sumdot(r,z),beta=next/rz;for(let i=0;i<n;i++)p[i]=z[i]+beta*p[i];rz=next;
 }
 const vectors=Array.from({length:n},()=>[0,0,0]),divergence=new Float64Array(n);
 for(const e of edges){e.flux-=pressure[e.i]-pressure[e.j];divergence[e.i]+=e.flux;divergence[e.j]-=e.flux;const speed=e.flux/e.d;
  for(let k=0;k<3;k++){vectors[e.i][k]+=2*speed*e.ti[k]/(degree[e.i]||1);vectors[e.j][k]-=2*speed*e.tj[k]/(degree[e.j]||1);}
 }
 return {version:1,edges,vectors,diagnostics:{iterations:steps,relativeDivergence:initial?Math.sqrt(sumdot(divergence,divergence))/initial:0},speedUnits:'m/s (parameterized)'};
}
