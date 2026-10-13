import {entryKey} from './entryIdentity';
import {parseCSV} from './csvRows';
import {DraftValidationError,validateDictionaryDraft,type DictionaryDraftInput,type DraftIssue} from './draftPipeline';
import {emptyGrouping} from './grouping';

export const dictionaryCSVHeaders=['kind','entry_id','sense_id','headword','part_of_speech','gloss_zh_tw','category','etymology','example_words','source_forms','relation_hint','mnemonic_story'];
export const legacyCSVHeaders=['entry_id','sense_id','headword','part_of_speech','gloss_zh_tw'];
/** Proposed IDs are created once per preview, never derived from file names, rows or text. */
export async function parseDictionaryCSVPreview(raw:string):Promise<{drafts:DictionaryDraftInput[];issues:DraftIssue[]}>{
  const rows=parseCSV(raw),drafts=new Map<string,DictionaryDraftInput>(),issues:DraftIssue[]=[];
  // Blank identities share a proposed Entry inside this preview. Explicit IDs are never rewritten.
  const explicit=new Map<string,Set<string>>();
  for(const r of rows)if(r.entry_id.trim()){const key=entryKey(r.kind??'word',r.headword);const ids=explicit.get(key)??new Set<string>();ids.add(r.entry_id.trim().toLowerCase());explicit.set(key,ids);}
  const proposed=new Map<string,string>();
  for(const [index,r]of rows.entries()){
    const row=index+2,kind=r.kind??'word';
    const error=(field:string,message:string)=>issues.push({row,kind,field,error:message});
    const key=entryKey(kind,r.headword),known=explicit.get(key);
    if(known&&known.size>1)error('entry_id','同類同拼寫提供了不同 Entry ID；請審核既有身分，不可建立第二詞條');
    const entry_id=r.entry_id.trim().toLowerCase()||(known?.size===1?[...known][0]:proposed.get(key))||crypto.randomUUID();
    if(!r.entry_id.trim()&&!known?.size)proposed.set(key,entry_id);
    const sense_id=r.sense_id.trim().toLowerCase()||crypto.randomUUID();
    let d=drafts.get(entry_id);
    if(!d){d={kind:kind as DictionaryDraftInput['kind'],entry_id,headword:r.headword,row,senses:[],etymologies:[],examples:[],relations:[],learning_notes:[],lexical_annotations:[],relation_hints:[],proposed_ids:[]};drafts.set(entry_id,d);}
    else if(d.kind!==kind||entryKey(d.kind,d.headword)!==key)error('entry_id','同一 entry_id 的 kind / headword 不一致');
    if(proposed.get(key)===entry_id&&!d.proposed_ids!.includes(entry_id))d.proposed_ids!.push(entry_id);if(!r.sense_id.trim())d.proposed_ids!.push(sense_id);
    if(kind==='word'&&r.category?.trim())d.grouping={...emptyGrouping(),primary_category:r.category};
    if(kind==='root'){
      if(d.grouping&&d.grouping.primary_category!==r.category)error('category','同一 Root 的分類必須一致');
      d.grouping={...emptyGrouping(),primary_category:r.category};
    }
    d.senses.push({id:sense_id,part_of_speech:r.part_of_speech||null,gloss_zh_tw:r.gloss_zh_tw,row,...(kind==='prefix'?{category:r.category}:{})});
    for(const [field,list,extra] of [
      ['etymology',d.etymologies,{verification:'pending',verification_note:''}],
      ['example_words',d.examples,{sort_order:0}],
      ['source_forms',d.lexical_annotations,{kind:'source_forms',sort_order:0}],
      ['relation_hint',d.relation_hints,{kind:'relation_hint',sort_order:0}],
      ['mnemonic_story',d.learning_notes,{kind:'mnemonic_scenario'}],
    ] as const){if(r[field]?.trim()){const id=crypto.randomUUID();d.proposed_ids!.push(id);list.push({id,sense_id,body:r[field],...extra});}}
  }
  const result=[...drafts.values()];issues.push(...validateDictionaryDraft(result,{csv:true}));
  if(!result.length)issues.push({row:1,kind:'unknown',field:'CSV',error:'沒有資料列'});
  return {drafts:result,issues};
}
export async function parseDictionaryCSV(raw:string):Promise<DictionaryDraftInput[]>{
  const {drafts,issues}=await parseDictionaryCSVPreview(raw);if(issues.length)throw new DraftValidationError(issues);return drafts;
}
/** Export the imported projection with permanent Entry/Sense IDs; never flatten ambiguous content. */
export function exportDictionaryCSV(drafts:DictionaryDraftInput[]):string{
  const rows:string[][]=[];
  if(drafts.some(d=>d.inflections?.length))throw Error('CSV v1 無詞形欄位，請使用完整 JSON 匯出；不會省略詞形。');
  if(drafts.some(d=>d.pronunciations?.length))throw Error('CSV v1 不含讀音欄位，請使用 AI JSON 完整匯出，避免讀音遺失。');
  for(const d of drafts)for(const sense of d.senses){
    const content=(items:typeof d.examples)=>{
      const own=items.filter(x=>x.sense_id===sense.id||(!x.sense_id&&d.senses.length===1));
      if(own.length>1||items.some(x=>!x.sense_id)&&d.senses.length>1)throw Error('此詞條有多筆或詞條級內容，請使用 AI JSON 完整匯出，避免 CSV 合併遺失關聯。');
      return String(own[0]?.body??'');
    };
    rows.push([d.kind,d.entry_id,sense.id,d.headword,sense.part_of_speech??'',sense.gloss_zh_tw,d.kind==='prefix'?sense.category??'':d.kind==='root'?d.grouping?.primary_category??'':'',content(d.etymologies),content(d.examples),content(d.lexical_annotations),content(d.relation_hints),content(d.learning_notes.filter(x=>x.kind==='mnemonic_scenario'))]);
  }
  return dictionaryCSVHeaders.join(',')+'\n'+rows.map(r=>r.map(v=>'"'+v.replaceAll('"','""')+'"').join(',')).join('\n');
}
export const dictionaryCSVExample=dictionaryCSVHeaders.join(',')+'\n'+[
  ['word','','','example','noun','例子','','','an example','','','用例子幫助記憶'],
  ['prefix','','','pre-','','之前','位置、方向與關係','','preview','','',''],
  ['root','','','form','','形狀','空間、位置與環境','','formation','','',''],
].map(row=>row.map(v=>'"'+v.replaceAll('"','""')+'"').join(',')).join('\n');
