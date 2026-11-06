import type { SupabaseClient } from '@supabase/supabase-js';
import {offline,readPublicCache,savePublicCache} from './publicCache';
import type { DictionaryDetail, DictionaryEntry, DictionaryKind } from './dictionary';
type Client=Pick<SupabaseClient,'rpc'>;
export interface DictionaryPage { items: (Pick<DictionaryEntry,'id'|'kind'|'headword'>&{inflection_matches?:{form:string;form_kind:import('./inflections').InflectionKind;sense_id:string|null}[]})[]; has_more:boolean; page:number; total?:number }
type PublicRow<T> = Omit<T,'revision'|'updated_at'>;
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
async function publicRequest<T>(key:string,load:()=>Promise<T>,errorMessage:string):Promise<T> {
  if(offline()) {
    const cached=await readPublicCache<T>(key);
    if(cached!==undefined)return cached;
    throw new Error('此內容尚未離線保存，請連線後閱讀。');
  }
  try {
    const result=await load();
    await savePublicCache(key,result);
    return result;
  } catch {
    // Do not hide server-side publication changes behind stale content while online.
    throw new Error(errorMessage);
  }
}
export async function searchDictionary(client:Client,kind:DictionaryKind|'all',query:string,page=0):Promise<DictionaryPage>{
  const key=JSON.stringify(['search',kind,query,page]);
  return publicRequest(key,async()=>{
    const {data,error}=await client.rpc('search_published_dictionary',{category:kind,query_text:query,page_number:page});
    if(error)throw error;
    return data as DictionaryPage;
  },'字典目前無法讀取，請稍後重試；若持續失敗，請確認資料服務已啟用。');
}
/** Dictionary browsing includes attached forms; card suggestions retain the original headword contract. */
export async function searchDictionaryWithInflections(client:Client,kind:DictionaryKind|'all',query:string,page=0):Promise<DictionaryPage>{
  const key=JSON.stringify(['inflections',kind,query,page]);
  return publicRequest(key,async()=>{
    const {data,error}=await client.rpc('search_dictionary_with_inflections',{category:kind,query_text:query,page_number:page});
    if(error)throw error;
    return data as DictionaryPage;
  },'字典目前無法讀取，請稍後重試；若持續失敗，請確認資料服務已啟用。');
}
const entryRequests=new WeakMap<Client,Map<string,Promise<PublishedDetail|null>>>();
export async function readPublishedEntry(client:Client,id:string,revalidate=false):Promise<PublishedDetail|null>{
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))return null;
  const modeKey=(offline()?'offline:':'online:')+id;
  let pending=entryRequests.get(client);if(!pending){pending=new Map();entryRequests.set(client,pending);}
  const existing=pending.get(modeKey);
  if(existing){
    if(!revalidate)return existing;
    // A commit must not reuse a response requested before it finished. Let that
    // response/cache write settle, then fetch and cache the current public state.
    await existing.catch(()=>undefined);
    return readPublishedEntry(client,id,true);
  }
  const request=publicRequest('entry:'+id,async()=>{
    const {data,error}=await client.rpc('get_published_dictionary_entry',{entry_uuid:id});
    if(error)throw error;
    return data as PublishedDetail|null;
  },'詞條目前無法讀取，請稍後重試。');
  pending.set(modeKey,request);
  try{return await request;}finally{pending.delete(modeKey);}
}

/** Deduplicate linked targets and bound concurrency; no second cache or draft reads. */
export async function readPublishedTargets(client:Client,ids:string[],active:()=>boolean=()=>true):Promise<Map<string,PublishedDetail>> {
  const queue=[...new Set(ids)],result=new Map<string,PublishedDetail>();
  let cursor=0;
  await Promise.all(Array.from({length:Math.min(4,queue.length)},async()=>{
    while(active()&&cursor<queue.length){const id=queue[cursor++];try{const detail=await readPublishedEntry(client,id);if(active()&&detail?.entry.id===id&&detail.entry.status==='published')result.set(id,detail);}catch{/* A reading aid cannot block the published article. */}}
  }));
  return result;
}
