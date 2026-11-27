import { useEffect, useRef, useState } from "react";
import { addDays, localDateKey } from "../../lib/todoCalendar";
import { calendarEventClass, calendarEventKey, sortCalendarEvents, type LifeCalendarEvent } from "./calendarSources";
import { statusLabels } from "./taskPlan";
import { layoutTimeline, minutesOnDay } from "./calendarTimeline";

export type CalendarView = "month" | "week" | "day" | "list";

export function calendarWeek(date: Date) {
  const first = addDays(date, -date.getDay());
  return Array.from({ length: 7 }, (_, index) => addDays(first, index));
}

type PeriodProps = {
  days: Date[];
  events: Map<string, LifeCalendarEvent[]>;
  locale: string;
  open: (event: LifeCalendarEvent) => void;
  select: (date: Date) => void;
  complete: (event: LifeCalendarEvent) => void;
};

export function CalendarItem({ item, locale, open, complete, showTime = false }: {
  item: LifeCalendarEvent;
  locale: string;
  open: PeriodProps["open"];
  complete?: PeriodProps["complete"];
  showTime?: boolean;
}) {
  return <div className={"life-calendar-item " + calendarEventClass(item)}>
    {complete && (item.source === "tasks" || item.source === "taskStart") &&
      <input type="checkbox" aria-label={`完成 ${item.title}`} checked={item.completed} onChange={() => complete(item)}/>}
    <button type="button" title={item.title} onClick={() => open(item)}>
      {showTime && !item.allDay && item.startsAt != null && <time>
        {new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(item.startsAt)}{" "}
      </time>}
      {item.recurring && <span aria-label="週期性">↻ </span>}
      {item.source==="tasks"&&item.taskSlot?.dueAt!=null&&<span className="opacity-75">截止 · </span>}{item.title}{item.taskSlot&&item.taskSlot.status!=="pending"&&<span className="opacity-75"> · {statusLabels[item.taskSlot.status]}</span>}
    </button>
  </div>;
}

export function CalendarList({ days, events, locale, open, complete }: PeriodProps) {
  const populated = days.filter(day => events.get(localDateKey(day))?.length);
  return <div className="life-calendar-list">
    {populated.length === 0 && <p className="p-3 text-sm opacity-75">這段期間沒有事項</p>}
    {populated.map(day => <section key={localDateKey(day)}>
      <h3>{day.toLocaleDateString(locale, { weekday: "short", month: "numeric", day: "numeric" })}</h3>
      <div className="grid min-w-0 gap-1">{sortCalendarEvents(events.get(localDateKey(day))!).map(item =>
        <CalendarItem key={calendarEventKey(item)} item={item} locale={locale} open={open} complete={complete} showTime/>)}</div>
    </section>)}
  </div>;
}

type Adjust = (item: LifeCalendarEvent, start: number, end: number) => void;
type Gesture = { x: number; y: number; item: LifeCalendarEvent; day: Date; resize: boolean };
const hourHeight = 48;

export function CalendarPeriod({ days, events, locale, open, select, complete, selected, create, adjust }: PeriodProps & {
  selected: Date;
  create?: (date: Date) => void;
  adjust?: Adjust;
}) {
  const [now, setNow] = useState(() => new Date());
  const scroll = useRef<HTMLDivElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const suppressClick = useRef(false);
  const renderedDays = days.map(day => {
    const items = sortCalendarEvents(events.get(localDateKey(day)) ?? []);
    return { day, allDay: items.filter(item => item.allDay || item.startsAt == null),
      timed: layoutTimeline(items.filter(item => !item.allDay && item.startsAt != null), day) };
  });
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (scroll.current) scroll.current.scrollTop = 8 * hourHeight;
  }, [days.length]);
  return <div className="life-timeline" style={{ "--calendar-days": days.length, "--calendar-hour": hourHeight + "px" } as React.CSSProperties}>
    <div ref={scroll} className="life-timeline-scroll">
      <div className="life-timeline-grid life-timeline-header">
        <div className="life-timeline-gutter">全天</div>
        {renderedDays.map(({ day, allDay }) => <div key={localDateKey(day)} className="life-timeline-heading">
          <button type="button" aria-pressed={localDateKey(selected) === localDateKey(day)}
            aria-current={localDateKey(now) === localDateKey(day) ? "date" : undefined} onClick={() => select(day)}>
            {day.toLocaleDateString(locale, { weekday: "short", day: "numeric" })}
          </button>
          <div className="life-all-day">{allDay.map(item =>
            <CalendarItem key={calendarEventKey(item)} item={item} locale={locale} open={open} complete={complete}/>)}</div>
        </div>)}
      </div>
      <div className="life-timeline-grid">
        <div className="life-timeline-gutter" aria-hidden="true">{Array.from({ length: 24 }, (_, hour) =>
          <div key={hour} style={{ height: hourHeight }}>{String(hour).padStart(2, "0")}:00</div>)}</div>
        {renderedDays.map(({ day, timed }, column) => <div key={localDateKey(day)} className="life-timeline-day" data-calendar-column={column}>
          {Array.from({ length: 24 }, (_, hour) => create &&
            <button type="button" key={hour} aria-label={`新增行程 ${localDateKey(day)} ${hour}:00`}
              className="life-timeline-slot" onClick={event => {
                const date = new Date(day);
                const rect = event.currentTarget.getBoundingClientRect();
                const quarter = event.detail ? Math.max(0, Math.min(3, Math.floor((event.clientY - rect.top) / rect.height * 4))) : 0;
                date.setHours(hour, quarter * 15, 0, 0);
                create(date);
              }}/>)}
          {timed.map(({ item, start, end, lane, lanes }) => {
            const movable = !!adjust && item.source === "schedule" && item.endsAt != null;
            return <div key={calendarEventKey(item)} className="life-timeline-event"
              style={{ top: start / 60 * hourHeight, height: Math.max(18, (end - start) / 60 * hourHeight),
                left: (lane / lanes * 100) + "%", width: (100 / lanes) + "%" }}
              onPointerDown={event => {
                suppressClick.current = false;
                if (!movable || event.button !== 0) return;
                const target = event.target as HTMLElement;
                const resize = target.hasAttribute("data-resize");
                if (event.pointerType !== "mouse" && !resize && !target.hasAttribute("data-move")) return;
                gesture.current = { x: event.clientX, y: event.clientY, item, day, resize };
                target.setPointerCapture(event.pointerId);
              }}
              onPointerCancel={() => { gesture.current = null; }}
              onPointerUp={event => {
                const drag = gesture.current;
                gesture.current = null;
                if (!drag || drag.item !== item || Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 6) return;
                suppressClick.current = true;
                const delta = Math.round((event.clientY - drag.y) / hourHeight * 4) * 15 * 60_000;
                const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-calendar-column]");
                const targetDay = target ? days[Number(target.dataset.calendarColumn)] : drag.day;
                const daysApart = calendarDayDifference(drag.day, targetDay);
                const startAt = item.startsAt!;
                const endAt = item.endsAt!;
                if (drag.resize) adjust?.(item, startAt, Math.max(startAt + 15 * 60_000, endAt + delta));
                else {
                  const next = new Date(startAt);
                  next.setDate(next.getDate() + daysApart);
                  next.setMinutes(next.getMinutes() + delta / 60_000);
                  adjust?.(item, next.getTime(), next.getTime() + endAt - startAt);
                }
              }}>
              <CalendarItem item={item} locale={locale} open={row => { if (!suppressClick.current) open(row); suppressClick.current = false; }} complete={complete} showTime/>
              {movable && <><span data-move aria-hidden="true" className="life-timeline-move">⠿</span>
                <span data-resize aria-hidden="true" className="life-timeline-resize"/></>}
            </div>;
          })}
          {localDateKey(day) === localDateKey(now) && <span className="life-timeline-now" style={{ top: minutesOnDay(now.getTime()) / 60 * hourHeight }}/>}
        </div>)}
      </div>
    </div>
  </div>;
}

function calendarDayDifference(from: Date, to: Date) {
  const civil = (day: Date) => Date.UTC(day.getFullYear(), day.getMonth(), day.getDate());
  return (civil(to) - civil(from)) / 86_400_000;
}
