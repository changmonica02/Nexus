import type {SupabaseClient} from '@supabase/supabase-js';
import type {DictionaryDetail,DictionaryEntry,DictionarySense} from './dictionary';
export const adminPageSize=100;
export const literalSearch=(text:string)=>text.replace(/[\\%_]/g,'\\$&');
export interface AdminFilter {kinds:string[];statuses:string[];query:string;page:number}
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
