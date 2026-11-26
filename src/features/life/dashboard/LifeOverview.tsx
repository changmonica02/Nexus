import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ListChecks, List, Settings2 } from "lucide-react";
import { useLanguage } from "../../../lib/LanguageContext";
import type { Page } from "../../../lib/types";
import { useUnsavedDraft } from "../../dictionary/useUnsavedDraft";
import { emptyLife } from "../lists";
import { cardRegistry, dateMatches, lifeModules, periods, selectTasks, type LifeModule } from "./model";
import { control, surface } from "./styles";
import type { useLifeDashboard } from "./useLifeDashboard";

const DashboardEditor = lazy(() => import("./DashboardEditor"));
const iconByModule = { calendar: CalendarDays, tasks: ListChecks, lists: List };
const cardWidths = { small: "", medium: "@lg/life:col-span-2", large: "col-span-full" };
const itemLimits = { small: 2, medium: 5, large: 10 };

export default function LifeOverview({ dashboard, todos, anchor, today, selectedId, onSelectBoard, openModule, openTask, toggleTask }: {
  dashboard: ReturnType<typeof useLifeDashboard>;
  todos: Page[];
  anchor: Date;
  today: Date;
  selectedId?: string;
  onSelectBoard: (id: string) => void;
  openModule: (module: LifeModule, quick?: boolean) => void;
  openTask: (id: string) => void;
  toggleTask: (id: string, completed: boolean) => void;
}) {
  const { language } = useLanguage();
  const { config, repository, ready } = dashboard;
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const saveInProgress = useRef(false);
  const [saveError, setSaveError] = useState("");
  const [life, setLife] = useState(emptyLife);
  const [listStatus, setListStatus] = useState<"loading" | "ready" | "error">("loading");
  useUnsavedDraft(editing, saving);

  const board = config.boards.find(board => board.id === selectedId) ?? config.boards.find(board => board.id === config.defaultId) ?? config.boards[0];
  const shown = board.cards.filter(card => !card.hidden && !config.hiddenModules.includes(cardRegistry[card.type].module)
    && (card.type !== "lists" || repository) && (card.type !== "calendar" || !config.hiddenModules.includes("tasks")));
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
    return () => {
      active = false;
      window.removeEventListener("nexus-workspace-changed", load);
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
        <h2 className="text-2xl font-semibold">我的生活</h2>
      </div>
      {ready && !editing && <div className="flex flex-wrap gap-2">
        <select aria-label="使用中的儀表板" className={control} value={board.id} onChange={event => onSelectBoard(event.target.value)}>
          {config.boards.map(board => <option key={board.id} value={board.id}>{board.name}</option>)}
        </select>
        <button type="button" className={control + " inline-flex items-center gap-2"} onClick={() => setEditing(true)}>
          <Settings2 size={17} aria-hidden="true"/>自訂
        </button>
      </div>}
    </div>
    {dashboard.error ? <div role="alert">{dashboard.error} <button className={control} onClick={dashboard.retry}>重試</button></div>
      : !ready && <p role="status">正在載入儀表板…</p>}
    {saveError && <p role="alert">{saveError}</p>}
    {editing && <Suspense fallback={<p role="status">正在載入編輯器…</p>}>
      <DashboardEditor config={config} activeId={board.id} lists={lists} hasLists={!!repository} busy={saving}
        onCancel={() => { setEditing(false); setSaveError(""); }}
        onSave={async (next, activeId) => {
          if (saveInProgress.current) return;
          saveInProgress.current = true;
          setSaving(true);
          setSaveError("");
          try {
            await dashboard.save(next);
            onSelectBoard(activeId);
            setEditing(false);
          } catch {
            setSaveError("儀表板儲存失敗，請重試。");
          } finally {
            saveInProgress.current = false;
            setSaving(false);
          }
        }}/>
    </Suspense>}
    {ready && !editing && <>
      {!config.hiddenModules.includes("tasks") && <section className="rounded-2xl bg-[#2e483c] p-5 text-white">
        <h3 className="text-lg font-semibold">當日摘要</h3>
        <div className="mt-3 flex flex-wrap items-center gap-x-8 gap-y-2">
          <span>待完成 <strong className="text-xl">{todos.filter(todo => !todo.completed && dateMatches(todo.due_date, "day", anchor)).length}</strong></span>
          {!config.hiddenModules.includes("calendar") && <span>月曆事項 <strong className="text-xl">{todos.filter(todo => dateMatches(todo.due_date, "day", anchor)).length}</strong></span>}
          <button type="button" className="min-h-11 rounded-lg border border-white/50 px-3" onClick={() => openModule("tasks", true)}>＋ 新增任務</button>
          {repository && !config.hiddenModules.includes("lists") && <button type="button" className="min-h-11 rounded-lg border border-white/50 px-3" onClick={() => openModule("lists", true)}>＋ 新增清單</button>}
        </div>
      </section>}
      {config.hiddenModules.includes("tasks") && repository && !config.hiddenModules.includes("lists") &&
        <button type="button" className={control} onClick={() => openModule("lists", true)}>＋ 新增清單</button>}
      {!shown.length && <p className={surface}>這組儀表板沒有顯示中的卡片。選擇「自訂」即可新增卡片或重新啟用模組。</p>}
      <div className="grid grid-cols-1 gap-3 @lg/life:grid-cols-2 @3xl/life:grid-cols-3">
        {shown.map(card => {
          const source = cardRegistry[card.type].module;
          const Icon = iconByModule[source];
          const tasks = card.type === "lists" ? [] : selectTasks(todos, card, anchor, today);
          const records = card.type === "lists" ? items.filter(item =>
            (!card.listId || item.list_id === card.listId) && dateMatches(item.created_at, card.period, anchor)) : [];
          const count = card.type === "lists" ? records.length : tasks.length;
          const limit = itemLimits[card.size];
          return <article key={card.id} className={surface + " " + cardWidths[card.size]} data-size={card.size}>
            <div className="flex items-start gap-2">
              <Icon size={18} className="mt-1 shrink-0 text-[var(--life-accent)]" aria-hidden="true"/>
              <h3 className="min-w-0 break-all font-semibold">{card.title.trim() || cardRegistry[card.type].title}</h3>
            </div>
            <p className="text-sm opacity-75">{periods[card.period]}{card.type === "lists" && card.period !== "all" ? "・依建立日期" : ""}</p>
            {card.type === "calendar" && <p className="text-sm opacity-75">來源為有日期的任務</p>}
            {card.type === "lists" && card.listId && listStatus === "ready" && <p className="break-all text-sm">{lists.find(list => list.id === card.listId)?.title ?? "原清單無法使用"}</p>}
            {card.type === "lists" && listStatus !== "ready" ? <p role="status">{listStatus === "error" ? "無法讀取清單。" : "正在載入清單…"}</p> : <>
              <p className="my-2 text-2xl font-semibold">{count}<span className="ml-1 text-sm font-normal">筆</span></p>
              {!count && <p className="text-sm opacity-75">這段期間沒有符合條件的項目。</p>}
              {card.content === "items" && count > 0 && <ul className="divide-y divide-[var(--color-border)]">
                {tasks.slice(0, limit).map(task => <li key={task.id} className="flex min-h-11 items-center gap-2">
                  {!config.hiddenModules.includes("tasks") && <input type="checkbox" className="m-1 size-5 shrink-0" aria-label={`完成任務 ${task.title}`}
                    checked={!!task.completed} onChange={event => toggleTask(task.id, event.target.checked)}/>}
                  <button type="button" className={"min-h-11 min-w-0 break-all text-left " + (task.completed ? "line-through opacity-75" : "")} onClick={() => openTask(task.id)}>
                    {task.title}{task.due_date != null && <small className="ml-2 opacity-75">{new Date(task.due_date).toLocaleDateString(language)}</small>}
                  </button>
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
