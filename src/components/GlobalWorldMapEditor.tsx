"use client";
import {Droplets, Layers, Mountain, Waves, Wrench, X} from 'lucide-react';
import {useEffect,useLayoutEffect,useRef,useState,type ReactNode} from 'react';
import type {Page,WorldMapRecord} from '../lib/types';
import type {WorldMapRepository} from '../features/worldMap/worldMapRepository';
import type {RegisterMapFlush} from './WorldMapSyncStatus';
import {WorldMapSyncStatus} from './WorldMapSyncStatus';
import {readGlobalMapProject,globalMapBlob} from '../features/worldMap/globalMapProject';
import {takeGeneratedMap} from '../features/worldMap/generatedMapHandoff';
import {createGlobalMapClient,type GlobalMapClient,type GlobalMapResult,type HeightBrush} from '../features/worldMap/globalMapClient';
import {globalMapText} from '../features/worldMap/globalMapMessages';
import {downloadMapBlob} from '../features/worldMap/coreClient';
import {useLanguage} from '../lib/LanguageContext';
import type {GlobalMapDrawing} from '../features/worldMap/globalMapGeometry';
import GlobalMapCanvas from './GlobalMapCanvas';
import {generationStageLabel,type GenerationProgress} from '../features/worldMap/globalMapProgress';
import GlobalMapDisplayPanel from './GlobalMapDisplayPanel';
import GlobalMapHeightTools from './GlobalMapHeightTools';
import {newMapDisplay} from '../features/worldMap/globalMapDisplay';
import type {GlobalMapProject} from '../features/worldMap/globalMapProject';
import GlobalNaturalFeatures from './GlobalNaturalFeatures';
import type {NaturalFeaturePatch} from '../features/worldMap/globalMapProject';
import GlobalMapParameters,{newGlobalMapSettings} from './GlobalMapParameters';
import {validateGlobalSettings} from '../features/worldMap/globalMapProject';
import ModalDialog from './ModalDialog';
const sidebarToolClass='flex min-h-11 min-w-0 flex-col items-center justify-center gap-1 whitespace-nowrap rounded-lg px-1 py-1.5 text-[11px] leading-tight transition-colors hover:bg-current/5 aria-expanded:bg-blue-500/10 aria-expanded:text-blue-700 aria-pressed:bg-blue-500/10 aria-pressed:text-blue-700 dark:aria-expanded:text-blue-300 dark:aria-pressed:text-blue-300 focus-visible:outline-2 focus-visible:outline-blue-600';
const mapTools=[
 {key:'height',icon:Mountain,zh:'高度',en:'Height'},
 {key:'coast',icon:Waves,zh:'海岸線',en:'Coast'},
 {key:'rivers',icon:Droplets,zh:'河流',en:'Rivers'},
] as const;

export default function GlobalWorldMapEditor({map,blob,draftToken,draftConflict,repository,beforeSave,onSaved,onClose,registerFlush,cloudState,editing=true,onEdit,previewFooter,mapSelector}:{
 map:WorldMapRecord;blob:Blob|null;draftToken?:string;draftConflict?:{token:string;blob:Blob};repository:WorldMapRepository;
 beforeSave:()=>Promise<void>;onSaved:(page:Page)=>Promise<void>;onClose:()=>void;registerFlush?:RegisterMapFlush;
 cloudState?:{status:string;error?:string|null;pendingPushes?:number};editing?:boolean;onEdit?:()=>void;previewFooter?:ReactNode;mapSelector?:ReactNode;
}){
 const {language}=useLanguage(),text=globalMapText(language);
 const [model,setModel]=useState<GlobalMapResult>(),[candidate,setCandidate]=useState<GlobalMapResult>();
 const [loadingDrawing,setLoadingDrawing]=useState<GlobalMapDrawing>();
 const [settings,setSettings]=useState(newGlobalMapSettings),[replacing,setReplacing]=useState(false);
 const [working,setWorking]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState(false),[dirty,setDirty]=useState(Boolean(draftToken));
 const [conflict,setConflict]=useState(draftConflict),[fullView,setFullView]=useState(false);
 const [brush,setBrush]=useState<Omit<HeightBrush,'longitude'|'latitude'>>({radius:5,strength:2,tool:'raise',mode:'preserve',target:'land'}),[painting,setPainting]=useState(false);
 const [display,setDisplay]=useState(newMapDisplay),[panel,setPanel]=useState<'tools'|'display'|null>(null),[tool,setTool]=useState<'height'|'coast'|'rivers'>('height');
 const [undoStack,setUndoStack]=useState<GlobalMapProject[]>([]),[redoStack,setRedoStack]=useState<GlobalMapProject[]>([]);
 const [lineStart,setLineStart]=useState<[number,number]>();
 const [progress,setProgress]=useState<GenerationProgress>();
 const [discardPrompt,setDiscardPrompt]=useState(false);
 const client=useRef<GlobalMapClient|null>(null),alive=useRef(true),current=useRef<GlobalMapResult|undefined>(undefined);
 const revision=useRef(map.revision),token=useRef(draftToken),unsaved=useRef(Boolean(draftToken)),active=useRef<Promise<void>|null>(null),generating=useRef(false);
 const latest=useRef({beforeSave,onSaved,editing,conflict,replacing});useLayoutEffect(()=>{latest.current={beforeSave,onSaved,editing,conflict,replacing};});
 const saveRef=useRef<()=>Promise<void>>(async()=>{});
 const surface=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  let live=true;alive.current=true;const c=createGlobalMapClient();client.current=c;revision.current=map.revision;token.current=draftToken;unsaved.current=Boolean(draftToken);
  void (async()=>{if(!blob)throw Error('Missing global map');const project=await readGlobalMapProject(blob);if(!live)return;const value=(!draftToken?takeGeneratedMap(map.id,project):undefined)??await c.request('load',project,{onProgress:progress=>{if(live)setProgress(progress);},onPreview:drawing=>{if(live)setLoadingDrawing(drawing);}});if(live){setLoadingDrawing(undefined);current.current=value;setModel(value);setSettings(value.project.settings);setError(false);setDirty(Boolean(draftToken));}})().catch(()=>{if(live)setError(true);}).finally(()=>{if(live)setWorking(false);});
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
  generating.current=true;setWorking(true);setError(false);setProgress(undefined);
  try{const value=await client.current.request('generate',settings,{language,onProgress:value=>{if(alive.current)setProgress(value);}});if(alive.current)setCandidate(value);}
  catch{if(alive.current)setError(true);}finally{generating.current=false;if(alive.current)setWorking(false);}
 };
 const apply=async()=>{
  if(!candidate||working||saving||conflict||JSON.stringify(candidate.project.settings)!==JSON.stringify(settings))return;
  setUndoStack([]);setRedoStack([]);current.current=candidate;setModel(candidate);setCandidate(undefined);setReplacing(false);unsaved.current=true;setDirty(true);
  await saveRef.current();
 };
 const naturalAction=async(action:'editNatural'|'rebuildPack'|'initializeNatural'|'recalculateNature',patch?:NaturalFeaturePatch)=>{
  if(generating.current||active.current||!client.current||!current.current||!editing||conflict||replacing)throw Error('Map is busy');
  generating.current=true;setWorking(true);setError(false);setProgress(undefined);
  try{const value=await client.current.request(action,current.current.project,{patch,language,onProgress:value=>{if(alive.current)setProgress(value);}});setUndoStack([]);setRedoStack([]);current.current=value;setModel(value);unsaved.current=true;setDirty(true);await saveRef.current();}
  catch(e){setError(true);throw e;}finally{generating.current=false;setWorking(false);}
 };
 const paint=async(longitude:number,latitude:number,points?:[number,number][])=>{
  if(generating.current||active.current||!client.current||!current.current||!editing||conflict||replacing)return;
  if(brush.tool==='line'&&!lineStart){setLineStart([longitude,latitude]);return;}
  const stroke=brush.tool==='line'?{...brush,longitude:lineStart![0],latitude:lineStart![1],end:[longitude,latitude] as [number,number]}:{...brush,longitude,latitude};
  setLineStart(undefined);generating.current=true;setWorking(true);setError(false);setProgress(undefined);
  try{const previous=current.current.project,value=await client.current.request('editHeight',previous,{...(points?{stroke:{brush,points}}:{brush:stroke}),language,onProgress:value=>{if(alive.current)setProgress(value);}});if(value.project.terrain.revision===previous.terrain.revision)return;setUndoStack(stack=>[...stack.slice(-11),previous]);setRedoStack([]);current.current=value;setModel(value);unsaved.current=true;setDirty(true);await saveRef.current();}
  catch{setError(true);}finally{generating.current=false;setWorking(false);}
 };
 const restoreHeight=async(direction:'undo'|'redo')=>{
  const stack=direction==='undo'?undoStack:redoStack,target=stack.at(-1);
  if(!target||generating.current||active.current||!client.current||!current.current||!editing||conflict||replacing)return;
  generating.current=true;setWorking(true);setError(false);setProgress(undefined);setLineStart(undefined);
  try{const previous=current.current.project,value=await client.current.request('load',target,{language,onProgress:value=>{if(alive.current)setProgress(value);}});
   if(direction==='undo'){setUndoStack(stack=>stack.slice(0,-1));setRedoStack(stack=>[...stack,previous]);}
   else{setRedoStack(stack=>stack.slice(0,-1));setUndoStack(stack=>[...stack,previous]);}
   current.current=value;setModel(value);unsaved.current=true;setDirty(true);await saveRef.current();
  }catch{setError(true);}finally{generating.current=false;setWorking(false);}
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
 return <div ref={surface} onKeyDown={e=>{if((e.target as Element).closest('dialog'))return;if(e.key==='Escape'&&!busy){e.preventDefault();if(painting){setPainting(false);setLineStart(undefined);}else if(panel){setPanel(null);}else if(editing)void close();else setFullView(false);}if(editing&&!busy&&(e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'&&!(e.target as Element).closest('input,textarea,select,[contenteditable]')){e.preventDefault();void restoreHeight(e.shiftKey?'redo':'undo');}if(e.key==='Tab'&&(editing||fullView)){const items=[...(surface.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),summary,[tabindex="0"]')??[])].filter(el=>el.getClientRects().length);const first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}}} role={editing||fullView?'dialog':undefined} aria-modal={editing||fullView?true:undefined} aria-label={text('title')} className={editing||fullView?'fixed inset-0 z-50 flex h-dvh min-w-0 flex-col bg-[var(--color-bg)] text-[var(--color-text)]':'relative flex min-w-0 flex-col'}>
  <header className="flex shrink-0 flex-wrap items-center gap-2 border-b p-2 [&_button]:min-h-11 [&_button]:rounded-lg [&_button]:border [&_button]:px-3 [&_button:disabled]:opacity-40">
   {editing?<button disabled={saving||(working&&!!model)} onClick={()=>void close()}>{text('close')}</button>:fullView&&<button onClick={()=>setFullView(false)}>{text('cancel')}</button>}
   <strong className="mr-auto min-w-0 flex-1 truncate">{map.title}</strong>
   {mapSelector&&<fieldset disabled={busy||dirty||!!conflict||replacing}>{mapSelector}</fieldset>}
   {(editing||fullView)&&model&&<details className="relative"><summary className="flex min-h-11 cursor-pointer items-center rounded-lg border px-3">{language==='zh-TW'?'時間':'Time'} · {display.month+1}{language==='zh-TW'?' 月':''}</summary><div className="absolute right-0 top-full z-40 w-48 rounded-lg border bg-[var(--color-bg)] p-3 shadow-lg"><label>{language==='zh-TW'?'月份':'Month'}<select aria-label={language==='zh-TW'?'月份':'Month'} className="min-h-11 w-full bg-transparent" value={display.month} onChange={e=>setDisplay({...display,month:Number(e.target.value)})}>{Array.from({length:12},(_,i)=><option key={i} value={i}>{i+1}{language==='zh-TW'?' 月':''}</option>)}</select></label><p className="text-xs opacity-70">{language==='zh-TW'?'切換月均氣候與河流流量；不推進歷史。':'Monthly climate and discharge; no historical simulation.'}</p></div></details>}
   {model&&<details className="relative"><summary aria-label={language==='zh-TW'?'更多操作':'More actions'} className="flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-lg border">⋯</summary><div className="absolute right-0 top-full z-40 grid w-56 gap-2 rounded-xl border bg-[var(--color-bg)] p-2 shadow-lg">
    {editing&&<><button disabled={busy||!!conflict||replacing||dirty} onClick={()=>{setPainting(false);setPanel(null);setSettings(current.current!.project.settings);setReplacing(true);setCandidate(undefined);}}>{text('replace')}</button><button disabled={busy||!!conflict||replacing||!dirty} onClick={()=>void saveRef.current().catch(()=>{})}>{text('save')}</button><button disabled={busy||!!conflict||replacing||!model.project.environmentTerrain} onClick={()=>void naturalAction('recalculateNature').catch(()=>{})}>{language==='zh-TW'?'重新計算自然環境':'Recalculate natural environment'}</button></>}
    <button disabled={busy} onClick={()=>downloadMapBlob(globalMapBlob(current.current!.project),map.title,'nexus-map.json')}>{text('export')}</button>
   </div></details>}
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
  {model?.project.environmentTerrain&&<p role="status" className="shrink-0 border-b px-3 py-1 text-xs text-amber-700 dark:text-amber-300">{language==='zh-TW'?'地形已修改；氣候、水文與生態仍為上次計算結果。請由更多操作重新計算自然環境。':'Terrain changed; climate, water and ecosystems use the last calculation. Recalculate from More actions.'}</p>}
  <div className={editing||fullView?'relative flex min-h-0 flex-1':'relative flex h-[clamp(16rem,40dvh,28rem)]'}>
   {(editing||fullView)&&model&&!replacing&&<>
    <nav aria-label={language==='zh-TW'?'地圖選單':'Map menu'} className="z-30 flex w-14 shrink-0 flex-col gap-1 border-r border-current/10 bg-[var(--color-bg)] p-1.5">
     {editing&&<button className={sidebarToolClass} aria-expanded={panel==='tools'} aria-controls="global-map-side-panel" onClick={()=>{if(panel==='tools')setPanel(null);else{setPanel('tools');setPainting(false);setLineStart(undefined);}}}><Wrench aria-hidden="true" size={18}/><span>{language==='zh-TW'?'工具':'Tools'}</span></button>}
     <button className={sidebarToolClass} aria-expanded={panel==='display'} aria-controls="global-map-side-panel" onClick={()=>{setPanel(panel==='display'?null:'display');setPainting(false);setLineStart(undefined);}}><Layers aria-hidden="true" size={18}/><span>{language==='zh-TW'?'顯示':'Display'}</span></button>
    </nav>
    {panel&&<aside id="global-map-side-panel" aria-label={language==='zh-TW'?(panel==='tools'?'工具':'顯示'):(panel==='tools'?'Tools':'Display')} className="absolute left-16 top-2 z-20 flex max-h-[calc(100%_-_4.5rem)] w-[min(18rem,calc(100%_-_4.5rem))] flex-col overflow-hidden rounded-xl bg-[var(--color-bg)] shadow-lg ring-1 ring-black/10 sm:left-[4.25rem] sm:top-3 sm:w-[min(19rem,calc(100%_-_5rem))]">
     <header className="flex shrink-0 items-center justify-between border-b border-current/10 pl-3 pr-1"><h2 className="font-semibold">{language==='zh-TW'?(panel==='tools'?'工具':'顯示'):(panel==='tools'?'Tools':'Display')}</h2><button aria-label={language==='zh-TW'?'關閉面板':'Close panel'} className="grid min-h-11 min-w-11 place-items-center rounded-lg hover:bg-current/5 focus-visible:outline-2 focus-visible:outline-blue-600" onClick={()=>setPanel(null)}><X aria-hidden="true" size={16}/></button></header>
     <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
      {panel==='display'?<GlobalMapDisplayPanel drawing={model.drawing} value={display} onChange={setDisplay} zh={language==='zh-TW'}/>:<>
       <div className="mb-3 grid grid-cols-3 gap-1 border-b border-current/10 pb-2">{mapTools.map(({key,icon:Icon,zh,en})=><button key={key} className={sidebarToolClass} aria-pressed={tool===key} onClick={()=>{setTool(key);setPainting(false);setLineStart(undefined);}}><Icon aria-hidden="true" size={18}/><span>{language==='zh-TW'?zh:en}</span></button>)}</div>
       {tool==='height'?<GlobalMapHeightTools brush={brush} onChange={value=>{setBrush(value);setLineStart(undefined);}} painting={painting} onPainting={()=>{setPainting(!painting);setLineStart(undefined);if(!painting&&window.innerWidth<640){setPanel(null);surface.current?.querySelector('canvas')?.focus();}}} disabled={busy||!!conflict} lineStarted={!!lineStart} onApply={(lon,lat)=>void paint(lon,lat)} onUndo={()=>void restoreHeight('undo')} onRedo={()=>void restoreHeight('redo')} canUndo={!!undoStack.length} canRedo={!!redoStack.length} zh={language==='zh-TW'}/>:tool==='coast'?<section className="space-y-3"><h3 className="font-semibold">{language==='zh-TW'?'海岸線':'Coastline'}</h3><p className="text-sm">{language==='zh-TW'?'海岸線由正式高度資料推導。使用自由模式抬升或降低海岸，會同步更新海陸與海岸。獨立的海岸頂點編輯工具尚未完成。':'Coasts follow authoritative heights. Free mode changes land and sea. Direct coast vertex editing is not yet available.'}</p><button disabled={busy||!!conflict} className="min-h-11 rounded border px-3" onClick={()=>{setBrush({...brush,mode:'free'});setTool('height');setPainting(true);if(window.innerWidth<640){setPanel(null);surface.current?.querySelector('canvas')?.focus();}}}>{language==='zh-TW'?'使用自由高度工具':'Use free height tools'}</button></section>:<GlobalNaturalFeatures project={model.project} drawing={model.drawing} disabled={busy||!!conflict} language={language} onAction={naturalAction} riversOnly/>}
      </>}
     </div>
    </aside>}
   </>}
   <div aria-busy={working} className="relative min-h-0 min-w-0 flex-1">
    {((replacing?candidate??model:model)?.drawing??loadingDrawing)&&<GlobalMapCanvas editingHeight={editing&&painting&&panel!=='display'&&tool==='height'&&!replacing?brush:undefined} lineStart={lineStart} paintRadius={brush.radius} display={editing||fullView?(painting&&panel!=='display'&&tool==='height'&&model?.drawing.scalarMesh?.heights?{...display,mode:'heightmap'}:display):undefined} onStroke={editing&&painting&&panel!=='display'&&tool==='height'&&brush.tool!=='line'&&!busy&&!replacing&&!conflict?(points=>void paint(points[0][0],points[0][1],points)):undefined} onPaint={editing&&painting&&panel!=='display'&&tool==='height'&&brush.tool==='line'&&!busy&&!replacing&&!conflict?((lon,lat)=>void paint(lon,lat)):undefined} drawing={(replacing?candidate??model:model)?.drawing??loadingDrawing!}/>}
    {editing&&painting&&!replacing&&<div className="absolute right-2 top-2 z-20 flex max-w-[85%] items-center gap-2 rounded-lg border bg-[var(--color-bg)]/95 p-1 text-xs"><span>{language==='zh-TW'?(brush.tool==='line'?(lineStart?'選擇終點':'選擇起點'):'拖曳繪製，放開後套用'):'Paint on the map'}</span><button disabled={busy} className="min-h-11 rounded border px-3" onClick={()=>{setPainting(false);setLineStart(undefined);}}>{language==='zh-TW'?'停止繪製':'Stop painting'}</button></div>}
    {working&&<p role="status" className={loadingDrawing&&!model?'pointer-events-none absolute right-3 top-3 z-10 rounded-lg bg-[var(--color-bg)]/95 px-3 py-2 text-sm shadow':'absolute inset-0 z-10 grid place-items-center bg-[var(--color-bg)]/80'}>{progress?`${generationStageLabel(progress,language)} · ${Math.round(progress.fraction*100)}%`:text('busy')}</p>}
    {!working&&!model&&<p className="p-4">{text('missing')}</p>}
   </div>
  </div>
  <p className="shrink-0 px-3 py-1 text-sm">{(replacing?candidate??model:model)&&`${text('measured')}：${(replacing?candidate??model:model)!.drawing.landPercent.toFixed(3)}%`}</p>
  {editing&&<p className="shrink-0 px-3 py-1 text-xs opacity-70">{text('help')}</p>}
  {!editing&&previewFooter}
  <WorldMapSyncStatus localLabel={model?(dirty?text('pending'):text('saved')):text(working?'busy':'missing')} cloudState={cloudState}/>
  {discardPrompt&&<ModalDialog aria-label={text(conflict?'discardDraft':'discard')} onDismiss={()=>setDiscardPrompt(false)} busy={saving} className="w-[min(94vw,30rem)] rounded-xl border bg-[var(--color-bg)] p-4 text-[var(--color-text)] backdrop:bg-black/40"><p>{text(conflict?'discardConfirm':'leaveCandidate')}</p><div className="mt-3 flex gap-2 [&_button]:min-h-11 [&_button]:border [&_button]:px-3"><button disabled={saving} onClick={()=>setDiscardPrompt(false)}>{text('cancel')}</button><button disabled={saving} onClick={()=>{if(conflict){setSaving(true);void repository.clearDraft(map.world_id,map.id,conflict.token).then(()=>{if(alive.current){setConflict(undefined);setDiscardPrompt(false);}}).catch(()=>setError(true)).finally(()=>{if(alive.current)setSaving(false);});}else{setCandidate(undefined);setReplacing(false);setDiscardPrompt(false);}}}>{text(conflict?'discardDraft':'discard')}</button></div></ModalDialog>}
 </div>;
}
