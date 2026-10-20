"use client";
import {useMemo, useState} from 'react';
import type {Page,WorldMapRecord} from '../lib/types';
import type {StorageAdapter} from '../infrastructure/storage/StorageAdapter';
import {WorldMapRepository} from '../features/worldMap/worldMapRepository';
import {downloadMapBlob} from '../features/worldMap/coreClient';
import {prepareOfflineMapCore} from '../features/worldMap/offlineCore';
import {useLanguage} from '../lib/LanguageContext';
import {useWorkspaceDialog} from './WorkspaceDialog';
import WorldMapEditor, {type RegisterMapFlush} from './WorldMapEditor';

export default function WorldMapManager({world,storage,beforeSave,onSaved,registerFlush,cloudState}: {
  world:Page; storage:StorageAdapter; beforeSave:()=>Promise<void>; onSaved:(page:Page)=>Promise<void>;registerFlush?:RegisterMapFlush;cloudState?:{status:string;error?:string|null};
}) {
  const {language}=useLanguage(),en=language==='en';
  const {askText,askConfirm,dialog}=useWorkspaceDialog();
  const repository=useMemo(()=>new WorldMapRepository(storage),[storage]);
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const [opened,setOpened]=useState<{map:WorldMapRecord;blob:Blob|null;draftToken?:string;draftConflict?:{token:string;blob:Blob}}|null>(null);
  const maps=world.character_data?.world_maps??[];
  const run=async(operation:()=>Promise<void>)=>{
    if(busy)return;setBusy(true);setError('');
    try{await beforeSave();await operation();}catch(e){setError(String(e));}finally{setBusy(false);}
  };
  const open=async(id:string)=>{
    const saved=await repository.read(world.id,id),draft=await repository.readDraft(world.id,id);
    // Failure to cache public tools must not discard a user's project or block online editing.
    await prepareOfflineMapCore().catch(()=>setError(en?'Offline tools could not be prepared; online editing remains available.':'離線工具暫時無法準備，仍可在線上編輯。'));
    setOpened(draft&&draft.base_revision===saved.map.revision?{map:saved.map,blob:draft.blob,draftToken:draft.token}
      :{...saved,draftConflict:draft?{token:draft.token,blob:draft.blob}:undefined});
  };
  const create=async(blob?:Blob,defaultName?:string)=>{
    const name=(await askText(en?'Map name':'地圖名稱',defaultName??(en?'New map':'新地圖')))?.trim();
    if(!name)return;
    await run(async()=>{const result=await repository.create(world.id,name,blob);await onSaved(result.world);await open(result.map.id);});
  };
  const rows=(deleted:boolean)=>maps.filter(map=>(map.deleted_at!=null)===deleted).map(map=><li key={map.id} className="flex flex-wrap items-center gap-2 border-b py-2">
    <button type="button" disabled={busy||deleted} onClick={()=>void run(()=>open(map.id))} className="mr-auto min-h-9 text-left font-medium">{map.title}</button>
    {deleted?<button type="button" disabled={busy} onClick={()=>void run(async()=>{await onSaved(await repository.restore(world.id,map.id,map.revision));})}>{en?'Restore':'還原'}</button>:<>
      <button type="button" disabled={busy} onClick={()=>void(async()=>{const title=await askText(en?'Rename map':'重新命名地圖',map.title);if(title?.trim())await run(async()=>{await onSaved(await repository.rename(world.id,map.id,map.revision,title));});})()}>{en?'Rename':'改名'}</button>
      <button type="button" disabled={busy} onClick={()=>void run(async()=>{const copy=await repository.duplicate(world.id,map.id,map.revision,map.title+(en?' copy':' 副本'));await onSaved(copy.world);})}>{en?'Duplicate':'複製'}</button>
      <button type="button" disabled={busy||!map.attachment_id} onClick={()=>void run(async()=>{const file=await repository.read(world.id,map.id);if(file.blob)downloadMapBlob(file.blob,map.title,'map');})}>.map ↓</button>
      <button type="button" disabled={busy} onClick={()=>void(async()=>{if(await askConfirm(en?'Move this map to deleted maps? Its project can be restored.':'將此地圖移至已刪除地圖？原生專案仍可還原。'))await run(async()=>{await onSaved(await repository.remove(world.id,map.id,map.revision));});})()}>{en?'Delete':'刪除'}</button>
    </>}
  </li>);
  return <section aria-label={en?'World maps':'世界觀地圖'} className="shrink-0 border-b p-3 text-sm">
    <details className="max-h-[40vh] overflow-y-auto [&_button]:min-h-11 [&_button]:rounded [&_button]:border [&_button]:px-3"><summary className="cursor-pointer font-semibold">{en?'Maps':'地圖'} ({maps.filter(m=>m.deleted_at==null).length})</summary>
      <div className="flex flex-wrap gap-3 py-3">
        <button type="button" disabled={busy} onClick={()=>void create()}>＋ {en?'Create map':'建立地圖'}</button>
        <label className={busy?'opacity-50':''}>{en?'Import .map':'匯入 .map'}<input type="file" accept=".map,.gz" disabled={busy} className="block max-w-48 text-xs" onChange={event=>{const file=event.target.files?.[0];event.target.value='';if(file)void create(file,file.name.replace(/\.(map|gz)$/i,''));}}/></label>
      </div>
      <ul>{rows(false)}</ul>
      <details className="pt-2"><summary>{en?'Deleted maps':'已刪除地圖'}</summary><ul>{rows(true)}</ul></details>
      {error&&<p role="alert" className="py-2 text-red-600">{error}</p>}
    </details>
    {dialog}
    {opened&&<WorldMapEditor key={opened.map.id} {...opened} repository={repository} beforeSave={beforeSave} onSaved={onSaved} registerFlush={registerFlush} cloudState={cloudState} onClose={()=>setOpened(null)}/>}
  </section>;
}
