// Nexus surface circulation: wind and coastal boundary currents, followed by
// a finite-volume pressure projection on each connected spherical ocean.
import {dot,cross,unit,clamp,km,sphericalField} from '../../../../experiments/spherical-grid/geologic-fields.mjs';
export const tangent=(p,q)=>unit(q.map((x,k)=>x-p[k]*dot(p,q)));
export function localBasis(p){const east=unit(Math.abs(p[2])<.999999?[-p[1],p[0],0]:[0,1,0]);return {east,north:unit(cross(p,east))};}
export function seasonalWind(p,month=2.5,b=localBasis(p)){
 const lat=Math.asin(clamp(p[2]))*180/Math.PI,season=Math.cos(2*Math.PI*(month-6)/12),shift=8*season,a=Math.abs(lat-shift),sign=Math.sign(lat-shift)||1;
 const west=6*Math.tanh((a-30)/5)*Math.tanh((62-a)/6),polar=.5+.5*Math.tanh((a-60)/5),north=(1-polar)*(-sign*2.8*Math.tanh((30-a)/6))-polar*sign*2.5;
 return b.east.map((v,k)=>v*west+b.north[k]*north);
}
export function coastalOceanContext(grid){
 const coast=[],landAt=new Int32Array(grid.points.length);landAt.fill(-1);
 for(let i=0;i<grid.points.length;i++)if(grid.heights[i]<0){const j=grid.neighbors[i].find(j=>grid.heights[j]>=0);if(j!==undefined){coast.push(i);landAt[i]=j;}}
 const field=sphericalField(grid,coast,{allowed:i=>grid.heights[i]<0});
 return {...field,landAt};
}
export function surfaceForcing(grid,{boundaryCurrents=true}={}){
 const coast=boundaryCurrents?coastalOceanContext(grid):null;
 return grid.points.map((p,i)=>{
  if(grid.heights[i]>=0)return [0,0,0];
  const basis=localBasis(p),wind=[0,0,0];for(let m=0;m<12;m++){const w=seasonalWind(p,m,basis);for(let k=0;k<3;k++)wind[k]+=w[k]/12;}
  const right=cross(wind,p),f=p[2],v=wind.map((w,k)=>.035*(w+1.1*f*right[k])/(1+.8*f*f));
  if(coast&&coast.nearest[i]>=0){
   const land=coast.landAt[coast.nearest[i]],toward=tangent(p,grid.points[land]),orientation=dot(toward,basis.east),distance=coast.distance[i];
   const west=Math.max(0,-orientation)*Math.exp(-distance/350),east=Math.max(0,orientation)*Math.exp(-distance/900);
   const latitude=Math.abs(Math.asin(clamp(f))*180/Math.PI),subtropical=Math.exp(-(((latitude-30)/14)**2)),subpolar=Math.exp(-(((latitude-56)/10)**2));
   const poleward=Math.sign(f)*(subtropical-.8*subpolar)*(.55*west-.14*east);
   for(let k=0;k<3;k++)v[k]+=basis.north[k]*poleward;
  }
  return v;
 });
}
export function generateSurfaceOcean(grid,{iterations=1200,tolerance=1e-8,boundaryCurrents=true}={}){
 const n=grid.points.length,edges=[],forcing=surfaceForcing(grid,{boundaryCurrents}),degree=new Float64Array(n),counts=new Uint8Array(n),b=new Float64Array(n);
 for(let i=0;i<n;i++)if(grid.heights[i]<0)for(const j of grid.neighbors[i])if(j>i&&grid.heights[j]<0){
  const d=km(grid.points[i],grid.points[j]),ti=tangent(grid.points[i],grid.points[j]),tj=tangent(grid.points[j],grid.points[i]);
  // Dual face width from the two cell areas and their center separation.
  const width=2*(grid.areas[i]/grid.neighbors[i].length+grid.areas[j]/grid.neighbors[j].length)/d,conductance=width/d;
  const flux=.5*(dot(forcing[i],ti)-dot(forcing[j],tj))*width;
  edges.push({i,j,d,ti,tj,width,conductance,flux});b[i]+=flux;b[j]-=flux;degree[i]+=conductance;degree[j]+=conductance;counts[i]++;counts[j]++;
 }
 const pressure=new Float64Array(n),r=b.slice(),z=Float64Array.from(r,(v,i)=>v/(degree[i]||1)),p=z.slice(),ap=new Float64Array(n);
 const from=Uint32Array.from(edges,e=>e.i),to=Uint32Array.from(edges,e=>e.j);
 const conductance=Float64Array.from(edges,e=>e.conductance);
 // Land and isolated water without a wet edge are identically zero.
 const active=[];
 for(let i=0;i<n;i++)if(counts[i])active.push(i);
 const wet=Uint32Array.from(active);
 const sumdot=(x,y)=>{let sum=0;for(let k=0;k<wet.length;k++){const i=wet[k];sum+=x[i]*y[i];}return sum;};
 let rz=sumdot(r,z),initial=Math.sqrt(sumdot(b,b)),steps=0;
 for(;steps<iterations&&Math.sqrt(sumdot(r,r))>tolerance*Math.max(initial,1e-20);steps++){
  ap.fill(0);
  for(let k=0;k<from.length;k++){
   const i=from[k],j=to[k],q=(p[i]-p[j])*conductance[k];
   ap[i]+=q;ap[j]-=q;
  }
  const denom=sumdot(p,ap);if(denom<=1e-24)break;const alpha=rz/denom;
  for(let k=0;k<wet.length;k++){const i=wet[k];pressure[i]+=alpha*p[i];r[i]-=alpha*ap[i];z[i]=r[i]/(degree[i]||1);}
  const next=sumdot(r,z),beta=next/rz;for(let k=0;k<wet.length;k++){const i=wet[k];p[i]=z[i]+beta*p[i];}rz=next;
 }
 const vectors=Array.from({length:n},()=>[0,0,0]),divergence=new Float64Array(n);
 for(const e of edges){e.flux-=e.conductance*(pressure[e.i]-pressure[e.j]);divergence[e.i]+=e.flux;divergence[e.j]-=e.flux;const speed=e.flux/e.width;
  for(let k=0;k<3;k++){vectors[e.i][k]+=2*speed*e.ti[k]/(counts[e.i]||1);vectors[e.j][k]-=2*speed*e.tj[k]/(counts[e.j]||1);}
 }
 const speeds=vectors.map(v=>Math.hypot(...v));
 return {version:2,edges,vectors,diagnostics:{iterations:steps,relativeDivergence:initial?Math.sqrt(sumdot(divergence,divergence))/initial:0,maxSpeed:Math.max(...speeds),boundaryCurrents},speedUnits:'m/s (parameterized)',fluxUnits:'km m/s'};
}
