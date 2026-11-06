import {cleanPronunciation,cleanIpaRecord} from './retiredPronunciation';
import {reviewFailure,ReviewFailure,withReviewDeadline} from './reviewApproval';
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AISnapshot } from "./aiDictionary";
import { canonical } from "./dictionaryExchange";
import {
  classifyImport,
  contentSections,
  inspectDrafts,
  resolveImportItem,
  type ImportItem,
  type ImportIssue,
  type ImportContext,
  type ImportSession,
} from "./importReview";
import {
  mapDictionaryDraft,
  validateDictionaryDraft,
  type DictionaryDraftInput,
  type DraftRow,
} from "./draftPipeline";

export type ReviewIssue = ImportIssue & {
  applied?: boolean;
  sense_id?: string | null;
  dependency_group?: string;
};
export interface PersistentItem extends ImportItem {
  issues: ReviewIssue[];
  original?: DictionaryDraftInput;
}
export interface ImportReviewRecord {
  request_conflict?: string;
  id: string;
  entry_id: string;
  revision: number;
  source: Record<string, unknown>;
  item: PersistentItem;
  pending_count: number;
  result?: Record<string, unknown>;
  updated_at: string;
}
export type ReviewClient = Pick<SupabaseClient,"rpc"> & Partial<Pick<SupabaseClient,"from">>;
const uuid =
  /^[\da-f]{8}-[\da-f]{4}-[1-8][\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i;
export const hardIssues = new Set([
  "identity_kind",
  "identity_owner",
  "homograph",
  "invalid",
  "revision_conflict",
  "preview_changed",
  "batch_homograph",
  "apply_failed",
  "legacy_operation",
]);
export async function reviewRPC<T>(
  client: ReviewClient,
  name: string,
  args: Record<string, unknown>,
): Promise<T> {
  try{const {data,error}=await withReviewDeadline(name,()=>client.rpc(name,args));if(error)throw error;return data as T;}catch(error){throw reviewFailure(error,name);}
}
export async function persistentImportAvailable(client: ReviewClient) {
  const { data, error } = await client.rpc(
    "dictionary_import_review_capabilities",
  );
  if (error) {
    if (
      ["PGRST202", "42883"].includes(error.code) ||
      /Could not find the function|does not exist/.test(error.message)
    )
      return false;
    throw Error(error.message);
  }
  if (data?.version !== 1)
    throw Error(
      "Unsupported persistent review version; reload or update the client",
    );
  return true;
}
/** Compare effective draft content without server metadata or arbitrary row-array order. */
export function sameImportProposal(a:DictionaryDraftInput,b:DictionaryDraftInput){
 const normalize=(value:unknown):unknown=>{
  if(Array.isArray(value)){
   const rows=value.map(normalize);
   return rows.length&&rows.every(r=>r&&typeof r==="object"&&("id" in r||"sense_id" in r))?rows.sort((a,b)=>String((a as DraftRow).id??(a as DraftRow).sense_id).localeCompare(String((b as DraftRow).id??(b as DraftRow).sense_id))):rows;
  }
  if(value&&typeof value==="object")return Object.fromEntries(Object.entries(value).filter(([k])=>!["row","revision","updated_at"].includes(k)).map(([k,v])=>[k,normalize(v)]));
  return value;
 };
 return canonical(normalize(mapDictionaryDraft(a)))===canonical(normalize(mapDictionaryDraft(b)));
}
/** Identity of the proposal, not of its transient browser Session. Generated CSV IDs are placeholders only in the deduplication key. */
export function proposalKey(item: ImportItem) {
  const original=(item as PersistentItem).original;
  const draft=item.replacement_refs?.length&&importSafety(item)==="review"&&original&&sameImportProposal(original,item.draft)?original:item.draft;
  const proposed = new Map(
    (draft.proposed_ids ?? []).map((id, i) => [id, "proposed:" + i]),
  );
  const cleaned = JSON.parse(
    JSON.stringify(draft, (key, v) =>
      ["row", "revision", "proposed_ids"].includes(key)
        ? undefined
        : typeof v === "string" && proposed.has(v)
          ? proposed.get(v)
          : v,
    ),
  );
  return canonical({
    draft: cleaned,
    raw_candidate: item.raw_candidate ?? null,
    ...(item.replacement_refs?.length&&importSafety(item)==="safe"?{replacement_refs:item.replacement_refs}:{}),
  });
}
const issueKey = (i: ImportIssue) =>
  canonical({
    type: i.type,
    target: i.target,
    field: i.field,
    existing: i.existing,
    incoming: i.incoming,
  });
function candidateSnapshot(context: ImportContext): AISnapshot | null {
  const original = context.snapshot;
  if (!original) return null;
  const reviews = context.exchange?.reviews as
    | { state: string; candidate: ReturnType<typeof mapDictionaryDraft> }[]
    | undefined;
  const active = reviews?.filter((r) => r.state === "active");
  if (!active?.length) return original;
  // Multiple active Reviews are never silently selected.
  if (active.length !== 1) return original;
  const c = active[0].candidate,
    s = structuredClone(original),
    b = c.bundle;
  s.detail = {
    ...s.detail,
    entry: { ...s.detail.entry, ...b.dictionary_entries[0] },
    senses: b.dictionary_senses,
    relations: b.dictionary_relations,
    etymologies: b.dictionary_etymologies,
    learning_notes: b.dictionary_learning_notes,
    examples: c.examples,
    lexical_annotations: c.annotations,
    pronunciations: c.pronunciations,
    inflections: c.inflections,
  } as unknown as AISnapshot["detail"];
  s.grouping = c.group_data ?? s.grouping;
  s.sense_groups = Object.fromEntries(
    c.sense_groups.map((r) => [r.sense_id, r.primary_category ?? null]),
  );
  return s;
}
const normalized = (s: unknown) =>
  String(s ?? "")
    .trim()
    .toLocaleLowerCase()
    .replace(/\s+/g, " ");
function add(
  item: PersistentItem,
  type: string,
  section: (typeof contentSections)[number],
  row: DraftRow,
  reason: string,
) {
  const previous = item.issues.find(
    (i) =>
      i.target?.section === section &&
      i.target.id === row.id &&
      !i.target.field,
  );
  if (previous) {
    previous.type = type;
    previous.reason = reason;
    previous.allowedActions =
      section === "senses"
        ? ["incoming", "new_sense", "keep", "later"]
        : ["incoming", "keep", "later"];
    return;
  }
  item.issues.push({
    id: crypto.randomUUID(),
    row: Number(row.row ?? item.draft.row ?? 1),
    kind: item.draft.kind,
    headword: item.draft.headword,
    field: section,
    type,
    existing: null,
    incoming: row,
    reason,
    allowedActions: ["incoming", "keep", "later"],
    selectedAction: null,
    target: { section, id: row.id },
  });
  item.bucket = "review";
}
/** Compare against an existing Review candidate while retaining the real Published context for CAS. */
export function classifyPersistent(
  draft: DictionaryDraftInput,
  context: ImportContext,
  prior?: PersistentItem,
  acceptRebase = false,
): PersistentItem {
  const originalDraft = structuredClone(draft);
  draft = structuredClone(draft);
  const effective = { ...context, snapshot: candidateSnapshot(context) },
    errors = validateDictionaryDraft([draft]);
  const item = classifyImport(draft, effective) as PersistentItem;
  item.context = context;
  item.observed = mapDictionaryDraft(draft);
  item.original = prior?.original ?? originalDraft;
  if(prior?.replacement_refs)item.replacement_refs=structuredClone(prior.replacement_refs);
  if (prior?.raw_candidate) item.raw_candidate = prior.raw_candidate;
  if (context.snapshot) {
    if (
      !acceptRebase &&
      draft.revision !== undefined &&
      draft.revision !== context.snapshot.detail.entry.revision
    )
      item.issues.push({
        id: crypto.randomUUID(),
        row: draft.row ?? 1,
        kind: draft.kind,
        headword: draft.headword,
        field: "revision",
        type: "revision_conflict",
        existing: context.snapshot.detail.entry.revision,
        incoming: draft.revision,
        reason: "Revision conflict; explicitly recompare",
        allowedActions: ["keep", "later"],
        selectedAction: null,
      });
    draft.revision = context.snapshot.detail.entry.revision;
    for (const section of contentSections) {
      const rows = (section === "relation_hints"
        ? effective.snapshot?.detail.lexical_annotations
        : effective.snapshot?.detail[section]) as unknown as
        | DraftRow[]
        | undefined;
      for (const row of draft[section] ?? []) {
        const saved = rows?.find((x) => x.id === row.id);
        if (saved?.revision !== undefined) row.revision = saved.revision;
        else delete row.revision;
      }
    }
  }
  for (const err of errors) {
    const section = contentSections.find((s) => s === err.field);
    item.issues.push({
      id: crypto.randomUUID(),
      row: err.row,
      kind: err.kind,
      headword: draft.headword,
      field: err.field,
      type: section ? "invalid_content" : "invalid",
      existing: null,
      incoming: section ? draft[section] : draft,
      reason: err.error,
      allowedActions: ["keep", "later"],
      selectedAction: null,
      ...(section ? { target: { section } } : {}),
    });
  }
  const old = effective.snapshot?.detail,
    proposed = new Set(draft.proposed_ids ?? []);
  for (const row of draft.senses) {
    if (old?.senses.some((s) => s.id === row.id)) continue;
    const same = [
      ...(old?.senses ?? []),
      ...draft.senses.filter((other) => other.id !== row.id),
    ].filter(
      (s) => normalized(s.part_of_speech) === normalized(row.part_of_speech),
    );
    if (
      same.some(
        (s) => normalized(s.gloss_zh_tw) === normalized(row.gloss_zh_tw),
      ) ||
      (proposed.has(row.id) && same.length)
    )
      add(
        item,
        "ambiguous_content",
        "senses",
        row,
        "可能重複義項；沒有足夠依據自動新增。",
      );
  }
  for (const section of contentSections.filter((s) => s !== "senses"))
    for (const row of draft[section] ?? []) {
      const rows = (section === "relation_hints"
        ? old?.lexical_annotations
        : old?.[section]) as unknown as DraftRow[] | undefined;
      if (rows?.some((r) => r.id === row.id)) continue;
      if (
        section === "relations" &&
        !context.exchange?.targets.some(
          (t) =>
            t.entry_id === row.target_entry_id &&
            t.sense_id === row.target_sense_id,
        )
      ) {
        add(
          item,
          "invalid_reference",
          section,
          row,
          "目標 Entry／Sense 尚無可驗證參照，請確認目標後重新比對。",
        );
        const issue = item.issues.find(
          (i) => i.target?.section === section && i.target.id === row.id,
        );
        if (issue) issue.allowedActions = ["keep", "later"];
        continue;
      }
      if (
        item.issues.some(
          (i) =>
            i.target?.section === "senses" &&
            i.target.id === row.sense_id &&
            i.field === "gloss_zh_tw",
        )
      ) {
        add(
          item,
          "ambiguous_content",
          section,
          row,
          "子項依賴尚未決策的義項內容；請共同確認。",
        );
        continue;
      }
      if (
        section === "inflections" &&
        item.issues.some(
          (i) =>
            i.target?.section === "senses" &&
            i.target.id === row.sense_id &&
            i.field === "part_of_speech",
        )
      ) {
        add(
          item,
          "ambiguous_content",
          section,
          row,
          "詞形依賴尚未決策的詞性變更；請共同確認。",
        );
        continue;
      }
      const slots = [
        ...(rows ?? []),
        ...(draft[section] ?? []).filter((other) => other.id !== row.id),
      ].filter((r) => (r.sense_id ?? null) === (row.sense_id ?? null));
      const duplicate = slots.some((r) =>
        section === "inflections"
          ? r.form_kind === row.form_kind
          : section === "relations"
            ? r.target_sense_id === row.target_sense_id
            : section === "pronunciations"
              ? r.ipa === row.ipa
              : normalized(r.body) === normalized(row.body),
      );
      if (duplicate)
        add(
          item,
          "ambiguous_content",
          section,
          row,
          "可能重複內容或同類詞形，請確認既有記錄及 Stable ID。",
        );
      else if (
        !row.sense_id &&
        draft.senses.length > 1 &&
        section !== "relations"
      )
        add(
          item,
          "shared_content_scope",
          section,
          row,
          "多義項下的新共用內容適用範圍需確認。",
        );
    }
  if ((context.exchange?.reviews.length ?? 0) > 1)
    item.issues.push({
      id: crypto.randomUUID(),
      row: draft.row ?? 1,
      kind: draft.kind,
      headword: draft.headword,
      field: "review",
      type: "revision_conflict",
      reason: "有多個 active Review，請先在編輯器處理。",
      existing: context.exchange?.reviews,
      incoming: null,
      allowedActions: ["keep", "later"],
      selectedAction: null,
    });
  // Rebase only preserves a decision when both the prior and proposed values still match.
  for (const i of item.issues) {
    const oldIssue = prior?.issues.find((x) => issueKey(x) === issueKey(i));
    if (oldIssue) {
      i.id = oldIssue.id;
      i.selectedAction = oldIssue.selectedAction;
      i.applied = oldIssue.applied;
      if (oldIssue.proposedSenseID)
        i.proposedSenseID = oldIssue.proposedSenseID;
      if (oldIssue.proposedChildIDs)
        i.proposedChildIDs = oldIssue.proposedChildIDs;
    }
  }
  for (const issue of item.issues)
    if (hardIssues.has(issue.type)) {
      issue.allowedActions = ["keep", "later"];
      if (
        issue.selectedAction &&
        !issue.allowedActions.includes(issue.selectedAction)
      ) {
        Object.assign(issue, { previousDecision: issue.selectedAction });
        issue.selectedAction = null;
        issue.reason += " · 舊決策不適用此安全阻擋，請重新比對。";
      }
    }
  for (const issue of item.issues) {
    const target = issue.target;
    const row =
      target?.section &&
      contentSections.includes(
        target.section as (typeof contentSections)[number],
      )
        ? (
            draft[target.section as (typeof contentSections)[number]] ?? []
          ).find((r) => r.id === target.id)
        : null;
    issue.sense_id =
      target?.section === "senses"
        ? (target.id ?? null)
        : typeof row?.sense_id === "string"
          ? row.sense_id
          : null;
    issue.dependency_group = issue.sense_id
      ? `sense:${issue.sense_id}`
      : `entry:${draft.entry_id}`;
  }
  item.preview_at = new Date().toISOString();
  return item;
}
function independentlySafe(item: PersistentItem, i: ImportIssue) {
  if (
    hardIssues.has(i.type) ||
    i.type === "ambiguous_content" ||
    i.type === "shared_content_scope" ||
    i.type === "invalid_content"
  )
    return false;
  const t = i.target;
  if (!t) return false;
  if (i.type === "category_missing") return true;
  if (t.field)
    return (
      (i.existing == null || i.existing === "") &&
      i.incoming !== null &&
      i.incoming !== "" &&
      ![
        "headword",
        "sense_id",
        "target_entry_id",
        "target_sense_id",
        "part_of_speech",
      ].includes(t.field)
    );
  if (!["new_content", "published_change"].includes(i.type)) return false;
  // An explicit stable new Sense, a valid type/POS slot, and validated references are all required.
  const row = (
    item.draft[t.section as (typeof contentSections)[number]] ?? []
  ).find((r) => r.id === t.id);
  if (!row) return false;
  return !item.issues.some(
    (other) =>
      other !== i &&
      other.target?.section === t.section &&
      (!other.target.id || other.target.id === t.id) &&
      ["ambiguous_content", "shared_content_scope", "invalid_content"].includes(
        other.type,
      ),
  );
}
export function partialImportPlan(item: PersistentItem, manual = false) {
  const blocking = item.issues.filter((i) => hardIssues.has(i.type));
  if (blocking.length)
    return {
      draft: null,
      handled: manual
        ? blocking
            .filter(
              (i) => i.selectedAction === "keep" || i.selectedAction === "skip",
            )
            .map((i) => i.id)
        : [],
      effect: "unchanged" as const,
    };
  if (!item.context)
    return { draft: null, handled: [], effect: "unchanged" as const };
  const projected = structuredClone(item),
    handled: string[] = [];
  projected.context = {
    ...item.context,
    snapshot: candidateSnapshot(item.context),
  };
  for (const i of projected.issues) {
    const accepted =
      manual &&
      i.selectedAction &&
      !["later", "skip"].includes(i.selectedAction) &&
      !i.applied;
    const safe =
      !manual && !i.selectedAction && !i.applied && independentlySafe(item, i);
    if (accepted || safe) {
      if (!accepted)
        i.selectedAction = i.allowedActions.includes("review")
          ? "review"
          : i.allowedActions.includes("fill")
            ? "fill"
            : "incoming";
      handled.push(i.id);
    } else i.selectedAction = "keep";
    if (
      i.type === "invalid_content" &&
      i.selectedAction === "keep" &&
      i.target
    ) {
      projected.draft[i.target.section as (typeof contentSections)[number]] =
        [];
      delete i.target;
    }
  }
  // A selected child cannot outrun an unresolved parent Sense decision.
  for (const issue of projected.issues) {
    const section = issue.target?.section;
    if (
      !section ||
      !contentSections.includes(section as (typeof contentSections)[number]) ||
      section === "senses"
    )
      continue;
    const row = (
      projected.draft[section as (typeof contentSections)[number]] ?? []
    ).find((r) => r.id === issue.target?.id);
    if (
      row?.sense_id &&
      item.issues.some(
        (parent) =>
          parent.target?.section === "senses" &&
          parent.target.id === row.sense_id &&
          !parent.applied &&
          (!parent.selectedAction ||
            ["later", "skip"].includes(parent.selectedAction)) &&
          !independentlySafe(item, parent),
      )
    ) {
      issue.selectedAction = "keep";
      const index = handled.indexOf(issue.id);
      if (index >= 0) handled.splice(index, 1);
    }
  }
  // Remove dependent rows together with a deferred Sense. Existing unrelated rows remain intact.
  const deferred = new Set(
    projected.issues
      .filter(
        (i) =>
          i.target?.section === "senses" &&
          !i.target.field &&
          i.selectedAction === "keep",
      )
      .map((i) => i.target!.id),
  );
  for (const sense of item.draft.senses)
    if (!projected.draft.senses.some((s) => s.id === sense.id))
      deferred.add(sense.id);
  for (const section of contentSections.filter((s) => s !== "senses"))
    projected.draft[section] = (projected.draft[section] ?? []).filter(
      (r) => !deferred.has(String(r.sense_id)),
    );
  // An independent new Sense does not inherit unchosen examples/forms/history from the old Sense.
  // The existing rows remain in the database/Review overlay; only explicitly accepted children clone.
  for (const senseIssue of projected.issues.filter(
    (i) => i.selectedAction === "new_sense",
  ))
    for (const section of contentSections.filter((s) => s !== "senses"))
      projected.draft[section] = (projected.draft[section] ?? []).filter(
        (row) =>
          row.sense_id !== senseIssue.target?.id ||
          projected.issues.some(
            (i) =>
              i.target?.section === section &&
              i.target.id === row.id &&
              i.selectedAction !== null &&
              !["keep", "later", "skip"].includes(i.selectedAction),
          ),
      ) as never;
  const resolved = resolveImportItem(projected);
  if (!resolved)
    return { draft: null, handled: [], effect: "unchanged" as const };
  const errors = validateDictionaryDraft([resolved.draft]);
  // A deferred POS/scope decision can invalidate only its child group. Hold that group,
  // preserving all other independent selected changes instead of failing the whole Entry.
  for (const error of errors) {
    const section = contentSections.find((s) => s === error.field);
    if (section && section !== "senses") resolved.draft[section] = [] as never;
  }
  if (
    (!item.context?.snapshot && !resolved.draft.senses.length) ||
    validateDictionaryDraft([resolved.draft]).length
  )
    return { draft: null, handled: [], effect: "unchanged" as const };
  const actual = handled.filter((id) => {
    const issue = projected.issues.find((i) => i.id === id)!;
    if (issue.selectedAction === "keep" || !issue.target?.id) return true;
    const target = issue.target;
    const copied = projected.issues
      .flatMap((i) => Object.entries(i.proposedChildIDs ?? {}))
      .find(([old]) => old === target.id)?.[1];
    return (
      resolved.draft[target.section as (typeof contentSections)[number]] ?? []
    ).some((r) => r.id === (issue.proposedSenseID ?? copied ?? target.id));
  });
  return { ...resolved, handled: actual };
}
export async function recheckPersistent(
  client: ReviewClient,
  record: ImportReviewRecord,
) {
  if (record.item.raw_candidate)
    throw Error(
      "原始資料無法安全映射；請保留原檔，修正格式後重新匯入。 Original candidate retained; repair the source file before reimporting.",
    );
  const original = record.item.original ?? record.item.draft;
  if (!uuid.test(original.entry_id))
    throw Error(
      "Invalid Entry ID; retain original source and repair the file before reimporting",
    );
  const observed = structuredClone(original);
  for (const s of contentSections)
    observed[s] = (observed[s] ?? []).filter((r) => uuid.test(r.id)) as never;
  const [context] = await inspectDrafts(client, [observed], { exchange: true });
  const item = classifyPersistent(original, context, record.item, true);
  item.issues.push(
    ...record.item.issues.filter((i) => i.type === "legacy_operation"),
  );
  item.observed = mapDictionaryDraft(observed);
  return reviewRPC<ImportReviewRecord>(
    client,
    "save_dictionary_import_review",
    {
      review_item_id: record.id,
      expected_revision: record.revision,
      review_item: item,
    },
  );
}
export async function stagePersistentSession(
  client: ReviewClient,
  session: ImportSession,
  sourceName: string,
  onProgress?: (done: number, total: number) => void,
  signal?: AbortSignal,
) {
  const records: ImportReviewRecord[] = [];
  for (let offset = 0; offset < session.items.length; offset += 25) {
    if (signal?.aborted) break;
    const items = session.items.slice(offset, offset + 25);
    // Legacy operations are retried verbatim before migration; successful receipts are never rerun as new proposals.
    for (const item of items)
      if (item.operation && ["pending", "failed"].includes(item.status)) {
        const [reply] = await reviewRPC<
          {
            status: ImportItem["status"];
            result?: { id: string };
            message?: string;
          }[]
        >(client, "apply_dictionary_import_batch", {
          operations: [item.operation],
        });
        if (reply.status === "failed") {
          item.issues.push({
            id: crypto.randomUUID(),
            row: item.draft.row ?? 1,
            kind: item.draft.kind,
            headword: item.draft.headword,
            field: "operation",
            type: "legacy_operation",
            existing: item.operation,
            incoming: null,
            reason:
              reply.message ?? "Resolve the saved original operation first",
            allowedActions: ["keep", "later"],
            selectedAction: null,
          });
        }
        item.status = reply.status;
        item.review_id = reply.result?.id ?? item.review_id;
      }
    const pending = items
      .filter((i) => !["applied", "unchanged", "skipped"].includes(i.status))
      .map((i) => {
        if (!i.context) return i;
        const next = classifyPersistent(
          i.draft,
          i.context,
          i as PersistentItem,
        );
        next.preview_at = i.preview_at ?? session.preview_at;
        for (const issue of i.issues)
          if (
            hardIssues.has(issue.type) &&
            !next.issues.some((x) => issueKey(x) === issueKey(issue))
          )
            next.issues.push(issue);
        if (
          i.exchange_version !== undefined &&
          i.exchange_version !== (i.context.exchange?.version ?? null) &&
          !next.issues.some((x) => x.type === "revision_conflict")
        )
          next.issues.push({
            id: crypto.randomUUID(),
            row: 1,
            kind: i.draft.kind,
            headword: i.draft.headword,
            field: "version",
            type: "revision_conflict",
            existing: i.context.exchange?.version,
            incoming: i.exchange_version,
            reason: "Exchange version is stale; recompare explicitly",
            allowedActions: ["keep", "later"],
            selectedAction: null,
          });
        return next;
      });
    for (let n = 0; n < pending.length; n++) {
      let item = pending[n];
      if (!item.context && uuid.test(item.draft.entry_id)) {
        const observed = structuredClone(item.draft);
        for (const section of contentSections)
          observed[section] = (observed[section] ?? []).filter((r) =>
            uuid.test(r.id),
          ) as never;
        const [context] = await inspectDrafts(client, [observed], {
          exchange: true,
        });
        const classified = classifyPersistent(
          item.draft,
          context,
          item as PersistentItem,
        );
        classified.observed = mapDictionaryDraft(observed);
        for (const issue of item.issues)
          if (
            issue.type === "invalid" &&
            !contentSections.includes(
              issue.field as (typeof contentSections)[number],
            ) &&
            !validateDictionaryDraft([item.draft]).some(
              (e) => e.field === issue.field,
            )
          )
            classified.issues.push(issue);
        item = pending[n] = classified;
      }
    }
    for (const item of pending)
      for (const issue of item.issues)
        if (hardIssues.has(issue.type)) {
          issue.allowedActions = ["keep", "later"];
          if (
            issue.selectedAction &&
            !issue.allowedActions.includes(issue.selectedAction)
          ) {
            Object.assign(issue, { previousDecision: issue.selectedAction });
            issue.selectedAction = null;
          }
        }
    const proposals = pending.map((i) => ({
      key: proposalKey(i),
      item: {
        ...i,
        original: (i as PersistentItem).original ?? structuredClone(i.draft),
      },
      source: {
        name: sourceName,
        type: session.source_type,
        session_id: session.id,
        preview_at: session.preview_at,
        legacy_item_id: i.id,
        legacy_operation_id: i.operation?.operation_id ?? null,
      },
    }));
    if (proposals.length) {
      const staged = await reviewRPC<ImportReviewRecord[]>(
        client,
        "stage_dictionary_import_reviews",
        { proposals },
      );
      for (let record of staged) {
        for (const issue of record.item.issues)
          if (issue.selectedAction === "new_sense" && !issue.proposedChildIDs)
            record = await reviewRPC<ImportReviewRecord>(
              client,
              "decide_dictionary_import_review",
              {
                review_item_id: record.id,
                expected_revision: record.revision,
                issue_id: issue.id,
                decision: "new_sense",
              },
            );
        records.push(record);
      }
    }
    onProgress?.(
      Math.min(offset + 25, session.items.length),
      session.items.length,
    );
  }
  return records;
}
async function applyRecordsInOrder(
  client: ReviewClient,
  records: ImportReviewRecord[],
  manual = false,
  signal?: AbortSignal,
  onProgress?: (record: ImportReviewRecord) => void,
  safeTransfer=false,
) {
  const results: ImportReviewRecord[] = [];
  // Reuse the existing target-before-dependent ordering, without resetting any stable identities.
  const remaining = records.filter(
    (r) =>
      !["applied", "unchanged", "skipped"].includes(r.item.status) ||
      r.pending_count > 0,
  );
  const ordered: ImportReviewRecord[] = [];
  while (remaining.length) {
    const ids = new Set(remaining.map((r) => r.entry_id));
    let n = remaining.findIndex(
      (r) =>
        !r.item.draft.relations.some((x) => ids.has(String(x.target_entry_id))),
    );
    if (n < 0) n = 0;
    ordered.push(remaining.splice(n, 1)[0]);
  }
  for (let offset = 0; offset < ordered.length; offset += 25) {
    if (signal?.aborted) break;
    const operations = ordered.slice(offset, offset + 25).map((record) => {
      const plan = partialImportPlan(record.item, manual);
      return {
        id: record.id,
        revision: record.revision,
        handled: plan.handled,
        candidate: plan.draft ? mapDictionaryDraft(plan.draft) : null,
        effect: plan.effect,
        ...(safeTransfer?{replaces:record.item.replacement_refs??[]}:{}),
      };
    });
    const uncertain=uncertainImports.get(client);
    if(operations.some(op=>uncertain?.has(op.id))){
      const checked:ImportReviewRecord[]=[];
      for(const op of operations){const sent=uncertain?.get(op.id);if(!sent){checked.push(ordered.find(r=>r.id===op.id)!);continue;}let found:ImportReviewRecord|undefined;
        if(client.from){const read=await withReviewDeadline('dictionary_import_review_items',()=>client.from!('dictionary_import_review_items').select('*').eq('id',op.id).maybeSingle());if(read.error)throw reviewFailure(read.error,'dictionary_import_review_items','unknown');found=read.data??undefined;}
        else for(let page=0;page<100;page++){const read=await reviewRPC<{items:ImportReviewRecord[];total:number}>(client,'get_dictionary_import_reviews',{entry_key:sent.entry_id,page_number:page});found=read.items.find(row=>row.id===op.id);if(found||!read.items.length||(page+1)*50>=read.total)break;}
        if(!found||found.revision<=sent.revision)throw new ReviewFailure('unknown','apply_dictionary_import_reviews','Result is not confirmed; recompare before another write');checked.push(found);
      }
      for(const found of checked){uncertain?.delete(found.id);results.push(found);onProgress?.(found);}continue;
    }
    let batch:ImportReviewRecord[];
    try{batch=await reviewRPC<ImportReviewRecord[]>(client,safeTransfer?'apply_dictionary_safe_import_reviews':'apply_dictionary_import_reviews',{operations});}
    catch(error){const failure=reviewFailure(error,'apply_dictionary_import_reviews');if(['network','unknown'].includes(failure.kind)){const pending=uncertainImports.get(client)??new Map();for(const op of operations){const record=ordered.find(r=>r.id===op.id)!;pending.set(record.id,{id:record.id,entry_id:record.entry_id,revision:record.revision});}uncertainImports.set(client,pending);}throw failure;}
    if (!Array.isArray(batch)||batch.length!==operations.length){const pending=uncertainImports.get(client)??new Map();for(const op of operations)pending.set(op.id,pendingIdentity(ordered.find(r=>r.id===op.id)!));uncertainImports.set(client,pending);throw new ReviewFailure('unknown','apply_dictionary_import_reviews','Invalid durable import response');}
    for (let r of batch) {
      if (
        !r.request_conflict &&
        r.result?.status === "applied" &&
        r.pending_count > 0
      )
        try{onProgress?.(r);r=await recheckPersistent(client,r);}catch(error){const pending=uncertainImports.get(client)??new Map();for(const op of operations)pending.set(op.id,pendingIdentity(ordered.find(row=>row.id===op.id)!));uncertainImports.set(client,pending);throw reviewFailure(error,'recheck_dictionary_import_review','refresh');}
      results.push(r);
      onProgress?.(r);
    }
  }
  return results;
}

export function persistentOutcome(r: ImportReviewRecord) {
  if (r.request_conflict) return "failed";
  if (r.result?.status === "applied")
    return r.result.effect === "review" ? "review" : "draft";
  if (r.result?.status === "failed" || r.result?.status === "stale")
    return "failed";
  if (r.pending_count > 0) return "pending";
  return r.item.issues.some((i) => i.applied && i.selectedAction === "keep")
    ? "kept"
    : "unchanged";
}

// Existing server receipts remain authoritative; uncertain attempts must be read
// before another write. No additional server state or approval authority.
const pendingIdentity=(r:ImportReviewRecord)=>({id:r.id,entry_id:r.entry_id,revision:r.revision});
const uncertainImports=new WeakMap<ReviewClient,Map<string,Pick<ImportReviewRecord,'id'|'entry_id'|'revision'>>>();
const applyingImports=new WeakSet<ReviewClient>();
export async function applyPersistentRecords(...args:Parameters<typeof applyRecordsInOrder>){
 const client=args[0];if(applyingImports.has(client))throw new ReviewFailure('busy','apply_dictionary_import_reviews','busy');applyingImports.add(client);try{return await applyRecordsInOrder(...args);}finally{applyingImports.delete(client);}
}

/** UI preflight equivalence only. The server still compares the NEW complete
 * context/version and enforces its original CAS and validation on every write. */
export function comparableImportPreview(context:ImportContext|undefined){
 if(!context)return canonical(context);const c=structuredClone(context);
 const entry=(r:Record<string,unknown>)=>{if(r.word_segments===null)delete r.word_segments;return r;};
 const snapshot=(s:AISnapshot|null|undefined)=>{if(s){entry(s.detail.entry as unknown as Record<string,unknown>);s.detail.pronunciations=s.detail.pronunciations?.map(cleanPronunciation);}return s;};
 snapshot(c.snapshot);
 const identities=c.identities as Record<string,Record<string,unknown>[]>;
 if(identities.dictionary_entries)identities.dictionary_entries=identities.dictionary_entries.map(entry);
 if(identities.dictionary_pronunciations)identities.dictionary_pronunciations=identities.dictionary_pronunciations.map(cleanPronunciation);
 if(c.exchange){const cleaned=cleanIpaRecord({reviews:c.exchange.reviews as Array<{base_snapshot?:AISnapshot;candidate?:ReturnType<typeof mapDictionaryDraft>}>});
  for(const review of cleaned.reviews??[]){snapshot(review.base_snapshot);review.candidate?.bundle.dictionary_entries.forEach(entry);}
  c.exchange={...c.exchange,reviews:cleaned.reviews} as typeof c.exchange;delete (c.exchange as {version?:unknown}).version;
  // Transfer fingerprints change with decisions on the same durable row; only the safe-transfer RPC consumes these proofs.
  delete c.exchange.import_review_refs;
 }
 return canonical(c);
}
const preparingDecisions=new WeakSet<ReviewClient>();
export async function applyDecidedImportRecord(client:ReviewClient,record:ImportReviewRecord,onProgress?:(record:ImportReviewRecord)=>void){
 if(preparingDecisions.has(client))throw new ReviewFailure('busy','apply_dictionary_import_reviews','busy');preparingDecisions.add(client);
 try{
  if(uncertainImports.get(client)?.has(record.id))return {records:await applyPersistentRecords(client,[record],true,undefined,onProgress),needsReview:false};
  const fresh=await recheckPersistent(client,record);onProgress?.(fresh);
  const kept=record.item.issues.filter(i=>i.selectedAction&&!i.applied).every(old=>fresh.item.issues.some(i=>i.id===old.id&&i.selectedAction===old.selectedAction));
  if(!kept||comparableImportPreview(record.item.context)!==comparableImportPreview(fresh.item.context))return {records:[fresh],needsReview:true};
  return {records:await applyPersistentRecords(client,[fresh],true,undefined,onProgress),needsReview:false};
 }finally{preparingDecisions.delete(client);}
}

/** Data-safety categories, independent of whether a valid draft would ultimately need a Review. */
export function importSafety(item:ImportItem):'safe'|'review'|'invalid' {
 const pending=item.issues.filter(i=>!(i as ReviewIssue).applied);
 if(item.raw_candidate||['stale','failed'].includes(item.status)||pending.some(i=>hardIssues.has(i.type)||i.type==='invalid_reference'||i.type==='invalid_content'))return 'invalid';
 return pending.some(i=>!independentlySafe(item as PersistentItem,i))?'review':'safe';
}
export function persistentPreview(session:ImportSession):ImportSession {
 return {...session,items:session.items.map(item=>{
  if(!item.context)return item;
  const next=classifyPersistent(item.draft,item.context,item as PersistentItem);
  next.id=item.id;next.exchange_version=item.exchange_version;next.replacement_refs=item.replacement_refs;
  // Exchange/source failures cannot disappear during structural reclassification.
  for(const issue of item.issues)if(hardIssues.has(issue.type)&&!next.issues.some(i=>issueKey(i)===issueKey(issue)))next.issues.push(issue);
  return next;
 })};
}
export async function exchangeTransferAvailable(client:ReviewClient){
 const {data,error}=await client.rpc('dictionary_exchange_transfer_capabilities');
 if(error){if(['PGRST202','42883'].includes(error.code)||/does not exist|Could not find the function/.test(error.message))return false;throw reviewFailure(error,'dictionary_exchange_transfer_capabilities');}
 return data?.version===1&&data.safe_replacement===true&&data.pending_export===true;
}

/** Propose exact old issue IDs only for actual additions; SQL independently verifies coverage. */
export function replacementIssueIds(draft:DictionaryDraftInput,context:ImportContext,issues:ReviewIssue[]){
 const snapshot=candidateSnapshot(context);
 return issues.filter(issue=>{
  if(issue.applied||!issue.target)return false;
  const {section,id,field}=issue.target;
  if(section==="entry"&&field==="word_segments")return !snapshot?.detail.entry.word_segments&&!!draft.word_segments?.length;
  if(!contentSections.includes(section as typeof contentSections[number]))return false;
  const incoming=(draft[section as typeof contentSections[number]]??[]) as DraftRow[];
  const rows=(section==="relation_hints"?snapshot?.detail.lexical_annotations:snapshot?.detail[section as keyof typeof snapshot.detail]) as DraftRow[]|undefined;
  const row=incoming.find(r=>r.id===id),old=rows?.find(r=>r.id===id);
  if(!row)return false;
  if(field)return !!old&&(old[field]==null||old[field]==="")&&row[field]!=null&&row[field]!==""&&canonical(row[field])!==canonical(old[field]);
  return !old&&((issue.incoming&&typeof issue.incoming==="object"? (issue.incoming as {sense_id?:unknown}).sense_id:null)??null)===(row.sense_id??null);
 }).map(i=>i.id);
}
