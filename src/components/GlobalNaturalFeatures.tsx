"use client";
import {useState} from 'react';
import type {GlobalMapProject,NaturalFeaturePatch} from '../features/worldMap/globalMapProject';
import type {GlobalMapDrawing} from '../features/worldMap/globalMapGeometry';
type Action='editNatural'|'rebuildPack'|'initializeNatural'|'regenerateRivers';
export default function GlobalNaturalFeatures({project,drawing,disabled,language,onAction,riversOnly=false,selectedId,onSelect}:{project:GlobalMapProject;drawing:GlobalMapDrawing;disabled:boolean;language:string;riversOnly?:boolean;selectedId?:string;onSelect?:(id:string)=>void;onAction:(action:Action,patch?:NaturalFeaturePatch)=>Promise<void>}){
 const zh=language==='zh-TW',base=project.naturalGeography,[selected,setSelected]=useState(''),[error,setError]=useState(''),[revision,setRevision]=useState(0);
 const records=base?[...base.rivers,...(riversOnly?[]:base.lakes)]:[],feature=records.find(f=>f.id===(selectedId??selected))??records[0];
 const act=async(action:Action,patch?:NaturalFeaturePatch)=>{setError('');try{await onAction(action,patch);setRevision(v=>v+1);}catch(e){const message=e instanceof Error?e.message:'';setError(zh?(message.includes('Lake level')?'水位必須高於湖底，且不得高於最低溢流盆緣。':message.includes('cycle')||message.includes('loops')?'河道不可形成循環水路。':'未完成，請檢查座標、湖盆界線及儲存狀態。'):'Not completed. Check geometry, basin rim, water level and save status.');}};
 return <section className="shrink-0 px-1 text-sm"><h3 className="flex min-h-11 items-center font-semibold">{zh?(riversOnly?'河流編輯':'自然地理：河湖與 Pack'):(riversOnly?'River editing':'Natural geography: water and Pack')}{base&&(riversOnly?` (${base.rivers.length})`:` (${base.rivers.length} / ${base.lakes.length})`)}</h3>
  {error&&<p role="alert" className="py-2 text-red-600">{error}</p>}
  {!base?<button disabled={disabled} className="min-h-11 rounded border px-3" onClick={()=>void act('initializeNatural')}>{zh?'建立自然環境資料':'Initialize natural environment'}</button>:<>

   {!riversOnly&&<button disabled={disabled} className="min-h-11 rounded border px-3" onClick={()=>void act('rebuildPack')}>{zh?'更新海岸細節（切換密度）':'Update coastal detail (change density)'}</button>}
   <p className="py-1 text-xs">{zh?'點選河流後拖曳既有控制點調整河道，套用前可取消。灰色端點與河湖相連，無法移動。':'Select a river and drag its existing points. Connected gray endpoints are locked. Changes can be cancelled before applying.'}</p>
   <select aria-label={zh?'選擇河流或湖泊':'Choose river or lake'} className="min-h-11 w-full border bg-[var(--color-bg)]" value={feature?.id??''} onChange={e=>{setSelected(e.target.value);onSelect?.(e.target.value);}}>{base.rivers.map(r=><option key={r.id} value={r.id}>{zh?'河流':'River'} · {r.name}</option>)}{!riversOnly&&base.lakes.map(l=><option key={l.id} value={l.id}>{zh?'湖泊':'Lake'} · {l.name}</option>)}</select>
   {feature&&<FeatureForm key={feature.id+':'+revision+':'+project.packSettings?.detail+':'+JSON.stringify('geometry' in feature?feature.geometry:feature.bed)} feature={feature} drawing={drawing} disabled={disabled} zh={zh} apply={patch=>act('editNatural',patch)}/>}
  </>}
  {base&&<div className="mt-4 border-t pt-3"><button disabled={disabled} className="min-h-11 rounded border px-3" onClick={()=>void act('regenerateRivers')}>{zh?'重新生成河網':'Regenerate river network'}</button><p className="py-1 text-xs">{zh?'重新生成會取代現有河道與名稱。':'Regeneration replaces existing rivers and names.'}</p></div>}
 </section>;
}
function FeatureForm({feature,drawing,disabled,zh,apply}:{feature:NonNullable<GlobalMapProject['naturalGeography']>['rivers'][number]|NonNullable<GlobalMapProject['naturalGeography']>['lakes'][number];drawing:GlobalMapDrawing;disabled:boolean;zh:boolean;apply:(patch:NaturalFeaturePatch)=>Promise<void>}){
 const isLake='bed' in feature,[name,setName]=useState(feature.name),[notes,setNotes]=useState(feature.notes),[level,setLevel]=useState(isLake?String(feature.waterLevelM):'');
 const [geometry,setGeometry]=useState(isLake?feature.bed.map(b=>[...b.position,b.floorM].join(', ')).join('\n'):'');
 const lake=drawing.natural?.lakes.find(l=>l.id===feature.id);
 const [invalid,setInvalid]=useState(false);
 const submit=async()=>{setInvalid(false);const patch:NaturalFeaturePatch={id:feature.id,name,notes};
  if(isLake){
  const points=geometry.trim().split('\n').map(line=>line.split(',').map(x=>Number(x.trim())));
  if(!points.length||points.some(p=>p.length!==3||!p.every(Number.isFinite))){setInvalid(true);return;}
  patch.waterLevelM=Number(level);if(geometry!==feature.bed.map(b=>[...b.position,b.floorM].join(', ')).join('\n'))patch.bed=points;
  }
  await apply(patch);
 };
 return <form className="grid gap-2 py-2" onSubmit={e=>{e.preventDefault();void submit();}}>
  <label>{zh?'名稱':'Name'}<input className="min-h-11 w-full border bg-[var(--color-bg)] px-2" value={name} maxLength={160} required onChange={e=>setName(e.target.value)}/></label>
  {isLake&&<label>{zh?'基準水位（m）':'Reference water level (m)'}<input type="number" step="0.01" required className="min-h-11 w-full border bg-[var(--color-bg)] px-2" value={level} onChange={e=>setLevel(e.target.value)}/><span className="text-xs">{zh?'溢流盆緣':'Spill rim'}: {lake?.spillM?.toFixed(2)} m</span></label>}
  <label>{zh?'詳細資料／備註':'Details / notes'}<textarea className="min-h-16 w-full border bg-[var(--color-bg)] p-2" maxLength={10000} value={notes} onChange={e=>setNotes(e.target.value)}/></label>
  {isLake&&<details><summary className="flex min-h-11 cursor-pointer items-center">{zh?'湖岸／湖底範圍（Pack 格中心）':'Basin and bed (Pack centers)'}</summary>
   <p className="text-xs">{zh?'每行：經度, 緯度, 湖底高程 m。位置會對齊 Pack；水面只覆蓋低於基準水位的湖底格。':'One row: longitude, latitude, bed elevation m. Positions snap to Pack; only bed cells below reference water level are covered.'}</p>
   <textarea aria-label={zh?'自然地理座標':'Natural feature coordinates'} className="min-h-28 w-full border bg-[var(--color-bg)] p-2 font-mono text-xs" value={geometry} onChange={e=>setGeometry(e.target.value)}/>
  </details>}
  {invalid&&<p role="alert" className="text-red-600">{zh?'請檢查每行座標與數字。':'Check coordinate rows and numbers.'}</p>}
  <button disabled={disabled} className="min-h-11 rounded border px-3" type="submit">{zh?'套用並儲存':'Apply and save'}</button>
 </form>;
}
