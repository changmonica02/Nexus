import {activeFixed,createStudyEvent, emptyStudyState, sameStudyRecord, type StudyEvent, type StudyState, type StudyCard} from './studyFSRS';

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
function reliableTransition(event:StudyEvent):boolean {
  if(event.before.head!==event.parent || event.after.head!==event.id || event.after.id!==event.card_id || event.before.id!==event.card_id || event.after.owner_id!==event.owner_id || event.before.owner_id!==event.owner_id)return false;
  try {
    const card={id:event.card_id,deck_id:event.deck_id,owner_id:event.owner_id,front:event.question,back:event.answer,content_revision:event.content_revision};
    const rebuilt=createStudyEvent(card as Parameters<typeof createStudyEvent>[0],cleanState(event.before),event.kind,event.at,event.device_id,event.id,event.rating,event.source,event.engine==='nexus-interval@1'?event.style_snapshot:event.style_snapshot?{...event.style_snapshot,interval_version:undefined}:undefined);
    if(event.engine!==rebuilt.engine || !sameStudyRecord(event.parameters,rebuilt.parameters))return false;
    if((event.engine==="nexus-fixed@1"||event.engine==="nexus-interval@1")&&!sameStudyRecord(event.log,rebuilt.log))return false;
    const expected=cleanState(event.after);
    // Existing explicitly requested legacy reset annotates its result after scheduling.
    if(event.source==='legacy_test_reset')rebuilt.after.legacy_test_reset=true;
    return sameStudyRecord(cleanState(rebuilt.after),expected);
  }catch{return false;}
}
/** Immutable fact comparison includes unknown fields; only the derived projection is excluded. */
export function originalEvent(event:StudyEvent):StudyEvent {
  const copy={...event};delete copy.projection;return copy;
}
export function effectiveEvent(event:StudyEvent):StudyEvent {
  if(!event.projection)return event;
  const transition=event.projection;
  const copy={...originalEvent(event),parent:transition.parent,before:transition.before,after:transition.after,log:transition.log,...(transition.method_transition?{method_transition:transition.method_transition}:{})};
  if(!transition.method_transition)delete copy.method_transition;
  return copy;
}
export function clearedStudyState(card:Pick<StudyCard,'id'|'deck_id'|'owner_id'>,clearedAt:number):StudyState {
  const {id,deck_id,owner_id}=card;
  return {...emptyStudyState({id,deck_id,owner_id} as StudyCard),cleared_at:clearedAt};
}
export function projectStudyEvent(event:StudyEvent,before:StudyState,clearedAt:number):StudyEvent {
  if(!reliableTransition(originalEvent(event)) || !Number.isSafeInteger(event.at) || event.at<=clearedAt || before.cleared_at!==clearedAt || before.id!==event.card_id || before.owner_id!==event.owner_id || before.deck_id!==event.deck_id)throw Error('study.clearInvalidEvent');
  const card={id:event.card_id,deck_id:event.deck_id,owner_id:event.owner_id,front:event.question,back:event.answer,content_revision:event.content_revision} as StudyCard;
  const rebuilt=createStudyEvent(card,cleanState(before),event.kind,event.at,event.device_id,event.id,event.rating,event.source,event.engine==='nexus-interval@1'?event.style_snapshot:event.style_snapshot?{...event.style_snapshot,interval_version:undefined}:undefined);
  if(event.source==='legacy_test_reset')rebuilt.after.legacy_test_reset=true;
  return {...originalEvent(event),projection:{cleared_at:clearedAt,parent:rebuilt.parent,before:rebuilt.before,after:rebuilt.after,log:rebuilt.log,...(rebuilt.method_transition?{method_transition:rebuilt.method_transition}:{})}};
}
/** Projection is checked in addition to, never instead of, the original transition. */
export function reliableEvent(event:StudyEvent):boolean {
  if(!reliableTransition(originalEvent(event)))return false;
  if(!event.projection)return true;
  try{return sameStudyRecord(projectStudyEvent(event,event.projection.before,event.projection.cleared_at).projection,event.projection)&&reliableTransition(effectiveEvent(event));}catch{return false;}
}
export interface ScheduleCandidate {state:StudyState; sequence:number; source:'device'|'cloud'|'event'}
export function chooseSchedule(candidates:ScheduleCandidate[],policy:SchedulePolicy):StudyState|null {
  if(policy==='ask'||!candidates.length)return null;
  // A server receipt sequence is a fallback ordering, never a claim about offline chronology.
  const sorted=[...candidates].sort((a,b)=>policy==='conservative'
    ? (activeFixed(a.state)?a.state.fixed!.due:a.state.fsrs?.due??a.state.legacy_due_at??Infinity)-(activeFixed(b.state)?b.state.fixed!.due:b.state.fsrs?.due??b.state.legacy_due_at??Infinity)||b.sequence-a.sequence
    : b.sequence-a.sequence || Number(b.source==='cloud')-Number(a.source==='cloud'));
  return cleanState(sorted[0].state);
}
