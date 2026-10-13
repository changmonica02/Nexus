"use client";
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Page } from '../../../lib/types';
import { useLanguage } from '../../../lib/LanguageContext';
import type { StudyRepository } from '../StudyRepository';
import type { StudySettings } from '../studyFSRS';

export const StudyPreferencesContext = createContext<{ repository: StudyRepository; decks: Page[]; activeDeckId?: string } | null>(null);
export function StudyPreferencesProvider({getRepository,decks,activeDeckId,children}:{getRepository:()=>StudyRepository;decks:Page[];activeDeckId?:string;children:React.ReactNode}) {
  const [repository]=useState(getRepository);
  const value=useMemo(()=>({repository,decks,activeDeckId}),[repository,decks,activeDeckId]);
  return <StudyPreferencesContext.Provider value={value}>{children}</StudyPreferencesContext.Provider>;
}
export default function StudyPreferences() {
  const context = useContext(StudyPreferencesContext);
  const { t } = useLanguage();
  const [chosen, setChosen] = useState(context?.activeDeckId ?? context?.decks[0]?.id ?? '');
  const deckId = context?.decks.some(d => d.id === chosen) ? chosen : context?.decks[0]?.id ?? '';
  const [loaded, setLoaded] = useState<{id:string;settings:StudySettings}|null>(null);
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!context || !deckId) return;
    let active = true;
    const page = context.decks.find(d => d.id === deckId)!;
    const read = () => { void context.repository.ensureDeck(page).then(s => { if(active)setLoaded({id:deckId,settings:s.settings}); }).catch(e => {if(active)setError(String(e));}); };
    read(); window.addEventListener('nexus-study-changed', read);
    return () => {active = false; window.removeEventListener('nexus-study-changed', read);};
  }, [context, deckId]);
  const settings = loaded?.id === deckId ? loaded.settings : null;
  async function save(patch: Parameters<StudyRepository['configure']>[1]) {
    if (!context || busy) return;
    setBusy(true); setError('');
    try { await context.repository.configure(deckId,patch); const snapshot=await context.repository.readDeck(deckId);setLoaded({id:deckId,settings:snapshot.settings}); }
    catch(e) {setError(e instanceof Error?e.message:String(e));}
    finally {setBusy(false);}
  }
  const control='rounded-lg border bg-transparent px-3 py-2 text-sm';
  if (!context?.decks.length) return <p>{t('study.noDeck')}</p>;
  return <div className="space-y-5 text-sm">
    <label className="flex flex-wrap items-center justify-between gap-3">{t('study.deck')}<select disabled={busy} aria-label={t('study.deck')} className={control} value={deckId} onChange={e=>{setChosen(e.target.value);setError('');}}>{context.decks.map(d=><option key={d.id} value={d.id}>{d.title||t('common.untitled')}</option>)}</select></label>
    <p className="text-xs leading-6 opacity-70">{t('study.settingsScope')}</p>
    {error&&<p role="alert">{error}</p>}
    {!settings?<p role="status">{t('common.loading')}</p>:<fieldset disabled={busy} className="space-y-5 disabled:opacity-60">
      <label className="flex flex-wrap items-center justify-between gap-3">{t('study.mode')}<select aria-label={t('study.mode')} className={control} value={settings.study_mode??'scheduled'} onChange={e=>void save({study_mode:e.target.value as StudySettings['study_mode']})}><option value="scheduled">{t('study.scheduled')}</option><option value="endless">{t('study.endless')}</option></select></label>
      <label className="flex flex-wrap items-center justify-between gap-3">{t('study.batchLimit')}<input key={`review:${deckId}:${settings.review_limit}`} aria-label={t('study.batchLimit')} className={`${control} w-24`} type="number" inputMode="numeric" min={1} max={10000} defaultValue={settings.review_limit??50} onBlur={e=>{const value=e.target.value.trim()?Number(e.target.value):NaN;if(value!==(settings.review_limit??50))void save({review_limit:value});}} onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur();}}/></label>
      <p className="text-xs leading-6 opacity-70">{t('study.batchHint')}</p>
      <label className="flex flex-wrap items-center justify-between gap-3">{t('study.newLimit')}<input key={`new:${deckId}:${settings.new_limit}`} aria-label={t('study.newLimit')} className={`${control} w-24`} type="number" inputMode="numeric" min={0} max={10000} defaultValue={settings.new_limit} onBlur={e=>{const value=e.target.value.trim()?Number(e.target.value):NaN;if(value!==settings.new_limit)void save({new_limit:value});}} onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur();}}/></label>
      <p className="text-xs leading-6 opacity-70">{t('study.newHint')}</p>
      <label className="flex flex-wrap items-center justify-between gap-3">{t('study.cardOrder')}<select aria-label={t('study.cardOrder')} className={control} value={settings.card_order??'new-first'} onChange={e=>void save({card_order:e.target.value as StudySettings['card_order']})}>{(['new-first','mixed','review-first'] as const).map(v=><option key={v} value={v}>{t(`study.${v}`)}</option>)}</select></label>
      <label className="flex flex-wrap items-center justify-between gap-3">{t('study.reviewOrder')}<select aria-label={t('study.reviewOrder')} className={control} value={settings.review_order??'due'} onChange={e=>void save({review_order:e.target.value as StudySettings['review_order']})}>{(['due','retrievability','random'] as const).map(v=><option key={v} value={v}>{t(`study.${v}`)}</option>)}</select></label>
      <p className="text-xs leading-6 opacity-70">{t('study.endlessHint')}</p>
      <p role="status" className="text-xs opacity-60">{busy?t('study.savingSettings'):t('study.savedSettings')}</p>
    </fieldset>}
  </div>;
}
