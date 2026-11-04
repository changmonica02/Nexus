"use client";
import {prepareStudySpeech} from "../prepareStudySpeech";
import {officialPrivateCardsAvailable,downloadOfficialPack,deleteOfficialPack,packDeleteMessage} from '../officialPacks';
import {PageHeader} from "../../../components/WorkspaceNavigation";
import {Pagination} from "../../../components/pagination/Pagination";
import {validDataPage} from "../../../components/pagination/model";
import {confirmDialog} from '../../../lib/confirmDialog';
import {dueAt} from '../scheduledStudy';

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { StudyRepository } from "../StudyRepository";
import { type StudyCard, type StudySnapshot } from "../studyFSRS";
import { displayStudyCards, hasLearningData } from "../studySessions";
import ScheduleConflict from "./ScheduleConflict";
import ScheduledStudySession from "./ScheduledStudySession";
import {getSupabase} from '../../../infrastructure/supabase/client';
import {syncStudy} from '../studySync';
import {setCardDictionaryLink} from '../../dictionary/cardDictionary';
import StudyLinkSuggestions from '../../dictionary/StudyLinkSuggestions';
import StudyCardEditor from "./StudyCardEditor";
import StudyPreferences from "./StudyPreferences";
import type { Page } from "../../../lib/types";
import { useLanguage } from "../../../lib/LanguageContext";

/** Parse CSV or TSV text into front/back pairs */
function parseCsvTsv(text: string): { front: string; back: string }[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const results: { front: string; back: string }[] = [];
  for (const line of lines) {
    // Detect delimiter: tab or comma
    const delimiter = line.includes("\t") ? "\t" : ",";
    const parts = parseCsvLine(line, delimiter);
    if (parts.length >= 2) {
      results.push({ front: parts[0].trim(), back: parts[1].trim() });
    }
  }
  return results;
}

/** Parse a single CSV line, handling quoted fields */
function parseCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { current += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === delimiter) { result.push(current); current = ""; }
      else { current += ch; }
    }
  }
  result.push(current);
  return result;
}

/* ============ Card Management ============ */

export function CardManageList({ studyItems, onAddCard, onEditCard, onDeleteCard, onImportCsv, readOnly=false, official=false, allowOfficialDelete=false }: {
  readOnly?:boolean; official?:boolean; allowOfficialDelete?:boolean;
  studyItems: StudyCard[]; onAddCard: () => void; onEditCard: (card: StudyCard) => void;
  onDeleteCard: (id: string) => void; onImportCsv: () => void;
}) {
  const { t } = useLanguage();
  const [query,setQuery]=useState(''),[order,setOrder]=useState('az'),[filter,setFilter]=useState('all'),[page,setPage]=useState(0);
  const filtered=useMemo(()=>{
    const text=query.trim().toLocaleLowerCase();
    const matches=studyItems.filter(card=>(!text||card.front.toLocaleLowerCase().includes(text)||card.back.toLocaleLowerCase().includes(text))&&(filter==='all'||(filter==='linked'?!!card.dictionary_entry_id:!card.dictionary_entry_id)));
    const sorted=displayStudyCards(matches,order==='custom'?'custom':'az');return order==='za'?sorted.reverse():sorted;
  },[studyItems,query,order,filter]);
  const currentPage=validDataPage(page,filtered.length,50),visible=filtered.slice(currentPage*50,(currentPage+1)*50);
  return <div className="min-w-0 space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="text-sm opacity-60">{t("studySet.cardCount", { count: studyItems.length })}</div>
      {!readOnly&&!official&&<div className="flex gap-1.5">
        <button onClick={onImportCsv} className="rounded-md border px-3 py-1.5 text-sm">{t("studySet.importCsv")}</button>
        <button onClick={onAddCard} className="rounded-md border px-3 py-1.5 text-sm">{t("studySet.addCard")}</button>
      </div>}
    </div>
    <div className="flex flex-wrap gap-2">
      <input type="search" aria-label={t('deck.searchCards')} placeholder={t('deck.searchCards')} className="min-h-11 min-w-0 flex-1 rounded border bg-transparent px-3" value={query} onChange={event=>{setQuery(event.target.value);setPage(0);}}/>
      <select aria-label={t('deck.sortCards')} value={order} className="min-h-11 max-w-full rounded border bg-[var(--color-editor-bg)] px-2" onChange={event=>{setOrder(event.target.value);setPage(0);}}><option value="az">A–Z</option><option value="za">Z–A</option><option value="custom">{t('deck.originalOrder')}</option></select>
      <select aria-label={t('deck.filterCards')} value={filter} className="min-h-11 max-w-full rounded border bg-[var(--color-editor-bg)] px-2" onChange={event=>{setFilter(event.target.value);setPage(0);}}>{['all','linked','unlinked'].map(value=><option key={value} value={value}>{t('deck.filter.'+value)}</option>)}</select>
    </div>
    {filtered.length === 0 ? <div className="rounded-xl border border-dashed py-12 text-center text-sm opacity-50">{t("studySet.emptyCards")}</div> :
      <div className="overflow-hidden rounded-lg border" style={{ borderColor: "var(--color-border)" }}>
        <table aria-label="單字列表" className="w-full table-fixed text-left text-sm">
          <colgroup><col style={{ width: "40%" }} /><col style={{ width: "60%" }} /></colgroup>
          <thead style={{ background: "var(--color-sidebar-bg)" }}><tr><th scope="col" className="px-3 py-2 font-medium">英文</th><th scope="col" className="px-3 py-2 font-medium">中文</th></tr></thead>
          <tbody>{visible.map(item => <tr key={item.id} data-study-card={item.id} tabIndex={0}
            aria-label={`${readOnly?"單字":"編輯單字"} ${item.front}`} onClick={() => {if(!readOnly)onEditCard(item);}}
            onKeyDown={event => {
              if (!readOnly && event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) {
                event.preventDefault(); onEditCard(item);
              }
            }}
            className="cursor-pointer border-t hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-blue-500" style={{ borderColor: "var(--color-border)" }}>
            <td className="px-3 py-2"><span className="block truncate" title={item.front}>{item.front}</span></td>
            <td className="px-3 py-2"><div className="flex min-w-0 items-center gap-1">
              <span className="min-w-0 flex-1 truncate" title={item.back}>{item.back}</span>
              {!readOnly&&(!official||allowOfficialDelete)&&<button type="button" aria-label={`${t("studySet.deleteCard")} ${item.front}`} title={t("studySet.deleteCard")}
                onClick={event => { event.stopPropagation(); onDeleteCard(item.id); }}
                className="min-h-11 w-11 shrink-0 rounded opacity-50 hover:bg-red-100 hover:text-red-700 hover:opacity-100">×</button>}
            </div></td>
          </tr>)}</tbody>
        </table>
      </div>}
    <Pagination label={t("deck.cardPages")} page={currentPage} total={filtered.length} pageSize={50} onPageChange={setPage}/>
  </div>;
}

/* ============ Flashcard Practice ============ */



/* ============ CSV Import Dialog ============ */

function CsvImportDialog({ onImport, onClose }: {
  onImport: (items: { front: string; back: string }[]) => void; onClose: () => void;
}) {
  const { t } = useLanguage();
  const [csvText, setCsvText] = useState("");
  const [preview, setPreview] = useState<{ front: string; back: string }[]>([]);
  const fileInputRef = useMemo(() => ({ current: null as HTMLInputElement | null }), []);

  const handleParse = (text: string) => {
    setCsvText(text);
    const parsed = parseCsvTsv(text);
    setPreview(parsed);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { if (typeof reader.result === "string") handleParse(reader.result); };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.25)" }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl" style={{ backgroundColor: "var(--color-bg)", border: "1px solid var(--color-border)" }}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--color-border)" }}>
          <span className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>? {t("studySet.importCsv")}</span>
          <button onClick={onClose} className="text-sm opacity-40 hover:opacity-100 px-1.5 py-0.5 rounded" style={{ border: "1px solid var(--color-border)" }}></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs opacity-60 mb-1.5" style={{ color: "var(--color-text)" }}>
              {t("studySet.importCsvHint")}
            </label>
            <textarea value={csvText} onChange={(e) => handleParse(e.target.value)}
              placeholder={"apple,??\nbanana,香?\ngrape,??"}
              rows={6} className="w-full text-sm px-3 py-2 rounded-lg outline-none resize-none focus:ring-2 focus:ring-blue-500"
              style={{ border: "1px solid var(--color-border)", color: "var(--color-text)", backgroundColor: "var(--color-sidebar-bg)" }} />
          </div>
          <div className="flex items-center gap-2">
            <input ref={fileInputRef as React.RefObject<HTMLInputElement>} type="file" accept=".csv,.tsv,.txt" onChange={handleFileUpload} className="hidden" />
            <button onClick={() => fileInputRef.current?.click()}
              className="rounded-md px-3 py-2 text-xs font-medium transition-all hover:bg-zinc-200"
              style={{ border: "1px solid var(--color-border)", color: "var(--color-text)" }}>
              ?? Upload file
            </button>
            {preview.length > 0 && (
              <span className="text-xs opacity-60" style={{ color: "var(--color-text)" }}>
                {preview.length} cards detected
              </span>
            )}
          </div>
          {preview.length > 0 && (
            <div className="max-h-32 overflow-y-auto rounded-lg p-2 space-y-1" style={{ border: "1px solid var(--color-border)", backgroundColor: "var(--color-sidebar-bg)" }}>
              {preview.slice(0, 10).map((item, i) => (
                <div key={i} className="flex gap-2 text-xs" style={{ color: "var(--color-text)" }}>
                  <span className="opacity-40 w-6 shrink-0">{i + 1}.</span>
                  <span className="truncate flex-1">{item.front}</span>
                  <span className="opacity-30"></span>
                  <span className="truncate flex-1">{item.back}</span>
                </div>
              ))}
              {preview.length > 10 && <div className="text-xs opacity-40 text-center">...and {preview.length - 10} more</div>}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t" style={{ borderColor: "var(--color-border)" }}>
          <button onClick={onClose} className="rounded-md px-4 py-2 text-sm transition-all hover:bg-zinc-200"
            style={{ color: "var(--color-text)" }}>Cancel</button>
          <button onClick={() => { if (preview.length > 0) { onImport(preview); onClose(); } }}
            disabled={preview.length === 0}
            className="rounded-md px-4 py-2 text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-40"
            style={{ backgroundColor: "var(--color-text)", color: "var(--color-bg)" }}>
            Import {preview.length > 0 ? `(${preview.length})` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============ Main StudySetView ============ */

function StudySetWorkspace({ page, repository, onTitleChange, onBackToInterface, initialMode = "manage", backLabel, onOfficialChanged, managementOnly=false, registerSettingsSave }: {
  initialMode?: "manage" | "scheduled"; backLabel?:string; onOfficialChanged?:()=>Promise<void>; managementOnly?:boolean; registerSettingsSave?:(flush:()=>Promise<void>)=>(()=>void); page:Page; repository:StudyRepository; onTitleChange:(title:string)=>void; onBackToInterface?:()=>void;
}) {
  const {t}=useLanguage();
  const settingsFlush=useRef<()=>Promise<void>>(async()=>{});
  const registerSettingsFlush=useCallback((flush:()=>Promise<void>)=>{settingsFlush.current=flush;},[]);
  useEffect(()=>registerSettingsSave?.(()=>settingsFlush.current()),[registerSettingsSave]);
  const [showCards,setShowCards]=useState(false);
  const [officialBusy,setOfficialBusy]=useState(false);
  const [sessionProgress,setSessionProgress]=useState({done:0,total:0});
  const reportProgress=useCallback((done:number,total:number)=>setSessionProgress({done,total}),[]);
  const leave=async()=>{try{if(document.activeElement instanceof HTMLElement)document.activeElement.blur();await settingsFlush.current();if(managementOnly&&showCards&&mode==="manage"){setShowCards(false);return;}await onBackToInterface?.();}catch(e){setError(String(e));}};
  const officialAction=async(remove=false)=>{
    if(officialBusy)return;
    if(remove&&!await confirmDialog(packDeleteMessage(page.title)))return;
    setOfficialBusy(true);setError('');
    try{const client=getSupabase();if(!client)throw Error('請先登入並連線。');if(remove)await deleteOfficialPack(client,page.id);else await downloadOfficialPack(client,page.official_pack_id!);await onOfficialChanged?.();if(remove)await leave();}
    catch(e){setError(String(e));}finally{setOfficialBusy(false);}
  };
  const [historyEvents,setHistoryEvents]=useState<import("../studyFSRS").StudyEvent[]>([]);
  const [snapshot,setSnapshot]=useState<StudySnapshot|null>(null);
  const [privateOfficialStatus,setPrivateOfficialStatus]=useState<{pack:string;available:boolean}|null>(null);
  const privateOfficialEditing=privateOfficialStatus?.pack===page.official_pack_id&&privateOfficialStatus?.available===true;
  useEffect(()=>{let active=true;const client=getSupabase(),pack=page.official_pack_id;if(pack&&client)void officialPrivateCardsAvailable(client).then(available=>{if(active)setPrivateOfficialStatus({pack,available});});return()=>{active=false;};},[page.official_pack_id]);
  const [requestedMode,setMode]=useState<"manage"|"scheduled"|"history">(initialMode);
  const mode = requestedMode === "scheduled" && snapshot && !snapshot.settings.direction_confirmed ? "manage" : requestedMode;
  const [showCsvImport,setShowCsvImport]=useState(false);
  const [showLinkSuggestions,setShowLinkSuggestions]=useState(false);
  const [error,setError]=useState("");
  const [historyLimit,setHistoryLimit]=useState(50);
  const [editingCard,setEditingCard]=useState<(Pick<StudyCard,"front"|"back"> & {id?:string})|null>(null);
  const refresh=useRef(()=>{});
  const openedCard=useRef(false);
  useEffect(()=>{if(openedCard.current||!snapshot)return;const id=new URLSearchParams(window.location.search).get('card');const card=snapshot.cards.find(c=>c.id===id&&!c.deleted_at);if(card){openedCard.current=true;setEditingCard(card);}},[snapshot]);
  useEffect(()=>{
    let active=true;
    const read=()=>{void repository.ensureDeck(page, false).then(()=>repository.readScheduledDeck(page.id)).then(data=>{if(active){setSnapshot(data);}}).catch(e=>{if(active)setError(String(e));});};
    refresh.current=read;read();window.addEventListener("nexus-study-changed",read);
    return()=>{active=false;window.removeEventListener("nexus-study-changed",read);};
  },[repository,page]);
  useEffect(()=>{let active=true;if(mode==='history')void repository.readHistory(page.id,historyLimit+1).then(events=>{if(active)setHistoryEvents(events);}).catch(e=>{if(active)setError(String(e));});return()=>{active=false;};},[mode,historyLimit,page.id,repository,snapshot]);
  const act=async(action:()=>Promise<unknown>)=>{setError("");try{await action();refresh.current();}catch(e){setError(e instanceof Error?e.message:String(e));}};
  const showingCards=mode==="manage"&&(!managementOnly||showCards);
  const cards=snapshot?.cards.filter(card=>!card.deleted_at)??[];
  const createRequest=useRef(crypto.randomUUID());
  const savedCard=useRef<{id:string;signature:string}|null>(null);
  useEffect(()=>{savedCard.current=null;createRequest.current=crypto.randomUUID();},[editingCard]);
  const saveCard=async(values:{front:string;back:string;dictionaryEntryId?:string|null},reset:boolean)=>{
    if(!editingCard)return;
    const signature=JSON.stringify([values,reset]);
    let id=savedCard.current?.id??editingCard.id;
    if(savedCard.current?.signature!==signature){
      const content={front:values.front,back:values.back,...(values.dictionaryEntryId!==undefined?{dictionary_entry_id:values.dictionaryEntryId??undefined}:{})};
      if(id)await repository.updateCard(id,content,reset);
      else id=(await repository.addCards(page.id,[content],createRequest.current))[0].id;
      savedCard.current={id,signature};
    }
    if(values.dictionaryEntryId!==undefined){const client=getSupabase();if(!client)throw Error('字卡已保存在本機，連結需要登入與網路；請重試。');const {data:{user}}=await client.auth.getUser();if(!user)throw Error('請先登入');await syncStudy(repository,client,user.id);await setCardDictionaryLink(client,id!,values.dictionaryEntryId);}
    refresh.current();
  };
  if(!snapshot)return <main className="flex-1 p-4"><PageHeader title={t("deck.manageTitle")+"。"+page.title} onBack={()=>void leave()}/>{error||t("study.loadingCards")}</main>;
  return <main data-study-management={managementOnly?page.id:undefined} className="flex min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto" style={{backgroundColor:"var(--color-editor-bg)",color:"var(--color-text)"}}>
    <div className="mx-auto w-full" style={{maxWidth:1100,padding:"24px clamp(12px, 3vw, 40px)"}}>
      <PageHeader autoFocusBack={managementOnly} globalActions={mode!=='scheduled'} title={mode==='scheduled'?page.title:t(managementOnly&&!showCards?'deck.manageTitle':mode==='history'?'study.history':'deck.viewCards')+'。'+page.title} onBack={(onBackToInterface||(managementOnly&&showCards))?()=>void leave():undefined} backLabel={managementOnly&&showCards?t('deck.backSettings'):backLabel??t('study.backToStudySets')} actions={mode==='scheduled'?<><span aria-label={t('study.batchProgress')} aria-live="polite">{sessionProgress.done}／{sessionProgress.total}</span><button className="min-h-11 rounded border px-2 text-sm" onClick={()=>setMode('manage')}>{t('study.previewAll')}</button></>:undefined}/>
      {mode!=='scheduled'&&<div data-study-actions className="my-3 flex flex-wrap items-center gap-2">{mode==='manage'?<>
        {managementOnly&&!showCards&&<button className="min-h-11 rounded border px-3 text-sm" onClick={()=>void settingsFlush.current().then(()=>setShowCards(true)).catch(e=>setError(String(e)))}>{t('deck.viewCards')} · {t('studySet.cardCount',{count:cards.length})}</button>}
        <button className="min-h-11 rounded border px-3 text-sm disabled:opacity-40" disabled={!snapshot.settings.direction_confirmed} onClick={()=>{prepareStudySpeech();void settingsFlush.current().then(async()=>{setSnapshot(await repository.readScheduledDeck(page.id));setMode('scheduled');}).catch(e=>setError(String(e)));}}>{t('study.start')}</button>
        <button className="min-h-11 rounded border px-3 text-sm" onClick={()=>setMode('history')}>{t('study.history')}</button>
      </>:<button className="min-h-11 rounded border px-3 text-sm" onClick={()=>setMode('manage')}>{t('study.previewAll')}</button>}</div>}
      {error&&<div role="alert" className="mb-3 rounded border border-red-400 p-3 text-sm text-red-600">{error}</div>}
      {mode==="manage"&&!snapshot.settings.direction_confirmed&&!showingCards&&<p className="mb-4 text-sm">{t("study.direction")}</p>}
      {showingCards&&<>
        {!snapshot.settings.direction_confirmed&&<div className="mb-4 rounded border p-4 text-sm"><p>舊字卡已完整保留。請先確認下方左欄是英文、右欄是中文；不符的內容可先編輯。</p><button className="mt-2 rounded border px-3 py-2" onClick={()=>void act(()=>repository.configure(page.id,{direction_confirmed:true}))}>確認為英 → 中，啟用學習</button></div>}

        {snapshot.states.filter(state=>state.conflict).map(state=><ScheduleConflict key={state.id} repository={repository} state={state} label={cards.find(card=>card.id===state.id)?.front??'字卡'}/>)}
        {!page.official_pack_id&&<button className="mb-3 rounded border px-3 py-2 text-sm" onClick={()=>setShowLinkSuggestions(true)}>建議字典連結</button>}
        <CardManageList allowOfficialDelete={privateOfficialEditing} official={!!page.official_pack_id} studyItems={cards} onAddCard={()=>setEditingCard({front:"",back:""})} onEditCard={setEditingCard} onDeleteCard={id=>void act(async()=>{if(await confirmDialog('刪除這張私人字卡？字典詞條與其他學習集不受影響。'))await repository.updateCard(id,{deleted_at:Date.now()});})} onImportCsv={()=>setShowCsvImport(true)}/>
      </>}
      {managementOnly&&mode==="manage"&&!showCards&&<div className="max-w-3xl"><StudyPreferences repository={repository} deckId={page.id} registerFlush={registerSettingsFlush}/>{page.official_pack_id&&<section className="mt-6 border-t pt-4"><h2 className="mb-3 font-semibold">{t('ui.officialInfo')}</h2><p className="mb-3 text-sm">{t('ui.officialVersion',{n:page.official_pack_version??0})}</p><div className="flex flex-wrap gap-2"><a className="rounded border px-3 py-2 text-sm" href={`/study/official/${page.official_pack_id}`}>{t('ui.officialInfo')}</a><button disabled={officialBusy||!onOfficialChanged} className="rounded border px-3 py-2 text-sm" onClick={()=>void officialAction()}>{t('ui.syncOfficial')}</button><button disabled={officialBusy||!onOfficialChanged} className="rounded border px-3 py-2 text-sm" onClick={()=>void officialAction(true)}>{t('ui.delete')}</button></div></section>}</div>}
      {mode==="scheduled"&&<ScheduledStudySession key="scheduled" repository={repository} deckId={page.id} onProgress={reportProgress} readingStyle={snapshot.settings.style} onExit={()=>setMode("manage")}/>}
      {mode==="history"&&<div><h2 className="mb-3 text-lg font-semibold">{t("study.history")}</h2><p className="mb-3 text-xs opacity-60">{t("study.historyHint")}</p>
        {historyEvents.slice(0,historyLimit).map(event=><div key={event.id} className="grid grid-cols-2 gap-2 border-b py-3 text-sm"><span>{event.question} → {event.answer}</span><span>{event.source==="daily_initialization"?"排程初始化 Again（每日學習 Easy）":(event.engine==="nexus-interval@1"?t("interval.response"+event.rating):["","忘記","困難","知道","熟記"][event.rating!])} · {event.engine==="nexus-interval@1"?t("interval.method"):event.scheduling_method==="fixed"?t("styles.fixed"):"FSRS-6"}・{new Date(event.at).toLocaleString()}<br/>下次：{new Date(dueAt(event.after,event.at)).toLocaleString()}</span></div>)}
        {historyEvents.length>historyLimit&&<button className="mt-3 underline" onClick={()=>setHistoryLimit(n=>n+50)}>顯示更多紀錄</button>}
        <details className="mt-5"><summary>遷移前的學習摘要</summary>{cards.filter(card=>card.legacy).map(card=><p key={card.id} className="py-2 text-sm">{card.front}：舊複習次數 {card.legacy!.item.review_count}，原到期時間 {card.legacy!.item.daily_due_at?new Date(card.legacy!.item.daily_due_at).toLocaleString():"未排程"}</p>)}</details>
      </div>}
    </div>
    {showLinkSuggestions&&<StudyLinkSuggestions cards={cards} onClose={()=>setShowLinkSuggestions(false)} onEdit={card=>{setShowLinkSuggestions(false);setEditingCard(card);}} onLink={async(card,id)=>{const client=getSupabase();if(!client)throw Error('請先登入');const {data:{user}}=await client.auth.getUser();if(!user)throw Error('請先登入');await syncStudy(repository,client,user.id);await setCardDictionaryLink(client,card.id,id);await repository.updateCard(card.id,{dictionary_entry_id:id});refresh.current();}}/>}
    {showCsvImport&&<CsvImportDialog onClose={()=>setShowCsvImport(false)} onImport={pairs=>void act(()=>repository.addCards(page.id,pairs))}/>}
    {editingCard&&<StudyCardEditor key={editingCard.id??"new"} card={editingCard} officialSource={!!page.official_pack_id} lockDictionaryLink={!!page.official_pack_id&&!privateOfficialEditing}
      requiresScheduleChoice={!!editingCard.id&&hasLearningData(snapshot.states.find(state=>state.id===editingCard.id),snapshot.sessions)}
      onSave={saveCard} onClose={()=>setEditingCard(null)} onCopy={()=>setEditingCard({front:editingCard.front,back:editingCard.back})}/>}
  </main>;
}

export default function StudySetView(props:Parameters<typeof StudySetWorkspace>[0]) {
  return <StudySetWorkspace key={props.page.id} {...props}/>;
}
