import { localDateKey } from "../../lib/todoCalendar";
import { calendarEventKey, sortCalendarEvents, type LifeCalendarEvent } from "./calendarSources";
import { CalendarItem } from "./CalendarPeriod";

export default function CalendarMonth({ days, events, selected, today, month, locale, select, open, complete, more }: {
  days: Date[]; events: Map<string, LifeCalendarEvent[]>; selected: Date; today: Date; month: Date; locale: string;
  select: (date: Date) => void; open: (event: LifeCalendarEvent) => void;
  complete: (event: LifeCalendarEvent) => void; more: (date: Date) => void;
}) {
  const selectedKey = localDateKey(selected), todayKey = localDateKey(today);
  const weekday = new Intl.DateTimeFormat(locale, { weekday: "short" });
  return <div className="life-month">
    <div className="life-month-weekdays">{days.slice(0, 7).map(day =>
      <span key={localDateKey(day)}>{weekday.format(day)}</span>)}</div>
    <div className="life-month-grid" style={{ gridTemplateRows: `repeat(${days.length / 7}, minmax(96px, 1fr))` }}>
      {days.map(date => {
        const key = localDateKey(date);
        const items = sortCalendarEvents(events.get(key) ?? []);
        return <div key={key} className="life-month-cell" data-outside={date.getMonth() !== month.getMonth()}
          data-selected={key === selectedKey} onClick={event => { if (event.target === event.currentTarget) select(date); }}>
          <button data-calendar-day type="button" className="life-month-date"
            aria-label={`${date.toLocaleDateString(locale)} · ${items.length} 筆事項`}
            aria-pressed={key === selectedKey} aria-current={key === todayKey ? "date" : undefined} onClick={() => select(date)}>
            <span>{date.getDate()}</span>
          </button>
          {items.slice(0, 2).map(item =>
            <CalendarItem key={calendarEventKey(item)} item={item} locale={locale} open={open} complete={complete} showTime/>)}
          {items.length > 2 && <button type="button" className="life-month-more" onClick={() => more(date)}>＋{items.length - 2} 筆</button>}
        </div>;
      })}
    </div>
  </div>;
}
