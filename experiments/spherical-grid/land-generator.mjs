// Isolated P1 spherical land-layout prototype. No Nexus runtime or storage writes.
// Original implementation; generated land fraction is measured by spherical Voronoi area.
import {createGlobalGrid} from './global-config.mjs';

export const LAND_TARGETS = Object.freeze([25, 32, 45]);
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
function prng(seed) {
 let x=seed>>>0;
 return ()=>{x=(x+0x6d2b79f5)>>>0;let t=Math.imul(x^(x>>>15),1|x);
 t^=t+Math.imul(t^(t>>>7),61|t);return ((t^(t>>>14))>>>0)/4294967296;};
}
function randomPoint(rand) {
 const z=rand()*2-1,a=rand()*Math.PI*2,r=Math.sqrt(1-z*z);
 return [r*Math.cos(a),r*Math.sin(a),z];
}
function seeds(rand,n) {
 const points=[];
 while(points.length<n) {
  let best=null,bestScore=-Infinity;
  for(let i=0;i<96;i++){
   const v=randomPoint(rand),min=points.length?Math.min(...points.map(p=>1-dot(p,v))):2;
   const score=min+(rand()-.5)*.18;
   if(score>bestScore){best=v;bestScore=score;}
  }
  points.push(best);
 }
 return points;
}
export function createLandLayout({seed,landPercent=32,continentCores=8}={}) {
 if(!Number.isInteger(seed)||seed<0||seed>0xffffffff)throw RangeError('seed must be a uint32');
 if(!LAND_TARGETS.includes(landPercent))throw RangeError('landPercent must be 25, 32 or 45');
 if(!Number.isInteger(continentCores)||continentCores<6||continentCores>10)
  throw RangeError('continentCores must be between 6 and 10');
 const grid=createGlobalGrid(),rand=prng(seed),corePositions=seeds(rand,continentCores);
 const sizes=corePositions.map(()=>.17+rand()*.18);
 const distort=corePositions.map(()=>[randomPoint(rand),.24+rand()*.22]);
 const scores=grid.points.map((p,i)=>{
  let main=-Infinity;
  for(let j=0;j<corePositions.length;j++){
   const core=corePositions[j],d=Math.acos(Math.max(-1,Math.min(1,dot(p,core))));
   const lobe=1.1-d/sizes[j]+Math.sin(11*dot(p,distort[j][0])+j*1.3)*distort[j][1];
   if(lobe>main)main=lobe;
  }
  // Deterministic multiscale variation produces coastal irregularity and scattered islands.
  const x=p[0],y=p[1],z=p[2];
  const regional=.22*Math.sin(17*x+11*y+seed*.000001)*Math.cos(13*z-9*y);
  const islands=.16*Math.sin(57*x+31*z)*Math.cos(43*y-7*z);
  return {id:i,score:main+regional+islands,area:grid.areas[i]};
 });
 scores.sort((a,b)=>b.score-a.score||a.id-b.id);
 const total=grid.areas.reduce((s,a)=>s+a,0),goal=total*landPercent/100;
 let landArea=0,cut=0;
 while(cut<scores.length && landArea+scores[cut].area/2<goal){
  landArea+=scores[cut].area;cut++;
 }
 if(cut===0||cut===scores.length)throw Error('Invalid land mask');
 const chosen=new Uint8Array(grid.points.length);
 for(let i=0;i<cut;i++)chosen[scores[i].id]=1;
 // Preserve the signed integer-height contract; layout is confirmed separately.
 for(let i=0;i<grid.heights.length;i++)grid.heights[i]=chosen[i]?20:-20;
 const oceanSeed=scores.slice(cut).reduce((best,item)=>item.score<best.score?item:best).id;
 return {
  grid,oceanSeed,
  settings:{seed,landPercent,continentCores,gridCells:grid.points.length},
  measuredLandPercent:100*landArea/total,
  tolerancePercent:100*Math.max(...grid.areas)/total,
  stage:'unconfirmed-land'
 };
}
