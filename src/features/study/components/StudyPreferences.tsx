"use client";
import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../../../lib/LanguageContext';
import type { StudyRepository } from '../StudyRepository';
import type { StudyStyle } from '../studyStyles';

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
    <h2 className="text-lg font-semibold">{t('deck.schedule')}</h2><p className="opacity-65">{t('deck.scope')}</p>
    {error&&<p role="alert">{error}</p>}
    <fieldset disabled={busy} className="space-y-5">
      {!style?<p>{t('common.loading')}</p>:<>
            <label className="flex flex-wrap justify-between gap-3">
              {t("study.mode")}
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
            </label>
            <label className="flex flex-wrap justify-between gap-3">
              {t("styles.method")}
              <select
                aria-label={t("styles.method")}
                className={control}
                value={style.scheduling_method}
                onChange={(e) =>
                  save({
                    scheduling_method: e.target
                      .value as StudyStyle["scheduling_method"],
                  })
                }
              >
                <option value="fsrs">FSRS-6</option>
                <option value="fixed">{t("styles.fixed")}</option>
              </select>
            </label>
            <p>{t("styles.switch")}</p>
            {count("review_limit", t("study.batchLimit"), 1)}
            <p>{t("study.batchHint")}</p>
            {count("new_limit", t("study.newLimit"), 0)}
            <p>{t("study.newHint")}</p>
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
                {(["due", "retrievability", "random"] as const).map((v) => (
                  <option key={v} value={v}>
                    {t("study." + v)}
                  </option>
                ))}
              </select>
            </label>
            {(["new", "relearning", "review"] as const).map((kind) => (
              <section key={kind} className="space-y-3">
                <h3 className="font-semibold">{t("styles." + kind)}</h3>
                {([4, 3, 2, 1] as const).map((r) => (
                  <IntervalInput
                    key={
                      style.id + kind + r + style.fixed_intervals[kind][r - 1]
                    }
                    label={t("styles." + kind) + " · " + t("styles.answer" + r)}
                    seconds={style.fixed_intervals[kind][r - 1]}
                    onSave={(seconds) => {
                      const values = [...style.fixed_intervals[kind]] as [
                        number,
                        number,
                        number,
                        number,
                      ];
                      values[r - 1] = seconds;
                      save({
                        fixed_intervals: {
                          ...style.fixed_intervals,
                          [kind]: values,
                        },
                      });
                    }}
                  />
                ))}
              </section>
            ))}
            <p>{t("study.endlessHint")}</p>
      </>}
    </fieldset>
    <p role="status">{busy?t('study.savingSettings'):t('study.savedSettings')}</p>
  </section>;
}
