import {buildDrainageGraph} from '../../src/features/worldMap/core/drainage.mjs';
// Independent graph-scale drainage erosion and area-weighted hypsometry.
// This is not a hydraulic droplet simulator or a river/lake data model.
import {assertGlobalGrid} from './global-config.mjs';
import {valueNoise3} from './spherical-terrain-refinement.mjs';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function drainageReceivers(grid,heights){return buildDrainageGraph(grid,{heights});}
function remapHypsometry(grid,h){
 const ids=[];let total=0;
 for(let i=0;i<h.length;i++)if(grid.heights[i]>=0){ids.push(i);total+=grid.areas[i];}
 ids.sort((a,b)=>h[a]-h[b]||a-b);
 // 50% of land below ~400 m, 90% below ~1800 m. Sparse peaks, rather
 // than using the area-correction sea level as mountain amplitude.
 const curve=[[0,.02],[.1,.4],[.25,1.5],[.5,4],[.75,9],[.9,18],[.97,30],[.995,45],[1,60]];
 let acc=0,segment=1;
 for(let start=0;start<ids.length;){
  let end=start+1,area=grid.areas[ids[start]];
  // Equal input elevations stay equal; do not turn cell index into contours.
  while(end<ids.length&&Math.abs(h[ids[end]]-h[ids[start]])<1e-7){area+=grid.areas[ids[end]];end++;}
  const quantile=(acc+area*.5)/total;
  while(segment<curve.length-1&&quantile>curve[segment][0])segment++;
  const [p0,h0]=curve[segment-1],[p1,h1]=curve[segment];
  const value=h0+(h1-h0)*(quantile-p0)/(p1-p0);
  for(let j=start;j<end;j++)h[ids[j]]=value;
  acc+=area;start=end;
 }
}
export function shapeNaturalRelief(grid,{seed,rawRelief}={}){
 assertGlobalGrid(grid);
 if(!Number.isInteger(seed)||seed<0||seed>0xffffffff)throw RangeError('seed must be uint32');
 if(rawRelief&&rawRelief.length!==grid.heights.length)throw RangeError('Wrong relief field size');
 const original=grid.heights.slice(),n=original.length,h=new Float64Array(n);
 for(let i=0;i<n;i++){
  if(original[i]<0)continue;
  const p=grid.points[i],base=rawRelief?.[i]??original[i];
  // Coherent detail is modulated by terrain strength. No global blanket of
  // high-frequency mountains, and no changes to the coast classification.
  h[i]=Math.max(.05,base+valueNoise3(p,6,seed^0x5814)*2+
   valueNoise3(p,21,seed^0x9138)*Math.min(2.5,.08*base));
 }
 // The projected templates can leave a single-cell spike where two
 // patches overlap. Relax isolated extrema before tracing the catchments,
 // while keeping ridges that continue through a neighbouring sample.
 const source=h.slice();
 for(let i=0;i<n;i++){
  if(original[i]<0)continue;
  const neighbors=grid.neighbors[i].filter(j=>original[j]>=0).map(j=>source[j]).sort((a,b)=>a-b);
  if(neighbors.length<4)continue;
  const low=neighbors[1],high=neighbors.at(-2);
  const excess=source[i]-clamp(source[i],low,high);
  h[i]-=Math.sign(excess)*Math.max(0,Math.abs(excess)-3)*.35;
 }
 // Conservative hillslope diffusion: simultaneous edge transfers avoid
 // traversal bias. Work in height*area so unequal spherical cells conserve mass.
 for(let pass=0;pass<3;pass++){
  const delta=new Float64Array(n);
  for(let i=0;i<n;i++)if(original[i]>=0)for(const j of grid.neighbors[i]){
   if(j<=i||original[j]<0)continue;
   const diff=h[i]-h[j],excess=Math.abs(diff)-7;
   if(excess<=0)continue;
   const volume=Math.sign(diff)*excess*.035*Math.min(grid.areas[i],grid.areas[j]);
   delta[i]-=volume/grid.areas[i];delta[j]+=volume/grid.areas[j];
  }
  for(let i=0;i<n;i++)if(original[i]>=0)h[i]=Math.max(.05,h[i]+delta[i]);
 }
 const {receivers,order}=drainageReceivers(grid,h),flow=Float64Array.from(grid.areas),cellArea=grid.areas.reduce((a,b)=>a+b,0)/n;
 for(let k=order.length-1;k>=0;k--){const i=order[k],j=receivers[i];if(j>=0)flow[j]+=flow[i];}
 let carvedCells=0,removedVolume=0;
 // Stream-power incision follows whole catchments. Large drainage areas cut
 // connected trunk valleys; small catchments retain their hill slopes.
 const eroded=h.slice();
 for(let i=0;i<n;i++){
  if(original[i]<0||receivers[i]<0)continue;
  const j=receivers[i],slope=Math.max(0,h[i]-h[j]);
  const strength=Math.log1p(flow[i]/cellArea);
  const incision=Math.min(h[i]*.42,.33*strength*Math.sqrt(slope));
  eroded[i]=Math.max(.05,h[i]-incision);
  if(incision>.1){carvedCells++;removedVolume+=incision*grid.areas[i];}
 }
 // Keep a fraction of transported material in low-gradient downstream land.
 // Routing uses the original field, so it cannot introduce flow cycles.
 const sediment=new Float64Array(n),erosionVolume=Float64Array.from(h,(v,i)=>(v-eroded[i])*grid.areas[i]);
 for(let k=order.length-1;k>=0;k--){
  const i=order[k],j=receivers[i];if(j<0||original[i]<0)continue;
  sediment[i]+=erosionVolume[i];
  const slope=Math.max(0,h[i]-h[j]),deposit=original[j]>=0?sediment[i]*.12/(1+slope):0;
  if(original[j]>=0){eroded[j]+=deposit/grid.areas[j];sediment[j]+=sediment[i]-deposit;}
 }
 remapHypsometry(grid,eroded);
 let changed=0,lowlandArea=0,mountainArea=0,landArea=0;
 for(let i=0;i<n;i++)if(original[i]>=0){
  grid.heights[i]=clamp(Math.round(eroded[i]*100)/100,.01,70);
  landArea+=grid.areas[i];if(grid.heights[i]<=5)lowlandArea+=grid.areas[i];if(grid.heights[i]>=30)mountainArea+=grid.areas[i];
  if(grid.heights[i]!==original[i])changed++;
 }
 return {version:2,seed,landToSea:0,seaToLand:0,reliefChanges:changed,carvedCells,removedVolume,
  lowlandFraction:lowlandArea/landArea,mountainFraction:mountainArea/landArea};
}
