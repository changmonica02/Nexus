"use client";
import {useEffect,useRef,useState} from 'react';
import type {GlobalMapDrawing} from '../features/worldMap/globalMapGeometry';
import {useLanguage} from '../lib/LanguageContext';
import {globalMapText} from '../features/worldMap/globalMapMessages';
export default function GlobalMapCanvas({drawing}:{drawing:GlobalMapDrawing}){
 const {language}=useLanguage(),text=globalMapText(language),canvas=useRef<HTMLCanvasElement>(null);
 const [view,setView]=useState({zoom:1,x:0,y:0}),[size,setSize]=useState({w:800,h:400});
 const [showPlates,setShowPlates]=useState(false),[showGeology,setShowGeology]=useState(false);
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
   if(showPlates&&drawing.plates)for(const plate of drawing.plates){
    ctx.globalAlpha=.55;ctx.fillStyle=plate.color;ctx.beginPath();
    for(const ring of plate.rings){ring.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();}ctx.fill();ctx.globalAlpha=1;
   }
   ctx.beginPath();for(const line of drawing.coast){ctx.moveTo(line[0][0],line[0][1]);ctx.lineTo(line[1][0],line[1][1]);}
   ctx.strokeStyle='#547457';ctx.lineWidth=.7/s;ctx.stroke();
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
   ctx.restore();
  }
 },[drawing,view,size,showPlates,showGeology]);
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
  {drawing.plateBoundaries&&<label className="absolute right-2 top-2 flex min-h-11 items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)]/95 px-3 text-sm text-[var(--color-text)] shadow-sm"><input type="checkbox" checked={showPlates} onChange={e=>setShowPlates(e.currentTarget.checked)} aria-label={language==='zh-TW'?'顯示板塊邊界':'Show tectonic plate boundaries'}/>{language==='zh-TW'?'板塊與隱沒方向':'Plates and subduction'}</label>}
  {drawing.geology&&<label className="absolute right-2 top-16 flex min-h-11 items-center gap-2 rounded-md border bg-[var(--color-bg)]/95 px-3 text-sm"><input type="checkbox" checked={showGeology} onChange={e=>setShowGeology(e.currentTarget.checked)}/>{language==='zh-TW'?'海底地質':'Seafloor geology'}</label>}
  {showGeology&&drawing.geology&&<p className="absolute right-2 top-28 max-w-64 rounded-md bg-[var(--color-bg)]/95 px-2 py-1 text-xs">{language==='zh-TW'?'青：中洋脊　深藍：海溝　橘：海底火山　紫：島鏈':'Cyan: ridges · Blue: trenches · Orange: volcanoes · Purple: island chains'}</p>}
  {showPlates&&drawing.tectonicSymbols&&<p className="absolute left-2 top-2 max-w-52 rounded-md bg-[var(--color-bg)]/95 px-2 py-1 text-xs">{language==='zh-TW'?'紅齒：上覆側，紅箭頭：隱沒方向｜紫：碰撞｜青：張裂｜褐：錯動｜黑箭頭：板塊移動（示意）':'Red teeth: overriding side; red arrows: subduction · Purple: collision · Cyan: spreading · Brown: transform · Black: plate motion (schematic)'}</p>}
  {showPlates&&drawing.plates&&<p className="absolute bottom-2 right-2 rounded-md bg-[var(--color-bg)]/95 px-2 py-1 text-xs">{language==='zh-TW'?`${drawing.plates.length} 個主板塊｜面積 ${Math.min(...drawing.plates.map(p=>p.areaPercent)).toFixed(1)}–${Math.max(...drawing.plates.map(p=>p.areaPercent)).toFixed(1)}%`:`${drawing.plates.length} major plates`}</p>}
  <p className="absolute bottom-16 left-2 rounded-md bg-[var(--color-bg)]/95 px-2 py-1 text-xs">{language==='zh-TW'?'實際陸地':'Actual land'} {drawing.landPercent.toFixed(3)}%</p>
  <div className="absolute bottom-2 left-2 flex gap-2 [&_button]:min-h-11 [&_button]:min-w-11 [&_button]:rounded-lg [&_button]:border [&_button]:bg-[var(--color-bg)] [&_button]:px-3"><button aria-label={text('zoomIn')} onClick={()=>zoom(1.5)}>＋</button><button aria-label={text('zoomOut')} onClick={()=>zoom(1/1.5)}>−</button><button onClick={()=>setView({zoom:1,x:0,y:0})}>{text('reset')}</button></div>
 </div>;
}
