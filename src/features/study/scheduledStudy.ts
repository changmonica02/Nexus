import { State, localStudyDay, schedulerCard, studyScheduler, type StudyCard, type StudySnapshot, type StudyState } from './studyFSRS';
import { displayStudyCards, makeSession, type StudySession } from './studySessions';

export function isUnintroduced(state: StudyState) {
  return state.fsrs == null && state.legacy_due_at == null && state.introduced_at == null;
}
export function isShortStep(state: StudyState, now: number) {
  const card = state.fsrs;
  return !!card && (card.state === State.Learning || card.state === State.Relearning)
    && card.last_review != null && localStudyDay(card.last_review) === localStudyDay(now)
    && localStudyDay(card.due) === localStudyDay(now);
}
export function dueAt(state: StudyState, now: number) {
  // Existing learned legacy cards have no fabricated FSRS state; their first real grade initializes it.
  return state.fsrs?.due ?? state.legacy_due_at ?? (state.introduced_at != null ? now : Infinity);
}
export function dailyNewUsed(snapshot: StudySnapshot, now: number) {
  const day = localStudyDay(now);
  return new Set([
    ...snapshot.events.filter(e => e.kind === 'introduce' && e.local_day === day).map(e => e.card_id),
    ...snapshot.states.filter(s => s.introduced_at != null && localStudyDay(s.introduced_at) === day).map(s => s.id),
  ]).size;
}
function eligible(snapshot: StudySnapshot) {
  const states = new Map(snapshot.states.map(s => [s.id, s]));
  return displayStudyCards(snapshot.cards, snapshot.settings.sort_mode ?? 'custom')
    .filter(c => !c.deleted_at && c.front.trim() && c.back.trim() && states.has(c.id) && !states.get(c.id)!.conflict);
}
export function planScheduled(snapshot: StudySnapshot, now: number, random = Math.random) {
  const states = new Map(snapshot.states.map(s => [s.id, s]));
  const cards = eligible(snapshot);
  const limit = snapshot.settings.review_limit ?? 50;
  const short = cards.filter(c => isShortStep(states.get(c.id)!, now));
  const fresh = cards.filter(c => isUnintroduced(states.get(c.id)!))
    .slice(0, Math.max(0, snapshot.settings.new_limit - dailyNewUsed(snapshot, now)));
  const reviews = cards.filter(c => !isUnintroduced(states.get(c.id)!) && !isShortStep(states.get(c.id)!, now) && dueAt(states.get(c.id)!, now) <= now);
  const randomKeys = new Map(snapshot.settings.review_order === 'random' ? reviews.map(c => [c.id, random()]) : []);
  reviews.sort((a, b) => {
    const sa = states.get(a.id)!, sb = states.get(b.id)!;
    if (snapshot.settings.review_order === 'random') return randomKeys.get(a.id)! - randomKeys.get(b.id)!;
    if (snapshot.settings.review_order === 'retrievability') {
      const retrievability = (s: StudyState) => s.fsrs ? studyScheduler.get_retrievability(schedulerCard(s, now), new Date(now), false) : 0;
      return Number(retrievability(sa)) - Number(retrievability(sb)) || dueAt(sa, now) - dueAt(sb, now);
    }
    return dueAt(sa, now) - dueAt(sb, now) || a.sort_order - b.sort_order;
  });
  let combined: StudyCard[];
  if (snapshot.settings.card_order === 'review-first') combined = [...reviews, ...fresh];
  else if (snapshot.settings.card_order === 'mixed') {
    combined = []; for (let i = 0; i < Math.max(fresh.length, reviews.length); i++) { if (fresh[i]) combined.push(fresh[i]); if (reviews[i]) combined.push(reviews[i]); }
  } else combined = [...fresh, ...reviews];
  return { cards: [...short, ...combined.slice(0, limit)], shortIds: new Set(short.map(c => c.id)), dueCount: reviews.length, limit };
}
export function makeScheduled(snapshot: StudySnapshot, now: number, id: string) {
  const plan = planScheduled(snapshot, now);
  const session = makeSession(snapshot, 'scheduled', plan.cards, now, id);
  session.study_mode = snapshot.settings.study_mode ?? 'scheduled';
  session.quota_limit = plan.limit;
  for (const t of session.targets) t.counts_toward_limit = !plan.shortIds.has(t.card_id);
  return refreshScheduled(session, snapshot, now);
}
/** Derive availability from actual FSRS due, never a session-only mastery loop. */
export function refreshScheduled(session: StudySession, snapshot: StudySnapshot, now: number): StudySession {
  const states = new Map(snapshot.states.map(s => [s.id, s]));
  const cards = new Map(eligible(snapshot).map(c => [c.id, c]));
  const activeCards = new Map(snapshot.cards.filter(c => !c.deleted_at && c.front.trim() && c.back.trim()).map(c => [c.id,c]));
  const targets = session.targets.filter(t => activeCards.has(t.card_id) && states.get(t.card_id)?.generation === t.generation).map(t => ({ ...t }));
  // Already-started intraday steps may interrupt this batch without occupying another slot.
  if (session.completed_at == null) for (const c of cards.values()) {
    const s = states.get(c.id)!;
    if (isShortStep(s, now) && !targets.some(t => t.card_id === c.id)) targets.push({ card_id: c.id, generation: s.generation, easy_at: null, official_event_id: null, event_id: crypto.randomUUID(), attempts: 0, counts_toward_limit: false });
  }
  let newRemaining = Math.max(0, snapshot.settings.new_limit - dailyNewUsed(snapshot, now));
  const ready: typeof targets = [], waiting: typeof targets = [];
  let blocked=0;
  for (const t of targets) {
    const s = states.get(t.card_id)!;
    if (session.completed_at != null || t.skipped) continue;
    if(s.conflict){blocked++;continue;}
    if (isUnintroduced(s)) {
      if (newRemaining-- > 0) { t.easy_at = null; ready.push(t); }
      else { t.skipped = true; t.easy_at = null; }
    } else if (dueAt(s, now) <= now) { t.easy_at = null; ready.push(t); }
    else if (isShortStep(s, now)) { t.easy_at = null; waiting.push(t); }
    else t.easy_at ??= now;
  }
  ready.sort((a, b) => Number(isShortStep(states.get(b.card_id)!, now)) - Number(isShortStep(states.get(a.card_id)!, now))
    || (isShortStep(states.get(a.card_id)!, now) ? dueAt(states.get(a.card_id)!, now) - dueAt(states.get(b.card_id)!, now) : 0));
  return { ...session, targets, queue: ready.map(t => t.card_id), completed_at: session.completed_at ?? (!ready.length && !waiting.length && !blocked ? now : null) };
}
export function scheduledStatus(session: StudySession, snapshot: StudySnapshot, now: number) {
  const targets = new Set(session.targets.map(t => t.card_id));
  const states = new Map(snapshot.states.map(s => [s.id, s]));
  const remainingDue = eligible(snapshot).filter(c => !targets.has(c.id) && !isUnintroduced(states.get(c.id)!) && dueAt(states.get(c.id)!, now) <= now).length;
  const waits = session.targets.filter(t => !t.skipped && t.easy_at == null).flatMap(t => {
    const state = states.get(t.card_id); return state && isShortStep(state, now) && dueAt(state, now) > now ? [dueAt(state, now)] : [];
  });
  return { remainingDue, blocked:session.targets.filter(t=>states.get(t.card_id)?.conflict).length, waiting: waits.length, nextDue: waits.length ? Math.min(...waits) : null,
    slots: session.targets.filter(t => t.counts_toward_limit !== false).length,
    completed: session.targets.filter(t => t.easy_at != null).length };
}
export function practiceCards(snapshot: StudySnapshot) {
  const states = new Map(snapshot.states.map(s => [s.id, s]));
  return eligible(snapshot).filter(c => (states.get(c.id)!.fsrs?.state === State.Review || states.get(c.id)!.fsrs?.state === State.Relearning) || states.get(c.id)!.learned_at != null);
}
