import {ECOSYSTEMS,classifyPotentialEcosystem} from './ecosystem-water.mjs';
export function derivePackEcosystems(pack,hydrology){
 const n=pack.points.length,surface=new Uint8Array(n),seabed=new Uint8Array(n),evidence=new Uint8Array(n),river=new Set(hydrology.rivers.flatMap(r=>r.path.slice(0,-1)));
 for(let i=0;i<n;i++){
  const t=hydrology.monthly.map(m=>m.temperature[i]),p=hydrology.monthly.map(m=>m.precipitation[i]),water=hydrology.water[i];
  const gradient=Math.max(...pack.neighbors[i].map(j=>Math.abs(pack.heights[j]-pack.heights[i])));
  const wetMonths=water.soil.filter(x=>x>120).length,nearWater=pack.neighbors[i].some(j=>river.has(j)||hydrology.lakeWet[j]);
  const wetland=pack.heights[i]>=0&&gradient<80&&wetMonths>=8&&nearWater;
  const lake=Boolean(hydrology.lakeWet[i]);const code=classifyPotentialEcosystem(t,p,water,{ocean:pack.heights[i]<0,depth:-pack.heights[i],lake,wetland});
  if(lake){const l=hydrology.lakes[hydrology.lakeAt[i]];if(l.months.every(m=>m.dry))evidence[i]|=1;}
  surface[i]=ECOSYSTEMS.findIndex(c=>c[0]===code);seabed[i]=pack.heights[i]< -200?10:surface[i];
  // Climate-derived potential ecosystems lack disturbance, soil and survey data.
  if(pack.heights[i]>=0&&!lake)evidence[i]|=2;
 }
 return {version:1,level:2,riverHabitats:hydrology.rivers.map(r=>({id:r.id,biome:'F1'})),scheme:'IUCN GET potential functional biomes',surface,seabed,evidence,catalog:ECOSYSTEMS,subterraneanInferred:false};
}
