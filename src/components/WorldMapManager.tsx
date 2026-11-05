"use client";
import {useEffect,useMemo,useState,useRef,useCallback,type ReactNode} from 'react';
import type {Page,WorldMapRecord,WorldEntity,WorldEntityType,WorldRegionGeometry,WorldMapBlockView} from '../lib/types';
import type {StorageAdapter} from '../infrastructure/storage/StorageAdapter';
import {WorldMapRepository,projectWorldPlacements,projectWorldRegions,worldRegionWarnings} from '../features/worldMap/worldMapRepository';
import {downloadMapBlob,type MapView,type RegionDraft,type RegionStat,type RegionCommand,type RegionArea} from '../features/worldMap/coreClient';
import {placedWorldEntities,preferredWorldMap} from '../lib/worldMapBlocks';
import TiptapEditor from './TiptapEditor';
import {mapMessage} from '../features/worldMap/mapMessages';
import {prepareOfflineMapCore} from '../features/worldMap/offlineCore';
import {useLanguage} from '../lib/LanguageContext';
import {useWorkspaceDialog} from './WorkspaceDialog';
import {SidebarToggle} from './WorkspaceNavigation';
import {ArrowLeft,MoreHorizontal,Plus,Upload,X} from 'lucide-react';
import ModalDialog from './ModalDialog';
import WorldEntityPanel,{WorldEntityForm} from './WorldEntityPanel';
import WorldMapCreator from './WorldMapCreator';
import WorldMapEditor,{WorldMapSyncStatus,type RegisterMapFlush,type NativeToolControls} from './WorldMapEditor';

export function WorldMapUnavailable({onBack}:{onBack?:()=>void}) {
  const {t}=useLanguage();
  return <section className="min-w-0 p-4"><SidebarToggle/><button onClick={onBack}>{t('worldMap.back')}</button><p>{t('worldMap.unavailable')}</p></section>;
}
type Opened={map:WorldMapRecord;blob:Blob|null;draftToken?:string;draftConflict?:{token:string;blob:Blob}};
export default function WorldMapManager({world,storage,beforeSave,onSaved,registerFlush,cloudState,readOnly=false,onBack,worldContent,blockView,onBlockViewChange}: {
 blockView?:WorldMapBlockView;onBlockViewChange?:(view:WorldMapBlockView)=>void;
 world:Page;storage:StorageAdapter;beforeSave:()=>Promise<void>;onSaved:(page:Page)=>Promise<void>;registerFlush?:RegisterMapFlush;cloudState?:{status:string;error?:string|null;pendingPushes?:number};readOnly?:boolean;onBack?:()=>void;worldContent?:ReactNode;
}) {
 const {language,t}=useLanguage(),{askText,askConfirm,dialog}=useWorkspaceDialog({cancel:t('ui.cancel'),confirm:t('worldMap.confirm')});
 const repository=useMemo(()=>new WorldMapRepository(storage),[storage]);
 const maps=world.character_data?.world_maps??[],active=maps.filter(m=>m.deleted_at==null);
 const [selected,setSelected]=useState<string|null>(blockView?.mapId??null),[editing,setEditing]=useState(false),[layer,setLayer]=useState(blockView?.layer??'physical');
 const [opened,setOpened]=useState<Opened|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[epoch,setEpoch]=useState(0);
 const [entityPanel,setEntityPanel]=useState(false),[entityForm,setEntityForm]=useState<{entity:WorldEntity;fresh:boolean;region?:boolean;point?:{mapId:string;x:number;y:number;placementId:string}}|null>(null);
 const [toolsOpen,setToolsOpen]=useState(false);
 const [entityCategory,setEntityCategory]=useState<'all'|WorldEntityType>('all');
 const [detailEntity,setDetailEntity]=useState<WorldEntity|null>(null);
 const [toolGroup,setToolGroup]=useState<'terrain'|'human'|'layers'>('terrain');
 const [intent,setIntent]=useState<{id:string;kind:'new'|'existing'|'move';entityType?:'settlement'|'site';entityId?:string;placementId?:string;mapId:string}|null>(null),[markerId,setMarkerId]=useState<string|null>(null);
 const entities=world.character_data?.world_entities;
 const projections=useMemo(()=>projectWorldPlacements(world,preferredWorldMap(world,selected)?.id??''),[world,selected]);
 const newEntity=(type:WorldEntityType='settlement'):WorldEntity=>({schemaVersion:1,entityId:`entity_${crypto.randomUUID()}`,worldId:world.id,type,name:'',aliases:[],relations:[],createdAt:Date.now(),updatedAt:Date.now(),revision:1});
 const regionCommand=useRef<((command:RegionCommand)=>Promise<void>)|null>(null);
 const registerRegionCommand=useCallback((run:(command:RegionCommand)=>Promise<void>)=>{regionCommand.current=run;return()=>{regionCommand.current=null;};},[]);
 const [regionEdit,setRegionEdit]=useState<{id:string;mapId:string;entity:WorldEntity;fresh:boolean;placementId:string;revision:number;geometry?:WorldRegionGeometry}|null>(null);
 const [regionDraft,setRegionDraft]=useState<RegionDraft|null>(null),[regionStats,setRegionStats]=useState<RegionStat[]>([]),[regionPoints,setRegionPoints]=useState<{placementId:string;cell:number}[]>([]);
 const regionProjections=useMemo(()=>projectWorldRegions(world,preferredWorldMap(world,selected)?.id??''),[world,selected]);
 const [highlight,setHighlight]=useState<string|null>(null),[query,setQuery]=useState<string[]|null>(null);
 const regionView=useMemo(()=>({layer,selected:highlight}),[layer,highlight]);
 const distributionRegions=regionProjections.filter(r=>r.entityType===(layer==='cultural'?'culture':layer==='religions'?'religion':''));
 const regionStart=useMemo<RegionCommand|undefined>(()=>regionEdit?{action:'start',id:regionEdit.id,placementId:regionEdit.placementId,name:regionEdit.entity.name,geometry:regionEdit.geometry}:undefined,[regionEdit]);
 const [brushRadius,setBrushRadius]=useState(24),[erasing,setErasing]=useState(false);
 useEffect(()=>{if(!regionEdit)return;const guard=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue='';};window.addEventListener('beforeunload',guard);return()=>window.removeEventListener('beforeunload',guard);},[regionEdit]);
 const browser=useRef<HTMLElement>(null);
 const [managing,setManaging]=useState(false);
 const [newSpace,setNewSpace]=useState<'underground'|'sky'>('underground');
 const [creation,setCreation]=useState<{name:string;scope?:string}|null>(null);
 const [overlays,setOverlays]=useState(blockView?.overlays??['lakes','rivers','scaleBar']),[contourInterval,setContourInterval]=useState(blockView?.contourInterval??5),[contourLabels,setContourLabels]=useState(blockView?.contourLabels??false);
 const [views,setViews]=useState(()=>new Map<string,MapView>(Object.entries(blockView?.views??{})));
 const current=preferredWorldMap(world,selected),selectedId=current?.id;
 const isBlock=!!blockView,projectAttachment=current?.attachment_id,openedMapId=opened?.map.id;
 const loadedSource=useRef<string|null>(null);
 const [detailsOpen,setDetailsOpen]=useState(blockView?.detailsOpen??false);
 useEffect(()=>{if(isBlock)onBlockViewChange?.({mapId:selectedId,layer,overlays,views:Object.fromEntries(views),detailsOpen,contourInterval,contourLabels});},[selectedId,layer,overlays,views,detailsOpen,contourInterval,contourLabels,onBlockViewChange,isBlock]);
 useEffect(()=>{browser.current?.scrollTo(0,0);},[selectedId]);
 const scope=current?.scope??'world';
 const mainSurface=active.find(m=>m.scope==='surface')??active.find(m=>!['underground','sky'].includes(m.scope??''));
 useEffect(()=>{
   let live=true;
   if(!selectedId)return;
   const source=JSON.stringify([world.id,selectedId,projectAttachment,epoch]);
   if(loadedSource.current===source||editing&&openedMapId===selectedId)return;
   void (async()=>{
     const saved=await repository.read(world.id,selectedId),draft=await repository.readDraft(world.id,selectedId);
     if(!live)return;
     loadedSource.current=source;
     setOpened(draft&&draft.base_revision===saved.map.revision?{map:saved.map,blob:draft.blob,draftToken:draft.token}:{...saved,draftConflict:draft?{token:draft.token,blob:draft.blob}:undefined});
     void prepareOfflineMapCore().catch(()=>{/* Public cache is optional online; never replace a project. */});
   })().catch(e=>{if(live)setError(String(e));});
   return ()=>{live=false;};
 },[repository,world.id,selectedId,epoch,projectAttachment,editing,openedMapId]);
 const run=async(operation:()=>Promise<void>)=>{
   if(busy||readOnly)return;setBusy(true);setError('');
   try{await beforeSave();await operation();}catch(e){setError(String(e));}finally{setBusy(false);}
 };
 const choose=(id:string)=>{if(regionEdit&&!window.confirm(t('worldRegion.discard')))return false;if(regionEdit)void regionCommand.current?.({action:'cancel'}).catch(e=>setError(String(e)));setRegionEdit(null);setRegionDraft(null);setIntent(null);setMarkerId(null);setEditing(false);setError('');setSelected(id);setManaging(false);return true;};
 const create=async(blob?:Blob,defaultName?:string)=>{
   if(!blob){setCreation({name:defaultName??t('worldMap.new'),scope:active.length?newSpace:'surface'});setManaging(false);return;}
   const name=(await askText(t('worldMap.name'),defaultName??t('worldMap.new')))?.trim();if(!name)return;
   await run(async()=>{const result=await repository.createSpace(world.id,name,active.length?newSpace:'surface',blob);await onSaved(result.world);setSelected(result.map.id);setEditing(true);setManaging(false);});
 };
 const beginPlace=(entity:WorldEntity,mapId:string)=>{setToolGroup('human');setToolsOpen(true);if(!['settlement','site'].includes(entity.type)){beginRegion(entity,mapId);return;}choose(mapId);setEntityPanel(false);setEditing(true);setIntent({id:crypto.randomUUID(),kind:'existing',entityId:entity.entityId,mapId});};
 const picked=(id:string,x:number,y:number)=>{
   if(!intent||intent.id!==id||busy||readOnly)return;
   const pending=intent;
   if(pending.kind==='new') {setIntent(null);setEntityForm({entity:newEntity(pending.entityType),fresh:true,point:{mapId:pending.mapId,x,y,placementId:`placement_${pending.id}`}});return;}
   void run(async()=>{
     const page=pending.kind==='existing'?await repository.placeEntity(world.id,pending.entityId!,{mapId:pending.mapId,placementId:`placement_${pending.id}`,x,y}):await repository.movePlacement(world.id,pending.mapId,pending.placementId!,current!.placements!.find(p=>p.placementId===pending.placementId)!.revision,{x,y});
     await onSaved(page);setIntent(null);
   });
 };
 const beginRegion=(entity:WorldEntity,mapId:string,fresh=false)=>{
   setToolGroup('human');setToolsOpen(true);
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
 const warnings=current?[...worldRegionWarnings(warningWorld,current.id,regionPoints),...regionProjections.filter(region=>regionStats.find(stat=>stat.placementId===region.placementId)?.compatible===false).map(region=>({key:'meshChanged',name:region.name}))]:[];
 const marker=current?.placements?.find(p=>p.placementId===markerId&&p.deletedAt===null),markerEntity=entities?.find(e=>e.entityId===marker?.entityId);
 const legend=distributionRegions.length>0?<section aria-label={t('worldDistribution.legend')} className="flex w-full flex-wrap gap-2 rounded-lg border p-2 text-sm">
  <p className="w-full text-xs opacity-70">{t('worldDistribution.overlapHint')}</p>
  <button onClick={()=>setHighlight(null)}>{t('worldDistribution.showAll')}</button>
  {distributionRegions.map(r=>{const p=current?.placements?.find(p=>p.placementId===r.placementId);return <div key={r.placementId} className="flex min-w-0 flex-wrap items-center gap-2 rounded-lg border p-1">
   <label className="flex items-center gap-1"><span aria-hidden="true" className="h-3 w-3 rounded-full" style={{background:r.distribution?.color??['#527fc4','#d08040','#49996b','#ac60b5','#c25065','#4c9fa8'][Array.from(r.entityId).reduce((h,c)=>(h*31+c.charCodeAt(0))>>>0,0)%6]}}/><input type="checkbox" aria-label={t('worldDistribution.visible')+' '+r.name} checked={r.visible} disabled={busy||readOnly||!!regionEdit||!editing} onChange={e=>{const visible=e.target.checked;void run(async()=>{if(p)await onSaved(await repository.setDistribution(world.id,current!.id,p.placementId,p.revision,{visible,distribution:p.distribution}));});}}/>{r.name}</label>
   <button aria-pressed={highlight===r.placementId} onClick={()=>setHighlight(highlight===r.placementId?null:r.placementId)}>{t('worldDistribution.highlight')}</button>
   <input type="color" aria-label={t('worldDistribution.color')+' '+r.name} value={r.distribution?.color??['#527fc4','#d08040','#49996b','#ac60b5','#c25065','#4c9fa8'][Array.from(r.entityId).reduce((h,c)=>(h*31+c.charCodeAt(0))>>>0,0)%6]} disabled={busy||readOnly||!!regionEdit||!editing} onChange={e=>{const color=e.target.value;void run(async()=>{if(p)await onSaved(await repository.setDistribution(world.id,current!.id,p.placementId,p.revision,{visible:p.visible,distribution:{...p.distribution,color}}));});}}/>
   <label>{t('worldDistribution.opacity')}<select aria-label={t('worldDistribution.opacity')+' '+r.name} value={r.distribution?.opacity??0.4} disabled={busy||readOnly||!!regionEdit||!editing} onChange={e=>{const opacity=+e.target.value;void run(async()=>{if(p)await onSaved(await repository.setDistribution(world.id,current!.id,p.placementId,p.revision,{visible:p.visible,distribution:{...p.distribution,opacity}}));});}}>{[0.2,0.4,0.6,0.8,1].map(v=><option key={v} value={v}>{v*100}%</option>)}</select></label>
   <button onClick={()=>setMarkerId(r.placementId)}>{t('worldEntity.open')}</button>
  </div>;})}
 </section>:null;
 const humanTools=(native:NativeToolControls)=><details data-world-tools open={toolsOpen||!!regionEdit||!!intent} className="min-w-0 border-b">
  <summary aria-label={t('worldMap.tools')} onClick={event=>{event.preventDefault();setToolsOpen(open=>!open);}} className="min-h-11 cursor-pointer break-words px-3 py-2 font-medium">☰ <span className={toolsOpen||regionEdit||intent?'':'sm:hidden'}>{t('worldMap.tools')}</span></summary>
  <nav aria-label={t('worldMap.toolGroups')} className="grid grid-cols-3 gap-1 p-2 sm:grid-cols-1 [&_button]:min-h-11 [&_button]:rounded [&_button]:border">
   {(['terrain','human','layers'] as const).map(group=><button key={group} aria-pressed={toolGroup===group} disabled={!native.available||native.pending||((!!regionEdit||!!intent)&&toolGroup!==group)} onClick={()=>setToolGroup(group)}>{t('worldMap.group.'+group)}</button>)}
  </nav>
  <fieldset disabled={!native.available||native.pending||busy} className="m-0 flex min-w-0 flex-col gap-3 border-0 p-3 text-sm [&_button]:min-h-11 [&_button]:rounded-lg [&_button]:border [&_button]:px-3">
   {error&&<p role="alert" className="break-words text-red-600">{mapMessage(language,error)}</p>}
   {!regionEdit&&!intent&&toolGroup==='terrain'&&<>
    <p>{t('worldMap.terrainHint')}</p>
    {(['height','coasts','rivers'] as const).map(tool=><button key={tool} disabled={native.pending} onClick={()=>native.run({action:'open',tool})}>{t('worldMap.tool.'+tool)}</button>)}
    <details><summary className="min-h-11 cursor-pointer py-2">{t('worldMap.advanced')}</summary><div className="flex flex-col gap-2">{(['climate','biomes','advanced'] as const).map(tool=><button key={tool} onClick={()=>native.run({action:'open',tool})}>{t('worldMap.tool.'+tool)}</button>)}</div></details>
   </>}
   {!regionEdit&&!intent&&toolGroup==='layers'&&<>
    <label>{t('worldMap.layer')}<select className="min-h-11 w-full border bg-transparent" aria-label={t('worldDistribution.view')} value={layer} onChange={e=>setLayer(e.target.value)}>{['physical','contours','temperature','precipitation','biomes','political','cultural','religions'].map(v=><option key={v} value={v}>{t('worldMap.'+v)}</option>)}</select></label>
    <div className="flex flex-col gap-2">{['lakes','rivers','borders','labels','burgIcons','routes','scaleBar'].map(id=><label key={id} className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={overlays.includes(id)} onChange={e=>setOverlays(old=>e.target.checked?[...old,id]:old.filter(item=>item!==id))}/>{t('worldMap.overlay.'+id)}</label>)}</div>
    {layer==='contours'&&<><label>{t('worldMap.contourInterval')}<select aria-label={t('worldMap.contourInterval')} value={contourInterval} onChange={e=>setContourInterval(+e.target.value)}>{[5,10,20].map(n=><option key={n}>{n}</option>)}</select></label><label><input type="checkbox" checked={contourLabels} onChange={e=>setContourLabels(e.target.checked)}/>{t('worldMap.contourLabels')}</label></>}
    {(['labels','style'] as const).map(tool=><button key={tool} disabled={native.pending} onClick={()=>native.run({action:'open',tool})}>{t('worldMap.tool.'+tool)}</button>)}
    {legend}
   </>}
   {!regionEdit&&!intent&&toolGroup==='human'&&<>
    {toolGroup==='human'&&<div role="group" aria-label={t('worldMap.markers')} className="flex flex-col gap-2"><button disabled={busy} onClick={()=>setIntent({id:crypto.randomUUID(),kind:'new',mapId:current!.id})}>{t('worldEntity.add')}</button><button disabled={busy} onClick={()=>setIntent({id:crypto.randomUUID(),kind:'new',entityType:'site',mapId:current!.id})}>{t('worldRegion.add.site')}</button></div>}
    {(['country','administrative_area','culture','religion']).map(type=><button key={type} disabled={busy} onClick={()=>setEntityForm({entity:newEntity(type as WorldEntityType),fresh:true,region:true})}>{t('worldRegion.add.'+type)}</button>)}
    <button disabled={native.pending} onClick={()=>native.run({action:'open',tool:'routes'})}>{t('worldMap.tool.routes')}</button>
    <button disabled={busy} onClick={()=>setEntityPanel(true)}>{t('worldEntity.existing')}</button>
    {toolGroup==='human'&&<p>{t('worldMap.regionHint')}</p>}
   </>}
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
 </fieldset></details>;
 const scopeName=(value?:string)=>['surface','underground','sky'].includes(value??'')?t('worldHome.space.'+value):t('worldHome.legacySpace');
 const locateEntity=(entity:WorldEntity)=>{const map=active.find(m=>m.placements?.some(p=>p.entityId===entity.entityId&&p.deletedAt===null))??current;if(!map||!choose(map.id))return;setDetailEntity(null);setEditing(true);setToolsOpen(true);setToolGroup('human');const p=map.placements?.find(p=>p.entityId===entity.entityId&&p.deletedAt===null);setHighlight(p?.placementId??null);if(!p)setEntityPanel(true);if(p){setMarkerId(p.placementId);setHighlight(p.placementId);if(p.geometry.type==='point'){const {x,y}=p.geometry;setViews(old=>new Map(old).set(map.id,{x,y,scale:3}));}}};
 const blockEntities=placedWorldEntities(world,selectedId??'');
 const blockDetails=<details data-map-block-details open={detailsOpen} onToggle={e=>setDetailsOpen(e.currentTarget.open)} className="min-w-0 px-3 py-2">
   <summary className="min-h-11 cursor-pointer py-2">{t('worldHome.details')}</summary>
   {!blockEntities.length&&<p className="py-2 opacity-70">{t('worldEntity.empty')} <button onClick={()=>setEntityPanel(true)}>{t('worldEntity.title')}</button></p>}
   {(['country','administrative_area','settlement','culture','religion','site','geographic_region'] as const).filter(type=>blockEntities.some(e=>e.type===type)).map(type=><section key={type} className="min-w-0 space-y-3 border-t py-3"><h3 className="font-semibold">{t('worldRegion.type.'+type)}</h3>{blockEntities.filter(e=>e.type===type).map(entity=><article key={entity.entityId} className="min-w-0 break-words"><button className="font-medium" onClick={()=>setDetailEntity(entity)}>{entity.name}</button>{entity.summary&&<p>{entity.summary}</p>}{current?.placements?.filter(p=>p.entityId===entity.entityId&&p.deletedAt===null).map(p=><p key={p.placementId} className="text-xs opacity-70">{p.geometry.type==='point'?`X: ${p.geometry.x}, Y: ${p.geometry.y}`:areaText(regionStats.find(stat=>stat.placementId===p.placementId)?.area)}</p>)}{detailsOpen&&entity.content&&<div className="min-w-0 overflow-x-auto [&_.nexus-tiptap-editor]:min-h-0 [&_.nexus-tiptap-editor]:p-0"><TiptapEditor content={entity.content} onChange={()=>{}} readOnly showToolbar={false}/></div>}{entity.fields?.map(f=><p key={f.id}>{f.name}：{f.type==='relation'?(entities??[]).find(e=>e.entityId===f.value)?.name??'—':String(f.value??'—')}</p>)}</article>)}</section>)}
 </details>;
 const rows=(deleted:boolean)=>maps.filter(m=>(m.deleted_at!=null)===deleted).map(map=><li key={map.id} className="flex min-w-0 items-start gap-2 rounded-xl border p-3">
   <div className="min-w-0 flex-1"><button type="button" disabled={busy||deleted} onClick={()=>choose(map.id)} className="block w-full truncate text-left font-medium">{map.title}</button><p className="px-3 text-xs opacity-60">{scopeName(map.scope)}{map.parent_map_id&&<span> · {active.find(m=>m.id===map.parent_map_id)?.title??t('worldMap.parent')}</span>}</p></div>
   {deleted?<button disabled={busy} onClick={()=>void run(async()=>{await onSaved(await repository.restore(world.id,map.id,map.revision));})}>{t('worldMap.restore')}</button>:!readOnly&&<details className="relative shrink-0"><summary aria-label={t('worldMap.actions')} className="grid min-h-11 min-w-11 cursor-pointer list-none place-items-center rounded-lg border"><MoreHorizontal size={20}/></summary><div className="absolute right-0 z-10 grid w-48 gap-1 rounded-xl border bg-[var(--color-bg)] p-2 shadow-xl">
    <button disabled={busy} onClick={()=>void(async()=>{const title=await askText(t('worldMap.rename'),map.title);if(title?.trim())await run(async()=>{await onSaved(await repository.rename(world.id,map.id,map.revision,title));setEpoch(n=>n+1);});})()}>{t('worldMap.rename')}</button>
    <button disabled={busy||map.id===mainSurface?.id} onClick={()=>void run(async()=>{const copy=await repository.duplicate(world.id,map.id,map.revision,map.title+t('worldMap.copy'));await onSaved(copy.world);})}>{t('worldMap.duplicate')}</button>
    <button disabled={busy||!map.attachment_id} onClick={()=>void run(async()=>{const file=await repository.read(world.id,map.id);if(file.blob)downloadMapBlob(file.blob,map.title,'map');})}>.map ↓</button>
    <button className="text-red-600 dark:text-red-400" disabled={busy||map.id===mainSurface?.id} onClick={()=>void(async()=>{if(await askConfirm(t('worldMap.deleteConfirm')))await run(async()=>{await onSaved(await repository.remove(world.id,map.id,map.revision));});})()}>{t('worldMap.delete')}</button>
   </div></details>}
 </li>);
 return <section ref={browser} data-map-scroll aria-label={t('worldMap.home')} className={`${blockView?"":"h-full min-h-0 flex-1 overflow-y-auto"} flex min-w-0 flex-col overflow-x-hidden overscroll-y-contain text-sm [&_button]:min-h-11 [&_button]:rounded-lg [&_button]:px-3 [&_button:disabled]:opacity-40`}>
  {!blockView&&<header inert={editing} className="flex shrink-0 items-center gap-1 px-2 py-2 sm:gap-2 sm:px-4">
   <SidebarToggle/>{onBack&&<button type="button" onClick={onBack} aria-label={t('worldMap.back')} className="shrink-0"><ArrowLeft size={20}/></button>}
   <h1 className="min-w-0 flex-1 truncate text-base font-semibold sm:text-xl" title={world.title}>{world.title}</h1>
   <button type="button" disabled={!current} onClick={()=>{if(!readOnly){setEditing(true);setToolsOpen(true);setToolGroup('human');}setEntityPanel(true);}}>{t('worldEntity.title')}</button>
   <button type="button" aria-label={t('worldMap.management')} disabled={editing} onClick={()=>setManaging(true)} className="shrink-0 border"><MoreHorizontal size={20}/></button>
  </header>}
  {worldContent&&<div hidden={editing} inert={editing} className="min-w-0 shrink-0" data-world-writing>{worldContent}</div>}
  {error&&<p role="alert" className="break-words px-4 py-2 text-red-600">{mapMessage(language,error)}</p>}
  {(!worldContent||editing)&&(current?<>
   <div inert={editing} className="flex shrink-0 flex-wrap items-start gap-3 px-3 pb-3 sm:px-5">
    <label className="block min-w-0 flex-1 basis-40"><span className="sr-only">{t('worldMap.select')}</span><select aria-label={t('worldMap.select')} className="min-h-11 w-full min-w-0 truncate rounded-xl border bg-[var(--color-bg)] px-3 font-medium sm:max-w-md" value={current.id} disabled={busy||editing} onChange={e=>choose(e.target.value)}>{active.map(m=><option key={m.id} value={m.id}>{m.id===mainSurface?.id?t('worldHome.space.surface'):scopeName(m.scope)} · {m.title}</option>)}</select></label>
    <div className="flex min-w-0 flex-wrap gap-2 pb-1 [&_label]:flex [&_label]:shrink-0 [&_label]:items-center [&_label]:gap-2 [&_label]:rounded-lg [&_label]:border [&_label]:pl-3 [&_label]:text-xs [&_select]:min-h-11 [&_select]:max-w-40 [&_select]:rounded-lg [&_select]:bg-[var(--color-bg)] [&_select]:px-2">
     <span>{current.id===mainSurface?.id?t('worldHome.space.surface'):scopeName(scope)}</span>
     <label>{t('worldMap.layer')}<select aria-label={t('worldMap.layer')} value={layer} onChange={e=>setLayer(e.target.value)}>{['physical','contours','temperature','precipitation','biomes','political','cultural','religions'].map(s=><option key={s} value={s}>{t('worldMap.'+s)}</option>)}</select></label>
    </div>
    <div className="min-w-0 flex-1 basis-64 text-xs"><span>{t('worldMap.overlays')}</span><div className="flex flex-wrap gap-3 pt-2">{['lakes','rivers','borders','labels','burgIcons','routes','scaleBar'].map(id=><label key={id} className="flex items-center gap-1"><input type="checkbox" checked={overlays.includes(id)} onChange={e=>setOverlays(old=>e.target.checked?[...old,id]:old.filter(item=>item!==id))}/>{t('worldMap.overlay.'+id)}</label>)}</div></div>
    {!editing&&legend&&<details data-map-preview-legend className="text-xs"><summary className="min-h-11 cursor-pointer py-2">{t('worldDistribution.legend')}</summary><div className="max-h-64 overflow-y-auto">{legend}</div></details>}
    {layer==='contours'&&<div className="flex flex-wrap items-center gap-3 text-xs"><span>{t('worldMap.relativeHeight')}</span><label>{t('worldMap.contourInterval')}<select value={contourInterval} onChange={e=>setContourInterval(+e.target.value)}>{[2,5,10,20].map(n=><option key={n}>{n}</option>)}</select></label><label><input type="checkbox" checked={contourLabels} onChange={e=>setContourLabels(e.target.checked)}/>{t('worldMap.contourLabels')}</label></div>}
   </div>
   {opened?<div className="min-w-0 shrink-0" style={{display:opened.map.id===current.id&&(opened.blob||current.attachment_id||editing)?undefined:'none'}}><WorldMapEditor key={world.id} reloadKey={epoch} previewFooter={blockView?blockDetails:undefined} {...opened} map={{...opened.map,title:opened.map.id===current.id?current.title:opened.map.title}} editing={opened.map.id===current.id&&editing&&!readOnly} onEdit={readOnly||opened.map.attachment_id!==current.attachment_id?undefined:()=>setEditing(true)} layer={layer} overlays={overlays} contourInterval={contourInterval} contourLabels={contourLabels} view={views.get(current.id)} onView={view=>{if(!editing)setViews(old=>new Map(old).set(opened.map.id,view));}} markers={projections} pickPoint={intent?.mapId===current.id?intent.id:null} onMapPoint={picked} onMarker={setMarkerId} regions={regionProjections} regionView={regionView} onRegionQuery={setQuery} regionScope={scope} regionStart={regionStart} regionDirty={!!regionEdit} onBeforeClose={()=>{if(!regionEdit)return true;if(!window.confirm(t('worldRegion.discard')))return false;cancelRegion();return true;}} registerRegionCommand={registerRegionCommand} onRegionDraft={draft=>{if(draft.requestId===regionEdit?.id)setRegionDraft(draft);}} onRegionStats={setRegionStats} onRegionPoints={setRegionPoints} humanTools={humanTools}  repository={repository} beforeSave={beforeSave} onSaved={async saved=>{
     const committed=saved.character_data?.world_maps?.find(m=>m.id===opened.map.id);
     if(editing&&committed){
       // Our editor already holds this committed native project. Do not reload a stale Blob on return.
       loadedSource.current=JSON.stringify([world.id,committed.id,committed.attachment_id,epoch]);
       setOpened(previous=>previous?.map.id===committed.id?{...previous,map:committed}:previous);
     }
     await onSaved(saved);
   }} registerFlush={registerFlush} cloudState={cloudState} onClose={()=>{setIntent(null);setEditing(false);}}/></div>:null}
   {(!opened||opened.map.id!==current.id||(!opened.blob&&!current.attachment_id&&!editing))&&<><div className="grid min-h-[14rem] place-items-center p-4"><div><p>{opened?t('worldMap.noProject'):t('worldMap.loading')}</p>{opened&&!readOnly&&<button onClick={()=>setEditing(true)}>{t('worldMap.edit')}</button>}</div></div></>}
  </>:<div className="grid min-h-[14rem] place-items-center p-6 text-center"><div><p className="mb-3 opacity-60">{t('worldMap.empty')}</p>{!readOnly&&<button className="border" onClick={()=>setManaging(true)}>{t('worldMap.management')}</button>}</div></div>)}
  {blockView&&!editing&&(!opened||opened.map.id!==selectedId||!opened.blob&&!current?.attachment_id)&&<>{blockDetails}<WorldMapSyncStatus localLabel={t(!current?'worldMap.empty':opened?'worldMap.noProject':'worldMap.loading')} cloudState={cloudState}/></>}
  {!editing&&warnings.map((warning,index)=><p key={index} role="alert" className="break-words px-4 py-2 text-amber-700 dark:text-amber-400">{warning.name}: {t('worldRegion.'+warning.key)}</p>)}
  {!blockView&&<section data-world-details inert={editing} className="min-w-0 space-y-4 px-3 py-5 sm:px-5">
   <h2 className="text-lg font-semibold">{t('worldHome.details')}</h2>
   <p className="text-sm opacity-70">{t('worldHome.mapIdentity')}</p>
   <nav aria-label={t('worldHome.categories')} className="flex flex-wrap gap-2"><button aria-pressed={entityCategory==='all'} className="border" onClick={()=>setEntityCategory('all')}>{t('worldHome.all')}</button>{(['country','administrative_area','settlement','culture','religion','site','geographic_region'] as const).map(type=><button className="border" aria-pressed={entityCategory===type} key={type} onClick={()=>setEntityCategory(type)}>{t('worldRegion.type.'+type)} · {(entities??[]).filter(e=>e.type===type).length}</button>)}</nav>
   {entityCategory==='all'&&!(entities??[]).length&&<p className="opacity-60">{t('worldEntity.empty')}</p>}
   {(['country','administrative_area','settlement','culture','religion','site','geographic_region'] as const).filter(type=>entityCategory==='all'?(entities??[]).some(e=>e.type===type):entityCategory===type).map(type=><section id={'world-type-'+type} key={type} className="space-y-2 rounded-xl border p-3"><h3 className="font-semibold">{t('worldRegion.type.'+type)}</h3>{!(entities??[]).some(e=>e.type===type)&&<p className="text-sm opacity-60">{t('worldEntity.empty')}</p>}{(entities??[]).filter(e=>e.type===type).map(e=><div key={e.entityId} className="flex min-w-0 flex-wrap items-center gap-2"><button className="min-w-0 flex-1 break-words text-left" onClick={()=>setDetailEntity(e)}>{e.name}</button><span>{t(active.some(m=>m.placements?.some(p=>p.entityId===e.entityId&&p.deletedAt===null))?'worldEntity.placed':'worldEntity.unplaced')}</span><button disabled={!current} onClick={()=>locateEntity(e)}>{t('worldHome.locate')}</button></div>)}</section>)}
  </section>}
  {detailEntity&&<WorldEntityForm key={detailEntity.entityId} readOnly={readOnly} entity={detailEntity} entities={entities??[]} identityLocked metadata={<section aria-label={t('worldHome.location')} className="mb-3 space-y-1 break-words rounded border p-2">{active.flatMap(m=>(m.placements??[]).filter(p=>p.entityId===detailEntity.entityId&&p.deletedAt===null).map(p=><p key={p.placementId}>{m.title} · {p.geometry.type==='point'?`X: ${p.geometry.x}, Y: ${p.geometry.y}`:m.id===current?.id?areaText(regionStats.find(s=>s.placementId===p.placementId)?.area):`${p.geometry.cells.length} ${t('azgaar.cells')}`}</p>))}{!active.some(m=>m.placements?.some(p=>p.entityId===detailEntity.entityId&&p.deletedAt===null))&&<p>{t('worldEntity.unplaced')}</p>}</section>} onLocate={()=>locateEntity(detailEntity)} onCancel={()=>setDetailEntity(null)} onSave={async draft=>{if(readOnly)throw Error(t('worldHome.readOnly'));await beforeSave();await onSaved(await repository.updateEntity(world.id,draft.entityId,detailEntity.revision,{summary:draft.summary,content:draft.content,fields:draft.fields,relations:draft.relations,cultureSettings:draft.cultureSettings,subtype:draft.subtype}));setDetailEntity(null);}}/>}
  {managing&&<ModalDialog aria-label={t('worldMap.management')} onDismiss={()=>setManaging(false)} busy={busy} dismissOnBackdrop className="fixed inset-x-0 bottom-0 top-auto m-0 max-h-[88dvh] w-full max-w-none overflow-y-auto rounded-t-2xl border bg-[var(--color-bg)] p-4 text-[var(--color-text)] shadow-xl backdrop:bg-black/40 sm:inset-y-0 sm:left-auto sm:right-0 sm:h-dvh sm:max-h-none sm:w-[26rem] sm:rounded-none [&_button]:min-h-11 [&_button]:rounded-lg [&_button]:px-3">
   <header className="mb-4 flex items-center gap-2"><h2 className="flex-1 text-lg font-semibold">{t('worldMap.management')}</h2><button aria-label={t('worldMap.closePanel')} onClick={()=>setManaging(false)} disabled={busy}><X size={20}/></button></header>
   {!readOnly&&active.length>0&&<label>{t('worldHome.spaceType')}<select aria-label={t('worldHome.spaceType')} value={newSpace} onChange={e=>setNewSpace(e.target.value as 'underground'|'sky')}><option value="underground">{t('worldHome.space.underground')}</option><option value="sky">{t('worldHome.space.sky')}</option></select></label>}
   {!readOnly&&<div className="mb-4 grid grid-cols-2 gap-2"><button className="flex items-center justify-center gap-2 border" disabled={busy} onClick={()=>void create()}><Plus size={18}/>{t('worldMap.create')}</button><label className="relative flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border px-3"><Upload size={18}/>{t('worldMap.import')}<input aria-label={t('worldMap.import')} type="file" accept=".map,.gz" disabled={busy} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" onChange={e=>{const f=e.target.files?.[0];e.target.value='';if(f)void create(f,f.name.replace(/\.(map|gz)$/i,''));}}/></label></div>}

   {error&&<p role="alert" className="mb-3 break-words text-red-600">{mapMessage(language,error)}</p>}
   <ul className="space-y-2">{rows(false)}</ul>
   {!readOnly&&<details className="mt-4"><summary className="min-h-11 cursor-pointer py-3">{t('worldMap.deleted')}</summary><ul className="space-y-2">{rows(true)}</ul></details>}
  </ModalDialog>}
  {creation&&<WorldMapCreator initialName={creation.name} onCancel={()=>setCreation(null)} onCreate={async(name,project)=>{
    await beforeSave();
    const result=await repository.createSpace(world.id,name,(creation.scope??'surface') as 'surface'|'underground'|'sky',project);
    // Adopt committed content even if the parent UI callback subsequently fails; never create a duplicate on retry.
    setCreation(null);setManaging(false);
    try{await onSaved(result.world);setSelected(result.map.id);setEditing(true);}catch(error){setError(String(error));throw error;}
   }}/>}
  {entityPanel&&!entityForm&&<WorldEntityPanel entities={entities??[]} maps={active} readOnly={readOnly} onClose={()=>setEntityPanel(false)} onCreate={type=>setEntityForm({entity:newEntity(type),fresh:true})} onEdit={entity=>setEntityForm({entity,fresh:false})} onPlace={beginPlace} onOpen={id=>{setEntityPanel(false);choose(id);}}/>}

  {entityForm&&<WorldEntityForm key={entityForm.entity.entityId} entity={entityForm.entity} entities={entities??[]} onDelete={entityForm.fresh?undefined:async()=>{if(await askConfirm(t('worldHome.deleteEntityConfirm'))){await beforeSave();await onSaved(await repository.deleteEntity(world.id,entityForm.entity.entityId,entityForm.entity.revision));setEntityForm(null);}}} onCancel={()=>setEntityForm(null)} onSave={async draft=>{
    if(entityForm.region){setEntityForm(null);beginRegion(draft,current!.id,true);return;}
    await beforeSave();
    const page=entityForm.fresh&&!entityForm.point?await repository.createEntity(world.id,draft):entityForm.fresh?await repository.createSettlement(world.id,{type:draft.type==='site'?'site':'settlement',entityId:draft.entityId,name:draft.name,aliases:draft.aliases,subtype:draft.subtype,summary:draft.summary,content:draft.content,fields:draft.fields,relations:draft.relations},entityForm.point?{...entityForm.point}:undefined):await repository.updateEntity(world.id,draft.entityId,entityForm.entity.revision,{name:draft.name,aliases:draft.aliases,subtype:draft.subtype,summary:draft.summary,content:draft.content,relations:draft.relations,cultureSettings:draft.cultureSettings,fields:draft.fields});
    await onSaved(page);setEntityForm(null);
   }}/>}
  {query&&<ModalDialog aria-label={t('worldDistribution.query')} onDismiss={()=>setQuery(null)} dismissOnBackdrop className="max-h-[80dvh] w-[min(94vw,28rem)] overflow-y-auto rounded-xl border bg-[var(--color-bg)] p-4 text-[var(--color-text)] [&_button]:min-h-11">
   <h2>{t('worldDistribution.query')}</h2>{query.length?query.map(id=>{const r=regionProjections.find(p=>p.placementId===id);return r?<button key={id} className="block w-full text-left" onClick={()=>{setHighlight(id);setQuery(null);setMarkerId(id);}}>{r.name} · {t('worldRegion.type.'+r.entityType)}</button>:null;}):<p>{t('worldDistribution.empty')}</p>}<button onClick={()=>setQuery(null)}>{t('worldMap.closePanel')}</button>
  </ModalDialog>}
  {marker&&markerEntity&&!entityForm&&<ModalDialog aria-label={t(marker.geometry.type==='cells'?'worldRegion.info':'worldEntity.marker')} onDismiss={()=>setMarkerId(null)} dismissOnBackdrop busy={busy} className="w-[min(94vw,30rem)] rounded-xl border bg-[var(--color-bg)] p-4 text-[var(--color-text)] backdrop:bg-black/40 [&_button]:min-h-11 [&_button]:px-3">
   <h2 className="font-semibold">{markerEntity.name}</h2>{marker.geometry.type==='cells'&&<p>{areaText(regionStats.find(s=>s.placementId===marker.placementId)?.area)}</p>}<p className="my-2 break-words text-sm">{markerEntity.summary}</p><div className="flex flex-wrap gap-2">
   <button disabled={busy} onClick={()=>{setMarkerId(null);if(editing&&!readOnly)setEntityForm({entity:markerEntity,fresh:false});else setDetailEntity(markerEntity);}}>{t('worldEntity.open')}</button>{!readOnly&&<><button disabled={busy} onClick={()=>{if(marker.geometry.type==='cells'){beginRegion(markerEntity,current!.id);return;}setMarkerId(null);setEditing(true);setIntent({id:crypto.randomUUID(),kind:'move',mapId:current!.id,placementId:marker.placementId});}}>{t(marker.geometry.type==='cells'?'worldRegion.editTerritory':'worldEntity.move')}</button><button disabled={busy} onClick={()=>void(async()=>{if(await askConfirm(t('worldEntity.removeConfirm')))await run(async()=>{await onSaved(await repository.removePlacement(world.id,current!.id,marker.placementId,marker.revision));setMarkerId(null);});})()}>{t('worldEntity.remove')}</button></>}
   <button disabled={busy} onClick={()=>setMarkerId(null)}>{t('worldMap.closePanel')}</button></div>
  </ModalDialog>}
  {dialog}
 </section>;
}



