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
  previewExport,
  type ExportJob,
} from "./exchangeExport";
import { exchangeTransferAvailable } from "./persistentImport";
import type { ExchangeScope } from "./dictionaryExchange";
const allKinds = ["word", "prefix", "root", "suffix"];
export default function DictionaryExchangeExport({
  onBusy,
}: {
  scope: ExchangeScope;
  onBusy: (busy: boolean) => void;
}) {
  const { t } = usePaginationLanguage();
  const [owner, setOwner] = useState(""),
    [job, setJob] = useState<ExportJob | null>(null),
    [kinds, setKinds] = useState(allKinds),
    [pending, setPending] = useState(false),
    [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [preview, setPreview] = useState<{
      total: number;
      scope_version: string;
    } | null>(null);
  const controller = useRef<AbortController | null>(null),
    running = useRef(false);
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const client = getSupabase()!;
        const { data, error } = await client.auth.getUser();
        if (error || !data.user) throw Error(t("transfer.signIn"));
        const [saved, available] = await Promise.all([
          loadExportJob(data.user.id),
          exchangeTransferAvailable(client),
        ]);
        if (active) {
          setOwner(data.user.id);
          setJob(saved);
          setReady(available);
        }
      } catch (e) {
        if (active) setError(String(e));
      }
    })();
    return () => {
      active = false;
      controller.current?.abort();
    };
  }, [t]);
  useEffect(() => {
    let active = true;
    if (ready && kinds.length)
      void previewExport(getSupabase()!, {
        kinds,
        statuses: [],
        query: "",
        pending_only: pending,
      })
        .then((v) => {
          if (active) setPreview(v);
        })
        .catch((e) => {
          if (active) setError(String(e));
        });
    return () => {
      active = false;
    };
  }, [ready, kinds, pending]);
  async function run(resume = false) {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    onBusy(true);
    setError("");
    controller.current = new AbortController();
    try {
      if (!owner) throw Error(t("transfer.signIn"));
      if (!resume && !preview) throw Error(t("transfer.previewRequired"));
      const initial =
        resume && job
          ? job
          : await createExportJob(
              owner,
              { kinds, statuses: [], query: "", pending_only: pending },
              preview ?? undefined,
            );
      setJob(initial);
      const result = await continueExport(
        getSupabase()!,
        initial,
        setJob,
        controller.current.signal,
      );
      setJob(result);
      if (result.complete)
        downloadDictionaryJSON(
          await exportDocument(result),
          "nexus-dictionary-exchange-v1.json",
        );
    } catch (e) {
      setError(String(e));
    } finally {
      running.current = false;
      setBusy(false);
      onBusy(false);
    }
  }
  const button = "rounded border px-3 py-2 text-sm disabled:opacity-40";
  return (
    <section className="min-w-0 space-y-3">
      <fieldset disabled={busy} className="space-y-2">
        <legend className="text-sm">{t("exchange.scope")}</legend>
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={allKinds.every(kind=>kinds.includes(kind))}
              ref={(el) => {
                if (el) el.indeterminate = kinds.length > 0 && kinds.length < 3;
              }}
              onChange={(e) => {
                setPreview(null);
                setKinds(e.target.checked ? allKinds : []);
              }}
            />
            {t("transfer.allTypes")}
          </label>
          {allKinds.map((kind) => (
            <label key={kind} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={kinds.includes(kind)}
                onChange={(e) => {
                  setPreview(null);
                  setKinds(
                    e.target.checked
                      ? allKinds.filter((k) => k === kind || kinds.includes(k))
                      : kinds.filter((k) => k !== kind),
                  );
                }}
              />
              {t("ui." + kind)}
            </label>
          ))}
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={!pending}
              onChange={() => {
                setPreview(null);
                setPending(false);
              }}
            />
            {t("transfer.allStatuses")}
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={pending}
              onChange={(e) => {
                setPreview(null);
                setPending(e.target.checked);
              }}
            />
            {t("transfer.pending")}
          </label>
        </div>
      </fieldset>
      {!ready && owner && (
        <p role="status">{t("transfer.migrationRequired")}</p>
      )}
      {preview && (
        <p role="status">
          {kinds.map((k) => t("ui." + k)).join(" · ")} ·{" "}
          {t(pending ? "transfer.pending" : "transfer.allStatuses")} ·{" "}
          {preview.total} {t("persistent.entries")}
        </p>
      )}
      <button
        className={button}
        disabled={busy || !owner || !preview || !kinds.length}
        onClick={() => void run()}
      >
        {t("exchange.startExport")}
      </button>
      {job && (
        <div className="space-y-2">
          <p role="status">
            {t("exchange.exportProgress", {
              done: job.processed,
              total: job.total,
            })}{" "}
            · {job.scope.kinds.map((k) => t("ui." + k)).join(" · ")} ·{" "}
            {t(
              job.scope.pending_only
                ? "transfer.pending"
                : "transfer.allStatuses",
            )}
          </p>
          {job.complete ? (
            <button
              className={button}
              disabled={busy}
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
              className={button}
              disabled={busy || !owner}
              onClick={() => void run(true)}
            >
              {t("exchange.resumeExport")}
            </button>
          )}
        </div>
      )}
      {busy && (
        <button className={button} onClick={() => controller.current?.abort()}>
          {t("exchange.pause")}
        </button>
      )}
      {error && (
        <p role="alert" className="break-words">
          {error}
        </p>
      )}
    </section>
  );
}
