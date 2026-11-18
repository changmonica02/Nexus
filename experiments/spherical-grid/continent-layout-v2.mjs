// Stage-one continental world generator. NO islands, archipelagos,
// global land-percentage quantile, plate or seabed adjustments.
// This experimental entry point intentionally leaves the current editor's
// legacy snapshot/settings path untouched until the new contract is reviewed.
import {createGlobalGrid} from './global-config.mjs';
import {executeAzgaarTemplate,sampleTemplate,templateRng} from './azgaar-template-engine.mjs';

export const CONTINENT_WORLD_TYPES=Object.freeze({
 ocean:Object.freeze({count:4,ranges:Object.freeze({large:[6,9],largeMedium:[4,6],medium:[2.5,4]})}),
 earthlike:Object.freeze({count:6,ranges:Object.freeze({large:[7.5,11],largeMedium:[5,7.5],medium:[3.3,5],smallMedium:[1.5,3.3]})}),
 land:Object.freeze({count:6,ranges:Object.freeze({large:[11,16],largeMedium:[7,11],medium:[4.5,7],smallMedium:[1.5,3.3]})})
});
export const PAIR_CONTINENT_OVERLAP_MAX=.12;
export const TOTAL_CONTINENT_OVERLAP_MAX=.18;
const RECIPE_NAMES=['continents','pangea','oldWorld','shattered'];
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const unit=v=>{const d=Math.hypot(...v);return v.map(x=>x/d);};
function point(rng){const z=rng()*2-1,angle=rng()*Math.PI*2,t=Math.sqrt(1-z*z);return [t*Math.cos(angle),t*Math.sin(angle),z];}
function integer(rng,a,b){return a+Math.floor(rng()*(b-a+1));}
function shuffle(rng,items){for(let i=items.length-1;i>0;i--){const j=integer(rng,0,i),v=items[i];items[i]=items[j];items[j]=v;}return items;}
export function planContinentalAreas(seed,worldType){
 if(!Number.isInteger(seed)||seed<0||seed>0xffffffff)throw RangeError('seed must be uint32');
 const rule=CONTINENT_WORLD_TYPES[worldType];
 if(!rule)throw RangeError('Unknown continental world type');
 const rng=templateRng(seed^0xC0A71E);
 let kinds;
 if(worldType==='ocean'){
  const large=integer(rng,0,1),largeMedium=integer(rng,1,2);
  kinds=[...Array(large).fill('large'),...Array(largeMedium).fill('largeMedium'),
   ...Array(rule.count-large-largeMedium).fill('medium')];
 }else if(worldType==='earthlike'){
  const large=integer(rng,0,1),smallMedium=integer(rng,1,2);
  kinds=[...Array(large).fill('large'),...Array(2).fill('largeMedium'),
   ...Array(rule.count-large-2-smallMedium).fill('medium'),...Array(smallMedium).fill('smallMedium')];
 }else kinds=['large','largeMedium','largeMedium','medium','medium','smallMedium'];
 // Sample in the interior of each allowed interval, leaving room for
 // finite-Grid area discretization and a modest land-footprint overlap.
 const entries=shuffle(rng,kinds).map((sizeClass,index)=>{
  const [minPercent,maxPercent]=rule.ranges[sizeClass];
  const targetPercent=minPercent+(maxPercent-minPercent)*(.25+.50*rng());
  return {id:index,sizeClass,minPercent,maxPercent,targetPercent,
   templateSeed:(rng()*0x100000000)>>>0};
 });
 return entries.sort((a,b)=>b.targetPercent-a.targetPercent||a.id-b.id);
}
export function pose(rng){
 const center=point(rng),polar=Math.abs(center[2])>.97?[0,1,0]:[0,0,1];
 const east=unit(cross(polar,center)),north=cross(center,east);
 const angle=rng()*2*Math.PI;
 return {center,east,north,cos:Math.cos(angle),sin:Math.sin(angle)};
}
export function project(grid,map,frame,radius,store=false){
 const extent=Math.tan(radius),cutoff=Math.cos(Math.atan(Math.SQRT2*extent));
 const mask=store?new Uint8Array(grid.points.length):null;
 const values=store?new Int8Array(grid.points.length):null;
 let area=0,landCells=0;
 for(let i=0;i<grid.points.length;i++){
  const p=grid.points[i],forward=dot(p,frame.center);
  if(forward<=cutoff)continue;
  const e=dot(p,frame.east)/forward/extent,n=dot(p,frame.north)/forward/extent;
  const u=(e*frame.cos+n*frame.sin+1)*.5,v=(n*frame.cos-e*frame.sin+1)*.5;
  if(u<0||u>1||v<0||v>1)continue;
  const edge=Math.max(0,1-Math.pow(Math.max(Math.abs(2*u-1),Math.abs(2*v-1)),6));
  const relief=(sampleTemplate(map,u,v)-map.seaLevel)*edge;
  if(relief<=.5)continue;
  area+=grid.areas[i];landCells++;
  if(store){mask[i]=1;values[i]=clamp(Math.round(relief*1.35),1,99);}
 }
 return {area,landCells,mask,values};
}
function measureOverlap(grid,candidate,accepted,occupied){
 let union=0,maxPair=0;
 for(let i=0;i<occupied.length;i++)if(candidate.mask[i]&&occupied[i])union+=grid.areas[i];
 for(const former of accepted){
  let shared=0;
  for(let i=0;i<occupied.length;i++)if(candidate.mask[i]&&former.mask[i])shared+=grid.areas[i];
  maxPair=Math.max(maxPair,shared/Math.min(candidate.area,former.area));
 }
 return {overlapArea:union,overlapRatio:union/candidate.area,maxPair,
  newArea:candidate.area-union};
}
/** Fits radius against measured spherical cell areas, not patch radius or
 * template pixel count. Target is a percentage of TOTAL planetary area.
 * A candidate is rejected if its real non-overlapping share is out of range.
 */
export function fitSize(grid,map,frame,targetArea,minArea,maxArea,{minRadius=.17,maxRadius=1.46}={}){
 // Projective patches must remain strictly inside one hemisphere.
 let low=minRadius,high=maxRadius;
 const atLow=project(grid,map,frame,low).area;
 const atHigh=project(grid,map,frame,high).area;
 if(atLow>maxArea||atHigh<minArea)return null;
 let best=null;
 for(let step=0;step<13;step++){
  const radius=(low+high)/2,result=project(grid,map,frame,radius);
  if(!best||Math.abs(result.area-targetArea)<Math.abs(best.area-targetArea))
   best={radius,area:result.area};
  if(result.area<targetArea)low=radius;
  else high=radius;
 }
 if(!best||best.area<minArea||best.area>maxArea)return null;
 return {radius:best.radius,...project(grid,map,frame,best.radius,true)};
}
function connectedLargest(grid,mask){
 const visited=new Uint8Array(mask.length);
 let largest=0,whole=0;
 for(let i=0;i<mask.length;i++)if(mask[i])whole+=grid.areas[i];
 for(let i=0;i<mask.length;i++){
  if(!mask[i]||visited[i])continue;
  const queue=[i];visited[i]=1;let area=0;
  for(let h=0;h<queue.length;h++){
   const c=queue[h];area+=grid.areas[c];
   for(const next of grid.neighbors[c])if(mask[next]&&!visited[next]){
    visited[next]=1;queue.push(next);
   }
  }
  largest=Math.max(largest,area);
 }
 return whole?largest/whole:0;
}
export function generateContinentsFirst({seed,worldType='earthlike'}={}){
 const plan=planContinentalAreas(seed,worldType);
 const grid=createGlobalGrid(),totalArea=grid.areas.reduce((a,b)=>a+b,0);
 grid.heights.fill(-40);
 const rng=templateRng(seed^0xC1A5F17),occupied=new Uint8Array(grid.points.length),accepted=[];
 const diagnostics=[];
 for(const entry of plan){
  const minArea=entry.minPercent/100*totalArea,maxArea=entry.maxPercent/100*totalArea;
  const target=entry.targetPercent/100*totalArea;
  let chosen=null,trials=0;
  // Choose recipe per few candidate positions. Never switch away from the
  // selected target-size class when placement is difficult.
  for(let attempt=0;attempt<110;attempt++){
   trials++;
   const recipe=RECIPE_NAMES[Math.floor(rng()*RECIPE_NAMES.length)];
   const map=executeAzgaarTemplate(recipe,(entry.templateSeed^Math.imul(2654435761,attempt+1))>>>0);
   const frame=pose(rng);
   const fit=fitSize(grid,map,frame,target,minArea,maxArea);
   if(!fit)continue;
   // Reject a fragmented "continent": it is better suited for later
   // archipelago generation than for a major continental slot.
   const dominant=connectedLargest(grid,fit.mask);
   if(dominant<(recipe==='shattered'?.55:.67))continue;
   const overlaps=measureOverlap(grid,fit,accepted,occupied);
   if(overlaps.overlapRatio>TOTAL_CONTINENT_OVERLAP_MAX+1e-9||
      overlaps.maxPair>PAIR_CONTINENT_OVERLAP_MAX+1e-9||
      overlaps.newArea<minArea||overlaps.newArea>maxArea)continue;
   chosen={...entry,recipe,frame,radius:fit.radius,mask:fit.mask,values:fit.values,
    area:fit.area,visibleArea:overlaps.newArea,overlapRatio:overlaps.overlapRatio,
    maxPairOverlap:overlaps.maxPair,dominantFraction:dominant,trials};
   break;
  }
  if(!chosen){
   diagnostics.push({id:entry.id,sizeClass:entry.sizeClass,targetPercent:entry.targetPercent,
    attempted:trials,status:'unplaced'});
   // Do not claim to have generated all continents when a slot fails.
   throw Error('Continental placement exhausted for '+worldType+' slot '+entry.id);
  }
  for(let i=0;i<grid.heights.length;i++)if(chosen.mask[i]){
   if(!occupied[i])grid.heights[i]=chosen.values[i];
   else grid.heights[i]=Math.max(grid.heights[i],chosen.values[i]);
   occupied[i]=1;
  }
  accepted.push(chosen);
  diagnostics.push({id:chosen.id,sizeClass:chosen.sizeClass,recipe:chosen.recipe,
   targetPercent:chosen.targetPercent,footprintPercent:100*chosen.area/totalArea,
   visiblePercent:100*chosen.visibleArea/totalArea,overlapRatio:chosen.overlapRatio,
   maxPairOverlap:chosen.maxPairOverlap,dominantFraction:chosen.dominantFraction,trials});
 }
 // There is no background land. Only accepted template footprints rise above 0.
 // This is stage 1: submerged elevations are left at their original Grid
 // baseline until the existing tectonic seafloor stage is connected later.
 let oceanSeed=grid.heights.findIndex(h=>h<0);
 if(oceanSeed<0)throw Error('No ocean cell');
 const actual=grid.areas.reduce((a,area,i)=>a+(occupied[i]?area:0),0);
 return {grid,oceanSeed,worldType,seed,stage:'continents-only',
  measuredLandPercent:100*actual/totalArea,
  continentCount:accepted.length,
  continents:accepted.map(({mask,values,frame,...other})=>({
   ...other,center:frame.center
  })),diagnostics,plannedContinents:plan,
  islandsGenerated:0,archipelagosGenerated:0};
}
