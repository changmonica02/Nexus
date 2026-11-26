import { localDateKey } from "../../lib/todoCalendar";
import type { Page } from "../../lib/types";

export type LifeCalendarEvent = {
  source: "tasks";
  sourceId: string;
  date: number;
  title: string;
  completed: boolean;
};

export function taskCalendarEvents(pages: Page[]): LifeCalendarEvent[] {
  return pages.flatMap(page =>
    page.kind === "todo" && page.deleted_at == null && page.due_date != null
      ? [{ source: "tasks", sourceId: page.id, date: page.due_date, title: page.title, completed: !!page.completed }]
      : [],
  );
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
