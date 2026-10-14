"use client";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Page } from "../../../lib/types";
import { useLanguage } from "../../../lib/LanguageContext";
import type { StudyRepository } from "../StudyRepository";
import type { StudyStyle } from "../studyStyles";

export const StudyPreferencesContext = createContext<{
  repository: StudyRepository;
  decks: Page[];
  activeDeckId?: string;
} | null>(null);
export function StudyPreferencesProvider({
  getRepository,
  decks,
  activeDeckId,
  children,
}: {
  getRepository: () => StudyRepository;
  decks: Page[];
  activeDeckId?: string;
  children: React.ReactNode;
}) {
  const [repository] = useState(getRepository);
  const value = useMemo(
    () => ({ repository, decks, activeDeckId }),
    [repository, decks, activeDeckId],
  );
  return (
    <StudyPreferencesContext.Provider value={value}>
      {children}
    </StudyPreferencesContext.Provider>
  );
}
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
export default function StudyPreferences() {
  const context = useContext(StudyPreferencesContext),
    { t } = useLanguage();
  const [deck, setDeck] = useState(
      context?.activeDeckId ?? context?.decks[0]?.id ?? "",
    ),
    [styles, setStyles] = useState<StudyStyle[]>([]),
    [editing, setEditing] = useState(""),
    [assigned, setAssigned] = useState(""),
    [notice, setNotice] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const deckId = context?.decks.some((d) => d.id === deck)
    ? deck
    : (context?.decks[0]?.id ?? "");
  useEffect(() => {
    if (!context) return;
    let active = true;
    const read = async () => {
      try {
        if (deckId) {
          await context.repository.ensureDeck(
            context.decks.find((d) => d.id === deckId)!,
          );
          const value = await context.repository.styleForDeck(deckId);
          if (active) {
            setAssigned(value.style.id);
            setNotice(value.notice);
            setEditing((old) => old || value.style.id);
          }
        }
        const values = await context.repository.listStyles();
        if (active) {
          setStyles(values);
          setEditing((old) => old || values[0]?.id || "");
        }
      } catch (e) {
        if (active) setError(String(e));
      }
    };
    void read();
    window.addEventListener("nexus-study-changed", read);
    return () => {
      active = false;
      window.removeEventListener("nexus-study-changed", read);
    };
  }, [context, deckId]);
  const style = styles.find((s) => s.id === editing),
    control =
      "max-w-full min-w-0 rounded border bg-transparent px-3 py-2 text-sm";
  const run = async (work: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await work();
      setStyles(await context!.repository.listStyles());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };
  const save = (patch: Partial<StudyStyle>) => {
    if (style)
      void run(() => context!.repository.saveStyle({ ...style, ...patch }));
  };
  const count = (
    key: "review_limit" | "new_limit" | "new_pause_threshold",
    label: string,
    min: number,
  ) => (
    <label className="flex flex-wrap items-center justify-between gap-3">
      {label}
      <input
        key={style!.id + key + style![key]}
        aria-label={label}
        className={control + " w-24"}
        type="number"
        min={min}
        max={10000}
        defaultValue={style![key]}
        onBlur={(e) => {
          const n = e.target.value.trim() ? Number(e.target.value) : NaN;
          if (n !== style![key]) save({ [key]: n });
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
      />
    </label>
  );
  if (!context) return <p>{t("study.noDeck")}</p>;
  return (
    <section className="space-y-5 text-sm">
      {context.decks.length > 0 && (
        <>
          <label className="flex flex-wrap justify-between gap-3">
            {t("study.deck")}
            <select
              aria-label={t("study.deck")}
              className={control}
              value={deckId}
              disabled={busy}
              onChange={(e) => setDeck(e.target.value)}
            >
              {context.decks.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title || t("common.untitled")}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-wrap justify-between gap-3">
            {t("styles.assignment")}
            <select
              aria-label={t("styles.assignment")}
              className={control}
              value={assigned}
              disabled={busy}
              onChange={(e) => {
                const id = e.target.value;
                void run(async () => {
                  await context.repository.assignStyle(deckId, id);
                  setAssigned(id);
                  setNotice(false);
                });
              }}
            >
              {styles.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        </>
      )}
      {notice && <p role="status">{t("styles.migrated")}</p>}
      <p>{t("styles.scope")}</p>
      {error && <p role="alert">{error}</p>}
      <fieldset disabled={busy} className="space-y-5">
        <label className="flex flex-wrap justify-between gap-3">
          {t("styles.edit")}
          <select
            aria-label={t("styles.edit")}
            className={control}
            value={editing}
            onChange={(e) => setEditing(e.target.value)}
          >
            {styles.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        {!style ? (
          <p role="status">{t("common.loading")}</p>
        ) : (
          <>
            <label className="flex flex-wrap justify-between gap-3">
              {t("styles.name")}
              <input
                key={style.id + style.name}
                aria-label={t("styles.name")}
                className={control}
                defaultValue={style.name}
                onBlur={(e) => {
                  if (e.target.value !== style.name)
                    save({ name: e.target.value });
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                }}
              />
            </label>
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
          </>
        )}
      </fieldset>
      <p role="status">
        {busy ? t("study.savingSettings") : t("study.savedSettings")}
      </p>
      <button
        className={control}
        disabled={busy || !style}
        onClick={() =>
          void run(async () => {
            const created = {
              ...structuredClone(style!),
              id: "study-style:" + crypto.randomUUID(),
              name: t("styles.custom") + " " + styles.length,
            };
            await context.repository.saveStyle(created);
            setEditing(created.id);
          })
        }
      >
        {t("styles.add")}
      </button>
    </section>
  );
}
