// Sphere-native field propagation; distances never use projected map pixels.
export const EARTH_KM=6371;
export const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
export const clamp=(v,a=-1,b=1)=>Math.max(a,Math.min(b,v));
export const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
export const unit=v=>{const n=Math.hypot(...v)||1;return v.map(x=>x/n);};
export const km=(a,b)=>EARTH_KM*Math.acos(clamp(dot(a,b)));
export class FieldHeap{
 constructor(){this.a=[];}
 push(v){const a=this.a;let i=a.length;a.push(v);while(i){const p=(i-1)>>1;if(a[p].cost<=v.cost)break;a[i]=a[p];i=p;}a[i]=v;}
 pop(){const a=this.a,out=a[0],v=a.pop();if(!a.length)return out;let i=0;while(i*2+1<a.length){let c=i*2+1;if(c+1<a.length&&a[c+1].cost<a[c].cost)c++;if(a[c].cost>=v.cost)break;a[i]=a[c];i=c;}a[i]=v;return out;}
 get length(){return this.a.length;}
}
export function sphericalField(grid,sources,{allowed=()=>true}={}){
 const distance=new Float64Array(grid.points.length),nearest=new Int32Array(grid.points.length),heap=new FieldHeap();
 distance.fill(Infinity);nearest.fill(-1);
 for(const i of sources)if(allowed(i)&&distance[i]!==0){distance[i]=0;nearest[i]=i;heap.push({cell:i,cost:0});}
 while(heap.length){
  const {cell,cost}=heap.pop();if(cost>distance[cell]+1e-8)continue;
  for(const j of grid.neighbors[cell])if(allowed(j)){
   const next=cost+km(grid.points[cell],grid.points[j]);
   if(next+1e-8<distance[j]){distance[j]=next;nearest[j]=nearest[cell];heap.push({cell:j,cost:next});}
  }
 }
 return {distance,nearest};
}
