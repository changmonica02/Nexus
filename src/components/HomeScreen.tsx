"use client";
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { BookOpen, CalendarDays, Play, Check } from 'lucide-react';
import type { Page } from '../lib/types';
import { useLanguage } from '../lib/LanguageContext';
import { calendarDaysForMonth, localDateKey, todosForDay } from '../lib/todoCalendar';
import type { StudyRepository } from '../features/study/StudyRepository';
import type { StudySnapshot } from '../features/study/studyFSRS';
import { scheduledCounts } from '../features/study/scheduledStudy';
import ModalDialog from './ModalDialog';

type Preferences = { mode: 'classic' | 'learning'; deckId: string | null };
function readPreferences(key: string): Preferences {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? '{}');
    return { mode: value?.mode === 'learning' ? 'learning' : 'classic', deckId: typeof value?.deckId === 'string' ? value.deckId : null };
  } catch { return { mode: 'classic', deckId: null }; }
}

/** Presentation only: cards, sessions and todos stay in their existing repositories. */
export default function HomeScreen({ owner, pages, repository, classic, onStudy, onOpenPage, onOpenTodos, onCreateStudySet, suspended = false }: {
  owner: string | null; pages: Page[]; repository: StudyRepository; classic: ReactNode;
  onStudy: (id: string, mode: 'manage' | 'scheduled') => void;
  onOpenPage: (id: string) => void; onOpenTodos: () => void; onCreateStudySet: () => void; suspended?: boolean;
}) {
  const { t, language } = useLanguage();
  const preferenceKey = `nexus-home:${owner ?? 'anonymous'}`;
  const [preferences, setPreferences] = useState(() => readPreferences(preferenceKey));
  const [preferenceError, setPreferenceError] = useState(false);
  const change = (patch: Partial<Preferences>) => {
    const next = { ...preferences, ...patch };
    setPreferences(next);
    try { localStorage.setItem(preferenceKey, JSON.stringify(next)); setPreferenceError(false); }
    catch { setPreferenceError(true); }
  };
  const ownedPages = useMemo(() => pages.filter(page => !page.deleted_at && (page.workspace_owner_id ?? null) === owner), [pages, owner]);
  const decks = useMemo(() => ownedPages.filter(page => page.kind === 'study_set'), [ownedPages]);
  const deck = decks.find(page => page.id === preferences.deckId) ?? decks[0];
  const [picker, setPicker] = useState(false);
  const [previewDate, setPreviewDate] = useState<Date | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [result, setResult] = useState<{ deckId: string; snapshot?: StudySnapshot; error?: string } | null>(null);
  useEffect(() => {
    if (preferences.mode !== 'learning' || suspended) return;
    const refresh = () => setNow(Date.now());
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener('nexus-study-changed', refresh);
    window.addEventListener('focus', refresh);
    return () => { window.clearInterval(timer); window.removeEventListener('nexus-study-changed', refresh); window.removeEventListener('focus', refresh); };
  }, [preferences.mode, suspended]);
  useEffect(() => {
    if (preferences.mode !== 'learning' || suspended || !deck) return;
    let active = true;
    void repository.ensureDeck(deck, false).then(() => repository.readScheduledDeck(deck.id, now))
      .then(snapshot => { if (active) setResult({ deckId: deck.id, snapshot }); })
      .catch(error => { if (active) setResult({ deckId: deck.id, error: String(error) }); });
    return () => { active = false; };
  }, [deck, repository, now, preferences.mode, suspended]);
  const current = result?.deckId === deck?.id ? result : null;
  const snapshot = current?.snapshot;
  const counts = snapshot ? scheduledCounts(snapshot, now) : null;
  const cardCount = snapshot?.cards.filter(card => !card.deleted_at).length ?? 0;
  const today = new Date(now);
  const [month, setMonth] = useState(() => new Date());
  const monthDays = calendarDaysForMonth(month);
  const taskDates = new Set(ownedPages.filter(page => page.kind === 'todo' && page.due_date != null).map(page => localDateKey(new Date(page.due_date!))));
  const button = 'min-h-11 rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm hover:bg-zinc-500/10';
  const sheet = 'm-auto mb-0 max-h-[85dvh] w-full max-w-2xl overflow-y-auto rounded-t-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-[var(--color-text)] shadow-xl backdrop:bg-black/40 sm:p-6';
  const calendar = (expanded = false) => <div className="grid grid-cols-7 gap-1" aria-label={t('home.calendar')}>
    {Array.from({ length: 7 }, (_, day) => <span key={day} className="py-1 text-center text-xs opacity-60">{new Intl.DateTimeFormat(language, { weekday: 'narrow' }).format(new Date(2026, 10, 1 + day))}</span>)}
    {monthDays.map(date => <button key={localDateKey(date)} type="button" onClick={() => setPreviewDate(date)}
      aria-label={date.toLocaleDateString(language) + (taskDates.has(localDateKey(date)) ? ` · ${t('home.hasTasks')}` : '')}
      aria-current={localDateKey(date) === localDateKey(today) ? 'date' : undefined}
      className={`${expanded ? 'min-h-11' : 'min-h-8'} relative min-w-0 rounded-lg text-xs hover:bg-zinc-500/10 ${date.getMonth() !== month.getMonth() ? 'opacity-35' : ''} ${localDateKey(date) === localDateKey(today) ? 'bg-blue-600 font-semibold text-white' : ''}`}>
      {date.getDate()}{taskDates.has(localDateKey(date)) && <span aria-hidden="true" className="absolute inset-x-0 bottom-0 text-center leading-none">·</span>}
    </button>)}
  </div>;
  return <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-[var(--color-editor-bg)] text-[var(--color-text)]">
    <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-end gap-2 px-4 pt-3 sm:px-8">
      <label className="flex min-h-11 max-w-full items-center gap-2 text-sm">{t('home.switch')}
        <select aria-label={t('home.switch')} value={preferences.mode} onChange={event => change({ mode: event.target.value as Preferences['mode'] })} className="min-h-11 min-w-0 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-2">
          <option value="classic">{t('home.classic')}</option><option value="learning">{t('home.learning')}</option>
        </select>
      </label>
      {preferenceError && <p role="status" className="w-full text-right text-xs">{t('home.preferenceError')}</p>}
    </div>
    {preferences.mode === 'classic' ? classic : <main data-pull-refresh className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain p-4 sm:p-8">
      <h1 className="sr-only">{t('home.learning')}</h1>
      <div className="flex min-h-32 flex-[3]"/>
      <section data-learning-home aria-label={t('home.learning')} className="mx-auto w-full max-w-xl pb-8 text-center sm:pb-12">
        <p aria-live="polite" data-study-counts className="mb-5 whitespace-nowrap text-xs tabular-nums sm:text-sm">
          {counts?t('home.counts',{fresh:counts.new,learning:counts.learning,review:counts.review}):deck&&!current?.error?t('study.loadingCards'):t('home.chooseHint')}
        </p>
        <div className="flex items-center justify-center gap-3 sm:gap-6">
          <button aria-label={t('home.chooseDeck')} title={t('home.chooseDeck')} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border)] hover:bg-zinc-500/10 sm:h-14 sm:w-14" onClick={()=>setPicker(true)}><BookOpen aria-hidden="true" size={23}/></button>
          <button disabled={!snapshot?.settings.direction_confirmed||cardCount===0} onClick={()=>{if(deck)onStudy(deck.id,'scheduled');}} className="flex min-h-14 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-4 text-base font-semibold text-white shadow-sm hover:bg-blue-700 focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-blue-500 disabled:opacity-40 sm:min-h-16 sm:text-xl"><Play aria-hidden="true" size={22}/>{t('study.start')}</button>
          <button aria-label={t('home.calendar')} title={t('home.calendar')} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border)] hover:bg-zinc-500/10 sm:h-14 sm:w-14" onClick={()=>setPreviewDate(today)}><CalendarDays aria-hidden="true" size={23}/></button>
        </div>
        {current?.error?<div className="mt-4 text-sm"><p role="alert">{t('home.loadError')}</p><button className={button} onClick={()=>setNow(Date.now())}>{t('home.retry')}</button></div>:snapshot&&(!snapshot.settings.direction_confirmed||!cardCount)?<p className="mt-4 text-sm opacity-65">{t(!snapshot.settings.direction_confirmed?'home.confirmDirection':'home.emptyDeck')}</p>:null}
      </section>
      <div className="flex flex-[2]"/>
    </main>}
    {picker && !suspended && <ModalDialog aria-label={t('home.chooseDeck')} onDismiss={()=>setPicker(false)} className={sheet}>
      <header className="mb-4 flex items-center justify-between gap-2"><h2 className="text-lg font-semibold">{t('home.chooseDeck')}</h2><button className={button} onClick={()=>setPicker(false)}>{t('home.close')}</button></header>
      <div role="radiogroup" aria-label={t('home.chooseDeck')} className="space-y-2">{decks.map(item=><div key={item.id} className="flex min-w-0 items-center gap-2 rounded-xl border border-[var(--color-border)] p-2">
        <label className="flex min-h-12 min-w-0 flex-1 cursor-pointer items-center gap-3 p-1">
          <span className="relative flex shrink-0"><input type="radio" name="home-study-set" checked={item.id===deck?.id} onChange={()=>change({deckId:item.id})} aria-label={item.title||t('common.untitled')} className="peer h-5 w-5 appearance-none rounded border border-[var(--color-border)] checked:border-blue-600 checked:bg-blue-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"/><Check aria-hidden="true" size={17} className="pointer-events-none absolute left-0.5 top-0.5 hidden text-white peer-checked:block"/></span>
          <span className="min-w-0"><span className="block break-words font-medium">{item.title||t('common.untitled')}</span><span className="text-xs opacity-60">{item.official_pack_id?t('ui.officialVersion',{n:item.official_pack_version??0}):t('deck.private')}</span></span>
        </label>
        <button className={button+' shrink-0'} aria-label={t('deck.manageNamed',{name:item.title||t('common.untitled')})} onClick={()=>onStudy(item.id,'manage')}>{t('deck.manage')}</button>
      </div>)}</div>
      {!decks.length&&<p className="py-3 text-sm">{t('home.chooseHint')}</p>}
      <button className={button+' mt-4 w-full'} onClick={onCreateStudySet}>＋ {t('deck.create')}</button>
    </ModalDialog>}
    {previewDate && !suspended && <ModalDialog aria-label={t('home.calendar')} onDismiss={() => setPreviewDate(null)} className={sheet}>
      <header className="mb-4 flex items-center justify-between gap-2"><h2 className="text-lg font-semibold">{t('home.calendar')}</h2><button className={button} onClick={()=>setPreviewDate(null)}>{t('home.close')}</button></header>
      <div className="mb-3 flex items-center justify-between gap-2"><button aria-label={t('home.previousMonth')} className={button} onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()-1,1))}>←</button><span>{month.toLocaleDateString(language,{year:'numeric',month:'long'})}</span><button aria-label={t('home.nextMonth')} className={button} onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()+1,1))}>→</button></div>{calendar(true)}
      <h3 className="my-4 font-semibold">{previewDate.toLocaleDateString(language)}</h3>
      <ul className="space-y-1">{todosForDay(ownedPages, previewDate).map(todo => <li key={todo.id}><button className={`${button} w-full break-words text-left ${todo.completed ? 'line-through opacity-60' : ''}`} onClick={() => onOpenPage(todo.id)}>{todo.title || t('common.untitled')}</button></li>)}</ul>
      {!todosForDay(ownedPages, previewDate).length && <p className="py-2 text-sm opacity-60">{t('home.noTodos')}</p>}
      <div className="mt-5 flex flex-wrap justify-end gap-2"><button className={button} onClick={onOpenTodos}>{t('home.openTodos')}</button><button className={button} onClick={() => setPreviewDate(null)}>{t('home.close')}</button></div>
    </ModalDialog>}
  </div>;
}
