import {entryKey} from './entryIdentity';
import type {SupabaseClient} from '@supabase/supabase-js';
import type {AISnapshot} from './aiDictionary';
import {mapDictionaryDraft,validateDictionaryDraft,type DictionaryDraftInput,type DraftIssue,type DraftRow} from './draftPipeline';

type Client=Pick<SupabaseClient,'rpc'>;
export type ImportAction='review'|'keep'|'incoming'|'fill'|'new_sense'|'skip'|'later';
export const actionLabels:Record<ImportAction,string>={keep:'保留現有',review:'建立 Review Draft',incoming:'使用匯入版本',fill:'補上缺失值',new_sense:'建立新的 Sense',skip:'略過',later:'暫不處理'};
type Section='entry'|'grouping'|'senses'|'etymologies'|'examples'|'learning_notes'|'relations'|'lexical_annotations'|'relation_hints'|'pronunciations'|'inflections';
export interface ImportIssue {
  id:string;row:number;kind:string;headword:string;field:string;type:string;
  existing:unknown;incoming:unknown;reason:string;allowedActions:ImportAction[];selectedAction:ImportAction|null;
  target?:{section:Section;id?:string;field?:string};batchKey?:string;proposedSenseID?:string;proposedChildIDs?:Record<string,string>;
}
export interface ImportContext {snapshot:AISnapshot|null;similar:{id:string;kind:string;headword:string;status:string;revision:number}[];identities:Record<string,DraftRow[]>;exchange?:{version:string|null;reviews:unknown[];targets:{entry_id:string;sense_id:string}[]}}
export interface ImportOperation {owner_id:string;session_id:string;operation_id:string;source_type:string;preview_at:string;observed:ReturnType<typeof mapDictionaryDraft>;candidate:ReturnType<typeof mapDictionaryDraft>;expected_context:ImportContext;effect:'write'|'unchanged'|'review';exchange_version?:string|null}
export interface ImportItem {
  id:string;raw_candidate?:unknown;review_id?:string;exchange_version?:string|null;preview_at?:string;draft:DictionaryDraftInput;observed?:ReturnType<typeof mapDictionaryDraft>;context?:ImportContext;
  bucket:'safe'|'review';safeAction:'new'|'unchanged'|'normalize';issues:ImportIssue[];
  status:'pending'|'applied'|'unchanged'|'skipped'|'stale'|'failed';message?:string;
  operation?:ImportOperation;appliedDraft?:DictionaryDraftInput;
}
export interface ImportSession {durable_review?:true;source_name?:string;confirmed_scope?:'safe'|'reviewed';id:string;owner_id:string;source_type:'csv'|'legacy_csv'|'json'|'md';preview_at:string;items:ImportItem[]}
export const contentSections=['inflections','pronunciations','senses','etymologies','learning_notes','relations','examples','lexical_annotations','relation_hints'] as const;
const tables:Record<typeof contentSections[number],string>={inflections:'dictionary_inflections',pronunciations:'dictionary_pronunciations',senses:'dictionary_senses',etymologies:'dictionary_etymologies',learning_notes:'dictionary_learning_notes',relations:'dictionary_relations',examples:'dictionary_examples',lexical_annotations:'dictionary_lexical_annotations',relation_hints:'dictionary_lexical_annotations'};
const equal=(a:unknown,b:unknown)=>JSON.stringify(a??null)===JSON.stringify(b??null);
function storedRows(c:ImportContext,section:typeof contentSections[number]):DraftRow[]{
  if(!c.snapshot)return [];
  const detail=c.snapshot.detail;
  const rows=section==='relation_hints'?detail.lexical_annotations:detail[section];
  return (rows??[]).filter(r=>section==='relation_hints'?'kind' in r&&r.kind==='relation_hint':section==='lexical_annotations'?'kind' in r&&r.kind==='source_forms':true) as unknown as DraftRow[];
}
function addIssue(item:ImportItem,type:string,field:string,existing:unknown,incoming:unknown,reason:string,actions:ImportAction[],target?:ImportIssue['target'],row=item.draft.row??1){
  const issue:ImportIssue={id:crypto.randomUUID(),row,kind:item.draft.kind,headword:item.draft.headword,type,field,existing,incoming,reason,allowedActions:actions,selectedAction:null,target};
  if(type==='category_missing')issue.batchKey=JSON.stringify({type,kind:item.draft.kind,status:'draft',field,existing:null,incoming,actions});
  item.issues.push(issue);item.bucket='review';return issue;
}
/** CSV has no content-row IDs. Resolve only unambiguous slots under a stable sense ID, never by headword. */
export function reconcileProposedContent(draft:DictionaryDraftInput,context:ImportContext){
  const d=structuredClone(draft),proposed=new Set(d.proposed_ids??[]);
  if(context.snapshot){
    d.revision=context.snapshot.detail.entry.revision;
    if(d.grouping)d.grouping={...d.grouping,tags:context.snapshot.grouping?.tags??[],variant_group:context.snapshot.grouping?.variant_group??null};
    for(const section of contentSections){
      const rows=storedRows(context,section);
      for(let i=0;i<(d[section]??[]).length;i++){
        const incoming=d[section]![i];let old=rows.find(r=>r.id===incoming.id);
        if(!old&&section!=='senses'&&proposed.has(incoming.id)){
          const slots=rows.filter(r=>equal(r.sense_id,incoming.sense_id)&&equal(r.kind,incoming.kind));
          const exact=slots.filter(r=>section==='pronunciations'?r.ipa===incoming.ipa&&r.locale===incoming.locale:r.body===incoming.body);
          if(exact.length===1)old=exact[0];else if(slots.length===1)old=slots[0];
          if(old){proposed.delete(incoming.id);const {updated_at,entry_id,...content}=old;void updated_at;void entry_id;
            const replacement=section==='pronunciations'?{...content,...incoming,id:old.id}:{...content,body:incoming.body} as DraftRow;
            if(section==='etymologies'&&old.body!==incoming.body)replacement.verification='pending';
            d[section]![i]=replacement as never;
          }
        }
        if(old)d[section]![i].revision=old.revision;
      }
    }
  }
  d.proposed_ids=[...proposed];return d;
}
export function classifyImport(draft:DictionaryDraftInput,context:ImportContext,validation:DraftIssue[]=[]):ImportItem{
  const item:ImportItem={id:crypto.randomUUID(),draft,context,observed:mapDictionaryDraft(draft),bucket:'safe',safeAction:context.snapshot?'unchanged':'new',issues:[],status:'pending'};
  for(const e of validation)addIssue(item,'invalid',e.field,null,null,e.error,['skip','later'],undefined,e.row);
  const current=context.snapshot;
  if(current&&current.detail.entry.kind!==draft.kind)addIssue(item,'identity_kind','kind',current.detail.entry.kind,draft.kind,'Stable ID 指向不同類型，不能轉型。',['skip','later']);
  for(const section of contentSections)for(const row of draft[section]??[]){
    const collision=context.identities[tables[section]]?.find(r=>r.id===row.id&&r.entry_id!==draft.entry_id);
    if(collision)addIssue(item,'identity_owner',section,collision,row,'Stable ID 已屬於其他詞條，不能挪用。',['skip','later']);
  }
  if(context.similar.length&&(!current||current.detail.entry.headword!==draft.headword))addIssue(item,'homograph','headword',context.similar,draft.headword,'同類同拼寫必須共用 Entry；既有 ID 不可自動合併，請開啟既有詞條新增義項。',['skip','later']);
  const compare=(section:Section,id:string|undefined,field:string,old:unknown,incoming:unknown,row?:number)=>{
    if(equal(old,incoming))return;
    const category=field==='category'||field==='primary_category',missing=category&&!old&&!!incoming;
    const actions:ImportAction[]=current?.detail.entry.status==='published'?['review','keep','skip','later']:missing?['fill','keep','later']:['incoming','keep','later'];
    if(section==='senses'&&field==='gloss_zh_tw'&&current?.detail.entry.status==='draft')actions.splice(1,0,'new_sense');
    addIssue(item,current?.detail.entry.status==='published'?'published_change':missing?'category_missing':category?'category_difference':'content_difference',field,old,incoming,current?.detail.entry.status==='published'?'Published 不直接修改；接受後建立完整 Review Draft，核准後才發布。':missing?'既有分類未設定，可明確補上。':'相同 stable ID 的內容不同，需逐筆確認。',actions,{section,id,field},row);
  };
  if(current){
    if(draft.senses.some(s=>!current.detail.senses.some(old=>old.id===s.id))){
      const shared=contentSections.filter(s=>s!=='senses'&&s!=='relations').flatMap(section=>storedRows(context,section).filter(r=>!r.sense_id));
      if(shared.length)addIssue(item,'shared_content_scope','sense_id',shared,null,'既有內容未限定義項；新增義項前請確認保留為詞條共用，或先在編輯器指定義項。',['keep','skip','later']);
    }
    compare('entry',undefined,'headword',current.detail.entry.headword,draft.headword);
    if(draft.component_order!==undefined)compare('entry',undefined,'component_order',current.metadata?.component_order??[],draft.component_order);
    if(draft.grouping)for(const field of ['tags','variant_group'] as const)compare('grouping',undefined,field,current.grouping?.[field]??(field==='tags'?[]:null),draft.grouping[field]);
    if(draft.grouping&&draft.kind==='root')compare('grouping',undefined,'primary_category',current.grouping?.primary_category,draft.grouping.primary_category);
    for(const section of contentSections)for(const row of draft[section]??[]){
      const old=storedRows(context,section).find(r=>r.id===row.id);
      if(!old){
        const slots=storedRows(context,section).filter(r=>equal(r.sense_id,row.sense_id)&&equal(r.kind,row.kind));
        addIssue(item,current.detail.entry.status==='published'?'published_change':slots.length>1?'ambiguous_content':'new_content',section,slots,row,current.detail.entry.status==='published'?'Published 不能直接增加內容。':slots.length>1?'有多筆相同義項的內容，不能唯一對應；採用表示追加，不覆寫。':'將在既有詞條新增內容。',current.detail.entry.status==='published'?['review','keep','skip','later']:['incoming','keep','later'],{section,id:row.id},Number(row.row??draft.row??1));
      }else{
        for(const [field,value]of Object.entries(row)){
          if(['id','entry_id','revision','updated_at','row','category'].includes(field))continue;
          compare(section,row.id,field,old[field],value,Number(row.row??draft.row??1));
        }
        if(section==='senses'&&draft.kind==='prefix'&&row.category!==undefined)compare('senses',row.id,'category',current.sense_groups[row.id],row.category,Number(row.row??draft.row??1));
      }
    }
  }
  return item;
}
export function chooseIssue(item:ImportItem,issueID:string,action:ImportAction):ImportItem{
  if(item.operation)throw Error('此項已有待確認操作，請先重試或重新審核。');
  const next=structuredClone(item),issue=next.issues.find(i=>i.id===issueID);
  if(!issue||!issue.allowedActions.includes(action))throw Error('此情況不允許這個操作');
  issue.selectedAction=action;if(action==='new_sense')issue.proposedSenseID??=crypto.randomUUID();return next;
}
export function canBatchDecision(a:ImportIssue,b:ImportIssue,action:ImportAction){
  return !!a.batchKey&&a.batchKey===b.batchKey&&a.type===b.type&&['fill','keep'].includes(action)&&a.allowedActions.includes(action)&&b.allowedActions.includes(action);
}
export function applyBatchDecision(session:ImportSession,itemID:string,issueID:string,action:ImportAction):ImportSession{
  const origin=session.items.find(i=>i.id===itemID)?.issues.find(i=>i.id===issueID);
  if(!origin?.batchKey||!['fill','keep'].includes(action))throw Error('不允許對不同內容批次覆寫');
  return {...session,items:session.items.map(item=>{
    if(item.status!=='pending'||item.operation)return item;
    let next=item;for(const issue of item.issues)if(canBatchDecision(origin,issue,action))next=chooseIssue(next,issue.id,action);return next;
  })};
}
export function resolveImportItem(item:ImportItem):{draft:DictionaryDraftInput;effect:'write'|'unchanged'|'review'}|null{
  if(item.issues.some(i=>!i.selectedAction||i.selectedAction==='later'||i.selectedAction==='skip'))return null;
  const d=structuredClone(item.draft);
  for(const issue of item.issues){
    const t=issue.target;if(!t)continue;
    if(issue.selectedAction==='keep'){
      if(t.section==='entry'){if(t.field==='component_order')d.component_order=issue.existing as string[];else d.headword=String(issue.existing);}
      else if(t.section==='grouping'&&d.grouping){if(t.field==='tags')d.grouping.tags=issue.existing as string[];else if(t.field==='variant_group')d.grouping.variant_group=issue.existing as string|null;else d.grouping.primary_category=issue.existing as string|null;}
      else if(t.section!=='grouping'){
        const rows=d[t.section]??[];const row=rows.find(r=>r.id===t.id);
        if(t.field&&row)row[t.field]=issue.existing??null;
        else {d[t.section]=rows.filter(r=>r.id!==t.id) as never;
          if(t.section==='senses')for(const section of contentSections.filter(s=>s!=='senses'))d[section]=(d[section]??[]).filter(r=>r.sense_id!==t.id);
        }
      }
    }
  }
  for(const issue of item.issues)if(issue.selectedAction==='new_sense'&&issue.target?.id){
    const oldID=issue.target.id,newID=issue.proposedSenseID!;
    const sense=d.senses.find(s=>s.id===oldID);if(sense){sense.id=newID;delete sense.revision;}
    for(const section of contentSections.filter(s=>s!=='senses'))for(const row of d[section]??[])if(row.sense_id===oldID){row.sense_id=newID;row.id=issue.proposedChildIDs?.[row.id]??crypto.randomUUID();delete row.revision;}
  }
  // Reclassify the resolved patch: only actual incoming differences require a write.
  const remaining=classifyImport(d,item.context!);
  const changed=!item.context?.snapshot||remaining.issues.some(i=>i.target);
  return {draft:d,effect:changed?(item.context?.snapshot?.detail.entry.status==='published'?'review':'write'):'unchanged'};
}
export async function inspectDrafts(client:Client,drafts:DictionaryDraftInput[],options:{exchange?:boolean;strictIdentity?:boolean;onProgress?:(done:number,total:number)=>void}={}):Promise<ImportContext[]>{
  const contexts:ImportContext[]=[];
  for(let offset=0;offset<drafts.length;offset+=25){
    const {data,error}=await client.rpc(options.exchange?'inspect_dictionary_exchange':'inspect_dictionary_import',{drafts:drafts.slice(offset,offset+25).map(mapDictionaryDraft)});
    if(error)throw Error(error.message);if(!Array.isArray(data)||data.length!==Math.min(25,drafts.length-offset))throw Error('Invalid import context response');
    contexts.push(...data);options.onProgress?.(contexts.length,drafts.length);
  }
  return contexts;
}
export async function buildImportSession(client:Client,owner:string,source:ImportSession['source_type'],drafts:DictionaryDraftInput[],issues:DraftIssue[]=[],sessionID=crypto.randomUUID(),options:{exchange?:boolean;strictIdentity?:boolean;onProgress?:(done:number,total:number)=>void}={}):Promise<ImportSession>{
  const session:ImportSession={id:sessionID,owner_id:owner,source_type:source,preview_at:new Date().toISOString(),items:[]};
  const valid:DictionaryDraftInput[]=[];
  for(const d of drafts){const rows=new Set([d.row??1,...d.senses.map(s=>s.row??d.row??1)]);const errors=[...issues.filter(e=>rows.has(e.row)),...validateDictionaryDraft([d])];
    if(errors.length){const c:ImportContext={snapshot:null,similar:[],identities:{}};const item=classifyImport(d,c,errors);delete item.context;delete item.observed;session.items.push(item);}else valid.push(d);
  }
  if(valid.length){
    let contexts=await inspectDrafts(client,valid,options);
    const matched=new Set<number>();
    const routed=valid.map((original,i)=>{
      const c=contexts[i];
      // Only a not-yet-persisted identity can be redirected. Never move an existing Entry.
      if(options.exchange||c.snapshot||c.similar.length!==1||options.strictIdentity&&!original.proposed_ids?.includes(original.entry_id))return original;
      const d=structuredClone(original),old=d.entry_id;d.entry_id=c.similar[0].id;delete d.revision;
      d.headword=c.similar[0].headword;
      for(const section of contentSections)for(const row of d[section]??[])if(row.entry_id===old)row.entry_id=d.entry_id;
      d.proposed_ids=d.proposed_ids?.filter(id=>id!==old);matched.add(i);return d;
    });
    if(matched.size){
      const redirects=new Map([...matched].map(i=>[valid[i].entry_id,routed[i].entry_id]));
      for(const draft of routed)for(const relation of draft.relations){const target=redirects.get(String(relation.target_entry_id));if(target)relation.target_entry_id=target;}
      contexts=await inspectDrafts(client,routed);
    }
    const reconciled=routed.map((d,i)=>options.exchange?structuredClone(d):reconcileProposedContent(d,contexts[i]));
    const frozen=options.exchange?contexts:await inspectDrafts(client,reconciled);
    const grouped=new Map<string,DictionaryDraftInput[]>();for(const draft of reconciled){const key=entryKey(draft.kind,draft.headword);const list=grouped.get(key)??[];list.push(draft);grouped.set(key,list);}
    for(let i=0;i<reconciled.length;i++){
      // If content changed between inspection and normalization, the frozen revision must agree.
      const d=reconciled[i],c=frozen[i],item=classifyImport(d,c);
      if(!matched.has(i)&&valid[i].revision!==undefined&&valid[i].revision!==c.snapshot?.detail.entry.revision)addIssue(item,'revision_conflict','revision',c.snapshot?.detail.entry.revision,valid[i].revision,'匯入版本較舊；目前差異已依最新版本重新比對，請確認後再採用。',c.snapshot?.detail.entry.status==='draft'?['incoming','skip','later']:['skip','later']);
      if(d.revision!==undefined&&d.revision!==c.snapshot?.detail.entry.revision)addIssue(item,'preview_changed','revision',d.revision,c.snapshot?.detail.entry.revision,'讀取期間內容已改變，請重新審核。',['skip','later']);
      if(matched.has(i))addIssue(item,'matching_entry','entry_id',c.snapshot?.detail.entry.headword,valid[i].headword,'同類同拼寫使用既有 Entry；接受後新增義項，不建立第二詞條。',c.snapshot?.detail.entry.status==='published'?['review','skip','later']:['incoming','skip','later']);
      const duplicates=(grouped.get(entryKey(d.kind,d.headword))??[]).filter(other=>other!==d);
      if(duplicates.length)addIssue(item,'batch_homograph','headword',duplicates.map(x=>x.entry_id),d.headword,'同一批次有多筆指向同一詞條，請合併為單一 Entry 的多個 Sense 後重新預覽。',['skip','later']);
      session.items.push(item);
    }
  }
  for(const item of session.items)item.preview_at=session.preview_at;
  return session;
}
export function sessionCounts(s:ImportSession){return {
  safeTotal:s.items.filter(i=>i.bucket==='safe').length,safeApplied:s.items.filter(i=>i.bucket==='safe'&&['applied','unchanged'].includes(i.status)).length,
  reviewUnresolved:s.items.filter(i=>i.bucket==='review'&&i.status==='pending'&&i.issues.some(x=>!x.selectedAction||x.selectedAction==='later')).length,
  reviewResolved:s.items.filter(i=>i.bucket==='review'&&(i.status==='skipped'||i.issues.every(x=>x.selectedAction&&x.selectedAction!=='later'))).length,
  stale:s.items.filter(i=>i.status==='stale').length,failed:s.items.filter(i=>i.status==='failed').length,
  affectedIDs:s.items.filter(i=>['applied','unchanged'].includes(i.status)).map(i=>i.appliedDraft?.entry_id??i.draft.entry_id)};}
/** Preserve operation identity before any network dispatch. Batch RPC delegates to the same authority. */
export async function applyImportItems(client:Client,session:ImportSession,includeReview:boolean,persist:(s:ImportSession,changed?:ImportItem[])=>Promise<void>,options:{batched?:boolean;signal?:AbortSignal}={}):Promise<ImportSession>{
  const next=structuredClone(session);
  const remaining=[...next.items].sort((a,b)=>Number(a.draft.kind==='word')-Number(b.draft.kind==='word'));
  const ordered:ImportItem[]=[];
  // Target records in this file precede users of them; cycles remain explicit server rejections.
  while(remaining.length){const ids=new Set(remaining.map(i=>i.draft.entry_id));let index=remaining.findIndex(i=>!i.draft.relations.some(r=>ids.has(String(r.target_entry_id))));if(index<0)index=0;ordered.push(remaining.splice(index,1)[0]);}
  const prepare=(item:ImportItem)=>{
    if(!['pending','failed'].includes(item.status)||(!includeReview&&item.bucket==='review'))return false;
    if(item.issues.some(i=>i.selectedAction==='skip')){item.status='skipped';return false;}
    if(!item.operation){const resolved=resolveImportItem(item);if(!resolved||!item.context||!item.observed)return false;
      const errors=validateDictionaryDraft([resolved.draft]);if(errors.length){item.status='failed';item.message=errors.map(e=>e.error).join('；');return false;}
      item.appliedDraft=resolved.draft;
      item.operation={owner_id:next.owner_id,session_id:next.id,operation_id:crypto.randomUUID(),source_type:next.source_type,preview_at:item.preview_at??next.preview_at,observed:item.observed,candidate:mapDictionaryDraft(resolved.draft),expected_context:Object.fromEntries(Object.entries(item.context).filter(([key])=>key!=='exchange')) as unknown as ImportContext,effect:resolved.effect,...(item.exchange_version!==undefined?{exchange_version:item.exchange_version}:{})};
    }return true;
  };
  const size=options.batched?25:1;
  for(let start=0;start<ordered.length;start+=size){
    if(options.signal?.aborted)break;
    const chunk=ordered.slice(start,start+size),ready=chunk.filter(prepare);
    await persist(next,chunk);
    if(!ready.length)continue;
    try{
      const {data,error}=await client.rpc(options.batched?'apply_dictionary_import_batch':'apply_dictionary_import_operation',options.batched?{operations:ready.map(i=>i.operation)}:{operation:ready[0].operation});
      if(error)throw Error(error.message);
      const results=options.batched?data:[data];
      if(!Array.isArray(results)||results.length!==ready.length||results.some((r,i)=>!r||!['applied','unchanged','stale','failed'].includes(r.status)||(options.batched&&r.operation_id!==ready[i].operation!.operation_id)))throw Error('Invalid import receipt response; retry the saved operations');
      for(let i=0;i<ready.length;i++){ready[i].status=results[i].status;ready[i].message=results[i].message;if(ready[i].operation?.effect==='review'&&typeof results[i].result?.id==='string')ready[i].review_id=results[i].result.id;if(results[i].status==='stale')ready[i].bucket='review';}
    }catch(e){for(const item of ready){item.status='failed';item.message=e instanceof Error?e.message:String(e);}}
    await persist(next,ready);
    // A transport failure must not launch the rest of thousands of requests.
    if(ready.every(i=>i.status==='failed'))break;
  }
  return next;
}
