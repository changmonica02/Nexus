import type {SupabaseClient} from '@supabase/supabase-js';
import {readPublishedEntry,searchDictionary,type PublishedDetail,type DictionaryPage} from './reader';
import type {DictionaryKind} from './dictionary';
import type {StudyRepository} from '../study/StudyRepository';
import type {Page} from '../../lib/types';
export const normalizeHeadword=(text:string)=>text.trim().toLocaleLowerCase('en');
export const basicMeaning=(entry:PublishedDetail)=>entry.senses.map(s=>s.gloss_zh_tw).filter(Boolean).join('；');
export const candidateSummary=(entry:PublishedDetail)=>entry.senses.map(s=>`${s.part_of_speech?`(${s.part_of_speech}) `:''}${s.gloss_zh_tw}`).join('；');
export interface DictionaryCandidate {detail:PublishedDetail;summary:string}
type Client=Pick<SupabaseClient,'rpc'>;
export async function searchCandidates(client:Client,query:string,page=0,kind:DictionaryKind|'all'='word'){
 const results=[await searchDictionary(client,kind,query,page)];
 const details=await Promise.all(results.flatMap(r=>r.items).map(row=>readPublishedEntry(client,row.id)));
 return {items:details.filter((d):d is PublishedDetail=>!!d).map(detail=>({detail,summary:candidateSummary(detail)})),has_more:results.some(r=>r.has_more),page,...(results[0].total!==undefined?{total:results[0].total}:{})};
}
export async function suggestDictionaryLink(client:Client,front:string,back:string){
 const exact:DictionaryCandidate[]=[];let hasMore=false;
 if(!front.trim())return {status:'none' as const,items:exact,incomplete:false};
 // Bounded search; incomplete results never receive a high-confidence label.
 for(let page=0;page<10;page++){
  const found:DictionaryPage=await searchDictionary(client,'word',front.trim().slice(0,120),page);
  for(const row of found.items.filter(r=>normalizeHeadword(r.headword)===normalizeHeadword(front))){const detail=await readPublishedEntry(client,row.id);if(detail)exact.push({detail,summary:candidateSummary(detail)});}
  hasMore=found.has_more;if(!hasMore)break;
 }
 const matches=exact.filter(c=>c.detail.senses.some(s=>s.gloss_zh_tw.trim()===back.trim()||`(${s.part_of_speech}) ${s.gloss_zh_tw}`===back.trim()));
 return {status:!hasMore&&exact.length===1&&matches.length===1?'high' as const:exact.length?'multiple' as const:'none' as const,items:exact,incomplete:hasMore};
}
export interface LinkedPrivateCard {id:string;deck_id:string;front:string;back:string}
export async function createDictionaryFlashcard(repository:StudyRepository,page:Page,detail:PublishedDetail,values={front:detail.entry.headword,back:basicMeaning(detail)}){
 if(detail.entry.kind!=='word'||detail.entry.status!=='published')throw Error('只能加入已發布 Word');
 if(page.kind!=='study_set'||page.deleted_at||page.official_pack_id)throw Error('請選擇私人學習集');
 const snapshot=await repository.ensureDeck(page);
 const existing=snapshot.cards.find(c=>!c.deleted_at&&c.dictionary_entry_id===detail.entry.id);
 if(existing)return {card:existing,created:false};
 const [card]=await repository.addCards(page.id,[{...values,dictionary_entry_id:detail.entry.id}]);
 return {card,created:true};
}
/** Explicit owner filters supplement RLS; public dictionary requests never read another owner's cards. */
export async function linkedPrivateCards(client:SupabaseClient,entryId:string):Promise<LinkedPrivateCard[]>{
 const {data:{user},error}=await client.auth.getUser();if(error||!user)throw Error('請先登入。');
 const cards=new Map<string,LinkedPrivateCard>();let offset=0;
 for(;;){const {data,error}=await client.from('study_card_dictionary_links').select('card_id').eq('owner_id',user.id).eq('dictionary_entry_id',entryId).order('card_id').range(offset,offset+199);if(error)throw Error(error.message);
  const ids=(data??[]).map(r=>r.card_id);if(ids.length){const {data:rows,error:e}=await client.from('study_cards').select('payload').eq('owner_id',user.id).in('id',ids);if(e)throw Error(e.message);for(const {payload}of rows??[])if(!payload.deleted_at)cards.set(payload.id,payload);}
  if(ids.length<200)break;offset+=200;
 }
 // Official packs (and locally-originated dictionary cards) retain the stable ID in their payload.
 for(offset=0;;offset+=200){const {data,error}=await client.from('study_cards').select('payload').eq('owner_id',user.id).eq('payload->>dictionary_entry_id',entryId).order('id').range(offset,offset+199);if(error)throw Error(error.message);for(const {payload}of data??[])if(!payload.deleted_at)cards.set(payload.id,payload);if((data??[]).length<200)break;}
 const decks=[...new Set([...cards.values()].map(c=>c.deck_id))],active=new Set<string>();
 for(let i=0;i<decks.length;i+=200){const {data,error}=await client.from('pages').select('id,deleted_at').eq('owner_id',user.id).in('id',decks.slice(i,i+200));if(error)throw Error(error.message);for(const p of data??[])if(!p.deleted_at)active.add(p.id);}
 return [...cards.values()].filter(c=>active.has(c.deck_id));
}
