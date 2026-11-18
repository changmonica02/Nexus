// Map symbols derived from local spherical motion, never from screen axes.
import {dot,cross,unit,km} from './geologic-fields.mjs';
const deg=p=>[Math.atan2(p[1],p[0])*180/Math.PI,Math.asin(Math.max(-1,Math.min(1,p[2])))*180/Math.PI];
const step=(p,t,a)=>unit(p.map((v,k)=>v*Math.cos(a)+t[k]*Math.sin(a)));
const line=(a,b)=>{const x=deg(a),y=deg(b);while(y[0]-x[0]>180)y[0]-=360;while(y[0]-x[0]<-180)y[0]+=360;return [x,y];};
export function createTectonicSymbols(grid,model){
 const edges=model.boundaries.map(b=>({mode:b.mode,type:b.type,lines:[line(b.start,b.end)]}));
 const marks=[],chosen=[];
 for(const [boundaryIndex,b] of model.boundaries.entries()){
  if(b.type==='inactive'||chosen.some(c=>c.mode===b.mode&&km(c.center,b.center)<480))continue;
  chosen.push(b);
  const normal=b.smoothedNormal??b.normal,p=b.center,tangent=unit(cross(p,normal));
  let direction=normal,lower=null,upper=null;
  if(b.mode==='subduction'){
   lower=b.subductingPlate;upper=b.overridingPlate;
   direction=normal.map(v=>v*(lower===b.plates[0]?1:-1));
  }
  // Triangle's base is on the contact, tooth on the overriding plate.
  const tooth=b.mode==='subduction'?[deg(step(p,tangent,-.008)),deg(step(p,direction,.022)),deg(step(p,tangent,.008))]:[];
  if(tooth.length)for(let k=1;k<tooth.length;k++){while(tooth[k][0]-tooth[0][0]>180)tooth[k][0]-=360;while(tooth[k][0]-tooth[0][0]<-180)tooth[k][0]+=360;}
  const arrows=b.type==='divergent'?[line(step(p,normal,-.010),step(p,normal,-.040)),line(step(p,normal,.010),step(p,normal,.040))]:
   b.type==='convergent'&&b.mode!=='subduction'?[line(step(p,normal,-.040),step(p,normal,-.008)),line(step(p,normal,.040),step(p,normal,.008))]:
   b.type==='transform'?[line(step(p,normal,-.012),step(step(p,normal,-.012),tangent,.035)),line(step(p,normal,.012),step(step(p,normal,.012),tangent,-.035))]:
   [line(step(p,direction,-.040),step(p,direction,.036))];
  marks.push({boundaryIndex,mode:b.mode,lower,upper,tooth,arrows,center:deg(p)});
 }
 const motion=model.domains.plates.map(plate=>{
  const sum=[0,0,0];for(let i=0;i<grid.points.length;i++)if(model.domains.owners[i]===plate.id)for(let k=0;k<3;k++)sum[k]+=grid.points[i][k]*grid.areas[i];
  const center=unit(sum);let cell=plate.seedCell,score=-Infinity;
  for(let i=0;i<grid.points.length;i++)if(model.domains.owners[i]===plate.id){const d=dot(center,grid.points[i]);if(d>score){cell=i;score=d;}}
  const p=grid.points[cell],velocity=cross(plate.pole,p).map(v=>v*plate.angularSpeed),speed=Math.hypot(...velocity);
  return {plateId:plate.id,cell,position:deg(p),relativeSpeed:speed,arrow:speed>1e-8?line(p,step(p,unit(velocity),.045+Math.min(.065,speed*1.5))):[]};
 });
 return {edges,marks,motion};
}
