"use client";
import {categoricalRegions} from '../features/worldMap/core/categoricalRegions.mjs';
import {createEcosystemPaths} from '../features/worldMap/ecosystemDrawing';
import {assignment,type HumanGeography,type HumanLayer} from '../features/worldMap/humanGeography';

import {sphericalBrushRing,heightBrushChanges,heightStrokeChanges,sampleHeightStroke} from '../features/worldMap/core/heightBrush.mjs';
import {mapPalettes,elevationColors,elevationLevels,depthColors,depthLevels,type GlobalMapDisplay} from '../features/worldMap/globalMapDisplay';
import {climateColor,koppenName,KOPPEN_COLORS,RAIN_LEVELS,RAIN_COLORS,TEMPERATURE_LEVELS,TEMPERATURE_COLORS} from '../../experiments/spherical-grid/climate-display.mjs';
import {buildScalarBands} from '../features/worldMap/core/scalarBands.mjs';
import {buildRiverStrokes,riverLabelStyle,visibleRiverNetwork} from '../features/worldMap/core/riverDrawing.mjs';
import {drawBaseTiles} from '../features/worldMap/globalMapTiles';
import {useEffect,useRef,useState,useMemo,useCallback,type SetStateAction} from 'react';
import type {HeightBrush} from '../features/worldMap/globalMapClient';
import type {GlobalMapDrawing} from '../features/worldMap/globalMapGeometry';
import {useLanguage} from '../lib/LanguageContext';
import {globalMapText} from '../features/worldMap/globalMapMessages';
function cellPath(path:Path2D,ring:number[][]){
 for(const shift of [-360,0,360]){
  ring.forEach(([x,y],i)=>i?path.lineTo(x+shift,y):path.moveTo(x+shift,y));
  path.closePath();
 }
}
function heightCellColor(height:number,ocean:boolean){
 const levels=ocean?depthLevels:elevationLevels,colors=ocean?depthColors:elevationColors;
 return colors[levels.filter(level=>height>=level).length];
}
export default function GlobalMapCanvas({drawing,riverDrafts,hiddenRiverIds,riverCreation,human,humanLayer,showHuman,onHumanPaint,onHumanStroke,onPaint:heightPaint,onStroke:heightStroke,paintRadius,display,editingHeight,lineStart,riverEditor}:{riverDrafts?:{id:string;geometry:number[][]}[];hiddenRiverIds?:string[];riverCreation?:{points:number[][];onPoint:(point:[number,number])=>void};human?:HumanGeography;humanLayer?:HumanLayer;showHuman?:boolean;onHumanPaint?:(lon:number,lat:number)=>void;onHumanStroke?:(points:[number,number][])=>void;riverEditor?:{rivers:{id:string;geometry:number[][];parentId:string|null;mouthLakeId:string|null;sourceLakeId:string|null}[];selectedId:string;geometry?:number[][];onSelect:(id:string)=>void;onChange:(geometry:number[][])=>void};drawing:GlobalMapDrawing;onPaint?:(longitude:number,latitude:number)=>void;onStroke?:(points:[number,number][])=>void;paintRadius?:number;display?:GlobalMapDisplay;editingHeight?:Omit<HeightBrush,'longitude'|'latitude'>;lineStart?:[number,number]}){
 const onPaint=riverCreation?(lon:number,lat:number)=>riverCreation.onPoint([lon,lat]):onHumanPaint??heightPaint,onStroke=onHumanStroke??heightStroke;
 const {language}=useLanguage(),text=globalMapText(language),canvas=useRef<HTMLCanvasElement>(null);
 const [view,commitView]=useState({zoom:1,x:0,y:0}),[size,setSize]=useState({w:800,h:400});
 const liveView=useRef(view),viewFrame=useRef<number|null>(null),settleTimer=useRef<number|null>(null);
 const [tilePass,refreshTiles]=useState(0);
 const setView=useCallback((update:SetStateAction<typeof view>)=>{
  const next=typeof update==='function'?update(liveView.current):update;
  if(next.zoom===liveView.current.zoom&&next.x===liveView.current.x&&next.y===liveView.current.y)return;
  liveView.current=next;
  if(settleTimer.current!==null)window.clearTimeout(settleTimer.current);
  settleTimer.current=window.setTimeout(()=>{
   settleTimer.current=null;
   refreshTiles(pass=>pass+1);
  },140);
  if(viewFrame.current===null)viewFrame.current=window.requestAnimationFrame(()=>{
   viewFrame.current=null;commitView(liveView.current);
  });
 },[]);
 useEffect(()=>()=>{if(viewFrame.current!==null)window.cancelAnimationFrame(viewFrame.current);if(settleTimer.current!==null)window.clearTimeout(settleTimer.current);},[]);
 const [localPlates,setShowPlates]=useState(false),[localGeology,setShowGeology]=useState(false);
 const showPlates=display?.overlays.plates??localPlates,showGeology=display?.overlays.geology??localGeology,palette=mapPalettes[display?.style??'terrain'];
 const [localLayer,setClimateLayer]=useState('terrain'),[localMonth,setMonth]=useState(0);
 const climateLayer=display?.mode??localLayer,month=display?.month??localMonth,showCurrents=display?.overlays.currents??['sst','currents'].includes(climateLayer);
 const mesh=drawing.scalarMesh;
 const editGrid=!!(editingHeight&&mesh?.heights&&mesh.cellRings&&typeof Path2D!=='undefined');
 const sourceCellGeometry=useMemo(()=>mesh?.cellRings?.map(ring=>({ring,west:Math.min(...ring.map(p=>p[0])),east:Math.max(...ring.map(p=>p[0])),south:Math.min(...ring.map(p=>p[1])),north:Math.max(...ring.map(p=>p[1]))})),[mesh?.cellRings]);
 const editCells=useMemo(()=>{
  if(!editGrid||!mesh?.heights||!mesh.cellRings)return null;
  const colors:string[]=[],values=Uint8Array.from(Array.from(mesh.heights),(h,i)=>{
   const color=heightCellColor(h,mesh.oceanMask?!!mesh.oceanMask[i]:h<0);let index=colors.indexOf(color);if(index<0){index=colors.length;colors.push(color);}return index;
  }),fills=new Map<string,Path2D>();
  if(mesh.triangles.length){
   for(const region of categoricalRegions(mesh,values,colors)){const path=new Path2D();if(region.inverse)path.rect(-180,-90,360,180);for(const ring of region.rings)cellPath(path,ring);fills.set(region.color,path);}
  }else mesh.cellRings.forEach((ring,i)=>{const color=colors[values[i]];if(!fills.has(color))fills.set(color,new Path2D());cellPath(fills.get(color)!,ring);});
  return {fills};
 },[editGrid,mesh]);
 const fieldMonth=['sst','temperature','precipitation'].includes(climateLayer)?month:0;
 const scalarLayers=useMemo(()=>{
  const mesh=drawing.scalarMesh,climate=drawing.climate?.months[fieldMonth];
  if(editGrid||!mesh||typeof Path2D==='undefined')return [];
  const pathBands=(values:ArrayLike<number>,levels:number[],colors:string[],clip?:'land'|'sea')=>
   buildScalarBands(mesh,Array.from(values),levels,colors).map(band=>{
    const path=new Path2D();
    if(band.inverse)path.rect(-180,-90,360,180);
    for(const ring of band.rings as number[][][])for(const shift of [-360,0,360]){
     ring.forEach(([x,y],i)=>i?path.lineTo(x+shift,y):path.moveTo(x+shift,y));
     path.closePath();
    }
    return {path,color:band.color,clip};
   });
  if(climate&&climateLayer==='precipitation')return pathBands(climate.precipitation,RAIN_LEVELS,RAIN_COLORS);
  if(climate&&['temperature','sst'].includes(climateLayer)){
   const sst=climateLayer==='sst';
   return pathBands(sst?climate.sst:climate.temperature,TEMPERATURE_LEVELS.map(t=>t*10),TEMPERATURE_COLORS,sst?'sea':undefined);
  }
  if(mesh.heights&&['terrain','heightmap','contours','currents','sst'].includes(climateLayer)){
   const scientific=climateLayer==='heightmap'||climateLayer==='contours',custom=scientific?undefined:(palette.relief??['#17364e','#20506b','#2b6b86','#418fa6','#76b6c6','#b3d6d4','#8eb57a','#b4bf85','#bba776','#9e876c','#d1c6b5','#eeeae2']);
   return [
    ...pathBands(mesh.tintHeights??mesh.heights,custom?[-65,-45,-25,-10,-3]:depthLevels,custom?.slice(0,6)??depthColors,'sea'),
    ...pathBands(mesh.tintHeights??mesh.heights,custom?[2,5,10,20,40]:elevationLevels,custom?.slice(6)??elevationColors,'land'),
   ];
  }
  return [];
 },[drawing,fieldMonth,climateLayer,palette,editGrid]);
 const climateBands=useMemo(()=>{
  const c=drawing.climate;if(!c||scalarLayers.length||['heightmap','terrain','contours','political','culture','currents','ecosystems','seabedEcosystems'].includes(climateLayer))return [];
  const bands=new Map<string,number[][][]>();
  for(let i=0;i<c.rings.length;i++){
   if(climateLayer==='sst'&&!c.ocean[i])continue;
   const value=climateLayer==='koppen'?c.koppen[i]:climateLayer==='precipitation'?c.months[fieldMonth].precipitation[i]:climateLayer==='sst'?c.months[fieldMonth].sst[i]/10:c.months[fieldMonth].temperature[i]/10;
   const color=climateColor(climateLayer,value);if(!bands.has(color))bands.set(color,[]);bands.get(color)!.push(c.rings[i]);
  }
  return [...bands].map(([color,rings])=>({color,rings}));
 },[drawing,fieldMonth,climateLayer,scalarLayers]);
 const [localPack,setShowPack]=useState(false),[showHydrology,setShowHydrology]=useState(true);
 const showPack=display?.overlays.pack??localPack,showRivers=display?.overlays.rivers??showHydrology,showLakes=display?.overlays.lakes??showHydrology,showNames=display?.overlays.names??false;
 const ecosystemBands=useMemo(()=>{
  const n=drawing.natural;if(!n||!['ecosystems','seabedEcosystems'].includes(climateLayer))return [];
  return createEcosystemPaths(n,climateLayer==='seabedEcosystems');
 },[drawing.natural,climateLayer]);
 const surfacePaths=useMemo(()=>{
  const surface=drawing.surface;if(!surface||typeof Path2D==='undefined')return null;
  const make=(inverse:boolean)=>{const path=new Path2D();if(inverse)path.rect(-180,-90,360,180);for(const ring of surface.land)for(const shift of [-360,0,360]){ring.forEach(([x,y],i)=>i?path.lineTo(x+shift,y):path.moveTo(x+shift,y));path.closePath();}return path;};
  const shore=new Path2D();
  for(const ring of surface.shorelines??[])for(const shift of [-360,0,360]){
   ring.forEach(([x,y],i)=>i?shore.lineTo(x+shift,y):shore.moveTo(x+shift,y));
   // Polar rings terminate on the next longitude copy.
   if(Math.abs(ring.at(-1)![0]-ring[0][0])<180)shore.closePath();
  }
  return {land:make(surface.inverse),sea:make(!surface.inverse),shore,hasShore:!!surface.shorelines?.length};
 },[drawing]);
 const showTributaries=view.zoom>=1.8;
 const riverVisibilityKey=[...(hiddenRiverIds??[]),...(riverDrafts??[]).map(r=>r.id)].sort().join('|');
 const visibleRivers=useMemo(()=>visibleRiverNetwork(drawing.natural?.rivers??[],showTributaries).filter(r=>!hiddenRiverIds?.includes(r.id)&&!riverDrafts?.some(d=>d.id===r.id)),[drawing,showTributaries,riverVisibilityKey]);
 const riverLabels=useMemo(()=>visibleRivers.flatMap(river=>{
  const line=river.lines[Math.floor(river.lines.length/2)];
  if(!line||!river.name.trim())return [];
  const [a,b]=line;
  const longitude=(a[0]+b[0])/2;
  return [{name:river.name,point:[((longitude+180)%360+360)%360-180,(a[1]+b[1])/2],length:river.lengthKm,...riverLabelStyle(river)}];
 }).sort((a,b)=>a.minZoom-b.minZoom||b.length-a.length),[visibleRivers]);
 const riverStrokes=useMemo(()=>visibleRivers.map(river=>buildRiverStrokes(river,month).map(reach=>{
  let west=Infinity,east=-Infinity,south=Infinity,north=-Infinity;
  for(const [x,y] of reach.points){west=Math.min(west,x);east=Math.max(east,x);south=Math.min(south,y);north=Math.max(north,y);}
  return {...reach,west,east,south,north};
 })),[visibleRivers,month]);
 const [hoverPoint,setHoverPoint]=useState<[number,number]|null>(null);
 const hoverHeight=useMemo(()=>{
  const mesh=drawing.scalarMesh;
  if(!hoverPoint||!mesh?.heights)return undefined;
  const [lon,lat]=hoverPoint.map(angle=>angle*Math.PI/180);
  const x=Math.cos(lat)*Math.cos(lon),y=Math.cos(lat)*Math.sin(lon),z=Math.sin(lat);
  let nearest=0,score=-Infinity;
  for(let i=0;i<mesh.points.length;i++){
   const p=mesh.points[i],value=x*p[0]+y*p[1]+z*p[2];
   if(value>score){score=value;nearest=i;}
  }
  return Math.round(mesh.heights[nearest]*100);
 },[drawing.scalarMesh,hoverPoint]);
 const stroke=useRef<{id:number;points:[number,number][]}|null>(null);
 const [strokePreview,setStrokePreview]=useState<[number,number][]|null>(null);
 const previewCells=useMemo(()=>{
  if(!editGrid||!editingHeight||!mesh?.heights||!mesh.cellRings||!mesh.neighbors||!(onPaint||onStroke))return null;
  const grid={points:mesh.points,heights:mesh.heights,neighbors:mesh.neighbors,oceanMask:mesh.oceanMask};
  try{
   let changes:{id:number;height:number}[]=[];
   if(editingHeight.tool==='line'){
    if(lineStart&&hoverPoint)changes=heightBrushChanges(grid,{...editingHeight,longitude:lineStart[0],latitude:lineStart[1],end:hoverPoint});
   }else{
    const points=strokePreview??(hoverPoint?[hoverPoint]:null);
    if(points){
     const stamps=sampleHeightStroke(editingHeight,points),stride=Math.ceil(stamps.length/24);
     changes=heightStrokeChanges(grid,stamps.filter((_,i)=>i%stride===0||i===stamps.length-1));
    }
   }
   const fills=new Map<string,Path2D>(),lines=new Path2D();
   for(const {id,height} of changes){
    const ocean=editingHeight.mode==='preserve'&&mesh.oceanMask?!!mesh.oceanMask[id]:height<0;
    const color=heightCellColor(height,ocean);
    if(!fills.has(color))fills.set(color,new Path2D());
    cellPath(fills.get(color)!,mesh.cellRings[id]);cellPath(lines,mesh.cellRings[id]);
   }
   return {fills,lines};
  }catch{return null;}
 },[editGrid,editingHeight,mesh,onPaint,onStroke,lineStart,hoverPoint,strokePreview]);
 const location=(clientX:number,clientY:number):[number,number]|null=>{const rect=canvas.current!.getBoundingClientRect(),view=liveView.current,s=Math.min(size.w/360,size.h/180)*view.zoom,period=360*s,pan=((view.x+period/2)%period+period)%period-period/2,longitude=(clientX-rect.left-size.w/2-pan)/s,latitude=-(clientY-rect.top-size.h/2-view.y)/s;return Math.abs(latitude)<=90?[((longitude+180)%360+360)%360-180,latitude]:null;};
 useEffect(()=>{if(!onStroke&&stroke.current){stroke.current=null;setStrokePreview(null);}},[onStroke]);
 const footprint=useMemo(()=>{
  if(!hoverPoint||!(onPaint||onStroke)||!paintRadius||!Number.isFinite(paintRadius)||paintRadius<1||paintRadius>30)return '';
  const s=Math.min(size.w/360,size.h/180)*view.zoom,period=360*s,pan=((view.x+period/2)%period+period)%period-period/2,copies=Math.ceil(size.w/period/2)+1,ring=sphericalBrushRing(...hoverPoint,paintRadius);
  return Array.from({length:copies*2+1},(_,index)=>ring.map(([lon,lat],i)=>`${i?'L':'M'}${size.w/2+pan+(lon+(index-copies)*360)*s},${size.h/2+view.y-lat*s}`).join(' ')).join(' ');
 },[hoverPoint,onPaint,onStroke,paintRadius,size,view]);
 const riverScale=Math.min(size.w/360,size.h/180)*view.zoom,riverPeriod=360*riverScale,riverPan=((view.x+riverPeriod/2)%riverPeriod+riverPeriod)%riverPeriod-riverPeriod/2;
 const riverScreen=(p:number[],shift=0)=>[size.w/2+riverPan+(p[0]+shift)*riverScale,size.h/2+view.y-p[1]*riverScale];
 const riverPoints=riverEditor?.geometry?.reduce<number[][]>((out,p)=>{const previous=out.at(-1)?.[0]??p[0];out.push([previous+((p[0]-previous+540)%360-180),p[1]]);return out;},[]);
 // Focus the chosen river so nearby routing anchors can be dragged separately.
 const territoryLayer=showHuman?humanLayer:display?.overlays.provinces?'provinces':display?.mode==='culture'?'cultures':'states';
 const humanPaths=useMemo(()=>{
  const m=drawing.scalarMesh;if(!human||!m||!territoryLayer||territoryLayer==='roads'||typeof Path2D==='undefined')return null;
  const owners=human[assignment[territoryLayer]],fills=new Map<number,{color:string;path:Path2D}>(),borders=new Path2D();
  for(const e of human[territoryLayer])fills.set(e.id,{color:e.color,path:new Path2D()});
  m.cellRings?.forEach((ring,i)=>{const fill=fills.get(owners[i]);if(!fill||!ring||Number(m.heights?.[i])<0)return;ring.forEach(([x,y],j)=>j?fill.path.lineTo(x,y):fill.path.moveTo(x,y));fill.path.closePath();});
  m.neighbors?.forEach((ns,i)=>{if(!owners[i])return;for(const j of ns){if(j<i||owners[i]===owners[j])continue;const a=m.cellRings?.[i],b=m.cellRings?.[j];if(!a||!b)continue;const edge=a.filter(p=>b.some(q=>Math.abs(p[1]-q[1])<1e-6&&Math.abs(((p[0]-q[0]+540)%360)-180)<1e-6));if(edge.length===2){borders.moveTo(...edge[0] as [number,number]);borders.lineTo(...edge[1] as [number,number]);}}});
  return {fills:[...fills.values()],borders};
 },[human,drawing.scalarMesh,territoryLayer]);
 useEffect(()=>{
  const geometry=riverEditor?.rivers.find(r=>r.id===riverEditor.selectedId)?.geometry;
  if(!geometry?.length)return;
  const longitudes:number[]=[];
  for(const p of geometry){const previous=longitudes.at(-1)??p[0];longitudes.push(previous+((p[0]-previous+540)%360-180));}
  const west=Math.min(...longitudes),east=Math.max(...longitudes),south=Math.min(...geometry.map(p=>p[1])),north=Math.max(...geometry.map(p=>p[1]));
  const baseScale=Math.min(size.w/360,size.h/180),zoom=Math.max(3,Math.min(32,Math.min(size.w*.5/(east-west+2),size.h*.7/(north-south+2))/baseScale)),scale=baseScale*zoom;
  setView({zoom,x:-(west+east)/2*scale+Math.min(150,size.w*.15),y:(south+north)/2*scale});
 // Geometry changes are drafts; retain the camera while dragging a control point.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[riverEditor?.selectedId]);
 const riverDrag=useRef<{pointer:number;index:number;geometry:number[][];riverId:string}|null>(null);
 const pointers=useRef(new Map<number,{x:number;y:number}>());
 useEffect(()=>{const el=canvas.current!;const observer=new ResizeObserver(([entry])=>setSize({w:Math.max(1,entry.contentRect.width),h:Math.max(1,entry.contentRect.height)}));observer.observe(el);return()=>observer.disconnect();},[]);
 const paintBase=useMemo(()=>(ctx:CanvasRenderingContext2D,scale:number)=>{
   if(editCells){
    for(const [color,path] of editCells.fills){ctx.fillStyle=color;ctx.fill(path,'evenodd');}
    return;
   }
   ctx.fillStyle=palette.land;
   if(surfacePaths)ctx.fill(surfacePaths.land,'evenodd');else{ctx.beginPath();for(const ring of drawing.land){ring.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();}ctx.fill();}
   if(!drawing.scalarMesh&&drawing.relief)for(const [index,band] of drawing.relief.entries()){
    ctx.save();if(surfacePaths)ctx.clip(index<6?surfacePaths.sea:surfacePaths.land,'evenodd');ctx.fillStyle=palette.relief?.[index]??band.color;ctx.beginPath();
    for(const ring of band.rings){ring.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();}
    ctx.fill();ctx.restore();
   }
   for(const band of scalarLayers){
    ctx.save();
    if(band.clip&&surfacePaths)ctx.clip(surfacePaths[band.clip],'evenodd');
    ctx.fillStyle=band.color;
    ctx.fill(band.path,'evenodd');
    ctx.restore();
   }
   if(surfacePaths?.hasShore&&['terrain','heightmap','contours','currents'].includes(climateLayer)){
    ctx.save();
    ctx.clip(surfacePaths.sea,'evenodd');
    ctx.lineJoin='round';
    ctx.lineCap='round';
    ctx.strokeStyle=palette.ocean;
    // Stroke the whole shore together at each width. Adjacent coasts share
    // the same band around straits and the land mask clips the inland half.
    const spacing=Math.max(.13,1.1/scale);
    for(const extent of [4.4,2.6,1.1]){
     ctx.lineWidth=spacing*extent*2;
     ctx.globalAlpha=.23;
     ctx.stroke(surfacePaths.shore);
    }
    ctx.restore();
   }
   for(const band of climateBands){ctx.fillStyle=band.color;ctx.beginPath();for(const ring of band.rings)for(const shift of [-360,0,360]){ring.forEach(([x,y],i)=>i?ctx.lineTo(x+shift,y):ctx.moveTo(x+shift,y));ctx.closePath();}ctx.fill();}
   for(const band of ecosystemBands){ctx.save();if(surfacePaths)ctx.clip(surfacePaths[band.clip],'evenodd');ctx.fillStyle=band.color;ctx.fill(band.path,'evenodd');ctx.restore();}
 },[drawing,palette,surfacePaths,scalarLayers,climateLayer,climateBands,ecosystemBands,editCells]);
 const baseTiles=useMemo(()=>({tiles:new Map<string,HTMLCanvasElement>(),overview:null as HTMLCanvasElement|null}),[paintBase]);
 const refineFrame=useRef<number|null>(null);
 useEffect(()=>{
  const el=canvas.current!,ctx=el.getContext('2d');if(!ctx)return;
  const ratio=Math.min(devicePixelRatio||1,2),width=Math.round(size.w*ratio),height=Math.round(size.h*ratio);
  if(el.width!==width)el.width=width;
  if(el.height!==height)el.height=height;
  ctx.setTransform(1,0,0,1,0,0);
  ctx.scale(ratio,ratio);ctx.fillStyle=palette.ocean;ctx.fillRect(0,0,size.w,size.h);
  const s=Math.min(size.w/360,size.h/180)*view.zoom;
  const period=360*s,pan=((view.x+period/2)%period+period)%period-period/2;
  ctx.translate(size.w/2+pan,size.h/2+view.y);ctx.scale(s,-s);
  const copies=Math.ceil(size.w/period/2)+1;
  const overviewScale=4;
  let tileResolution=overviewScale*2**Math.max(0,Math.floor(Math.log2(s*ratio/overviewScale)));
  // Leave room for partially visible tiles and both sides of the date line.
  while(tileResolution>overviewScale&&(Math.ceil(size.w*tileResolution/s/512)+2)*(Math.ceil(size.h*tileResolution/s/512)+1)>24)tileResolution/=2;
  if(surfacePaths&&drawing.scalarMesh&&!baseTiles.overview){
   const overview=document.createElement('canvas');
   overview.width=360*overviewScale;
   overview.height=180*overviewScale;
   const overviewContext=overview.getContext('2d');
   if(overviewContext){
    overviewContext.fillStyle=palette.ocean;
    overviewContext.fillRect(0,0,overview.width,overview.height);
    overviewContext.setTransform(overviewScale,0,0,-overviewScale,180*overviewScale,90*overviewScale);
    paintBase(overviewContext,overviewScale/ratio);
    baseTiles.overview=overview;
   }
  }
  const canRefine=!pointers.current.size&&settleTimer.current===null;
  const tileBudget={remaining:canRefine?1:0,pending:false};
  const margin=2/s;
  const occupiedRiverLabels:{left:number;right:number;top:number;bottom:number}[]=[];
  for(let k=-copies;k<=copies;k++){
   if(Math.abs(pan+k*period)>size.w/2+period/2)continue;
   ctx.save();ctx.translate(k*360,0);if(surfacePaths){ctx.beginPath();ctx.rect(-180,-90,360,180);ctx.clip();}
   const left=Math.max(-180,(-size.w/2-pan)/s-k*360),right=Math.min(180,(size.w/2-pan)/s-k*360);
   const top=Math.min(90,(size.h/2+view.y)/s),bottom=Math.max(-90,(view.y-size.h/2)/s);
   if(baseTiles.overview&&tileResolution===overviewScale){
    // The overview already has exactly this resolution. Repainting its full
    // ecosystem paths into identical tiles only repeats expensive tessellation.
    ctx.save();ctx.translate(-180,90);ctx.scale(1,-1);ctx.drawImage(baseTiles.overview,0,0,360,180);ctx.restore();
   }else if(!baseTiles.overview||!drawBaseTiles(ctx,left,right,bottom,top,tileResolution,ratio,baseTiles.tiles,paintBase,palette.ocean,baseTiles.overview,tileBudget)){
    paintBase(ctx,s);
   }
   if(editGrid){
    if(view.zoom>=4&&sourceCellGeometry){ctx.beginPath();for(const cell of sourceCellGeometry)for(const shift of [-360,0,360]){if(cell.east+shift<left||cell.west+shift>right||cell.north<bottom||cell.south>top)continue;cell.ring.forEach(([x,y],i)=>i?ctx.lineTo(x+shift,y):ctx.moveTo(x+shift,y));ctx.closePath();}ctx.strokeStyle='rgba(20,62,68,.18)';ctx.lineWidth=.45/s;ctx.stroke();}
    if(previewCells){
     for(const [color,path] of previewCells.fills){ctx.fillStyle=color;ctx.fill(path);}
     ctx.strokeStyle='rgba(21,58,65,.65)';ctx.lineWidth=.65/s;ctx.stroke(previewCells.lines);
    }
    if(surfacePaths?.hasShore){ctx.strokeStyle=palette.line;ctx.lineWidth=.8/s;ctx.stroke(surfacePaths.shore);}
    ctx.restore();
    continue;
   }
   if(drawing.climate&&showCurrents){
    ctx.lineWidth=1.2/s;
    for(const arrow of drawing.climate.arrows){
     const [a,b]=arrow.line,dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);if(length<1e-8)continue;const ux=dx/length,uy=dy/length,head=Math.min(length*.4,3.5/s);
     const t=drawing.climate.months[month].sstAnomaly[arrow.cell]/10;ctx.strokeStyle=t>.5?'#b93635':t<-.5?'#244ca2':'#30474a';
     ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.moveTo(b[0]-ux*head-uy*head*.6,b[1]-uy*head+ux*head*.6);ctx.lineTo(b[0],b[1]);ctx.lineTo(b[0]-ux*head+uy*head*.6,b[1]-uy*head-ux*head*.6);ctx.stroke();
    }
   }
   if(showPlates&&drawing.plates)for(const plate of drawing.plates){
    ctx.globalAlpha=.55;ctx.fillStyle=plate.color;ctx.beginPath();
    for(const ring of plate.rings){ring.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();}ctx.fill();ctx.globalAlpha=1;
   }
   ctx.strokeStyle=palette.line;ctx.lineWidth=.7/s;
   if(surfacePaths?.hasShore){
    ctx.save();ctx.lineJoin='round';ctx.lineCap='round';ctx.stroke(surfacePaths.shore);ctx.restore();
   }else{
    ctx.beginPath();for(const [a,b] of drawing.coast){ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);}ctx.stroke();
   }
   if(climateLayer==='contours'&&drawing.contours){
    for(const band of drawing.contours){if(band.height===0&&surfacePaths)continue;ctx.strokeStyle=band.height<0?'#3a7895':palette.line;ctx.lineWidth=(band.height===0?1.2:.6)/s;ctx.beginPath();for(const [a,b] of band.lines){ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);}ctx.stroke();}
   }
   if(showPlates&&drawing.tectonicSymbols){
    const colors:Record<string,string>={subduction:'#a52938',collision:'#8c3b84','mid-ocean-ridge':'#007c91',rift:'#007c91',transform:'#aa6d18',diffuse:'#777'};
    const strokeLine=(line:number[][])=>{ctx.moveTo(line[0][0],line[0][1]);ctx.lineTo(line[1][0],line[1][1]);};
    const arrow=(line:number[][])=>{
     if(line.length!==2)return;
     const [a,b]=line,dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy);if(len<1e-8)return;
     const ux=dx/len,uy=dy/len,head=Math.min(len*.35,4/s);
     ctx.beginPath();strokeLine(line);ctx.moveTo(b[0]-ux*head-uy*head*.65,b[1]-uy*head+ux*head*.65);ctx.lineTo(...b as [number,number]);ctx.lineTo(b[0]-ux*head+uy*head*.65,b[1]-uy*head-ux*head*.65);ctx.stroke();
    };
    for(const edge of drawing.tectonicSymbols.edges){ctx.strokeStyle=colors[edge.mode]??'#777';ctx.lineWidth=1.8/s;ctx.beginPath();for(const line of edge.lines)strokeLine(line);ctx.stroke();}
    for(const mark of drawing.tectonicSymbols.marks){
     ctx.fillStyle=ctx.strokeStyle=colors[mark.mode]??'#777';ctx.lineWidth=1.3/s;
     if(mark.tooth.length){ctx.beginPath();mark.tooth.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();}
     for(const line of mark.arrows)arrow(line);
    }
    ctx.strokeStyle=ctx.fillStyle='#172734';ctx.lineWidth=2/s;ctx.font=`${12/s}px sans-serif`;
    for(const motion of drawing.tectonicSymbols.motion){arrow(motion.arrow);ctx.save();ctx.translate(motion.position[0]+3/s,motion.position[1]+5/s);ctx.scale(1,-1);ctx.fillText(`P${motion.plateId}`,0,0);ctx.restore();}
   }else if(showPlates&&drawing.plateBoundaries?.length){
    ctx.beginPath();for(const line of drawing.plateBoundaries){if(line.length!==2)continue;ctx.moveTo(line[0][0],line[0][1]);ctx.lineTo(line[1][0],line[1][1]);}
    ctx.strokeStyle='#ca4a38';ctx.lineWidth=1.5/s;ctx.stroke();
   }
   if(showGeology&&drawing.geology){
    for(const seg of drawing.geology.segments){
     ctx.beginPath();for(const line of seg.lines){ctx.moveTo(line[0][0],line[0][1]);ctx.lineTo(line[1][0],line[1][1]);}
     ctx.strokeStyle=seg.mode==='subduction'?'#172b57':'#16b7c8';ctx.lineWidth=(1.5+seg.activity)/s;ctx.stroke();
    }
    ctx.strokeStyle='#a746bc';ctx.lineWidth=2/s;ctx.setLineDash([4/s,3/s]);ctx.beginPath();
    for(const chain of drawing.geology.islandChains)chain.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle='#ed7c2b';for(const [x,y] of drawing.geology.volcanoes){ctx.beginPath();ctx.arc(x,y,2.5/s,0,Math.PI*2);ctx.fill();}
   }
   if(drawing.natural){
    if(showLakes){
     for(const lake of drawing.natural.lakes){ctx.fillStyle=lake.months[month]?.dry?'#a6c2c7':'#5794ae';ctx.beginPath();for(const ring of lake.rings){ring.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();}ctx.fill();}
    }
    if(showRivers){
     ctx.save();
     ctx.lineJoin='round';
     ctx.lineCap='round';
     for(const reaches of riverStrokes)for(const {points,widths,dry,west,east,south,north} of reaches){
      if(east<left-margin||west>right+margin||north<bottom-margin||south>top+margin)continue;
      ctx.beginPath();
      if(dry){
       ctx.strokeStyle='#789da8';ctx.lineWidth=.55/s;ctx.setLineDash([2.5/s,2/s]);
       points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));
       ctx.stroke();
       continue;
      }
      ctx.fillStyle=climateLayer==='terrain'||climateLayer==='heightmap'?'#316e8e':'#366f95';
      const banks=points.map(([x,y],i)=>{
       const a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)];
       const dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy)||1,offset=widths[i]/(2*s);
       return [[x-dy/length*offset,y+dx/length*offset],[x+dy/length*offset,y-dx/length*offset]];
      });
      banks.forEach(([left],i)=>i?ctx.lineTo(left[0],left[1]):ctx.moveTo(left[0],left[1]));
      for(let i=banks.length-1;i>=0;i--)ctx.lineTo(banks[i][1][0],banks[i][1][1]);
      ctx.closePath();ctx.fill();
     }
     ctx.restore();
    }
    if(showNames){
     ctx.fillStyle=palette.ink;ctx.font=`${12/s}px sans-serif`;
     const label=(name:string,p:number[])=>{ctx.save();ctx.translate(p[0],p[1]);ctx.scale(1,-1);ctx.fillText(name,0,0);ctx.restore();};
     if(showRivers)for(const river of riverLabels){
      if(view.zoom<river.minZoom)break;
      const [lon,lat]=river.point,x=lon*s+pan+k*period+size.w/2,y=size.h/2+view.y-lat*s;
      if(x<0||x>size.w||y<0||y>size.h)continue;
      ctx.font=`${river.weight} ${river.pixels/s}px sans-serif`;
      const textWidth=ctx.measureText(river.name).width*s;
      const box={left:x+3,right:x+3+textWidth,top:y-river.pixels-3,bottom:y};
      if(box.right>size.w||box.top<0||box.right>(180-lon)*s+x||occupiedRiverLabels.some(b=>box.left<b.right+4&&box.right>b.left-4&&box.top<b.bottom+3&&box.bottom>b.top-3))continue;
      occupiedRiverLabels.push(box);
      label(river.name,[lon+3/s,lat+2/s]);
     }
     ctx.font=`${12/s}px sans-serif`;
     if(showLakes)for(const lake of drawing.natural.lakes){const ring=lake.rings[0];if(ring?.length)label(lake.name,ring[0]);}
    }
    if(showPack){ctx.strokeStyle='rgba(20,35,50,.32)';ctx.lineWidth=.35/s;ctx.beginPath();for(const ring of drawing.natural.pack.rings){ring.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();}ctx.stroke();}
   }
   const territoryFill=showHuman||display?.mode==='political'||display?.mode==='culture'||display?.overlays.provinces;
   if(human&&territoryLayer&&drawing.scalarMesh&&(showHuman||territoryFill||display?.overlays.borders||display?.overlays.roads)){
    const m=drawing.scalarMesh;
    if(territoryLayer!=='roads'){
     if(humanPaths){ctx.globalAlpha=.42;if(territoryFill)for(const fill of humanPaths.fills){ctx.fillStyle=fill.color;ctx.fill(fill.path);}ctx.globalAlpha=1;ctx.strokeStyle='#25354b';ctx.lineWidth=.8/s;ctx.stroke(humanPaths.borders);}
     ctx.font=`${13/s}px sans-serif`;ctx.fillStyle='#172734';ctx.textAlign='center';for(const e of (showHuman||display?.overlays.names?human[territoryLayer]:[])){const p=m.points[e.center];if(!p)continue;const x=Math.atan2(p[1],p[0])*180/Math.PI,y=Math.asin(p[2])*180/Math.PI;ctx.save();ctx.translate(x,y);ctx.scale(1,-1);ctx.fillText(e.name,0,0);ctx.restore();}
    }
    ctx.strokeStyle='#80452c';ctx.lineWidth=1.8/s;ctx.setLineDash([4/s,2/s]);for(const road of (showHuman||display?.overlays.roads?human.roads:[])){ctx.beginPath();let previous:number|undefined;road.cells.forEach((c,i)=>{const p=m.points[c];let x=Math.atan2(p[1],p[0])*180/Math.PI;const y=Math.asin(p[2])*180/Math.PI;if(previous!==undefined){while(x-previous>180)x-=360;while(x-previous< -180)x+=360;}i?ctx.lineTo(x,y):ctx.moveTo(x,y);previous=x;});ctx.stroke();}ctx.setLineDash([]);
   }
   ctx.restore();
  }
  if(canRefine&&tileBudget.pending)refineFrame.current=window.requestAnimationFrame(()=>{
   refineFrame.current=null;
   if(settleTimer.current===null&&!pointers.current.size)refreshTiles(pass=>pass+1);
  });
  return()=>{if(refineFrame.current!==null){window.cancelAnimationFrame(refineFrame.current);refineFrame.current=null;}};
 },[sourceCellGeometry,humanPaths,territoryLayer,human,humanLayer,showHuman,display,drawing,view,size,showPlates,showGeology,climateBands,ecosystemBands,climateLayer,month,showPack,showRivers,showLakes,showNames,showCurrents,palette,surfacePaths,scalarLayers,riverStrokes,riverLabels,baseTiles,paintBase,tilePass,editGrid,previewCells]);
 const moveCamera=useCallback((factor:number,fromX=0,fromY=0,toX=fromX,toY=fromY)=>setView(v=>{
  const zoom=Math.max(1,Math.min(32,v.zoom*factor)),scale=zoom/v.zoom;
  const y=toY+(v.y-fromY)*scale,limit=size.h*zoom/2;
  return {zoom,x:toX+(v.x-fromX)*scale,y:Math.max(-limit,Math.min(limit,y))};
 }),[setView,size.h]);
 useEffect(()=>{
  const el=canvas.current!,wheelSurface=el.parentElement!;
  let exponent=0,x=0,y=0,frame:number|null=null;
  const wheel=(e:WheelEvent)=>{
   e.preventDefault();
   const unit=e.deltaMode===1?16:e.deltaMode===2?size.h:1;
   exponent-=Math.max(-240,Math.min(240,e.deltaY*unit))*(e.ctrlKey?.01:.0025);
   const rect=el.getBoundingClientRect();
   x=e.clientX-rect.left-size.w/2;
   y=e.clientY-rect.top-size.h/2;
   if(frame===null)frame=window.requestAnimationFrame(()=>{
    frame=null;
    moveCamera(Math.exp(Math.max(-Math.log(4),Math.min(Math.log(4),exponent))),x,y);
    exponent=0;
   });
  };
  wheelSurface.addEventListener('wheel',wheel,{passive:false});
  return()=>{wheelSurface.removeEventListener('wheel',wheel);if(frame!==null)window.cancelAnimationFrame(frame);};
 },[size,moveCamera]);
 const zoom=moveCamera;
 const endNavigation=(id:number)=>{
  if(pointers.current.delete(id)&&!pointers.current.size&&settleTimer.current===null)refreshTiles(pass=>pass+1);
 };
 return <div className="relative h-full min-h-56 w-full overflow-hidden rounded-lg bg-[#b1d3df]">
  <canvas ref={canvas} data-global-map-canvas data-height-editing={editGrid||undefined} tabIndex={0} aria-label={text('title')} className="h-full min-h-56 w-full touch-none outline-offset-[-3px]" style={{cursor:onPaint||onStroke?'crosshair':'grab'}} onKeyDown={e=>{if(['+','=','-','0','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))e.preventDefault();if(e.key==='+'||e.key==='=')zoom(1.5);if(e.key==='-')zoom(1/1.5);if(e.key==='0')setView({zoom:1,x:0,y:0});if(e.key.startsWith('Arrow'))setView(v=>({...v,x:v.x+(e.key==='ArrowLeft'?40:e.key==='ArrowRight'?-40:0),y:v.y+(e.key==='ArrowUp'?40:e.key==='ArrowDown'?-40:0)}));}} onPointerDown={e=>{if(e.button!==0)return;if(riverEditor){const rect=e.currentTarget.getBoundingClientRect(),x=e.clientX-rect.left,y=e.clientY-rect.top;let best=12,id='';for(const r of riverEditor.rivers)for(const line of [r.geometry])for(let i=1;i<line.length;i++)for(const shift of [-720,-360,0,360,720]){const a=riverScreen(line[i-1],shift),b=riverScreen(line[i],shift),dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy||1))),distance=Math.hypot(x-a[0]-t*dx,y-a[1]-t*dy);if(distance<best){best=distance;id=r.id;}}if(id){riverEditor.onSelect(id);return;}}if(onStroke){if(stroke.current)return;const p=location(e.clientX,e.clientY);if(p){stroke.current={id:e.pointerId,points:[p]};setStrokePreview([p]);e.currentTarget.setPointerCapture(e.pointerId);}return;}if(onPaint){const p=location(e.clientX,e.clientY);if(p)onPaint(...p);return;}e.currentTarget.setPointerCapture(e.pointerId);setHoverPoint(null);if(pointers.current.size>=2)return;pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY});}} onPointerMove={e=>{
   if(onPaint||onStroke||(climateLayer==='heightmap'&&!pointers.current.size))setHoverPoint(location(e.clientX,e.clientY));
   if(stroke.current?.id===e.pointerId){const p=location(e.clientX,e.clientY);if(p){const points=stroke.current.points,last=points.at(-1)!;if(Math.hypot(((p[0]-last[0]+540)%360-180)*Math.cos(p[1]*Math.PI/180),p[1]-last[1])>Math.min(.5,(paintRadius??1)/4)){if(points.length===256)stroke.current.points=points.filter((_,i)=>i%2===0);stroke.current.points.push(p);setStrokePreview([...stroke.current.points]);}}return;}
   const old=pointers.current.get(e.pointerId);if(!old)return;
   if(pointers.current.size===2){const other=[...pointers.current.entries()].find(([id])=>id!==e.pointerId)![1],before=Math.hypot(old.x-other.x,old.y-other.y),after=Math.hypot(e.clientX-other.x,e.clientY-other.y);const rect=e.currentTarget.getBoundingClientRect();
    const centerX=rect.left+size.w/2,centerY=rect.top+size.h/2;
    moveCamera(before>1?after/before:1,(old.x+other.x)/2-centerX,(old.y+other.y)/2-centerY,(e.clientX+other.x)/2-centerX,(e.clientY+other.y)/2-centerY);
   }
   else setView(v=>({...v,x:v.x+e.clientX-old.x,y:Math.max(-size.h*v.zoom/2,Math.min(size.h*v.zoom/2,v.y+e.clientY-old.y))}));
   pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY});
  }} onPointerLeave={()=>setHoverPoint(null)} onPointerUp={e=>{if(stroke.current?.id===e.pointerId){const points=stroke.current.points,end=location(e.clientX,e.clientY),last=points.at(-1)!;if(end&&points.length<256&&Math.hypot(end[0]-last[0],end[1]-last[1])>1e-6)points.push(end);stroke.current=null;setStrokePreview(null);onStroke?.(points);}endNavigation(e.pointerId);}} onPointerCancel={e=>{if(stroke.current?.id===e.pointerId){stroke.current=null;setStrokePreview(null);}endNavigation(e.pointerId);}} onLostPointerCapture={e=>{if(stroke.current?.id===e.pointerId){stroke.current=null;setStrokePreview(null);}endNavigation(e.pointerId);}}/>
  {(riverDrafts?.length||riverCreation?.points.length)?<svg aria-label="河流編輯草稿" className="pointer-events-none absolute inset-0 h-full w-full" viewBox={`0 0 ${size.w} ${size.h}`}>
   {[...(riverDrafts??[]).filter(r=>r.id!==riverEditor?.selectedId),...(riverCreation?[{id:'creating',geometry:riverCreation.points}]:[])].map(r=>{
    const points=r.geometry.reduce<number[][]>((out,p)=>{const previous=out.at(-1)?.[0]??p[0];out.push([previous+((p[0]-previous+540)%360-180),p[1]]);return out;},[]);
    return [-720,-360,0,360,720].map(shift=><g key={`${r.id}:${shift}`}><polyline points={points.map(p=>riverScreen(p,shift).join(',')).join(' ')} fill="none" stroke="#ea9d25" strokeWidth={3} strokeDasharray={r.id==='creating'?'6 3':undefined}/>{r.id==='creating'&&points.map((p,i)=>{const [x,y]=riverScreen(p,shift);return <circle key={i} cx={x} cy={y} r={4} fill="white" stroke="#195a91" strokeWidth={2}/>;})}</g>);
   })}
  </svg>:null}
  {riverEditor&&riverPoints&&<svg aria-label={language==='zh-TW'?'河流向量編輯':'River vector editor'} className="pointer-events-none absolute inset-0 h-full w-full" viewBox={`0 0 ${size.w} ${size.h}`}>
   {[-720,-360,0,360,720].map(shift=><g key={shift}>{riverPoints.slice(1).map((p,i)=>{const a=riverScreen(riverPoints[i],shift),b=riverScreen(p,shift);return <line key={i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="#ea9d25" strokeWidth={5} opacity={.8}/>;})}{riverPoints.map((p,i)=>{const [x,y]=riverScreen(p,shift),feature=riverEditor.rivers.find(r=>r.id===riverEditor.selectedId),locked=(i===0&&!!feature?.sourceLakeId)||(i===riverPoints.length-1&&!!(feature?.parentId||feature?.mouthLakeId));return <circle key={`${riverEditor.selectedId}:${i}`} data-river-control={i} data-river-id={riverEditor.selectedId} cx={x} cy={y} r={6} fill={locked?'#94a3b8':'white'} stroke="#195a91" strokeWidth={2} role="button" tabIndex={0} aria-label={`${language==='zh-TW'?'控制點':'Control point'} ${i+1}${locked?' 🔒':''}`} className="pointer-events-auto cursor-move touch-none" onKeyDown={e=>{if(locked||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();e.stopPropagation();const next=riverEditor.geometry!.map(p=>[...p]),step=e.shiftKey?.5:.1;next[i]=[((next[i][0]+(e.key==='ArrowRight'?step:e.key==='ArrowLeft'?-step:0)+540)%360)-180,Math.max(-90,Math.min(90,next[i][1]+(e.key==='ArrowUp'?step:e.key==='ArrowDown'?-step:0)))];riverEditor.onChange(next);}} onPointerDown={e=>{e.stopPropagation();if(locked||e.button!==0)return;e.currentTarget.setPointerCapture(e.pointerId);riverDrag.current={pointer:e.pointerId,index:i,riverId:riverEditor.selectedId,geometry:riverEditor.geometry!.map(p=>[...p])};}} onPointerMove={e=>{const drag=riverDrag.current;if(drag?.pointer!==e.pointerId||drag.riverId!==riverEditor.selectedId)return;const pos=location(e.clientX,e.clientY);if(pos){drag.geometry[drag.index]=pos;riverEditor.onChange(drag.geometry.map(p=>[...p]));}}} onPointerUp={e=>{if(riverDrag.current?.pointer===e.pointerId){riverDrag.current=null;if(e.currentTarget.hasPointerCapture?.(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);}}} onPointerCancel={e=>{if(riverDrag.current?.pointer===e.pointerId)riverDrag.current=null;}} onLostPointerCapture={e=>{if(riverDrag.current?.pointer===e.pointerId)riverDrag.current=null;}}/>;})}</g>)}
  </svg>}
  {footprint&&<svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full"><path d={footprint} fill="none" stroke="white" strokeWidth={3}/><path d={footprint} fill="none" stroke="#172734" strokeWidth={1.5} strokeDasharray="5 3"/></svg>}
  {!display&&drawing.climate&&<div className="absolute left-2 top-2 flex max-w-[55%] flex-wrap gap-1 rounded-md bg-[var(--color-bg)]/95 p-1 text-sm">
   <select className="min-h-11 max-w-full bg-[var(--color-bg)]" aria-label={language==='zh-TW'?'氣候圖層':'Climate layer'} value={climateLayer} onChange={e=>setClimateLayer(e.target.value)}>{[['terrain','地形','Terrain'],['heightmap','高度圖','Elevation'],['currents','表層洋流','Surface currents'],['sst','海表溫度 SST','Sea surface temperature'],['temperature','月均溫 °C','Monthly temperature °C'],['precipitation','月降水 mm','Monthly precipitation mm'],['koppen','柯本（全年）','Köppen (annual)'],...(drawing.natural?[['ecosystems','IUCN 潛在生態','IUCN potential ecosystems'],['seabedEcosystems','IUCN 海床生態','IUCN seabed ecosystems']]:[])].map(([v,z,en])=><option key={v} value={v}>{language==='zh-TW'?z:en}</option>)}</select>
   <select className="min-h-11 bg-[var(--color-bg)]" aria-label={language==='zh-TW'?'月份':'Month'} value={month} onChange={e=>setMonth(Number(e.target.value))}>{Array.from({length:12},(_,i)=><option key={i} value={i}>{i+1}{language==='zh-TW'?' 月':''}</option>)}</select>
   {drawing.natural&&['ecosystems','seabedEcosystems'].includes(climateLayer)&&<details className="w-full text-xs"><summary className="flex min-h-11 cursor-pointer items-center">{language==='zh-TW'?'潛在棲地圖例':'Potential habitat legend'}</summary><div className="grid max-h-32 grid-cols-1 gap-1 overflow-y-auto">{(drawing.natural.ecosystems.habitatCatalog??drawing.natural.ecosystems.catalog).map(c=><span key={c[0]} className="flex items-center gap-1"><span style={{background:c[3]}} className="inline-block h-3 w-3 shrink-0"/>{c[0]} {language==='zh-TW'?c[2]:c[1]}</span>)}</div></details>}
   {climateLayer==='koppen'&&<details className="w-full text-xs"><summary className="flex min-h-11 cursor-pointer items-center">{language==='zh-TW'?'分類色彩圖例':'Class color legend'}</summary><div className="grid max-h-32 grid-cols-4 gap-1 overflow-y-auto">{drawing.climate.codes.map((code,i)=><span key={code} className="flex items-center gap-1"><span style={{background:KOPPEN_COLORS[i]}} className="inline-block h-3 w-3"/>{koppenName(code,language==='zh-TW')}</span>)}</div></details>}
   {!['terrain','heightmap'].includes(climateLayer)&&<p className="w-full max-w-64 text-xs">{climateLayer==='precipitation'?(language==='zh-TW'?'淺→深：0／10／25／50／100／175／275／450+ mm／月':'Light→dark: 0/10/25/50/100/175/275/450+ mm/month'):['ecosystems','seabedEcosystems'].includes(climateLayer)?(language==='zh-TW'?'依氣候、地形與水分推估的潛在棲地；非實地調查。':'Potential habitats inferred from climate, terrain and water; not a field survey.'):climateLayer==='koppen'?(language==='zh-TW'?'A: 熱帶 · B: 乾燥 · C: 溫帶 · D: 冷帶 · E: 極地':'A: Tropical · B: Arid · C: Temperate · D: Cold · E: Polar'):climateLayer==='currents'?(language==='zh-TW'?'紅：相對暖流；藍：相對寒流；年平均流向':'Red: warmer SST anomaly; blue: cooler anomaly; annual flow'):language==='zh-TW'?'藍→紅：−20／−5／5／15／22／28／35+ °C；洋流箭頭為年平均方向':'Blue→red: −20/−5/5/15/22/28/35+ °C; annual current directions'}</p>}
  </div>}
  {!display&&<details className="absolute right-2 top-2 rounded-md border bg-[var(--color-bg)]/95 px-2 text-sm"><summary className="flex min-h-11 cursor-pointer items-center">{language==='zh-TW'?'疊加圖層':'Overlays'}</summary>
   {drawing.plateBoundaries&&<label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={showPlates} onChange={e=>setShowPlates(e.currentTarget.checked)}/>{language==='zh-TW'?'板塊與隱沒方向':'Plates and subduction'}</label>}
   {drawing.geology&&<label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={showGeology} onChange={e=>setShowGeology(e.currentTarget.checked)}/>{language==='zh-TW'?'海底地質':'Seafloor geology'}</label>}
   {drawing.natural&&<><label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={showPack} onChange={e=>setShowPack(e.currentTarget.checked)}/>Pack ({drawing.natural.pack.cells.toLocaleString()})</label><label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={showHydrology} onChange={e=>setShowHydrology(e.currentTarget.checked)}/>{language==='zh-TW'?'河流與湖泊':'Rivers and lakes'}</label></>}
  </details>}
  {showGeology&&drawing.geology&&<p className="absolute right-2 top-28 max-w-64 rounded-md bg-[var(--color-bg)]/95 px-2 py-1 text-xs">{language==='zh-TW'?'青：中洋脊　深藍：海溝　橘：海底火山　紫：島鏈':'Cyan: ridges · Blue: trenches · Orange: volcanoes · Purple: island chains'}</p>}
  {showPlates&&drawing.tectonicSymbols&&<p className="absolute left-2 top-36 max-w-52 rounded-md bg-[var(--color-bg)]/95 px-2 py-1 text-xs">{language==='zh-TW'?'紅齒：上覆側，紅箭頭：隱沒方向｜紫：碰撞｜青：張裂｜褐：錯動｜黑箭頭：板塊移動（示意）':'Red teeth: overriding side; red arrows: subduction · Purple: collision · Cyan: spreading · Brown: transform · Black: plate motion (schematic)'}</p>}
  {showPlates&&drawing.plates&&<p className="absolute bottom-2 right-2 rounded-md bg-[var(--color-bg)]/95 px-2 py-1 text-xs">{language==='zh-TW'?`${drawing.plates.length} 個主板塊｜面積 ${Math.min(...drawing.plates.map(p=>p.areaPercent)).toFixed(1)}–${Math.max(...drawing.plates.map(p=>p.areaPercent)).toFixed(1)}%`:`${drawing.plates.length} major plates`}</p>}
  {hoverHeight!==undefined&&(climateLayer==='heightmap'||onPaint||onStroke)&&<output className="pointer-events-none absolute bottom-2 right-2 rounded-md bg-[var(--color-bg)]/95 px-2 py-1 text-xs">{language==='zh-TW'?'海拔':'Elevation'} {hoverHeight.toLocaleString()} m</output>}
  <div className="absolute bottom-2 left-2 flex gap-2 [&_button]:min-h-11 [&_button]:min-w-11 [&_button]:rounded-lg [&_button]:border [&_button]:bg-[var(--color-bg)] [&_button]:px-3"><button aria-label={text('zoomIn')} onClick={()=>zoom(1.5)}>＋</button><button aria-label={text('zoomOut')} onClick={()=>zoom(1/1.5)}>−</button><button onClick={()=>setView({zoom:1,x:0,y:0})}>{text('reset')}</button></div>
 </div>;
}
