"use client";
import {useEffect,useMemo,useState} from 'react';
import type {Page,WorldMapRecord} from '../lib/types';
import type {StorageAdapter} from '../infrastructure/storage/StorageAdapter';
import {WorldMapRepository} from '../features/worldMap/worldMapRepository';
import {rememberGeneratedMap} from '../features/worldMap/generatedMapHandoff';
import {useLanguage} from '../lib/LanguageContext';
import {SidebarToggle} from './WorkspaceNavigation';
import GlobalWorldMapEditor from './GlobalWorldMapEditor';
import WorldMapCreator from './WorldMapCreator';
import type {RegisterMapFlush} from './WorldMapSyncStatus';

export function WorldMapUnavailable({onBack}:{onBack?:()=>void}){
 const {t}=useLanguage();
 return <section className="min-w-0 p-4"><SidebarToggle/>{onBack&&<button onClick={onBack}>{t('worldMap.back')}</button>}<p>{t('worldMap.unavailable')}</p></section>;
}

type Opened={map:WorldMapRecord;blob:Blob|null;draftToken?:string;draftConflict?:{token:string;blob:Blob}};
export default function WorldMapManager({world,storage,beforeSave,onSaved,registerFlush,cloudState,readOnly=false,onBack}:{
 world:Page;storage:StorageAdapter;beforeSave:()=>Promise<void>;onSaved:(page:Page)=>Promise<void>;
 registerFlush?:RegisterMapFlush;cloudState?:{status:string;error?:string|null;pendingPushes?:number};
 readOnly?:boolean;onBack?:()=>void;
}){
 const {language,t}=useLanguage(),zh=language==='zh-TW';
 const repository=useMemo(()=>new WorldMapRepository(storage),[storage]);
 const maps=(world.character_data?.world_maps??[]).filter(map=>map.deleted_at==null&&map.engine==='nexus-global'&&map.attachment_id);
 const [selected,setSelected]=useState<string>();
 const current=maps.find(map=>map.id===selected)??maps.find(map=>map.scope==='surface')??maps[0];
 const id=current?.id;
 const [opened,setOpened]=useState<Opened|null>(null),[error,setError]=useState(false),[attempt,retry]=useState(0);
 const [creating,setCreating]=useState(false);
 const editing=!readOnly;
 const attachment=editing?undefined:current?.attachment_id;
 useEffect(()=>{
  if(!id)return;
  let live=true;
  void Promise.all([repository.read(world.id,id),repository.readDraft(world.id,id)]).then(([saved,draft])=>{
   if(!live)return;
   setOpened(!readOnly&&draft&&draft.base_revision===saved.map.revision
    ?{map:saved.map,blob:draft.blob,draftToken:draft.token}
    :{...saved,draftConflict:!readOnly&&draft?{token:draft.token,blob:draft.blob}:undefined});
  }).catch(()=>{if(live)setError(true);});
  return()=>{live=false;};
 },[repository,world.id,id,attachment,attempt,readOnly]);

 const selector=maps.length>1?<select aria-label={t('worldMap.select')} className="min-h-11 max-w-40 rounded-lg border bg-[var(--color-bg)] px-2 text-sm" value={id} onChange={event=>{
  const mapId=event.target.value;
  setError(false);setSelected(mapId);
 }}>{maps.map(map=><option key={map.id} value={map.id}>{map.title}</option>)}</select>:undefined;
 const create=()=>setCreating(true);
 return <section data-map-scroll aria-label={t('worldMap.home')} className="relative flex min-h-0 min-w-0 flex-1 flex-col">
  {readOnly&&onBack&&<button onClick={onBack} className="self-start p-3">{t('worldMap.back')}</button>}
  {opened&&opened.map.id===id&&!error?<GlobalWorldMapEditor key={id} {...opened} map={{...opened.map,title:current.title}}
   repository={repository} beforeSave={beforeSave} onSaved={onSaved} onClose={()=>onBack?.()}
   registerFlush={registerFlush} cloudState={cloudState} editing={editing}
   mapSelector={selector}
  />:<div className="grid min-h-56 flex-1 place-content-center gap-3 p-4 text-center">
   {onBack&&!readOnly&&<button className="min-h-11" onClick={onBack}>{t('worldMap.back')}</button>}
   <p role={error?'alert':'status'}>{error?(zh?'無法讀取地圖。':'Could not load the map.'):id?t('worldMap.loading'):(zh?'這個世界觀還沒有新版地圖。':'This world does not have a current map yet.')}</p>
   {error&&<button className="min-h-11 rounded-lg border" onClick={()=>{setError(false);retry(n=>n+1);}}>{zh?'重試':'Retry'}</button>}
   {!id&&!readOnly&&<button className="min-h-11 rounded-lg border" onClick={create}>{zh?'新建星球地圖':'New planet map'}</button>}
  </div>}
  {creating&&<WorldMapCreator initialName={world.title} onCancel={()=>setCreating(false)} onCreate={async(name,blob,generated)=>{
   await beforeSave();
   const result=await repository.createSpace(world.id,name,'surface',blob);
   rememberGeneratedMap(result.map.id,generated);
   setCreating(false);setError(false);setSelected(result.map.id);
   await onSaved(result.world);
  }}/>}
 </section>;
}
