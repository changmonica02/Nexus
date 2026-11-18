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
// Angular half-width of each tangent-plane patch, in radians. Different
// recipes have independent ranges rather than sharing one island size.
// These are provisional geography parameters, not a promise of real land area.
export const TEMPLATE_SIZE_RANGES=Object.freeze({
 continents:[.70,1.02],pangea:[.87,1.15],oldWorld:[.72,1.04],shattered:[.72,1.03],
 volcano:[.10,.23],highIsland:[.18,.35],lowIsland:[.12,.27],peninsula:[.21,.42],
 archipelago:[.25,.51]
});
export function sampleTemplateRadius(name,rng){
 const range=TEMPLATE_SIZE_RANGES[name];
 if(!range)throw RangeError('Unknown template size profile: '+name);
 // Bias toward the small/medium end, retaining occasional large results.
 return range[0]+(range[1]-range[0])*Math.pow(rng(),1.65);
}
// First choose an uneven global geography, THEN sample individual templates.
// These centres are not new map objects; they only bias initial placement.
const angularDistance=(a,b)=>Math.acos(Math.max(-1,Math.min(1,dot(a,b))));
const randomNear=(rng,center,spread)=>{
 const p=Math.abs(center[2])>.97?[0,1,0]:[0,0,1];
 const east=unit(cross(p,center)),north=cross(center,east);
 const angle=2*Math.PI*rng(),distance=spread*Math.sqrt(rng());
 return unit(center.map((v,i)=>v*Math.cos(distance)+Math.sin(distance)*
   (east[i]*Math.cos(angle)+north[i]*Math.sin(angle))));
};
export function planGeographicClusters(seed){
 const rng=templateRng(seed^0x51A74C),count=randomInt(rng,2,4),clusters=[];
 // One or two broad ocean sectors are permitted to stay relatively empty.
 const first=randomPoint(rng),basin=randomNear(rng,first,1.7+0.6*rng());
 for(let i=0;i<count;i++){
  let center=randomPoint(rng),best=-Infinity;
  for(let attempt=0;attempt<18;attempt++){
   const option=randomPoint(rng);
   const fromBasin=angularDistance(option,basin);
   const fromOthers=clusters.length?Math.min(...clusters.map(c=>angularDistance(option,c.center))):1.3;
   const quality=0.64*fromBasin+1.2*Math.min(fromOthers,2.0);
   if(quality>best){best=quality;center=option;}
  }
  clusters.push({id:i,center,spread:0.45+0.40*rng(),
   weight:0.70+1.10*Math.pow(rng(),2),continentWeight:.70+.65*rng()});
 }
 return {clusters,basin};
}
function weightedCluster(rng,clusters,type){
 const total=clusters.reduce((sum,c)=>sum+c.weight*(type==='continent'?c.continentWeight:1),0);
 let n=rng()*total;
 for(const c of clusters){
  n-=c.weight*(type==='continent'?c.continentWeight:1);
  if(n<=0)return c;
 }
 return clusters.at(-1);
}
function makePlacement(rng,type,index,geography,recipe=null,recipeSeed=null,clusterId=undefined,expansion=1){
 const name=recipe??randomItem(rng,type==='continent'?CONTINENT_TEMPLATES:type==='island'?ISLAND_TEMPLATES:ARCHIPELAGO_TEMPLATES);
 let selected=clusterId===undefined?weightedCluster(rng,geography.clusters,type):clusterId===null?null:geography.clusters[clusterId];
 // Some isolated continents and islands remain to prevent forced clustering.
 const isolated=clusterId===undefined?(rng()<(type==='continent'?.12:.19)):false;
 if(isolated)selected=null;
 const center=selected?randomNear(rng,selected.center,selected.spread*expansion*(type==='continent'?1.30:type==='archipelago'?.83:1.05)):
  randomPoint(rng);
 const polar=Math.abs(center[2])>.97?[0,1,0]:[0,0,1];
 const east=unit(cross(polar,center)),north=unit(cross(center,east));
 const angle=rng()*Math.PI*2,cos=Math.cos(angle),sin=Math.sin(angle);
 const radius=sampleTemplateRadius(name,rng);
 return {type,index,name,center,east,north,cos,sin,radius,
  clusterId:selected?.id??null,seed:recipeSeed??((rng()*4294967296)>>>0)};
}
export function planAzgaarPlacements(seed,{continentCores=8}={}){
 const rng=templateRng(seed^0xA61A2),placements=[],geography=planGeographicClusters(seed);
 const continents=Math.max(6,Math.min(8,continentCores));
 // Guarantee an initial continent in each sampled cluster; remaining slots
 // follow the weighted distribution and may remain isolated.
 for(let i=0;i<continents;i++)placements.push(makePlacement(rng,'continent',i,geography,
  null,null,i<geography.clusters.length?i:undefined));
 for(let i=0,n=randomInt(rng,15,20);i<n;i++)placements.push(makePlacement(rng,'island',i,geography));
 for(let i=0,n=randomInt(rng,4,12);i<n;i++)placements.push(makePlacement(rng,'archipelago',i,geography));
 return placements;
}
// Reject overly coincident *land footprints*, not overlapping template rectangles.
// An island may attach to a continent, while major continental candidates should
// still contribute new land. These are experimental tuning constants.
export const TEMPLATE_OVERLAP_LIMITS=Object.freeze({continent:0.34,island:0.82,archipelago:0.60});
const TEMPLATE_RETRIES=Object.freeze({continent:8,island:5,archipelago:7});
// A candidate is judged by how much new land it adds, not its rectangle.
// The overlap limits remain soft when every retry is crowded.
const EPSILON=1e-9;
function projectCandidate(item,grid,map){
 const extent=Math.tan(item.radius);
 const cutoff=Math.cos(Math.atan(Math.SQRT2*extent));
 const values=new Float32Array(grid.points.length);
 const footprint=new Uint8Array(grid.points.length);
 let landArea=0;
 for(let i=0;i<grid.points.length;i++){
  const p=grid.points[i],forward=dot(p,item.center);
  if(forward<=cutoff)continue;
  const e=dot(p,item.east)/forward/extent,n=dot(p,item.north)/forward/extent;
  const u=(e*item.cos+n*item.sin+1)/2,v=(n*item.cos-e*item.sin+1)/2;
  if(u<0||u>1||v<0||v>1)continue;
  const edge=Math.max(0,1-Math.pow(Math.max(Math.abs(2*u-1),Math.abs(2*v-1)),6));
  const height=sampleTemplate(map,u,v);
  const value=(height-20)*edge*(item.type==='continent'?1:0.8)-12;
  if(value<=0)continue;
  values[i]=value;
  footprint[i]=1;
  landArea+=grid.areas[i];
 }
 return {values,footprint,landArea};
}
function measureLandContribution(candidate,occupied,areas){
 if(candidate.landArea<=EPSILON)return {overlapRatio:1,newLandArea:0,contributionRatio:0};
 let overlapping=0;
 for(let i=0;i<areas.length;i++)if(candidate.footprint[i]&&occupied[i])overlapping+=areas[i];
 const overlapRatio=Math.min(1,overlapping/candidate.landArea);
 return {overlapRatio,newLandArea:Math.max(0,candidate.landArea-overlapping),
  contributionRatio:Math.max(0,1-overlapRatio)};
}
function selectPlacement(item,grid,occupied,rng,geography){
 // Re-placing a recipe must NOT run its costly 64x64 height generation again.
 // Position, rotation and physical size are re-sampled; shape and seed stay fixed.
 const map=executeAzgaarTemplate(item.name,item.seed);
 let best=null,bestQuality=-Infinity;
 for(let attempt=0;attempt<TEMPLATE_RETRIES[item.type];attempt++){
  const proposed=attempt===0?item:makePlacement(rng,item.type,item.index,geography,item.name,item.seed,item.clusterId,
   1+0.13*attempt);
  const candidate=projectCandidate(proposed,grid,map);
  const metrics=measureLandContribution(candidate,occupied,grid.areas);
  if(candidate.landArea<=EPSILON||metrics.newLandArea<=EPSILON)continue;
  // Rank by true new land area plus relative contribution. This avoids picking
  // a microscopic patch merely because its relative overlap happens to be 0.
  const quality=Math.log1p(metrics.newLandArea)*(0.4+0.6*metrics.contributionRatio)-3*metrics.overlapRatio;
  if(quality>bestQuality){
   best={...proposed,candidate,...metrics,attempts:attempt+1};
   bestQuality=quality;
  }
  if(metrics.overlapRatio<=TEMPLATE_OVERLAP_LIMITS[item.type])break;
 }
 return best;
}
export function createAzgaarSphericalLandLayout({seed,landPercent=32,continentCores=8}={}){
 if(!Number.isInteger(seed)||seed<0||seed>0xffffffff)throw RangeError('seed must be uint32');
 if(![25,32,45].includes(landPercent))throw RangeError('landPercent must be 25, 32 or 45');
 if(!Number.isInteger(continentCores)||continentCores<6||continentCores>10)throw RangeError('continentCores must be 6..10');
 const grid=createGlobalGrid(),placements=planAzgaarPlacements(seed,{continentCores}),geography=planGeographicClusters(seed);
 const rng=templateRng(seed^0x3C97E),score=new Float64Array(grid.points.length);
 // Background is applied AFTER placement, using the accepted (possibly
 // relocated) continental centres rather than the original proposals.
 score.fill(-45);
 // Place land-rich templates in order, comparing only their actual positive
 // footprint cells. A bounded fallback keeps the generator deterministic.
 const occupied=new Uint8Array(grid.points.length),accepted=[];
 for(const item of placements){
  const chosen=selectPlacement(item,grid,occupied,rng,geography);
  if(!chosen)continue; // All attempts were empty or contributed no new land.
  const {candidate,...info}=chosen;
  accepted.push(info);
  for(let i=0;i<grid.points.length;i++){
   if(!candidate.footprint[i])continue;
   const incoming=candidate.values[i],previous=Math.max(0,score[i]);
   // Small capped relief blending: never add two entire mountain heights.
   score[i]=Math.max(score[i],incoming)+Math.min(8,0.12*Math.min(previous,incoming));
   occupied[i]=1;
  }
 }
 // A broad low-amplitude continental background discourages random isolated
 // land cells if the final target percentage exceeds the combined footprints.
 // It must follow accepted placements, otherwise moved land gets a phantom
 // elevation halo at its rejected original location.
 const continents=accepted.filter(p=>p.type==='continent');
 for(let i=0;i<grid.points.length;i++){
  let background=-45;
  for(const item of continents){
   const distance=Math.acos(Math.max(-1,Math.min(1,dot(grid.points[i],item.center))));
   background=Math.max(background,-45+25*Math.exp(-2*Math.pow(distance/item.radius,2)));
  }
  score[i]=Math.max(score[i],background);
 }
 // Only the prospective coast is softened. Mountain ridges remain untouched;
 // a fixed small local band cannot turn a remote lake into an open ocean.
 // The quantile is recomputed after this pass to keep the requested area.
 const initialRank=Array.from(grid.areas,(area,i)=>({i,area,value:score[i]}));
 initialRank.sort((a,b)=>b.value-a.value||a.i-b.i);
 const sphereArea=grid.areas.reduce((sum,area)=>sum+area,0);
 const targetArea=sphereArea*landPercent/100;
 let roughArea=0,roughCount=0;
 while(roughCount<initialRank.length&&roughArea+initialRank[roughCount].area/2<targetArea){
  roughArea+=initialRank[roughCount].area;roughCount++;
 }
 const roughSeaLevel=(initialRank[roughCount-1].value+initialRank[roughCount].value)/2;
 const coastScore=score.slice();
 for(let i=0;i<score.length;i++){
  // Preserve high relief and deep oceans. A change may occur only next to
  // opposite-side cells and in a narrow band around the tentative coast.
  if(Math.abs(score[i]-roughSeaLevel)>10)continue;
  const near=grid.neighbors[i];
  if(!near.some(j=>(score[i]>=roughSeaLevel)!==(score[j]>=roughSeaLevel)))continue;
  let neighbourAverage=0;
  for(const j of near)neighbourAverage+=score[j];
  neighbourAverage/=near.length;
  const adjustment=Math.max(-3,Math.min(3,(neighbourAverage-score[i])*.2));
  coastScore[i]+=adjustment;
 }
 // Use area-weighted quantile to hit the selected surface fraction.
 // This must happen after composing all templates, never per local patch.
 // Tiny seeded jitter prevents large quantized ties at equal heights.
 const rank=Array.from(grid.areas,(area,i)=>({i,area,score:coastScore[i]+(rng()-.5)*.0001}));
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
  const delta=Math.min(99,Math.abs(coastScore[i]-boundary)*1.8);
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
  attemptedPlacements:placements.length,skippedPlacements:placements.length-accepted.length,
  geographicClusters:geography.clusters.map(({id,center,spread,weight})=>({id,center,spread,weight})),
  tolerancePercent:100*Math.max(...grid.areas)/total,
  stage:'unconfirmed-land',generator:'azgaar-template-experiment',templatePlacements:accepted.map(({type,index,name,seed,center,radius,clusterId,overlapRatio,contributionRatio,newLandArea,attempts})=>({type,index,name,seed,center,radius,clusterId,overlapRatio,contributionRatio,newLandArea,attempts}))};
}
