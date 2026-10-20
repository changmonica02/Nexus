"use client";
import {useEffect,useRef,useState} from 'react';
import ModalDialog from './ModalDialog';
import {mapMessage} from '../features/worldMap/mapMessages';
import {useLanguage} from '../lib/LanguageContext';
import {MapCoreClient,type NaturalMapSettings} from '../features/worldMap/coreClient';
import {offlineMapDocument,readPublicMapAsset} from '../features/worldMap/offlineCore';

type Template={id:string;name:string;kind:string};
/** An isolated disposable core. Until confirm succeeds this has no map ID or persistence API. */
export default function WorldMapCreator({initialName,onCancel,onCreate}:{initialName:string;onCancel:()=>void;onCreate:(name:string,blob:Blob)=>Promise<void>}){
 const {language,t}=useLanguage(),[session]=useState(()=>crypto.randomUUID());
 const frame=useRef<HTMLIFrameElement>(null),core=useRef<MapCoreClient|null>(null),active=useRef(false);
 const [offline]=useState(()=>!navigator.onLine),[html,setHTML]=useState<string>(),[connected,setConnected]=useState(false);
 const [name,setName]=useState(initialName),[kind,setKind]=useState('procedural'),[catalog,setCatalog]=useState<Template[]>([]);
 const [settings,setSettings]=useState<NaturalMapSettings>(()=>({template:'continents',seed:crypto.randomUUID().slice(0,8),width:1280,height:800,points:10000,equator:25,precipitation:100}));
 const [preview,setPreview]=useState(''),[working,setWorking]=useState(false),[creating,setCreating]=useState(false),[error,setError]=useState('');
 const mounted=useRef(true),currentLanguage=useRef(language);currentLanguage.current=language;
 useEffect(()=>{
   mounted.current=true;
   const fail=(e:unknown)=>{if(mounted.current)setError(String(e));};
   const timeout=setTimeout(()=>fail(Error(t('worldMap.creatorTimeout'))),120000);
   const receive=(event:MessageEvent)=>{
     if(event.source!==frame.current?.contentWindow||event.origin!=='null'||event.data?.session!==session)return;
     if(event.data.type==='nexus-map-asset'&&typeof event.data.url==='string'){
       const source=event.source as Window,id=event.data.id;
       void readPublicMapAsset(event.data.url).then(blob=>source.postMessage({type:'nexus-map-asset-result',session,id,blob},'*')).catch(e=>source.postMessage({type:'nexus-map-asset-result',session,id,error:String(e)},'*'));return;
     }
     if(event.data.type!=='nexus-map-ready'||core.current)return;
     clearTimeout(timeout);const channel=new MessageChannel();
     const client=new MapCoreClient(channel.port1,()=>{});core.current=client;
     frame.current!.contentWindow!.postMessage({type:'nexus-map-connect',session},'*',[channel.port2]);
     void client.request('configure',undefined,{language:currentLanguage.current,preview:true}).then(()=>client.request('catalog')).then(async blob=>{if(!blob)throw Error('Missing templates');const entries=JSON.parse(await blob.text()) as Template[];if(mounted.current){setCatalog(entries);setConnected(true);}}).catch(fail);
   };
   window.addEventListener('message',receive);
   if(offline)void offlineMapDocument(session).then(value=>{if(mounted.current)setHTML(value);}).catch(fail);
   return()=>{mounted.current=false;clearTimeout(timeout);window.removeEventListener('message',receive);core.current?.close();core.current=null;};
 // The core's lifetime is the dialog; language changes are presentation only.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[session,offline]);
 useEffect(()=>{if(connected)void core.current?.request('configure',undefined,{language}).catch(e=>setError(String(e)));},[connected,language]);
 useEffect(()=>{
   if(!connected||creating)return;
   let live=true,url='';setWorking(true);setError('');
   const timer=setTimeout(()=>{void core.current?.request('heightmap-preview',undefined,{generation:settings}).then(blob=>{if(!live||!blob)return;url=URL.createObjectURL(blob);setPreview(url);}).catch(e=>{if(live)setError(String(e));}).finally(()=>{if(live)setWorking(false);});},200);
   return()=>{live=false;clearTimeout(timer);if(url)URL.revokeObjectURL(url);};
 },[settings,connected,creating]);
 const change=(key:keyof NaturalMapSettings,value:string|number|undefined)=>setSettings(old=>({...old,[key]:value}));
 const submit=async()=>{
   if(active.current||!core.current||!name.trim())return;active.current=true;setCreating(true);setError('');
   try{await core.current.request('generate',undefined,{generation:settings});const blob=await core.current.request('snapshot');if(!blob)throw Error('Missing native project');await onCreate(name.trim(),blob);}
   catch(e){if(mounted.current)setError(String(e));}finally{active.current=false;if(mounted.current)setCreating(false);}
 };
 return <ModalDialog aria-label={t('worldMap.create')} onDismiss={onCancel} busy={creating} className="max-h-[94dvh] w-[min(96vw,44rem)] overflow-y-auto rounded-2xl border bg-[var(--color-bg)] p-4 text-[var(--color-text)] backdrop:bg-black/40 [&_input]:min-h-11 [&_input]:min-w-0 [&_input]:rounded-lg [&_input]:border [&_input]:bg-[var(--color-bg)] [&_input]:px-2 [&_select]:min-h-11 [&_select]:rounded-lg [&_select]:border [&_select]:bg-[var(--color-bg)] [&_button]:min-h-11 [&_button]:rounded-lg [&_button]:px-3">
  <h2 className="mb-3 text-lg font-semibold">{t('worldMap.createNatural')}</h2>
  <fieldset disabled={creating} className="min-w-0 space-y-3">
   <label className="grid gap-1">{t('worldMap.name')}<input autoFocus value={name} onChange={e=>setName(e.target.value)} maxLength={200}/></label>
   <div className="grid grid-cols-2 gap-2"><label className="grid gap-1">{t('worldMap.sourceType')}<select value={kind} onChange={e=>{setKind(e.target.value);const first=catalog.find(item=>item.kind===e.target.value);if(first)change('template',first.id);}}><option value="procedural">{t('worldMap.procedural')}</option><option value="precreated">{t('worldMap.precreated')}</option></select></label><label className="grid min-w-0 gap-1">{t('worldMap.template')}<select aria-label={t('worldMap.template')} value={settings.template} onChange={e=>change('template',e.target.value)}>{catalog.filter(item=>item.kind===kind).map(item=><option key={item.id} value={item.id}>{t('azgaar.'+item.name)}</option>)}</select></label></div>
   <div aria-busy={working} className="relative grid h-44 place-items-center overflow-hidden rounded-xl bg-[var(--color-bg-secondary)] sm:h-56">{preview&&<img src={preview} alt={t('worldMap.templatePreview')} className="h-full w-full object-contain"/>}{(!connected||working)&&<p className="absolute rounded bg-[var(--color-bg)] px-3 py-1 text-xs">{t('worldMap.previewing')}</p>}</div>
   <p className="text-xs opacity-70">{t('worldMap.previewHint')}</p>
   <div className="flex gap-2"><label className="grid min-w-0 flex-1 gap-1">{t('worldMap.seed')}<input value={settings.seed} onChange={e=>change('seed',e.target.value)} maxLength={128}/></label><button type="button" className="self-end border" onClick={()=>change('seed',crypto.randomUUID().slice(0,8))}>{t('worldMap.resample')}</button></div>
   <div className="grid grid-cols-2 gap-2">{(['width','height'] as const).map(key=><label className="grid min-w-0 gap-1" key={key}>{t('worldMap.'+key)}<input type="number" min={key==='width'?320:240} max={4096} value={settings[key]} onChange={e=>change(key,+e.target.value)}/></label>)}</div>
   <details><summary className="cursor-pointer py-2">{t('worldMap.advanced')}</summary><div className="grid grid-cols-2 gap-2"><label className="col-span-2 grid min-w-0 gap-1">{t('worldMap.widthKm')}<input type="number" min={0.1} value={settings.widthKm??''} onChange={e=>change('widthKm',e.target.value?+e.target.value:undefined)}/><span className="text-xs opacity-60">{t('worldMap.scaleHint')}</span></label>{(['points','equator','precipitation'] as const).map(key=><label className="grid min-w-0 gap-1" key={key}>{t('worldMap.'+(key==='precipitation'?'rainfallFactor':key))}<input type="number" value={settings[key]} onChange={e=>change(key,+e.target.value)}/></label>)}</div></details>
  </fieldset>
  {error&&<p role="alert" className="my-2 break-words text-red-600">{mapMessage(language,error)}</p>}
  <div className="mt-4 flex justify-end gap-2"><button disabled={creating} onClick={onCancel}>{t('ui.cancel')}</button><button disabled={!connected||working||creating||!name.trim()} className="border font-medium" onClick={()=>void submit()}>{t(creating?'worldMap.generating':'worldMap.confirmCreate')}</button></div>
  <iframe ref={frame} title={t('worldMap.creationCore')} aria-hidden="true" tabIndex={-1} src={offline?undefined:`/world-map/core/index.html?nexus=${session}&preview=1`} srcDoc={html} sandbox="allow-scripts allow-downloads allow-modals allow-pointer-lock" referrerPolicy="no-referrer" className="pointer-events-none fixed -left-[9999px] h-[800px] w-[1280px] border-0"/>
 </ModalDialog>;
}
