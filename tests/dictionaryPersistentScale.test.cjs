require("./loadStudy.cjs");
require("fake-indexeddb/auto");
const test = require("node:test"),
  assert = require("node:assert/strict");
const {
  database,
  client,
  owner,
  draft,
  sql,
} = require("./fixtures/persistentImportDatabase.cjs");
const {
  buildImportSession,
} = require("../src/features/dictionary/importReview.ts");
const {
  stagePersistentSession,
  applyPersistentRecords,
} = require("../src/features/dictionary/persistentImport.ts");
const {
  persistImportSession,
  loadImportSession,
} = require("../src/features/dictionary/importSessionStore.ts");
test(
  "6,301 entries: bounded preview/stage/apply, dropped reply and fresh-client recovery with no repeated writes",
  { timeout: 240000 },
  async () => {
    const pg = await database(),
      base = client(pg),
      counts = { inspect: 0, stage: 0, apply: 0 };
    let lose = true;
    const c = {
      rpc: async (name, args) => {
        if (name === "inspect_dictionary_exchange") counts.inspect++;
        if (name === "stage_dictionary_import_reviews") {
          counts.stage++;
          assert.ok(args.proposals.length <= 25);
        }
        if (name === "apply_dictionary_import_reviews") {
          counts.apply++;
          assert.ok(args.operations.length <= 25);
        }
        const result = await base.rpc(name, args);
        if (
          name === "apply_dictionary_import_reviews" &&
          lose &&
          !result.error
        ) {
          lose = false;
          return { error: { message: "lost receipt reply" } };
        }
        return result;
      },
    };
    try {
      const started = performance.now();
      const drafts = Array.from({ length: 6301 }, (_, n) =>
        draft(100000 + n * 10),
      );
      const session = await buildImportSession(
        c,
        owner,
        "json",
        drafts,
        [],
        crypto.randomUUID(),
        { exchange: true },
      );
      session.durable_review = true;
      await persistImportSession(session);
      const records = await stagePersistentSession(
        c,
        session,
        "scale-6301.json",
      );
      assert.equal(records.length, 6301);
      const stagedAt = performance.now();
      await assert.rejects(
        () => applyPersistentRecords(c, records),
        /lost receipt/,
      );
      assert.equal(
        (await pg.query("select count(*)::int n from dictionary_entries"))
          .rows[0].n,
        25,
      );
      const restored = await loadImportSession(owner);
      const recovered = await stagePersistentSession(
        base,
        restored,
        "scale-6301.json",
      );
      const result = await applyPersistentRecords(base, recovered);
      assert.equal(result.length, 6276);
      assert.ok(
        result.every((r) => r.result.status === "applied"),
        result.find((r) => r.result.status !== "applied")?.result.message,
      );
      assert.equal(
        (await pg.query("select count(*)::int n from dictionary_entries"))
          .rows[0].n,
        6301,
      );
      assert.equal(
        (await pg.query("select count(*)::int n from dictionary_senses"))
          .rows[0].n,
        6301,
      );
      assert.equal(
        (
          await pg.query(
            "select count(*)::int n from dictionary_import_review_items",
          )
        ).rows[0].n,
        6301,
      );
      assert.equal(
        (
          await pg.query(
            "select count(*)::int n from dictionary_import_operations",
          )
        ).rows[0].n,
        6301,
      );
      const current = await stagePersistentSession(
        base,
        restored,
        "same-source-again.json",
      );
      assert.equal((await applyPersistentRecords(base, current)).length, 0);
      console.log(
        JSON.stringify({
          rows: 6301,
          previewAndStageMs: Math.round(stagedAt - started),
          totalMs: Math.round(performance.now() - started),
          boundedCalls: counts,
          recoveredAfterLostReply: 6276,
        }),
      );
    } finally {
      await pg.close();
    }
  },
);
