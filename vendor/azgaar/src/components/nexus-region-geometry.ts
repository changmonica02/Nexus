/** Planar Voronoi footprints, not geodesic area. Water is excluded before summation. */
export function measureRegionArea(cells:{height:number;polygon:number[][]}[],calibration?:{scope:string;known:boolean;unit:string;scale:number}) {
 let relative=0;
 for(const cell of cells){if(cell.height<20)continue;let signed=0;const points=cell.polygon;for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];signed+=a[0]*b[1]-b[0]*a[1];}relative+=Math.abs(signed)/2;}
 const c=calibration;
 return c&&['region','town'].includes(c.scope)&&c.known&&c.unit==='km'&&Number.isFinite(c.scale)&&c.scale>0?{relative,km2:relative*c.scale**2}:{relative};
}
