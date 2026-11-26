"use client";
import { budgetAlerts } from "../features/life/finance/budgetAlerts";
import { emptyLife } from "../features/life/lists";
import { listDateReminders } from "../features/life/reminderModel";
import LifeReminders from "../features/life/LifeReminders";
import HealthWorkspace,{GoalList} from "../features/life/health/HealthWorkspace";
import {exerciseAutomationSources,shared,type HealthRecord} from "../features/life/health/model";
import {healthEvents} from "../features/life/health/summary";
import FinanceWorkspace,{type FinanceTab} from '../features/life/finance/FinanceWorkspace';
import {financeCalendarEvents} from '../features/life/finance/financeCalendar';
import type {FinanceRecord} from '../features/life/finance/model';
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
import LifeTimer,{readTimer,timerKey} from '../features/life/LifeTimer';
import {newScheduleEvent,ScheduleForm,SchedulePanel,scheduleLabel} from '../features/life/SchedulePanel';
import {MilestoneForm,MilestoneRow,MilestonesPanel,newMilestone} from '../features/life/Milestones';
import HabitsPanel from '../features/life/HabitsPanel';
import type {Habit,ScheduleEvent,TimerResult} from '../features/life/syncRecords';
import {addDays,calendarDaysForMonth,localDateKey,todosForDay,localDateInput} from '../lib/todoCalendar';

export type LifeViewState={tab:'overview'|LifeModule;date:number;month:number;filter:'all'|'today'|'upcoming'|'completed';query:string;scroll:number;boardId?:string;calendarView?:CalendarView};
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
 const [quickHabit,setQuickHabit]=useState(false);
 const [eventEditor,setEventEditor]=useState<ScheduleEvent>();
 const [eventError,setEventError]=useState('');
 const [sources,setSources]=useState({tasks:true,schedule:true,milestones:true,habits:true,finance:true,health:true});
 const owner=storage?.getWorkspaceOwner?.()??null;
 const [timer,setTimer]=useState(()=>readTimer(owner));
 const [history,setHistory]=useState<TimerResult[]>([]);
 const [studySessions,setStudySessions]=useState<Awaited<ReturnType<NonNullable<typeof repository>['readTimerStudySessions']>>>([]);
 useEffect(()=>{
  const sync=(event:StorageEvent)=>{if(event.key===timerKey(owner))setTimer(readTimer(owner));};
  window.addEventListener('storage',sync);
  return()=>window.removeEventListener('storage',sync);
 },[owner]);
 const changeTimer=(next:typeof timer)=>{
  setTimer(next);
  try{localStorage.setItem(timerKey(owner),JSON.stringify(next));}catch{}
 };
 const [reminderLists,setReminderLists]=useState(emptyLife);
 const [listFocus,setListFocus]=useState<string>();
 useEffect(()=>{
  if(!repository)return;
  let active=true,sequence=0;
  const load=()=>{
   const request=++sequence;
   void Promise.all([repository.readSchedule(),repository.readHabits(),repository.readFinance(),repository.readTimerHistory(),repository.readTimerStudySessions(),repository.readHealth(),repository.read()]).then(([rows,habits,finances,history,studySessions,health,lists])=>{
    if(active&&request===sequence){setReminderLists(lists);setHealth(health);setEvents(rows);setHabits(habits);setFinances(finances);setHistory(history);setStudySessions(studySessions);setEventError('');}
   }).catch(error=>{if(active&&request===sequence)setEventError(String(error.message));});
  };
  load();
  window.addEventListener('nexus-workspace-changed',load);
  window.addEventListener('nexus-workspace-refreshed',load);
  return()=>{active=false;window.removeEventListener('nexus-workspace-changed',load);window.removeEventListener('nexus-workspace-refreshed',load);};
 },[repository]);
 const [quickList,setQuickList]=useState(false),[quickTask,setQuickTask]=useState(false);
 const quickTaskInput=useRef<HTMLInputElement>(null);
 const enabled=lifeModuleIds.filter(module=>!dashboard.config.hiddenModules.includes(module)&&(!['lists','schedule','milestones','habits','finance','health'].includes(module)||storage));
 const stored=controlled??local;
 const state=stored.tab==='overview'||enabled.includes(stored.tab)?stored:{...stored,tab:'overview' as const},change=(patch:Partial<LifeViewState>)=>{const next={...state,...patch};if(onStateChange)onStateChange(next);else setLocal(next);};
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
   if(tab==='health')setHealthFocus(undefined);
   if(tab==='finance'){setFinanceTab(undefined);setFinanceFocus(undefined);}
   if(tab==='schedule'&&quick)createSchedule();
   if(tab==='milestones'&&quick)createMilestone();
   setQuickHabit(tab==='habits'&&quick);
   change({tab,scroll:0});
  });
 };
 useEffect(()=>{if(state.tab==='tasks'&&quickTask)quickTaskInput.current?.focus();},[state.tab,quickTask]);
 const tasksHidden=dashboard.config.hiddenModules.includes('tasks');
 const scheduleHidden=dashboard.config.hiddenModules.includes('schedule');
 const milestonesHidden=dashboard.config.hiddenModules.includes('milestones');
 const habitsHidden=dashboard.config.hiddenModules.includes('habits');
 const appointments=useMemo(()=>events.filter(event=>!event.milestone),[events]);
 const milestones=useMemo(()=>events.filter(event=>!!event.milestone),[events]);
 const healthHidden=dashboard.config.hiddenModules.includes('health');
 const health=useMemo(()=>healthRows.filter(row=>row.workspace_owner_id===owner),[healthRows,owner]);
 const healthSettings=useMemo(()=>health.find(row=>row.kind==='privacy')?.data,[health]);
 const visibleHealth=healthHidden?[]:shared(health,healthSettings??{});
 const financeHidden=dashboard.config.hiddenModules.includes('finance');
 const view=state.calendarView??'month';
 const dateValue=state.date,monthValue=state.month;
 const gridDays=useMemo(()=>view==="month"?calendarDaysForMonth(new Date(monthValue)):view==="week"?calendarWeek(new Date(dateValue)):[new Date(dateValue)],[view,monthValue,dateValue]);
 const calendarTodos=useMemo(()=>tasksHidden||!sources.tasks?[]:todos,[tasksHidden,sources.tasks,todos]);
 const dates=useMemo(()=>eventsByLocalDay([
  ...taskCalendarEvents(calendarTodos),
  ...(!scheduleHidden&&sources.schedule?scheduleCalendarEvents(appointments,gridDays):[]),
  ...(!milestonesHidden&&sources.milestones?scheduleCalendarEvents(milestones,gridDays):[]),
  ...(!habitsHidden&&sources.habits?habitCalendarEvents(habits,gridDays,new Date()):[]),
  ...(!healthHidden&&sources.health?healthEvents(health,gridDays,healthSettings??{}):[]),
  ...(!financeHidden&&sources.finance?financeCalendarEvents(finances,gridDays):[]),
 ]),[calendarTodos,scheduleHidden,sources.schedule,appointments,milestonesHidden,sources.milestones,milestones,habitsHidden,sources.habits,habits,financeHidden,sources.finance,finances,gridDays,healthHidden,sources.health,health,healthSettings]);
 const daily=todosForDay(calendarTodos,selected),todayKey=localDateKey(today),dayKey=localDateKey(selected);
 const dailySchedule=!scheduleHidden&&sources.schedule?scheduleCalendarEvents(appointments,[selected]):[];
 const dailyMilestones=!milestonesHidden&&sources.milestones?scheduleCalendarEvents(milestones,[selected]):[];
 const dailyTaskStarts=(dates.get(dayKey)??[]).filter(item=>item.source==='taskStart');
 const dailyHabits=!habitsHidden&&sources.habits?habitCalendarEvents(habits,[selected],today):[];
 const sectionLabel=(tab:LifeModule|'overview')=>tab==='schedule'||tab==='timer'||tab==='milestones'||tab==='habits'||tab==='finance'||tab==='health'?lifeModules[tab].label:t('life.'+tab);
 const filtered=todos.filter(p=>{
  const date=p.due_date==null?null:new Date(p.due_date);
  const match=state.filter==='all'||(state.filter==='completed'?!!p.completed:state.filter==='today'?!!date&&localDateKey(date)===todayKey:!p.completed&&p.due_date!=null&&p.due_date>=new Date(today.getFullYear(),today.getMonth(),today.getDate()+1).getTime());
  return match&&(p.title+' '+p.content_text).toLocaleLowerCase().includes(state.query.toLocaleLowerCase().trim());
 });
 const open=(id:string)=>navigateDictionary(()=>{change({scroll:scroller.current?.scrollTop??0});onSelectPage(id);});
 const readAutomationRuns=useCallback(()=>repository?.readAutomationRuns()??Promise.resolve([]),[repository]);
 const runScheduleAutomation=useCallback((occurrence:import("../features/life/reminderModel").Reminder)=>repository!.executeScheduleRule(occurrence),[repository]);
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
 const collection=(items:Page[],key:string)=><PageCollection pages={items} initialView="list" initialSort="due_date" initialAscending viewStorageKey={key} sortOptions={['due_date','updated_at','title','created_at']} onSelectPage={open} onRenamePage={onRenamePage} onDuplicatePage={onDuplicatePage} onDeletePage={onDelete} leadingControl={item=><input aria-label={t('ui.completeTask',{name:item.title})} type="checkbox" checked={!!item.completed} onChange={event=>onUpdate(item.id,{completed:event.target.checked})}/>}/>;
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
  if(event.source==='tasks'||event.source==='taskStart'){open(event.sourceId);return;}
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
  <header className="flex shrink-0 items-center gap-3 border-b border-[var(--color-border)] px-4 py-3"><h1 className="text-xl font-semibold">{t('life.title')}</h1></header>
  <div className="flex min-h-0 min-w-0 flex-1 flex-col md:flex-row">
   <LifeNavigation enabled={enabled} active={state.tab} title={t('life.sections')} label={sectionLabel} open={tab=>
    tab==='overview'?navigateDictionary(()=>change({tab,scroll:0})):openModule(tab)}/>
   <div ref={scroller} id="life-content" role="tabpanel" aria-label={sectionLabel(state.tab)} className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain px-3 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6 sm:pt-6 sm:pb-[max(1.5rem,env(safe-area-inset-bottom))]">
    <div className="mx-auto max-w-5xl space-y-5">
     {eventError&&<p role="alert">{eventError}</p>}
     {repository&&eventEditor&&(eventEditor.milestone
      ?<MilestoneForm key={eventEditor.id} initial={eventEditor} repository={repository} close={()=>setEventEditor(undefined)}/>
      :<ScheduleForm key={eventEditor.id+":"+(occurrence??"")} occurrence={occurrence} initial={eventEditor} repository={repository} close={()=>setEventEditor(undefined)}/>)}
     {state.tab==='health'&&repository?<HealthWorkspace key={healthFocus??'health'} rows={health} owner={owner} day={localDateInput(selected)} tasks={tasksHidden?[]:todos} habits={habitsHidden?[]:habits} repository={repository} taskOpen={open} focused={healthFocus}/>:state.tab==='finance'&&repository?<FinanceWorkspace key={financeFocus??'finance'} requested={financeTab} focusId={financeFocus}
      records={finances} repository={repository} owner={owner} anchor={selected} upload={uploadFinanceFile} download={downloadFinanceFile}/>:state.tab==='habits'&&repository?<><HabitsPanel habits={habits} date={selected} today={today} selectDate={setDate}
      repository={repository} owner={storage?.getWorkspaceOwner?.()??null} focusId={habitFocus} startCreating={quickHabit}/>{healthSettings?.habits===true&&<GoalList rows={visibleHealth} day={localDateInput(selected)} linked={habits} addWater={()=>{setHealthFocus("new-water");change({tab:"health",scroll:0});}} open={row=>{setHealthFocus(row.id);change({tab:'health',scroll:0});}}/>}</>:state.tab==='timer'?<LifeTimer state={timer} change={changeTimer} history={history} tasks={todos}
      sessions={studySessions.map(session=>({id:session.id,title:(pages.find(page=>page.id===session.deck_id)?.title??'學習紀錄')+' '+new Date(session.ended_at??session.completed_at??0).toLocaleDateString(language)}))}
      save={repository?result=>repository.saveTimerResult({...result,workspace_owner_id:owner,revision:0,created_at:Date.now(),updated_at:Date.now(),deleted_at:null}):undefined}/>:state.tab==='schedule'?
      <SchedulePanel events={appointments} locale={language} create={createSchedule} edit={event=>{setOccurrence(undefined);setEventEditor(event);}}/>:state.tab==='milestones'?
      <MilestonesPanel events={milestones} anchor={selected} open={setEventEditor} create={createMilestone}/>:state.tab==='lists'&&storage?<LifeLists key={listFocus??""} storage={storage} initialListId={listFocus} startCreating={quickList}
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
     <div className="flex flex-wrap items-center gap-2"><label className="flex max-w-full items-center gap-2 text-sm">{t('life.date')}<input aria-label={t('life.date')} type="date" value={localDateInput(selected)} onChange={event=>{if(event.target.value)setDate(new Date(event.target.value+'T00:00:00'));}} className="min-h-11 min-w-0 max-w-full rounded border bg-transparent px-2"/></label><button type="button" className={button} onClick={()=>setDate(today)}>{t('todo.today')}</button></div>
     {state.tab!=='overview'&&!dashboard.config.hiddenModules.includes('tasks')&&<form className="flex min-w-0 gap-2" onSubmit={event=>{event.preventDefault();void add();}}><input ref={quickTaskInput} aria-label={t('life.newTitle')} maxLength={500} disabled={busy} placeholder={t('life.newTitle')} value={input} onChange={event=>setInput(event.target.value)} className="min-h-11 min-w-0 flex-1 rounded-lg border bg-transparent px-3"/><button disabled={busy||!input.trim()} className={button}>{t('todo.add')}</button></form>}
     {error&&<p role="alert">{error}</p>}
     {state.tab==="overview"&&<LifeReminders key={JSON.stringify(owner)} owner={owner} day={localDateInput(today)} items={reminderItems}
      tasks={tasksHidden?[]:todos.map(task=>({id:task.id,title:task.title,completed:task.completed,due:task.due_date==null?undefined:localDateInput(new Date(task.due_date)),day:localDateInput(new Date(task.updated_at??task.created_at))}))}
      readRuns={readAutomationRuns} ruleBudgets={budgets}
      ruleExercises={exerciseAutomationSources(visibleHealth)} ruleHabits={habitsHidden?[]:habits.filter(habit=>habit.deleted_at==null)}
      ruleLists={dashboard.config.hiddenModules.includes("lists")?[]:reminderLists.life_lists.filter(list=>list.deleted_at==null).map(list=>({id:list.id,title:list.title}))}
      ruleRecords={dashboard.config.hiddenModules.includes("lists")?[]:reminderLists.life_items.filter(item=>item.deleted_at==null&&currentLists.has(item.list_id)).map(item=>({id:item.id,listId:item.list_id,revision:item.revision,day:localDateInput(new Date(item.updated_at))}))}
      runSchedule={!scheduleHidden&&repository&&dashboard.ready?runScheduleAutomation:undefined}
      existingSchedules={scheduleHidden?[]:appointments.filter(row=>row.id.startsWith("automation:")).map(row=>({id:row.id,title:row.title,day:new Date(row.starts_at).toISOString().slice(0,10)}))}
      synced={dashboard.config.reminders} saveSynced={repository&&dashboard.ready?reminders=>dashboard.save({...dashboard.config,reminders},dashboard.config):undefined} open={id=>{
       const list=listReminders.find(row=>row.id===id);
       if(list){setListFocus(list.listId);change({tab:"lists",scroll:0});}
       else if(id.startsWith("budget:")){setFinanceTab("budget");setFinanceFocus(id.slice(7));change({tab:"finance",scroll:0});}
       else if(id.startsWith("task:"))open(id.slice(5));
       else {const event=reminderEvents.find(row=>reminderId(row)===id);if(event)openEvent(event);}
     }}/>}
     {state.tab==='overview'&&<LifeOverview dashboard={dashboard} todos={todos} anchor={selected} today={today}
       selectedId={state.boardId} onSelectBoard={boardId=>change({boardId})}
       timer={timer} health={visibleHealth} healthShared={Object.entries(healthSettings??{}).some(([key,on])=>key.startsWith('share_')&&on===true&&healthSettings?.['off_'+key.slice(6)]!==true)} finances={financeHidden?[]:finances} events={scheduleHidden?[]:appointments} milestones={milestonesHidden?[]:milestones} habits={habitsHidden?[]:habits} openSchedule={event=>{setOccurrence(undefined);setEventEditor(event);}}
       openModule={openModule} openTask={open} toggleTask={(id,completed)=>onUpdate(id,{completed})}/>}
     {state.tab==='calendar'&&<>
      <div className="flex flex-wrap items-center gap-2" aria-label="行事曆檢視">
       {(['month','week','day'] as const).map(item=><button key={item} className={button} type="button" aria-pressed={view===item}
        onClick={()=>change({calendarView:item,month:new Date(selected.getFullYear(),selected.getMonth(),1).getTime(),scroll:0})}>
        {{month:'月檢視',week:'週檢視',day:'日檢視'}[item]}</button>)}
      </div>
      <div className="flex flex-wrap items-center gap-3" aria-label="事件來源">
       {!healthHidden&&repository&&(healthSettings?.calendar===true||healthSettings?.calendarCycle===true||healthSettings?.calendarMedication===true)&&<label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={sources.health} onChange={event=>setSources({...sources,health:event.target.checked})}/>健康事項</label>}
       {!financeHidden&&repository&&<label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={sources.finance}
        onChange={event=>setSources({...sources,finance:event.target.checked})}/>財務日期</label>}
       {!tasksHidden&&<label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={sources.tasks} onChange={event=>setSources({...sources,tasks:event.target.checked})}/>任務起訖</label>}
       {!scheduleHidden&&repository&&<><label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={sources.schedule} onChange={event=>setSources({...sources,schedule:event.target.checked})}/>行程</label>
        <button type="button" className={button} onClick={createSchedule}>新增行程</button></>}
       {!habitsHidden&&repository&&<label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={sources.habits} onChange={event=>setSources({...sources,habits:event.target.checked})}/>習慣</label>}
       {!milestonesHidden&&repository&&<label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={sources.milestones} onChange={event=>setSources({...sources,milestones:event.target.checked})}/>重要日期</label>}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
       <h2 className="text-lg font-semibold">{view==='month'?month.toLocaleDateString(language,{year:'numeric',month:'long'}):
        view==='week'?gridDays[0].toLocaleDateString(language)+' – '+gridDays.at(-1)!.toLocaleDateString(language):selected.toLocaleDateString(language)}</h2>
       <div className="flex gap-2"><button aria-label="上一期間" className={button} onClick={()=>movePeriod(-1)}>←</button><button aria-label="下一期間" className={button} onClick={()=>movePeriod(1)}>→</button></div>
      </div>
      {view==='month'?<>
      <div className="overflow-hidden rounded-xl border border-[var(--color-border)]"><div className="grid grid-cols-7 bg-[var(--color-sidebar-bg)]">{Array.from({length:7},(_,i)=><span key={i} className="py-2 text-center text-xs">{new Intl.DateTimeFormat(language,{weekday:'narrow'}).format(new Date(2026,10,1+i))}</span>)}</div><div className="grid grid-cols-7">{gridDays.map(date=>{
       const key=localDateKey(date),items=dates.get(key)??[];return <button type="button" key={key} aria-label={date.toLocaleDateString(language)+t('life.itemsCount',{n:items.length})} aria-pressed={key===dayKey} aria-current={key===todayKey?'date':undefined} onClick={()=>setDate(date)} className={'min-h-20 min-w-0 border-t border-[var(--color-border)] p-1 text-left text-xs sm:min-h-24 '+(date.getMonth()!==month.getMonth()?'opacity-40 ':'')+(key===dayKey?'ring-2 ring-inset ring-blue-500 ':'')+(key===todayKey?'bg-blue-500/10':'')}><span className="block">{date.getDate()}</span>{items.slice(0,3).map(item=><span key={item.source+':'+item.sourceId+':'+(item.occurrence??'')} className={'mt-1 block truncate rounded px-1 text-[10px] '+(item.source==='schedule'?'bg-emerald-500/15 ':'bg-violet-500/15 ')+(item.completed?'line-through opacity-60':'')}>{item.source==='taskStart'?'開始 · ':''}{item.title}</span>)}{items.length>3&&<span className="block truncate text-[10px]">＋{items.length-3} {t('life.more')}</span>}</button>;
      })}</div></div><h3 className="font-semibold">{selected.toLocaleDateString(language)} · {t('life.dayItems')}</h3>{dailySchedule.length>0&&<ul className="space-y-2">{dailySchedule.map(item=>{
       const original=events.find(row=>row.id===item.sourceId)!;
       const event=item.occurrence?scheduleOccurrence(original,item.occurrence)?.event??original:original;
       return <li key={item.sourceId+':'+(item.occurrence??'')}><button className={button+' w-full break-words text-left'} onClick={()=>openEvent(item)}>
        {item.title}<span className="ml-2 text-xs opacity-75">{scheduleLabel(event,language)}</span></button></li>;
      })}</ul>}{dailyMilestones.map(item=>{
       const event=milestones.find(row=>row.id===item.sourceId)!;
       return <MilestoneRow key={item.sourceId} event={event} anchor={selected} open={()=>setEventEditor(event)}/>;
      })}{dailyHabits.map(item=><button key={item.sourceId} type="button" className={button+' w-full text-left'} onClick={()=>{setHabitFocus(item.sourceId);openModule('habits');}}>
       習慣 · {item.title}{item.completed?' ✓':''}</button>)}{dailyTaskStarts.map(item=><button key={item.sourceId} type="button" className={button+' w-full text-left'} onClick={()=>open(item.sourceId)}>
       開始 · {item.title}</button>)}{(!financeHidden&&sources.finance?financeCalendarEvents(finances,[selected]):[]).map(item=>
      <button className={button+' w-full text-left'} key={item.sourceId} onClick={()=>openEvent(item)}>{item.title}</button>)}
      {(!healthHidden&&sources.health?healthEvents(health,[selected],healthSettings??{}):[]).map(item=><button className={button+" w-full text-left"} key={item.sourceId+":"+(item.occurrence??"")} onClick={()=>openEvent(item)}>{item.title}</button>)}
      {collection(daily,'nexus-calendar-items-view')}</>:<CalendarPeriod days={gridDays} events={dates} locale={language} open={openEvent}
       select={date=>change({calendarView:'day',date:date.getTime(),scroll:0})}/>}
     </>}
     {state.tab==='tasks'&&<><div className="flex flex-wrap gap-2" role="group" aria-label={t('life.taskViews')}>{(['all','today','upcoming','completed'] as const).map(filter=><button className={button} aria-pressed={filter===state.filter} key={filter} onClick={()=>change({filter,scroll:0})}>{t('life.filter.'+filter)}</button>)}</div><input type="search" aria-label={t('life.search')} value={state.query} onChange={event=>change({query:event.target.value,scroll:0})} className="min-h-11 w-full rounded border bg-transparent px-3"/>{collection(filtered,'nexus-life-tasks-view')}</>}
     </>}
    </div>
   </div>
  </div>
 </main>;
}
