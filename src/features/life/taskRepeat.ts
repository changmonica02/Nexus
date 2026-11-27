import type { Page } from "../../lib/types";

export async function nextTaskId(id: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(id));
  return "repeat_" + Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, "0")).join("");
}

export function nextTaskOccurrence(page: Page, id: string): Page | undefined {
  const due = page.due_date;
  if (page.kind !== "todo" || !page.completed || !page.task_repeat) return;
  const afterCompletion = page.task_repeat === "after_completion";
  if (due == null && !afterCompletion) return;
  const timestamp = Date.now();
  const anchor = new Date(due ?? timestamp);
  const next = new Date(afterCompletion ? timestamp : anchor);
  let monthDay = page.task_repeat_day ?? null;
  if (afterCompletion) {
    next.setDate(next.getDate() + (monthDay ?? 1));
  } else if (page.task_repeat === "monthly") {
    monthDay ??= anchor.getDate();
    next.setDate(1);
    next.setMonth(next.getMonth() + 1);
    next.setDate(Math.min(monthDay, new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()));
  } else {
    next.setDate(next.getDate() + (page.task_repeat === "weekly" ? 7 : 1));
  }
  const daysApart = Math.round((Date.UTC(next.getFullYear(), next.getMonth(), next.getDate())
    - Date.UTC(anchor.getFullYear(), anchor.getMonth(), anchor.getDate())) / 86400000);
  const start = page.task_start_at == null ? null : new Date(page.task_start_at);
  if (start) start.setDate(start.getDate() + daysApart);
  return {
    ...page, id, revision: 1, created_at: timestamp, updated_at: timestamp, deleted_at: null,
    completed: false, due_date: next.getTime(), task_start_at: start?.getTime() ?? null,
    task_repeat_day: monthDay, task_steps: page.task_steps?.map(step => ({ ...step, done: false })),
  };
}
