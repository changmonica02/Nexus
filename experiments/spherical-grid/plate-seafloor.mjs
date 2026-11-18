// Plate-guided ocean floor prototype. Explicitly derived from the current
// authoritative Grid; never changes land or converts ocean to land.
// Bathymetry is returned as a proposal, with a separate opt-in apply step.
// Geological staging follows MapRegionizer's tectonics/elevation design.
import {assertGlobalGrid} from './global-config.mjs';
import {analyzeSphericalPlates} from './tectonic-plates.mjs';

export const SEAFLOOR=Object.freeze({
 shelf:1,slope:2,abyssalPlain:3,midOceanRidge:4,trench:5
});
const EARTH_RADIUS_KM=6371;
const clamp=(x,min,max)=>Math.max(min,Math.min(max,x));
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const greatCircleKm=(a,b)=>EARTH_RADIUS_KM*Math.acos(clamp(dot(a,b),-1,1));
const hash=(seed,id)=>{
 let a=(Math.imul(id+1,0x9e3779b1)^(seed>>>0))>>>0;
 a=Math.imul(a^(a>>>16),0x85ebca6b)>>>0;
 a=Math.imul(a^(a>>>13),0xc2b2ae35)>>>0;
 return ((a^(a>>>16))>>>0)/4294967296;
};
class Heap{
 constructor(){this.items=[];}
 add(x){const a=this.items;let i=a.length;a.push(x);while(i){const p=(i-1)>>1;if(a[p].d<=x.d)break;a[i]=a[p];i=p;}a[i]=x;}
 take(){const a=this.items,out=a[0],x=a.pop();if(!a.length)return out;let i=0;while(i*2+1<a.length){let c=i*2+1;if(c+1<a.length&&a[c+1].d<a[c].d)c++;if(a[c].d>=x.d)break;a[i]=a[c];i=c;}a[i]=x;return out;}
 get size(){return this.items.length;}
}
/** Stable tectonic seed depends on land/sea only, never user-editable labels
 * or existing seabed depths. It survives loading the same land mask. */
export function tectonicSeedFromLandMask(grid){
 assertGlobalGrid(grid);
 let h=2166136261;
 for(let i=0;i<grid.heights.length;i++)h=Math.imul(h^(grid.heights[i]>=0?1:0),16777619)>>>0;
 return h>>>0;
}
function oceanDistances(grid,sources){
 const n=grid.heights.length,dist=new Float64Array(n),heap=new Heap();
 dist.fill(Infinity);
 for(const i of sources)if(i>=0&&i<n&&grid.heights[i]<0&&dist[i]!==0){
  dist[i]=0;heap.add({i,d:0});
 }
 while(heap.size){
  const {i,d}=heap.take();if(d>dist[i]+1e-8)continue;
  for(const j of grid.neighbors[i]){
   if(grid.heights[j]>=0)continue;
   const next=d+greatCircleKm(grid.points[i],grid.points[j]);
   if(next+1e-8<dist[j]){dist[j]=next;heap.add({i:j,d:next});}
  }
 }
 return dist;
}
function coastSources(grid){
 const source=[];
 for(let i=0;i<grid.heights.length;i++)if(grid.heights[i]<0&&
  grid.neighbors[i].some(j=>grid.heights[j]>=0))source.push(i);
 return source;
}
function boundarySources(grid,tectonics,mode){
 const values=new Set();
 for(const b of tectonics.boundaries){
  if(b.mode!==mode)continue;
  if(grid.heights[b.a]<0)values.add(b.a);
  if(grid.heights[b.b]<0)values.add(b.b);
 }
 return [...values];
}
function volcanicCraterCandidates(grid,tectonics,seed){
 // These are references for future editable lake features; no water body,
 // river outlet or basin geometry is silently created.
 const active=new Set();
 for(const b of tectonics.boundaries)if(b.type==='convergent'&&b.mode==='subduction'){
  if(grid.heights[b.a]>=0)active.add(b.a);
  if(grid.heights[b.b]>=0)active.add(b.b);
 }
 const nearby=new Set(active);
 for(const i of active)for(const j of grid.neighbors[i])if(grid.heights[j]>=0)nearby.add(j);
 const candidates=[...nearby].filter(i=>grid.heights[i]>=20&&
  grid.neighbors[i].every(j=>grid.heights[i]>=grid.heights[j])&&hash(seed^0xCA1D3A,i)>.30);
 candidates.sort((a,b)=>grid.heights[b]-grid.heights[a]||a-b);
 const kept=[];
 for(const i of candidates){
  if(kept.some(j=>greatCircleKm(grid.points[i],grid.points[j])<180))continue;
  kept.push(i);
  if(kept.length===12)break;
 }
 return kept.map(i=>({id:'crater-candidate-'+i,gridCell:i,kind:'volcanic-crater-lake-candidate',elevation: grid.heights[i],status:'unconfirmed'}));
}
/** Builds proposed seabed elevations and independent feature labels.
 * Does not mutate grid or the formal map snapshot. */
export function generatePlateSeafloor(grid,{seed,tectonics}={}){
 assertGlobalGrid(grid);
 const tectonicSeed=seed??tectonicSeedFromLandMask(grid);
 const model=tectonics??analyzeSphericalPlates(grid,{seed:tectonicSeed});
 if(!Number.isInteger(tectonicSeed)||tectonicSeed<0||tectonicSeed>0xffffffff)throw RangeError('Tectonic seed must be uint32');
 if(model.domains.owners.length!==grid.heights.length)throw RangeError('Wrong plate domain size');
 const coast=oceanDistances(grid,coastSources(grid));
 const ridge=oceanDistances(grid,boundarySources(grid,model,'mid-ocean-ridge'));
 const trench=oceanDistances(grid,boundarySources(grid,model,'subduction'));
 const n=grid.heights.length,heights=grid.heights.slice(),zones=new Uint8Array(n);
 let cells=0;
 for(let i=0;i<n;i++){
  if(grid.heights[i]>=0)continue;
  cells++;
  const d=coast[i],r=ridge[i],t=trench[i];
  // Shelf 0-250 km: shallow continental margin. Slope 250-850 km:
  // transition down to the abyssal plain. No plateau is forced onto land.
  const edge=(hash(tectonicSeed^0xC0A57,i)-.5)*2;
  let depth;
  if(d<=250){
   zones[i]=SEAFLOOR.shelf;
   depth=1.3+1.8*Math.pow(clamp(d/250,0,1),1.25);
  }else if(d<=850){
   zones[i]=SEAFLOOR.slope;
   const fraction=clamp((d-250)/600,0,1);
   depth=3.1+40*(fraction*fraction*(3-2*fraction));
  }else{
   zones[i]=SEAFLOOR.abyssalPlain;
   const aging=Number.isFinite(r)?clamp(r/2400,0,1):1;
   depth=41+9*aging+edge*3.5;
  }
  // Smooth, broad volcanic ridge uplift. Very close to shore the shelf/slope
  // stays the primary feature; ridges never become new islands.
  const ridgeFactor=Number.isFinite(r)?Math.exp(-Math.pow(r/380,2)):0;
  if(ridgeFactor>.09&&d>300){
   depth=Math.max(9,depth-25*ridgeFactor);
   if(ridgeFactor>.24)zones[i]=SEAFLOOR.midOceanRidge;
  }
  // Subduction zones are concentrated, asymmetric trench-like deepening.
  const trenchFactor=Number.isFinite(t)?Math.exp(-Math.pow(t/155,2)):0;
  if(trenchFactor>.14&&d>100){
   depth+=38*trenchFactor;
   if(trenchFactor>.26)zones[i]=SEAFLOOR.trench;
  }
  const magnitude=clamp(Math.round(depth),1,100);
  heights[i]=-magnitude;
 }
 const craterLakeCandidates=volcanicCraterCandidates(grid,model,tectonicSeed);
 return {version:1,seed:tectonicSeed,heights,zones,tectonics:model,craterLakeCandidates,
  oceanCells:cells};
}
/** Mutates only already-submerged cells; use this for a NEW world or an
 * explicitly confirmed natural-environment recalculation, never on load. */
export function applyPlateSeafloor(grid,result){
 assertGlobalGrid(grid);
 if(!(result?.heights instanceof Int8Array)&&!(result?.heights instanceof Int16Array))
  throw TypeError('Invalid seafloor proposed heights');
 if(result.heights.length!==grid.heights.length)throw RangeError('Wrong proposal length');
 for(let i=0;i<grid.heights.length;i++){
  const old=grid.heights[i],next=result.heights[i];
  if(!Number.isInteger(next)||next< -100||next>100||
    (old>=0&&next!==old)||(old<0&&next>=0))
    throw RangeError('Seafloor proposal may not alter land or coast');
 }
 let changed=0;
 for(let i=0;i<grid.heights.length;i++)if(grid.heights[i]<0&&grid.heights[i]!==result.heights[i]){
  grid.heights[i]=result.heights[i];changed++;
 }
 return {changed,landPreserved:true,coastPreserved:true};
}
