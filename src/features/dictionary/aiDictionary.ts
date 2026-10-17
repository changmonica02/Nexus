import {mergeCoreConcepts} from './coreConcept';
import {compositionRow} from './composition';
import {inflectionLabels} from './inflections';
import {createDictionaryReview} from './revisionLifecycle';
import {draftsFromBundle,saveDictionaryDraft} from './draftPipeline';
import type {SupabaseClient} from '@supabase/supabase-js';
import type {DictionaryDetail,DictionaryEntry} from './dictionary';
import type {Bundle} from './adminImport';
import {emptyGrouping,prefixCategories,primaryCategories,type DictionaryGrouping,type SenseGroupMap} from './grouping';
export interface AIMeaning {id?:string;zh_tw?:string;classification?:string|null;grouping?:{primary_category:string|null}}
export interface AIText {id?:string;text?:string;meaning_id?:string|null;data_source?:string;order?:number}
export interface AIComponent {target_id:string;headword:string;zh_tw:string;order:number;meaning_id?:string|null}
export interface AIPronunciation {id?:string;meaning_id?:string|null;locale?:string|null;ipa?:string;note?:string|null;sort_order?:number}
export interface AIInflection {id?:string;meaning_id?:string|null;form_kind?:import('./inflections').InflectionKind;form?:string;sort_order?:number}
export interface AIEntry {inflections?:AIInflection[];pronunciations?:AIPronunciation[];id?:string;revision?:number;type:'word'|'prefix'|'root';headword?:string;classification?:string|null;grouping?:Partial<DictionaryGrouping>;meanings?:AIMeaning[];components?:AIComponent[];etymology?:AIText[];core_concept?:AIText[];examples?:AIText[];relation_hints?:AIText[]}
export interface AIDocument {format:'nexus-dictionary-ai';version:1;entries:AIEntry[]}
export interface AIMeta {entry_id:string;published_entry_id:string|null;origin_ids:Record<string,string>;component_order:string[]}
export interface AISnapshot {detail:DictionaryDetail;grouping:DictionaryGrouping|null;sense_groups:SenseGroupMap;metadata:AIMeta|null}
type Client=Pick<SupabaseClient,'rpc'>;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function object(v:unknown):v is Record<string,unknown>{return !!v&&typeof v==='object'&&!Array.isArray(v);}
function keys(v:unknown,allowed:string[],where:string):asserts v is Record<string,unknown>{if(!object(v))throw Error(`${where} 必須為物件`);for(const k of Object.keys(v))if(!allowed.includes(k))throw Error(`${where} 不允許欄位 ${k}`);}
function text(v:unknown,where:string,nullable=false){if(nullable&&v===null)return;if(typeof v!=='string'||!v.trim())throw Error(`${where} 必須為非空文字`);}
function identifier(v:unknown,where:string){if(typeof v!=='string'||!uuid.test(v))throw Error(`${where} 必須為 UUID`);}
function optionalID(v:Record<string,unknown>){if(v.id!==undefined){identifier(v.id,'id');v.id=String(v.id).toLowerCase();}}
export function parseAI(raw:string):AIDocument{
 const v:unknown=JSON.parse(raw.replace(/^\uFEFF/,''));keys(v,['format','version','entries'],'文件');
 if(v.format!=='nexus-dictionary-ai'||v.version!==1||!Array.isArray(v.entries)||!v.entries.length)throw Error('需要 nexus-dictionary-ai version 1 與非空 entries');
 const ids=new Set<string>();
 for(const e of v.entries){
  if(object(e)&&('sources' in e||'source_ids' in e))throw Error('AI sources / source_ids 已淘汰，請移除舊來源欄位');
  keys(e,['id','revision','type','headword','classification','grouping','meanings','components','etymology','core_concept','learning_decomposition','story','examples','relation_hints','pronunciations','inflections'],'詞條');optionalID(e);
  if(!['word','prefix','root'].includes(String(e.type)))throw Error('未知 type');
  if(e.id){if(ids.has(String(e.id)))throw Error('重複詞條 ID');ids.add(String(e.id));if(!Number.isSafeInteger(e.revision)||Number(e.revision)<1)throw Error('既有詞條須保留 revision');}
  else if(e.revision!==undefined)throw Error('新增詞條不應有 revision');
  if(e.headword!==undefined)text(e.headword,'headword');else if(!e.id)throw Error('新增詞條缺少 headword');
  if(e.classification!==undefined){if(e.type!=='word')throw Error('classification 僅用於 Word');text(e.classification,'classification',true);}
  if(e.grouping!==undefined){if(e.type==='word')throw Error('Word 不使用 grouping');keys(e.grouping,e.type==='prefix'?['tags','variant_group']:['primary_category','tags','variant_group'],'grouping');
   if(e.grouping.tags!==undefined&&(!Array.isArray(e.grouping.tags)||e.grouping.tags.some(t=>typeof t!=='string'||!t.trim())))throw Error('tags 必須為文字陣列');
   if(e.grouping.variant_group!==undefined)text(e.grouping.variant_group,'variant_group',true);
   if(e.grouping.primary_category!==undefined&&e.grouping.primary_category!==null&&!primaryCategories.includes(e.grouping.primary_category as typeof primaryCategories[number]))throw Error('未知 Root 分類');
  }
  for(const field of ['meanings','components','etymology','core_concept','learning_decomposition','story','examples','relation_hints','pronunciations','inflections']){
   if(e[field]===undefined)continue;if(!Array.isArray(e[field]))throw Error(`${field} 必須為陣列`);
   const seen=new Set<string>();
   for(const row of e[field] as unknown[]){
    const allowed=field==='inflections'?['id','meaning_id','form_kind','form','sort_order']:field==='pronunciations'?['id','meaning_id','locale','ipa','note','sort_order']:field==='meanings'?['id','zh_tw','classification','grouping']:field==='components'?['target_id','headword','zh_tw','order','meaning_id','relation']:field==='etymology'?['id','text','meaning_id','data_source']:[ 'id','text','meaning_id','order'];
    keys(row,allowed,field);optionalID(row);if(row.order!==undefined&&(!Number.isSafeInteger(row.order)||Number(row.order)<0))throw Error('order 必須為非負整數');
    if(row.id){if(seen.has(String(row.id)))throw Error(`${field} 重複 ID`);seen.add(String(row.id));}
    if(field==='inflections'){
     if(e.type!=='word')throw Error('詞形僅適用 Word');
     if(!row.id&&(!row.form||!row.form_kind))throw Error('新增詞形需 form / form_kind');
     if(row.form!==undefined)text(row.form,'form');
     if(row.form_kind!==undefined&&!Object.hasOwn(inflectionLabels,String(row.form_kind)))throw Error('未知詞形類型');
     if(row.sort_order!==undefined&&(!Number.isSafeInteger(row.sort_order)||Number(row.sort_order)<0))throw Error('sort_order 必須為非負整數');
     if(row.meaning_id!==undefined&&row.meaning_id!==null)identifier(row.meaning_id,'meaning_id');
    }else if(field==='pronunciations'){
     if(row.ipa!==undefined)text(row.ipa,'ipa');else if(!row.id)throw Error('新增讀音缺少 ipa');
     if(row.locale!==undefined)text(row.locale,'locale',true);
     if(row.note!==undefined&&row.note!==null&&typeof row.note!=='string')throw Error('note 必須為文字或 null');
     if(row.sort_order!==undefined&&(!Number.isSafeInteger(row.sort_order)||Number(row.sort_order)<0))throw Error('sort_order 必須為非負整數');
     if(row.meaning_id!==undefined&&row.meaning_id!==null){identifier(row.meaning_id,'meaning_id');row.meaning_id=String(row.meaning_id).toLowerCase();}
    }else if(field==='meanings'){
     if(row.zh_tw!==undefined){if(e.type==='word'||row.zh_tw!=='')text(row.zh_tw,'zh_tw');}else if(!row.id)throw Error('新增義項缺少 zh_tw');
     if(row.classification!==undefined){if(e.type!=='word')throw Error('義項 classification 僅用於 Word');text(row.classification,'classification',true);}
     if(row.grouping!==undefined){if(e.type!=='prefix')throw Error('只有 Prefix 義項可有 grouping');keys(row.grouping,['primary_category'],'meaning.grouping');if(!Object.hasOwn(row.grouping,'primary_category')||(row.grouping.primary_category!==null&&!prefixCategories.includes(row.grouping.primary_category as typeof prefixCategories[number])))throw Error('未知 Prefix 分類');}
    }else if(field==='components'){
     if(e.type!=='word')throw Error('components 僅用於 Word');identifier(row.target_id,'target_id');row.target_id=String(row.target_id).toLowerCase();text(row.headword,'headword');if(typeof row.zh_tw!=='string')throw Error('zh_tw 必須為文字');
     if(!Number.isSafeInteger(row.order)||Number(row.order)<0)throw Error('order 必須為非負整數');
     if(row.meaning_id!==undefined&&row.meaning_id!==null){identifier(row.meaning_id,'meaning_id');row.meaning_id=String(row.meaning_id).toLowerCase();}
     if(row.relation!==undefined&&!['historical_etymology','learning_decomposition'].includes(String(row.relation)))throw Error('未知構詞種類');
     delete row.relation; // Accept old exchange documents; retired metadata is not current content.
     const key=String(row.order);if(seen.has(key))throw Error('components 重複 order');seen.add(key);
    }else{if(row.data_source!==undefined&&typeof row.data_source!=='string')throw Error('data_source 必須為文字');if(row.text!==undefined)text(row.text,'text');else if(!row.id)throw Error('新增內容缺少 text');if(row.meaning_id!==undefined&&row.meaning_id!==null){identifier(row.meaning_id,'meaning_id');row.meaning_id=String(row.meaning_id).toLowerCase();}}
   }
  }
 }
 for(const e of v.entries as unknown as AIEntry[]){const canonical=canonicalAIEntry(e);delete (e as unknown as Record<string,unknown>).story;delete (e as unknown as Record<string,unknown>).learning_decomposition;Object.assign(e,canonical);}
 return v as unknown as AIDocument;
}
function canonicalAIEntry(input:AIEntry):AIEntry{
 const {story,learning_decomposition,...entry}=input as AIEntry & {story?:AIText[];learning_decomposition?:AIText[]};
 const ids=[...(entry.core_concept??[]),...(learning_decomposition??[]),...(story??[])].flatMap(r=>r.id?[r.id]:[]);if(new Set(ids).size!==ids.length)throw Error('核心概念重複 ID；請保留原檔並確認。');
 return {...entry,...(story!==undefined||learning_decomposition!==undefined?{core_concept:[...(entry.core_concept??[]),...(learning_decomposition??[]),...(story??[])]}:{})};
}
export async function readAI(client:Client,id:string):Promise<AISnapshot>{const {data,error}=await client.rpc('get_dictionary_ai_snapshot',{entry_uuid:id});if(error)throw Error(error.message);if(!data)throw Error('找不到詞條');return data as AISnapshot;}
export async function readAll<T>(client:Pick<SupabaseClient,'from'>,table:string,order='id'):Promise<T[]>{const all:T[]=[];for(let offset=0;;offset+=500){const {data,error}=await client.from(table).select('*').order(order).range(offset,offset+499);if(error)throw Error(error.message);all.push(...data as T[]);if(data.length<500)return all;}}
export function chooseExport(entries:DictionaryEntry[],meta:AIMeta[],scope:'draft'|'published'|'all',kind:string,query:string,selected:string[]|null){
 const hidden=new Set(scope==='all'?meta.filter(m=>m.published_entry_id&&entries.some(e=>e.id===m.entry_id&&e.status==='draft')).map(m=>m.published_entry_id):[]);
 const selectedLogical=selected?new Set(selected.flatMap(id=>[id,...meta.filter(m=>m.published_entry_id===id||m.entry_id===id).flatMap(m=>[m.entry_id,m.published_entry_id!])])):null;
 return entries.filter(e=>(scope==='all'||e.status===scope)&&!hidden.has(e.id)&&(kind==='all'||e.kind===kind)&&e.headword.toLowerCase().includes(query.toLowerCase())&&(!selectedLogical||selectedLogical.has(e.id)));
}
export function categoryMatches(s:AISnapshot,category:string){return !category||(s.detail.entry.kind==='prefix'?s.detail.senses.some(x=>category==='__ungrouped__'?!s.sense_groups[x.id]:s.sense_groups[x.id]===category):s.detail.entry.kind==='root'&&(category==='__ungrouped__'?!s.grouping?.primary_category:s.grouping?.primary_category===category));}
export function toAI(s:AISnapshot,targets:Map<string,AISnapshot>):AIEntry{
 const d=s.detail,e=d.entry,order=s.metadata?.component_order??[];
 if((d.lexical_annotations??[]).some(r=>r.kind!=='relation_hint'))throw Error('資料仍含已淘汰的字形註釋；請完成資料庫遷移後重新匯出，不會靜默省略。');
 const content=(kind:string)=> (kind==='etymology'?d.etymologies:mergeCoreConcepts(d.learning_notes).filter(n=>n.kind===kind)).map(r=>({id:r.id,text:r.body,meaning_id:r.sense_id,...(kind==='etymology'?{data_source:'data_source' in r?r.data_source:''}:{})}));
 return {id:e.id,revision:e.revision,type:e.kind,headword:e.headword,
 ...(e.kind==='word'?{...(d.senses.length===1?{classification:d.senses[0]?.part_of_speech??null}:{})}: {grouping:e.kind==='prefix'?{tags:s.grouping?.tags??[],variant_group:s.grouping?.variant_group??null}:s.grouping??emptyGrouping()}),
 meanings:d.senses.map(r=>({id:r.id,zh_tw:r.gloss_zh_tw,...(e.kind==='word'?{classification:r.part_of_speech}:e.kind==='prefix'?{grouping:{primary_category:s.sense_groups[r.id]??null}}:{})})),
 ...(e.kind==='word'?{components:[...d.relations].sort((a,b)=>(order.includes(a.id)?order.indexOf(a.id):999999)-(order.includes(b.id)?order.indexOf(b.id):999999)||a.id.localeCompare(b.id)).map((r,i)=>{const t=targets.get(r.target_entry_id)?.detail;const sense=t?.senses.find(x=>x.id===r.target_sense_id);if(!t||!sense)throw Error('構詞目標無法讀取，已停止匯出');return {target_id:r.target_entry_id,headword:t.entry.headword,zh_tw:sense.gloss_zh_tw,order:i,meaning_id:r.sense_id};})}:{}),
 inflections:(d.inflections??[]).map(p=>({id:p.id,meaning_id:p.sense_id,form_kind:p.form_kind,form:p.form,sort_order:p.sort_order})),
 pronunciations:(d.pronunciations??[]).map(p=>({id:p.id,meaning_id:p.sense_id,locale:p.locale,ipa:p.ipa,note:p.note,sort_order:p.sort_order})),
 examples:(d.examples??[]).map(r=>({id:r.id,text:r.body,meaning_id:r.sense_id,order:r.sort_order})),relation_hints:(d.lexical_annotations??[]).filter(r=>r.kind==='relation_hint').map(r=>({id:r.id,text:r.body,meaning_id:r.sense_id,order:r.sort_order})),
 etymology:content('etymology'),core_concept:content('core_concept'),
 };
}
export interface AIChange {label:string;before:unknown;after:unknown;kind:'新增'|'修改'|'缺少'}
export interface AIPlan {input:AIEntry;baseline:AISnapshot|null;bundle:Bundle;group_data:DictionaryGrouping;sense_groups:{sense_id:string;primary_category:string|null}[];component_order:string[];origin_ids:Record<string,string>;published_entry_id:string|null;changes:AIChange[];warnings:string[];conflict:boolean;target_id:string}
const clean=(r:object)=>{const x={...r} as Record<string,unknown>;for(const k of ['updated_at','published_at','status','source_id'])delete x[k];return x;};
/** No remove operations: omissions are retained in the candidate and reported. */
export function planAI(input:AIEntry,current:AISnapshot|null,targets:Map<string,AISnapshot>,makeID:()=>string=()=>crypto.randomUUID()):AIPlan{
 if(input.id&&!current)throw Error('未知 id；新增詞條請省略 id，不可改造識別欄位');
 if(current&&input.type!==current.detail.entry.kind)throw Error('type 不可修改');
 const published=current?.detail.entry.status==='published',origin:Record<string,string>={};
 const map=(id:string)=>id; // Review snapshots preserve canonical child identity.
 const target=current?map(current.detail.entry.id):makeID();
 input=canonicalAIEntry(input);
 const bundle:Bundle={dictionary_inflections:[],dictionary_pronunciations:[],dictionary_entries:[],dictionary_senses:[],dictionary_relations:[],dictionary_etymologies:[],dictionary_learning_notes:[],dictionary_examples:[],dictionary_lexical_annotations:[]};
 const changes:AIChange[]=[],warnings:string[]=[];
 if((current?.detail.senses.length??0)>1&&input.classification!==undefined)warnings.push('多義詞的 classification 僅作新義項預設；既有義項的詞性請在 meanings 中逐筆修改。');
 const before=current?toAI(current,targets):null;
 for(const field of ['headword','classification','grouping','meanings','components','etymology','core_concept','examples','relation_hints','pronunciations','inflections'] as const){
  if(input[field]===undefined&&before?.[field]!==undefined){warnings.push(`缺少 ${field}：保留原資料`);changes.push({label:field,before:before[field],after:before[field],kind:'缺少'});}
  else if(input[field]!==undefined&&JSON.stringify(input[field])!==JSON.stringify(before?.[field]))changes.push({label:field,before:before?.[field]??null,after:input[field],kind:before?.[field]===undefined?'新增':'修改'});
 }
 if(current){
  bundle.dictionary_entries=[clean(current.detail.entry)];
  for(const [key,rows] of [['dictionary_inflections',current.detail.inflections??[]],['dictionary_pronunciations',current.detail.pronunciations??[]],['dictionary_senses',current.detail.senses],['dictionary_relations',current.detail.relations],['dictionary_etymologies',current.detail.etymologies],['dictionary_learning_notes',current.detail.learning_notes],['dictionary_examples',current.detail.examples??[]],['dictionary_lexical_annotations',current.detail.lexical_annotations??[]]] as const)bundle[key]=rows.map(row=>key==='dictionary_relations'?compositionRow(clean(row)):clean(row));
 }
 const entry=bundle.dictionary_entries[0]??{id:target,kind:input.type};bundle.dictionary_entries=[{...entry,headword:input.headword??entry.headword}];
 const group={...(current?.grouping??emptyGrouping()),...input.grouping};
 const sg:SenseGroupMap=Object.fromEntries(Object.entries(current?.sense_groups??{}).map(([id,c])=>[map(id),c]));
 const checkMissing=(rows:{id?:string}[]|undefined,old:{id?:string}[],label:string)=>{const missing=old.filter(o=>!rows?.some(r=>r.id===o.id));if(missing.length)warnings.push(`${label} 缺少 ${missing.length} 筆：保留原資料，不刪除`);};
 checkMissing(input.meanings,before?.meanings??[],'中文義');
 for(const m of input.meanings??[]){const old=m.id?current?.detail.senses.find(s=>s.id===m.id):null;if(m.id&&!old)throw Error('meaning id 不屬於此詞條');if(old&&m.zh_tw===undefined)warnings.push('中文義缺少 zh_tw：保留原文');const id=m.id?map(m.id):makeID();const rows=bundle.dictionary_senses;const r=rows.find(s=>s.id===id)??{id,entry_id:target};
  if(m.zh_tw!==undefined){r.gloss_zh_tw=m.zh_tw;}
  if(input.type==='word')r.part_of_speech=m.classification??r.part_of_speech??input.classification;
  else r.part_of_speech=null;
  if(!rows.includes(r))rows.push(r);if(m.grouping)sg[id]=m.grouping.primary_category;
 }
 if(input.type==='word'&&input.classification!==undefined&&bundle.dictionary_senses.length===1&&(input.meanings?.[0]?.classification===undefined||input.meanings?.[0]?.classification===before?.meanings?.[0]?.classification))bundle.dictionary_senses[0].part_of_speech=input.classification;
 if(!bundle.dictionary_senses.length)throw Error('至少需要一筆中文義');
 if(input.type==='word'&&bundle.dictionary_senses.some(r=>!r.part_of_speech))throw Error('Word 需要 classification（詞性）');
 const incomingSenses=bundle.dictionary_senses.filter(s=>(input.meanings??[]).some(m=>m.id?s.id===m.id:!current?.detail.senses.some(old=>old.id===s.id)));
 const defaultSense=incomingSenses.length===1?String(incomingSenses[0].id):bundle.dictionary_senses.length===1?String(bundle.dictionary_senses[0].id):null;
 const newScope=(item:AIText)=>{if(item.meaning_id!==undefined)return item.meaning_id;if(defaultSense)return defaultSense;throw Error('多義詞的新內容必須提供 meaning_id；明確共用時可填 null');};
 const ownSense=(id:string|undefined|null)=>{if(!id)return null;const mapped=origin[id]??id;if(!bundle.dictionary_senses.some(s=>s.id===mapped))throw Error('meaning_id 不屬於此詞條');return mapped;};
 for(const [field,table,kind] of [['etymology','dictionary_etymologies',null],['core_concept','dictionary_learning_notes','core_concept']] as const){
  checkMissing(input[field],before?.[field]??[],field);
  for(const item of input[field]??[]){const old=item.id?(field==='etymology'?current?.detail.etymologies:current?.detail.learning_notes.filter(n=>n.kind===kind))?.find(r=>r.id===item.id):null;if(item.id&&!old)throw Error(`${field} id 不屬於此內容區`);
   const id=item.id?map(item.id):makeID(),rows=bundle[table],r=rows.find(r=>r.id===id)??{id,entry_id:target,sense_id:ownSense(newScope(item)),...(kind?{kind}:{data_source:''})};
   if(item.text!==undefined&&item.text!==r.body){r.body=item.text;}
   if(!kind&&item.data_source!==undefined&&item.data_source!==r.data_source){r.data_source=item.data_source;}
   if(item.meaning_id!==undefined)r.sense_id=ownSense(item.meaning_id);if(!rows.includes(r))rows.push(r);
  }
 }
 for(const [field,table,kind] of [['examples','dictionary_examples',null],['relation_hints','dictionary_lexical_annotations','relation_hint']] as const){
  checkMissing(input[field],before?.[field]??[],field);
  for(const item of input[field]??[]){const old=item.id?(field==='examples'?current?.detail.examples:current?.detail.lexical_annotations?.filter(r=>r.kind===kind))?.find(r=>r.id===item.id):null;if(item.id&&!old)throw Error(`${field} id 不屬於此詞條`);
   const id=item.id?map(item.id):makeID(),rows=bundle[table],r=rows.find(r=>r.id===id)??{id,entry_id:target,sense_id:ownSense(newScope(item)),sort_order:rows.length,...(kind?{kind}:{})};
   if(item.text!==undefined)r.body=item.text;if(item.meaning_id!==undefined)r.sense_id=ownSense(item.meaning_id);if(item.order!==undefined)r.sort_order=item.order;if(!rows.includes(r))rows.push(r);
  }
 }
 checkMissing(input.pronunciations,before?.pronunciations??[],'讀音');
 for(const p of input.pronunciations??[]){
  const old=p.id?current?.detail.pronunciations?.find(r=>r.id===p.id):null;
  if(p.id&&!old)throw Error('pronunciation id 不屬於此詞條');
  const rid=p.id??makeID(),rows=bundle.dictionary_pronunciations;
  const row=rows.find(r=>r.id===rid)??{id:rid,entry_id:target,sense_id:null,locale:null,note:null,sort_order:rows.length};
  if(p.ipa!==undefined)row.ipa=p.ipa;
  if(p.locale!==undefined)row.locale=p.locale;if(p.note!==undefined)row.note=p.note;
  if(p.meaning_id!==undefined)row.sense_id=ownSense(p.meaning_id);
  if(p.sort_order!==undefined)row.sort_order=p.sort_order;
  if(!rows.includes(row))rows.push(row);
 }
 checkMissing(input.inflections,before?.inflections??[],'詞形');
 for(const p of input.inflections??[]){
  const old=p.id?current?.detail.inflections?.find(r=>r.id===p.id):null;if(p.id&&!old)throw Error('inflection id 不屬於此詞條');
  const rid=p.id??makeID(),rows=bundle.dictionary_inflections,row=rows.find(r=>r.id===rid)??{id:rid,entry_id:target,sense_id:null,sort_order:rows.length};
  if(p.form!==undefined)row.form=p.form;if(p.form_kind!==undefined)row.form_kind=p.form_kind;
  if(p.meaning_id!==undefined)row.sense_id=ownSense(p.meaning_id);if(p.sort_order!==undefined)row.sort_order=p.sort_order;
  if(!rows.includes(row))rows.push(row);
 }
 const ordered:string[]=[];
 for(const c of [...(input.components??[])].sort((a,b)=>a.order-b.order)){
  const t=targets.get(c.target_id)?.detail;if(!t||t.entry.id===target||t.entry.headword!==c.headword)throw Error('構詞目標 ID／拼寫不符，請重新選擇字首或字根');
  const options=t.senses.filter(s=>s.gloss_zh_tw===c.zh_tw);if(options.length!==1)throw Error('構詞中文義不存在或有多個候選，不能自動配對');
  const own=c.meaning_id==null?null:ownSense(c.meaning_id);
  let r=bundle.dictionary_relations.find(r=>r.sense_id===own&&r.target_sense_id===options[0].id);
  if(!r){r={id:makeID(),entry_id:target,sense_id:own,target_entry_id:c.target_id,target_sense_id:options[0].id};bundle.dictionary_relations.push(r);}if(ordered.includes(String(r.id)))throw Error('重複構詞關聯');ordered.push(String(r.id));
 }
 const previousOrder=(current?.metadata?.component_order??[]).map(map);
 const remaining=bundle.dictionary_relations.filter(r=>!ordered.includes(String(r.id))).sort((a,b)=>(previousOrder.includes(String(a.id))?previousOrder.indexOf(String(a.id)):999999)-(previousOrder.includes(String(b.id))?previousOrder.indexOf(String(b.id)):999999));if(remaining.length)warnings.push(`構詞缺少 ${remaining.length} 筆：保留原關聯`);
 ordered.push(...remaining.map(r=>String(r.id)));
 if(current&&(input.meanings??[]).some(m=>!m.id)&&[...current.detail.etymologies,...current.detail.learning_notes,...(current.detail.examples??[]),...(current.detail.lexical_annotations??[])].some(r=>!r.sense_id))warnings.push('既有未限定義項的內容將保留為詞條共用；若只屬於特定义項，請先在編輯器指定後重新產生 Diff。');
 if(published)warnings.push('已發布內容保持不變；接受後建立關聯的審核草稿，不直接發布。');
 return {input,baseline:current,bundle,group_data:group,sense_groups:bundle.dictionary_senses.map(r=>({sense_id:String(r.id),primary_category:sg[String(r.id)]??null})),component_order:ordered,origin_ids:origin,published_entry_id:published?current!.detail.entry.id:current?.metadata?.published_entry_id??null,changes,warnings,conflict:!!current&&input.revision!==current.detail.entry.revision,target_id:target};
}
export async function submitAI(client:Client,plan:AIPlan,preview:boolean){
 if(plan.conflict)throw Error('版本衝突：請重新產生 Diff');
 const drafts=draftsFromBundle(plan.bundle,plan.group_data,Object.fromEntries(plan.sense_groups.map(s=>[s.sense_id,s.primary_category])));
 if(plan.baseline?.detail.entry.status==='published')return createDictionaryReview(client,plan.baseline,drafts[0],'ai',preview,plan.component_order);
 return saveDictionaryDraft(client,drafts,preview,true,{entry_uuid:plan.input.id??null,expected_snapshot:plan.baseline,component_order:plan.component_order,origin_ids:plan.origin_ids});
}

/** Resolve a new AI document to a canonical Entry before presenting its human-reviewed Diff. */
export async function matchAIEntry(client:Client,input:AIEntry):Promise<{input:AIEntry;current:AISnapshot|null;matched:boolean}>{
 if(input.id)return {input,current:await readAI(client,input.id),matched:false};
 const candidate={bundle:{dictionary_entries:[{id:crypto.randomUUID(),kind:input.type,headword:input.headword}]}};
 const {data,error}=await client.rpc('inspect_dictionary_import',{drafts:[candidate]});if(error)throw Error(error.message);
 const matches=(data?.[0]?.similar??[]) as {id:string}[];
 if(matches.length>1)throw Error('既有同類同拼寫有多個 Entry，須先人工確認 stable identity，不能再新增詞條');
 if(!matches.length)return {input,current:null,matched:false};
 const current=await readAI(client,matches[0].id);
 return {input:{...input,id:current.detail.entry.id,revision:current.detail.entry.revision,headword:current.detail.entry.headword},current,matched:true};
}
