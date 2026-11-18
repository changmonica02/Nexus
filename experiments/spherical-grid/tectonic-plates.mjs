// Prototype spherical plate analysis for Nexus.
// Algorithmic concepts (history -> crust -> domains -> boundaries) adapted from
// MapRegionizer's tectonic design; implementation is independent and runs on
// the immutable 36,002-cell spherical Grid. It never writes grid.heights.
// Reference: https://github.com/Muhv16/MapRegionizer/blob/master/docs/tectonics.md
import {assertGlobalGrid} from './global-config.mjs';
import {templateRng} from './azgaar-template-engine.mjs';

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
/** Geological hints are descriptive, never assumed to be active boundaries. */
export function deriveTectonicHistory(grid,seed){
 const n=grid.points.length,cratonHints=new Uint8Array(n),ridgeHints=new Uint8Array(n);
 const land=grid.heights;
 for(let i=0;i<n;i++){
  if(land[i]>=35 && grid.neighbors[i].filter(j=>land[j]>=25).length>=4)cratonHints[i]=1;
  if(land[i]<0 && grid.neighbors[i].every(j=>land[j]<0) && hashNoise(seed,i)>.945)ridgeHints[i]=1;
 }
 return {cratonHints,ridgeHints};
}
export function deriveCrustFields(grid,history){
 const n=grid.points.length,crust=new Uint8Array(n),distanceToCoast=new Int16Array(n);
 distanceToCoast.fill(-1);
 const queue=[];
 for(let i=0;i<n;i++){
  const terrestrial=grid.heights[i]>=0;
  crust[i]=terrestrial?CRUST.continental:CRUST.oceanic;
  if(grid.neighbors[i].some(j=>(grid.heights[j]>=0)!==terrestrial)){
   distanceToCoast[i]=0;queue.push(i);
  }
 }
 for(let head=0;head<queue.length;head++){
  const i=queue[head],d=distanceToCoast[i];
  if(d>=6)continue;
  for(const j of grid.neighbors[i])if(distanceToCoast[j]<0){
   distanceToCoast[j]=d+1;queue.push(j);
  }
 }
 for(let i=0;i<n;i++){
  if(grid.heights[i]<0&&distanceToCoast[i]>=0&&distanceToCoast[i]<=2)crust[i]=CRUST.shelf;
  else if(grid.heights[i]>=50&&history.cratonHints[i]===0)crust[i]=CRUST.terrane;
 }
 return {crust,distanceToCoast};
}
export function choosePlateSeeds(grid,crust,seed,plateCount){
 const rng=templateRng(seed^0x7ec701c),seeds=[];
 const n=grid.points.length;
 const initial=Math.floor(rng()*n);seeds.push(initial);
 // Farthest-site placement with a bounded geological preference. Sites can
 // occur in both oceans and continents: one plate may span both.
 for(let k=1;k<plateCount;k++){
  let best=-1,bestScore=-Infinity;
  for(let i=0;i<n;i++){
   let min=Infinity;
   for(const j of seeds)min=Math.min(min,1-dot(grid.points[i],grid.points[j]));
   const preference=crust[i]===CRUST.oceanic?1.04:crust[i]===CRUST.shelf?.94:1;
   const score=min*preference*(.93+.14*hashNoise(seed+k*97,i));
   if(score>bestScore){bestScore=score;best=i;}
  }
  seeds.push(best);
 }
 return seeds;
}
function edgeCost(grid,crust,history,source,target,seed){
 const d=sphereDistance(grid.points[source],grid.points[target]);
 const crossCoast=(crust[source]===CRUST.oceanic)!==(crust[target]===CRUST.oceanic);
 // Soft (not prohibitive) change in cost at crust transitions.
 const transition=crossCoast?1.18:1;
 // Plate domains are upstream of synthesized bathymetry. Only land relief
 // may affect growth cost, otherwise recalculating the seabed would move plates.
 const landSource=Math.max(0,grid.heights[source]),landTarget=Math.max(0,grid.heights[target]);
 const relief=Math.min(.22,Math.abs(landSource-landTarget)*.003);
 const lineament=(history.ridgeHints[target]?1.12:1);
 return d*transition*(1+relief)*lineament*(.90+hashNoise(seed,target)*.2);
}
export function derivePlateDomains(grid,history,fields,seed,plateCount){
 const sites=choosePlateSeeds(grid,fields.crust,seed,plateCount);
 const n=grid.points.length,owners=new Int16Array(n),costs=new Float64Array(n),heap=new Heap();
 owners.fill(-1);costs.fill(Infinity);
 for(let p=0;p<sites.length;p++){
  const i=sites[p];costs[i]=0;owners[i]=p;heap.push({cost:0,cell:i,plate:p});
 }
 while(heap.length){
  const {cell,cost,plate}=heap.pop();
  if(cost>costs[cell]+1e-12||owners[cell]!==plate)continue;
  for(const next of grid.neighbors[cell]){
   const candidate=cost+edgeCost(grid,fields.crust,history,cell,next,seed+plate*1109);
   if(candidate+1e-12<costs[next]){
    costs[next]=candidate;owners[next]=plate;heap.push({cost:candidate,cell:next,plate});
   }
  }
 }
 if(owners.some(id=>id<0))throw Error('Unassigned spherical plate cell');
 const rng=templateRng(seed^0x20b021);
 const plates=sites.map((site,id)=>{
  const axis=unit([rng()-.5,rng()-.5,rng()-.5]);
  return {id,seedCell:site,pole:axis,angularSpeed:(.012+rng()*.035)*(rng()<.5?-1:1),areaKm2:0,landAreaKm2:0};
 });
 for(let i=0;i<n;i++){
  const plate=plates[owners[i]];plate.areaKm2+=grid.areas[i];
  if(grid.heights[i]>=0)plate.landAreaKm2+=grid.areas[i];
 }
 return {owners,plates};
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
   const center=unit(p.map((v,i)=>v+q[i]));
   const normal=unit(q.map((v,i)=>v-p[i]*dot(q,p)));
   const va=cross(domains.plates[pa].pole,center).map(x=>x*domains.plates[pa].angularSpeed);
   const vb=cross(domains.plates[pb].pole,center).map(x=>x*domains.plates[pb].angularSpeed);
   const relative=vb.map((v,i)=>v-va[i]);
   const normalMotion=dot(relative,normal);
   const tangentMotion=Math.hypot(...relative.map((v,i)=>v-normalMotion*normal[i]));
   const type=Math.abs(normalMotion)<.004&&tangentMotion<.004?TYPES.inactive:
    normalMotion<-.007?TYPES.convergent:normalMotion>.007?TYPES.divergent:TYPES.transform;
   const oceanA=fields.crust[low]===CRUST.oceanic||fields.crust[low]===CRUST.shelf;
   const oceanB=fields.crust[high]===CRUST.oceanic||fields.crust[high]===CRUST.shelf;
   const mode=type==='convergent'?(oceanA||oceanB?'subduction':'collision'):
    type==='divergent'?(oceanA&&oceanB?'mid-ocean-ridge':'rift'):
    type==='transform'?'transform':'diffuse';
   boundaries.push({a:low,b:high,plates:[pa,pb],type,mode,normalMotion,tangentMotion,
    start:centers[first],end:centers[fi]});
  }
 }
 if(edgeToFirst.size)throw Error('Unpaired spherical boundary mesh edges');
 return boundaries;
}
const deg=p=>[Math.atan2(p[1],p[0])*180/Math.PI,Math.asin(clamp(p[2]))*180/Math.PI];
function unwrapSegment(a,b){
 const x=deg(a),y=deg(b);
 while(y[0]-x[0]>180)y[0]-=360;
 while(y[0]-x[0]<-180)y[0]+=360;
 return [x,y];
}
/** Never changes the canonical Grid. Intended as a lazily recomputed overlay. */
export function analyzeSphericalPlates(grid,{seed=1,plateCount}={}){
 assertGlobalGrid(grid);
 if(!Number.isInteger(seed)||seed<0||seed>0xffffffff)throw RangeError('Plate seed must be uint32');
 const rng=templateRng(seed^0x504c4154);
 const count=plateCount??(6+Math.floor(rng()*7));
 if(!Number.isInteger(count)||count<6||count>12)throw RangeError('Plate count must be 6..12');
 const history=deriveTectonicHistory(grid,seed);
 const crust=deriveCrustFields(grid,history);
 const domains=derivePlateDomains(grid,history,crust,seed,count);
 const boundaries=derivePlateBoundaries(grid,crust,domains);
 return {version:1,plateCount:count,history,crust,domains,boundaries,
  // Display only; no cell-to-plate tint and no overlap with coastline semantics.
  drawing:boundaries.map(b=>unwrapSegment(b.start,b.end))};
}
