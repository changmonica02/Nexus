import type { SupabaseClient } from "@supabase/supabase-js";
import {
  parseExchange,
  previewExchange,
  exchangeFormat,
} from "./dictionaryExchange";
import { parseDictionaryCSVPreview } from "./dictionaryCSV";
import {
  normalizeDictionaryBundle,
  parseDictionaryImport,
} from "./adminImport";
import { buildImportSession } from "./importReview";
import type { DictionaryDraftInput, DraftIssue } from "./draftPipeline";
export async function previewImportSource(
  client: SupabaseClient,
  owner: string,
  raw: string,
  format: "csv" | "json" | "md",
  progress?: (done: number, total: number) => void,
) {
  if (
    format === "json" &&
    JSON.parse(raw.replace(/^\uFEFF/, ""))?.format === exchangeFormat
  ) {
    const doc = parseExchange(raw),
      session = await previewExchange(client, owner, doc, progress);
    for (const item of session.items)
      if (
        item.issues.some((i) => i.type === "invalid" && i.field === "exchange")
      )
        item.raw_candidate = doc.records[(item.draft.row ?? 1) - 1];
    return session;
  }
  const rawCandidates = new Map<string, unknown>();
  let drafts: DictionaryDraftInput[] = [],
    issues: DraftIssue[] = [];
  if (format === "csv")
    ({ drafts, issues } = await parseDictionaryCSVPreview(raw));
  else {
    const bundle = await parseDictionaryImport(raw, format);
    const ids = new Set([
      ...(bundle.dictionary_entries ?? []).map((e) => String(e.id)),
      ...Object.entries(bundle)
        .filter(([t]) => t !== "dictionary_entries")
        .flatMap(([, rows]) => rows.map((r) => String(r.entry_id))),
    ]);
    for (const id of ids) {
      const part = Object.fromEntries(
        Object.entries(bundle).map(([table, rows]) => [
          table,
          rows.filter((r) =>
            table === "dictionary_entries" ? r.id === id : r.entry_id === id,
          ),
        ]),
      );
      try {
        drafts.push(...(await normalizeDictionaryBundle(client, part)));
      } catch (e) {
        const row = drafts.length + 1;
        drafts.push({
          entry_id: id,
          kind: (part.dictionary_entries?.[0]?.kind ??
            "word") as DictionaryDraftInput["kind"],
          headword: String(
            part.dictionary_entries?.[0]?.headword ?? "Unidentified import",
          ),
          row,
          senses: [],
          etymologies: [],
          examples: [],
          learning_notes: [],
          lexical_annotations: [],
          relation_hints: [],
          relations: [],
        });
        issues.push({
          row,
          kind: String(part.dictionary_entries?.[0]?.kind ?? "word"),
          field: "legacy_mapping",
          error: String(e),
        });
        rawCandidates.set(id, part);
      }
    }
  }
  const session = await buildImportSession(
    client,
    owner,
    format,
    drafts,
    issues,
    crypto.randomUUID(),
    { exchange: true, strictIdentity: true, onProgress: progress },
  );
  for (const item of session.items)
    if (rawCandidates.has(item.draft.entry_id))
      item.raw_candidate = rawCandidates.get(item.draft.entry_id);
  return session;
}
