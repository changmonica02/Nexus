import {mergeCoreConcepts} from './coreConcept';
import {parseCSV} from './csvRows';
import {draftsFromBundle,saveDictionaryDraft,mapDictionaryDraft} from './draftPipeline';
import {parseDictionaryCSV} from './dictionaryCSV';
import type { SupabaseClient } from "@supabase/supabase-js";
export type Bundle = Record<string, Record<string, unknown>[]>;
export interface BundleResult { items?:{entry_id:string;kind:string;headword:string;status:'new'|'modified'|'unchanged'}[]; inserted: number; updated: number; skipped: number; preview: boolean; warnings: {table:string;id:string;similar_ids:string[]}[] }
export async function normalizeDictionaryBundle(client: Pick<SupabaseClient,"rpc">, bundle: Bundle) {
  // Legacy Bundle/Markdown are adapters; partial child bundles resolve their owning entry.
  parseJSONBundle(JSON.stringify(bundle));
  const full:Bundle=structuredClone(bundle);full.dictionary_entries??=[];
  const parents=new Set(Object.entries(full).filter(([t])=>t!=='dictionary_entries').flatMap(([,rs])=>rs.map(r=>String(r.entry_id))));
  for(const parent of parents){
    const entry=full.dictionary_entries.find(e=>e.id===parent);
    const ownSenses=new Set((full.dictionary_senses??[]).filter(r=>r.entry_id===parent).map(r=>r.id));
    const missingSense=Object.values(full).flat().some(r=>r.entry_id===parent&&r.sense_id&&!ownSenses.has(r.sense_id));
    if(entry&&!missingSense)continue;
    const {data,error}=await client.rpc('get_dictionary_entry',{entry_uuid:parent});if(error)throw new Error(error.message);if(!data)throw new Error('foreign key: parent entry not found');
    if(!entry)full.dictionary_entries.push({id:data.entry.id,kind:data.entry.kind,headword:data.entry.headword,revision:data.entry.revision});
    for(const [table,key]of [['dictionary_senses','senses'],['dictionary_relations','relations'],['dictionary_etymologies','etymologies'],['dictionary_learning_notes','learning_notes']] as const){
      const rows=full[table]??=[];for(const old of data[key]??[])if(!rows.some(r=>r.id===old.id)){const {updated_at,source_id,...row}=old;void updated_at;void source_id;rows.push(row);}
    }
  }
  return draftsFromBundle(full);
}
export async function applyBundle(client: Pick<SupabaseClient,"rpc">,bundle:Bundle,preview=true,edits=false):Promise<BundleResult>{
  return saveDictionaryDraft(client,await normalizeDictionaryBundle(client,bundle),preview,edits);
}
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function id(value:string,field:string) { if(!uuid.test(value))throw new Error(`${field} 必須為穩定 UUID`);return value; }
function required(row:Record<string,string>,field:string) { if(!row[field]?.trim())throw new Error(`缺少 ${field}`);return row[field]; }
export {parseCSV} from './csvRows';
/** Strict documented interchange, not a converter for legacy etymology notes. */
export async function parseDictionaryImport(raw:string,format:'csv'|'md'|'json'):Promise<Bundle> {
  if(format==='json')return parseJSONBundle(raw);
  const bundle:Bundle={dictionary_entries:[],dictionary_senses:[],dictionary_etymologies:[],dictionary_learning_notes:[]};
  if(format==='csv') {
    if(parseCSV(raw).some(row=>'kind' in row))throw new Error('Dictionary CSV v1 請使用 canonical parseDictionaryCSV 入口，避免遺漏例詞或分類');
    // Compatibility return shape only; the management UI consumes canonical drafts directly.
    const drafts=await parseDictionaryCSV(raw);
    if(drafts.some(d=>d.kind!=='word'))throw new Error('混合 CSV 請使用 Dictionary CSV v1 canonical 入口');
    for(const draft of drafts)for(const [table,rows]of Object.entries(mapDictionaryDraft(draft).bundle))bundle[table]=[...(bundle[table]??[]),...rows];
  }else{
    const match=raw.replace(/^\uFEFF/,'').match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]+)$/);
    if(!match)throw new Error('Markdown 需要 frontmatter 與正文');
    const meta:Record<string,string>={};
    for(const line of match[1].split(/\r?\n/)) {
      if(!line.trim())continue;
      const pair=line.match(/^([a-z_]+):\s*(.*)$/);if(!pair)throw new Error('僅接受單行 key: value；多行內容請放正文');
      if(Object.hasOwn(meta,pair[1]))throw new Error(`重複欄位 ${pair[1]}`);
      let value=pair[2];if(value.startsWith('"')){value=JSON.parse(value);if(typeof value!=='string')throw new Error('欄位須為文字');}
      meta[pair[1]]=value;
    }
    const allowed=['id','entry_id','sense_id','kind','data_source'];
    if('citation' in meta||'license' in meta||'source_id' in meta)throw new Error('citation / license / source_id 已淘汰，請移除這些欄位');
    if(Object.keys(meta).some(k=>!allowed.includes(k)))throw new Error('未知 Markdown 欄位，請保留原檔並人工確認');
    for(const key of ['id','entry_id','kind'])required(meta,key);
    id(meta.id,'id');id(meta.entry_id,'entry_id');if(meta.sense_id)id(meta.sense_id,'sense_id');
    if(!['historical_etymology','core_concept','learning_decomposition','mnemonic_scenario'].includes(meta.kind))throw new Error('未知內容種類');
    const record={id:meta.id,entry_id:meta.entry_id,sense_id:meta.sense_id||null,body:match[2]};
    if(meta.kind==='historical_etymology') {
      bundle.dictionary_etymologies.push({...record,data_source:meta.data_source??''});
    }else{
      if(meta.data_source)throw new Error('記憶／構詞聯想不可標記成歷史查證');
      bundle.dictionary_learning_notes.push({...record,kind:'core_concept'});
    }
  }
  if(bundle.dictionary_learning_notes)bundle.dictionary_learning_notes=mergeCoreConcepts(bundle.dictionary_learning_notes as (Record<string,unknown>&{id:string})[]) as typeof bundle.dictionary_learning_notes;return bundle;
}

/** Only the existing RPC input contract; database-owned fields cannot be imported. */
export function parseJSONBundle(raw:string):Bundle {
  let value:unknown;
  try{value=JSON.parse(raw.replace(/^\uFEFF/,''));}catch{throw new Error('JSON 格式錯誤，請檢查引號、逗號及括號');}
  const object=(v:unknown):v is Record<string,unknown>=>v!==null&&typeof v==='object'&&!Array.isArray(v);
  if(!object(value))throw new Error('JSON Bundle 必須為資料表名稱對應陣列的物件');
  const schemas:Record<string,{required:string[];optional:string[]}>= {
    dictionary_inflections:{required:['id','entry_id','form_kind','form'],optional:['sense_id','sort_order','revision']},
    dictionary_pronunciations:{required:['id','entry_id','ipa'],optional:['sense_id','locale','note','sort_order','revision']},
    dictionary_entries:{required:['id','kind','headword'],optional:['revision']},
    dictionary_senses:{required:['id','entry_id','gloss_zh_tw'],optional:['part_of_speech','revision']},
    dictionary_relations:{required:['id','entry_id','target_entry_id','target_sense_id'],optional:['sense_id','relation_kind','revision']},
    dictionary_etymologies:{required:['id','entry_id','body'],optional:['sense_id','data_source','revision']},
    dictionary_learning_notes:{required:['id','entry_id','kind','body'],optional:['sense_id','revision']},
  };
  const bundle:Bundle={};let count=0;
  for(const [table,rows] of Object.entries(value)) {
    if(table==='dictionary_sources')throw new Error('dictionary_sources 已淘汰，請移除舊來源資料');
    if(!Object.hasOwn(schemas,table))throw new Error(`未知資料表 ${table}`);
    if(!Array.isArray(rows))throw new Error(`${table} 必須為陣列`);
    const schema=schemas[table],seen=new Set<string>();
    bundle[table]=rows.map((row,index)=>{
      const fail=(message:string):never=>{throw new Error(`${table} 第 ${index+1} 筆：${message}`);};
      if(!object(row))return fail('資料必須為物件');
      for(const key of schema.required)if(!Object.hasOwn(row,key))fail(`缺少 ${key}`);
      if(['source_id','citation','license'].some(key=>Object.hasOwn(row,key)))fail('source_id / citation / license 已淘汰，請移除舊來源欄位');
      for(const [key,v]of Object.entries(row)) {
        if(!schema.required.includes(key)&&!schema.optional.includes(key))fail(`不允許欄位 ${key}（僅匯入草稿內容）`);
        if(key==='sort_order'){if(!Number.isSafeInteger(v)||Number(v)<0)fail('sort_order 必須為非負整數');continue;}
        if(key==='revision'){if(!Number.isSafeInteger(v)||Number(v)<1)fail('revision 必須為正整數');continue;}
        if(v===null&&['sense_id','part_of_speech','locale','note'].includes(key)&&!schema.required.includes(key))continue;
        if(typeof v!=='string')fail(`${key} 必須為文字`);
        const text=v as string;
        if(key==='id'||key.endsWith('_id')){if(!uuid.test(text))fail(`${key} 必須為穩定 UUID`);row[key]=text.toLowerCase();}
        else if(key!=='raw_text'&&(schema.required.includes(key)||key==='part_of_speech')&&!text.trim())fail(`缺少 ${key}`);
      }
      const rid=String(row.id);if(seen.has(rid))fail(`重複 ID ${rid}`);seen.add(rid);
      const enums:Record<string,string[]>={relation_kind:['historical_etymology','learning_decomposition']};
      if(table==='dictionary_inflections')enums.form_kind=['past','past_participle','present_participle','third_person_singular','plural','comparative','superlative'];
      if(table==='dictionary_entries')enums.kind=['word','prefix','root'];
      if(table==='dictionary_learning_notes')enums.kind=['core_concept','learning_decomposition','mnemonic_scenario'];
      for(const [key,allowed]of Object.entries(enums))if(key in row&&!allowed.includes(String(row[key])))fail(`未知 ${key}`);
      count++;return row;
    });
  }
  if(!count)throw new Error('JSON Bundle 沒有資料');
  // References may point to existing database rows; the RPC preview validates all FKs.
  if(bundle.dictionary_learning_notes)bundle.dictionary_learning_notes=mergeCoreConcepts(bundle.dictionary_learning_notes as (Record<string,unknown>&{id:string})[]) as typeof bundle.dictionary_learning_notes;return bundle;
}
