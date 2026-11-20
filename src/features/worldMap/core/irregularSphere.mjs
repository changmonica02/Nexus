// Stable IDs on a deterministic perturbed icosphere, followed by a true
// spherical Delaunay/Voronoi rebuild. This is geometry, not a drawing warp.
import {generate} from '../../../../experiments/spherical-grid/grid.mjs';
import {sphericalMesh} from '../../../../experiments/spherical-grid/spherical-pack.mjs';
import {dot,cross,unit,clamp} from '../../../../experiments/spherical-grid/geologic-fields.mjs';
const random=(id,salt)=>{let h=Math.imul(id+1,0x45d9f3b)^salt;h=Math.imul(h^(h>>>16),0x45d9f3b);return ((h^(h>>>16))>>>0)/4294967296;};
export const GRID_GEOMETRY={version:2,jitterFraction:.36};
export function buildIrregularSphere(frequency){
 const regular=generate(frequency),points=regular.points.map((p,i)=>{
  const spacing=Math.min(...regular.neighbors[i].map(j=>Math.acos(clamp(dot(p,regular.points[j])))));
  const east=unit(cross(Math.abs(p[2])<.95?[0,0,1]:[0,1,0],p)),north=cross(p,east),theta=random(i,0x1af31)*2*Math.PI,arc=spacing*GRID_GEOMETRY.jitterFraction*Math.sqrt(random(i,0x835ab));
  return unit(p.map((v,k)=>v*Math.cos(arc)+(east[k]*Math.cos(theta)+north[k]*Math.sin(theta))*Math.sin(arc)));
 });
 const mesh=sphericalMesh(points);
 for(let i=0;i<mesh.triangles.length;i++){const f=mesh.triangles[i];if(dot(points[f[0]],cross(points[f[1]],points[f[2]]))<0)mesh.triangles[i]=[f[0],f[2],f[1]];}
 return {points,triangles:mesh.triangles,neighbors:mesh.neighbors,areas:mesh.areas};
}
