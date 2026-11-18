// Continent-only adapter of Azgaar's heightmap-generator.ts.
// Source: Azgaar/Fantasy-Map-Generator src/model/physical/heightmap-generator.ts
// Azgaar copyright Max Haniyeu, MIT; see azgaar-template-LICENSE.txt.
// Preserves original ordered operations, hill deltas, ridge routing, trough
// routing, range prominences, strait lowering, and Uint8 height semantics.
// Geometry is adapted to a deterministic 64x64 lattice; NOT pixel-identical
// to Azgaar's native irregular graph or Alea RNG.
import {AZGAAR_TEMPLATE_SCRIPTS} from './azgaar-template-data.mjs';
import {templateRng} from './azgaar-template-engine.mjs';

const SIDE=64,N=SIDE*SIDE,SEA=20,BLOB=.98,LINE=.81;
const clamp=(n)=>Math.max(0,Math.min(100,Math.round(n)||0));
const neighbors=Array.from({length:N},(_,id)=>{
 const x=id%SIDE,y=(id/SIDE)|0,out=[];
 for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
  if(!dx&&!dy)continue;
  const nx=x+dx,ny=y+dy;
  if(nx>=0&&nx<SIDE&&ny>=0&&ny<SIDE)out.push(ny*SIDE+nx);
 }
 return out;
});
const coords=Array.from({length:N},(_,i)=>[i%SIDE,(i/SIDE)|0]);
const val=(rng,range)=>{
 const [a,b=a]=String(range).split('-').map(Number);
 if(!Number.isFinite(a)||!Number.isFinite(b))throw Error('Bad Azgaar range '+range);
 return a+(b-a)*rng();
};
const pick=(rng,rx,ry)=>{
 const x=Math.max(0,Math.min(SIDE-1,Math.round(val(rng,rx)*(SIDE-1)/100)));
 const y=Math.max(0,Math.min(SIDE-1,Math.round(val(rng,ry)*(SIDE-1)/100)));
 return y*SIDE+x;
};
function route(rng,start,end,randomness=.15,mark=true){
 const visited=new Uint8Array(N),result=[start];visited[start]=1;
 for(let step=0,cur=start;step<N&&cur!==end;step++){
  let best=-1,score=Infinity;
  const [tx,ty]=coords[end];
  for(const next of neighbors[cur]){
   if(mark&&visited[next])continue;
   const [x,y]=coords[next];
   let d=(tx-x)**2+(ty-y)**2;
   if(rng()>1-randomness)d/=2;
   if(d<score){score=d;best=next;}
  }
  if(best<0||(!mark&&visited[best]))break;
  result.push(best);visited[best]=1;cur=best;
 }
 return result;
}
function lineTerrain(heights,rng,kind,count,rangeX,rangeY,strength){
 for(let j=0;j<val(rng,count);j++){
  let start=pick(rng,rangeX,rangeY),end=0;
  if(kind==='Trough'){
   for(let t=0;t<50&&heights[start]<SEA;t++)start=pick(rng,rangeX,rangeY);
  }
  const [sx,sy]=coords[start],maxDist=kind==='Range'?SIDE/3:SIDE/2;
  for(let t=0;t<50;t++){
   const x=Math.floor(SIDE*(.1+.8*rng())),y=Math.floor(SIDE*(.15+.7*rng()));
   end=y*SIDE+x;
   const d=Math.abs(y-sy)+Math.abs(x-sx);
   if(d>=SIDE/8&&d<=maxDist)break;
  }
  const spine=route(rng,start,end,kind==='Range'?.15:.2);
  const used=new Uint8Array(N);for(const v of spine)used[v]=1;
  let frontier=spine,force=clamp(val(rng,strength)),layers=0;
  while(frontier.length){
   layers++;
   for(const id of frontier)heights[id]=clamp(heights[id]+(kind==='Range'?1:-1)*force*(.85+.3*rng()));
   force=force**LINE-1;
   if(force<2)break;
   const next=[];
   for(const id of frontier)for(const n of neighbors[id])if(!used[n]){used[n]=1;next.push(n);}
   frontier=next;
  }
  for(let k=0;k<spine.length;k+=6){
   let current=spine[k];
   for(let t=0;t<layers;t++){
    let lowest=-1;
    for(const n of neighbors[current])if(lowest<0||heights[n]<heights[lowest])lowest=n;
    if(lowest<0)break;
    heights[lowest]=clamp((heights[current]*2+heights[lowest])/3);
    current=lowest;
   }
  }
 }
}
function hills(heights,rng,kind,count,strength,rx,ry){
 for(let j=0;j<val(rng,count);j++){
  let at=pick(rng,rx,ry),h=clamp(val(rng,strength));
  if(kind==='Hill'){
   for(let attempt=0;attempt<50&&heights[at]+h>90;attempt++)at=pick(rng,rx,ry);
   const delta=new Uint8Array(N),queue=[at];delta[at]=h;
   for(let head=0;head<queue.length;head++){
    const q=queue[head];
    for(const n of neighbors[q]){
     if(delta[n])continue;
     delta[n]=clamp(delta[q]**BLOB*(.9+.2*rng()));
     if(delta[n]>1)queue.push(n);
    }
   }
   for(let i=0;i<N;i++)heights[i]=clamp(heights[i]+delta[i]);
  }else{
   for(let attempt=0;attempt<50&&heights[at]<SEA;attempt++)at=pick(rng,rx,ry);
   const used=new Uint8Array(N),queue=[at];
   for(let head=0;head<queue.length;head++){
    const q=queue[head];h=h**BLOB*(.9+.2*rng());
    if(h<1)break;
    for(const n of neighbors[q]){
     if(used[n])continue;
     heights[n]=clamp(heights[n]-h*(.9+.2*rng()));
     used[n]=1;queue.push(n);
    }
   }
  }
 }
}
function strait(heights,rng,width,direction){
 const w=Math.min(val(rng,width),SIDE/3);
 if(w<1&&rng()<w)return;
 const vertical=direction==='vertical';
 const sx=vertical?Math.floor(SIDE*(.3+.4*rng())):5;
 const sy=vertical?5:Math.floor(SIDE*(.3+.4*rng()));
 const ex=vertical?Math.floor(SIDE-sx-SIDE*.1+rng()*SIDE*.2):SIDE-5;
 const ey=vertical?SIDE-5:Math.floor(SIDE-sy-SIDE*.1+rng()*SIDE*.2);
 let cells=route(rng,sy*SIDE+sx,Math.max(0,Math.min(SIDE-1,ey))*SIDE+Math.max(0,Math.min(SIDE-1,ex)),.2);
 const seen=new Uint8Array(N),step=.1/Math.max(.1,w);
 for(let i=0;i<w;i++){
  const next=[],exp=.9-step*(w-i);
  for(const id of cells)for(const n of neighbors[id]){
   if(seen[n])continue;
   seen[n]=1;next.push(n);
   heights[n]=clamp(heights[n]**exp);
  }
  cells=next;
  if(!cells.length)break;
 }
}
function smooth(heights,fraction){
 const prior=heights.slice(),fr=Math.max(.01,fraction);
 for(let i=0;i<N;i++){
  let sum=prior[i];for(const n of neighbors[i])sum+=prior[n];
  const avg=sum/(neighbors[i].length+1);
  heights[i]=clamp((prior[i]*(fr-1)+avg)/fr);
 }
}
function mask(heights,power){
 const fr=power?Math.abs(power):1;
 for(let i=0;i<N;i++){
  const x=2*coords[i][0]/(SIDE-1)-1,y=2*coords[i][1]/(SIDE-1)-1;
  const d=(1-x*x)*(1-y*y);
  heights[i]=clamp((heights[i]*(fr-1)+heights[i]*(power<0?1-d:d))/fr);
 }
}
function modify(heights,range,add,mult){
 const [a,b]=String(range).split('-').map(Number);
 const min=range==='land'?20:range==='all'?0:a;
 const max=range==='land'||range==='all'?100:b;
 for(let i=0;i<N;i++){
  const h=heights[i];if(h<min||h>max)continue;
  let v=h;
  if(add)v=range==='land'?Math.max(v+add,20):v+add;
  if(mult!==1)v=range==='land'?(v-20)*mult+20:v*mult;
  heights[i]=clamp(v);
 }
}
function invert(heights,rng,probability,axes){
 if(rng()>=probability)return;
 const prior=heights.slice();
 for(let i=0;i<N;i++){
  const [x,y]=coords[i];
  const nx=axes==='y'?x:SIDE-x-1,ny=axes==='x'?y:SIDE-y-1;
  heights[i]=prior[ny*SIDE+nx];
 }
}
export function executeOriginalAzgaarContinent(name,seed){
 if(!['continents','pangea','oldWorld','shattered'].includes(name))
  throw RangeError('Unknown continent template: '+name);
 if(!Number.isInteger(seed)||seed<0||seed>0xffffffff)throw RangeError('Invalid uint32 seed');
 const rng=templateRng(seed),heights=new Uint8Array(N);
 for(const raw of AZGAAR_TEMPLATE_SCRIPTS[name].split('\n')){
  const [op,a,b,c,d]=raw.trim().split(/\s+/);
  switch(op){
   case 'Hill':case 'Pit': hills(heights,rng,op,a,b,c,d);break;
   case 'Range':case 'Trough':lineTerrain(heights,rng,op,a,c,d,b);break;
   case 'Strait':strait(heights,rng,a,b);break;
   case 'Smooth':smooth(heights,Number(a));break;
   case 'Mask':mask(heights,Number(a));break;
   case 'Add':modify(heights,b,Number(a),1);break;
   case 'Multiply':modify(heights,b,0,Number(a));break;
   case 'Invert':invert(heights,rng,Number(a),b);break;
   default:throw Error('Unsupported Azgaar instruction: '+op);
  }
 }
 return {name,size:SIDE,seaLevel:SEA,heights};
}
