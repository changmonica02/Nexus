import {firstSenseSummary} from './flashcardLinks';
import type {SupabaseClient} from '@supabase/supabase-js';
import type {DictionaryDetail,DictionaryEntry,DictionarySense} from './dictionary';
export const adminPageSize=100;
export const literalSearch=(text:string)=>text.replace(/[\\%_]/g,'\\$&');
export interface AdminFilter {kinds:string[];statuses:string[];query:string;page:number;work?:string|string[]}
export async function listAdminEntries(client:Pick<SupabaseClient,'from'>,filter:AdminFilter){
 let request=client.from('dictionary_entries').select('id,kind,headword,status,published_at,revision,updated_at',{count:'exact'});
 if(filter.kinds.length)request=request.in('kind',filter.kinds);
 if(filter.statuses.length)request=request.in('status',filter.statuses);
 if(filter.query.trim())request=request.ilike('headword',`%${literalSearch(filter.query.trim())}%`);
 const page=Math.max(0,Math.floor(filter.page));
 const {data,error,count}=await request.order('headword').order('id').range(page*adminPageSize,(page+1)*adminPageSize-1);
 if(error)throw Error(error.message);
 return {items:(data??[]) as DictionaryEntry[],total:count??0};
}
export async function searchRelationTargets(client:Pick<SupabaseClient,'from'>,query:string){
 const {data,error}=await client.from('dictionary_entries').select('id,headword,kind,status').in('kind',['prefix','root']).ilike('headword',`%${literalSearch(query.trim())}%`).order('headword').order('id').limit(20);
 if(error)throw Error(error.message);return data??[];
}
export async function readRelationTarget(client:Pick<SupabaseClient,'rpc'>,id:string):Promise<DictionaryDetail|null>{
 // Entry-scoped RPC avoids both an unbounded table request and the API row cap.
 const {data,error}=await client.rpc('get_dictionary_entry',{entry_uuid:id});
 if(error)throw Error(error.message);return data;
}

export async function relationTargetSenses(client:Pick<SupabaseClient,'rpc'>,id:string):Promise<DictionarySense[]>{return (await readRelationTarget(client,id))?.senses??[];}

export interface AdminWorkEntry extends DictionaryEntry {work_status?:'red'|'yellow'|'green';pending_count?:number}
export async function listAdminWork(client:Pick<SupabaseClient,'rpc'|'from'>,filter:AdminFilter):Promise<{items:AdminWorkEntry[];total:number;stats:{red:number;yellow:number;green:number}|null;workAvailable:boolean}>{
 const requested=Array.isArray(filter.work)?[...new Set(filter.work)].filter(v=>['red','yellow','green'].includes(v)):[];
 // Existing production RPC accepts one color. Read its bounded, already-sorted
 // all-color stream for a two-color union; never filter just the current page.
 if(requested.length===2){
   const first=await listAdminWork(client,{...filter,work:'',page:0});
   if(!first.workAvailable||!first.stats)return first;
   const colors=requested as ('red'|'yellow'|'green')[];
   const total=colors.reduce((n,key)=>n+first.stats![key],0);
   const start=Math.max(0,Math.floor(filter.page))*adminPageSize;
   const matching=first.items.filter(row=>colors.includes(row.work_status!));
   for(let page=1;matching.length<Math.min(start+adminPageSize,total)&&page*adminPageSize<first.total;page++){
     const next=await listAdminWork(client,{...filter,work:'',page});
     if(next.total!==first.total||JSON.stringify(next.stats)!==JSON.stringify(first.stats))throw Error('Dictionary results changed. Please retry.');
     matching.push(...next.items.filter(row=>colors.includes(row.work_status!)));
   }
   return {...first,total,items:matching.slice(start,start+adminPageSize)};
 }
 const work=Array.isArray(filter.work)?requested.length===1?requested[0]:'':filter.work??'';
 const {data,error}=await client.rpc('list_dictionary_admin_work' ,{kind_filters:filter.kinds,status_filters:filter.statuses,query_text:filter.query,work_filter:work,page_number:filter.page});
 if(error){if(['PGRST202','42883'].includes(error.code)||/Could not find the function|does not exist/.test(error.message))return {...await listAdminEntries(client,filter),stats:null,workAvailable:false};throw Error(error.message);}
 return {items:data.items as AdminWorkEntry[],total:data.total as number,stats:data.stats as {red:number;yellow:number;green:number},workAvailable:true};
}

export async function adminSummaries(client:Pick<SupabaseClient,'rpc'>,items:DictionaryEntry[]){
 if(!items.length)return {} as Record<string,string>;
 const {data,error}=await client.rpc('dictionary_admin_first_senses',{entry_ids:items.map(e=>e.id)});
 if(error){
  if(!['PGRST202','42883'].includes(error.code))throw Error(error.message);
  const details=await Promise.all(items.map(e=>readRelationTarget(client,e.id)));
  return Object.fromEntries(items.map((entry,i)=>[entry.id,firstSenseSummary({entry,senses:details[i]?.senses??[]})]));
 }
 return Object.fromEntries(items.map(entry=>[entry.id,firstSenseSummary({entry,senses:((data??[]) as DictionarySense[]).filter(s=>s.entry_id===entry.id)})]));
}
