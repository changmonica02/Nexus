"use client";
import {useState} from 'react';
import type {GlobalMapProject,NaturalFeaturePatch} from '../features/worldMap/globalMapProject';
import type {GlobalMapDrawing} from '../features/worldMap/globalMapGeometry';
type Action='editNatural'|'rebuildPack'|'initializeNatural';
export default function GlobalNaturalFeatures({project,drawing,disabled,language,onAction,riversOnly=false}:{project:GlobalMapProject;drawing:GlobalMapDrawing;disabled:boolean;language:string;riversOnly?:boolean;onAction:(action:Action,patch?:NaturalFeaturePatch)=>Promise<void>}){
 const zh=language==='zh-TW',base=project.naturalGeography,[selected,setSelected]=useState(''),[error,setError]=useState(''),[revision,setRevision]=useState(0);
 const records=base?[...base.rivers,...(riversOnly?[]:base.lakes)]:[],feature=records.find(f=>f.id===selected)??records[0];
 const act=async(action:Action,patch?:NaturalFeaturePatch)=>{setError('');try{await onAction(action,patch);setRevision(v=>v+1);}catch(e){const message=e instanceof Error?e.message:'';setError(zh?(message.includes('Lake level')?'水位必須高於湖底，且不得高於最低溢流盆緣。':message.includes('cycle')||message.includes('loops')?'河道不可形成循環水路。':'未完成，請檢查座標、湖盆界線及儲存狀態。'):'Not completed. Check geometry, basin rim, water level and save status.');}};
 return <details className="max-h-[36dvh] shrink-0 overflow-y-auto border-b px-3 text-sm"><summary className="flex min-h-11 cursor-pointer items-center">{zh?(riversOnly?'河流編輯':'自然地理：河湖與 Pack'):(riversOnly?'River editing':'Natural geography: water and Pack')}{base&&(riversOnly?` (${base.rivers.length})`:` (${base.rivers.length} / ${base.lakes.length})`)}</summary>
  {error&&<p role="alert" className="py-2 text-red-600">{error}</p>}
  {!base?<button disabled={disabled} className="min-h-11 rounded border px-3" onClick={()=>void act('initializeNatural')}>{zh?'建立自然環境資料':'Initialize natural environment'}</button>:<>
   <button disabled={disabled} className="min-h-11 rounded border px-3" onClick={()=>void act('rebuildPack')}>{zh?'更新海岸細節（切換密度）':'Update coastal detail (change density)'}</button>
   <p className="py-1 text-xs">{zh?'河湖身分與編輯資料會保留；虛線河道表示當月枯水，不會因乾旱刪除。':'Feature identities and edits persist; dashed channels indicate low monthly flow.'}</p>
   <select aria-label={zh?'選擇河流或湖泊':'Choose river or lake'} className="min-h-11 w-full border bg-[var(--color-bg)]" value={feature?.id??''} onChange={e=>setSelected(e.target.value)}>{base.rivers.map(r=><option key={r.id} value={r.id}>{zh?'河流':'River'} · {r.name}</option>)}{!riversOnly&&base.lakes.map(l=><option key={l.id} value={l.id}>{zh?'湖泊':'Lake'} · {l.name}</option>)}</select>
   {feature&&<FeatureForm key={feature.id+':'+revision+':'+project.packSettings?.detail} feature={feature} drawing={drawing} disabled={disabled} zh={zh} apply={patch=>act('editNatural',patch)}/>}
  </>}
 </details>;
}
function FeatureForm({feature,drawing,disabled,zh,apply}:{feature:NonNullable<GlobalMapProject['naturalGeography']>['rivers'][number]|NonNullable<GlobalMapProject['naturalGeography']>['lakes'][number];drawing:GlobalMapDrawing;disabled:boolean;zh:boolean;apply:(patch:NaturalFeaturePatch)=>Promise<void>}){
 const isLake='bed' in feature,[name,setName]=useState(feature.name),[notes,setNotes]=useState(feature.notes),[level,setLevel]=useState(isLake?String(feature.waterLevelM):'');
 const [geometry,setGeometry]=useState(isLake?feature.bed.map(b=>[...b.position,b.floorM].join(', ')).join('\n'):feature.geometry.map(p=>p.join(', ')).join('\n'));
 const lake=drawing.natural?.lakes.find(l=>l.id===feature.id),river=drawing.natural?.rivers.find(r=>r.id===feature.id);
 const [invalid,setInvalid]=useState(false);
 const submit=async()=>{setInvalid(false);const patch:NaturalFeaturePatch={id:feature.id,name,notes};
  const points=geometry.trim().split('\n').map(line=>line.split(',').map(x=>Number(x.trim())));
  if(!points.length||points.some(p=>p.length!==(isLake?3:2)||!p.every(Number.isFinite))){setInvalid(true);return;}
  if(isLake){patch.waterLevelM=Number(level);if(geometry!==feature.bed.map(b=>[...b.position,b.floorM].join(', ')).join('\n'))patch.bed=points;}
  else if(geometry!==feature.geometry.map(p=>p.join(', ')).join('\n'))patch.geometry=points;
  await apply(patch);
 };
 return <form className="grid gap-2 py-2" onSubmit={e=>{e.preventDefault();void submit();}}>
  <label>{zh?'名稱':'Name'}<input className="min-h-11 w-full border bg-[var(--color-bg)] px-2" value={name} maxLength={160} required onChange={e=>setName(e.target.value)}/></label>
  {isLake&&<label>{zh?'基準水位（m）':'Reference water level (m)'}<input type="number" step="0.01" required className="min-h-11 w-full border bg-[var(--color-bg)] px-2" value={level} onChange={e=>setLevel(e.target.value)}/><span className="text-xs">{zh?'溢流盆緣':'Spill rim'}: {lake?.spillM?.toFixed(2)} m</span></label>}
  <label>{zh?'詳細資料／備註':'Details / notes'}<textarea className="min-h-16 w-full border bg-[var(--color-bg)] p-2" maxLength={10000} value={notes} onChange={e=>setNotes(e.target.value)}/></label>
  <details><summary className="flex min-h-11 cursor-pointer items-center">{zh?(isLake?'湖岸／湖底範圍（Pack 格中心）':'編輯河道座標'):(isLake?'Basin and bed (Pack centers)':'Edit channel coordinates')}</summary>
   <p className="text-xs">{zh?(isLake?'每行：經度, 緯度, 湖底高程 m。位置會對齊 Pack；水面只覆蓋低於基準水位的湖底格。':'每行：經度, 緯度，依上游至下游排列。不得形成循環水路。'):(isLake?'One row: longitude, latitude, bed elevation m. Positions snap to Pack; only bed cells below reference water level are covered.':'One row: longitude, latitude, upstream to downstream. Routing must remain acyclic.')}</p>
   <textarea aria-label={zh?'自然地理座標':'Natural feature coordinates'} className="min-h-28 w-full border bg-[var(--color-bg)] p-2 font-mono text-xs" value={geometry} onChange={e=>setGeometry(e.target.value)}/>
  </details>
  <details><summary className="flex min-h-11 cursor-pointer items-center">{zh?'關聯與月別衍生資料':'Relations and monthly derived data'}</summary><p className="break-all text-xs">ID: {feature.id}</p>
   {river&&<><p>{zh?'流域面積／長度':'Catchment / length'}: {river.catchmentAreaKm2.toFixed(0)} km² / {river.lengthKm.toFixed(1)} km</p><p>{zh?'下游主河':'Downstream river'}: {'parentId' in feature?feature.parentId??'—':'—'}</p><p>{zh?'1–12 月流量 m³/s':'Jan–Dec discharge m³/s'}: {river.monthly.map(q=>q.toFixed(1)).join(' / ')}</p></>}
   {lake&&<><p>{zh?'水面面積':'Surface area'}: {lake.areaKm2.toFixed(1)} km²</p><div className="overflow-x-auto"><p className="text-xs">{zh?'月收支，單位：百萬 m³；入水包含湖面降水':'Monthly budget in million m³; inflow includes direct precipitation'}</p><table className="w-full text-right text-xs"><thead><tr>{(zh?['月','總入水','蒸發','出水','儲水變化','儲水']:['Month','Input','Evaporation','Outflow','Δ storage','Storage']).map(x=><th className="whitespace-nowrap p-1" key={x}>{x}</th>)}</tr></thead><tbody>{lake.months.map((m,i)=><tr key={i}><td>{i+1}</td>{[m.inflowM3,m.evaporationM3,m.outflowM3,m.storageChangeM3,m.storageM3].map((v,k)=><td className="p-1" key={k}>{(v/1e6).toFixed(2)}</td>)}</tr>)}</tbody></table></div></>}
  </details>
  {invalid&&<p role="alert" className="text-red-600">{zh?'請檢查每行座標與數字。':'Check coordinate rows and numbers.'}</p>}
  <button disabled={disabled} className="min-h-11 rounded border px-3" type="submit">{zh?'套用並儲存':'Apply and save'}</button>
 </form>;
}
