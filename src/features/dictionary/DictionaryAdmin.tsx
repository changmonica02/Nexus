"use client";
import {observeDictionaryInvalidation} from './dictionaryInvalidation';
import EditorSection from "./EditorSection";
import FeatureIcon from "../../components/FeatureIcon";
import {SidebarToggle} from "../../components/WorkspaceNavigation";
import {PersistentReviewPanel} from './PersistentImportReview';
import {Pagination} from '../../components/pagination/Pagination';
import {usePagedList} from '../../components/pagination/usePagedList';

import {compositionRow} from './composition';
import {entryKey} from './entryIdentity';
import {listAdminEntries,listAdminWork,adminPageSize} from './adminQueries';
import {inflectionLabels,availableInflections} from './inflections';
import {RelationTargetPicker,RelationSelectionDialog} from './RelationTargetPicker';
import {DictionaryBulkPublish} from './DictionaryBulkPublish';
import {confirmDialog} from '../../lib/confirmDialog';


import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {VariantEditor} from './variants';
import DictionaryExchangeExport from './DictionaryExchangeExport';
import {usePaginationLanguage} from '../../lib/LanguageContext';
import {AIImport} from './DictionaryAI';
import {DictionaryModal} from './DictionaryModal';
import {emptyGrouping,primaryCategories,prefixCategories,readGrouping,readSenseGroups,type DictionaryGrouping,type SenseGroupMap} from './grouping';
import { getSupabase } from '../../infrastructure/supabase/client';
import { getDictionaryEntry, type DictionaryDetail, type DictionaryEntry, type DictionarySense } from './dictionary';
import {dictionaryCSVExample,dictionaryCSVHeaders} from './dictionaryCSV';
import {draftsFromBundle,saveDictionaryDraft,previewDictionaryDraft,validateDictionaryDraft,DraftValidationError} from './draftPipeline';
import {type Bundle} from './adminImport';
import {reviewSnapshot,diffDictionaryReview,type DictionaryReview} from './revisionLifecycle';
import {readAI} from './aiDictionary';
import {mapDictionaryDraft,type DictionaryDraftInput} from './draftPipeline';
import {DictionaryImportReview} from './DictionaryImportReview';
import {deleteDraftSense,deleteDraftContent,withoutSense} from './draftEditing';
import {deleteDictionaryDrafts} from './deleteDrafts';
import {useUnsavedDraft,navigateDictionary} from './useUnsavedDraft';

const control='scroll-mt-24 w-full min-w-0 rounded border border-[var(--color-border)] bg-[var(--color-editor-bg)] p-2 text-sm text-[var(--color-text)]';
const button='min-h-11 rounded border border-[var(--color-border)] bg-[var(--color-panel-bg)] px-3 py-2 text-sm text-[var(--color-text)] disabled:opacity-40';
const addButton='min-h-11 rounded px-2 py-1 text-sm hover:bg-zinc-500/10 disabled:opacity-40';
const labels={word:'單字',prefix:'字首',root:'字根'};
type Row=Record<string,unknown>;
function Field({label,value,onChange,multiline=false,placeholder,compact=false}:{label:string;value:unknown;onChange:(v:string)=>void;multiline?:boolean;placeholder?:string;compact?:boolean}) {
  return <label className="block min-w-0 text-sm"><span className={compact?"sm:sr-only":undefined}>{label}</span>{multiline?<textarea className={control} rows={4} value={String(value??'')} onChange={e=>onChange(e.target.value)}/>:<input className={control} placeholder={placeholder} value={String(value??'')} onChange={e=>onChange(e.target.value)}/>}</label>;
}

function clean(row:object):Row { const result={...row} as Row;for(const key of ['updated_at','published_at','status','source_id'])delete result[key];return result; }
export function DictionaryPreview({bundle,technical=true}:{bundle:Bundle;technical?:boolean}) {
  return <div className="space-y-4" aria-label="字典預覽">{Object.entries(bundle).map(([table,rows])=><section key={table}>
    <h3 className="font-semibold">{{dictionary_entries:'詞條',dictionary_inflections:'詞形變化',dictionary_pronunciations:'讀音',dictionary_senses:'義項',dictionary_relations:'義項構詞關聯',dictionary_etymologies:'歷史詞源（以查證狀態為準）',dictionary_learning_notes:'學習拆解／記憶情境（不是歷史事實）'}[table]??table}</h3>
    {rows.map(row=><article key={String(row.id)} className="my-2 space-y-2 whitespace-pre-wrap break-words rounded border p-3 text-sm">
      {<>
        {!!row.kind&&<p>類型：{String(row.kind)}</p>}<p>{String(row.headword??row.gloss_zh_tw??row.form??row.ipa??row.body??'義項關聯')}</p>
        {!!row.part_of_speech&&<p>分類：{String(row.part_of_speech)}</p>}
        {table!=='dictionary_relations'&&!!row.verification&&<p>查證：{String(row.verification)} {String(row.verification_note??'')}</p>}
        {technical&&!!row.target_sense_id&&<p>目標義項：{String(row.target_sense_id)}</p>}
        {row.kind==='mnemonic_scenario'&&<p>記憶情境，不是歷史事實</p>}
      </>}
      {technical&&<details><summary>穩定識別與資料欄位</summary><pre className="whitespace-pre-wrap break-words text-xs">{JSON.stringify(row,null,2)}</pre></details>}
    </article>)}
  </section>)}</div>;
}
export function DictionaryEditor({detail,entries,onSaved,onDeleted,initialGrouping=emptyGrouping(),initialSenseGroups={},reviewDraft=false,saveReview,onPublish,canPublish=false,publicationBusy=false}:{onDeleted?:()=>void;onPublish?:()=>Promise<void>;canPublish?:boolean;publicationBusy?:boolean;saveReview?:(draft:DictionaryDraftInput)=>Promise<void>;reviewDraft?:boolean;initialSenseGroups?:SenseGroupMap;initialGrouping?:DictionaryGrouping;detail:DictionaryDetail;entries:DictionaryEntry[];senses:DictionarySense[];onSaved:(id:string)=>Promise<void>}) {
  const {t}=usePaginationLanguage();
  const [bundle,setBundle]=useState<Bundle>(()=>({dictionary_inflections:(detail.inflections??[]).map(clean),dictionary_entries:[clean(detail.entry)],dictionary_senses:detail.senses.map(clean),dictionary_relations:detail.relations.map(row=>compositionRow(clean(row))),dictionary_etymologies:detail.etymologies.map(clean),dictionary_learning_notes:detail.learning_notes.map(clean),dictionary_pronunciations:(detail.pronunciations??[]).map(clean),dictionary_examples:(detail.examples??[]).map(clean),dictionary_lexical_annotations:(detail.lexical_annotations??[]).map(clean)}));
  const [addingRelation,setAddingRelation]=useState(false);
  const [grouping,setGrouping]=useState(initialGrouping);
  const [senseGroups,setSenseGroups]=useState(initialSenseGroups);
  const [baseline,setBaseline]=useState(bundle);
  const [groupBaseline,setGroupBaseline]=useState(initialGrouping),[senseBaseline,setSenseBaseline]=useState(initialSenseGroups);
  const [preview,setPreview]=useState(false);const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');
  const locked=detail.entry.status==='published'&&!saveReview;
  const [matches,setMatches]=useState<DictionaryEntry[]>([]);
  const headword=String(bundle.dictionary_entries[0].headword);
  useEffect(()=>{let active=true;setMatches([]);if(!headword.trim())return;const timer=setTimeout(()=>{const client=getSupabase();if(client)void listAdminEntries(client,{kinds:[detail.entry.kind],statuses:[],query:headword,page:0}).then(r=>{if(active)setMatches(r.items);}).catch(()=>{});},250);return()=>{active=false;clearTimeout(timer);};},[headword,detail.entry.kind]);
  const matching=[...entries,...matches].filter((e,i,all)=>all.findIndex(x=>x.id===e.id)===i).filter(e=>e.id!==detail.entry.id&&entryKey(e.kind,e.headword)===entryKey(detail.entry.kind,String(bundle.dictionary_entries[0].headword)));
  const contentSense=(table:string,index:number,row:Row,compact=false)=><label className="block min-w-0 text-sm"><span className={compact?"sm:sr-only":undefined}>適用義項</span><select className={control} value={String(row.sense_id??'__shared__')} onChange={e=>change(table,index,'sense_id',e.target.value==='__shared__'?null:e.target.value)}><option value="" disabled>請選擇義項</option><option value="__shared__">{table==='dictionary_relations'?'不分義項／詞條共用':'詞條共用（不限定義項）'}</option>{bundle.dictionary_senses.map((sense,i)=><option key={String(sense.id)} value={String(sense.id)}>義項 {i+1} · {String(sense.part_of_speech??'')} · {String(sense.gloss_zh_tw)}</option>)}</select></label>;
  const newContentSense=()=>bundle.dictionary_senses.length===1?bundle.dictionary_senses[0].id:'';
  const dirty=!locked&&(JSON.stringify(bundle)!==JSON.stringify(baseline)||JSON.stringify(grouping)!==JSON.stringify(groupBaseline)||bundle.dictionary_senses.some(row=>(senseGroups[String(row.id)]??null)!==(senseBaseline[String(row.id)]??null)));
  const change=(table:string,index:number,key:string,value:unknown)=>setBundle(b=>({...b,[table]:b[table].map((r,i)=>i===index?{...r,[key]:value}:r)}));
  const add=(table:string,values:Row)=>setBundle(b=>({...b,[table]:[...b[table],{id:crypto.randomUUID(),entry_id:detail.entry.id,...values}]}));
  const addSense=async()=>{
    const shared=['dictionary_pronunciations','dictionary_etymologies','dictionary_learning_notes','dictionary_examples','dictionary_lexical_annotations'].some(table=>bundle[table]?.some(row=>row.sense_id===null));
    if(bundle.dictionary_senses.length&&shared&&!await confirmDialog('既有內容有未限定義項的資料。新增義項後仍保留為詞條共用；若只屬於原義項，請取消並先指定適用義項。確認繼續？'))return;
    add('dictionary_senses',{part_of_speech:detail.entry.kind==='word'?'noun':null,gloss_zh_tw:''});
  };
  const save=async()=>{
    setBusy(true);setMessage('');
    try{
      if(matching.length)throw Error('同類同拼寫已有 Entry，請開啟既有詞條新增義項；不會建立第二詞條。');
      const next=prepareEditorBundle(bundle);
      const drafts=draftsFromBundle(next,detail.entry.kind==='word'?undefined:grouping,senseGroups);
      const issues=validateDictionaryDraft(drafts);if(issues.length)throw new DraftValidationError(issues);
      if(saveReview){await saveReview(drafts[0]);setBaseline(bundle);setGroupBaseline(grouping);setSenseBaseline(senseGroups);setMessage('已儲存審核草稿；公開內容尚未變更。');}else{await saveDictionaryDraft(getSupabase()!,drafts,false,true,undefined,true);await onSaved(detail.entry.id);}
      return true;
    }catch(e){setMessage(e instanceof Error?e.message:String(e));return false;}finally{setBusy(false);}
  };
  const navigation=useUnsavedDraft(dirty,busy||publicationBusy,()=>save());
  const removeDraft=async()=>{
    if(busy||publicationBusy||!onDeleted||saveReview||detail.entry.status!=='draft'||detail.entry.revision===0)return;
    setBusy(true);setMessage('');
    try{
      const removed=await deleteDictionaryDrafts(getSupabase()!,[{...detail.entry,revision:Number(baseline.dictionary_entries[0].revision)}],()=>confirmDialog({title:t('dictionary.deleteDraft'),message:t('dictionary.confirmDeleteDraft',{name:detail.entry.headword}),confirmLabel:t('dictionary.deleteDraft'),danger:true}));
      if(removed===1)navigation.leave(onDeleted);
      else if(removed!==null)throw Error('Invalid draft deletion response; reload before retrying');
    }catch(e){setMessage(e instanceof Error?e.message:String(e));}finally{setBusy(false);}
  };
  const removeSense=async(row:Row)=>{
    if(busy||locked)return;
    setMessage('');
    try{
      const next=withoutSense(bundle,String(row.id));
      const saved=baseline.dictionary_senses.find(s=>s.id===row.id&&Number(s.revision)>0);
      if(!saved){setBundle(next);return;}
      if(saveReview){if(await confirmDialog('從 Review Draft 移除此義項？儲存及核准前不影響公開內容。'))setBundle(next);return;}
      if(!await confirmDialog('永久刪除此已儲存的草稿義項？其他義項及構詞資料不會刪除。此操作立即儲存。'))return;
      setBusy(true);
      const revision=await deleteDraftSense(getSupabase()!,detail.entry.id,String(row.id),Number(baseline.dictionary_entries[0].revision),Number(saved.revision));
      setBundle({...next,dictionary_entries:next.dictionary_entries.map(e=>({...e,revision}))});
      setBaseline(b=>({...b,dictionary_entries:b.dictionary_entries.map(e=>({...e,revision})),dictionary_senses:b.dictionary_senses.filter(s=>s.id!==row.id)}));
      setMessage('義項已刪除。其他尚未儲存的修改仍保留在表單。');
    }catch(e){setMessage(e instanceof Error?e.message:String(e));}finally{setBusy(false);}
  };
  const removeContent=async(table:'dictionary_etymologies'|'dictionary_learning_notes'|'dictionary_examples'|'dictionary_lexical_annotations'|'dictionary_pronunciations',row:Row,title:string)=>{
    if(busy||locked)return;
    const id=String(row.id),saved=baseline[table].find(r=>r.id===id&&Number(r.revision)>0);
    const remove=(b:Bundle)=>({...b,[table]:b[table].filter(r=>r.id!==id)});
    if(!saved){setBundle(remove);return;}
    if(saveReview){if(await confirmDialog('從 Review Draft 移除此內容？儲存及核准前不影響公開內容。'))setBundle(remove);return;}
    if(!await confirmDialog({title:`刪除${title}`,message:'永久刪除此已儲存的草稿內容？此操作立即儲存，其他內容與尚未儲存的修改會保留。',confirmLabel:'刪除',danger:true}))return;
    setBusy(true);setMessage('');
    try{const revision=await deleteDraftContent(getSupabase()!,detail.entry.id,table,id,Number(baseline.dictionary_entries[0].revision),Number(saved.revision));
      const apply=(b:Bundle)=>({...remove(b),dictionary_entries:b.dictionary_entries.map(e=>({...e,revision}))});setBundle(apply);setBaseline(apply);setMessage(`${title}已刪除。`);
    }catch(e){setMessage(e instanceof Error?e.message:String(e));}finally{setBusy(false);}
  };
  return <section className="min-w-0 space-y-3" aria-label="詞條編輯器">
    <header className="sticky top-0 z-20 flex flex-wrap items-center gap-2 border-b bg-[var(--color-bg)] py-2">
      <h2 className="min-w-0 flex-1 truncate font-semibold">{headword||'新增詞條'} <span className="ml-2 text-xs font-normal opacity-60">{labels[detail.entry.kind]} · {locked?'最新版本':dirty?'未儲存':detail.entry.status==='published'?'已發布':'草稿'}</span></h2>
      <button type="button" className={`${button} shrink-0`} disabled={busy||publicationBusy||locked||!dirty} onClick={()=>void save()}>{busy?'儲存中…':'儲存'}</button>
      {onPublish&&<button type="button" className={button} disabled={busy||publicationBusy||!canPublish} onClick={()=>{if(dirty){setMessage('尚有未儲存變更，請先儲存後再發布。');return;}void onPublish();}}>{publicationBusy?'處理中…':'發布'}</button>}
    </header>
    {navigation.pending&&<DictionaryModal title="離開編輯" onClose={navigation.cancel} busy={busy||publicationBusy}><p>有尚未儲存的修改。</p><div className="flex flex-wrap gap-2"><button className={button} disabled={busy||publicationBusy} onClick={()=>void navigation.saveAndLeave()}>儲存變更</button><button className={button} disabled={busy||publicationBusy} onClick={navigation.discard}>放棄變更</button><button className={button} disabled={busy||publicationBusy} onClick={navigation.cancel}>繼續編輯</button></div></DictionaryModal>}
    {message&&<p role="alert" className="whitespace-pre-wrap break-words text-sm">{message}</p>}
    {matching.length>0&&<div role="alert" className="space-y-2"><p>同類同拼寫已有詞條，請在既有詞條新增中文義項。</p>{matching.map(e=><button key={e.id} className={button} onClick={()=>void (async()=>{if(await confirmDialog('開啟既有詞條？目前尚未儲存的表單將捨棄，請先保留需要的內容。'))await onSaved(e.id);})()}>開啟 {e.headword} · {e.status==='published'?'已發布（需 Review Draft）':'草稿'}</button>)}</div>}
    {locked&&<p>目前公開版本為唯讀；請建立 Review Draft 後編輯及核准。</p>}
    <fieldset disabled={busy||publicationBusy||locked} className="min-w-0 space-y-5">
      <EditorSection title="基本資訊">
        <Field label={labels[detail.entry.kind]} value={bundle.dictionary_entries[0].headword} onChange={v=>change('dictionary_entries',0,'headword',v)}/>
        {detail.entry.kind!=='word'&&<>
          {detail.entry.kind==='root'&&<label className="block text-sm">主要分類<select className={control} value={grouping.primary_category??''} onChange={event=>{const category=event.currentTarget.value||null;setGrouping(g=>({...g,primary_category:category}));}}><option value="">未分類</option>{primaryCategories.map(c=><option key={c} value={c}>{c}</option>)}</select></label>}
          <VariantEditor value={grouping.variant_group} onChange={v=>setGrouping(g=>({...g,variant_group:v}))}/>
        </>}
      </EditorSection>
      <EditorSection title="義項" count={bundle.dictionary_senses.length}><div className="flex flex-wrap items-center justify-between gap-2"><button type="button" className={addButton} onClick={()=>void addSense()} aria-label={detail.entry.kind==='word'?'＋新增義項':'＋新增中文義項'}>{detail.entry.kind==='word'?'＋新增義項':'＋新增'}</button></div>
      {bundle.dictionary_senses.map((row,i)=><div key={String(row.id)} className="min-w-0 space-y-2 border-t border-[var(--color-border)] py-3">
        <div data-word-sense-row={detail.entry.kind==='word'?String(row.id):undefined} className={detail.entry.kind==='word'?"grid min-w-0 grid-cols-[minmax(0,1fr)_44px] items-end gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_44px]":"flex items-center justify-between gap-2"}><h4 className={detail.entry.kind==='word'?"sr-only":"text-sm font-medium"}>義項 {i+1}</h4>
        {detail.entry.kind==='word'&&<><Field label="詞性" placeholder="未設定" value={row.part_of_speech} onChange={v=>change('dictionary_senses',i,'part_of_speech',v||null)}/><div className="col-start-1 sm:col-start-auto"><Field label="中文意思" value={row.gloss_zh_tw} onChange={v=>change('dictionary_senses',i,'gloss_zh_tw',v)}/></div></>}<button type="button" aria-label={`刪除義項 ${i+1}`} className={(detail.entry.kind==='word'?'col-start-2 row-start-1 sm:col-start-auto sm:row-start-auto ':'')+"min-h-11 shrink-0 rounded px-2 py-1 text-xs opacity-70 hover:bg-[var(--color-panel-bg)] hover:opacity-100"} onClick={()=>void removeSense(row)}><FeatureIcon feature="delete" size={16}/></button></div>
        {detail.entry.kind!=='word'&&<Field label="中文意思" value={row.gloss_zh_tw} onChange={v=>change('dictionary_senses',i,'gloss_zh_tw',v)}/>}
        {detail.entry.kind==='prefix'&&<label className="block text-sm">分類<select className={control} aria-label={`義項 ${i+1} 的分類`} value={senseGroups[String(row.id)]??''} onChange={event=>{const category=event.currentTarget.value||null;setSenseGroups(g=>({...g,[String(row.id)]:category}));}}><option value="">未分類</option>{prefixCategories.map(c=><option key={c} value={c}>{c}</option>)}</select></label>}
      </div>)}
      </EditorSection>
      {detail.entry.kind==='word'&&<>
      <EditorSection title="詞形變化" count={bundle.dictionary_inflections.length}>
      <div className="flex justify-end"><button type="button" className={addButton} aria-label="＋新增詞形變化" onClick={()=>add('dictionary_inflections',{sense_id:null,form_kind:availableInflections(bundle.dictionary_senses as unknown as DictionarySense[],null)[0]??'',form:'',sort_order:bundle.dictionary_inflections.length})}>＋新增</button></div>
      {!bundle.dictionary_inflections.length&&<p className="text-sm opacity-60">尚無詞形</p>}
      {!!bundle.dictionary_inflections.length&&<div aria-hidden className="hidden gap-2 text-xs opacity-60 sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.4fr)_44px]"><span>變化類型</span><span>詞形</span><span>適用義項</span><span/></div>}
      {bundle.dictionary_inflections.map((row,i)=>{const types=availableInflections(bundle.dictionary_senses as unknown as DictionarySense[],String(row.sense_id??'')||null);return <div key={String(row.id)} data-inflection-row className="grid min-w-0 grid-cols-[minmax(0,1fr)_44px] items-end gap-2 border-t border-[var(--color-border)] py-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.4fr)_44px]">
      <label className="min-w-0 text-sm"><span className="sm:sr-only">變化類型</span><select className={control} value={String(row.form_kind)} onChange={e=>change('dictionary_inflections',i,'form_kind',e.target.value)}><option value="">請選擇</option>{!types.includes(row.form_kind as keyof typeof inflectionLabels)&&!!row.form_kind&&<option value={String(row.form_kind)}>詞性不符：{String(row.form_kind)}</option>}{types.map(t=><option key={t} value={t}>{inflectionLabels[t]}</option>)}</select>{!types.length&&<span className="text-sm">請先在義項設定 verb／noun／adjective／adverb 詞性。</span>}</label>
      <div className="col-start-1 sm:col-start-auto"><Field compact label="詞形" value={row.form} onChange={v=>change('dictionary_inflections',i,'form',v)}/></div>
      <div className="col-start-1 sm:col-start-auto">{contentSense('dictionary_inflections',i,row,true)}</div>
      <button type="button" aria-label="移除詞形" className="col-start-2 row-start-1 min-h-11 self-start p-2 hover:bg-zinc-500/10 sm:col-start-auto sm:row-start-auto" onClick={()=>setBundle(b=>({...b,dictionary_inflections:b.dictionary_inflections.filter(r=>r.id!==row.id)}))}><FeatureIcon feature="delete" size={16}/></button>
      </div>;})}
      </EditorSection>
      <EditorSection title="構詞關聯" count={bundle.dictionary_relations.length}><div className="flex flex-wrap items-center justify-between gap-2"><button className={addButton} disabled={!bundle.dictionary_senses.length} onClick={()=>setAddingRelation(true)} aria-label="＋新增構詞關聯">＋新增</button></div>
      {!bundle.dictionary_relations.length&&<p className="text-sm">尚無構詞關聯</p>}
      {bundle.dictionary_relations.map((row,i)=><div key={String(row.id)} className="min-w-0 space-y-2 border-t border-[var(--color-border)] py-3">
        {bundle.dictionary_senses.length>1&&contentSense('dictionary_relations',i,row)}
        <RelationTargetPicker entryId={String(row.target_entry_id)} senseId={String(row.target_sense_id)} excludeEntryId={detail.entry.id} excludedSenseIds={bundle.dictionary_relations.filter(r=>r.id!==row.id&&r.sense_id===row.sense_id).map(r=>String(r.target_sense_id))} onChange={(entry,sense)=>setBundle(b=>({...b,dictionary_relations:b.dictionary_relations.map((r,index)=>index===i?{...r,target_entry_id:entry,target_sense_id:sense}:r)}))}/>
        <div className="flex flex-wrap gap-2"><button className={button} disabled={i===0} onClick={()=>setBundle(b=>({...b,dictionary_relations:moveRow(b.dictionary_relations,i,-1)}))}>上移</button><button className={button} disabled={i===bundle.dictionary_relations.length-1} onClick={()=>setBundle(b=>({...b,dictionary_relations:moveRow(b.dictionary_relations,i,1)}))}>下移</button><button className={addButton} onClick={()=>setBundle(b=>({...b,dictionary_relations:b.dictionary_relations.filter(r=>r.id!==row.id)}))} aria-label="移除構詞關聯"><FeatureIcon feature="delete" size={16}/></button></div>
      </div>)}
      {addingRelation&&<RelationSelectionDialog excludeEntryId={detail.entry.id} excludedSenseIds={bundle.dictionary_relations.filter(r=>r.sense_id==null).map(r=>String(r.target_sense_id))} onClose={()=>setAddingRelation(false)} onSelect={(entry,sense)=>{add('dictionary_relations',{sense_id:null,target_entry_id:entry,target_sense_id:sense});setAddingRelation(false);}}/>}
      </EditorSection>
      </>}
      <EditorSection title="補充資料" count={bundle.dictionary_pronunciations.length+bundle.dictionary_etymologies.length+bundle.dictionary_learning_notes.length+bundle.dictionary_examples.length+bundle.dictionary_lexical_annotations.length}>
      <section className="space-y-2"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">讀音</h3><button className={addButton} onClick={()=>add('dictionary_pronunciations',{sense_id:null,ipa:'',locale:null,note:null,sort_order:(bundle.dictionary_pronunciations??[]).length})} aria-label="＋新增讀音">＋新增</button></div>
      {(bundle.dictionary_pronunciations??[]).map((row,i)=><div key={String(row.id)} className="min-w-0 space-y-2 border-t border-[var(--color-border)] py-3">
        <div className="flex justify-end"><button className={addButton} onClick={()=>void removeContent('dictionary_pronunciations',row,'讀音')} aria-label="刪除讀音"><FeatureIcon feature="delete" size={16}/></button></div>
        {contentSense('dictionary_pronunciations',i,row)}
        <Field label="IPA" value={row.ipa} onChange={v=>change('dictionary_pronunciations',i,'ipa',v)}/>
        <Field label="地區／語言（選填，例如 en-GB）" value={row.locale} onChange={v=>change('dictionary_pronunciations',i,'locale',v||null)}/>
        <Field label="備註（選填）" value={row.note} onChange={v=>change('dictionary_pronunciations',i,'note',v||null)}/>
        <Field label="排序" value={row.sort_order} onChange={v=>change('dictionary_pronunciations',i,'sort_order',Number(v))}/>
      </div>)}</section>
      {([{table:'dictionary_etymologies',title:'歷史詞源',kind:null},{table:'dictionary_learning_notes',title:'口訣',kind:'learning_decomposition'},{table:'dictionary_learning_notes',title:'記憶故事',kind:'mnemonic_scenario'}] as const).map(({table,title,kind})=><section key={title} className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">{title}</h3><button className={addButton} onClick={()=>add(table,kind?{sense_id:newContentSense(),body:'',kind}:{sense_id:newContentSense(),body:'',verification:'unverified',verification_note:''})} aria-label={`新增${title}`}>＋新增</button></div>
        {bundle[table].map((row,i)=>(!kind||row.kind===kind)&&<div key={String(row.id)} className="space-y-2 border-t border-[var(--color-border)] py-3">
          <div className="flex justify-end"><button type="button" aria-label={`刪除${title}`} className="rounded px-2 py-1 text-xs opacity-70 hover:bg-[var(--color-panel-bg)] hover:opacity-100" onClick={()=>void removeContent(table,row,title)}><FeatureIcon feature="delete" size={16}/></button></div>
          {contentSense(table,i,row)}
          <Field label="完整內容" multiline value={row.body} onChange={v=>{change(table,i,'body',v);if(!kind)change(table,i,'verification','pending');}}/>
          {!kind&&<Field label="資料來源" multiline value={row.verification_note} onChange={v=>{change(table,i,'verification_note',v);change(table,i,'verification','pending');}}/>}
        </div>)}
      </section>)}
      {([{table:'dictionary_examples',title:'例詞',kind:null},{table:'dictionary_lexical_annotations',title:'待解析構詞提示',kind:'relation_hint'}] as const).map(({table,title,kind})=><section key={title} className="space-y-2"><h3 className="font-semibold">{title}</h3>{(bundle[table]??[]).map((row,i)=>(!kind||row.kind===kind)&&<div key={String(row.id)}><button type="button" className={button} onClick={()=>void removeContent(table,row,title)} aria-label={`刪除${title}`}><FeatureIcon feature="delete" size={16}/></button>{contentSense(table,i,row)}<Field label={title} multiline value={row.body} onChange={v=>change(table,i,'body',v)}/><Field label="排序" value={row.sort_order} onChange={v=>change(table,i,'sort_order',Number(v))}/></div>)}<button type="button" className={addButton} onClick={()=>add(table,{sense_id:newContentSense(),body:'',sort_order:(bundle[table]??[]).length,...(kind?{kind}:{})})} aria-label={`新增${title}`}>＋新增</button></section>)}
      {(bundle.dictionary_lexical_annotations??[]).some(r=>r.kind==='source_forms')&&<details><summary>舊原始字形註釋（保留原文，非結構化詞形）</summary>{bundle.dictionary_lexical_annotations.map((row,i)=>row.kind==='source_forms'&&<div key={String(row.id)}>{contentSense('dictionary_lexical_annotations',i,row)}<Field label="舊原始字形註釋" multiline value={row.body} onChange={v=>change('dictionary_lexical_annotations',i,'body',v)}/></div>)}</details>}
      </EditorSection>
    </fieldset>
    <button className={button} disabled={busy} onClick={()=>{if(preview){setPreview(false);return;}if(locked||saveReview){setPreview(true);return;}setBusy(true);setMessage('');void previewDictionaryDraft(getSupabase()!,draftsFromBundle(prepareEditorBundle(bundle),detail.entry.kind==='word'?undefined:grouping,senseGroups),true).then(()=>setPreview(true)).catch(e=>setMessage(e instanceof Error?e.message:String(e))).finally(()=>setBusy(false));}}>切換完整預覽</button>
    {preview&&<DictionaryPreview bundle={bundle} technical={false}/>}
    {onDeleted&&!saveReview&&detail.entry.status==='draft'&&detail.entry.revision>0&&<button type="button" className={button} disabled={busy||publicationBusy} onClick={()=>void removeDraft()}>{t('dictionary.deleteDraft')}</button>}
    <details><summary>編輯內容備份</summary><p>儲存失敗時，可下載目前輸入，再重新載入比對；備份不會發布。</p><a className={button} download="dictionary-editor-backup.json" href={'data:application/json;charset=utf-8,'+encodeURIComponent(JSON.stringify({format:'nexus-dictionary-editor-backup',version:1,draft:draftsFromBundle(prepareEditorBundle(bundle),grouping,senseGroups)[0]},null,2))}>下載目前編輯內容</a></details>
    {reviewDraft&&<p>這是舊版複製型審核草稿，沒有可靠的 base revision，不能直接核准。請從原 Published 建立新版 Review Draft 並重新比對；舊資料保留。</p>}
  </section>;
}

export function moveRow<T>(rows:T[],index:number,offset:number):T[]{const target=index+offset;if(target<0||target>=rows.length)return rows;const next=[...rows];[next[index],next[target]]=[next[target],next[index]];return next;}
export function prepareEditorBundle(bundle:Bundle):Bundle {
  return Object.fromEntries(Object.entries(bundle).filter(([table])=>table!=='dictionary_sources').map(([table,rows])=>[table,rows.map(row=>{const copy={...row};delete copy.source_id;return copy;})]));
}
export function visibleAdminEntries(entries:DictionaryEntry[],kinds:string[]|string,query:string,statuses:string[]=[]){const types=Array.isArray(kinds)?kinds:kinds==='all'?[]:[kinds];return entries.filter(e=>(!types.length||types.includes(e.kind))&&(!statuses.length||statuses.includes(e.status))&&e.headword.toLowerCase().includes(query.toLowerCase()));}
export function DictionaryListFilters({kinds,statuses,onKinds,onStatuses,hideStatuses=false}:{kinds:string[];statuses:string[];onKinds:(values:string[])=>void;onStatuses:(values:string[])=>void;hideStatuses?:boolean}){
  const {t}=usePaginationLanguage();
  return <div className="flex min-w-0 flex-wrap gap-4">{[{title:'類型',values:kinds,options:labels,change:onKinds},{title:'狀態',values:statuses,options:{draft:'草稿',published:'已發布'},change:onStatuses}].filter(group=>!hideStatuses||group.title!=='狀態').map(group=><fieldset key={group.title} className="min-w-0"><legend className="mb-2 text-sm">{t(group.title==='類型'?'ui.kind':'ui.status')}</legend><div className="flex flex-wrap gap-3">{Object.entries(group.options).map(([value])=><label key={value} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={group.values.includes(value)} onChange={e=>group.change(e.target.checked?[...group.values,value]:group.values.filter(v=>v!==value))}/>{t('ui.'+value)}</label>)}</div></fieldset>)}</div>;
}
export function DictionaryListActions({busy,onNew,onImport,onExport}:{busy:boolean;onNew:()=>void;onImport:()=>void;onExport:()=>void}){
 const {t}=usePaginationLanguage();
 return <div className="flex flex-wrap gap-2"><button className={button} disabled={busy} onClick={onNew}>{t("ui.new")}</button><button className={button} disabled={busy} onClick={onImport}>{t("exchange.import")}</button><button className={button} disabled={busy} onClick={onExport}>{t("exchange.export")}</button></div>;
}
export function PublishedWorkspace({detail,entries,senses,refresh}:{detail:DictionaryDetail;entries:DictionaryEntry[];senses:DictionarySense[];refresh:(id:string)=>Promise<void>}){
  const [reviews,setReviews]=useState<DictionaryReview[]>([]),[chosen,setChosen]=useState<DictionaryReview|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const [targets,setTargets]=useState({entries,senses});
  useEffect(()=>{let active=true;const ids=[...new Set([...detail.relations,...(chosen?.candidate.bundle.dictionary_relations??[])].map(r=>String(r.target_entry_id)))];
    void Promise.all(ids.map(id=>getDictionaryEntry(getSupabase()!,id))).then(rows=>{if(active)setTargets({entries:rows.flatMap(r=>r?[r.entry]:[]),senses:rows.flatMap(r=>r?.senses??[])});}).catch(()=>{if(active)setError('構詞目標名稱暫時無法讀取。');});return()=>{active=false;};
  },[detail,chosen]);
  const reload=async()=>{const {data,error}=await getSupabase()!.from('dictionary_review_drafts').select('*').eq('entry_id',detail.entry.id).eq('state','active').order('updated_at',{ascending:false});if(error)throw Error(error.message);setReviews(data??[]);};
  const [view,setView]=useState<'latest'|'draft'>('draft');
  const run=async(work:()=>Promise<void>)=>{setBusy(true);setError('');try{await work();}catch(e){setError(e instanceof Error?e.message:String(e));}finally{setBusy(false);}};
  const [editorEpoch,setEditorEpoch]=useState(0);
  const [base,setBase]=useState<import('./aiDictionary').AISnapshot|null>(null),[ready,setReady]=useState(false);
  useEffect(()=>{let active=true;void (async()=>{try{const snapshot=await readAI(getSupabase()!,detail.entry.id);const {data,error}=await getSupabase()!.from('dictionary_review_drafts').select('*').eq('entry_id',detail.entry.id).eq('state','active').order('updated_at',{ascending:false});if(error)throw Error(error.message);if(active){setBase(snapshot);setReviews(data??[]);if(data?.length===1)setChosen(data[0]);setReady(true);}}catch(e){if(active)setError(String(e));}})();return()=>{active=false;};},[detail.entry.id]);
  if(!ready||!base)return <section><p role="status">{error||'正在讀取編輯內容…'}</p></section>;
  const activeReviews=reviews.filter(r=>r.state==='active');
  const snapshot=chosen?reviewSnapshot(chosen):base;
  const stale=!!chosen&&chosen.base_revision!==detail.entry.revision;
  const saveCurrent=async(draft:DictionaryDraftInput)=>{
    if(stale)throw Error('此草稿的 Published 基底已變更。請保留輸入，重新載入版本資訊後比對；不會覆蓋公開內容。');
    let saved:DictionaryReview;
    if(chosen){const {data,error}=await getSupabase()!.rpc('save_dictionary_review',{review_uuid:chosen.id,expected_revision:chosen.revision,content_verified:true,candidate:{...mapDictionaryDraft(draft),component_order:draft.relations.map(r=>r.id)}});if(error)throw Error(`${error.message}。輸入已保留；請先備份內容，再重新載入比對。`);saved=data;}
    else {const {data,error}=await getSupabase()!.rpc('create_dictionary_edit_review',{entry_uuid:detail.entry.id,expected_snapshot:base,candidate:{...mapDictionaryDraft(draft),component_order:draft.relations.map(r=>r.id)}});if(error)throw Error(`${error.message}。輸入已保留；請先備份內容，再重新載入比對既有草稿。`);saved=data;}
    setChosen(saved);setReviews(rs=>[saved,...rs.filter(r=>r.id!==saved.id)]);
  };
  const publish=async()=>run(async()=>{if(!chosen||stale)return;if(!await confirmDialog({title:'核准發布新版本',message:'我已完成內容與構詞依據的查證，確認發布已儲存的審核草稿。目前公開版本將保留在版本歷史。',confirmLabel:'發布'}))return;const {error}=await getSupabase()!.rpc('approve_dictionary_review',{review_uuid:chosen.id,expected_revision:chosen.revision,content_verified:true});if(error)throw Error(`${error.message}。請保留內容並重新載入版本資訊後比對。`);await refresh(detail.entry.id);});
  const latestBundle:Bundle={dictionary_entries:[base.detail.entry as unknown as Row],dictionary_senses:base.detail.senses as unknown as Row[],dictionary_relations:base.detail.relations as unknown as Row[],dictionary_etymologies:base.detail.etymologies as unknown as Row[],dictionary_learning_notes:base.detail.learning_notes as unknown as Row[],dictionary_inflections:(base.detail.inflections??[]) as unknown as Row[],dictionary_pronunciations:(base.detail.pronunciations??[]) as unknown as Row[],dictionary_examples:(base.detail.examples??[]) as unknown as Row[],dictionary_lexical_annotations:(base.detail.lexical_annotations??[]) as unknown as Row[]};
  return <section className="min-w-0 space-y-3">
    {!!activeReviews.length&&<div role="tablist" aria-label="詞條版本" className="flex gap-2">{(['latest','draft'] as const).map(tab=><button type="button" role="tab" tabIndex={view===tab?0:-1} onKeyDown={e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const next=e.key==='Home'?'latest':e.key==='End'?'draft':view==='latest'?'draft':'latest';setView(next);const tabs=e.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]');tabs?.[next==='latest'?0:1]?.focus();}} aria-selected={view===tab} key={tab} onClick={()=>setView(tab)} className="min-h-11 rounded px-4 text-sm" style={{background:view===tab?'var(--color-border)':undefined}}>{tab==='latest'?'最新版本':'草稿'}</button>)}</div>}
    {!!activeReviews.length&&view==='latest'&&<section aria-label="最新版本"><h2 className="text-xl">{detail.entry.headword} · {labels[detail.entry.kind]} · 已發布</h2><DictionaryPreview bundle={latestBundle} technical={false}/></section>}
    <div hidden={!!activeReviews.length&&view==='latest'}>
    {activeReviews.length>1&&<label className="block text-sm">選擇草稿<select aria-label="選擇草稿" className={control} value={chosen?.id??''} onChange={e=>{const reviewId=e.currentTarget.value;navigateDictionary(()=>{setChosen(activeReviews.find(r=>r.id===reviewId)??null);setEditorEpoch(n=>n+1);});}}><option value="">請選擇</option>{activeReviews.map((r,i)=><option key={r.id} value={r.id}>草稿 {i+1} · {r.source}</option>)}</select></label>}
    {activeReviews.length>1&&!chosen?<p role="alert">有多筆既有草稿，請選擇要續編的草稿；不會新增或覆蓋。</p>:<DictionaryEditor key={`${chosen?.id??'published'}:${editorEpoch}`} detail={snapshot.detail} initialGrouping={snapshot.grouping??emptyGrouping()} initialSenseGroups={snapshot.sense_groups} entries={entries} senses={senses} onSaved={async()=>{}} saveReview={saveCurrent} onPublish={publish} canPublish={!!chosen&&!stale} publicationBusy={busy}/>}
    {stale&&<p role="alert">最新版本已變更，這份草稿不能發布。請先備份輸入，再重新載入比對。</p>}
    {chosen&&<><button type="button" className={button} disabled={busy} onClick={()=>navigateDictionary(()=>void run(async()=>{if(!await confirmDialog('捨棄此 Review Draft？目前 Published 不會受影響。'))return;const {error}=await getSupabase()!.rpc('discard_dictionary_review',{review_uuid:chosen.id,expected_revision:chosen.revision,content_verified:true});if(error)throw Error(error.message);setChosen(null);await reload();setView('draft');}))}>捨棄草稿</button>
      <details><summary>已儲存的內容差異</summary>{diffDictionaryReview(chosen,targets).map((d,i)=><details key={i} open={d.kind!=='unchanged'} className="min-w-0 border-b py-2"><summary className="break-words">{{added:'新增',modified:'修改',removed:'移除',unchanged:'相同'}[d.kind]} · {d.label}</summary><div className="grid min-w-0 gap-2 text-xs sm:grid-cols-2"><pre className="whitespace-pre-wrap break-words">原：{JSON.stringify(d.before,null,2)}</pre><pre className="whitespace-pre-wrap break-words">新：{JSON.stringify(d.after,null,2)}</pre></div></details>)}</details></>}
    </div>
    {error&&<p role="alert" className="whitespace-pre-wrap">{error}</p>}
    <button className={button} disabled={busy} onClick={()=>navigateDictionary(()=>void run(async()=>{await refresh(detail.entry.id);const snapshot=await readAI(getSupabase()!,detail.entry.id);const {data,error}=await getSupabase()!.from('dictionary_review_drafts').select('*').eq('entry_id',detail.entry.id).eq('state','active').order('updated_at',{ascending:false});if(error)throw Error(error.message);setBase(snapshot);setReviews(data??[]);setChosen(data?.length===1?data[0]:null);setEditorEpoch(n=>n+1);setView('draft');} ))}>重新載入版本與草稿</button>
  </section>;
}

export function DictionaryWorkspace({entryId,newKind,embedded=false}:{entryId?:string;newKind?:DictionaryEntry['kind'];embedded?:boolean}){
  const senses:DictionarySense[]=[];
  const [page,setPage]=useState(0),[reload,setReload]=useState(0),[work,setWork]=useState<string[]>([]),[reviewTarget,setReviewTarget]=useState<string|null>(()=>typeof window!=='undefined'&&new URLSearchParams(window.location.search).get('review')?new URLSearchParams(window.location.search).get('review')==='all'?'*':new URLSearchParams(window.location.search).get('review'):null);
  const [detail,setDetail]=useState<DictionaryDetail|null>(()=>{
    if(!newKind)return null;
    const id=crypto.randomUUID();
    return {entry:{id,kind:newKind,headword:'',status:'draft',published_at:null,revision:0,updated_at:''},senses:[{id:crypto.randomUUID(),entry_id:id,part_of_speech:newKind==='word'?'noun':null,gloss_zh_tw:'',revision:0,updated_at:''}],relations:[],etymologies:[],learning_notes:[]};
  }),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
  const [kinds,setKinds]=useState<string[]>([]),[statuses,setStatuses]=useState<string[]>([]),[query,setQuery]=useState('');
  const {t}=usePaginationLanguage();
  const [format,setFormat]=useState<'csv'|'md'|'json'|'ai'>('json');
  const [fileText,setFileText]=useState(''),[sourceName,setSourceName]=useState('');

  const [modal,setModal]=useState<'new'|'import'|'export'|null>(null),[createKind,setCreateKind]=useState<DictionaryEntry['kind']>('word');
  const [grouping,setGrouping]=useState<DictionaryGrouping>(emptyGrouping);
  const [senseGroups,setSenseGroups]=useState<SenseGroupMap>({});
  const [reviewDraft,setReviewDraft]=useState(false);
  const closeModal=async ()=>{if(!busy&&(!fileText||await confirmDialog('有尚未匯入的內容，確定關閉？'))){setModal(null);setFileText('');}};
  async function loadDetail(id:string){const d=await getDictionaryEntry(getSupabase()!,id);const g=d&&d.entry.kind!=='word'?await readGrouping(getSupabase()!,id):emptyGrouping();const sg=d?.entry.kind==='prefix'?await readSenseGroups(getSupabase()!,d.senses.map(s=>s.id)):{};const {data:meta,error}=await getSupabase()!.from('dictionary_ai_metadata').select('published_entry_id,component_order').eq('entry_id',id).maybeSingle();if(error)throw new Error(error.message);if(d&&meta?.component_order){const order:string[]=meta.component_order;d.relations.sort((a,b)=>(order.includes(a.id)?order.indexOf(a.id):999999)-(order.includes(b.id)?order.indexOf(b.id):999999));}return {d,g,sg,review:!!meta?.published_entry_id};}
  useUnsavedDraft(!detail&&!!fileText,busy);
  async function refresh(id?:string){setReload(n=>n+1);if(id){const {d,g,sg,review}=await loadDetail(id);setReviewDraft(review);setSenseGroups(sg);setGrouping(g);setDetail(d);if(!embedded)window.history.replaceState(window.history.state,"",`/dictionary/admin?entry=${encodeURIComponent(id)}`);}}
  const listing=usePagedList(JSON.stringify([kinds,statuses,query,work,reload,entryId,newKind]),page,adminPageSize,async p=>{
    if(entryId||newKind)return {items:[],total:0,page:0,stats:null,workAvailable:false};
    return {...await listAdminWork(getSupabase()!,{kinds,statuses,query,work,page:p}),page:p};
  },p=>{setPage(p);});
  const revalidate=useRef(listing.retry);
  useEffect(()=>{revalidate.current=listing.retry;});
  useEffect(()=>{if(entryId||newKind)return;return observeDictionaryInvalidation(()=>revalidate.current());},[entryId,newKind]);
  const entries=listing.data?.items??[],loading=listing.loading;
  async function action(work:()=>Promise<void>){setBusy(true);setMessage('');try{await work();}catch(e){setMessage(e instanceof Error?e.message:String(e));}finally{setBusy(false);}}
  useEffect(()=>{if(!entryId)return;let active=true;void loadDetail(entryId).then(({d,g,sg,review})=>{if(active){setReviewDraft(review);setSenseGroups(sg);setGrouping(g);setDetail(d);if(!d)setMessage('找不到此詞條。');}}).catch(e=>{if(active)setMessage(String(e));});return()=>{active=false;};},[entryId]);
  const visible=entries;

  if(detail?.entry.status==='published')return <><PersistentReviewPanel entryId={detail.entry.id} compact/><PublishedWorkspace key={`${detail.entry.id}:${detail.entry.revision}`} detail={detail} entries={entries} senses={senses} refresh={refresh}/></>;
  if(detail)return <><PersistentReviewPanel entryId={detail.entry.id} compact/><DictionaryEditor key={`${detail.entry.id}:${detail.entry.revision}`} detail={detail} initialGrouping={grouping} initialSenseGroups={senseGroups} reviewDraft={reviewDraft} entries={entries} senses={senses} onSaved={refresh} onDeleted={()=>window.location.assign('/dictionary/admin')}/></>;
  if(entryId)return <div><p role="status">{message||'正在讀取詞條…'}</p></div>;
  return <div className="space-y-5">
    {reviewTarget&&<DictionaryModal title={t('persistent.queue')} onClose={()=>setReviewTarget(null)}><PersistentReviewPanel entryId={reviewTarget==='*'?undefined:reviewTarget} onChanged={()=>setReload(n=>n+1)}/></DictionaryModal>}
    <div className="flex flex-wrap items-center justify-between gap-3"><DictionaryListActions busy={busy||loading} onNew={()=>setModal('new')} onImport={()=>setModal('import')} onExport={()=>setModal('export')}/><div className="flex flex-wrap items-center gap-2">{listing.data?.workAvailable&&<button className={button} onClick={()=>setReviewTarget('*')}>{t('persistent.openQueue')}</button>}
     <DictionaryBulkPublish disabled={busy||loading}/></div></div>
     {loading&&<p role="status">{t('common.loading')}</p>}
    {listing.error&&<p role="alert">{listing.error}<button className="ml-2 underline" onClick={listing.retry}>重試</button></p>}


    {modal==='export'&&<DictionaryModal title={t("exchange.export")} onClose={closeModal} busy={busy}><p className="text-sm opacity-70">{t("ui.exportScopeHelp")}</p><DictionaryExchangeExport scope={{kinds,statuses,query}} onBusy={setBusy}/></DictionaryModal>}
    {modal==='new'&&<DictionaryModal title="新增詞條" onClose={closeModal}><label className="block text-sm">詞條類別<select className={control} value={createKind} onChange={e=>setCreateKind(e.target.value as DictionaryEntry['kind'])}>{Object.entries(labels).map(([k,l])=><option key={k} value={k}>{l}</option>)}</select></label><Link className={`${button} inline-block`} href={`/dictionary/admin?new=${createKind}`}>開始新增</Link></DictionaryModal>}
    <input aria-label={t("ui.searchDictionary")} placeholder={t("ui.searchDictionary")} className={control} value={query} onChange={e=>{setQuery(e.target.value);setPage(0);}}/>
    <div data-dictionary-filters className="flex min-w-0 flex-wrap items-start gap-x-6 gap-y-3">
    <DictionaryListFilters kinds={kinds} statuses={statuses} onKinds={values=>{setKinds(values);setPage(0);}} onStatuses={values=>{setStatuses(values);setPage(0);}} hideStatuses/>
    {listing.data?.workAvailable&&<fieldset className="flex flex-wrap gap-3 text-sm"><legend className="mb-2">{t('persistent.workFilter')}</legend>{(['red','yellow','green'] as const).map(color=><label key={color} className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={work.includes(color)} onChange={e=>{setWork(e.target.checked?[...work,color]:work.filter(v=>v!==color));setPage(0);}}/>{t('persistent.'+color)}</label>)}</fieldset>}
    </div>
    <Pagination label={t("ui.dictionaryPagination")} page={listing.data?.page??0} total={listing.data?.total} pageSize={adminPageSize} loading={loading} disabled={busy||!listing.data} onPageChange={p=>{setPage(p);}}/>
    {listing.data?.workAvailable&&<p role="status" className="text-sm">{t('ui.redCount',{n:listing.data.stats!.red})}</p>}
    <div className="@container"><ul data-dictionary-list className="grid min-w-0 grid-cols-1 gap-3 @min-[560px]:grid-cols-2 @min-[900px]:grid-cols-3">{visible.map(e=><li key={e.id} className="flex min-w-0 items-center gap-2 rounded border border-[var(--color-border)]"><Link className="block min-w-0 flex-1 break-words p-3 text-left [overflow-wrap:anywhere] hover:bg-[var(--color-panel-bg)]" href={e.work_status==='red'?`/dictionary/admin?review=${encodeURIComponent(e.id)}`:`/dictionary/admin?entry=${encodeURIComponent(e.id)}`}>{e.headword} · {t("ui."+e.kind)} · {e.work_status?t('persistent.'+e.work_status):e.status==='draft'?'草稿':'已發布'}</Link>{e.work_status==='red'&&<button className={button} onClick={()=>setReviewTarget(e.id)}>{t('persistent.pending',{n:e.pending_count??0})}</button>}</li>)}</ul></div>
    <Pagination label={t("ui.dictionaryPagination")} page={listing.data?.page??0} total={listing.data?.total} pageSize={adminPageSize} loading={loading} disabled={busy||!listing.data} onPageChange={p=>{setPage(p);}}/>
    <>{modal==='import'&&<DictionaryModal title={t("exchange.import")} onClose={closeModal} busy={busy}><section className="space-y-3"><h2 className="font-semibold">{t("exchange.importHeader")}</h2>
      <details><summary>{t("exchange.jsonHelp")}</summary><p className="text-sm leading-6">{t("exchange.editHelp")}</p><p className="text-sm leading-6">{t("exchange.newHelp")}</p></details>
      <details><summary>匯入格式說明 · Dictionary CSV v1（12 欄）</summary><div className="space-y-2 text-sm">
<p>共通必填：kind、headword、gloss_zh_tw。Word 另需 part_of_speech，category 必須留空。Prefix / Root 另需 category，part_of_speech 必須留空。Root 可使用 etymology。</p>
<p>可選：entry_id、sense_id、example_words、source_forms、relation_hint、mnemonic_story。每列一義項；同 kind 與正規化拼寫共用 Entry，不同詞性／語義／詞源使用不同義項。既有內容更新須保留穩定 ID；空 ID 僅在預覽時產生一次 proposed UUID；本次寫入使用相同 ID。寫入後請下載含永久 ID 的 CSV，後續修改保留 ID。</p>
<p>例詞與字形原文完整保留；relation_hint 僅為待解析提示，不自動建立構詞關聯。不接受 citation、license、source_id 或 level。</p>
<details><summary>Prefix 分類（4 類）</summary><ul>{prefixCategories.map(c=><li key={c}>{c}</li>)}</ul></details>
<details><summary>Root 分類（9 類）</summary><ul>{primaryCategories.map(c=><li key={c}>{c}</li>)}</ul></details>
<pre className="whitespace-pre-wrap break-words text-xs">{dictionaryCSVHeaders.join(',')}</pre>
<a className={button} download="dictionary_master_v1.csv" href={'data:text/csv;charset=utf-8,'+encodeURIComponent('\uFEFF'+dictionaryCSVExample)}>下載範例 CSV</a>
<p>Legacy Word CSV：仍接受舊五欄 entry_id,sense_id,headword,part_of_speech,gloss_zh_tw，視為 kind=word。JSON Bundle 與 Markdown 內容匯入保持相容。</p>
</div></details>
      <fieldset disabled={busy} className="space-y-3">
      <p className="text-sm">{t("exchange.formatHint")}</p>
      <label>{t("exchange.inputFormat")}<select aria-label={t("exchange.inputFormat")} className={control} value={format} onChange={e=>setFormat(e.target.value as 'csv'|'md'|'json'|'ai')}><option value="csv">Dictionary CSV v1（含 Legacy Word CSV 相容）</option><option value="md">Markdown 詞源／記憶內容</option><option value="json">Nexus JSON Exchange v1 / Legacy JSON Bundle</option><option value="ai">AI Dictionary JSON（既有 Diff 流程）</option></select></label>
      <input aria-label={t("exchange.file")} type="file" accept=".csv,.md,.json" disabled={busy} onChange={e=>{const file=e.target.files?.[0];if(file)void action(async()=>{if(file.size>64*1024*1024)throw Error("File exceeds 64 MiB");const text=await file.text();setSourceName(file.name);let nextFormat:typeof format=file.name.toLowerCase().endsWith(".csv")?"csv":file.name.toLowerCase().endsWith(".md")?"md":"json";if(nextFormat==="json"){try{if(JSON.parse(text.replace(/^\uFEFF/,'')).format==="nexus-dictionary-ai")nextFormat="ai";}catch{}}setFormat(nextFormat);setFileText(text);});}}/>
      <Field label={t("exchange.pasteFile")} multiline value={fileText} onChange={v=>{setFileText(v);}}/>
      </fieldset>
      {format==='ai'?<AIImport key={fileText} raw={fileText} onBusy={setBusy} onSaved={()=>refresh()}/>:<DictionaryImportReview sourceName={sourceName} raw={fileText} format={format} onBusy={setBusy} onSaved={()=>{setFileText('');return refresh();}}/>}
    </section>{message&&<p role="alert" className="whitespace-pre-wrap">{message}</p>}</DictionaryModal>}</>
    {modal!=='import'&&message&&<p role="alert" className="whitespace-pre-wrap">{message}</p>}
  </div>;
}
export default function DictionaryAdmin({entryId,newKind}:{entryId?:string;newKind?:DictionaryEntry['kind']}={}){
  const [access,setAccess]=useState<{owner:string;allowed:boolean}|null>(null),[error,setError]=useState('');
  const ownerRef=useRef<string|null>(null);
  useEffect(()=>{const client=getSupabase();if(!client)return;let generation=0;let mounted=true;
    const check=async()=>{const run=++generation;setAccess(null);const {data:{user},error:authError}=await client.auth.getUser();if(!mounted||run!==generation)return;if(authError||!user){setError('請先從 Nexus 登入。');return;}const {data,error}=await client.rpc('is_dictionary_admin');if(!mounted||run!==generation)return;if(error){setError('無法確認管理權限，請確認 M7-9／M7-10 migration 已套用。');return;}setError('');ownerRef.current=user.id;setAccess({owner:user.id,allowed:data===true});};
    void check();const {data:{subscription}}=client.auth.onAuthStateChange((event,session)=>{if(event==='INITIAL_SESSION'||event==='TOKEN_REFRESHED'||(session?.user.id===ownerRef.current))return;generation++;ownerRef.current=null;setAccess(null);setTimeout(()=>{if(mounted)void check();},0);});return()=>{mounted=false;generation++;subscription.unsubscribe();};},[]);
  return <main className="h-full min-w-0 flex-1 overflow-y-auto" style={{color:'var(--color-text)',background:'var(--color-bg)'}}><div className="mx-auto max-w-5xl space-y-5 p-4 sm:p-6 [&_*]:border-[var(--color-border)]"><header className="flex min-w-0 flex-wrap items-center gap-3"><SidebarToggle/><Link href={entryId||newKind?'/dictionary/admin':'/dictionary'} className="shrink-0 text-sm underline">← 返回上一頁</Link><h1 className="text-2xl font-semibold">字典管理</h1></header>{!getSupabase()?<p>尚未設定 Supabase。</p>:error?<p role="alert">{error}</p>:access?.allowed?<DictionaryWorkspace key={`${access.owner}:${entryId??newKind??"list"}`} entryId={entryId} newKind={newKind}/>:access?<p>此帳號沒有字典管理權限。</p>:<p>確認管理權限中…</p>}</div></main>;
}
