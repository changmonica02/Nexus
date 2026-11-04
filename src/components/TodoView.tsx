"use client";
import LifeLists from '../features/life/LifeLists';
import type {StorageAdapter} from '../infrastructure/storage/StorageAdapter';
import {useMemo,useRef,useState,useEffect} from 'react';
import PageCollection,{type PageActions} from './PageCollection';
import type {Page} from '../lib/types';
import {navigateDictionary,useUnsavedDraft} from '../features/dictionary/useUnsavedDraft';
import {useLanguage} from '../lib/LanguageContext';
import {calendarDaysForMonth,localDateKey,todosForDay,localDateInput} from '../lib/todoCalendar';

export type LifeViewState={tab:'overview'|'calendar'|'tasks'|'lists';date:number;month:number;filter:'all'|'today'|'upcoming'|'completed';query:string;scroll:number};
export function initialLifeView():LifeViewState{const today=new Date();today.setHours(0,0,0,0);return{tab:'overview',date:today.getTime(),month:new Date(today.getFullYear(),today.getMonth(),1).getTime(),filter:'all',query:'',scroll:0};}
/** Calendar/tasks share todo Pages; custom lists use their own workspace records. */
export default function TodoView({pages,onCreate,onUpdate,onDelete,onSelectPage,onRenamePage,onDuplicatePage,state:controlled,onStateChange,storage}:PageActions&{
 pages:Page[];onCreate:(title:string,dueDate?:number)=>void|Promise<unknown>;onUpdate:(id:string,patch:Partial<Page>)=>void;onDelete:(id:string)=>void;onSelectPage:(id:string)=>void;
 storage?:StorageAdapter;state?:LifeViewState;onStateChange?:(state:LifeViewState)=>void;
}){
 const {t,language}=useLanguage();const [local,setLocal]=useState(initialLifeView),[input,setInput]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useUnsavedDraft(!!input.trim(),busy);
 const state=controlled??local,change=(patch:Partial<LifeViewState>)=>{const next={...state,...patch};if(onStateChange)onStateChange(next);else setLocal(next);};
 const scroller=useRef<HTMLDivElement>(null),adding=useRef(false);
 useEffect(()=>{if(scroller.current)scroller.current.scrollTop=state.scroll;},[state.scroll]);
 const selected=new Date(state.date),month=new Date(state.month),today=new Date();today.setHours(0,0,0,0);
 const todos=useMemo(()=>pages.filter(p=>p.kind==='todo'&&!p.deleted_at).sort((a,b)=>(a.due_date??Infinity)-(b.due_date??Infinity)||a.id.localeCompare(b.id)),[pages]);
 const dates=useMemo(()=>{const map=new Map<string,Page[]>();for(const todo of todos){if(todo.due_date==null)continue;const key=localDateKey(new Date(todo.due_date));const group=map.get(key);if(group)group.push(todo);else map.set(key,[todo]);}return map;},[todos]);
 const daily=todosForDay(todos,selected),todayKey=localDateKey(today),dayKey=localDateKey(selected);
 const filtered=todos.filter(p=>{
  const date=p.due_date==null?null:new Date(p.due_date);
  const match=state.filter==='all'||(state.filter==='completed'?!!p.completed:state.filter==='today'?!!date&&localDateKey(date)===todayKey:!p.completed&&p.due_date!=null&&p.due_date>=new Date(today.getFullYear(),today.getMonth(),today.getDate()+1).getTime());
  return match&&(p.title+' '+p.content_text).toLocaleLowerCase().includes(state.query.toLocaleLowerCase().trim());
 });
 const open=(id:string)=>navigateDictionary(()=>{change({scroll:scroller.current?.scrollTop??0});onSelectPage(id);});
 const collection=(items:Page[],key:string)=><PageCollection pages={items} initialView="list" initialSort="due_date" initialAscending viewStorageKey={key} sortOptions={['due_date','updated_at','title','created_at']} onSelectPage={open} onRenamePage={onRenamePage} onDuplicatePage={onDuplicatePage} onDeletePage={onDelete} leadingControl={item=><input aria-label={t('ui.completeTask',{name:item.title})} type="checkbox" checked={!!item.completed} onChange={event=>onUpdate(item.id,{completed:event.target.checked})}/>}/>;
 const setDate=(date:Date)=>change({date:date.getTime(),month:new Date(date.getFullYear(),date.getMonth(),1).getTime(),scroll:0});
 const add=async()=>{const title=input.trim();if(!title||adding.current)return;adding.current=true;setBusy(true);setError('');try{change({scroll:scroller.current?.scrollTop??0});await onCreate(title,state.date);setInput('');}catch(e){setError(e instanceof Error?e.message:String(e));}finally{adding.current=false;setBusy(false);}};
 const button='min-h-11 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm hover:bg-zinc-500/10';
 return <main data-life-workspace className="flex min-h-0 min-w-0 flex-1 flex-col bg-[var(--color-editor-bg)] text-[var(--color-text)]">
  <header className="flex shrink-0 items-center gap-3 border-b border-[var(--color-border)] px-4 py-3"><h1 className="text-xl font-semibold">{t('life.title')}</h1></header>
  <div className="flex min-h-0 min-w-0 flex-1 flex-col md:flex-row">
   <nav role="tablist" aria-label={t('life.sections')} className="grid shrink-0 grid-cols-4 gap-1 border-b border-[var(--color-border)] p-2 md:flex md:w-40 md:flex-col md:justify-start md:border-b-0 md:border-r" onKeyDown={event=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;event.preventDefault();const tabs=Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role=tab]')),index=tabs.indexOf(event.target as HTMLButtonElement),next=tabs[(index+(['ArrowLeft','ArrowUp'].includes(event.key)?-1:1)+tabs.length)%tabs.length];next?.click();next?.focus();}}>
    {(['overview','calendar','tasks',...(storage?['lists' as const]:[])] as const).map(tab=><button role="tab" type="button" key={tab} aria-selected={state.tab===tab} aria-controls="life-content" tabIndex={state.tab===tab?0:-1} className={button+(state.tab===tab?' bg-zinc-500/10 font-semibold':'')} onClick={()=>navigateDictionary(()=>change({tab,scroll:0}))}>{t('life.'+tab)}</button>)}
   </nav>
   <div ref={scroller} id="life-content" role="tabpanel" aria-label={t('life.'+state.tab)} className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain px-3 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6 sm:pt-6 sm:pb-[max(1.5rem,env(safe-area-inset-bottom))]">
    <div className="mx-auto max-w-5xl space-y-5">
     {state.tab==='lists'&&storage?<LifeLists storage={storage}/>:<>
     <div className="flex flex-wrap items-center gap-2"><label className="flex max-w-full items-center gap-2 text-sm">{t('life.date')}<input aria-label={t('life.date')} type="date" value={localDateInput(selected)} onChange={event=>{if(event.target.value)setDate(new Date(event.target.value+'T00:00:00'));}} className="min-h-11 min-w-0 max-w-full rounded border bg-transparent px-2"/></label><button type="button" className={button} onClick={()=>setDate(today)}>{t('todo.today')}</button></div>
     <form className="flex min-w-0 gap-2" onSubmit={event=>{event.preventDefault();void add();}}><input aria-label={t('life.newTitle')} maxLength={500} disabled={busy} placeholder={t('life.newTitle')} value={input} onChange={event=>setInput(event.target.value)} className="min-h-11 min-w-0 flex-1 rounded-lg border bg-transparent px-3"/><button disabled={busy||!input.trim()} className={button}>{t('todo.add')}</button></form>
     {error&&<p role="alert">{error}</p>}
     {state.tab==='overview'&&<>
      <h2 className="text-lg font-semibold">{selected.toLocaleDateString(language,{year:'numeric',month:'long',day:'numeric',weekday:'long'})}</h2>
      <div className="grid grid-cols-2 gap-3"><button className={button+' text-left'} onClick={()=>change({tab:'tasks',filter:dayKey===todayKey?'today':'all',scroll:0})}>{t('life.pendingCount',{n:daily.filter(p=>!p.completed).length})}</button><button className={button+' text-left'} onClick={()=>change({tab:'calendar',scroll:0})}>{t('life.scheduledCount',{n:daily.length})}</button></div>
      <p className="text-xs opacity-60">{t('life.scheduleHelp')}</p><h3 className="font-semibold">{t('life.dayItems')}</h3>{collection(daily,'nexus-life-overview-view')}<button className={button} onClick={()=>change({tab:'calendar',scroll:0})}>{t('life.openCalendar')}</button>
     </>}
     {state.tab==='calendar'&&<>
      <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-semibold">{month.toLocaleDateString(language,{year:'numeric',month:'long'})}</h2><div className="flex gap-2"><button aria-label={t('home.previousMonth')} className={button} onClick={()=>change({month:new Date(month.getFullYear(),month.getMonth()-1,1).getTime(),scroll:0})}>←</button><button aria-label={t('home.nextMonth')} className={button} onClick={()=>change({month:new Date(month.getFullYear(),month.getMonth()+1,1).getTime(),scroll:0})}>→</button></div></div>
      <div className="overflow-hidden rounded-xl border border-[var(--color-border)]"><div className="grid grid-cols-7 bg-[var(--color-sidebar-bg)]">{Array.from({length:7},(_,i)=><span key={i} className="py-2 text-center text-xs">{new Intl.DateTimeFormat(language,{weekday:'narrow'}).format(new Date(2026,10,1+i))}</span>)}</div><div className="grid grid-cols-7">{calendarDaysForMonth(month).map(date=>{
       const key=localDateKey(date),items=dates.get(key)??[];return <button type="button" key={key} aria-label={date.toLocaleDateString(language)+t('life.itemsCount',{n:items.length})} aria-pressed={key===dayKey} aria-current={key===todayKey?'date':undefined} onClick={()=>setDate(date)} className={'min-h-20 min-w-0 border-t border-[var(--color-border)] p-1 text-left text-xs sm:min-h-24 '+(date.getMonth()!==month.getMonth()?'opacity-40 ':'')+(key===dayKey?'ring-2 ring-inset ring-blue-500 ':'')+(key===todayKey?'bg-blue-500/10':'')}><span className="block">{date.getDate()}</span>{items.slice(0,3).map(item=><span key={item.id} className={'mt-1 block truncate rounded bg-zinc-500/10 px-1 text-[10px] '+(item.completed?'line-through opacity-60':'')}>{item.title}</span>)}{items.length>3&&<span className="block truncate text-[10px]">＋{items.length-3} {t('life.more')}</span>}</button>;
      })}</div></div><h3 className="font-semibold">{selected.toLocaleDateString(language)} · {t('life.dayItems')}</h3>{collection(daily,'nexus-calendar-items-view')}
     </>}
     {state.tab==='tasks'&&<><div className="flex flex-wrap gap-2" role="group" aria-label={t('life.taskViews')}>{(['all','today','upcoming','completed'] as const).map(filter=><button className={button} aria-pressed={filter===state.filter} key={filter} onClick={()=>change({filter,scroll:0})}>{t('life.filter.'+filter)}</button>)}</div><input type="search" aria-label={t('life.search')} value={state.query} onChange={event=>change({query:event.target.value,scroll:0})} className="min-h-11 w-full rounded border bg-transparent px-3"/>{collection(filtered,'nexus-life-tasks-view')}</>}
     </>}
    </div>
   </div>
  </div>
 </main>;
}
