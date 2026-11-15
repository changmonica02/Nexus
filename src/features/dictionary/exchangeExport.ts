import {cleanIpaRecord} from './retiredPronunciation';
import {currentMorphemeFields} from './retiredMorphemeFields';
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  dictionaryJobDatabase,
  loadDictionaryJob,
  saveDictionaryJob,
} from "./importSessionStore";
import {
  exchangeFormat,
  exchangeSchemaVersion,
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
  transfer?: boolean;
}
export const loadExportJob = (owner: string) =>
  loadDictionaryJob<ExportJob>(owner, "export");
export async function createExportJob(
  owner: string,
  scope: ExchangeScope,
  preview?: {scope_version:string;total:number},
): Promise<ExportJob> {
  const job: ExportJob = {
    id: crypto.randomUUID(),
    owner_id: owner,
    scope: structuredClone(scope),
    exported_at: new Date().toISOString(),
    cursor: null,
    scope_version: preview?.scope_version??null,
    pages: 0,
    processed: 0,
    total: preview?.total??0,
    complete: false,
    transfer: !!preview,
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
        ...(job.transfer?{pending_only:!!job.scope.pending_only,preview_only:false}:{}),
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
/** Export exactly the current v2 shape; never include the retired inflections section. */
function currentExportRecord(record:ExchangeRecord):ExchangeRecord {
  const detail=record.snapshot?.detail;
  if(!detail)return cleanIpaRecord(record);
  const retired=(detail as unknown as Record<string,unknown>).inflections;
  if(Array.isArray(retired)&&retired.length)throw Error('字典仍有舊版詞形資料，請先人工整理，無法輸出最新版格式');
  const {inflections:_retired,...current}=detail as typeof detail & {inflections?:unknown};
  void _retired;
  // Word-only v2 sections are present even if the installed SQL snapshot
  // predates them; this does not relax validation of nonempty example links.
  const complete=detail.entry.kind==='word'?{...current,derivations:current.derivations??[],public_notes:current.public_notes??[]}:current;
  return cleanIpaRecord(currentMorphemeFields({...record,snapshot:{...record.snapshot!,detail:complete}}));
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
    new Set(records.map((r) => r.entry_id??r.snapshot?.detail.entry.id)).size !==
      records.length
  )
    throw Error("Export checkpoint is incomplete or contains duplicate IDs");
  return {
    format: exchangeFormat,
    schema_version: exchangeSchemaVersion(records),
    exported_at: job.exported_at,
    scope: job.scope,
    records:records.map(currentExportRecord),
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

/** Freeze the same membership/version used by the paginated export, without exporting a page. */
export async function previewExport(client:Pick<SupabaseClient,"rpc">,scope:ExchangeScope){
 if(!scope.kinds.length)throw Error("Select at least one entry type");
 const {data,error}=await client.rpc("export_dictionary_exchange_page",{kind_filters:scope.kinds,status_filters:[],query_text:"",after_id:null,expected_scope:null,pending_only:!!scope.pending_only,preview_only:true});
 if(error)throw Error(error.message);
 if(!data||!Number.isSafeInteger(data.total)||typeof data.scope_version!=="string")throw Error("Invalid export preview");
 return {total:data.total as number,scope_version:data.scope_version as string};
}
