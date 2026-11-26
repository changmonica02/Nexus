import { milestoneOccurs } from "./milestoneDates";
import { habitQuantity } from "./habits";
import type { Habit } from "./syncRecords";
import { localDateInput, localDateKey } from "../../lib/todoCalendar";
import type { Page } from "../../lib/types";

export type LifeCalendarEvent = {
  source: "tasks" | "taskStart" | "schedule" | "milestones" | "habits";
  sourceId: string;
  date: number;
  title: string;
  completed: boolean;
};

export function taskCalendarEvents(pages: Page[]): LifeCalendarEvent[] {
  return pages.flatMap(page => {
    if (page.kind !== "todo" || page.deleted_at != null) return [];
    const events: LifeCalendarEvent[] = [];
    if (page.task_start_at != null) events.push({
      source: "taskStart", sourceId: page.id, date: page.task_start_at, title: page.title, completed: !!page.completed,
    });
    if (page.due_date != null) events.push({
      source: "tasks", sourceId: page.id, date: page.due_date, title: page.title, completed: !!page.completed,
    });
    return events;
  });
}

export function eventsByLocalDay(events: LifeCalendarEvent[]) {
  const days = new Map<string, LifeCalendarEvent[]>();
  for (const event of events) {
    const key = localDateKey(new Date(event.date));
    const group = days.get(key);
    if (group) group.push(event);
    else days.set(key, [event]);
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
  return events.flatMap(event => {
    const [start, end] = scheduleRange(event);
    return days.filter(day => {
      if (event.milestone) return milestoneOccurs(event, day);
      const next = new Date(day);
      next.setDate(next.getDate() + 1);
      return start < next.getTime() && end > day.getTime();
    }).map(day => ({
      source: event.milestone ? "milestones" as const : "schedule" as const, sourceId: event.id, date: day.getTime(), title: event.title, completed: false,
    }));
  });
}

export function schedulePeriodMatches(event: import("./syncRecords").ScheduleEvent, period: import("./dashboard/model").Card["period"], anchor: Date) {
  if (period === "all") return true;
  const startDay = period === "month" ? new Date(anchor.getFullYear(), anchor.getMonth(), 1)
    : new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate());
  const endDay = period === "month" ? new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1)
    : new Date(startDay.getFullYear(), startDay.getMonth(), startDay.getDate() + (period === "week" ? 7 : 1));
  if (event.milestone) {
    for (const day = new Date(startDay); day < endDay; day.setDate(day.getDate() + 1)) {
      if (milestoneOccurs(event, day)) return true;
    }
    return false;
  }
  const [start, end] = scheduleRange(event);
  return start < endDay.getTime() && end > startDay.getTime();
}

export function habitCalendarEvents(habits: Habit[], days: Date[], today: Date): LifeCalendarEvent[] {
  const todayKey = localDateInput(today);
  return habits.flatMap(habit => days.flatMap(day => {
    const date = localDateInput(day);
    if (date < habit.started_on || date > todayKey || !(date in habit.quantities)
      && !(date === todayKey && (habit.cadence === "daily" || day.getDay() === 0))) return [];
    return [{ source: "habits" as const, sourceId: habit.id, date: day.getTime(),
      title: habit.title, completed: habitQuantity(habit, day) >= habit.goal }];
  }));
}
