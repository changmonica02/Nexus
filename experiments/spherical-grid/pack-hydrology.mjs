import {buildDrainageGraph} from '../../src/features/worldMap/core/drainage.mjs';
// Azgaar concepts: depression routing, accumulated precipitation, lake spill,
// major tributary continuation. Entity identity / geometry is independent of Pack.
import {FieldHeap,km,dot,cross} from './geologic-fields.mjs';
import {toLonLat,fromLonLat,pathLength,samplePackClimate} from './spherical-pack.mjs';
import {monthlyWaterBalance,MONTH_DAYS} from './ecosystem-water.mjs';
export function routePack(pack){return buildDrainageGraph(pack);}
export function drainageOrder(receivers){
 const incoming=new Uint32Array(receivers.length);for(const j of receivers)if(j>=0)incoming[j]++;
 const degree=incoming.slice(),order=[];for(let i=0;i<degree.length;i++)if(!degree[i])order.push(i);
 for(let k=0;k<order.length;k++){const j=receivers[order[k]];if(j>=0&&!--degree[j])order.push(j);}
 if(order.length!==receivers.length)throw Error('River routing creates a cycle');return {order,incoming};
}
// Reprojected authored channels can point against the new mesh's automatic
// drainage. Redirect only the unresolved surrounding catchment, retaining every
// channel / reservoir edge; an authored cycle remains an error.
export function reconnectDrainage(pack,receiver,locked){
 const n=receiver.length,upstream=Array.from({length:n},()=>[]),solved=new Uint8Array(n),queue=[];
 for(let i=0;i<n;i++){const j=receiver[i];if(j<0){solved[i]=1;queue.push(i);}else upstream[j].push(i);}
 for(let k=0;k<queue.length;k++)for(const i of upstream[queue[k]])if(!solved[i]){solved[i]=1;queue.push(i);}
 if(queue.length===n)return;
 const heap=new FieldHeap(),distance=new Float64Array(n);distance.fill(Infinity);
 for(const cell of queue){distance[cell]=0;heap.push({cell,cost:0});}
 while(heap.length){const {cell,cost}=heap.pop();if(cost>distance[cell])continue;
  for(const j of upstream[cell])if(locked[j]&&!solved[j]){solved[j]=1;distance[j]=cost+km(pack.points[cell],pack.points[j]);heap.push({cell:j,cost:distance[j]});}
  for(const j of pack.neighbors[cell])if(!solved[j]&&!locked[j]){
   const next=cost+km(pack.points[cell],pack.points[j])*(1+Math.max(0,pack.heights[cell]-pack.heights[j])/100);
   if(next<distance[j]){distance[j]=next;receiver[j]=cell;heap.push({cell:j,cost:next});}
  }
  // Finalize a free cell only when its cheapest exit is removed from the heap.
  solved[cell]=1;
 }
 if(solved.some(v=>!v))throw Error('Authored river routing creates a cycle');
}
export function lakeRimForBed(pack,bed){
 const selected=new Set(bed.map(b=>pack.findCell(b.position))),rim=new Set();
 for(const i of selected)for(const j of pack.neighbors[i])if(!selected.has(j))rim.add(j);
 return [...rim].map(i=>({position:toLonLat(pack.points[i]),heightM:pack.heights[i]}));
}
function lakeFootprint(pack,lake){
 const projected=new Map();
 for(const bed of lake.bed){
  const center=fromLonLat(bed.position),corners=bed.ring.map(fromLonLat),normals=corners.map((p,k)=>{const n=cross(p,corners[(k+1)%corners.length]);return dot(n,center)<0?n.map(v=>-v):n;});
  const first=pack.findCell(bed.position),queue=[first],seen=new Set([first]);
  for(let k=0;k<queue.length;k++){const i=queue[k];if(i!==first&&!normals.every(n=>dot(n,pack.points[i])>=-1e-9))continue;
   if(!projected.has(i)||bed.floorM<projected.get(i).floorM)projected.set(i,bed);
   for(const j of pack.neighbors[i])if(!seen.has(j)){seen.add(j);queue.push(j);}
  }
 }
 const ids=[...projected.keys()],selected=new Set(ids);
 let spill=Infinity,outside=-1,inside=-1;
 for(const i of ids){if(pack.heights[i]<0)throw Error('Lake basin overlaps ocean');for(const j of pack.neighbors[i])if(!selected.has(j)&&pack.heights[j]<spill){spill=pack.heights[j];outside=j;inside=i;}}
 if(lake.rim?.length)spill=Math.min(...lake.rim.map(r=>r.heightM));
 if(!Number.isFinite(spill)||spill<=0)throw Error('Lake basin has no closed terrestrial rim');
 if(!Number.isFinite(lake.waterLevelM)||lake.waterLevelM>spill+.01||lake.waterLevelM<=Math.min(...lake.bed.map(b=>b.floorM)))throw Error('Lake level must lie above its bed and at or below the lowest spill rim');
 return {ids,selected,projected,spillM:spill,outside,inside};
}
export function validateLakeLevel(pack,lake){return lakeFootprint(pack,lake).spillM;}
function discoverLakes(pack,routing,seed){
 const wet=pack.heights.map((h,i)=>h>=0&&routing.filled[i]-h>15?1:0),seen=new Uint8Array(wet.length),candidates=[];
 for(let i=0;i<wet.length;i++)if(wet[i]&&!seen[i]){
  const q=[i];seen[i]=1;for(let k=0;k<q.length;k++)for(const j of pack.neighbors[q[k]])if(wet[j]&&!seen[j]&&Math.abs(routing.filled[j]-routing.filled[i])<1){seen[j]=1;q.push(j);}
  const area=q.reduce((s,j)=>s+pack.catchmentAreas[j],0);if(area<80||area>300000||q.length>120)continue;
  const center=q.reduce((a,b)=>pack.heights[a]<pack.heights[b]?a:b),id=`lake-${seed}-${pack.gridRefs[center]}`;
  const bed=q.map(j=>({position:toLonLat(pack.points[j]),floorM:Math.round(pack.heights[j]*100)/100,areaKm2:pack.catchmentAreas[j],ring:pack.rings[j].map(toLonLat)}));
  const lake={id,rim:lakeRimForBed(pack,bed),name:'',notes:'',bed,waterLevelM:Math.round(routing.filled[i]*100)/100,inletIds:[],outletId:null};
  try{lake.waterLevelM=lakeFootprint(pack,{...lake,waterLevelM:Math.min(lake.waterLevelM,routing.filled[i]-.001)}).spillM;candidates.push({lake,area});}catch{/* No artificial basin if the rim is invalid. */}
 }
 const unique=new Set();return candidates.sort((a,b)=>b.area-a.area).filter(x=>{if(unique.has(x.lake.id))return false;unique.add(x.lake.id);return true;}).slice(0,64).map((x,i)=>({...x.lake,name:`湖泊 ${i+1}`}));
}
function connect(pack,a,b,blocked=new Set()){
 if(a===b)return [a];if(pack.neighbors[a].includes(b))return [a,b];
 const heap=new FieldHeap(),cost=new Float64Array(pack.points.length),parent=new Int32Array(pack.points.length);cost.fill(Infinity);parent.fill(-1);cost[a]=0;heap.push({cell:a,cost:0});
 while(heap.length){const current=heap.pop(),i=current.cell;if(current.cost>cost[i])continue;if(i===b)break;
  for(const j of pack.neighbors[i]){if((blocked.has(j)&&j!==b)||(pack.heights[j]<0&&j!==b))continue;const d=cost[i]+km(pack.points[i],pack.points[j])+Math.max(0,pack.heights[j]-pack.heights[i])*.1;if(d<cost[j]){cost[j]=d;parent[j]=i;heap.push({cell:j,cost:d});}}
 }
 if(parent[b]<0)throw Error('River geometry has no connected Pack route');
 const out=[b];while(out.at(-1)!==a)out.push(parent[out.at(-1)]);return out.reverse();
}
export function resolveRiverPath(pack,river){
 const anchors=river.geometry.map(p=>pack.findCell(p)).filter((i,k,a)=>!k||i!==a[k-1]);
 if(anchors.length<2||new Set(anchors).size!==anchors.length)throw Error('River geometry loops back on itself');
 const out=[anchors[0]],protectedAnchors=new Set(anchors);
 for(const b of anchors.slice(1)){const a=out.at(-1),blocked=new Set([...protectedAnchors,...out]);blocked.delete(a);blocked.delete(b);out.push(...connect(pack,a,b,blocked).slice(1));}
 if(new Set(out).size!==out.length)throw Error('River geometry loops back on itself');
 return out;
}
export function deriveHydrology(pack,climate,base){
 const monthly=samplePackClimate(pack,climate),n=pack.points.length,routing=routePack(pack),receiver=routing.receivers.slice(),locked=new Uint8Array(n),lakeAt=new Int32Array(n);lakeAt.fill(-1);
 const byId=new Map(base.rivers.map((r,i)=>[r.id,i])),riverPaths=new Array(base.rivers.length),resolving=new Set();
 const resolve=index=>{
  if(riverPaths[index])return riverPaths[index];if(resolving.has(index))throw Error('River parent routing creates a cycle');resolving.add(index);
  const river=base.rivers[index];let path=resolveRiverPath(pack,river);
  if(river.parentId&&byId.has(river.parentId)){
   const parent=new Set(resolve(byId.get(river.parentId))),junction=path.findIndex(cell=>parent.has(cell));
   // A denser mesh may put a connecting step on the parent before the saved
   // junction. Merge at first contact instead of walking back along the parent.
   if(junction>=0)path=path.slice(0,junction+1);
  }
  resolving.delete(index);return riverPaths[index]=path;
 };
 base.rivers.forEach((_,i)=>resolve(i));
 for(const path of riverPaths)for(let k=0;k<path.length-1;k++){receiver[path[k]]=path[k+1];locked[path[k]]=1;}
 const lakes=base.lakes.map((l,index)=>{
  const f=lakeFootprint(pack,l);for(const i of f.ids){locked[i]=1;if(lakeAt[i]>=0)throw Error('Lake basins overlap');lakeAt[i]=index;}
  // The earliest flood cell has a downstream parent outside the whole lake.
  const root=f.ids.reduce((a,b)=>routing.rank[a]<routing.rank[b]?a:b),outside=routing.receivers[root];
  const queue=[root],seen=new Set([root]);receiver[root]=outside;
  for(let k=0;k<queue.length;k++)for(const j of pack.neighbors[queue[k]])if(f.selected.has(j)&&!seen.has(j)){seen.add(j);queue.push(j);receiver[j]=queue[k];}
  // A saved lake is one reservoir even if the rebuilt mesh samples its
  // narrow neck with disconnected centers. Preserve its authored shoreline.
  for(const j of f.ids)if(!seen.has(j))receiver[j]=root;
  return {...f,root,lake:l,areaKm2:l.bed.filter(b=>b.floorM<l.waterLevelM).reduce((s,b)=>s+b.areaKm2,0),capacityM3:l.bed.reduce((s,b)=>s+Math.max(0,f.spillM-b.floorM)*b.areaKm2*1e6,0),initialStorageM3:l.bed.reduce((s,b)=>s+Math.max(0,l.waterLevelM-b.floorM)*b.areaKm2*1e6,0)};
 });
 reconnectDrainage(pack,receiver,locked);
 const {order,incoming}=drainageOrder(receiver),water=pack.points.map((p,i)=>monthlyWaterBalance(monthly.map(m=>m.temperature[i]),monthly.map(m=>m.precipitation[i]),Math.asin(p[2])*180/Math.PI));
 const wetLakeCells=new Set(lakes.flatMap(l=>l.ids.filter(i=>l.projected.get(i).floorM<l.lake.waterLevelM)));
 const runoff=Array.from({length:12},(_,m)=>Float64Array.from(pack.catchmentAreas,(a,i)=>pack.heights[i]<0?0:(wetLakeCells.has(i)?monthly[m].precipitation[i]:water[i].runoff[m])*a*1000));
 const storage=lakes.map(l=>l.initialStorageM3),lakeResults=lakes.map(l=>({id:l.lake.id,spillM:l.spillM,areaKm2:l.areaKm2,months:[]})),flows=[];
 for(let year=0;year<8;year++)for(let m=0;m<12;m++){
  const volume=runoff[m].slice();
  for(const i of order){
   const li=lakeAt[i];if(li>=0&&lakes[li].root===i){
    const l=lakes[li],initial=storage[li],input=volume[i],pet=l.ids.filter(j=>wetLakeCells.has(j)).reduce((s,j)=>s+water[j].pet[m]*pack.catchmentAreas[j],0)/l.areaKm2;
    const evaporation=Math.min(initial+input,Math.max(0,pet)*l.areaKm2*1000),remaining=initial+input-evaporation,outflow=Math.max(0,remaining-l.capacityM3);storage[li]=Math.max(0,remaining-outflow);volume[i]=outflow;
    if(year===7)lakeResults[li].months[m]={inflowM3:input,evaporationM3:evaporation,outflowM3:outflow,storageM3:storage[li],storageChangeM3:storage[li]-initial,balanceErrorM3:initial+input-evaporation-outflow-storage[li],dry:storage[li]<l.capacityM3*.01};
   }
   const j=receiver[i];if(j>=0)volume[j]+=volume[i];
  }
  if(year===7)flows[m]=Float64Array.from(volume,v=>v/(MONTH_DAYS[m]*86400));
 }
 const accumulatedArea=pack.catchmentAreas.map((a,i)=>pack.heights[i]>=0?a:0);for(const i of order){const j=receiver[i];if(j>=0)accumulatedArea[j]+=accumulatedArea[i];}
 const basin=new Int32Array(n);for(let k=order.length-1;k>=0;k--){const i=order[k],j=receiver[i];const li=lakeAt[i];basin[i]=li>=0&&lakes[li].root===i&&lakeResults[li].months.every(m=>m.outflowM3<1)?n+li:j<0?i:basin[j];}
 const streamCells=new Uint8Array(n),streamOrder=new Uint8Array(n),maximumOrder=new Uint8Array(n),sameOrder=new Uint8Array(n);
 for(const path of riverPaths)for(const cell of path)if(pack.heights[cell]>=0)streamCells[cell]=1;
 for(const cell of order)if(streamCells[cell]){streamOrder[cell]=maximumOrder[cell]?(maximumOrder[cell]+(sameOrder[cell]>1?1:0)):1;const next=receiver[cell];if(next>=0&&streamCells[next]){if(streamOrder[cell]>maximumOrder[next]){maximumOrder[next]=streamOrder[cell];sameOrder[next]=1;}else if(streamOrder[cell]===maximumOrder[next])sameOrder[next]++;}}
 const rivers=base.rivers.map((r,index)=>{const path=riverPaths[index],mouth=path.at(-1),station=path.at(-2)??mouth,discharge=flows.map(q=>q[station]);return {id:r.id,path,streamOrder:Math.max(1,...path.slice(0,-1).map(i=>streamOrder[i])),monthlyDischargeM3s:discharge,seasonalDryMonths:discharge.filter(q=>q<.05).length,catchmentAreaKm2:accumulatedArea[path.at(-2)??mouth],lengthKm:pathLength(r.geometry),basinId:basin[station]>=n?'basin-'+base.lakes[basin[station]-n].id:'basin-ocean-'+pack.gridRefs[basin[station]]};});
 return {version:1,receiver,order,incoming,flows,accumulatedArea,lakeAt,lakeWet:Uint8Array.from(pack.points,(_,i)=>wetLakeCells.has(i)?1:0),lakes:lakeResults,rivers,water,monthly,basin};
}
export function generateNaturalGeography(pack,climate,seed,language='zh-TW'){
 const routing=routePack(pack),lakes=discoverLakes(pack,routing,seed).map((l,i)=>({...l,name:language==='zh-TW'?`湖泊 ${i+1}`:`Lake ${i+1}`})),base={version:1,rivers:[],lakes,overlays:[]};
 const h=deriveHydrology(pack,climate,base),n=pack.points.length,channel=new Uint8Array(n),indegree=new Uint16Array(n);
 const annualFlow=Float64Array.from(pack.points,(_,i)=>h.flows.reduce((s,q,m)=>s+q[i]*MONTH_DAYS[m],0)/365);
 let totalLandArea=0,landCount=0;
 for(let i=0;i<n;i++)if(pack.heights[i]>=0){totalLandArea+=pack.catchmentAreas[i];landCount++;}
 // Discharge starts streams in both valleys and flat plains. The area floor
 // keeps channels below the resolution of the Pack from being drawn.
 let minimumArea=Math.max(12000,totalLandArea/Math.max(1,landCount)*3);
 for(let pass=0;pass<10;pass++){
  channel.fill(0);indegree.fill(0);
  for(let i=0;i<n;i++)if(pack.heights[i]>=0&&h.lakeAt[i]<0&&h.accumulatedArea[i]>=minimumArea&&annualFlow[i]>=2.5)channel[i]=1;
  // Keep selected channels connected all the way to their lake or ocean.
  for(const i of h.order){const j=h.receiver[i];if(channel[i]&&j>=0&&pack.heights[j]>=0&&h.lakeAt[j]<0)channel[j]=1;}
  for(let i=0;i<n;i++){const j=h.receiver[i];if(channel[i]&&j>=0&&channel[j])indegree[j]++;}
  if(channel.reduce((s,x,i)=>s+(x&&indegree[i]===0?1:0),0)<=1800)break;
  minimumArea*=1.5;
 }
 // Remove unresolved short tributaries and small one-reach coastal stubs.
 for(let pass=0;pass<3;pass++){
  indegree.fill(0);for(let i=0;i<n;i++)if(channel[i]&&h.receiver[i]>=0&&channel[h.receiver[i]])indegree[h.receiver[i]]++;
  let removed=0;
  for(let i=0;i<n;i++)if(channel[i]&&!indegree[i]){
   const branch=[];let current=i,distance=0;
   while(current>=0&&channel[current]&&(current===i||indegree[current]===1)){
    branch.push(current);
    const next=h.receiver[current];
    if(next>=0)distance+=km(pack.points[current],pack.points[next]);
    current=next;
    if(branch.length>8)break;
   }
   const joinsRiver=current>=0&&channel[current]&&indegree[current]>1;
   const coastalStub=current>=0&&pack.heights[current]<0&&branch.length===1&&h.accumulatedArea[i]<minimumArea*2;
   if((joinsRiver&&distance<Math.max(100,Math.sqrt(minimumArea)*1.25))||coastalStub){
    for(const cell of branch)channel[cell]=0;
    removed++;
   }
  }
  if(!removed)break;
 }
 indegree.fill(0);for(let i=0;i<n;i++)if(channel[i]&&h.receiver[i]>=0&&channel[h.receiver[i]])indegree[h.receiver[i]]++;
 const cellToRiver=new Map(),ends=[],dominant=new Int32Array(n);dominant.fill(-1);
 const annual=i=>annualFlow[i];
 for(let i=0;i<n;i++){const j=h.receiver[i];if(channel[i]&&j>=0&&channel[j]&&(dominant[j]<0||annual(i)>annual(dominant[j])))dominant[j]=i;}
 for(let i=0;i<n;i++)if(channel[i]&&indegree[i]===0){
  const path=[i];let current=i,j=h.receiver[i];while(j>=0){path.push(j);if(!channel[j]||dominant[j]!==current)break;current=j;j=h.receiver[j];}
  if(path.length<2)continue;const id=`river-${seed}-${pack.keys[i]}`;ends.push(path.at(-1));
  for(const c of path.slice(0,-1))cellToRiver.set(c,id);
  base.rivers.push({id,name:language==='zh-TW'?`河流 ${base.rivers.length+1}`:`River ${base.rivers.length+1}`,notes:'',geometry:path.map(k=>toLonLat(pack.points[k])),parentId:null,sourceLakeId:null,mouthLakeId:h.lakeAt[path.at(-1)]>=0?lakes[h.lakeAt[path.at(-1)]].id:null});
 }
 for(let k=0;k<base.rivers.length;k++){const r=base.rivers[k];r.parentId=cellToRiver.get(ends[k])??null;const first=pack.findCell(r.geometry[0]);for(let li=0;li<lakes.length;li++)if(lakes[li].bed.some(b=>h.receiver[pack.findCell(b.position)]===first))r.sourceLakeId=lakes[li].id;}
 for(const l of lakes){l.inletIds=base.rivers.filter(r=>r.mouthLakeId===l.id).map(r=>r.id);l.outletId=base.rivers.find(r=>r.sourceLakeId===l.id)?.id??null;}
 return base;
}
