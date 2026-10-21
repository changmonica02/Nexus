"use client";
import {useState,useEffect} from 'react';
import type {WorldEntity,WorldMapRecord,WorldEntityType} from '../lib/types';
import {useLanguage} from '../lib/LanguageContext';
import TiptapEditor from './TiptapEditor';
import {mapMessage} from '../features/worldMap/mapMessages';
import ModalDialog from './ModalDialog';

export function WorldEntityForm({entity,entities=[],onSave,onCancel}:{entity:WorldEntity;entities?:WorldEntity[];onSave:(entity:WorldEntity)=>Promise<void>;onCancel:()=>void}) {
 const {language,t}=useLanguage();
 const [draft,setDraft]=useState(()=>structuredClone(entity)),[busy,setBusy]=useState(false),[error,setError]=useState(''),[changed,setChanged]=useState(false),[aliases,setAliases]=useState(entity.aliases.join(', '));
 useEffect(()=>{if(!changed)return;const guard=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue='';};window.addEventListener('beforeunload',guard);return()=>window.removeEventListener('beforeunload',guard);},[changed]);
 const update=(patch:Partial<WorldEntity>)=>{setDraft(old=>({...old,...patch}));setChanged(true);};
 const cancel=()=>{if(!busy&&(!changed||window.confirm(t('worldEntity.discard'))))onCancel();};
 return <ModalDialog aria-label={t(entity.type==='settlement'?'worldEntity.edit':'worldRegion.edit.'+entity.type)} busy={busy} onDismiss={cancel} className="max-h-[90dvh] w-[min(94vw,48rem)] overflow-y-auto rounded-xl border bg-[var(--color-bg)] p-4 text-[var(--color-text)] backdrop:bg-black/40 [&_button]:min-h-11 [&_button]:px-3">
  <h2 className="mb-3 font-semibold">{t(entity.type==='settlement'?'worldEntity.edit':'worldRegion.edit.'+entity.type)}</h2>
  <div inert={busy} className="grid min-w-0 gap-3 [&>*]:min-w-0 [&_input]:min-h-11 [&_input]:w-full [&_input]:rounded-lg [&_input]:border [&_input]:bg-transparent [&_input]:px-3">
   <label>{t(entity.type==='settlement'?'worldEntity.name':'worldRegion.name')}<input autoFocus value={draft.name} onChange={e=>update({name:e.target.value})}/></label>
   <label>{t('worldEntity.aliases')}<input value={aliases} onChange={e=>{setAliases(e.target.value);update({aliases:e.target.value.split(',').map(s=>s.trim()).filter(Boolean)});}}/></label>
   <label>{t(entity.type==='settlement'?'worldEntity.subtype':'worldRegion.subtype')}<input value={draft.subtype??''} onChange={e=>update({subtype:e.target.value})}/></label>
   <label>{t('worldEntity.summary')}<input value={draft.summary??''} onChange={e=>update({summary:e.target.value})}/></label>
   {['parent','capital','center','culture','religion'].filter(kind=>kind==='parent'?['settlement','administrative_area'].includes(entity.type):kind==='center'?entity.type==='administrative_area':entity.type==='country').map(kind=>{
     const allowed=kind==='parent'?['country','administrative_area']:kind==='capital'||kind==='center'?['settlement']:[kind];
     return <label key={kind}>{t('worldRegion.relation.'+kind)}<select aria-label={t('worldRegion.relation.'+kind)} className="min-h-11 w-full rounded-lg border bg-[var(--color-bg)] px-3" value={draft.relations.find(r=>r.type===kind)?.entityId??''} onChange={e=>update({relations:[...draft.relations.filter(r=>r.type!==kind),...(e.target.value?[{type:kind,entityId:e.target.value}]:[])]})}><option value="">{t('worldMap.none')}</option>{entities.filter(e=>e.entityId!==entity.entityId&&e.worldId===entity.worldId&&allowed.includes(e.type)).map(e=><option key={e.entityId} value={e.entityId}>{e.name}</option>)}</select></label>;
   })}
   <section aria-label={t('worldEntity.content')} className="min-h-40 min-w-0 max-w-full rounded-lg border p-2 [&>.flex-nowrap]:overflow-x-auto [&_.nexus-tiptap-editor]:ml-0 [&_.nexus-tiptap-editor]:pl-0"><p className="mb-2 text-sm opacity-60">{t('worldEntity.content')}</p><TiptapEditor content={draft.content??{type:'doc',content:[{type:'paragraph'}]}} onChange={({json})=>update({content:json})} variant="rich" showToolbar/></section>
  </div>
  {error&&<p role="alert" className="mt-3 text-red-600">{mapMessage(language,error)} {t('worldEntity.failed')}</p>}
  <footer className="mt-3 flex justify-end gap-2"><button disabled={busy} onClick={cancel}>{t('ui.cancel')}</button><button disabled={busy||!draft.name.trim()} onClick={()=>{setBusy(true);setError('');void onSave(draft).catch(error=>setError(String(error))).finally(()=>setBusy(false));}}>{t('worldEntity.save')}</button></footer>
 </ModalDialog>;
}
export default function WorldEntityPanel({entities,maps,readOnly,onClose,onCreate,onEdit,onPlace,onOpen}:{entities:WorldEntity[];maps:WorldMapRecord[];readOnly:boolean;onClose:()=>void;onCreate:(type:WorldEntityType)=>void;onEdit:(entity:WorldEntity)=>void;onPlace:(entity:WorldEntity,mapId:string)=>void;onOpen:(mapId:string)=>void}) {
 const {t}=useLanguage();
 const [mapId,setMapId]=useState(maps[0]?.id??'');
 return <ModalDialog aria-label={t('worldEntity.title')} onDismiss={onClose} dismissOnBackdrop className="max-h-[90dvh] w-[min(94vw,42rem)] overflow-y-auto rounded-xl border bg-[var(--color-bg)] p-4 text-[var(--color-text)] backdrop:bg-black/40 [&_button]:min-h-11 [&_button]:rounded-lg [&_button]:px-3">
  <header className="mb-3 flex flex-wrap items-center gap-2"><h2 className="mr-auto font-semibold">{t('worldEntity.title')}</h2>{!readOnly&&<span className="flex flex-wrap gap-2">{(['settlement','country','administrative_area'] as const).map(type=><button key={type} className="border" onClick={()=>onCreate(type)}>{t(type==='settlement'?'worldEntity.add':'worldRegion.add.'+type)}</button>)}</span>}<button onClick={onClose}>{t('worldMap.closePanel')}</button></header>
  {!entities.length&&<p className="py-4 opacity-60">{t('worldEntity.empty')}</p>}
  {!!maps.length&&!readOnly&&<label className="block text-sm">{t('worldEntity.targetMap')}<select aria-label={t('worldEntity.targetMap')} className="mb-3 min-h-11 w-full rounded-lg border bg-transparent px-2" value={mapId} onChange={e=>setMapId(e.target.value)}>{maps.map(map=><option key={map.id} value={map.id}>{map.title}</option>)}</select></label>}
  <p className="mb-3 text-xs opacity-60">{t('worldEntity.backupHint')}</p>
  <ul className="space-y-3">{entities.filter(entity=>['settlement','country','administrative_area'].includes(entity.type)).map(entity=>{
   const placed=maps.filter(map=>map.placements?.some(p=>p.entityId===entity.entityId&&p.deletedAt===null));
   return <li key={entity.entityId} className="rounded-xl border p-3"><div className="flex items-center gap-2"><strong className="min-w-0 flex-1 truncate">{entity.name}</strong><span className="text-xs opacity-60">{t('worldRegion.type.'+entity.type)}</span><span className="text-xs opacity-60">{t(placed.length?'worldEntity.placed':'worldEntity.unplaced')}</span></div>{entity.summary&&<p className="mt-1 break-words text-sm opacity-70">{entity.summary}</p>}<div className="mt-2 flex flex-wrap gap-2">{!readOnly&&<button onClick={()=>onEdit(entity)}>{t(entity.type==='settlement'?'worldEntity.edit':'worldRegion.edit.'+entity.type)}</button>}{placed.map(map=><button key={map.id} onClick={()=>onOpen(map.id)}>{map.title} ↗</button>)}{!readOnly&&mapId&&<button onClick={()=>onPlace(entity,mapId)}>{t('worldEntity.place')}</button>}</div></li>;
  })}</ul>
 </ModalDialog>;
}

