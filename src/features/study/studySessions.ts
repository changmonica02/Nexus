import { localStudyDay, type Grade, type StudyCard, type StudySnapshot, type StudyState } from "./studyFSRS";

export type SessionMode = "daily" | "free";
export interface SessionTarget {
  card_id: string;
  generation: number;
  easy_at: number | null;
  official_event_id: string | null;
  // Optional only for sessions saved before this field existed.
  official_rating?: Grade | null;
  // Reserved on creation; a retry/another device cannot mint a second official event.
  event_id: string;
  attempts: number;
}
export interface StudySession {
  id: string; owner_id: string | null; deck_id: string;
  mode: SessionMode | "batch"; day: string; batch_id?: string;
  targets: SessionTarget[]; queue: string[];
  started_at: number; completed_at: number | null;
  revision: number; updated_at: number; answers: number;
  last_action_id?: string;
  conflict?: boolean;
}
// Only these explicitly authorized test records are reset, never cards matched by text.
const testItems = new Set([
  "item_da626310-0b85-4ecd-88d0-dee59e00599d", "item_831a5e05-5425-460a-84ca-502930470f4e",
  "item_f860f930-920e-4a2f-8f4e-611e367c04e1", "item_1da0c904-f70a-4e2b-98ff-baecf5628c2c",
]);
export function isLegacyTestCard(card: StudyCard) {
  return card.deck_id === "page_kXB_pon1cdluNzbAk2EBJ" && !!card.legacy && testItems.has(card.legacy.item.id);
}
export function isLearned(state: StudyState) {
  // Existing real FSRS states remain usable. Legacy counts/exposures/due grant no eligibility.
  return state.learned_at != null || (state.learned_at === undefined && state.fsrs != null);
}
export function freezingInterval(state: StudyState): number | null {
  const fsrs = state.fsrs;
  return fsrs?.last_review == null ? null : fsrs.due - fsrs.last_review;
}
export function hasLearningData(state: StudyState | undefined, sessions: StudySession[] = []) {
  return !!state && (isLearned(state) || state.fsrs != null || state.legacy_due_at != null || state.introduced_at != null ||
    sessions.some(session=>session.mode!=="batch" && session.targets.some(t=>t.card_id===state.id && t.generation===state.generation && t.attempts>0)));
}
export function displayStudyCards(cards: StudyCard[], mode: "custom" | "az") {
  return [...cards].sort((a,b) => (mode === "az" ? a.front.localeCompare(b.front,"en",{sensitivity:"base"}) : 0) || a.sort_order-b.sort_order || a.id.localeCompare(b.id));
}
export function selectSessionCards(snapshot: StudySnapshot, mode: SessionMode, now: number) {
  const states = new Map(snapshot.states.map(s => [s.id,s]));
  const eligible = snapshot.cards.filter(c => {
    const s = states.get(c.id);
    return !c.deleted_at && !!c.front.trim() && !!c.back.trim() && s && !s.conflict &&
      (mode === "daily" ? !isLearned(s) : isLearned(s));
  });
  eligible.sort((a,b) => a.sort_order-b.sort_order || a.id.localeCompare(b.id));
  if (mode === "daily") return eligible.slice(0, snapshot.settings.new_limit);
  const limit = snapshot.settings.review_limit ?? 20;
  const selected: StudyCard[] = [];
  const take = (pool: StudyCard[]) => {
    const remaining = Math.max(0, limit - selected.length);
    if (pool.length > remaining && remaining > 0) {
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
    }
    selected.push(...pool.slice(0, remaining));
  };
  take(eligible.filter(c => states.get(c.id)!.fsrs == null));
  take(eligible.filter(c => {
    const fsrs = states.get(c.id)!.fsrs;
    return fsrs != null && fsrs.due <= now;
  }));
  const upcoming = eligible.filter(c => {
    const fsrs = states.get(c.id)!.fsrs;
    return fsrs != null && fsrs.due > now;
  }).sort((a,b) => states.get(a.id)!.fsrs!.due - states.get(b.id)!.fsrs!.due);
  selected.push(...upcoming.slice(0, Math.max(0, limit - selected.length)));
  return selected;
}
export function makeSession(snapshot: StudySnapshot, mode: StudySession["mode"], cards: StudyCard[], now: number, id: string, batchId?: string): StudySession {
  return { id, owner_id: snapshot.settings.owner_id, deck_id: snapshot.settings.id, mode,
    day: localStudyDay(now), batch_id: batchId, started_at: now, completed_at: cards.length ? null : now,
    revision: 0, updated_at: now, answers: 0,
    targets: cards.map(c => ({card_id:c.id,generation:snapshot.states.find(s=>s.id===c.id)!.generation,easy_at:null,official_event_id:null,official_rating:null,event_id:crypto.randomUUID(),attempts:0})),
    queue: cards.map(c=>c.id) };
}
export function reconcileSession(session: StudySession, snapshot: StudySnapshot, now: number): StudySession {
  const states = new Map(snapshot.states.map(s=>[s.id,s]));
  const cards = new Map(snapshot.cards.map(c=>[c.id,c]));
  const targets = session.targets.filter(t => cards.has(t.card_id) && !cards.get(t.card_id)!.deleted_at && states.get(t.card_id)?.generation === t.generation).map(t => {
    if (t.official_rating !== undefined) return t;
    // Recover only from the actual referenced review, never from mastery or FSRS state.
    const event = snapshot.events.find(e => e.id === t.official_event_id && e.card_id === t.card_id && e.kind === "review");
    return {...t, official_rating: event?.rating ?? null};
  });
  const queue = session.queue.filter(id => targets.some(t=>t.card_id===id && t.easy_at == null));
  return {...session, targets, queue, completed_at: session.completed_at ?? (queue.length ? null : now)};
}
