import type {NaturalGeography,NaturalFeaturePatch} from './globalMapProject';
type River=NaturalGeography['rivers'][number];
const same=(a:number[],b:number[])=>a.every((x,i)=>Math.abs(x-b[i])<1e-6);
export function patchSessionRiver(base:NaturalGeography,patch:NaturalFeaturePatch):NaturalGeography {
 const river=base.rivers.find(r=>r.id===patch.id);if(!river)throw Error('找不到河流');
 if(patch.name!==undefined&&patch.name.length>160||patch.notes!==undefined&&patch.notes.length>10000)throw Error('資料過長');
 if(patch.geometry&&(patch.geometry.length<2||patch.geometry.length>1000||patch.geometry.some(p=>p.length!==2||!p.every(Number.isFinite)||Math.abs(p[0])>180||Math.abs(p[1])>90)))throw Error('河道控制點無效');
 const next:River={...river,...(patch.name!==undefined?{name:patch.name}:{}),...(patch.notes!==undefined?{notes:patch.notes}:{}),...(patch.geometry?{geometry:patch.geometry.map(p=>[...p])}:{})};
 return {...base,rivers:base.rivers.map(r=>{
  if(r.id===river.id)return next;
  if(!patch.geometry||r.parentId!==river.id)return r;
  const index=river.geometry.findIndex(p=>same(p,r.geometry.at(-1)!));
  if(index<0||patch.geometry.length!==river.geometry.length)return r;
  return {...r,geometry:r.geometry.map((p,i)=>i===r.geometry.length-1?[...patch.geometry![index]]:p)};
 })};
}
export function deleteSessionRiver(base:NaturalGeography,id:string):NaturalGeography {
 if(!base.rivers.some(r=>r.id===id))throw Error('找不到河流');
 return {...base,rivers:base.rivers.filter(r=>r.id!==id).map(r=>r.parentId===id?{...r,parentId:null}:r),lakes:base.lakes.map(l=>({...l,inletIds:l.inletIds.filter(i=>i!==id),outletId:l.outletId===id?null:l.outletId}))};
}
export function addSessionRiver(base:NaturalGeography,id:string,geometry:number[][],parentId:string|null=null):NaturalGeography {
 if(!id.trim()||id.length>160||base.rivers.length>=2000||base.rivers.some(r=>r.id===id))throw Error('無法新增河流');
 const points=geometry.map(p=>[...p]);
 if(parentId){const parent=base.rivers.find(r=>r.id===parentId);if(!parent)throw Error('找不到下游河流');const end=points.at(-1);if(!end)throw Error('請先繪製河道');const point=parent.geometry.reduce((a,b)=>distance(a,end)<distance(b,end)?a:b);points[points.length-1]=[...point];}
 const river:River={id,name:`新增河流 ${base.rivers.length+1}`,notes:'',geometry:points,parentId,sourceLakeId:null,mouthLakeId:null};
 const next={...base,rivers:[...base.rivers,river]};return patchSessionRiver(next,{id,geometry:points});
}
function distance(a:number[],b:number[]){const lat=(a[1]+b[1])*Math.PI/360,lon=((a[0]-b[0]+540)%360)-180;return (lon*Math.cos(lat))**2+(a[1]-b[1])**2;}
