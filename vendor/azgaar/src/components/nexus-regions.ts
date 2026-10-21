// Presentation-only Nexus regions; never writes native states/provinces or geography.
import {measureRegionArea} from './nexus-region-geometry';
import {viewport} from './viewport';
export type CellRegion={type:'cells';meshId:string;cellCount:number;cells:number[]};
type Region={placementId:string;entityId:string;name:string;entityType:string;geometry:CellRegion;visible:boolean;distribution?:{color?:string;opacity?:number}};
let viewMode={layer:'physical',selected:null as string|null};
let pathCache=new WeakMap<number[],{fill:string;border:string}>();
let membership=new Map<number,Region[]>();
let redrawFrame=0;
let distributionCache:SVGGElement|null=null,cacheDraft:string|null|undefined;
const NS='http://www.w3.org/2000/svg';
let regions:Region[]=[],scope='world',send:(data:unknown)=>void=()=>{},meshId='',vertices:unknown;
let draft:{id:string;placementId:string;name:string;geometry:CellRegion}|null=null,undo:number[][]=[],redo:number[][]=[],before:number[]|null=null;
let radius=24,erase=false,last:{x:number;y:number}|null=null,pinching=false;
const pointers=new Set<number>();
let previousTouchAction:string|null=null;
const land=(cell:number)=>Number.isSafeInteger(cell)&&cell>=0&&cell<pack.cells.i.length&&pack.cells.h[cell]>=20;
const polygon=(cell:number)=>pack.cells.v[cell].map(v=>pack.vertices.p[v]);
function area(cells:number[]){const unit=options.map.units.distance;return measureRegionArea(cells.filter(land).map(c=>({height:pack.cells.h[c],polygon:polygon(c)})),{scope,known:!!options.map.nexus?.scaleKnown,unit:unit.unit,scale:unit.scale});}
async function mesh(){if(vertices===pack.vertices.p&&meshId)return;const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify([pack.cells.v,pack.vertices.p])));meshId=Array.from(new Uint8Array(hash),v=>v.toString(16).padStart(2,'0')).join('');vertices=pack.vertices.p;pathCache=new WeakMap();}
const compatible=(g:CellRegion)=>g.meshId===meshId&&g.cellCount===pack.cells.i.length;
function report(){send({type:'region-stats',meshId,stats:regions.map(r=>({placementId:r.placementId,compatible:compatible(r.geometry),area:compatible(r.geometry)?area(r.geometry.cells):null}))});}
function emit(){if(draft)send({type:'region-draft',requestId:draft.id,geometry:draft.geometry,area:area(draft.geometry.cells),undo:!!undo.length,redo:!!redo.length});}
function path(cells:number[]){const cached=pathCache.get(cells);if(cached)return cached;const edges=new Map<string,[number,number]>();let fill='';for(const c of cells){if(!land(c))continue;const vs=pack.cells.v[c];fill+='M'+polygon(c).map(p=>p.join(',')).join('L')+'Z';for(let i=0;i<vs.length;i++){const a=vs[i],b=vs[(i+1)%vs.length],key=a<b?a+':'+b:b+':'+a;if(edges.has(key))edges.delete(key);else edges.set(key,[a,b]);}}const result={fill,border:[...edges.values()].map(([a,b])=>'M'+pack.vertices.p[a].join(',')+'L'+pack.vertices.p[b].join(',')).join('')};pathCache.set(cells,result);return result;}
const distribution=(r:Region)=>r.entityType==='culture'||r.entityType==='religion';
const color=(r:Region)=>r.distribution?.color??['#527fc4','#d08040','#49996b','#ac60b5','#c25065','#4c9fa8'][Array.from(r.entityId).reduce((h,c)=>(h*31+c.charCodeAt(0))>>>0,0)%6];
function setView(value:{layer:string;selected?:string|null}){if(viewMode.layer!==value.layer||viewMode.selected!==(value.selected??null))distributionCache=null;viewMode={layer:value.layer,selected:value.selected??null};draw();}
function schedule(){if(!redrawFrame)redrawFrame=requestAnimationFrame(()=>{redrawFrame=0;draw();emit();});}

function draw(includeDraft=true){
 document.getElementById('nexus-regions')?.remove();const view=document.getElementById('viewbox');if(!view)return;const group=document.createElementNS(NS,'g');group.id='nexus-regions';
 const sources=regions.filter(r=>r.visible&&compatible(r.geometry)&&(!includeDraft||!draft||r.placementId!==draft.placementId));
 for(const r of [...sources].filter(r=>!distribution(r)).sort((a,b)=>Number(a.entityType==='administrative_area')-Number(b.entityType==='administrative_area')))add(r.geometry.cells,r.placementId,r.entityType==='country'?'#627fc4':'#bc8450',r.name);
 const draftKey=includeDraft?draft?.placementId:null;if(cacheDraft!==draftKey){distributionCache=null;cacheDraft=draftKey;}
 if(!distributionCache){distributionCache=document.createElementNS(NS,'g');
 // Equal-weight RGB mean is commutative: membership, not paint order, determines overlap.
 const kind=viewMode.layer==='cultural'?'culture':viewMode.layer==='religions'?'religion':null;
 const buckets=new Map<string,{cells:number[];color:string;opacity:number;ids:string[]}>();
 for(const [cell,members] of membership){const visible=members.filter(r=>r.visible&&r.entityType===kind&&(!includeDraft||!draft||r.placementId!==draft.placementId));if(!visible.length)continue;
  const selected=visible.find(r=>r.placementId===viewMode.selected),active=selected?[selected]:visible;
  const ids=active.map(r=>r.placementId).sort(),key=ids.join('|');let bucket=buckets.get(key);
  if(!bucket){const rgb=[0,0,0];for(const r of active){const c=color(r);for(let i=0;i<3;i++)rgb[i]+=parseInt(c.slice(1+i*2,3+i*2),16)/active.length;}
   bucket={cells:[],color:'#'+rgb.map(v=>Math.round(v).toString(16).padStart(2,'0')).join(''),opacity:active.reduce((v,r)=>v+(r.distribution?.opacity??0.4)/active.length,0)*(viewMode.selected&&!selected?0.2:1),ids};buckets.set(key,bucket);}
  bucket.cells.push(cell);
 }
 for(const bucket of buckets.values()){const item=document.createElementNS(NS,'path');item.setAttribute('d',path(bucket.cells).fill);item.setAttribute('fill',bucket.color);item.setAttribute('fill-opacity',String(bucket.opacity));item.dataset.members=bucket.ids.join(' ');item.style.pointerEvents='none';distributionCache.append(item);}
 }
 group.append(distributionCache.cloneNode(true));
 if(includeDraft&&draft)add(draft.geometry.cells,draft.placementId,'#d45b2b',draft.name);
 function add(cells:number[],id:string,color:string,name:string){const item=document.createElementNS(NS,'g');item.dataset.placementId=id;const d=path(cells),fill=document.createElementNS(NS,'path'),border=document.createElementNS(NS,'path');fill.setAttribute('d',d.fill);fill.setAttribute('fill',color);fill.setAttribute('fill-opacity','.24');fill.setAttribute('stroke','none');border.setAttribute('d',d.border);border.setAttribute('stroke',color);border.setAttribute('stroke-width','1.5');border.setAttribute('vector-effect','non-scaling-stroke');border.setAttribute('fill','none');item.append(fill,border);
 const valid=cells.filter(land);if(valid.length){const center=valid.reduce((p,c)=>[p[0]+pack.cells.p[c][0]/valid.length,p[1]+pack.cells.p[c][1]/valid.length],[0,0]);const anchor=valid.reduce((a,c)=>Math.hypot(pack.cells.p[c][0]-center[0],pack.cells.p[c][1]-center[1])<Math.hypot(pack.cells.p[a][0]-center[0],pack.cells.p[a][1]-center[1])?c:a,valid[0]);const label=document.createElementNS(NS,'text');label.textContent=name;label.setAttribute('x',String(pack.cells.p[anchor][0]));label.setAttribute('y',String(pack.cells.p[anchor][1]));label.setAttribute('text-anchor','middle');label.setAttribute('font-size','14');label.setAttribute('fill','#221b14');label.setAttribute('stroke','white');label.setAttribute('stroke-width','3');label.setAttribute('paint-order','stroke');item.append(label);}
 group.append(item);}
 // Keep native city icons/labels selectable above the new territorial fill.
 const city=document.getElementById('burgIcons'),labels=document.getElementById('labels');
 const anchor=Array.from(view.children).find(child=>child.id==='nexus-placements'||!!city&&child.contains(city)||!!labels&&child.contains(labels));
 view.insertBefore(group,anchor??null);
}
async function configure(value:Region[],mapScope:string,notify:(data:unknown)=>void){regions=value;distributionCache=null;scope=mapScope;send=notify;await mesh();membership=new Map();for(const r of regions){if(!distribution(r)||!compatible(r.geometry))continue;for(const c of r.geometry.cells){if(!land(c))continue;const members=membership.get(c)??[];members.push(r);membership.set(c,members);}}draw();report();}
async function command(s:{action:string;id?:string;placementId?:string;name?:string;geometry?:CellRegion;radius?:number;erase?:boolean}){
 await mesh();
 if(s.action==='start'){if(customization)throw Error('Complete the active heightmap/edit mode before saving or exporting');if(s.geometry&&!compatible(s.geometry))throw Error('Region mesh changed; keep the saved territory');if(draft?.id===s.id)return;if(!draft)previousTouchAction=document.getElementById('map')?.style.touchAction??'';draft={id:s.id!,placementId:s.placementId!,name:s.name??'',geometry:s.geometry?structuredClone(s.geometry):{type:'cells',meshId,cellCount:pack.cells.i.length,cells:[]}};undo=[];redo=[];radius=24;erase=false;}
 else if(s.action==='cancel'){draft=null;before=null;last=null;pointers.clear();pinching=false;}
 else if(s.action==='brush'){radius=Math.max(4,Math.min(100,s.radius??radius));erase=s.erase??erase;}
 else if(s.action==='undo'&&draft&&undo.length){redo.push(draft.geometry.cells);draft.geometry={...draft.geometry,cells:undo.pop()!};}
 else if(s.action==='redo'&&draft&&redo.length){undo.push(draft.geometry.cells);draft.geometry={...draft.geometry,cells:redo.pop()!};}
 const map=document.getElementById('map');if(map)map.style.touchAction=draft?'none':previousTouchAction??map.style.touchAction;if(!draft)previousTouchAction=null;draw();emit();report();
}
function point(e:PointerEvent){const view=document.getElementById('viewbox') as unknown as SVGGElement,m=view.getScreenCTM();return m?new DOMPoint(e.clientX,e.clientY).matrixTransform(m.inverse()):null;}
function paint(x:number,y:number){if(!draft)return;const cells=new Set(draft.geometry.cells),r=radius/viewport.scale;const apply=(px:number,py:number)=>{for(const c of pack.cells.i){if(!land(c))continue;const p=pack.cells.p[c];if((p[0]-px)**2+(p[1]-py)**2<=r*r){if(erase)cells.delete(c);else cells.add(c);}}if(px>=0&&py>=0&&px<=options.map.graph.width&&py<=options.map.graph.height){const hit=Pack.findCell(px,py);if(hit!==undefined&&land(hit)){if(erase)cells.delete(hit);else cells.add(hit);}}};if(last){const steps=Math.ceil(Math.hypot(x-last.x,y-last.y)/(r/2));for(let i=1;i<steps;i++)apply(last.x+(x-last.x)*i/steps,last.y+(y-last.y)*i/steps);}apply(x,y);last={x,y};draft.geometry={...draft.geometry,cells:[...cells].sort((a,b)=>a-b)};schedule();}
for(const type of ['pointerdown','pointermove','pointerup','pointercancel'] as const)document.addEventListener(type,e=>{
 if(!draft||customization)return;
 if(type==='pointerdown'){if(e.button!==0)return;if(!(e.target as Element)?.closest?.('#map'))return;pointers.add(e.pointerId);if(pointers.size>1){pinching=true;if(before)draft.geometry={...draft.geometry,cells:before};before=null;last=null;draw();emit();return;}before=[...draft.geometry.cells];last=null;(document.getElementById('map') as unknown as SVGSVGElement).setPointerCapture(e.pointerId);}
 if(pinching){if(type==='pointerup'||type==='pointercancel')pointers.delete(e.pointerId);return;}
 if(!pointers.has(e.pointerId))return;e.preventDefault();e.stopImmediatePropagation();
 if(type==='pointerdown'||type==='pointermove'){const p=point(e);if(p)paint(p.x,p.y);}else{if(type==='pointercancel'&&before)draft.geometry={...draft.geometry,cells:before};else if(before&&JSON.stringify(before)!==JSON.stringify(draft.geometry.cells)){undo.push(before);if(undo.length>50)undo.shift();redo=[];}before=null;last=null;pointers.delete(e.pointerId);draw();emit();}
},{capture:true,passive:false});
for(const type of ['mousedown','mouseup','click','dblclick','touchstart','touchmove','touchend'])document.addEventListener(type,e=>{if(!draft)return;if(typeof TouchEvent!=='undefined'&&e instanceof TouchEvent&&(pinching||e.touches.length>1)){if(e.type==='touchend'&&!e.touches.length)pinching=false;return;}if((e.target as Element)?.closest?.('#map')){e.preventDefault();e.stopImmediatePropagation();}},{capture:true,passive:false});
// A tap queries all confirmed distributions, including hidden entries; drags remain map navigation.
let queryDown:{x:number;y:number}|null=null;
document.addEventListener('pointerdown',e=>{queryDown=e.isPrimary?{x:e.clientX,y:e.clientY}:null;},{capture:true,passive:true});
document.addEventListener('pointermove',e=>{if(queryDown&&Math.hypot(e.clientX-queryDown.x,e.clientY-queryDown.y)>5)queryDown=null;},{capture:true,passive:true});
document.addEventListener('click',e=>{if(draft||customization||!queryDown||!['cultural','religions'].includes(viewMode.layer)||!(e.target as Element)?.closest?.('#map'))return;const p=point(e as PointerEvent);if(!p)return;queryDown=null;e.stopImmediatePropagation();const cell=Pack.findCell(p.x,p.y);send({type:'region-query',members:(cell===undefined?[]:membership.get(cell)??[]).map(r=>r.placementId)});},{capture:true});
export const NexusRegions={configure,setView,command,draw,active:()=>!!draft,pointCells:(points:{placementId:string;x:number;y:number}[])=>points.map(p=>({placementId:p.placementId,cell:Pack.findCell(p.x,p.y),meshId}))};

