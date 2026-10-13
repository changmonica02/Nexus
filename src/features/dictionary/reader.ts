import type { SupabaseClient } from '@supabase/supabase-js';
import type { DictionaryDetail, DictionaryEntry, DictionaryKind } from './dictionary';
type Client=Pick<SupabaseClient,'rpc'>;
export interface DictionaryPage { items: (Pick<DictionaryEntry,'id'|'kind'|'headword'>&{inflection_matches?:{form:string;form_kind:import('./inflections').InflectionKind;sense_id:string|null}[]})[]; has_more:boolean; page:number; total?:number }
type PublicRow<T> = Omit<T,'revision'|'updated_at'|'verification_note'>;
export interface PublishedDetail {
  inflections?:PublicRow<NonNullable<DictionaryDetail['inflections']>[number]>[];
  pronunciations?:PublicRow<NonNullable<DictionaryDetail['pronunciations']>[number]>[];
  examples?:{id:string;sense_id:string|null;body:string;sort_order:number}[];
  lexical_annotations?:{id:string;sense_id:string|null;body:string;sort_order:number;kind:string}[];
  entry: PublicRow<DictionaryDetail['entry']>;
  senses: PublicRow<DictionaryDetail['senses'][number]>[];
  relations: PublicRow<DictionaryDetail['relations'][number]>[];
  etymologies: (PublicRow<DictionaryDetail['etymologies'][number]> & {data_source?:string})[];
  learning_notes: PublicRow<DictionaryDetail['learning_notes'][number]>[];
  related: {id:string;kind:DictionaryKind;headword:string;sense_id:string;gloss_zh_tw:string}[];
}
export async function searchDictionary(client:Client,kind:DictionaryKind|'all',query:string,page=0):Promise<DictionaryPage>{
  const {data,error}=await client.rpc('search_published_dictionary',{category:kind,query_text:query,page_number:page});
  if(error)throw new Error('字典目前無法讀取，請稍後重試；若持續失敗，請確認資料服務已啟用。');
  return data as DictionaryPage;
}
/** Dictionary browsing includes attached forms; card suggestions retain the original headword contract. */
export async function searchDictionaryWithInflections(client:Client,kind:DictionaryKind|'all',query:string,page=0):Promise<DictionaryPage>{
  const {data,error}=await client.rpc('search_dictionary_with_inflections',{category:kind,query_text:query,page_number:page});
  if(error)throw new Error('字典目前無法讀取，請稍後重試；若持續失敗，請確認資料服務已啟用。');
  return data as DictionaryPage;
}
export async function readPublishedEntry(client:Client,id:string):Promise<PublishedDetail|null>{
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))return null;
  const {data,error}=await client.rpc('get_published_dictionary_entry',{entry_uuid:id});
  if(error)throw new Error('詞條目前無法讀取，請稍後重試。');
  return data as PublishedDetail|null;
}
