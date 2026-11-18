// Experimental spherical terrain refinement, independent implementation.
// Inspired by general multi-scale spherical-noise techniques, NOT copied
// from planet-simulation (whose project source has no stated license).
// Input/output is the existing authoritative 36,002-cell Grid.
// Only run this BEFORE tectonic / seafloor analysis; never on saved maps.
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const fade=t=>t*t*(3-2*t);
function hash3(ix,iy,iz,seed){
 let x=(seed^Math.imul(ix,0x9e3779b1)^Math.imul(iy,0x85ebca6b)^Math.imul(iz,0xc2b2ae35))>>>0;
 x=Math.imul(x^(x>>>16),0x7feb352d);
 x=Math.imul(x^(x>>>15),0x846ca68b);
 return ((x^(x>>>16))>>>0)/4294967295*2-1;
}
// Seamless on the spherical longitude boundary: sample 3D unit vectors,
// rather than separately sampling equirectangular x/y coordinates.
function valueNoise3(p,f,seed){
 const px=p[0]*f,py=p[1]*f,pz=p[2]*f;
 const x=Math.floor(px),y=Math.floor(py),z=Math.floor(pz);
 const u=fade(px-x),v=fade(py-y),w=fade(pz-z);
 const h=(dx,dy,dz)=>hash3(x+dx,y+dy,z+dz,seed);
 const lerp=(a,b,t)=>a+(b-a)*t;
 return lerp(
  lerp(lerp(h(0,0,0),h(1,0,0),u),lerp(h(0,1,0),h(1,1,0),u),v),
  lerp(lerp(h(0,0,1),h(1,0,1),u),lerp(h(0,1,1),h(1,1,1),u),v),w);
}
function fractal(p,seed){
 return 0.55*valueNoise3(p,12,seed^0x713a)
  +0.30*valueNoise3(p,28,seed^0x847a)
  +0.15*valueNoise3(p,60,seed^0x9b1c);
}
function landArea(grid,heights){
 let area=0;
 for(let i=0;i<heights.length;i++)if(heights[i]>=0)area+=grid.areas[i];
 return area;
}
/**
 * Optional controlled alternative to the recovered Azgaar-generated world.
 * - Adds deterministic seamless relief to land (not random plate mountains).
 * - Optionally reshapes only an immediate narrow coastal band, conserving
 *   spherical land area to within the area of one Grid cell.
 * - Leaves deep ocean untouched for the existing plate-based bathymetry.
 * - Does not update saved snapshots, sea level, plates or editor behaviour.
 */
export function refineSphericalTerrain(grid,{seed,coast=true,relief=true}={}){
 if(!grid||grid.points?.length!==36002||grid.heights?.length!==36002||grid.areas?.length!==36002||grid.neighbors?.length!==36002)
  throw new RangeError('Expected canonical 36,002-cell sphere');
 if(!Number.isInteger(seed)||seed<0||seed>0xffffffff)throw new RangeError('seed must be uint32');
 const original=grid.heights.slice(),originalArea=landArea(grid,original),N=original.length;
 const noise=new Float32Array(N);
 for(let i=0;i<N;i++)noise[i]=fractal(grid.points[i],seed);
 const candidate=[];
 if(coast){
  for(let i=0;i<N;i++){
   const h=original[i];
   if(Math.abs(h)>5)continue;
   if(!grid.neighbors[i].some(j=>(original[j]>=0)!==(h>=0)))continue;
   candidate.push(i);
  }
  let wanted=0,prior=0;
  for(const i of candidate){wanted+=grid.areas[i];if(original[i]>=0)prior+=grid.areas[i];}
  // Order by the original coastal elevation first; the new noise only makes
  // local adjustments. Never force a global threshold through continents.
  const ranked=candidate.map(i=>({i,score:original[i]+noise[i]*3.2})).sort((a,b)=>b.score-a.score||a.i-b.i);
  let area=0,cut=0;
  while(cut<ranked.length&&area+grid.areas[ranked[cut].i]/2<prior){
   area+=grid.areas[ranked[cut].i];cut++;
  }
  const chosen=new Uint8Array(N);
  for(let j=0;j<cut;j++)chosen[ranked[j].i]=1;
  for(const i of candidate){
   if(chosen[i]&&(original[i]<0))grid.heights[i]=1;
   else if(!chosen[i]&&original[i]>=0)grid.heights[i]=-1;
  }
 }
 if(relief)for(let i=0;i<N;i++){
  if(grid.heights[i]<=0)continue;
  const h=grid.heights[i],shore=clamp(h/14,0,1);
  // Main body: broad gentle relief plus mid-scale roughness.
  const adjustment=noise[i]*(2+7*shore);
  grid.heights[i]=clamp(Math.round(h+adjustment),1,100);
 }
 const afterArea=landArea(grid,grid.heights);
 let landToSea=0,seaToLand=0,reliefChanges=0;
 for(let i=0;i<N;i++){
  if(original[i]>=0&&grid.heights[i]<0)landToSea++;
  if(original[i]<0&&grid.heights[i]>=0)seaToLand++;
  if(original[i]>=0&&grid.heights[i]>=0&&original[i]!==grid.heights[i])reliefChanges++;
 }
 const maxCell=Math.max(...grid.areas);
 if(Math.abs(afterArea-originalArea)>maxCell+1e-6)throw Error('Coast refinement exceeds one-cell spherical area tolerance');
 return {version:1,seed,coast,relief,candidates:candidate.length,landToSea,seaToLand,reliefChanges,
  areaDifference:afterArea-originalArea,maxCellArea:maxCell};
}
