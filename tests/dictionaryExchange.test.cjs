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
  draft,
} = require("./fixtures/dictionaryExchangeDatabase.cjs");
const {
  mapDictionaryDraft,
} = require("../src/features/dictionary/draftPipeline.ts");
const {
  parseExchange,
  previewExchange,
  exchangeCategory,
  draftFromExchange,
} = require("../src/features/dictionary/dictionaryExchange.ts");
const {
  applyImportItems,
} = require("../src/features/dictionary/importReview.ts");
const {
  createExportJob,
  continueExport,
  exportDocument,
} = require("../src/features/dictionary/exchangeExport.ts");
const {
  loadImportSession,
  persistImportSession,
} = require("../src/features/dictionary/importSessionStore.ts");
const { openDB, deleteDB } = require("idb");
async function exportAll(c) {
  const job = await createExportJob(owner, {
    kinds: [],
    statuses: [],
    query: "",
  });
  return exportDocument(await continueExport(c, job, () => {}));
}
const save = (pg, d) =>
  sql(pg, "select apply_dictionary_drafts($1,false,true) v", [
    JSON.stringify([mapDictionaryDraft(d)]),
  ]);
test(
  "actual additive SQL: lossless IDs/content/group/order, unchanged roundtrip, safe Draft/Review update, versions, active Review, permissions, report and receipts",
  { timeout: 120000 },
  async () => {
    const pg = await database();
    try {
      const root = draft(10, "root");
      root.grouping = {
        primary_category: "自然",
        tags: ["tag"],
        variant_group: "variant",
      }; // Use an actual allowed Root category.
      root.senses.push({
        id: id(14),
        part_of_speech: null,
        gloss_zh_tw: "第二義項",
      });
      root.grouping.primary_category =
        require("../src/features/dictionary/dictionaryCategories.ts").primaryCategories[0];
      await save(pg, root);
      await sql(pg, "select publish_dictionary_entry($1,true) v", [id(10)]);
      const word = draft(20);
      word.senses.push({
        id: id(24),
        part_of_speech: "noun",
        gloss_zh_tw: "多義項",
      });
      word.relations = [
        {
          id: id(22),
          sense_id: null,
          target_entry_id: id(10),
          target_sense_id: id(11),
        },
      ];
      word.relations.push({
        ...word.relations[0],
        id: id(32),
        target_sense_id: id(14),
      });
      word.component_order = [id(32), id(22)];
      word.pronunciations = [
        {
          id: id(25),
          sense_id: id(21),
          ipa: "KK/IPA literal",
          locale: "en-US",
          note: "原文不轉換",
          sort_order: 2,
        },
      ];
      word.inflections = [
        {
          id: id(26),
          sense_id: id(21),
          form_kind: "past",
          form: "went",
          sort_order: 0,
        },
      ];
      word.etymologies = [
        {
          id: id(27),
          sense_id: null,
          body: "歷史詞源",
          verification: "verified",
          verification_note: "可追溯依據",
        },
      ];
      word.learning_notes = [
        {
          id: id(28),
          sense_id: id(24),
          kind: "mnemonic_scenario",
          body: "memory",
        },
      ];
      word.examples = [
        { id: id(29), sense_id: id(24), body: "example 中文", sort_order: 1 },
      ];
      word.relation_hints = [
        { id: id(30), sense_id: null, body: "source forms", sort_order: 0 },
      ];
      word.relation_hints = [
        { id: id(31), sense_id: null, body: "unparsed hint", sort_order: 1 },
      ];
      await save(pg, word);
      const prefix = draft(50, "prefix");
      const categories =
        require("../src/features/dictionary/dictionaryCategories.ts").prefixCategories;
      prefix.senses[0].category = categories[0];
      prefix.senses.push({
        id: id(54),
        part_of_speech: null,
        gloss_zh_tw: "second prefix sense",
        category: categories[1],
      });
      prefix.grouping = {
        primary_category: null,
        tags: ["prefix-tag"],
        variant_group: "prefix-variant",
      };
      await save(pg, prefix);
      const c = client(pg),
        original = await exportAll(c),
        roundtrip = parseExchange(JSON.stringify(original));
      assert.deepEqual(roundtrip, original);
      assert.equal(roundtrip.records.length, 3);
      let session = await previewExchange(c, owner, roundtrip);
      assert.ok(
        session.items.every((i) => exchangeCategory(i) === "unchanged"),
        JSON.stringify(session.items.map((i) => i.issues)),
      );
      await persistImportSession(session);
      session = await applyImportItems(
        c,
        session,
        false,
        persistImportSession,
        { batched: true },
      );
      assert.ok(session.items.every((i) => i.status === "unchanged"));
      assert.deepEqual(
        (await exportAll(c)).records,
        original.records,
        "no revisions or IDs change on unchanged import",
      );
      const modified = structuredClone(original),
        record = modified.records.find(
          (r) => r.snapshot.detail.entry.id === id(20),
        );
      record.snapshot.metadata.component_order = [id(22), id(32)];
      record.snapshot.detail.senses[0].gloss_zh_tw = "updated";
      record.snapshot.detail.pronunciations[0].ipa =
        "unchanged literal scope / updated";
      const rootRecord = modified.records.find(
        (r) => r.snapshot.detail.entry.id === id(10),
      );
      rootRecord.snapshot.grouping.tags.push("second");
      const prefixRecord = modified.records.find(
        (r) => r.snapshot.detail.entry.id === id(50),
      );
      prefixRecord.snapshot.grouping.tags.push("edited-prefix");
      prefixRecord.snapshot.sense_groups[id(51)] = categories[2];
      session = await previewExchange(c, owner, modified);
      assert.ok(session.items.every((i) => exchangeCategory(i) === "modified"));
      await persistImportSession(session);
      let lose = true;
      const transport = {
        rpc: async (...args) => {
          const r = await c.rpc(...args);
          if (args[0] === "apply_dictionary_import_batch" && lose) {
            lose = false;
            return { error: { message: "response lost" } };
          }
          return r;
        },
      };
      session = await applyImportItems(
        transport,
        session,
        false,
        persistImportSession,
        { batched: true },
      );
      assert.ok(session.items.every((i) => i.status === "failed"));
      session = await applyImportItems(
        c,
        await loadImportSession(owner),
        false,
        persistImportSession,
        { batched: true },
      );
      assert.ok(session.items.every((i) => i.status === "applied"));
      assert.equal(
        await sql(pg, "select count(*)::int v from dictionary_review_drafts"),
        1,
      );
      assert.equal(
        (await sql(pg, "select get_dictionary_entry($1) v", [id(20)]))
          .pronunciations[0].ipa,
        record.snapshot.detail.pronunciations[0].ipa,
      );
      assert.deepEqual(
        (await sql(pg, "select get_dictionary_ai_snapshot($1) v", [id(20)]))
          .metadata.component_order,
        [id(22), id(32)],
      );
      const changed = await exportAll(c);
      assert.equal(
        changed.records.find((r) => r.snapshot.detail.entry.id === id(10))
          .snapshot.grouping.tags.length,
        1,
        "Published group change stays Review",
      );
      assert.equal(
        changed.records.find((r) => r.snapshot.detail.entry.id === id(10))
          .reviews[0].candidate.group_data.tags.length,
        2,
      );
      const legacyObserved = mapDictionaryDraft(root);
      legacyObserved.bundle.dictionary_entries[0].revision =
        changed.records.find(
          (r) => r.snapshot.detail.entry.id === id(10),
        ).snapshot.detail.entry.revision;
      const legacyContext = (
        await c.rpc("inspect_dictionary_import", { drafts: [legacyObserved] })
      ).data[0];
      const legacyReview = {
        owner_id: owner,
        session_id: id(7000),
        operation_id: id(7001),
        source_type: "csv",
        preview_at: new Date().toISOString(),
        observed: legacyObserved,
        candidate: legacyObserved,
        expected_context: legacyContext,
        effect: "review",
      };
      assert.equal(
        (
          await c.rpc("apply_dictionary_import_batch", {
            operations: [legacyReview],
          })
        ).data[0].status,
        "stale",
      );
      assert.equal(
        await sql(pg, "select count(*)::int v from dictionary_review_drafts"),
        1,
      );
      const stale = await previewExchange(c, owner, original);
      assert.ok(stale.items.every((i) => exchangeCategory(i) === "conflict"));
      const active = structuredClone(changed);
      active.records.find(
        (r) => r.snapshot.detail.entry.id === id(10),
      ).snapshot.detail.entry.headword = "changed root";
      const activeSession = await previewExchange(c, owner, active);
      assert.equal(
        exchangeCategory(
          activeSession.items.find((i) => i.draft.entry_id === id(10)),
        ),
        "review",
      );
      const invalid = structuredClone(changed);
      invalid.records[0].snapshot.detail.entry.unknown = "must not vanish";
      assert.equal(
        exchangeCategory(
          (await previewExchange(c, owner, invalid)).items.find(
            (i) => i.draft.row === 1,
          ),
        ),
        "invalid",
      );
      const badType = structuredClone(changed);
      badType.records.find(
        (r) => r.snapshot.detail.entry.id === id(20),
      ).snapshot.detail.senses[0].part_of_speech = 123;
      const typedPreview = await previewExchange(c, owner, badType);
      assert.equal(
        exchangeCategory(
          typedPreview.items.find((i) => i.draft.entry_id === id(20)),
        ),
        "invalid",
      );
      assert.equal(
        typedPreview.items.filter((i) => i.bucket === "safe").length,
        2,
      );
      const bad = structuredClone(changed);
      bad.records[0].reviews.push({ bad: "payload" });
      assert.equal(
        exchangeCategory(
          (await previewExchange(c, owner, bad)).items.find(
            (i) => i.draft.row === 1,
          ),
        ),
        "invalid",
      );
      const omitted = structuredClone(changed);
      omitted.records = omitted.records.filter(
        (r) => r.snapshot.detail.entry.id === id(20),
      );
      omitted.records[0].snapshot.detail.examples = [];
      session = await previewExchange(c, owner, omitted);
      await applyImportItems(c, session, false, async () => {}, {
        batched: true,
      });
      assert.equal(
        await sql(pg, "select count(*)::int v from dictionary_entries"),
        3,
      );
      assert.equal(
        await sql(pg, "select count(*)::int v from dictionary_examples"),
        1,
      );
      const partial = structuredClone(changed);
      partial.records = partial.records.filter(
        (r) => r.snapshot.detail.entry.id === id(20),
      );
      partial.records[0].snapshot.detail.relations = [];
      partial.records[0].snapshot.metadata.component_order = [];
      const partialSession = await previewExchange(c, owner, partial);
      assert.equal(exchangeCategory(partialSession.items[0]), "unchanged");
      await applyImportItems(c, partialSession, false, async () => {}, {
        batched: true,
      });
      assert.deepEqual(
        (await sql(pg, "select get_dictionary_ai_snapshot($1) v", [id(20)]))
          .metadata.component_order,
        [id(22), id(32)],
      );
      const filteredJob = await createExportJob(owner, {
        kinds: ["prefix"],
        statuses: ["draft"],
        query: "entry50",
      });
      const filtered = await exportDocument(
        await continueExport(c, filteredJob, () => {}),
      );
      assert.equal(filtered.records.length, 1);
      assert.equal(
        filtered.records[0].snapshot.sense_groups[id(51)],
        categories[2],
      );
      assert.equal(
        await sql(
          pg,
          "select has_function_privilege('authenticated','public.dictionary_exchange_record(uuid)','execute') v",
        ),
        false,
      );
      const p = await c.rpc("preview_dictionary_bulk_publish", {
        kind_filters: ["word"],
        query_text: "",
      });
      assert.equal(p.data.ready, 1);
      const pub = await c.rpc("publish_dictionary_bulk", {
        kind_filters: ["word"],
        query_text: "",
        expected_signature: p.data.signature,
        content_verified: true,
      });
      assert.equal(pub.data.published_total, 1);
      const report = await c.rpc("dictionary_bulk_publish_report", {
        preview_id: p.data.signature,
        page_number: 0,
      });
      assert.equal(report.data.items[0].state, "published");
      const fresh = structuredClone(
        changed.records.find((r) => r.snapshot.detail.entry.id === id(20)),
      );
      fresh.version = null;
      fresh.reviews = [];
      fresh.snapshot.detail = {
        entry: {
          id: id(60),
          kind: "word",
          headword: "new ordered word",
          status: "draft",
          revision: 0,
          updated_at: "",
          published_at: null,
        },
        senses: [
          {
            id: id(61),
            entry_id: id(60),
            part_of_speech: "verb",
            gloss_zh_tw: "new",
            revision: 0,
            updated_at: "",
          },
        ],
        relations: [62, 63].map((n, i) => ({
          id: id(n),
          entry_id: id(60),
          sense_id: null,
          target_entry_id: id(10),
          target_sense_id: id(i ? 14 : 11),
          revision: 0,
          updated_at: "",
        })),
        etymologies: [],
        learning_notes: [],
        pronunciations: [],
        inflections: [],
        examples: [],
        lexical_annotations: [],
      };
      fresh.snapshot.grouping = null;
      fresh.snapshot.sense_groups = {};
      fresh.snapshot.metadata = {
        entry_id: id(60),
        published_entry_id: null,
        origin_ids: {},
        component_order: [id(63), id(62)],
      };
      const additions = await previewExchange(c, owner, {
        ...changed,
        records: [fresh],
      });
      assert.equal(exchangeCategory(additions.items[0]), "new");
      const inserted = await applyImportItems(
        c,
        additions,
        false,
        async () => {},
        { batched: true },
      );
      assert.equal(inserted.items[0].status, "applied");
      const replay = await previewExchange(c, owner, {
        ...changed,
        records: [fresh],
      });
      assert.equal(exchangeCategory(replay.items[0]), "unchanged");
      assert.equal(
        (
          await applyImportItems(c, replay, false, async () => {}, {
            batched: true,
          })
        ).items[0].status,
        "unchanged",
      );
      assert.deepEqual(
        (await sql(pg, "select get_dictionary_ai_snapshot($1) v", [id(60)]))
          .metadata.component_order,
        [id(63), id(62)],
      );
      await pg.query("select set_config('request.jwt.claim.sub',$1,false)", [
        id(900001),
      ]);
      for (const [name, args] of [
        [
          "export_dictionary_exchange_page",
          {
            kind_filters: [],
            status_filters: [],
            query_text: "",
            after_id: null,
            expected_scope: null,
          },
        ],
        ["inspect_dictionary_exchange", { drafts: [] }],
        ["apply_dictionary_import_batch", { operations: [] }],
        [
          "dictionary_bulk_publish_report",
          { preview_id: p.data.signature, page_number: 0 },
        ],
      ])
        assert.match((await c.rpc(name, args)).error.message, /admin/);
      await pg.exec("reset role");
      await pg.exec("set role anon");
      assert.match(
        (await c.rpc("inspect_dictionary_exchange", { drafts: [] })).error
          .message,
        /permission denied/,
      );
    } finally {
      await pg.close();
    }
  },
);
test(
  "v1 IndexedDB upgrade preserves all pending operations; item checkpoints retain owner boundaries and stop/reopen",
  { timeout: 30000 },
  async () => {
    await deleteDB("nexus-dictionary-import-review");
    const old = await openDB("nexus-dictionary-import-review", 1, {
      upgrade(db) {
        db.createObjectStore("sessions", { keyPath: "owner_id" });
      },
    });
    const items = Array.from({ length: 60 }, (_, i) => ({
      id: id(100 + i),
      draft: draft(1000 + i * 10),
      bucket: "safe",
      safeAction: "new",
      issues: [],
      status: "pending",
      operation: { operation_id: id(300 + i) },
    }));
    const s = {
      owner_id: owner,
      id: id(400),
      source_type: "json",
      preview_at: new Date().toISOString(),
      items,
    };
    await old.put("sessions", s);
    old.close();
    const saved = await loadImportSession(owner);
    assert.equal(saved.items.length, 60);
    saved.items[0].status = "applied";
    await persistImportSession(saved, [saved.items[0]]);
    assert.equal((await loadImportSession(owner)).items.length, 60);
    assert.equal(
      (await loadImportSession(owner)).items[59].operation.operation_id,
      items[59].operation.operation_id,
    );
    assert.equal(await loadImportSession(id(900001)), null);
  },
);
test(
  "bounded batch delegates per-item validation: invalid FK/POS rolls back every bad item and audit; valid item has one receipt; stale recheck preserves Review guard",
  { timeout: 60000 },
  async () => {
    const pg = await database();
    try {
      const c = client(pg),
        drafts = [draft(100), draft(200)];
      const inspected = await c.rpc("inspect_dictionary_exchange", {
        drafts: drafts.map(mapDictionaryDraft),
      });
      assert.equal(inspected.error, null);
      const ops = drafts.map((d, i) => {
        const { exchange, ...context } = inspected.data[i];
        return {
          owner_id: owner,
          session_id: id(8000),
          operation_id: id(8001 + i),
          source_type: "json",
          preview_at: new Date().toISOString(),
          observed: mapDictionaryDraft(d),
          candidate: mapDictionaryDraft(d),
          expected_context: context,
          effect: "write",
          exchange_version: exchange.version,
        };
      });
      ops[1].candidate.inflections = [
        {
          id: id(202),
          entry_id: id(200),
          sense_id: id(9999),
          form_kind: "past",
          form: "bad",
          sort_order: 0,
        },
      ];
      const r = await c.rpc("apply_dictionary_import_batch", {
        operations: ops,
      });
      assert.deepEqual(
        r.data.map((x) => x.status),
        ["applied", "failed"],
      );
      assert.equal(
        await sql(pg, "select count(*)::int v from dictionary_entries"),
        1,
      );
      assert.equal(
        await sql(pg, "select count(*)::int v from dictionary_senses"),
        1,
      );
      assert.equal(
        await sql(pg, "select count(*)::int v from dictionary_inflections"),
        0,
      );
      assert.equal(
        await sql(
          pg,
          "select count(*)::int v from dictionary_import_operations",
        ),
        1,
      );
      await c.rpc("apply_dictionary_import_batch", { operations: ops });
      assert.equal(
        await sql(
          pg,
          "select count(*)::int v from dictionary_import_operations",
        ),
        1,
      );
      const doc = await exportAll(c);
      doc.records[0].snapshot.detail.entry.headword = "proposed";
      let s = await previewExchange(c, owner, doc);
      await pg.query(
        "update dictionary_senses set gloss_zh_tw='newer' where entry_id=$1",
        [id(100)],
      );
      s = await applyImportItems(c, s, false, async () => {}, {
        batched: true,
      });
      assert.equal(s.items[0].status, "stale");
      const {
        recheckExchangeItem,
      } = require("../src/features/dictionary/dictionaryExchange.ts");
      const rechecked = await recheckExchangeItem(c, s.items[0]);
      assert.ok(
        rechecked.issues.some(
          (i) => i.type === "rebase_confirmation" && i.selectedAction === null,
        ),
      );
      assert.equal(
        rechecked.exchange_version,
        (
          await c.rpc("inspect_dictionary_exchange", {
            drafts: [mapDictionaryDraft(drafts[0])],
          })
        ).data[0].exchange.version,
      );
    } finally {
      await pg.close();
    }
  },
);
