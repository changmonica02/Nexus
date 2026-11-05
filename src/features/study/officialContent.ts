import type {StudyCard} from './studyFSRS';
import {readPublicCacheBatch,savePublicCacheBatch} from '../dictionary/publicCache';
import type {SupabaseClient} from '@supabase/supabase-js';
export interface PublishedStudyContent {id:string;kind:'word';status:'published';front:string;back:string}
export const isOfficialLinked=(card:StudyCard|undefined)=>!!card?.official_pack_id&&!!card.official_source_entry_id&&!!card.dictionary_entry_id&&card.official_custom===false;
function valid(value:unknown,id:string):value is PublishedStudyContent {
 const c=value as PublishedStudyContent|null;return !!c&&c.id===id&&c.kind==='word'&&c.status==='published'&&typeof c.front==='string'&&!!c.front.trim()&&typeof c.back==='string'&&!!c.back.trim();
}
/** Display-only projection. Never writes cards, revisions, scheduling or the study outbox. */
export async function resolveOfficialContent(cards:StudyCard[],client:Pick<SupabaseClient,'rpc'>|null):Promise<StudyCard[]> {
 const ids=[...new Set(cards.filter(isOfficialLinked).map(c=>c.dictionary_entry_id!))],contents=new Map<string,PublishedStudyContent>();
 if(!ids.length)return cards;
 const cache=await readPublicCacheBatch(ids.map(id=>'study-content:'+id));for(const id of ids){const cached=cache.get('study-content:'+id);if(valid(cached,id))contents.set(id,cached);}
 if(client&&(typeof navigator==='undefined'||navigator.onLine!==false))for(let offset=0;offset<ids.length;offset+=200){
  const batch=ids.slice(offset,offset+200);
  try{const {data,error}=await client.rpc('get_published_study_content',{entry_ids:batch});if(error||!Array.isArray(data))continue;
   const entries=[];for(const id of batch){const value=data.find((row:PublishedStudyContent)=>row.id===id);if(valid(value,id)){contents.set(id,value);entries.push({key:'study-content:'+id,data:value});}else{contents.delete(id);entries.push({key:'study-content:'+id,data:null});}}
   await savePublicCacheBatch(entries);
  }catch{/* Last trusted published display or original safe card text remains available. */}
 }
 return cards.map(card=>{const content=isOfficialLinked(card)?contents.get(card.dictionary_entry_id!):undefined;return content?{...card,front:content.front,back:content.back}:card;});
}
