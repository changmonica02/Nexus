"use client";
import {useEffect,useRef,useState} from 'react';
import ModalDialog from './ModalDialog';
import {useLanguage} from '../lib/LanguageContext';
import {globalMapBlob,validateGlobalSettings} from '../features/worldMap/globalMapProject';
import {createGlobalMapClient,type GlobalMapClient,type GlobalMapResult} from '../features/worldMap/globalMapClient';
import {globalMapText} from '../features/worldMap/globalMapMessages';
import GlobalMapParameters,{newGlobalMapSettings} from './GlobalMapParameters';
import GlobalMapCanvas from './GlobalMapCanvas';
/** No map ID or writes until the parent confirms creation. */
export default function WorldMapCreator({initialName,onCancel,onCreate}:{initialName:string;onCancel:()=>void;onCreate:(name:string,blob:Blob)=>Promise<void>}){
 const {language}=useLanguage(),text=globalMapText(language);
 const [name,setName]=useState(initialName),[settings,setSettings]=useState(newGlobalMapSettings);
 const [result,setResult]=useState<GlobalMapResult>(),[busy,setBusy]=useState(false),[creating,setCreating]=useState(false),[error,setError]=useState('');
 const client=useRef<GlobalMapClient|null>(null),active=useRef(false),alive=useRef(true);
 useEffect(()=>{alive.current=true;const c=createGlobalMapClient();client.current=c;return()=>{alive.current=false;c.close();client.current=null;};},[]);
 const generate=async()=>{if(active.current||!client.current)return;try{validateGlobalSettings(settings);}catch{setError('invalid');return;}active.current=true;setBusy(true);setError('');try{const value=await client.current.request('generate',settings);if(alive.current)setResult(value);}catch{if(alive.current)setError('failed');}finally{active.current=false;if(alive.current)setBusy(false);}};
 const matches=result&&JSON.stringify(result.project.settings)===JSON.stringify(settings);
 const submit=async()=>{if(active.current||busy||!matches||!name.trim()||!result)return;active.current=true;setCreating(true);setError('');try{await onCreate(name.trim(),globalMapBlob(result.project));}catch{if(alive.current)setError('failed');}finally{active.current=false;if(alive.current)setCreating(false);}};
 return <ModalDialog aria-label={text('title')} onDismiss={onCancel} busy={busy||creating} className="max-h-[94dvh] w-[min(96vw,64rem)] overflow-y-auto rounded-2xl border bg-[var(--color-bg)] p-4 text-[var(--color-text)] backdrop:bg-black/40 [&_button]:min-h-11 [&_button]:rounded-lg [&_button]:px-3 [&_button:disabled]:opacity-40">
  <h2 className="mb-3 text-lg font-semibold">{text('title')}</h2>
  <label className="mb-3 grid gap-1">{text('name')}<input autoFocus disabled={creating} value={name} onChange={e=>setName(e.target.value)} maxLength={200} className="min-h-11 rounded-lg border bg-[var(--color-bg)] px-2"/></label>
  <GlobalMapParameters settings={settings} onChange={setSettings} disabled={busy||creating}/>
  <button className="my-3 border" disabled={busy||creating} onClick={()=>void generate()}>{text('generate')}</button>
  <div className="h-[min(44dvh,28rem)] min-h-56">{result&&<GlobalMapCanvas drawing={result.drawing}/>}</div>
  <p className="my-2 text-sm" role="status">{busy?text('busy'):result?`${text('measured')}：${result.drawing.landPercent.toFixed(3)}%`:''}</p>
  {!busy&&!matches&&result&&<p>{text('controlsChanged')}</p>}
  <p className="text-xs opacity-70">{text('help')}</p>
  {error&&<p role="alert" className="my-2 text-red-600">{text(error as 'failed'|'invalid')}</p>}
  <div className="mt-4 flex justify-end gap-2"><button disabled={busy||creating} onClick={onCancel}>{text('cancel')}</button><button disabled={busy||creating||!matches||!name.trim()} className="border font-medium" onClick={()=>void submit()}>{text('create')}</button></div>
 </ModalDialog>;
}
