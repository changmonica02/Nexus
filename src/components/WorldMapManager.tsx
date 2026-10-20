"use client";
import {useEffect,useMemo,useState} from 'react';
import type {Page,WorldMapRecord} from '../lib/types';
import type {StorageAdapter} from '../infrastructure/storage/StorageAdapter';
import {WorldMapRepository} from '../features/worldMap/worldMapRepository';
import {downloadMapBlob,type MapView} from '../features/worldMap/coreClient';
import {mapMessage} from '../features/worldMap/mapMessages';
import {prepareOfflineMapCore} from '../features/worldMap/offlineCore';
import {useLanguage} from '../lib/LanguageContext';
import {useWorkspaceDialog} from './WorkspaceDialog';
import WorldMapEditor,{type RegisterMapFlush} from './WorldMapEditor';

export function WorldMapUnavailable({onBack}:{onBack?:()=>void}) {
  const {t}=useLanguage();
  return <section className="min-w-0 p-4"><button onClick={onBack}>{t('worldMap.back')}</button><p>{t('worldMap.unavailable')}</p></section>;
}
type Opened={map:WorldMapRecord;blob:Blob|null;draftToken?:string;draftConflict?:{token:string;blob:Blob}};
export default function WorldMapManager({world,storage,beforeSave,onSaved,registerFlush,cloudState,readOnly=false,onBack}: {
 world:Page;storage:StorageAdapter;beforeSave:()=>Promise<void>;onSaved:(page:Page)=>Promise<void>;registerFlush?:RegisterMapFlush;cloudState?:{status:string;error?:string|null};readOnly?:boolean;onBack?:()=>void;
}) {
 const {language,t}=useLanguage(),{askText,askConfirm,dialog}=useWorkspaceDialog();
 const repository=useMemo(()=>new WorldMapRepository(storage),[storage]);
 const maps=world.character_data?.world_maps??[],active=maps.filter(m=>m.deleted_at==null);
 const [selected,setSelected]=useState<string|null>(null),[editing,setEditing]=useState(false),[layer,setLayer]=useState('political');
 const [opened,setOpened]=useState<Opened|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[epoch,setEpoch]=useState(0);
 const [views,setViews]=useState(()=>new Map<string,MapView>());
 const current=active.find(m=>m.id===selected)??active[0],selectedId=current?.id;
 const scope=current?.scope??'world';
 const scopes=[...new Set(['world','region','town',...active.map(m=>m.scope??'world')])];
 useEffect(()=>{
   let live=true;setOpened(null);
   if(!selectedId)return;
   void (async()=>{
     const saved=await repository.read(world.id,selectedId),draft=await repository.readDraft(world.id,selectedId);
     if(!live)return;
     setOpened(draft&&draft.base_revision===saved.map.revision?{map:saved.map,blob:draft.blob,draftToken:draft.token}:{...saved,draftConflict:draft?{token:draft.token,blob:draft.blob}:undefined});
     void prepareOfflineMapCore().catch(()=>{/* Public cache is optional online; never replace a project. */});
   })().catch(e=>{if(live)setError(String(e));});
   return ()=>{live=false;};
 },[repository,world.id,selectedId,epoch]);
 const run=async(operation:()=>Promise<void>)=>{
   if(busy||readOnly)return;setBusy(true);setError('');
   try{await beforeSave();await operation();}catch(e){setError(String(e));}finally{setBusy(false);}
 };
 const choose=(id:string)=>{setEditing(false);setError('');setSelected(id);};
 const create=async(blob?:Blob,defaultName?:string)=>{
   const name=(await askText(t('worldMap.name'),defaultName??t('worldMap.new')))?.trim();if(!name)return;
   await run(async()=>{const result=await repository.create(world.id,name,blob);await onSaved(result.world);setSelected(result.map.id);setEditing(true);});
 };
 const changePresentation=(nextScope:string,parent:string|null)=>{
   if(!current)return;
   void run(async()=>{await onSaved(await repository.setPresentation(world.id,current.id,current.revision,nextScope,parent));setEpoch(n=>n+1);});
 };
 const rows=(deleted:boolean)=>maps.filter(m=>(m.deleted_at!=null)===deleted).map(map=><li key={map.id} className="flex min-w-0 flex-wrap items-center gap-2 border-b py-2">
   <button type="button" disabled={busy||deleted} onClick={()=>choose(map.id)} className="mr-auto min-w-0 max-w-full break-words text-left font-medium">{map.title}</button>
   {deleted?<button disabled={busy} onClick={()=>void run(async()=>{await onSaved(await repository.restore(world.id,map.id,map.revision));})}>{t('worldMap.restore')}</button>:<>
    <button disabled={busy} onClick={()=>void(async()=>{const title=await askText(t('worldMap.rename'),map.title);if(title?.trim())await run(async()=>{await onSaved(await repository.rename(world.id,map.id,map.revision,title));setEpoch(n=>n+1);});})()}>{t('worldMap.rename')}</button>
    <button disabled={busy} onClick={()=>void run(async()=>{const copy=await repository.duplicate(world.id,map.id,map.revision,map.title+t('worldMap.copy'));await onSaved(copy.world);})}>{t('worldMap.duplicate')}</button>
    <button disabled={busy||!map.attachment_id} onClick={()=>void run(async()=>{const file=await repository.read(world.id,map.id);if(file.blob)downloadMapBlob(file.blob,map.title,'map');})}>.map ↓</button>
    <button disabled={busy} onClick={()=>void(async()=>{if(await askConfirm(t('worldMap.deleteConfirm')))await run(async()=>{await onSaved(await repository.remove(world.id,map.id,map.revision));});})()}>{t('worldMap.delete')}</button>
   </>}
 </li>);
 return <section aria-label={t('worldMap.home')} className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden text-sm [&_button]:min-h-11 [&_button]:rounded [&_button]:px-3">
  <header className="flex shrink-0 flex-wrap items-center gap-2 border-b p-3">
   {onBack&&<button onClick={onBack}>{t('worldMap.back')}</button>}
   <h1 className="mr-auto min-w-0 break-words text-xl font-semibold">{world.title}</h1>
   {!readOnly&&<><button disabled={busy||editing} onClick={()=>void create()}>＋ {t('worldMap.create')}</button><label className="max-w-full">{t('worldMap.import')}<input type="file" accept=".map,.gz" disabled={busy||editing} className="block max-w-full text-xs" onChange={e=>{const f=e.target.files?.[0];e.target.value='';if(f)void create(f,f.name.replace(/\.(map|gz)$/i,''));}}/></label></>}
  </header>
  {error&&<p role="alert" className="break-words p-3 text-red-600">{mapMessage(language,error)}</p>}
  {current?<>
   <div className="flex shrink-0 flex-wrap gap-3 p-3 [&_select]:min-h-11 [&_select]:max-w-full [&_select]:rounded [&_select]:border [&_select]:bg-[var(--color-bg)]">
    <label className="min-w-0 max-w-full">{t('worldMap.select')}<select className="block w-full" value={current.id} disabled={busy||editing} onChange={e=>choose(e.target.value)}>{active.map(m=><option key={m.id} value={m.id}>{m.title}</option>)}</select></label>
    <label className="min-w-0">{t('worldMap.scope')}<select className="block" value={scope} disabled={busy||editing||readOnly} onChange={e=>changePresentation(e.target.value,current.parent_map_id??null)}>{scopes.map(s=><option key={s} value={s}>{['world','region','town'].includes(s)?t('worldMap.'+s):s}</option>)}</select></label>
    <label className="min-w-0">{t('worldMap.layer')}<select className="block" value={layer} disabled={editing} onChange={e=>setLayer(e.target.value)}>{['political','physical','temperature','precipitation','biomes'].map(s=><option key={s} value={s}>{t('worldMap.'+s)}</option>)}</select></label>
    {!readOnly&&<label className="min-w-0 max-w-full">{t('worldMap.parent')}<select className="block w-full" disabled={busy||editing} value={current.parent_map_id??''} onChange={e=>changePresentation(scope,e.target.value||null)}><option value="">{t('worldMap.none')}</option>{active.filter(m=>m.id!==current.id).map(m=><option key={m.id} value={m.id}>{m.title}</option>)}</select></label>}
    <button type="button" disabled={busy||editing} onClick={()=>{setError('');setEpoch(n=>n+1);}}>{t('worldMap.refresh')}</button>
   </div>
   {scope==='town'&&<p className="px-3 text-xs opacity-70">{t('worldMap.townHint')}</p>}
   {opened&&opened.map.id===current.id&&(opened.blob||current.attachment_id||editing)?<WorldMapEditor key={current.id+':'+epoch} {...opened} map={{...opened.map,title:current.title}} editing={editing&&!readOnly} onEdit={readOnly?undefined:()=>setEditing(true)} layer={layer} view={views.get(current.id)} onView={view=>setViews(old=>new Map(old).set(current.id,view))} repository={repository} beforeSave={beforeSave} onSaved={onSaved} registerFlush={registerFlush} cloudState={cloudState} onClose={()=>setEditing(false)}/>:<div className="grid min-h-[45vh] place-items-center p-4"><div><p>{opened?t('worldMap.noProject'):t('worldMap.loading')}</p>{opened&&!readOnly&&<button onClick={()=>setEditing(true)}>{t('worldMap.edit')}</button>}</div></div>}
   <nav aria-label={t('worldMap.details')} className="shrink-0 border-t p-3"><h2 className="font-medium">{t('worldMap.details')}</h2>{active.some(m=>m.parent_map_id===current.id)?active.filter(m=>m.parent_map_id===current.id).map(m=><button key={m.id} onClick={()=>choose(m.id)}>{m.title}</button>):<p className="text-xs opacity-70">{t('worldMap.noDetails')}</p>}{current.parent_map_id&&active.some(m=>m.id===current.parent_map_id)&&<button onClick={()=>choose(current.parent_map_id!)}>↑ {t('worldMap.parent')}</button>}</nav>
  </>:<p className="p-6">{t('worldMap.empty')}</p>}
  {!readOnly&&<details className="shrink-0 border-t p-3" open><summary>{t('worldMap.management')} ({active.length})</summary><ul>{rows(false)}</ul><details><summary>{t('worldMap.deleted')}</summary><ul>{rows(true)}</ul></details></details>}
  {dialog}
 </section>;
}
