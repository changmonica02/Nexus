"use client";
import {useState} from 'react';
import type {WorldEntity,WorldMapRecord,WorldEntityType} from '../lib/types';
import {useLanguage} from '../lib/LanguageContext';
export type HumanMapCategory='country'|'administrative_area'|'culture'|'religion'|'routes'|'landmarks';
export const humanMapCategories:HumanMapCategory[]=['country','administrative_area','culture','religion','routes','landmarks'];
export function HumanMapCategories({onSelect,disabled}:{onSelect:(category:HumanMapCategory)=>void;disabled:boolean}){
 const {t}=useLanguage();
 const button=(category:HumanMapCategory)=><button data-map-category={category} key={category} disabled={disabled} onClick={()=>onSelect(category)}>{t('worldWorkspace.category.'+category)}</button>;
 return <div data-map-category-grid className="space-y-2"><div className="grid grid-cols-2 gap-2">{humanMapCategories.slice(0,2).map(button)}</div><div className="grid grid-cols-3 gap-2">{humanMapCategories.slice(2,5).map(button)}</div><div className="grid grid-cols-3 gap-2"><div className="col-start-2 min-w-0">{button('landmarks')}</div></div></div>;
}
export function MapEntityList({entities,map,category,selected,onSelect,onLocate,disabled}:{entities:WorldEntity[];map:WorldMapRecord;category:HumanMapCategory;selected:string|null;onSelect:(entity:WorldEntity)=>void;onLocate:(entity:WorldEntity)=>void;disabled:boolean}){
 const {t}=useLanguage();const [query,setQuery]=useState(''),[kind,setKind]=useState('all'),[placed,setPlaced]=useState('all'),[page,setPage]=useState(0);
 const types:WorldEntityType[]=category==='landmarks'?['settlement','site']:category==='routes'?[]:[category];
 const placements=new Map(map.placements?.filter(p=>p.deletedAt===null).map(p=>[p.entityId,p]));
 const hasPlacement=(entity:WorldEntity)=>placements.has(entity.entityId);
 const rows=entities.filter(e=>types.includes(e.type)&&(kind==='all'||e.type===kind)&&(placed==='all'||hasPlacement(e)===(placed==='placed'))&&[e.name,...e.aliases].some(n=>n.toLocaleLowerCase().includes(query.toLocaleLowerCase())));
 const current=Math.min(page,Math.max(0,Math.ceil(rows.length/25)-1));
 return <section className="min-w-0 space-y-2"><label className="block">{t('worldWorkspace.search')}<input type="search" className="min-h-11 w-full min-w-0 rounded border bg-transparent px-2" value={query} onChange={e=>{setQuery(e.target.value);setPage(0);}}/></label>
 {category==='landmarks'&&<label className="block">{t('worldWorkspace.kind')}<select className="min-h-11 w-full rounded border bg-[var(--color-bg)]" value={kind} onChange={e=>{setKind(e.target.value);setPage(0);}}><option value="all">{t('worldHome.all')}</option>{types.map(type=><option key={type} value={type}>{t('worldRegion.type.'+type)}</option>)}</select></label>}
 <label className="block">{t('worldWorkspace.placement')}<select className="min-h-11 w-full rounded border bg-[var(--color-bg)]" value={placed} onChange={e=>{setPlaced(e.target.value);setPage(0);}}><option value="all">{t('worldHome.all')}</option><option value="placed">{t('worldEntity.placed')}</option><option value="unplaced">{t('worldEntity.unplaced')}</option></select></label>
 {!rows.length&&<p role="status" className="py-2 opacity-65">{t('worldEntity.empty')}</p>}
 <ul aria-label={["culture","religion"].includes(category)?t("worldDistribution.legend"):undefined} data-map-entity-list className="space-y-2">{rows.slice(current*25,(current+1)*25).map(entity=><li key={entity.entityId} className="min-w-0 rounded border p-2" data-selected={entity.entityId===selected}><button className="w-full min-w-0 break-words text-left font-medium" aria-pressed={entity.entityId===selected} disabled={disabled} onClick={()=>onSelect(entity)}>{["culture","religion"].includes(entity.type)&&<span aria-hidden="true" className="mr-1 inline-block h-3 w-3 rounded-sm border" style={{background:placements.get(entity.entityId)?.distribution?.color??["#527fc4","#d08040","#49996b","#ac60b5","#c25065","#4c9fa8"][Array.from(entity.entityId).reduce((h,c)=>(h*31+c.charCodeAt(0))>>>0,0)%6],opacity:placements.get(entity.entityId)?.distribution?.opacity??.4}}/>}{entity.name}</button><p className="break-words text-xs opacity-65">{t('worldRegion.type.'+entity.type)} · {t(hasPlacement(entity)?'worldEntity.placed':'worldEntity.unplaced')}</p><button disabled={disabled||!hasPlacement(entity)} onClick={()=>onLocate(entity)}>{t('worldHome.locate')}</button></li>)}</ul>
 {rows.length>25&&<nav className="flex items-center justify-between"><button disabled={disabled||current===0} aria-label={t('worldWorkspace.previous')} onClick={()=>setPage(current-1)}>←</button><span>{current+1} / {Math.ceil(rows.length/25)}</span><button disabled={disabled||(current+1)*25>=rows.length} aria-label={t('worldWorkspace.next')} onClick={()=>setPage(current+1)}>→</button></nav>}
 </section>;
}
