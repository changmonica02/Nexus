import {currentMorphemeFields} from './retiredMorphemeFields';
import {validateMorphemeSenseFields} from './morphemeContract';
import {validateWordSegments as requireSegmentValidation} from './wordSegments';
import {mergeCoreConcepts} from './coreConcept';
import {draftsFromBundle,saveDictionaryDraft} from './draftPipeline';
import type { SupabaseClient } from "@supabase/supabase-js";
export type Bundle = Record<string, Record<string, unknown>[]>;
export interface BundleResult { items?:{entry_id:string;kind:string;headword:string;status:'new'|'modified'|'unchanged'}[]; inserted: number; updated: number; skipped: number; preview: boolean; warnings: {table:string;id:string;similar_ids:string[]}[] }
export async function normalizeDictionaryBundle(client: Pick<SupabaseClient,"rpc">, bundle: Bundle) {
  // Legacy Bundle/Markdown are adapters; partial child bundles resolve their owning entry.
  // Reuse the exact validated, current-format projection; never retain the raw legacy keys.
  const full:Bundle=parseJSONBundle(JSON.stringify(bundle));full.dictionary_entries??=[];
  const parents=new Set(Object.entries(full).filter(([t])=>t!=='dictionary_entries').flatMap(([,rs])=>rs.map(r=>String(r.entry_id))));
  for(const parent of parents){
    const entry=full.dictionary_entries.find(e=>e.id===parent);
    const ownSenses=new Set((full.dictionary_senses??[]).filter(r=>r.entry_id===parent).map(r=>r.id));
    const missingSense=Object.values(full).flat().some(r=>r.entry_id===parent&&r.sense_id&&!ownSenses.has(r.sense_id));
    const usesB2=!!full.dictionary_sense_derivations?.some(r=>r.entry_id===parent)||!!full.dictionary_examples?.some(r=>r.entry_id===parent&&('translation_zh_tw' in r||'derivation_id' in r));
    const hasDerivationRows=!!full.dictionary_sense_derivations?.some(r=>r.entry_id===parent);
    if(entry&&!missingSense&&(!usesB2||hasDerivationRows))continue;
    const {data,error}=await client.rpc('get_dictionary_entry',{entry_uuid:parent});if(error)throw new Error(error.message);if(!data)throw new Error('foreign key: parent entry not found');
    if(!entry)full.dictionary_entries.push({id:data.entry.id,kind:data.entry.kind,headword:data.entry.headword,revision:data.entry.revision});
    for(const [table,key]of [['dictionary_senses','senses'],['dictionary_relations','relations'],['dictionary_etymologies','etymologies'],['dictionary_learning_notes','learning_notes'],...(usesB2?[['dictionary_sense_derivations','derivations'] as const]:[])] as const){
      const rows=full[table]??=[];for(const old of data[key]??[])if(!rows.some(r=>r.id===old.id)){const {updated_at,source_id,...row}=old;void updated_at;void source_id;rows.push(row);}
      full[table]=rows;
    }
  }
  return draftsFromBundle(full);
}
export async function applyBundle(client: Pick<SupabaseClient,"rpc">,bundle:Bundle,preview=true,edits=false):Promise<BundleResult>{
  return saveDictionaryDraft(client,await normalizeDictionaryBundle(client,bundle),preview,edits);
}
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
/** Strict documented interchange, not a converter for legacy etymology notes. */
export async function parseDictionaryImport(raw:string,format:'csv'|'md'|'json'):Promise<Bundle> {
  if(format!=='json')throw new Error('只支援最新版 JSON 匯入；CSV 與 Markdown 舊格式已停用');
  return parseJSONBundle(raw);
}
export function parseJSONBundle(raw:string):Bundle {
  return parseJSONBundleWithIgnored(raw).bundle;
}

/** Import only current-schema fields; report every skipped input key. */
export function parseJSONBundleWithIgnored(raw:string):{bundle:Bundle;ignoredFields:string[]} {
  let parsed:unknown;
  try{parsed=JSON.parse(raw.replace(/^\uFEFF/,''));}catch{throw new Error('JSON 格式錯誤，請檢查引號、逗號及括號');}
  const ignored=new Set<string>();
  const retired=new Set(['grouping','group_data','sense_groups','primary_category','variant_group']);
  const collect=(v:unknown,path:string):void=>{
    if(Array.isArray(v)){v.forEach((item,i)=>collect(item,path+'['+i+']'));return;}
    if(!v||typeof v!=='object')return;
    const record=v as Record<string,unknown>;
    for(const [key,child] of Object.entries(record)){
      const location=path?path+'.'+key:key;
      if(retired.has(key)||(key==='category'&&Object.hasOwn(record,'gloss_zh_tw')))ignored.add(location);
      else collect(child,location);
    }
  };
  collect(parsed,'');
  const value=currentMorphemeFields(parsed);
  const object=(v:unknown):v is Record<string,unknown>=>v!==null&&typeof v==='object'&&!Array.isArray(v);
  if(!object(value))throw new Error('JSON Bundle 必須為資料表名稱對應陣列的物件');
  const schemas:Record<string,{required:string[];optional:string[]}>= {
    dictionary_pronunciations:{required:['id','entry_id','ipa'],optional:['sense_id','sort_order','revision']},
    dictionary_entries:{required:['id','kind','headword'],optional:['revision','word_segments']},
    dictionary_senses:{required:['id','entry_id','gloss_zh_tw'],optional:['part_of_speech','revision','semantic_domain','semantic_subdomain','variants']},
    dictionary_relations:{required:['id','entry_id','target_entry_id','target_sense_id'],optional:['sense_id','revision']},
    dictionary_etymologies:{required:['id','entry_id','body'],optional:['sense_id','data_source','revision']},
    dictionary_learning_notes:{required:['id','entry_id','kind','body'],optional:['sense_id','revision']},
    dictionary_examples:{required:['id','entry_id','sense_id','derivation_id','body'],optional:['sort_order','revision','translation_zh_tw']},
    dictionary_sense_derivations:{required:['id','entry_id','sense_id','gloss_zh_tw'],optional:['sort_order','revision']},
    dictionary_public_notes:{required:['id','entry_id','body'],optional:['revision']},
  };
  const bundle:Bundle={};let count=0;
  for(const [table,rows] of Object.entries(value)) {
    if(!Object.hasOwn(schemas,table)){ignored.add(table+'（不支援的資料表）');continue;}
    if(!Array.isArray(rows))throw new Error(`${table} 必須為陣列`);
    const schema=schemas[table],seen=new Set<string>();
    bundle[table]=rows.map((row,index)=>{
      const fail=(message:string):never=>{throw new Error(`${table} 第 ${index+1} 筆：${message}`);};
      if(!object(row))return fail('資料必須為物件');
      for(const key of schema.required)if(!Object.hasOwn(row,key))fail(`缺少 ${key}`);
      // Also project nested, typed current content (variant/segment records).
      // Malformed required nested values still fail the existing validators.
      const projectChildren=(field:string,fields:string[])=>{
        if(!Array.isArray(row[field]))return;
        row[field]=(row[field] as unknown[]).map((child,i)=>{
          if(!child||typeof child!=='object'||Array.isArray(child))return child;
          const copy={...child as Record<string,unknown>};
          for(const key of Object.keys(copy))if(!fields.includes(key)){
            ignored.add(table+'['+(index+1)+'].'+field+'['+(i+1)+'].'+key);
            delete copy[key];
          }
          return copy;
        });
      };
      if(table==='dictionary_senses')projectChildren('variants',['id','form','condition']);
      if(table==='dictionary_entries')projectChildren('word_segments',['id','text','hint','relation_id']);
      // Remove unsupported keys from the imported projection, not from the caller's
      // original object. The ignored paths remain visible in the preview report.
      for(const key of Object.keys(row)){
        if(!schema.required.includes(key)&&!schema.optional.includes(key)){
          ignored.add(table+'['+(index+1)+'].'+key);
          delete row[key];
        }
      }
      for(const [key,v]of Object.entries(row)) {
        if(table==='dictionary_senses'&&['semantic_domain','semantic_subdomain','variants'].includes(key))continue;
        if(key==='word_segments'){const issue=requireSegmentValidation(v,String(row.headword),String(row.kind));if(issue)fail(issue);continue;}
        if(key==='sort_order'){if(!Number.isSafeInteger(v)||Number(v)<0)fail('sort_order 必須為非負整數');continue;}
        if(key==='revision'){if(!Number.isSafeInteger(v)||Number(v)<1)fail('revision 必須為正整數');continue;}
        if(v===null&&['sense_id','part_of_speech','locale','note','translation_zh_tw','derivation_id'].includes(key)&&!schema.required.includes(key))continue;
        if(typeof v!=='string')fail(`${key} 必須為文字`);
        const text=v as string;
        if(key==='id'||key.endsWith('_id')){if(!uuid.test(text))fail(`${key} 必須為穩定 UUID`);row[key]=text.toLowerCase();}
        else if(key==='gloss_zh_tw'&&table==='dictionary_senses'&&row.part_of_speech==null&&Array.isArray(value.dictionary_entries)&&value.dictionary_entries.some(e=>object(e)&&e.id===row.entry_id&&['prefix','root','suffix'].includes(String(e.kind))))continue;
        else if(key!=='raw_text'&&(schema.required.includes(key)||key==='part_of_speech')&&!text.trim())fail(`缺少 ${key}`);
      }
      if(table==='dictionary_sense_derivations'&&row.sort_order===undefined)row.sort_order=0;
      if(table==='dictionary_senses'){const issue=validateMorphemeSenseFields(row);if(issue)fail(issue);}
      const rid=String(row.id);if(seen.has(rid))fail(`重複 ID ${rid}`);seen.add(rid);
      const enums:Record<string,string[]>={};
      if(table==='dictionary_entries')enums.kind=['word','prefix','root','suffix'];
      if(table==='dictionary_learning_notes')enums.kind=['core_concept','learning_decomposition','mnemonic_scenario'];
      for(const [key,allowed]of Object.entries(enums))if(key in row&&!allowed.includes(String(row[key])))fail(`未知 ${key}`);
      count++;return row;
    });
  }
  if(!count)throw new Error('JSON Bundle 沒有資料');
  // References may point to existing database rows; the RPC preview validates all FKs.
  if(bundle.dictionary_learning_notes)bundle.dictionary_learning_notes=mergeCoreConcepts(bundle.dictionary_learning_notes as (Record<string,unknown>&{id:string})[]) as typeof bundle.dictionary_learning_notes;
  if(ignored.size)throw new Error('最新版 JSON 不接受過時或未知欄位：'+[...ignored].join('、'));
  return {bundle,ignoredFields:[]};
}
