require("./loadStudy.cjs");
require("fake-indexeddb/auto");
const test = require("node:test"),
  assert = require("node:assert/strict");
const {
  database,
  id,
  owner,
  sql,
  client,
} = require("./fixtures/dictionaryExchangeDatabase.cjs");
const {
  createExportJob,
  continueExport,
  exportDocument,
} = require("../src/features/dictionary/exchangeExport.ts");
const {
  previewExchange,
  exchangeCategory,
} = require("../src/features/dictionary/dictionaryExchange.ts");
const {
  applyImportItems,
} = require("../src/features/dictionary/importReview.ts");
const {
  persistImportSession,
  loadImportSession,
} = require("../src/features/dictionary/importSessionStore.ts");
const elapsed = (start) => Math.round(performance.now() - start);
test(
  "6,300 actual SQL records: bounded complete export, preview, receipt replay import, publication and full report",
  { timeout: 600000 },
  async () => {
    const pg = await database();
    const measurements = {
      rows: 6300,
      environment: process.env.NEXUS_TEST_POSTGRES_CONTAINER
        ? "local PostgreSQL container with fixture auth"
        : "isolated PGlite PostgreSQL",
    };
    try {
      let start = performance.now();
      await pg.exec(
        "insert into dictionary_entries(id,kind,headword) select ('00000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'word','scale-'||lpad(n::text,5,'0') from generate_series(1,6300) n;insert into dictionary_senses(id,entry_id,part_of_speech,gloss_zh_tw) select ('00000000-0000-4000-8000-'||lpad((n+100000)::text,12,'0'))::uuid,('00000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'noun','測試'||n from generate_series(1,6300) n;",
      );
      measurements.seed_ms = elapsed(start);
      const c = client(pg);
      let requests = 0,
        maxExport = 0;
      const bounded = {
        rpc: async (name, args) => {
          requests++;
          const r = await c.rpc(name, args);
          if (name === "export_dictionary_exchange_page")
            maxExport = Math.max(maxExport, r.data?.records.length ?? 0);
          return r;
        },
      };
      start = performance.now();
      let job = await createExportJob(owner, {
        kinds: ["word"],
        statuses: ["draft"],
        query: "scale-",
      });
      const pause = new AbortController();
      job = await continueExport(
        bounded,
        job,
        () => pause.abort(),
        pause.signal,
      );
      assert.equal(job.processed, 100);
      assert.equal(job.complete, false);
      job = await continueExport(bounded, job, () => {});
      const doc = await exportDocument(job);
      measurements.export_ms = elapsed(start);
      measurements.export_requests = requests;
      measurements.json_bytes = Buffer.byteLength(JSON.stringify(doc));
      assert.equal(doc.records.length, 6300);
      assert.equal(maxExport, 100);
      assert.equal(requests, 63);
      start = performance.now();
      const preview = await previewExchange(bounded, owner, doc);
      measurements.preview_ms = elapsed(start);
      assert.equal(preview.items.length, 6300);
      assert.ok(
        preview.items.every((i) => exchangeCategory(i) === "unchanged"),
      );
      assert.equal(requests, 63 + 252);
      start = performance.now();
      await persistImportSession(preview);
      const stop = new AbortController();
      let applied = await applyImportItems(
        bounded,
        preview,
        false,
        async (s, changed) => {
          await persistImportSession(s, changed);
          if (s.items.filter((i) => i.status === "unchanged").length >= 25)
            stop.abort();
        },
        { batched: true, signal: stop.signal },
      );
      assert.equal(
        applied.items.filter((i) => i.status === "unchanged").length,
        25,
      );
      applied = await applyImportItems(
        bounded,
        await loadImportSession(owner),
        false,
        persistImportSession,
        { batched: true },
      );
      measurements.import_ms = elapsed(start);
      measurements.import_requests = 252;
      assert.ok(applied.items.every((i) => i.status === "unchanged"));
      assert.equal(
        await sql(
          pg,
          "select count(*)::int v from dictionary_import_operations",
        ),
        6300,
      );
      assert.equal(
        await sql(pg, "select count(*)::int v from dictionary_entries"),
        6300,
      );
      start = performance.now();
      const p = await bounded.rpc("preview_dictionary_bulk_publish", {
        kind_filters: ["word"],
        query_text: "scale-",
      });
      if (p.error) throw Error(p.error.message);
      assert.equal(p.data.ready, 6300);
      measurements.publish_preview_ms = elapsed(start);
      let last = p.data,
        count = 0;
      start = performance.now();
      while (last.remaining) {
        const r = await bounded.rpc("publish_dictionary_bulk", {
          kind_filters: ["word"],
          query_text: "scale-",
          expected_signature: p.data.signature,
          content_verified: true,
        });
        if (r.error) throw Error(r.error.message);
        last = r.data;
        assert.ok(last.attempted <= 200);
        assert.ok(last.published > 0);
        count++;
        if (count % 8 === 0)
          console.log("publication progress", last.published_total, "/6300");
      }
      measurements.publish_ms = elapsed(start);
      measurements.publish_requests = count;
      assert.equal(last.published_total, 6300);
      assert.equal(count, 32);
      let rows = [];
      for (let page = 0; rows.length < 6300; page++) {
        const r = await bounded.rpc("dictionary_bulk_publish_report", {
          preview_id: p.data.signature,
          page_number: page,
        });
        assert.equal(r.error, null);
        assert.ok(r.data.items.length <= 200);
        rows.push(...r.data.items);
      }
      assert.equal(rows.filter((r) => r.state === "published").length, 6300);
      console.log("NEXUS44_SCALE", JSON.stringify(measurements));
    } finally {
      await pg.close();
    }
  },
);
