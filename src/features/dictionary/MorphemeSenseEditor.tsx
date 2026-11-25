"use client";
import {semanticDomains} from './semanticDomains';
import type {MorphemeSenseFields,MorphemeVariant} from './morphemeContract';
import {usePaginationLanguage} from '../../lib/LanguageContext';
import AutoTextarea from './AutoTextarea';
import FeatureIcon from '../../components/FeatureIcon';
const control='w-full min-w-0 min-h-11 rounded border border-[var(--color-border)] bg-transparent p-2 text-sm';
const button='min-h-11 min-w-11 rounded px-2 text-sm hover:bg-zinc-500/10 disabled:opacity-40';
type History={id:string;body:unknown;data_source?:unknown};
export default function MorphemeSenseEditor({sense,histories,onChange,onVariants,onHistory,onAddHistory,onRemoveHistory,onRemove,children}:{sense:{id:string;gloss_zh_tw:string}&MorphemeSenseFields;histories:History[];onChange:(patch:Record<string,unknown>)=>void;onVariants:(change:(rows:MorphemeVariant[])=>MorphemeVariant[])=>void;onHistory:(id:string,patch:Record<string,unknown>)=>void;onAddHistory:()=>void;onRemoveHistory:(id:string)=>void;onRemove:()=>void;children?:React.ReactNode}){
 const {language}=usePaginationLanguage(),en=language==='en',label=(zh:string,english:string)=>en?english:zh;
 const variants=sense.variants??[],domain=semanticDomains.find(d=>d.code===sense.semantic_domain);
 const update=(id:string,patch:Partial<MorphemeVariant>)=>onVariants(rows=>rows.map(v=>v.id===id?{...v,...patch}:v));
 const move=(id:string,offset:number)=>onVariants(current=>{const rows=[...current],index=rows.findIndex(r=>r.id===id),target=index+offset;if(index<0||target<0||target>=rows.length)return current;[rows[index],rows[target]]=[rows[target],rows[index]];return rows;});
 const append=()=>{const value={id:crypto.randomUUID(),form:'',condition:''};onVariants(rows=>[...rows,value]);};
 return <section data-morpheme-sense={sense.id} className="min-w-0 space-y-3 rounded-lg bg-[var(--color-panel-bg)] p-3">
  <div className="flex min-w-0 items-end gap-2"><div className="grid min-w-0 flex-1 grid-cols-2 gap-2">
   <label className="min-w-0 text-sm">{label('大分類','Semantic domain')}<select aria-label={label('大分類','Semantic domain')} className={control} value={sense.semantic_domain??''} onChange={e=>onChange({semantic_domain:e.target.value||null,semantic_subdomain:null})}><option value="">{label('未分類','Unclassified')}</option>{semanticDomains.map(d=><option key={d.code} value={d.code}>{en?d.en:d.zh}</option>)}</select></label>
   <label className="min-w-0 text-sm">{label('小分類','Subdomain')}<select aria-label={label('小分類','Subdomain')} className={control} disabled={!domain} value={sense.semantic_subdomain??''} onChange={e=>onChange({semantic_subdomain:e.target.value||null})}><option value="">{label('未分類','Unclassified')}</option>{domain?.children.map(c=><option key={c[0]} value={c[0]}>{en?c[2]:c[1]}</option>)}</select></label>
  </div><button type="button" className={button} aria-label={label('刪除義項','Delete sense')} onClick={onRemove}><FeatureIcon feature="delete" size={16}/></button></div>
  <div className="space-y-2">{variants.map((v,i)=><div key={v.id} data-morpheme-variant={v.id} className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_44px] gap-1">
   <label className="min-w-0 text-sm">{label('變體字形','Variant')}<input aria-label={label('變體字形','Variant')} className={control} value={v.form} onChange={e=>update(v.id,{form:e.target.value})}/></label>
   <label className="min-w-0 text-sm">{label('出現條件','Condition')}<input aria-label={label('出現條件','Condition')} className={control} value={v.condition} onChange={e=>update(v.id,{condition:e.target.value})}/></label>
   <button type="button" className={button+' self-end'} aria-label={label('刪除變體','Delete variant')} onClick={()=>onVariants(rows=>rows.filter(r=>r.id!==v.id))}><FeatureIcon feature="delete" size={16}/></button>
   {variants.length>1&&<div className="col-span-3 flex justify-end"><button type="button" className={button} disabled={i===0} aria-label={label('上移變體','Move variant up')} onClick={()=>move(v.id,-1)}>↑</button><button type="button" className={button} disabled={i===variants.length-1} aria-label={label('下移變體','Move variant down')} onClick={()=>move(v.id,1)}>↓</button></div>}
  </div>)}<button type="button" className={button} onClick={append}>{label('＋新增變體','＋ Add variant')}</button></div>
  <label className="block text-sm">{label('概述','Overview')}<AutoTextarea aria-label={label('概述','Overview')} className={control} value={sense.gloss_zh_tw} onChange={e=>onChange({gloss_zh_tw:e.target.value})}/></label>
  {histories.map(h=><div key={h.id} className="flex min-w-0 items-start gap-1"><div className="min-w-0 flex-1 space-y-2"><label className="block text-sm">{label('歷史詞源','Historical etymology')}<AutoTextarea aria-label={label('歷史詞源','Historical etymology')} className={control} value={String(h.body??'')} onChange={e=>onHistory(h.id,{body:e.target.value})}/></label><label className="block text-sm">{label('資料來源','Data source')}<AutoTextarea aria-label={label('資料來源','Data source')} className={control} value={String(h.data_source??'')} onChange={e=>onHistory(h.id,{data_source:e.target.value})}/></label></div><button type="button" className={button} aria-label={label('刪除歷史詞源','Delete historical etymology')} onClick={()=>onRemoveHistory(h.id)}><FeatureIcon feature="delete" size={16}/></button></div>)}
  <button type="button" className={button} onClick={onAddHistory}>{label('＋新增歷史詞源','＋ Add historical etymology')}</button>
  {children}
 </section>;
}
