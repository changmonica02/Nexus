import { localDateInput } from "../../../lib/todoCalendar";
import { civilAdvance } from "../civilPeriods";
import type { LifeCalendarEvent } from "../calendarSources";
import { financeRows, type FinanceRecord } from "./model";
import { subscriptionNext } from "./ledger";

export function financeCalendarEvents(records: FinanceRecord[], days: Date[]): LifeCalendarEvent[] {
  const dates = new Map(days.map(day => [localDateInput(day), day.getTime()]));
  const first = dates.keys().next().value;
  const last = [...dates.keys()].at(-1);
  if (!first || !last) return [];
  const events: LifeCalendarEvent[] = [];
  const hidden = financeRows(records,"preferences")[0]?.payload.hiddenSections ?? [];
  const add = (row: FinanceRecord, date: string, title: string) => {
    const time = dates.get(date);
    if (time !== undefined) events.push({ source: "finance", sourceId: row.id, date: time, title, completed: false, allDay: true });
  };
  for (const row of hidden.includes("subscription")?[]:financeRows(records, "subscription")) {
    if (row.payload.state !== "active") continue;
    let next = row.payload.next;
    for (let count = 0; next <= last && count < 50000; count++) {
      if (next >= first) add(row, next, "預計扣款 · " + row.payload.title);
      const later = subscriptionNext({ ...row.payload, next });
      if (later <= next) break;
      next = later;
    }
  }
  for (const row of financeRows(records,"account")) {
    const p=row.payload;
    if (p.archived) continue;
    if (p.type==="loan" && p.due && !hidden.includes("asset")) add(row,p.due,"貸款到期 · "+p.title);
    if (p.type==="card") {
      for(let month=first.slice(0,7)+"-01";month<=last;month=civilAdvance(month,"month",1)){
        const lastInMonth=civilAdvance(civilAdvance(month,"month",1),"day",-1);
        add(row,month.slice(0,8)+String(Math.min(p.paymentDay,Number(lastInMonth.slice(8)))).padStart(2,"0"),"信用卡繳款 · "+p.title);
      }
    }
  }
  for (const row of hidden.includes("asset")?[]:financeRows(records,"asset")) if (row.payload.type==="liability"&&row.payload.due) add(row,row.payload.due,"負債到期 · "+row.payload.title);
  for (const row of hidden.includes("goal")?[]:financeRows(records,"goal")) if (row.payload.due) add(row,row.payload.due,"目標日期 · "+row.payload.title);
  return events;
}
