// Priority flood establishes spill heights without inventing an epsilon slope.
// Flat terrain drains by physical distance to an outlet, not heap visit order.
import {FieldHeap,km} from '../../../../experiments/spherical-grid/geologic-fields.mjs';
export function buildDrainageGraph(grid,{heights=grid.heights,ocean=Uint8Array.from(grid.heights,h=>h<0?1:0)}={}){
 const n=heights.length,filled=new Float64Array(n),seen=new Uint8Array(n),heap=new FieldHeap(),receivers=new Int32Array(n);receivers.fill(-1);
 for(let i=0;i<n;i++)if(ocean[i]){seen[i]=1;heap.push({cell:i,cost:0});}
 while(heap.length){const {cell,cost}=heap.pop();filled[cell]=cost;for(const j of grid.neighbors[cell])if(!seen[j]){seen[j]=1;heap.push({cell:j,cost:Math.max(cost,heights[j])});}}
 if(seen.some(v=>!v))throw Error('Terrain requires an ocean-connected drainage outlet');
 const flatDistance=new Float64Array(n);flatDistance.fill(Infinity);const exits=new FieldHeap(),epsilon=1e-7;
 for(let i=0;i<n;i++){
  if(ocean[i]){flatDistance[i]=0;exits.push({cell:i,cost:0});continue;}
  let best=0;
  for(const j of grid.neighbors[i]){const drop=filled[i]-filled[j];if(drop<=epsilon)continue;const slope=drop/km(grid.points[i],grid.points[j]);if(slope>best){best=slope;receivers[i]=j;}}
  if(receivers[i]>=0){flatDistance[i]=0;exits.push({cell:i,cost:0});}
 }
 while(exits.length){const {cell,cost}=exits.pop();if(cost>flatDistance[cell]+epsilon)continue;
  for(const j of grid.neighbors[cell])if(!ocean[j]&&Math.abs(filled[cell]-filled[j])<=epsilon){const next=cost+km(grid.points[cell],grid.points[j]);if(next+epsilon<flatDistance[j]){flatDistance[j]=next;exits.push({cell:j,cost:next});}}
 }
 for(let i=0;i<n;i++)if(!ocean[i]&&receivers[i]<0){let best=-Infinity;
  for(const j of grid.neighbors[i])if(Math.abs(filled[i]-filled[j])<=epsilon&&flatDistance[j]+epsilon<flatDistance[i]){const slope=(flatDistance[i]-flatDistance[j])/km(grid.points[i],grid.points[j]);if(slope>best){best=slope;receivers[i]=j;}}
  if(receivers[i]<0)throw Error('Flat terrain has no draining path');
 }
 const degree=new Uint32Array(n);for(const j of receivers)if(j>=0)degree[j]++;
 const upstream=[];for(let i=0;i<n;i++)if(!degree[i])upstream.push(i);
 for(let k=0;k<upstream.length;k++){const j=receivers[upstream[k]];if(j>=0&&!--degree[j])upstream.push(j);}
 if(upstream.length!==n)throw Error('Drainage creates a cycle');
 const order=upstream.reverse(),rank=new Int32Array(n);order.forEach((id,i)=>{rank[id]=i;});
 return {filled,receivers,flatDistance,order,rank};
}
