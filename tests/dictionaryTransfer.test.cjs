require("./loadStudy.cjs");
require("fake-indexeddb/auto");
const test = require("node:test"),
  assert = require("node:assert/strict");
const {
  database,
  client,
  owner,
  id,
  sql,
  draft,
} = require("./fixtures/dictionaryTransferDatabase.cjs");
const {
  mapDictionaryDraft,
} = require("../src/features/dictionary/draftPipeline.ts");
const {
  buildImportSession,
} = require("../src/features/dictionary/importReview.ts");
const {
  persistentPreview,
  importSafety,
  stagePersistentSession,
  partialImportPlan,
  applyPersistentRecords,
} = require("../src/features/dictionary/persistentImport.ts");
const {
  parseExchange,
  previewExchange,
} = require("../src/features/dictionary/dictionaryExchange.ts");
const {
  previewExport,
  createExportJob,
  continueExport,
  exportDocument,
} = require("../src/features/dictionary/exchangeExport.ts");
const save = (pg, d) =>
  sql(pg, "select apply_dictionary_drafts($1,false,true) v", [
    JSON.stringify([mapDictionaryDraft(d)]),
  ]);
const preview = async (c, d) =>
  persistentPreview(
    await buildImportSession(c, owner, "json", [d], [], crypto.randomUUID(), {
      exchange: true,
    }),
  );
async function staged(c, d) {
  const session = await preview(c, d);
  return (await stagePersistentSession(c, session, "transfer-test.json"))[0];
}
const exportPage = (c, pending = false, kinds = ["word", "prefix", "root"]) =>
  c
    .rpc("export_dictionary_exchange_page", {
      kind_filters: kinds,
      status_filters: [],
      query_text: "",
      after_id: null,
      expected_scope: null,
      pending_only: pending,
      preview_only: false,
    })
    .then((r) => {
      assert.ifError(r.error);
      return r.data;
    });
test("isolated transfer SQL: pending export includes full absent-entry candidates; drafts alone are not pending; stable re-download and scope invalidation", async () => {
  const pg = await database(),
    c = client(pg);
  try {
    await save(pg, draft(100));
    assert.equal((await exportPage(c, true)).total, 0);
    const ghost = draft(200);
    ghost.senses[0].gloss_zh_tw = "完整候選";
    ghost.senses.push({ ...ghost.senses[0], id: id(203) });
    let r = await staged(c, ghost);
    // A genuine unresolved source exists before an Entry is created.
    assert.equal(r.pending_count > 0, true);
    const page = await exportPage(c, true);
    assert.equal(page.total, 1);
    assert.equal(page.records[0].snapshot, null);
    assert.equal(
      page.records[0].import_reviews[0].item.draft.senses[0].gloss_zh_tw,
      "完整候選",
    );
    const doc = parseExchange(
      JSON.stringify({
        format: "nexus-dictionary-exchange",
        schema_version: 1,
        exported_at: new Date().toISOString(),
        scope: { kinds: ["word"], statuses: [], query: "", pending_only: true },
        records: page.records,
      }),
    );
    doc.records[0].import_candidate.senses[1].gloss_zh_tw = "整理後獨立義項";
    const previewed = persistentPreview(await previewExchange(c, owner, doc));
    assert.equal(previewed.items[0].draft.entry_id, ghost.entry_id);
    assert.equal(importSafety(previewed.items[0]), "safe");
    const scope = {
        kinds: ["word"],
        statuses: [],
        query: "",
        pending_only: true,
      },
      frozen = await previewExport(c, scope),
      job = await continueExport(
        c,
        await createExportJob(owner, scope, frozen),
        () => {},
      );
    const completed = await exportDocument(job);
    assert.equal(completed.records.length, 1);
    await staged(
      c,
      (() => {
        const d = draft(300);
        d.senses.push({ ...d.senses[0], id: id(303) });
        return d;
      })(),
    );
    assert.deepEqual(await exportDocument(job), completed);
    const stale = await c.rpc("export_dictionary_exchange_page", {
      kind_filters: ["word"],
      status_filters: [],
      query_text: "",
      after_id: null,
      expected_scope: frozen.scope_version,
      pending_only: true,
      preview_only: false,
    });
    assert.ok(stale.error);
    assert.equal((await exportPage(c, true, ["root"])).total, 0);
  } finally {
    await pg.close();
  }
});
test("safe additions, actual modification, identity/version conflicts and mixed entries retain distinct classifications", async () => {
  const pg = await database(),
    c = client(pg);
  try {
    const d = draft(500);
    await save(pg, d);
    const changed = structuredClone(d);
    changed.senses[0].gloss_zh_tw = "修改既有";
    assert.equal(importSafety((await preview(c, changed)).items[0]), "review");
    const added = structuredClone(d);
    added.senses.push({
      id: id(503),
      part_of_speech: "noun",
      gloss_zh_tw: "獨立名詞",
    });
    assert.equal(importSafety((await preview(c, added)).items[0]), "safe");
    added.senses[0].gloss_zh_tw = "有爭議";
    assert.equal(importSafety((await preview(c, added)).items[0]), "review");
    const illegal = structuredClone(d);
    illegal.entry_id = id(550);
    assert.equal(importSafety((await preview(c, illegal)).items[0]), "invalid");
  } finally {
    await pg.close();
  }
});
test("atomic real RPC safe replacement clears only proven issues; replay idempotent; stale proof, unrelated identity and cleanup failure preserve sources", async () => {
  const pg = await database(),
    c = client(pg);
  try {
    const original = draft(700);
    await save(pg, original);
    const old = structuredClone(original);
    old.senses.push({
      id: id(703),
      part_of_speech: "noun",
      gloss_zh_tw: "舊候選",
    });
    old.senses[0].gloss_zh_tw = "不相關的舊差異";
    const oldRow = await staged(c, old);
    const pending = await exportPage(c, true),
      record = pending.records.find((r) => r.entry_id === original.entry_id);
    assert.ok(record);
    record.import_candidate.senses.reverse();
    const sameReview=persistentPreview(await previewExchange(c,owner,parseExchange(JSON.stringify({format:'nexus-dictionary-exchange',schema_version:1,exported_at:new Date().toISOString(),scope:{kinds:['word'],statuses:[],query:''},records:[record]}))));
    assert.equal(importSafety(sameReview.items[0]),'review');
    const repeated=(await stagePersistentSession(c,sameReview,'same-review-again.json'))[0];assert.equal(repeated.id,oldRow.id,'same pending proposal must not grow duplicate review records because provenance is attached');
    const fresh = structuredClone(original);
    fresh.senses.push({
      id: id(703),
      part_of_speech: "noun",
      gloss_zh_tw: "整理後獨立義項",
    });
    const s = await preview(c, fresh);
    assert.equal(importSafety(s.items[0]), "safe");
    const oldIssue = oldRow.item.issues.find((i) => i.target?.id === id(703));
    assert.ok(oldIssue);
    const proof = record.import_reviews.find((r) => r.id === oldRow.id);
    s.items[0].replacement_refs = [
      {
        id: proof.id,
        entry_id: proof.entry_id,
        revision: proof.revision,
        version: proof.version,
        issue_ids: [oldIssue.id],
      },
    ];
    const row = (await stagePersistentSession(c, s, "organized.json"))[0],
      plan = partialImportPlan(row.item, false);
    assert.ok(plan.draft);
    const operation = {
      id: row.id,
      revision: row.revision,
      candidate: mapDictionaryDraft(plan.draft),
      handled: plan.handled,
      effect: plan.effect,
      replaces: s.items[0].replacement_refs,
    };
    const before = await sql(
      pg,
      "select to_jsonb(r) v from dictionary_import_review_items r where id=$1",
      [oldRow.id],
    );
    const overwrite=structuredClone(operation);overwrite.candidate.bundle.dictionary_senses[0].gloss_zh_tw='forged overwrite';
    assert.match((await c.rpc('apply_dictionary_safe_import_reviews',{operations:[overwrite]})).data[0].request_conflict,/requires review/);
    // Trigger failure after the original writer must roll back the draft AND cleanup.
    await pg.exec(
      `reset role;create function public.transfer_fail() returns trigger language plpgsql as $$begin if old.id='${oldRow.id}' then raise exception 'forced cleanup failure';end if;return new;end$$;create trigger transfer_fail before update on dictionary_import_review_items for each row execute function transfer_fail();set role authenticated;`,
    );
    let result = await c.rpc("apply_dictionary_safe_import_reviews", {
      operations: [operation],
    });
    assert.ifError(result.error);
    assert.match(result.data[0].request_conflict, /forced cleanup/);
    assert.deepEqual(
      await sql(
        pg,
        "select to_jsonb(r) v from dictionary_import_review_items r where id=$1",
        [oldRow.id],
      ),
      before,
    );
    assert.equal(
      await sql(
        pg,
        "select count(*)::integer v from dictionary_senses where id=$1",
        [id(703)],
      ),
      0,
    );
    await pg.exec(
      "reset role;drop trigger transfer_fail on dictionary_import_review_items;set role authenticated",
    );
    result = await c.rpc("apply_dictionary_safe_import_reviews", {
      operations: [operation],
    });
    assert.ifError(result.error);
    assert.equal(
      result.data[0].request_conflict,
      undefined,
      JSON.stringify(result.data),
    );
    assert.equal(result.data[0].result.safe_replacement, true);
    const retained = await sql(
      pg,
      "select to_jsonb(r) v from dictionary_import_review_items r where id=$1",
      [oldRow.id],
    );
    assert.equal(
      retained.item.issues.find((i) => i.id === oldIssue.id).applied,
      true,
    );
    assert.ok(retained.pending_count > 0);
    assert.ok(retained.item.issues.some((i) => !i.applied));
    const replay = await c.rpc("apply_dictionary_safe_import_reviews", {
      operations: [operation],
    });
    assert.ifError(replay.error);
    assert.equal(replay.data[0].request_conflict, undefined);
    assert.equal(
      await sql(
        pg,
        "select count(*)::integer v from dictionary_senses where id=$1",
        [id(703)],
      ),
      1,
    );
    const unauthorized = await staged(c, draft(800)),
      p = partialImportPlan(unauthorized.item, false);
    const bad = {
      id: unauthorized.id,
      revision: unauthorized.revision,
      candidate: mapDictionaryDraft(p.draft),
      handled: p.handled,
      effect: p.effect,
      replaces: operation.replaces,
    };
    const rejected = await c.rpc("apply_dictionary_safe_import_reviews", {
      operations: [bad],
    });
    assert.ok(rejected.data[0].request_conflict);
    assert.equal(
      await sql(
        pg,
        "select count(*)::integer v from dictionary_entries where id=$1",
        [id(800)],
      ),
      0,
    );
    await pg.query("select set_config('request.jwt.claim.sub',$1,false)", [
      id(900001),
    ]);
    assert.match(
      (await c.rpc("apply_dictionary_safe_import_reviews", { operations: [] }))
        .error.message,
      /admin/,
    );
    assert.equal(
      await sql(
        pg,
        "select count(*)::integer v from dictionary_import_review_items",
      ),
      0,
    );
  } finally {
    await pg.close();
  }
});

test("Published content stays isolated; unchanged cannot consume proofs; stale revision, omitted proof, new ID duplicates and unknown structure are rejected", async () => {
  const pg = await database(),
    c = client(pg);
  try {
    const d = draft(1000);
    await save(pg, d);
    await sql(pg, "select publish_dictionary_entry($1,true) v", [d.entry_id]);
    const published = await sql(pg, "select get_dictionary_ai_snapshot($1) v", [
      d.entry_id,
    ]);
    const old = structuredClone(d);
    old.senses.push({
      id: id(1003),
      part_of_speech: "noun",
      gloss_zh_tw: "候選義項",
    });
    const source = await staged(c, old),
      record = (await exportPage(c, true)).records.find(
        (r) => r.entry_id === d.entry_id,
      ),
      proof = record.import_reviews.find((r) => r.id === source.id),
      issue = source.item.issues.find((i) => i.target?.id === id(1003));
    assert.ok(issue);
    const organized = structuredClone(old);
    organized.senses[1].gloss_zh_tw = "獨立整理後";
    const session = await preview(c, organized);
    session.items[0].replacement_refs = [
      {
        id: proof.id,
        entry_id: proof.entry_id,
        revision: proof.revision,
        version: proof.version,
        issue_ids: [issue.id],
      },
    ];
    const row = (
        await stagePersistentSession(c, session, "organized-published.json")
      )[0],
      plan = partialImportPlan(row.item, false),
      op = {
        id: row.id,
        revision: row.revision,
        candidate: mapDictionaryDraft(plan.draft),
        handled: plan.handled,
        effect: plan.effect,
        replaces: session.items[0].replacement_refs,
      };
    const bad = structuredClone(op);
    bad.replaces[0].revision++;
    let reply = (
      await c.rpc("apply_dictionary_safe_import_reviews", { operations: [bad] })
    ).data[0];
    assert.match(reply.request_conflict, /source changed/);
    assert.equal(
      await sql(
        pg,
        "select count(*)::integer v from dictionary_review_drafts where state='active'",
      ),
      0,
    );
    const missing = structuredClone(op);
    delete missing.revision;
    assert.match(
      (
        await c.rpc("apply_dictionary_safe_import_reviews", {
          operations: [missing],
        })
      ).data[0].request_conflict,
      /revision/,
    );
    reply = (
      await c.rpc("apply_dictionary_safe_import_reviews", { operations: [op] })
    ).data[0];
    assert.equal(reply.request_conflict, undefined, JSON.stringify(reply));
    assert.equal(reply.result.effect, "review");
    assert.deepEqual(
      await sql(pg, "select get_dictionary_ai_snapshot($1) v", [d.entry_id]),
      published,
    );
    assert.equal(
      (
        await sql(
          pg,
          "select candidate v from dictionary_review_drafts where state='active'",
        )
      ).bundle.dictionary_senses.length,
      2,
    );
    // Same content is not an actual write and cannot clear an unrelated pending difference.
    const pending = structuredClone(organized);
    pending.senses[0].gloss_zh_tw = "保留的爭議";
    const pendingRow = await staged(c, pending),
      pendingRecord = (await exportPage(c, true)).records.find(
        (r) => r.entry_id === d.entry_id,
      ),
      pendingProof = pendingRecord.import_reviews.find(
        (r) => r.id === pendingRow.id,
      );
    assert.ok(pendingProof);
    const unchanged = await staged(c, organized),
      noChange = partialImportPlan(unchanged.item, false);
    const unchangedRequest = {
      id: unchanged.id,
      revision: unchanged.revision,
      candidate: noChange.draft ? mapDictionaryDraft(noChange.draft) : null,
      handled: noChange.handled,
      effect: noChange.effect,
      replaces: [
        {
          id: pendingProof.id,
          revision: pendingProof.revision,
          version: pendingProof.version,
          issue_ids: [pendingRow.item.issues[0].id],
        },
      ],
    };
    const rejected = (
      await c.rpc("apply_dictionary_safe_import_reviews", {
        operations: [unchangedRequest],
      })
    ).data[0];
    assert.ok(rejected.request_conflict);
    assert.equal(
      (
        await sql(
          pg,
          "select item v from dictionary_import_review_items where id=$1",
          [pendingRow.id],
        )
      ).issues.some((i) => i.applied),
      false,
    );
    const noCleanup=structuredClone(unchangedRequest);noCleanup.replaces.forEach(r=>r.issue_ids=[]);
    const unchangedReply=(await c.rpc('apply_dictionary_safe_import_reviews',{operations:[noCleanup]})).data[0];
    assert.equal(unchangedReply.request_conflict,undefined,JSON.stringify(unchangedReply));assert.equal(unchangedReply.result.status,'unchanged');
    assert.equal((await sql(pg,'select item v from dictionary_import_review_items where id=$1',[pendingRow.id])).issues.some(i=>i.applied),false);
    const duplicate = structuredClone(organized);
    duplicate.senses.push({ ...organized.senses[0], id: id(1005) });
    assert.equal(
      importSafety((await preview(c, duplicate)).items[0]),
      "review",
    );
    const document = {
      format: "nexus-dictionary-exchange",
      schema_version: 1,
      exported_at: new Date().toISOString(),
      scope: { kinds: ["word"], statuses: [], query: "" },
      records: [record],
    };
    document.records[0].import_candidate.unknown_field = "must reject";
    const invalid = persistentPreview(
      await previewExchange(c, owner, parseExchange(JSON.stringify(document))),
    );
    assert.equal(importSafety(invalid.items[0]), "invalid");
  } finally {
    await pg.close();
  }
});
test("1001 entries: bounded pages, type combinations, empty pending, interruption/resume and owner-separated cached downloads", async () => {
  const pg = await database(),
    c = client(pg);
  try {
    await pg.exec(
      "insert into dictionary_entries(id,kind,headword) select ('00000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,case when n%3=0 then 'prefix' when n%3=1 then 'root' else 'word' end,'bulk-'||n from generate_series(2000,3000)n;",
    );
    const scope = {
        kinds: ["word", "prefix", "root"],
        statuses: [],
        query: "",
        pending_only: false,
      },
      previewed = await previewExport(c, scope);
    assert.equal(previewed.total, 1001);
    const abort = new AbortController();
    let pages = 0;
    const stopped = await continueExport(
      c,
      await createExportJob(owner, scope, previewed),
      () => {
        pages++;
        abort.abort();
      },
      abort.signal,
    );
    assert.equal(stopped.processed, 100);
    assert.equal(stopped.complete, false);
    const finished = await continueExport(c, stopped, () => pages++);
    assert.equal(pages, 11);
    const exported = await exportDocument(finished);
    assert.equal(new Set(exported.records.map((r) => r.entry_id)).size, 1001);
    assert.equal(
      (await previewExport(c, { ...scope, kinds: ["root", "prefix"] })).total,
      667,
    );
    assert.equal(
      (await previewExport(c, { ...scope, pending_only: true })).total,
      0,
    );
    await assert.rejects(previewExport(c, { ...scope, kinds: [] }), /Select/);
    const other = await createExportJob(id(900001), scope);
    assert.equal(other.processed, 0);
    assert.deepEqual(await exportDocument(finished), exported);
  } finally {
    await pg.close();
  }
});

test("migration DDL failure rolls back and grants remain least privilege", async () => {
  const fs = require("node:fs"),
    base = require("./fixtures/retirementDatabase.cjs"),
    pg = await base.database();
  try {
    for (const name of ["official", "ipa", "page"])
      await base.migrate(pg, name);
    const count = await sql(
      pg,
      "select count(*)::integer v from dictionary_entries",
    );
    const migration = fs.readFileSync(
      "supabase/migrations/20261106032651_dictionary_exchange_safe_replacement.sql",
      "utf8",
    );
    await pg.exec("reset role");
    await assert.rejects(
      pg.exec(
        migration.replace(
          /commit;\s*$/,
          "select public.forced_transfer_migration_failure();commit;",
        ),
      ),
    );
    await pg.exec("rollback");
    assert.equal(
      await sql(
        pg,
        "select to_regprocedure('public.dictionary_exchange_transfer_capabilities()')::text v",
      ),
      null,
    );
    await pg.exec(migration);
    assert.equal(
      await sql(pg, "select count(*)::integer v from dictionary_entries"),
      count,
    );
    for (const signature of [
      "dictionary_transfer_reviews(text)",
      "dictionary_assert_safe_transfer(jsonb,jsonb)",
      "dictionary_transfer_covers(jsonb,jsonb,jsonb)",
    ]) {
      assert.equal(
        await sql(
          pg,
          "select has_function_privilege('authenticated',$1,'EXECUTE') v",
          [signature],
        ),
        false,
      );
      assert.equal(
        await sql(
          pg,
          "select has_function_privilege('service_role',$1,'EXECUTE') v",
          [signature],
        ),
        false,
      );
    }
    assert.equal(
      await sql(
        pg,
        "select has_function_privilege('anon','public.apply_dictionary_safe_import_reviews(jsonb)','EXECUTE') v",
      ),
      false,
    );
  } finally {
    await pg.close();
  }
});
