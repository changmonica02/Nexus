import type { StudyCard } from './studyFSRS';

/** Per-card preference in the existing card record, independent of content edits. */
export function validateCardVisibility(card:StudyCard):void {
  if(card.hidden===undefined&&card.hidden_changed_at===undefined)return;
  if(typeof card.hidden!=='boolean'||!Number.isSafeInteger(card.hidden_changed_at)||card.hidden_changed_at!<=0)throw Error('study.invalidVisibility');
}
export function mergeCardVisibility(previous:StudyCard|undefined,incoming:StudyCard):StudyCard {
  validateCardVisibility(incoming);
  if(!previous)return incoming;
  validateCardVisibility(previous);
  if(previous.id!==incoming.id||previous.deck_id!==incoming.deck_id||previous.owner_id!==incoming.owner_id)throw Error("study.invalidVisibilityIdentity");
  if(previous.hidden_changed_at===undefined)return incoming;
  if(incoming.hidden_changed_at===undefined||previous.hidden_changed_at>incoming.hidden_changed_at||previous.hidden_changed_at===incoming.hidden_changed_at&&previous.hidden===true){
    return {...incoming,hidden:previous.hidden,hidden_changed_at:previous.hidden_changed_at};
  }
  return incoming;
}
