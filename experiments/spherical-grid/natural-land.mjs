// Area-fitted Azgaar patches with continuous spherical domain warping.
// MIT Azgaar operation semantics are in azgaar-original-continent.mjs.
// Domain warping is an independent implementation of a general technique;
// no planet-simulation source is incorporated here.
import {createGlobalGrid} from './global-config.mjs';
import {executeOriginalAzgaarTemplate} from './azgaar-original-continent.mjs';
import {templateRng,sampleTemplate} from './azgaar-template-engine.mjs';
import {planAzgaarPlacements} from './azgaar-spherical-land.mjs';
import {valueNoise3} from './spherical-terrain-refinement.mjs';
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const unit=v=>{const n=Math.hypot(...v);return v.map(x=>x/n);};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
const sphereArea=grid=>grid.areas.reduce((s,a)=>s+a,0);
function warpedPoint(p,seed){
 return unit(p.map((x,k)=>x+.15*valueNoise3(p,3,seed^Math.imul(k+1,1907))+.04*valueNoise3(p,9,seed^Math.imul(k+1,7919))));
}
function project(grid,points,map,pose,radius,aspect){
 const values=new Float32Array(points.length);values.fill(-1000);
 const mask=new Uint8Array(points.length),extent=2*Math.sin(radius/2);
 let area=0;
 for(let i=0;i<points.length;i++){
  const p=points[i],forward=dot(p,pose.center);
  if(forward<-.1)continue;
  // Lambert equal-area local coordinates avoid gnomonic stretching toward
  // the edge of a large continent. Different aspect ratios break stamp shapes.
  const scale=Math.sqrt(2/(1+forward))/extent;
  const e=dot(p,pose.east)*scale,n=dot(p,pose.north)*scale;
  const x=(e*pose.cos+n*pose.sin)/aspect,y=(n*pose.cos-e*pose.sin)*aspect;
  if(Math.abs(x)>1||Math.abs(y)>1)continue;
  const edge=smooth((Math.max(Math.abs(x),Math.abs(y))-.80)/.20);
  const h=sampleTemplate(map,(x+1)/2,(y+1)/2);
  const signed=(h-map.seaLevel)*(1-edge)-20*edge;
  values[i]=signed;
  if(signed>0){mask[i]=1;area+=grid.areas[i];}
 }
 return {values,mask,area,radius};
}
function fit(grid,points,map,pose,aspect,target){
 let lo=.04,hi=1.48,best;
 for(let k=0;k<10;k++){
  const radius=(lo+hi)/2,c=project(grid,points,map,pose,radius,aspect);
  if(!best||Math.abs(c.area-target)<Math.abs(best.area-target))best=c;
  if(c.area<target)lo=radius;else hi=radius;
 }
 return best;
}
function overlap(grid,c,occupied){
 let shared=0;for(let i=0;i<c.mask.length;i++)if(c.mask[i]&&occupied[i])shared+=grid.areas[i];
 return c.area?shared/c.area:1;
}
export function largestOceanSeed(grid){
 const seen=new Uint8Array(grid.heights.length);let largest=-1,seed=-1;
 for(let i=0;i<seen.length;i++){
  if(seen[i]||grid.heights[i]>=0)continue;
  const queue=[i];seen[i]=1;let area=0;
  for(let h=0;h<queue.length;h++){
   const c=queue[h];area+=grid.areas[c];
   for(const j of grid.neighbors[c])if(!seen[j]&&grid.heights[j]<0){seen[j]=1;queue.push(j);}
  }
  if(area>largest){largest=area;seed=i;}
 }
 if(seed<0)throw Error('Natural planet has no ocean');
 return seed;
}
export function createNaturalLand({seed,landPercent=32,continentCores=8}={}){
 if(!Number.isInteger(seed)||seed<0||seed>0xffffffff)throw RangeError('seed must be uint32');
 if(![25,32,45].includes(landPercent))throw RangeError('landPercent must be 25, 32 or 45');
 if(!Number.isInteger(continentCores)||continentCores<6||continentCores>10)throw RangeError('continentCores must be 6..10');
 const grid=createGlobalGrid(),total=sphereArea(grid),rng=templateRng(seed^0x41e7a);
 const points=grid.points.map(p=>warpedPoint(p,seed));
 const plans=planAzgaarPlacements(seed,{continentCores});
 const main=plans.filter(p=>p.type==='continent').slice(0,6);
 const small=plans.filter(p=>p.type==='island').slice(0,10);
 const groups=plans.filter(p=>p.type==='archipelago').slice(0,5);
 const entries=[...main,...small,...groups];
 const weights=main.map(()=>.4+Math.pow(rng(),1.5)*1.6),sum=weights.reduce((s,x)=>s+x,0);
 const allowance=landPercent*1.055; // small overlap budget, never a radial land background
 const smallBudget=1.4+landPercent*.025,mainBudget=allowance-smallBudget;
 const occupied=new Uint8Array(points.length),score=new Float32Array(points.length);score.fill(-1000);
 const rawRelief=new Float32Array(points.length),accepted=[];
 for(const item of entries){
  const target=total/100*(item.type==='continent'?mainBudget*weights[item.index]/sum:
   smallBudget*(item.type==='island'?.55/small.length:.45/groups.length));
  const map=executeOriginalAzgaarTemplate(item.name,item.seed),aspect=.82+rng()*.52;
  let chosen=null,frame=item;
  // Deterministically try different global positions. Avoid erasing another
  // continent; fitting is against positive template area, not its rectangle.
  for(let trial=0;trial<48;trial++){
   if(trial){
    const alternate=plans[(trial*7+item.index)%plans.length];
    const center=unit(alternate.center.map((v,k)=>v+(rng()-.5)*1.6));
    const east=unit([-center[1],center[0],0]);
    const north=[center[1]*east[2]-center[2]*east[1],center[2]*east[0]-center[0]*east[2],center[0]*east[1]-center[1]*east[0]];
    frame={...item,center,east,north};
   }
   const candidate=fit(grid,points,map,frame,aspect,target);
   if(!candidate||candidate.area<target*.8)continue;
   const shared=overlap(grid,candidate,occupied);
   if(shared>(item.type==='continent'?.12:.15))continue;
   chosen={...candidate,frame,overlapRatio:shared};break;
  }
  if(!chosen)continue;
  accepted.push({type:item.type,name:item.name,seed:item.seed,center:chosen.frame.center,radius:chosen.radius,
   targetPercent:100*target/total,footprintPercent:100*chosen.area/total,overlapRatio:chosen.overlapRatio});
  for(let i=0;i<points.length;i++){
   if(chosen.values[i]>score[i]){score[i]=chosen.values[i];rawRelief[i]=Math.max(0,chosen.values[i]);}
   if(chosen.mask[i])occupied[i]=1;
  }
 }
 // A signed template field retains bays, peninsulas and straits. The final
 // area correction cannot invent a detached Gaussian continental background.
 const rank=Array.from(grid.areas,(area,i)=>({i,area,value:score[i]+valueNoise3(grid.points[i],17,seed)*.08}));
 rank.sort((a,b)=>b.value-a.value||a.i-b.i);
 const target=total*landPercent/100;let selectedArea=0,count=0;
 while(count<rank.length&&selectedArea+rank[count].area/2<target){selectedArea+=rank[count].area;count++;}
 const boundary=(rank[count-1].value+rank[count].value)/2;
 if(boundary< -19)throw Error('Insufficient template land for requested coverage');
 const selected=new Uint8Array(points.length);
 for(let k=0;k<count;k++)selected[rank[k].i]=1;
 for(let i=0;i<points.length;i++){rawRelief[i]=Math.max(.05,score[i]-boundary);grid.heights[i]=selected[i]?clamp(Math.round(rawRelief[i]),1,99):-20;}
 return {grid,oceanSeed:largestOceanSeed(grid),rawRelief,templatePlacements:accepted,
  measuredLandPercent:100*selectedArea/total,tolerancePercent:100*Math.max(...grid.areas)/total,
  areaCorrectionLevel:boundary,acceptedContinents:accepted.filter(p=>p.type==='continent').length,
  settings:{seed,landPercent,continentCores,gridCells:36002}};
}
