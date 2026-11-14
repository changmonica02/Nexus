import {currentMorphemeFields} from './retiredMorphemeFields';
import {validateMorphemeSenseFields} from './morphemeContract';
import {replacementIssueIds,sameImportProposal,type PersistentItem} from "./persistentImport";
import {cleanIpaRecord} from './retiredPronunciation';
import {mergeCoreConcepts} from './coreConcept';
import type { AISnapshot } from "./aiDictionary";
import type { DictionaryReview } from "./revisionLifecycle";
import {
  draftsFromBundle,
  validateDictionaryDraft,
  type DictionaryDraftInput,
  type DraftIssue,
} from "./draftPipeline";
import {
  buildImportSession,
  classifyImport,
  inspectDrafts,
  contentSections,
  type ImportSession,
  type ImportContext,
} from "./importReview";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface ExchangeScope {
  kinds: string[];
  statuses: string[];
  query: string;
  pending_only?: boolean;
}
export interface ExchangeRecord {
  snapshot: AISnapshot;
  entry_id?: string;
  import_candidate?: DictionaryDraftInput;
  import_reviews?: {id:string;entry_id:string;revision:number;version:string;item:import("./importReview").ImportItem}[];
  reviews: DictionaryReview[];
  version: string | null;
}
export interface ExchangeDocument {
  format: "nexus-dictionary-exchange";
  schema_version: 1;
  exported_at: string;
  scope: ExchangeScope;
  records: ExchangeRecord[];
}
export const exchangeFormat = "nexus-dictionary-exchange";
export const exchangeBatchSize = 25;
export function canonical(value: unknown): string {
  return JSON.stringify(value, (_key, v) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(
          Object.entries(v).sort(([a], [b]) => a.localeCompare(b)),
        )
      : v,
  );
}
function object(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}
function keys(
  v: unknown,
  allowed: string[],
  where: string,
): asserts v is Record<string, unknown> {
  if (!object(v)) throw Error(`${where}: expected object`);
  for (const k of Object.keys(v))
    if (!allowed.includes(k)) throw Error(`${where}: unsupported field ${k}`);
}
export function parseExchange(raw: string): ExchangeDocument {
  const doc: unknown = JSON.parse(raw.replace(/^\uFEFF/, ""));
  keys(
    doc,
    ["format", "schema_version", "exported_at", "scope", "records"],
    "exchange",
  );
  if (doc.format !== exchangeFormat || doc.schema_version !== 1)
    throw Error("Unsupported dictionary exchange schema version");
  if (!Array.isArray(doc.records) || doc.records.length > 50000)
    throw Error("Expected at most 50,000 records");
  if (
    typeof doc.exported_at !== "string" ||
    !Number.isFinite(Date.parse(doc.exported_at))
  )
    throw Error("Invalid exported_at");
  keys(doc.scope, ["kinds", "statuses", "query", "pending_only"], "scope");
  if (
    !Array.isArray(doc.scope.kinds) ||
    doc.scope.kinds.some((k) => !["word", "prefix", "root", "suffix"].includes(k)) ||
    !Array.isArray(doc.scope.statuses) ||
    doc.scope.statuses.some((s) => !["draft", "published"].includes(s)) ||
    (doc.scope.pending_only!==undefined&&typeof doc.scope.pending_only!=="boolean")||
    typeof doc.scope.query !== "string"
  )
    throw Error("Invalid scope");
  return {...doc,records:doc.records.map(cleanIpaRecord)} as unknown as ExchangeDocument;
}
const rowFields: Record<string, string[]> = {
  senses: ["part_of_speech", "gloss_zh_tw", "semantic_domain", "semantic_subdomain", "variants"],
  relations: ["sense_id", "target_entry_id", "target_sense_id"],
  etymologies: ["sense_id", "body", "data_source"],
  learning_notes: ["sense_id", "kind", "body"],
  pronunciations: ["sense_id", "ipa", "sort_order"],
  examples: ["sense_id", "body", "sort_order", "translation_zh_tw", "derivation_id"],
  derivations: ["sense_id", "gloss_zh_tw", "sort_order"],
  public_notes: ["body"],
  lexical_annotations: ["sense_id", "kind", "body", "sort_order"],
};
export function draftFromExchange(
  record: ExchangeRecord,
  row = 1,
): DictionaryDraftInput {
  keys(record, ["snapshot", "reviews", "version", "entry_id", "import_reviews", "import_candidate"], "record");
  record=currentMorphemeFields(cleanIpaRecord(record));
  if (
    record.version !== null &&
    (typeof record.version !== "string" ||
      !/^[0-9a-f]{32}$/.test(record.version))
  )
    throw Error("Invalid version stamp");
  if (!Array.isArray(record.reviews))
    throw Error("Missing active Review information");
  if(record.import_reviews!==undefined){
    if(!Array.isArray(record.import_reviews)||record.import_reviews.some(r=>!r||typeof r.id!=="string"||typeof r.entry_id!=="string"||!Number.isSafeInteger(r.revision)||!r.version?.match(/^[0-9a-f]{32}$/)||!r.item))throw Error("Invalid pending review provenance");
  }
  if(record.entry_id&&record.snapshot&&record.entry_id!==record.snapshot.detail.entry.id)throw Error("Record identity mismatch");
  if(record.import_candidate&&record.snapshot)draftFromExchange({...record,import_candidate:undefined},row);
  if(record.import_candidate){
    keys(record.import_candidate,["entry_id","kind","headword","revision","word_segments","component_order","row","senses","relations","etymologies","learning_notes","examples","relation_hints","pronunciations","derivations","public_notes","proposed_ids","lexical_annotations"],"import_candidate");
    const draft=structuredClone(record.import_candidate);
    for(const section of ["senses","relations","etymologies","learning_notes","examples","relation_hints","pronunciations","derivations","public_notes"] as const){
      if(draft[section]===undefined){if(section!=="pronunciations"&&section!=="derivations"&&section!=="public_notes")draft[section]=[];continue;}
      if(!Array.isArray(draft[section]))throw Error(`Invalid ${section}`);
      for(const value of draft[section]??[]){
        const fields=section==="relation_hints"?["body","sense_id","sort_order"]:rowFields[section];
        keys(value,["id","entry_id","revision","updated_at","row",...(section==="senses"?["category"]:[]),...fields],section);
        if(value.entry_id!==undefined&&value.entry_id!==draft.entry_id)throw Error("Foreign candidate child ownership");
      }
    }
    if(draft.entry_id!==(record.entry_id??record.snapshot?.detail.entry.id)||!record.import_reviews?.length||record.import_reviews.some(r=>r.entry_id!==draft.entry_id||r.item.draft?.kind!==draft.kind)||validateDictionaryDraft([draft]).length)throw Error("Invalid import candidate identity or content");
    return {...draft,row};
  }
  if(!record.snapshot){
    if(record.version!==null||record.reviews.length||!record.entry_id||record.import_reviews?.length!==1)throw Error("Pending-only entry needs one unambiguous original candidate");
    const draft=structuredClone(record.import_reviews[0].item.draft);
    if(draft.entry_id!==record.entry_id||record.import_reviews[0].entry_id!==record.entry_id)throw Error("Pending candidate identity mismatch");
    if(validateDictionaryDraft([draft]).length)throw Error("Invalid pending candidate; correct its original draft with stable IDs");
    return {...draft,row};
  }
  const snapshot = record.snapshot;
  keys(
    snapshot,
    ["detail", "metadata"],
    "snapshot",
  );
  keys(snapshot.detail, ["entry", ...Object.keys(rowFields)], "detail");
  const entry = snapshot.detail.entry;
  keys(
    entry,
    [
      "id",
      "kind",
      "headword",
      "word_segments",
      "status",
      "published_at",
      "revision",
      "updated_at",
    ],
    "entry",
  );
  for (const key of [
    "id",
    "kind",
    "headword",
    "status",
    "published_at",
    "revision",
    "updated_at",
  ])
    if (!Object.hasOwn(entry, key)) throw Error(`Missing entry.${key}`);
  if (
    typeof entry.id !== "string" ||
    typeof entry.headword !== "string" ||
    !entry.headword.trim() ||
    typeof entry.updated_at !== "string" ||
    (entry.published_at !== null && typeof entry.published_at !== "string")
  )
    throw Error("Invalid Entry scalar types");
  if (
    !["draft", "published"].includes(String(entry.status)) ||
    !Number.isSafeInteger(entry.revision) ||
    Number(entry.revision) < 0
  )
    throw Error("Invalid entry version/status");
  const bundle: Record<string, Record<string, unknown>[]> = {
    dictionary_entries: [entry],
  };
  for (const [section, fields] of Object.entries(rowFields)) {
    const values = snapshot.detail[section as keyof typeof snapshot.detail];
    if (['derivations','public_notes'].includes(section)&&values===undefined)continue; // Historical v1 snapshots omit B2 content entirely.
    if (!Array.isArray(values)) throw Error(`Missing array ${section}`);
    bundle[section==='derivations'?'dictionary_sense_derivations':"dictionary_" + section] = values.map(
      (r: Record<string, unknown>) => {
        keys(
          r,
          ["id", "entry_id", "revision", "updated_at", ...fields],
          section,
        );
        for (const field of [
          "id",
          "entry_id",
          "revision",
          "updated_at",
          ...fields.filter(f=>!["semantic_domain","semantic_subdomain","variants","translation_zh_tw","derivation_id"].includes(f)),
        ])
          if (!Object.hasOwn(r, field))
            throw Error(`${section}: missing ${field}`);
        if (
          typeof r.id !== "string" ||
          typeof r.entry_id !== "string" ||
          typeof r.updated_at !== "string"
        )
          throw Error(`${section}: invalid identity/timestamp types`);
        for (const field of fields) {
          const value = r[field];
          if(["semantic_domain","semantic_subdomain","variants"].includes(field))continue;
           if(["translation_zh_tw","derivation_id"].includes(field)&&(value===undefined||value===null))continue;
          if (field === "sort_order") {
            if (!Number.isSafeInteger(value) || Number(value) < 0)
              throw Error(`${section}: invalid sort_order`);
          } else if (
            value === null &&
            ["sense_id", "part_of_speech", "locale", "note"].includes(field)
          )
            continue;
          else if (typeof value !== "string")
            throw Error(`${section}: ${field} must be text`);
        }
        for (const field of fields.filter((f) =>
          ["body", "form", "ipa", "gloss_zh_tw"].includes(f),
        ))
          if (!(section === "senses" && field === "gloss_zh_tw" && r.part_of_speech === null && entry.kind !== "word") && (typeof r[field] !== "string" || !String(r[field]).trim()))
            throw Error(`${section}: invalid ${field}`);
        if (
          section === "lexical_annotations" &&
          !["relation_hint"].includes(String(r.kind))
        )
          throw Error("Invalid lexical annotation kind");
        if (
          section === "learning_notes" &&
          !["core_concept", "learning_decomposition", "mnemonic_scenario"].includes(
            String(r.kind),
          )
        )
          throw Error("Invalid learning note kind");
        if(section==="senses"){const issue=validateMorphemeSenseFields(r);if(issue)throw Error(issue);}
        if (r.entry_id !== entry.id)
          throw Error(`${section}: foreign entry ownership`);
        if (!Number.isSafeInteger(r.revision) || Number(r.revision) < 0)
          throw Error(`${section}: invalid revision`);
        return r;
      },
    );
  }
  if (snapshot.metadata !== null) {
    keys(
      snapshot.metadata,
      ["entry_id", "published_entry_id", "origin_ids", "component_order"],
      "metadata",
    );
    if (
      snapshot.metadata.entry_id !== entry.id ||
      !Array.isArray(snapshot.metadata.component_order) ||
      snapshot.metadata.component_order.some(
        (id) => !snapshot.detail.relations.some((r) => r.id === id),
      ) ||
      new Set(snapshot.metadata.component_order).size !==
        snapshot.metadata.component_order.length
    )
      throw Error("Invalid composition order");
  }
  const draft = draftsFromBundle(
    bundle,
  )[0];
  draft.learning_notes=mergeCoreConcepts(draft.learning_notes);
  draft.row = row;
  if (snapshot.metadata)
    draft.component_order = [...snapshot.metadata.component_order];
  if (record.version === null) {
    if (
      snapshot.metadata &&
      (snapshot.metadata.published_entry_id !== null ||
        !object(snapshot.metadata.origin_ids) ||
        Object.keys(snapshot.metadata.origin_ids).length)
    )
      throw Error("New entry provenance must be empty");
    delete draft.revision;
    for (const section of contentSections)
      for (const r of draft[section] ?? []) delete r.revision;
    if (record.reviews.length)
      throw Error("New entries cannot restore active Review records");
  }
  return draft;
}
function invalidDraft(
  record: ExchangeRecord,
  index: number,
): DictionaryDraftInput {
  return {
    entry_id: String(record?.entry_id??record?.snapshot?.detail?.entry?.id ?? ""),
    kind: record?.snapshot?.detail?.entry?.kind ?? "word",
    headword: String(
      record?.snapshot?.detail?.entry?.headword ?? "Invalid record",
    ),
    row: index + 1,
    senses: [],
    relations: [],
    etymologies: [],
    learning_notes: [],
    examples: [],
    relation_hints: [],
  };
}
/** Missing children are retention, including their established ordering slots. */
function retainOmittedRelationOrder(
  draft: DictionaryDraftInput,
  context: ImportContext,
) {
  if (draft.component_order === undefined || !context.snapshot) return;
  const existing = context.snapshot.detail.relations.map((r) => r.id),
    existingIDs = new Set(existing),
    provided = new Set(draft.relations.map((r) => r.id));
  if (existing.every((id) => provided.has(id))) return;
  const selected = draft.component_order.filter(
    (id) => existingIDs.has(id) && provided.has(id),
  );
  const selectedIDs = new Set(selected),
    previousSelected = existing.filter((id) => selectedIDs.has(id));
  const newIDs = draft.component_order.filter(
    (id) => !existingIDs.has(id) && provided.has(id),
  );
  if (canonical(selected) === canonical(previousSelected))
    draft.component_order = [
      ...(context.snapshot.metadata?.component_order ?? []),
      ...newIDs,
    ];
  else {
    let index = 0;
    draft.component_order = [
      ...existing.map((id) => (selectedIDs.has(id) ? selected[index++] : id)),
      ...newIDs,
    ];
  }
}
export async function previewExchange(
  client: Pick<SupabaseClient, "rpc">,
  owner: string,
  doc: ExchangeDocument,
  onProgress?: (done: number, total: number) => void,
): Promise<ImportSession> {
  const errors: DraftIssue[] = [],
    drafts = doc.records.map((r, i) => {
      try {
        return draftFromExchange(r, i + 1);
      } catch (e) {
        const d = invalidDraft(r, i);
        errors.push({
          row: i + 1,
          kind: d.kind,
          field: "exchange",
          error: String(e),
        });
        return d;
      }
    });
  errors.push(...validateDictionaryDraft(drafts));
  const session = await buildImportSession(
    client,
    owner,
    "json",
    drafts,
    errors,
    crypto.randomUUID(),
    { exchange: true, onProgress },
  );
  const allSenses = new Map(
    drafts.flatMap((d) => d.senses.map((s) => [s.id, d.entry_id] as const)),
  );
  for (const item of session.items) {
    const record = doc.records[(item.draft.row ?? 1) - 1],
      context = item.context;
    if (!context) continue;
    retainOmittedRelationOrder(item.draft, context);
    const refreshed = classifyImport(item.draft, context);
    const technical = item.issues.filter((i) =>
      ["revision_conflict", "preview_changed", "batch_homograph"].includes(
        i.type,
      ),
    );
    item.observed = refreshed.observed;
    item.issues = [...refreshed.issues, ...technical];
    item.bucket = refreshed.bucket;
    item.safeAction = refreshed.safeAction;
    const sameNewReplay =
      record.version === null && !!context.snapshot && item.issues.length === 0;
    item.exchange_version = sameNewReplay
      ? context.exchange!.version
      : record.version;
    const issue = (type: string, reason: string) => {
      item.bucket = "review";
      item.issues.push({
        id: crypto.randomUUID(),
        row: item.draft.row ?? 1,
        kind: item.draft.kind,
        headword: item.draft.headword,
        field: "exchange",
        type,
        existing: context.snapshot,
        incoming: record.snapshot,
        reason,
        allowedActions: ["skip", "later"],
        selectedAction: null,
      });
    };
    if (record.snapshot && context.snapshot && record.version === context.exchange?.version) {
      for (const field of [
        "status",
        "revision",
        "updated_at",
        "published_at",
      ] as const)
        if (
          record.snapshot.detail.entry[field] !==
          context.snapshot.detail.entry[field]
        )
          issue(
            "invalid",
            `Entry ${field} is server-owned; retain its exported value.`,
          );
      for (const section of Object.keys(rowFields)) {
        const oldRows =
          context.snapshot.detail[
            section as keyof typeof context.snapshot.detail
          ];
        const incomingRows =
          record.snapshot.detail[
            section as keyof typeof record.snapshot.detail
          ];
        if (Array.isArray(oldRows) && Array.isArray(incomingRows))
          for (const row of incomingRows) {
            const old = oldRows.find((r) => r.id === row.id);
            if (
              old &&
              (row.revision !== old.revision ||
                row.updated_at !== old.updated_at)
            )
              issue(
                "invalid",
                "Child revisions and timestamps are read-only; retain exported values.",
              );
          }
      }
    }
    if (!sameNewReplay && record.version !== context.exchange?.version)
      issue(
        "revision_conflict",
        "Export version or active Review has changed; export/preview again.",
      );
    if (
      !sameNewReplay &&
      canonical(record.reviews) !== canonical(context.exchange?.reviews ?? [])
    )
      issue(
        "invalid",
        "Active Review data is read-only; use the existing Review editor.",
      );
    if (
      !sameNewReplay &&
      (record.snapshot?.metadata || context.snapshot?.metadata)
    ) {
      const { component_order, ...incoming } = record.snapshot?.metadata ?? {};
      const { component_order: oldOrder, ...existing } = context.snapshot
        ?.metadata ?? {
        entry_id: item.draft.entry_id,
        published_entry_id: null,
        origin_ids: {},
      };
      void component_order;
      void oldOrder;
      if (canonical(incoming) !== canonical(existing))
        issue(
          "invalid",
          "Provenance metadata is read-only; it cannot be silently replaced.",
        );
    }
    for (const relation of item.draft.relations)
      if (
        allSenses.get(String(relation.target_sense_id)) !==
          relation.target_entry_id &&
        !context.exchange?.targets.some(
          (t) =>
            t.entry_id === relation.target_entry_id &&
            t.sense_id === relation.target_sense_id,
        )
      )
        issue(
          "invalid",
          "Composition target Entry/Sense is missing or mismatched.",
        );
    if (context.exchange?.reviews.length && item.issues.some((i) => i.target))
      issue(
        "existing_review",
        "An active Review exists; continue editing it in the existing editor.",
      );
    // Provenance is opaque, frozen server identity; never match pending sources by spelling.
    if(record.import_reviews?.length){
      const current=context.exchange?.import_review_refs??[];
      const matching=record.import_reviews.every(r=>r.entry_id===item.draft.entry_id&&current.some(x=>x.id===r.id&&x.entry_id===r.entry_id&&x.revision===r.revision&&x.version===r.version));
      if(!matching)issue("revision_conflict","Pending review changed or provenance is missing; export and analyze again.");
      else {
        item.replacement_refs=record.import_reviews.map(r=>({id:r.id,entry_id:r.entry_id,revision:r.revision,version:r.version,issue_ids:replacementIssueIds(item.draft,context,r.item.issues)}));
        const same=record.import_reviews.find(r=>sameImportProposal(r.item.draft,item.draft));
        if(same)(item as PersistentItem).original=structuredClone(same.item.draft);
      }
    }

  }
  return session;
}
export function exchangeCategory(item: ImportSession["items"][number]) {
  if (
    item.status === "stale" ||
    item.issues.some((i) =>
      ["revision_conflict", "preview_changed"].includes(i.type),
    )
  )
    return "conflict";
  if (item.issues.some((i) => i.type === "invalid")) return "invalid";
  if (item.bucket === "review") return "review";
  return item.safeAction === "new"
    ? "new"
    : item.safeAction === "unchanged"
      ? "unchanged"
      : "modified";
}
export function importReport(session: ImportSession) {
  return {
    session_id: session.id,
    ignored_fields: session.ignored_fields ?? [],
    created_at: new Date().toISOString(),
    items: session.items.map((i) => ({
      entry_id: i.draft.entry_id,
      headword: i.draft.headword,
      category: exchangeCategory(i),
      status: i.status,
      effect: i.operation?.effect ?? null,
      review_id: i.review_id ?? null,
      message: i.message ?? null,
      operation_id: i.operation?.operation_id ?? null,
      issues: i.issues.map((x) => ({ field: x.field, reason: x.reason })),
    })),
  };
}

/** A stale server rejection has not written. Rebase keeps the proposed content, refreshes
 * only its technical revisions, and requires an explicit decision before another write. */
export async function recheckExchangeItem(
  client: Pick<SupabaseClient, "rpc">,
  item: ImportSession["items"][number],
) {
  const [context] = await inspectDrafts(client, [item.draft], {
    exchange: true,
  });
  const d = structuredClone(item.draft);
  d.revision = context.snapshot?.detail.entry.revision;
  for (const section of contentSections) {
    const key = section === "relation_hints" ? "lexical_annotations" : section;
    const rows = context.snapshot?.detail[key] ?? [];
    for (const row of d[section] ?? []) {
      const old = rows.find((r) => r.id === row.id);
      if (old) row.revision = old.revision;
    }
  }
  retainOmittedRelationOrder(d, context);
  const next = classifyImport(d, context);
  next.exchange_version = context.exchange?.version ?? null;
  next.bucket = "review";
  const blocked = !!context.exchange?.reviews.length;
  next.issues.push({
    id: crypto.randomUUID(),
    row: d.row ?? 1,
    kind: d.kind,
    headword: d.headword,
    field: "revision",
    type: blocked ? "existing_review" : "rebase_confirmation",
    existing: context.snapshot,
    incoming: d,
    reason: blocked
      ? "Active Review exists; continue in the existing editor."
      : "Latest version is now the baseline. Confirm all displayed differences before applying.",
    allowedActions: blocked
      ? ["skip", "later"]
      : context.snapshot?.detail.entry.status === "published"
        ? ["review", "skip", "later"]
        : ["incoming", "skip", "later"],
    selectedAction: null,
  });
  return next;
}
