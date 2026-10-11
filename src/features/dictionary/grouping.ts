import {primaryCategories,prefixCategories} from './dictionaryCategories';
export {primaryCategories,prefixCategories} from './dictionaryCategories';
import {draftsFromBundle,saveDictionaryDraft} from './draftPipeline';
import type {SupabaseClient} from '@supabase/supabase-js';
import type {Bundle} from './adminImport';

export interface DictionaryGrouping {primary_category:string|null;tags:string[];variant_group:string|null}
export const emptyGrouping=():DictionaryGrouping=>({primary_category:null,tags:[],variant_group:null});
export async function readGrouping(client:Pick<SupabaseClient,'from'>,id:string):Promise<DictionaryGrouping>{
  const {data,error}=await client.from('dictionary_entry_groups').select('primary_category,tags,variant_group').eq('id',id).maybeSingle();
  if(error)throw new Error('無法讀取分類，請確認字典分類 migration 已套用。');
  return data??emptyGrouping();
}
export async function saveGroupedDraft(client:Pick<SupabaseClient,'rpc'>,bundle:Bundle,grouping:DictionaryGrouping){
  await saveDictionaryDraft(client,draftsFromBundle(bundle,grouping),false,true);
}


export interface DictionarySenseGrouping {sense_id:string;primary_category:string|null}
export type SenseGroupMap=Record<string,string|null>;
export async function readSenseGroups(client:Pick<SupabaseClient,'from'>,senseIds:string[]):Promise<SenseGroupMap>{
  if(!senseIds.length)return {};
  const {data,error}=await client.from('dictionary_sense_groups').select('sense_id,primary_category').in('sense_id',senseIds);
  if(error)throw new Error('無法讀取字首義項分類，請確認字首分類 migration 已套用。');
  return Object.fromEntries((data??[]).map(row=>[row.sense_id,row.primary_category]));
}
/** Grouping is separate from the unchanged import bundle; only current senses are sent. */
export async function savePrefixDraft(client:Pick<SupabaseClient,'rpc'>,bundle:Bundle,grouping:DictionaryGrouping,senses:SenseGroupMap){
  await saveDictionaryDraft(client,draftsFromBundle(bundle,grouping,senses),false,true);
}
export interface GroupedDictionaryItem {id:string;kind:'prefix'|'root';headword:string;sense_id?:string;gloss_zh_tw?:string}
export interface GroupedDictionaryPage {items:GroupedDictionaryItem[];has_more:boolean;page:number}
export async function searchGrouping(client:Pick<SupabaseClient,'rpc'>,kind:'prefix'|'root',query:string,page:number,category:string):Promise<GroupedDictionaryPage>{
  const args={query_text:query,page_number:page,primary_category_filter:category};
  const {data,error}=kind==='prefix'?await client.rpc('search_prefix_dictionary',args):await client.rpc('search_grouped_dictionary',{...args,category:'root'});
  if(error)throw new Error('分類暫時無法讀取，請稍後重試或確認分類資料服務已啟用。');
  return data as GroupedDictionaryPage;
}
