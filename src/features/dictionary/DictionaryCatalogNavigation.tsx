"use client";
import {useEffect,useRef,useState} from 'react';
import {Search,SlidersHorizontal} from 'lucide-react';
import {semanticDomains} from './semanticDomains';
import {morphemeKinds,type CatalogFilter} from './catalog';
import {usePaginationLanguage} from '../../lib/LanguageContext';
const button='min-h-11 shrink-0 rounded border border-[var(--color-border)] px-3 py-2 text-sm disabled:opacity-40';
export default function DictionaryCatalogNavigation({filter,onChange}:{filter:CatalogFilter;onChange:(next:CatalogFilter)=>void}){
 const {language}=usePaginationLanguage(),en=language==='en',text=(zh:string,english:string)=>en?english:zh;
 const [input,setInput]=useState(filter.query),[expanded,setExpanded]=useState(false);
 useEffect(()=>setInput(filter.query),[filter.query]);
 const composing=useRef(false);
 const selected=semanticDomains.find(d=>d.code===filter.domain),update=(patch:Partial<CatalogFilter>)=>{if(!composing.current)onChange({...filter,query:input.trim(),...patch});};
 return <section data-dictionary-navigation className="min-w-0 space-y-2">
  <div role="tablist" aria-label={text('詞條分類','Entry types')} className="grid grid-cols-3 gap-1" onKeyDown={event=>{const scopes=['all','word','morpheme'] as const,current=scopes.indexOf(filter.scope);const index=event.key==='ArrowRight'?(current+1)%3:event.key==='ArrowLeft'?(current+2)%3:event.key==='Home'?0:event.key==='End'?2:-1;if(index<0)return;event.preventDefault();update({scope:scopes[index],kinds:[...morphemeKinds],domain:null,subdomain:null});event.currentTarget.querySelectorAll('button')[index]?.focus();}}>{(['all','word','morpheme'] as const).map(scope=><button key={scope} role="tab" tabIndex={filter.scope===scope?0:-1} aria-selected={filter.scope===scope} className={button+(filter.scope===scope?' bg-[var(--color-panel-bg)] font-semibold':' opacity-65')} onClick={()=>update({scope,kinds:[...morphemeKinds],domain:null,subdomain:null})}>{scope==='all'?text('全部','All'):scope==='word'?text('單字','Words'):text('構詞','Morphemes')}</button>)}</div>
  <form className="flex min-w-0 gap-1" onCompositionStart={()=>{composing.current=true;}} onCompositionEnd={()=>{composing.current=false;}} onSubmit={e=>{e.preventDefault();if(composing.current)return;update({query:String(new FormData(e.currentTarget).get('query')??input).trim()});}}>
   <input name="query" aria-label={filter.scope==='morpheme'?text('搜尋構詞或變體','Search morphemes or variants'):text('搜尋單字或構詞','Search words or morphemes')} placeholder={filter.scope==='morpheme'?text('搜尋構詞或變體……','Search morphemes or variants…'):text('搜尋單字或構詞……','Search words or morphemes…')} maxLength={120} className="min-h-11 min-w-0 flex-1 rounded border border-[var(--color-border)] bg-transparent px-3" value={input} onChange={e=>setInput(e.target.value)}/>
   {filter.scope==='morpheme'&&<button type="button" className={button} aria-label={text('篩選構詞分類','Filter morpheme types')} aria-expanded={expanded} onClick={()=>setExpanded(v=>!v)}><SlidersHorizontal size={18}/></button>}
   <button type="submit" className={button} aria-label={text('搜尋','Search')}><Search size={18}/></button>
  </form>
  {filter.scope==='morpheme'&&expanded&&<fieldset className="flex min-w-0 flex-wrap gap-3 text-sm"><legend className="sr-only">{text('構詞分類','Morpheme types')}</legend>{morphemeKinds.map((kind,i)=><label key={kind} className="flex min-h-11 items-center gap-1"><input type="checkbox" checked={filter.kinds.includes(kind)} onChange={e=>update({kinds:e.target.checked?[...filter.kinds,kind]:filter.kinds.filter(k=>k!==kind)})}/>{en?['Prefix','Root','Suffix'][i]:['字首','字根','字尾'][i]}</label>)}</fieldset>}
  <div role="group" aria-label={text('語意大分類','Semantic domains')} className="flex min-w-0 gap-1 overflow-x-auto pb-1"><button className={button+(!selected?' font-semibold bg-[var(--color-panel-bg)]':'')} aria-pressed={!selected} onClick={()=>update({domain:null,subdomain:null})}>{text('總覽','Overview')}</button>{semanticDomains.map(d=><button key={d.code} className={button+(selected?.code===d.code?' font-semibold bg-[var(--color-panel-bg)]':'')} aria-pressed={selected?.code===d.code} onClick={()=>update({domain:d.code,subdomain:null})}>{en?d.en:d.zh}</button>)}</div>
  {selected&&<div role="group" aria-label={text('語意小分類','Semantic subdomains')} className="flex min-w-0 flex-wrap gap-1"><button className={button} aria-pressed={!filter.subdomain} onClick={()=>update({subdomain:null})}>{text('全部','All')}</button>{selected.children.map(c=><button key={c[0]} className={button+(filter.subdomain===c[0]?' font-semibold':'')} aria-pressed={filter.subdomain===c[0]} onClick={()=>update({subdomain:c[0]})}>{en?c[2]:c[1]}</button>)}</div>}
 </section>;
}
