// Bounded additions to a NEW candidate, following existing arc / hotspot tracks.
import {km,sphericalField} from './geologic-fields.mjs';
import {analyzeSphericalPlates} from './tectonic-plates.mjs';
import {tectonicSeedFromLandMask} from './plate-seafloor.mjs';
const hash=(seed,id)=>{let x=Math.imul(seed^id,0x45d9f3b);x=Math.imul(x^(x>>>16),0x45d9f3b);return ((x^(x>>>16))>>>0)/4294967296;};
export function proposeEmergentIslands(grid,model,seed,oceanSeed=-1){
 const total=grid.areas.reduce((s,a)=>s+a,0),budget=total*.0012;
 const land=[];for(let i=0;i<grid.heights.length;i++)if(grid.heights[i]>=0)land.push(i);
 const distance=sphericalField(grid,land).distance;
 const groups=new Map();
 for(const v of model.features.volcanoes){
  if(!v.chainId||!['volcanic-arc','hotspot','hotspot-chain'].includes(v.kind))continue;
  if(!groups.has(v.chainId))groups.set(v.chainId,[]);groups.get(v.chainId).push(v);
 }
 const candidates=[...groups.entries()].map(([id,cones])=>({id,cones,kind:id.startsWith('arc-')?'volcanic-arc':'hotspot'}));
 candidates.sort((a,b)=>hash(seed,b.cones[0].cell)-hash(seed,a.cones[0].cell));
 const chains=[],changes=[],centers=[];let area=0;
 for(const group of candidates){
  if(chains.length>=4)break;
  if(chains.filter(c=>c.kind===group.kind).length>=2)continue;
  const members=[],pending=[];let pendingArea=0;
  const cones=group.cones.slice().sort((a,b)=>(a.ageMa??0)-(b.ageMa??0)||a.cell-b.cell);
  for(const v of cones){
   if(members.length>=5)break;
   const cell=v.cell,age=v.ageMa??0;
   if(members.length&&km(grid.points[cell],grid.points[members.at(-1).cell])>950)continue;
   if(grid.heights[cell]>=0||distance[cell]<240||model.features.trenchField.distance[cell]<180||model.features.ridgeField.distance[cell]<220||age>24)continue;
   if(centers.concat(members.map(m=>m.cell)).some(j=>km(grid.points[cell],grid.points[j])<240))continue;
   // One to three resolved cells per island. Never paint a continuous ribbon.
   const radius=85+45*hash(seed^0x519,cell),footprint=[cell,...grid.neighbors[cell]].filter(j=>
    grid.heights[j]<0&&distance[j]>170&&model.domains.owners[j]===v.plateId&&
    model.features.trenchField.distance[j]>120&&model.features.ridgeField.distance[j]>160&&km(grid.points[cell],grid.points[j])<radius).slice(0,3);
   if(footprint.includes(oceanSeed)||!footprint.length||footprint.some(j=>grid.neighbors[j].some(k=>pending.some(p=>p.cell===k)||changes.some(p=>p.cell===k))))continue;
   const a=footprint.reduce((s,j)=>s+grid.areas[j],0);
   if(area+pendingArea+a>budget)continue;
   for(const j of footprint){const d=km(grid.points[cell],grid.points[j]);pending.push({cell:j,height:Math.max(1,Math.round((8+10*hash(seed,cell))*Math.exp(-((d/75)**2))*Math.exp(-age/32)))});}
   pendingArea+=a;members.push({cell,ageMa:age});
  }
  if(members.length<2)continue;
  changes.push(...pending);area+=pendingArea;centers.push(...members.map(m=>m.cell));
  chains.push({id:'emergent-'+group.id,kind:group.kind,plateId:cones[0].plateId,cells:members.map(m=>m.cell),agesMa:members.map(m=>m.ageMa)});
 }
 // Submerged volcanic pedestals prevent an emergent cell standing directly
 // over an abyssal cliff. Keep water gaps and never fill a trench or shore.
 const emerged=new Set(changes.map(c=>c.cell)),pedestals=new Map();
 for(const chain of chains)for(const center of chain.cells){
  const q=[{cell:center,depth:0}],seen=new Set([center]);
  for(let h=0;h<q.length;h++){
   const {cell,depth}=q[h],d=km(grid.points[center],grid.points[cell]);
   if(!emerged.has(cell)&&grid.heights[cell]<0&&distance[cell]>170&&model.domains.owners[cell]===chain.plateId&&model.features.trenchField.distance[cell]>150&&model.features.ridgeField.distance[cell]>160&&d<330){
    const height=-Math.max(2,Math.round(3+24*(d/330)**2));
    if(height>grid.heights[cell])pedestals.set(cell,Math.max(pedestals.get(cell)??-100,height));
   }
   if(depth>=3)continue;
   for(const j of grid.neighbors[cell])if(!seen.has(j)){seen.add(j);q.push({cell:j,depth:depth+1});}
  }
 }
 return {version:1,cells:changes.map(c=>c.cell),chains,changes,submergedChanges:[...pedestals].map(([cell,height])=>({cell,height})),addedAreaPercent:100*area/total};
}
export function attachEmergentIslands(model,genesis,grid){
 if(!genesis)return model;
 const emerged=new Set(genesis.cells);
 const centers=genesis.chains.flatMap(c=>c.cells),footprints=new Map(centers.map(c=>[c,[]]));
 for(const i of genesis.cells){const center=centers.reduce((a,b)=>km(grid.points[a],grid.points[i])<km(grid.points[b],grid.points[i])?a:b);footprints.get(center).push(i);}
 for(const chain of genesis.chains)for(let k=0;k<chain.cells.length;k++){
  const cell=chain.cells[k],cells=footprints.get(cell);
  model.features.islands.push({id:'generated-island-'+cell,cell,cells,plateId:chain.plateId,areaKm2:cells.reduce((s,i)=>s+grid.areas[i],0),kind:chain.kind,generated:true,ageMa:chain.agesMa[k]});
 }
 model.features.volcanoes=model.features.volcanoes.filter(v=>!emerged.has(v.cell));
 model.features.islandChains.push(...genesis.chains.map(c=>({...c,existingLandOnly:false,generated:true})));
 return model;
}
/** Rebuild upstream plates from the pre-island land mask, without changing saved heights. */
export function analyzePlanetGeology(grid,genesis){
 if(!genesis)return analyzeSphericalPlates(grid,{seed:tectonicSeedFromLandMask(grid)});
 const heights=grid.heights.slice();for(const i of genesis.cells)heights[i]=-1;
 const base={...grid,heights};
 return attachEmergentIslands(analyzeSphericalPlates(base,{seed:tectonicSeedFromLandMask(base)}),genesis,grid);
}
