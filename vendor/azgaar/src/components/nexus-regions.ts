// Presentation-only Nexus regions; never writes native states/provinces or geography.
import {viewport} from './viewport';
export type CellRegion={type:'cells';meshId:string;cellCount:number;cells:number[]};
type Region={placementId:string;entityId:string;name:string;entityType:string;geometry:CellRegion;visible:boolean};
const NS='http://www.w3.org/2000/svg';
let regions:Region[]=[],scope='world',send:(data:unknown)=>void=()=>{},meshId='',vertices:unknown;
let draft:{id:string;placementId:string;geometry:CellRegion}|null=null,undo:number[][]=[],redo:number[][]=[],before:number[]|null=null;
let radius=24,erase=false,last:{x:number;y:number}|null=null,pinching=false;
const pointers=new Set<number>();
const land=(cell:number)=>Number.isSafeInteger(cell)&&cell>=0&&cell<pack.cells.i.length&&pack.cells.h[cell]>=20;
const polygon=(cell:number)=>pack.cells.v[cell].map(v=>pack.vertices.p[v]);
function cellArea(cell:number){const points=polygon(cell);let sum=0;for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];sum+=a[0]*b[1]-b[0]*a[1];}return Math.abs(sum)/2;}
function area(cells:number[]){
 const relative=cells.filter(land).reduce((sum,c)=>sum+cellArea(c),0),unit=options.map.units.distance;
 return ['region','town'].includes(scope)&&options.map.nexus?.scaleKnown&&unit.unit==='km'&&unit.scale>0&&Number.isFinite(unit.scale)?{relative,km2:relative*unit.scale**2}:{relative};
}
async function mesh(){if(vertices===pack.vertices.p&&meshId)return;const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify([pack.cells.v,pack.vertices.p])));meshId=Array.from(new Uint8Array(hash),v=>v.toString(16).padStart(2,'0')).join('');vertices=pack.vertices.p;}
const compatible=(g:CellRegion)=>g.meshId===meshId&&g.cellCount===pack.cells.i.length;
function report(){send({type:'region-stats',meshId,stats:regions.map(r=>({placementId:r.placementId,compatible:compatible(r.geometry),area:compatible(r.geometry)?area(r.geometry.cells):null}))});}
function emit(){if(draft)send({type:'region-draft',requestId:draft.id,geometry:draft.geometry,area:area(draft.geometry.cells),undo:!!undo.length,redo:!!redo.length});}
function path(cells:number[]){const edges=new Map<string,[number,number]>();let fill='';for(const c of cells){if(!land(c))continue;const vs=pack.cells.v[c];fill+='M'+polygon(c).map(p=>p.join(',')).join('L')+'Z';for(let i=0;i<vs.length;i++){const a=vs[i],b=vs[(i+1)%vs.length],key=a<b?a+':'+b:b+':'+a;if(edges.has(key))edges.delete(key);else edges.set(key,[a,b]);}}return {fill,border:[...edges.values()].map(([a,b])=>'M'+pack.vertices.p[a].join(',')+'L'+pack.vertices.p[b].join(',')).join('')};}
function draw(includeDraft=true){
 document.getElementById('nexus-regions')?.remove();const view=document.getElementById('viewbox');if(!view)return;const group=document.createElementNS(NS,'g');group.id='nexus-regions';
 const sources=regions.filter(r=>r.visible&&compatible(r.geometry)&&(!includeDraft||!draft||r.placementId!==draft.placementId));
 for(const r of [...sources].sort((a,b)=>Number(a.entityType==='administrative_area')-Number(b.entityType==='administrative_area')))add(r.geometry.cells,r.placementId,r.entityType==='country'?'#627fc4':'#bc8450');
 if(includeDraft&&draft)add(draft.geometry.cells,draft.placementId,'#d45b2b');
 function add(cells:number[],id:string,color:string){const item=document.createElementNS(NS,'g');item.dataset.placementId=id;const d=path(cells),fill=document.createElementNS(NS,'path'),border=document.createElementNS(NS,'path');fill.setAttribute('d',d.fill);fill.setAttribute('fill',color);fill.setAttribute('fill-opacity','.24');fill.setAttribute('stroke','none');border.setAttribute('d',d.border);border.setAttribute('stroke',color);border.setAttribute('stroke-width','1.5');border.setAttribute('vector-effect','non-scaling-stroke');border.setAttribute('fill','none');item.append(fill,border);group.append(item);}
 view.insertBefore(group,document.getElementById('nexus-placements'));
}
async function configure(value:Region[],mapScope:string,notify:(data:unknown)=>void){regions=value;scope=mapScope;send=notify;await mesh();draw();report();}
async function command(s:{action:string;id?:string;placementId?:string;geometry?:CellRegion;radius?:number;erase?:boolean}){
 await mesh();
 if(s.action==='start'){if(customization)throw Error('Complete the active heightmap/edit mode before saving or exporting');if(s.geometry&&!compatible(s.geometry))throw Error('Region mesh changed; keep the saved territory');if(draft?.id===s.id)return;draft={id:s.id!,placementId:s.placementId!,geometry:s.geometry?structuredClone(s.geometry):{type:'cells',meshId,cellCount:pack.cells.i.length,cells:[]}};undo=[];redo=[];radius=24;erase=false;}
 else if(s.action==='cancel'){draft=null;before=null;last=null;pointers.clear();pinching=false;}
 else if(s.action==='brush'){radius=Math.max(4,Math.min(100,s.radius??radius));erase=s.erase??erase;}
 else if(s.action==='undo'&&draft&&undo.length){redo.push(draft.geometry.cells);draft.geometry={...draft.geometry,cells:undo.pop()!};}
 else if(s.action==='redo'&&draft&&redo.length){undo.push(draft.geometry.cells);draft.geometry={...draft.geometry,cells:redo.pop()!};}
 const map=document.getElementById('map');if(map)map.style.touchAction=draft?'none':'';draw();emit();report();
}
function point(e:PointerEvent){const view=document.getElementById('viewbox') as unknown as SVGGElement,m=view.getScreenCTM();return m?new DOMPoint(e.clientX,e.clientY).matrixTransform(m.inverse()):null;}
function paint(x:number,y:number){if(!draft)return;const cells=new Set(draft.geometry.cells),r=radius/viewport.scale;const apply=(px:number,py:number)=>{for(const c of pack.cells.i){if(!land(c))continue;const p=pack.cells.p[c];if((p[0]-px)**2+(p[1]-py)**2<=r*r){if(erase)cells.delete(c);else cells.add(c);}}};if(last){const steps=Math.ceil(Math.hypot(x-last.x,y-last.y)/(r/2));for(let i=1;i<steps;i++)apply(last.x+(x-last.x)*i/steps,last.y+(y-last.y)*i/steps);}apply(x,y);last={x,y};draft.geometry={...draft.geometry,cells:[...cells].sort((a,b)=>a-b)};draw();emit();}
for(const type of ['pointerdown','pointermove','pointerup','pointercancel'] as const)document.addEventListener(type,e=>{
 if(!draft||customization)return;
 if(type==='pointerdown'){if(!(e.target as Element)?.closest?.('#map'))return;pointers.add(e.pointerId);if(pointers.size>1){pinching=true;if(before)draft.geometry={...draft.geometry,cells:before};before=null;last=null;draw();emit();return;}before=[...draft.geometry.cells];last=null;(document.getElementById('map') as unknown as SVGSVGElement).setPointerCapture(e.pointerId);}
 if(pinching){if(type==='pointerup'||type==='pointercancel')pointers.delete(e.pointerId);return;}
 if(!pointers.has(e.pointerId))return;e.preventDefault();e.stopImmediatePropagation();
 if(type==='pointerdown'||type==='pointermove'){const p=point(e);if(p)paint(p.x,p.y);}else{if(type==='pointercancel'&&before)draft.geometry={...draft.geometry,cells:before};else if(before&&JSON.stringify(before)!==JSON.stringify(draft.geometry.cells)){undo.push(before);if(undo.length>50)undo.shift();redo=[];}before=null;last=null;pointers.delete(e.pointerId);draw();emit();}
},{capture:true,passive:false});
for(const type of ['mousedown','mouseup','click','dblclick','touchstart','touchmove','touchend'])document.addEventListener(type,e=>{if(!draft)return;if(typeof TouchEvent!=='undefined'&&e instanceof TouchEvent&&(pinching||e.touches.length>1)){if(e.type==='touchend'&&!e.touches.length)pinching=false;return;}if((e.target as Element)?.closest?.('#map')){e.preventDefault();e.stopImmediatePropagation();}},{capture:true,passive:false});
export const NexusRegions={configure,command,draw,active:()=>!!draft,pointCells:(points:{placementId:string;x:number;y:number}[])=>points.map(p=>({placementId:p.placementId,cell:Pack.findCell(p.x,p.y)}))};
