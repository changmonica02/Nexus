import { addDays } from "../../lib/todoCalendar";
import type { LifeCalendarEvent } from "./calendarSources";

export function minutesOnDay(timestamp: number) {
  const date = new Date(timestamp);
  return date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60;
}

export function layoutTimeline(items: LifeCalendarEvent[], day: Date) {
  const next = addDays(day, 1).getTime();
  const rows = items.flatMap(item => {
    if (item.startsAt == null) return [];
    const start = item.startsAt <= day.getTime() ? 0 : minutesOnDay(item.startsAt);
    const finish = item.endsAt ?? item.startsAt;
    const end = finish >= next ? 1440 : minutesOnDay(finish);
    return [{ item, start, end: Math.min(1440, Math.max(start + 22.5, end)), lane: 0, lanes: 1 }];
  }).sort((a, b) => a.start - b.start || b.end - a.end);
  let group: typeof rows = [];
  let lanes: number[] = [];
  const finishGroup = () => {
    for (const row of group) row.lanes = lanes.length;
    group = [];
    lanes = [];
  };
  for (const row of rows) {
    if (lanes.length && lanes.every(end => end <= row.start)) finishGroup();
    const free = lanes.findIndex(end => end <= row.start);
    row.lane = free === -1 ? lanes.length : free;
    lanes[row.lane] = row.end;
    group.push(row);
  }
  finishGroup();
  return rows;
}
