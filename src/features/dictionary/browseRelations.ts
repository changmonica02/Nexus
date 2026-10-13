import type {SupabaseClient} from '@supabase/supabase-js';
import type {DictionaryKind} from './dictionary';
import type {DictionaryPage} from './reader';
export interface BrowseFilter {component?:string;sense?:string;variant?:string;category?:string}
export function dictionaryReturn(value:string|null,fallback='/dictionary'):string {
  if(!value||value.length>16000)return fallback;
  try {const url=new URL(value,'https://nexus.invalid');if(url.origin==='https://nexus.invalid'&&/^\/dictionary(?:\/[0-9a-f-]{36})?$/.test(url.pathname))return url.pathname+url.search+url.hash;}catch{}
  return fallback;
}
export function browseHref(kind:DictionaryKind,filter:BrowseFilter={},from?:string):string {
  const p=new URLSearchParams({kind});for(const [key,value]of Object.entries(filter))if(value)p.set(key,value);
  if(from)p.set('from',dictionaryReturn(from));return `/dictionary?${p}`;
}
export function entryHref(id:string,from:string,sense?:string):string {return `/dictionary/${id}?from=${encodeURIComponent(dictionaryReturn(from))}${sense?`#sense-${sense}`:''}`;}
const literal=(text:string)=>text.replace(/[\\%_]/g,'\\$&');
/** Existing FK embeds perform filtering before pagination; no client-side full dictionary scan. */
export async function searchRelations(client:Pick<SupabaseClient,'from'>,kind:DictionaryKind,query:string,page:number,filter:BrowseFilter):Promise<DictionaryPage>{
  let select='id,kind,headword';
  if(filter.component)select+=',relations:dictionary_relations!dictionary_relations_source_entry_fkey!inner(target_entry_id,target_sense_id)';
  if(filter.variant)select+=',grouping:dictionary_entry_groups!inner(variant_group)';
  let request=client.from('dictionary_entries').select(select).eq('status','published').eq('kind',kind).ilike('headword',`%${literal(query)}%`);
  if(filter.component){request=request.eq('relations.target_entry_id',filter.component);if(filter.sense)request=request.eq('relations.target_sense_id',filter.sense);}
  if(filter.variant)request=request.ilike('grouping.variant_group',`%${literal(filter.variant)}%`);
  const {data,error}=await request.order('headword').order('id').range(page*20,page*20+20);
  if(error)throw new Error('關聯詞條無法讀取，請重試。');
  const rows=(data??[]) as unknown as DictionaryPage['items'];
  return {items:rows.slice(0,20).map(({id,kind,headword})=>({id,kind,headword})),has_more:rows.length>20,page};
}
export async function resolveVariant(client:Pick<SupabaseClient,'from'>,kind:DictionaryKind,word:string):Promise<DictionaryPage['items']>{
  const {data,error}=await client.from('dictionary_entries').select('id,kind,headword').eq('status','published').eq('kind',kind).ilike('headword',literal(word.trim())).order('id').limit(21);
  if(error)throw new Error('變體詞條無法讀取，請重試。');return data??[];
}
