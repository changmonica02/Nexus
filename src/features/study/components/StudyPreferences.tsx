"use client";
import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../../../lib/LanguageContext';
import type { StudyRepository } from '../StudyRepository';
import {defaultIntervalSettings,type StudyStyle} from '../studyStyles';
import ModalDialog from '../../../components/ModalDialog';
import { CircleHelp } from 'lucide-react';

function IntervalInput({
  seconds,
  onSave,
  label,
}: {
  seconds: number;
  onSave: (seconds: number) => void;
  label: string;
}) {
  const units = [60, 3600, 86400, 1];
  const initial =
    seconds % 86400 === 0
      ? 86400
      : seconds % 3600 === 0
        ? 3600
        : seconds % 60 === 0
          ? 60
          : 1;
  const [unit, setUnit] = useState(initial),
    [amount, setAmount] = useState(String(seconds / initial));
  const { t } = useLanguage();
  const commit = (u = unit) => {
    const value = amount.trim() ? Number(amount) * u : NaN;
    if (value !== seconds) onSave(value);
  };
  return (
    <label className="flex flex-wrap items-center justify-between gap-2">
      {label}
      <span className="flex gap-2">
        <input
          aria-label={label}
          className="w-24 rounded border bg-transparent p-2"
          type="number"
          min="0"
          step="any"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          onBlur={(e) => {
            if (!(e.relatedTarget instanceof HTMLSelectElement)) commit();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
        />
        <select
          aria-label={label + " " + t("styles.unit")}
          className="rounded border bg-transparent p-2"
          value={unit}
          onChange={(e) => {
            const u = Number(e.target.value);
            setUnit(u);
            commit(u);
          }}
        >
          {units.map((u) => (
            <option key={u} value={u}>
              {t("styles.unit" + u)}
            </option>
          ))}
        </select>
      </span>
    </label>
  );
}
export default function StudyPreferences({repository,deckId,registerFlush}:{repository:StudyRepository;deckId:string;registerFlush:(flush:()=>Promise<void>)=>void}) {
  const {t}=useLanguage();
  const [modeHelp,setModeHelp]=useState(false);
  const modeHelpTrigger=useRef<HTMLButtonElement>(null);
  const [style,setStyle]=useState<StudyStyle|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const pending=useRef<Promise<void>>(Promise.resolve()),alive=useRef(true);
  useEffect(()=>{alive.current=true;registerFlush(()=>pending.current);return()=>{alive.current=false;};},[registerFlush]);
  useEffect(()=>{
    let active=true;
    const read=()=>void repository.styleForDeck(deckId).then(value=>{if(active)setStyle(value.style);}).catch(e=>{if(active)setError(String(e));});
    read();window.addEventListener('nexus-study-changed',read);
    return()=>{active=false;window.removeEventListener('nexus-study-changed',read);};
  },[repository,deckId]);
  const save=(patch:Partial<StudyStyle>)=>{
    setBusy(true);setError('');
    const task=pending.current.catch(()=>undefined).then(async()=>{
      await repository.saveDeckStyle(deckId,patch);
      const next=await repository.styleForDeck(deckId);if(alive.current)setStyle(next.style);
    });
    pending.current=task;
    void task.catch(e=>{if(alive.current)setError(String(e));}).finally(()=>{if(alive.current)setBusy(false);});
  };
  const control='max-w-full min-w-0 rounded border bg-transparent px-3 py-2 text-sm';
  const count=(key:'review_limit'|'new_limit'|'new_pause_threshold',label:string,min:number)=><label className="flex flex-wrap items-center justify-between gap-3">{label}<input key={style!.id+key+style![key]} aria-label={label} className={control+' w-24'} type="number" min={min} max={10000} defaultValue={style![key]} onBlur={e=>{const n=e.target.value.trim()?Number(e.target.value):NaN;if(n!==style![key])save({[key]:n});}} onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur();}}/></label>;
  return <section aria-label={t('deck.schedule')} className="space-y-4 text-sm">
    <h2 className="text-lg font-semibold">{t('deck.schedule')}</h2>
    {error&&<p role="alert">{error}</p>}
    <fieldset disabled={busy} className="space-y-5">
      {!style?<p>{t('common.loading')}</p>:<>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="flex items-center gap-1">{t("study.mode")}<button ref={modeHelpTrigger} type="button" aria-label={t('study.modeHelp')} aria-haspopup="dialog" onClick={()=>setModeHelp(true)} className="grid min-h-11 min-w-11 place-items-center rounded-lg hover:bg-zinc-500/10"><CircleHelp size={18}/></button></span>
              <select
                aria-label={t("study.mode")}
                className={control}
                value={style.study_mode}
                onChange={(e) =>
                  save({
                    study_mode: e.target.value as StudyStyle["study_mode"],
                  })
                }
              >
                <option value="scheduled">{t("study.scheduled")}</option>
                <option value="endless">{t("study.endless")}</option>
              </select>
            </div>
            {count("review_limit", t("study.batchLimit"), 1)}
            {count("new_limit", t("study.newLimit"), 0)}
            {count("new_pause_threshold", t("styles.threshold"), 1)}
            <label className="flex flex-wrap justify-between gap-3">
              {t("study.cardOrder")}
              <select
                aria-label={t("study.cardOrder")}
                className={control}
                value={style.card_order}
                onChange={(e) =>
                  save({
                    card_order: e.target.value as StudyStyle["card_order"],
                  })
                }
              >
                {(["new-first", "mixed", "review-first"] as const).map((v) => (
                  <option key={v} value={v}>
                    {t("study." + v)}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-wrap justify-between gap-3">
              {t("study.reviewOrder")}
              <select
                aria-label={t("study.reviewOrder")}
                className={control}
                value={style.review_order}
                onChange={(e) =>
                  save({
                    review_order: e.target.value as StudyStyle["review_order"],
                  })
                }
              >
                {(["due", "random"] as const).map((v) => (
                  <option key={v} value={v}>
                    {t("study." + v)}
                  </option>
                ))}
              </select>
            </label>
            {(['general','forgotten'] as const).map(group=><section key={group} className="space-y-3"><h3 className="font-semibold">{t('interval.'+group)}</h3>{([1,2,3] as const).map(rating=>{const values=style.intervals??defaultIntervalSettings();return <IntervalInput key={style.id+group+rating+values[group][rating-1]} label={t('interval.'+group)+' · '+t('interval.response'+rating)} seconds={values[group][rating-1]} onSave={seconds=>{const next=[...values[group]] as [number,number,number];next[rating-1]=seconds;save({interval_version:1,intervals:{...values,[group]:next}});}}/>;})}</section>)}
            <section aria-label={t('speech.settings')} className="space-y-3">
              <h3 className="font-semibold">{t('deck.presentation')}</h3>
              <label className="flex items-center justify-between gap-3">{t('speech.automatic')}<input type="checkbox" aria-label={t('speech.automatic')} checked={style.auto_speech??true} onChange={event=>save({auto_speech:event.target.checked})}/></label>
              <label className="flex flex-wrap items-center justify-between gap-3">{t('speech.rate')}<input key={style.id+String(style.speech_rate)} aria-label={t('speech.rate')} type="number" min="0.5" max="2" step="0.1" defaultValue={style.speech_rate??0.9} className={control+' w-24'} onBlur={event=>{const value=event.target.value.trim()?Number(event.target.value):NaN;if(value!==(style.speech_rate??0.9))save({speech_rate:value});}} onKeyDown={event=>{if(event.key==='Enter')event.currentTarget.blur();}}/></label>
            </section>

      </>}
    </fieldset>
    {modeHelp&&<ModalDialog onDismiss={()=>setModeHelp(false)} dismissOnBackdrop returnFocusRef={modeHelpTrigger} aria-label={t('study.modeHelp')} className="fixed inset-0 m-auto max-h-[85dvh] w-[min(92vw,28rem)] overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-5 text-[var(--color-text)] shadow-xl backdrop:bg-black/45"><h3 className="mb-3 font-semibold">{t('study.modeHelp')}</h3><p>{t('study.endlessHint')}</p><button autoFocus type="button" className="mt-4 min-h-11 rounded-lg border px-4" onClick={()=>setModeHelp(false)}>{t('home.close')}</button></ModalDialog>}
    <p role="status">{busy?t('study.savingSettings'):t('study.savedSettings')}</p>
  </section>;
}
