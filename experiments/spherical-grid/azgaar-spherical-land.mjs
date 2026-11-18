// Experimental Azgaar recipe-to-sphere composition.
// The canonical 36,002-cell Grid remains the only persisted height surface.
import {createGlobalGrid} from './global-config.mjs';
import {executeAzgaarTemplate,sampleTemplate,templateRng} from './azgaar-template-engine.mjs';
import {CONTINENT_TEMPLATES,ISLAND_TEMPLATES,ARCHIPELAGO_TEMPLATES} from './azgaar-template-data.mjs';

const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const unit=v=>{const n=Math.hypot(...v);return v.map(x=>x/n);};
const randomPoint=rng=>{const z=rng()*2-1,a=rng()*Math.PI*2,r=Math.sqrt(1-z*z);return [r*Math.cos(a),r*Math.sin(a),z];};
const randomInt=(rng,lo,hi)=>lo+Math.floor(rng()*(hi-lo+1));
const randomItem=(rng,values)=>values[Math.floor(rng()*values.length)];
function makePlacement(rng,type,index){
 const name=randomItem(rng,type==='continent'?CONTINENT_TEMPLATES:type==='island'?ISLAND_TEMPLATES:ARCHIPELAGO_TEMPLATES);
 const center=randomPoint(rng);
 const polar=Math.abs(center[2])>.97?[0,1,0]:[0,0,1];
 const east=unit(cross(polar,center)),north=unit(cross(center,east));
 const angle=rng()*Math.PI*2,cos=Math.cos(angle),sin=Math.sin(angle);
 const radius=type==='continent'?.74+rng()*.35:type==='archipelago'?.3+rng()*.23:.14+rng()*.19;
 return {type,index,name,center,east,north,cos,sin,radius,seed:(rng()*4294967296)>>>0};
}
export function planAzgaarPlacements(seed,{continentCores=8}={}){
 const rng=templateRng(seed^0xA61A2),placements=[];
 // The user-visible 6-10 core setting controls main placements.
 // The spec prescribes 6-8 continental blocks; clamp the old 9-10 setting.
 const continents=Math.max(6,Math.min(8,continentCores));
 for(let i=0;i<continents;i++)placements.push(makePlacement(rng,'continent',i));
 for(let i=0,n=randomInt(rng,15,20);i<n;i++)placements.push(makePlacement(rng,'island',i));
 for(let i=0,n=randomInt(rng,4,12);i<n;i++)placements.push(makePlacement(rng,'archipelago',i));
 return placements;
}
export function createAzgaarSphericalLandLayout({seed,landPercent=32,continentCores=8}={}){
 if(!Number.isInteger(seed)||seed<0||seed>0xffffffff)throw RangeError('seed must be uint32');
 if(![25,32,45].includes(landPercent))throw RangeError('landPercent must be 25, 32 or 45');
 if(!Number.isInteger(continentCores)||continentCores<6||continentCores>10)throw RangeError('continentCores must be 6..10');
 const grid=createGlobalGrid(),placements=planAzgaarPlacements(seed,{continentCores});
 const rng=templateRng(seed^0x3C97E),score=new Float64Array(grid.points.length);
 // Coherent continental background prevents random isolated cells when the
 // requested area exceeds the raised portions of all candidate recipes.
 const continents=placements.filter(p=>p.type==='continent');
 for(let i=0;i<grid.points.length;i++){
  let value=-45;
  for(const item of continents){
   const distance=Math.acos(Math.max(-1,Math.min(1,dot(grid.points[i],item.center))));
   value=Math.max(value,-45+25*Math.exp(-2*Math.pow(distance/item.radius,2)));
  }
  score[i]=value;
 }
 // Local tangent coordinates are continuous at the longitude seam.
 for(const item of placements){
  const map=executeAzgaarTemplate(item.name,item.seed),extent=Math.tan(item.radius);
  for(let i=0;i<grid.points.length;i++){
   const point=grid.points[i],forward=dot(point,item.center);
   if(forward<.2)continue;
   const e=dot(point,item.east)/forward/extent;
   const n=dot(point,item.north)/forward/extent;
   const u=(e*item.cos+n*item.sin+1)/2;
   const v=(n*item.cos-e*item.sin+1)/2;
   if(u<0||u>1||v<0||v>1)continue;
   const h=sampleTemplate(map,u,v),edge=Math.max(0,1-Math.pow(Math.max(Math.abs(2*u-1),Math.abs(2*v-1)),6));
   // Preserve template relief while blending adjacent local surfaces.
   const relief=(h-20)*edge;
   const value=relief*(item.type==='continent'?1:.8)-12;
   if(value>score[i])score[i]=value;
  }
 }
 // Use area-weighted quantile to hit the selected surface fraction.
 // This must happen after composing all templates, never per local patch.
 // Tiny seeded jitter prevents large quantized ties at equal heights.
 const rank=Array.from(grid.areas,(area,i)=>({i,area,score:score[i]+(rng()-.5)*.0001}));
 rank.sort((a,b)=>b.score-a.score||a.i-b.i);
 const total=grid.areas.reduce((s,x)=>s+x,0),goal=total*landPercent/100;
 let selectedArea=0,count=0;
 while(count<rank.length && selectedArea+rank[count].area/2<goal){
  selectedArea+=rank[count].area;count++;
 }
 if(count===0||count===rank.length)throw Error('Invalid land coverage');
 const selected=new Uint8Array(grid.points.length);
 for(let i=0;i<count;i++)selected[rank[i].i]=1;
 const boundary=(rank[count-1].score+rank[count].score)/2;
 for(let i=0;i<grid.heights.length;i++){
  // Keep relief gradients, but guarantee a positive/negative elevation sign.
  const delta=Math.min(99,Math.abs(score[i]-boundary)*1.8);
  grid.heights[i]=selected[i]?Math.max(1,Math.round(delta)):-Math.max(1,Math.round(delta));
 }
 // Pick the largest connected below-sea-level component as the ocean seed.
 // Interior basins must not accidentally become the global ocean.
 const visited=new Uint8Array(grid.heights.length);
 let oceanSeed=-1,largest=0;
 for(let i=0;i<grid.heights.length;i++){
  if(selected[i]||visited[i])continue;
  const queue=[i];visited[i]=1;
  for(let head=0;head<queue.length;head++){
   for(const next of grid.neighbors[queue[head]]){
    if(!selected[next]&&!visited[next]){visited[next]=1;queue.push(next);}
   }
  }
  if(queue.length>largest){largest=queue.length;oceanSeed=i;}
 }
 if(oceanSeed<0)throw Error('No ocean component');
 return {grid,oceanSeed,settings:{seed,landPercent,continentCores,gridCells:36002},
  measuredLandPercent:100*selectedArea/total,
  tolerancePercent:100*Math.max(...grid.areas)/total,
  stage:'unconfirmed-land',generator:'azgaar-template-experiment',templatePlacements:placements.map(({type,index,name,seed,center,radius})=>({type,index,name,seed,center,radius}))};
}
