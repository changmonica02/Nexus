// Nexus adapter for our fork. No account credentials or Nexus persistence here.
import { Save } from '@/services/io/save';
import { loadNexusMap } from '@/services/io/load';
import { Services } from '@/services';
import {naturalCatalog,naturalConfig,previewNaturalHeightmap,applyNaturalView} from '@/generators/nexus-natural';
import {generate} from '@/components/lifecycle';
import {closeDialogs} from '@/components/dialog/dialog-helpers';
import {undraw} from '@/components/undraw';
import {Layers} from '@/components/layers';
import {viewport} from '@/components/viewport';
import {fitMapToScreen,useContainViewport,containScale} from '@/components/canvas';
import {configurePreviewGestures,zoomAtPoint,changeMapZoom,zoomTo} from '@/components/zoom';
window.nexusMapData=()=>[typeof pack==='undefined'?undefined:pack,typeof options==='undefined'?undefined:options.map,(window as unknown as {notes?:unknown}).notes];
useContainViewport();
let preview=true,freePan=false;
const fitScale=()=>containScale(viewport.width,viewport.height,options.map.graph.width,options.map.graph.height);
const fitView=()=>zoomTo(options.map.graph.width/2,options.map.graph.height/2,fitScale(),0);
configurePreviewGestures(true,false);
const previewStyle=document.createElement('style');
previewStyle.textContent='body.nexus-preview > :not(#map):not(svg):not(script):not(style){display:none!important}body.nexus-preview{background:transparent!important}body.nexus-preview #map{cursor:grab;background:transparent!important}body .speaker{display:none!important}';
document.head.append(previewStyle);document.body.classList.add('nexus-preview');
for(const type of ['click','contextmenu','keydown'])document.addEventListener(type,event=>{if(preview&&!(event instanceof KeyboardEvent&&['Tab','Escape'].includes(event.key))){event.preventDefault();event.stopImmediatePropagation();}},true);
// Preview double-click zooms without opening a native editing tool.
document.addEventListener('dblclick',event=>{
  if(!preview)return;
  event.preventDefault();event.stopImmediatePropagation();
  const rect=document.getElementById('map')!.getBoundingClientRect();
  zoomAtPoint(event.shiftKey?0.5:2,event.clientX-rect.left,event.clientY-rect.top);
},true);
let touchY=0,pinched=false;
document.addEventListener('touchstart',event=>{
  if(!preview||freePan)return;
  if(event.touches.length===1){touchY=event.touches[0].clientY;pinched=false;}
  else pinched=true;
},{capture:true,passive:true});
document.addEventListener('touchmove',event=>{
  if(!preview||freePan||event.touches.length!==1)return;
  event.preventDefault();event.stopImmediatePropagation();
  const nextY=event.touches[0].clientY,delta=touchY-nextY;touchY=nextY;
  if(!pinched&&Number.isFinite(delta))port?.postMessage({type:'scroll',delta});
},{capture:true,passive:false});
const reportView=()=>port?.postMessage({type:'view',preview,view:{x:(viewport.width/2-viewport.x)/viewport.scale,y:(viewport.height/2-viewport.y)/viewport.scale,scale:viewport.scale}});
let viewTimer:ReturnType<typeof setTimeout>|undefined;
for(const type of ['pointerup','wheel','touchend'])document.addEventListener(type,()=>{clearTimeout(viewTimer);viewTimer=setTimeout(reportView,180);},{passive:true});


const session = window.nexusSession ?? new URL(location.href).searchParams.get('nexus');
let port: MessagePort | undefined, busy = false, ready = false, sequence = 0;
const pendingSaves = new Map<number, { resolve: () => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> }>();
const notify = (type: string) => port?.postMessage({ type });

async function image(type: 'svg' | 'png'): Promise<Blob> {
  const url = await Services.ExportMap.getMapURL(type, { fullMap: true });
  try {
    if (type === 'svg') return await (await fetch(url)).blob();
    const img = new Image();
    await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = () => reject(Error('Image export failed')); img.src = url; });
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
    canvas.getContext('2d')!.drawImage(img, 0, 0);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(Error('PNG export failed')), 'image/png'));
  } finally { URL.revokeObjectURL(url); }
}

window.addEventListener('message', event => {
  if (event.source !== parent || event.data?.type !== 'nexus-map-connect' || event.data.session !== session || !event.ports[0] || port) return;
  port = event.ports[0];
  port.onmessage = async ({ data }) => {
    if(data?.type==='remember-saved' && data.blob instanceof Blob){
      // Support native Quick Load for this editor session; Nexus remains the truth.
      await ldb.set('lastMap',data.blob);return;
    }
    if (data?.type === 'persist-result') {
      const pending = pendingSaves.get(data.id);
      if (!pending) return;
      clearTimeout(pending.timer); pendingSaves.delete(data.id);
      if (data.error) pending.reject(Error(data.error)); else pending.resolve();
      return;
    }
    if (!Number.isSafeInteger(data?.id)) return;
    if (busy) { port!.postMessage({ id: data.id, error: 'Map operation already in progress' }); return; }
    busy = true;
    try {
      if (data.type!=='configure'&&customization) throw Error('Complete the active heightmap/edit mode before saving or exporting');
      let blob: Blob | undefined;
      if(data.type==='configure'){
        const settings=data.settings??{};
        if(typeof settings.language==='string')window.nexusSetLanguage?.(settings.language);
        const modeChanged=typeof settings.preview==='boolean'&&preview!==settings.preview;
        if(typeof settings.preview==='boolean')preview=settings.preview;
        if(typeof settings.freePan==='boolean')freePan=settings.freePan;
        document.body.classList.toggle('nexus-preview',preview);
        configurePreviewGestures(preview,freePan);
        if(modeChanged||settings.resize){
          const view=settings.view??{x:(viewport.width/2-viewport.x)/viewport.scale,y:(viewport.height/2-viewport.y)/viewport.scale,scale:viewport.scale};
          const wasFit=Math.abs(viewport.scale-fitScale())<0.001;
          fitMapToScreen();
          await new Promise<void>(resolve=>requestAnimationFrame(()=>{if(settings.fit||wasFit&&!settings.view)fitView();else zoomTo(view.x,view.y,view.scale,0);resolve();}));
        }else if(settings.fit)fitView();
        else if(settings.view)zoomTo(settings.view.x,settings.view.y,settings.view.scale,0);
        if(settings.layer)applyNaturalView(settings.layer,settings.overlays,settings.contourInterval,settings.contourLabels);
        if(typeof settings.zoom==='number'&&settings.zoom>0&&Number.isFinite(settings.zoom))changeMapZoom(settings.zoom);
        reportView();
      }else if(data.type==='catalog'){
        blob=new Blob([JSON.stringify(naturalCatalog())],{type:'application/json'});
      }else if(data.type==='heightmap-preview'){
        blob=await previewNaturalHeightmap(data.settings?.generation??{});
      }else if(data.type==='generate'){
        ready=false;closeDialogs();undraw();await generate(naturalConfig(data.settings?.generation));Layers.drawAll();if(!ready)throw Error('Map is not ready');
      }else if (data.type === 'load') {
        if (!(data.blob instanceof Blob)) throw Error('Missing project');
        ready = false;
        await loadNexusMap(data.blob);
        ready = true;
      } else {
        if (!ready) throw Error('Map is not ready');
        if(data.type==='view')blob=new Blob([JSON.stringify({x:(viewport.width/2-viewport.x)/viewport.scale,y:(viewport.height/2-viewport.y)/viewport.scale,scale:viewport.scale})],{type:'application/json'});
        else if (data.type === 'snapshot') blob = new Blob([Save.prepareMapData()], { type: 'application/octet-stream' });
        else if (data.type === 'svg' || data.type === 'png') blob = await image(data.type);
        else throw Error('Unknown map operation');
      }
      port!.postMessage({ id: data.id, blob });
    } catch (error) { port!.postMessage({ id: data.id, error: window.nexusTranslateError?.(error instanceof Error ? error.message : String(error)) ?? String(error) }); }
    finally { busy = false; }
  };
  port.start();
});

window.addEventListener('map:generated', () => {
  ready = true;
  if (!port) setTimeout(() => parent.postMessage({ type: 'nexus-map-ready', session }, '*'), 0);
  else if (!busy&&!preview) notify('dirty');
});
for (const type of ['input', 'change', 'pointerup', 'keyup']) document.addEventListener(type, () => {
  if (ready && !busy&&!preview) notify('dirty');
}, { passive: true });
document.addEventListener('keydown', event => {
  if (!preview&&(event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
    event.preventDefault(); event.stopImmediatePropagation(); notify('save-request');
  }
}, true);

window.nexusSaveProject = (blob: Blob) => new Promise<void>((resolve, reject) => {
  if (!port || !ready || preview) return reject(Error('Nexus storage is not ready'));
  const id = ++sequence;
  const timer = setTimeout(() => { pendingSaves.delete(id); reject(Error('Nexus save timed out; keep the editor open and retry')); }, 120000);
  pendingSaves.set(id, { resolve, reject, timer });
  port.postMessage({ type: 'persist', id, blob });
});
window.nexusLoadProject = async (blob:Blob) => {
  if(busy)throw Error('Map operation already in progress');
  busy=true;ready=false;notify('loading');
  try { await loadNexusMap(blob);ready=true;notify('loaded');notify('dirty'); }
  catch(error){notify('load-failed');throw error;}
  finally{busy=false;}
};
declare global { interface Window { nexusMapData?:()=>unknown[];nexusSetLanguage?:(value:string)=>void;nexusTranslateError?:(message:string)=>string;nexusSession?: string; nexusSaveProject?: (blob: Blob) => Promise<void>; nexusLoadProject?: (blob:Blob)=>Promise<void>; } }


