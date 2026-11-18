// Execute the actual vendored Azgaar command methods on a seeded Delaunay
// graph. Its requested point count selects the upstream blob/line powers.
import Delaunator from 'delaunator';
import {createAzgaarCommandTools} from '../../.cache/azgaar-command-tools.mjs';
import {AZGAAR_TEMPLATE_SCRIPTS} from './azgaar-template-data.mjs';
import {templateRng} from './azgaar-template-engine.mjs';
const WIDTH=128,HEIGHT=80;
export function createAzgaarPatchGraph(seed,{padding=0}={}){
 const rng=templateRng(seed^0x3819),points=[],nx=WIDTH+2*padding,ny=HEIGHT+2*padding;
 for(let y=0;y<ny;y++)for(let x=0;x<nx;x++)points.push([x-padding+.5+(rng()-.5)*.8,y-padding+.5+(rng()-.5)*.8]);
 const delaunay=Delaunator.from(points),neighbors=Array.from(points,()=>new Set());
 for(let t=0;t<delaunay.triangles.length;t+=3){
  const [a,b,c]=delaunay.triangles.subarray(t,t+3);
  neighbors[a].add(b).add(c);neighbors[b].add(a).add(c);neighbors[c].add(a).add(b);
 }
 const cells=neighbors.map((ns,i)=>[...ns].sort((a,b)=>Math.atan2(points[a][1]-points[i][1],points[a][0]-points[i][0])-Math.atan2(points[b][1]-points[i][1],points[b][0]-points[i][0])));
 const graph={points,cells:{c:cells,h:new Uint8Array(points.length)},cellsX:nx,cellsY:ny};
 function findCell(x,y){
  const col=Math.max(0,Math.min(nx-1,Math.floor(x+padding))),row=Math.max(0,Math.min(ny-1,Math.floor(y+padding)));
  let best=row*nx+col,cost=Infinity;
  for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){
   const xx=col+dx,yy=row+dy;if(xx<0||yy<0||xx>=nx||yy>=ny)continue;
   const id=yy*nx+xx,p=points[id],d=(x-p[0])**2+(y-p[1])**2;
   if(d<cost){cost=d;best=id;}
  }
  return best;
 }
 return {graph,findCell,triangles:delaunay.triangles,width:nx,height:ny,padding};
}
export function executeNativeAzgaarPatch(name,seed,{trace=false}={}){
 if(!AZGAAR_TEMPLATE_SCRIPTS[name])throw RangeError('Unknown Azgaar template');
 if(!Number.isInteger(seed)||seed<0||seed>0xffffffff)throw RangeError('seed must be uint32');
 const padding=['pangea','oldWorld','peninsula'].includes(name)?40:24;
 const {graph,findCell,triangles,width,height}=createAzgaarPatchGraph(seed,{padding}),tools=createAzgaarCommandTools(templateRng(seed),findCell);
 tools.setGraph(graph,{points:10000,width:WIDTH,height:HEIGHT});
 const steps=[];
 for(const line of AZGAAR_TEMPLATE_SCRIPTS[name].split('\n')){
  const tokens=line.trim().split(/\s+/);tools.addStep(...tokens);
  if(trace)steps.push({command:line,landCells:tools.heights.filter(h=>h>=20).length,heights:tools.heights.slice()});
 }
 const heights=tools.heights.slice(),raster=new Float32Array(width*height);raster.fill(NaN);
 // Sample the same piecewise-linear surface onto a lookup raster. The graph
 // remains temporary; only the canonical spherical Grid will be persisted.
 for(let t=0;t<triangles.length;t+=3){
  const ids=triangles.subarray(t,t+3),[a,b,c]=Array.from(ids,i=>graph.points[i].map(v=>v+padding));
  const det=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);
  if(Math.abs(det)<1e-8)continue;
  const left=Math.max(0,Math.ceil(Math.min(a[0],b[0],c[0])-.5)),right=Math.min(width-1,Math.floor(Math.max(a[0],b[0],c[0])-.5));
  const top=Math.max(0,Math.ceil(Math.min(a[1],b[1],c[1])-.5)),bottom=Math.min(height-1,Math.floor(Math.max(a[1],b[1],c[1])-.5));
  for(let y=top;y<=bottom;y++)for(let x=left;x<=right;x++){
   const px=x+.5,py=y+.5,u=((b[1]-c[1])*(px-c[0])+(c[0]-b[0])*(py-c[1]))/det;
   const v=((c[1]-a[1])*(px-c[0])+(a[0]-c[0])*(py-c[1]))/det,w=1-u-v;
   if(u>=-1e-6&&v>=-1e-6&&w>=-1e-6)raster[y*width+x]=u*heights[ids[0]]+v*heights[ids[1]]+w*heights[ids[2]];
  }
 }
 for(let i=0;i<raster.length;i++)if(!Number.isFinite(raster[i]))raster[i]=heights[i];
 // Crop only surrounding sea, never attenuate the silhouette into a square.
 let x0=width,y0=height,x1=0,y1=0;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(raster[y*width+x]>=20){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
 const touchesCanvas=x0===0||y0===0||x1===width-1||y1===height-1;
 x0=Math.max(0,x0-4);y0=Math.max(0,y0-4);x1=Math.min(width-1,x1+4);y1=Math.min(height-1,y1+4);
 const w=x1-x0+1,h=y1-y0+1,cropped=new Float32Array(w*h);
 for(let y=0;y<h;y++)cropped.set(raster.subarray((y+y0)*width+x0,(y+y0)*width+x0+w),y*w);
 return {name,seed,width:w,height:h,seaLevel:20,heights:cropped,steps,touchesCanvas,
  blobPower:tools.blobPower,linePower:tools.linePower};
}
export function sampleNativePatch(map,u,v){
 if(u<0||v<0||u>1||v>1)return 0;
 const x=u*(map.width-1),y=v*(map.height-1),ix=Math.floor(x),iy=Math.floor(y);
 const jx=Math.min(map.width-1,ix+1),jy=Math.min(map.height-1,iy+1),tx=x-ix,ty=y-iy,h=map.heights;
 return (h[iy*map.width+ix]*(1-tx)+h[iy*map.width+jx]*tx)*(1-ty)+(h[jy*map.width+ix]*(1-tx)+h[jy*map.width+jx]*tx)*ty;
}
