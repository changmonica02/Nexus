import {mergeCoreConcepts} from './coreConcept';
import {compositionRow} from './composition';
import {availableInflections,inflectionIdentity,inflectionLabels} from './inflections';
import type {SupabaseClient} from '@supabase/supabase-js';
import type {Bundle, BundleResult} from './adminImport';
import type {DictionaryKind} from './dictionary';
import type {DictionaryGrouping} from './grouping';
import {prefixCategories,primaryCategories} from './dictionaryCategories';

export type DraftRow = Record<string, unknown> & {id:string};
/** Content model: adapters never need to know which grouping table stores a category. */
export interface DictionaryDraftInput {
  kind:DictionaryKind; entry_id:string; headword:string; revision?:number;
  senses:(DraftRow & {part_of_speech:string|null;gloss_zh_tw:string;category?:string|null;row?:number})[];
  pronunciations?:DraftRow[]; inflections?:DraftRow[];
  etymologies:DraftRow[]; learning_notes:DraftRow[]; relations:DraftRow[];
  examples:DraftRow[]; relation_hints:DraftRow[];
  component_order?:string[]; grouping?:DictionaryGrouping; row?:number; proposed_ids?:string[];
}
export interface DraftIssue {row:number;field:string;kind:string;error:string}
export class DraftValidationError extends Error {
  constructor(public issues:DraftIssue[]){super(issues.map(i=>`第 ${i.row} 列 · 類型：${i.kind} · 欄位：${i.field} · 錯誤：${i.error}`).join('\n'));}
}
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function validateDictionaryDraft(drafts:DictionaryDraftInput[],options:{csv?:boolean}={}):DraftIssue[]{
  const errors:DraftIssue[]=[],seen=new Set<string>();
  for(const d of drafts){
    const issue=(field:string,error:string,row=d.row??1)=>errors.push({row,field,kind:d.kind,error});
    if(Array.isArray((d as unknown as Record<string,unknown>).lexical_annotations)&&((d as unknown as Record<string,unknown>).lexical_annotations as unknown[]).length)issue('lexical_annotations','此舊欄位已移除；請備份原檔並重新比對，不會自動轉為詞形。');
    if(!['word','prefix','root'].includes(d.kind))issue('kind','必須是 word / prefix / root');
    if(!uuid.test(d.entry_id))issue('entry_id','必須為 UUID');
    if(seen.has(d.entry_id))issue('entry_id','重複 ID');seen.add(d.entry_id);
    if(!d.headword?.trim())issue('headword','必填');
    if(d.kind==='word'&&d.grouping?.primary_category)issue('category','Word 必須留空');
    if(options.csv&&!d.senses.length)issue('gloss_zh_tw','至少需要一個義項');
    if(d.kind==='root'&&((options.csv&&!d.grouping?.primary_category)||(d.grouping?.primary_category&&!primaryCategories.includes(d.grouping.primary_category as typeof primaryCategories[number]))))issue('category',`不是合法 Root 分類；允許值：${primaryCategories.join('、')}`);
    for(const s of d.senses){
      if((d.kind==='word'||options.csv)&&!s.gloss_zh_tw?.trim())issue('gloss_zh_tw','必填',s.row);
      if(d.kind==='word'&&!s.part_of_speech?.trim())issue('part_of_speech','Word 必須提供 part_of_speech',s.row);
      if(d.kind!=='word'&&s.part_of_speech)issue('part_of_speech','Prefix / Root 必須留空',s.row);
      if(s.category&&d.kind!=='prefix')issue('category','只有 Prefix 義項使用分類',s.row);
      if(d.kind==='prefix'&&((options.csv&&!s.category)||(s.category&&!prefixCategories.includes(s.category as typeof prefixCategories[number]))))issue('category',`不是合法 Prefix 分類；允許值：${prefixCategories.join('、')}`,s.row);
    }
    for(const [field,rows] of Object.entries({inflections:d.inflections??[],pronunciations:d.pronunciations??[],senses:d.senses,etymologies:d.etymologies,learning_notes:d.learning_notes,relations:d.relations,examples:d.examples,relation_hints:d.relation_hints}))for(const r of rows){
      if(!uuid.test(r.id))issue(field,'ID 必須為 UUID');
      if(seen.has(r.id))issue(field,'重複 ID');seen.add(r.id);
      if(['source_id','citation','license','level'].some(k=>k in r))issue(field,'不接受來源授權或 Study level 欄位');
      if(['examples','relation_hints'].includes(field)){
        if(typeof r.body!=='string'||!r.body.trim())issue(field,'內容必填');
        if(r.sort_order!==undefined&&(!Number.isSafeInteger(r.sort_order)||Number(r.sort_order)<0))issue(field,'排序必須為非負整數');
      }
      if(field==='etymologies'&&('verification' in r||'verification_note' in r))issue(field,'審核狀態欄位已移除；來源請使用 data_source。');
      if(field==='inflections'){
        if(d.kind!=='word')issue(field,'詞形僅適用單字');
        if(typeof r.form!=='string'||!r.form.trim())issue(field,'詞形必填');
        if(!(String(r.form_kind) in inflectionLabels)||!availableInflections(d.senses,String(r.sense_id??'')||null).includes(r.form_kind as keyof typeof inflectionLabels))issue(field,'詞形類型與義項詞性不符');
        if((d.inflections??[]).filter(x=>inflectionIdentity(x)===inflectionIdentity(r)).length>1)issue(field,'完全相同的詞形記錄重複');
        if(r.sort_order!==undefined&&(!Number.isSafeInteger(r.sort_order)||Number(r.sort_order)<0))issue(field,'排序必須為非負整數');
      }
      if(field==='relations'){
        if(!uuid.test(String(r.target_entry_id))||!uuid.test(String(r.target_sense_id)))issue(field,'請選擇有效的詞條與義項');
        if(r.target_entry_id===d.entry_id)issue(field,'不可連結自身');
        const duplicates=d.relations.filter(x=>(x.sense_id??null)===(r.sense_id??null)&&x.target_sense_id===r.target_sense_id);
        // Existing legacy rows can differ only by retired metadata. Preserve their IDs; SQL rejects new/moved duplicates.
        if(duplicates.length>1&&duplicates.some(x=>!x.revision))issue(field,'重複構詞關聯');
      }
      if(field==='pronunciations'){
        if(typeof r.ipa!=='string'||!r.ipa.trim())issue(field,'ipa 必填');
        for(const key of ['locale','note'])if(r[key]!=null&&typeof r[key]!=='string')issue(field,`${key} 必須為文字或 null`);
        if(typeof r.locale==='string'&&!r.locale.trim())issue(field,'locale 空值請使用 null');
        if(r.sort_order!==undefined&&(!Number.isSafeInteger(r.sort_order)||Number(r.sort_order)<0))issue(field,'排序必須為非負整數');
      }
      if(r.sense_id==='')issue(field,'請選擇適用義項或明確指定詞條共用');
      if(r.sense_id&&!d.senses.some(s=>s.id===r.sense_id))issue(field,'無效的所屬義項');
    }
  }
  return errors;
}
const strip=(r:Record<string,unknown>)=>Object.fromEntries(Object.entries(r).filter(([k])=>!['updated_at','published_at','status','row','category'].includes(k)));
export function draftsFromBundle(bundle:Bundle,grouping?:DictionaryGrouping,senseGroups:Record<string,string|null>={}):DictionaryDraftInput[]{
  if(bundle.dictionary_lexical_annotations?.some(r=>r.kind!=='relation_hint'))throw Error('舊字形註釋已淘汰；請備份原檔並移除舊欄位後重新比對，不會自動轉成詞形。');
  return (bundle.dictionary_entries??[]).map(e=>{
    const rows=(table:string)=>(bundle[table]??[]).filter(r=>r.entry_id===e.id).map(r=>strip(r) as DraftRow);
    return {kind:e.kind as DictionaryKind,entry_id:String(e.id),headword:String(e.headword),...(e.revision!==undefined?{revision:Number(e.revision)}:{}),
      senses:rows('dictionary_senses').map(s=>({...s,part_of_speech:s.part_of_speech as string|null,gloss_zh_tw:String(s.gloss_zh_tw),...(s.id in senseGroups?{category:senseGroups[s.id]}:{})})),
      inflections:rows('dictionary_inflections'),pronunciations:rows('dictionary_pronunciations'),etymologies:rows('dictionary_etymologies'),learning_notes:mergeCoreConcepts(rows('dictionary_learning_notes')),relations:rows('dictionary_relations').map(compositionRow),examples:rows('dictionary_examples'),
      relation_hints:rows('dictionary_lexical_annotations').filter(r=>r.kind==='relation_hint'),grouping};
  });
}
export function mapDictionaryDraft(d:DictionaryDraftInput){
  const own=(rows:DraftRow[])=>rows.map(r=>({...strip(r),entry_id:d.entry_id}));
  const bundle:Bundle={dictionary_entries:[{id:d.entry_id,kind:d.kind,headword:d.headword,...(d.revision?{revision:d.revision}:{})}],dictionary_senses:own(d.senses),dictionary_relations:own(d.relations.map(compositionRow)),dictionary_etymologies:own(d.etymologies),dictionary_learning_notes:own(d.learning_notes)};
  return {...(d.component_order!==undefined?{component_order:d.component_order}:{}),origin:{row:d.row??1,kind:d.kind},bundle,group_data:d.grouping??null,sense_groups:d.senses.filter(s=>s.category!==undefined).map(s=>({sense_id:s.id,primary_category:s.category})),
    inflections:own(d.inflections??[]),pronunciations:own(d.pronunciations??[]),examples:own(d.examples),annotations:own([...d.relation_hints.map(r=>({...r,kind:'relation_hint'}))])};
}
type Client=Pick<SupabaseClient,'rpc'>;
/** Resolve explicit IDs only. Freeze revisions in the candidate used by preview and apply. */
export async function prepareDictionaryDrafts(client:Client,drafts:DictionaryDraftInput[]){
  for(const d of drafts){
    const {data,error}=await client.rpc('get_dictionary_entry',{entry_uuid:d.entry_id});
    if(error)throw new Error(error.message);if(!data)continue;
    if(data.entry.kind!==d.kind)throw new DraftValidationError([{row:d.row??1,kind:d.kind,field:'kind',error:'既有詞條類型不可修改'}]);
    if(data.entry.status==='published')throw new DraftValidationError([{row:d.row??1,kind:d.kind,field:'entry_id',error:'Published 不可直接覆蓋，請建立 Review Draft 並人工核准'}]);
    if(d.revision!==undefined&&d.revision!==data.entry.revision)throw new Error('Revision conflict');
    d.revision=data.entry.revision;
    for(const [field,table] of [['inflections','inflections'],['pronunciations','pronunciations'],['senses','senses'],['etymologies','etymologies'],['learning_notes','learning_notes'],['relations','relations'],['examples','examples'],['relation_hints','lexical_annotations']] as const){
      for(const row of d[field]??[]){const old=data[table]?.find((r:DraftRow)=>r.id===row.id);if(old)row.revision=old.revision;}
    }
    if(d.grouping){const {data:snapshot,error:e}=await client.rpc('get_dictionary_ai_snapshot',{entry_uuid:d.entry_id});if(e)throw new Error(e.message);d.grouping={...d.grouping,tags:snapshot?.grouping?.tags??[],variant_group:snapshot?.grouping?.variant_group??null};}
  }
  return drafts;
}
export async function saveDictionaryDraft(client:Client,drafts:DictionaryDraftInput[],preview=false,allowEdits=false,ai?:Record<string,unknown>,replaceEditorChildren=false):Promise<BundleResult>{
  const errors=validateDictionaryDraft(drafts);if(errors.length)throw new DraftValidationError(errors);
  const {data,error}=await client.rpc('apply_dictionary_drafts',{drafts:drafts.map(d=>({...mapDictionaryDraft(d),...(ai?{ai}:{}),...(replaceEditorChildren?{component_order:d.relations.map(r=>r.id),...(d.revision?{replace_editor_children:true}:{})}:{})})),preview,allow_edits:allowEdits});
  if(error){
    if(error.message.includes('dictionary_entries_unique_kind_headword'))throw new Error('同類同拼寫已有詞條，請開啟既有 Entry 新增義項，或重新產生匯入審核。');
    let origin:unknown;try{origin=JSON.parse(error.details??'');}catch{}
    if(origin&&typeof origin==='object'&&'row' in origin&&'kind' in origin)throw new DraftValidationError([{row:Number(origin.row),kind:String(origin.kind),field:'draft',error:error.message}]);
    throw new Error(error.message);
  }return data as BundleResult;
}
export const previewDictionaryDraft=(client:Client,drafts:DictionaryDraftInput[],allowEdits=false)=>saveDictionaryDraft(client,drafts,true,allowEdits);
