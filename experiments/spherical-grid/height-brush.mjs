// Brush distances use great-circle angles, including across the date line.
export function heightBrushChanges(grid, brush) {
 const {longitude,latitude,radius,strength,tool,mode,target}=brush??{};
 if(!Number.isFinite(longitude)||longitude< -180||longitude>180||!Number.isFinite(latitude)||Math.abs(latitude)>90||!Number.isFinite(radius)||radius<1||radius>30||!Number.isInteger(strength)||strength<1||strength>100||!['raise','lower','raiseGradient','lowerGradient','smooth','noise','line'].includes(tool)||!['preserve','free'].includes(mode)||!['land','ocean'].includes(target))throw Error('Invalid height brush');
 if(tool==='line'&&(!Array.isArray(brush.end)||brush.end.length!==2||!brush.end.every(Number.isFinite)||Math.abs(brush.end[0])>180||Math.abs(brush.end[1])>90))throw Error('Invalid line endpoint');
 const lon=longitude*Math.PI/180,lat=latitude*Math.PI/180;
 const center=[Math.cos(lat)*Math.cos(lon),Math.cos(lat)*Math.sin(lon),Math.sin(lat)];
 const centers=[center];
 if(tool==='line'){
  const [lon2,lat2]=brush.end.map(v=>v*Math.PI/180),end=[Math.cos(lat2)*Math.cos(lon2),Math.cos(lat2)*Math.sin(lon2),Math.sin(lat2)];
  const arc=Math.acos(Math.max(-1,Math.min(1,center.reduce((s,v,i)=>s+v*end[i],0))));
  if(arc>Math.PI-1e-6)throw Error('Ambiguous antipodal line');
  if(arc>1e-8){const steps=Math.ceil(arc*180/Math.PI/Math.min(radius/2,1));for(let j=1;j<=steps;j++){const t=j/steps;centers.push(center.map((v,i)=>(v*Math.sin((1-t)*arc)+end[i]*Math.sin(t*arc))/Math.sin(arc)));}}
 }
 return grid.points.flatMap((p,id)=>{
  const h=grid.heights[id];if(mode==='preserve'&&((target==='land')!==(h>=0)))return [];
  const angle=Math.acos(Math.max(-1,Math.min(1,Math.max(...centers.map(c=>p.reduce((s,v,i)=>s+v*c[i],0))))))*180/Math.PI;
  if(angle>radius)return [];
  const amount=tool.endsWith('Gradient')?Math.max(1,Math.round(strength*(1-angle/radius))):strength;
  let next=(tool.startsWith('raise')||tool==='line')?h+amount:tool.startsWith('lower')?h-amount:tool==='smooth'?h+(grid.neighbors[id].reduce((s,j)=>s+grid.heights[j],0)/grid.neighbors[id].length-h)*strength/100:h+((((Math.imul(id+1,2654435761)>>>0)%201)-100)/100)*strength;
  next=Math.max(mode==='preserve'&&h>=0?0:-100,Math.min(mode==='preserve'&&h<0?-1:100,Math.round(next)));
  return next===h?[]:[{id,height:next}];
 });
}
