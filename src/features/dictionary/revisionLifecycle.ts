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
 const detail={entry:{...review.base_snapshot.detail.entry,...b.dictionary_entries[0],status:'draft',revision:review.revision},senses:b.dictionary_senses,relations:b.dictionary_relations,etymologies:b.dictionary_etymologies,learning_notes:b.dictionary_learning_notes,pronunciations:c.pronunciations??[],examples:c.examples,lexical_annotations:c.annotations} as unknown as DictionaryDetail;
 return {detail,grouping:c.group_data??emptyGrouping(),sense_groups:Object.fromEntries(c.sense_groups.map(g=>[g.sense_id,g.primary_category??null])),metadata:review.base_snapshot.metadata};
}
export interface RevisionDifference {section:string;label:string;kind:'added'|'modified'|'removed'|'unchanged';before:unknown;after:unknown}
const content=(v:unknown):unknown=>Array.isArray(v)?v.map(content):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).filter(([k])=>!['id','entry_id','sense_id','target_entry_id','target_sense_id','revision','status','published_at','updated_at','source_id'].includes(k)).sort(([a],[b])=>a.localeCompare(b)).map(([k,x])=>[k,content(x)])):v;
export function diffDictionaryReview(review:DictionaryReview,targets:{entries:{id:string;headword:string}[];senses:{id:string;gloss_zh_tw:string}[]}={entries:[],senses:[]}):RevisionDifference[]{
 const before=review.base_snapshot,after=reviewSnapshot(review),result:RevisionDifference[]=[];
 for(const key of ['entry','pronunciations','senses','relations','etymologies','learning_notes','examples','lexical_annotations'] as const){
  const a=(key==='entry'?[before.detail.entry]:before.detail[key]??[]) as unknown as Record<string,unknown>[];
  const b=(key==='entry'?[after.detail.entry]:after.detail[key]??[]) as unknown as Record<string,unknown>[];
  for(const id of new Set([...a,...b].map(r=>r.id))){const old=a.find(r=>r.id===id),next=b.find(r=>r.id===id);result.push({section:key,label:String(next?.headword??next?.gloss_zh_tw??next?.body??next?.ipa??old?.ipa??old?.headword??old?.gloss_zh_tw??old?.body??'構詞關聯'),kind:!old?'added':!next?'removed':JSON.stringify(old&&content(old))===JSON.stringify(next&&content(next))&&old?.sense_id===next?.sense_id&&old?.target_entry_id===next?.target_entry_id&&old?.target_sense_id===next?.target_sense_id?'unchanged':'modified',before:old?content(old):null,after:next?content(next):null});}
 }
 // IDs determine identity/diffs; human-readable target names explain relation changes.
 for(const difference of result.filter(d=>d.section==='relations')){
  const index=result.filter(d=>d.section==='relations').indexOf(difference);
  const ids=[...new Set([...before.detail.relations,...after.detail.relations].map(r=>r.id))];
  const describe=(s:AISnapshot)=>{const r=s.detail.relations.find(r=>r.id===ids[index]);return r?{構詞:targets.entries.find(e=>e.id===r.target_entry_id)?.headword??'目標詞條',中文義:targets.senses.find(x=>x.id===r.target_sense_id)?.gloss_zh_tw??'目標義項',所屬中文義:s.detail.senses.find(x=>x.id===r.sense_id)?.gloss_zh_tw??'詞條',...content(r) as object}:null;};
  difference.before=describe(before);difference.after=describe(after);
 }
 for(const difference of result.filter(d=>d.section==='pronunciations')){
  const all=[...new Set([...(before.detail.pronunciations??[]),...(after.detail.pronunciations??[])].map(r=>r.id))];
  const index=result.filter(d=>d.section==='pronunciations').indexOf(difference),id=all[index];
  const describe=(s:AISnapshot)=>{const row=s.detail.pronunciations?.find(r=>r.id===id);return row?{...content(row) as object,適用義項:row.sense_id?s.detail.senses.find(x=>x.id===row.sense_id)?.gloss_zh_tw??'義項':'詞條共用'}:null;};
  difference.before=describe(before);difference.after=describe(after);
 }
 for(const key of ['grouping','sense_groups'] as const){const display=(s:AISnapshot)=>key==='sense_groups'?Object.entries(s.sense_groups).map(([id,category])=>({meaning:s.detail.senses.find(x=>x.id===id)?.gloss_zh_tw??'義項',category})):s.grouping;result.push({section:key,label:key==='grouping'?'分類／同字變體':'義項分類',kind:JSON.stringify(before[key])===JSON.stringify(after[key])?'unchanged':'modified',before:display(before),after:display(after)});}
 return result;
}
