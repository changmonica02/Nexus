// Conservative edge heat exchange. Area and dual-face geometry make transport
// respond to physical distance, rather than a fixed weight per grid neighbor.
export function transportSeaSurfaceTemperature(grid,ocean,equilibrium,{days=120,relaxationDays=35,diffusivity=150}={}){
 if(!(days>0&&Number.isFinite(days))||!(relaxationDays>0)||!Number.isFinite(diffusivity)||diffusivity<0)throw Error('Invalid ocean heat parameters');
 const n=grid.points.length,rates=new Float64Array(n);
 const edges=ocean.edges.map(e=>{
  const flux=e.flux*86.4,diffusion=diffusivity*e.width/e.d;
  rates[flux>=0?e.i:e.j]+=Math.abs(flux)/grid.areas[flux>=0?e.i:e.j];rates[e.i]+=diffusion/grid.areas[e.i];rates[e.j]+=diffusion/grid.areas[e.j];
  return {i:e.i,j:e.j,flux,diffusion};
 });
 const maxRate=Math.max(...rates),steps=Math.ceil(days/Math.min(1,maxRate>0?.8/maxRate:1)),dt=days/steps,relax=1-Math.exp(-dt/relaxationDays);
 let t=Float64Array.from(equilibrium),initialHeat=0,restoredHeat=0,totalArea=0;
 for(let i=0;i<n;i++)if(grid.heights[i]<0){initialHeat+=t[i]*grid.areas[i];totalArea+=grid.areas[i];}
 let next=new Float64Array(n);
 for(let step=0;step<steps;step++){
  next.set(t);
  for(const e of edges){const heat=dt*(e.flux*(e.flux>=0?t[e.i]:t[e.j])+e.diffusion*(t[e.i]-t[e.j]));next[e.i]-=heat/grid.areas[e.i];next[e.j]+=heat/grid.areas[e.j];}
  for(let i=0;i<n;i++)if(grid.heights[i]<0){const delta=relax*(equilibrium[i]-next[i]);next[i]+=delta;restoredHeat+=delta*grid.areas[i];}
  const old=t;t=next;next=old; // All edge exchanges use the same previous state.
 }
 let finalHeat=0;for(let i=0;i<n;i++)if(grid.heights[i]<0)finalHeat+=t[i]*grid.areas[i];
 const result=Float32Array.from(t);
 result.diagnostics={steps,cfl:maxRate*dt,heatBudgetErrorPerArea:totalArea?Math.abs(finalHeat-initialHeat-restoredHeat)/totalArea:0};
 return result;
}
