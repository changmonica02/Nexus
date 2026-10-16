require("./loadStudy.cjs");
require("fake-indexeddb/auto");
const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs");
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
  previewExchange,
  exchangeCategory,
} = require("../src/features/dictionary/dictionaryExchange.ts");
const {
  applyImportItems,
} = require("../src/features/dictionary/importReview.ts");
const {
  persistImportSession,
  loadImportSession,
  loadDictionaryJob,
} = require("../src/features/dictionary/importSessionStore.ts");
const {
  createExportJob,
  continueExport,
  exportDocument,
} = require("../src/features/dictionary/exchangeExport.ts");
const { IDBObjectStore } = require("fake-indexeddb");
const scope = { kinds: [], statuses: [], query: "" };
const save = (pg, d) =>
  sql(pg, "select apply_dictionary_drafts($1,false,true) v", [
    JSON.stringify([mapDictionaryDraft(d)]),
  ]);
const page = (c, args = {}) =>
  c.rpc("export_dictionary_exchange_page", {
    kind_filters: [],
    status_filters: [],
    query_text: "",
    after_id: null,
    expected_scope: null,
    ...args,
  });
async function doc(c) {
  return exportDocument(
    await continueExport(c, await createExportJob(owner, scope), () => {}),
  );
}
async function failPut(storeName, work) {
  const original = IDBObjectStore.prototype.put;
  IDBObjectStore.prototype.put = function (...args) {
    if (this.name === storeName)
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    return original.apply(this, args);
  };
  try {
    await work();
  } finally {
    IDBObjectStore.prototype.put = original;
  }
}
test("export digest covers every JSON source, Review content/lifecycle, both sides of cursor; no Entry revision needed", async () => {
  const pg = await database();
  try {
    const root = draft(10, "root");
    await save(pg, root);
    await sql(pg, "select publish_dictionary_entry($1,true) v", [id(10)]);
    const snapshot = await sql(pg, "select get_dictionary_ai_snapshot($1) v", [
      id(10),
    ]);
    await sql(
      pg,
      "select create_dictionary_review($1,$2,null,'manual',false) v",
      [id(10), JSON.stringify(snapshot)],
    );
    const word = draft(20);
    word.relations = [
      {
        id: id(22),
        sense_id: null,
        target_entry_id: id(10),
        target_sense_id: id(11),
      },
    ];
    word.component_order = [id(22)];
    word.etymologies = [
      {
        id: id(23),
        sense_id: null,
        body: "origin",
        verification: "unverified",
        verification_note: "",
      },
    ];
    word.learning_notes = [
      { id: id(24), sense_id: null, kind: "mnemonic_scenario", body: "note" },
    ];
    word.examples = [
      { id: id(25), sense_id: null, body: "example", sort_order: 0 },
    ];
    word.relation_hints = [
      { id: id(26), sense_id: null, body: "annotation", sort_order: 0 },
    ];
    word.pronunciations = [
      {
        id: id(27),
        sense_id: null,
        ipa: "ipa",
        locale: "en",
        note: null,
        sort_order: 0,
      },
    ];
    word.inflections = [
      {
        id: id(28),
        sense_id: id(21),
        form: "went",
        form_kind: "past",
        sort_order: 0,
      },
    ];
    await save(pg, word);
    const prefix = draft(30, "prefix");
    prefix.senses[0].category =
      require("../src/features/dictionary/dictionaryCategories.ts").prefixCategories[0];
    prefix.grouping = {
      primary_category: null,
      tags: ["a"],
      variant_group: null,
    };
    await save(pg, prefix);
    // >100 real rows, including changes before and after the UUID cursor.
    await pg.exec("reset role");
    await pg.exec(
      "insert into dictionary_entries(id,kind,headword,status) select ('00000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'word','bulk'||n,'draft' from generate_series(100,201) n",
    );
    await pg.exec("set role authenticated");
    const c = client(pg),
      first = (await page(c)).data;
    assert.equal(first.records.length, 100);
    assert.equal(first.has_more, true);
    const mutations = [
      "update dictionary_entries set headword='changed' where id='" +
        id(20) +
        "'",
      "update dictionary_senses set gloss_zh_tw='changed' where id='" +
        id(21) +
        "'",
      "update dictionary_relations set sense_id='" +
        id(21) +
        "' where id='" +
        id(22) +
        "'",
      "update dictionary_etymologies set body='changed' where id='" +
        id(23) +
        "'",
      "update dictionary_learning_notes set body='changed' where id='" +
        id(24) +
        "'",
      "update dictionary_examples set body='changed' where id='" + id(25) + "'",
      "update dictionary_lexical_annotations set body='changed' where id='" +
        id(26) +
        "'",
      "update dictionary_pronunciations set ipa='changed' where id='" +
        id(27) +
        "'",
      "update dictionary_inflections set form='changed' where id='" +
        id(28) +
        "'",
      "update dictionary_entry_groups set tags=array['changed'] where id='" +
        id(30) +
        "'",
      "update dictionary_sense_groups set primary_category='" +
        require("../src/features/dictionary/dictionaryCategories.ts")
          .prefixCategories[1] +
        "' where sense_id='" +
        id(31) +
        "'",
      'update dictionary_ai_metadata set origin_ids=\'{"external":"changed"}\' where entry_id=\'' +
        id(20) +
        "'",
      "update dictionary_review_drafts set revision=revision+1,candidate=jsonb_set(candidate,'{bundle,dictionary_entries,0,headword}','\"review edit\"') where entry_id='" +
        id(10) +
        "'",
      "update dictionary_review_drafts set state='discarded' where entry_id='" +
        id(10) +
        "'",
      "update dictionary_entries set headword='after-cursor' where id='" +
        id(201) +
        "'",
    ];
    for (const [index, mutation] of mutations.entries()) {
      await pg.exec("begin;reset role");
      const revision = await sql(
        pg,
        "select revision v from dictionary_entries where id=$1",
        [id(20)],
      );
      await pg.exec(mutation);
      await pg.exec("set role authenticated");
      if (index > 0 && index < 14)
        assert.equal(
          await sql(
            pg,
            "select revision v from dictionary_entries where id=$1",
            [id(20)],
          ),
          revision,
        );
      const response = await page(c, {
        after_id: first.cursor,
        expected_scope: first.scope_version,
      });
      assert.match(response.error?.message ?? "", /scope changed/, mutation);
      await pg.exec("rollback");
      assert.equal((await page(c)).data.scope_version, first.scope_version);
    }
    // New active Review appears without changing the published Entry revision.
    await pg.exec("begin");
    await sql(
      pg,
      "select create_dictionary_review($1,$2,null,'manual',false) v",
      [id(10), JSON.stringify(snapshot)],
    );
    assert.match(
      (
        await page(c, {
          after_id: first.cursor,
          expected_scope: first.scope_version,
        })
      ).error.message,
      /scope changed/,
    );
    await pg.exec("rollback");
    assert.equal(
      (
        await page(c, {
          after_id: first.cursor,
          expected_scope: first.scope_version,
        })
      ).error,
      null,
    );
  } finally {
    await pg.close();
  }
});
test("local JSON versus newer Nexus edits is Conflict; Review-only changes block old previews and never overwrite", async () => {
  const pg = await database();
  try {
    const c = client(pg);
    await save(pg, draft(300));
    await sql(pg, "select publish_dictionary_entry($1,true) v", [id(300)]);
    const original = await doc(c),
      local = structuredClone(original);
    local.records[0].snapshot.detail.senses[0].gloss_zh_tw = "local edit";
    assert.equal(
      exchangeCategory((await previewExchange(c, owner, original)).items[0]),
      "unchanged",
    );
    const planned = await previewExchange(c, owner, local);
    assert.equal(exchangeCategory(planned.items[0]), "modified");
    await persistImportSession(planned);
    const base = original.records[0].snapshot;
    const review = await sql(
      pg,
      "select create_dictionary_review($1,$2,null,'manual',false) v",
      [id(300), JSON.stringify(base)],
    );
    assert.equal(
      exchangeCategory((await previewExchange(c, owner, local)).items[0]),
      "conflict",
    );
    const attempted = await applyImportItems(
      c,
      planned,
      true,
      persistImportSession,
      { batched: true },
    );
    assert.equal(attempted.items[0].status, "stale");
    assert.deepEqual(
      await sql(pg, "select get_dictionary_ai_snapshot($1) v", [id(300)]),
      base,
    );
    assert.equal(
      await sql(
        pg,
        "select count(*)::int v from dictionary_review_drafts where entry_id=$1",
        [id(300)],
      ),
      1,
    );
    const current = await doc(c);
    assert.equal(
      exchangeCategory((await previewExchange(c, owner, current)).items[0]),
      "unchanged",
    );
    current.records[0].snapshot.detail.senses[0].gloss_zh_tw = "new local";
    assert.equal(
      exchangeCategory((await previewExchange(c, owner, current)).items[0]),
      "review",
    );
    assert.equal(
      (
        await sql(
          pg,
          "select to_jsonb(r) v from dictionary_review_drafts r where id=$1",
          [review.id],
        )
      ).candidate.bundle.dictionary_senses[0].gloss_zh_tw,
      base.detail.senses[0].gloss_zh_tw,
    );
  } finally {
    await pg.close();
  }
});
test("IndexedDB quota/DataClone failures abort whole checkpoints; exact committed operation survives receipt-save failure and reload", async () => {
  const pg = await database();
  try {
    const c = client(pg);
    await save(pg, draft(400));
    const source = await doc(c);
    source.records[0].snapshot.detail.senses[0].gloss_zh_tw = "imported";
    const initial = await previewExchange(c, owner, source);
    await persistImportSession(initial);
    let calls = 0;
    const counted = {
      rpc: async (...args) => {
        calls++;
        return c.rpc(...args);
      },
    };
    await failPut("items", async () => {
      await assert.rejects(
        applyImportItems(counted, initial, true, persistImportSession, {
          batched: true,
        }),
        /Quota/,
      );
    });
    assert.equal(calls, 0);
    assert.equal(
      (await loadImportSession(owner)).items[0].operation,
      undefined,
    );
    let checkpoints = 0;
    await assert.rejects(
      applyImportItems(
        counted,
        initial,
        true,
        async (s, changed) => {
          if (++checkpoints === 2) {
            await failPut("items", () => persistImportSession(s, changed));
          } else await persistImportSession(s, changed);
        },
        { batched: true },
      ),
      /Quota/,
    );
    const pending = await loadImportSession(owner),
      nonce = pending.items[0].operation.operation_id;
    assert.equal(pending.items[0].status, "pending");
    const revision = await sql(
      pg,
      "select revision v from dictionary_senses where id=$1",
      [id(401)],
    );
    const done = await applyImportItems(
      c,
      pending,
      true,
      persistImportSession,
      { batched: true },
    );
    assert.equal(done.items[0].status, "applied");
    assert.equal(done.items[0].operation.operation_id, nonce);
    assert.equal(
      await sql(pg, "select revision v from dictionary_senses where id=$1", [
        id(401),
      ]),
      revision,
    );
    assert.equal(
      await sql(
        pg,
        "select count(*)::int v from dictionary_import_operations where operation_id=$1",
        [nonce],
      ),
      1,
    );
    const exportJob = await createExportJob(owner, scope);
    await failPut("jobs", () =>
      assert.rejects(
        continueExport(c, exportJob, () => {}),
        /Quota/,
      ),
    );
    assert.equal((await loadDictionaryJob(owner, "export")).pages, 0);
    const completed = await continueExport(
      c,
      await loadDictionaryJob(owner, "export"),
      () => {},
    );
    assert.equal((await exportDocument(completed)).records.length, 1);
    const incomplete = await loadImportSession(owner);
    incomplete.items[0].message = () => {};
    await assert.rejects(persistImportSession(incomplete), /clone/i);
    assert.equal((await loadImportSession(owner)).items[0].status, "applied");
  } finally {
    await pg.close();
  }
});
test("migration ACL/admin/actor/RLS/prerequisites, transport interruption, malformed scope response", async () => {
  const pg = await database();
  try {
    const names = [
      "dictionary_exchange_record",
      "dictionary_exchange_scope_version",
      "export_dictionary_exchange_page",
      "inspect_dictionary_exchange",
      "apply_dictionary_import_batch",
      "dictionary_bulk_publish_report",
    ];
    const functions = (
      await pg.query(
        "select proname,prosecdef,proconfig,has_function_privilege('anon',oid,'EXECUTE') anon,has_function_privilege('authenticated',oid,'EXECUTE') signed from pg_proc where pronamespace='public'::regnamespace and proname=any($1)",
        [names],
      )
    ).rows;
    assert.equal(functions.length, 6);
    for (const f of functions) {
      assert.equal(f.prosecdef, true);
      assert.deepEqual(f.proconfig, ['search_path=""']);
      assert.equal(f.anon, false);
      assert.equal(
        f.signed,
        ![
          "dictionary_exchange_record",
          "dictionary_exchange_scope_version",
        ].includes(f.proname),
      );
    }
    await save(pg, draft(500));
    const c = client(pg),
      job = await createExportJob(owner, scope);
    await assert.rejects(
      continueExport(
        { rpc: async () => ({ error: { message: "network interrupted" } }) },
        job,
        () => {},
      ),
      /network interrupted/,
    );
    assert.equal((await loadDictionaryJob(owner, "export")).pages, 0);
    const fake = { ...job, scope_version: "old" };
    await assert.rejects(
      continueExport(
        {
          rpc: async () => ({
            data: {
              records: [],
              total: 0,
              scope_version: "new",
              has_more: false,
            },
          }),
        },
        fake,
        () => {},
      ),
      /changed/,
    );
    const token = (
      await c.rpc("preview_dictionary_bulk_publish", {
        kind_filters: [],
        query_text: "",
      })
    ).data.signature;
    const mismatched = await c.rpc("apply_dictionary_import_batch", {
      operations: [
        { owner_id: id(900001), operation_id: id(700), candidate: {} },
      ],
    });
    assert.equal(mismatched.data[0].status, "failed");
    assert.match(mismatched.data[0].message, /owner mismatch/);
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
      ["dictionary_bulk_publish_report", { preview_id: id(1), page_number: 0 }],
    ])
      assert.match((await c.rpc(name, args)).error.message, /admin required/);
    await pg.exec("reset role");
    await pg.query("insert into dictionary_admins values($1)", [id(900001)]);
    await pg.exec("set role authenticated");
    assert.match(
      (
        await c.rpc("dictionary_bulk_publish_report", {
          preview_id: token,
          page_number: 0,
        })
      ).error.message,
      /not found/,
    );
    await pg.exec("reset role");
    const disabled = (
      await pg.query(
        "select relname from pg_class where relnamespace='public'::regnamespace and relkind='r' and relname like 'dictionary_%' and not relrowsecurity and relname not in ('dictionary_approval_capability')",
      )
    ).rows;
    assert.deepEqual(disabled, []);
    const guard = fs
      .readFileSync(
        "supabase/migrations/20261013084116_dictionary_bulk_exchange.sql",
        "utf8",
      )
      .split("create function public.dictionary_exchange_record")[0]
      .replace(/^begin;\n/m, "");
    await pg.exec(
      "begin;alter function public.dictionary_import_context(jsonb) rename to missing_context",
    );
    await assert.rejects(pg.exec(guard), /prerequisites missing/);
    await pg.exec("rollback");
  } finally {
    await pg.close();
  }
});
