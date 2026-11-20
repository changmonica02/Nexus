"use client";
import {useEffect,useRef,useState} from 'react';
import {generationStageLabel,type GenerationProgress} from '../features/worldMap/globalMapProgress';
import {X} from 'lucide-react';
import ModalDialog from './ModalDialog';
import {useLanguage} from '../lib/LanguageContext';
import {globalMapBlob,validateGlobalSettings} from '../features/worldMap/globalMapProject';
import type {GlobalMapDrawing} from '../features/worldMap/globalMapGeometry';
import {createGlobalMapClient,type GlobalMapClient,type GlobalMapResult} from '../features/worldMap/globalMapClient';
import {globalMapText} from '../features/worldMap/globalMapMessages';
import GlobalMapParameters,{newGlobalMapSettings} from './GlobalMapParameters';
import GlobalMapCanvas from './GlobalMapCanvas';

/** Preview is land-only; the persisted map is generated only after confirmation. */
export default function WorldMapCreator({initialName,onCancel,onCreate}:{initialName:string;onCancel:()=>void;onCreate:(name:string,blob:Blob,result:GlobalMapResult)=>Promise<void>}){
 const {language}=useLanguage(),text=globalMapText(language);
 const [name,setName]=useState(initialName),[settings,setSettings]=useState(newGlobalMapSettings);
 const [preview,setPreview]=useState<{key:string;drawing:GlobalMapDrawing}|null>(null);
 const [progress,setProgress]=useState<GenerationProgress>({stage:'land',fraction:0});
 const [previewing,setPreviewing]=useState(true),[creating,setCreating]=useState(false),[error,setError]=useState('');
 const client=useRef<GlobalMapClient|null>(null),alive=useRef(true),generation=useRef(0),submitting=useRef(false);
 useEffect(()=>{alive.current=true;const c=createGlobalMapClient();client.current=c;return()=>{alive.current=false;c.close();client.current=null;};},[]);
 useEffect(()=>{
  const key=JSON.stringify(settings),request=++generation.current;
  setPreviewing(true);setError('');
  try{validateGlobalSettings(settings);}catch{setPreviewing(false);setError('invalid');return;}
  const timer=setTimeout(()=>{
   void client.current?.request('preview',settings).then(value=>{
    if(alive.current&&request===generation.current)setPreview({key,drawing:value.drawing});
   }).catch(()=>{if(alive.current&&request===generation.current)setError('failed');})
   .finally(()=>{if(alive.current&&request===generation.current)setPreviewing(false);});
  },180);
  return()=>clearTimeout(timer);
 },[settings]);
 const ready=preview?.key===JSON.stringify(settings);
 const submit=async()=>{
  if(submitting.current||previewing||!ready||!name.trim()||!client.current)return;
  submitting.current=true;setProgress({stage:'land',fraction:0});setCreating(true);setError('');
  try{
   validateGlobalSettings(settings);
   const result=await client.current.request('generate',settings,{language,onProgress:value=>{if(alive.current)setProgress(value);}});
   setProgress({stage:'save',fraction:1});
   await onCreate(name.trim(),globalMapBlob(result.project),result);
  }catch(error){
   if(alive.current)setError(error instanceof Error&&error.message==='Global map generator version mismatch'?'incompatible':'failed');
  }finally{submitting.current=false;if(alive.current)setCreating(false);}
 };
 return <ModalDialog aria-label={language==='zh-TW'?'地圖生成器':'Map generator'} onDismiss={onCancel} busy={creating} className="max-h-[94dvh] w-[min(96vw,64rem)] overflow-y-auto rounded-2xl border bg-[var(--color-bg)] p-4 text-[var(--color-text)] backdrop:bg-black/40 [&_button]:min-h-11 [&_button]:rounded-lg [&_button]:px-3 [&_button:disabled]:opacity-40">
  <header className="mb-4 flex items-center gap-2"><h2 className="flex-1 text-lg font-semibold">{language==='zh-TW'?'地圖生成器':'Map generator'}</h2><button type="button" aria-label={language==='zh-TW'?'關閉視窗':'Close dialog'} disabled={creating} onClick={onCancel}><X size={20}/></button></header>
  <input autoFocus aria-label={text('name')} disabled={creating} value={name} onChange={e=>setName(e.target.value)} maxLength={200} placeholder={language==='zh-TW'?'輸入地圖名稱':'Enter map name'} className="mb-4 min-h-11 w-full rounded-lg border bg-[var(--color-bg)] px-3 placeholder:text-zinc-400"/>
  <GlobalMapParameters settings={settings} onChange={setSettings} disabled={creating}/>
  <div aria-label={language==='zh-TW'?'海陸分布預覽':'Land distribution preview'} className="relative my-4 h-[min(44dvh,28rem)] min-h-56 overflow-hidden rounded-lg border">
   {ready&&preview?<GlobalMapCanvas drawing={preview.drawing}/>:<div className="grid h-full place-items-center text-sm opacity-70" role="status">{previewing?language==='zh-TW'?'正在產生海陸分布預覽…':'Generating land preview…':text('invalid')}</div>}
  </div>
  {creating&&<div role="status" className="my-3 space-y-1 text-sm"><p>{generationStageLabel(progress,language)} · {Math.round(progress.fraction*100)}%</p><progress aria-label={language==='zh-TW'?'推演進度':'Generation progress'} className="h-2 w-full" value={progress.fraction} max={1}/></div>}
  {error&&<p role="alert" className="my-2 text-red-600">{text(error as 'failed'|'invalid'|'incompatible')}</p>}
  <div className="mt-4 flex justify-end"><button type="button" disabled={creating||previewing||!ready||!name.trim()} className="border font-medium" onClick={()=>void submit()}>{creating?text('busy'):text('create')}</button></div>
 </ModalDialog>;
}
