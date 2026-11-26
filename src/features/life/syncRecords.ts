import { dashboardSettingsKey, isDashboardConfig, sameBoard, type LifeDashboardConfig } from "./dashboard/model";

export const LIFE_SYNC_STORES = ["life_dashboard_configs", "life_schedule_events", "life_habits"] as const;
export type LifeSyncStore = typeof LIFE_SYNC_STORES[number];

export interface LifeSyncBase {
  id: string;
  workspace_owner_id: string | null;
  revision: number;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
}

export interface DashboardRecord extends LifeSyncBase {
  config: LifeDashboardConfig;
}

export interface ScheduleEvent extends LifeSyncBase {
  title: string;
  starts_at: number;
  ends_at: number;
  all_day: boolean;
  category: string;
  notes: string;
  milestone?: { yearly: boolean; mode: "remaining" | "elapsed"; icon: string; style: "green" | "sand" | "plain"; image: string | null } | null;
}

export interface Habit extends LifeSyncBase {
  title: string;
  cadence: "daily" | "weekly";
  goal: number;
  started_on: string;
  quantities: Record<string, number>;
}

export function isCivilDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T00:00:00Z");
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export const dashboardId = (owner: string) => dashboardSettingsKey(owner);

export function validateLifeSyncRecord(type: LifeSyncStore, value: LifeSyncBase): void {
  if (type === "life_dashboard_configs") {
    if (!value.workspace_owner_id || value.id !== dashboardId(value.workspace_owner_id)
      || !isDashboardConfig((value as DashboardRecord).config)) throw Error("儀表板設定格式無效");
    return;
  }
  if (type === "life_habits") {
    const habit = value as Habit;
    if (typeof habit.title !== "string" || !habit.title.trim() || habit.title.length > 160
      || !["daily", "weekly"].includes(habit.cadence) || !Number.isFinite(habit.goal) || habit.goal <= 0 || habit.goal > 1000000
      || !isCivilDate(habit.started_on) || !habit.quantities || typeof habit.quantities !== "object" || Array.isArray(habit.quantities)
      || Object.entries(habit.quantities).some(([date, quantity]) => !isCivilDate(date) || date < habit.started_on
        || !Number.isFinite(quantity) || quantity < 0 || quantity > 1000000)) throw Error("請確認習慣目標及紀錄");
    return;
  }
  const event = value as ScheduleEvent;
  if (typeof event.title !== "string" || !event.title.trim() || event.title.length > 160
    || !Number.isSafeInteger(event.starts_at) || !Number.isSafeInteger(event.ends_at)
    || event.starts_at < -2208988800000 || event.ends_at > 253402300799999 || event.ends_at < event.starts_at
    || typeof event.all_day !== "boolean" || typeof event.category !== "string" || event.category.length > 80
    || typeof event.notes !== "string" || event.notes.length > 4000) throw Error("請確認行程資料及起訖時間");
  const milestone = event.milestone;
  if (milestone != null && (!event.all_day || event.starts_at !== event.ends_at
    || typeof milestone.yearly !== "boolean" || !["remaining", "elapsed"].includes(milestone.mode)
    || typeof milestone.icon !== "string" || milestone.icon.length > 8 || !["green", "sand", "plain"].includes(milestone.style)
    || milestone.image !== null && (typeof milestone.image !== "string" || milestone.image.length > 180000
      || !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(milestone.image)))) throw Error("重要日期設定格式無效");
}

export function combineDashboardConfigs(preferred: LifeDashboardConfig, recovered: LifeDashboardConfig): LifeDashboardConfig {
  const boards = [...preferred.boards];
  for (const board of recovered.boards) {
    const existing = boards.find(item => item.id === board.id);
    if (existing && sameBoard(existing, board)) continue;
    boards.push(existing ? { ...board, id: crypto.randomUUID(), name: board.name.slice(0, 74) + "（復原）" } : board);
  }
  return { ...preferred, boards };
}
