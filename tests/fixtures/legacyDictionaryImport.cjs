// Exercise the pre-migration SQL contract and construct historical checkpoints
// for recovery tests. Current browser imports use persistent review RPCs.
const { resolveImportItem } = require("../../src/features/dictionary/importReview.ts");
const { mapDictionaryDraft, validateDictionaryDraft } = require("../../src/features/dictionary/draftPipeline.ts");

async function applyLegacyImport(client, session, includeReview, persist, { batched = false, signal } = {}) {
  const next = structuredClone(session);
  const remaining = [...next.items].sort((a, b) => Number(a.draft.kind === "word") - Number(b.draft.kind === "word"));
  const ordered = [];
  while (remaining.length) {
    const ids = new Set(remaining.map((item) => item.draft.entry_id));
    const first = remaining.findIndex((item) =>
      !item.draft.relations.some((row) => ids.has(String(row.target_entry_id))));
    ordered.push(remaining.splice(Math.max(0, first), 1)[0]);
  }

  const prepare = (item) => {
    if (!["pending", "failed"].includes(item.status) || (!includeReview && item.bucket === "review")) return false;
    if (item.issues.some((issue) => issue.selectedAction === "skip")) {
      item.status = "skipped";
      return false;
    }
    if (item.operation) return true;
    if (!item.context || !item.observed) return false;
    const resolved = resolveImportItem(item);
    if (!resolved) return false;
    const errors = validateDictionaryDraft([resolved.draft]);
    if (errors.length) {
      item.status = "failed";
      item.message = errors.map((error) => error.error).join("；");
      return false;
    }

    const expectedContext = { ...item.context };
    delete expectedContext.exchange;
    item.appliedDraft = resolved.draft;
    item.operation = {
      owner_id: next.owner_id,
      session_id: next.id,
      operation_id: crypto.randomUUID(),
      source_type: next.source_type,
      preview_at: item.preview_at ?? next.preview_at,
      observed: item.observed,
      candidate: mapDictionaryDraft(resolved.draft),
      expected_context: expectedContext,
      effect: resolved.effect,
      ...(item.exchange_version === undefined ? {} : { exchange_version: item.exchange_version }),
    };
    return true;
  };

  const size = batched ? 25 : 1;
  for (let start = 0; start < ordered.length; start += size) {
    if (signal?.aborted) break;
    const chunk = ordered.slice(start, start + size);
    const ready = chunk.filter(prepare);
    await persist(next, chunk);
    if (!ready.length) continue;
    try {
      const { data, error } = batched
        ? await client.rpc("apply_dictionary_import_batch", { operations: ready.map(({ operation }) => operation) })
        : await client.rpc("apply_dictionary_import_operation", { operation: ready[0].operation });
      if (error) throw Error(error.message);
      const results = batched ? data : [data];
      if (!Array.isArray(results) || results.length !== ready.length || results.some((result, index) =>
        !result || !["applied", "unchanged", "stale", "failed"].includes(result.status) ||
        (batched && result.operation_id !== ready[index].operation.operation_id))) {
        throw Error("Invalid import receipt response; retry the saved operations");
      }
      for (const [index, item] of ready.entries()) {
        const result = results[index];
        item.status = result.status;
        item.message = result.message;
        if (item.operation.effect === "review" && typeof result.result?.id === "string") item.review_id = result.result.id;
        if (result.status === "stale") item.bucket = "review";
      }
    } catch (error) {
      for (const item of ready) {
        item.status = "failed";
        item.message = error instanceof Error ? error.message : String(error);
      }
    }
    await persist(next, ready);
    if (ready.every((item) => item.status === "failed")) break;
  }
  return next;
}

module.exports = { applyLegacyImport };
