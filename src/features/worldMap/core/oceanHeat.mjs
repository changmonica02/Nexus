// Conservative edge heat exchange. Area and dual-face geometry make transport
// respond to physical distance, rather than a fixed weight per grid neighbor.
export function transportSeaSurfaceTemperature(grid,ocean,equilibrium,{days=120,relaxationDays=35,diffusivity=150}={}){
 if(!(days>0&&Number.isFinite(days))||!(relaxationDays>0)||!Number.isFinite(diffusivity)||diffusivity<0)throw Error('Invalid ocean heat parameters');
 const n=grid.points.length,rates=new Float64Array(n);
 const edgeCount=ocean.edges.length,from=new Uint32Array(edgeCount),to=new Uint32Array(edgeCount);
 const flux=new Float64Array(edgeCount),diffusion=new Float64Array(edgeCount);
 const areas=grid.areas;
 for(let k=0;k<edgeCount;k++){
  const e=ocean.edges[k],i=e.i,j=e.j;
  from[k]=i;to[k]=j;flux[k]=e.flux*86.4;diffusion[k]=diffusivity*e.width/e.d;
  const upstream=flux[k]>=0?i:j;
  rates[upstream]+=Math.abs(flux[k])/areas[upstream];rates[i]+=diffusion[k]/areas[i];rates[j]+=diffusion[k]/areas[j];
 }
 const maxRate=Math.max(...rates),steps=Math.ceil(days/Math.min(1,maxRate>0?.8/maxRate:1)),dt=days/steps,relax=1-Math.exp(-dt/relaxationDays);
 let t=Float64Array.from(equilibrium),initialHeat=0,restoredHeat=0,totalArea=0;
 for(let i=0;i<n;i++)if(grid.heights[i]<0){initialHeat+=t[i]*grid.areas[i];totalArea+=grid.areas[i];}
 let next=new Float64Array(n);
 for(let step=0;step<steps;step++){
  next.set(t);
  for(let k=0;k<edgeCount;k++){
   const i=from[k],j=to[k],f=flux[k],heat=dt*(f*(f>=0?t[i]:t[j])+diffusion[k]*(t[i]-t[j]));
   next[i]-=heat/areas[i];next[j]+=heat/areas[j];
  }
  for(let i=0;i<n;i++)if(grid.heights[i]<0){const delta=relax*(equilibrium[i]-next[i]);next[i]+=delta;restoredHeat+=delta*grid.areas[i];}
  const old=t;t=next;next=old; // All edge exchanges use the same previous state.
 }
 let finalHeat=0;for(let i=0;i<n;i++)if(grid.heights[i]<0)finalHeat+=t[i]*grid.areas[i];
 const result=Float32Array.from(t);
 result.diagnostics={steps,cfl:maxRate*dt,heatBudgetErrorPerArea:totalArea?Math.abs(finalHeat-initialHeat-restoredHeat)/totalArea:0};
 return result;
}
