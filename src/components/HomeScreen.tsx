"use client";
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { BookOpen, CalendarDays, Play } from 'lucide-react';
import type { Page } from '../lib/types';
import { useLanguage } from '../lib/LanguageContext';
import { calendarDaysForMonth, localDateKey, todosForDay } from '../lib/todoCalendar';
import type { StudyRepository } from '../features/study/StudyRepository';
import type { StudySnapshot } from '../features/study/studyFSRS';
import { planScheduled } from '../features/study/scheduledStudy';
import ModalDialog from './ModalDialog';

type Preferences = { mode: 'classic' | 'learning'; deckId: string | null };
function readPreferences(key: string): Preferences {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? '{}');
    return { mode: value?.mode === 'learning' ? 'learning' : 'classic', deckId: typeof value?.deckId === 'string' ? value.deckId : null };
  } catch { return { mode: 'classic', deckId: null }; }
}

/** Presentation only: cards, sessions and todos stay in their existing repositories. */
export default function HomeScreen({ owner, pages, repository, classic, onStudy, onStudySets, onOpenPage, onOpenTodos }: {
  owner: string | null; pages: Page[]; repository: StudyRepository; classic: ReactNode;
  onStudy: (id: string, mode: 'manage' | 'scheduled') => void; onStudySets: () => void;
  onOpenPage: (id: string) => void; onOpenTodos: () => void;
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
    if (preferences.mode !== 'learning') return;
    const refresh = () => setNow(Date.now());
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener('nexus-study-changed', refresh);
    window.addEventListener('focus', refresh);
    return () => { window.clearInterval(timer); window.removeEventListener('nexus-study-changed', refresh); window.removeEventListener('focus', refresh); };
  }, [preferences.mode]);
  useEffect(() => {
    if (preferences.mode !== 'learning' || !deck) return;
    let active = true;
    void repository.ensureDeck(deck).then(() => repository.readScheduledDeck(deck.id, now))
      .then(snapshot => { if (active) setResult({ deckId: deck.id, snapshot }); })
      .catch(error => { if (active) setResult({ deckId: deck.id, error: String(error) }); });
    return () => { active = false; };
  }, [deck, repository, now, preferences.mode]);
  const current = result?.deckId === deck?.id ? result : null;
  const snapshot = current?.snapshot;
  const plan = snapshot ? planScheduled(snapshot, now) : null;
  const cardCount = snapshot?.cards.filter(card => !card.deleted_at).length ?? 0;
  const today = new Date(now);
  const todayTodos = todosForDay(ownedPages, today).filter(page => !page.completed);
  const monthDays = calendarDaysForMonth(today);
  const taskDates = new Set(ownedPages.filter(page => page.kind === 'todo' && page.due_date != null).map(page => localDateKey(new Date(page.due_date!))));
  const button = 'min-h-11 rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm hover:bg-zinc-500/10';
  const panel = 'min-w-0 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4';
  const calendar = (expanded = false) => <div className="grid grid-cols-7 gap-1" aria-label={t('home.calendar')}>
    {Array.from({ length: 7 }, (_, day) => <span key={day} className="py-1 text-center text-xs opacity-60">{new Intl.DateTimeFormat(language, { weekday: 'narrow' }).format(new Date(2026, 10, 1 + day))}</span>)}
    {monthDays.map(date => <button key={localDateKey(date)} type="button" onClick={() => setPreviewDate(date)}
      aria-label={date.toLocaleDateString(language) + (taskDates.has(localDateKey(date)) ? ` · ${t('home.hasTasks')}` : '')}
      aria-current={localDateKey(date) === localDateKey(today) ? 'date' : undefined}
      className={`${expanded ? 'min-h-11' : 'min-h-8'} relative min-w-0 rounded-lg text-xs hover:bg-zinc-500/10 ${date.getMonth() !== today.getMonth() ? 'opacity-35' : ''} ${localDateKey(date) === localDateKey(today) ? 'bg-blue-600 font-semibold text-white' : ''}`}>
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
    {preferences.mode === 'classic' ? classic : <main data-pull-refresh className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-6 text-xl font-semibold">{t('home.learning')}</h1>
        <div data-learning-home className="grid items-start gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)_minmax(0,1fr)]">
          <section aria-label={t('home.currentDeck')} className={`${panel} order-2 md:order-1`}>
            <BookOpen aria-hidden="true" size={24} className="mb-4 text-blue-600"/>
            <h2 className="text-sm opacity-65">{t('home.currentDeck')}</h2>
            <p className="my-3 break-words text-xl font-semibold">{deck?.title || t(decks.length ? 'common.untitled' : 'home.noDeck')}</p>
            {snapshot && <p className="mb-4 text-sm opacity-65">{t('studySet.cardCount', { count: cardCount })}</p>}
            <div className="flex flex-col gap-2">
              <button className={button} onClick={() => setPicker(true)}>{t('home.chooseDeck')}</button>
              <button className={button} onClick={() => deck ? onStudy(deck.id, 'manage') : onStudySets()}>{t('home.manageCards')}</button>
            </div>
          </section>
          <section aria-label={t('study.start')} className="order-1 flex min-w-0 flex-col items-center rounded-3xl bg-gradient-to-b from-blue-500/10 to-transparent px-3 py-7 text-center md:order-2 md:py-10">
            <p className="mb-5 max-w-full break-words text-sm opacity-70">{deck?.title || t('home.noDeck')}</p>
            <button disabled={!snapshot?.settings.direction_confirmed || cardCount === 0} onClick={() => { if (deck) onStudy(deck.id, 'scheduled'); }}
              className="flex aspect-square w-full max-w-56 flex-col items-center justify-center gap-3 rounded-full bg-blue-600 p-5 text-xl font-semibold text-white shadow-lg shadow-blue-600/15 transition hover:bg-blue-700 focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-blue-500 disabled:opacity-40">
              <Play aria-hidden="true" size={32}/>{t('study.start')}
            </button>
            <div aria-live="polite" className="mt-5 space-y-2 text-sm">
              {current?.error ? <><p role="alert">{t('home.loadError')}</p><button className={button} onClick={() => setNow(Date.now())}>{t('home.retry')}</button></>
                : !deck ? <p>{t('home.chooseHint')}</p>
                : !snapshot ? <p>{t('study.loadingCards')}</p>
                : !snapshot.settings.direction_confirmed ? <p>{t('home.confirmDirection')}</p>
                : cardCount === 0 ? <p>{t('home.emptyDeck')}</p>
                : <><p>{t('study.planned', { n: plan!.cards.length })}</p><p className="opacity-65">{t('home.due', { n: plan!.dueCount + plan!.shortIds.size })}</p>{!plan!.cards.length && <p>{t('home.noDue')}</p>}</>}
            </div>
          </section>
          <section aria-label={t('home.calendar')} className={`${panel} order-3`}>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold"><CalendarDays size={18} aria-hidden="true"/>{today.toLocaleDateString(language, { year: 'numeric', month: 'long' })}</h2>
            {calendar()}
            <button className={`${button} mt-3 w-full`} onClick={() => setPreviewDate(today)}>{t('home.expandCalendar')}</button>
            <h2 className="mb-2 mt-5 text-sm font-semibold">{t('home.todayTodos')}</h2>
            {todayTodos.length ? <ul className="space-y-1">{todayTodos.slice(0, 3).map(todo => <li key={todo.id}><button className="min-h-11 w-full truncate rounded-lg px-2 text-left text-sm hover:bg-zinc-500/10" onClick={() => setPreviewDate(today)}>{todo.title || t('common.untitled')}</button></li>)}</ul> : <p className="py-2 text-sm opacity-60">{t('home.noTodos')}</p>}
            <button className={`${button} mt-3 w-full`} onClick={onOpenTodos}>{t('home.openTodos')}</button>
          </section>
        </div>
      </div>
    </main>}
    {picker && <ModalDialog aria-label={t('home.chooseDeck')} onDismiss={() => setPicker(false)} className="m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-5 text-[var(--color-text)] shadow-xl backdrop:bg-black/40">
      <h2 className="mb-4 text-lg font-semibold">{t('home.chooseDeck')}</h2>
      <div className="space-y-2">{decks.map(item => <button key={item.id} aria-pressed={item.id === deck?.id} className={`${button} w-full break-words text-left aria-pressed:border-blue-600`} onClick={() => { change({ deckId: item.id }); setPicker(false); }}>{item.title || t('common.untitled')}</button>)}</div>
      {!decks.length && <p className="py-3 text-sm">{t('home.chooseHint')}</p>}
      <div className="mt-4 flex flex-wrap justify-end gap-2"><button className={button} onClick={onStudySets}>{t('home.openStudySets')}</button><button className={button} onClick={() => setPicker(false)}>{t('home.close')}</button></div>
    </ModalDialog>}
    {previewDate && <ModalDialog aria-label={t('home.calendar')} onDismiss={() => setPreviewDate(null)} className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-5 text-[var(--color-text)] shadow-xl backdrop:bg-black/40">
      <h2 className="mb-4 text-lg font-semibold">{t('home.calendar')}</h2>{calendar(true)}
      <h3 className="my-4 font-semibold">{previewDate.toLocaleDateString(language)}</h3>
      <ul className="space-y-1">{todosForDay(ownedPages, previewDate).map(todo => <li key={todo.id}><button className={`${button} w-full break-words text-left ${todo.completed ? 'line-through opacity-60' : ''}`} onClick={() => onOpenPage(todo.id)}>{todo.title || t('common.untitled')}</button></li>)}</ul>
      {!todosForDay(ownedPages, previewDate).length && <p className="py-2 text-sm opacity-60">{t('home.noTodos')}</p>}
      <div className="mt-5 flex flex-wrap justify-end gap-2"><button className={button} onClick={onOpenTodos}>{t('home.openTodos')}</button><button className={button} onClick={() => setPreviewDate(null)}>{t('home.close')}</button></div>
    </ModalDialog>}
  </div>;
}
