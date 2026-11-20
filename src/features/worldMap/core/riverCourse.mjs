// Terrain-constrained, interpolating river courses. Routing anchors and shared
// confluences stay exact; an ocean mouth ends on the same shoreline as land fill.
import {dot,unit} from '../../../../experiments/spherical-grid/geologic-fields.mjs';
import {shorelineIntersection} from './coastSurface.mjs';
const from=([lon,lat])=>{const a=lon*Math.PI/180,b=lat*Math.PI/180;return [Math.cos(b)*Math.cos(a),Math.cos(b)*Math.sin(a),Math.sin(b)];};
const to=p=>[Math.atan2(p[1],p[0])*180/Math.PI,Math.asin(Math.max(-1,Math.min(1,p[2])))*180/Math.PI];
const tangent=(p,v)=>unit(v.map((x,k)=>x-p[k]*dot(v,p)));
export function shapeRiverCourse(pack,river){
 const geometry=river.geometry,points=geometry.map(from),result=[[...geometry[0]]],sourceSegments=[];
 for(let i=0;i<points.length-1;i++){
  const a=points[i],b=points[i+1],previous=points[Math.max(0,i-1)],following=points[Math.min(points.length-1,i+2)],length=Math.hypot(...a.map((v,k)=>v-b[k]));
  const ta=tangent(a,b.map((v,k)=>v-previous[k])),tb=tangent(b,following.map((v,k)=>v-a[k])),ai=pack.findCell(a),bi=pack.findCell(b),ceiling=Math.max(pack.heights[ai],pack.heights[bi])+20;
  const allowed=new Set([ai,bi,...pack.neighbors[ai],...pack.neighbors[bi]]);
  for(let j=1;j<4;j++){
   const t=j/4,t2=t*t,t3=t2*t,line=unit(a.map((v,k)=>v*(1-t)+b[k]*t));
   let curved=unit(a.map((v,k)=>(2*t3-3*t2+1)*v+(t3-2*t2+t)*ta[k]*length+(-2*t3+3*t2)*b[k]+(t3-t2)*tb[k]*length));
   for(let backoff=0;backoff<5;backoff++){const cell=pack.findCell(curved),water=pack.heights[cell]<0;if(allowed.has(cell)&&pack.heights[cell]<=ceiling&&(!water||pack.heights[ai]<0||pack.heights[bi]<0))break;curved=unit(curved.map((v,k)=>(v+line[k])/2));}
   const cell=pack.findCell(curved);if(!allowed.has(cell)||pack.heights[cell]>ceiling||(pack.heights[cell]<0&&pack.heights[ai]>=0&&pack.heights[bi]>=0))curved=line;
   result.push(to(curved));sourceSegments.push(i);
  }
  result.push([...geometry[i+1]]);sourceSegments.push(i);
 }
 const mouthCell=pack.findCell(geometry.at(-1));
 if(!river.parentId&&!river.mouthLakeId&&pack.heights[mouthCell]<0&&pack.coastSurface){
  for(let i=Math.max(1,result.length-5);i<result.length;i++){const hit=shorelineIntersection(result[i-1],result[i],pack.coastSurface.coast);if(hit){result.splice(i,result.length-i,hit);sourceSegments.length=result.length-1;break;}}
 }
 return {points:result,sourceSegments};
}
