import { evaluateFormula } from "../listConfiguration";
import { HeartPulse } from "lucide-react";
import { localDateInput } from "../../../lib/todoCalendar";
import { civilAdvance } from "../civilPeriods";
import { latest, progress, totals, value } from "../health/summary";
import type { HealthRecord } from "../health/model";
import FinanceCard from "../finance/FinanceCard";
import { financeCardSection, isFinanceCard } from "../finance/cardCatalog";
import { financeRows, type FinanceRecord } from "../finance/model";
import { Wallet } from "lucide-react";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ListChecks, List, Settings2, Timer } from "lucide-react";
import { useLanguage } from "../../../lib/LanguageContext";
import { timerModes, timerStatus, type TimerState } from "../LifeTimer";
import { MilestoneRow } from "../Milestones";
import { schedulePeriodMatches } from "../calendarSources";
import { scheduleLabel } from "../SchedulePanel";
import { habitQuantity, habitStats } from "../habits";
import type { Habit, ScheduleEvent } from "../syncRecords";
import type { Page } from "../../../lib/types";
import { useUnsavedDraft } from "../../dictionary/useUnsavedDraft";
import { emptyLife } from "../lists";
import { cardRegistry, dateMatches, lifeModules, periods, selectTasks, type LifeDashboardConfig, type LifeModule } from "./model";
import { control, surface } from "./styles";
import type { useLifeDashboard } from "./useLifeDashboard";

const DashboardEditor = lazy(() => import("./DashboardEditor"));
const iconByModule = { finance: Wallet, health: HeartPulse, calendar: CalendarDays, schedule: CalendarDays, milestones: CalendarDays, habits: ListChecks, timer: Timer, tasks: ListChecks, lists: List };
const cardWidths = { small: "", medium: "@3xl/life:col-span-2", large: "col-span-full" };
const itemLimits = { small: 2, medium: 5, large: 10 };

export default function LifeOverview({ dashboard, todos, anchor, today, timer, events, milestones, habits, finances, health, healthShared, openSchedule, selectedId, onSelectBoard, openModule, openTask, toggleTask }: {
  dashboard: ReturnType<typeof useLifeDashboard>;
  todos: Page[];
  anchor: Date;
  today: Date;
  timer: TimerState;
  events: ScheduleEvent[];
  milestones: ScheduleEvent[];
  habits: Habit[];
  finances: FinanceRecord[];
  health: HealthRecord[];
  healthShared: boolean;
  openSchedule: (event: ScheduleEvent) => void;
  selectedId?: string;
  onSelectBoard: (id: string) => void;
  openModule: (module: LifeModule, quick?: boolean) => void;
  openTask: (id: string) => void;
  toggleTask: (id: string, completed: boolean) => void;
}) {
  const { language } = useLanguage();
  const { config, repository, ready } = dashboard;
  const [baseline, setBaseline] = useState<LifeDashboardConfig>();
  const editing = !!baseline;
  const heading = useRef<HTMLHeadingElement>(null);
  const [clock, setClock] = useState(Date.now);
  const [saving, setSaving] = useState(false);
  const saveInProgress = useRef(false);
  const [saveError, setSaveError] = useState("");
  const [life, setLife] = useState(emptyLife);
  const [listStatus, setListStatus] = useState<"loading" | "ready" | "error">("loading");
  useUnsavedDraft(editing, saving);

  const board = config.boards.find(board => board.id === selectedId) ?? config.boards.find(board => board.id === config.defaultId) ?? config.boards[0];
  const financeSections = financeRows(finances,"preferences")[0]?.payload.hiddenSections ?? [];
  const shown = board.cards.filter(card => (card.type !== "health" || healthShared) && (!isFinanceCard(card.type) || !financeSections.some(section=>section===financeCardSection[card.type as keyof typeof financeCardSection])) && !card.hidden && !config.hiddenModules.includes(cardRegistry[card.type].module)
    && (!["lists", "schedule", "milestones", "habits"].includes(card.type) || repository) && (card.type !== "calendar" || !config.hiddenModules.includes("tasks") || events.length > 0 || milestones.length > 0));
  const showTimer = shown.some(card => card.type === "timer");
  useEffect(() => {
    if (!showTimer || timer.startedAt === null) return;
    const interval = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [showTimer, timer.startedAt]);
  const needsLists = !!repository && (editing || shown.some(card => card.type === "lists"));

  useEffect(() => {
    if (!repository || !needsLists) return;
    let active = true;
    let sequence = 0;
    const load = () => {
      const request = ++sequence;
      void repository.read().then(data => {
        if (!active || request !== sequence) return;
        setLife(data);
        setListStatus("ready");
      }).catch(() => { if (active && request === sequence) setListStatus("error"); });
    };
    load();
    window.addEventListener("nexus-workspace-changed", load);
    window.addEventListener("nexus-workspace-refreshed", load);
    return () => {
      active = false;
      window.removeEventListener("nexus-workspace-changed", load);
      window.removeEventListener("nexus-workspace-refreshed", load);
    };
  }, [repository, needsLists]);

  const lists = useMemo(() => life.life_lists.filter(list => list.deleted_at == null), [life]);
  const items = useMemo(() => {
    const activeLists = new Set(lists.map(list => list.id));
    return life.life_items.filter(item => item.deleted_at == null && activeLists.has(item.list_id))
      .sort((a, b) => b.updated_at - a.updated_at || a.id.localeCompare(b.id));
  }, [life, lists]);

  return <section className="@container/life space-y-4" aria-label="生活總覽" data-life-overview>
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-sm opacity-75">{anchor.toLocaleDateString(language, { year: "numeric", month: "long", day: "numeric", weekday: "long" })}</p>
        <h2 ref={heading} className="text-2xl font-semibold">我的生活</h2>
      </div>
      {ready && !editing && <div className="flex flex-wrap gap-2">
        <select aria-label="使用中的儀表板" className={control} value={board.id} onChange={event => onSelectBoard(event.target.value)}>
          {config.boards.map(board => <option key={board.id} value={board.id}>{board.name}</option>)}
        </select>
        <button type="button" className={control + " inline-flex items-center gap-2"} onClick={() => setBaseline(config)}>
          <Settings2 size={17} aria-hidden="true"/>自訂
        </button>
      </div>}
    </div>
    {dashboard.error ? <div role="alert">{dashboard.error} <button className={control} onClick={dashboard.retry}>重試</button></div>
      : !ready && <p role="status">正在載入儀表板…</p>}
    {saveError && <p role="alert">{saveError}</p>}
    {dashboard.conflict && !editing && <div className={surface} role="status">
      <p>這台裝置與雲端各有修改。選擇要採用的預設與模組設定，兩邊有差異的配置都會保留。</p>
      <div className="mt-2 flex flex-wrap gap-2">{[true, false].map(local =>
        <button key={String(local)} className={control} onClick={() => {
          setSaveError("");
          void dashboard.resolve(local).catch(error => setSaveError(String(error.message)));
        }}>{local ? "採用本機設定" : "採用雲端設定"}</button>)}</div>
    </div>}
    {editing && <Suspense fallback={<p role="status">正在載入編輯器…</p>}>
      <DashboardEditor config={baseline} activeId={board.id} lists={lists} hasLists={!!repository} busy={saving}
        financeSections={financeSections}
        eventSources={{
          schedule: [...new Set(events.map(event => event.category).filter(Boolean))].sort().map(title => ({ id: title, title })),
          milestones, habits,
        }}
        onCancel={() => { setBaseline(undefined); setSaveError(""); heading.current?.scrollIntoView({ block: "start" }); }}
        onSave={async (next, activeId) => {
          if (saveInProgress.current) return;
          saveInProgress.current = true;
          setSaving(true);
          setSaveError("");
          try {
            if (baseline) await dashboard.save(next, baseline);
            onSelectBoard(activeId);
            setBaseline(undefined);
            heading.current?.scrollIntoView({ block: "start" });
          } catch (error) {
            setSaveError(error instanceof Error ? error.message : "儀表板儲存失敗，請重試。");
          } finally {
            saveInProgress.current = false;
            setSaving(false);
          }
        }}/>
    </Suspense>}
    {ready && !editing && <>
      {(!config.hiddenModules.includes("tasks") || repository && !config.hiddenModules.includes("schedule")) && <section className="rounded-2xl bg-[#2e483c] p-5 text-white">
        <h3 className="text-lg font-semibold">當日摘要</h3>
        <div className="mt-3 flex flex-wrap items-center gap-x-8 gap-y-2">
          {!config.hiddenModules.includes("tasks") && <span>待完成 <strong className="text-xl">{todos.filter(todo => !todo.completed && dateMatches(todo.due_date, "day", anchor)).length}</strong></span>}
          {!config.hiddenModules.includes("calendar") && <span>月曆事項 <strong className="text-xl">{(config.hiddenModules.includes("tasks") ? 0 : todos.filter(todo => dateMatches(todo.due_date, "day", anchor)).length) + [...events, ...milestones].filter(event => schedulePeriodMatches(event, "day", anchor)).length}</strong></span>}
          {!config.hiddenModules.includes("tasks") && <button type="button" className="min-h-11 rounded-lg border border-white/50 px-3" onClick={() => openModule("tasks", true)}>＋ 新增任務</button>}
          {repository && !config.hiddenModules.includes("schedule") && <button type="button" className="min-h-11 rounded-lg border border-white/50 px-3" onClick={() => openModule("schedule", true)}>＋ 新增行程</button>}
          {repository && !config.hiddenModules.includes("lists") && <button type="button" className="min-h-11 rounded-lg border border-white/50 px-3" onClick={() => openModule("lists", true)}>＋ 新增清單</button>}
        </div>
      </section>}
      {config.hiddenModules.includes("tasks") && config.hiddenModules.includes("schedule") && repository && !config.hiddenModules.includes("lists") &&
        <button type="button" className={control} onClick={() => openModule("lists", true)}>＋ 新增清單</button>}
      {!shown.length && <p className={surface}>這組儀表板沒有顯示中的卡片。選擇「自訂」即可新增卡片或重新啟用模組。</p>}
      <div className="grid auto-rows-min grid-cols-1 gap-4 @lg/life:grid-cols-2 @3xl/life:grid-cols-4">
        {shown.map(card => {
          const source = cardRegistry[card.type].module;
          const Icon = iconByModule[source];
          if (card.type === "health") {
            const day = localDateInput(anchor);
            const month = day.slice(0,7)+"-01";
            const from = card.period==="all"?"0001-01-01":card.period==="month"?month:day;
            const to = card.period==="all"?"9999-12-31":card.period==="month"?civilAdvance(month,"month",1):civilAdvance(day,"day",card.period==="week"?7:1);
            const result = totals(health,from,to);
            const stats = [["最新體重", latest(health,"weight",day), "kg"],["飲水", result.water, "mL"], ["睡眠平均",result.sleep,"小時"],["運動",result.minutes,"分鐘"],["已知熱量",result.nutrients.kcal.amount,"kcal"]] as const;
            return <article key={card.id} className={surface+" "+cardWidths[card.size]} data-size={card.size}>
              <h3 className="flex items-center gap-2 font-semibold"><HeartPulse size={18} aria-hidden="true"/>{card.title.trim()||"健康摘要"}</h3>
              {stats.every(([,amount])=>amount===null)&&<p className="my-2">這段期間沒有可顯示的健康紀錄。</p>}
              {stats.filter(([,amount])=>amount!==null).map(([label,amount,unit])=><p key={label} className="my-2">{label} · {value(amount,unit)}</p>)}
              {health.some(row=>row.kind==="cycle")&&<p className="my-2">已有經期紀錄</p>}
              {health.some(row=>row.kind==="medication")&&<p className="my-2">已有用藥項目</p>}
              {health.filter(row=>row.kind==="goal").slice(0,itemLimits[card.size]).map(row=>{
                const ratio=progress(health,row,day).ratio;
                return <p className="my-2 break-words" key={row.id}>{String(row.data.title)} · {value(ratio,"%")}</p>;
              })}
              <button className={control+" mt-2"} type="button" onClick={()=>openModule("health")}>開啟健康管理</button>
            </article>;
          }
          if (isFinanceCard(card.type)) return <article key={card.id} className={surface + " " + cardWidths[card.size]} data-size={card.size}>
            <h3 className="mb-2 flex items-center gap-2 font-semibold"><Wallet size={18} aria-hidden="true"/>{card.title.trim() || cardRegistry[card.type].title}</h3>
            <FinanceCard card={card} records={finances} anchor={anchor}/>
            <button className={control+" mt-3"} type="button" onClick={()=>openModule("finance")}>開啟財務</button>
          </article>;
          if (card.type === "timer") return <article key={card.id} className={surface + " " + cardWidths[card.size]} data-size={card.size}>
            <h3 className="flex items-center gap-2 font-semibold"><Timer size={18} aria-hidden="true"/>{card.title.trim() || "計時工具"}</h3>
            <p className="my-2">{timerModes[timer.mode]} · {timerStatus(timer, clock)}</p>
            <button className={control} type="button" onClick={() => openModule("timer")}>開啟計時工具</button>
          </article>;
          const tasks = card.type === "lists" || card.type === "schedule" || card.type === "milestones" || card.type === "habits" || config.hiddenModules.includes("tasks") ? [] : selectTasks(todos, card, anchor, today);
          const schedule = card.type === "schedule" || card.type === "calendar" && card.status === "all"
            ? events.filter(event => (!card.listId || card.listId === event.category) && schedulePeriodMatches(event, card.period, anchor)) : [];
          const importantDates = card.type === "milestones" || card.type === "calendar" && card.status === "all"
            ? milestones.filter(event => (!card.listId || card.listId === event.id) && schedulePeriodMatches(event, card.period, anchor)) : [];
          const selectedList=card.type==="lists"?lists.find(list=>list.id===card.listId):undefined;
          const preset=selectedList?.configuration?.statistics?.find(item=>item.id===card.statisticId);
          const dateField=selectedList?.fields.find(field=>!field.archived&&field.type==="date");
          const records = card.type === "lists" ? items.filter(item=>{
            if(card.listId&&item.list_id!==card.listId)return false;
            if(!preset)return dateMatches(item.created_at,card.period,anchor);
            const day=dateField?String(item.values[dateField.id]??""):localDateInput(new Date(item.created_at));
            return (!preset.start||day>=preset.start)&&(!preset.end||!!day&&day<=preset.end);
          }):[];
          const statistic=selectedList?.fields.find(field=>!field.archived&&field.id===preset?.field);
          const selectedValues=statistic?records.map(item=>statistic.formula?evaluateFormula(statistic.formula,item.values):item.values[statistic.id]):[];
          const numeric=selectedValues.filter((value):value is number=>typeof value==="number"&&Number.isFinite(value));
          const total=numeric.reduce((sum,value)=>sum+value,0);
          const checked=selectedValues.filter(value=>value===true).length;
          const checkCount=selectedValues.filter(value=>typeof value==="boolean").length;
          const habitRows = card.type === "habits" ? habits.filter(habit => !card.listId || card.listId === habit.id).map(habit => ({
            habit, total: Object.entries(habit.quantities).reduce((sum, [date, quantity]) =>
              dateMatches(new Date(date + "T00:00:00").getTime(), card.period, anchor) ? sum + quantity : sum, 0),
          })) : [];
          const count = card.type === "habits" ? habitRows.length : card.type === "lists" ? records.length : tasks.length + schedule.length + importantDates.length;
          const limit = itemLimits[card.size];
          return <article key={card.id} className={surface + " " + cardWidths[card.size]} data-size={card.size}>
            <div className="flex items-start gap-2">
              <Icon size={18} className="mt-1 shrink-0 text-[var(--life-accent)]" aria-hidden="true"/>
              <h3 className="min-w-0 break-all font-semibold">{card.title.trim() || cardRegistry[card.type].title}</h3>
            </div>
            <p className="text-sm opacity-75">{preset?preset.title:periods[card.period]}{!preset&&card.type === "lists" && card.period !== "all" ? "・依建立日期" : ""}</p>
            {card.type === "calendar" && <p className="text-sm opacity-75">來源為行程、任務截止及重要日期</p>}
            {card.type === "lists" && card.listId && listStatus === "ready" && <p className="break-all text-sm">{lists.find(list => list.id === card.listId)?.title ?? "原清單無法使用"}</p>}
            {card.type === "lists" && listStatus !== "ready" ? <p role="status">{listStatus === "error" ? "無法讀取清單。" : "正在載入清單…"}</p> : <>
              <p className="my-2 text-2xl font-semibold">{count}<span className="ml-1 text-sm font-normal">筆</span></p>
              {!!numeric.length&&<p>加總 {total.toLocaleString(language)} · 平均 {(total/numeric.length).toLocaleString(language)}</p>}
              {!!checkCount&&<p>完成 {checked}/{checkCount} · {Math.round(checked/checkCount*100)}%</p>}
              {!count && <p className="text-sm opacity-75">這段期間沒有符合條件的項目。</p>}
              {card.content === "items" && count > 0 && <ul className="divide-y divide-[var(--color-border)]">
                {tasks.slice(0, limit).map(task => <li key={task.id} className="flex min-h-11 items-center gap-2">
                  {!config.hiddenModules.includes("tasks") && <input type="checkbox" className="m-1 size-5 shrink-0" aria-label={`完成任務 ${task.title}`}
                    checked={!!task.completed} onChange={event => toggleTask(task.id, event.target.checked)}/>}
                  <button type="button" className={"min-h-11 min-w-0 break-all text-left " + (task.completed ? "line-through opacity-75" : "")} onClick={() => openTask(task.id)}>
                    {task.title}{task.due_date != null && <small className="ml-2 opacity-75">{new Date(task.due_date).toLocaleDateString(language)}</small>}
                  </button>
                </li>)}
                {schedule.slice(0, Math.max(0, limit - tasks.length)).map(event => <li key={event.id}>
                  <button type="button" className="min-h-11 w-full break-words text-left" onClick={() => openSchedule(event)}>
                    {event.title}<small className="ml-2 opacity-75">{scheduleLabel(event, language)}</small>
                  </button></li>)}
                {habitRows.slice(0, limit).map(({ habit, total }) => <li key={habit.id} className="py-2">
                  <button type="button" className="min-h-11 w-full break-words text-left" onClick={() => openModule("habits")}>
                    <strong>{habit.title}</strong>
                    <span className="block text-sm opacity-75">期間紀錄 {total} ・{habit.cadence === "weekly" ? "當週" : "當日"} {habitQuantity(habit, anchor)}/{habit.goal}
                      ・連續 {habitStats(habit, today).streak} {habit.cadence === "weekly" ? "週" : "天"}</span>
                  </button></li>)}
                {importantDates.slice(0, Math.max(0, limit - tasks.length - schedule.length)).map(event => <li key={event.id} className="py-1">
                  <MilestoneRow event={event} anchor={anchor} open={() => openSchedule(event)}/>
                </li>)}
                {records.slice(0, limit).map(item => <li key={item.id} className="break-all py-2">{item.title}</li>)}
                {count > limit && <li className="py-2 text-sm opacity-75">另有 {count - limit} 筆</li>}
              </ul>}
            </>}
            <button type="button" className={control + " mt-3"} onClick={() => openModule(source)}>開啟{lifeModules[source].label}</button>
          </article>;
        })}
      </div>
    </>}
  </section>;
}
