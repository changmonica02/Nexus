"use client";
import { useEffect, useRef, useState } from "react";
import { getSupabase } from "../../infrastructure/supabase/client";
import { usePaginationLanguage } from "../../lib/LanguageContext";
import {
  continueExport,
  createExportJob,
  downloadDictionaryJSON,
  exportDocument,
  loadExportJob,
  type ExportJob,
} from "./exchangeExport";
import type { ExchangeScope } from "./dictionaryExchange";
export default function DictionaryExchangeExport({
  scope,
  onBusy,
}: {
  scope: ExchangeScope;
  onBusy: (b: boolean) => void;
}) {
  const { t } = usePaginationLanguage();
  const [owner, setOwner] = useState(""),
    [job, setJob] = useState<ExportJob | null>(null),
    [subset, setSubset] = useState("current"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null);
  useEffect(() => {
    let active = true;
    void getSupabase()!
      .auth.getUser()
      .then(async ({ data, error }) => {
        if (error || !data.user) throw Error("Sign in again");
        const saved = await loadExportJob(data.user.id);
        if (active) {
          setOwner(data.user.id);
          setJob(saved);
        }
      })
      .catch((e) => {
        if (active) setError(String(e));
      });
    return () => {
      active = false;
      controller.current?.abort();
    };
  }, []);
  async function run(resume = false) {
    setBusy(true);
    onBusy(true);
    setError("");
    controller.current = new AbortController();
    try {
      const initial =
        resume && job
          ? job
          : await createExportJob(
              owner,
              subset === "all" ? { kinds: [], statuses: [], query: "" } : scope,
            );
      setJob(initial);
      const complete = await continueExport(
        getSupabase()!,
        initial,
        setJob,
        controller.current.signal,
      );
      setJob(complete);
      if (complete.complete)
        downloadDictionaryJSON(
          await exportDocument(complete),
          "nexus-dictionary-exchange-v1.json",
        );
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
      onBusy(false);
    }
  }
  const button = "rounded border px-3 py-2 text-sm disabled:opacity-40";
  return (
    <section className="space-y-4">
      <p>{t("exchange.formatHint")}</p>
      <label>
        {t("exchange.scope")}
        <select
          aria-label={t("exchange.scope")}
          disabled={busy}
          className="ml-2 rounded border bg-transparent p-2"
          value={subset}
          onChange={(e) => setSubset(e.target.value)}
        >
          <option value="current">{t("exchange.current")}</option>
          <option value="all">{t("exchange.all")}</option>
        </select>
      </label>
      <p className="text-xs opacity-70">{t("exchange.versionHint")}</p>
      <button
        type="button"
        disabled={busy || !owner}
        className={button}
        onClick={() => void run()}
      >
        {t("exchange.startExport")}
      </button>
      {job && (
        <>
          <p role="status">
            {t("exchange.exportProgress", {
              done: job.processed,
              total: job.total,
            })}
          </p>
          {job.complete ? (
            <button
              type="button"
              className={button}
              onClick={() =>
                void exportDocument(job)
                  .then((doc) =>
                    downloadDictionaryJSON(
                      doc,
                      "nexus-dictionary-exchange-v1.json",
                    ),
                  )
                  .catch((e) => setError(String(e)))
              }
            >
              {t("exchange.download")}
            </button>
          ) : (
            <button
              type="button"
              disabled={busy || !owner}
              className={button}
              onClick={() => void run(true)}
            >
              {t("exchange.resumeExport")}
            </button>
          )}
        </>
      )}
      {busy && (
        <button
          type="button"
          className={button}
          onClick={() => controller.current?.abort()}
        >
          {t("exchange.pause")}
        </button>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
