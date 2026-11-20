// Keep a continuous centerline across the longitude seam. Split only when
// the monthly wet/dry state changes so dashes and riverbanks remain continuous.
export function buildRiverStrokes(river,month){
 const reaches=[];
 // Taper headwaters and compress the flow scale in short coastal basins.
 const scale=river.parentId?0.8:1;
 const maxWidth=(river.lengthKm??600)<300?1.05:1.9;
 let reach,last,peak=0,distance=0;
 for(const [index,[start,end]] of river.lines.entries()){
  const flow=river.segmentFlows?.[month]?.[index]??river.monthly[month]??0;
  const dry=flow<.05;
  const a=last??start;
  const b=[end[0]+360*Math.round((a[0]-end[0])/360),end[1]];
  const length=Math.hypot((b[0]-a[0])*Math.cos((a[1]+b[1])*Math.PI/360),b[1]-a[1]);
  if(length<1e-9)continue;
  if(dry)peak=0;
  else peak=Math.max(peak,flow);
  const widthAt=d=>Math.min(maxWidth,(.19+Math.log1p(peak/8)*.22)*(1-.58*Math.exp(-d/.7))*scale);
  if(!reach||reach.dry!==dry){
   reach={points:[a],widths:[widthAt(distance)],dry};
   reaches.push(reach);
  }else if(reach.points.length>1){
   // Interpolate across confluences instead of changing stroke width abruptly.
   const i=reach.widths.length-1;
   reach.widths[i]=(reach.widths[i]+widthAt(distance))/2;
  }
  distance+=length;
  reach.points.push(b);
  reach.widths.push(widthAt(distance));
  last=b;
 }
 // A long river can cross the longitude seam. Draw translated copies
 // before the canvas clips each repeated world to its own bounds.
 return reaches.flatMap(reach=>[-360,0,360].map(shift=>({
  ...reach,points:reach.points.map(([x,y])=>[x+shift,y]),
 })));
}
