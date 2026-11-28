"use client";
import { confirmDialog } from "../lib/confirmDialog";
import { budgetAlerts } from "../features/life/finance/budgetAlerts";
import { emptyLife } from "../features/life/lists";
import { listDateReminders } from "../features/life/reminderModel";
import LifeReminders from "../features/life/LifeReminders";
import HealthWorkspace,{GoalList} from "../features/life/health/HealthWorkspace";
import {exerciseAutomationSources,shared,type HealthRecord} from "../features/life/health/model";
import {healthEvents} from "../features/life/health/summary";
import { recurringTerms } from "../features/life/finance/ledger";
import FinanceWorkspace,{type FinanceTab} from '../features/life/finance/FinanceWorkspace';
import {financeCalendarEvents} from '../features/life/finance/financeCalendar';
import type {FinanceRecord} from '../features/life/finance/model';
import CalendarMonth from "../features/life/CalendarMonth";
import {CalendarList,CalendarItem,CalendarPeriod,calendarWeek,type CalendarView} from '../features/life/CalendarPeriod';
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
import type {Page,TaskSchedulingFields} from '../lib/types';
import {navigateDictionary} from '../features/dictionary/useUnsavedDraft';
import {useLanguage} from '../lib/LanguageContext';
import {calendarEventKey,sortCalendarEvents,eventsByLocalDay,habitCalendarEvents,scheduleCalendarEvents,taskCalendarEvents,plannedTaskEvents} from '../features/life/calendarSources';
import LifeNavigation from '../features/life/LifeNavigation';
import {newScheduleEvent,ScheduleForm,SchedulePanel} from '../features/life/SchedulePanel';
import {MilestoneForm,MilestonesPanel,newMilestone} from '../features/life/Milestones';
import CalendarTaskEditor,{NewCalendarTask} from "../features/life/CalendarTaskEditor";
import TaskOccurrenceEditor from "../features/life/TaskOccurrenceEditor";
import { executionHistory, statusLabels, taskSlots, type TaskExecution, type TaskSlot } from "../features/life/taskPlan";
import AddMenu from "../features/life/AddMenu";
import HabitCheckIn from "../features/life/HabitCheckIn";
import HabitsPanel,{HabitForm,HabitTrackingDialog} from '../features/life/HabitsPanel';
import type {Habit,ScheduleEvent} from '../features/life/syncRecords';
import {addDays,calendarDaysForMonth,localDateKey,localDateInput} from '../lib/todoCalendar';

export type LifeViewState={tab:'overview'|LifeModule;date:number;month:number;filter:'all'|'today'|'upcoming'|'completed'|'undated'|'overdue';query:string;scroll:number;boardId?:string;calendarView?:CalendarView;financeMonth?:string;calendarManager?:'schedule'|'milestones'|'tasks'|'habits'};
export function initialLifeView():LifeViewState{const today=new Date();today.setHours(0,0,0,0);return{tab:'overview',date:today.getTime(),month:new Date(today.getFullYear(),today.getMonth(),1).getTime(),filter:'all',query:'',scroll:0};}
/** Calendar/tasks share todo Pages; custom lists use their own workspace records. */
export default function TodoView({pages,onCreate,onUpdate,onDelete,onSelectPage,onRenamePage,onDuplicatePage,onAdoptTask,state:controlled,onStateChange,storage,headerIntegrated=false}:PageActions&{
 pages:Page[];onCreate:(title:string,dueDate?:number|null,fields?:TaskSchedulingFields)=>void|Promise<unknown>;onUpdate:(id:string,patch:Partial<Page>)=>void|Promise<unknown>;onDelete:(id:string)=>void;onSelectPage:(id:string)=>void;
 onAdoptTask?:(page:Page)=>void;headerIntegrated?:boolean;storage?:StorageAdapter;state?:LifeViewState;onStateChange?:(state:LifeViewState)=>void;
}){
 const {t,language}=useLanguage();const [local,setLocal]=useState(initialLifeView);
 const dashboard=useLifeDashboard(storage);
 const {repository}=dashboard;
 const [healthRows,setHealth]=useState<HealthRecord[]>([]);
 const [healthFocus,setHealthFocus]=useState<string>();
 const [finances,setFinances]=useState<FinanceRecord[]>([]);
 const [financeTab,setFinanceTab]=useState<FinanceTab>();
 const [financeFocus,setFinanceFocus]=useState<string>();
 const [financeDate,setFinanceDate]=useState<string>();
 const [occurrence,setOccurrence]=useState<string>();
 const [events,setEvents]=useState<ScheduleEvent[]>([]);
 const [executions,setExecutions]=useState<TaskExecution[]>([]);
 const [instanceEditor,setInstanceEditor]=useState<{id:string; slot?:TaskSlot}>();
 const [habits,setHabits]=useState<Habit[]>([]);
 const [eventEditor,setEventEditor]=useState<ScheduleEvent>();
 const [eventError,setEventError]=useState('');
 const preferenceKey='nexus-life-calendar';
 const [calendarPreferences,setCalendarPreferences]=useState<{view?:CalendarView;details?:Partial<Record<CalendarView,boolean>>}>({});
 useEffect(()=>{
  const frame=requestAnimationFrame(()=>{
   try {
    const raw=localStorage.getItem(preferenceKey);
    if(raw) {
     const stored=JSON.parse(raw);
     if(stored&&['month','week','day','list',undefined].includes(stored.view))setCalendarPreferences(stored);
    }
   } catch { /* Storage may be unavailable in private browsing. */ }
  });
  return ()=>cancelAnimationFrame(frame);
 },[]);
 const rememberCalendar=(preferences:typeof calendarPreferences)=>{
  setCalendarPreferences(preferences);
  try { localStorage.setItem(preferenceKey,JSON.stringify(preferences)); }
  catch { /* Keep the preference for this visit. */ }
 };
 const [calendarFilter,setCalendarFilter]=useState('all');
 const filterPopover=useRef<HTMLDetailsElement>(null);
 useEffect(()=>{
  const outside=(event:PointerEvent)=>{
   const panel=filterPopover.current;
   if(panel?.open&&!panel.contains(event.target as Node))panel.open=false;
  };
  const escape=(event:KeyboardEvent)=>{
   const panel=filterPopover.current;
   if(event.key==='Escape'&&panel?.open){panel.open=false;panel.querySelector('summary')?.focus();}
  };
  document.addEventListener('pointerdown',outside);
  document.addEventListener('keydown',escape);
  return ()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape);};
 },[]);
 const [sources,setSources]=useState({tasks:true,schedule:true,milestones:true,habits:true,finance:true,health:true});
 const owner=storage?.getWorkspaceOwner?.()??null;
 const financePrivacyKey='nexus-life-finance-hide:'+JSON.stringify(owner);
 const [financeHide,setFinanceHide]=useState(()=>{
  try{return localStorage.getItem(financePrivacyKey)==='true';}catch{return false;}
 });
 const rememberFinanceHide=(hide:boolean)=>{
  setFinanceHide(hide);
  try{localStorage.setItem(financePrivacyKey,String(hide));}catch{/* Keep the setting for this visit. */}
 };
 const [reminderLists,setReminderLists]=useState(emptyLife);
 const [automationSourcesOwner,setAutomationSourcesOwner]=useState<string|null|undefined>(undefined);
 const [listFocus,setListFocus]=useState<string>();
 useEffect(()=>{
  if(!repository)return;
  let active=true,sequence=0;
  const load=()=>{
   const request=++sequence;
   void Promise.all([repository.readSchedule(),repository.readHabits(),repository.readFinance(),repository.readHealth(),repository.read(),repository.readTaskExecutions()]).then(([rows,habits,finances,health,lists,executions])=>{
    if(active&&request===sequence){setAutomationSourcesOwner(owner);setReminderLists(lists);setExecutions(executions);setHealth(health);setEvents(rows);setHabits(habits);setFinances(finances);setEventError('');}
   }).catch(error=>{if(active&&request===sequence)setEventError(String(error.message));});
  };
  load();
  window.addEventListener('nexus-workspace-changed',load);
  window.addEventListener('nexus-workspace-refreshed',load);
  return()=>{active=false;window.removeEventListener('nexus-workspace-changed',load);window.removeEventListener('nexus-workspace-refreshed',load);};
 },[owner,repository]);
 const [quickList,setQuickList]=useState(false);
 const enabled=lifeModuleIds.filter(module=>!dashboard.config.hiddenModules.includes(module)&&(!['lists','schedule','milestones','habits','finance','health'].includes(module)||storage));
 const [newTask,setNewTask]=useState<'regular'|'tracked'>();
 const [taskEditor,setTaskEditor]=useState<string>();
 const [trackedTask,setTrackedTask]=useState<{id:string;date:Date}>();
 const [habitEditor,setHabitEditor]=useState<Habit>();
 const original=controlled??local;
 const legacy=['schedule','milestones','tasks','habits'].includes(original.tab)?original.tab as 'schedule'|'milestones'|'tasks'|'habits':undefined;
 const stored=legacy?{...original,tab:'calendar' as const,calendarManager:legacy}:original.tab==='timer'?{...original,tab:'overview' as const}:original;
 const state=stored.tab==='overview'||enabled.includes(stored.tab)||stored.tab==='calendar'&&enabled.some(id=>['schedule','milestones','tasks','habits'].includes(id))?stored:{...stored,tab:'overview' as const},change=(patch:Partial<LifeViewState>)=>{const next={...state,...patch};if(onStateChange)onStateChange(next);else setLocal(next);};
 const manager=state.calendarManager;
 const setManager=(calendarManager:LifeViewState['calendarManager'])=>change({calendarManager});
 const scroller=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(scroller.current)scroller.current.scrollTop=state.scroll;},[state.scroll]);
 const [,refreshCivilDay]=useState(0);
 useEffect(()=>{
  const refresh=()=>{if(document.visibilityState==="visible")refreshCivilDay(value=>value+1);};
  document.addEventListener("visibilitychange",refresh);
  return ()=>document.removeEventListener("visibilitychange",refresh);
 },[]);
 const selected=new Date(state.date);selected.setHours(0,0,0,0);
 const month=new Date(state.month),today=new Date();today.setHours(0,0,0,0);
 const todos=useMemo(()=>pages.filter(p=>p.kind==='todo'&&!p.deleted_at).sort((a,b)=>(a.due_date??Infinity)-(b.due_date??Infinity)||a.id.localeCompare(b.id)),[pages]);
 const adoptedHabits=new Set(todos.flatMap(task=>task.task_plan?.legacyHabitId?[task.task_plan.legacyHabitId]:[]));
 const legacyHabits=habits.filter(habit=>!adoptedHabits.has(habit.id));
 const trackedPages=todos.filter(task=>!task.task_plan?.retired&&task.task_plan?.segments.some(segment=>segment.settings.tracking));
 const trackedReferences=[...legacyHabits,...trackedPages,
  ...todos.filter(task=>task.task_plan?.retired&&task.task_plan.legacyHabitId)];
 const createSchedule=(slot?:Date)=>{setOccurrence(undefined);setEventEditor(newScheduleEvent(owner,slot??selected,!!slot));};
 const createMilestone=()=>{setOccurrence(undefined);setEventEditor(newMilestone(owner,selected));};
 const openModule=(tab:LifeModule,quick=false)=>{

  navigateDictionary(()=>{
   setQuickList(tab==='lists'&&quick);
   if(tab==='tasks'&&quick)setNewTask('regular');
   if(tab==='health')setHealthFocus(quick?'new-water':undefined);
   if(tab==='finance'){setFinanceDate(undefined);setFinanceTab(quick?'transaction':undefined);setFinanceFocus(quick?'new-transaction':undefined);}
   if(tab==='schedule'&&quick)createSchedule();
   if(tab==='milestones'&&quick)createMilestone();
   if(['schedule','milestones','tasks','habits'].includes(tab)) {
     if(tab==='habits'&&quick&&repository)setNewTask('tracked');
    change({tab:'calendar',calendarManager:!quick?tab as LifeViewState['calendarManager']:state.calendarManager,scroll:0});
   } else if(tab!=='timer')change({tab,scroll:0});
  });
 };
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
 const view=state.calendarView??calendarPreferences.view??'month';
 const detailsOpen=view!=='list'&&(calendarPreferences.details?.[view]??view==='month');
 const setDetails=(open:boolean)=>rememberCalendar({...calendarPreferences,details:{...calendarPreferences.details,[view]:open}});
 const dateValue=selected.getTime();
 const gridAnchor=new Date(dateValue);
 const gridDays=view==="list"?Array.from({length:31},(_,index)=>addDays(gridAnchor,index))
  :view==="month"?calendarDaysForMonth(month):view==="week"?calendarWeek(gridAnchor):[gridAnchor];
 const calendarTodos=useMemo(()=>tasksHidden||!sources.tasks?[]:todos,[tasksHidden,sources.tasks,todos]);
 const executionByTask=new Map<string,TaskExecution[]>();
 for(const row of executions) {
  const entries=executionByTask.get(row.task_id)??[];
  entries.push(row);executionByTask.set(row.task_id,entries);
 }
 const todayInput=localDateInput(today);
 const gridFirst=localDateInput(addDays(gridDays[0],-1)),gridLast=localDateInput(addDays(gridDays.at(-1)!,1));
 const slots=calendarTodos.flatMap(task=>task.task_plan&&!task.task_plan.retired
  ?taskSlots(task.task_plan,executionByTask.get(task.id)??[],gridFirst,gridLast).map(slot=>({task,slot})):[]);
 const plannedEvents=plannedTaskEvents(slots);
 const passedFilter=(item:LifeCalendarEvent)=>calendarFilter==='all'||(calendarFilter==='once'?!item.recurring:
  calendarFilter==='recurring'?!!item.recurring:item.source==='habits'||!!item.tracking);
 const flexibleTasks=slots.filter(({slot})=>slot.settings.recurrence.mode==='flexible'&&slot.day<=localDateInput(selected)
  &&slot.through>=localDateInput(selected)&&calendarFilter!=='once'&&(calendarFilter!=='tracked'||slot.settings.tracking));
 const activeTask=instanceEditor?todos.find(task=>task.id===instanceEditor.id):undefined;
 const activeSlot=instanceEditor?.slot && (slots.find(({task,slot})=>task.id===activeTask?.id&&slot.key===instanceEditor.slot?.key)?.slot??instanceEditor.slot);
 const openTaskEditor=(id:string)=>{
  const task=todos.find(row=>row.id===id);
  if(task?.task_plan)setInstanceEditor({id});
  else setTaskEditor(id);
 };
 const dates=eventsByLocalDay([
  ...taskCalendarEvents(calendarTodos),
  ...plannedEvents,
  ...(!scheduleHidden&&sources.schedule?scheduleCalendarEvents(appointments,gridDays):[]),
  ...(!milestonesHidden&&sources.milestones?scheduleCalendarEvents(milestones,gridDays):[]),
  ...(!tasksHidden&&sources.tasks&&!habitsHidden&&sources.habits?habitCalendarEvents(legacyHabits,gridDays,new Date()):[]),
  ...(!healthHidden&&sources.health?healthEvents(health,gridDays,healthSettings??{}):[]),
  ...(!financeHidden&&sources.finance?financeCalendarEvents(finances,gridDays):[]),
 ].filter(passedFilter),gridDays);
 const todayKey=localDateKey(today),dayKey=localDateKey(selected);
 const dailyItems=sortCalendarEvents(dates.get(dayKey)??[]).filter(item=>view!=='day'||item.allDay||item.startsAt==null);
 const sectionLabel=(tab:LifeModule|'overview')=>tab==='schedule'||tab==='timer'||tab==='milestones'||tab==='habits'||tab==='finance'||tab==='health'?lifeModules[tab].label:t('life.'+tab);
 const filtered=todos.filter(p=>{
  if(p.task_plan) {
   if(!(p.title+" "+p.task_plan.segments.at(-1)?.settings.notes).toLocaleLowerCase().includes(state.query.toLocaleLowerCase().trim()))return false;
   if(state.filter==='all')return true;
   if(p.task_plan.retired)return false;
   const history=executionHistory(p.task_plan,executionByTask.get(p.id)??[],todayInput);
   if(state.filter==='overdue')return history.some(slot=>!slot.settings.tracking
    &&(slot.status==='pending'||slot.status==='partial')&&(slot.dueAt==null?slot.through<todayInput:slot.dueAt<Date.now()));
   if(state.filter==='completed')return history.some(slot=>slot.status==='complete');
   if(state.filter==='today')return history.some(slot=>slot.day<=todayInput&&slot.through>=todayInput);
   if(state.filter==='undated')return p.task_plan.segments.some(segment=>segment.settings.dueAt==null);
   return taskSlots(p.task_plan,executionByTask.get(p.id)??[],todayInput,localDateInput(addDays(today,366)))
    .some(slot=>slot.day>todayInput);
  }
  const date=p.due_date==null?null:new Date(p.due_date);
  const match=state.filter==='all'||(state.filter==='undated'?p.due_date==null:state.filter==='overdue'?!p.completed&&p.due_date!=null&&p.due_date<today.getTime():state.filter==='completed'?!!p.completed:state.filter==='today'?!!date&&localDateKey(date)===todayKey:!p.completed&&p.due_date!=null&&p.due_date>=new Date(today.getFullYear(),today.getMonth(),today.getDate()+1).getTime());
  return match&&(p.title+' '+p.content_text).toLocaleLowerCase().includes(state.query.toLocaleLowerCase().trim());
 });
 const open=(id:string)=>navigateDictionary(()=>{change({scroll:scroller.current?.scrollTop??0});onSelectPage(id);});
 const readAutomationRuns=useCallback(()=>repository?.readAutomationRuns()??Promise.resolve([]),[repository]);
 const executeAutomation=useCallback((occurrence:import("../features/life/reminderModel").Reminder,rule:import("../features/life/reminderModel").ReminderRule)=>repository!.executeRule(occurrence,rule),[repository]);
 const reminderDays=state.tab==="overview"?Array.from({length:31},(_,offset)=>addDays(today,offset)):[];
 const nativeRuleHabits:Habit[]=state.tab!=="overview"?[]:trackedPages.flatMap(task=>{
  const settings=task.task_plan?.segments.at(-1)?.settings;
  if(!settings)return [];
  const quantities=Object.fromEntries((executionByTask.get(task.id)??[]).filter(row=>row.status==="complete")
   .map(row=>[row.day,settings.goal.target]));
  return [{id:task.id,title:task.title,workspace_owner_id:owner,revision:task.revision,created_at:task.created_at,
   updated_at:task.updated_at,deleted_at:null,started_on:settings.anchor,goal:settings.goal.target,quantities,
   cadence:settings.recurrence.mode==="flexible"?settings.recurrence.period:"daily"}];
 });
 const reminderEvents=state.tab==="overview"?[
  ...(!scheduleHidden?scheduleCalendarEvents(appointments,reminderDays):[]),
  ...(!milestonesHidden?scheduleCalendarEvents(milestones,reminderDays):[]),
  ...(!habitsHidden?habitCalendarEvents(legacyHabits,[today],today):[]),
  ...(!tasksHidden?plannedTaskEvents(todos.flatMap(task=>task.task_plan&&!task.task_plan.retired
   ?taskSlots(task.task_plan,executionByTask.get(task.id)??[],todayInput,localDateInput(addDays(today,30)))
    .filter(slot=>slot.status==="pending"||slot.status==="partial").map(slot=>({task,slot})):[])):[]),
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
  ...(!tasksHidden?todos.flatMap(task=>!task.task_plan&&!task.completed&&task.due_date!=null?[{id:"task:"+task.id,title:task.title,day:localDateInput(new Date(task.due_date)),source:"待辦",priority:task.due_date<today.getTime()?2:1}]:[]):[]),
 ];
 const collection=(items:Page[],key:string)=><PageCollection pages={items} initialView="list" initialSort="due_date" initialAscending viewStorageKey={key} sortOptions={['due_date','updated_at','title','created_at']} onSelectPage={openTaskEditor} onRenamePage={onRenamePage} onDuplicatePage={onDuplicatePage} onDeletePage={id=>todos.find(task=>task.id===id)?.task_plan?openTaskEditor(id):onDelete(id)} leadingControl={item=>!item.task_plan&&<input aria-label={t('ui.completeTask',{name:item.title})} type="checkbox" checked={!!item.completed} onChange={event=>onUpdate(item.id,{completed:event.target.checked})}/>}/>;
 const setDate=(date:Date)=>change({date:date.getTime(),month:new Date(date.getFullYear(),date.getMonth(),1).getTime(),scroll:0});
 const openEvent=(event:LifeCalendarEvent)=>{
  if(event.source==='health'){setHealthFocus(event.sourceId);change({tab:'health',scroll:0});return;}
  if(event.source==='finance'){
   const row=finances.find(item=>item.id===event.sourceId);
   if(!row)return;
   setFinanceTab(row.kind==='subscription'?'subscription':row.kind==='transaction'?'transaction':row.kind==='goal'?'goal':row.kind==='account'?'account':'asset');
   setFinanceFocus(row.id);
   setFinanceDate(row.kind==='subscription'&&!event.completed?localDateInput(new Date(event.date)):undefined);
   change({tab:'finance',scroll:0});
   return;
  }
  if(event.source==='habits'){setTrackedTask({id:event.sourceId,date:new Date(event.date)});return;}
  if(event.source==='tasks'||event.source==='taskStart'){
   if(event.taskSlot)setInstanceEditor({id:event.sourceId,slot:event.taskSlot});
   else openTaskEditor(event.sourceId);
   return;
  }
  const row=events.find(item=>item.id===event.sourceId);
  if(row){setOccurrence(event.occurrence);setEventEditor(row);}
 };
 const movePeriod=(direction:number)=>{
  if(view==='month'){
   const target=new Date(month.getFullYear(),month.getMonth()+direction,1);
   const last=new Date(target.getFullYear(),target.getMonth()+1,0).getDate();
   change({month:target.getTime(),date:new Date(target.getFullYear(),target.getMonth(),Math.min(selected.getDate(),last)).getTime(),scroll:0});
  }
  else setDate(addDays(selected,direction*(view==='week'?7:view==='list'?31:1)));
 };
 const completeCalendarItem=(item:LifeCalendarEvent)=>{
  if(item.taskSlot&&repository){
   const task=todos.find(row=>row.id===item.sourceId);
   if(task)void repository.saveTaskExecution(task,item.taskSlot,item.completed?'pending':'complete',item.taskSlot.amount)
    .catch(error=>setEventError(String(error)));
  } else void onUpdate(item.sourceId,{completed:!item.completed});
 };
 const adjustSchedule=async(item:LifeCalendarEvent,starts_at:number,ends_at:number)=>{
  const row=appointments.find(event=>event.id===item.sourceId);
  if(!row||!repository)return;
  try {
   if(row.repeat_rule&&item.occurrence){
    const original=scheduleOccurrence(row,item.occurrence)?.event;
    if(!original)return;
    const {title,all_day,category,notes}=original;
    const overrides={...row.repeat_rule.overrides,[item.occurrence]:{title,all_day,category,notes,starts_at,ends_at}};
    await repository.saveSchedule({...row,repeat_rule:{...row.repeat_rule,overrides}});
   } else await repository.saveSchedule({...row,starts_at,ends_at});
  } catch(error){setEventError(String(error));}
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
 const button='min-h-11 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm hover:bg-zinc-500/10';
 return <main data-life-workspace className="flex min-h-0 min-w-0 flex-1 flex-col bg-[var(--color-editor-bg)] text-[var(--color-text)]">
  {!headerIntegrated&&<header className="shrink-0 border-b border-[var(--color-border)] px-4 py-2"><h1 className="text-2xl font-semibold">{t('life.title')}</h1></header>}
  <div className="life-layout">
   <LifeNavigation enabled={enabled} active={state.tab} title={t('life.sections')} label={sectionLabel} open={tab=>
    tab==='overview'?navigateDictionary(()=>change({tab,calendarManager:undefined,scroll:0})):openModule(tab)}/>
   <div ref={scroller} id="life-content" role="tabpanel" aria-label={sectionLabel(state.tab)} className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain px-3 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6 sm:pt-6 sm:pb-[max(1.5rem,env(safe-area-inset-bottom))]">
    <div className={state.tab==='calendar'?'min-w-0 space-y-2':'mx-auto max-w-7xl space-y-4'}>
     {eventError&&<p role="alert">{eventError}</p>}
     {activeTask?.task_plan&&repository&&<TaskOccurrenceEditor key={activeTask.id+":"+(activeSlot?.key??"")}
      page={activeTask} slot={activeSlot} executions={executionByTask.get(activeTask.id)??[]} repository={repository}
      update={onUpdate} close={()=>setInstanceEditor(undefined)}/>}
     {taskEditor&&todos.find(task=>task.id===taskEditor)&&<CalendarTaskEditor key={taskEditor} page={todos.find(task=>task.id===taskEditor)!} update={onUpdate} remove={onDelete} close={()=>setTaskEditor(undefined)} open={()=>open(taskEditor)}/>}
     {repository&&eventEditor&&(eventEditor.milestone
      ?<MilestoneForm key={eventEditor.id+":"+(occurrence??"")} occurrence={occurrence} initial={eventEditor} repository={repository} close={()=>setEventEditor(undefined)}/>
      :<ScheduleForm key={eventEditor.id+":"+(occurrence??"")} occurrence={occurrence} initial={eventEditor} repository={repository} close={()=>setEventEditor(undefined)}/>)}
     {state.tab==='health'&&repository?<HealthWorkspace key={healthFocus??'health'} rows={health} owner={owner} day={localDateInput(selected)} tasks={tasksHidden?[]:todos} habits={habitsHidden?[]:trackedReferences} repository={repository} taskOpen={open} focused={healthFocus}/>:state.tab==='finance'&&repository?<FinanceWorkspace key={(financeFocus??'finance')+':'+(financeDate??'')} requested={financeTab} focusId={financeFocus} focusDate={financeDate}
      records={finances} repository={repository} owner={owner} selectedMonth={state.financeMonth} onMonthChange={financeMonth=>change({financeMonth})} hideAmounts={financeHide} onHideChange={rememberFinanceHide} anchor={today} upload={uploadFinanceFile} download={downloadFinanceFile}/>:state.tab==='lists'&&storage?<LifeLists key={listFocus??""} storage={storage} initialListId={listFocus} startCreating={quickList}
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
     {state.tab==='overview'&&<LifeOverview dashboard={dashboard} todos={todos} anchor={selected} today={today}
       selectedId={state.boardId} onSelectBoard={boardId=>change({boardId})}
       plannedExecutions={executionByTask} openPlanned={(page,slot)=>setInstanceEditor({id:page.id,slot})}
       completePlanned={completeCalendarItem} health={visibleHealth} healthShared={Object.entries(healthSettings??{}).some(([key,on])=>key.startsWith('share_')&&on===true&&healthSettings?.['off_'+key.slice(6)]!==true)} finances={financeHidden?[]:finances} financeHide={financeHide} events={scheduleHidden?[]:appointments} milestones={milestonesHidden?[]:milestones} habits={habitsHidden?[]:legacyHabits} openSchedule={(event,occurrence)=>{setOccurrence(occurrence);setEventEditor(event);}}
       openModule={openModule} openTask={setTaskEditor} toggleTask={(id,completed)=>onUpdate(id,{completed})}/>}
     {state.tab==="overview"&&<LifeReminders key={JSON.stringify(owner)} owner={owner} day={localDateInput(today)} items={reminderItems}
      tasks={tasksHidden?[]:todos.map(task=>({id:task.id,title:task.title,completed:task.completed,due:task.due_date==null?undefined:localDateInput(new Date(task.due_date)),day:localDateInput(new Date(task.updated_at??task.created_at))}))}
      readRuns={readAutomationRuns} ruleBudgets={budgets} ruleTargets={milestonesHidden?[]:milestones}
      ruleExercises={exerciseAutomationSources(visibleHealth)} ruleHabits={habitsHidden?[]:[...legacyHabits,...nativeRuleHabits]}
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
       else if(id.startsWith("task:"))setTaskEditor(id.slice(5));
       else {const event=reminderEvents.find(row=>reminderId(row)===id);if(event)openEvent(event);}
     }}/>}
     {state.tab==='calendar'&&<>
      <div className="life-calendar-toolbar">
       <button type="button" className={button} onClick={()=>setDate(today)}>今天</button>
       <div className="flex gap-1"><button type="button" aria-label="上一期間" className={button} onClick={()=>movePeriod(-1)}>←</button><button type="button" aria-label="下一期間" className={button} onClick={()=>movePeriod(1)}>→</button></div>
       <h2 className="text-base font-semibold">{view==='month'?month.toLocaleDateString(language,{year:'numeric',month:'long'}):
        view==='week'||view==='list'?gridDays[0].toLocaleDateString(language)+' – '+gridDays.at(-1)!.toLocaleDateString(language):selected.toLocaleDateString(language)}</h2>
       <input aria-label="日曆日期" type="date" className={button+' w-32 bg-transparent'} value={localDateInput(selected)} onChange={event=>{if(event.target.value)setDate(new Date(event.target.value+'T00:00:00'));}}/>
       <div className="life-calendar-segments" role="group" aria-label="行事曆檢視">
        {(['month','week','day','list'] as const).map(item=><button key={item} type="button" aria-pressed={view===item}
         onClick={()=>{rememberCalendar({...calendarPreferences,view:item});change({calendarView:item,month:new Date(selected.getFullYear(),selected.getMonth(),1).getTime(),scroll:0});}}>
         {{month:'月檢視',week:'週檢視',day:'日檢視',list:'清單檢視'}[item]}</button>)}
       </div>
       <AddMenu items={[
        ...(!scheduleHidden&&repository?[{label:'新增行程',action:()=>createSchedule()}]:[]),
        ...(!milestonesHidden&&repository?[{label:'新增重要日期',action:createMilestone}]:[]),
        ...(!tasksHidden?[{label:'新增任務',action:()=>setNewTask('regular')}]:[]),
       ]}/>
       <button type="button" className={button} aria-expanded={!!manager} onClick={()=>setManager(manager?undefined:!scheduleHidden?'schedule':!tasksHidden?'tasks':'milestones')}>管理</button>
       {view!=='list'&&<button type="button" className={button} aria-expanded={detailsOpen} aria-controls="life-calendar-details" onClick={()=>setDetails(!detailsOpen)}>{detailsOpen?'收合詳情':'展開詳情'}</button>}
       <details ref={filterPopover} className="life-calendar-filter"><summary>篩選</summary><div className="life-calendar-filter-panel" aria-label="事件來源">
        <label className="flex items-center gap-2">重複類型<select value={calendarFilter} onChange={event=>setCalendarFilter(event.target.value)}>
         <option value="all">全部</option><option value="once">單次</option><option value="recurring">週期性</option><option value="tracked">習慣追蹤</option>
        </select></label>
        {([
         ['tasks','任務',!tasksHidden],['schedule','行程',!scheduleHidden&&repository],['milestones','重要日期',!milestonesHidden&&repository],
         ['health','健康事項',!healthHidden&&repository&&(healthSettings?.calendar||healthSettings?.calendarCycle||healthSettings?.calendarMedication)],
         ['finance','財務日期',!financeHidden&&repository],
        ] as const).map(([key,label,visible])=>visible?<label key={key} className="flex items-center gap-2">
         <input type="checkbox" checked={sources[key]} onChange={event=>setSources({...sources,[key]:event.target.checked})}/>{label}
        </label>:null)}
       </div></details>
      </div>
      {newTask&&<NewCalendarTask date={selected}
       create={onCreate} close={()=>setNewTask(undefined)} startTracking={newTask==='tracked'}/>}
      {trackedTask&&repository&&habits.find(habit=>habit.id===trackedTask.id)&&<HabitTrackingDialog
       habit={habits.find(habit=>habit.id===trackedTask.id)!} selected={trackedTask.date} today={today} repository={repository}
       close={()=>setTrackedTask(undefined)} edit={()=>{setHabitEditor(habits.find(habit=>habit.id===trackedTask.id));setTrackedTask(undefined);}}
       adopt={onAdoptTask?async()=>{
        const page=await repository.adoptHabit(habits.find(habit=>habit.id===trackedTask.id)!);
        onAdoptTask(page);setTrackedTask(undefined);setInstanceEditor({id:page.id});
       }:undefined}/>}
      {habitEditor&&repository&&<HabitForm modal key={habitEditor.id} habit={habitEditor} repository={repository} close={()=>setHabitEditor(undefined)}/>}
      {manager&&<section className="life-manager space-y-3" aria-label="日曆事項管理">
       <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">跨日期管理</h3><button type="button" className={button} onClick={()=>setManager(undefined)}>關閉管理</button></div>
       <div className="flex flex-wrap gap-2" role="group" aria-label="管理類型">
        {(['schedule','milestones','tasks'] as const).filter(item=>!dashboard.config.hiddenModules.includes(item)).map(item=><button type="button" key={item} className={button} aria-pressed={manager===item} onClick={()=>setManager(item)}>{sectionLabel(item)}</button>)}
       </div>
       {manager==='schedule'&&!scheduleHidden&&<SchedulePanel events={appointments} locale={language} create={()=>createSchedule()} edit={event=>{setOccurrence(undefined);setEventEditor(event);}}/>}
       {manager==='milestones'&&!milestonesHidden&&<MilestonesPanel events={milestones} anchor={selected} open={event=>{setOccurrence(undefined);setEventEditor(event);}} create={createMilestone}/>}
       {(manager==='tasks'||manager==='habits')&&!tasksHidden&&<>
        <div className="flex flex-wrap gap-2" role="group" aria-label={t('life.taskViews')}>{(['all','today','upcoming','undated','overdue','completed'] as const).map(filter=><button type="button" className={button} aria-pressed={filter===state.filter} key={filter} onClick={()=>change({filter,scroll:0})}>{filter==='undated'?'無期限':filter==='overdue'?'已逾期':t('life.filter.'+filter)}</button>)}</div>
        <input type="search" aria-label={t('life.search')} value={state.query} onChange={event=>change({query:event.target.value,scroll:0})} className={button+' w-full bg-transparent'}/>
        {collection(filtered,'nexus-life-tasks-view')}
       </>}
       {(manager==='tasks'||manager==='habits')&&!tasksHidden&&!habitsHidden&&repository&&<><HabitsPanel habits={legacyHabits} date={selected} today={today} selectDate={setDate} repository={repository}/>
        {healthSettings?.habits===true&&<GoalList rows={visibleHealth} day={localDateInput(selected)} linked={trackedReferences} addWater={()=>{setHealthFocus('new-water');change({tab:'health',scroll:0});}} open={row=>{setHealthFocus(row.id);change({tab:'health',scroll:0});}}/>}
       </>}
      </section>}

      <div className="life-calendar-layout" data-details-open={detailsOpen}>
       <div className="min-w-0">{view==='month'
        ?<CalendarMonth days={gridDays} events={dates} selected={selected} today={today} month={month} locale={language} select={setDate}
          open={openEvent} complete={completeCalendarItem} more={date=>{setDate(date);setDetails(true);}}/>
        :view==='list'?<CalendarList days={gridDays} events={dates} locale={language} open={openEvent} select={setDate} complete={completeCalendarItem}/>
        :<CalendarPeriod days={gridDays} events={dates} selected={selected} locale={language} open={openEvent} select={setDate} complete={completeCalendarItem}
          create={!scheduleHidden&&repository?createSchedule:undefined} adjust={repository?(item,start,end)=>void adjustSchedule(item,start,end):undefined}/>}</div>
       {detailsOpen&&<aside id="life-calendar-details" className="life-day-details space-y-3" aria-label="日期詳情">
        <h3 className="font-semibold">{selected.toLocaleDateString(language)} · {t('life.dayItems')}</h3>
        {([
         ['行程',['schedule'],!scheduleHidden&&sources.schedule],
         ['重要日期',['milestones'],!milestonesHidden&&sources.milestones],
         ['任務',['tasks','taskStart','habits'],!tasksHidden&&sources.tasks],
         ['健康管理',['health'],dailyItems.some(item=>item.source==='health')],
         ['財務',['finance'],dailyItems.some(item=>item.source==='finance')],
        ] as const).map(([label,kinds,visible])=>{
         if(!visible)return null;
         const items=dailyItems.filter(item=>(kinds as readonly string[]).includes(item.source));
         const flexible=label==='任務'&&!habitsHidden&&repository&&selected<=today&&calendarFilter!=='once'
          ?legacyHabits.filter(habit=>habit.cadence!=='daily'&&habit.started_on<=localDateInput(selected)
           &&!items.some(item=>item.source==='habits'&&item.sourceId===habit.id)):[];
         const tracked=(habit:Habit)=><div key={habit.id} className="grid gap-1">
          <button type="button" className="text-left text-sm" onClick={()=>setTrackedTask({id:habit.id,date:selected})}>↻ {habit.title}</button>
          {repository&&<HabitCheckIn habit={habit} date={selected} repository={repository}/>}
         </div>;
         return <section key={label} className="grid gap-1"><h4 className="text-sm font-semibold">{label}</h4>
          {!items.length&&!flexible.length&&(label!=='任務'||!flexibleTasks.length)&&<p className="text-xs opacity-65">沒有事項</p>}
          {items.map(item=>{
           const habit=item.source==='habits'?habits.find(row=>row.id===item.sourceId):undefined;
           if(habit)return tracked(habit);
           const series=item.source==='finance'&&!item.completed?finances.find(row=>row.kind==='subscription'&&row.id===item.sourceId):undefined;
           const financeDay=localDateInput(new Date(item.date));
           const scheduled=series?.kind==='subscription'&&series.payload.state==='active'&&financeDay>=series.payload.next;
           const due=scheduled&&financeDay===series.payload.next&&financeDay<=todayInput;
           return <div key={calendarEventKey(item)}>
            <CalendarItem item={item} locale={language} open={openEvent} complete={completeCalendarItem} showTime/>
            {scheduled&&series?.kind==='subscription'&&repository&&<div className="flex flex-wrap gap-1 pl-2">
             {(due?['確認入帳','跳過本期'] as const:['跳過本期'] as const).map(action=><button key={action} type="button" className={button}
              disabled={action==='確認入帳'&&!recurringTerms(series.payload,financeDay).account}
              onClick={async()=>{
               if(!await confirmDialog({title:action,message:financeDay+' · '+recurringTerms(series.payload,financeDay).title}))return;
               try{if(action==='確認入帳')await repository.resolveRecurringFinance(series,todayInput);else await repository.skipRecurringFinance(series,financeDay);}
               catch(error){setEventError(error instanceof Error?error.message:String(error));}
              }}>{action}</button>)}
            </div>}
           </div>;
          })}
          {label==='任務'&&flexibleTasks.map(({task,slot})=><button type="button" key={slot.key} className={button+' text-left'}
           onClick={()=>setInstanceEditor({id:task.id,slot})}>↻ {task.title} · {statusLabels[slot.status]} · {slot.amount}/{slot.settings.goal.target}</button>)}
          {flexible.map(tracked)}
         </section>;
        })}
       </aside>}
      </div>
     </>}

     </>}
    </div>
   </div>
  </div>
 </main>;
}
