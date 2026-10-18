import {compositionRow} from './composition';
import type {SupabaseClient} from '@supabase/supabase-js';
import type {AISnapshot} from './aiDictionary';
import type {DictionaryDetail} from './dictionary';
import {emptyGrouping} from './grouping';
import {mapDictionaryDraft,validateDictionaryDraft,DraftValidationError,type DictionaryDraftInput} from './draftPipeline';
export type ReviewCandidate=ReturnType<typeof mapDictionaryDraft>&{component_order?:string[]};
export interface DictionaryReview {id:string;entry_id:string;base_revision:number;base_snapshot:AISnapshot;candidate:ReviewCandidate;revision:number;state:'active'|'approved'|'discarded';source:string;approved_revision:number|null;updated_at:string}
type Client=Pick<SupabaseClient,'rpc'>;
export async function createDictionaryReview(client:Client,snapshot:AISnapshot,draft?:DictionaryDraftInput,source='manual',preview=false,componentOrder?:string[]){
 if(draft){const issues=validateDictionaryDraft([draft]);if(issues.length)throw new DraftValidationError(issues);}
 const {data,error}=await client.rpc('create_dictionary_review',{entry_uuid:snapshot.detail.entry.id,expected_snapshot:snapshot,patch:draft?{...mapDictionaryDraft(draft),...(componentOrder?{component_order:componentOrder}:{})}:null,source_type:source,preview});
 if(error)throw Error(error.message);return data as DictionaryReview;
}
export function reviewSnapshot(review:DictionaryReview):AISnapshot{
 const c=review.candidate,b=c.bundle;
 const detail={entry:{...review.base_snapshot.detail.entry,...b.dictionary_entries[0],status:'draft',revision:review.revision},senses:b.dictionary_senses,relations:b.dictionary_relations.map(compositionRow),etymologies:b.dictionary_etymologies,learning_notes:b.dictionary_learning_notes,inflections:c.inflections??[],pronunciations:c.pronunciations??[],examples:c.examples,lexical_annotations:c.annotations} as unknown as DictionaryDetail;
 return {detail,grouping:c.group_data??emptyGrouping(),sense_groups:Object.fromEntries(c.sense_groups.map(g=>[g.sense_id,g.primary_category??null])),metadata:review.base_snapshot.metadata};
}
