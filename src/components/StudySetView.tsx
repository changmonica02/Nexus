"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import QuizSession from "./QuizSession";
import type { StudyRepository } from "../lib/StudyRepository";
import { State, type StudyCard, type StudySnapshot } from "../lib/studyFSRS";
import { displayStudyCards, hasLearningData, isLearned } from "../lib/studySessions";
import DailyStudySession from "./DailyStudySession";
import type { Page } from "../lib/types";
import { useLanguage } from "../lib/LanguageContext";

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

function CardText({value,label,onCommit}:{value:string;label:string;onCommit:(text:string)=>void}) {
  const [draft,setDraft]=useState(value);
  useEffect(()=>setDraft(value),[value]);
  return <textarea aria-label={label} value={draft} onChange={event=>setDraft(event.target.value)} onBlur={()=>{if(draft!==value)onCommit(draft);}} rows={2} placeholder={label}
    className="min-w-0 w-full resize-y rounded bg-transparent px-1 py-1 text-sm leading-5 outline-none focus:ring-1 focus:ring-blue-500" />;
}

/* ============ Card Management ============ */

function CardManageList({ studyItems, onAddCard, onUpdateCard, onDeleteCard, onImportCsv, onReorder, onCopy, statuses, customSort }: {
  studyItems: StudyCard[]; onAddCard: () => void; onUpdateCard: (id: string, patch: Partial<StudyCard>) => void;
  onDeleteCard: (id: string) => void; onImportCsv: () => void; onReorder: (items: StudyCard[]) => void;
  onCopy: (item: StudyCard) => void; statuses: Record<string,string>; customSort: boolean;
}) {
  const { t } = useLanguage();
  const listRef = useRef<HTMLDivElement>(null);
  const pointer = useRef<{ id: string; x: number; y: number; target: string } | null>(null);
  const [drag, setDrag] = useState<{ id: string; target: string } | null>(null);
  const [announcement, setAnnouncement] = useState("");

  const moveCard = (id: string, target: string) => {
    if (!customSort) return;
    const from = studyItems.findIndex((item) => item.id === id);
    const to = studyItems.findIndex((item) => item.id === target);
    if (from < 0 || to < 0 || from === to) return;
    const reordered = [...studyItems];
    reordered.splice(to, 0, reordered.splice(from, 1)[0]);
    onReorder(reordered);
    setAnnouncement(`已移至第 ${to + 1} 張`);
  };

  const isDragging = drag !== null;

  // Only the handle captures touch gestures; the rest of the list scrolls normally.
  useEffect(() => {
    if (!isDragging) return;
    let frame: number;
    const tick = () => {
      const current = pointer.current;
      const container = listRef.current?.closest("main");
      if (current && container) {
        const bounds = container.getBoundingClientRect();
        const speed = current.y < bounds.top + 56 ? -10 : current.y > bounds.bottom - 56 ? 10 : 0;
        if (speed) container.scrollTop += speed;
        const rows = Array.from(listRef.current!.querySelectorAll<HTMLElement>("[data-study-card]"));
        const nearest = rows.reduce<HTMLElement | null>((best, row) => {
          const rect = row.getBoundingClientRect();
          const previous = best?.getBoundingClientRect();
          return !previous || Math.abs(current.y - (rect.top + rect.height / 2)) < Math.abs(current.y - (previous.top + previous.height / 2)) ? row : best;
        }, null);
        const target = nearest?.dataset.studyCard;
        if (target && target !== current.target) {
          current.target = target;
          setDrag({ id: current.id, target });
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [isDragging]);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm opacity-60">{t("studySet.cardCount", { count: studyItems.length })}</div>
        <div className="flex gap-1.5">
          <button onClick={onImportCsv} className="rounded-md border px-3 py-1.5 text-sm" style={{ borderColor: "var(--color-border)" }}>{t("studySet.importCsv")}</button>
          <button onClick={onAddCard} className="rounded-md border px-3 py-1.5 text-sm" style={{ borderColor: "var(--color-border)" }}>{t("studySet.addCard")}</button>
        </div>
      </div>

      {customSort&&<p className="text-xs opacity-50">拖曳左側把手調整順序；也可以聚焦把手後按 ↑／↓ 移動。</p>}
      <div role="status" aria-live="polite" className="sr-only">{announcement}</div>
      {studyItems.length === 0 ? (
        <div className="rounded-xl border border-dashed py-12 text-center text-sm opacity-50">{t("studySet.emptyCards")}</div>
      ) : (
        <div ref={listRef} className="overflow-hidden rounded-lg border" style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}>
          <div className="grid grid-cols-[36px_minmax(0,1fr)_minmax(0,1fr)_32px] gap-2 px-2 py-2 text-xs opacity-60" style={{ background: "var(--color-sidebar-bg)" }}>
            <span>#</span><span>英文</span><span>中文</span><span />
          </div>
          {studyItems.map((item, index) => (
            <div key={item.id} data-study-card={item.id}
              className="grid grid-cols-[36px_minmax(0,1fr)_minmax(0,1fr)_32px] items-center gap-2 border-t px-2 py-1.5"
              style={{ borderColor: "var(--color-border)", opacity: drag?.id === item.id ? 0.5 : 1,
                boxShadow: drag?.target === item.id ? `inset 0 ${studyItems.findIndex((card) => card.id === drag.id) < index ? '-3' : '3'}px #3b82f6` : undefined }}>
              {customSort?<button type="button" aria-label={`拖曳第 ${index + 1} 張字卡排序`} title="拖曳排序，或按上下方向鍵"
                className="flex min-h-11 touch-none cursor-grab flex-col items-center justify-center rounded text-xs focus-visible:ring-2 focus-visible:ring-blue-500 active:cursor-grabbing"
                onPointerDown={(event) => {
                  if (event.button !== 0) return;
                  event.preventDefault();
                  event.currentTarget.focus();
                  event.currentTarget.setPointerCapture(event.pointerId);
                  pointer.current = { id: item.id, target: item.id, x: event.clientX, y: event.clientY };
                  setDrag({ id: item.id, target: item.id });
                }}
                onPointerMove={(event) => { if (pointer.current) { pointer.current.x = event.clientX; pointer.current.y = event.clientY; } }}
                onPointerUp={() => { if (pointer.current) moveCard(pointer.current.id, pointer.current.target); pointer.current = null; setDrag(null); }}
                onPointerCancel={() => { pointer.current = null; setDrag(null); }}
                onLostPointerCapture={() => { pointer.current = null; setDrag(null); }}
                onKeyDown={(event) => {
                  if (event.key === "Escape") { pointer.current = null; setDrag(null); }
                  if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
                  event.preventDefault();
                  const target = studyItems[index + (event.key === "ArrowUp" ? -1 : 1)];
                  if (target) moveCard(item.id, target.id);
                }}>
                <span aria-hidden="true" className="text-base leading-4 opacity-50">⠿</span><span>{index + 1}</span>
              </button>:<span className="text-center text-xs opacity-50">{index+1}</span>}
              <CardText key={`${item.id}-front-${item.front}`} value={item.front} label={`英文 ${index+1}`} onCommit={value=>onUpdateCard(item.id,{front:value})} />
              <CardText key={`${item.id}-back-${item.back}`} value={item.back} label={`中文 ${index+1}`} onCommit={value=>onUpdateCard(item.id,{back:value})} />
              <div className="flex flex-col items-center gap-1">
                <span className="text-[10px] opacity-60" title={statuses[item.id]}>{statuses[item.id]}</span>
                <button onClick={()=>onCopy(item)} aria-label={`複製卡片 ${index+1}`} title="複製為新卡" className="text-xs">＋</button>
                <button onClick={() => onDeleteCard(item.id)} aria-label={`${t("studySet.deleteCard")} ${index + 1}`} title={t("studySet.deleteCard")} className="h-8 w-8 rounded opacity-50 hover:bg-red-100 hover:text-red-700 hover:opacity-100">×</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============ Flashcard Practice ============ */

/* ============ Quiz Mode (Four-Choice) ============ */

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

function StudySetWorkspace({ page, repository, onTitleChange, onBackToInterface }: {
  page:Page; repository:StudyRepository; onTitleChange:(title:string)=>void; onBackToInterface?:()=>void;
}) {
  const [snapshot,setSnapshot]=useState<StudySnapshot|null>(null);
  const [mode,setMode]=useState<"manage"|"daily"|"all"|"quiz"|"history">("manage");
  const [showCsvImport,setShowCsvImport]=useState(false);
  const [error,setError]=useState("");
  const [historyLimit,setHistoryLimit]=useState(50);
  const [editorVersion,setEditorVersion]=useState(0);
  const [editingEnglish,setEditingEnglish]=useState<{id:string;value:string}|null>(null);
  const refresh=useRef(()=>{});
  useEffect(()=>{
    let active=true;
    const read=()=>{void repository.ensureDeck(page).then(data=>{if(active)setSnapshot(data);}).catch(e=>{if(active)setError(String(e));});};
    refresh.current=read;read();window.addEventListener("nexus-study-changed",read);
    return()=>{active=false;window.removeEventListener("nexus-study-changed",read);};
  },[repository,page]);
  const act=async(action:()=>Promise<unknown>)=>{setError("");try{await action();refresh.current();}catch(e){setError(e instanceof Error?e.message:String(e));}};
  const sortMode=snapshot?.settings.sort_mode??"custom";
  const cards=displayStudyCards(snapshot?.cards.filter(card=>!card.deleted_at)??[],sortMode);
  const statuses=Object.fromEntries((snapshot?.states??[]).map(state=>[state.id,state.conflict?"衝突":state.fsrs?({[State.New]:"新卡",[State.Learning]:"學習",[State.Review]:"複習",[State.Relearning]:"重學"}[state.fsrs.state]):state.legacy_due_at!=null?"待接續":"新卡"]));
  const updateCard=(id:string,patch:Partial<StudyCard>)=>{
    if(patch.front!=null) {
      const state=snapshot?.states.find(s=>s.id===id);
      if(hasLearningData(state,snapshot?.sessions)) setEditingEnglish({id,value:patch.front});
      else void act(()=>repository.updateCard(id,{front:patch.front}));
    }
    else void act(()=>repository.updateCard(id,{back:patch.back}));
  };
  const changeEnglish=(reset:boolean)=>{const edit=editingEnglish;if(!edit)return;void act(async()=>{await repository.updateCard(edit.id,{front:edit.value},reset);setEditingEnglish(null);});};
  if(!snapshot)return <main className="flex-1 p-8">{error||"正在載入字卡…"}</main>;
  return <main className="flex flex-1 flex-col overflow-y-auto" style={{backgroundColor:"var(--color-editor-bg)",color:"var(--color-text)"}}>
    <div className="mx-auto w-full" style={{maxWidth:1100,padding:"24px clamp(12px, 3vw, 40px)"}}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b pb-3" style={{borderColor:"var(--color-border)"}}>
        <div className="flex items-center gap-2">{onBackToInterface&&<button onClick={onBackToInterface} aria-label="回到功能介面">←</button>}<span>字卡・英 → 中</span></div>
        <div className="flex flex-wrap gap-2">{mode==="manage"?<>
          <button className="rounded border px-3 py-2 text-sm disabled:opacity-40" disabled={!snapshot.settings.direction_confirmed} onClick={()=>setMode("daily")}>每日學習</button>
          <button className="rounded border px-3 py-2 text-sm disabled:opacity-40" disabled={!snapshot.settings.direction_confirmed} onClick={()=>setMode("all")}>單字複習</button>
          <button className="rounded border px-3 py-2 text-sm disabled:opacity-40" onClick={()=>setMode("quiz")}>測驗</button>
          <button className="rounded border px-3 py-2 text-sm" onClick={()=>setMode("history")}>複習紀錄</button>
        </>:<button className="rounded border px-3 py-2 text-sm" onClick={()=>setMode("manage")}>返回全部預覽</button>}</div>
      </div>
      <input aria-label="學習集標題" value={page.title} onChange={event=>onTitleChange(event.target.value)} className="mb-5 w-full border-none bg-transparent text-3xl font-semibold outline-none"/>
      {error&&<div role="alert" className="mb-3 rounded border border-red-400 p-3 text-sm text-red-600">{error}</div>}
      {mode==="manage"&&<>
        {!snapshot.settings.direction_confirmed&&<div className="mb-4 rounded border p-4 text-sm"><p>舊字卡已完整保留。請先確認下方左欄是英文、右欄是中文；不符的內容可先編輯。</p><button className="mt-2 rounded border px-3 py-2" onClick={()=>void act(()=>repository.configure(page.id,{direction_confirmed:true}))}>確認為英 → 中，啟用每日學習</button></div>}
        <div className="mb-4 flex flex-wrap items-center gap-3 text-sm"><label>每日新字上限 <input key={snapshot.settings.new_limit} aria-label="每日新字上限" type="number" min={0} max={10000} defaultValue={snapshot.settings.new_limit} onBlur={event=>{if(event.target.value!==String(snapshot.settings.new_limit))void act(()=>repository.configure(page.id,{new_limit:event.target.value===""?NaN:Number(event.target.value)}));}} className="w-20 rounded border bg-transparent px-2 py-1"/></label><span className="text-xs opacity-60">首次進入時固定當日批次；調整數量不影響已建立的批次。</span></div>
        <p className="mb-3 text-xs leading-5 opacity-60">每日學習先把新字練到 Easy；單字複習使用已學字卡，每卡每輪首次評分更新 FSRS。測驗獨立，不影響排程或學習進度。</p>
        {snapshot.states.filter(state=>state.conflict).map(state=><div key={state.id} className="mb-2 rounded border border-amber-400 p-3 text-sm">「{cards.find(card=>card.id===state.id)?.front}」排程衝突，兩邊紀錄均保留。<button className="ml-2 underline" onClick={()=>{if(confirm("保留所有歷史，但將這張卡重新設為 New？"))void act(()=>repository.updateCard(state.id,{},true));}}>保留歷史並重新學習</button></div>)}
        <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
          <label>單字複習數量 <input key={snapshot.settings.review_limit??20} aria-label="自由複習數量" type="number" min={1} max={10000} defaultValue={snapshot.settings.review_limit??20} onBlur={event=>{const value=Number(event.target.value);if(value!==(snapshot.settings.review_limit??20))void act(()=>repository.configure(page.id,{review_limit:value}));}} className="w-20 rounded border bg-transparent px-2 py-1"/></label>
          <label>排序 <select aria-label="字卡排序" value={sortMode} onChange={event=>void act(()=>repository.configure(page.id,{sort_mode:event.target.value as "az"|"custom"}))} className="rounded border bg-transparent px-2 py-1"><option value="custom">自訂排序</option><option value="az">A–Z</option></select></label>
          <span className="text-xs opacity-60">已學 {snapshot.states.filter(isLearned).filter(s=>cards.some(c=>c.id===s.id)).length} 字</span>
        </div>
        <CardManageList customSort={sortMode==="custom"} key={`${editorVersion}-${sortMode}`} studyItems={cards} statuses={statuses} onAddCard={()=>void act(()=>repository.addCards(page.id,[{front:"",back:""}]))} onUpdateCard={updateCard} onDeleteCard={id=>void act(()=>repository.updateCard(id,{deleted_at:Date.now()}))} onImportCsv={()=>setShowCsvImport(true)} onReorder={items=>void act(()=>repository.reorder(page.id,items.map(item=>item.id)))} onCopy={item=>void act(()=>repository.addCards(page.id,[{front:item.front,back:item.back}]))}/>
      </>}
      {mode==="daily"&&<DailyStudySession key="daily" mode="daily" repository={repository} deckId={page.id} onExit={()=>setMode("manage")}/>}
      {mode==="all"&&<DailyStudySession key="free" mode="free" repository={repository} deckId={page.id} onExit={()=>setMode("manage")}/>}
      {mode==="quiz"&&<QuizSession repository={repository} snapshot={snapshot} onExit={()=>setMode("manage")}/>}
      {mode==="history"&&<div><h2 className="mb-3 text-lg font-semibold">正式複習紀錄</h2><p className="mb-3 text-xs opacity-60">正式複習記錄第一次實際評分。舊資料不補造歷史。</p>
        {[...snapshot.events].reverse().filter(event=>event.kind==="review").slice(0,historyLimit).map(event=><div key={event.id} className="grid grid-cols-2 gap-2 border-b py-3 text-sm"><span>{event.question} → {event.answer}</span><span>{event.source==="daily_initialization"?"排程初始化 Again（每日學習 Easy）":["","忘記","困難","記得","簡單"][event.rating!]}・{new Date(event.at).toLocaleString()}<br/>下次：{new Date(event.after.fsrs!.due).toLocaleString()}</span></div>)}
        {snapshot.events.filter(event=>event.kind==="review").length>historyLimit&&<button className="mt-3 underline" onClick={()=>setHistoryLimit(n=>n+50)}>顯示更多紀錄</button>}
        <details className="mt-5"><summary>遷移前的學習摘要</summary>{cards.filter(card=>card.legacy).map(card=><p key={card.id} className="py-2 text-sm">{card.front}：舊複習次數 {card.legacy!.item.review_count}，原到期時間 {card.legacy!.item.daily_due_at?new Date(card.legacy!.item.daily_due_at).toLocaleString():"未排程"}</p>)}</details>
      </div>}
    </div>
    {showCsvImport&&<CsvImportDialog onClose={()=>setShowCsvImport(false)} onImport={pairs=>void act(()=>repository.addCards(page.id,pairs))}/>}
    {editingEnglish&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"><div role="dialog" aria-modal="true" aria-label="修改英文題面" className="max-w-md rounded-xl p-5 shadow-xl" style={{background:"var(--color-bg)"}}><p>英文題面已修改。要保留原排程，還是重新設為 New？兩者都保留歷史。</p><div className="mt-4 flex flex-wrap gap-2"><button className="rounded border p-2" onClick={()=>changeEnglish(false)}>保留排程</button><button className="rounded border p-2" onClick={()=>changeEnglish(true)}>重設為新卡</button><button className="rounded border p-2" onClick={()=>{setEditingEnglish(null);setEditorVersion(n=>n+1);refresh.current();}}>取消修改</button></div></div></div>}
  </main>;
}

export default function StudySetView(props:Parameters<typeof StudySetWorkspace>[0]) {
  return <StudySetWorkspace key={props.page.id} {...props}/>;
}
