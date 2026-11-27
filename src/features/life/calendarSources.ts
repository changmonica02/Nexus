import { scheduleOccurrences, yearlyMilestoneRule } from "./scheduleRecurrence";
import { habitQuantity } from "./habits";
import type { Habit } from "./syncRecords";
import { localDateInput, localDateKey } from "../../lib/todoCalendar";
import type { Page } from "../../lib/types";

export type LifeCalendarEvent = {
  source: "tasks" | "taskStart" | "schedule" | "milestones" | "habits" | "finance" | "health";
  sourceId: string;
  date: number;
  title: string;
  completed: boolean;
  allDay?: boolean;
  startsAt?: number;
  endsAt?: number;
  recurring?: boolean;
  occurrence?: string;
};

export function taskCalendarEvents(pages: Page[]): LifeCalendarEvent[] {
  return pages.flatMap(page => {
    if (page.kind !== "todo" || page.deleted_at != null) return [];
    const events: LifeCalendarEvent[] = [];
    const start = page.task_start_at;
    const due = page.due_date;
    if (start != null) events.push({
      source: "taskStart", sourceId: page.id, date: start, title: page.title, completed: !!page.completed,
      recurring: !!page.task_repeat, allDay: due == null || due <= start,
      startsAt: due != null && due > start ? start : undefined, endsAt: due != null && due > start ? due : undefined,
    });
    if (due != null && (start == null || localDateKey(new Date(start)) !== localDateKey(new Date(due)))) events.push({
      source: "tasks", sourceId: page.id, date: due, title: page.title, completed: !!page.completed,
      recurring: !!page.task_repeat, allDay: true,
    });
    return events;
  });
}

export function eventsByLocalDay(events: LifeCalendarEvent[], visibleDays?: Date[]) {
  const days = new Map<string, LifeCalendarEvent[]>();
  const minimum = visibleDays?.[0]?.getTime() ?? -Infinity;
  const maximum = visibleDays?.at(-1)?.getTime() ?? Infinity;
  for (const event of events) {
    const start = new Date(event.date);
    start.setHours(0, 0, 0, 0);
    const finish = event.source === "taskStart" ? event.endsAt ?? event.date : event.date;
    for (const day = new Date(Math.max(start.getTime(), minimum)); day.getTime() <= Math.min(finish, maximum); day.setDate(day.getDate() + 1)) {
      if (day.getTime() === finish && finish !== start.getTime() && event.endsAt === finish) break;
      const key = localDateKey(day);
      const group = days.get(key);
      const item = day.getTime() === start.getTime() ? event : { ...event, date: day.getTime() };
      if (group) group.push(item);
      else days.set(key, [item]);
    }
  }
  return days;
}

/** All-day values are civil dates encoded at UTC midnight, independent of device zone. */
export function scheduleRange(event: import("./syncRecords").ScheduleEvent) {
  if (!event.all_day) return [event.starts_at, Math.max(event.starts_at + 1, event.ends_at)] as const;
  const midnight = (time: number, offset = 0) => {
    const date = new Date(time);
    return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + offset).getTime();
  };
  return [midnight(event.starts_at), midnight(event.ends_at, 1)] as const;
}

export function scheduleCalendarEvents(events: import("./syncRecords").ScheduleEvent[], days: Date[]): LifeCalendarEvent[] {
  const end = days.at(-1);
  if (!end) return [];
  const through = localDateInput(new Date(end.getFullYear(), end.getMonth(), end.getDate() + 2));
  const windows=days.map(day=>{
    const next=new Date(day);
    next.setDate(next.getDate()+1);
    return {day,start:day.getTime(),end:next.getTime()};
  });
  return events.flatMap(row => {
    const series = row.milestone ? { ...row, repeat_rule: yearlyMilestoneRule(row) } : row;
    const overrideHorizon = Object.entries(series.repeat_rule?.overrides??{}).reduce((latest,[key,override])=>
      key>latest&&override.starts_at<=end.getTime()+172800000?key:latest,through);
    const occurrences = series.repeat_rule ? scheduleOccurrences(series, overrideHorizon) : [{ key: undefined, event: series }];
    return occurrences.flatMap(({key, event}) => {
      const [start, end] = scheduleRange(event);
      return windows.filter(window=>start<window.end&&end>window.start).map(window=>({
        source: event.milestone ? "milestones" as const : "schedule" as const,
        sourceId: series.id, occurrence: key, date: window.start, title: event.title, completed: false,
        allDay: event.all_day, startsAt: event.all_day ? undefined : start, endsAt: event.all_day ? undefined : end,
        recurring: !!series.repeat_rule || !!series.milestone?.yearly,
      }));
    });
  });
}

export function schedulePeriodMatches(event: import("./syncRecords").ScheduleEvent, period: import("./dashboard/model").Card["period"], anchor: Date) {
  if (period === "all") return true;
  const startDay = period === "month" ? new Date(anchor.getFullYear(), anchor.getMonth(), 1)
    : new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate());
  const endDay = period === "month" ? new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1)
    : new Date(startDay.getFullYear(), startDay.getMonth(), startDay.getDate() + (period === "week" ? 7 : 1));
  const rule = event.milestone ? yearlyMilestoneRule(event) : event.repeat_rule;
  if (rule) return scheduleCalendarEvents([{ ...event, repeat_rule: rule }],
    Array.from({ length: Math.round((Date.UTC(endDay.getFullYear(), endDay.getMonth(), endDay.getDate()) -
      Date.UTC(startDay.getFullYear(), startDay.getMonth(), startDay.getDate())) / 86_400_000) },
    (_, index) => new Date(startDay.getFullYear(), startDay.getMonth(), startDay.getDate() + index))).length > 0;
  const [start, end] = scheduleRange(event);
  return start < endDay.getTime() && end > startDay.getTime();
}

export function habitCalendarEvents(habits: Habit[], days: Date[], today: Date): LifeCalendarEvent[] {
  const todayKey = localDateInput(today);
  return habits.flatMap(habit => days.flatMap(day => {
    const date = localDateInput(day);
    if (date < habit.started_on || (habit.cadence !== "daily" && (date > todayKey || !(date in habit.quantities)))) return [];
    return [{ source: "habits" as const, sourceId: habit.id, date: day.getTime(),
      title: habit.title, recurring: true, allDay: true, completed: habitQuantity(habit, day) >= habit.goal }];
  }));
}


export const calendarEventKey = (item: LifeCalendarEvent) =>
  item.source + ":" + item.sourceId + ":" + (item.occurrence ?? "");

export function calendarEventClass(item: LifeCalendarEvent) {
  const kind = item.source === "taskStart" || item.source === "habits" ? "tasks" : item.source;
  return "life-calendar-" + kind + (item.completed ? " life-calendar-completed" : "");
}

export function sortCalendarEvents(items: LifeCalendarEvent[]) {
  return [...items].sort((a, b) => (a.startsAt ?? -Infinity) - (b.startsAt ?? -Infinity)
    || a.title.localeCompare(b.title));
}
