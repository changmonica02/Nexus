import type {NaturalMapDrawing} from './globalMapGeometry';
/** Realm extension plus one authoritative coast prevents coarse-cell slivers. */
export function ecosystemDrawBands(n:NaturalMapDrawing,seabed=false){
 const e=n.ecosystems;
 if(e.habitatCatalog&&e.landSurface&&e.seaSurface){
  const catalog=e.habitatCatalog;
  return (['land','sea'] as const).flatMap(clip=>{
   const values=clip==='land'?e.landSurface!:(seabed?e.seaFloor??e.seaSurface!:e.seaSurface!);
   return catalog.map((c,i)=>({color:c[3],clip,rings:n.pack.rings.filter((_,j)=>values[j]===i)})).filter(b=>b.rings.length);
  });
 }
 const values=seabed?e.seabed:e.surface;
 return e.catalog.map((c,i)=>({color:c[3],clip:c[0].startsWith('M')?'sea' as const:'land' as const,rings:n.pack.rings.filter((_,j)=>values[j]===i)}));
}
export function createEcosystemPaths(n:NaturalMapDrawing,seabed=false){
 if(typeof Path2D==='undefined')return [];
 return ecosystemDrawBands(n,seabed).map(band=>{
  const path=new Path2D();
  for(const ring of band.rings)for(const shift of [-360,0,360]){
   ring.forEach(([x,y],i)=>i?path.lineTo(x+shift,y):path.moveTo(x+shift,y));path.closePath();
  }
  return {color:band.color,clip:band.clip,path};
 });
}
