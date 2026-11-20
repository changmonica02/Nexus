"use client";
import {sphericalBrushRing,heightBrushChanges,heightStrokeChanges,sampleHeightStroke} from '../features/worldMap/core/heightBrush.mjs';
import {mapPalettes,elevationColors,elevationLevels,depthColors,depthLevels,type GlobalMapDisplay} from '../features/worldMap/globalMapDisplay';
import {climateColor,KOPPEN_COLORS,RAIN_LEVELS,RAIN_COLORS,TEMPERATURE_LEVELS,TEMPERATURE_COLORS} from '../../experiments/spherical-grid/climate-display.mjs';
import {buildScalarBands} from '../features/worldMap/core/scalarBands.mjs';
import {buildRiverStrokes,riverLabelStyle} from '../features/worldMap/core/riverDrawing.mjs';
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
export default function GlobalMapCanvas({drawing,onPaint,onStroke,paintRadius,display,editingHeight,lineStart}:{drawing:GlobalMapDrawing;onPaint?:(longitude:number,latitude:number)=>void;onStroke?:(points:[number,number][])=>void;paintRadius?:number;display?:GlobalMapDisplay;editingHeight?:Omit<HeightBrush,'longitude'|'latitude'>;lineStart?:[number,number]}){
 const {language}=useLanguage(),text=globalMapText(language),canvas=useRef<HTMLCanvasElement>(null);
 const [view,commitView]=useState({zoom:1,x:0,y:0}),[size,setSize]=useState({w:800,h:400});
 const liveView=useRef(view),viewFrame=useRef<number|null>(null);
 const setView=useCallback((update:SetStateAction<typeof view>)=>{
  liveView.current=typeof update==='function'?update(liveView.current):update;
  if(viewFrame.current===null)viewFrame.current=window.requestAnimationFrame(()=>{
   viewFrame.current=null;commitView(liveView.current);
  });
 },[]);
 useEffect(()=>()=>{if(viewFrame.current!==null){window.cancelAnimationFrame(viewFrame.current);viewFrame.current=null;}},[]);
 const [tileZoom,setTileZoom]=useState(1);
 useEffect(()=>{
  if(view.zoom===tileZoom)return;
  const settle=window.setTimeout(()=>setTileZoom(view.zoom),120);
  return()=>window.clearTimeout(settle);
 },[view.zoom,tileZoom]);
 const [localPlates,setShowPlates]=useState(false),[localGeology,setShowGeology]=useState(false);
 const showPlates=display?.overlays.plates??localPlates,showGeology=display?.overlays.geology??localGeology,palette=mapPalettes[display?.style??'terrain'];
 const [localLayer,setClimateLayer]=useState('terrain'),[localMonth,setMonth]=useState(0);
 const climateLayer=display?.mode??localLayer,month=display?.month??localMonth,showCurrents=display?.overlays.currents??['sst','currents'].includes(climateLayer);
 const mesh=drawing.scalarMesh;
 const editGrid=!!(editingHeight&&mesh?.heights&&mesh.cellRings&&typeof Path2D!=='undefined');
 const editCells=useMemo(()=>{
  if(!editGrid||!mesh?.heights||!mesh.cellRings)return null;
  const fills=new Map<string,Path2D>(),lines=new Path2D();
  mesh.cellRings.forEach((ring,i)=>{
   const h=mesh.heights![i],color=heightCellColor(h,mesh.oceanMask?!!mesh.oceanMask[i]:h<0);
   if(!fills.has(color))fills.set(color,new Path2D());
   cellPath(fills.get(color)!,ring);cellPath(lines,ring);
  });
  return {fills,lines};
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
   const scientific=climateLayer==='heightmap'||climateLayer==='contours',custom=scientific?undefined:palette.relief;
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
  const values=climateLayer==='seabedEcosystems'?n.ecosystems.seabed:n.ecosystems.surface;
  return n.ecosystems.catalog.map((c,i)=>({color:c[3],rings:n.pack.rings.filter((_,j)=>values[j]===i)}));
 },[drawing,climateLayer]);
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
 const visibleRivers=useMemo(()=>(drawing.natural?.rivers??[]).filter(river=>showTributaries||(river.streamOrder??2)>=2||river.catchmentAreaKm2>=150000||river.lengthKm>=600),[drawing,showTributaries]);
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
 const pointers=useRef(new Map<number,{x:number;y:number}>());
 useEffect(()=>{const el=canvas.current!;const observer=new ResizeObserver(([entry])=>setSize({w:Math.max(1,entry.contentRect.width),h:Math.max(1,entry.contentRect.height)}));observer.observe(el);return()=>observer.disconnect();},[]);
 const paintBase=useMemo(()=>(ctx:CanvasRenderingContext2D,scale:number)=>{
   if(editCells){
    for(const [color,path] of editCells.fills){ctx.fillStyle=color;ctx.fill(path);}
    if(scale>=3){ctx.strokeStyle='rgba(20,62,68,.18)';ctx.lineWidth=.45/scale;ctx.stroke(editCells.lines);}
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
   for(const band of [...climateBands,...ecosystemBands]){ctx.fillStyle=band.color;ctx.beginPath();for(const ring of band.rings){ring.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();}ctx.fill();}
 },[drawing,palette,surfacePaths,scalarLayers,climateLayer,climateBands,ecosystemBands,editCells]);
 const baseTiles=useMemo(()=>new Map<string,HTMLCanvasElement>(),[paintBase]);
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
  const tileResolution=2**(Math.ceil(Math.log2(Math.min(size.w/360,size.h/180)*tileZoom*ratio)*2)/2);
  const margin=2/s;
  const occupiedRiverLabels:{left:number;right:number;top:number;bottom:number}[]=[];
  for(let k=-copies;k<=copies;k++){
   if(Math.abs(pan+k*period)>size.w/2+period/2)continue;
   ctx.save();ctx.translate(k*360,0);if(surfacePaths){ctx.beginPath();ctx.rect(-180,-90,360,180);ctx.clip();}
   const left=Math.max(-180,(-size.w/2-pan)/s-k*360),right=Math.min(180,(size.w/2-pan)/s-k*360);
   const top=Math.min(90,(size.h/2+view.y)/s),bottom=Math.max(-90,(view.y-size.h/2)/s);
   if(!surfacePaths||!drawing.scalarMesh||!drawBaseTiles(ctx,left,right,bottom,top,tileResolution,ratio,baseTiles,paintBase,palette.ocean)){
    paintBase(ctx,s);
   }
   if(editGrid){
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
   ctx.restore();
  }
 },[drawing,view,size,showPlates,showGeology,climateBands,ecosystemBands,climateLayer,month,showPack,showRivers,showLakes,showNames,showCurrents,palette,surfacePaths,scalarLayers,riverStrokes,riverLabels,baseTiles,paintBase,tileZoom,editGrid,previewCells]);
 useEffect(()=>{
  const el=canvas.current!;
  const wheel=(e:WheelEvent)=>{e.preventDefault();setView(v=>{const z=Math.max(1,Math.min(32,v.zoom*(e.deltaY<0?1.2:1/1.2))),f=z/v.zoom;return {zoom:z,x:v.x*f,y:Math.max(-size.h*z/2,Math.min(size.h*z/2,v.y*f))};});};
  el.addEventListener('wheel',wheel,{passive:false});return()=>el.removeEventListener('wheel',wheel);
 },[size.h,setView]);
 const zoom=(factor:number)=>setView(v=>{const z=Math.max(1,Math.min(32,v.zoom*factor)),f=z/v.zoom;return {zoom:z,x:v.x*f,y:Math.max(-size.h*z/2,Math.min(size.h*z/2,v.y*f))};});
 return <div className="relative h-full min-h-56 w-full overflow-hidden rounded-lg bg-[#b1d3df]">
  <canvas ref={canvas} data-global-map-canvas data-height-editing={editGrid||undefined} tabIndex={0} aria-label={text('title')} className="h-full min-h-56 w-full touch-none outline-offset-[-3px]" style={{cursor:onPaint||onStroke?'crosshair':'grab'}} onKeyDown={e=>{if(['+','=','-','0','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))e.preventDefault();if(e.key==='+'||e.key==='=')zoom(1.5);if(e.key==='-')zoom(1/1.5);if(e.key==='0')setView({zoom:1,x:0,y:0});if(e.key.startsWith('Arrow'))setView(v=>({...v,x:v.x+(e.key==='ArrowLeft'?40:e.key==='ArrowRight'?-40:0),y:v.y+(e.key==='ArrowUp'?40:e.key==='ArrowDown'?-40:0)}));}} onPointerDown={e=>{if(e.button!==0)return;if(onStroke){if(stroke.current)return;const p=location(e.clientX,e.clientY);if(p){stroke.current={id:e.pointerId,points:[p]};setStrokePreview([p]);e.currentTarget.setPointerCapture(e.pointerId);}return;}if(onPaint){const p=location(e.clientX,e.clientY);if(p)onPaint(...p);return;}e.currentTarget.setPointerCapture(e.pointerId);pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY});}} onPointerMove={e=>{
   if(onPaint||onStroke||climateLayer==='heightmap')setHoverPoint(location(e.clientX,e.clientY));
   if(stroke.current?.id===e.pointerId){const p=location(e.clientX,e.clientY);if(p){const points=stroke.current.points,last=points.at(-1)!;if(Math.hypot(((p[0]-last[0]+540)%360-180)*Math.cos(p[1]*Math.PI/180),p[1]-last[1])>Math.min(.5,(paintRadius??1)/4)){if(points.length===256)stroke.current.points=points.filter((_,i)=>i%2===0);stroke.current.points.push(p);setStrokePreview([...stroke.current.points]);}}return;}
   const old=pointers.current.get(e.pointerId);if(!old)return;
   if(pointers.current.size===2){const other=[...pointers.current.entries()].find(([id])=>id!==e.pointerId)![1],before=Math.hypot(old.x-other.x,old.y-other.y),after=Math.hypot(e.clientX-other.x,e.clientY-other.y);if(before>1)zoom(after/before);}
   else setView(v=>({...v,x:v.x+e.clientX-old.x,y:Math.max(-size.h*v.zoom/2,Math.min(size.h*v.zoom/2,v.y+e.clientY-old.y))}));
   pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY});
  }} onPointerLeave={()=>setHoverPoint(null)} onPointerUp={e=>{if(stroke.current?.id===e.pointerId){const points=stroke.current.points,end=location(e.clientX,e.clientY),last=points.at(-1)!;if(end&&points.length<256&&Math.hypot(end[0]-last[0],end[1]-last[1])>1e-6)points.push(end);stroke.current=null;setStrokePreview(null);onStroke?.(points);}pointers.current.delete(e.pointerId);}} onPointerCancel={e=>{if(stroke.current?.id===e.pointerId){stroke.current=null;setStrokePreview(null);}pointers.current.delete(e.pointerId);}} onLostPointerCapture={e=>{if(stroke.current?.id===e.pointerId){stroke.current=null;setStrokePreview(null);}pointers.current.delete(e.pointerId);}}/>
  {footprint&&<svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full"><path d={footprint} fill="none" stroke="white" strokeWidth={3}/><path d={footprint} fill="none" stroke="#172734" strokeWidth={1.5} strokeDasharray="5 3"/></svg>}
  {!display&&drawing.climate&&<div className="absolute left-2 top-2 flex max-w-[55%] flex-wrap gap-1 rounded-md bg-[var(--color-bg)]/95 p-1 text-sm">
   <select className="min-h-11 max-w-full bg-[var(--color-bg)]" aria-label={language==='zh-TW'?'氣候圖層':'Climate layer'} value={climateLayer} onChange={e=>setClimateLayer(e.target.value)}>{[['terrain','地形','Terrain'],['heightmap','高度圖','Elevation'],['currents','表層洋流','Surface currents'],['sst','海表溫度 SST','Sea surface temperature'],['temperature','月均溫 °C','Monthly temperature °C'],['precipitation','月降水 mm','Monthly precipitation mm'],['koppen','柯本（全年）','Köppen (annual)'],...(drawing.natural?[['ecosystems','IUCN 潛在生態','IUCN potential ecosystems'],['seabedEcosystems','IUCN 海床生態','IUCN seabed ecosystems']]:[])].map(([v,z,en])=><option key={v} value={v}>{language==='zh-TW'?z:en}</option>)}</select>
   <select className="min-h-11 bg-[var(--color-bg)]" aria-label={language==='zh-TW'?'月份':'Month'} value={month} onChange={e=>setMonth(Number(e.target.value))}>{Array.from({length:12},(_,i)=><option key={i} value={i}>{i+1}{language==='zh-TW'?' 月':''}</option>)}</select>
   {drawing.natural&&['ecosystems','seabedEcosystems'].includes(climateLayer)&&<details className="w-full text-xs"><summary className="flex min-h-11 cursor-pointer items-center">{language==='zh-TW'?'IUCN 第二層圖例':'IUCN Level 2 legend'}</summary><div className="grid max-h-32 grid-cols-1 gap-1 overflow-y-auto">{drawing.natural.ecosystems.catalog.map(c=><span key={c[0]} className="flex items-center gap-1"><span style={{background:c[3]}} className="inline-block h-3 w-3 shrink-0"/>{c[0]} {language==='zh-TW'?c[2]:c[1]}</span>)}</div></details>}
   {climateLayer==='koppen'&&<details className="w-full text-xs"><summary className="flex min-h-11 cursor-pointer items-center">{language==='zh-TW'?'分類色彩圖例':'Class color legend'}</summary><div className="grid max-h-32 grid-cols-4 gap-1 overflow-y-auto">{drawing.climate.codes.map((code,i)=><span key={code} className="flex items-center gap-1"><span style={{background:KOPPEN_COLORS[i]}} className="inline-block h-3 w-3"/>{code}</span>)}</div></details>}
   {!['terrain','heightmap'].includes(climateLayer)&&<p className="w-full max-w-64 text-xs">{climateLayer==='precipitation'?(language==='zh-TW'?'淺→深：0／10／25／50／100／175／275／450+ mm／月':'Light→dark: 0/10/25/50/100/175/275/450+ mm/month'):['ecosystems','seabedEcosystems'].includes(climateLayer)?(language==='zh-TW'?'IUCN 第二層程序估計；非實地調查。河線虛線表示當月枯水。':'IUCN Level 2 potential estimate, not a survey; dashed channels indicate low monthly flow.'):climateLayer==='koppen'?(language==='zh-TW'?'A: 熱帶 · B: 乾燥 · C: 溫帶 · D: 冷帶 · E: 極地':'A: Tropical · B: Arid · C: Temperate · D: Cold · E: Polar'):climateLayer==='currents'?(language==='zh-TW'?'紅：相對暖流；藍：相對寒流；年平均流向':'Red: warmer SST anomaly; blue: cooler anomaly; annual flow'):language==='zh-TW'?'藍→紅：−20／−5／5／15／22／28／35+ °C；洋流箭頭為年平均方向':'Blue→red: −20/−5/5/15/22/28/35+ °C; annual current directions'}</p>}
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
  <p className="absolute bottom-16 left-2 rounded-md bg-[var(--color-bg)]/95 px-2 py-1 text-xs">{language==='zh-TW'?'實際陸地':'Actual land'} {drawing.landPercent.toFixed(3)}%</p>
  <div className="absolute bottom-2 left-2 flex gap-2 [&_button]:min-h-11 [&_button]:min-w-11 [&_button]:rounded-lg [&_button]:border [&_button]:bg-[var(--color-bg)] [&_button]:px-3"><button aria-label={text('zoomIn')} onClick={()=>zoom(1.5)}>＋</button><button aria-label={text('zoomOut')} onClick={()=>zoom(1/1.5)}>−</button><button onClick={()=>setView({zoom:1,x:0,y:0})}>{text('reset')}</button></div>
 </div>;
}
