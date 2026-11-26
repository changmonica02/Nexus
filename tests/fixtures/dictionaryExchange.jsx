import catalogFixture from './catalogFixture.cjs';
// Isolated services and records. Actual admin components and IndexedDB job checkpoints.
import React from "react";
import { createRoot } from "react-dom/client";
import { DictionaryWorkspace } from "../../src/features/dictionary/DictionaryAdmin";
import { PersistentReviewPanel } from "../../src/features/dictionary/PersistentImportReview";
import ConfirmDialogHost from "../../src/components/ConfirmDialog";
import { LanguageProvider } from "../../src/lib/LanguageContext";
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
  owner = id(900000),
  stamp = "a".repeat(32);
const record = (n, status = "draft") => ({
  snapshot: {
    detail: {
      entry: {
        id: id(n),
        kind: "word",
        headword: "item" + n,
        status,
        published_at: status === "published" ? "2026-10-13T00:00:00Z" : null,
        revision: 1,
        updated_at: "2026-10-13T00:00:00Z",
      },
      senses: [
        {
          id: id(n + 10000),
          entry_id: id(n),
          part_of_speech: "noun",
          gloss_zh_tw: "中文" + n,
          revision: 1,
          updated_at: "2026-10-13T00:00:00Z",
        },
      ],
      relations: [],
      etymologies: [],
      learning_notes: [],
      pronunciations: [],
      derivations: [],
      public_notes: [],
      examples: [],
    },
    metadata: null,
  },
  reviews: [],
  version: stamp,
});
let server = JSON.parse(localStorage.getItem("fixture-server") || "null") || {
  records: [record(1), record(2), record(3, "published")],
  imports: [],
  published: 0,
  signature: id(88888),
};
const pendingCount = (item) => item.issues.filter((issue) => !issue.applied).length;
const success = (data) => ({ data: structuredClone(data), error: null });
const failure = (message, code) => ({ data: null, error: { message, code } });
const persist = () =>
  localStorage.setItem("fixture-server", JSON.stringify(server));
window.calls = [];
window.reviewReads = 0;
window.fixtureState = () => structuredClone(server);
window.failExport = false;
window.loseResponse = false;
window.newDocument = (count = 52) => ({
  format: "nexus-dictionary-exchange",
  schema_version: 2,
  exported_at: new Date().toISOString(),
  scope: { kinds: [], statuses: [], query: "" },
  records: Array.from({ length: count }, (_, i) => ({
    ...record(100000 + i),
    version: null,
  })),
});
window.dictionaryClient = {
  auth: {
    getUser: async () => ({ data: { user: { id: owner } }, error: null }),
  },
  from(table) {
    let rows =
        table === "dictionary_entries"
          ? server.records.map((r) => r.snapshot.detail.entry)
          : table === "dictionary_import_review_items" ? server.imports : [],
      count = false,
      range = [0, 99];
    const q = {
      select(_s, opts) {
        count = !!opts?.count;
        return q;
      },
      eq(k, v) {
        rows = rows.filter((r) => r[k] === v);
        return q;
      },
      maybeSingle() {
        if (table === "dictionary_import_review_items") window.reviewReads++;
        return Promise.resolve({ data: rows[0] ?? null, error: null });
      },
      in(k, v) {
        rows = rows.filter((r) => v.includes(r[k]));
        return q;
      },
      ilike(k, v) {
        rows = rows.filter((r) => r[k].includes(v.replaceAll("%", "")));
        return q;
      },
      order() {
        return q;
      },
      range(a, b) {
        range = [a, b];
        return q;
      },
      then(resolve, reject) {
        return Promise.resolve({
          data: rows.slice(range[0], range[1] + 1),
          count: count ? rows.length : null,
        }).then(resolve, reject);
      },
    };
    return q;
  },
  async rpc(name, args = {}) {
    if(name==='search_dictionary_catalog')return catalogFixture(server.records.map(r=>({...r.snapshot.detail.entry,summary:r.snapshot.detail.senses.map(s=>s.gloss_zh_tw).join('；')})),args);
    if(["list_dictionary_admin_work","dictionary_admin_first_senses"].includes(name))return {error:{code:"42883",message:"function does not exist (pre-migration fixture)"}};
    window.calls.push({ name, ...structuredClone(args) });
    if (name === "dictionary_import_review_capabilities") return success({ version: 1 });
    if (name === "get_dictionary_entry")
      return {
        data:
          server.records.find(
            (r) => r.snapshot.detail.entry.id === args.entry_uuid,
          )?.snapshot.detail ?? null,
        error: null,
      };
    if (name === "get_dictionary_ai_snapshot")
      return {
        data:
          server.records.find(
            (r) => r.snapshot.detail.entry.id === args.entry_uuid,
          )?.snapshot ?? null,
        error: null,
      };
    if (name === "delete_dictionary_entry") {
      if (window.failDelete)
        return {
          error: { message: "fixture referenced entry; deletion cancelled" },
        };
      const targets = [{id:args.entry_uuid,revision:args.expected_revision}];
      if (targets.length !== 1)
        return { error: { message: "Expected a single target" } };
      const entry = server.records.find(
        (r) => r.snapshot.detail.entry.id === targets[0].id,
      )?.snapshot.detail.entry;
      if (
        !entry ||
        entry.revision !== targets[0].revision
      )
        return { error: { message: "Published or stale draft" } };
      server.records = server.records.filter(
        (r) => r.snapshot.detail.entry.id !== entry.id,
      );
      persist();
      return { data: {deleted:true,entry_id:entry.id}, error: null };
    }
    if(name==="dictionary_exchange_transfer_capabilities")return {data:{version:1,pending_export:true,safe_replacement:true},error:null};
    if (name === "export_dictionary_exchange_page") {
      if (window.failExport && !args.preview_only) {
        window.failExport = false;
        return { error: { message: "fixture network failure" } };
      }
      const selected = server.records.filter(
        (r) =>
          (!args.kind_filters.length ||
            args.kind_filters.includes(r.snapshot.detail.entry.kind)) &&
          (!args.status_filters.length ||
            args.status_filters.includes(r.snapshot.detail.entry.status)) &&
          r.snapshot.detail.entry.headword
            .toLowerCase()
            .includes(args.query_text.trim().toLowerCase()),
      );
      const records = selected.filter(
        (r) => !args.after_id || r.snapshot.detail.entry.id > args.after_id,
      );
      return {
        data: {
          records: args.preview_only?[]:structuredClone(records),
          total: selected.length,
          cursor: records.at(-1)?.snapshot.detail.entry.id ?? null,
          scope_version: stamp,
          has_more: false,
        },
        error: null,
      };
    }
    if (name === "inspect_dictionary_exchange")
      return {
        data: args.drafts.map((d) => {
          const old = server.records.find(
            (r) =>
              r.snapshot.detail.entry.id === d.bundle.dictionary_entries[0].id,
          );
          return {
            snapshot: old?.snapshot ?? null,
            similar: [],
            identities: {},
            exchange: {
              version: old?.version ?? null,
              reviews: old?.reviews ?? [],
              targets: [],
            },
          };
        }),
        error: null,
      };
    if (name === "stage_dictionary_import_reviews") {
      const rows = args.proposals.map(({ key, source, item }) => {
        const existing = server.imports.find((row) => row.proposal_key === key);
        if (existing) return existing;
        const row = {
          id: crypto.randomUUID(),
          proposal_key: key,
          entry_id: item.draft.entry_id,
          source: structuredClone(source),
          item: structuredClone(item),
          revision: 1,
          pending_count: pendingCount(item),
          updated_at: new Date().toISOString(),
        };
        server.imports.push(row);
        return row;
      });
      persist();
      return success(rows);
    }
    if (name === "get_dictionary_import_reviews") {
      const rows = server.imports.filter((row) =>
        (!args.entry_key || row.entry_id === args.entry_key) &&
        (row.pending_count > 0 || ["pending", "failed", "stale"].includes(row.item.status)),
      );
      const offset = (args.page_number ?? 0) * 50;
      return success({ items: rows.slice(offset, offset + 50), total: rows.length });
    }
    if (["save_dictionary_import_review", "decide_dictionary_import_review"].includes(name)) {
      const row = server.imports.find(({ id }) => id === args.review_item_id);
      if (!row || row.revision !== args.expected_revision) {
        return failure("Import review revision conflict; reload");
      }
      if (name === "save_dictionary_import_review") {
        row.item = structuredClone(args.review_item);
      } else {
        const issue = row.item.issues.find(({ id }) => id === args.issue_id);
        if (!issue || issue.applied || !issue.allowedActions.includes(args.decision)) {
          return failure("Invalid import review decision");
        }
        issue.selectedAction = args.decision;
        if (args.decision === "new_sense") {
          issue.proposedSenseID ??= crypto.randomUUID();
          issue.proposedChildIDs ??= {};
        }
      }
      row.pending_count = pendingCount(row.item);
      row.revision++;
      row.updated_at = new Date().toISOString();
      persist();
      return success(row);
    }
    if (["apply_dictionary_safe_import_reviews", "apply_dictionary_import_reviews"].includes(name)) {
      if (window.holdImportBatch) {
        await new Promise((resolve) => {
          window.finishImportBatch = () => {
            window.holdImportBatch = false;
            resolve();
          };
        });
      }
      const rows = args.operations.map((op) => {
        const row = server.imports.find(({ id }) => id === op.id);
        if (row.revision !== op.revision) {
          return { ...row, request_conflict: "Import review revision conflict; reload" };
        }
        const candidate = op.candidate;
        const status = candidate && op.effect !== "unchanged" ? "applied" : "unchanged";
        if (status === "applied" && op.effect === "write") {
          const bundle = candidate.bundle;
          const entry = bundle.dictionary_entries[0];
          const old = server.records.find((r) => r.snapshot.detail.entry.id === entry.id);
          const saved = {
            snapshot: {
              detail: {
                entry: { ...entry, status: "draft", revision: (old?.snapshot.detail.entry.revision ?? 0) + 1, updated_at: new Date().toISOString() },
                senses: bundle.dictionary_senses,
                relations: bundle.dictionary_relations,
                etymologies: bundle.dictionary_etymologies,
                learning_notes: bundle.dictionary_learning_notes,
                examples: candidate.examples,
                pronunciations: candidate.pronunciations,
                derivations: bundle.dictionary_derivations ?? [],
                public_notes: bundle.dictionary_public_notes ?? [],
              },
              metadata: null,
            },
            reviews: [],
            version: stamp,
          };
          if (old) Object.assign(old, saved);
          else server.records.push(saved);
        }
        for (const issue of row.item.issues) {
          if (op.handled.includes(issue.id)) issue.applied = true;
        }
        row.pending_count = pendingCount(row.item);
        row.item.status = row.pending_count ? "pending" : status;
        row.result = { status, effect: op.effect };
        row.revision++;
        row.updated_at = new Date().toISOString();
        return row;
      });
      persist();
      if (window.loseResponse) {
        window.loseResponse = false;
        return failure("fixture response lost");
      }
      return success(rows);
    }
    if (name === "preview_dictionary_bulk_publish") {
      server.signature = id(88888);
      server.published = 0;
      persist();
      return {
        data: {
          total: 405,
          ready: 405,
          blocked: 0,
          invalid: 0,
          published: 0,
          published_total: 0,
          remaining: 405,
          continuation: true,
          no_progress: false,
          attempted: 0,
          batch_size: 200,
          signature: server.signature,
          issues: [],
        },
        error: null,
      };
    }
    if (name === "publish_dictionary_bulk") {
      await new Promise((r) => setTimeout(r, 220));
      server.published = Math.min(405, server.published + 200);
      persist();
      return {
        data: {
          total: 405,
          ready: 405 - server.published,
          blocked: 0,
          invalid: 0,
          published: 200,
          published_total: server.published,
          remaining: 405 - server.published,
          continuation: server.published < 405,
          no_progress: false,
          attempted: 200,
          batch_size: 200,
          signature: server.signature,
          issues: [],
        },
        error: null,
      };
    }
    if (name === "dictionary_bulk_publish_report") {
      const items = Array.from(
        { length: Math.min(200, 405 - args.page_number * 200) },
        (_, i) => ({
          id: id(200000 + args.page_number * 200 + i),
          state: "published",
        }),
      );
      return { data: { items, total: 405 }, error: null };
    }
    return { error: { message: "Unexpected fixture RPC " + name } };
  },
};
createRoot(document.getElementById("root")).render(
  <LanguageProvider
    initialLanguage={
      new URLSearchParams(location.search).get("language") === "en"
        ? "en"
        : "zh-TW"
    }
  >
    <main className="mx-auto max-w-5xl p-4">
      {location.pathname === "/dictionary/admin/reviews" ? <PersistentReviewPanel /> : <DictionaryWorkspace
        embedded={new URLSearchParams(location.search).has("embedded")}
        entryId={new URLSearchParams(location.search).get("entry") ?? undefined}
      />}
      <ConfirmDialogHost />
    </main>
  </LanguageProvider>,
);
