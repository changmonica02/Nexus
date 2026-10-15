"use client";
import FeatureIcon from "./FeatureIcon";
import PageCollection,{type PageActions} from "./PageCollection";
import { useState, useMemo } from "react";
import type { Page } from "../lib/types";
import { useLanguage } from "../lib/LanguageContext";

function startOfMonth(date: Date) { return new Date(date.getFullYear(), date.getMonth(), 1); }
function endOfMonth(date: Date) { return new Date(date.getFullYear(), date.getMonth() + 1, 0); }
function addDays(date: Date, days: number) { const d = new Date(date); d.setDate(d.getDate() + days); return d; }

export default function TodoView({
  pages,
  onCreate,
  onUpdate,
  onDelete,
  onSelectPage,
  onRenamePage,onDuplicatePage,
}: PageActions & {
  pages: Page[];
  onCreate: (title: string, dueDate?: number) => void;
  onUpdate: (id: string, patch: Partial<Page>) => void;
  onDelete: (id: string) => void;
  onSelectPage: (id: string) => void;
}) {
  const { t } = useLanguage();
  const [input, setInput] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  const todos = useMemo(() => pages.filter((p) => (p.kind as any) === "todo").sort((a, b) => (a.due_date || 0) - (b.due_date || 0)), [pages]);

  const today = new Date();
  today.setHours(0,0,0,0);

  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days: Date[] = [];
    const startWeekday = start.getDay();
    for (let i = 0; i < startWeekday; i++) days.push(addDays(start, -startWeekday + i));
    for (let d = new Date(start); d <= end; d = addDays(d, 1)) days.push(new Date(d));
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) days.push(addDays(end, i));
    return days;
  }, [currentMonth]);

  const todosByDate = useMemo(() => {
    const map = new Map<string, Page[]>();
    todos.forEach((todo) => {
      if (!todo.due_date) return;
      const d = new Date(todo.due_date);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(todo);
    });
    return map;
  }, [todos]);

  const handleAdd = () => {
    const title = input.trim();
    if (!title) return;
    onCreate(title, selectedDate.getTime());
    setInput("");
  };

  return (
    <main className="flex flex-col flex-1 overflow-hidden" style={{ backgroundColor: "var(--color-editor-bg)" }}>
      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
        {/* Calendar */}
        <div className="min-w-0 flex-1 p-3 sm:p-6 lg:overflow-y-auto">
          <div className="max-w-[700px] mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-semibold"><FeatureIcon feature="calendar"/> {t("todo.title")}</h1>
              <div className="flex items-center gap-2">
                <button onClick={() => setCurrentMonth(addDays(startOfMonth(currentMonth), -30))} className="rounded border px-2 py-1 text-xs hover:bg-zinc-100">←</button>
                <span className="text-sm font-medium">{currentMonth.getFullYear()} / {currentMonth.getMonth() + 1}</span>
                <button onClick={() => setCurrentMonth(addDays(startOfMonth(currentMonth), 32))} className="rounded border px-2 py-1 text-xs hover:bg-zinc-100">→</button>
              </div>
            </div>

            <div className="mb-4 rounded-xl border p-3 flex gap-2" style={{ backgroundColor: "var(--color-bg)", borderColor: "var(--color-border)" }}>
              <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAdd()} placeholder={`新增任務到 ${selectedDate.toLocaleDateString()}`} className="flex-1 bg-transparent outline-none text-sm" />
              <button onClick={handleAdd} className="rounded-md px-4 py-1.5 text-sm bg-zinc-800 text-white hover:bg-zinc-700">新增</button>
            </div>

            <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-bg)" }}>
              <div className="grid grid-cols-7 text-[11px] opacity-60 border-b p-2" style={{ borderColor: "var(--color-border)" }}>
                {["日","一","二","三","四","五","六"].map((d) => <div key={d} className="text-center">{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-px bg-zinc-200">
                {calendarDays.map((d, i) => {
                  const isCurrentMonth = d.getMonth() === currentMonth.getMonth();
                  const isToday = d.toDateString() === new Date().toDateString();
                  const isSelected = d.toDateString() === selectedDate.toDateString();
                  const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
                  const dayTodos = todosByDate.get(key) || [];
                  return (
                    <div key={i} onClick={() => setSelectedDate(d)} className={`min-h-[80px] p-1.5 bg-white cursor-pointer hover:bg-zinc-50 ${!isCurrentMonth ? "opacity-30" : ""} ${isSelected ? "ring-2 ring-blue-400 ring-inset" : ""} ${isToday ? "bg-blue-50" : ""}`}>
                      <div className="text-xs font-medium">{d.getDate()}</div>
                      <div className="mt-1 space-y-0.5">
                        {dayTodos.slice(0,3).map((td) => (
                          <div key={td.id} className={`text-[10px] truncate rounded px-1 py-0.5 ${td.completed ? "bg-green-100 text-green-700 line-through" : "bg-amber-100 text-amber-800"}`}>{td.title}</div>
                        ))}
                        {dayTodos.length > 3 && <div className="text-[9px] opacity-50">+{dayTodos.length - 3} 更多</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-sm font-semibold mb-2"><FeatureIcon feature="calendar"/> {selectedDate.toLocaleDateString()} 的任務</h3>
              <PageCollection pages={todos.filter(td=>td.due_date&&new Date(td.due_date).toDateString()===selectedDate.toDateString())} initialView="list" initialSort="due_date" initialAscending viewStorageKey="nexus-calendar-items-view" sortOptions={['due_date','updated_at','title','created_at']} onSelectPage={onSelectPage} onRenamePage={onRenamePage} onDuplicatePage={onDuplicatePage} onDeletePage={onDelete} leadingControl={td=><input aria-label={t('ui.completeTask',{name:td.title})} type="checkbox" checked={!!td.completed} onChange={e=>onUpdate(td.id,{completed:e.target.checked})}/>}/>

            </div>
          </div>
        </div>

        {/* Right: Todo list overview */}
        <div className="w-full shrink-0 border-t p-4 space-y-4 lg:w-[280px] lg:border-t-0 lg:border-l lg:overflow-y-auto" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-sidebar-bg)" }}>
          <div>
            <h4 className="text-xs font-semibold uppercase opacity-60 mb-2">今天</h4>
            {todos.filter((td) => td.due_date && new Date(td.due_date).toDateString() === new Date().toDateString() && !td.completed).length === 0 ? <div className="text-xs opacity-40">無</div> :
              todos.filter((td) => td.due_date && new Date(td.due_date).toDateString() === new Date().toDateString() && !td.completed).map((td) => (
                <div key={td.id} className="text-xs p-2 rounded bg-white border mb-1 truncate">{td.title}</div>
              ))}
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase opacity-60 mb-2">即將到來</h4>
            {todos.filter((td) => !td.completed).slice(0,5).map((td) => (
              <div key={td.id} className="text-xs p-2 rounded bg-white border mb-1 flex justify-between"><span className="truncate">{td.title}</span><span className="opacity-40 text-[10px]">{td.due_date ? new Date(td.due_date).toLocaleDateString() : ""}</span></div>
            ))}
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase opacity-60 mb-2">已完成</h4>
            {todos.filter((td) => td.completed).slice(0,5).map((td) => (
              <div key={td.id} className="text-xs p-2 rounded bg-zinc-100 border mb-1 line-through opacity-60">{td.title}</div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
