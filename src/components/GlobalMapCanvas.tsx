"use client";
import {useEffect,useRef,useState} from 'react';
import type {GlobalMapDrawing} from '../features/worldMap/globalMapGeometry';
import {useLanguage} from '../lib/LanguageContext';
import {globalMapText} from '../features/worldMap/globalMapMessages';
export default function GlobalMapCanvas({drawing}:{drawing:GlobalMapDrawing}){
 const {language}=useLanguage(),text=globalMapText(language),canvas=useRef<HTMLCanvasElement>(null);
 const [view,setView]=useState({zoom:1,x:0,y:0}),[size,setSize]=useState({w:800,h:400});
 const [showPlates,setShowPlates]=useState(false);
 const pointers=useRef(new Map<number,{x:number;y:number}>());
 useEffect(()=>{const el=canvas.current!;const observer=new ResizeObserver(([entry])=>setSize({w:Math.max(1,entry.contentRect.width),h:Math.max(1,entry.contentRect.height)}));observer.observe(el);return()=>observer.disconnect();},[]);
 useEffect(()=>{
  const el=canvas.current!,ctx=el.getContext('2d');if(!ctx)return;
  const ratio=Math.min(devicePixelRatio||1,2);el.width=Math.round(size.w*ratio);el.height=Math.round(size.h*ratio);
  ctx.scale(ratio,ratio);ctx.fillStyle='#b1d3df';ctx.fillRect(0,0,size.w,size.h);
  const s=Math.min(size.w/360,size.h/180)*view.zoom;
  const period=360*s,pan=((view.x+period/2)%period+period)%period-period/2;
  ctx.translate(size.w/2+pan,size.h/2+view.y);ctx.scale(s,-s);
  const copies=Math.ceil(size.w/period/2)+1;
  for(let k=-copies;k<=copies;k++){
   ctx.save();ctx.translate(k*360,0);ctx.fillStyle='#a2ba81';
   ctx.beginPath();for(const ring of drawing.land){ring.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();}ctx.fill();
   if(drawing.relief)for(const band of drawing.relief){
    ctx.fillStyle=band.color;ctx.beginPath();
    for(const ring of band.rings){ring.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();}
    ctx.fill();
   }
   ctx.beginPath();for(const line of drawing.coast){ctx.moveTo(line[0][0],line[0][1]);ctx.lineTo(line[1][0],line[1][1]);}
   ctx.strokeStyle='#547457';ctx.lineWidth=.7/s;ctx.stroke();
   if(showPlates&&drawing.plateBoundaries?.length){
    ctx.beginPath();for(const line of drawing.plateBoundaries){if(line.length!==2)continue;ctx.moveTo(line[0][0],line[0][1]);ctx.lineTo(line[1][0],line[1][1]);}
    ctx.strokeStyle='#ca4a38';ctx.lineWidth=1.5/s;ctx.stroke();
   }
   ctx.restore();
  }
 },[drawing,view,size,showPlates]);
 useEffect(()=>{
  const el=canvas.current!;
  const wheel=(e:WheelEvent)=>{e.preventDefault();setView(v=>{const z=Math.max(1,Math.min(32,v.zoom*(e.deltaY<0?1.2:1/1.2))),f=z/v.zoom;return {zoom:z,x:v.x*f,y:Math.max(-size.h*z/2,Math.min(size.h*z/2,v.y*f))};});};
  el.addEventListener('wheel',wheel,{passive:false});return()=>el.removeEventListener('wheel',wheel);
 },[size.h]);
 const zoom=(factor:number)=>setView(v=>{const z=Math.max(1,Math.min(32,v.zoom*factor)),f=z/v.zoom;return {zoom:z,x:v.x*f,y:Math.max(-size.h*z/2,Math.min(size.h*z/2,v.y*f))};});
 return <div className="relative h-full min-h-56 w-full overflow-hidden rounded-lg bg-[#b1d3df]">
  <canvas ref={canvas} data-global-map-canvas tabIndex={0} aria-label={text('title')} className="h-full min-h-56 w-full touch-none outline-offset-[-3px]" onKeyDown={e=>{if(['+','=','-','0','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))e.preventDefault();if(e.key==='+'||e.key==='=')zoom(1.5);if(e.key==='-')zoom(1/1.5);if(e.key==='0')setView({zoom:1,x:0,y:0});if(e.key.startsWith('Arrow'))setView(v=>({...v,x:v.x+(e.key==='ArrowLeft'?40:e.key==='ArrowRight'?-40:0),y:v.y+(e.key==='ArrowUp'?40:e.key==='ArrowDown'?-40:0)}));}} onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY});}} onPointerMove={e=>{
   const old=pointers.current.get(e.pointerId);if(!old)return;
   if(pointers.current.size===2){const other=[...pointers.current.entries()].find(([id])=>id!==e.pointerId)![1],before=Math.hypot(old.x-other.x,old.y-other.y),after=Math.hypot(e.clientX-other.x,e.clientY-other.y);if(before>1)zoom(after/before);}
   else setView(v=>({...v,x:v.x+e.clientX-old.x,y:Math.max(-size.h*v.zoom/2,Math.min(size.h*v.zoom/2,v.y+e.clientY-old.y))}));
   pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY});
  }} onPointerUp={e=>pointers.current.delete(e.pointerId)} onPointerCancel={e=>pointers.current.delete(e.pointerId)} onLostPointerCapture={e=>pointers.current.delete(e.pointerId)}/>
  {drawing.plateBoundaries&&<label className="absolute right-2 top-2 flex min-h-11 items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)]/95 px-3 text-sm text-[var(--color-text)] shadow-sm"><input type="checkbox" checked={showPlates} onChange={e=>setShowPlates(e.currentTarget.checked)} aria-label={language==='zh-TW'?'顯示板塊邊界':'Show tectonic plate boundaries'}/>{language==='zh-TW'?'板塊邊界':'Plate boundaries'}</label>}
  <div className="absolute bottom-2 left-2 flex gap-2 [&_button]:min-h-11 [&_button]:min-w-11 [&_button]:rounded-lg [&_button]:border [&_button]:bg-[var(--color-bg)] [&_button]:px-3"><button aria-label={text('zoomIn')} onClick={()=>zoom(1.5)}>＋</button><button aria-label={text('zoomOut')} onClick={()=>zoom(1/1.5)}>−</button><button onClick={()=>setView({zoom:1,x:0,y:0})}>{text('reset')}</button></div>
 </div>;
}
