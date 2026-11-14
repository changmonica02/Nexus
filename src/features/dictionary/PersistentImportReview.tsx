"use client";
import {
  reviewFailure,
  reviewFailureText,
  type ReviewFailure,
} from "./reviewApproval";
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
  importSafety,
  persistentPreview,
  exchangeTransferAvailable,
  applyDecidedImportRecord,
  persistentOutcome,
  persistentImportAvailable,
  recheckPersistent,
  reviewRPC,
  stagePersistentSession,
  type ImportReviewRecord,
} from "./persistentImport";
import { DictionaryModal } from "./DictionaryModal";
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
  onBusy: (busy: boolean) => void;
}) {
  const { t } = usePaginationLanguage();
  const [session, setSession] = useState<ImportSession | null>(null),
    [records, setRecords] = useState<ImportReviewRecord[]>([]),
    [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [progress, setProgress] = useState(""),
    [ready, setReady] = useState(false),
    [pages, setPages] = useState<Record<string, number>>({}),
    [archives, setArchives] = useState<
      Awaited<ReturnType<typeof listArchivedImportSessions>>
    >([]),
    [legacy, setLegacy] = useState<ImportSession | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const controller = useRef<AbortController | null>(null),
    running = useRef(false);
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const client = getSupabase()!;
        const { data, error } = await client.auth.getUser();
        if (error || !data.user) throw Error(t("transfer.signIn"));
        const [saved, available, archived] = await Promise.all([
          loadImportSession(data.user.id),
          exchangeTransferAvailable(client),
          listArchivedImportSessions(data.user.id),
        ]);
        if (active) {
          if (saved?.durable_review) setSession(saved);
          else setLegacy(saved);
          setReady(available);
          setArchives(archived);
        }
      } catch (e) {
        if (active) setError(reviewFailureText(e, t));
      }
    })();
    return () => {
      active = false;
      controller.current?.abort();
    };
  }, [t]);
  const run = async (fn: () => Promise<void>) => {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    onBusy(true);
    setError("");
    controller.current = new AbortController();
    try {
      await fn();
    } catch (e) {
      setError(reviewFailureText(e, t));
    } finally {
      running.current = false;
      setBusy(false);
      onBusy(false);
    }
  };
  const persist = async (next: ImportSession) => {
    await persistImportSession(next);
    setSession(structuredClone(next));
  };
  const analyze = async () => {
    const client = getSupabase()!;
    const { data, error } = await client.auth.getUser();
    if (error || !data.user) throw Error(t("transfer.signIn"));
    if (format === "json") {
      const value = JSON.parse(raw.replace(/^\uFEFF/, ""));
      if (
        value?.owner_id &&
        Array.isArray(value.items) &&
        value.id &&
        value.preview_at
      ) {
        if (value.owner_id !== data.user.id)
          throw Error(t("transfer.otherAccount"));
        await archiveImportSession(value);
        setLegacy(value);
        setArchives(await listArchivedImportSessions(data.user.id));
        return;
      }
    }
    if (session) await archiveImportSession(session);
    if (legacy) await archiveImportSession(legacy);
    const next = persistentPreview({
      ...(await previewImportSource(
        client,
        data.user.id,
        raw,
        format,
        (n, total) => setProgress(`${n} / ${total}`),
      )),
      durable_review: true,
      source_name: sourceName,
    });
    await persist(next);
    setRecords([]);
    setPages({});
    setExpanded({});
    setOpen(true);
    setArchives(await listArchivedImportSessions(data.user.id));
  };
  const eligible = (item: ImportSession["items"][number]) =>
    !item.excluded &&
    !["applied", "unchanged", "skipped"].includes(item.status) &&
    importSafety(item) !== "invalid";
  const apply = async (all: boolean, only?: string) => {
    if (!session || !ready) return;
    const items = session.items.filter(
      (i) =>
        eligible(i) &&
        (!only || i.id === only) &&
        (all || importSafety(i) === "safe"),
    );
    if (!items.length) return;
    const safe = items.filter((i) => importSafety(i) === "safe"),
      review = items.filter((i) => importSafety(i) === "review");
    if (
      !(await confirmDialog({
        title: t(all ? "transfer.importAll" : "transfer.importSafe"),
        message: t("transfer.impact", {
          safe: safe.length,
          review: review.length,
        }),
        confirmLabel: t(all ? "transfer.importAll" : "transfer.importSafe"),
      }))
    )
      return;
    const client = getSupabase()!,
      staged = await stagePersistentSession(
        client,
        { ...session, items },
        session.source_name || sourceName || t("persistent.pasted"),
        (n, total) => setProgress(`${n} / ${total}`),
        controller.current?.signal,
      );
    setRecords((previous) => [
      ...previous.filter((r) => !staged.some((n) => n.id === r.id)),
      ...staged,
    ]);
    const safeEntries = new Set(safe.map((i) => i.draft.entry_id));
    const update = (row: ImportReviewRecord) =>
      setRecords((previous) =>
        previous.map((r) => (r.id === row.id ? row : r)),
      );
    const results = [
      ...(await applyPersistentRecords(
        client,
        staged.filter(
          (r) => safeEntries.has(r.entry_id) && importSafety(r.item) === "safe",
        ),
        false,
        controller.current?.signal,
        update,
        true,
      )),
      ...(await applyPersistentRecords(
        client,
        staged.filter(
          (r) =>
            !safeEntries.has(r.entry_id) || importSafety(r.item) !== "safe",
        ),
        false,
        controller.current?.signal,
        update,
      )),
    ];
    setRecords((previous) =>
      previous.map((r) => results.find((n) => n.id === r.id) ?? r),
    );
    // Failed/unknown outcomes retain their durable row and proposal. Original RPC recovery checks status before retry.
    const byEntry = new Map(
      [...staged, ...results].map((r) => [r.entry_id, r]),
    );
    await persist({
      ...session,
      items: session.items.map((i) => {
        const r = byEntry.get(i.draft.entry_id);
        return r
          ? {
              ...i,
              status: r.item.status,
              message: r.request_conflict ?? r.item.message,
            }
          : i;
      }),
    });
    try {
      await onSaved();
    } catch (e) {
      throw reviewFailure(e, "refresh_dictionary", "refresh");
    }
  };
  const reanalyzeItem = async (id: string) => {
    if (!session) return;
    const old = session.items.find((i) => i.id === id);
    if (!old) return;
    const record = records.find((r) => r.entry_id === old.draft.entry_id);
    if (record) {
      const fresh = await recheckPersistent(getSupabase()!, record);
      setRecords((rows) => rows.map((r) => (r.id === fresh.id ? fresh : r)));
      await persist({
        ...session,
        items: session.items.map((i) =>
          i.id === id ? { ...fresh.item, id } : i,
        ),
      });
    } else await analyze();
  };
  const categories = ["safe", "review", "invalid"] as const;
  return (
    <section className="min-w-0 space-y-3">
      <div className="flex flex-wrap justify-end gap-2">
        <button
          className={button}
          disabled={busy || !raw.trim()}
          onClick={() => void run(analyze)}
        >
          {t("persistent.analyze")}
        </button>
        {session && (
          <button
            className={button}
            disabled={busy}
            onClick={() => setOpen(true)}
          >
            {t("transfer.resumeAnalysis")}
          </button>
        )}
      </div>
      {busy && <p role="status">{progress}</p>}
      {error && !open && <p role="alert">{error}</p>}
      {open && session && (
        <DictionaryModal
          title={t("transfer.analysis")}
          busy={busy}
          onClose={() => setOpen(false)}
          headerActions={
            <details className="max-w-full">
              <summary
                aria-label={t("transfer.classificationHelp")}
                className="cursor-pointer rounded-full border px-2"
              >
                ⓘ
              </summary>
              <div className="space-y-2 py-2 text-sm">
                {categories.map((c) => (
                  <p key={c}>
                    <strong>{t("transfer." + c)}</strong>：
                    {t("transfer.help." + c)}
                  </p>
                ))}
                <p>{t("transfer.notAI")}</p>
              </div>
            </details>
          }
        >
          {!!session.ignored_fields?.length && <div role="status" className="rounded border p-3 text-sm">
            <strong>以下欄位不屬於 Nexus 現行格式，已略過，不會匯入：</strong>
            <ul className="mt-1 list-disc pl-5">{session.ignored_fields.map(field=><li key={field}>{field}</li>)}</ul>
            <p>其他符合格式的資料可繼續匯入。</p>
          </div>}
          <p role="status">
            {t("transfer.total", { n: session.items.length })} ·{" "}
            {t("transfer.new", {
              n: session.items.filter(
                (i) => !i.context?.snapshot && importSafety(i) === "safe",
              ).length,
            })}{" "}
            ·{" "}
            {categories
              .map(
                (c) =>
                  `${t("transfer." + c)} ${session.items.filter((i) => importSafety(i) === c).length}`,
              )
              .join(" · ")}{" "}
            · {t("exchange.unchanged")}{" "}
            {
              session.items.filter(
                (i) => i.safeAction === "unchanged" || i.status === "unchanged",
              ).length
            }
          </p>
          <p className="break-words text-xs opacity-70">
            {session.source_name || t("persistent.pasted")} ·{" "}
            {session.preview_at}
          </p>
          {categories.map((category) => {
            const items = session.items.filter(
                (i) => importSafety(i) === category,
              ),
              page = Math.min(
                pages[category] ?? 0,
                Math.max(0, Math.ceil(items.length / 25) - 1),
              );
            return (
              <details
                open={!!expanded[category]}
                onToggle={(e) => {
                  const open = e.currentTarget.open;
                  setExpanded((old) =>
                    old[category] === open ? old : { ...old, [category]: open },
                  );
                }}
                key={category}
                className="min-w-0 rounded border p-3"
              >
                <summary className="cursor-pointer">
                  {t("transfer." + category)}（{items.length}）
                </summary>
                {expanded[category] && (
                  <AnalysisItems
                    items={items.slice(page * 25, (page + 1) * 25)}
                    session={session}
                    records={records}
                    busy={busy}
                    onExclude={(item, keep) =>
                      void run(() =>
                        persist({
                          ...session,
                          items: session.items.map((i) =>
                            i.id === item.id
                              ? keep
                                ? { ...i, status: "skipped" }
                                : { ...i, excluded: !i.excluded }
                              : i,
                          ),
                        }),
                      )
                    }
                    onImport={(id) => void run(() => apply(true, id))}
                    onRecheck={(id) => void run(() => reanalyzeItem(id))}
                  />
                )}
                <Pagination
                  label={t("exchange.previewPages")}
                  page={page}
                  total={items.length}
                  pageSize={25}
                  disabled={busy}
                  onPageChange={(n) =>
                    setPages((p) => ({ ...p, [category]: n }))
                  }
                />
              </details>
            );
          })}
          {!ready && <p role="alert">{t("transfer.migrationRequired")}</p>}
          {error && (
            <p role="alert" className="break-words">
              {error}
            </p>
          )}
          {busy&&<div role="status" className="flex flex-wrap items-center justify-between gap-2"><span>{progress}</span><button className={button} onClick={()=>controller.current?.abort()}>{t("exchange.pause")}</button></div>}
          <div className="flex flex-wrap justify-end gap-2">
            <button
              className={button}
              disabled={
                busy ||
                !ready ||
                !session.items.some(
                  (i) => eligible(i) && importSafety(i) === "safe",
                )
              }
              onClick={() => void run(() => apply(false))}
            >
              {t("transfer.importSafe")}
            </button>
            <button
              className={button}
              disabled={busy || !ready || !session.items.some(eligible)}
              onClick={() => void run(() => apply(true))}
            >
              {t("transfer.importAll")}
            </button>
          </div>
          {records.length > 0 && (
            <>
              <p role="status">
                {t("transfer.results", {
                  success: records.filter(
                    (r) =>
                      !r.request_conflict && r.result?.status === "applied",
                  ).length,
                  unchanged: records.filter(
                    (r) => r.item.status === "unchanged",
                  ).length,
                  review: records.filter((r) => r.pending_count > 0).length,
                  excluded: session.items.filter(
                    (i) => i.excluded || i.status === "skipped",
                  ).length,
                  failed: records.filter(
                    (r) =>
                      !!r.request_conflict ||
                      ["failed", "stale"].includes(r.item.status),
                  ).length,
                })}
              </p>
              <ul className="space-y-1 text-sm">
                {records.slice(0, 50).map((r) => (
                  <li key={r.id}>
                    {r.item.draft.headword} ·{" "}
                    {t("persistent.result." + persistentOutcome(r))} ·{" "}
                    {t("persistent.pending", { n: r.pending_count })}
                    {r.request_conflict && (
                      <span role="alert"> · {t("transfer.reanalyze")}</span>
                    )}
                  </li>
                ))}
              </ul>
              <button
                className={button}
                onClick={() =>
                  downloadDictionaryJSON(
                    { format: "nexus-persistent-import-results", records },
                    "dictionary-import-results.json",
                  )
                }
              >
                {t("exchange.report")}
              </button>
            </>
          )}
          <Link
            className="inline-block underline"
            href="/dictionary/admin/reviews"
          >
            {t("persistent.openQueue")}
          </Link>
        </DictionaryModal>
      )}
      {archives.length > 0 && (
        <details>
          <summary>{t("persistent.archives")}</summary>
          <select
            aria-label={t("persistent.archives")}
            className="max-w-full rounded border p-2"
            value={legacy?.id ?? ""}
            disabled={busy}
            onChange={(e) => {
              const id = e.target.value;
              void run(async () => {
                const { data } = await getSupabase()!.auth.getUser();
                if (data.user)
                  setLegacy(await loadArchivedImportSession(data.user.id, id));
              });
            }}
          >
            <option value="">—</option>
            {archives.map((a) => (
              <option key={a.id} value={a.id}>
                {a.source_name ?? a.source_type} · {a.preview_at}
              </option>
            ))}
          </select>
        </details>
      )}
      {legacy && (
        <details>
          <summary>{t("persistent.legacy")}</summary>
          <p>
            {legacy.items.length} · {t("persistent.preserveLocal")}
          </p>
          <button
            className={button}
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
                await stagePersistentSession(
                  getSupabase()!,
                  legacy,
                  legacy.source_name || t("persistent.pasted"),
                );
                await onSaved();
              })
            }
          >
            {t("persistent.transfer")}
          </button>
        </details>
      )}
    </section>
  );
}
function AnalysisItems({
  items,
  records,
  busy,
  onExclude,
  onImport,
  onRecheck,
}: {
  items: ImportSession["items"];
  session: ImportSession;
  records: ImportReviewRecord[];
  busy: boolean;
  onExclude: (item: ImportSession["items"][number], keep?: boolean) => void;
  onImport: (id: string) => void;
  onRecheck: (id: string) => void;
}) {
  const { t } = usePaginationLanguage();
  return (
    <ul className="min-w-0 space-y-3 py-3">
      {items.map((item) => {
        const safety = importSafety(item),
          record = records.find((r) => r.entry_id === item.draft.entry_id);
        return (
          <li
            key={item.id}
            className="min-w-0 space-y-2 rounded border p-3 [overflow-wrap:anywhere]"
          >
            <h3 className="font-semibold">
              {item.draft.headword} · {t("ui." + item.draft.kind)}
            </h3>
            <p className="text-xs">
              {item.draft.entry_id} · {t("transfer." + safety)} ·{" "}
              {item.excluded ? t("transfer.excluded") : item.status}
            </p>
            {item.message&&<p role="alert">{t("transfer.reanalyze")}</p>}
            {item.issues
              .filter((i) => !(i as { applied?: boolean }).applied)
              .slice(0, 8)
              .map((i) => (
                <p key={i.id} className="text-sm">
                  {i.field} · {i.reason}
                </p>
              ))}
            <AnalysisPreview item={item} />
            <div className="flex flex-wrap gap-2">
              {!record && !["applied", "unchanged"].includes(item.status) && (
                <>
                  <button
                    className={button}
                    disabled={busy}
                    onClick={() => onExclude(item)}
                  >
                    {t(item.excluded ? "transfer.include" : "transfer.exclude")}
                  </button>
                  {item.context?.snapshot && (
                    <button
                      className={button}
                      disabled={busy}
                      onClick={() => onExclude(item, true)}
                    >
                      {t("transfer.keep")}
                    </button>
                  )}
                  {safety !== "invalid" && !item.excluded && (
                    <button
                      className={button}
                      disabled={busy}
                      onClick={() => onImport(item.id)}
                    >
                      {t("persistent.import")}
                    </button>
                  )}
                </>
              )}
              {(safety === "invalid" || record?.request_conflict) && (
                <button
                  className={button}
                  disabled={busy}
                  onClick={() => onRecheck(item.id)}
                >
                  {t("exchange.recheck")}
                </button>
              )}
              {record && (
                <Link
                  className="underline"
                  href={`/dictionary/admin/reviews?entry=${encodeURIComponent(item.draft.entry_id)}`}
                >
                  {t("persistent.openQueue")}
                </Link>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
function AnalysisPreview({ item }: { item: ImportSession["items"][number] }) {
  const { t } = usePaginationLanguage();
  const [open, setOpen] = useState(false);
  return (
    <details onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary>{t("transfer.fullDiff")}</summary>
      {open && (
        <pre className="max-h-80 overflow-y-auto whitespace-pre-wrap break-words text-xs">
          {JSON.stringify(
            {
              existing: item.context?.snapshot,
              incoming: item.raw_candidate ?? item.draft,
              differences: item.issues,
            },
            null,
            2,
          )}
        </pre>
      )}
    </details>
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
    if (!c) { setError("尚未設定資料服務，無法取得待審核詞條。"); return; }
    setError("");
    void (async () => {
      try {
        if (!(await persistentImportAvailable(c))) {
          if (active) setError("此環境尚未提供字典審核功能，請確認資料庫更新狀態。");
          return;
        }
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
        if (active) setError(reviewFailureText(e,t));
      }
    })();
    return () => {
      active = false;
    };
  }, [entryId, page, epoch, t]);
  const running=useRef(false),lastFailure=useRef<ReviewFailure|null>(null);
  const run = async (fn: () => Promise<unknown>) => {
    if(running.current)return;running.current=true;
    setBusy(true);
    setError("");
    try {
      const result=await fn();
      if(result!==false)refresh();
    } catch (e) {
      lastFailure.current=reviewFailure(e);setError(reviewFailureText(lastFailure.current,t));
    } finally {
      running.current=false;setBusy(false);
    }
  };
  if (!available)
    return error ? (
      <p role="alert">
        {error}
        <button onClick={refresh}>{t("persistent.reload")}</button>
      </p>
    ) : <p role="status">{t("common.loading")}</p>;
  if(compact){
    if(!total&&!error)return null;
    return <aside className="flex flex-wrap items-center gap-2 py-2 text-sm" aria-label={t('persistent.queue')}>{error?<span role="alert">{error}</span>:<span>{t('persistent.red')}</span>}<a className="underline" href={'/dictionary/admin/reviews'+(entryId?'?entry='+encodeURIComponent(entryId):'')}>{t('persistent.openQueue')}</a>{error&&<button onClick={refresh}>{t('persistent.reload')}</button>}</aside>;
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
          <p>{r.request_conflict?reviewFailureText({message:r.request_conflict},t):r.result?.message?reviewFailureText(r.result,t):""}</p>
          {r.item.issues.map((i) => (
            <div key={i.id} className="space-y-2 rounded border p-2">
              <p>
                {i.type} · {i.field} · {["apply_failed","preview_changed"].includes(i.type)?reviewFailureText({message:i.reason},t):i.reason}
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
                    void run(async()=>{const saved=await reviewRPC<ImportReviewRecord>(getSupabase()!,'decide_dictionary_import_review',{review_item_id:r.id,expected_revision:r.revision,issue_id:i.id,decision});setRecords(rows=>rows.map(row=>row.id===saved.id?saved:row));return false;});
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
                    const result=await applyDecidedImportRecord(getSupabase()!,r,record=>setRecords(rows=>rows.map(row=>row.id===record.id?record:row)));
                    const results=result.records;
                    if(result.needsReview){setNotice(t('approval.recompared'));return false;}
                    const failed=results.find(row=>persistentOutcome(row)==='failed');if(failed)throw reviewFailure({...failed.result,message:failed.request_conflict??failed.result?.message},'apply_dictionary_import_reviews');
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
