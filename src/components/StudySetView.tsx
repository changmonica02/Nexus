"use client";
import { useMemo, useState } from "react";
import type { Page, StudyItem } from "../lib/types";
import { useLanguage } from "../lib/LanguageContext";

function newStudyItemId(): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return `item_${uuid}`;
  return `item_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function createEmptyStudyItem(): StudyItem {
  return { id: newStudyItemId(), front: "", back: "", mastery: "new", last_reviewed_at: null, review_count: 0 };
}

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

/** Generate wrong answers for quiz: pick from other cards, or generate similar strings */
function generateChoices(correctItem: StudyItem, allItems: StudyItem[], showFront: boolean): string[] {
  const correctAnswer = showFront ? correctItem.back : correctItem.front;
  const otherItems = allItems.filter((item) => item.id !== correctItem.id);
  const wrongPool = otherItems.map((item) => (showFront ? item.back : item.front)).filter((s) => s && s !== correctAnswer);

  // Shuffle and pick up to 3 wrong answers
  const shuffled = [...wrongPool].sort(() => Math.random() - 0.5);
  const wrongAnswers = shuffled.slice(0, 3);

  // If not enough wrong answers, generate similar strings
  while (wrongAnswers.length < 3) {
    wrongAnswers.push(generateSimilarString(correctAnswer, wrongAnswers.length));
  }

  // Combine and shuffle
  const all = [correctAnswer, ...wrongAnswers].sort(() => Math.random() - 0.5);
  return all;
}

/** Generate a string similar to the input but different */
function generateSimilarString(input: string, seed: number): string {
  if (!input) return `Option ${seed + 1}`;
  const chars = input.split("");
  // Apply a simple transformation based on seed
  const transformations = [
    (s: string[]) => { if (s.length > 2) { const i = Math.floor(s.length / 2); [s[i], s[i + 1]] = [s[i + 1], s[i]]; } return s; }, // swap middle chars
    (s: string[]) => { s.push(s[0]); return s.slice(1); }, // rotate left
    (s: string[]) => { return [...s].reverse(); }, // reverse
  ];
  const transform = transformations[seed % transformations.length];
  const result = transform([...chars]).join("");
  return result === input ? `${input}*` : result;
}

/** Shuffle array */
function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildPracticeQueue(items: StudyItem[]): StudyItem[] {
  const unmastered = shuffle(items.filter((item) => item.mastery !== "mastered"));
  const mastered = shuffle(items.filter((item) => item.mastery === "mastered"));
  const queue: StudyItem[] = [];
  let mi = 0;
  unmastered.forEach((item, idx) => { queue.push(item); if ((idx + 1) % 3 === 0 && mi < mastered.length) queue.push(mastered[mi++]); });
  while (mi < mastered.length) queue.push(mastered[mi++]);
  return queue;
}

/* ============ Card Management ============ */

function CardManageList({ studyItems, onAddCard, onUpdateCard, onDeleteCard, onImportCsv }: {
  studyItems: StudyItem[]; onAddCard: () => void; onUpdateCard: (id: string, patch: Partial<StudyItem>) => void;
  onDeleteCard: (id: string) => void; onImportCsv: () => void;
}) {
  const { t } = useLanguage();
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm opacity-60" style={{ color: "var(--color-text)" }}>{t("studySet.cardCount", { count: studyItems.length })}</div>
        <div className="flex gap-1.5">
          <button onClick={onImportCsv}
            className="rounded-md px-3 py-1.5 text-sm font-medium transition-all hover:bg-zinc-200"
            style={{ border: "1px solid var(--color-border)", color: "var(--color-text)" }}>
            ? {t("studySet.importCsv")}
          </button>
          <button onClick={onAddCard}
            className="rounded-md px-3 py-1.5 text-sm font-medium transition-all hover:bg-zinc-200"
            style={{ border: "1px solid var(--color-border)", color: "var(--color-text)" }}>
            {t("studySet.addCard")}
          </button>
        </div>
      </div>
      {studyItems.length === 0 ? (
        <div className="rounded-xl py-12 text-center text-sm opacity-50" style={{ border: "1px dashed var(--color-border)", color: "var(--color-text)" }}>{t("studySet.emptyCards")}</div>
      ) : (
        <div className="space-y-2">
          {studyItems.map((item, index) => (
            <div key={item.id} className="rounded-xl p-3" style={{ border: "1px solid var(--color-border)" }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs opacity-40" style={{ color: "var(--color-text)" }}>#{index + 1}</span>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${item.mastery === "mastered" ? "bg-green-100 text-green-700" : item.mastery === "learning" ? "bg-amber-100 text-amber-700" : "bg-zinc-200 text-zinc-600"}`}>
                    {item.mastery === "mastered" ? t("studySet.mastery.mastered") : item.mastery === "learning" ? t("studySet.mastery.learning") : t("studySet.mastery.new")}
                  </span>
                  <button onClick={() => onDeleteCard(item.id)} className="text-xs px-1.5 py-0.5 rounded hover:bg-red-100 hover:text-red-700 transition-all"
                    style={{ color: "var(--color-sidebar-text)" }} title={t("studySet.deleteCard")}></button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <textarea value={item.front} onChange={(e) => onUpdateCard(item.id, { front: e.target.value })} placeholder={t("studySet.front")} rows={2}
                  className="w-full text-sm px-2.5 py-1.5 rounded-md outline-none resize-none bg-transparent focus:ring-1 focus:ring-blue-500"
                  style={{ border: "1px solid var(--color-border)", color: "var(--color-text)" }} />
                <textarea value={item.back} onChange={(e) => onUpdateCard(item.id, { back: e.target.value })} placeholder={t("studySet.back")} rows={2}
                  className="w-full text-sm px-2.5 py-1.5 rounded-md outline-none resize-none bg-transparent focus:ring-1 focus:ring-blue-500"
                  style={{ border: "1px solid var(--color-border)", color: "var(--color-text)" }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============ Flashcard Practice ============ */

function PracticeSession({ studyItems, onFinishItem, onExit }: {
  studyItems: StudyItem[]; onFinishItem: (id: string, result: "again" | "got_it") => void; onExit: () => void;
}) {
  const { t } = useLanguage();
  const queue = useMemo(() => buildPracticeQueue(studyItems), [studyItems]);
  const [index, setIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [summary, setSummary] = useState({ reviewed: 0, gotIt: 0 });
  const currentItem = queue[index] || null;
  const isFinished = queue.length === 0 || index >= queue.length;

  const handleMark = (result: "again" | "got_it") => {
    if (!currentItem) return;
    onFinishItem(currentItem.id, result);
    setSummary((prev) => ({ reviewed: prev.reviewed + 1, gotIt: prev.gotIt + (result === "got_it" ? 1 : 0) }));
    setIsFlipped(false);
    setIndex((prev) => prev + 1);
  };

  if (queue.length === 0 || isFinished) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        {isFinished && queue.length > 0 && (<>
          <div className="text-xl font-semibold" style={{ color: "var(--color-text)" }}>{t("studySet.practice.finishedTitle")}</div>
          <div className="text-sm opacity-60" style={{ color: "var(--color-text)" }}>{t("studySet.practice.summary", { reviewed: summary.reviewed, gotIt: summary.gotIt })}</div>
        </>)}
        <button onClick={onExit} className="rounded-md px-4 py-2 text-sm font-medium transition-all hover:bg-zinc-200"
          style={{ border: "1px solid var(--color-border)", color: "var(--color-text)" }}>{t("studySet.practice.backToManage")}</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <div className="text-xs opacity-40" style={{ color: "var(--color-text)" }}>{index + 1} / {queue.length}</div>
      <button type="button" onClick={() => setIsFlipped((prev) => !prev)}
        className="w-full max-w-md min-h-[220px] rounded-2xl flex items-center justify-center p-8 text-center text-xl font-medium transition-all hover:shadow-md"
        style={{ border: "1px solid var(--color-border)", backgroundColor: "var(--color-sidebar-bg)", color: "var(--color-text)" }}>
        {isFlipped ? currentItem?.back : currentItem?.front}
      </button>
      <div className="text-xs opacity-40" style={{ color: "var(--color-text)" }}>{isFlipped ? t("studySet.practice.flipHintBack") : t("studySet.practice.flipHintFront")}</div>
      {isFlipped && (
        <div className="flex items-center gap-3">
          <button onClick={() => handleMark("again")} className="rounded-md px-4 py-2 text-sm font-medium transition-all hover:bg-amber-100"
            style={{ border: "1px solid var(--color-border)", color: "#b45309" }}>{t("studySet.practice.again")}</button>
          <button onClick={() => handleMark("got_it")} className="rounded-md px-4 py-2 text-sm font-medium transition-all hover:bg-green-100"
            style={{ border: "1px solid var(--color-border)", color: "#15803d" }}>{t("studySet.practice.gotIt")}</button>
        </div>
      )}
      <button onClick={onExit} className="text-xs opacity-50 hover:opacity-100 underline" style={{ color: "var(--color-text)" }}>{t("studySet.practice.exit")}</button>
    </div>
  );
}

/* ============ Quiz Mode (Four-Choice) ============ */

function QuizSession({ studyItems, onFinishItem, onExit }: {
  studyItems: StudyItem[]; onFinishItem: (id: string, result: "again" | "got_it") => void; onExit: () => void;
}) {
  const { t } = useLanguage();
  const [quizItems] = useState(() => shuffle([...studyItems]));
  const [index, setIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [showFront] = useState(() => Math.random() > 0.5); // Randomly decide: show front?pick back, or show back?pick front

  const currentItem = quizItems[index] || null;
  const isFinished = index >= quizItems.length;

  const choices = useMemo(() => {
    if (!currentItem) return [];
    return generateChoices(currentItem, studyItems, showFront);
  }, [currentItem, studyItems, showFront]);

  const question = currentItem ? (showFront ? currentItem.front : currentItem.back) : "";
  const correctAnswer = currentItem ? (showFront ? currentItem.back : currentItem.front) : "";

  const handleSelect = (answer: string) => {
    if (selectedAnswer || !currentItem) return;
    setSelectedAnswer(answer);
    const isCorrect = answer === correctAnswer;
    setScore((prev) => ({ correct: prev.correct + (isCorrect ? 1 : 0), total: prev.total + 1 }));
    onFinishItem(currentItem.id, isCorrect ? "got_it" : "again");
  };

  const handleNext = () => {
    setSelectedAnswer(null);
    setIndex((prev) => prev + 1);
  };

  if (isFinished) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <div className="text-2xl font-semibold" style={{ color: "var(--color-text)" }}>??</div>
        <div className="text-xl font-semibold" style={{ color: "var(--color-text)" }}>{t("studySet.practice.finishedTitle")}</div>
        <div className="text-lg" style={{ color: "var(--color-text)" }}>
          {t("studySet.quiz.score", { correct: score.correct, total: score.total })}
        </div>
        <div className="text-4xl font-bold mt-2" style={{ color: score.correct === score.total ? "#15803d" : score.correct >= score.total * 0.7 ? "#b45309" : "#dc2626" }}>
          {score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0}%
        </div>
        <button onClick={onExit} className="mt-4 rounded-md px-4 py-2 text-sm font-medium transition-all hover:bg-zinc-200"
          style={{ border: "1px solid var(--color-border)", color: "var(--color-text)" }}>
          {t("studySet.practice.backToManage")}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 py-8 max-w-lg mx-auto">
      <div className="flex items-center justify-between w-full">
        <div className="text-xs opacity-40" style={{ color: "var(--color-text)" }}>{index + 1} / {quizItems.length}</div>
        <div className="text-xs font-medium" style={{ color: "var(--color-text)" }}>
          {t("studySet.quiz.score", { correct: score.correct, total: score.total })}
        </div>
      </div>

      {/* Question */}
      <div className="w-full rounded-2xl p-8 text-center text-xl font-medium"
        style={{ border: "1px solid var(--color-border)", backgroundColor: "var(--color-sidebar-bg)", color: "var(--color-text)" }}>
        {question}
      </div>

      <div className="text-sm opacity-50" style={{ color: "var(--color-text)" }}>{t("studySet.quiz.selectCorrect")}</div>

      {/* Choices */}
      <div className="w-full space-y-2">
        {choices.map((choice, i) => {
          const isSelected = selectedAnswer === choice;
          const isCorrect = choice === correctAnswer;
          const showResult = selectedAnswer !== null;
          let bg = "var(--color-sidebar-bg)";
          let border = "var(--color-border)";
          let textColor = "var(--color-text)";
          if (showResult && isCorrect) { bg = "#dcfce7"; border = "#15803d"; textColor = "#15803d"; }
          else if (showResult && isSelected && !isCorrect) { bg = "#fee2e2"; border = "#dc2626"; textColor = "#dc2626"; }
          return (
            <button key={i} onClick={() => handleSelect(choice)} disabled={selectedAnswer !== null}
              className="w-full rounded-xl px-5 py-4 text-left text-base transition-all disabled:cursor-default"
              style={{ border: `2px solid ${border}`, backgroundColor: bg, color: textColor }}>
              <span className="font-medium mr-2 opacity-50">{String.fromCharCode(65 + i)}.</span>
              {choice}
            </button>
          );
        })}
      </div>

      {/* Feedback + Next */}
      {selectedAnswer !== null && (
        <div className="w-full flex flex-col items-center gap-3 mt-2">
          {selectedAnswer === correctAnswer ? (
            <div className="text-green-600 font-medium text-sm">??{t("studySet.quiz.correct")}</div>
          ) : (
            <div className="text-red-600 font-medium text-sm">??{t("studySet.quiz.wrong")} <strong>{correctAnswer}</strong></div>
          )}
          <button onClick={handleNext}
            className="rounded-md px-5 py-2 text-sm font-semibold transition-all hover:opacity-90"
            style={{ backgroundColor: "var(--color-text)", color: "var(--color-bg)" }}>
            {index + 1 >= quizItems.length ? t("studySet.quiz.finish") : t("studySet.quiz.next")}
          </button>
        </div>
      )}

      <button onClick={onExit} className="text-xs opacity-50 hover:opacity-100 underline" style={{ color: "var(--color-text)" }}>{t("studySet.practice.exit")}</button>
    </div>
  );
}

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

export default function StudySetView({ page, onTitleChange, onUpdateStudyItems }: {
  page: Page; onTitleChange: (title: string) => void; onUpdateStudyItems: (items: StudyItem[]) => void;
}) {
  const { t } = useLanguage();
  const [mode, setMode] = useState<"manage" | "practice" | "quiz">("manage");
  const [showCsvImport, setShowCsvImport] = useState(false);
  const studyItems = page.study_items || [];

  const handleAddCard = () => onUpdateStudyItems([...studyItems, createEmptyStudyItem()]);
  const handleUpdateCard = (id: string, patch: Partial<StudyItem>) => onUpdateStudyItems(studyItems.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  const handleDeleteCard = (id: string) => onUpdateStudyItems(studyItems.filter((i) => i.id !== id));
  const handleFinishItem = (id: string, result: "again" | "got_it") => {
    onUpdateStudyItems(studyItems.map((item) => {
      if (item.id !== id) return item;
      const nextMastery: StudyItem["mastery"] = result === "got_it" ? (item.mastery === "learning" ? "mastered" : "learning") : "learning";
      return { ...item, mastery: result === "got_it" && item.mastery === "new" ? "learning" : nextMastery, last_reviewed_at: Date.now(), review_count: item.review_count + 1 };
    }));
  };
  const handleImportCsv = (items: { front: string; back: string }[]) => {
    const newItems: StudyItem[] = items.map((item) => ({
      id: newStudyItemId(), front: item.front, back: item.back, mastery: "new", last_reviewed_at: null, review_count: 0,
    }));
    onUpdateStudyItems([...studyItems, ...newItems]);
  };

  return (
    <main className="flex flex-col flex-1 overflow-y-auto" style={{ backgroundColor: "var(--color-editor-bg)" }}>
      <div className="flex flex-col mx-auto w-full" style={{ maxWidth: "820px", padding: "48px 64px" }}>
        <div className="flex items-center justify-between gap-3 mb-4 text-sm opacity-80 pb-3 border-b" style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}>
          <span>{t("studySet.label")}</span>
          <div className="flex gap-1.5">
            {mode === "manage" ? (<>
              <button onClick={() => setMode("practice")} disabled={studyItems.length === 0}
                className="rounded-md px-3 py-1.5 text-sm font-medium transition-all hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
                style={{ border: "1px solid var(--color-border)", color: "var(--color-text)" }}>{t("studySet.startPractice")}</button>
              <button onClick={() => { if (studyItems.length < 4) { alert(t("studySet.quiz.notEnough")); return; } setMode("quiz"); }}
                className="rounded-md px-3 py-1.5 text-sm font-medium transition-all hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
                style={{ border: "1px solid var(--color-border)", color: "var(--color-text)" }}>?? {t("studySet.quiz")}</button>
            </>) : (
              <button onClick={() => setMode("manage")}
                className="rounded-md px-3 py-1.5 text-sm font-medium transition-all hover:bg-zinc-200"
                style={{ border: "1px solid var(--color-border)", color: "var(--color-text)" }}>{t("studySet.backToCards")}</button>
            )}
          </div>
        </div>
        <input type="text" value={page.title} onChange={(e) => onTitleChange(e.target.value)} placeholder={t("studySet.titlePlaceholder")}
          className="w-full text-3xl font-semibold bg-transparent border-none outline-none mb-6" style={{ color: "var(--color-text)", fontFamily: "inherit" }} />
        {mode === "manage" ? (
          <CardManageList studyItems={studyItems} onAddCard={handleAddCard} onUpdateCard={handleUpdateCard} onDeleteCard={handleDeleteCard} onImportCsv={() => setShowCsvImport(true)} />
        ) : mode === "practice" ? (
          <PracticeSession studyItems={studyItems} onFinishItem={handleFinishItem} onExit={() => setMode("manage")} />
        ) : (
          <QuizSession studyItems={studyItems} onFinishItem={handleFinishItem} onExit={() => setMode("manage")} />
        )}
      </div>
      {showCsvImport && <CsvImportDialog onImport={handleImportCsv} onClose={() => setShowCsvImport(false)} />}
    </main>
  );
}
