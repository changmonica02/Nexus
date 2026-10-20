"use client";
import {useEffect,useMemo,useState,useRef} from 'react';
import type {Page,WorldMapRecord} from '../lib/types';
import type {StorageAdapter} from '../infrastructure/storage/StorageAdapter';
import {WorldMapRepository} from '../features/worldMap/worldMapRepository';
import {downloadMapBlob,type MapView} from '../features/worldMap/coreClient';
import {mapMessage} from '../features/worldMap/mapMessages';
import {prepareOfflineMapCore} from '../features/worldMap/offlineCore';
import {useLanguage} from '../lib/LanguageContext';
import {useWorkspaceDialog} from './WorkspaceDialog';
import {SidebarToggle} from './WorkspaceNavigation';
import {ArrowLeft,MoreHorizontal,Plus,Upload,X} from 'lucide-react';
import ModalDialog from './ModalDialog';
import WorldMapEditor,{type RegisterMapFlush} from './WorldMapEditor';

export function WorldMapUnavailable({onBack}:{onBack?:()=>void}) {
  const {t}=useLanguage();
  return <section className="min-w-0 p-4"><SidebarToggle/><button onClick={onBack}>{t('worldMap.back')}</button><p>{t('worldMap.unavailable')}</p></section>;
}
type Opened={map:WorldMapRecord;blob:Blob|null;draftToken?:string;draftConflict?:{token:string;blob:Blob}};
export default function WorldMapManager({world,storage,beforeSave,onSaved,registerFlush,cloudState,readOnly=false,onBack}: {
 world:Page;storage:StorageAdapter;beforeSave:()=>Promise<void>;onSaved:(page:Page)=>Promise<void>;registerFlush?:RegisterMapFlush;cloudState?:{status:string;error?:string|null;pendingPushes?:number};readOnly?:boolean;onBack?:()=>void;
}) {
 const {language,t}=useLanguage(),{askText,askConfirm,dialog}=useWorkspaceDialog({cancel:t('ui.cancel'),confirm:t('worldMap.confirm')});
 const repository=useMemo(()=>new WorldMapRepository(storage),[storage]);
 const maps=world.character_data?.world_maps??[],active=maps.filter(m=>m.deleted_at==null);
 const [selected,setSelected]=useState<string|null>(null),[editing,setEditing]=useState(false),[layer,setLayer]=useState('political');
 const [opened,setOpened]=useState<Opened|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[epoch,setEpoch]=useState(0);
 const browser=useRef<HTMLElement>(null);
 const [managing,setManaging]=useState(false),[linking,setLinking]=useState(false),[linkId,setLinkId]=useState('');
 const [views,setViews]=useState(()=>new Map<string,MapView>());
 const current=active.find(m=>m.id===selected)??active[0],selectedId=current?.id;
 useEffect(()=>{browser.current?.scrollTo(0,0);},[selectedId]);
 const scope=current?.scope??'world';
 const scopes=[...new Set(['world','region','town',...active.map(m=>m.scope??'world')])];
 useEffect(()=>{
   let live=true;
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
 const choose=(id:string)=>{setEditing(false);setError('');if(id!==selectedId)setViews(old=>{const next=new Map(old);next.delete(id);return next;});setSelected(id);setManaging(false);};
 const create=async(blob?:Blob,defaultName?:string,parentId?:string,nextScope?:string)=>{
   const name=(await askText(t('worldMap.name'),defaultName??t('worldMap.new')))?.trim();if(!name)return;
   await run(async()=>{const result=await repository.create(world.id,name,blob);await onSaved(result.world);if(parentId)await onSaved(await repository.setPresentation(world.id,result.map.id,result.map.revision,nextScope??'region',parentId));setSelected(result.map.id);setEditing(true);setManaging(false);});
 };
 const changePresentation=(nextScope:string,parent:string|null)=>{
   if(!current)return;
   void run(async()=>{await onSaved(await repository.setPresentation(world.id,current.id,current.revision,nextScope,parent));setEpoch(n=>n+1);});
 };
 const scopeName=(value?:string)=>['world','region','town'].includes(value??'world')?t('worldMap.'+(value??'world')):value;
 const details=current?<nav aria-label={t('worldMap.details')} className="shrink-0 px-3 py-4 sm:px-5">
   <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><h2 className="font-medium">{t('worldMap.details')}</h2>{current.parent_map_id&&active.some(m=>m.id===current.parent_map_id)&&<button onClick={()=>choose(current.parent_map_id!)} className="text-xs">↑ {t('worldMap.parent')}</button>}</div>
   {active.some(m=>m.parent_map_id===current.id)?<div className="grid gap-2 sm:grid-cols-2">{active.filter(m=>m.parent_map_id===current.id).map(m=><button key={m.id} onClick={()=>choose(m.id)} className="flex min-w-0 items-center justify-between gap-2 rounded-xl border p-3 text-left"><span className="truncate font-medium">{m.title}</span><span className="shrink-0 text-xs opacity-60">{scopeName(m.scope)}</span></button>)}</div>:<p className="text-sm opacity-60">{t('worldMap.noDetails')}</p>}
   {!readOnly&&<div className="mt-2 flex flex-wrap gap-2 text-xs"><button disabled={busy||editing} onClick={()=>void create(undefined,t('worldMap.newDetail'),current.id,scope==='world'?'region':'town')}>＋ {t('worldMap.createDetail')}</button><button disabled={busy||editing||active.length<2} onClick={()=>{setLinkId('');setLinking(true);}}>{t('worldMap.linkDetail')}</button></div>}
 </nav>:null;
 const rows=(deleted:boolean)=>maps.filter(m=>(m.deleted_at!=null)===deleted).map(map=><li key={map.id} className="flex min-w-0 items-start gap-2 rounded-xl border p-3">
   <div className="min-w-0 flex-1"><button type="button" disabled={busy||deleted} onClick={()=>choose(map.id)} className="block w-full truncate text-left font-medium">{map.title}</button><p className="px-3 text-xs opacity-60">{scopeName(map.scope)}{map.parent_map_id&&<span> · {active.find(m=>m.id===map.parent_map_id)?.title??t('worldMap.parent')}</span>}</p></div>
   {deleted?<button disabled={busy} onClick={()=>void run(async()=>{await onSaved(await repository.restore(world.id,map.id,map.revision));})}>{t('worldMap.restore')}</button>:!readOnly&&<details className="relative shrink-0"><summary aria-label={t('worldMap.actions')} className="grid min-h-11 min-w-11 cursor-pointer list-none place-items-center rounded-lg border"><MoreHorizontal size={20}/></summary><div className="absolute right-0 z-10 grid w-48 gap-1 rounded-xl border bg-[var(--color-bg)] p-2 shadow-xl">
    <button disabled={busy} onClick={()=>void(async()=>{const title=await askText(t('worldMap.rename'),map.title);if(title?.trim())await run(async()=>{await onSaved(await repository.rename(world.id,map.id,map.revision,title));setEpoch(n=>n+1);});})()}>{t('worldMap.rename')}</button>
    <button disabled={busy} onClick={()=>void run(async()=>{const copy=await repository.duplicate(world.id,map.id,map.revision,map.title+t('worldMap.copy'));await onSaved(copy.world);})}>{t('worldMap.duplicate')}</button>
    <button disabled={busy||!map.attachment_id} onClick={()=>void run(async()=>{const file=await repository.read(world.id,map.id);if(file.blob)downloadMapBlob(file.blob,map.title,'map');})}>.map ↓</button>
    <button className="text-red-600 dark:text-red-400" disabled={busy} onClick={()=>void(async()=>{if(await askConfirm(t('worldMap.deleteConfirm')))await run(async()=>{await onSaved(await repository.remove(world.id,map.id,map.revision));});})()}>{t('worldMap.delete')}</button>
   </div></details>}
 </li>);
 return <section ref={browser} data-map-scroll aria-label={t('worldMap.home')} className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden overscroll-y-contain text-sm [&_button]:min-h-11 [&_button]:rounded-lg [&_button]:px-3 [&_button:disabled]:opacity-40">
  <header className="flex shrink-0 items-center gap-1 px-2 py-2 sm:gap-2 sm:px-4">
   <SidebarToggle/>{onBack&&<button type="button" onClick={onBack} aria-label={t('worldMap.back')} className="shrink-0"><ArrowLeft size={20}/></button>}
   <h1 className="min-w-0 flex-1 truncate text-base font-semibold sm:text-xl" title={world.title}>{world.title}</h1>
   <button type="button" aria-label={t('worldMap.management')} disabled={editing} onClick={()=>setManaging(true)} className="shrink-0 border"><MoreHorizontal size={20}/></button>
  </header>
  {error&&<p role="alert" className="break-words px-4 py-2 text-red-600">{mapMessage(language,error)}</p>}
  {current?<>
   <div className="shrink-0 space-y-2 px-3 pb-3 sm:px-5">
    <label className="block min-w-0"><span className="sr-only">{t('worldMap.select')}</span><select aria-label={t('worldMap.select')} className="min-h-11 w-full min-w-0 truncate rounded-xl border bg-[var(--color-bg)] px-3 font-medium sm:max-w-md" value={current.id} disabled={busy||editing} onChange={e=>choose(e.target.value)}>{active.map(m=><option key={m.id} value={m.id}>{m.title}</option>)}</select></label>
    <div className="flex min-w-0 gap-2 overflow-x-auto pb-1 [&_label]:flex [&_label]:shrink-0 [&_label]:items-center [&_label]:gap-2 [&_label]:rounded-lg [&_label]:border [&_label]:pl-3 [&_label]:text-xs [&_select]:min-h-11 [&_select]:max-w-40 [&_select]:rounded-lg [&_select]:bg-[var(--color-bg)] [&_select]:px-2">
     <label>{t('worldMap.scope')}<select aria-label={t('worldMap.scope')} value={scope} disabled={busy||editing||readOnly} onChange={e=>changePresentation(e.target.value,current.parent_map_id??null)}>{scopes.map(s=><option key={s} value={s}>{scopeName(s)}</option>)}</select></label>
     <label>{t('worldMap.layer')}<select aria-label={t('worldMap.layer')} value={layer} disabled={editing} onChange={e=>setLayer(e.target.value)}>{['political','physical','temperature','precipitation','biomes'].map(s=><option key={s} value={s}>{t('worldMap.'+s)}</option>)}</select></label>
    </div>
   </div>
   {opened?<div className="min-w-0 shrink-0" style={{display:opened.map.id===current.id&&(opened.blob||current.attachment_id||editing)?undefined:'none'}}><WorldMapEditor key={world.id} reloadKey={epoch} {...opened} map={{...opened.map,title:opened.map.id===current.id?current.title:opened.map.title}} editing={opened.map.id===current.id&&editing&&!readOnly} onEdit={readOnly?undefined:()=>setEditing(true)} layer={layer} view={views.get(current.id)} onView={view=>setViews(old=>new Map(old).set(opened.map.id,view))} previewFooter={details} repository={repository} beforeSave={beforeSave} onSaved={onSaved} registerFlush={registerFlush} cloudState={cloudState} onClose={()=>setEditing(false)}/></div>:null}
   {(!opened||opened.map.id!==current.id||(!opened.blob&&!current.attachment_id&&!editing))&&<><div className="grid min-h-[50svh] place-items-center p-4"><div><p>{opened?t('worldMap.noProject'):t('worldMap.loading')}</p>{opened&&!readOnly&&<button onClick={()=>setEditing(true)}>{t('worldMap.edit')}</button>}</div></div>{details}</>}
  </>:<div className="grid min-h-[60svh] place-items-center p-6 text-center"><div><p className="mb-3 opacity-60">{t('worldMap.empty')}</p>{!readOnly&&<button className="border" onClick={()=>setManaging(true)}>{t('worldMap.management')}</button>}</div></div>}
  {managing&&<ModalDialog aria-label={t('worldMap.management')} onDismiss={()=>setManaging(false)} busy={busy} dismissOnBackdrop className="fixed inset-x-0 bottom-0 top-auto m-0 max-h-[88dvh] w-full max-w-none overflow-y-auto rounded-t-2xl border bg-[var(--color-bg)] p-4 text-[var(--color-text)] shadow-xl backdrop:bg-black/40 sm:inset-y-0 sm:left-auto sm:right-0 sm:h-dvh sm:max-h-none sm:w-[26rem] sm:rounded-none [&_button]:min-h-11 [&_button]:rounded-lg [&_button]:px-3">
   <header className="mb-4 flex items-center gap-2"><h2 className="flex-1 text-lg font-semibold">{t('worldMap.management')}</h2><button aria-label={t('worldMap.closePanel')} onClick={()=>setManaging(false)} disabled={busy}><X size={20}/></button></header>
   {!readOnly&&<div className="mb-4 grid grid-cols-2 gap-2"><button className="flex items-center justify-center gap-2 border" disabled={busy} onClick={()=>void create()}><Plus size={18}/>{t('worldMap.create')}</button><label className="relative flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border px-3"><Upload size={18}/>{t('worldMap.import')}<input aria-label={t('worldMap.import')} type="file" accept=".map,.gz" disabled={busy} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" onChange={e=>{const f=e.target.files?.[0];e.target.value='';if(f)void create(f,f.name.replace(/\.(map|gz)$/i,''));}}/></label></div>}
   {current&&!readOnly&&<div className="mb-4 space-y-2 rounded-xl bg-[var(--color-bg-secondary)] p-3"><p className="truncate font-medium">{current.title}</p><label className="block text-xs">{t('worldMap.parent')}<select aria-label={t('worldMap.parent')} className="mt-1 min-h-11 w-full rounded-lg border bg-[var(--color-bg)] px-2" disabled={busy} value={current.parent_map_id??''} onChange={e=>changePresentation(scope,e.target.value||null)}><option value="">{t('worldMap.none')}</option>{active.filter(m=>m.id!==current.id).map(m=><option key={m.id} value={m.id}>{m.title}</option>)}</select></label><button type="button" disabled={busy} onClick={()=>{setError('');setEpoch(n=>n+1);setManaging(false);}}>{t('worldMap.refresh')}</button></div>}
   {error&&<p role="alert" className="mb-3 break-words text-red-600">{mapMessage(language,error)}</p>}
   <ul className="space-y-2">{rows(false)}</ul>
   {!readOnly&&<details className="mt-4"><summary className="min-h-11 cursor-pointer py-3">{t('worldMap.deleted')}</summary><ul className="space-y-2">{rows(true)}</ul></details>}
  </ModalDialog>}
  {linking&&current&&<ModalDialog aria-label={t('worldMap.linkDetail')} onDismiss={()=>setLinking(false)} busy={busy} dismissOnBackdrop className="w-[min(90vw,26rem)] rounded-2xl border bg-[var(--color-bg)] p-5 text-[var(--color-text)] backdrop:bg-black/40">
   <h2 className="mb-3 font-semibold">{t('worldMap.linkDetail')}</h2><label className="block text-sm">{t('worldMap.select')}<select aria-label={t('worldMap.linkSelection')} value={linkId} onChange={e=>setLinkId(e.target.value)} className="my-3 min-h-11 w-full rounded-lg border bg-[var(--color-bg)] px-2"><option value="">{t('worldMap.chooseDetail')}</option>{active.filter(m=>m.id!==current.id&&m.parent_map_id!==current.id).map(m=><option key={m.id} value={m.id}>{m.title}</option>)}</select></label>
   {error&&<p role="alert" className="text-red-600">{mapMessage(language,error)}</p>}
   <div className="mt-3 flex justify-end gap-2"><button onClick={()=>setLinking(false)} disabled={busy}>{t('ui.cancel')}</button><button disabled={!linkId||busy} onClick={()=>void run(async()=>{const map=active.find(m=>m.id===linkId);if(!map)return;await onSaved(await repository.setPresentation(world.id,map.id,map.revision,map.scope??'world',current.id));setLinking(false);})}>{t('worldMap.confirm')}</button></div>
  </ModalDialog>}
  {dialog}
 </section>;
}
