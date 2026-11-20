// Brush distances use great-circle angles, including across the date line.
export function heightBrushChanges(grid, brush) {
 const {longitude,latitude,radius,strength,tool,mode,target}=brush??{};
 if(!Number.isFinite(longitude)||longitude< -180||longitude>180||!Number.isFinite(latitude)||Math.abs(latitude)>90||!Number.isFinite(radius)||radius<1||radius>30||!Number.isFinite(strength)||(tool==='line'?Math.abs(strength):strength)<.01||Math.abs(strength)>100||!['raise','lower','raiseGradient','lowerGradient','smooth','noise','line'].includes(tool)||!['preserve','free'].includes(mode)||!['land','ocean'].includes(target))throw Error('Invalid height brush');
 if(tool==='line'&&(!Array.isArray(brush.end)||brush.end.length!==2||!brush.end.every(Number.isFinite)||Math.abs(brush.end[0])>180||Math.abs(brush.end[1])>90))throw Error('Invalid line endpoint');
 const lon=longitude*Math.PI/180,lat=latitude*Math.PI/180;
 const center=[Math.cos(lat)*Math.cos(lon),Math.cos(lat)*Math.sin(lon),Math.sin(lat)];
 let line;
 if(tool==='line'){
  const [lon2,lat2]=brush.end.map(v=>v*Math.PI/180),end=[Math.cos(lat2)*Math.cos(lon2),Math.cos(lat2)*Math.sin(lon2),Math.sin(lat2)];
  const cosine=Math.max(-1,Math.min(1,center.reduce((s,v,i)=>s+v*end[i],0))),arc=Math.acos(cosine);
  if(arc>Math.PI-1e-6)throw Error('Ambiguous antipodal line');
  if(arc>1e-8)line={end,arc,tangent:end.map((v,i)=>(v-center[i]*cosine)/Math.sin(arc))};
 }
 const isOcean=id=>grid.oceanMask?!!grid.oceanMask[id]:grid.heights[id]<0;
 const angularLimit=Math.cos(radius*Math.PI/180);
 return grid.points.flatMap((p,id)=>{
  const h=grid.heights[id];if(mode==='preserve'&&((target==='ocean')!==isOcean(id)))return [];
  const along=p[0]*center[0]+p[1]*center[1]+p[2]*center[2];
  let closest=along;
  if(line){
   const sideways=p[0]*line.tangent[0]+p[1]*line.tangent[1]+p[2]*line.tangent[2];
   const position=Math.atan2(sideways,along);
   closest=position>=0&&position<=line.arc?Math.hypot(along,sideways):
    Math.max(along,p[0]*line.end[0]+p[1]*line.end[1]+p[2]*line.end[2]);
  }
  if(closest<angularLimit-1e-12)return [];
  const tapered=tool.endsWith('Gradient')||tool==='line';
  const angle=tapered?Math.acos(Math.min(1,closest))*180/Math.PI:0;
  const amount=tool==='line'?strength*Math.max(0,1-(angle/radius)**2):tapered?strength*Math.max(0,1-angle/radius):strength;
  let next=h;
  if(tool.startsWith('raise')||tool==='line')next=h+amount;
  else if(tool.startsWith('lower'))next=h-amount;
  else if(tool==='smooth'){
   const neighbors=grid.neighbors[id].filter(j=>mode==='free'||isOcean(j)===isOcean(id));
   const average=neighbors.length?neighbors.reduce((sum,j)=>sum+grid.heights[j],0)/neighbors.length:h;
   next=h+(average-h)*strength/100;
  }else next=h+((((Math.imul(id+1,2654435761)>>>0)%201)-100)/100)*strength;
  next=Math.max(mode==='preserve'&&h>=0?0:-100,Math.min(mode==='preserve'&&h<0?-.01:100,Math.round(next*100)/100));
  return next===h?[]:[{id,height:next}];
 });
}

/** Resample a pointer path along short spherical arcs, independent of screen zoom. */
export function sampleHeightStroke(brush,points){
 if(!Array.isArray(points)||!points.length||points.length>256||!points.every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)&&Math.abs(p[0])<=180&&Math.abs(p[1])<=90)||brush?.tool==='line'||!Number.isFinite(brush?.radius)||brush.radius<1||brush.radius>30)throw Error('Invalid height stroke');
 const vector=([lon,lat])=>{lon*=Math.PI/180;lat*=Math.PI/180;return [Math.cos(lat)*Math.cos(lon),Math.cos(lat)*Math.sin(lon),Math.sin(lat)];};
 const stamps=[{...brush,longitude:points[0][0],latitude:points[0][1]}],spacing=brush.radius*.4*Math.PI/180;
 let toNext=spacing;
 for(let i=1;i<points.length;i++){
  const a=vector(points[i-1]),b=vector(points[i]),arc=Math.acos(Math.max(-1,Math.min(1,a.reduce((s,v,k)=>s+v*b[k],0))));
  if(arc<1e-8)continue;if(arc>Math.PI-1e-6)throw Error('Ambiguous antipodal stroke');
  let position=toNext;
  for(;position<=arc+1e-10;position+=spacing){
   if(stamps.length>=511)throw Error('Height stroke is too long');
   const t=Math.min(1,position/arc),p=a.map((v,k)=>(v*Math.sin((1-t)*arc)+b[k]*Math.sin(t*arc))/Math.sin(arc));stamps.push({...brush,longitude:Math.atan2(p[1],p[0])*180/Math.PI,latitude:Math.asin(Math.max(-1,Math.min(1,p[2])))*180/Math.PI});
  }
  toNext=position-arc;
 }
 const end=points.at(-1),last=stamps.at(-1),a=vector(end),b=vector([last.longitude,last.latitude]);
 if(a.some((v,i)=>Math.abs(v-b[i])>1e-8))stamps.push({...brush,longitude:end[0],latitude:end[1]});
 return stamps;
}

/** All stamps form one atomic edit; Pack is rebuilt only after the complete stroke. */
export function heightStrokeChanges(grid,brushes){
 if(!Array.isArray(brushes)||!brushes.length||brushes.length>512)throw Error('Invalid brush batch');
 // Overlapping samples describe the brush footprint, not extra power.
 // A second deliberate pass is a separate gesture and can add more height.
 const strongest=new Map();
 for(const brush of brushes)for(const {id,height} of heightBrushChanges(grid,brush)){
  const original=grid.heights[id];
  if(!strongest.has(id)||Math.abs(height-original)>Math.abs(strongest.get(id)-original))strongest.set(id,height);
 }
 return [...strongest].sort(([a],[b])=>a-b).map(([id,height])=>({id,height}));
}

/** The same angular radius as the brush, projected as an unwrapped boundary. */
export function sphericalBrushRing(longitude,latitude,radius){
 if(![longitude,latitude,radius].every(Number.isFinite)||Math.abs(longitude)>180||Math.abs(latitude)>90||radius<1||radius>30)throw Error('Invalid brush footprint');
 const lon=longitude*Math.PI/180,lat=latitude*Math.PI/180,r=radius*Math.PI/180;
 const center=[Math.cos(lat)*Math.cos(lon),Math.cos(lat)*Math.sin(lon),Math.sin(lat)],east=[-Math.sin(lon),Math.cos(lon),0],north=[-Math.sin(lat)*Math.cos(lon),-Math.sin(lat)*Math.sin(lon),Math.cos(lat)],ring=[];
 for(let i=0;i<=64;i++){
  const angle=i/64*Math.PI*2,p=center.map((v,k)=>v*Math.cos(r)+(east[k]*Math.cos(angle)+north[k]*Math.sin(angle))*Math.sin(r));
  let x=Math.atan2(p[1],p[0])*180/Math.PI;const previous=ring.at(-1)?.[0]??longitude;
  while(x-previous>180)x-=360;while(x-previous< -180)x+=360;
  ring.push([x,Math.asin(Math.max(-1,Math.min(1,p[2])))*180/Math.PI]);
 }
 return ring;
}
