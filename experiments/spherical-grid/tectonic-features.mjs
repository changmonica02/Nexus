// Independent sphere-native downstream geological model inspired by the
// staged MapRegionizer design. Descriptive fields never overwrite land.
import {sphericalField,km,dot,cross,unit,clamp} from './geologic-fields.mjs';
const hash=(seed,id)=>{let x=(seed^Math.imul(id+1,0x9e3779b1))>>>0;x=Math.imul(x^(x>>>16),0x85ebca6b);x=Math.imul(x^(x>>>13),0xc2b2ae35);return ((x^(x>>>16))>>>0)/4294967296;};
function landIslands(grid,domains){
 const seen=new Uint8Array(grid.heights.length),out=[],total=grid.areas.reduce((s,a)=>s+a,0);
 for(let i=0;i<seen.length;i++){
  if(seen[i]||grid.heights[i]<0)continue;const q=[i];seen[i]=1;let area=0;
  for(let h=0;h<q.length;h++){const c=q[h];area+=grid.areas[c];for(const j of grid.neighbors[c])if(!seen[j]&&grid.heights[j]>=0){seen[j]=1;q.push(j);}}
  if(q.length<2||area>total*.005)continue;
  const center=unit(q.reduce((sum,c)=>sum.map((v,k)=>v+grid.points[c][k]*grid.areas[c]),[0,0,0]));
  const cell=q.reduce((a,b)=>dot(grid.points[a],center)>dot(grid.points[b],center)?a:b);
  out.push({id:'island-'+i,cell,plateId:domains.owners[cell],areaKm2:area,cells:q});
 }
 return out;
}
function offsetToUpperPlate(grid,domains,b,steps=3){
 let current=b.overridingCell;const visited=new Set([b.subductingCell,current]);
 const toward=unit(grid.points[current].map((v,k)=>v-grid.points[b.subductingCell][k]));
 for(let s=0;s<steps;s++){
  const choices=grid.neighbors[current].filter(j=>!visited.has(j)&&domains.owners[j]===b.overridingPlate);
  if(!choices.length)break;
  const p=grid.points[current];choices.sort((a,c)=>dot(grid.points[c].map((v,k)=>v-p[k]),toward)-dot(grid.points[a].map((v,k)=>v-p[k]),toward));
  current=choices[0];visited.add(current);
 }
 return current;
}
export function deriveGeologicFeatures(grid,{seed,history,crust,domains,boundaries,boundaryMap}){
 const n=grid.heights.length,ridge=new Set(),trench=new Set(),collision=new Set(),rift=new Set(),arcCells=new Set(),records=[],volcanoes=[];
 const usable=boundaryMap.segments.filter(s=>s.boundaryIndices.length>=3&&s.lengthKm>=180&&s.activity>.12);
 for(const s of usable){
  const edges=s.boundaryIndices.map(i=>boundaries[i]);
  const cells=new Set();
  for(const b of edges){
   if(s.mode==='mid-ocean-ridge')for(const c of [b.a,b.b])if(grid.heights[c]<0){ridge.add(c);cells.add(c);}
   if(s.mode==='subduction'&&grid.heights[b.subductingCell]<0){trench.add(b.subductingCell);cells.add(b.subductingCell);}
   if(s.mode==='collision'||s.preciseMode==='transpression')for(const c of [b.a,b.b])if(grid.heights[c]>=0)collision.add(c);
   if(s.mode==='rift'||s.preciseMode==='transtension')for(const c of [b.a,b.b])rift.add(c);
  }
  records.push({id:'segment-feature-'+s.id,segmentId:s.id,kind:s.mode==='subduction'?'trench':s.mode==='mid-ocean-ridge'?'ridge':s.mode==='collision'?'orogen':s.mode,activity:s.activity,cells:[...cells]});
 }
 const coastDistance=crust.distanceToCoastKm;
 // Local subduction side matters: trench on old down-going oceanic crust,
 // volcanic arc offset into the overriding plate. These are separate cells.
 const chosenArcs=[];
 for(const s of usable.filter(s=>s.mode==='subduction'))for(const bi of s.boundaryIndices){
  const b=boundaries[bi],cell=offsetToUpperPlate(grid,domains,b,2+Math.floor(hash(seed^0x7731,bi)*3));
  arcCells.add(cell);
  if(grid.heights[cell]>=0||trench.has(cell)||coastDistance[cell]<100||hash(seed^0x481c,bi)<.68)continue;
  if(chosenArcs.some(c=>km(grid.points[c],grid.points[cell])<220))continue;
  chosenArcs.push(cell);
  volcanoes.push({cell,kind:'volcanic-arc',plateId:b.overridingPlate,segmentId:s.id,chainId:'arc-'+s.id,ageMa:0,
   radiusKm:85+65*hash(seed,cell),uplift:(18+17*hash(seed^0x71,cell))*(.5+.5*b.activity)});
 }
 const ridgeCells=[...ridge];
 for(const cell of ridgeCells){
  if(hash(seed^0x9182,cell)<.975||coastDistance[cell]<250)continue;
  if(volcanoes.some(c=>km(grid.points[c.cell],grid.points[cell])<200))continue;
  volcanoes.push({cell,kind:'ridge-volcano',plateId:domains.owners[cell],ageMa:0,chainId:null,radiusKm:85,uplift:22});
 }
 const ridgeField=sphericalField(grid,ridgeCells,{allowed:i=>grid.heights[i]<0});
 const trenchField=sphericalField(grid,[...trench],{allowed:i=>grid.heights[i]<0});
 const collisionField=sphericalField(grid,[...collision]),riftField=sphericalField(grid,[...rift]);
 const arcField=sphericalField(grid,[...arcCells]);
 // Sparse intraplate hot spots, with age-ordered tracks advected along the
 // current host plate velocity. Never revisit cells or cross a plate border.
 const hot=[],hotCandidates=[];
 for(let i=0;i<n;i++)if(grid.heights[i]<0&&coastDistance[i]>450&&ridgeField.distance[i]>450&&hash(seed^0x191f,i)>.998)hotCandidates.push(i);
 hotCandidates.sort((a,b)=>hash(seed^0x191f,b)-hash(seed^0x191f,a));
 for(const i of hotCandidates){if(hot.some(c=>km(grid.points[c],grid.points[i])<1100))continue;hot.push(i);if(hot.length>=8)break;}
 const seamountChains=[];
 for(const start of hot){
  const plate=domains.plates[domains.owners[start]],track=[],visited=new Set();let current=start;
  for(let step=0;step<6;step++){
   visited.add(current);track.push(current);
   volcanoes.push({cell:current,kind:step?'hotspot-chain':'hotspot',plateId:plate.id,chainId:'hotspot-'+start,ageMa:step*8,
    radiusKm:Math.max(55,120-step*9),uplift:Math.max(10,32-step*4)});
   const p=grid.points[current],velocity=cross(plate.pole,p).map(v=>v*Math.sign(plate.angularSpeed));
   const next=grid.neighbors[current].filter(j=>!visited.has(j)&&grid.heights[j]<0&&coastDistance[j]>180&&domains.owners[j]===plate.id)
    .sort((a,b)=>dot(grid.points[b],velocity)-dot(grid.points[a],velocity))[0];
   if(next===undefined||dot(grid.points[next],velocity)<=dot(p,velocity))break;current=next;
  }
  seamountChains.push({id:'hotspot-'+start,kind:'hotspot-track',plateId:plate.id,cells:track,ageStepMa:8});
 }
 const activeMask=new Uint8Array(n),historicalMask=new Uint8Array(n),activity=new Float32Array(n),uplift=new Float32Array(n),subsidence=new Float32Array(n),volcanism=new Float32Array(n),heatFlow=new Float32Array(n),oceanicAgeMa=crust.oceanicAgeMa.slice();
 for(let i=0;i<n;i++){
  if(history.mountainMemory[i]){
   if(collisionField.distance[i]<300){activeMask[i]=1;activity[i]=Math.exp(-((collisionField.distance[i]/240)**2));uplift[i]=activity[i];}
   else historicalMask[i]=1;
  }
  if(grid.heights[i]<0){
   const d=ridgeField.distance[i];if(Number.isFinite(d)){oceanicAgeMa[i]=Math.min(190,3+d/32);heatFlow[i]=Math.exp(-d/500);}
   subsidence[i]=Number.isFinite(trenchField.distance[i])?Math.exp(-((trenchField.distance[i]/200)**2)):0;
  }
  if(arcField.distance[i]<500)volcanism[i]=Math.exp(-((arcField.distance[i]/220)**2));
 }
 const islands=landIslands(grid,domains);
 for(const island of islands){
  const nearHot=seamountChains.find(c=>c.plateId===island.plateId&&c.cells.some(j=>km(grid.points[j],grid.points[island.cell])<450));
  island.kind=arcField.distance[island.cell]<550?'volcanic-arc':nearHot?'hotspot':crust.coastalZone[island.cell]?'shelf-archipelago':'microcontinent';
  island.hotspotChainId=nearHot?.id??null;
 }
 const seen=new Set(),islandChains=[];
 for(const island of islands){
  if(seen.has(island.id))continue;
  const group=[island];seen.add(island.id);
  for(let h=0;h<group.length;h++)for(const other of islands){
   if(seen.has(other.id)||other.plateId!==island.plateId||other.kind!==island.kind)continue;
   const threshold=island.kind==='volcanic-arc'?950:650;
   if(km(grid.points[group[h].cell],grid.points[other.cell])<threshold){seen.add(other.id);group.push(other);}
  }
  if(group.length<2)continue;
  // A nearest-neighbour ordering makes a display chain, not a terrain stroke.
  const ordered=[group.shift()];while(group.length){group.sort((a,b)=>km(grid.points[a.cell],grid.points[ordered.at(-1).cell])-km(grid.points[b.cell],grid.points[ordered.at(-1).cell]));ordered.push(group.shift());}
  islandChains.push({id:'island-chain-'+island.id,kind:island.kind,plateId:island.plateId,islandIds:ordered.map(i=>i.id),cells:ordered.map(i=>i.cell),existingLandOnly:true});
 }
 return {version:2,records,displaySegmentIds:usable.map(s=>s.id),ridgeCells,trenchCells:[...trench],arcCells:[...arcCells],ridgeField,trenchField,riftField,
  volcanoes,seamountChains,islands,islandChains,oceanicAgeMa,uplift,subsidence,volcanism,heatFlow,
  orogenProvinces:{version:1,activeMask,historicalMask,activity,activeCells:activeMask.reduce((s,x)=>s+x,0),historicalCells:historicalMask.reduce((s,x)=>s+x,0)}};
}
