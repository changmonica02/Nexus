import {ECOSYSTEMS,HABITATS,classifyPotentialHabitat,terrainWaterCapacity} from './ecosystem-water.mjs';

// Extend each realm's existing classifications into the opposite realm solely
// for clipping onto the detailed shared shoreline. No ecology is reassigned.
export function extendRealm(pack,values,isSource){
 const result=values.slice(),seen=new Uint8Array(values.length),queue=[];
 for(let i=0;i<values.length;i++)if(isSource(i)){seen[i]=1;queue.push(i);}
 for(let k=0;k<queue.length;k++)for(const j of pack.neighbors[queue[k]])if(!seen[j]){seen[j]=1;result[j]=result[queue[k]];queue.push(j);}
 return result;
}
export function derivePackEcosystems(pack,hydrology){
 const n=pack.points.length,surface=new Uint8Array(n),seabed=new Uint8Array(n),evidence=new Uint8Array(n),habitat=new Uint8Array(n),river=new Map();
 for(const r of hydrology.rivers)for(const i of r.path.slice(0,-1))river.set(i,r);
 const biomeIds=new Map(ECOSYSTEMS.map((c,i)=>[c[0],i])),habitatIds=new Map(HABITATS.map((c,i)=>[c[0],i]));
 for(let i=0;i<n;i++){
  const t=hydrology.monthly.map(m=>m.temperature[i]),p=hydrology.monthly.map(m=>m.precipitation[i]),water=hydrology.water[i];
  const terrain=terrainWaterCapacity(pack,i),capacity=water.capacityMm??150;
  const wetMonths=water.soil.filter(x=>x>=capacity*.85).length;
  const nearby=[i,...pack.neighbors[i]],nearWater=nearby.some(j=>river.has(j)||hydrology.lakeWet[j]);
  const perennial=nearby.some(j=>{const r=river.get(j);return r?.monthlyDischargeM3s?.every(q=>q>=1);});
  const annualP=p.reduce((s,x)=>s+x,0),annualPET=water.pet.reduce((s,x)=>s+x,0);
  const wetland=pack.heights[i]>=0&&terrain.slope<.008&&terrain.relativeHeightM<=10&&nearWater&&(wetMonths>=6&&annualP>=annualPET*.8||perennial&&terrain.relativeHeightM<=0&&terrain.slope<.002);
  const lake=Boolean(hydrology.lakeWet[i]);
  const code=classifyPotentialHabitat(t,p,water,{ocean:pack.heights[i]<0,depth:-pack.heights[i],elevation:pack.heights[i],lake,wetland});
  habitat[i]=habitatIds.get(code);surface[i]=biomeIds.get(HABITATS[habitat[i]][4]);seabed[i]=pack.heights[i]< -200?biomeIds.get('M3'):surface[i];
  if(lake){const l=hydrology.lakes[hydrology.lakeAt[i]];if(l.months.every(m=>m.dry))evidence[i]|=1;}
  if(pack.heights[i]>=0&&!lake)evidence[i]|=2;
 }
 const landSurface=extendRealm(pack,habitat,i=>pack.heights[i]>=0),seaSurface=extendRealm(pack,habitat,i=>pack.heights[i]<0);
 const seaFloor=Uint8Array.from(seaSurface,h=>HABITATS[h][4]==='M2'?habitatIds.get('deep-floor'):h);
 return {version:2,level:2,riverHabitats:hydrology.rivers.map(r=>({id:r.id,biome:'F1'})),scheme:'IUCN GET potential functional biomes',surface,seabed,evidence,catalog:ECOSYSTEMS,habitat,habitatCatalog:HABITATS,landSurface,seaSurface,seaFloor,subterraneanInferred:false};
}
