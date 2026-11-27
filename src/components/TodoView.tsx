"use client";
import { budgetAlerts } from "../features/life/finance/budgetAlerts";
import { emptyLife } from "../features/life/lists";
import { listDateReminders } from "../features/life/reminderModel";
import LifeReminders from "../features/life/LifeReminders";
import HealthWorkspace from "../features/life/health/HealthWorkspace";
import {exerciseAutomationSources,shared,type HealthRecord} from "../features/life/health/model";
import {healthEvents} from "../features/life/health/summary";
import FinanceWorkspace,{type FinanceTab} from '../features/life/finance/FinanceWorkspace';
import {financeCalendarEvents} from '../features/life/finance/financeCalendar';
import type {FinanceRecord} from '../features/life/finance/model';
import CalendarMonth from "../features/life/CalendarMonth";
import {CalendarPeriod,calendarWeek,type CalendarView} from '../features/life/CalendarPeriod';
import {downloadBlobFile,safeFileName} from '../lib/fileDownload';
import type {LifeCalendarEvent} from '../features/life/calendarSources';
import {scheduleOccurrence} from '../features/life/scheduleRecurrence';
import LifeOverview from '../features/life/dashboard/LifeOverview';
import {useLifeDashboard} from '../features/life/dashboard/useLifeDashboard';
import {lifeModuleIds,lifeModules,type LifeModule} from '../features/life/dashboard/model';
import LifeLists from '../features/life/LifeLists';
import type {StorageAdapter} from '../infrastructure/storage/StorageAdapter';
import {useMemo,useRef,useState,useEffect,useCallback} from 'react';
import PageCollection,{type PageActions} from './PageCollection';
import type {Page} from '../lib/types';
import {navigateDictionary,useUnsavedDraft} from '../features/dictionary/useUnsavedDraft';
import {useLanguage} from '../lib/LanguageContext';
import {eventsByLocalDay,habitCalendarEvents,scheduleCalendarEvents,taskCalendarEvents} from '../features/life/calendarSources';
import LifeNavigation from '../features/life/LifeNavigation';
import {newScheduleEvent,ScheduleForm,SchedulePanel,scheduleLabel} from '../features/life/SchedulePanel';
import {MilestoneForm,MilestoneRow,MilestonesPanel,newMilestone} from '../features/life/Milestones';
import CalendarTaskEditor from "../features/life/CalendarTaskEditor";
import AddMenu from "../features/life/AddMenu";
import HabitCheckIn from "../features/life/HabitCheckIn";
import {newHabit} from "../features/life/habits";
import HabitsPanel,{HabitForm} from '../features/life/HabitsPanel';
import type {Habit,ScheduleEvent} from '../features/life/syncRecords';
import {addDays,calendarDaysForMonth,localDateKey,todosForDay,localDateInput} from '../lib/todoCalendar';

export type LifeViewState={tab:'overview'|LifeModule;date:number;month:number;filter:'all'|'today'|'upcoming'|'completed'|'undated'|'overdue';query:string;scroll:number;boardId?:string;calendarView?:CalendarView;financeMonth?:string;financeHide?:boolean};
export function initialLifeView():LifeViewState{const today=new Date();today.setHours(0,0,0,0);return{tab:'overview',date:today.getTime(),month:new Date(today.getFullYear(),today.getMonth(),1).getTime(),filter:'all',query:'',scroll:0};}
/** Calendar/tasks share todo Pages; custom lists use their own workspace records. */
export default function TodoView({pages,onCreate,onUpdate,onDelete,onSelectPage,onRenamePage,onDuplicatePage,state:controlled,onStateChange,storage}:PageActions&{
 pages:Page[];onCreate:(title:string,dueDate?:number)=>void|Promise<unknown>;onUpdate:(id:string,patch:Partial<Page>)=>void;onDelete:(id:string)=>void;onSelectPage:(id:string)=>void;
 storage?:StorageAdapter;state?:LifeViewState;onStateChange?:(state:LifeViewState)=>void;
}){
 const {t,language}=useLanguage();const [local,setLocal]=useState(initialLifeView),[input,setInput]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useUnsavedDraft(!!input.trim(),busy);
 const dashboard=useLifeDashboard(storage);
 const {repository}=dashboard;
 const [healthRows,setHealth]=useState<HealthRecord[]>([]);
 const [healthFocus,setHealthFocus]=useState<string>();
 const [finances,setFinances]=useState<FinanceRecord[]>([]);
 const [financeTab,setFinanceTab]=useState<FinanceTab>();
 const [financeFocus,setFinanceFocus]=useState<string>();
 const [occurrence,setOccurrence]=useState<string>();
 const [events,setEvents]=useState<ScheduleEvent[]>([]);
 const [habits,setHabits]=useState<Habit[]>([]);
 const [habitFocus,setHabitFocus]=useState<string>();
 const [eventEditor,setEventEditor]=useState<ScheduleEvent>();
 const [eventError,setEventError]=useState('');
 const [sources,setSources]=useState({tasks:true,schedule:true,milestones:true,habits:true,finance:true,health:true});
 const owner=storage?.getWorkspaceOwner?.()??null;
 const [reminderLists,setReminderLists]=useState(emptyLife);
 const [automationSourcesOwner,setAutomationSourcesOwner]=useState<string|null|undefined>(undefined);
 const [listFocus,setListFocus]=useState<string>();
 useEffect(()=>{
  if(!repository)return;
  let active=true,sequence=0;
  const load=()=>{
   const request=++sequence;
   void Promise.all([repository.readSchedule(),repository.readHabits(),repository.readFinance(),repository.readHealth(),repository.read()]).then(([rows,habits,finances,health,lists])=>{
    if(active&&request===sequence){setAutomationSourcesOwner(owner);setReminderLists(lists);setHealth(health);setEvents(rows);setHabits(habits);setFinances(finances);setEventError('');}
   }).catch(error=>{if(active&&request===sequence)setEventError(String(error.message));});
  };
  load();
  window.addEventListener('nexus-workspace-changed',load);
  window.addEventListener('nexus-workspace-refreshed',load);
  return()=>{active=false;window.removeEventListener('nexus-workspace-changed',load);window.removeEventListener('nexus-workspace-refreshed',load);};
 },[owner,repository]);
 const [quickList,setQuickList]=useState(false),[quickTask,setQuickTask]=useState(false);
 const quickTaskInput=useRef<HTMLInputElement>(null);
 const enabled=lifeModuleIds.filter(module=>!dashboard.config.hiddenModules.includes(module)&&(!['lists','schedule','milestones','habits','finance','health'].includes(module)||storage));
 const [manager,setManager]=useState<'schedule'|'milestones'|'tasks'|'habits'>();
 const [taskEditor,setTaskEditor]=useState<string>();
 const [habitEditor,setHabitEditor]=useState<Habit>();
 const original=controlled??local;
 const legacy=['schedule','milestones','tasks','habits'].includes(original.tab)?original.tab as 'schedule'|'milestones'|'tasks'|'habits':undefined;
 const stored=legacy?{...original,tab:'calendar' as const}:original.tab==='timer'?{...original,tab:'overview' as const}:original;
 useEffect(()=>{if(legacy)setManager(legacy);},[legacy]);
 const state=stored.tab==='overview'||enabled.includes(stored.tab)||stored.tab==='calendar'&&enabled.some(id=>['schedule','milestones','tasks','habits'].includes(id))?stored:{...stored,tab:'overview' as const},change=(patch:Partial<LifeViewState>)=>{const next={...state,...patch};if(onStateChange)onStateChange(next);else setLocal(next);};
 const scroller=useRef<HTMLDivElement>(null),adding=useRef(false);
 useEffect(()=>{if(scroller.current)scroller.current.scrollTop=state.scroll;},[state.scroll]);
 const [,refreshCivilDay]=useState(0);
 useEffect(()=>{
  const refresh=()=>{if(document.visibilityState==="visible")refreshCivilDay(value=>value+1);};
  document.addEventListener("visibilitychange",refresh);
  return ()=>document.removeEventListener("visibilitychange",refresh);
 },[]);
 const selected=new Date(state.date),month=new Date(state.month),today=new Date();today.setHours(0,0,0,0);
 const todos=useMemo(()=>pages.filter(p=>p.kind==='todo'&&!p.deleted_at).sort((a,b)=>(a.due_date??Infinity)-(b.due_date??Infinity)||a.id.localeCompare(b.id)),[pages]);
 const createSchedule=()=>{setOccurrence(undefined);setEventEditor(newScheduleEvent(owner,selected));};
 const createMilestone=()=>setEventEditor(newMilestone(storage?.getWorkspaceOwner?.()??null,selected));
 const openModule=(tab:LifeModule,quick=false)=>{

  navigateDictionary(()=>{
   setQuickList(tab==='lists'&&quick);
   setQuickTask(tab==='tasks'&&quick);
   if(tab==='health')setHealthFocus(quick?'new-water':undefined);
   if(tab==='finance'){setFinanceTab(quick?'transaction':undefined);setFinanceFocus(quick?'new-transaction':undefined);}
   if(tab==='schedule'&&quick)createSchedule();
   if(tab==='milestones'&&quick)createMilestone();
   if(['schedule','milestones','tasks','habits'].includes(tab)) {
    if(tab==='habits'&&quick)setHabitEditor(newHabit(owner,selected));
    else if(!quick||tab==='tasks')setManager(tab as 'schedule'|'milestones'|'tasks'|'habits');
    change({tab:'calendar',scroll:0});
   } else if(tab!=='timer')change({tab,scroll:0});
  });
 };
 useEffect(()=>{if(manager==='tasks'&&quickTask)quickTaskInput.current?.focus();},[manager,quickTask]);
 const tasksHidden=dashboard.config.hiddenModules.includes('tasks');
 const scheduleHidden=dashboard.config.hiddenModules.includes('schedule');
 const milestonesHidden=dashboard.config.hiddenModules.includes('milestones');
 const habitsHidden=dashboard.config.hiddenModules.includes('habits');
 const appointments=useMemo(()=>events.filter(event=>!event.milestone),[events]);
 const milestones=useMemo(()=>events.filter(event=>!!event.milestone),[events]);
 const healthHidden=dashboard.config.hiddenModules.includes('health');
 const health=healthRows.filter(row=>row.workspace_owner_id===owner);
 const healthSettings=health.find(row=>row.kind==='privacy')?.data;
 const visibleHealth=healthHidden?[]:shared(health,healthSettings??{});
 const financeHidden=dashboard.config.hiddenModules.includes('finance');
 const view=state.calendarView??'month';
 const dateValue=state.date,monthValue=state.month;
 const gridDays=useMemo(()=>view==="month"?calendarDaysForMonth(new Date(monthValue)):view==="week"?calendarWeek(new Date(dateValue)):[new Date(dateValue)],[view,monthValue,dateValue]);
 const calendarTodos=useMemo(()=>tasksHidden||!sources.tasks?[]:todos,[tasksHidden,sources.tasks,todos]);
 const dates=eventsByLocalDay([
  ...taskCalendarEvents(calendarTodos),
  ...(!scheduleHidden&&sources.schedule?scheduleCalendarEvents(appointments,gridDays):[]),
  ...(!milestonesHidden&&sources.milestones?scheduleCalendarEvents(milestones,gridDays):[]),
  ...(!habitsHidden&&sources.habits?habitCalendarEvents(habits,gridDays,new Date()):[]),
  ...(!healthHidden&&sources.health?healthEvents(health,gridDays,healthSettings??{}):[]),
  ...(!financeHidden&&sources.finance?financeCalendarEvents(finances,gridDays):[]),
 ]);
 const daily=todosForDay(calendarTodos,selected),todayKey=localDateKey(today),dayKey=localDateKey(selected);
 const dailySchedule=!scheduleHidden&&sources.schedule?scheduleCalendarEvents(appointments,[selected]):[];
 const dailyMilestones=!milestonesHidden&&sources.milestones?scheduleCalendarEvents(milestones,[selected]):[];
 const dailyTaskStarts=(dates.get(dayKey)??[]).filter(item=>item.source==='taskStart');
 const sectionLabel=(tab:LifeModule|'overview')=>tab==='schedule'||tab==='timer'||tab==='milestones'||tab==='habits'||tab==='finance'||tab==='health'?lifeModules[tab].label:t('life.'+tab);
 const filtered=todos.filter(p=>{
  const date=p.due_date==null?null:new Date(p.due_date);
  const match=state.filter==='all'||(state.filter==='undated'?p.due_date==null:state.filter==='overdue'?!p.completed&&p.due_date!=null&&p.due_date<today.getTime():state.filter==='completed'?!!p.completed:state.filter==='today'?!!date&&localDateKey(date)===todayKey:!p.completed&&p.due_date!=null&&p.due_date>=new Date(today.getFullYear(),today.getMonth(),today.getDate()+1).getTime());
  return match&&(p.title+' '+p.content_text).toLocaleLowerCase().includes(state.query.toLocaleLowerCase().trim());
 });
 const open=(id:string)=>navigateDictionary(()=>{change({scroll:scroller.current?.scrollTop??0});onSelectPage(id);});
 const readAutomationRuns=useCallback(()=>repository?.readAutomationRuns()??Promise.resolve([]),[repository]);
 const executeAutomation=useCallback((occurrence:import("../features/life/reminderModel").Reminder,rule:import("../features/life/reminderModel").ReminderRule)=>repository!.executeRule(occurrence,rule),[repository]);
 const reminderDays=state.tab==="overview"?Array.from({length:31},(_,offset)=>addDays(today,offset)):[];
 const reminderEvents=state.tab==="overview"?[
  ...(!scheduleHidden?scheduleCalendarEvents(appointments,reminderDays):[]),
  ...(!milestonesHidden?scheduleCalendarEvents(milestones,reminderDays):[]),
  ...(!habitsHidden?habitCalendarEvents(habits,[today],today):[]),
  ...(!financeHidden?financeCalendarEvents(finances,reminderDays):[]),
  ...(!healthHidden?healthEvents(health,reminderDays,healthSettings??{}):[]),
 ].filter(event=>!event.completed):[];
 const reminderSource={schedule:"行程",milestones:"重要日期",habits:"習慣",finance:"財務",health:"健康",tasks:"待辦",taskStart:"待辦"};
 const reminderId=(event:LifeCalendarEvent)=>JSON.stringify([event.source,event.sourceId,event.date,event.occurrence??""]);
 const listReminders=state.tab==="overview"&&!dashboard.config.hiddenModules.includes("lists")?
   listDateReminders(reminderLists,localDateInput(today),localDateInput(addDays(today,30))):[];
 const currentLists=new Set(reminderLists.life_lists.filter(list=>list.deleted_at==null).map(list=>list.id));
 const dayKeyForBudget=localDateInput(today);
 const budgets=state.tab==="overview"&&!financeHidden?budgetAlerts(finances,dayKeyForBudget):[];
 const reminderItems=[
  ...budgets.filter(row=>row.percent>=100).map(row=>({id:"budget:"+row.id,title:row.title+" · 已達預算",day:dayKeyForBudget,source:"財務",priority:2})),
  ...listReminders,
  ...reminderEvents.map(event=>({id:reminderId(event),title:event.title,day:localDateInput(new Date(event.date)),source:reminderSource[event.source],priority:1})),
  ...(!tasksHidden?todos.flatMap(task=>!task.completed&&task.due_date!=null?[{id:"task:"+task.id,title:task.title,day:localDateInput(new Date(task.due_date)),source:"待辦",priority:task.due_date<today.getTime()?2:1}]:[]):[]),
 ];
 const collection=(items:Page[],key:string)=><PageCollection pages={items} initialView="list" initialSort="due_date" initialAscending viewStorageKey={key} sortOptions={['due_date','updated_at','title','created_at']} onSelectPage={setTaskEditor} onRenamePage={onRenamePage} onDuplicatePage={onDuplicatePage} onDeletePage={onDelete} leadingControl={item=><input aria-label={t('ui.completeTask',{name:item.title})} type="checkbox" checked={!!item.completed} onChange={event=>onUpdate(item.id,{completed:event.target.checked})}/>}/>;
 const setDate=(date:Date)=>change({date:date.getTime(),month:new Date(date.getFullYear(),date.getMonth(),1).getTime(),scroll:0});
 const openEvent=(event:LifeCalendarEvent)=>{
  if(event.source==='health'){setHealthFocus(event.sourceId);change({tab:'health',scroll:0});return;}
  if(event.source==='finance'){
   const row=finances.find(item=>item.id===event.sourceId);
   if(!row)return;
   setFinanceTab(row.kind==='subscription'?'subscription':row.kind==='goal'?'goal':row.kind==='account'?'account':'asset');
   setFinanceFocus(row.id);
   change({tab:'finance',scroll:0});
   return;
  }
  if(event.source==='habits'){setHabitFocus(event.sourceId);openModule('habits');return;}
  if(event.source==='tasks'||event.source==='taskStart'){setTaskEditor(event.sourceId);return;}
  const row=events.find(item=>item.id===event.sourceId);
  if(row){setOccurrence(event.occurrence);setEventEditor(row);}
 };
 const movePeriod=(direction:number)=>{
  if(view==='month'){
   const target=new Date(month.getFullYear(),month.getMonth()+direction,1);
   const last=new Date(target.getFullYear(),target.getMonth()+1,0).getDate();
   change({month:target.getTime(),date:new Date(target.getFullYear(),target.getMonth(),Math.min(selected.getDate(),last)).getTime(),scroll:0});
  }
  else setDate(addDays(selected,direction*(view==='week'?7:1)));
 };
 const uploadFinanceFile=storage?.createAttachment?async(file:File)=>{
  if(file.size>10*1024*1024)throw Error('交易附件最多 10 MiB');
  const saved=await storage.createAttachment!({kind:'file',name:file.name,mime_type:file.type||'application/octet-stream',size_bytes:file.size});
  await storage.attachBinary(saved.id,file);
  return saved.id;
 }:undefined;
 const downloadFinanceFile=storage?async(id:string)=>{
  const file=await storage.getAttachment(id),blob=await storage.readBinary(id);
  if(!file||!blob)throw Error('附件尚未同步到此裝置');
  downloadBlobFile(safeFileName(file.name),blob);
 }:undefined;
 const add=async()=>{const title=input.trim();if(!title||adding.current)return;adding.current=true;setBusy(true);setError('');try{change({scroll:scroller.current?.scrollTop??0});await onCreate(title,state.date);setInput('');}catch(e){setError(e instanceof Error?e.message:String(e));}finally{adding.current=false;setBusy(false);}};
 const button='min-h-11 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm hover:bg-zinc-500/10';
 return <main data-life-workspace className="flex min-h-0 min-w-0 flex-1 flex-col bg-[var(--color-editor-bg)] text-[var(--color-text)]">
  <div className="life-layout">
   <LifeNavigation enabled={enabled} active={state.tab} title={t('life.sections')} label={sectionLabel} open={tab=>
    tab==='overview'?navigateDictionary(()=>{setManager(undefined);change({tab,scroll:0});}):openModule(tab)}/>
   <div ref={scroller} id="life-content" role="tabpanel" aria-label={sectionLabel(state.tab)} className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain px-3 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6 sm:pt-6 sm:pb-[max(1.5rem,env(safe-area-inset-bottom))]">
    <div className="mx-auto max-w-7xl space-y-4">
     {eventError&&<p role="alert">{eventError}</p>}
     {taskEditor&&todos.find(task=>task.id===taskEditor)&&<CalendarTaskEditor key={taskEditor} page={todos.find(task=>task.id===taskEditor)!} update={onUpdate} remove={onDelete} close={()=>setTaskEditor(undefined)} open={()=>open(taskEditor)}/>}
     {repository&&eventEditor&&(eventEditor.milestone
      ?<MilestoneForm key={eventEditor.id} initial={eventEditor} repository={repository} close={()=>setEventEditor(undefined)}/>
      :<ScheduleForm key={eventEditor.id+":"+(occurrence??"")} occurrence={occurrence} initial={eventEditor} repository={repository} close={()=>setEventEditor(undefined)}/>)}
     {state.tab==='health'&&repository?<HealthWorkspace key={healthFocus??'health'} rows={health} owner={owner} day={localDateInput(selected)} tasks={tasksHidden?[]:todos} habits={habitsHidden?[]:habits} repository={repository} taskOpen={open} focused={healthFocus}/>:state.tab==='finance'&&repository?<FinanceWorkspace key={financeFocus??'finance'} requested={financeTab} focusId={financeFocus}
      records={finances} repository={repository} owner={owner} selectedMonth={state.financeMonth} onMonthChange={financeMonth=>change({financeMonth})} hideAmounts={state.financeHide} onHideChange={financeHide=>change({financeHide})} anchor={today} upload={uploadFinanceFile} download={downloadFinanceFile}/>:state.tab==='lists'&&storage?<LifeLists key={listFocus??""} storage={storage} initialListId={listFocus} startCreating={quickList}
       relations={[
        ...(!tasksHidden?todos.map(task=>({kind:"task" as const,id:task.id,title:task.title})):[]),
        ...(!scheduleHidden?appointments.map(event=>({kind:"schedule" as const,id:event.id,title:event.title})):[]),
        ...(!milestonesHidden?milestones.map(event=>({kind:"milestone" as const,id:event.id,title:event.title})):[]),
       ]}
       openRelation={target=>{
        if(target.kind==="task"){open(target.id);return;}
        const event=events.find(row=>row.id===target.id);
        if(event){setOccurrence(undefined);setEventEditor(event);}
       }}/>:<>
     {state.tab==='overview'&&<div className="flex flex-wrap items-center gap-2"><label className="flex max-w-full items-center gap-2 text-sm">{t('life.date')}<input aria-label={t('life.date')} type="date" value={localDateInput(selected)} onChange={event=>{if(event.target.value)setDate(new Date(event.target.value+'T00:00:00'));}} className="min-h-11 min-w-0 max-w-full rounded border bg-transparent px-2"/></label><button type="button" className={button} onClick={()=>setDate(today)}>{t('todo.today')}</button></div>}
     {state.tab==='calendar'&&manager==='tasks'&&!dashboard.config.hiddenModules.includes('tasks')&&<form className="flex min-w-0 gap-2" onSubmit={event=>{event.preventDefault();void add();}}><input ref={quickTaskInput} aria-label={t('life.newTitle')} maxLength={500} disabled={busy} placeholder={t('life.newTitle')} value={input} onChange={event=>setInput(event.target.value)} className="min-h-11 min-w-0 flex-1 rounded-lg border bg-transparent px-3"/><button disabled={busy||!input.trim()} className={button}>{t('todo.add')}</button></form>}
     {error&&<p role="alert">{error}</p>}
     {state.tab==='overview'&&<LifeOverview dashboard={dashboard} todos={todos} anchor={selected} today={today}
       selectedId={state.boardId} onSelectBoard={boardId=>change({boardId})}
       health={visibleHealth} healthShared={Object.entries(healthSettings??{}).some(([key,on])=>key.startsWith('share_')&&on===true&&healthSettings?.['off_'+key.slice(6)]!==true)} finances={financeHidden?[]:finances} events={scheduleHidden?[]:appointments} milestones={milestonesHidden?[]:milestones} habits={habitsHidden?[]:habits} openSchedule={(event,occurrence)=>{setOccurrence(occurrence);setEventEditor(event);}}
       openModule={openModule} openTask={setTaskEditor} toggleTask={(id,completed)=>onUpdate(id,{completed})}/>}
     {state.tab==="overview"&&<LifeReminders key={JSON.stringify(owner)} owner={owner} day={localDateInput(today)} items={reminderItems}
      tasks={tasksHidden?[]:todos.map(task=>({id:task.id,title:task.title,completed:task.completed,due:task.due_date==null?undefined:localDateInput(new Date(task.due_date)),day:localDateInput(new Date(task.updated_at??task.created_at))}))}
      readRuns={readAutomationRuns} ruleBudgets={budgets} ruleTargets={milestonesHidden?[]:milestones}
      ruleExercises={exerciseAutomationSources(visibleHealth)} ruleHabits={habitsHidden?[]:habits.filter(habit=>habit.deleted_at==null)}
      ruleLists={dashboard.config.hiddenModules.includes("lists")?[]:reminderLists.life_lists.filter(list=>list.deleted_at==null).map(list=>({id:list.id,title:list.title, numericFields:list.fields.filter(field=>field.type==="number"&&!field.archived).map(field=>({id:field.id,name:field.name})), relationFields:list.fields.flatMap(field=>!field.archived&&field.relation?[{id:field.id,name:field.name,relation:field.relation}]:[])}))}
      ruleRecords={dashboard.config.hiddenModules.includes("lists")?[]:reminderLists.life_items.filter(item=>item.deleted_at==null&&currentLists.has(item.list_id)).map(item=>({id:item.id,listId:item.list_id,revision:item.revision,values:item.values,day:localDateInput(new Date(item.updated_at))}))}
      execute={repository&&dashboard.ready&&automationSourcesOwner===owner?executeAutomation:undefined} allowTasks={!tasksHidden} allowSchedule={!scheduleHidden} allowFinance={!financeHidden}
      relationSources={[
        ...(!tasksHidden?todos.map(task=>({kind:"task" as const,id:task.id,title:task.title})):[]),
        ...(!scheduleHidden?appointments.map(row=>({kind:"schedule" as const,id:row.id,title:row.title})):[]),
        ...(!milestonesHidden?milestones.map(row=>({kind:"milestone" as const,id:row.id,title:row.title})):[]),
      ]}
      existingSchedules={scheduleHidden?[]:appointments.filter(row=>row.id.startsWith("automation:")).map(row=>({id:row.id,title:row.title,day:new Date(row.starts_at).toISOString().slice(0,10)}))}
      synced={dashboard.config.reminders} saveSynced={repository&&dashboard.ready?reminders=>dashboard.save({...dashboard.config,reminders},dashboard.config):undefined} open={id=>{
       const list=listReminders.find(row=>row.id===id);
       if(list){setListFocus(list.listId);change({tab:"lists",scroll:0});}
       else if(id.startsWith("budget:")){setFinanceTab("budget");setFinanceFocus(id.slice(7));change({tab:"finance",scroll:0});}
       else if(id.startsWith("task:"))open(id.slice(5));
       else {const event=reminderEvents.find(row=>reminderId(row)===id);if(event)openEvent(event);}
     }}/>}
     {state.tab==='calendar'&&<>
      <div className="flex flex-wrap items-center justify-between gap-2">
       <h2 className="text-2xl font-semibold">日曆</h2>
       <div className="flex flex-wrap gap-2">
        <label className="text-sm"><input aria-label="日曆日期" type="date" className={button+' w-32 bg-transparent'} value={localDateInput(selected)} onChange={event=>{if(event.target.value)setDate(new Date(event.target.value+'T00:00:00'));}}/></label>
        <button type="button" className={button} onClick={()=>setDate(today)}>今天</button>
        <AddMenu items={[
         ...(!scheduleHidden&&repository?[{label:'新增行程',action:createSchedule}]:[]),
         ...(!milestonesHidden&&repository?[{label:'新增重要日期',action:createMilestone}]:[]),
         ...(!tasksHidden?[{label:'新增任務',action:()=>{setManager('tasks');setQuickTask(true);}}]:[]),
         ...(!habitsHidden&&repository?[{label:'新增習慣',action:()=>setHabitEditor(newHabit(owner,selected))}]:[]),
        ]}/>
        <button type="button" className={button} aria-expanded={!!manager} onClick={()=>setManager(manager?undefined:!scheduleHidden?'schedule':!tasksHidden?'tasks':!milestonesHidden?'milestones':'habits')}>管理</button>
       </div>
      </div>
      {habitEditor&&repository&&<HabitForm key={habitEditor.id} habit={habitEditor} repository={repository} close={()=>setHabitEditor(undefined)}/>}
      {manager&&<section className="life-manager space-y-3" aria-label="日曆事項管理">
       <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">跨日期管理</h3><button type="button" className={button} onClick={()=>setManager(undefined)}>關閉管理</button></div>
       <div className="flex flex-wrap gap-2" role="group" aria-label="管理類型">
        {(['schedule','milestones','tasks','habits'] as const).filter(item=>!dashboard.config.hiddenModules.includes(item)).map(item=><button type="button" key={item} className={button} aria-pressed={manager===item} onClick={()=>setManager(item)}>{sectionLabel(item)}</button>)}
       </div>
       {manager==='schedule'&&!scheduleHidden&&<SchedulePanel events={appointments} locale={language} create={createSchedule} edit={event=>{setOccurrence(undefined);setEventEditor(event);}}/>}
       {manager==='milestones'&&!milestonesHidden&&<MilestonesPanel events={milestones} anchor={selected} open={setEventEditor} create={createMilestone}/>}
       {manager==='tasks'&&!tasksHidden&&<>
        <div className="flex flex-wrap gap-2" role="group" aria-label={t('life.taskViews')}>{(['all','today','upcoming','undated','overdue','completed'] as const).map(filter=><button type="button" className={button} aria-pressed={filter===state.filter} key={filter} onClick={()=>change({filter,scroll:0})}>{filter==='undated'?'無期限':filter==='overdue'?'已逾期':t('life.filter.'+filter)}</button>)}</div>
        <input type="search" aria-label={t('life.search')} value={state.query} onChange={event=>change({query:event.target.value,scroll:0})} className={button+' w-full bg-transparent'}/>
        {collection(filtered,'nexus-life-tasks-view')}
       </>}
       {manager==='habits'&&!habitsHidden&&repository&&<HabitsPanel habits={habits} date={selected} today={today} selectDate={setDate} repository={repository} owner={owner} focusId={habitFocus} startCreating={false}/>}
      </section>}

      <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-2" aria-label="行事曆檢視">
       {(['month','week','day'] as const).map(item=><button key={item} className={button} type="button" aria-pressed={view===item}
        onClick={()=>change({calendarView:item,month:new Date(selected.getFullYear(),selected.getMonth(),1).getTime(),scroll:0})}>
        {{month:'月檢視',week:'週檢視',day:'日檢視'}[item]}</button>)}
      </div>
      <details><summary className="min-h-11 cursor-pointer text-sm">篩選來源</summary><div className="flex flex-wrap items-center gap-3" aria-label="事件來源">
       {!healthHidden&&repository&&(healthSettings?.calendar===true||healthSettings?.calendarCycle===true||healthSettings?.calendarMedication===true)&&<label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={sources.health} onChange={event=>setSources({...sources,health:event.target.checked})}/>健康事項</label>}
       {!financeHidden&&repository&&<label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={sources.finance}
        onChange={event=>setSources({...sources,finance:event.target.checked})}/>財務日期</label>}
       {!tasksHidden&&<label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={sources.tasks} onChange={event=>setSources({...sources,tasks:event.target.checked})}/>任務起訖</label>}
       {!scheduleHidden&&repository&&<><label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={sources.schedule} onChange={event=>setSources({...sources,schedule:event.target.checked})}/>行程</label>
        </>}
       {!habitsHidden&&repository&&<label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={sources.habits} onChange={event=>setSources({...sources,habits:event.target.checked})}/>習慣</label>}
       {!milestonesHidden&&repository&&<label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={sources.milestones} onChange={event=>setSources({...sources,milestones:event.target.checked})}/>重要日期</label>}
      </div></details>
      <div className="order-first flex flex-wrap items-center gap-2">
       <h2 className="text-lg font-semibold">{view==='month'?month.toLocaleDateString(language,{year:'numeric',month:'long'}):
        view==='week'?gridDays[0].toLocaleDateString(language)+' – '+gridDays.at(-1)!.toLocaleDateString(language):selected.toLocaleDateString(language)}</h2>
       <div className="flex gap-2"><button aria-label="上一期間" className={button} onClick={()=>movePeriod(-1)}>←</button><button aria-label="下一期間" className={button} onClick={()=>movePeriod(1)}>→</button></div>
      </div>
      </div>
      <div className="life-calendar-layout"><div className="min-w-0">{view==='month'
       ?<CalendarMonth days={gridDays} events={dates} selected={selected} today={today} month={month} locale={language} select={setDate}/>
       :<CalendarPeriod days={gridDays} events={dates} locale={language} open={openEvent} select={setDate}/>}</div>
      <aside className="life-day-details space-y-3" aria-label="日期詳情"><h3 className="font-semibold">{selected.toLocaleDateString(language)} · {t('life.dayItems')}</h3>{!scheduleHidden&&sources.schedule&&<h4 className="font-semibold">行程</h4>}{!scheduleHidden&&sources.schedule&&!dailySchedule.length&&<p className="text-sm opacity-65">當日沒有行程</p>}{dailySchedule.length>0&&<ul className="space-y-2">{dailySchedule.map(item=>{
       const original=events.find(row=>row.id===item.sourceId)!;
       const event=item.occurrence?scheduleOccurrence(original,item.occurrence)?.event??original:original;
       return <li key={item.sourceId+':'+(item.occurrence??'')}><button className={button+' w-full break-words text-left'} onClick={()=>openEvent(item)}>
        {item.title}<span className="ml-2 text-xs opacity-75">{scheduleLabel(event,language)}</span></button></li>;
      })}</ul>}{!milestonesHidden&&sources.milestones&&<h4 className="font-semibold">重要日期</h4>}{!milestonesHidden&&sources.milestones&&!dailyMilestones.length&&<p className="text-sm opacity-65">當日沒有重要日期</p>}{dailyMilestones.map(item=>{
       const event=milestones.find(row=>row.id===item.sourceId)!;
       return <MilestoneRow key={item.sourceId} event={event} anchor={selected} open={()=>setEventEditor(event)}/>;
      })}
      {!tasksHidden&&sources.tasks&&<><h4 className="font-semibold">任務</h4>{!daily.length&&!dailyTaskStarts.length&&<p className="text-sm opacity-65">當日沒有任務</p>}
       <ul className="divide-y divide-[var(--color-border)]">{daily.map(task=><li key={task.id} className="flex items-center gap-2">
        <label className="flex min-h-11 min-w-11 items-center justify-center"><input type="checkbox" aria-label={t('ui.completeTask',{name:task.title})} checked={!!task.completed} onChange={event=>onUpdate(task.id,{completed:event.target.checked})}/></label>
        <button type="button" className={'min-h-11 min-w-0 flex-1 break-words text-left text-sm '+(task.completed?'line-through opacity-65':'')} onClick={()=>setTaskEditor(task.id)}>{task.title}</button>
       </li>)}</ul>{dailyTaskStarts.map(item=><button key={item.sourceId} type="button" className={button+' w-full text-left'} onClick={()=>setTaskEditor(item.sourceId)}>
       開始 · {item.title}</button>)}</>}
      {!habitsHidden&&sources.habits&&<h4 className="font-semibold">習慣</h4>}
      {!habitsHidden&&sources.habits&&repository&&habits.filter(habit=>habit.started_on<=localDateInput(selected)).map(habit=><div key={habit.id} className="rounded-lg bg-zinc-500/5 p-2">
       <button type="button" className="min-h-11 w-full text-left text-sm" onClick={()=>setHabitEditor(habit)}>{habit.title}</button><HabitCheckIn habit={habit} date={selected} repository={repository}/>
      </div>)}
      {(!financeHidden&&sources.finance?financeCalendarEvents(finances,[selected]):[]).map(item=>
      <button className={button+' w-full text-left'} key={item.sourceId} onClick={()=>openEvent(item)}>{item.title}</button>)}
      {(!healthHidden&&sources.health?healthEvents(health,[selected],healthSettings??{}):[]).map(item=><button className={button+" w-full text-left"} key={item.sourceId+":"+(item.occurrence??"")} onClick={()=>openEvent(item)}>{item.title}</button>)}

      </aside></div>
     </>}

     </>}
    </div>
   </div>
  </div>
 </main>;
}
