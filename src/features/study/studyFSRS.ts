import { createEmptyCard, fsrs, generatorParameters, Rating, State, type Card, type Grade, type ReviewLog } from "ts-fsrs";
import type { Page, StudyItem } from "../../lib/types";
import type { StudySession } from "./studySessions";

export const STUDY_ENGINE = "ts-fsrs@5.4.2/FSRS-6";
export const STUDY_PARAMETERS = generatorParameters({ request_retention: 0.90, enable_short_term: true, learning_steps: ["10m"], relearning_steps: ["10m"] });
export const studyScheduler = fsrs(STUDY_PARAMETERS);
export { Rating, State };
export type { Grade };
export type StoredFSRS = Omit<Card, "due" | "last_review"> & { due: number; last_review?: number };
export type StoredReviewLog = Omit<ReviewLog, "due" | "review"> & { due: number; review: number };

export interface StudyCard {
  id: string; deck_id: string; owner_id: string | null;
  front: string; back: string; direction: "en-zh"; sort_order: number;
  content_revision: number; created_at: number; updated_at: number; deleted_at: number | null;
  legacy?: { item: StudyItem; migrated_at: number; schema: 1 };
  migration_only?: boolean;
}
export interface StudyState {
  id: string; deck_id: string; owner_id: string | null;
  fsrs: StoredFSRS | null; legacy_due_at: number | null;
  introduced_at: number | null; head: string | null; generation: number;
  conflict: boolean;
  learned_at?: number | null;
  legacy_test_reset?: boolean;
}
export interface StudySettings {
  id: string; owner_id: string | null; new_limit: number;
  direction_confirmed: boolean; updated_at: number; schema: 2;
  configured?: boolean;
  review_limit?: number;
  sort_mode?: "custom" | "az";
  quiz_direction?: "zh-en" | "en-zh";
}
export interface StudyEvent {
  id: string; card_id: string; deck_id: string; owner_id: string | null;
  kind: "review" | "introduce" | "reset"; at: number; local_day: string;
  device_id: string; parent: string | null; before: StudyState; after: StudyState;
  rating: Grade | null; log: StoredReviewLog | null;
  engine: typeof STUDY_ENGINE; parameters: typeof STUDY_PARAMETERS;
  content_revision: number; question: string; answer: string;
  session_id?: string;
  source?: "daily_initialization" | "daily_learning" | "free_review" | "legacy_test_reset";
  session_rating?: Grade;
}
export interface StudySnapshot { cards: StudyCard[]; states: StudyState[]; events: StudyEvent[]; settings: StudySettings; sessions?: StudySession[] }
export interface StudyBackup { cards: StudyCard[]; states: StudyState[]; events: StudyEvent[]; settings: StudySettings[]; sessions?: StudySession[] }
export function sameStudyRecord(a:unknown,b:unknown):boolean {
  const canonical = (_key:string,value:unknown) => value && typeof value === "object" && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value).sort(([x],[y])=>x.localeCompare(y))) : value;
  return JSON.stringify(a,canonical) === JSON.stringify(b,canonical);
}
export type StudyOperation = (
  | { id: string; owner_id: string | null; kind: "card"; value: StudyCard }
  | { id: string; owner_id: string | null; kind: "settings"; value: StudySettings }
  | { id: string; owner_id: string | null; kind: "seed"; value: StudyState }
  | { id: string; owner_id: string | null; kind: "session"; value: StudySession }
  | { id: string; owner_id: string | null; kind: "event"; value: StudyEvent }) & { initial?: boolean; session?: StudySession; restore?: boolean };

export function localStudyDay(now: number): string {
  const date = new Date(now);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function emptyStudyState(card: StudyCard): StudyState {
  return { id: card.id, deck_id: card.deck_id, owner_id: card.owner_id, fsrs: null,
    legacy_due_at: card.legacy?.item.daily_due_at ?? null,
    introduced_at: card.legacy?.item.daily_introduced_at ?? null, head: null, generation: 0, conflict: false };
}
export function migrateStudyDeck(page: Page, now: number): StudySnapshot {
  const cards = (page.study_items ?? []).map((item, index): StudyCard => ({
    id: JSON.stringify([page.id, item.id]), deck_id: page.id, owner_id: page.workspace_owner_id ?? null,
    front: item.front, back: item.back, direction: "en-zh", sort_order: index, content_revision: 1,
    created_at: now, updated_at: now, deleted_at: null,
    legacy: { item: structuredClone(item), migrated_at: now, schema: 1 }, migration_only: true,
  }));
  if (new Set(cards.map(card => card.id)).size !== cards.length) throw new Error("舊字卡 ID 重複，遷移已停止，原始資料未變更。");
  return { cards, states: cards.map(emptyStudyState), events: [], settings: {
    id: page.id, owner_id: page.workspace_owner_id ?? null, new_limit: 20,
    direction_confirmed: cards.length === 0, updated_at: now, schema: 2,
  } };
}
export function serializeFSRS(card: Card): StoredFSRS {
  return { ...card, due: card.due.getTime(), last_review: card.last_review?.getTime() };
}
export function schedulerCard(state: StudyState, now: number): Card {
  // Legacy due is an eligibility gate, never invented FSRS memory/history.
  return state.fsrs ? { ...state.fsrs, due: new Date(state.fsrs.due), last_review: state.fsrs.last_review == null ? undefined : new Date(state.fsrs.last_review) } : createEmptyCard(new Date(now));
}
export function previewStudy(state: StudyState, now: number) {
  return studyScheduler.repeat(schedulerCard(state, now), new Date(now));
}
export function createStudyEvent(card: StudyCard, state: StudyState, kind: StudyEvent["kind"], now: number, device: string, id: string, rating: Grade | null = null, source?: StudyEvent["source"]): StudyEvent {
  if (state.conflict) throw new Error("此卡有跨裝置排程衝突，紀錄已保留，請先處理衝突。");
  let after: StudyState = { ...state, head: id };
  let log: StoredReviewLog | null = null;
  if (kind === "review") {
    if (![Rating.Again, Rating.Hard, Rating.Good, Rating.Easy].includes(rating!)) throw new Error("無效評分");
    const result = studyScheduler.next(schedulerCard(state, now), new Date(now), rating!);
    after = { ...after, fsrs: serializeFSRS(result.card), legacy_due_at: null };
    log = { ...result.log, due: result.log.due.getTime(), review: result.log.review.getTime() };
  } else if (kind === "introduce") {
    after.introduced_at = now;
    // Legacy exposure alone is not daily-learning graduation.
    if (source === "daily_learning") after.learned_at = now;
  } else {
    after = { ...after, fsrs: null, legacy_due_at: null, introduced_at: null, learned_at: null, generation: state.generation + 1 };
  }
  return { id, card_id: card.id, deck_id: card.deck_id, owner_id: card.owner_id, kind, at: now,
    local_day: localStudyDay(now), device_id: device, parent: state.head, before: structuredClone(state), after,
    rating, log, engine: STUDY_ENGINE, parameters: structuredClone(STUDY_PARAMETERS),
    content_revision: card.content_revision, question: card.front, answer: card.back,
    ...(source ? { source } : {}) };
}
export function nextDailyCard(snapshot: StudySnapshot, now: number): StudyCard | null {
  if (!snapshot.settings.direction_confirmed) return null;
  const states = new Map(snapshot.states.map(state => [state.id, state]));
  const cards = snapshot.cards.filter(card => !card.deleted_at && card.front.trim() && card.back.trim() && !states.get(card.id)?.conflict);
  const due = cards.filter(card => {
    const state = states.get(card.id)!;
    return state.fsrs ? state.fsrs.due <= now : state.legacy_due_at != null ? state.legacy_due_at <= now : state.introduced_at != null;
  });
  due.sort((a, b) => {
    const x = states.get(a.id)!, y = states.get(b.id)!;
    const priority = (s: StudyState) => s.fsrs?.state === State.Learning || s.fsrs?.state === State.Relearning ? 0 : 1;
    return priority(x) - priority(y) || (x.fsrs?.due ?? x.legacy_due_at ?? 0) - (y.fsrs?.due ?? y.legacy_due_at ?? 0) || a.sort_order - b.sort_order;
  });
  if (due.length) return due[0];
  const used = new Set([
    ...snapshot.events.filter(event => event.kind === "introduce" && event.local_day === localStudyDay(now)).map(event => event.card_id),
    ...snapshot.states.filter(state => state.introduced_at != null && localStudyDay(state.introduced_at) === localStudyDay(now)).map(state => state.id),
  ]).size;
  if (used >= snapshot.settings.new_limit) return null;
  return cards.filter(card => {
    const state = states.get(card.id)!;
    return state.fsrs == null && state.legacy_due_at == null && state.introduced_at == null;
  }).sort((a,b) => a.sort_order - b.sort_order)[0] ?? null;
}
export function intervalLabel(due: number, now: number): string {
  const minutes = Math.max(1, Math.round((due - now) / 60_000));
  return minutes < 60 ? `${minutes} 分` : minutes < 1440 ? `${Math.round(minutes / 60)} 小時` : `${Math.round(minutes / 1440)} 天`;
}
