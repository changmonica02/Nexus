import type { IDBPTransaction } from 'idb';
/** Called only for a server-confirmed permanent page tombstone. No retained progress. */
export const OFFICIAL_CLEANUP_STORES=['study_cards','study_states','study_events','study_settings','study_sessions','study_outbox','quiz_attempts','quiz_states','quiz_outbox'];
export async function purgeOfficialDeck(tx:IDBPTransaction<unknown,string[],'readwrite'>,owner:string,deckId:string,knownOfficial=false) {
  if(!tx.objectStoreNames.contains('study_cards'))return false;
  const cards=await tx.objectStore('study_cards').getAll();
  const setting=tx.objectStoreNames.contains('study_settings')?await tx.objectStore('study_settings').get(deckId):null;
  const selected=cards.filter(c=>c.owner_id===owner&&c.deck_id===deckId);
  if(!knownOfficial&&!setting?.official_pack_id&&!selected.some(c=>c.official_pack_id))return false;
  const ids=new Set(selected.map(c=>c.id));
  for(const name of OFFICIAL_CLEANUP_STORES) {
    if(!tx.objectStoreNames.contains(name))continue;
    const store=tx.objectStore(name);
    for(const row of await store.getAll()) {
      if(row.owner_id!==owner)continue;
      const value=row.value??row.payload??row;
      if(value.deck_id===deckId || (name==='study_settings'||name==='study_outbox')&&value.id===deckId || ids.has(row.id) || ids.has(row.card_id) || ids.has(value.card_id) || ids.has(value.id))await store.delete(row.id);
    }
  }
  return true;
}
