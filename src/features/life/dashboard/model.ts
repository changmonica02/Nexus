import { financeCards } from "../finance/cardCatalog";
import { addDays, startOfMonth } from "../../../lib/todoCalendar";
import type { Page } from "../../../lib/types";

export const lifeModules = {
  health: { group: "生活紀錄", label: "健康管理", optional: true },
  finance: { group: "財務管理", label: "財務", optional: true },
  calendar: { group: "時間管理", label: "日曆", optional: true },
  schedule: { group: "時間管理", label: "行程", optional: true },
  milestones: { group: "時間管理", label: "重要日期", optional: true },
  timer: { group: "時間管理", label: "計時工具", optional: true },
  tasks: { group: "任務管理", label: "任務", optional: true },
  habits: { group: "任務管理", label: "習慣", optional: true },
  lists: { group: "生活紀錄", label: "自訂清單", optional: true },
} as const;

export type LifeModule = keyof typeof lifeModules;
export const lifeModuleIds = Object.keys(lifeModules) as LifeModule[];

export const cardRegistry = {
  ...financeCards,
  health: { module: "health", title: "健康摘要", period: "day" },
  calendar: { module: "calendar", title: "月曆事項", period: "day" },
  milestones: { module: "milestones", title: "重要日期", period: "all" },
  schedule: { module: "schedule", title: "行程", period: "week" },
  timer: { module: "timer", title: "計時工具", period: "all" },
  tasks: { module: "tasks", title: "待辦任務", period: "all" },
  habits: { module: "habits", title: "習慣", period: "day" },
  lists: { module: "lists", title: "自訂清單", period: "all" },
} as const satisfies Record<string, { module: LifeModule; title: string; period: string }>;

export const periods = { day: "選取日", week: "從選取日起七天", month: "選取月份", all: "不限日期" } as const;
export const sizes = { small: "小型", medium: "中型", large: "大型" } as const;
export const statuses = { all: "全部", pending: "未完成", completed: "已完成", overdue: "已逾期" } as const;

export type CardType = keyof typeof cardRegistry;
export type Card = {
  id: string;
  type: CardType;
  title: string;
  size: keyof typeof sizes;
  period: keyof typeof periods;
  status: keyof typeof statuses;
  content: "summary" | "items";
  listId: string;
  hidden: boolean;
};
export type Board = { id: string; name: string; cards: Card[] };
export type LifeDashboardConfig = { version: 1; defaultId: string; boards: Board[]; hiddenModules: LifeModule[] };

export function newCard(type: CardType): Card {
  return {
    id: crypto.randomUUID(), type, title: "", size: "medium", period: cardRegistry[type].period,
    status: type === "tasks" ? "pending" : "all", content: "items", listId: "", hidden: false,
  };
}

export function templateCards(template: "daily" | "study" | "empty"): Card[] {
  if (template === "daily") return [newCard("calendar"), { ...newCard("tasks"), period: "day" }];
  if (template === "study") return [
    newCard("tasks"), { ...newCard("calendar"), period: "week" }, newCard("lists"),
  ];
  return [];
}

export function initialConfig(): LifeDashboardConfig {
  const id = "daily";
  return { version: 1, defaultId: id, boards: [{ id, name: "日常生活", cards: templateCards("daily") }], hiddenModules: [] };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isText(value: unknown, limit: number): value is string {
  return typeof value === "string" && value.length <= limit;
}

function isCard(value: unknown): value is Card {
  return isRecord(value) && isText(value.id, 100) && !!value.id && isText(value.title, 80)
    && typeof value.type === "string" && Object.hasOwn(cardRegistry, value.type)
    && typeof value.size === "string" && Object.hasOwn(sizes, value.size)
    && typeof value.period === "string" && Object.hasOwn(periods, value.period)
    && typeof value.status === "string" && Object.hasOwn(statuses, value.status)
    && (value.content === "summary" || value.content === "items")
    && isText(value.listId, 100) && typeof value.hidden === "boolean";
}

export function isDashboardConfig(value: unknown): value is LifeDashboardConfig {
  return isRecord(value) && value.version === 1 && typeof value.defaultId === "string"
    && Array.isArray(value.hiddenModules) && value.hiddenModules.every(id => lifeModuleIds.includes(id))
    && Array.isArray(value.boards) && value.boards.length > 0
    && new Set(value.boards.map(board => isRecord(board) && board.id)).size === value.boards.length
    && value.boards.every(board => isRecord(board) && isText(board.id, 100) && !!board.id
      && isText(board.name, 80) && !!board.name.trim()
      && Array.isArray(board.cards) && board.cards.every(isCard)
      && new Set(board.cards.map(card => card.id)).size === board.cards.length)
    && value.boards.some(board => board.id === value.defaultId);
}

export function sameBoard(a: Board, b: Board) {
  return a.id === b.id && a.name === b.name && a.cards.length === b.cards.length
    && a.cards.every((card, index) => Object.entries(card).every(([key, value]) =>
      b.cards[index][key as keyof Card] === value));
}

export function sameConfig(a: LifeDashboardConfig, b: LifeDashboardConfig) {
  return a.defaultId === b.defaultId && a.hiddenModules.join() === b.hiddenModules.join()
    && a.boards.length === b.boards.length && a.boards.every((board, index) => sameBoard(board, b.boards[index]));
}

export function dateMatches(time: number | null | undefined, period: Card["period"], anchor: Date) {
  if (period === "all") return true;
  const day = new Date(anchor);
  day.setHours(0, 0, 0, 0);
  const start = period === "month" ? startOfMonth(day) : day;
  const end = period === "month"
    ? new Date(day.getFullYear(), day.getMonth() + 1, 1)
    : addDays(day, period === "week" ? 7 : 1);
  return time != null && time >= start.getTime() && time < end.getTime();
}

export function selectTasks(todos: Page[], card: Card, anchor: Date, today: Date) {
  return todos.filter(todo => {
    if (card.type === "calendar" && todo.due_date == null) return false;
    if (!dateMatches(todo.due_date, card.period, anchor)) return false;
    if (card.status === "completed") return !!todo.completed;
    if (card.status === "pending") return !todo.completed;
    if (card.status === "overdue") return !todo.completed && todo.due_date != null && todo.due_date < today.getTime();
    return true;
  });
}

export function moveCard(cards: Card[], sourceId: string, targetId: string) {
  const source = cards.findIndex(card => card.id === sourceId);
  const target = cards.findIndex(card => card.id === targetId);
  if (source < 0 || target < 0 || source === target) return cards;
  const next = [...cards];
  next.splice(target, 0, ...next.splice(source, 1));
  return next;
}

const settingsPrefix = "nexus-life-dashboard:";
export const dashboardSettingsKey = (owner: string | null) => settingsPrefix + JSON.stringify(owner);
export const isDashboardSettingsKey = (key: string) => key.startsWith(settingsPrefix);
