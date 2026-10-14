import type { SupabaseClient } from "@supabase/supabase-js";
import {
  dictionaryJobDatabase,
  loadDictionaryJob,
  saveDictionaryJob,
} from "./importSessionStore";
import {
  exchangeFormat,
  type ExchangeDocument,
  type ExchangeRecord,
  type ExchangeScope,
} from "./dictionaryExchange";
export interface ExportJob {
  id: string;
  owner_id: string;
  scope: ExchangeScope;
  exported_at: string;
  cursor: string | null;
  scope_version: string | null;
  pages: number;
  processed: number;
  total: number;
  complete: boolean;
}
export const loadExportJob = (owner: string) =>
  loadDictionaryJob<ExportJob>(owner, "export");
export async function createExportJob(
  owner: string,
  scope: ExchangeScope,
): Promise<ExportJob> {
  const job: ExportJob = {
    id: crypto.randomUUID(),
    owner_id: owner,
    scope: structuredClone(scope),
    exported_at: new Date().toISOString(),
    cursor: null,
    scope_version: null,
    pages: 0,
    processed: 0,
    total: 0,
    complete: false,
  };
  await saveDictionaryJob(owner, "export", job);
  return job;
}
export async function continueExport(
  client: Pick<SupabaseClient, "rpc">,
  saved: ExportJob,
  onProgress: (job: ExportJob) => void,
  signal?: AbortSignal,
): Promise<ExportJob> {
  let job = { ...saved };
  while (!job.complete && !signal?.aborted) {
    const { data, error } = await client.rpc(
      "export_dictionary_exchange_page",
      {
        kind_filters: job.scope.kinds,
        status_filters: job.scope.statuses,
        query_text: job.scope.query,
        after_id: job.cursor,
        expected_scope: job.scope_version,
      },
    );
    if (error) throw Error(error.message);
    if (
      !data ||
      !Array.isArray(data.records) ||
      data.records.length > 100 ||
      !Number.isSafeInteger(data.total) ||
      typeof data.scope_version !== "string" ||
      (job.scope_version !== null &&
        data.scope_version !== job.scope_version) ||
      (data.has_more &&
        (!data.cursor || data.cursor === job.cursor || !data.records.length))
    )
      throw Error("Invalid or changed export page; restart export");
    const next = {
      ...job,
      cursor: data.cursor ?? job.cursor,
      scope_version: data.scope_version,
      total: data.total,
      processed: job.processed + data.records.length,
      pages: job.pages + 1,
      complete: !data.has_more,
    };
    if (next.complete && next.processed !== next.total)
      throw Error("Export membership changed; restart export");
    const db = await dictionaryJobDatabase();
    try {
      const tx = db.transaction(["jobs", "export_pages"], "readwrite", {
        durability: "strict",
      });
      const done = tx.done;
      void done.catch(() => {});
      try {
        await tx.objectStore("export_pages").put({
          key: JSON.stringify([job.owner_id, job.id, job.pages]),
          job_id: JSON.stringify([job.owner_id, job.id]),
          page: job.pages,
          records: data.records,
        });
        await tx
          .objectStore("jobs")
          .put({ key: JSON.stringify([job.owner_id, "export"]), value: next });
        await done;
      } catch (error) {
        try {
          tx.abort();
        } catch {}
        await done.catch(() => {});
        throw error;
      }
    } finally {
      db.close();
    }
    job = next;
    onProgress(job);
  }
  return job;
}
export async function exportDocument(
  job: ExportJob,
): Promise<ExchangeDocument> {
  if (!job.complete) throw Error("Export is incomplete");
  const db = await dictionaryJobDatabase();
  let records: ExchangeRecord[];
  try {
    records = (
      await db.getAllFromIndex(
        "export_pages",
        "job",
        JSON.stringify([job.owner_id, job.id]),
      )
    )
      .sort((a, b) => a.page - b.page)
      .flatMap((p) => p.records);
  } finally {
    db.close();
  }
  if (
    records.length !== job.total ||
    new Set(records.map((r) => r.snapshot.detail.entry.id)).size !==
      records.length
  )
    throw Error("Export checkpoint is incomplete or contains duplicate IDs");
  return {
    format: exchangeFormat,
    schema_version: 1,
    exported_at: job.exported_at,
    scope: job.scope,
    records,
  };
}
export function downloadDictionaryJSON(value: unknown, name: string) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], {
      type: "application/json;charset=utf-8",
    }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
