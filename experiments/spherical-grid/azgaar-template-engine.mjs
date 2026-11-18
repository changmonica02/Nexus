// Experimental spherical-template adapter. Terrain rules are adapted from Azgaar
// Fantasy Map Generator by Max Haniyeu (MIT, license in this directory).
// Local recipes run on a bounded, deterministic lattice; their results are
// projected onto the authoritative spherical Grid, not saved as another map.
import {AZGAAR_TEMPLATE_SCRIPTS} from './azgaar-template-data.mjs';

const SIDE=64, COUNT=SIDE*SIDE, SEA=20;
const clamp=(v,lo=0,hi=100)=>Math.min(hi,Math.max(lo,v));
export function templateRng(seed){
 let a=seed>>>0;
 return ()=>{a=(a+0x6D2B79F5)>>>0;let t=Math.imul(a^(a>>>15),1|a);
 t^=t+Math.imul(t^(t>>>7),61|t);return ((t^(t>>>14))>>>0)/4294967296;};
}
const neighbours=Array.from({length:COUNT},(_,i)=>{
 const x=i%SIDE,y=Math.floor(i/SIDE),out=[];
 for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
  if(!dx&&!dy)continue;
  const xx=x+dx,yy=y+dy;
  if(xx>=0&&xx<SIDE&&yy>=0&&yy<SIDE)out.push(yy*SIDE+xx);
 }
 return out;
});
function sample(spec,rng){
 const parts=String(spec??'0').split('-'),a=Number(parts[0]),b=Number(parts[1]??parts[0]);
 if(!Number.isFinite(a)||!Number.isFinite(b))throw Error('Invalid Azgaar step number');
 return a+(b-a)*rng();
}
function count(value,rng){return Math.min(32,Math.max(0,Math.ceil(sample(value,rng))));}
function point(rx,ry,rng){
 const x=clamp(Math.round(sample(rx,rng)*(SIDE-1)/100),0,SIDE-1);
 const y=clamp(Math.round(sample(ry,rng)*(SIDE-1)/100),0,SIDE-1);
 return y*SIDE+x;
}
function randomCell(rng){return Math.floor(rng()*COUNT);}
function spread(h,seed,strength,rng,sign,decay){
 const seen=new Uint8Array(COUNT),q=[seed],power=[strength];seen[seed]=1;
 for(let head=0;head<q.length;head++){
  const at=q[head],v=power[head];
  h[at]=clamp(h[at]+sign*v);
  if(v<1.8)continue;
  for(const near of neighbours[at]){
   if(seen[near])continue;
   seen[near]=1;
   const next=Math.pow(v,decay)*(.89+rng()*.2);
   if(next>=1.5){q.push(near);power.push(next);}
  }
 }
}
function path(from,to,rng){
 let cur=from;const seen=new Uint8Array(COUNT),result=[from];seen[from]=1;
 const tx=to%SIDE,ty=(to/SIDE)|0;
 for(let steps=0;steps<COUNT&&cur!==to;steps++){
  let best=-1,score=Infinity;
  for(const next of neighbours[cur]){
   if(seen[next])continue;
   const dx=(next%SIDE)-tx,dy=((next/SIDE)|0)-ty;
   const d=dx*dx+dy*dy;
   const cost=d*(.75+rng()*.5);
   if(cost<score){score=cost;best=next;}
  }
  if(best<0)break;
  cur=best;seen[cur]=1;result.push(cur);
 }
 return result;
}
function addLine(h,from,to,strength,rng,sign){
 const route=path(from,to,rng),visited=new Uint8Array(COUNT);
 let frontier=route.slice(),v=strength;
 for(const i of frontier)visited[i]=1;
 for(let layer=0;layer<18&&frontier.length&&v>1.5;layer++){
  const next=[];
  for(const cell of frontier){
   h[cell]=clamp(h[cell]+sign*v*(.85+rng()*.3));
   for(const n of neighbours[cell])if(!visited[n]){visited[n]=1;next.push(n);}
  }
  frontier=next;v=Math.pow(v,.83)-1;
 }
}
function strait(h,width,direction,rng){
 const vertical=direction!=='horizontal';
 const a=vertical?point('30-70','4-12',rng):point('4-12','30-70',rng);
 const b=vertical?point('30-70','88-96',rng):point('88-96','30-70',rng);
 const route=path(a,b,rng);
 let frontier=route,seen=new Uint8Array(COUNT);
 for(const i of route)seen[i]=1;
 for(let layer=0;layer<Math.max(1,Math.ceil(width));layer++){
  const next=[];
  for(const id of frontier){
   h[id]=Math.min(h[id],layer===0?1:SEA-2);
   for(const n of neighbours[id])if(!seen[n]){seen[n]=1;next.push(n);}
  }
  frontier=next;
 }
}
function smooth(h,fr){
 const prev=h.slice(),weight=Math.max(1,fr);
 for(let i=0;i<COUNT;i++){
  let total=prev[i];for(const n of neighbours[i])total+=prev[n];
  const mean=total/(neighbours[i].length+1);
  h[i]=clamp((prev[i]*(weight-1)+mean)/weight);
 }
}
function modify(h,mode,amount,mult){
 const bounds=mode==='land'?[SEA,100]:mode==='all'?[0,100]:String(mode).split('-').map(Number);
 const min=bounds[0],max=bounds[1]??bounds[0];
 for(let i=0;i<COUNT;i++){
  if(h[i]<min||h[i]>max)continue;
  const base=mode==='land'?SEA:0;
  h[i]=clamp(Math.max(base,(h[i]+amount-base)*mult+base));
 }
}
function mask(h,power){
 const fr=Math.max(1,Math.abs(power));
 for(let i=0;i<COUNT;i++){
  const x=2*(i%SIDE)/(SIDE-1)-1,y=2*Math.floor(i/SIDE)/(SIDE-1)-1;
  const attenuation=Math.max(0,(1-x*x)*(1-y*y));
  const factor=power<0?1-attenuation:attenuation;
  h[i]=clamp((h[i]*(fr-1)+h[i]*factor)/fr);
 }
}
function invert(h,chance,axes,rng){
 if(rng()>=chance)return;
 const old=h.slice();
 for(let i=0;i<COUNT;i++){
  const x=i%SIDE,y=Math.floor(i/SIDE);
  const nx=axes==='y'?x:SIDE-x-1,ny=axes==='x'?y:SIDE-y-1;
  h[i]=old[ny*SIDE+nx];
 }
}
/** Runs an original Azgaar step script with a local seeded RNG, no globals. */
export function executeAzgaarTemplate(name,seed){
 const script=AZGAAR_TEMPLATE_SCRIPTS[name];
 if(!script)throw RangeError('Unknown Azgaar template: '+name);
 const rng=templateRng(seed),heights=new Float32Array(COUNT);
 for(const line of script.split('\n')){
  const [op,a,b,c,d]=line.trim().split(/\s+/);
  switch(op){
   case 'Hill':case 'Pit':{
    for(let n=count(a,rng);n>0;n--)spread(heights,point(c,d,rng),sample(b,rng),rng,op==='Hill'?1:-1,.97);
    break;
   }
   case 'Range':case 'Trough':{
    for(let n=count(a,rng);n>0;n--){
     const start=point(c,d,rng),end=randomCell(rng);
     addLine(heights,start,end,sample(b,rng),rng,op==='Range'?1:-1);
    }
    break;
   }
   case 'Strait':strait(heights,sample(a,rng),b,rng);break;
   case 'Smooth':smooth(heights,sample(a,rng));break;
   case 'Mask':mask(heights,Number(a));break;
   case 'Invert':invert(heights,Number(a),b,rng);break;
   case 'Add':modify(heights,b,Number(a),1);break;
   case 'Multiply':modify(heights,b,0,Number(a));break;
   default:throw Error('Unsupported Azgaar template tool: '+op);
  }
 }
 return {name,size:SIDE,seaLevel:SEA,heights};
}
export function sampleTemplate(map,u,v){
 // Bilinear sampling of a local template; outside the patch is ocean.
 if(!Number.isFinite(u)||!Number.isFinite(v)||u<0||v<0||u>1||v>1)return 0;
 const x=u*(SIDE-1),y=v*(SIDE-1),ix=Math.floor(x),iy=Math.floor(y);
 const x1=Math.min(SIDE-1,ix+1),y1=Math.min(SIDE-1,iy+1),fx=x-ix,fy=y-iy;
 const a=map.heights[iy*SIDE+ix],b=map.heights[iy*SIDE+x1];
 const c=map.heights[y1*SIDE+ix],d=map.heights[y1*SIDE+x1];
 return (a*(1-fx)+b*fx)*(1-fy)+(c*(1-fx)+d*fx)*fy;
}
