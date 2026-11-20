"use client";
import {useEffect,useLayoutEffect,useRef,useState,type ReactNode} from 'react';
import type {Page,WorldMapRecord} from '../lib/types';
import type {WorldMapRepository} from '../features/worldMap/worldMapRepository';
import type {RegisterMapFlush} from './WorldMapEditor';
import {WorldMapSyncStatus} from './WorldMapEditor';
import {readGlobalMapProject,globalMapBlob} from '../features/worldMap/globalMapProject';
import {createGlobalMapClient,type GlobalMapClient,type GlobalMapResult,type HeightBrush} from '../features/worldMap/globalMapClient';
import {globalMapText} from '../features/worldMap/globalMapMessages';
import {downloadMapBlob} from '../features/worldMap/coreClient';
import {useLanguage} from '../lib/LanguageContext';
import GlobalMapCanvas from './GlobalMapCanvas';
import GlobalNaturalFeatures from './GlobalNaturalFeatures';
import type {NaturalFeaturePatch} from '../features/worldMap/globalMapProject';
import GlobalMapParameters,{newGlobalMapSettings} from './GlobalMapParameters';
import {validateGlobalSettings} from '../features/worldMap/globalMapProject';
import ModalDialog from './ModalDialog';
export default function GlobalWorldMapEditor({map,blob,draftToken,draftConflict,repository,beforeSave,onSaved,onClose,registerFlush,cloudState,editing=true,onEdit,previewFooter}:{
 map:WorldMapRecord;blob:Blob|null;draftToken?:string;draftConflict?:{token:string;blob:Blob};repository:WorldMapRepository;
 beforeSave:()=>Promise<void>;onSaved:(page:Page)=>Promise<void>;onClose:()=>void;registerFlush?:RegisterMapFlush;
 cloudState?:{status:string;error?:string|null;pendingPushes?:number};editing?:boolean;onEdit?:()=>void;previewFooter?:ReactNode;
}){
 const {language}=useLanguage(),text=globalMapText(language);
 const [model,setModel]=useState<GlobalMapResult>(),[candidate,setCandidate]=useState<GlobalMapResult>();
 const [settings,setSettings]=useState(newGlobalMapSettings),[replacing,setReplacing]=useState(false);
 const [working,setWorking]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState(false),[dirty,setDirty]=useState(Boolean(draftToken));
 const [conflict,setConflict]=useState(draftConflict),[fullView,setFullView]=useState(false);
 const [brush,setBrush]=useState<Omit<HeightBrush,'longitude'|'latitude'>>({radius:5,strength:10,tool:'raise',mode:'preserve',target:'land'}),[painting,setPainting]=useState(false);
 const [lineStart,setLineStart]=useState<[number,number]>();
 const [discardPrompt,setDiscardPrompt]=useState(false);
 const client=useRef<GlobalMapClient|null>(null),alive=useRef(true),current=useRef<GlobalMapResult|undefined>(undefined);
 const revision=useRef(map.revision),token=useRef(draftToken),unsaved=useRef(Boolean(draftToken)),active=useRef<Promise<void>|null>(null),generating=useRef(false);
 const latest=useRef({beforeSave,onSaved,editing,conflict,replacing});useLayoutEffect(()=>{latest.current={beforeSave,onSaved,editing,conflict,replacing};});
 const saveRef=useRef<()=>Promise<void>>(async()=>{});
 const surface=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  let live=true;alive.current=true;const c=createGlobalMapClient();client.current=c;revision.current=map.revision;token.current=draftToken;unsaved.current=Boolean(draftToken);
  void (async()=>{if(!blob)throw Error('Missing global map');const project=await readGlobalMapProject(blob);const value=await c.request('load',project);if(live){current.current=value;setModel(value);setSettings(value.project.settings);setError(false);setDirty(Boolean(draftToken));}})().catch(()=>{if(live)setError(true);}).finally(()=>{if(live)setWorking(false);});
  return()=>{live=false;alive.current=false;c.close();client.current=null;};
 // A metadata-only revision from our own save must not reload the old input Blob.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[blob,draftToken]);
 useLayoutEffect(()=>{saveRef.current=()=>{
  if(active.current)return active.current;
  if(!latest.current.editing||!unsaved.current)return Promise.resolve();
  if(!current.current||latest.current.conflict)return Promise.reject(Error('Map is not ready for saving'));
  const task=(async()=>{
   setSaving(true);setError(false);
   try{
    const snapshot=globalMapBlob(current.current!.project);
    token.current=await repository.stageDraft(map.world_id,map.id,revision.current,snapshot);
    await latest.current.beforeSave();
    const result=await repository.save(map.world_id,map.id,revision.current,snapshot);
    // Adopt a successful commit before any optional UI callback or cleanup can fail.
    revision.current=result.map.revision;unsaved.current=false;if(alive.current)setDirty(false);
    if(token.current){await repository.clearDraft(map.world_id,map.id,token.current);token.current=undefined;}
    await latest.current.onSaved(result.world);
   }catch(e){if(alive.current)setError(true);throw e;}
   finally{if(alive.current)setSaving(false);}
  })();active.current=task;void task.finally(()=>{active.current=null;}).catch(()=>{});return task;
 };});
 useEffect(()=>registerFlush?.(`global:${map.id}`,async()=>{if(latest.current.replacing)throw Error('Confirm or cancel the replacement before leaving');await saveRef.current();}),[registerFlush,map.id]);
 useEffect(()=>{const guard=(e:BeforeUnloadEvent)=>{if(unsaved.current||latest.current.replacing||active.current){e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',guard);return()=>window.removeEventListener('beforeunload',guard);},[]);
 const generate=async()=>{
  if(generating.current||active.current||!client.current)return;
  try{validateGlobalSettings(settings);}catch{setError(true);return;}
  generating.current=true;setWorking(true);setError(false);
  try{const value=await client.current.request('generate',settings,{language});if(alive.current)setCandidate(value);}
  catch{if(alive.current)setError(true);}finally{generating.current=false;if(alive.current)setWorking(false);}
 };
 const apply=async()=>{
  if(!candidate||working||saving||conflict||JSON.stringify(candidate.project.settings)!==JSON.stringify(settings))return;
  current.current=candidate;setModel(candidate);setCandidate(undefined);setReplacing(false);unsaved.current=true;setDirty(true);
  await saveRef.current();
 };
 const naturalAction=async(action:'editNatural'|'rebuildPack'|'initializeNatural'|'recalculateNature',patch?:NaturalFeaturePatch)=>{
  if(generating.current||active.current||!client.current||!current.current||!editing||conflict||replacing)throw Error('Map is busy');
  generating.current=true;setWorking(true);setError(false);
  try{const value=await client.current.request(action,current.current.project,{patch,language});current.current=value;setModel(value);unsaved.current=true;setDirty(true);await saveRef.current();}
  catch(e){setError(true);throw e;}finally{generating.current=false;setWorking(false);}
 };
 const paint=async(longitude:number,latitude:number)=>{
  if(generating.current||active.current||!client.current||!current.current||!editing||conflict||replacing)return;
  if(brush.tool==='line'&&!lineStart){setLineStart([longitude,latitude]);return;}
  const stroke=brush.tool==='line'?{...brush,longitude:lineStart![0],latitude:lineStart![1],end:[longitude,latitude] as [number,number]}:{...brush,longitude,latitude};
  setLineStart(undefined);generating.current=true;setWorking(true);setError(false);
  try{const value=await client.current.request('editHeight',current.current.project,{brush:stroke,language});current.current=value;setModel(value);unsaved.current=true;setDirty(true);await saveRef.current();}
  catch{setError(true);}finally{generating.current=false;setWorking(false);}
 };
 const close=async()=>{if(replacing){setDiscardPrompt(true);return;}try{await saveRef.current();onClose();}catch{/* Keep the working map and recovery export visible. */}};
 const matches=candidate&&JSON.stringify(candidate.project.settings)===JSON.stringify(settings);
 const busy=working||saving;
 useLayoutEffect(()=>{
  if(!editing&&!fullView)return;
  const previous=document.activeElement as HTMLElement|null,overflow=document.body.style.overflow;
  document.body.style.overflow='hidden';surface.current?.querySelector<HTMLButtonElement>('button')?.focus();
  return()=>{document.body.style.overflow=overflow;if(previous?.isConnected)previous.focus();};
 },[editing,fullView]);
 return <div ref={surface} onKeyDown={e=>{if((e.target as Element).closest('dialog'))return;if(e.key==='Escape'&&!busy){e.preventDefault();if(editing)void close();else setFullView(false);}if(e.key==='Tab'&&(editing||fullView)){const items=[...(surface.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),summary,[tabindex="0"]')??[])].filter(el=>el.getClientRects().length);const first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}}} role={editing||fullView?'dialog':undefined} aria-modal={editing||fullView?true:undefined} aria-label={text('title')} className={editing||fullView?'fixed inset-0 z-50 flex h-dvh min-w-0 flex-col bg-[var(--color-bg)] text-[var(--color-text)]':'relative flex min-w-0 flex-col'}>
  <header className="flex shrink-0 flex-wrap items-center gap-2 border-b p-2 [&_button]:min-h-11 [&_button]:rounded-lg [&_button]:border [&_button]:px-3 [&_button:disabled]:opacity-40">
   {editing?<button disabled={busy} onClick={()=>void close()}>{text('close')}</button>:fullView&&<button onClick={()=>setFullView(false)}>{text('cancel')}</button>}
   <strong className="mr-auto min-w-0 flex-1 truncate">{map.title}</strong>
   {editing&&<><button disabled={busy||!model||!!conflict||replacing||dirty} onClick={()=>{setSettings(current.current!.project.settings);setReplacing(true);setCandidate(undefined);}}>{text('replace')}</button><button disabled={busy||!model||!!conflict||replacing||!dirty} onClick={()=>void saveRef.current().catch(()=>{})}>{text('save')}</button></>}
   {model&&<button disabled={busy} onClick={()=>downloadMapBlob(globalMapBlob(current.current!.project),map.title,'nexus-map.json')}>{text('export')}</button>}
   {!editing&&onEdit&&<button disabled={busy||!model} onClick={onEdit}>{text('edit')}</button>}
   {!editing&&!fullView&&<button onClick={()=>setFullView(true)}>{text('readonly')}</button>}
  </header>
  {error&&<p role="alert" className="shrink-0 break-words p-3 text-red-600">{text(model?'failed':'loadFailed')}</p>}
  {conflict&&<section role="alert" className="shrink-0 p-3 text-amber-700"><p>{text('conflict')}</p><button className="min-h-11 border px-3" onClick={()=>downloadMapBlob(conflict.blob,map.title+'-recovery','nexus-map.json')}>{text('exportDraft')}</button><button className="min-h-11 border px-3" disabled={saving} onClick={()=>setDiscardPrompt(true)}>{text('discardDraft')}</button></section>}
  {editing&&replacing&&<section className="max-h-[42dvh] shrink-0 overflow-y-auto border-b p-3">
   <p className="mb-2 font-medium">{text('candidate')}</p><GlobalMapParameters settings={settings} onChange={setSettings} disabled={busy}/>
   <div className="mt-2 flex flex-wrap gap-2 [&_button]:min-h-11 [&_button]:rounded-lg [&_button]:border [&_button]:px-3 [&_button:disabled]:opacity-40"><button disabled={busy} onClick={()=>void generate()}>{text('generate')}</button><button disabled={busy||!matches||!!conflict} onClick={()=>void apply().catch(()=>{})}>{text('apply')}</button><button disabled={busy} onClick={()=>{setReplacing(false);setCandidate(undefined);setError(false);}}>{text('discard')}</button></div>
   {!busy&&candidate&&!matches&&<p>{text('controlsChanged')}</p>}
  </section>}
  {editing&&model&&!replacing&&<section className="flex shrink-0 flex-wrap items-center gap-2 border-b p-2 text-sm">
   <button className="min-h-11 rounded border px-3" disabled={busy||!!conflict} aria-pressed={painting} onClick={()=>{setPainting(!painting);setLineStart(undefined);}}>{language==='zh-TW'?(painting?'完成高度編輯':'高度工具'):'Height tools'}</button>
   <button className="min-h-11 rounded border px-3" disabled={busy||!!conflict||!model.project.environmentTerrain} onClick={()=>void naturalAction('recalculateNature').catch(()=>{})}>重新計算自然環境</button>
   {model.project.environmentTerrain&&<span role="status">地形已修改；氣候、河流流量與生態仍顯示上次計算結果。</span>}
   {painting&&<>
    <select aria-label="高度模式" value={brush.mode} onChange={e=>setBrush({...brush,mode:e.target.value as HeightBrush['mode']})}><option value="preserve">保留海岸</option><option value="free">自由</option></select>
    <select aria-label="編輯範圍" disabled={brush.mode==='free'} value={brush.target} onChange={e=>setBrush({...brush,target:e.target.value as HeightBrush['target']})}><option value="land">編輯陸地</option><option value="ocean">編輯海洋</option></select>
    <select aria-label="高度筆刷" value={brush.tool} onChange={e=>{setBrush({...brush,tool:e.target.value as HeightBrush['tool']});setLineStart(undefined);}}>{[['raise','強制抬升'],['raiseGradient','漸層抬升'],['lower','強制降低'],['lowerGradient','漸層降低'],['smooth','平滑筆刷'],['noise','擾動筆刷'],['line','直線筆刷']].map(([v,label])=><option key={v} value={v}>{label}</option>)}</select>
    <label>半徑（°）<input className="w-16 border" type="number" min={1} max={30} value={brush.radius} onChange={e=>setBrush({...brush,radius:Number(e.target.value)})}/></label>
    <label>強度（100 m）<input className="w-16 border" type="number" min={1} max={100} value={brush.strength} onChange={e=>setBrush({...brush,strength:Number(e.target.value)})}/></label>
    <span>{brush.tool==='line'?(lineStart?'點選終點以抬升直線範圍。':'點選直線起點。'):'點選地圖套用筆刷；每次操作自動儲存。'}</span>
   </>}
  </section>}
  {editing&&model&&!replacing&&<GlobalNaturalFeatures project={model.project} drawing={model.drawing} disabled={busy||!!conflict} language={language} onAction={naturalAction}/>}
  <div aria-busy={working} className={editing||fullView?'relative min-h-0 flex-1':'relative h-[clamp(16rem,40dvh,28rem)]'}>
   {(replacing?candidate??model:model)&&<GlobalMapCanvas onPaint={editing&&painting&&!busy&&!replacing&&!conflict?((lon,lat)=>void paint(lon,lat)):undefined} drawing={(replacing?candidate??model:model)!.drawing}/>}
   {working&&<p role="status" className="absolute inset-0 grid place-items-center bg-[var(--color-bg)]/80">{text('busy')}</p>}
   {!working&&!model&&<p className="p-4">{text('missing')}</p>}
  </div>
  <p className="shrink-0 px-3 py-1 text-sm">{(replacing?candidate??model:model)&&`${text('measured')}：${(replacing?candidate??model:model)!.drawing.landPercent.toFixed(3)}%`}</p>
  {editing&&<p className="shrink-0 px-3 py-1 text-xs opacity-70">{text('help')}</p>}
  {!editing&&previewFooter}
  <WorldMapSyncStatus localLabel={model?(dirty?text('pending'):text('saved')):text(working?'busy':'missing')} cloudState={cloudState}/>
  {discardPrompt&&<ModalDialog aria-label={text(conflict?'discardDraft':'discard')} onDismiss={()=>setDiscardPrompt(false)} busy={saving} className="w-[min(94vw,30rem)] rounded-xl border bg-[var(--color-bg)] p-4 text-[var(--color-text)] backdrop:bg-black/40"><p>{text(conflict?'discardConfirm':'leaveCandidate')}</p><div className="mt-3 flex gap-2 [&_button]:min-h-11 [&_button]:border [&_button]:px-3"><button disabled={saving} onClick={()=>setDiscardPrompt(false)}>{text('cancel')}</button><button disabled={saving} onClick={()=>{if(conflict){setSaving(true);void repository.clearDraft(map.world_id,map.id,conflict.token).then(()=>{if(alive.current){setConflict(undefined);setDiscardPrompt(false);}}).catch(()=>setError(true)).finally(()=>{if(alive.current)setSaving(false);});}else{setCandidate(undefined);setReplacing(false);setDiscardPrompt(false);}}}>{text(conflict?'discardDraft':'discard')}</button></div></ModalDialog>}
 </div>;
}
