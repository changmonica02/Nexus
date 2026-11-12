import type {SupabaseClient} from '@supabase/supabase-js';
import {adminPageSize,listAdminWork,type AdminFilter} from './adminQueries';
import type {DictionaryEntry} from './dictionary';
export function adminContext(value:string|null):AdminFilter|null {
  if(!value||!value.startsWith('/dictionary/admin?'))return null;
  const url=new URL(value,'https://nexus.invalid');if(url.origin!=='https://nexus.invalid'||url.pathname!=='/dictionary/admin')return null;
  const p=url.searchParams;if(['entry','new','from'].some(key=>p.has(key))||!['kinds','statuses','work','q','page','catalog','scope','domain','subdomain'].some(key=>p.has(key)))return null;const page=Number(p.get('page')??0);if(!Number.isSafeInteger(page)||page<0)return null;const list=(key:string,allowed:string[])=>[...new Set((p.get(key)??'').split(',').filter(v=>allowed.includes(v)))];
  return {kinds:list('kinds',['word','prefix','root','suffix']),statuses:list('statuses',['draft','published']),work:list('work',['red','yellow','green']),query:p.get('q')??'',page,...(p.get('catalog')==='1'?{catalog:true,scope:['word','morpheme'].includes(p.get('scope')??'')?p.get('scope') as 'word'|'morpheme':'all',domain:p.get('domain')||null,subdomain:p.get('subdomain')||null}:{})};
}
export function adminListHref(filter:AdminFilter):string {
  return '/dictionary/admin?'+new URLSearchParams({kinds:filter.kinds.join(','),statuses:filter.statuses.join(','),work:Array.isArray(filter.work)?filter.work.join(','):filter.work??'',q:filter.query,page:String(filter.page),...(filter.catalog?{catalog:'1',scope:filter.scope??'all',domain:filter.domain??'',subdomain:filter.subdomain??''}:{})});
}
export function adminEntryHref(id:string,filter:AdminFilter):string{return '/dictionary/admin?'+new URLSearchParams({entry:id,from:adminListHref(filter)});}
type Client=Pick<SupabaseClient,'rpc'|'from'>;
export async function adminNeighbours(client:Client,entry:DictionaryEntry,from:string|null):Promise<{previous:string|null;next:string|null}> {
  const context=adminContext(from);
  if(context){
    const current=await listAdminWork(client,context),index=current.items.findIndex(e=>e.id===entry.id);
    if(index<0)throw Error('draft.listChanged');
    const href=(row:DictionaryEntry|undefined,page:number)=>row?adminEntryHref(row.id,{...context,page}):null;
    let previous=href(current.items[index-1],context.page),next=href(current.items[index+1],context.page);
    if(index===0&&context.page>0){const page=await listAdminWork(client,{...context,page:context.page-1});if(page.total!==current.total)throw Error('draft.listChanged');previous=href(page.items.at(-1),context.page-1);}
    if(index===current.items.length-1&&(context.page+1)*adminPageSize<current.total){const page=await listAdminWork(client,{...context,page:context.page+1});if(page.total!==current.total)throw Error('draft.listChanged');next=href(page.items[0],context.page+1);}
    return {previous,next};
  }
  // Direct edits: stable keyset order within the same entry kind, not a catalog scan.
  const quoted='"'+entry.headword.replace(/\\/g,'\\\\').replace(/"/g,'\\"')+'"';
  const one=async(forward:boolean)=>{const op=forward?'gt':'lt';const {data,error}=await client.from('dictionary_entries').select('id').eq('kind',entry.kind).or(`headword.${op}.${quoted},and(headword.eq.${quoted},id.${op}.${entry.id})`).order('headword',{ascending:forward}).order('id',{ascending:forward}).limit(1);if(error)throw Error(error.message);return data?.[0]?'/dictionary/admin?entry='+encodeURIComponent(data[0].id):null;};
  const [previous,next]=await Promise.all([one(false),one(true)]);return {previous,next};
}
