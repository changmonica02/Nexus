"use client";
import {useEffect, useRef, useState} from 'react';
import type {Page, WorldMapRecord} from '../lib/types';
import type {WorldMapRepository} from '../features/worldMap/worldMapRepository';
import {MapCoreClient, downloadMapBlob} from '../features/worldMap/coreClient';
import {offlineMapDocument,readPublicMapAsset} from '../features/worldMap/offlineCore';
import {useLanguage} from '../lib/LanguageContext';
import {mapMessage} from '../features/worldMap/mapMessages';
import type {MapView} from '../features/worldMap/coreClient';
import {Wrench} from 'lucide-react';

export type RegisterMapFlush = (id: string, flush: () => Promise<void>) => () => void;
export default function WorldMapEditor({map, blob, draftToken, draftConflict, repository, beforeSave, onSaved, onClose, registerFlush,cloudState,editing=true,onEdit,layer,view,onView,reloadKey=0}: {
  reloadKey?:number;editing?:boolean;onEdit?:()=>void;layer?:string;view?:MapView;onView?:(view:MapView)=>void;
  map:WorldMapRecord; blob:Blob|null; draftToken?:string; draftConflict?:{token:string;blob:Blob}; repository:WorldMapRepository;
  beforeSave:()=>Promise<void>; onSaved:(page:Page)=>Promise<void>; onClose:()=>void; registerFlush?:RegisterMapFlush;cloudState?:{status:string;error?:string|null};
}) {
  const {language,t} = useLanguage();
  const [session] = useState(() => crypto.randomUUID());
  const [offline]=useState(()=>!navigator.onLine),[offlineHTML,setOfflineHTML]=useState<string>();
  const frame = useRef<HTMLIFrameElement>(null), client = useRef<MapCoreClient|null>(null);
  const canonical=useRef(Boolean(blob));
  const revision = useRef(map.revision), changes = useRef(0), dirty = useRef(false), ready = useRef(false);
  const token = useRef(draftToken), active = useRef<Promise<void>|null>(null), staged = useRef<Promise<void>|null>(null);
  const [status,setStatus] = useState('worldMap.editor1'), [error,setError] = useState(''), [busy,setBusy] = useState(false);
  const surface=useRef<HTMLDivElement>(null);
  const [expanded,setExpanded]=useState(false);
  const [connected,setConnected]=useState(false);
  const freshCore=useRef(true);
  const readyDocument=useRef<{id:string;blob:Blob|null}|null>(null);
  const [loadedDocument,setLoadedDocument]=useState<{id:string;blob:Blob|null}|null>(null);
  const [coreAvailable,setAvailable] = useState(false), [conflict,setConflict] = useState(draftConflict);
  const available=coreAvailable&&loadedDocument?.id===map.id&&loadedDocument.blob===blob;
  const actions = useRef<{save:(blob?:Blob)=>Promise<void>;stage:()=>Promise<void>}>({save:async()=>{},stage:async()=>{}});
  const latest = useRef({beforeSave,onSaved,t,conflict,editing,language,layer,view,onView}); latest.current = {beforeSave,onSaved,t,conflict,editing,language,layer,view,onView};

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
        if(data.type==='view'&&data.view&&ready.current)latest.current.onView?.(data.view);
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
    const core=client.current,initialView=latest.current.view,useFresh=!blob&&freshCore.current;
    freshCore.current=false;ready.current=false;readyDocument.current=null;dirty.current=false;
    setAvailable(false);setError('');setConflict(draftConflict);
    revision.current=map.revision;token.current=draftToken;canonical.current=Boolean(blob);
    void (async()=>{
      await core.request('configure',undefined,{preview:true,language:latest.current.language});
      if(!current)return;
      if(blob)await core.request('load',blob);else if(!useFresh)await core.request('generate');
      if(!current)return;
      await core.request('configure',undefined,{preview:!latest.current.editing,language:latest.current.language,layer:latest.current.layer,view:initialView});
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
  useEffect(()=>registerFlush?.(`${map.id}:${session}`,async()=>{if(dirty.current)await actions.current.save();}),[registerFlush,map.id,session]);
  useEffect(()=>{
    if(available&&editing&&(token.current||!canonical.current)){dirty.current=true;setStatus('worldMap.editor8');}
    if(connected)void client.current?.request('configure',undefined,{preview:!editing,language,layer,view:latest.current.view}).catch(e=>setError(String(e)));
  },[connected,available,editing,language,layer]);
  useEffect(()=>{
    if(!editing)return;
    const previous=document.activeElement instanceof HTMLElement?document.activeElement:null;
    surface.current?.querySelector<HTMLButtonElement>('button')?.focus();
    return ()=>previous?.focus();
  },[editing]);
  const report=(e:unknown)=>setError(String(e));
  const close=()=>{void(async()=>{if(ready.current && !conflict&&(dirty.current||!canonical.current))await actions.current.save();onClose();})().catch(report);};
  const exportProject=()=>{void(async()=>{const project=ready.current&&readyDocument.current?.id===map.id&&readyDocument.current.blob===blob?await client.current!.request('snapshot'):(await repository.read(map.world_id,map.id)).blob;if(project)downloadMapBlob(project,map.title,'map');})().catch(report);};
  return <div ref={surface} role={editing?'dialog':undefined} aria-modal={editing?true:undefined} aria-label={editing?t('worldMap.editor10'):t('worldMap.preview')}
    onKeyDown={event=>{if(editing&&event.key==='Escape'){event.preventDefault();event.stopPropagation();if(!busy)close();}if(editing&&event.key==='Tab'){const buttons=surface.current?.querySelectorAll<HTMLElement>('button:not(:disabled),iframe');if(!buttons?.length)return;const first=buttons[0],last=buttons[buttons.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}}}
    className={editing||expanded?'fixed inset-0 z-50 m-0 flex h-dvh w-full min-w-0 flex-col overflow-hidden bg-[var(--color-bg)] text-[var(--color-text)]':'relative flex min-w-0 flex-col overflow-hidden'} style={!editing&&!expanded?{height:'65vh',minHeight:'18rem',maxHeight:'48rem',flexShrink:0}:undefined}>
    {editing?<header className="flex shrink-0 flex-wrap items-center gap-2 border-b p-2 text-sm [&_button]:min-h-11 [&_button]:rounded [&_button]:border [&_button]:px-3">
      <button type="button" onClick={close} disabled={busy}>{t('worldMap.editor11')}</button>
      <strong className="mr-auto truncate">{map.title}</strong>
      <button type="button" disabled={!available||busy||Boolean(conflict)} onClick={()=>void actions.current.save().catch(report)}>{t('worldMap.editor12')}</button>
      <button type="button" disabled={busy} onClick={exportProject}>.map ↓</button>
      {(['svg','png'] as const).map(type=><button key={type} type="button" disabled={!available||busy} onClick={()=>void client.current!.request(type).then(result=>{if(result)downloadMapBlob(result,map.title,type);}).catch(report)}>{type.toUpperCase()} ↓</button>)}
    </header>:<header className="flex shrink-0 flex-wrap gap-2 p-2 text-sm">
      <button type="button" disabled={!available} aria-label={t('worldMap.zoomIn')} onClick={()=>void client.current?.request('configure',undefined,{zoom:1.5}).catch(report)}>＋</button>
      <button type="button" disabled={!available} aria-label={t('worldMap.zoomOut')} onClick={()=>void client.current?.request('configure',undefined,{zoom:1/1.5}).catch(report)}>−</button>
      <button type="button" onClick={()=>{if(document.fullscreenElement){void document.exitFullscreen().catch(report);}else if(surface.current?.requestFullscreen){void surface.current.requestFullscreen().catch(()=>setExpanded(v=>!v));}else setExpanded(v=>!v);}}>{t('worldMap.fullscreen')}</button>
      {expanded&&<button type="button" onClick={()=>setExpanded(false)}>{t('worldMap.exitFullscreen')}</button>}
      {onEdit&&<button type="button" onClick={onEdit} aria-label={t('worldMap.edit')} className="ml-auto flex items-center gap-1"><Wrench size={18}/>{t('worldMap.edit')}</button>}
    </header>}
    <p role="status" className="shrink-0 px-3 py-1 text-xs">{t(status)}</p>
    {cloudState&&<p className="shrink-0 px-3 text-xs opacity-70">{cloudState.error?(t('worldMap.editor13')):cloudState.status==='offline'?(t('worldMap.editor14')):cloudState.status==='syncing'?(t('worldMap.editor15')):(t('worldMap.editor16'))}</p>}
    {error&&<div role="alert" className="shrink-0 bg-red-50 p-3 text-sm text-red-800">{mapMessage(language,error)}<br/>{t('worldMap.editor17')}</div>}
    {conflict&&<div role="alert" className="shrink-0 bg-amber-50 p-3 text-sm text-amber-900">
      {t('worldMap.editor18')}
      <button type="button" onClick={()=>downloadMapBlob(conflict.blob,map.title+'-recovery','map')}>{t('worldMap.editor19')}</button>
      <button type="button" onClick={()=>{if(window.confirm(t('worldMap.editor20')))void repository.clearDraft(map.world_id,map.id,conflict.token).then(()=>setConflict(undefined)).catch(report);}}>{t('worldMap.editor21')}</button>
    </div>}
    <div className="relative min-h-0 flex-1 overflow-hidden">
      <iframe ref={frame} title={editing?t('worldMap.editor22'):t('worldMap.preview')} src={offline?undefined:`/world-map/core/index.html?nexus=${session}&preview=1`} srcDoc={offlineHTML}
        sandbox="allow-scripts allow-downloads allow-modals allow-pointer-lock" referrerPolicy="no-referrer" className="absolute inset-0 h-full w-full border-0"/>
      {!available&&<div className="absolute inset-0 grid place-items-center bg-white/80 text-zinc-800">{error?(t('worldMap.editor23')):(t('worldMap.editor24'))}</div>}
    </div>
  </div>;
}

