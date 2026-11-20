// Nexus geographic composition. Spherical cap budgets control relative land
// mass sizes; coastal island templates follow shelf margins instead of random walks.
import {dot,cross,unit,clamp} from '../../../../experiments/spherical-grid/geologic-fields.mjs';
const randomFor=seed=>{let state=seed>>>0;return()=>{state=(state+0x6d2b79f5)>>>0;let x=state;x=Math.imul(x^(x>>>15),x|1);x^=x+Math.imul(x^(x>>>7),x|61);return ((x^(x>>>14))>>>0)/4294967296;};};
const angle=(a,b)=>Math.acos(clamp(dot(a,b)));
function basis(center){const east=unit(cross(Math.abs(center[2])>.97?[0,1,0]:[0,0,1],center));return {east,north:cross(center,east)};}
const nearest=(points,p)=>{let best=0,score=-Infinity;for(let i=0;i<points.length;i++){const d=dot(points[i],p);if(d>score){score=d;best=i;}}return best;};
export function assignContinentalAreas(cores,seed,landPercent){
 const random=randomFor(seed^0x41e10da5),groups=new Map();
 for(const core of cores){if(!groups.has(core.groupId))groups.set(core.groupId,[]);groups.get(core.groupId).push(core);}
 const exponent=cores[0]?.structure==='aggregated'?1.35:cores[0]?.structure==='fragmented'?.75:1;
 const groupSum=[...groups.values()].reduce((sum,items)=>sum+items.length**exponent,0),result=[];
 for(const items of groups.values()){
  const weights=items.map(()=>.5+random()**1.5*2),sum=weights.reduce((a,b)=>a+b,0),share=items.length**exponent/groupSum;
  items.forEach((core,i)=>{const areaShare=share*weights[i]/sum,areaBudget=landPercent/100*1.8*areaShare;
   result.push({...core,areaShare,areaBudget,radius:Math.acos(1-2*Math.min(.22,areaBudget))});});
 }
 // Redistribute capped large-core budgets instead of silently losing area.
 const pool=landPercent/100*1.8;let remaining=pool,active=[...result];
 while(active.length){const sum=active.reduce((s,c)=>s+c.areaShare,0),capped=active.filter(c=>remaining*c.areaShare/sum>.22);
  if(!capped.length){for(const c of active)c.areaBudget=remaining*c.areaShare/sum;break;}
  for(const c of capped){c.areaBudget=.22;remaining-=.22;}active=active.filter(c=>!capped.includes(c));
 }
 for(const c of result){c.areaShare=c.areaBudget/pool;c.radius=Math.acos(1-2*c.areaBudget);}
 return result.sort((a,b)=>a.index-b.index);
}
export function planIslandMargins(grid,scores,seed,structure='balanced'){
 const random=randomFor(seed^0x51af3c77),coast=[];
 for(let i=0;i<scores.length;i++)if(scores[i]<0&&grid.neighbors[i].some(j=>scores[j]>=0))coast.push(i);
 if(!coast.length)return [];
 const count=structure==='aggregated'?8+Math.floor(random()*3):structure==='fragmented'?14+Math.floor(random()*5):10+Math.floor(random()*5),islands=[];
 for(let index=0;index<count;index++){
  const coastal=random()<.8;let best=null,bestScore=-Infinity;
  for(let attempt=0;attempt<32;attempt++){
   let center,axis,marginCell=null;
   if(coastal){
    marginCell=coast[Math.floor(random()*coast.length)];const p=grid.points[marginCell],land=grid.neighbors[marginCell].filter(j=>scores[j]>=0);
    const toward=land.reduce((v,j)=>v.map((x,k)=>x+grid.points[j][k]-p[k]*dot(p,grid.points[j])),[0,0,0]),outward=unit(toward.map(x=>-x));
    if(Math.hypot(...outward)<.5)continue;
    const distance=.04+random()*.10;center=unit(p.map((v,k)=>v*Math.cos(distance)+outward[k]*Math.sin(distance)));axis=unit(cross(center,outward));
   }else{
    const z=(random()-.5)*1.6,lon=random()*Math.PI*2,r=Math.sqrt(1-z*z);center=[r*Math.cos(lon),r*Math.sin(lon),z];axis=basis(center).east;
   }
   if(scores[nearest(grid.points,center)]>=0)continue;
   const separation=islands.length?Math.min(...islands.map(i=>angle(i.center,center))):1;
   const score=Math.min(1,separation/.3)+random()*.08;if(score>bestScore){best={center,axis,marginCell,separation};bestScore=score;}
  }
  if(!best||best.separation<.10)continue;
  const frame=basis(best.center),rotation=Math.atan2(dot(best.axis,frame.north),dot(best.axis,frame.east)),type=index<Math.ceil(count*.5)?'archipelago':'island';
  const names=['volcano','highIsland','lowIsland','peninsula'];
  islands.push({type,index,name:type==='archipelago'?'archipelago':names[Math.floor(random()*names.length)],seed:(random()*4294967296)>>>0,center:best.center,rotation,radius:type==='archipelago'?.13+random()*.08:.055+random()*.07,placement:coastal?'continental-margin':'oceanic',marginCell:best.marginCell});
 }
 return islands;
}
