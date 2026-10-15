// Isolated services and records. Actual admin components and IndexedDB job checkpoints.
import React from "react";
import { createRoot } from "react-dom/client";
import { DictionaryWorkspace } from "../../src/features/dictionary/DictionaryAdmin";
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
      inflections: [],
      examples: [],
      lexical_annotations: [],
    },
    grouping: null,
    sense_groups: {},
    metadata: null,
  },
  reviews: [],
  version: stamp,
});
let server = JSON.parse(localStorage.getItem("fixture-server") || "null") || {
  records: [record(1), record(2), record(3, "published")],
  receipts: {},
  published: 0,
  signature: id(88888),
};
const persist = () =>
  localStorage.setItem("fixture-server", JSON.stringify(server));
window.calls = [];
window.failExport = false;
window.loseResponse = false;
window.newDocument = (count = 52) => ({
  format: "nexus-dictionary-exchange",
  schema_version: 1,
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
          : [],
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
    if(["dictionary_import_review_capabilities","list_dictionary_admin_work"].includes(name))return {error:{code:"42883",message:"function does not exist (pre-migration fixture)"}};
    window.calls.push({ name, ...structuredClone(args) });
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
    if (name === "delete_dictionary_drafts") {
      if (window.failDelete)
        return {
          error: { message: "fixture referenced entry; deletion cancelled" },
        };
      const targets = args.targets;
      if (targets.length !== 1)
        return { error: { message: "Expected a single target" } };
      const entry = server.records.find(
        (r) => r.snapshot.detail.entry.id === targets[0].id,
      )?.snapshot.detail.entry;
      if (
        !entry ||
        entry.status !== "draft" ||
        entry.revision !== targets[0].revision
      )
        return { error: { message: "Published or stale draft" } };
      server.records = server.records.filter(
        (r) => r.snapshot.detail.entry.id !== entry.id,
      );
      persist();
      return { data: 1, error: null };
    }
    if (name === "export_dictionary_exchange_page") {
      if (window.failExport) {
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
          records: structuredClone(records),
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
    if (name === "apply_dictionary_import_batch") {
      await new Promise((r) => setTimeout(r, 220));
      const results = args.operations.map((op) => {
        if (server.receipts[op.operation_id])
          return server.receipts[op.operation_id];
        const result = {
          operation_id: op.operation_id,
          status: op.effect === "unchanged" ? "unchanged" : "applied",
        };
        server.receipts[op.operation_id] = result;
        return result;
      });
      persist();
      if (window.loseResponse) {
        window.loseResponse = false;
        return { error: { message: "fixture response lost" } };
      }
      return { data: results, error: null };
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
      <DictionaryWorkspace
        embedded={new URLSearchParams(location.search).has("embedded")}
        entryId={new URLSearchParams(location.search).get("entry") ?? undefined}
      />
      <ConfirmDialogHost />
    </main>
  </LanguageProvider>,
);
