// Experimental coastal sampling layer; not a replacement for Azgaar's Voronoi Pack.
import {RADIUS_KM} from './grid.mjs';
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]*a[0]-a[1]*b[0]];
const norm=a=>{const s=Math.hypot(...a);return a.map(v=>v/s)};
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const midpoint=(a,b)=>norm(a.map((x,i)=>x+b[i]));
const edgeKey=(a,b)=>a<b?`${a}:${b}`:`${b}:${a}`;
export function oceanConnected(grid,seed){
 const {heights,neighbors}=grid;
 if(!Number.isInteger(seed)||seed<0||seed>=heights.length||heights[seed]>=0)throw RangeError('ocean seed must be a negative-height cell');
 const ocean=new Uint8Array(heights.length),queue=[seed];ocean[seed]=1;
 for(let front=0;front<queue.length;front++)for(const j of neighbors[queue[front]])if(!ocean[j]&&heights[j]<0){ocean[j]=1;queue.push(j)}
 return ocean;
}
export function buildCoastalSamples(grid,ocean){
 const {points,triangles,heights,areas}=grid;
 if(ocean.length!==points.length)throw RangeError('ocean mask length mismatch');
 const centers=triangles.map(face=>{
  const [a,b,c]=face.map(i=>points[i]);let n=norm(cross(sub(b,a),sub(c,a)));
  if(dot(n,a)<0)n=n.map(x=>-x);return n;
 });
 const edges=new Map();
 for(let t=0;t<triangles.length;t++)for(let j=0;j<3;j++){
  const a=triangles[t][j],b=triangles[t][(j+1)%3],key=edgeKey(a,b);
  const item=edges.get(key);if(item)item.triangles.push(t);else edges.set(key,{a,b,triangles:[t]});
 }
 const samples=points.map((point,sourceId)=>({point,sourceId,height:heights[sourceId]}));
 const coast=[];
 for(const edge of edges.values()){
  const {a,b}=edge;
  if(edge.triangles.length!==2)throw Error('open Grid mesh edge');
  if(ocean[a]===ocean[b])continue;
  const start=centers[edge.triangles[0]],end=centers[edge.triangles[1]];
  const center=midpoint(start,end);
  const inland=midpoint(center,points[a]),seaward=midpoint(center,points[b]);
  samples.push({point:inland,sourceId:a,height:heights[a]},{point:seaward,sourceId:b,height:heights[b]});
  coast.push({gridEdge:[a,b],start,end,arcKm:RADIUS_KM*Math.acos(Math.max(-1,Math.min(1,dot(start,end))))});
 }
 return {samples,coast,landAreaKm2:areas.reduce((sum,area,i)=>sum+(ocean[i]?0:area),0),
  gridCellCount:points.length,coastalEdgeCount:coast.length};
}
