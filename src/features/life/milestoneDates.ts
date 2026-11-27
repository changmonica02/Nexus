import { scheduleOccurrences } from "./scheduleRecurrence";
import { localDateInput } from "../../lib/todoCalendar";
import type { ScheduleEvent } from "./syncRecords";

// Civil-day arithmetic avoids DST and preserves Feb 29 intent. Non-leap anniversaries fall on Feb 28.
export const civilDay = (date: Date) => Date.parse(localDateInput(date) + "T00:00:00Z");
const DAY = 86400000;

function annualDate(origin: Date, year: number) {
  const month = origin.getUTCMonth();
  const last = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return Date.UTC(year, month, Math.min(origin.getUTCDate(), last));
}

export function milestoneOccurs(event: ScheduleEvent, date: Date) {
  const day = civilDay(date);
  if (event.repeat_rule) return scheduleOccurrences(event, localDateInput(date)).some(row => row.event.starts_at === day);
  return event.milestone?.yearly
    ? day >= event.starts_at && day === annualDate(new Date(event.starts_at), date.getFullYear())
    : day === event.starts_at;
}

export function milestoneTarget(event: ScheduleEvent, anchor: Date) {
  const day = civilDay(anchor);
  if (event.repeat_rule) {
    const furthest = new Date(day);
    furthest.setUTCFullYear(Math.min(9999, furthest.getUTCFullYear() + Math.max(2, 2 * event.repeat_rule.interval)));
    const times = scheduleOccurrences(event, furthest.toISOString().slice(0, 10)).map(row => row.event.starts_at).sort((a, b) => a - b);
    return (event.milestone?.mode === "elapsed" ? times.findLast(time => time <= day) ?? times[0]
      : times.find(time => time >= day) ?? times.at(-1)) ?? event.starts_at;
  }
  if (!event.milestone?.yearly || event.starts_at > day) return event.starts_at;
  const origin = new Date(event.starts_at), year = anchor.getFullYear();
  const current = annualDate(origin, year);
  const elapsed = event.milestone.mode === "elapsed";
  return current === day ? current : elapsed && current > day ? annualDate(origin, year - 1)
    : !elapsed && current < day ? annualDate(origin, year + 1) : current;
}

export function milestoneText(event: ScheduleEvent, anchor: Date) {
  const distance = (milestoneTarget(event, anchor) - civilDay(anchor)) / DAY;
  return distance === 0 ? "就是今天" : distance > 0 ? `剩餘 ${distance} 天` : `已過 ${-distance} 天`;
}
