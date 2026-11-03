import type { Page } from './types';

export function localDateKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}
export function startOfMonth(date: Date) { return new Date(date.getFullYear(), date.getMonth(), 1); }
export function addDays(date: Date, days: number) { const next = new Date(date); next.setDate(next.getDate() + days); return next; }
export function calendarDaysForMonth(month: Date) {
  const first = startOfMonth(month);
  return Array.from({ length: 42 }, (_, index) => addDays(first, index - first.getDay()));
}
export function todosForDay(pages: Page[], date: Date) {
  return pages.filter(page => page.kind === 'todo' && !page.deleted_at && page.due_date != null
    && localDateKey(new Date(page.due_date)) === localDateKey(date))
    .sort((a, b) => a.due_date! - b.due_date! || a.id.localeCompare(b.id));
}

/** Date input values use local civil dates, never UTC slicing. */
export function localDateInput(date:Date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
export function localDateTimeInput(time:number|null|undefined){if(time==null)return '';const date=new Date(time);return `${localDateInput(date)}T${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`;}
