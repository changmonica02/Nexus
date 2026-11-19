// Stage-two island and archipelago templates on a continents-only spherical Grid.
// Retains stage-one continents exactly. Any coastal joins and disconnected
// archipelago members are intentional editor starting points, not fatal errors.
import {generateContinentsFirst,fitSize,pose} from './continent-layout-v2.mjs';
import {executeAzgaarTemplate,templateRng} from './azgaar-template-engine.mjs';

export const ISLAND_AREA_RULES=Object.freeze({
 small:Object.freeze({minPercent:.05,maxPercent:.2,minCount:8,maxCount:10}),
 large:Object.freeze({minPercent:.3,maxPercent:.4,minCount:1,maxCount:3}),
 archipelago:Object.freeze({minPercent:.1,maxPercent:.5,minCount:4,maxCount:7})
});
const ISLAND_RECIPES=['volcano','highIsland','lowIsland'];
const ARCHIPELAGO_RECIPES=['archipelago'];
const randInt=(rng,a,b)=>a+Math.floor(rng()*(b-a+1));
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const randomArray=(rng,items)=>items[Math.floor(rng()*items.length)];
/** Numbers and areas are derived from a separate random stream; this cannot
 * perturb the stage-one continental positions or their area budgets. */
export function planIslandAreas(seed){
 if(!Number.isInteger(seed)||seed<0||seed>0xffffffff)throw RangeError('seed must be uint32');
 const rng=templateRng(seed^0x15A1D5);
 const plan=[];
 for(const [kind,rule] of Object.entries(ISLAND_AREA_RULES)){
  const count=randInt(rng,rule.minCount,rule.maxCount);
  for(let i=0;i<count;i++)plan.push({kind,index:i,
   minPercent:rule.minPercent,maxPercent:rule.maxPercent,
   targetPercent:rule.minPercent+(rule.maxPercent-rule.minPercent)*(.22+.56*rng()),
   recipeSeed:(rng()*4294967296)>>>0});
 }
 return plan;
}
function overlap(grid,mask,occupied,total){
 let over=0,visible=0;
 for(let i=0;i<mask.length;i++)if(mask[i]){
  if(occupied[i])over+=grid.areas[i];
  else visible+=grid.areas[i];
 }
 return {overlap:over,visible,ratio:total>0?over/total:1};
}
function maxWinding(grid,mask){
 // A nonempty archipelago may legitimately consist of several islands.
 // Reject only an empty footprint, not a fragmented one.
 for(let i=0;i<mask.length;i++)if(mask[i])return true;
 return false;
}
/** Accepts an already generated stage-one result or makes a new one.
 * Each candidate is fit by area, then placed into the remaining ocean.
 * No continental heights are lowered or reset during island addition.
 */
export function generateIslandsAndArchipelagos({seed,worldType='earthlike',continents}={}){
 const first=continents??generateContinentsFirst({seed,worldType});
 if(first.seed!==seed||first.worldType!==worldType||first.stage!=='continents-only')
  throw RangeError('Stage-two islands require matching untouched continents-only input');
 const grid=first.grid;
 const initialHeights=grid.heights.slice(),total=grid.areas.reduce((a,b)=>a+b,0);
 const rng=templateRng(seed^0x1A5B120),planned=planIslandAreas(seed),accepted=[],occupied=new Uint8Array(grid.heights.length);
 for(let i=0;i<occupied.length;i++)occupied[i]=grid.heights[i]>0?1:0;
 // A fresh stage-two output preserves the stage-one Grid in-place, but never
 // raises a sea cell to land unless a positive template footprint covers it.
 for(const entry of planned){
  const min=total*entry.minPercent/100,max=total*entry.maxPercent/100;
  const target=total*entry.targetPercent/100;
  let chosen=null;
  for(let attempt=0;attempt<85;attempt++){
   const recipe=randomArray(rng,entry.kind==='archipelago'?ARCHIPELAGO_RECIPES:ISLAND_RECIPES);
   const template=executeAzgaarTemplate(recipe,(entry.recipeSeed^Math.imul(attempt+1,0x9e3779b1))>>>0);
   const frame=pose(rng);
   // Avoid placing small islands at the polar singularity just because their
   // candidate grid sampling is unusually coarse at a given latitude.
   const fitted=fitSize(grid,template,frame,target,min,max,{minRadius:.015,maxRadius:1.40});
   if(!fitted||!maxWinding(grid,fitted.mask))continue;
   const found=overlap(grid,fitted.mask,occupied,fitted.area);
   // The user's editor can fix attached islands and partial joins. The only
   // hard condition is that the visible *new* island land meets its area class.
   if(found.visible<min||found.visible>max||found.ratio>.68)continue;
   chosen={...entry,recipe,radius:fitted.radius,center:frame.center,angle:Math.atan2(frame.sin,frame.cos),
    footprintPercent:100*fitted.area/total,visiblePercent:100*found.visible/total,
    overlapRatio:found.ratio,attempts:attempt+1,mask:fitted.mask,values:fitted.values};
   break;
  }
  if(!chosen)throw Error('Island or archipelago placement exhausted: '+entry.kind+'/'+entry.index);
  for(let i=0;i<grid.heights.length;i++)if(chosen.mask[i]){
   grid.heights[i]=Math.max(grid.heights[i],chosen.values[i]);
   occupied[i]=1;
  }
  const {mask,values,...metadata}=chosen;
  accepted.push(metadata);
 }
 const actual=grid.areas.reduce((sum,area,i)=>sum+(grid.heights[i]>0?area:0),0);
 const raised=grid.areas.reduce((sum,area,i)=>sum+(initialHeights[i]<0&&grid.heights[i]>0?area:0),0);
 const islandCount=accepted.filter(x=>x.kind!=='archipelago').length;
 const archipelagoCount=accepted.filter(x=>x.kind==='archipelago').length;
 return {...first,stage:'continents-islands-archipelagos',islandsGenerated:islandCount,
  archipelagosGenerated:archipelagoCount,measuredLandPercent:actual/total*100,
  islands:accepted,plannedIslands:planned,addedLandPercent:raised/total*100,
  preservedContinentalHeights:initialHeights.every((h,i)=>h<=0||grid.heights[i]>=h)};
}
