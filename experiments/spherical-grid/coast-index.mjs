// Local update of canonical Grid coastline; inspired by Azgaar's Grid/Pack distinction.
// This is a coast/area cache ONLY. It does not locally re-triangulate the Pack.
import {RADIUS_KM} from './grid.mjs';
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const subtract=(a,b)=>a.map((x,i)=>x-b[i]);
const unit=a=>{const l=Math.hypot(...a);return a.map(v=>v/l)};
const key=(a,b)=>a<b?`${a}:${b}`:`${b}:${a}`;

function makeSegments(grid){
 const centers=grid.triangles.map(t=>{
  const [a,b,c]=t.map(id=>grid.points[id]);
  let n=unit(cross(subtract(b,a),subtract(c,a)));
  if(dot(n,a)<0)n=n.map(x=>-x);
  return n;
 });
 const edges=new Map(),byCell=Array.from({length:grid.points.length},()=>[]);
 for(let i=0;i<grid.triangles.length;i++)for(let j=0;j<3;j++){
  const face=grid.triangles[i],a=face[j],b=face[(j+1)%3],k=key(a,b);
  const value=edges.get(k);
  if(value)value.faces.push(i);
  else edges.set(k,{a:Math.min(a,b),b:Math.max(a,b),faces:[i]});
 }
 const segments=new Map();
 for(const [k,{a,b,faces}] of edges){
  if(faces.length!==2)throw Error('Spherical Grid has an open edge');
  const start=centers[faces[0]],end=centers[faces[1]];
  const segment={gridEdge:[a,b],start,end,
   arcKm:RADIUS_KM*Math.acos(Math.max(-1,Math.min(1,dot(start,end))))};
  segments.set(k,segment);
  byCell[a].push(k);byCell[b].push(k);
 }
 return {segments,byCell};
}
export function createCoastIndex(grid,ocean){
 if(ocean?.length!==grid.points.length)throw RangeError('Invalid ocean mask');
 const geometry=makeSegments(grid),active=new Map();
 for(const [k,s] of geometry.segments)if(ocean[s.gridEdge[0]]!==ocean[s.gridEdge[1]])active.set(k,s);
 const landAreaKm2=grid.areas.reduce((sum,area,i)=>sum+(ocean[i]?0:area),0);
 return {...geometry,grid,ocean:Uint8Array.from(ocean),active,landAreaKm2};
}
export function updateCoastIndex(index,nextOcean){
 if(nextOcean?.length!==index.ocean.length)throw RangeError('Invalid ocean mask');
 const changed=[];
 for(let i=0;i<nextOcean.length;i++){
  if(nextOcean[i]!==0&&nextOcean[i]!==1)throw RangeError('Ocean must be binary');
  if(index.ocean[i]!==nextOcean[i])changed.push(i);
 }
 if(!changed.length)return {index,changedCells:0,touchedEdges:0,changedEdges:0};
 const touched=new Set();
 let landAreaKm2=index.landAreaKm2;
 for(const id of changed){
  for(const edge of index.byCell[id])touched.add(edge);
  landAreaKm2+=(index.ocean[id]-nextOcean[id])*index.grid.areas[id];
 }
 const active=new Map(index.active);
 let changedEdges=0;
 for(const key of touched){
  const segment=index.segments.get(key),[a,b]=segment.gridEdge;
  const before=index.ocean[a]!==index.ocean[b];
  const after=nextOcean[a]!==nextOcean[b];
  if(before===after)continue;
  changedEdges++;
  if(after)active.set(key,segment);
  else active.delete(key);
 }
 return {index:{...index,ocean:Uint8Array.from(nextOcean),active,landAreaKm2},
  changedCells:changed.length,touchedEdges:touched.size,changedEdges};
}
// A stable key lets callers compare coast geometry without depending on Pack IDs.
export const coastSegments=index=>[...index.active.values()]
 .sort((a,b)=>a.gridEdge[0]-b.gridEdge[0]||a.gridEdge[1]-b.gridEdge[1]);
