"use client";
import {useEffect, useRef, useState} from 'react';
import type {Page, WorldMapRecord} from '../lib/types';
import type {WorldMapRepository} from '../features/worldMap/worldMapRepository';
import {MapCoreClient, downloadMapBlob} from '../features/worldMap/coreClient';
import {offlineMapDocument,readPublicMapAsset} from '../features/worldMap/offlineCore';
import {useLanguage} from '../lib/LanguageContext';
import ModalDialog from './ModalDialog';

export type RegisterMapFlush = (id: string, flush: () => Promise<void>) => () => void;
export default function WorldMapEditor({map, blob, draftToken, draftConflict, repository, beforeSave, onSaved, onClose, registerFlush,cloudState}: {
  map:WorldMapRecord; blob:Blob|null; draftToken?:string; draftConflict?:{token:string;blob:Blob}; repository:WorldMapRepository;
  beforeSave:()=>Promise<void>; onSaved:(page:Page)=>Promise<void>; onClose:()=>void; registerFlush?:RegisterMapFlush;cloudState?:{status:string;error?:string|null};
}) {
  const {language} = useLanguage(), en = language === 'en';
  const [session] = useState(() => crypto.randomUUID());
  const [offline]=useState(()=>!navigator.onLine),[offlineHTML,setOfflineHTML]=useState<string>();
  const frame = useRef<HTMLIFrameElement>(null), client = useRef<MapCoreClient|null>(null);
  const revision = useRef(map.revision), changes = useRef(0), dirty = useRef(false), ready = useRef(false);
  const token = useRef(draftToken), active = useRef<Promise<void>|null>(null), staged = useRef<Promise<void>|null>(null);
  const [status,setStatus] = useState(en?'Opening…':'開啟中…'), [error,setError] = useState(''), [busy,setBusy] = useState(false);
  const [available,setAvailable] = useState(false), [conflict,setConflict] = useState(draftConflict);
  const actions = useRef<{save:(blob?:Blob)=>Promise<void>;stage:()=>Promise<void>}>({save:async()=>{},stage:async()=>{}});
  const latest = useRef({beforeSave,onSaved,en,conflict}); latest.current = {beforeSave,onSaved,en,conflict};

  actions.current.stage = async () => {
    if (!ready.current || !dirty.current || staged.current || active.current || latest.current.conflict) return;
    const task = (async()=>{
      const snapshot = await client.current!.request('snapshot');
      if (snapshot) token.current = await repository.stageDraft(map.world_id,map.id,revision.current,snapshot);
    })();
    staged.current = task;
    try { await task; } finally { staged.current = null; }
  };
  actions.current.save = (supplied?:Blob) => {
    if (active.current) return active.current;
    if (!ready.current) return Promise.reject(Error('Map is not loaded; the saved project was not replaced'));
    if (latest.current.conflict) return Promise.reject(Error('Export or explicitly discard the older local draft before saving'));
    const task = (async()=>{
      setBusy(true); setError(''); setStatus(latest.current.en?'Saving to this device…':'正在儲存至此裝置…');
      if (staged.current) await staged.current;
      const snapshot = supplied ?? await client.current!.request('snapshot');
      // Dirty notifications sent before the snapshot response are already in this snapshot.
      const generation = changes.current;
      if (!snapshot) throw Error('Missing native project');
      token.current = await repository.stageDraft(map.world_id,map.id,revision.current,snapshot);
      await latest.current.beforeSave();
      const result = await repository.save(map.world_id,map.id,revision.current,snapshot);
      revision.current = result.map.revision;
      await repository.clearDraft(map.world_id,map.id,token.current);
      token.current = undefined;
      await latest.current.onSaved(result.world);
      client.current?.rememberSaved(snapshot);
      if (changes.current === generation) dirty.current = false;
      setStatus(dirty.current ? (latest.current.en?'New changes pending':'仍有新修改待儲存') : (latest.current.en?'Saved to this device; cloud sync is separate':'已儲存至此裝置；雲端同步狀態另行顯示'));
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
        if(data.type==='loading'){ready.current=false;if(current){setAvailable(false);setStatus(latest.current.en?'Loading project…':'正在載入專案…');}}
        if(data.type==='loaded'){ready.current=true;dirty.current=true;changes.current++;if(current){setAvailable(true);setError('');}}
        if(data.type==='load-failed'){ready.current=false;if(current){setAvailable(false);setError(latest.current.en?'Native project loading failed. The saved Nexus project was not replaced.':'原生專案載入失敗，Nexus 已儲存的專案未被取代。');}}
        if(data.type==='dirty') {dirty.current=true;changes.current++;if(current)setStatus(latest.current.en?'Unsaved changes':'有尚未儲存的修改');}
        if(data.type==='save-request') void actions.current.save().catch(fail);
        if(data.type==='persist' && data.blob instanceof Blob && typeof data.id==='number') {
          const id=data.id;
          void actions.current.save(data.blob).then(()=>core.acknowledge(id)).catch(e=>{core.acknowledge(id,String(e));fail(e);});
        }
      });
      client.current = core;
      frame.current!.contentWindow!.postMessage({type:'nexus-map-connect',session},'*',[channel.port2]);
      void (async()=>{
        if(blob) await core.request('load',blob);
        if(!current)return;
        ready.current=true;setAvailable(true);
        if(draftToken){dirty.current=true;changes.current++;setStatus(latest.current.en?'Recovered local draft; save to synchronize':'已復原本機草稿；儲存後才會同步');}
        else if(!blob){dirty.current=true;changes.current++;await actions.current.save();}
        else setStatus(latest.current.en?'Opened saved project':'已開啟儲存的專案');
      })().catch(fail);
    };
    window.addEventListener('message',onMessage);
    if(offline)void offlineMapDocument(session).then(html=>{if(current)setOfflineHTML(html);}).catch(fail);
    const checkpoint = setInterval(()=>{void actions.current.stage().catch(fail);},10000);
    const autosave = setInterval(()=>{if(dirty.current && ready.current && !latest.current.conflict)void actions.current.save().catch(fail);},60000);
    const beforeUnload = (event:BeforeUnloadEvent)=>{if(dirty.current){event.preventDefault();event.returnValue='';}};
    window.addEventListener('beforeunload',beforeUnload);
    const unregister=registerFlush?.(`${map.id}:${session}`,async()=>{if(dirty.current)await actions.current.save();});
    return ()=>{current=false;clearTimeout(startup);clearInterval(checkpoint);clearInterval(autosave);window.removeEventListener('message',onMessage);window.removeEventListener('beforeunload',beforeUnload);unregister?.();client.current?.close();client.current=null;ready.current=false;};
  },[blob,draftToken,map.id,offline,registerFlush,repository,session]);

  const report=(e:unknown)=>setError(String(e));
  const close=()=>{void(async()=>{if(ready.current && !conflict)await actions.current.save();onClose();})().catch(report);};
  const exportProject=()=>{void(async()=>{const project=ready.current?await client.current!.request('snapshot'):(await repository.read(map.world_id,map.id)).blob;if(project)downloadMapBlob(project,map.title,'map');})().catch(report);};
  return <ModalDialog onDismiss={close} busy={busy} aria-label={en?'World map editor':'世界觀地圖編輯器'}
    className="fixed inset-0 m-0 flex h-dvh max-h-none w-screen max-w-none flex-col border-0 bg-[var(--color-bg)] p-0 text-[var(--color-text)]">
    <header className="flex shrink-0 flex-wrap items-center gap-2 border-b p-2 text-sm [&_button]:min-h-11 [&_button]:rounded [&_button]:border [&_button]:px-3">
      <button type="button" onClick={close} disabled={busy}>{en?'← Save and return':'← 儲存並返回'}</button>
      <strong className="mr-auto truncate">{map.title}</strong>
      <button type="button" disabled={!available||busy||Boolean(conflict)} onClick={()=>void actions.current.save().catch(report)}>{en?'Save':'儲存'}</button>
      <button type="button" disabled={busy} onClick={exportProject}>.map ↓</button>
      {(['svg','png'] as const).map(type=><button key={type} type="button" disabled={!available||busy} onClick={()=>void client.current!.request(type).then(result=>{if(result)downloadMapBlob(result,map.title,type);}).catch(report)}>{type.toUpperCase()} ↓</button>)}
    </header>
    <p role="status" className="shrink-0 px-3 py-1 text-xs">{status}</p>
    {cloudState&&<p className="shrink-0 px-3 text-xs opacity-70">{cloudState.error?(en?'Cloud sync needs retry; local projects are retained':'雲端同步待重試，本機專案仍保留'):cloudState.status==='offline'?(en?'Offline; cloud sync pending':'目前離線，雲端同步待完成'):cloudState.status==='syncing'?(en?'Synchronizing with cloud…':'正在同步至雲端…'):(en?'Cloud sync follows Nexus workspace status':'雲端同步依 Nexus 工作區狀態處理')}</p>}
    {error&&<div role="alert" className="shrink-0 bg-red-50 p-3 text-sm text-red-800">{error}<br/>{en?'Your editor and saved project are retained. Export .map or retry saving.':'目前編輯內容與原專案仍保留。可匯出 .map，或重試儲存。'}</div>}
    {conflict&&<div role="alert" className="shrink-0 bg-amber-50 p-3 text-sm text-amber-900">
      {en?'An older local draft conflicts with the saved revision.':'另有本機草稿與目前儲存版本不同，尚未覆蓋任何內容。'}
      <button type="button" onClick={()=>downloadMapBlob(conflict.blob,map.title+'-recovery','map')}>{en?'Export recovery draft':'匯出復原草稿'}</button>
      <button type="button" onClick={()=>{if(window.confirm(en?'Discard only this recovery draft?':'確定只捨棄這份復原草稿？'))void repository.clearDraft(map.world_id,map.id,conflict.token).then(()=>setConflict(undefined)).catch(report);}}>{en?'Discard draft':'捨棄草稿'}</button>
    </div>}
    <div className="relative min-h-0 flex-1">
      <iframe ref={frame} title={en?'Nexus editable map core':'Nexus 可編輯地圖核心'} src={offline?undefined:`/world-map/core/index.html?nexus=${session}`} srcDoc={offlineHTML}
        sandbox="allow-scripts allow-downloads allow-modals allow-pointer-lock" referrerPolicy="no-referrer" className="h-full w-full border-0"/>
      {!available&&<div className="absolute inset-0 grid place-items-center bg-white/80 text-zinc-800">{error?(en?'Project loading failed; return without replacing it':'專案載入未完成，可返回；原專案不會被取代'):(en?'Opening map tools…':'正在開啟地圖工具…')}</div>}
    </div>
  </ModalDialog>;
}
