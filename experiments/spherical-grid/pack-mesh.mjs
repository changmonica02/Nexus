// Isolated experimental spherical Delaunay/Voronoi Pack. Grid remains immutable.
import {RADIUS_KM} from './grid.mjs';
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm=a=>{const len=Math.hypot(...a);return a.map(x=>x/len)};
const midpoint=(a,b)=>norm([a[0]+b[0],a[1]+b[1],a[2]+b[2]]);
const edgeKey=(a,b)=>a<b?`${a}:${b}`:`${b}:${a}`;
const triangleArea=(a,b,c)=>2*Math.atan2(Math.abs(dot(a,cross(b,c))),1+dot(a,b)+dot(b,c)+dot(c,a));
function outward(face,pts){const [a,b,c]=face.map(i=>pts[i]);return dot(a,cross(b,c))>0?face:[face[0],face[2],face[1]]}
function circumcenter(face,pts){const [a,b,c]=face.map(i=>pts[i]);let n=norm(cross(sub(b,a),sub(c,a)));return dot(n,a)>0?n:n.map(x=>-x)}
export function createSphericalPack(grid,ocean,{maxInsertions=Infinity,startingPack=null}={}){
 // A previous Pack is reusable only if its coastal insertion sequence is an
 // exact prefix of the new sorted sequence. Otherwise build from the Grid.
 const points=(startingPack?.points??grid.points).map(p=>p.slice());
 const sourceIds=startingPack?[...startingPack.sourceIds]:points.map((_,i)=>i);
 const triangles=(startingPack?.triangles??grid.triangles).map(t=>t.slice());
 const incidence=new Map();
 function edgeFaces(a,b){return incidence.get(edgeKey(a,b))}
 function attach(fid){const t=triangles[fid];for(let j=0;j<3;j++){const k=edgeKey(t[j],t[(j+1)%3]);let s=incidence.get(k);if(!s){s=new Set();incidence.set(k,s)}s.add(fid)}}
 function detach(fid){const t=triangles[fid];for(let j=0;j<3;j++){const k=edgeKey(t[j],t[(j+1)%3]);const s=incidence.get(k);s.delete(fid);if(!s.size)incidence.delete(k)}}
 triangles.forEach((_,i)=>attach(i));
 function replace(f1,t1,f2,t2){detach(f1);detach(f2);triangles[f1]=outward(t1,points);triangles[f2]=outward(t2,points);attach(f1);attach(f2)}
 let inserted=startingPack?.inserted??0, flips=startingPack?.flips??0, skipped=0;
 // Insert additional sites on Delaunay edges straddling ocean and land.
 const coastEdges=[];
 for(let i=0;i<grid.neighbors.length;i++)for(const j of grid.neighbors[i])if(i<j && ocean[i]!==ocean[j])coastEdges.push([i,j]);
 if(startingPack){
  if(startingPack.skipped||startingPack.inserted!==startingPack.coastEdges.length||
     startingPack.coastEdges.length>coastEdges.length)
   throw Error('Incremental Pack prefix is not valid');
  for(let i=0;i<startingPack.coastEdges.length;i++){
   const [a,b]=startingPack.coastEdges[i],[u,v]=coastEdges[i];
   if(a!==u||b!==v)throw Error('Incremental Pack coast sequence is not a prefix');
  }
 }
 const firstNew=startingPack?.coastEdges.length??0;
 for(const [a,b] of coastEdges.slice(firstNew)){
  if(inserted>=maxInsertions)break;
  const shared=edgeFaces(a,b);
  const m=points.length;
  const chosen=midpoint(points[a],points[b]);
  sourceIds.push(ocean[a]?b:a);
  let stack;
  if(shared?.size===2){
   const [f1,f2]=[...shared],old1=triangles[f1],old2=triangles[f2];
   const c=old1.find(x=>x!==a&&x!==b),d=old2.find(x=>x!==a&&x!==b);
   points.push(chosen);
   detach(f1);detach(f2);
   triangles[f1]=outward([a,m,c],points);triangles[f2]=outward([b,m,d],points);
   const f3=triangles.length;triangles.push(outward([m,b,c],points));
   const f4=triangles.length;triangles.push(outward([m,a,d],points));
   for(const fid of [f1,f2,f3,f4])attach(fid);
   stack=[[a,c],[b,c],[a,d],[b,d]];
  }else{
   // An earlier Delaunay flip can remove an original coast edge.
   // Insert a nearby interior point instead of silently dropping the sample.
   const site=sourceIds[m],target=norm(points[site].map((x,i)=>.02*x+.98*chosen[i]));
   let found=-1;
   for(let fid=0;fid<triangles.length;fid++){
    const [u,v,w]=triangles[fid];
    if(dot(cross(points[u],points[v]),target)<1e-12||dot(cross(points[v],points[w]),target)<1e-12||dot(cross(points[w],points[u]),target)<1e-12)continue;
    found=fid;break;
   }
   if(found===-1){sourceIds.pop();skipped++;continue}
   points.push(target);
   const [u,v,w]=triangles[found];detach(found);
   triangles[found]=outward([u,v,m],points);
   const f2=triangles.length;triangles.push(outward([v,w,m],points));
   const f3=triangles.length;triangles.push(outward([w,u,m],points));
   for(const fid of [found,f2,f3])attach(fid);
   stack=[[u,v],[v,w],[w,u]];
  }
  inserted++;
  // Spherical local empty-circumcap Delaunay legalization.
  let attempts=0;
  while(stack.length){
   if(++attempts>4000)throw Error('Pack edge-flip legalization did not converge');
   const [u,v]=stack.pop(),faces=edgeFaces(u,v);
   if(!faces||faces.size!==2)continue;
   const [x,y]=[...faces],tx=triangles[x],ty=triangles[y];
   const withM=tx.includes(m)?x:ty.includes(m)?y:null;
   if(withM===null)continue;
   const other=withM===x?y:x,far=triangles[other].find(q=>q!==u&&q!==v);
   if(far===undefined||far===m)continue;
   const center=circumcenter(triangles[withM],points);
   if(dot(center,points[far])<=dot(center,points[u])+1e-12)continue;
   const flipA=outward([m,u,far],points),flipB=outward([m,far,v],points);
   if(dot(points[flipA[0]],cross(points[flipA[1]],points[flipA[2]]))<1e-14||dot(points[flipB[0]],cross(points[flipB[1]],points[flipB[2]]))<1e-14)continue;
   replace(withM,flipA,other,flipB);flips++;
   stack.push([u,far],[v,far]);
  }
 }
 const neighbors=Array.from({length:points.length},()=>new Set());
 const incident=Array.from({length:points.length},()=>[]);
 for(let t=0;t<triangles.length;t++)for(let j=0;j<3;j++){
  const a=triangles[t][j],b=triangles[t][(j+1)%3];neighbors[a].add(b);neighbors[b].add(a);incident[a].push(t);
 }
 const centers=triangles.map(face=>circumcenter(face,points));
 const areas=new Float64Array(points.length);
 for(let i=0;i<points.length;i++){
  const a=points[i],x=norm(Math.abs(a[2])<.9?cross([0,0,1],a):cross([0,1,0],a)),y=cross(a,x);
  const around=incident[i].map(t=>centers[t]).sort((u,v)=>Math.atan2(dot(u,y),dot(u,x))-Math.atan2(dot(v,y),dot(v,x)));
  for(let j=0;j<around.length;j++)areas[i]+=triangleArea(a,around[j],around[(j+1)%around.length])*RADIUS_KM**2;
 }
 return {points,triangles,neighbors:neighbors.map(x=>[...x].sort((a,b)=>a-b)),areas,sourceIds,heights:Int8Array.from(sourceIds,id=>grid.heights[id]),coastEdges,inserted,flips,skipped};
}
// Exact sequential continuation when the existing coastal site sequence is
// preserved. Changes that remove/reorder sites must use full rebuilding.
export function extendSphericalPack(grid,ocean,priorPack){
 return createSphericalPack(grid,ocean,{startingPack:priorPack});
}

export function canExtendSphericalPack(grid,ocean,priorPack){
 if(!priorPack||priorPack.skipped||priorPack.inserted!==priorPack.coastEdges?.length)return false;
 const edges=[];
 for(let i=0;i<grid.neighbors.length;i++)for(const j of grid.neighbors[i])
  if(i<j&&ocean[i]!==ocean[j])edges.push([i,j]);
 if(priorPack.coastEdges.length>edges.length)return false;
 for(let i=0;i<priorPack.coastEdges.length;i++)
  if(priorPack.coastEdges[i][0]!==edges[i][0]||priorPack.coastEdges[i][1]!==edges[i][1])return false;
 return true;
}
