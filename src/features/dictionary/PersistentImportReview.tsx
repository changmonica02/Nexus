"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { getSupabase } from "../../infrastructure/supabase/client";
import { confirmDialog } from "../../lib/confirmDialog";
import { usePaginationLanguage } from "../../lib/LanguageContext";
import { Pagination } from "../../components/pagination/Pagination";
import {
  loadImportSession,
  persistImportSession,
  archiveImportSession,
  loadArchivedImportSession,
  listArchivedImportSessions,
} from "./importSessionStore";
import { downloadDictionaryJSON } from "./exchangeExport";
import type { ImportSession } from "./importReview";
import { previewImportSource } from "./importSource";
import {
  applyPersistentRecords,
  persistentOutcome,
  persistentImportAvailable,
  recheckPersistent,
  reviewRPC,
  stagePersistentSession,
  type ImportReviewRecord,
} from "./persistentImport";
const button = "rounded border px-3 py-2 text-sm disabled:opacity-40";
export function PersistentImportReview({
  raw,
  format,
  sourceName,
  onSaved,
  onBusy,
}: {
  raw: string;
  format: "csv" | "json" | "md";
  sourceName?: string;
  onSaved: () => Promise<unknown>;
  onBusy: (v: boolean) => void;
}) {
  const { t } = usePaginationLanguage(),
    controller = useRef<AbortController | null>(null);
  const [archives, setArchives] = useState<
    Awaited<ReturnType<typeof listArchivedImportSessions>>
  >([]);
  const [session, setSession] = useState<ImportSession | null>(null),
    [records, setRecords] = useState<ImportReviewRecord[]>([]),
    [legacy, setLegacy] = useState<ImportSession | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [progress, setProgress] = useState("");
  useEffect(() => {
    let active = true;
    void getSupabase()!
      .auth.getUser()
      .then(async ({ data }) => {
        if (data.user) {
          const saved = await loadImportSession(data.user.id);
          const archiveList = await listArchivedImportSessions(data.user.id);
          if (active) setArchives(archiveList);
          const previous = saved?.durable_review
            ? await loadArchivedImportSession(data.user.id)
            : saved;
          if (active) {
            if (saved?.durable_review) setSession(saved);
            setLegacy(previous);
          }
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
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    onBusy(true);
    setError("");
    controller.current = new AbortController();
    try {
      await fn();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
      onBusy(false);
    }
  };
  const stage = async (s: ImportSession) => {
    const rows = await stagePersistentSession(
      getSupabase()!,
      s,
      s.source_name || sourceName || t("persistent.pasted"),
      (done, total) => setProgress(`${done} / ${total}`),
      controller.current?.signal,
    );
    setRecords(rows);
    return rows;
  };
  const apply = async () => {
    if (
      !session ||
      !(await confirmDialog({
        title: t("persistent.import"),
        message: t("persistent.confirm"),
        confirmLabel: t("persistent.import"),
      }))
    )
      return;
    const rows = await stage(session);
    const results = await applyPersistentRecords(
      getSupabase()!,
      rows,
      false,
      controller.current?.signal,
      (r) => {
        setRecords((old) => old.map((x) => (x.id === r.id ? r : x)));
      },
    );
    setRecords((old) =>
      old.map((r) => results.find((x) => x.id === r.id) ?? r),
    );
    await onSaved();
  };
  return (
    <section className="space-y-3">
      <p>{t("persistent.summaryHint")}</p>
      <button
        className={button}
        disabled={busy || !raw}
        onClick={() =>
          void run(async () => {
            const { data } = await getSupabase()!.auth.getUser();
            if (!data.user) throw Error("Sign in required");
            if (format === "json") {
              const possible = JSON.parse(raw.replace(/^\uFEFF/, ""));
              if (
                possible?.owner_id &&
                Array.isArray(possible.items) &&
                possible.preview_at &&
                possible.id
              ) {
                if (possible.owner_id !== data.user.id)
                  throw Error("Import Session belongs to another account");
                if (session && session.id !== possible.id)
                  await archiveImportSession(session);
                if (legacy && legacy.id !== possible.id)
                  await archiveImportSession(legacy);
                await archiveImportSession(possible);
                setSession(null);
                setLegacy(possible);
                setArchives(await listArchivedImportSessions(data.user.id));
                return;
              }
            }
            if (
              legacy &&
              !(await confirmDialog({
                title: t("persistent.backupLegacy"),
                message: t("persistent.backupBeforeReplace"),
                confirmLabel: t("persistent.analyze"),
              }))
            )
              return;
            const next = {
              ...(await previewImportSource(
                getSupabase()!,
                data.user.id,
                raw,
                format,
                (n, total) => setProgress(`${n} / ${total}`),
              )),
              durable_review: true as const,
              source_name: sourceName,
            };
            if (legacy) await archiveImportSession(legacy);
            if (session && session.id !== legacy?.id)
              await archiveImportSession(session);
            setArchives(await listArchivedImportSessions(data.user.id));
            await persistImportSession(next);
            setSession(next);
          })
        }
      >
        {t("persistent.analyze")}
      </button>
      {session && (
        <>
          <p>
            {sourceName || t("persistent.pasted")} · {session.items.length}{" "}
            {t("persistent.entries")} ·{" "}
            {session.items.filter((i) => i.issues.length).length}{" "}
            {t("persistent.withDifferences")}
          </p>
          <button
            className={button}
            disabled={busy}
            onClick={() => void run(apply)}
          >
            {t("persistent.import")}
          </button>
        </>
      )}
      {busy && (
        <button className={button} onClick={() => controller.current?.abort()}>
          {t("exchange.pause")}
        </button>
      )}
      <p role="status">{progress}</p>
      {records.length > 0 && (
        <>
          <p>
            {t("persistent.processed", {
              n: records.filter(
                (r) =>
                  r.result?.status === "applied" ||
                  ["applied", "unchanged"].includes(r.item.status),
              ).length,
              total: records.length,
            })}{" "}
            ·{" "}
            {t("persistent.pending", {
              n: records.reduce((n, r) => n + r.pending_count, 0),
            })}
          </p>
          <ul className="space-y-1">
            {records.slice(0, 50).map((r) => (
              <li key={r.id}>
                {r.item.draft.headword} ·{" "}
                {t("persistent.result." + persistentOutcome(r))} ·{" "}
                {t("persistent.pending", { n: r.pending_count })}
              </li>
            ))}
          </ul>
          <button
            className={button}
            onClick={() =>
              downloadDictionaryJSON(
                {
                  format: "nexus-persistent-import-results",
                  records: records.map((r) => ({
                    ...r,
                    outcome: persistentOutcome(r),
                  })),
                },
                "dictionary-import-results.json",
              )
            }
          >
            {t("exchange.report")}
          </button>
        </>
      )}
      {archives.length > 0 && (
        <label>
          {t("persistent.archives")}
          <select
            aria-label={t("persistent.archives")}
            className="max-w-full rounded border bg-transparent p-2"
            value={legacy?.id ?? ""}
            disabled={busy}
            onChange={(e) =>
              void run(async () => {
                const id = e.target.value;
                const { data } = await getSupabase()!.auth.getUser();
                if (data.user)
                  setLegacy(await loadArchivedImportSession(data.user.id, id));
              })
            }
          >
            <option value="">—</option>
            {archives.map((a) => (
              <option key={a.id} value={a.id}>
                {a.source_name ?? a.source_type} · {a.preview_at}
              </option>
            ))}
          </select>
        </label>
      )}
      {legacy && (
        <details>
          <summary>{t("persistent.legacy")}</summary>
          <p>
            {legacy.items.length} {t("persistent.entries")} ·{" "}
            {legacy.preview_at} · {t("persistent.preserveLocal")}
          </p>
          <button
            className={button}
            disabled={busy}
            onClick={() =>
              downloadDictionaryJSON(
                legacy,
                "dictionary-legacy-import-session.json",
              )
            }
          >
            {t("persistent.backupLegacy")}
          </button>
          <button
            className={button}
            disabled={busy}
            onClick={() =>
              void run(async () => {
                if (
                  !(await confirmDialog({
                    title: t("persistent.transfer"),
                    message: t("persistent.preserveLocal"),
                    confirmLabel: t("persistent.transfer"),
                  }))
                )
                  return;
                await stage(legacy);
                await onSaved();
              })
            }
          >
            {t("persistent.transfer")}
          </button>
        </details>
      )}
      <Link className="underline" href="/dictionary/admin?review=all">
        {t("persistent.openQueue")}
      </Link>
      {error && (
        <p role="alert" className="whitespace-pre-wrap break-words">
          {error}
        </p>
      )}
    </section>
  );
}
export function PersistentReviewPanel({
  entryId,
  onChanged, compact=false,
}: {
  compact?:boolean;
  entryId?: string;
  onChanged?: () => void;
}) {
  const { t } = usePaginationLanguage();
  const [records, setRecords] = useState<ImportReviewRecord[]>([]),
    [total, setTotal] = useState(0),
    [page, setPage] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [available, setAvailable] = useState(false),
    [epoch, setEpoch] = useState(0),
    [notice, setNotice] = useState("");
  const refresh = () => {
    setEpoch((e) => e + 1);
    onChanged?.();
  };
  useEffect(() => {
    let active = true;
    const c = getSupabase();
    if (!c) return;
    void (async () => {
      try {
        if (!(await persistentImportAvailable(c))) return;
        const result = await reviewRPC<{
          items: ImportReviewRecord[];
          total: number;
        }>(c, "get_dictionary_import_reviews", {
          entry_key: entryId ?? null,
          page_number: page,
        });
        if (active) {
          const last = Math.max(0, Math.ceil(result.total / 50) - 1);
          if (page > last) {
            setPage(last);
            return;
          }
          setAvailable(true);
          setRecords(result.items);
          setTotal(result.total);
        }
      } catch (e) {
        if (active) setError(String(e));
      }
    })();
    return () => {
      active = false;
    };
  }, [entryId, page, epoch]);
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
      refresh();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };
  if (!available)
    return error ? (
      <p role="alert">
        {error}
        <button onClick={refresh}>{t("persistent.reload")}</button>
      </p>
    ) : null;
  if(compact){
    if(!total&&!error)return null;
    return <aside className="flex flex-wrap items-center gap-2 py-2 text-sm" aria-label={t('persistent.queue')}>{error?<span role="alert">{error}</span>:<span>{t('persistent.red')}</span>}<a className="underline" href={'/dictionary/admin?review='+encodeURIComponent(entryId??'')}>{t('persistent.openQueue')}</a>{error&&<button onClick={refresh}>{t('persistent.reload')}</button>}</aside>;
  }
  return (
    <section className="min-w-0 space-y-3 rounded border p-3">
      <button className={button} disabled={busy} onClick={refresh}>
        {t("persistent.reload")}
      </button>
      <h2 className="font-semibold">
        {t("persistent.queue")} · {total}
      </h2>
      {error && (
        <p role="alert" className="break-words">
          {error}
          <button className={button} onClick={refresh}>
            {t("persistent.reload")}
          </button>
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      {records.map((r) => (
        <article key={r.id} className="space-y-3 border-t py-3">
          <h3>
            {r.item.draft.headword} ·{" "}
            {t("persistent.pending", { n: r.pending_count })}
          </h3>
          <p className="break-all text-xs">
            {String(r.source.name)} · {String(r.source.preview_at)} · Entry{" "}
            {r.entry_id}
          </p>
          <p>{String(r.result?.message ?? "")}</p>
          {r.item.issues.map((i) => (
            <div key={i.id} className="space-y-2 rounded border p-2">
              <p>
                {i.type} · {i.field} · {i.reason}
              </p>
              <p className="break-all text-xs">
                Sense {String(i.sense_id ?? "—")} · {t("persistent.dependency")}{" "}
                · {i.dependency_group}
              </p>
              <div className="grid min-w-0 gap-2 sm:grid-cols-2">
                <pre className="whitespace-pre-wrap break-words text-xs">
                  {t("exchange.existing")}：
                  {JSON.stringify(i.existing, null, 2)}
                </pre>
                <pre className="whitespace-pre-wrap break-words text-xs">
                  {t("exchange.incoming")}：
                  {JSON.stringify(i.incoming, null, 2)}
                </pre>
              </div>
              <p role="status">
                {i.applied
                  ? t("persistent.applied")
                  : i.selectedAction
                    ? t("persistent.decided")
                    : t("persistent.undecided")}
              </p>
              <select
                className="max-w-full rounded border bg-transparent p-2"
                aria-label={t("persistent.decision") + " " + i.field}
                value={i.selectedAction ?? ""}
                disabled={busy || i.applied}
                onChange={(e) => {
                  const decision = e.target.value;
                  if (decision)
                    void run(() =>
                      reviewRPC(
                        getSupabase()!,
                        "decide_dictionary_import_review",
                        {
                          review_item_id: r.id,
                          expected_revision: r.revision,
                          issue_id: i.id,
                          decision,
                        },
                      ),
                    );
                }}
              >
                <option value="">{t("exchange.chooseAction")}</option>
                {i.allowedActions.map((a) => (
                  <option key={a} value={a}>
                    {t("exchange.action." + a)}
                  </option>
                ))}
              </select>
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            <button
              className={button}
              disabled={busy}
              onClick={() =>
                void run(() => recheckPersistent(getSupabase()!, r))
              }
            >
              {t("exchange.recheck")}
            </button>
            <button
              className={button}
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  if (
                    await confirmDialog({
                      title: t("persistent.applyDecided"),
                      message: t("persistent.confirmDecisions"),
                      confirmLabel: t("persistent.applyDecided"),
                    })
                  ) {
                    const results = await applyPersistentRecords(
                      getSupabase()!,
                      [r],
                      true,
                    );
                    setNotice(
                      results
                        .map((result) =>
                          t("persistent.result." + persistentOutcome(result)),
                        )
                        .join(" · "),
                    );
                  }
                })
              }
            >
              {t("persistent.applyDecided")}
            </button>
            {r.item.context?.snapshot && (
              <Link
                className={button}
                href={`/dictionary/admin?entry=${encodeURIComponent(r.entry_id)}`}
              >
                {t("persistent.editor")}
              </Link>
            )}
          </div>
          <details>
            <summary>{t("persistent.original")}</summary>
            <pre className="whitespace-pre-wrap break-words text-xs">
              {JSON.stringify(
                r.item.raw_candidate ?? r.item.original ?? r.item.draft,
                null,
                2,
              )}
            </pre>
          </details>
        </article>
      ))}
      <Pagination
        label={t("persistent.queue")}
        page={page}
        total={total}
        pageSize={50}
        disabled={busy}
        onPageChange={setPage}
      />
      <button
        className={button}
        disabled={busy || !records.length}
        onClick={() =>
          void run(async () => {
            if (
              await confirmDialog({
                title: t("persistent.resume"),
                message: t("persistent.confirm"),
                confirmLabel: t("persistent.resume"),
              })
            ) {
              const all: ImportReviewRecord[] = [];
              for (let n = 0; ; n++) {
                const batch = await reviewRPC<{
                  items: ImportReviewRecord[];
                  total: number;
                }>(getSupabase()!, "get_dictionary_import_reviews", {
                  entry_key: entryId ?? null,
                  page_number: n,
                });
                all.push(...batch.items);
                if (all.length >= batch.total || batch.items.length === 0)
                  break;
              }
              await applyPersistentRecords(getSupabase()!, [
                ...new Map(all.map((r) => [r.id, r])).values(),
              ]);
            }
          })
        }
      >
        {t("persistent.resume")}
      </button>
    </section>
  );
}
