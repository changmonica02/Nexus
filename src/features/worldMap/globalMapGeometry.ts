/** Spherical Voronoi cell polygons, projected only for display; no heights are changed. */
export type GlobalMapDrawing={land:number[][][];coast:number[][][];landPercent:number;plateBoundaries?:number[][][];plateCount?:number;relief?:{color:string;rings:number[][][]}[]};
type Grid={points:number[][];triangles:number[][];areas:Float64Array;heights?:ArrayLike<number>};
const dot=(a:number[],b:number[])=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const sub=(a:number[],b:number[])=>a.map((v,i)=>v-b[i]);
const cross=(a:number[],b:number[])=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const unit=(a:number[])=>{const n=Math.hypot(...a);return a.map(v=>v/n);};
const project=(p:number[])=>[Math.atan2(p[1],p[0])*180/Math.PI,Math.asin(Math.max(-1,Math.min(1,p[2])))*180/Math.PI];
export function unwrapRing(points:number[][],pole?:number){
 const out=points.map(p=>[...p]);
 for(let i=1;i<out.length;i++){
  while(out[i][0]-out[i-1][0]>180)out[i][0]-=360;
  while(out[i][0]-out[i-1][0]<-180)out[i][0]+=360;
 }
 if(pole!==undefined&&out.length&&Math.abs(out.at(-1)![0]-out[0][0])>180)
  out.push([out.at(-1)![0],pole],[out[0][0],pole]);
 const shift=Math.floor((out.reduce((s,p)=>s+p[0],0)/out.length+180)/360)*360;
 return out.map(([x,y])=>[x-shift,y]);
}
export function createGlobalMapDrawing(grid:Grid,ocean:Uint8Array,coast:{start:number[];end:number[]}[]):GlobalMapDrawing {
 const around:number[][][]=Array.from({length:grid.points.length},()=>[]);
 for(const face of grid.triangles){
  const [a,b,c]=face.map(i=>grid.points[i]);let center=unit(cross(sub(b,a),sub(c,a)));
  if(dot(center,a)<0)center=center.map(v=>-v);
  for(const i of face)around[i].push(center);
 }
 const land:number[][][]=[];let area=0,total=0;
 const palette=['#17364e','#20506b','#2b6b86','#418fa6','#76b6c6','#b3d6d4','#8eb57a','#b4bf85','#bba776','#9e876c','#d1c6b5','#eeeae2'];
 const relief=palette.map(color=>({color,rings:[] as number[][][]}));
 for(let i=0;i<grid.points.length;i++){
  total+=grid.areas[i];if(!ocean[i])area+=grid.areas[i];
  if(ocean[i]&&!grid.heights)continue;
  const p=grid.points[i],x=unit(Math.abs(p[2])<.9?cross([0,0,1],p):cross([0,1,0],p)),y=cross(p,x);
  around[i].sort((a,b)=>Math.atan2(dot(a,y),dot(a,x))-Math.atan2(dot(b,y),dot(b,x)));
  const ring=unwrapRing(around[i].map(project),p[2]>0?90:-90);
  if(!ocean[i])land.push(ring);
  if(grid.heights){
   const h=grid.heights[i];
   const band=h<0?(h< -65?0:h< -45?1:h< -25?2:h< -10?3:h< -3?4:5):6+Math.min(5,Math.floor(h/17));
   relief[band].rings.push(ring);
  }
 }
 return {land,relief:grid.heights?relief:undefined,coast:coast.map(c=>unwrapRing([project(c.start),project(c.end)])),landPercent:area/total*100};
}
