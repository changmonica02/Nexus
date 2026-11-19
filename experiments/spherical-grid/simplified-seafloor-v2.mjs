// Stage 3A: geography-guided bathymetry using lightweight ridge/trench
// skeletons. No plate domains, crust ages, velocities or geological history.
// Input: stage-two continental/island mask. Output: ocean-only height proposal.
// This module is deliberately independent of the legacy tectonic overlay.
import {generateIslandsAndArchipelagos} from './island-layout-v2.mjs';
import {templateRng} from './azgaar-template-engine.mjs';
import {tectonicSeedFromLandMask,applyPlateSeafloor,SEAFLOOR} from './plate-seafloor.mjs';

const R=6371,MAX=1e30,TAU=2*Math.PI;
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const clamp=(a,min,max)=>Math.max(min,Math.min(max,a));
const km=(a,b)=>R*Math.acos(clamp(dot(a,b),-1,1));
const hash=(seed,id)=>{
 let x=(Math.imul((id+1),0x9e3779b1)^(seed>>>0))>>>0;
 x=Math.imul(x^(x>>>16),0x85ebca6b)>>>0;
 x=Math.imul(x^(x>>>13),0xc2b2ae35)>>>0;
 return ((x^(x>>>16))>>>0)/4294967296;
};
class Heap{
 constructor(){this.a=[];}
 push(item){let a=this.a,i=a.length;a.push(item);while(i){const p=(i-1)>>1;if(a[p].dist<=item.dist)break;a[i]=a[p];i=p;}a[i]=item;}
 pop(){const a=this.a,item=a[0],v=a.pop();if(!a.length)return item;let i=0;while(i*2+1<a.length){let c=i*2+1;if(c+1<a.length&&a[c+1].dist<a[c].dist)c++;if(a[c].dist>=v.dist)break;a[i]=a[c];i=c;}a[i]=v;return item;}
 get length(){return this.a.length;}
}
function oceanDistance(grid,sources){
 const n=grid.heights.length,dist=new Float64Array(n),heap=new Heap();
 dist.fill(Infinity);
 for(const i of sources)if(grid.heights[i]<0&&dist[i]!==0){dist[i]=0;heap.push({cell:i,dist:0});}
 while(heap.length){
  const {cell,dist:d}=heap.pop();
  if(d>dist[cell]+1e-8)continue;
  for(const j of grid.neighbors[cell]){
   if(grid.heights[j]>=0)continue;
   const next=d+km(grid.points[cell],grid.points[j]);
   if(next+1e-8<dist[j]){dist[j]=next;heap.push({cell:j,dist:next});}
  }
 }
 return dist;
}
function coastSources(grid){
 const items=[];
 for(let i=0;i<grid.heights.length;i++)
  if(grid.heights[i]<0&&grid.neighbors[i].some(j=>grid.heights[j]>=0))items.push(i);
 return items;
}
function chooseStarts(grid,seed,count,coast,mode,avoid=[]){
 const ranked=[];
 for(let i=0;i<grid.heights.length;i++){
  if(grid.heights[i]>=0)continue;
  const d=coast[i];
  if(mode==='ridge'&&d<550||mode==='trench'&&(d<120||d>1150))continue;
  let nearest=Infinity;for(const j of avoid)nearest=Math.min(nearest,km(grid.points[i],grid.points[j]));
  if(nearest<380)continue;
  const score=(mode==='ridge'?Math.min(d,2800)/2800:
    Math.exp(-Math.pow((d-380)/360,2)))*(.68+.64*hash(seed,i));
  ranked.push({i,score});
 }
 ranked.sort((a,b)=>b.score-a.score||a.i-b.i);
 const picks=[];
 for(const item of ranked){
  if(picks.every(i=>km(grid.points[i],grid.points[item.i])>1100)){
   picks.push(item.i);
   if(picks.length>=count)break;
  }
 }
 return picks;
}
// A continuous polyline is grown in both directions through allowed ocean
// cells. Momentum and coastline-distance preference prevent random zigzags.
function growLine(grid,start,coast,seed,mode){
 const center=grid.points[start],az=TAU*hash(seed,start);
 const north=[-center[0]*center[2],-center[1]*center[2],1-center[2]*center[2]];
 const nn=Math.hypot(...north)||1,east=[-center[1],center[0],0],ee=Math.hypot(...east)||1;
 const forward=[north[0]/nn*Math.cos(az)+east[0]/ee*Math.sin(az),
  north[1]/nn*Math.cos(az)+east[1]/ee*Math.sin(az),
  north[2]/nn*Math.cos(az)];
 const visited=new Set([start]);
 function arm(sign){
  let current=start,prev=-1,heading=forward.map(x=>x*sign);
  const trace=[];
  for(let step=0;step<38;step++){
   const p=grid.points[current];
   let best=-1,bestScore=-Infinity;
   for(const j of grid.neighbors[current]){
    if(j===prev||visited.has(j)||grid.heights[j]>=0)continue;
    const d=coast[j];
    if(mode==='ridge'&&d<450||mode==='trench'&&(d<110||d>1450))continue;
    const q=grid.points[j],t=q.map((x,k)=>x-dot(q,p)*p[k]);
    const norm=Math.hypot(...t);
    if(norm===0)continue;
    const align=dot(t,heading)/norm;
    const preferred=mode==='ridge'?Math.min(d/1900,1):
     Math.exp(-Math.pow((d-430)/410,2));
    const score=align*2.5+preferred*.45+(hash(seed^step*2027,j)-.5)*.32;
    if(score>bestScore){bestScore=score;best=j;}
   }
   if(best<0||bestScore<.25)break;
   trace.push(best);visited.add(best);
   const next=grid.points[best],delta=next.map((x,k)=>x-dot(next,p)*p[k]);
   const dn=Math.hypot(...delta);
   heading=heading.map((x,k)=>.62*x+.38*delta[k]/dn);
   const hn=Math.hypot(...heading);heading=heading.map(x=>x/hn);
   prev=current;current=best;
  }
  return trace;
 }
 const backward=arm(-1).reverse(),forwardCells=growLineArm();
 function growLineArm(){return arm(1);}
 return [...backward,start,...forwardCells];
}
function skeletons(grid,seed,coast,worldType){
 const counts={ocean:[3,3],earthlike:[3,2],land:[2,2]}[worldType];
 if(!counts)throw RangeError('Unknown worldType');
 const ridges=[],trenches=[],used=[];
 for(const start of chooseStarts(grid,seed^0x52494447,counts[0]*3,coast,'ridge')){
  if(ridges.length>=counts[0])break;
  if(used.some(j=>km(grid.points[j],grid.points[start])<1100))continue;
  const cells=growLine(grid,start,coast,seed^0xA441,'ridge');
  if(cells.length<9)continue;
  ridges.push(cells);used.push(...cells.filter((_,i)=>i%7===0));
 }
 const trenchUsed=[];
 for(const start of chooseStarts(grid,seed^0x54524e43,counts[1]*4,coast,'trench',used)){
  if(trenches.length>=counts[1])break;
  if(trenchUsed.some(j=>km(grid.points[j],grid.points[start])<950))continue;
  const cells=growLine(grid,start,coast,seed^0x6B91,'trench');
  if(cells.length<7)continue;
  trenches.push(cells);trenchUsed.push(...cells.filter((_,i)=>i%6===0));
 }
 return {ridges,trenches};
}
function seamounts(grid,seed,coast,lines){
 const sites=[],points=[];
 const ridgeCells=lines.ridges.flat();
 for(const cell of ridgeCells){
  if(coast[cell]>400&&hash(seed^0x4a718,cell)>.967)
   sites.push({cell,kind:'ridge-volcano'});
 }
 for(let i=0;i<grid.heights.length;i++){
  if(grid.heights[i]>=0||coast[i]<600)continue;
  if(hash(seed^0x78129,i)>.9993)sites.push({cell:i,kind:'hotspot'});
 }
 sites.sort((a,b)=>a.cell-b.cell);
 for(const site of sites){
  if(points.some(j=>km(grid.points[j.cell],grid.points[site.cell])<280))continue;
  const radiusKm=95+85*hash(seed^0x519A,site.cell);
  const uplift=14+18*hash(seed^0x7AB2,site.cell);
  points.push({...site,radiusKm,uplift});
  if(points.length>=32)break;
 }
 return points;
}
export function generateSimplifiedSeafloor(grid,{seed,worldType='earthlike'}={}){
 if(!grid||grid.heights?.length!==36002||grid.points?.length!==36002)
  throw RangeError('Expected canonical 36,002-cell spherical Grid');
 if(!['ocean','earthlike','land'].includes(worldType))throw RangeError('Unknown worldType');
 const activeSeed=seed??tectonicSeedFromLandMask(grid);
 if(!Number.isInteger(activeSeed)||activeSeed<0||activeSeed>0xffffffff)throw RangeError('Seed must be uint32');
 const initial=grid.heights.slice(),coast=oceanDistance(grid,coastSources(grid));
 const lines=skeletons(grid,activeSeed,coast,worldType);
 const ridgeDistance=oceanDistance(grid,lines.ridges.flat());
 const trenchDistance=oceanDistance(grid,lines.trenches.flat());
 const cones=seamounts(grid,activeSeed,coast,lines);
 const heights=initial.slice(),zones=new Uint8Array(initial.length);
 for(let i=0;i<initial.length;i++){
  if(initial[i]>=0)continue;
  const d=coast[i],noise=(hash(activeSeed^0x5151,i)-.5)*2;
  const shelfEnd=170+130*hash(activeSeed^0x7122,Math.floor(i/49));
  const slopeEnd=shelfEnd+430+180*hash(activeSeed^0x1234,Math.floor(i/79));
  let depth;
  if(d<shelfEnd){
   depth=1.1+1.5*Math.pow(d/shelfEnd,1.6);
   zones[i]=SEAFLOOR.shelf;
  }else if(d<slopeEnd){
   const t=clamp((d-shelfEnd)/(slopeEnd-shelfEnd),0,1);
   depth=2.6+42*t*t*(3-2*t);
   zones[i]=SEAFLOOR.slope;
  }else{
   depth=44+Math.min(9,(d-slopeEnd)/800*3)+2.4*noise;
   zones[i]=SEAFLOOR.abyssalPlain;
  }
  if(Number.isFinite(ridgeDistance[i])&&d>350){
   const influence=Math.exp(-Math.pow(ridgeDistance[i]/380,2));
   if(influence>.06){
    depth=Math.max(7,depth-24*influence);
    if(influence>.25)zones[i]=SEAFLOOR.midOceanRidge;
   }
  }
  if(Number.isFinite(trenchDistance[i])&&d>100){
   const influence=Math.exp(-Math.pow(trenchDistance[i]/155,2));
   if(influence>.08){
    depth+=36*influence;
    if(influence>.27)zones[i]=SEAFLOOR.trench;
   }
  }
  let coneUplift=0;
  for(const cone of cones){
   const distance=km(grid.points[i],grid.points[cone.cell]);
   if(distance>cone.radiusKm*2.2)continue;
   coneUplift=Math.max(coneUplift,cone.uplift*Math.exp(-2*(distance/cone.radiusKm)**2));
  }
  if(coneUplift>3.5&&d>150){
   depth=Math.max(3,depth-coneUplift);
   zones[i]=SEAFLOOR.seamount;
  }
  heights[i]=-clamp(Math.round(depth),1,100);
 }
 return {version:3,mode:'simplified-skeleton',seed:activeSeed,worldType,heights,zones,
  ridgeLines:lines.ridges,trenchLines:lines.trenches,
  submarineVolcanoes:cones.map(c=>({gridCell:c.cell,kind:c.kind,radiusKm:c.radiusKm,uplift:c.uplift})),
  oceanCells:initial.reduce((a,h)=>a+(h<0?1:0),0)};
}
export function generateCompleteSphericalWorld({seed,worldType='earthlike'}={}){
 const result=generateIslandsAndArchipelagos({seed,worldType});
 const grid=result.grid,original=grid.heights.slice();
 const seafloor=generateSimplifiedSeafloor(grid,{seed:tectonicSeedFromLandMask(grid),worldType});
 const applied=applyPlateSeafloor(grid,seafloor);
 // The sea/land mask and existing land heights are canonical editor input.
 for(let i=0;i<original.length;i++)if((original[i]>=0)!==(grid.heights[i]>=0)||
  (original[i]>=0&&original[i]!==grid.heights[i]))
  throw Error('Stage 3A modified an existing land cell or coast');
 return {...result,stage:'complete-simplified-bathymetry',seafloor,applied,
  ridgeCount:seafloor.ridgeLines.length,trenchCount:seafloor.trenchLines.length};
}
