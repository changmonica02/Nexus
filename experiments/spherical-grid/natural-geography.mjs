import {toLonLat} from './spherical-pack.mjs';
import {validateLakeLevel,deriveHydrology,lakeRimForBed} from './pack-hydrology.mjs';
export function validateNaturalGeography(base){
 const position=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)&&Math.abs(p[0])<=180&&Math.abs(p[1])<=90;
 const text=x=>typeof x==='string'&&x.length<=10000;
 if(!base||base.version!==1||!Array.isArray(base.rivers)||base.rivers.length>2000||!Array.isArray(base.lakes)||base.lakes.length>128||!Array.isArray(base.overlays)||base.overlays.length>256)throw Error('Invalid natural geography');
 const ids=new Set();
 for(const f of [...base.rivers,...base.lakes]){if(!f||typeof f.id!=='string'||!f.id||f.id.length>160||ids.has(f.id)||!text(f.name)||!f.name.trim()||f.name.length>160||!text(f.notes))throw Error('Invalid or duplicate natural feature identity');ids.add(f.id);}
 const riverIds=new Set(base.rivers.map(r=>r.id)),lakeIds=new Set(base.lakes.map(l=>l.id));
 let vertices=0;
 for(const r of base.rivers){
  if(!Array.isArray(r.geometry)||r.geometry.length<2||r.geometry.length>1000||!r.geometry.every(position)||!(r.parentId===null||riverIds.has(r.parentId))||!(r.sourceLakeId===null||lakeIds.has(r.sourceLakeId))||!(r.mouthLakeId===null||lakeIds.has(r.mouthLakeId)))throw Error('Invalid river geometry or relations');vertices+=r.geometry.length;
  let current=r,seen=new Set();while(current.parentId!==null){if(seen.has(current.id))throw Error('River identity cycle');seen.add(current.id);current=base.rivers.find(v=>v.id===current.parentId);}
 }
 for(const l of base.lakes){
  if(!Array.isArray(l.rim)||!l.rim.length||l.rim.length>1000||!l.rim.every(r=>position(r.position)&&Number.isFinite(r.heightM)&&r.heightM>0&&r.heightM<=10000)||!Number.isFinite(l.waterLevelM)||l.waterLevelM< -1000||l.waterLevelM>10000||!Array.isArray(l.bed)||!l.bed.length||l.bed.length>300||!Array.isArray(l.inletIds)||!l.inletIds.every(id=>riverIds.has(id))||!(l.outletId===null||riverIds.has(l.outletId)))throw Error('Invalid lake');
  for(const b of l.bed){if(!b||!position(b.position)||!Number.isFinite(b.floorM)||b.floorM< -11000||b.floorM>10000||!Number.isFinite(b.areaKm2)||b.areaKm2<=0||!Array.isArray(b.ring)||b.ring.length<3||b.ring.length>30||!b.ring.every(position))throw Error('Invalid lake bed / shoreline');vertices+=b.ring.length;}
  const edges=new Map(),neighbors=l.bed.map(()=>new Set());
  l.bed.forEach((b,i)=>b.ring.forEach((p,k)=>{const q=b.ring[(k+1)%b.ring.length],key=[p.join(','),q.join(',')].sort().join('|');if(edges.has(key)){const j=edges.get(key);neighbors[i].add(j);neighbors[j].add(i);}else edges.set(key,i);}));
  const connected=new Set([0]),queue=[0];for(let k=0;k<queue.length;k++)for(const j of neighbors[queue[k]])if(!connected.has(j)){connected.add(j);queue.push(j);}
  if(connected.size!==l.bed.length)throw Error('Lake authored shoreline must be connected');

 }
 for(const o of base.overlays)if(!o||!text(o.id)||!text(o.name)||!text(o.description)||!Array.isArray(o.geometry)||!o.geometry.every(position))throw Error('Invalid fantasy overlay');
 if(vertices>100000)throw Error('Natural geography has too many vertices');
}
export function editNaturalGeography(pack,climate,base,patch){
 validateNaturalGeography(base);const next=JSON.parse(JSON.stringify(base)),feature=[...next.rivers,...next.lakes].find(f=>f.id===patch.id);
 if(!feature)throw Error('Unknown natural feature');
 if(patch.name!==undefined)feature.name=patch.name.trim();if(patch.notes!==undefined)feature.notes=patch.notes;
 if(next.rivers.includes(feature)){
  if(patch.geometry!==undefined){
   const old=feature.geometry;
   for(const tributary of next.rivers.filter(r=>r.parentId===feature.id)){
    const end=tributary.geometry.at(-1),anchor=old.findIndex(p=>Math.abs(p[0]-end[0])<1e-6&&Math.abs(p[1]-end[1])<1e-6);
    if(anchor>=0){
     // Insertions/deletions preserve exact old points; a moved point uses its
     // corresponding index when the vertex count is unchanged.
     const exact=patch.geometry.find(p=>Math.abs(p[0]-end[0])<1e-6&&Math.abs(p[1]-end[1])<1e-6);
     let target=exact??(old.length===patch.geometry.length?patch.geometry[anchor]:undefined);
     if(!target)target=patch.geometry.reduce((a,b)=>Math.hypot(a[0]-end[0],a[1]-end[1])<Math.hypot(b[0]-end[0],b[1]-end[1])?a:b);
     tributary.geometry[tributary.geometry.length-1]=[...target];
    }
   }
   feature.geometry=patch.geometry;
  }
 }else{
  if(patch.waterLevelM!==undefined)feature.waterLevelM=patch.waterLevelM;
  if(patch.bed!==undefined){
   if(!Array.isArray(patch.bed)||!patch.bed.length||patch.bed.length>300||patch.bed.some(p=>!Array.isArray(p)||p.length!==3||!p.every(Number.isFinite)||Math.abs(p[0])>180||Math.abs(p[1])>90))throw Error('Invalid bed coordinates');
   feature.bed=patch.bed.map(([lon,lat,floorM])=>{const i=pack.findCell([lon,lat]);return {position:toLonLat(pack.points[i]),floorM,areaKm2:pack.catchmentAreas[i],ring:pack.rings[i].map(toLonLat)};});
   feature.rim=lakeRimForBed(pack,feature.bed);
  }
  validateLakeLevel(pack,feature);
 }
 validateNaturalGeography(next);const hydro=deriveHydrology(pack,climate,next,{repairProjection:patch.geometry===undefined&&patch.bed===undefined});
 if(patch.geometry!==undefined||patch.bed!==undefined){
  const owners=new Map();for(const r of [...hydro.rivers].sort((a,b)=>b.catchmentAreaKm2-a.catchmentAreaKm2))for(const i of r.path.slice(0,-1))if(!owners.has(i))owners.set(i,r.id);
  for(const r of next.rivers){const path=hydro.rivers.find(h=>h.id===r.id).path,end=path.at(-1),li=hydro.lakeAt[end];r.mouthLakeId=li>=0?next.lakes[li].id:null;r.parentId=pack.heights[end]>=0&&!r.mouthLakeId?(owners.get(end)??null):null;if(r.parentId===r.id)r.parentId=null;
   r.sourceLakeId=null;for(let i=0;i<next.lakes.length;i++)if(next.lakes[i].bed.some(b=>hydro.receiver[pack.findCell(b.position)]===path[0]))r.sourceLakeId=next.lakes[i].id;
  }
  for(const l of next.lakes){l.inletIds=next.rivers.filter(r=>r.mouthLakeId===l.id).map(r=>r.id);l.outletId=next.rivers.find(r=>r.sourceLakeId===l.id)?.id??null;}
  validateNaturalGeography(next);
 }
 return next;
}
