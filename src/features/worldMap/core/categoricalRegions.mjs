import {createCoastSurface} from './coastSurface.mjs';
/** Merge categorical Voronoi cells before rasterization, removing internal edges.
 * @param {{points:number[][],triangles:number[][]}} mesh
 * @param {ArrayLike<number>} values
 * @param {string[]} colors
 */
export function categoricalRegions(mesh,values,colors){
 return [...new Set(Array.from(values))].sort((a,b)=>a-b).map(value=>{
  const mask=Uint8Array.from(values,v=>v===value?0:1);
  const surface=createCoastSurface(mesh,mask,{voronoi:true,smooth:false});
  return {value,color:colors[value],rings:surface.land,inverse:surface.inverse};
 });
}
