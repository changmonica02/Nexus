"use client";
import {useEffect,useRef,useState} from 'react';
import {usePaginationLanguage} from '../../lib/LanguageContext';
import {parsePage,totalPages} from './model';
export interface PaginationProps {page:number;total?:number;pageSize:number;hasMore?:boolean;loading?:boolean;disabled?:boolean;label?:string;onPageChange:(page:number)=>void}
/** Unknown totals retain legacy navigation; jump is enabled only with a reliable count. */
export function Pagination({page,total,pageSize,hasMore=false,loading=false,disabled=false,label,onPageChange}:PaginationProps){
 const {t}=usePaginationLanguage();const pages=total===undefined?undefined:totalPages(total,pageSize);
 const [editing,setEditing]=useState(false),[value,setValue]=useState('');const input=useRef<HTMLInputElement>(null),number=useRef<HTMLButtonElement>(null);
 useEffect(()=>{if(editing){input.current?.focus();input.current?.select();}},[editing]);
 const cancel=()=>{setEditing(false);queueMicrotask(()=>number.current?.focus());};
 const submit=()=>{const next=parsePage(value,pages??0);cancel();if(next!==null&&next!==page)onPageChange(next);};
 const button='min-h-11 rounded border border-[var(--color-border)] bg-[var(--color-panel-bg)] px-2 py-2 text-sm disabled:opacity-40 sm:px-3';
 const empty=pages===0;const shown=empty?0:page+1;
 return <nav aria-label={label??t('pagination.label')} aria-busy={loading} className="flex min-w-0 items-center justify-between gap-1 text-sm sm:gap-3">
  <button type="button" className={button} disabled={disabled||empty||page===0} onClick={()=>onPageChange(page-1)}>{t('pagination.previous')}</button>
  <div className="flex min-w-0 items-center justify-center gap-1 whitespace-nowrap">
   <span>{t('pagination.prefix')}</span>{editing?<input ref={input} aria-label={t('pagination.input')} className="w-12 rounded border bg-transparent p-1 text-center sm:w-14" type="text" inputMode="numeric" enterKeyHint="done" autoComplete="off" value={value} onChange={e=>setValue(e.target.value)} onBlur={()=>setEditing(false)} onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();cancel();}else if(e.key==='Enter'){e.preventDefault();submit();}}}/>:<button ref={number} type="button" aria-label={t('pagination.edit',{page:shown})} disabled={disabled||empty||pages===undefined} className="min-h-11 min-w-8 rounded px-1 underline decoration-dotted disabled:no-underline" onClick={()=>{setValue(String(shown));setEditing(true);}}>{shown}</button>}
   <span>{t('pagination.suffix')}</span>{pages!==undefined&&<span>{t('pagination.total',{pages})}</span>}
  </div>
  <button type="button" className={button} disabled={disabled||empty||(pages===undefined?!hasMore:page+1>=pages)} onClick={()=>onPageChange(page+1)}>{t('pagination.next')}</button>
 </nav>;
}
