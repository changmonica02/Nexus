"use client";
import {ReviewApproval,reviewFailure,reviewFailureText,type ReviewFailure} from './reviewApproval';
import {useDictionaryText} from './useDictionaryText';
import {adminContext,adminListHref,adminEntryHref,adminNeighbours,adminWorkHref} from './adminNavigation';
import {invalidateDictionary,observeDictionaryInvalidation} from './dictionaryInvalidation';
import {useDictionaryAdminAccess} from './useDictionaryAdminAccess';
import AutoTextarea from "./AutoTextarea";
import EditorSection from "./EditorSection";
import FeatureIcon from "../../components/FeatureIcon";
import {PageHeader} from "../../components/WorkspaceNavigation";
import {PersistentReviewPanel} from './PersistentImportReview';
import {Pagination} from '../../components/pagination/Pagination';
import {usePagedList} from '../../components/pagination/usePagedList';

import {DraftAutosaveQueue,draftRevisions,draftContentSignature,type DraftSaveStatus} from './draftAutosave';
import {legacyWordSegments,wordSpelling,type WordSegment} from './wordSegments';
import WordSegmentsEditor from './WordSegmentsEditor';
import {compositionRow} from './composition';
import {entryKey} from './entryIdentity';
import {listAdminEntries,listAdminWork,adminSummaries,adminPageSize} from './adminQueries';
import {inflectionLabels,availableInflections} from './inflections';
import {RelationTargetPicker,RelationSelectionDialog} from './RelationTargetPicker';
import {DictionaryBulkPublish} from './DictionaryBulkPublish';
import {confirmDialog} from '../../lib/confirmDialog';


import { useEffect, useLayoutEffect, useCallback, useRef, useState } from 'react';
import Link from 'next/link';
import {VariantEditor} from './variants';
import DictionaryExchangeExport from './DictionaryExchangeExport';
import {usePaginationLanguage} from '../../lib/LanguageContext';
import {AIImport} from './DictionaryAI';
import {DictionaryModal} from './DictionaryModal';
import {emptyGrouping,primaryCategories,prefixCategories,readGrouping,readSenseGroups,type DictionaryGrouping,type SenseGroupMap} from './grouping';
import { getSupabase } from '../../infrastructure/supabase/client';
import { getDictionaryEntry, publishDictionaryEntry, type DictionaryDetail, type DictionaryEntry, type DictionarySense } from './dictionary';
import {dictionaryCSVExample,dictionaryCSVHeaders} from './dictionaryCSV';
import {draftsFromBundle,saveDictionaryDraft,previewDictionaryDraft,validateDictionaryDraft} from './draftPipeline';
import {type Bundle} from './adminImport';
import {reviewSnapshot,type DictionaryReview} from './revisionLifecycle';
import {readAI} from './aiDictionary';
import {mapDictionaryDraft,type DictionaryDraftInput} from './draftPipeline';
import {DictionaryImportReview} from './DictionaryImportReview';
import {withoutSense} from './draftEditing';
import {deleteDictionaryEntry,deletionFailureText} from './deleteEntry';
import {useUnsavedDraft,navigateDictionary} from './useUnsavedDraft';

const control='scroll-mt-24 w-full min-w-0 rounded border border-[var(--color-border)] bg-[var(--color-editor-bg)] p-2 text-sm text-[var(--color-text)]';
const button='min-h-11 rounded border border-[var(--color-border)] bg-[var(--color-panel-bg)] px-3 py-2 text-sm text-[var(--color-text)] disabled:opacity-40';
const addButton='min-h-11 rounded px-2 py-1 text-sm hover:bg-zinc-500/10 disabled:opacity-40';
const labels={word:'單字',prefix:'字首',root:'字根'};
type Row=Record<string,unknown>;
function Field({label,value,onChange,multiline=false,placeholder,compact=false}:{label:string;value:unknown;onChange:(v:string)=>void;multiline?:boolean;placeholder?:string;compact?:boolean}) {
  return <label className="block min-w-0 text-sm"><span className={compact?"sm:sr-only":undefined}>{label}</span>{multiline?<AutoTextarea aria-label={label} className={control} value={String(value??'')} onChange={e=>onChange(e.target.value)}/>:<input aria-label={label} className={control} placeholder={placeholder} value={String(value??'')} onChange={e=>onChange(e.target.value)}/>}</label>;
}

function clean(row:object):Row { const result={...row} as Row;for(const key of ['updated_at','published_at','status','source_id'])delete result[key];return result; }
export function DictionaryPreview({bundle,technical=true}:{bundle:Bundle;technical?:boolean}) {
  const tr=useDictionaryText();
  const order=['dictionary_entries','dictionary_senses','dictionary_pronunciations','dictionary_inflections','dictionary_relations','dictionary_learning_notes','dictionary_etymologies','dictionary_examples'];
  const rank=(table:string)=>order.includes(table)?order.indexOf(table):order.length;
  return <div className="space-y-2" aria-label={tr("字典預覽")}>{Object.entries(bundle).filter(([table,rows])=>technical||rows.length>0&&table!=='dictionary_lexical_annotations').sort(([a],[b])=>rank(a)-rank(b)).map(([table,rows])=><section key={table}>
    <h3 className="font-semibold">{{dictionary_entries:tr('詞條'),dictionary_inflections:tr('詞形變化'),dictionary_pronunciations:tr('讀音'),dictionary_senses:tr('義項'),dictionary_relations:tr('構詞關聯'),dictionary_etymologies:tr('歷史詞源'),dictionary_learning_notes:tr('概念')}[table]??table}</h3>
    {rows.map(row=><article key={String(row.id)} className="my-2 space-y-2 whitespace-pre-wrap break-words rounded border p-3 text-sm">
      {<>
        {(technical||table==='dictionary_entries')&&!!row.kind&&<p>{tr("類型：")}{String(row.kind)}</p>}<p>{String(row.headword??row.gloss_zh_tw??row.form??row.ipa??row.body??tr('義項關聯'))}</p>
        {!!row.part_of_speech&&<p>{tr("詞性：")}{String(row.part_of_speech)}</p>}
        {table==='dictionary_etymologies'&&!!row.data_source&&<p>{tr("資料來源：")}{String(row.data_source)}</p>}
        {technical&&!!row.target_sense_id&&<p>{tr("目標義項：")}{String(row.target_sense_id)}</p>}

      </>}
      {technical&&<details><summary>{tr("穩定識別與資料欄位")}</summary><pre className="whitespace-pre-wrap break-words text-xs">{JSON.stringify(row,null,2)}</pre></details>}
    </article>)}
  </section>)}</div>;
}
function editorBundle(detail:DictionaryDetail):Bundle {
  return {dictionary_entries:[clean(detail.entry)],...Object.fromEntries(['senses','relations','etymologies','learning_notes','pronunciations','inflections','examples','lexical_annotations'].map(key=>['dictionary_'+key,((detail as unknown as Record<string,object[]>)[key]??[]).map(clean)]))};
}
export function DictionaryEditor({detail,entries,onSaved,onDeleted,deletionEntry,initialGrouping=emptyGrouping(),initialSenseGroups={},reviewDraft=false,saveReview,onPublish,canPublish=false,publicationBusy=false,neighbours}:{neighbours?:{previous:string|null;next:string|null};deletionEntry?:DictionaryEntry;onDeleted?:()=>void;onPublish?:(expectedRevision?:number)=>Promise<void>;canPublish?:boolean;publicationBusy?:boolean;saveReview?:(draft:DictionaryDraftInput)=>Promise<DictionaryReview|void>;reviewDraft?:boolean;initialSenseGroups?:SenseGroupMap;initialGrouping?:DictionaryGrouping;detail:DictionaryDetail;entries:DictionaryEntry[];senses:DictionarySense[];onSaved:(id:string,checkpoint?:DictionaryDetail)=>Promise<void>}) {
  const tr=useDictionaryText();
  const {t}=usePaginationLanguage();
  const [bundle,setBundle]=useState<Bundle>(()=>({dictionary_inflections:(detail.inflections??[]).map(clean),dictionary_entries:[{...clean(detail.entry),...(detail.entry.kind==='word'?{word_segments:legacyWordSegments(detail.entry.id,detail.entry.headword,detail.entry.word_segments)}:{})}],dictionary_senses:detail.senses.map(clean),dictionary_relations:detail.relations.map(row=>compositionRow(clean(row))),dictionary_etymologies:detail.etymologies.map(clean),dictionary_learning_notes:detail.learning_notes.map(clean),dictionary_pronunciations:[...(detail.pronunciations??[])].sort((a,b)=>a.sort_order-b.sort_order||a.id.localeCompare(b.id)).map(clean),dictionary_examples:(detail.examples??[]).map(clean),dictionary_lexical_annotations:(detail.lexical_annotations??[]).map(clean)}));
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
  const contentSense=(table:string,index:number,row:Row,compact=false)=><label className="block min-w-0 text-sm"><span className={compact?"sm:sr-only":undefined}>{tr("適用義項")}</span><select aria-label={tr("適用義項")} className={control} value={String(row.sense_id??'__shared__')} onChange={e=>change(table,index,'sense_id',e.target.value==='__shared__'?null:e.target.value)}><option value="" disabled>{tr("請選擇義項")}</option><option value="__shared__">{table==='dictionary_relations'?tr('不分義項／詞條共用'):tr('詞條共用（不限定義項）')}</option>{bundle.dictionary_senses.map((sense,i)=><option key={String(sense.id)} value={String(sense.id)}>{tr("義項")}{i+1} · {String(sense.part_of_speech??'')} · {String(sense.gloss_zh_tw)}</option>)}</select></label>;
  const newContentSense=()=>bundle.dictionary_senses.length===1?bundle.dictionary_senses[0].id:'';
  const dirty=!locked&&(JSON.stringify(bundle)!==JSON.stringify(baseline)||JSON.stringify(grouping)!==JSON.stringify(groupBaseline)||bundle.dictionary_senses.some(row=>(senseGroups[String(row.id)]??null)!==(senseBaseline[String(row.id)]??null)));
  const change=(table:string,index:number,key:string,value:unknown)=>setBundle(b=>({...b,[table]:b[table].map((r,i)=>i===index?{...r,[key]:value}:r)}));
  const add=(table:string,values:Row)=>setBundle(b=>({...b,[table]:[...b[table],{id:crypto.randomUUID(),entry_id:detail.entry.id,...values}]}));
  const addSense=async()=>{
    const shared=['dictionary_pronunciations','dictionary_etymologies','dictionary_learning_notes','dictionary_examples','dictionary_lexical_annotations'].some(table=>bundle[table]?.some(row=>row.sense_id===null));
    if(bundle.dictionary_senses.length&&shared&&!await confirmDialog(tr('既有內容有未限定義項的資料。新增義項後仍保留為詞條共用；若只屬於原義項，請取消並先指定適用義項。確認繼續？')))return;
    add('dictionary_senses',{part_of_speech:detail.entry.kind==='word'?'noun':null,gloss_zh_tw:''});
  };
  const [saveStatus,setSaveStatus]=useState<DraftSaveStatus>('saved');
  type EditorValue={bundle:Bundle;grouping:DictionaryGrouping;senseGroups:SenseGroupMap};
  const stateRef=useRef({bundle,grouping,senseGroups,baseline,groupBaseline,senseBaseline,dirty});
  useLayoutEffect(()=>{stateRef.current={bundle,grouping,senseGroups,baseline,groupBaseline,senseBaseline,dirty};},[bundle,grouping,senseGroups,baseline,groupBaseline,senseBaseline,dirty]);
  const services=useRef({matching,saveReview,onSaved,t});
  useLayoutEffect(()=>{services.current={matching,saveReview,onSaved,t};},[matching,saveReview,onSaved,t]);
  const statusRef=useRef(saveStatus);
  const queue=useRef<DraftAutosaveQueue<EditorValue>|null>(null);
  queue.current??=new DraftAutosaveQueue<EditorValue>({
    read:()=>({bundle:stateRef.current.bundle,grouping:stateRef.current.grouping,senseGroups:stateRef.current.senseGroups}),
    dirty:()=>stateRef.current.dirty,
    valid:value=>!services.current.matching.length&&!validateDictionaryDraft(draftsFromBundle(prepareEditorBundle(value.bundle),detail.entry.kind==='word'?undefined:value.grouping,value.senseGroups)).length,
    save:async value=>{
      const drafts=draftsFromBundle(prepareEditorBundle(value.bundle),detail.entry.kind==='word'?undefined:value.grouping,value.senseGroups);
      const review=services.current.saveReview?await services.current.saveReview(drafts[0]):null;
      let stored:import('./aiDictionary').AISnapshot|null=null;
      let writeError:unknown;
      if(!services.current.saveReview){
        try{await saveDictionaryDraft(getSupabase()!,drafts,false,true,undefined,true);}catch(error){writeError=error;}
        stored=await readAI(getSupabase()!,detail.entry.id).catch(()=>null);
        if(!stored||stored.detail.entry.status!=='draft')throw writeError??Error('draft.conflict');
        const currentDraft=draftsFromBundle(editorBundle(stored.detail),detail.entry.kind==='word'?undefined:stored.grouping??undefined,stored.sense_groups)[0];
        const actual={...mapDictionaryDraft(currentDraft),component_order:stored.metadata?.component_order??currentDraft.relations.map(r=>r.id)};
        const sent={...mapDictionaryDraft(drafts[0]),component_order:drafts[0].relations.map(r=>r.id)};
        if(draftContentSignature(actual)!==draftContentSignature(sent))throw writeError??Error('draft.conflict');
      }
      const saved=review?reviewSnapshot(review).detail:stored?.detail;
      const ack={...value,bundle:saved?draftRevisions(value.bundle,editorBundle(saved)):value.bundle};
      if(!services.current.saveReview)await services.current.onSaved(detail.entry.id,saved);
      return ack;
    },
    checkpoint:(_sent,ack)=>{
      const latest=stateRef.current,live=draftRevisions(latest.bundle,ack.bundle);
      const stillDirty=JSON.stringify(live)!==JSON.stringify(ack.bundle)||JSON.stringify(latest.grouping)!==JSON.stringify(ack.grouping)||JSON.stringify(latest.senseGroups)!==JSON.stringify(ack.senseGroups);
      stateRef.current={...latest,bundle:live,baseline:ack.bundle,groupBaseline:ack.grouping,senseBaseline:ack.senseGroups,dirty:stillDirty};
      setBundle(live);setBaseline(ack.bundle);setGroupBaseline(ack.grouping);setSenseBaseline(ack.senseGroups);
    },
    status:(status,error)=>{statusRef.current=status;setSaveStatus(status);if(status==='saving'||status==='saved')setMessage('');if(error)setMessage(services.current.t(error instanceof Error?error.message:String(error)));},
  });
  const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const complete=useCallback(()=>{if(timer.current)clearTimeout(timer.current);timer.current=setTimeout(()=>{if(!locked&&!queue.current!.composing)void queue.current!.flush();},180);},[locked]);
  useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);},[]);
  const save=async()=>{if(timer.current)clearTimeout(timer.current);setMessage('');const ok=await queue.current!.flush();if(!ok&&statusRef.current!=='failed')setMessage(t('draft.invalidLeave'));return ok;};
  const saving=saveStatus==='saving';
  const navigation=useUnsavedDraft(dirty,busy||saving||publicationBusy,()=>save());
  const moving=useRef(false);
  const adjacent=async(href:string|null)=>{if(!href||moving.current)return;moving.current=true;try{if(await save())navigation.leave(()=>window.location.assign(href));}finally{moving.current=false;}};
  const deletePending=useRef(false),deleteOperation=useRef<{id:string;snapshot?:{detail:{entry:{revision:number}}}}|null>(null);
  const deleteTarget=deletionEntry??{...detail.entry,revision:Number(baseline.dictionary_entries[0].revision)};
  const removeEntry=async()=>{
    if(deletePending.current||busy||queue.current!.saving||publicationBusy||!onDeleted||deleteTarget.revision===0)return;
    if(timer.current)clearTimeout(timer.current);
    deletePending.current=true;setBusy(true);setMessage('');
    try{
      if(deleteOperation.current?.snapshot&&deleteOperation.current.snapshot.detail.entry.revision!==deleteTarget.revision)deleteOperation.current=null;
      deleteOperation.current??={id:crypto.randomUUID()};
      const removed=await deleteDictionaryEntry(getSupabase()!,deleteTarget,()=>confirmDialog({title:t('dictionary.deleteEntry'),message:t('dictionary.confirmDeleteEntry',{kind:t('ui.'+deleteTarget.kind),name:deleteTarget.headword}),confirmLabel:t('dictionary.confirmDeletion'),danger:true}),deleteOperation.current);
      if(removed){invalidateDictionary();navigation.leave(onDeleted);}
    }catch(e){setMessage(deletionFailureText(e,t));}finally{deletePending.current=false;setBusy(false);}
  };
  const removeSense=async(row:Row)=>{
    if(busy||locked)return;
    try{withoutSense(bundle,String(row.id));if(Number(row.revision)>0&&!await confirmDialog(t('draft.confirmRemove')))return;const next=withoutSense(stateRef.current.bundle,String(row.id));setBundle(next);complete();}catch(error){setMessage(error instanceof Error?error.message:String(error));}
  };
  const removeContent=async(table:'dictionary_etymologies'|'dictionary_learning_notes'|'dictionary_examples'|'dictionary_lexical_annotations'|'dictionary_pronunciations',row:Row,_title:string)=>{
    void _title;
    if(busy||locked)return;
    if(Number(row.revision)>0&&!await confirmDialog(t('draft.confirmRemove')))return;
    setBundle(b=>({...b,[table]:b[table].filter(r=>r.id!==row.id)}));complete();
  };
  const contentSection=(table:'dictionary_learning_notes'|'dictionary_etymologies'|'dictionary_examples',title:string)=>(
    <EditorSection title={title} count={bundle[table].length} actions={<button type="button" className={addButton} onClick={()=>add(table,{sense_id:newContentSense(),body:'',...(table==='dictionary_learning_notes'?{kind:'core_concept'}:table==='dictionary_etymologies'?{data_source:''}:{sort_order:bundle[table].length})})} aria-label={tr('新增')+title}>{tr('＋新增')}{title}</button>}>
      <section className="min-w-0 space-y-2" data-content-section={title}>
        {bundle[table].map((row,i)=><div key={String(row.id)} className="flex min-w-0 items-start gap-2">
          <div className="min-w-0 flex-1 space-y-2">
            {bundle.dictionary_senses.length>1&&contentSense(table,i,row)}
            <Field label={title} multiline value={row.body} onChange={v=>change(table,i,'body',v)}/>
            {table==='dictionary_etymologies'&&<Field label={tr('資料來源')} multiline value={row.data_source} onChange={v=>change(table,i,'data_source',v)}/>}
          </div>
          <button type="button" aria-label={t('ui.delete')+' '+title} className={addButton+' mt-5 shrink-0'} onClick={()=>void removeContent(table,row,title)}><FeatureIcon feature="delete" size={16}/></button>
        </div>)}
      </section>
    </EditorSection>
  );
  return <section className="min-w-0 space-y-3" aria-label={tr("詞條編輯器")}>
    <header className="sticky top-0 z-20 flex flex-wrap items-center gap-2 border-b bg-[var(--color-bg)] py-2">
      {neighbours&&<button type="button" className={button} disabled={!neighbours.previous||busy||publicationBusy} onClick={()=>void adjacent(neighbours?.previous??null)}>{t('draft.previous')}</button>}
      <h2 className="min-w-0 flex-1 truncate font-semibold">{headword||tr('新增詞條')} <span role="status" aria-live="polite" className="ml-2 text-xs font-normal opacity-60">{tr(labels[detail.entry.kind])} · {locked?t('draft.latest'):t('draft.'+(saving?'saving':dirty&&saveStatus==='failed'?'failed':dirty?'pending':'saved'))}</span></h2>
      {neighbours&&<button type="button" className={button} disabled={!neighbours.next||busy||publicationBusy} onClick={()=>void adjacent(neighbours?.next??null)}>{t('draft.next')}</button>}
      {onDeleted&&deleteTarget.revision>0&&<button type="button" className={`${button} shrink-0 border-red-600 text-red-600 hover:bg-red-500/10`} disabled={busy||saving||publicationBusy} onClick={()=>void removeEntry()}>{t('dictionary.deleteEntry')}</button>}
      <button type="button" className={`${button} shrink-0`} disabled={busy||publicationBusy||locked||(!dirty&&!saving)} onClick={()=>void save()}>{t(saving?'draft.saving':'draft.save')}</button>
      {onPublish&&<button type="button" className={button} disabled={busy||saving||publicationBusy||!canPublish} onClick={()=>{if(dirty){setMessage(tr('尚有未儲存變更，請先儲存後再發布。'));return;}void onPublish(Number(baseline.dictionary_entries[0].revision));}}>{publicationBusy?tr('處理中…'):tr('發布')}</button>}
    </header>
    {navigation.pending&&<DictionaryModal title={tr("離開編輯")} onClose={navigation.cancel} busy={busy||publicationBusy}><p>{tr("有尚未儲存的修改。")}</p><div className="flex flex-wrap gap-2"><button className={button} disabled={busy||publicationBusy} onClick={()=>void navigation.saveAndLeave()}>{tr("儲存變更")}</button><button className={button} disabled={busy||publicationBusy} onClick={navigation.discard}>{tr("放棄變更")}</button><button className={button} disabled={busy||publicationBusy} onClick={navigation.cancel}>{tr("繼續編輯")}</button></div></DictionaryModal>}
    {message&&<p role="alert" className="whitespace-pre-wrap break-words text-sm">{message}</p>}
    {matching.length>0&&<div role="alert" className="space-y-2"><p>{tr("同類同拼寫已有詞條，請在既有詞條新增中文義項。")}</p>{matching.map(e=><button key={e.id} className={button} onClick={()=>void (async()=>{if(await confirmDialog(tr('開啟既有詞條？目前尚未儲存的表單將捨棄，請先保留需要的內容。')))await onSaved(e.id);})()}>{tr("開啟")}{e.headword} · {e.status==='published'?tr('已發布（需 Review Draft）'):tr('草稿')}</button>)}</div>}
    {locked&&<p>{tr("目前公開版本為唯讀；請建立 Review Draft 後編輯及核准。")}</p>}
    <fieldset disabled={busy||publicationBusy||locked} className="min-w-0 space-y-2"
      onCompositionStartCapture={()=>{queue.current!.composing=true;}}
      onCompositionEndCapture={()=>{queue.current!.composing=false;complete();}}
      onBlurCapture={complete}
      onChangeCapture={event=>{if(event.target instanceof HTMLSelectElement||event.target instanceof HTMLInputElement&&['checkbox','radio'].includes(event.target.type))complete();}}
      onClickCapture={event=>{if(event.target instanceof Element&&event.target.closest('button'))complete();}}
      onKeyDownCapture={event=>{if(event.key==='Enter'&&event.target instanceof HTMLInputElement&&!event.nativeEvent.isComposing&&event.nativeEvent.keyCode!==229){event.preventDefault();complete();}}}>
      <EditorSection title={tr("基本資訊")}>
        <div className="grid min-w-0 gap-2 portrait:grid-cols-1 landscape:grid-cols-2">{detail.entry.kind==='word'?<WordSegmentsEditor entryId={detail.entry.id} segments={bundle.dictionary_entries[0].word_segments as WordSegment[]} relations={bundle.dictionary_relations} onChange={(segments,relations)=>{setBundle(b=>({...b,dictionary_entries:b.dictionary_entries.map(e=>({...e,word_segments:segments,headword:wordSpelling(segments)})),dictionary_relations:relations}));}}/>:<Field label={tr(labels[detail.entry.kind])} value={bundle.dictionary_entries[0].headword} onChange={v=>change('dictionary_entries',0,'headword',v)}/>}
        {detail.entry.kind!=='word'&&<>
          {detail.entry.kind==='root'&&<label className="block text-sm">{tr("主要分類")}<select aria-label={tr("主要分類")} className={control} value={grouping.primary_category??''} onChange={event=>{const category=event.currentTarget.value||null;setGrouping(g=>({...g,primary_category:category}));}}><option value="">{tr("未分類")}</option>{primaryCategories.map(c=><option key={c} value={c}>{tr(c)}</option>)}</select></label>}
        </>}
        <div className="min-w-0 space-y-2">
          <div className="flex items-center justify-between gap-2"><h3 className="font-semibold">{tr("讀音（IPA）")}</h3><button type="button" className={addButton} onClick={()=>add('dictionary_pronunciations',{sense_id:null,ipa:'',sort_order:Math.max(-1,...(bundle.dictionary_pronunciations??[]).map(r=>Number(r.sort_order)))+1})} aria-label={tr("＋新增讀音")}>{tr("＋新增讀音")}</button></div>
          {(bundle.dictionary_pronunciations??[]).map((row,i,rows)=><div key={String(row.id)} data-pronunciation-row={String(row.id)} className="flex min-w-0 items-end gap-2">
            <div className="min-w-0 flex-1"><Field label="IPA" value={row.ipa} onChange={v=>change('dictionary_pronunciations',i,'ipa',v)}/></div>
            <button type="button" className={addButton} onClick={()=>void removeContent('dictionary_pronunciations',row,tr('讀音'))} aria-label={tr("刪除讀音")}><FeatureIcon feature="delete" size={16}/></button>
            {rows.length>1&&<><button type="button" className={addButton} aria-label={tr("上移讀音")} disabled={i===0} onClick={()=>setBundle(b=>({...b,dictionary_pronunciations:moveRow(b.dictionary_pronunciations,i,-1).map((r,n)=>({...r,sort_order:n}))}))}>↑</button><button type="button" className={addButton} aria-label={tr("下移讀音")} disabled={i===rows.length-1} onClick={()=>setBundle(b=>({...b,dictionary_pronunciations:moveRow(b.dictionary_pronunciations,i,1).map((r,n)=>({...r,sort_order:n}))}))}>↓</button></>}
          </div>)}
        </div>
        </div>
        {detail.entry.kind!=='word'&&<>
          <VariantEditor value={grouping.variant_group} onChange={v=>setGrouping(g=>({...g,variant_group:v}))}/>
        </>}
      </EditorSection>
      {contentSection('dictionary_learning_notes',tr('概念'))}
      <EditorSection title={tr("義項")} count={bundle.dictionary_senses.length} actions={<button type="button" className={addButton} onClick={()=>void addSense()} aria-label={detail.entry.kind==='word'?tr('＋新增義項'):tr('＋新增中文義項')}>{tr("＋新增義項")}</button>}>
      {bundle.dictionary_senses.map((row,i)=><div key={String(row.id)} data-sense-row={String(row.id)} className="flex min-w-0 items-start gap-2">
        {bundle.dictionary_senses.length>1&&<span className="pt-7 text-xs opacity-50">{i+1}</span>}
        <div data-word-sense-row={detail.entry.kind==='word'?String(row.id):undefined} className={"grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_44px] items-end gap-2 "+(detail.entry.kind==='root'?'':"sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_44px]")}>
        {detail.entry.kind==='word'&&<Field label={tr("詞性")} placeholder={tr("未設定")} value={row.part_of_speech} onChange={v=>change('dictionary_senses',i,'part_of_speech',v||null)}/>}
        <div className={detail.entry.kind==='word'?"col-start-1 sm:col-start-auto":""}><Field label={tr("中文意思")} value={row.gloss_zh_tw} onChange={v=>change('dictionary_senses',i,'gloss_zh_tw',v)}/></div>
        {detail.entry.kind==='prefix'&&<label className="col-start-1 min-w-0 text-sm sm:col-start-auto">{tr("分類")}<select className={control} aria-label={t('draft.senseCategory',{number:i+1})} value={senseGroups[String(row.id)]??''} onChange={event=>{const category=event.currentTarget.value||null;setSenseGroups(g=>({...g,[String(row.id)]:category}));}}><option value="">{tr("未分類")}</option>{prefixCategories.map(c=><option key={c} value={c}>{tr(c)}</option>)}</select></label>}
        <button type="button" aria-label={tr('刪除義項')+' '+(i+1)} className="col-start-2 row-start-1 min-h-11 shrink-0 p-2 opacity-70 hover:bg-zinc-500/10 sm:col-start-auto sm:row-start-auto" onClick={()=>void removeSense(row)}><FeatureIcon feature="delete" size={16}/></button></div>
      </div>)}
      </EditorSection>
      {detail.entry.kind==='word'&&<>
      <EditorSection title={tr("詞形變化")} count={bundle.dictionary_inflections.length} actions={<button type="button" className={addButton} aria-label={tr("＋新增詞形變化")} onClick={()=>add('dictionary_inflections',{sense_id:null,form_kind:availableInflections(bundle.dictionary_senses as unknown as DictionarySense[],null)[0]??'',form:'',sort_order:bundle.dictionary_inflections.length})}>{tr("＋新增詞形變化")}</button>}>
      {!bundle.dictionary_inflections.length&&<p className="text-sm opacity-60">{tr("尚無詞形")}</p>}
      {!!bundle.dictionary_inflections.length&&<div aria-hidden className="hidden gap-2 text-xs opacity-60 sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.4fr)_44px]"><span>{tr("變化類型")}</span><span>{tr("詞形")}</span><span>{tr("適用義項")}</span><span/></div>}
      {bundle.dictionary_inflections.map((row,i)=>{const types=availableInflections(bundle.dictionary_senses as unknown as DictionarySense[],String(row.sense_id??'')||null);return <div key={String(row.id)} data-inflection-row className="grid min-w-0 grid-cols-[minmax(0,1fr)_44px] items-end gap-2 border-t border-[var(--color-border)] py-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.4fr)_44px]">
      <label className="min-w-0 text-sm"><span className="sm:sr-only">{tr("變化類型")}</span><select className={control} value={String(row.form_kind)} onChange={e=>change('dictionary_inflections',i,'form_kind',e.target.value)}><option value="">{tr("請選擇")}</option>{!types.includes(row.form_kind as keyof typeof inflectionLabels)&&!!row.form_kind&&<option value={String(row.form_kind)}>{tr("詞性不符：")}{String(row.form_kind)}</option>}{types.map(t=><option key={t} value={t}>{tr(inflectionLabels[t])}</option>)}</select>{!types.length&&<span className="text-sm">{tr("請先在義項設定 verb／noun／adjective／adverb 詞性。")}</span>}</label>
      <div className="col-start-1 sm:col-start-auto"><Field compact label={tr("詞形")} value={row.form} onChange={v=>change('dictionary_inflections',i,'form',v)}/></div>
      <div className="col-start-1 sm:col-start-auto">{contentSense('dictionary_inflections',i,row,true)}</div>
      <button type="button" aria-label={tr("移除詞形")} className="col-start-2 row-start-1 min-h-11 self-start p-2 hover:bg-zinc-500/10 sm:col-start-auto sm:row-start-auto" onClick={()=>setBundle(b=>({...b,dictionary_inflections:b.dictionary_inflections.filter(r=>r.id!==row.id)}))}><FeatureIcon feature="delete" size={16}/></button>
      </div>;})}
      </EditorSection>
      </>}
      {contentSection('dictionary_etymologies',tr('歷史詞源'))}
      {detail.entry.kind==='word'&&<>
      <EditorSection title={tr("構詞關聯")} count={bundle.dictionary_relations.length} actions={<button className={addButton} disabled={!bundle.dictionary_senses.length} onClick={()=>setAddingRelation(true)} aria-label={tr("＋新增構詞關聯")}>{tr("＋新增構詞關聯")}</button>}>
      {!bundle.dictionary_relations.length&&<p className="text-sm">{tr("尚無構詞關聯")}</p>}
      {bundle.dictionary_relations.map((row,i)=><div key={String(row.id)} className="grid min-w-0 gap-2 py-1 sm:grid-cols-[minmax(0,1fr)_auto]">
        <div className="sm:col-span-2 space-y-2"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={row.sense_id!=null} onChange={e=>change('dictionary_relations',i,'sense_id',e.target.checked?'':null)}/>{tr('僅適用特定義項')}</label>{row.sense_id!=null&&<label className="block text-sm">{tr('適用義項')}<select aria-label={tr('適用義項')} className={control} value={String(row.sense_id)} onChange={e=>change('dictionary_relations',i,'sense_id',e.target.value)}><option value="" disabled>{tr('請選擇義項')}</option>{!!row.sense_id&&!bundle.dictionary_senses.some(s=>s.id===row.sense_id)&&<option value={String(row.sense_id)} disabled>{tr('義項已失效，請重新選擇')}</option>}{bundle.dictionary_senses.map((sense,n)=><option key={String(sense.id)} value={String(sense.id)}>{n+1} · {String(sense.gloss_zh_tw)}</option>)}</select></label>}</div>
        <RelationTargetPicker entryId={String(row.target_entry_id)} senseId={String(row.target_sense_id)} excludeEntryId={detail.entry.id} excludedSenseIds={bundle.dictionary_relations.filter(r=>r.id!==row.id&&r.sense_id===row.sense_id).map(r=>String(r.target_sense_id))} onChange={(entry,sense)=>setBundle(b=>({...b,dictionary_relations:b.dictionary_relations.map((r,index)=>index===i?{...r,target_entry_id:entry,target_sense_id:sense}:r)}))}/>
        <div className="flex flex-wrap items-center gap-1">{bundle.dictionary_relations.length>1&&<><button className={addButton} disabled={i===0} onClick={()=>setBundle(b=>({...b,dictionary_relations:moveRow(b.dictionary_relations,i,-1)}))}>{tr("上移")}</button><button className={addButton} disabled={i===bundle.dictionary_relations.length-1} onClick={()=>setBundle(b=>({...b,dictionary_relations:moveRow(b.dictionary_relations,i,1)}))}>{tr("下移")}</button></>}<button className={addButton} onClick={()=>setBundle(b=>({...b,dictionary_relations:b.dictionary_relations.filter(r=>r.id!==row.id),dictionary_entries:b.dictionary_entries.map(e=>({...e,...(e.word_segments?{word_segments:(e.word_segments as WordSegment[]).map(s=>s.relation_id===row.id?{...s,relation_id:null}:s)}:{})}))}))} aria-label={tr("移除構詞關聯")}><FeatureIcon feature="delete" size={16}/></button></div>
      </div>)}
      {addingRelation&&<RelationSelectionDialog excludeEntryId={detail.entry.id} excludedSenseIds={bundle.dictionary_relations.filter(r=>r.sense_id==null).map(r=>String(r.target_sense_id))} onClose={()=>setAddingRelation(false)} onSelect={(entry,sense)=>{add('dictionary_relations',{sense_id:null,target_entry_id:entry,target_sense_id:sense});setAddingRelation(false);}}/>}
      </EditorSection>
      </>}
      {contentSection('dictionary_examples',tr('例詞'))}
    </fieldset>
    <button className={button} disabled={busy} onClick={()=>{if(preview){setPreview(false);return;}if(locked||saveReview){setPreview(true);return;}setBusy(true);setMessage('');void previewDictionaryDraft(getSupabase()!,draftsFromBundle(prepareEditorBundle(bundle),detail.entry.kind==='word'?undefined:grouping,senseGroups),true).then(()=>setPreview(true)).catch(e=>setMessage(e instanceof Error?e.message:String(e))).finally(()=>setBusy(false));}}>{tr("切換完整預覽")}</button>
    {preview&&<DictionaryPreview bundle={bundle} technical={false}/>}
    {reviewDraft&&<p>{tr("這是舊版複製型審核草稿，沒有可靠的 base revision，不能直接核准。請從原 Published 建立新版 Review Draft 並重新比對；舊資料保留。")}</p>}
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
export function PublishedWorkspace({detail,entries,senses,refresh,onCommitted,neighbours}:{neighbours?:{previous:string|null;next:string|null};onCommitted?:()=>void;detail:DictionaryDetail;entries:DictionaryEntry[];senses:DictionarySense[];refresh:(id:string)=>Promise<void>}){
  const tr=useDictionaryText(),{t}=usePaginationLanguage();
  const [reviews,setReviews]=useState<DictionaryReview[]>([]),[chosen,setChosen]=useState<DictionaryReview|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const [view,setView]=useState<'latest'|'draft'>('draft');
  const running=useRef(false),failure=useRef<ReviewFailure|null>(null);const [approval]=useState(()=>new ReviewApproval());
  const run=async(work:()=>Promise<void>)=>{if(running.current)return;running.current=true;setBusy(true);setError('');try{await work();}catch(e){failure.current=reviewFailure(e);setError(reviewFailureText(failure.current,t));}finally{running.current=false;setBusy(false);}};
  const chosenRef=useRef(chosen);useLayoutEffect(()=>{chosenRef.current=chosen;},[chosen]);
  const [editorEpoch,setEditorEpoch]=useState(0);
  const [base,setBase]=useState<import('./aiDictionary').AISnapshot|null>(null),[ready,setReady]=useState(false);
  useEffect(()=>{let active=true;void (async()=>{try{const snapshot=await readAI(getSupabase()!,detail.entry.id);const {data,error}=await getSupabase()!.from('dictionary_review_drafts').select('*').eq('entry_id',detail.entry.id).eq('state','active').order('updated_at',{ascending:false});if(error)throw Error(error.message);if(active){setBase(snapshot);setReviews(data??[]);if(data?.length===1)setChosen(data[0]);setReady(true);}}catch(e){if(active){failure.current=reviewFailure(e,'get_dictionary_ai_snapshot');setError(reviewFailureText(failure.current,t));}}})();return()=>{active=false;};},[detail.entry.id,t]);
  if(!ready||!base)return <section><p role="status">{error||tr('正在讀取編輯內容…')}</p></section>;
  const activeReviews=reviews.filter(r=>r.state==='active');
  const snapshot=chosen?reviewSnapshot(chosen):base;
  const stale=!!chosen&&chosen.base_revision!==detail.entry.revision;
  const saveCurrent=async(draft:DictionaryDraftInput)=>{
    if(approval.blocked)throw reviewFailure({message:t('approval.unknown')},'approve_dictionary_review','unknown');
    if(stale)throw Error(tr('此草稿的 Published 基底已變更。請保留輸入，重新載入版本資訊後比對；不會覆蓋公開內容。'));
    let saved:DictionaryReview;
    const current=chosenRef.current;
    const candidate={...mapDictionaryDraft(draft),component_order:draft.relations.map(r=>r.id)};
    const result=current?await getSupabase()!.rpc('save_dictionary_review',{review_uuid:current.id,expected_revision:current.revision,candidate}):await getSupabase()!.rpc('create_dictionary_edit_review',{entry_uuid:detail.entry.id,expected_snapshot:base,candidate});
    if(result.error){
      const found=await getSupabase()!.from('dictionary_review_drafts').select('*').eq('entry_id',detail.entry.id).eq('state','active');
      const rows=found.data as DictionaryReview[]|null;
      if(found.error||rows?.length!==1||(current&&rows[0].id!==current.id)||rows[0].base_revision!==base.detail.entry.revision||draftContentSignature(rows[0].candidate)!==draftContentSignature(candidate))throw Error(result.error.message);
      saved=rows[0];
    }else saved=result.data;

    chosenRef.current=saved;setChosen(saved);setReviews(rs=>[saved,...rs.filter(r=>r.id!==saved.id)]);return saved;
  };
  const publish=async()=>run(async()=>{const selected=chosenRef.current;if(!selected||stale)return;if(!await confirmDialog({title:tr('核准發布新版本'),message:tr('我已完成內容與構詞依據的查證，確認發布已儲存的審核草稿。發布後將取代目前公開版本，不保留舊內容。'),confirmLabel:tr('發布')}))return;await approval.approve(getSupabase()!,selected);invalidateDictionary();try{await refresh(detail.entry.id);onCommitted?.();}catch(error){throw reviewFailure(error,'refresh_dictionary','refresh');}});
  const checkPublication=()=>navigateDictionary(()=>void run(async()=>{const status=await approval.check(getSupabase()!);if(status==='committed'){try{await refresh(detail.entry.id);onCommitted?.();}catch(error){throw reviewFailure(error,'refresh_dictionary','refresh');}}else setError(t('approval.'+status));}));
  const latestBundle:Bundle={dictionary_entries:[base.detail.entry as unknown as Row],dictionary_senses:base.detail.senses as unknown as Row[],dictionary_relations:base.detail.relations as unknown as Row[],dictionary_etymologies:base.detail.etymologies as unknown as Row[],dictionary_learning_notes:base.detail.learning_notes as unknown as Row[],dictionary_inflections:(base.detail.inflections??[]) as unknown as Row[],dictionary_pronunciations:(base.detail.pronunciations??[]) as unknown as Row[],dictionary_examples:(base.detail.examples??[]) as unknown as Row[],dictionary_lexical_annotations:(base.detail.lexical_annotations??[]) as unknown as Row[]};
  return <section className="min-w-0 space-y-3">
    {!!activeReviews.length&&<div role="tablist" aria-label={tr("詞條版本")} className="flex gap-2">{(['latest','draft'] as const).map(tab=><button type="button" role="tab" tabIndex={view===tab?0:-1} onKeyDown={e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const next=e.key==='Home'?'latest':e.key==='End'?'draft':view==='latest'?'draft':'latest';setView(next);const tabs=e.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]');tabs?.[next==='latest'?0:1]?.focus();}} aria-selected={view===tab} key={tab} onClick={()=>setView(tab)} className="min-h-11 rounded px-4 text-sm" style={{background:view===tab?'var(--color-border)':undefined}}>{tab==='latest'?tr('最新版本'):tr('草稿')}</button>)}</div>}
    {!!activeReviews.length&&view==='latest'&&<section aria-label={tr("最新版本")}><h2 className="text-xl">{detail.entry.headword} · {tr(labels[detail.entry.kind])} {tr("· 已發布")}</h2><DictionaryPreview bundle={latestBundle} technical={false}/></section>}
    <div hidden={!!activeReviews.length&&view==='latest'}>
    {activeReviews.length>1&&<label className="block text-sm">{tr("選擇草稿")}<select aria-label={tr("選擇草稿")} className={control} value={chosen?.id??''} onChange={e=>{const reviewId=e.currentTarget.value;navigateDictionary(()=>{setChosen(activeReviews.find(r=>r.id===reviewId)??null);setEditorEpoch(n=>n+1);});}}><option value="">{tr("請選擇")}</option>{activeReviews.map((r,i)=><option key={r.id} value={r.id}>{tr("草稿")}{i+1} · {r.source}</option>)}</select></label>}
    {activeReviews.length>1&&!chosen?<p role="alert">{tr("有多筆既有草稿，請選擇要續編的草稿；不會新增或覆蓋。")}</p>:<DictionaryEditor key={`${detail.entry.id}:${editorEpoch}`} detail={snapshot.detail} initialGrouping={snapshot.grouping??emptyGrouping()} initialSenseGroups={snapshot.sense_groups} entries={entries} senses={senses} onSaved={async()=>{}} deletionEntry={detail.entry} onDeleted={()=>window.location.assign('/dictionary/admin?deleted=1')} saveReview={saveCurrent} neighbours={neighbours} onPublish={publish} canPublish={!!chosen&&!stale&&!approval.blocked} publicationBusy={busy}/>}
    {stale&&<p role="alert">{tr("最新版本已變更，這份草稿不能發布。請保留輸入並重新開啟詞條確認最新內容。")}</p>}

    </div>
    {error&&<p role="alert" className="whitespace-pre-wrap">{error}</p>}
    {approval.blocked&&<button type="button" className={button} disabled={busy} onClick={checkPublication}>{t("approval.check")}</button>}

  </section>;
}

export function DictionaryWorkspace({entryId,newKind,embedded=false,onCommitted}:{onCommitted?:()=>void;entryId?:string;newKind?:DictionaryEntry['kind'];embedded?:boolean}){
  const senses:DictionarySense[]=[];
  const source=typeof window==='undefined'?null:adminContext(entryId?new URLSearchParams(window.location.search).get('from'):window.location.pathname+window.location.search);
  const [page,setPage]=useState(source?.page??0),[reload,setReload]=useState(0),[work,setWork]=useState<string[]>(Array.isArray(source?.work)?source.work:[]),[reviewTarget,setReviewTarget]=useState<string|null>(()=>typeof window!=='undefined'&&new URLSearchParams(window.location.search).get('review')?new URLSearchParams(window.location.search).get('review')==='all'?'*':new URLSearchParams(window.location.search).get('review'):null);
  const [detail,setDetail]=useState<DictionaryDetail|null>(()=>{
    if(!newKind)return null;
    const id=crypto.randomUUID();
    return {entry:{id,kind:newKind,headword:'',status:'draft',published_at:null,revision:0,updated_at:''},senses:[{id:crypto.randomUUID(),entry_id:id,part_of_speech:newKind==='word'?'noun':null,gloss_zh_tw:'',revision:0,updated_at:''}],relations:[],etymologies:[],learning_notes:[]};
  }),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
  const [kinds,setKinds]=useState<string[]>(source?.kinds??[]),[statuses,setStatuses]=useState<string[]>(source?.statuses??[]),[query,setQuery]=useState(source?.query??'');
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
  async function refresh(id?:string){setReload(n=>n+1);if(id){const {d,g,sg,review}=await loadDetail(id);setReviewDraft(review);setSenseGroups(sg);setGrouping(g);setDetail(d);if(!embedded)window.history.replaceState(window.history.state,"",`/dictionary/admin?entry=${encodeURIComponent(id)}${source?'&from='+encodeURIComponent(adminListHref(source)):''}`);}}
  const listing=usePagedList(JSON.stringify([kinds,statuses,query,work,reload,entryId,newKind]),page,adminPageSize,async p=>{
    if(entryId||newKind)return {items:[],total:0,page:0,stats:null,workAvailable:false,summaries:{} as Record<string,string>};
    const result=await listAdminWork(getSupabase()!,{kinds,statuses,query,work,page:p});
    return {...result,summaries:await adminSummaries(getSupabase()!,result.items),page:p};
  },p=>{setPage(p);});
  const revalidate=useRef(listing.retry);
  useEffect(()=>{revalidate.current=listing.retry;});
  useEffect(()=>{if(entryId||newKind)return;return observeDictionaryInvalidation(()=>revalidate.current());},[entryId,newKind]);
  const entries=listing.data?.items??[],loading=listing.loading;
  async function action(work:()=>Promise<void>){setBusy(true);setMessage('');try{await work();}catch(e){setMessage(e instanceof Error?e.message:String(e));}finally{setBusy(false);}}
  useEffect(()=>{if(!entryId)return;let active=true;void loadDetail(entryId).then(({d,g,sg,review})=>{if(active){setReviewDraft(review);setSenseGroups(sg);setGrouping(g);setDetail(d);if(!d)setMessage('找不到此詞條。');}}).catch(e=>{if(active)setMessage(String(e));});return()=>{active=false;};},[entryId]);
  const [neighbours,setNeighbours]=useState<{previous:string|null;next:string|null}>({previous:null,next:null});
  const neighbourEntry=useRef(detail);useLayoutEffect(()=>{neighbourEntry.current=detail;},[detail]);
  const neighbourId=detail&&detail.entry.revision>0?detail.entry.id:undefined;
  useEffect(()=>{if(embedded||!neighbourId||!neighbourEntry.current)return;let active=true;void adminNeighbours(getSupabase()!,neighbourEntry.current.entry,new URLSearchParams(window.location.search).get('from')).then(value=>{if(active)setNeighbours(value);}).catch(error=>{if(active)setMessage(t(error instanceof Error?error.message:String(error)));});return()=>{active=false;};},[neighbourId,t,embedded]);
  useEffect(()=>{if(entryId||newKind||embedded)return;const href=new URL(adminListHref({kinds,statuses,query,work,page}),window.location.origin),current=new URLSearchParams(window.location.search);for(const key of ['review','deleted'])if(current.has(key))href.searchParams.set(key,current.get(key)!);window.history.replaceState(window.history.state,'',href.pathname+href.search);},[entryId,newKind,embedded,kinds,statuses,query,work,page]);
  const visible=entries;

  const publishDraft=(expectedRevision=detail?.entry.revision)=>action(async()=>{
    if(!detail||detail.entry.status!=='draft'||detail.entry.revision<1||reviewDraft)return;
    if(!await confirmDialog({title:'發布詞條',message:`我已完成「${detail.entry.headword}」的內容與構詞依據查證，確認發布已儲存的草稿。`,confirmLabel:'發布'}))return;
    const current=await getDictionaryEntry(getSupabase()!,detail.entry.id);
    if(!current||current.entry.status!=='draft'||current.entry.revision!==expectedRevision)throw Error('草稿版本已變更，請保留輸入並重新開啟詞條確認；本次未發布。');
    await publishDictionaryEntry(getSupabase()!,detail.entry.id);
    invalidateDictionary();
    await refresh(detail.entry.id);
    onCommitted?.();
  });
  if(detail?.entry.status==='published')return <><PersistentReviewPanel entryId={detail.entry.id} compact/><PublishedWorkspace key={`${detail.entry.id}:${detail.entry.revision}`} detail={detail} entries={entries} senses={senses} refresh={refresh} onCommitted={onCommitted} neighbours={embedded?undefined:neighbours}/></>;
  if(detail)return <>{message&&<p role="alert" className="whitespace-pre-wrap">{message}</p>}<PersistentReviewPanel entryId={detail.entry.id} compact/><DictionaryEditor key={detail.entry.id} detail={detail} initialGrouping={grouping} initialSenseGroups={senseGroups} reviewDraft={reviewDraft} neighbours={embedded?undefined:neighbours} entries={entries} senses={senses} onPublish={reviewDraft?undefined:publishDraft} canPublish={detail.entry.revision>0&&!reviewDraft} publicationBusy={busy} onSaved={async(id,checkpoint)=>{if(!checkpoint){await refresh(id);return;}setDetail(checkpoint);setReload(n=>n+1);if(!embedded)window.history.replaceState(window.history.state,'',source?adminEntryHref(id,source):'/dictionary/admin?entry='+encodeURIComponent(id));}} onDeleted={()=>window.location.assign('/dictionary/admin?deleted=1')}/></>;
  if(entryId)return <div><p role="status">{message||'正在讀取詞條…'}</p></div>;
  return <div className="space-y-5">
    {typeof window!=='undefined'&&new URLSearchParams(window.location.search).get('deleted')==='1'&&<p role="status">{t('dictionary.entryDeleted')}</p>}
    {reviewTarget&&<DictionaryModal title={t('persistent.queue')} onClose={()=>setReviewTarget(null)}><PersistentReviewPanel entryId={reviewTarget==='*'?undefined:reviewTarget} onChanged={()=>setReload(n=>n+1)}/></DictionaryModal>}
    <div className="flex flex-wrap items-center justify-between gap-3"><DictionaryListActions busy={busy||loading} onNew={()=>setModal('new')} onImport={()=>setModal('import')} onExport={()=>setModal('export')}/><div className="flex flex-wrap items-center gap-2">{listing.data?.workAvailable&&<Link className={button} href="/dictionary/admin/reviews">{t('persistent.openQueue')}</Link>}
     <DictionaryBulkPublish disabled={busy||loading}/></div></div>
     {loading&&<p role="status">{t('common.loading')}</p>}
    {listing.error&&<p role="alert">{listing.error}<button className="ml-2 underline" onClick={listing.retry}>重試</button></p>}


    {modal==='export'&&<DictionaryModal title={t("exchange.export")} onClose={closeModal} busy={busy}><DictionaryExchangeExport scope={{kinds,statuses,query}} onBusy={setBusy}/></DictionaryModal>}
    {modal==='new'&&<DictionaryModal title="新增詞條" onClose={closeModal}><label className="block text-sm">詞條類別<select className={control} value={createKind} onChange={e=>setCreateKind(e.target.value as DictionaryEntry['kind'])}>{Object.entries(labels).map(([k,l])=><option key={k} value={k}>{l}</option>)}</select></label><Link className={`${button} inline-block`} href={`/dictionary/admin?new=${createKind}`}>開始新增</Link></DictionaryModal>}
    <input aria-label={t("ui.searchDictionary")} placeholder={t("ui.searchDictionary")} className={control} value={query} onChange={e=>{setQuery(e.target.value);setPage(0);}}/>
    <div data-dictionary-filters className="flex min-w-0 flex-wrap items-start gap-x-6 gap-y-3">
    <DictionaryListFilters kinds={kinds} statuses={statuses} onKinds={values=>{setKinds(values);setPage(0);}} onStatuses={values=>{setStatuses(values);setPage(0);}} hideStatuses/>
    {listing.data?.workAvailable&&<fieldset className="flex flex-wrap gap-3 text-sm"><legend className="mb-2">{t('persistent.workFilter')}</legend>{(['red','yellow','green'] as const).map(color=><label key={color} className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={work.includes(color)} onChange={e=>{setWork(e.target.checked?[...work,color]:work.filter(v=>v!==color));setPage(0);}}/>{t('persistent.'+color)}</label>)}</fieldset>}
    </div>
    <Pagination label={t("ui.dictionaryPagination")} page={listing.data?.page??0} total={listing.data?.total} pageSize={adminPageSize} loading={loading} disabled={busy||!listing.data} onPageChange={p=>{setPage(p);}}/>
    {listing.data?.workAvailable&&<p role="status" className="text-sm">{t('ui.redCount',{n:listing.data.stats!.red})}</p>}
    <div className="@container"><ul data-dictionary-list className="grid min-w-0 grid-cols-1 gap-3 @min-[560px]:grid-cols-2 @min-[900px]:grid-cols-3">{visible.map(e=><li key={e.id} className="flex min-w-0 items-center gap-2 rounded border border-[var(--color-border)]"><Link className="block min-w-0 flex-1 break-words p-3 text-left [overflow-wrap:anywhere] hover:bg-[var(--color-panel-bg)]" href={adminWorkHref(e,{kinds,statuses,query,work,page:listing.data?.page??page})}>{e.headword} · {t("ui."+e.kind)} · <span role="img" aria-label={e.work_status?t('persistent.'+e.work_status):e.status==='draft'?'草稿':'已發布'} title={e.work_status?t('persistent.'+e.work_status):e.status==='draft'?'草稿':'已發布'}>{e.work_status==='red'?'🔴':e.work_status==='yellow'||!e.work_status&&e.status==='draft'?'🟡':'🟢'}</span><p className="mt-1 line-clamp-2 text-sm opacity-65">{listing.data?.summaries[e.id]}</p></Link></li>)}</ul></div>
    <Pagination label={t("ui.dictionaryPagination")} page={listing.data?.page??0} total={listing.data?.total} pageSize={adminPageSize} loading={loading} disabled={busy||!listing.data} onPageChange={p=>{setPage(p);}}/>
    <>{modal==='import'&&<DictionaryModal title={t("exchange.import")} onClose={closeModal} busy={busy}><section className="space-y-3">

      <details><summary>{t("transfer.formatHelp")}</summary><div className="space-y-2 text-sm">
<p>共通必填：kind、headword、gloss_zh_tw。Word 另需 part_of_speech，category 必須留空。Prefix / Root 另需 category，part_of_speech 必須留空。Root 可使用 etymology。</p>
<p>可選：entry_id、sense_id、example_words、relation_hint（舊檔相容）、core_concept（舊 mnemonic_story 相容）。每列一義項；同 kind 與正規化拼寫共用 Entry，不同詞性／語義／詞源使用不同義項。既有內容更新須保留穩定 ID；空 ID 僅在預覽時產生一次 proposed UUID；本次寫入使用相同 ID。寫入後請下載含永久 ID 的 CSV，後續修改保留 ID。</p>
<p>例詞與字形原文完整保留；relation_hint 僅為待解析提示，不自動建立構詞關聯。不接受 citation、license、source_id 或 level。</p>
<details><summary>Prefix 分類（4 類）</summary><ul>{prefixCategories.map(c=><li key={c}>{c}</li>)}</ul></details>
<details><summary>Root 分類（9 類）</summary><ul>{primaryCategories.map(c=><li key={c}>{c}</li>)}</ul></details>
<pre className="whitespace-pre-wrap break-words text-xs">{dictionaryCSVHeaders.join(',')}</pre>
<a className={button} download="dictionary_master_v1.csv" href={'data:text/csv;charset=utf-8,'+encodeURIComponent('\uFEFF'+dictionaryCSVExample)}>下載範例 CSV</a>
<p>Legacy Word CSV：仍接受舊五欄 entry_id,sense_id,headword,part_of_speech,gloss_zh_tw，視為 kind=word。JSON Bundle 與 Markdown 內容匯入保持相容。</p>
</div></details>
      <fieldset disabled={busy} className="space-y-3">

      <label>{t("exchange.inputFormat")}<select aria-label={t("exchange.inputFormat")} className={control} value={format} onChange={e=>setFormat(e.target.value as 'csv'|'md'|'json'|'ai')}><option value="csv">Dictionary CSV v1（含 Legacy Word CSV 相容）</option><option value="md">Markdown 詞源／記憶內容</option><option value="json">Nexus JSON Exchange v1 / Legacy JSON Bundle</option><option value="ai">AI Dictionary JSON（既有 Diff 流程）</option></select></label>
      <input aria-label={t("exchange.file")} type="file" accept=".csv,.md,.json" disabled={busy} onChange={e=>{const file=e.target.files?.[0];if(file)void action(async()=>{if(file.size>64*1024*1024)throw Error("File exceeds 64 MiB");const text=await file.text();setSourceName(file.name);let nextFormat:typeof format=file.name.toLowerCase().endsWith(".csv")?"csv":file.name.toLowerCase().endsWith(".md")?"md":"json";if(nextFormat==="json"){try{if(JSON.parse(text.replace(/^\uFEFF/,'')).format==="nexus-dictionary-ai")nextFormat="ai";}catch{}}setFormat(nextFormat);setFileText(text);});}}/>
      <label className="block space-y-1 text-sm">{t("exchange.pasteFile")}<textarea aria-label={t("exchange.pasteFile")} className={control+" max-h-64 resize-y font-mono text-xs"} rows={8} value={fileText} onChange={e=>setFileText(e.target.value)}/></label>
      </fieldset>
      {format==='ai'?<AIImport key={fileText} raw={fileText} onBusy={setBusy} onSaved={()=>refresh()}/>:<DictionaryImportReview sourceName={sourceName} raw={fileText} format={format} onBusy={setBusy} onSaved={()=>refresh()}/>}
    </section>{message&&<p role="alert" className="whitespace-pre-wrap">{message}</p>}</DictionaryModal>}</>
    {modal!=='import'&&message&&<p role="alert" className="whitespace-pre-wrap">{message}</p>}
  </div>;
}
export default function DictionaryAdmin({entryId,newKind}:{entryId?:string;newKind?:DictionaryEntry['kind']}={}){
  const {access,error}=useDictionaryAdminAccess();
  return <main className="h-full min-w-0 flex-1 overflow-y-auto" style={{color:'var(--color-text)',background:'var(--color-bg)'}}><div className="mx-auto max-w-5xl space-y-5 p-4 sm:p-6 [&_*]:border-[var(--color-border)]"><PageHeader title="字典管理" backHref={entryId||newKind?(typeof window!=='undefined'&&adminContext(new URLSearchParams(window.location.search).get('from'))?adminListHref(adminContext(new URLSearchParams(window.location.search).get('from'))!):'/dictionary/admin'):'/dictionary'}/>{!getSupabase()?<p>尚未設定 Supabase。</p>:error?<p role="alert">{error}</p>:access?.allowed?<DictionaryWorkspace key={`${access.owner}:${entryId??newKind??"list"}`} entryId={entryId} newKind={newKind}/>:access?<p>此帳號沒有字典管理權限。</p>:<p>確認管理權限中…</p>}</div></main>;
}
