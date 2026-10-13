import type {SupabaseClient} from '@supabase/supabase-js';
import {dictionaryReturn,entryHref,searchRelations} from './browseRelations';
import {searchGrouping} from './grouping';
import {searchDictionaryWithInflections} from './reader';
import type {DictionaryKind} from './dictionary';
export interface BrowseRow {id:string;headword:string;kind:DictionaryKind;sense_id?:string;gloss_zh_tw?:string;inflection_matches?:{form:string;form_kind:import('./inflections').InflectionKind;sense_id:string|null}[]}
export interface BrowsePage {items:BrowseRow[];has_more:boolean;page:number}
type Client=Pick<SupabaseClient,'from'|'rpc'>;
export function browseContext(from:string|null):string|null{
 let value=from;
 for(let depth=0;depth<8&&value;depth++){
  const valid=dictionaryReturn(value,'');if(!valid)return null;
  const u=new URL(valid,'https://nexus.invalid');if(u.pathname==='/dictionary')return valid;
  value=u.searchParams.get('from');
 }
 return null;
}
export async function loadBrowsePage(client:Client,context:string,pageOverride?:number):Promise<BrowsePage>{
 const p=new URL(context,'https://nexus.invalid').searchParams;
 const raw=p.get('kind'),kind=raw==='word'||raw==='prefix'||raw==='root'?raw:'all';
 const page=pageOverride??Math.max(0,Math.floor(Number(p.get('page'))||0)),q=p.get('q')??'';
 if((kind==='prefix'||kind==='root')&&p.get('category')&&!p.get('variant'))return searchGrouping(client,kind,q,page,p.get('category')!);
 if(kind!=='all'&&(p.get('component')||p.get('variant')))return searchRelations(client,kind,q,page,{component:kind==='word'?p.get('component')??'':'',sense:p.get('sense')??'',variant:kind!=='word'?p.get('variant')??'':''});
 return searchDictionaryWithInflections(client,kind,q,page);
}
export async function readerNeighbours(client:Client,id:string,headword:string,from:string|null,sense?:string){
 const context=browseContext(from);
 if(!context){
  // Direct URL: keyset neighbours, never walk the full catalog.
  const quoted='"'+headword.replace(/\\/g,'\\\\').replace(/"/g,'\\"')+'"';
  const one=async(forward:boolean)=>{const op=forward?'gt':'lt';const {data,error}=await client.from('dictionary_entries').select('id,headword,kind').eq('status','published').or(`headword.${op}.${quoted},and(headword.eq.${quoted},id.${op}.${id})`).order('headword',{ascending:forward}).order('id',{ascending:forward}).limit(1);if(error)throw Error(error.message);return data?.[0]?`/dictionary/${data[0].id}`:null;};
  const [previous,next]=await Promise.all([one(false),one(true)]);return {previous,next};
 }
 const current=await loadBrowsePage(client,context),index=current.items.findIndex(row=>row.id===id&&(!sense||row.sense_id===sense));
 if(index<0)return {previous:null,next:null};
 const href=(row:BrowseRow|undefined,page:number)=>{if(!row)return null;const u=new URL(context,'https://nexus.invalid');u.searchParams.set('page',String(page));return entryHref(row.id,u.pathname+u.search,row.sense_id);};
 let previous=href(current.items[index-1],current.page),next=href(current.items[index+1],current.page);
 if(index===0&&current.page>0){const p=await loadBrowsePage(client,context,current.page-1);previous=href(p.items.at(-1),p.page);}
 if(index===current.items.length-1&&current.has_more){const p=await loadBrowsePage(client,context,current.page+1);next=href(p.items[0],p.page);}
 return {previous,next};
}
export function swipeDirection(dx:number,dy:number,elapsed:number,editing:boolean):'next'|'previous'|null{
 if(editing||elapsed>700||Math.abs(dx)<70||Math.abs(dx)<Math.abs(dy)*1.5)return null;
 return dx<0?'next':'previous';
}
