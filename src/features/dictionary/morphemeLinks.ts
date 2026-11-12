import type {SupabaseClient} from '@supabase/supabase-js';
import {readAI} from './aiDictionary';
import {reviewSnapshot,type DictionaryReview} from './revisionLifecycle';
import {mapDictionaryDraft,saveDictionaryDraft,type DictionaryDraftInput} from './draftPipeline';
import {draftContentSignature} from './draftAutosave';
export interface MorphemeWordLink {id:string;entry_id:string;sense_id:string|null;target_entry_id:string;target_sense_id:string;headword:string;pending:boolean;removed:boolean;ambiguous:boolean;review_id:string|null}
export async function readMorphemeWordLinks(client:SupabaseClient,entryId:string,senseId:string,page=0):Promise<{items:MorphemeWordLink[];page:number;total:number;has_more:boolean}>{
 const {data,error}=await client.rpc('get_dictionary_morpheme_links',{entry_uuid:entryId,sense_uuid:senseId,page_number:page});if(error)throw Error(error.message);return data;
}
/** The relation belongs to its Word. Published Words are edited only through their existing Review. */
export async function editMorphemeWordLink(client:SupabaseClient,wordId:string,targetId:string,targetSenseId:string,relationId:string,remove=false){
 const target=await readAI(client,targetId);
 if(!target||!target.detail.senses.some(s=>s.id===targetSenseId))throw Error('morpheme.saveTarget');
 const base=await readAI(client,wordId);if(!base||base.detail.entry.kind!=='word')throw Error('morpheme.selectWord');
 const {data:reviews,error}=await client.from('dictionary_review_drafts').select('*').eq('entry_id',wordId).eq('state','active');if(error)throw Error(error.message);
 if((reviews?.length??0)>1)throw Error('morpheme.chooseReview');
 const review=reviews?.[0] as DictionaryReview|undefined;
 if(review&&review.base_revision!==base.detail.entry.revision)throw Error('morpheme.staleReview');
 const d=review?reviewSnapshot(review).detail:base.detail;
 const existing=d.relations.find(r=>r.id===relationId);
 if(existing&&(existing.target_entry_id!==targetId||existing.target_sense_id!==targetSenseId))throw Error('morpheme.changedRelation');
 if(remove&&!existing)return;
 if(!remove&&d.relations.some(r=>r.target_entry_id===targetId&&r.target_sense_id===targetSenseId&&r.sense_id===null))return;
 const relations=remove?d.relations.filter(r=>r.id!==relationId):[...d.relations,{id:relationId,entry_id:wordId,sense_id:null,target_entry_id:targetId,target_sense_id:targetSenseId}];
 const draft:DictionaryDraftInput={entry_id:wordId,kind:'word',headword:d.entry.headword,revision:d.entry.revision,word_segments:d.entry.word_segments?.map(s=>remove&&s.relation_id===relationId?{...s,relation_id:null}:s),senses:d.senses.map(s=>({...s})),relations:relations.map(r=>({...r})),etymologies:d.etymologies.map(r=>({...r})),learning_notes:d.learning_notes.map(r=>({...r})),pronunciations:d.pronunciations?.map(r=>({...r})),inflections:d.inflections?.map(r=>({...r})),examples:d.examples?.map(r=>({...r}))??[],relation_hints:(d.lexical_annotations??[]).filter(r=>r.kind==='relation_hint').map(r=>({...r}))};
 if(base.detail.entry.status==='draft'){await saveDictionaryDraft(client,[draft],false,true,undefined,true);return;}
 const candidate={...mapDictionaryDraft(draft),component_order:relations.map(r=>r.id)};
 const response=review?await client.rpc('save_dictionary_review',{review_uuid:review.id,expected_revision:review.revision,candidate}):await client.rpc('create_dictionary_edit_review',{entry_uuid:wordId,expected_snapshot:base,candidate});
 if(response.error){
  // Check a lost response before any retry; never create a second candidate speculatively.
  const found=await client.from('dictionary_review_drafts').select('*').eq('entry_id',wordId).eq('state','active');
  if(found.error||found.data?.length!==1||found.data[0].base_revision!==base.detail.entry.revision||draftContentSignature(found.data[0].candidate)!==draftContentSignature(candidate))throw Error(response.error.message);
 }
}
