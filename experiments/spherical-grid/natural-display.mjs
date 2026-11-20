import {shapeRiverCourse} from '../../src/features/worldMap/core/riverCourse.mjs';
import {toLonLat,pathLength} from './spherical-pack.mjs';
const unwrap=(points,pole)=>{const q=points.map(p=>[...p]);for(let i=1;i<q.length;i++){while(q[i][0]-q[i-1][0]>180)q[i][0]-=360;while(q[i][0]-q[i-1][0]<-180)q[i][0]+=360;}if(pole!==undefined&&Math.abs(q.at(-1)[0]-q[0][0])>180)q.push([q.at(-1)[0],pole],[q[0][0],pole]);return q;};
export function projectNaturalGeography(pack,base,hydrology,ecosystems){
 const rings=pack.rings.map((r,i)=>unwrap(r.map(toLonLat),pack.points[i][2]>0?90:-90));
 return {pack:{cells:pack.points.length,gridParents:pack.gridRefs,rings,detail:pack.detail},ecosystems,
  rivers:base.rivers.map(r=>{const h=hydrology.rivers.find(h=>h.id===r.id),shaped=shapeRiverCourse(pack,r),course=shaped.points;return {id:r.id,name:r.name,parentId:r.parentId,streamOrder:h.streamOrder,segmentFlows:hydrology.flows.map(flow=>shaped.sourceSegments.map(index=>flow[pack.findCell(r.geometry[index])])),lines:course.slice(1).map((p,i)=>unwrap([course[i],p])),monthly:h.monthlyDischargeM3s,catchmentAreaKm2:h.catchmentAreaKm2,lengthKm:pathLength(course),basinId:h.basinId};}),
  lakes:base.lakes.map(l=>({...hydrology.lakes.find(h=>h.id===l.id),id:l.id,name:l.name,rings:l.bed.filter(b=>b.floorM<l.waterLevelM).map(b=>unwrap(b.ring,b.position[1]>0?90:-90)),waterLevelM:l.waterLevelM}))};
}
