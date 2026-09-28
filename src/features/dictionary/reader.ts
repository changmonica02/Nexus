import type { SupabaseClient } from '@supabase/supabase-js';
import type { DictionaryDetail, DictionaryEntry, DictionaryKind, DictionarySource } from './dictionary';
type Client=Pick<SupabaseClient,'rpc'>;
export interface DictionaryPage { items: Pick<DictionaryEntry,'id'|'kind'|'headword'>[]; has_more:boolean; page:number }
type PublicRow<T> = Omit<T,'revision'|'updated_at'|'verification_note'>;
export interface PublishedDetail {
  entry: PublicRow<DictionaryDetail['entry']>;
  senses: PublicRow<DictionaryDetail['senses'][number]>[];
  relations: PublicRow<DictionaryDetail['relations'][number]>[];
  etymologies: PublicRow<DictionaryDetail['etymologies'][number]>[];
  learning_notes: PublicRow<DictionaryDetail['learning_notes'][number]>[];
  sources: Pick<DictionarySource,'id'|'citation'|'source_url'|'license'|'sha256'|'verification'>[];
  related: {id:string;kind:DictionaryKind;headword:string;sense_id:string;gloss_zh_tw:string}[];
}
export async function searchDictionary(client:Client,kind:DictionaryKind,query:string,page=0):Promise<DictionaryPage>{
  const {data,error}=await client.rpc('search_published_dictionary',{category:kind,query_text:query,page_number:page});
  if(error)throw new Error('字典目前無法讀取，請稍後重試；若持續失敗，請確認資料服務已啟用。');
  return data as DictionaryPage;
}
export async function readPublishedEntry(client:Client,id:string):Promise<PublishedDetail|null>{
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))return null;
  const {data,error}=await client.rpc('get_published_dictionary_entry',{entry_uuid:id});
  if(error)throw new Error('詞條目前無法讀取，請稍後重試。');
  return data as PublishedDetail|null;
}
export function sourceUrl(value:string|null):string|null {
  try {const url=new URL(value??'');return ['https:','http:'].includes(url.protocol)?url.href:null;}catch{return null;}
}
