import {createStudyEvent, sameStudyRecord, type StudyEvent, type StudyState} from './studyFSRS';

export type SchedulePolicy = 'latest' | 'conservative' | 'ask';
export function getSchedulePolicy(): SchedulePolicy {
  if(typeof localStorage==='undefined')return 'latest';
  const value=localStorage.getItem('nexus-study-schedule-policy');
  return value==='conservative'||value==='ask'?value:'latest';
}
export function setSchedulePolicy(value:SchedulePolicy){localStorage.setItem('nexus-study-schedule-policy',value);}
export function cleanState(state:StudyState):StudyState {
  const copy={...state,conflict:false};delete copy.ambiguity;return copy;
}
/** Verify the recorded transition with its original engine parameters; never mutate the fact. */
export function reliableEvent(event:StudyEvent):boolean {
  if(event.before.head!==event.parent || event.after.head!==event.id || event.after.id!==event.card_id || event.before.id!==event.card_id || event.after.owner_id!==event.owner_id || event.before.owner_id!==event.owner_id)return false;
  try {
    const card={id:event.card_id,deck_id:event.deck_id,owner_id:event.owner_id,front:event.question,back:event.answer,content_revision:event.content_revision};
    const rebuilt=createStudyEvent(card as Parameters<typeof createStudyEvent>[0],cleanState(event.before),event.kind,event.at,event.device_id,event.id,event.rating,event.source);
    if(event.engine!==rebuilt.engine || !sameStudyRecord(event.parameters,rebuilt.parameters))return false;
    const expected=cleanState(event.after);
    // Existing explicitly requested legacy reset annotates its result after scheduling.
    if(event.source==='legacy_test_reset')rebuilt.after.legacy_test_reset=true;
    return sameStudyRecord(cleanState(rebuilt.after),expected);
  }catch{return false;}
}
export interface ScheduleCandidate {state:StudyState; sequence:number; source:'device'|'cloud'|'event'}
export function chooseSchedule(candidates:ScheduleCandidate[],policy:SchedulePolicy):StudyState|null {
  if(policy==='ask'||!candidates.length)return null;
  // A server receipt sequence is a fallback ordering, never a claim about offline chronology.
  const sorted=[...candidates].sort((a,b)=>policy==='conservative'
    ? (a.state.fsrs?.due??a.state.legacy_due_at??Infinity)-(b.state.fsrs?.due??b.state.legacy_due_at??Infinity)||b.sequence-a.sequence
    : b.sequence-a.sequence || Number(b.source==='cloud')-Number(a.source==='cloud'));
  return cleanState(sorted[0].state);
}
