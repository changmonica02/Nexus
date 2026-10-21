"use client";
import {useEffect,useMemo,useState,useRef,useCallback} from 'react';
import type {Page,WorldMapRecord,WorldEntity,WorldEntityType,WorldRegionGeometry} from '../lib/types';
import type {StorageAdapter} from '../infrastructure/storage/StorageAdapter';
import {WorldMapRepository,projectWorldPlacements,projectWorldRegions,worldRegionWarnings} from '../features/worldMap/worldMapRepository';
import {downloadMapBlob,type MapView,type RegionDraft,type RegionStat,type RegionCommand,type RegionArea} from '../features/worldMap/coreClient';
import {mapMessage} from '../features/worldMap/mapMessages';
import {prepareOfflineMapCore} from '../features/worldMap/offlineCore';
import {useLanguage} from '../lib/LanguageContext';
import {useWorkspaceDialog} from './WorkspaceDialog';
import {SidebarToggle} from './WorkspaceNavigation';
import {ArrowLeft,MoreHorizontal,Plus,Upload,X} from 'lucide-react';
import ModalDialog from './ModalDialog';
import WorldEntityPanel,{WorldEntityForm} from './WorldEntityPanel';
import WorldMapCreator from './WorldMapCreator';
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
 const [selected,setSelected]=useState<string|null>(null),[editing,setEditing]=useState(false),[layer,setLayer]=useState('physical');
 const [opened,setOpened]=useState<Opened|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[epoch,setEpoch]=useState(0);
 const [entityPanel,setEntityPanel]=useState(false),[entityForm,setEntityForm]=useState<{entity:WorldEntity;fresh:boolean;region?:boolean;point?:{mapId:string;x:number;y:number;placementId:string}}|null>(null);
 const [intent,setIntent]=useState<{id:string;kind:'new'|'existing'|'move';entityId?:string;placementId?:string;mapId:string}|null>(null),[markerId,setMarkerId]=useState<string|null>(null);
 const entities=world.character_data?.world_entities;
 const projections=useMemo(()=>projectWorldPlacements(world,selected??maps.find(m=>m.deleted_at===null)?.id??''),[entities,maps,selected,world]);
 const newEntity=(type:WorldEntityType='settlement'):WorldEntity=>({schemaVersion:1,entityId:`entity_${crypto.randomUUID()}`,worldId:world.id,type,name:'',aliases:[],relations:[],createdAt:Date.now(),updatedAt:Date.now(),revision:1});
 const regionCommand=useRef<((command:RegionCommand)=>Promise<void>)|null>(null);
 const registerRegionCommand=useCallback((run:(command:RegionCommand)=>Promise<void>)=>{regionCommand.current=run;return()=>{regionCommand.current=null;};},[]);
 const [regionEdit,setRegionEdit]=useState<{id:string;mapId:string;entity:WorldEntity;fresh:boolean;placementId:string;revision:number;geometry?:WorldRegionGeometry}|null>(null);
 const [regionDraft,setRegionDraft]=useState<RegionDraft|null>(null),[regionStats,setRegionStats]=useState<RegionStat[]>([]),[regionPoints,setRegionPoints]=useState<{placementId:string;cell:number}[]>([]);
 const regionProjections=useMemo(()=>projectWorldRegions(world,selected??maps.find(m=>m.deleted_at===null)?.id??''),[world,entities,maps,selected]);
 const [highlight,setHighlight]=useState<string|null>(null),[query,setQuery]=useState<string[]|null>(null);
 const regionView=useMemo(()=>({layer,selected:highlight}),[layer,highlight]);
 const distributionRegions=regionProjections.filter(r=>r.entityType===(layer==='cultural'?'culture':layer==='religions'?'religion':''));
 const regionStart=useMemo<RegionCommand|undefined>(()=>regionEdit?{action:'start',id:regionEdit.id,placementId:regionEdit.placementId,name:regionEdit.entity.name,geometry:regionEdit.geometry}:undefined,[regionEdit]);
 const [brushRadius,setBrushRadius]=useState(24),[erasing,setErasing]=useState(false);
 useEffect(()=>{if(!regionEdit)return;const guard=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue='';};window.addEventListener('beforeunload',guard);return()=>window.removeEventListener('beforeunload',guard);},[regionEdit]);
 const browser=useRef<HTMLElement>(null);
 const [managing,setManaging]=useState(false),[linking,setLinking]=useState(false),[linkId,setLinkId]=useState('');
 const [creation,setCreation]=useState<{name:string;parentId?:string;scope?:string}|null>(null);
 const [overlays,setOverlays]=useState(['lakes','rivers','scaleBar']),[contourInterval,setContourInterval]=useState(5),[contourLabels,setContourLabels]=useState(false);
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
 const choose=(id:string)=>{if(regionEdit&&!window.confirm(t('worldRegion.discard')))return;if(regionEdit)void regionCommand.current?.({action:'cancel'}).catch(e=>setError(String(e)));setRegionEdit(null);setRegionDraft(null);setIntent(null);setMarkerId(null);setEditing(false);setError('');if(id!==selectedId)setViews(old=>{const next=new Map(old);next.delete(id);return next;});setSelected(id);setManaging(false);};
 const create=async(blob?:Blob,defaultName?:string,parentId?:string,nextScope?:string)=>{
   if(!blob){setCreation({name:defaultName??t('worldMap.new'),parentId,scope:nextScope});setManaging(false);return;}
   const name=(await askText(t('worldMap.name'),defaultName??t('worldMap.new')))?.trim();if(!name)return;
   await run(async()=>{const result=await repository.create(world.id,name,blob);await onSaved(result.world);if(parentId)await onSaved(await repository.setPresentation(world.id,result.map.id,result.map.revision,nextScope??'region',parentId));setSelected(result.map.id);setEditing(true);setManaging(false);});
 };
 const changePresentation=(nextScope:string,parent:string|null)=>{
   if(!current)return;
   void run(async()=>{await onSaved(await repository.setPresentation(world.id,current.id,current.revision,nextScope,parent));setEpoch(n=>n+1);});
 };
 const beginPlace=(entity:WorldEntity,mapId:string)=>{if(entity.type!=='settlement'){beginRegion(entity,mapId);return;}choose(mapId);setEntityPanel(false);setEditing(true);setIntent({id:crypto.randomUUID(),kind:'existing',entityId:entity.entityId,mapId});};
 const picked=(id:string,x:number,y:number)=>{
   if(!intent||intent.id!==id||busy||readOnly)return;
   const pending=intent;
   if(pending.kind==='new') {setIntent(null);setEntityForm({entity:newEntity(),fresh:true,point:{mapId:pending.mapId,x,y,placementId:`placement_${pending.id}`}});return;}
   void run(async()=>{
     const page=pending.kind==='existing'?await repository.placeEntity(world.id,pending.entityId!,{mapId:pending.mapId,placementId:`placement_${pending.id}`,x,y}):await repository.movePlacement(world.id,pending.mapId,pending.placementId!,current!.placements!.find(p=>p.placementId===pending.placementId)!.revision,{x,y});
     await onSaved(page);setIntent(null);
   });
 };
 const beginRegion=(entity:WorldEntity,mapId:string,fresh=false)=>{
   choose(mapId);setEntityPanel(false);setMarkerId(null);setEditing(true);setRegionDraft(null);if(entity.type==='culture')setLayer('cultural');if(entity.type==='religion')setLayer('religions');setBrushRadius(24);setErasing(false);
   const placement=maps.find(m=>m.id===mapId)?.placements?.find(p=>p.entityId===entity.entityId&&p.geometry.type==='cells'&&p.deletedAt===null);
   setRegionEdit({id:crypto.randomUUID(),mapId,entity,fresh,placementId:placement?.placementId??`placement_${crypto.randomUUID()}`,revision:placement?.revision??0,geometry:placement?.geometry.type==='cells'?placement.geometry:undefined});
 };
 const dispatchRegion=(command:RegionCommand)=>{void regionCommand.current?.(command).catch(e=>setError(String(e)));};
 const cancelRegion=()=>{void regionCommand.current?.({action:'cancel'}).catch(e=>setError(String(e)));setRegionEdit(null);setRegionDraft(null);};
 const areaText=(area?:RegionArea|null)=>area?area.km2===undefined?`${t('worldRegion.relativeArea')}: ${Math.round(area.relative).toLocaleString()} · ${t('worldRegion.noScale')}`:`${t('worldRegion.planarArea')}: ${area.km2.toLocaleString(undefined,{maximumFractionDigits:2})} km²`:t('worldMap.loading');
 const conflicts=regionDraft&&regionEdit?.entity.type==='country'?regionProjections.filter(r=>r.entityType==='country'&&r.entityId!==regionEdit.entity.entityId&&r.geometry.meshId===regionDraft.geometry.meshId&&r.geometry.cells.some(c=>regionDraft.geometry.cells.includes(c))):[];
 const saveRegion=()=>void run(async()=>{
   if(!regionEdit||!regionDraft||regionDraft.requestId!==regionEdit.id)return;
   if(conflicts.length&&!await askConfirm(t('worldRegion.reassign')+' '+conflicts.map(c=>c.name).join(', ')))return;
   const page=await repository.saveRegion(world.id,regionEdit.mapId,regionEdit.entity.entityId,regionEdit.placementId,regionEdit.revision,regionDraft.geometry,!!conflicts.length,regionEdit.fresh?regionEdit.entity:undefined);
   await onSaved(page);cancelRegion();
 });
 const warningWorld=regionEdit&&regionDraft&&current?{...world,character_data:{...world.character_data!,world_entities:[...(entities??[]).filter(e=>e.entityId!==regionEdit.entity.entityId),regionEdit.entity],world_maps:maps.map(m=>m.id===current.id?{...m,placements:[...(m.placements??[]).filter(p=>p.placementId!==regionEdit.placementId),{schemaVersion:1 as const,placementId:regionEdit.placementId,mapId:current.id,entityId:regionEdit.entity.entityId,geometry:regionDraft.geometry,visible:true,revision:1,createdAt:0,updatedAt:0,deletedAt:null}]}:m)}}:world;
 const warnings=current?worldRegionWarnings(warningWorld,current.id,regionPoints):[];
 const marker=current?.placements?.find(p=>p.placementId===markerId&&p.deletedAt===null),markerEntity=entities?.find(e=>e.entityId===marker?.entityId);
 const legend=distributionRegions.length>0?<section aria-label={t('worldDistribution.legend')} className="flex w-full flex-wrap gap-2 rounded-lg border p-2 text-sm">
  <p className="w-full text-xs opacity-70">{t('worldDistribution.overlapHint')}</p>
  <button onClick={()=>setHighlight(null)}>{t('worldDistribution.showAll')}</button>
  {distributionRegions.map(r=>{const p=current?.placements?.find(p=>p.placementId===r.placementId);return <div key={r.placementId} className="flex min-w-0 flex-wrap items-center gap-2 rounded-lg border p-1">
   <label className="flex items-center gap-1"><span aria-hidden="true" className="h-3 w-3 rounded-full" style={{background:r.distribution?.color??['#527fc4','#d08040','#49996b','#ac60b5','#c25065','#4c9fa8'][Array.from(r.entityId).reduce((h,c)=>(h*31+c.charCodeAt(0))>>>0,0)%6]}}/><input type="checkbox" aria-label={t('worldDistribution.visible')+' '+r.name} checked={r.visible} disabled={busy||readOnly||!!regionEdit} onChange={e=>{const visible=e.target.checked;void run(async()=>{if(p)await onSaved(await repository.setDistribution(world.id,current!.id,p.placementId,p.revision,{visible,distribution:p.distribution}));});}}/>{r.name}</label>
   <button aria-pressed={highlight===r.placementId} onClick={()=>setHighlight(highlight===r.placementId?null:r.placementId)}>{t('worldDistribution.highlight')}</button>
   <input type="color" aria-label={t('worldDistribution.color')+' '+r.name} value={r.distribution?.color??['#527fc4','#d08040','#49996b','#ac60b5','#c25065','#4c9fa8'][Array.from(r.entityId).reduce((h,c)=>(h*31+c.charCodeAt(0))>>>0,0)%6]} disabled={busy||readOnly||!!regionEdit} onChange={e=>{const color=e.target.value;void run(async()=>{if(p)await onSaved(await repository.setDistribution(world.id,current!.id,p.placementId,p.revision,{visible:p.visible,distribution:{...p.distribution,color}}));});}}/>
   <label>{t('worldDistribution.opacity')}<select aria-label={t('worldDistribution.opacity')+' '+r.name} value={r.distribution?.opacity??0.4} disabled={busy||readOnly||!!regionEdit} onChange={e=>{const opacity=+e.target.value;void run(async()=>{if(p)await onSaved(await repository.setDistribution(world.id,current!.id,p.placementId,p.revision,{visible:p.visible,distribution:{...p.distribution,opacity}}));});}}>{[0.2,0.4,0.6,0.8,1].map(v=><option key={v} value={v}>{v*100}%</option>)}</select></label>
   <button onClick={()=>setMarkerId(r.placementId)}>{t('worldEntity.open')}</button>
  </div>;})}
 </section>:null;
 const humanTools=<div className="flex max-h-[38dvh] min-w-0 shrink-0 overflow-y-auto flex-wrap items-center gap-2 border-b p-2 text-sm [&_button]:min-h-11 [&_button]:rounded-lg [&_button]:border [&_button]:px-3">
   {legend}
   {error&&<p role="alert" className="w-full break-words text-red-600">{mapMessage(language,error)}</p>}
   <span>{t('worldEntity.human')}</span><select aria-label={t('worldDistribution.view')} value={layer} disabled={!!regionEdit} onChange={e=>setLayer(e.target.value)}>{['physical','contours','temperature','precipitation','biomes','political','cultural','religions'].map(v=><option key={v} value={v}>{t('worldMap.'+v)}</option>)}</select><button disabled={busy||!!regionEdit} onClick={()=>{setIntent({id:crypto.randomUUID(),kind:'new',mapId:current!.id});}}>{t('worldEntity.add')}</button><button disabled={busy||!!regionEdit} onClick={()=>setEntityPanel(true)}>{t('worldEntity.existing')}</button>
   {(['country','administrative_area','culture','religion'] as const).map(type=><button key={type} disabled={busy||!!regionEdit} onClick={()=>{setIntent(null);setEntityForm({entity:newEntity(type),fresh:true,region:true});}}>{t('worldRegion.add.'+type)}</button>)}
   {regionEdit&&<div className="flex w-full flex-wrap items-center gap-2" aria-label={t('worldRegion.paint')}><strong>{regionEdit.entity.name}</strong><span>{t('worldRegion.paintHint')}</span>
    <label>{t('worldRegion.brush')}<input aria-label={t('worldRegion.brush')} type="range" min="4" max="100" value={brushRadius} onChange={e=>{setBrushRadius(+e.target.value);dispatchRegion({action:'brush',radius:+e.target.value});}}/></label>
    <label><input type="checkbox" checked={erasing} onChange={e=>{setErasing(e.target.checked);dispatchRegion({action:'brush',erase:e.target.checked});}}/>{t('worldRegion.erase')}</label>
    <button disabled={!regionDraft?.undo||busy} onClick={()=>dispatchRegion({action:'undo'})}>{t('worldRegion.undo')}</button><button disabled={!regionDraft?.redo||busy} onClick={()=>dispatchRegion({action:'redo'})}>{t('worldRegion.redo')}</button>
    <output aria-label={t('worldRegion.area')}>{areaText(regionDraft?.area)}</output>
    {!!conflicts.length&&<p role="alert">{t('worldRegion.overlap')} {conflicts.map(c=>c.name).join(', ')}</p>}
    <button disabled={busy||!regionDraft||(!regionDraft.geometry.cells.length&&!regionEdit.revision)} onClick={saveRegion}>{t('worldRegion.save')}</button><button disabled={busy} onClick={()=>{if(window.confirm(t('worldRegion.discard')))cancelRegion();}}>{t('ui.cancel')}</button>
   </div>}
   {warnings.map((warning,index)=><p key={index} role="alert" className="w-full break-words text-amber-700 dark:text-amber-400">{warning.name}: {t('worldRegion.'+warning.key)}</p>)}
   {intent&&<><span role="status">{t('worldEntity.pick')}</span><button disabled={busy} onClick={()=>setIntent(null)}>{t('ui.cancel')}</button></>}
 </div>;
 const scopeName=(value?:string)=>['world','region','town'].includes(value??'world')?t('worldMap.'+(value??'world')):value;
 const details=current?<nav aria-label={t('worldMap.details')} className="shrink-0 px-3 py-4 sm:px-5">
   {legend}
   {regionProjections.length>0&&<section aria-label={t('worldRegion.territories')} className="mb-3 space-y-2"><h2 className="font-medium">{t('worldRegion.territories')}</h2>{regionProjections.map(region=>{const stat=regionStats.find(s=>s.placementId===region.placementId);return <button key={region.placementId} className="flex w-full flex-wrap items-center justify-between gap-2 rounded-lg border px-3 text-left" onClick={()=>setMarkerId(region.placementId)}><strong>{region.name}</strong><span className="text-xs">{stat?.compatible===false?t('worldRegion.meshChanged'):areaText(stat?.area)}</span></button>;})}</section>}
   {warnings.map((warning,index)=><p key={index} role="alert" className="my-2 text-amber-700 dark:text-amber-400">{warning.name}: {t('worldRegion.'+warning.key)}</p>)}
   <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><h2 className="font-medium">{t('worldMap.details')}</h2>{current.parent_map_id&&active.some(m=>m.id===current.parent_map_id)&&<button onClick={()=>choose(current.parent_map_id!)} className="text-xs">↑ {t('worldMap.parent')}</button>}</div>
   {active.some(m=>m.parent_map_id===current.id)?<div className="grid gap-2 sm:grid-cols-2">{active.filter(m=>m.parent_map_id===current.id).map(m=><button key={m.id} onClick={()=>choose(m.id)} className="flex min-w-0 items-center justify-between gap-2 rounded-xl border p-3 text-left"><span className="truncate font-medium">{m.title}</span><span className="shrink-0 text-xs opacity-60">{scopeName(m.scope)}</span></button>)}</div>:<p className="text-sm opacity-60">{t('worldMap.noDetails')}</p>}
   {!readOnly&&<div className="mt-2 flex flex-wrap gap-2 text-xs"><button aria-label={t('worldMap.createDetail')} disabled={busy||editing} onClick={()=>void create(undefined,t('worldMap.newDetail'),current.id,scope==='world'?'region':'town')}>＋ {t('worldMap.createDetail')}</button><button disabled={busy||editing||active.length<2} onClick={()=>{setLinkId('');setLinking(true);}}>{t('worldMap.linkDetail')}</button></div>}
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
   <button type="button" onClick={()=>setEntityPanel(true)}>{t('worldEntity.title')}</button>
   <button type="button" aria-label={t('worldMap.management')} disabled={editing} onClick={()=>setManaging(true)} className="shrink-0 border"><MoreHorizontal size={20}/></button>
  </header>
  {error&&<p role="alert" className="break-words px-4 py-2 text-red-600">{mapMessage(language,error)}</p>}
  {current?<>
   <div className="shrink-0 space-y-2 px-3 pb-3 sm:px-5">
    <label className="block min-w-0"><span className="sr-only">{t('worldMap.select')}</span><select aria-label={t('worldMap.select')} className="min-h-11 w-full min-w-0 truncate rounded-xl border bg-[var(--color-bg)] px-3 font-medium sm:max-w-md" value={current.id} disabled={busy||editing} onChange={e=>choose(e.target.value)}>{active.map(m=><option key={m.id} value={m.id}>{m.title}</option>)}</select></label>
    <div className="flex min-w-0 gap-2 overflow-x-auto pb-1 [&_label]:flex [&_label]:shrink-0 [&_label]:items-center [&_label]:gap-2 [&_label]:rounded-lg [&_label]:border [&_label]:pl-3 [&_label]:text-xs [&_select]:min-h-11 [&_select]:max-w-40 [&_select]:rounded-lg [&_select]:bg-[var(--color-bg)] [&_select]:px-2">
     <label>{t('worldMap.scope')}<select aria-label={t('worldMap.scope')} value={scope} disabled={busy||editing||readOnly} onChange={e=>changePresentation(e.target.value,current.parent_map_id??null)}>{scopes.map(s=><option key={s} value={s}>{scopeName(s)}</option>)}</select></label>
     <label>{t('worldMap.layer')}<select aria-label={t('worldMap.layer')} value={layer} onChange={e=>setLayer(e.target.value)}>{['physical','contours','temperature','precipitation','biomes','political','cultural','religions'].map(s=><option key={s} value={s}>{t('worldMap.'+s)}</option>)}</select></label>
    </div>
    <details className="text-xs"><summary className="cursor-pointer py-1">{t('worldMap.overlays')}</summary><div className="flex flex-wrap gap-3 pt-2">{['lakes','rivers','borders','labels','burgIcons','routes','scaleBar'].map(id=><label key={id} className="flex items-center gap-1"><input type="checkbox" checked={overlays.includes(id)} onChange={e=>setOverlays(old=>e.target.checked?[...old,id]:old.filter(item=>item!==id))}/>{t('worldMap.overlay.'+id)}</label>)}</div></details>
    {layer==='contours'&&<div className="flex flex-wrap items-center gap-3 text-xs"><span>{t('worldMap.relativeHeight')}</span><label>{t('worldMap.contourInterval')}<select value={contourInterval} onChange={e=>setContourInterval(+e.target.value)}>{[2,5,10,20].map(n=><option key={n}>{n}</option>)}</select></label><label><input type="checkbox" checked={contourLabels} onChange={e=>setContourLabels(e.target.checked)}/>{t('worldMap.contourLabels')}</label></div>}
   </div>
   {opened?<div className="min-w-0 shrink-0" style={{display:opened.map.id===current.id&&(opened.blob||current.attachment_id||editing)?undefined:'none'}}><WorldMapEditor key={world.id} reloadKey={epoch} {...opened} map={{...opened.map,title:opened.map.id===current.id?current.title:opened.map.title}} editing={opened.map.id===current.id&&editing&&!readOnly} onEdit={readOnly?undefined:()=>setEditing(true)} layer={layer} overlays={overlays} contourInterval={contourInterval} contourLabels={contourLabels} view={views.get(current.id)} onView={view=>setViews(old=>new Map(old).set(opened.map.id,view))} markers={projections} pickPoint={intent?.mapId===current.id?intent.id:null} onMapPoint={picked} onMarker={setMarkerId} regions={regionProjections} regionView={regionView} onRegionQuery={setQuery} regionScope={scope} regionStart={regionStart} regionDirty={!!regionEdit} onBeforeClose={()=>{if(!regionEdit)return true;if(!window.confirm(t('worldRegion.discard')))return false;cancelRegion();return true;}} registerRegionCommand={registerRegionCommand} onRegionDraft={draft=>{if(draft.requestId===regionEdit?.id)setRegionDraft(draft);}} onRegionStats={setRegionStats} onRegionPoints={setRegionPoints} humanTools={humanTools} previewFooter={details} repository={repository} beforeSave={beforeSave} onSaved={onSaved} registerFlush={registerFlush} cloudState={cloudState} onClose={()=>{setIntent(null);setEditing(false);}}/></div>:null}
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
  {creation&&<WorldMapCreator initialName={creation.name} onCancel={()=>setCreation(null)} onCreate={async(name,project)=>{
    await beforeSave();
    const result=await repository.create(world.id,name,project,creation.parentId?{parentId:creation.parentId,scope:creation.scope??'region'}:undefined);
    // Adopt committed content even if the parent UI callback subsequently fails; never create a duplicate on retry.
    setCreation(null);setManaging(false);
    try{await onSaved(result.world);setSelected(result.map.id);setEditing(true);}catch(error){setError(String(error));throw error;}
   }}/>}
  {entityPanel&&!entityForm&&<WorldEntityPanel entities={entities??[]} maps={active} readOnly={readOnly} onClose={()=>setEntityPanel(false)} onCreate={type=>setEntityForm({entity:newEntity(type),fresh:true})} onEdit={entity=>setEntityForm({entity,fresh:false})} onPlace={beginPlace} onOpen={id=>{setEntityPanel(false);choose(id);}}/>}
  {entityForm&&<WorldEntityForm key={entityForm.entity.entityId} entity={entityForm.entity} entities={entities??[]} onCancel={()=>setEntityForm(null)} onSave={async draft=>{
    if(entityForm.region){setEntityForm(null);beginRegion(draft,current!.id,true);return;}
    await beforeSave();
    const page=entityForm.fresh&&!entityForm.point?await repository.createEntity(world.id,draft):entityForm.fresh?await repository.createSettlement(world.id,{entityId:draft.entityId,name:draft.name,aliases:draft.aliases,subtype:draft.subtype,summary:draft.summary,content:draft.content,relations:draft.relations},entityForm.point?{...entityForm.point}:undefined):await repository.updateEntity(world.id,draft.entityId,entityForm.entity.revision,{name:draft.name,aliases:draft.aliases,subtype:draft.subtype,summary:draft.summary,content:draft.content,relations:draft.relations,cultureSettings:draft.cultureSettings});
    await onSaved(page);setEntityForm(null);
   }}/>}
  {query&&<ModalDialog aria-label={t('worldDistribution.query')} onDismiss={()=>setQuery(null)} dismissOnBackdrop className="max-h-[80dvh] w-[min(94vw,28rem)] overflow-y-auto rounded-xl border bg-[var(--color-bg)] p-4 text-[var(--color-text)] [&_button]:min-h-11">
   <h2>{t('worldDistribution.query')}</h2>{query.length?query.map(id=>{const r=regionProjections.find(p=>p.placementId===id);return r?<button key={id} className="block w-full text-left" onClick={()=>{setHighlight(id);setQuery(null);setMarkerId(id);}}>{r.name} · {t('worldRegion.type.'+r.entityType)}</button>:null;}):<p>{t('worldDistribution.empty')}</p>}<button onClick={()=>setQuery(null)}>{t('worldMap.closePanel')}</button>
  </ModalDialog>}
  {marker&&markerEntity&&!entityForm&&<ModalDialog aria-label={t(marker.geometry.type==='cells'?'worldRegion.info':'worldEntity.marker')} onDismiss={()=>setMarkerId(null)} dismissOnBackdrop busy={busy} className="w-[min(94vw,30rem)] rounded-xl border bg-[var(--color-bg)] p-4 text-[var(--color-text)] backdrop:bg-black/40 [&_button]:min-h-11 [&_button]:px-3">
   <h2 className="font-semibold">{markerEntity.name}</h2>{marker.geometry.type==='cells'&&<p>{areaText(regionStats.find(s=>s.placementId===marker.placementId)?.area)}</p>}<p className="my-2 break-words text-sm">{markerEntity.summary}</p><div className="flex flex-wrap gap-2">
   {!readOnly&&<><button disabled={busy} onClick={()=>{setMarkerId(null);setEntityForm({entity:markerEntity,fresh:false});}}>{t('worldEntity.open')}</button><button disabled={busy} onClick={()=>{if(marker.geometry.type==='cells'){beginRegion(markerEntity,current!.id);return;}setMarkerId(null);setEditing(true);setIntent({id:crypto.randomUUID(),kind:'move',mapId:current!.id,placementId:marker.placementId});}}>{t(marker.geometry.type==='cells'?'worldRegion.editTerritory':'worldEntity.move')}</button><button disabled={busy} onClick={()=>void(async()=>{if(await askConfirm(t('worldEntity.removeConfirm')))await run(async()=>{await onSaved(await repository.removePlacement(world.id,current!.id,marker.placementId,marker.revision));setMarkerId(null);});})()}>{t('worldEntity.remove')}</button></>}
   <button disabled={busy} onClick={()=>setMarkerId(null)}>{t('worldMap.closePanel')}</button></div>
  </ModalDialog>}
  {dialog}
 </section>;
}



