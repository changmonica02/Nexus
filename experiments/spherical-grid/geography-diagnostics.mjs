// Developer evidence: exact land-mask morphology, not elevation-colour ratios.
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
export function geographyDiagnostics(grid){
 const n=grid.heights.length,total=grid.areas.reduce((s,a)=>s+a,0),visited=new Uint8Array(n),land=[],ocean=[];
 const bands=Array.from({length:48},()=>({land:0,area:0}));let landArea=0,coastKm=0;
 for(let i=0;i<n;i++){
  const p=grid.points[i],x=Math.min(11,Math.floor((Math.atan2(p[1],p[0])+Math.PI)/(Math.PI*2)*12)),z=Math.min(3,Math.floor((p[2]+1)*2)),b=bands[z*12+x];
  b.area+=grid.areas[i];if(grid.heights[i]>=0){b.land+=grid.areas[i];landArea+=grid.areas[i];}
  if(visited[i])continue;
  const terrestrial=grid.heights[i]>=0,q=[i];visited[i]=1;let area=0;
  for(let k=0;k<q.length;k++){
   const c=q[k];area+=grid.areas[c];
   for(const j of grid.neighbors[c])if(!visited[j]&&(grid.heights[j]>=0)===terrestrial){visited[j]=1;q.push(j);}
  }
  (terrestrial?land:ocean).push({area,cells:q.length});
 }
 // Density bands above are assigned separately: component traversal must not
 // skip their per-cell area accumulation (the i loop always accumulates it).
 for(let i=0;i<n;i++)for(const j of grid.neighbors[i])if(j>i&&(grid.heights[i]>=0)!==(grid.heights[j]>=0)){
  coastKm+=6371*Math.acos(Math.max(-1,Math.min(1,dot(grid.points[i],grid.points[j]))));
 }
 land.sort((a,b)=>b.area-a.area);ocean.sort((a,b)=>b.area-a.area);
 const fractions=bands.map(b=>b.land/b.area),mean=landArea/total;
 return {landPercent:mean*100,majorLandmasses:land.filter(c=>c.area/total>.005).length,
  landComponents:land.length,largestLandPercent:100*(land[0]?.area??0)/total,
  largestOceanShare:(ocean[0]?.area??0)/(total-landArea),
  emptySectors:fractions.filter(x=>x<.05).length,denseSectors:fractions.filter(x=>x>.65).length,
  densityDeviation:Math.sqrt(bands.reduce((s,b)=>s+b.area/total*(b.land/b.area-mean)**2,0)),
  tinyLandFraction:land.filter(c=>c.cells<=2).reduce((s,c)=>s+c.area,0)/landArea,
  densityBands:fractions,coastEdgeKm:coastKm};
}
