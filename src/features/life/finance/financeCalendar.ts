import { localDateInput } from "../../../lib/todoCalendar";
import { civilAdvance } from "../civilPeriods";
import type { LifeCalendarEvent } from "../calendarSources";
import { financeRows, type FinanceRecord } from "./model";
import { latestAssetValues, recurringTerms, subscriptionNext } from "./ledger";

export function financeCalendarEvents(records: FinanceRecord[], days: Date[]): LifeCalendarEvent[] {
  const dates = new Map(days.map(day => [localDateInput(day), day.getTime()]));
  const first = dates.keys().next().value;
  const last = [...dates.keys()].at(-1);
  if (!first || !last) return [];
  const events: LifeCalendarEvent[] = [];
  const preferences = financeRows(records, "preferences")[0]?.payload;
  const hidden = preferences?.hiddenSections ?? [];
  const add = (row: FinanceRecord, date: string, title: string, completed = false) => {
    const time = dates.get(date);
    if (time !== undefined) events.push({ source: "finance", sourceId: row.id, date: time, title, completed, allDay: true });
  };
  for (const row of hidden.includes("subscription")?[]:financeRows(records, "subscription")) {
    for (const date of row.payload.skipped ?? []) add(row, date, "已跳過 · " + row.payload.title, true);
    if (row.payload.state !== "active") continue;
    let next = row.payload.next;
    for (let count = 0; next <= last && (!row.payload.until || next <= row.payload.until) && count < 50000; count++) {
      if (next >= first && !row.payload.skipped?.includes(next)) {
        const terms = recurringTerms(row.payload, next);
        const label = next === row.payload.next && next <= localDateInput(new Date()) ? "待確認" :
          terms.type === "income" ? "預計收入" : terms.type === "transfer" ? "預計轉帳" : "預計扣款";
        add(row, next, label + " · " + terms.title);
      }
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
  for (const row of hidden.includes("asset")?[]:latestAssetValues(records, localDateInput(new Date()))) if (row.payload.type==="liability"&&row.payload.due) add(row,row.payload.due,"負債到期 · "+row.payload.title);
  for (const row of hidden.includes("goal")?[]:financeRows(records,"goal")) if (row.payload.due && row.payload.state !== "archived" && row.payload.state !== "completed") add(row,row.payload.due,"目標日期 · "+row.payload.title);
  for (const row of financeRows(records, "transaction")) {
    const scheduledDate = row.payload.source.split("|")[1];
    if (scheduledDate && !hidden.includes("subscription")) add(row, scheduledDate, "已入帳 · " + row.payload.title, true);
    else if (preferences?.showCalendarTransactions) add(row, row.payload.date, "已入帳 · " + row.payload.title, true);
  }
  return events;
}
