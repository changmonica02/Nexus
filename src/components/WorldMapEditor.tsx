"use client";
import {useEffect, useRef, useState, type ReactNode} from 'react';
import type {Page, WorldMapRecord} from '../lib/types';
import type {WorldMapRepository} from '../features/worldMap/worldMapRepository';
import {MapCoreClient, downloadMapBlob} from '../features/worldMap/coreClient';
import {offlineMapDocument,readPublicMapAsset} from '../features/worldMap/offlineCore';
import {useLanguage} from '../lib/LanguageContext';
import {mapMessage} from '../features/worldMap/mapMessages';
import type {MapView,MapMarker,RegionProjection,RegionDraft,RegionStat,RegionCommand} from '../features/worldMap/coreClient';
import {Wrench,Maximize,Minimize,RotateCcw} from 'lucide-react';

export type RegisterMapFlush = (id: string, flush: () => Promise<void>) => () => void;
export default function WorldMapEditor({map, blob, draftToken, draftConflict, repository, beforeSave, onSaved, onClose, registerFlush,cloudState,editing=true,onEdit,layer,overlays,contourInterval,contourLabels,view,onView,reloadKey=0,previewFooter,markers,pickPoint,onMapPoint,onMarker,humanTools,regions,regionScope,regionView,onRegionQuery,onRegionDraft,onRegionStats,onRegionPoints,registerRegionCommand,onBeforeClose,regionStart,regionDirty}: {
  regionView?:{layer:string;selected?:string|null};onRegionQuery?:(members:string[])=>void;regionStart?:RegionCommand;regionDirty?:boolean;regions?:RegionProjection[];regionScope?:string;onRegionDraft?:(draft:RegionDraft)=>void;onRegionStats?:(stats:RegionStat[])=>void;onRegionPoints?:(points:{placementId:string;cell:number}[])=>void;registerRegionCommand?:(run:(command:RegionCommand)=>Promise<void>)=>(()=>void);onBeforeClose?:()=>boolean;
  markers?:MapMarker[];pickPoint?:string|null;onMapPoint?:(id:string,x:number,y:number)=>void;onMarker?:(id:string)=>void;humanTools?:ReactNode;
  previewFooter?:ReactNode;reloadKey?:number;editing?:boolean;onEdit?:()=>void;layer?:string;overlays?:string[];contourInterval?:number;contourLabels?:boolean;view?:MapView;onView?:(view:MapView)=>void;
  map:WorldMapRecord; blob:Blob|null; draftToken?:string; draftConflict?:{token:string;blob:Blob}; repository:WorldMapRepository;
  beforeSave:()=>Promise<void>; onSaved:(page:Page)=>Promise<void>; onClose:()=>void; registerFlush?:RegisterMapFlush;cloudState?:{status:string;error?:string|null;pendingPushes?:number};
}) {
  const {language,t} = useLanguage();
  const [session] = useState(() => crypto.randomUUID());
  const [offline]=useState(()=>!navigator.onLine),[offlineHTML,setOfflineHTML]=useState<string>();
  const frame = useRef<HTMLIFrameElement>(null), client = useRef<MapCoreClient|null>(null);
  const canonical=useRef(Boolean(blob));
  const revision = useRef(map.revision), changes = useRef(0), dirty = useRef(false), ready = useRef(false);
  const token = useRef(draftToken), active = useRef<Promise<void>|null>(null), staged = useRef<Promise<void>|null>(null);
  const [status,setStatus] = useState('worldMap.editor1'), [error,setError] = useState(''), [busy,setBusy] = useState(false);
  const surface=useRef<HTMLDivElement>(null),canvas=useRef<HTMLDivElement>(null);
  const [expanded,setExpanded]=useState(false),[fullscreen,setFullscreen]=useState(false);
  const fullView=expanded||fullscreen;
  const documentId=useRef<string|null>(null),previewView=useRef<MapView|null>(null);
  const [connected,setConnected]=useState(false),[previewHeight,setPreviewHeight]=useState<number>();
  const freshCore=useRef(true),previousEditing=useRef(editing);
  const readyDocument=useRef<{id:string;blob:Blob|null}|null>(null);
  const [loadedDocument,setLoadedDocument]=useState<{id:string;blob:Blob|null}|null>(null);
  const [coreAvailable,setAvailable] = useState(false), [conflict,setConflict] = useState(draftConflict);
  const available=coreAvailable&&loadedDocument?.id===map.id&&loadedDocument.blob===blob;
  const actions = useRef<{save:(blob?:Blob)=>Promise<void>;stage:()=>Promise<void>}>({save:async()=>{},stage:async()=>{}});
  const latest = useRef({beforeSave,onSaved,t,conflict,editing,language,layer,overlays,contourInterval,contourLabels,view,onView,fullView,mapId:map.id,markers,pickPoint,onMapPoint,onMarker,regions,regionScope,regionView,onRegionQuery,onRegionDraft,onRegionStats,onRegionPoints,regionDirty}); latest.current = {beforeSave,onSaved,t,conflict,editing,language,layer,overlays,contourInterval,contourLabels,view,onView,fullView,mapId:map.id,markers,pickPoint,onMapPoint,onMarker,regions,regionScope,regionView,onRegionQuery,onRegionDraft,onRegionStats,onRegionPoints,regionDirty};

  actions.current.stage = async () => {
    if (!latest.current.editing || readyDocument.current?.id!==map.id || readyDocument.current?.blob!==blob || !ready.current || !dirty.current || staged.current || active.current || latest.current.conflict) return;
    const task = (async()=>{
      const snapshot = await client.current!.request('snapshot');
      if (snapshot) token.current = await repository.stageDraft(map.world_id,map.id,revision.current,snapshot);
    })();
    staged.current = task;
    try { await task; } finally { staged.current = null; }
  };
  actions.current.save = (supplied?:Blob) => {
    if (active.current) return active.current;
    if (!latest.current.editing) return Promise.resolve();
    if (!ready.current || readyDocument.current?.id!==map.id || readyDocument.current?.blob!==blob) return Promise.reject(Error('Map is not loaded; the saved project was not replaced'));
    if (latest.current.conflict) return Promise.reject(Error('Export or explicitly discard the older local draft before saving'));
    const task = (async()=>{
      setBusy(true); setError(''); setStatus('worldMap.editor2');
      if (staged.current) await staged.current;
      const snapshot = supplied ?? await client.current!.request('snapshot');
      // Dirty notifications sent before the snapshot response are already in this snapshot.
      const generation = changes.current;
      if (!snapshot) throw Error('Missing native project');
      token.current = await repository.stageDraft(map.world_id,map.id,revision.current,snapshot);
      await latest.current.beforeSave();
      const result = await repository.save(map.world_id,map.id,revision.current,snapshot);
      revision.current = result.map.revision;canonical.current=true;
      await repository.clearDraft(map.world_id,map.id,token.current);
      token.current = undefined;
      await latest.current.onSaved(result.world);
      client.current?.rememberSaved(snapshot);
      if (changes.current === generation) dirty.current = false;
      setStatus(dirty.current ? ('worldMap.editor3') : ('worldMap.editor4'));
    })();
    active.current = task;
    void task.finally(()=>{active.current=null;setBusy(false);}).catch(()=>{});
    return task;
  };

  useEffect(()=>{
    let current = true;
    const fail = (e:unknown) => {if(current)setError(String(e));};
    const startup=setTimeout(()=>fail(Error('Map tools did not finish loading. Keep the saved project and retry opening.')),120000);
    const onMessage = (event:MessageEvent) => {
      if(event.source!==frame.current?.contentWindow||event.origin!=='null'||event.data?.session!==session)return;
      if(event.data.type==='nexus-map-asset'&&typeof event.data.url==='string'){
        const source=event.source as Window,id=event.data.id;
        void readPublicMapAsset(event.data.url).then(blob=>source.postMessage({type:'nexus-map-asset-result',session,id,blob},'*')).catch(error=>source.postMessage({type:'nexus-map-asset-result',session,id,error:String(error)},'*'));return;
      }
      if(event.data?.type!=='nexus-map-ready'||client.current)return;
      clearTimeout(startup);
      const channel = new MessageChannel();
      const core = new MapCoreClient(channel.port1,data=>{
        if(data.type==='region-draft'&&latest.current.editing&&data.geometry&&data.area&&typeof data.requestId==='string')latest.current.onRegionDraft?.({requestId:data.requestId,geometry:data.geometry,area:data.area,undo:Boolean(data.undo),redo:Boolean(data.redo)});
        if(data.type==='region-query'&&data.members)latest.current.onRegionQuery?.(data.members);
        if(data.type==='region-stats'&&data.stats)latest.current.onRegionStats?.(data.stats);
        if(data.type==='region-points'&&data.points)latest.current.onRegionPoints?.(data.points);
        if(data.type==='map-point'&&ready.current&&readyDocument.current?.id===latest.current.mapId&&latest.current.editing&&typeof data.requestId==='string'&&data.requestId===latest.current.pickPoint&&typeof data.x==='number'&&typeof data.y==='number'&&Number.isFinite(data.x)&&Number.isFinite(data.y))latest.current.onMapPoint?.(data.requestId,data.x,data.y);
        if(data.type==='placement-select'&&ready.current&&readyDocument.current?.id===latest.current.mapId&&typeof data.placementId==='string')latest.current.onMarker?.(data.placementId);
        if(data.type==='scroll'&&!latest.current.editing&&!latest.current.fullView&&typeof data.delta==='number'&&Number.isFinite(data.delta)){surface.current?.closest<HTMLElement>('[data-map-scroll]')?.scrollBy({top:Math.max(-1000,Math.min(1000,data.delta)),behavior:'instant'});}
        if(data.type==='view'&&data.view&&ready.current){if(data.preview&&!latest.current.editing)previewView.current=data.view;latest.current.onView?.(data.view);}
        if(data.type==='loading'){ready.current=false;if(current){setAvailable(false);setStatus('worldMap.editor5');}}
        if(data.type==='loaded'){ready.current=true;dirty.current=true;changes.current++;if(current){setAvailable(true);setError('');}}
        if(data.type==='load-failed'){ready.current=false;if(current){setAvailable(false);setError(latest.current.t('worldMap.editor6'));}}
        if(data.type==='dirty'&&latest.current.editing) {dirty.current=true;changes.current++;if(current)setStatus('worldMap.editor7');}
        if(data.type==='save-request'&&latest.current.editing) void actions.current.save().catch(fail);
        if(data.type==='persist' && latest.current.editing && data.blob instanceof Blob && typeof data.id==='number') {
          const id=data.id;
          void actions.current.save(data.blob).then(()=>core.acknowledge(id)).catch(e=>{core.acknowledge(id,String(e));fail(e);});
        }
      });
      client.current = core;
      frame.current!.contentWindow!.postMessage({type:'nexus-map-connect',session},'*',[channel.port2]);
      setConnected(true);
    };
    window.addEventListener('message',onMessage);
    if(offline)void offlineMapDocument(session).then(html=>{if(current)setOfflineHTML(html);}).catch(fail);
    const checkpoint = setInterval(()=>{void actions.current.stage().catch(fail);},10000);
    const autosave = setInterval(()=>{if(latest.current.editing && dirty.current && ready.current && !latest.current.conflict)void actions.current.save().catch(fail);},60000);
    const beforeUnload = (event:BeforeUnloadEvent)=>{if(dirty.current){event.preventDefault();event.returnValue='';}};
    window.addEventListener('beforeunload',beforeUnload);
    return ()=>{current=false;clearTimeout(startup);clearInterval(checkpoint);clearInterval(autosave);window.removeEventListener('message',onMessage);window.removeEventListener('beforeunload',beforeUnload);client.current?.close();client.current=null;ready.current=false;};
  },[offline,session]);

  useEffect(()=>{
    if(!connected||!client.current)return;
    let current=true;
    const core=client.current,sameDocument=documentId.current===map.id,initialView=latest.current.view,useFresh=!blob&&freshCore.current;
    if(!sameDocument)previewView.current=null;
    documentId.current=map.id;
    freshCore.current=false;ready.current=false;readyDocument.current=null;dirty.current=false;
    setAvailable(false);setError('');setConflict(draftConflict);
    revision.current=map.revision;token.current=draftToken;canonical.current=Boolean(blob);
    void (async()=>{
      const preserved=sameDocument&&coreAvailable?await core.request('view'):undefined;
      const restoreView=preserved?JSON.parse(await preserved.text()) as MapView:initialView;
      await core.request('configure',undefined,{preview:true,language:latest.current.language});
      if(!current)return;
      if(blob)await core.request('load',blob);else if(!useFresh)await core.request('generate');
      if(!current)return;
      await core.request('configure',undefined,{preview:!latest.current.editing,language:latest.current.language,layer:latest.current.layer,overlays:latest.current.overlays,contourInterval:latest.current.contourInterval,contourLabels:latest.current.contourLabels,view:sameDocument?restoreView:undefined,fit:!sameDocument,freePan:latest.current.fullView,regions:latest.current.regions,regionScope:latest.current.regionScope,regionView:latest.current.regionView,markers:latest.current.markers,pickPoint:latest.current.pickPoint});
      if(!current)return;
      ready.current=true;readyDocument.current={id:map.id,blob};setLoadedDocument({id:map.id,blob});setAvailable(true);
      if(draftToken){dirty.current=latest.current.editing;changes.current++;setStatus('worldMap.editor8');}
      else if(!blob&&latest.current.editing){dirty.current=true;changes.current++;await actions.current.save();}
      else setStatus('worldMap.editor9');
    })().catch(error=>{if(current)setError(String(error));});
    return ()=>{current=false;ready.current=false;};
    // A map title/revision adopted from our save does not reload the current document.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[connected,blob,draftToken,map.id,reloadKey]);
  useEffect(()=>registerFlush?.(`${map.id}:${session}`,async()=>{if(latest.current.regionDirty)throw Error(latest.current.t('worldRegion.pending'));if(dirty.current)await actions.current.save();}),[registerFlush,map.id,session]);
  useEffect(()=>{
    if(available&&editing&&(token.current||!canonical.current)){dirty.current=true;setStatus('worldMap.editor8');}
    const modeChanged=previousEditing.current!==editing;previousEditing.current=editing;
    const returning=modeChanged&&!editing;
    const restored=returning?previewView.current:modeChanged?latest.current.view:undefined;
    if(connected)void client.current?.request('configure',undefined,{preview:!editing,language,layer,overlays,contourInterval,contourLabels,markers,pickPoint,regions,regionScope,regionView,freePan:fullView,view:restored??undefined,fit:returning&&!restored}).catch(e=>setError(String(e)));
  },[connected,available,editing,language,layer,overlays,contourInterval,contourLabels,fullView,markers,pickPoint,regions,regionScope,regionView]);
  useEffect(()=>{if(available&&editing&&regionStart)void client.current?.request('region',undefined,{regionCommand:regionStart}).catch(e=>setError(String(e)));},[available,editing,regionStart]);
  useEffect(()=>registerRegionCommand?.(async command=>{if(!ready.current)throw Error('Map is not ready');await client.current!.request('region',undefined,{regionCommand:command});}),[registerRegionCommand]);
  useEffect(()=>{
    const changed=()=>setFullscreen(document.fullscreenElement===surface.current);
    document.addEventListener('fullscreenchange',changed);
    return ()=>document.removeEventListener('fullscreenchange',changed);
  },[]);
  useEffect(()=>{
    if(!connected||!canvas.current)return;
    let timer:ReturnType<typeof setTimeout>;
    const resized=()=>{clearTimeout(timer);timer=setTimeout(()=>{
      if(!latest.current.editing&&!latest.current.fullView&&canvas.current){
        const host=surface.current?.closest<HTMLElement>('[data-map-scroll]');
        const top=canvas.current.getBoundingClientRect().top+(host?.scrollTop??0);
        const bottom=Math.min(window.visualViewport?.height??innerHeight,host?.getBoundingClientRect().bottom??innerHeight);
        setPreviewHeight(Math.min(832,Math.max(140,Math.floor(bottom-top-12))));
      }
      void client.current?.request('configure',undefined,{resize:true}).catch(e=>setError(String(e)));
    },80);};
    const observer=new ResizeObserver(resized);observer.observe(canvas.current);
    window.addEventListener('resize',resized);window.visualViewport?.addEventListener('resize',resized);
    return ()=>{clearTimeout(timer);observer.disconnect();window.removeEventListener('resize',resized);window.visualViewport?.removeEventListener('resize',resized);};
  },[connected]);
  useEffect(()=>{
    if(!editing&&!fullView)return;
    const host=surface.current?.closest<HTMLElement>('[data-map-scroll]'),old=host?.style.overflowY,bodyOverflow=document.body.style.overflow;
    if(host)host.style.overflowY='hidden';
    if(fullView)document.body.style.overflow='hidden';
    return ()=>{if(host)host.style.overflowY=old??'';if(fullView)document.body.style.overflow=bodyOverflow;};
  },[editing,fullView]);
  useEffect(()=>{
    if(!editing&&!fullView)return;
    const previous=document.activeElement instanceof HTMLElement?document.activeElement:null;
    surface.current?.querySelector<HTMLButtonElement>('button')?.focus();
    return ()=>previous?.focus();
  },[editing,fullView]);
  const report=(e:unknown)=>setError(String(e));
  const captureView=async()=>{const snapshot=ready.current?await client.current?.request('view'):undefined;if(snapshot){const view=JSON.parse(await snapshot.text()) as MapView;if(!latest.current.editing)previewView.current=view;latest.current.onView?.(view);}};
  const enter=()=>{const id=map.id;void captureView().then(()=>{if(latest.current.mapId===id)onEdit?.();}).catch(report);};
  const close=()=>{if(onBeforeClose&&!onBeforeClose())return;void(async()=>{if(ready.current && !conflict&&(dirty.current||!canonical.current))await actions.current.save();await captureView();onClose();})().catch(report);};
  const exportProject=()=>{void(async()=>{const project=ready.current&&readyDocument.current?.id===map.id&&readyDocument.current.blob===blob?await client.current!.request('snapshot'):(await repository.read(map.world_id,map.id)).blob;if(project)downloadMapBlob(project,map.title,'map');})().catch(report);};
  const toggleFullscreen=()=>{void (async()=>{await captureView();if(document.fullscreenElement===surface.current)await document.exitFullscreen();else if(expanded)setExpanded(false);else if(surface.current?.requestFullscreen){try{await surface.current.requestFullscreen();}catch{setExpanded(true);}}else setExpanded(true);})().catch(report);};
  const resetView=()=>void client.current?.request('configure',undefined,{fit:true}).catch(report);
  const localLabel=t(status);
  const cloudLabel=cloudState?(cloudState.error||cloudState.status==='error'?t('worldMap.syncFailed'):cloudState.status==='syncing'?t('worldMap.syncing'):cloudState.status==='offline'?t('worldMap.offline'):cloudState.pendingPushes? t('worldMap.waitingSync'):cloudState.status==='connected'?t('worldMap.connected'):null):null;
  return <div ref={surface} role={editing||fullView?'dialog':undefined} aria-modal={editing||fullView?true:undefined} aria-label={editing?t('worldMap.editor10'):t('worldMap.preview')}
    onKeyDown={event=>{if(!editing&&fullView&&event.key==='Escape'){event.preventDefault();if(expanded)setExpanded(false);}if(editing&&event.key==='Escape'){event.preventDefault();event.stopPropagation();if(!busy)close();}if((editing||fullView)&&event.key==='Tab'){const buttons=surface.current?.querySelectorAll<HTMLElement>('button:not(:disabled),summary,a,iframe');if(!buttons?.length)return;const first=buttons[0],last=buttons[buttons.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}}}
    className={editing||fullView?'fixed inset-0 z-50 m-0 flex h-dvh w-full min-w-0 flex-col overflow-hidden bg-[var(--color-bg)] text-[var(--color-text)]':'relative flex min-w-0 flex-col'}>
    {editing&&<header className="flex shrink-0 flex-wrap items-center gap-2 border-b p-2 text-sm [&_button]:min-h-11 [&_button]:rounded [&_button]:border [&_button]:px-3">
      <button type="button" onClick={close} disabled={busy}>{t('worldMap.editor11')}</button>
      <strong className="mr-auto min-w-0 truncate">{map.title}</strong>
      <details className="relative">
        <summary className="cursor-pointer rounded border px-3 py-2">{t('worldMap.licenses')}</summary>
        <section aria-label={t('worldMap.licenses')} className="absolute right-0 top-full z-20 w-72 max-w-[85vw] rounded border bg-[var(--color-bg)] p-3 shadow-lg">
          <p>{t('worldMap.attribution')}</p>
          <ul className="list-inside list-disc [&_a]:underline">
            <li><a href="https://github.com/Azgaar/Fantasy-Map-Generator/tree/b4a0dcb933586a57242508f558f775da16c35c64" target="_blank" rel="noreferrer">{t('worldMap.source')}</a></li>
            <li><a href="/world-map/core/AZGAAR-LICENSE.txt" target="_blank" rel="noreferrer">MIT License</a></li>
            <li><a href="/world-map/core/THIRD-PARTY-NOTICES.txt" target="_blank" rel="noreferrer">{t('worldMap.notices')}</a></li>
          </ul>
        </section>
      </details>
      <button type="button" disabled={!available||busy||Boolean(conflict)} onClick={()=>void actions.current.save().catch(report)}>{t('worldMap.editor12')}</button>
      <button type="button" disabled={busy} onClick={exportProject}>.map ↓</button>
      {(['svg','png'] as const).map(type=><button key={type} type="button" disabled={!available||busy} onClick={()=>void client.current!.request(type).then(result=>{if(result)downloadMapBlob(result,map.title,type);}).catch(report)}>{type.toUpperCase()} ↓</button>)}
    </header>}
    {editing&&humanTools&&<fieldset disabled={!available||busy} className="m-0 min-w-0 border-0 p-0">{humanTools}</fieldset>}
    {error&&<div role="alert" className="shrink-0 bg-red-50 p-3 text-sm text-red-800">{mapMessage(language,error)}<br/>{t('worldMap.editor17')}</div>}
    {conflict&&<div role="alert" className="shrink-0 bg-amber-50 p-3 text-sm text-amber-900">
      {t('worldMap.editor18')}
      <button type="button" onClick={()=>downloadMapBlob(conflict.blob,map.title+'-recovery','map')}>{t('worldMap.editor19')}</button>
      <button type="button" onClick={()=>{if(window.confirm(t('worldMap.editor20')))void repository.clearDraft(map.world_id,map.id,conflict.token).then(()=>setConflict(undefined)).catch(report);}}>{t('worldMap.editor21')}</button>
    </div>}
    <div ref={canvas} data-map-canvas className={editing||fullView?'relative min-h-0 flex-1 overflow-hidden':'relative mx-2 shrink-0 overflow-hidden rounded-2xl border bg-[var(--color-bg)] sm:mx-4'} style={!editing&&!fullView?{height:previewHeight??'clamp(18rem, calc(100svh - 13rem), 52rem)'}:undefined}>
      <iframe ref={frame} title={editing?t('worldMap.editor22'):t('worldMap.preview')} src={offline?undefined:`/world-map/core/index.html?nexus=${session}&preview=1`} srcDoc={offlineHTML}
        sandbox="allow-scripts allow-downloads allow-modals allow-pointer-lock" referrerPolicy="no-referrer" className="absolute inset-0 h-full w-full border-0"/>
      {!editing&&<>
        <button type="button" aria-label={t(fullView?'worldMap.exitFullscreen':'worldMap.fullscreen')} title={t(fullView?'worldMap.exitFullscreen':'worldMap.fullscreen')} onClick={toggleFullscreen} className="absolute right-3 top-3 z-10 grid min-h-11 min-w-11 place-items-center rounded-xl border bg-[var(--color-bg)] shadow-md">{fullView?<Minimize size={20}/>:<Maximize size={20}/>}</button>
        <div className="absolute bottom-3 left-3 z-10 flex gap-2 [&_button]:grid [&_button]:min-h-11 [&_button]:min-w-11 [&_button]:place-items-center [&_button]:rounded-xl [&_button]:border [&_button]:bg-[var(--color-bg)] [&_button]:shadow-md">
          <button type="button" disabled={!available} aria-label={t('worldMap.resetView')} title={t('worldMap.resetView')} onClick={resetView}><RotateCcw size={20}/></button>
          <button type="button" className="!hidden md:!grid" disabled={!available} aria-label={t('worldMap.zoomIn')} onClick={()=>void client.current?.request('configure',undefined,{zoom:1.5}).catch(report)}>＋</button>
          <button type="button" className="!hidden md:!grid" disabled={!available} aria-label={t('worldMap.zoomOut')} onClick={()=>void client.current?.request('configure',undefined,{zoom:1/1.5}).catch(report)}>−</button>
        </div>
        {onEdit&&<button type="button" disabled={!available||busy} onClick={enter} aria-label={t('worldMap.edit')} title={t('worldMap.edit')} className="absolute bottom-14 right-3 z-10 grid min-h-11 min-w-11 place-items-center rounded-xl border bg-[var(--color-bg)] shadow-md"><Wrench size={20}/></button>}
      </>}
      {!available&&<div className="absolute inset-0 z-10 grid place-items-center bg-[var(--color-bg)] text-[var(--color-text)]">{error?t('worldMap.editor23'):t('worldMap.editor24')}</div>}
    </div>
    {!editing&&!fullView&&previewFooter}
    <footer className="flex shrink-0 flex-wrap gap-x-3 gap-y-1 px-4 py-2 text-xs" role="status"><span className={status==='worldMap.editor3'||status==='worldMap.editor7'||status==='worldMap.editor8'?'font-medium text-amber-700 dark:text-amber-400':'opacity-60'}>{localLabel}</span>{cloudLabel&&<span role={cloudState?.error||cloudState?.status==='error'?'alert':undefined} className={cloudState?.error||cloudState?.status==='error'?'font-medium text-red-600 dark:text-red-400':'opacity-60'}>{cloudLabel}</span>}</footer>
  </div>;
}



