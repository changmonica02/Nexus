"use client";
import {useState} from 'react';
import type {WorldEntity,WorldMapRecord} from '../lib/types';
import {useLanguage} from '../lib/LanguageContext';
import TiptapEditor from './TiptapEditor';
import ModalDialog from './ModalDialog';

export function WorldEntityForm({entity,onSave,onCancel}:{entity:WorldEntity;onSave:(entity:WorldEntity)=>Promise<void>;onCancel:()=>void}) {
 const {t}=useLanguage();
 const [draft,setDraft]=useState(()=>structuredClone(entity)),[busy,setBusy]=useState(false),[error,setError]=useState(false),[changed,setChanged]=useState(false),[aliases,setAliases]=useState(entity.aliases.join(', '));
 const update=(patch:Partial<WorldEntity>)=>{setDraft(old=>({...old,...patch}));setChanged(true);};
 const cancel=()=>{if(!busy&&(!changed||window.confirm(t('worldEntity.discard'))))onCancel();};
 return <ModalDialog aria-label={t('worldEntity.edit')} busy={busy} onDismiss={cancel} className="max-h-[90dvh] w-[min(94vw,48rem)] overflow-y-auto rounded-xl border bg-[var(--color-bg)] p-4 text-[var(--color-text)] backdrop:bg-black/40 [&_button]:min-h-11 [&_button]:px-3">
  <h2 className="mb-3 font-semibold">{t('worldEntity.edit')}</h2>
  <div className="grid gap-3 [&_input]:min-h-11 [&_input]:w-full [&_input]:rounded-lg [&_input]:border [&_input]:bg-transparent [&_input]:px-3">
   <label>{t('worldEntity.name')}<input autoFocus value={draft.name} onChange={e=>update({name:e.target.value})}/></label>
   <label>{t('worldEntity.aliases')}<input value={aliases} onChange={e=>{setAliases(e.target.value);update({aliases:e.target.value.split(',').map(s=>s.trim()).filter(Boolean)});}}/></label>
   <label>{t('worldEntity.subtype')}<input value={draft.subtype??''} onChange={e=>update({subtype:e.target.value})}/></label>
   <label>{t('worldEntity.summary')}<input value={draft.summary??''} onChange={e=>update({summary:e.target.value})}/></label>
   <section aria-label={t('worldEntity.content')} className="min-h-40 rounded-lg border p-2"><p className="mb-2 text-sm opacity-60">{t('worldEntity.content')}</p><TiptapEditor content={draft.content??{type:'doc',content:[{type:'paragraph'}]}} onChange={({json})=>update({content:json})} variant="rich" showToolbar/></section>
  </div>
  {error&&<p role="alert" className="mt-3 text-red-600">{t('worldEntity.failed')}</p>}
  <footer className="mt-3 flex justify-end gap-2"><button disabled={busy} onClick={cancel}>{t('ui.cancel')}</button><button disabled={busy||!draft.name.trim()} onClick={()=>{setBusy(true);setError(false);void onSave(draft).catch(()=>setError(true)).finally(()=>setBusy(false));}}>{t('worldEntity.save')}</button></footer>
 </ModalDialog>;
}
export default function WorldEntityPanel({entities,maps,readOnly,onClose,onCreate,onEdit,onPlace,onOpen}:{entities:WorldEntity[];maps:WorldMapRecord[];readOnly:boolean;onClose:()=>void;onCreate:()=>void;onEdit:(entity:WorldEntity)=>void;onPlace:(entity:WorldEntity,mapId:string)=>void;onOpen:(mapId:string)=>void}) {
 const {t}=useLanguage();
 const [mapId,setMapId]=useState(maps[0]?.id??'');
 return <ModalDialog aria-label={t('worldEntity.title')} onDismiss={onClose} dismissOnBackdrop className="max-h-[90dvh] w-[min(94vw,42rem)] overflow-y-auto rounded-xl border bg-[var(--color-bg)] p-4 text-[var(--color-text)] backdrop:bg-black/40 [&_button]:min-h-11 [&_button]:rounded-lg [&_button]:px-3">
  <header className="mb-3 flex flex-wrap items-center gap-2"><h2 className="mr-auto font-semibold">{t('worldEntity.title')}</h2>{!readOnly&&<button className="border" onClick={onCreate}>{t('worldEntity.add')}</button>}<button onClick={onClose}>{t('worldMap.closePanel')}</button></header>
  {!entities.length&&<p className="py-4 opacity-60">{t('worldEntity.empty')}</p>}
  {!!maps.length&&!readOnly&&<label className="block text-sm">{t('worldEntity.targetMap')}<select className="mb-3 min-h-11 w-full rounded-lg border bg-transparent px-2" value={mapId} onChange={e=>setMapId(e.target.value)}>{maps.map(map=><option key={map.id} value={map.id}>{map.title}</option>)}</select></label>}
  <ul className="space-y-3">{entities.filter(entity=>entity.type==='settlement').map(entity=>{
   const placed=maps.filter(map=>map.placements?.some(p=>p.entityId===entity.entityId&&p.deletedAt===null));
   return <li key={entity.entityId} className="rounded-xl border p-3"><div className="flex items-center gap-2"><strong className="min-w-0 flex-1 truncate">{entity.name}</strong><span className="text-xs opacity-60">{t(placed.length?'worldEntity.placed':'worldEntity.unplaced')}</span></div>{entity.summary&&<p className="mt-1 break-words text-sm opacity-70">{entity.summary}</p>}<div className="mt-2 flex flex-wrap gap-2">{!readOnly&&<button onClick={()=>onEdit(entity)}>{t('worldEntity.edit')}</button>}{placed.map(map=><button key={map.id} onClick={()=>onOpen(map.id)}>{map.title} ↗</button>)}{!readOnly&&mapId&&<button onClick={()=>onPlace(entity,mapId)}>{t('worldEntity.place')}</button>}</div></li>;
  })}</ul>
 </ModalDialog>;
}
