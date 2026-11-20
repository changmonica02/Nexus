// Plate-guided ocean floor prototype. Explicitly derived from the current
// authoritative Grid; never changes land or converts ocean to land.
// Bathymetry is returned as a proposal, with a separate opt-in apply step.
// Geological staging follows MapRegionizer's tectonics/elevation design.
import {assertGlobalGrid} from './global-config.mjs';
import {analyzeSphericalPlates} from './tectonic-plates.mjs';
import {valueNoise3} from './spherical-terrain-refinement.mjs';

export const SEAFLOOR=Object.freeze({
 shelf:1,slope:2,abyssalPlain:3,midOceanRidge:4,trench:5,seamount:6
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
/** Ocean-only hotspot chains and boundary-linked seamounts, deterministic on
 * the land mask and plate topology. Centers are not independent land cells. */
export function locateSubmarineVolcanoes(grid,tectonics,seed,coastDistance){
 const candidates=[],seen=new Set();
 // Active spreading systems have melt supply; ocean-ocean subduction arcs
 // contribute sparse submarine cones on the oceanward side of the boundary.
 for(const boundary of tectonics.boundaries){
  if(boundary.mode!=='mid-ocean-ridge'&&boundary.mode!=='subduction')continue;
  for(const cell of [boundary.a,boundary.b]){
   if(grid.heights[cell]>=0||coastDistance[cell]<180||seen.has(cell))continue;
   seen.add(cell);
   const threshold=boundary.mode==='mid-ocean-ridge'?.955:.925;
   if(hash(seed^0x7b2900,cell)>threshold)
    candidates.push({cell,kind:boundary.mode==='mid-ocean-ridge'?'ridge-volcano':'volcanic-arc',weight:1.0});
  }
 }
 // Intraplate hot spots make isolated oceanic seamount chains, rather than
 // pretending every volcano sits precisely on a plate boundary.
 for(let i=0;i<grid.heights.length;i++){
  if(grid.heights[i]>=0||coastDistance[i]<450)continue;
  if(hash(seed^0x52ea100,i)>.99935)candidates.push({cell:i,kind:'hotspot',weight:1.15});
 }
 candidates.sort((a,b)=>a.cell-b.cell||a.kind.localeCompare(b.kind));
 const centers=[];
 for(const c of candidates){
  if(centers.some(p=>greatCircleKm(grid.points[p.cell],grid.points[c.cell])<185))continue;
  centers.push(c);
  if(centers.length>=90)break;
 }
 // A center plus a few offsets along its host plate's local motion creates
 // a short seamount chain. Offsets are actual adjacent spherical Grid cells.
 const cones=[];
 for(const item of centers){
  const plate=tectonics.domains.plates[tectonics.domains.owners[item.cell]];
  const p=grid.points[item.cell],v=[
   plate.pole[1]*p[2]-plate.pole[2]*p[1],
   plate.pole[2]*p[0]-plate.pole[0]*p[2],
   plate.pole[0]*p[1]-plate.pole[1]*p[0]
  ];
  const sign=plate.angularSpeed<0?-1:1;
  cones.push({...item,radiusKm:65+95*hash(seed^0x7091,item.cell),uplift:19+16*hash(seed^0x2187,item.cell)});
  if(item.kind!=='hotspot')continue;
  let current=item.cell;
  for(let step=0;step<3;step++){
   const next=grid.neighbors[current].filter(i=>grid.heights[i]<0&&coastDistance[i]>220)
    .sort((a,b)=>sign*dot(v,grid.points[b])-sign*dot(v,grid.points[a]))[0];
   if(next===undefined||next===current)break;
   current=next;
   cones.push({cell:current,kind:'hotspot-chain',radiusKm:45+20*hash(seed^0x2191,current),
    uplift:Math.max(8,23-4*step)});
  }
 }
 return cones;
}
/** Builds proposed seabed elevations and independent feature labels.
 * Does not mutate grid or the formal map snapshot. */
export function generatePlateSeafloor(grid,{seed,tectonics}={}){
 assertGlobalGrid(grid);
 const tectonicSeed=seed??tectonicSeedFromLandMask(grid);
 const model=tectonics??analyzeSphericalPlates(grid,{seed:tectonicSeed});
 if(!Number.isInteger(tectonicSeed)||tectonicSeed<0||tectonicSeed>0xffffffff)throw RangeError('Tectonic seed must be uint32');
 if(model.domains.owners.length!==grid.heights.length)throw RangeError('Wrong plate domain size');
 const coast=model.crust?.distanceToCoastKm??oceanDistances(grid,coastSources(grid));
 const ridge=model.features?.ridgeField.distance??oceanDistances(grid,boundarySources(grid,model,'mid-ocean-ridge'));
 const trench=model.features?.trenchField.distance??oceanDistances(grid,boundarySources(grid,model,'subduction'));
 const volcanoes=model.features?.volcanoes??locateSubmarineVolcanoes(grid,model,tectonicSeed,coast);
 const n=grid.heights.length,heights=Float32Array.from(grid.heights),zones=new Uint8Array(n);
 let cells=0;
 for(let i=0;i<n;i++){
  if(grid.heights[i]>=0)continue;
  cells++;
  const d=coast[i],r=ridge[i],t=trench[i];
  // Shelf 0-250 km: shallow continental margin. Slope 250-850 km:
  // transition down to the abyssal plain. No plateau is forced onto land.
  const p=grid.points[i];
  // Shelf width follows broad crustal variation and narrows at active
  // margins. Smooth 3D fields have neither longitude seams nor cell-ID bands.
  const broad=valueNoise3(p,3,tectonicSeed^0xC0A57);
  const texture=valueNoise3(p,13,tectonicSeed^0x1A817);
  const active=Number.isFinite(t)?Math.exp(-((t/420)**2)):0;
  const shelfEnd=clamp(250+210*broad,90,460)*(1-.55*active);
  const slopeWidth=clamp(410+220*valueNoise3(p,5,tectonicSeed^0x5291),200,650);
  const slopeEnd=shelfEnd+slopeWidth;
  let depth;
  if(d<=shelfEnd){
   zones[i]=SEAFLOOR.shelf;
   depth=1.1+1.7*Math.pow(clamp(d/shelfEnd,0,1),1.4);
  }else if(d<=slopeEnd){
   zones[i]=SEAFLOOR.slope;
   const fraction=clamp((d-shelfEnd)/slopeWidth,0,1);
   depth=2.8+40*(fraction*fraction*(3-2*fraction));
  }else{
   zones[i]=SEAFLOOR.abyssalPlain;
   const aging=Number.isFinite(r)?Math.sqrt(clamp(r/3000,0,1)):1;
   depth=42.8+8*aging+2.5*broad+1.1*texture;
  }
  // Smooth, broad volcanic ridge uplift. Very close to shore the shelf/slope
  // stays the primary feature; ridges never become new islands.
  const ridgeFactor=Number.isFinite(r)?Math.exp(-Math.pow(r/380,2)):0;
  if(ridgeFactor>.001&&d>shelfEnd){
   const gate=clamp((d-shelfEnd)/350,0,1);
   depth=Math.max(3,depth-25*ridgeFactor*gate*gate*(3-2*gate));
   if(ridgeFactor>.24)zones[i]=SEAFLOOR.midOceanRidge;
  }
  // Subduction zones are concentrated, asymmetric trench-like deepening.
  const trenchFactor=Number.isFinite(t)?Math.exp(-Math.pow(t/155,2)):0;
  if(trenchFactor>.001){
   const gate=clamp(d/180,0,1);
   depth+=38*trenchFactor*gate*gate*(3-2*gate);
   if(trenchFactor>.26)zones[i]=SEAFLOOR.trench;
  }
  // Submerged cones are radial smooth bumps. Restrict to ocean and require
  // a substantive uplift so their seafloor label is not a decorative marker.
  let volcanoUplift=0;
  for(const cone of volcanoes){
   const distance=greatCircleKm(grid.points[i],grid.points[cone.cell]);
   if(distance>cone.radiusKm*2)continue;
   const effect=cone.uplift*Math.exp(-2*(distance/cone.radiusKm)**2);
   volcanoUplift=Math.max(volcanoUplift,effect);
  }
  if(volcanoUplift>=4&&d>140){
   depth=Math.max(3,depth-volcanoUplift);
   zones[i]=SEAFLOOR.seamount;
  }
  const magnitude=clamp(Math.round(depth*100)/100,.01,100);
  heights[i]=-magnitude;
 }
 return {version:3,seed:tectonicSeed,heights,zones,tectonics:model,islandChains:model.features?.islandChains??[],seamountChains:model.features?.seamountChains??[],
  submarineVolcanoes:volcanoes.map(({cell,kind,radiusKm,uplift,plateId,chainId,ageMa})=>({id:'seamount-'+cell,gridCell:cell,kind,radiusKm,uplift,plateId,chainId,ageMa})),
  oceanCells:cells};
}
/** Mutates only already-submerged cells; use this for a NEW world or an
 * explicitly confirmed natural-environment recalculation, never on load. */
export function applyPlateSeafloor(grid,result){
 assertGlobalGrid(grid);
 if(!(result?.heights instanceof Float32Array))
  throw TypeError('Invalid seafloor proposed heights');
 if(result.heights.length!==grid.heights.length)throw RangeError('Wrong proposal length');
 for(let i=0;i<grid.heights.length;i++){
  const old=grid.heights[i],next=result.heights[i];
  if(!Number.isFinite(next)||next< -100||next>100||
    (old>=0&&next!==old)||(old<0&&next>=0))
    throw RangeError('Seafloor proposal may not alter land or coast');
 }
 let changed=0;
 for(let i=0;i<grid.heights.length;i++)if(grid.heights[i]<0&&grid.heights[i]!==result.heights[i]){
  grid.heights[i]=result.heights[i];changed++;
 }
 return {changed,landPreserved:true,coastPreserved:true};
}
