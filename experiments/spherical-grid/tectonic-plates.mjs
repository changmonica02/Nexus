// Prototype spherical plate analysis for Nexus.
// Algorithmic concepts (history -> crust -> domains -> boundaries) adapted from
// MapRegionizer's tectonic design; implementation is independent and runs on
// the immutable 36,002-cell spherical Grid. It never writes grid.heights.
// Reference: https://github.com/Muhv16/MapRegionizer/blob/master/docs/tectonics.md
import {assertGlobalGrid} from './global-config.mjs';
import {templateRng} from './azgaar-template-engine.mjs';
import {valueNoise3} from './spherical-terrain-refinement.mjs';
import {sphericalField} from './geologic-fields.mjs';
import {deriveGeologicFeatures} from './tectonic-features.mjs';

const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const unit=a=>{const n=Math.hypot(...a);return a.map(x=>x/n);};
const clamp=(v,lo=-1,hi=1)=>Math.min(hi,Math.max(lo,v));
const sphereDistance=(a,b)=>Math.acos(clamp(dot(a,b)));
const CRUST=Object.freeze({oceanic:0,continental:1,shelf:2,arc:3,rift:4,terrane:5});
const TYPES=Object.freeze({convergent:'convergent',divergent:'divergent',transform:'transform',inactive:'inactive'});
class Heap{
 constructor(){this.a=[];}
 push(value){const a=this.a;let i=a.length;a.push(value);while(i){const p=(i-1)>>1;if(a[p].cost<=value.cost)break;a[i]=a[p];i=p;}a[i]=value;}
 pop(){const a=this.a,root=a[0],v=a.pop();if(!a.length)return root;let i=0;while(2*i+1<a.length){let c=2*i+1;if(c+1<a.length&&a[c+1].cost<a[c].cost)c++;if(a[c].cost>=v.cost)break;a[i]=a[c];i=c;}a[i]=v;return root;}
 get length(){return this.a.length;}
}
const hashNoise=(seed,id)=>{
 let v=(Math.imul(id+1,0x9e3779b1)^(seed>>>0))>>>0;
 v=Math.imul(v^(v>>>16),0x85ebca6b)>>>0;
 v=Math.imul(v^(v>>>13),0xc2b2ae35)>>>0;
 return ((v^(v>>>16))>>>0)/4294967296;
};
/** Historical evidence is independent of present motion and ocean depth. */
export function deriveTectonicHistory(grid,seed){
 const n=grid.points.length,cratonHints=new Uint8Array(n),ridgeHints=new Uint8Array(n),mountainMemory=new Uint8Array(n);
 const orogenAgeMa=new Float32Array(n),coast=[];
 for(let i=0;i<n;i++)if(grid.neighbors[i].some(j=>(grid.heights[j]>=0)!==(grid.heights[i]>=0)))coast.push(i);
 const coastDistance=sphericalField(grid,coast).distance;
 for(let i=0;i<n;i++){
  const h=grid.heights[i],p=grid.points[i],near=grid.neighbors[i];
  if(h<0){
   // A coherent ocean-opening hint, not scattered random ridge cells.
   ridgeHints[i]=coastDistance[i]>650&&Math.abs(valueNoise3(p,3,seed^0x541c))<.06?1:0;
   continue;
  }
  const roughness=near.reduce((v,j)=>v+Math.abs(Math.max(0,grid.heights[j])-h),0)/near.length;
  if(coastDistance[i]>250&&roughness<2.5&&h<18)cratonHints[i]=1;
  if(h>=15){mountainMemory[i]=1;orogenAgeMa[i]=35+500*(.5+.5*valueNoise3(p,5,seed^0x071e));}
 }
 return {version:2,seed,cratonHints,ridgeHints,mountainMemory,orogenAgeMa,coastDistance};
}
export function deriveCrustFields(grid,history){
 const n=grid.points.length,crust=new Uint8Array(n),distanceToCoast=new Int16Array(n),coastalZone=new Uint8Array(n);
 const oceanicAgeMa=new Float32Array(n),continentalAgeMa=new Float32Array(n);
 const ridgeSources=[];for(let i=0;i<n;i++)if(history.ridgeHints[i])ridgeSources.push(i);
 const ridgeDistance=sphericalField(grid,ridgeSources,{allowed:i=>grid.heights[i]<0}).distance;
 for(let i=0;i<n;i++){
  const land=grid.heights[i]>=0,d=history.coastDistance[i],p=grid.points[i];
  distanceToCoast[i]=Number.isFinite(d)?Math.min(32767,Math.round(d/110)):-1;
  crust[i]=land?CRUST.continental:d<260?CRUST.shelf:CRUST.oceanic;
  if(land&&grid.heights[i]>=25&&history.orogenAgeMa[i]<140&&!history.cratonHints[i])crust[i]=CRUST.terrane;
  coastalZone[i]=d<260?1:d<700?2:0;
  if(land)continentalAgeMa[i]=500+1800*(.5+.5*valueNoise3(p,3,history.seed^0x181a));
  else oceanicAgeMa[i]=Number.isFinite(ridgeDistance[i])?Math.min(190,4+ridgeDistance[i]/35):130;
 }
 return {version:2,crust,distanceToCoast,distanceToCoastKm:history.coastDistance,coastalZone,oceanicAgeMa,continentalAgeMa};
}
export function choosePlateSeeds(grid,crust,seed,plateCount){
 const rng=templateRng(seed^0x7ec701c),seeds=[];
 const n=grid.points.length;
 const initial=Math.floor(rng()*n);seeds.push(initial);
 // Planet's random, separated, weighted sites avoid a uniform farthest-site lattice.
 // Choose on the real sphere; the domain metric below is independently warped.
 const minAngle=.57*Math.sqrt(4*Math.PI/plateCount);
 for(let k=1;k<plateCount;k++){
  let best=-1,bestDistance=-1;
  for(let attempt=0;attempt<200;attempt++){
   const i=Math.floor(rng()*n);
   const d=Math.min(...seeds.map(j=>sphereDistance(grid.points[i],grid.points[j])));
   if(d>bestDistance){best=i;bestDistance=d;}
   if(d>minAngle){best=i;break;}
  }
  seeds.push(best);
 }
 return seeds;
}
// Multi-octave vector displacement, normalized on the sphere. Conceptually
// follows planet.js's qx/qy/qz domain warp; no projected longitude seam.
export function warpPlateCoordinates(points,seed){
 const fbm=(p,s)=>[1.7,3.4,6.8,13.6].reduce((v,f,k)=>v+valueNoise3(p,f,s)*(.5**k),0)/1.875;
 return points.map(p=>unit(p.map((v,k)=>v+.62*fbm(p,seed^[0x31ad,0x77c1,0xa92f][k]))));
}
function edgeCost(grid,crust,history,source,target,resistance,warped){
 const physical=sphereDistance(grid.points[source],grid.points[target]);
 const deformed=sphereDistance(warped[source],warped[target]);
 // The real-distance floor prevents folds becoming zero-cost shortcuts.
 const d=.18*physical+.82*deformed;
 const crossCoast=(crust[source]===CRUST.oceanic)!==(crust[target]===CRUST.oceanic);
 // Soft (not prohibitive) change in cost at crust transitions.
 const transition=crossCoast?1.18:1;
 // Plate domains are upstream of synthesized bathymetry. Only land relief
 // may affect growth cost, otherwise recalculating the seabed would move plates.
 const landSource=Math.max(0,grid.heights[source]),landTarget=Math.max(0,grid.heights[target]);
 const relief=Math.min(.22,Math.abs(landSource-landTarget)*.003);
 const lineament=(history.ridgeHints[target]?1.18:1)*(history.mountainMemory[target]?1.06:1)*(history.cratonHints[source]&&history.cratonHints[target]?.94:1);
 // Coherent lithospheric resistance bends domain growth over hundreds of
 // kilometres. Independent cell noise alone produced nearly straight Voronoi
 // sides and their polygonal ridge/trench belts. Depends only on position,
 // seed and terrestrial relief, never the synthesized ocean depth.
 return d*transition*(1+relief)*lineament*resistance[target];
}
export function derivePlateDomains(grid,history,fields,seed,plateCount){
 const sites=choosePlateSeeds(grid,fields.crust,seed,plateCount),n=grid.points.length;
 const warped=warpPlateCoordinates(grid.points,seed);
 const resistance=Float64Array.from(grid.points,p=>Math.max(.3,1+.25*valueNoise3(p,3,seed^0x94b7)+.10*valueNoise3(p,8,seed^0xa12f)));
 const rng=templateRng(seed^0x21e9),total=grid.areas.reduce((s,a)=>s+a,0);
 const initialSpeeds=sites.map((_,id)=>.68+1.15*((id+rng())/plateCount));
 // Shuffle large/small growth budgets among well-separated geological seeds.
 for(let i=initialSpeeds.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[initialSpeeds[i],initialSpeeds[j]]=[initialSpeeds[j],initialSpeeds[i]];}
 let result;
 for(let cycle=0;cycle<5;cycle++){
  const speeds=initialSpeeds.map(s=>s**(.78**cycle));
  const owners=new Int16Array(n),parents=new Int32Array(n),costs=new Float64Array(n),heap=new Heap();
  owners.fill(-1);parents.fill(-1);costs.fill(Infinity);
  sites.forEach((cell,plate)=>{costs[cell]=0;heap.push({cell,plate,parent:-1,cost:0});});
  while(heap.length){
   const {cell,cost,plate,parent}=heap.pop();
   if(owners[cell]>=0||cost>costs[cell]+1e-12)continue;
   // Only settled growth fronts can claim a cell: parents always belong to
   // the same plate. Unequal speeds cannot create disconnected enclaves.
   owners[cell]=plate;parents[cell]=parent;
   for(const next of grid.neighbors[cell])if(owners[next]<0){
    const candidate=cost+edgeCost(grid,fields.crust,history,cell,next,resistance,warped)/speeds[plate];
    if(candidate+1e-12<costs[next]){costs[next]=candidate;heap.push({cell:next,parent:cell,cost:candidate,plate});}
   }
  }
  if(owners.some(id=>id<0))throw Error('Unassigned spherical plate cell');
  const motion=templateRng(seed^0x20b021);
  const plates=sites.map((site,id)=>({id,seedCell:site,pole:unit([motion()-.5,motion()-.5,motion()-.5]),
   angularSpeed:(.012+motion()*.035)*(motion()<.5?-1:1),growthRate:speeds[id],seedCrust:fields.crust[site],areaKm2:0,landAreaKm2:0,oceanAreaKm2:0,continentalCrustAreaKm2:0,oceanicCrustAreaKm2:0}));
  for(let i=0;i<n;i++){const p=plates[owners[i]];p.areaKm2+=grid.areas[i];if(grid.heights[i]>=0)p.landAreaKm2+=grid.areas[i];else p.oceanAreaKm2+=grid.areas[i];if(fields.crust[i]===CRUST.oceanic||fields.crust[i]===CRUST.arc)p.oceanicCrustAreaKm2+=grid.areas[i];else p.continentalCrustAreaKm2+=grid.areas[i];}
  for(const p of plates)p.areaPercent=100*p.areaKm2/total;
  result={version:3,owners,parents,plates,validationCycles:cycle+1};
  if(Math.min(...plates.map(p=>p.areaKm2/total))>=.0125&&Math.max(...plates.map(p=>p.areaKm2/total))<=.45)break;
 }
 if(Math.min(...result.plates.map(p=>p.areaKm2/total))<.005)throw Error('Primary plate became an accidental microplate');
 if(!result)throw Error('Missing plate domain result');
 return result;
}
function circumcenter(a,b,c){
 const ab=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],ac=[c[0]-a[0],c[1]-a[1],c[2]-a[2]];
 let p=unit(cross(ab,ac));if(dot(p,a)<0)p=p.map(x=>-x);return p;
}
/** Dual Voronoi edges between cells of different plate IDs. */
export function derivePlateBoundaries(grid,fields,domains){
 const edgeToFirst=new Map(),boundaries=[];
 const centers=grid.triangles.map(face=>circumcenter(...face.map(id=>grid.points[id])));
 for(let fi=0;fi<grid.triangles.length;fi++){
  const face=grid.triangles[fi];
  for(let k=0;k<3;k++){
   const a=face[k],b=face[(k+1)%3],low=Math.min(a,b),high=Math.max(a,b);
   if(domains.owners[a]===domains.owners[b])continue;
   const key=low*grid.points.length+high,first=edgeToFirst.get(key);
   if(first===undefined){edgeToFirst.set(key,fi);continue;}
   edgeToFirst.delete(key);
   const pa=domains.owners[low],pb=domains.owners[high],p=grid.points[low],q=grid.points[high];
   const normal=unit(q.map((v,i)=>v-p[i])).map(v=>pa<pb?v:-v);
   boundaries.push({type:'',mode:'',preciseMode:'',activity:0,normalMotion:0,tangentMotion:0,a:low,b:high,plates:[Math.min(pa,pb),Math.max(pa,pb)],normal,
    center:unit(p.map((v,i)=>v+q[i])),vertexA:first,vertexB:fi,start:centers[first],end:centers[fi]});
  }
 }
 if(edgeToFirst.size)throw Error('Unpaired spherical boundary mesh edges');
 const at=new Map();boundaries.forEach((b,i)=>{for(const v of [b.vertexA,b.vertexB]){if(!at.has(v))at.set(v,[]);at.get(v).push(i);}});
 // Smooth the plate-pair oriented normal over a SHORT local chain. Raw hex
 // edge directions alternate by 60 degrees and falsely alternate collision /
 // transform modes on what is one physically continuous local boundary.
 for(let index=0;index<boundaries.length;index++){
  const b=boundaries[index],queue=[{id:index,depth:0}],seen=new Set([index]),sum=[0,0,0];
  for(let h=0;h<queue.length;h++){
   const {id,depth}=queue[h],edge=boundaries[id],weight=1/(1+depth);
   for(let k=0;k<3;k++)sum[k]+=edge.normal[k]*weight;
   if(depth>=3)continue;
   for(const v of [edge.vertexA,edge.vertexB])for(const j of at.get(v)){
    const other=boundaries[j];if(!seen.has(j)&&other.plates[0]===b.plates[0]&&other.plates[1]===b.plates[1]){seen.add(j);queue.push({id:j,depth:depth+1});}
   }
  }
  const normal=unit(sum.map((v,k)=>v-b.center[k]*dot(sum,b.center)));
  Object.assign(b,classifyLocalBoundary(grid,fields,domains,b,normal));
 }
 return boundaries;
}
export function classifyLocalBoundary(grid,fields,domains,b,normal){
 const [pa,pb]=b.plates,sideA=domains.owners[b.a]===pa?b.a:b.b,sideB=sideA===b.a?b.b:b.a;
 const va=cross(domains.plates[pa].pole,b.center).map(v=>v*domains.plates[pa].angularSpeed);
 const vb=cross(domains.plates[pb].pole,b.center).map(v=>v*domains.plates[pb].angularSpeed);
 const relative=vb.map((v,k)=>v-va[k]),normalMotion=dot(relative,normal),tangentMotion=Math.hypot(...relative.map((v,k)=>v-normalMotion*normal[k]));
 const type=Math.abs(normalMotion)<.004&&tangentMotion<.004?TYPES.inactive:normalMotion<-.007?TYPES.convergent:normalMotion>.007?TYPES.divergent:TYPES.transform;
 const oceanA=fields.crust[sideA]===CRUST.oceanic||fields.crust[sideA]===CRUST.arc;
 const oceanB=fields.crust[sideB]===CRUST.oceanic||fields.crust[sideB]===CRUST.arc;
 const mode=type==='convergent'?(oceanA||oceanB?'subduction':'collision'):type==='divergent'?(oceanA&&oceanB?'mid-ocean-ridge':'rift'):type==='transform'?'transform':'diffuse';
 const activity=clamp(Math.hypot(normalMotion,tangentMotion)/.06,0,1);
 const preciseMode=mode==='subduction'?(tangentMotion>Math.abs(normalMotion)*1.2?'oblique-subduction':oceanA&&oceanB?'ocean-ocean-subduction':'ocean-continent-subduction'):
  mode==='collision'?'continental-collision':mode==='rift'?'continental-rift':mode==='transform'?(normalMotion<-.003?'transpression':normalMotion>.003?'transtension':'pure-transform'):mode;
 let subductingPlate=null,overridingPlate=null,subductingCell=null,overridingCell=null,subductingOceanicAgeMa=null;
 if(mode==='subduction'){
  const aSinks=oceanA&&(!oceanB||fields.oceanicAgeMa[sideA]>=fields.oceanicAgeMa[sideB]);
  subductingCell=aSinks?sideA:sideB;overridingCell=aSinks?sideB:sideA;
  subductingPlate=domains.owners[subductingCell];overridingPlate=domains.owners[overridingCell];subductingOceanicAgeMa=fields.oceanicAgeMa[subductingCell];
 }
 return {type,mode,preciseMode,activity,normalMotion,tangentMotion,smoothedNormal:normal,subductingPlate,overridingPlate,subductingCell,overridingCell,subductingOceanicAgeMa};
}
const deg=p=>[Math.atan2(p[1],p[0])*180/Math.PI,Math.asin(clamp(p[2]))*180/Math.PI];
function unwrapSegment(a,b){
 const x=deg(a),y=deg(b);
 while(y[0]-x[0]>180)y[0]-=360;
 while(y[0]-x[0]<-180)y[0]+=360;
 return [x,y];
}
/** Contiguous local segments, not one classification for a whole plate pair. */
export function segmentPlateBoundaries(boundaries){
 const at=new Map();boundaries.forEach((b,i)=>{for(const v of [b.vertexA,b.vertexB]){if(!at.has(v))at.set(v,[]);at.get(v).push(i);}});
 const seen=new Uint8Array(boundaries.length),segments=[];
 for(let i=0;i<boundaries.length;i++){
  if(seen[i])continue;const b=boundaries[i],q=[i];seen[i]=1;
  for(let h=0;h<q.length;h++)for(const v of [boundaries[q[h]].vertexA,boundaries[q[h]].vertexB])for(const j of at.get(v)){
   const c=boundaries[j];if(!seen[j]&&c.plates[0]===b.plates[0]&&c.plates[1]===b.plates[1]&&c.preciseMode===b.preciseMode&&c.subductingPlate===b.subductingPlate){seen[j]=1;q.push(j);}
  }
  const id=segments.length;
  for(const j of q)boundaries[j].segmentId=id;
  segments.push({id,diagnosticOnly:q.length<3,subductingPlate:b.subductingPlate,overridingPlate:b.overridingPlate,plates:b.plates,mode:b.mode,preciseMode:b.preciseMode,boundaryIndices:q,
   activity:q.reduce((s,j)=>s+boundaries[j].activity,0)/q.length,
   lengthKm:q.reduce((s,j)=>s+sphereDistance(boundaries[j].start,boundaries[j].end)*6371,0)});
 }
 return {version:2,segments};
}
/** Pure derivation. No stage writes authoritative mountain/land elevations. */
export function analyzeSphericalPlates(grid,{seed=1,plateCount}={}){
 assertGlobalGrid(grid);
 if(!Number.isInteger(seed)||seed<0||seed>0xffffffff)throw RangeError('Plate seed must be uint32');
 const rng=templateRng(seed^0x504c4154),count=plateCount??(6+Math.floor(rng()*7));
 if(!Number.isInteger(count)||count<6||count>12)throw RangeError('Plate count must be 6..12');
 const history=deriveTectonicHistory(grid,seed),crust=deriveCrustFields(grid,history);
 const domains=derivePlateDomains(grid,history,crust,seed,count),boundaries=derivePlateBoundaries(grid,crust,domains),boundaryMap=segmentPlateBoundaries(boundaries);
 const features=deriveGeologicFeatures(grid,{seed,history,crust,domains,boundaries,boundaryMap});
 return {version:3,plateCount:count,history,crust,crustFields:crust,domains,plateDomains:domains,boundaries,boundaryMap,
  orogenProvinces:features.orogenProvinces,features,drawing:boundaries.map(b=>unwrapSegment(b.start,b.end))};
}
