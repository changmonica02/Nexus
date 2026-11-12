import type {SupabaseClient} from '@supabase/supabase-js';
import type {DictionaryKind,DictionaryEntry} from './dictionary';
import {validSemanticCategory} from './semanticDomains';
export const morphemeKinds=['prefix','root','suffix'] as const;
export interface CatalogFilter {scope:'all'|'word'|'morpheme';query:string;kinds:string[];domain:string|null;subdomain:string|null}
export interface CatalogItem extends DictionaryEntry {summary:string;variants:{form:string}[];sense_id?:string;matched_sense_ids?:string[];work_status?:'red'|'yellow'|'green';import_pending_count?:number;editor_pending_count?:number;inflection_matches?:{form:string;form_kind:import('./inflections').InflectionKind;sense_id:string|null}[]}
export function catalogFilter(params:URLSearchParams):CatalogFilter {
 const kind=params.get('kind'),scope=kind==='word'?'word':kind==='morpheme'||morphemeKinds.includes(kind as typeof morphemeKinds[number])?'morpheme':'all';
 const kinds=params.has('types')?(params.get('types')??'').split(',').filter(k=>morphemeKinds.includes(k as typeof morphemeKinds[number])):morphemeKinds.includes(kind as typeof morphemeKinds[number])?[kind!]:[...morphemeKinds];
 const domain=params.get('domain')||null,subdomain=params.get('subdomain')||null;
 return {scope,query:params.get('q')??'',kinds,domain:validSemanticCategory(domain,null)?domain:null,subdomain:validSemanticCategory(domain,subdomain)?subdomain:null};
}
export function catalogText(item:Pick<CatalogItem,'headword'|'kind'|'variants'|'summary'>):string {
 const name=[item.headword,...(item.kind==='word'?[]:(item.variants??[]).map(v=>v.form).filter((v,i,all)=>!!v&&v!==item.headword&&all.indexOf(v)===i))].join(' / ');
 return item.summary?name+' — '+item.summary:name;
}
export async function readCatalog(client:Pick<SupabaseClient,'rpc'>,filter:CatalogFilter,page:number,admin=false,work:string[]=[],statuses:string[]=[]):Promise<{items:CatalogItem[];total:number;has_more:boolean;page:number;stats:{red:number;yellow:number;green:number}|null}>{
 const {data,error}=await client.rpc('search_dictionary_catalog',{scope:filter.scope,query_text:filter.query,domain:filter.domain,subdomain:filter.subdomain,kind_filters:filter.kinds,work_filters:work,page_number:page,admin_mode:admin,status_filters:statuses});
 if(error)throw Error(error.code==='PGRST202'?'新版構詞資料契約尚未啟用，請先完成授權的資料庫更新。':error.message);
 return data;
}
export const catalogScope=(kinds:string[]):CatalogFilter['scope']=>kinds.length&&kinds.every(k=>k==='word')?'word':kinds.length&&kinds.every(k=>morphemeKinds.includes(k as Exclude<DictionaryKind,'word'>))?'morpheme':'all';
