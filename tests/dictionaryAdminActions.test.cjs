require("./loadStudy.cjs");
require("fake-indexeddb/auto");
const ts = require("typescript"),
  fs = require("node:fs"),
  test = require("node:test"),
  assert = require("node:assert/strict");
require.extensions[".tsx"] = (module, filename) =>
  module._compile(
    ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
        jsx: ts.JsxEmit.ReactJSX,
      },
    }).outputText,
    filename,
  );
const React = require("react"),
  { renderToStaticMarkup } = require("react-dom/server");
const {
  DictionaryEditor,
} = require("../src/features/dictionary/DictionaryAdmin.tsx");
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
  deleteDictionaryDrafts,
} = require("../src/features/dictionary/deleteDrafts.ts");
const save = (pg, d) =>
  sql(pg, "select apply_dictionary_drafts($1,false,true) v", [
    JSON.stringify([mapDictionaryDraft(d)]),
  ]);
test("delete button only for persisted Draft editor; new, Published and Review candidates are protected", () => {
  const detail = {
    entry: {
      ...draft(1),
      id: id(1),
      revision: 1,
      status: "draft",
      published_at: null,
      updated_at: "",
    },
    senses: [],
    relations: [],
    etymologies: [],
    learning_notes: [],
  };
  const html = (d, props = {}) =>
    renderToStaticMarkup(
      React.createElement(DictionaryEditor, {
        detail: d,
        entries: [],
        senses: [],
        onSaved: async () => {},
        onDeleted: () => {},
        ...props,
      }),
    );
  assert.ok(html(detail).includes("刪除草稿"));
  assert.ok(
    !html({ ...detail, entry: { ...detail.entry, revision: 0 } }).includes(
      "刪除草稿",
    ),
  );
  assert.ok(
    !html({
      ...detail,
      entry: { ...detail.entry, status: "published" },
    }).includes("刪除草稿"),
  );
  assert.ok(!html(detail, { saveReview: async () => {} }).includes("刪除草稿"));
  const admin = fs.readFileSync(
      "src/features/dictionary/DictionaryAdmin.tsx",
      "utf8",
    ),
    publisher = fs.readFileSync(
      "src/features/dictionary/DictionaryBulkPublish.tsx",
      "utf8",
    );
  assert.ok(!admin.includes("checked={selected.includes"));
  assert.ok(!admin.includes("onDelete={()=>"));
  assert.ok(!admin.includes("onPublish={()=>"));
  assert.ok(publisher.includes("kind_filters:[],query_text:''"));
  assert.ok(!publisher.includes("kind_filters:job.kinds"));
  assert.ok(!publisher.includes("excludesDraft"));
});
test("existing latest single-target RPC: cancellation, revisions, admin, external references, full children cleanup and immutable Published/Review history", async () => {
  const pg = await database();
  try {
    await save(pg, draft(10, "root"));
    const dependent = draft(20);
    dependent.relations = [
      {
        id: id(22),
        sense_id: null,
        target_entry_id: id(10),
        target_sense_id: id(11),
      },
    ];
    await save(pg, dependent);
    const full = draft(30);
    full.inflections = [
      {
        id: id(32),
        sense_id: id(31),
        form: "went",
        form_kind: "past",
        sort_order: 0,
      },
    ];
    full.pronunciations = [
      {
        id: id(33),
        sense_id: null,
        ipa: "ipa",
        locale: "en",
        note: "note",
        sort_order: 0,
      },
    ];
    full.examples = [
      { id: id(34), sense_id: null, body: "example", sort_order: 0 },
    ];
    full.relation_hints = [
      { id: id(35), sense_id: null, body: "annotation", sort_order: 0 },
    ];
    full.etymologies = [
      {
        id: id(36),
        sense_id: null,
        body: "origin",
        data_source: "",
      },
    ];
    full.learning_notes = [
      { id: id(37), sense_id: null, kind: "mnemonic_scenario", body: "note" },
    ];
    await save(pg, full);
    await save(pg, draft(40));
    await sql(pg, "select publish_dictionary_entry($1,true) v", [id(40)]);
    const published = await sql(pg, "select get_dictionary_ai_snapshot($1) v", [
      id(40),
    ]);
    const review = await sql(
      pg,
      "select create_dictionary_review($1,$2,null,'manual',false) v",
      [id(40), JSON.stringify(published)],
    );
    const history = await sql(
      pg,
      "select jsonb_agg(to_jsonb(h) order by revision) v from dictionary_published_revisions h where entry_id=$1",
      [id(40)],
    );
    const c = {
      rpc: async (name, args) => {
        assert.equal(name, "delete_dictionary_drafts");
        try {
          return {
            data: await sql(pg, "select delete_dictionary_drafts($1) v", [
              JSON.stringify(args.targets),
            ]),
            error: null,
          };
        } catch (e) {
          return { error: { message: e.message } };
        }
      },
    };
    const entry = async (n) =>
      (await sql(pg, "select get_dictionary_entry($1) v", [id(n)])).entry;
    assert.equal(
      await deleteDictionaryDrafts(c, [await entry(30)], () => false),
      null,
    );
    assert.equal(
      await sql(pg, "select count(*)::int v from dictionary_inflections"),
      1,
    );
    await assert.rejects(
      deleteDictionaryDrafts(
        c,
        [{ ...(await entry(30)), revision: 99 }],
        () => true,
      ),
      /Revision conflict/,
    );
    await assert.rejects(
      deleteDictionaryDrafts(c, [await entry(10)], () => true),
      /referenced/,
    );
    await pg.query("select set_config('request.jwt.claim.sub',$1,false)", [
      id(900001),
    ]);
    await assert.rejects(
      c
        .rpc("delete_dictionary_drafts", {
          targets: [{ id: id(30), revision: 1 }],
        })
        .then((r) => {
          if (r.error) throw Error(r.error.message);
        }),
      /admin/,
    );
    await pg.query("select set_config('request.jwt.claim.sub',$1,false)", [
      owner,
    ]);
    await assert.rejects(
      sql(pg, "select delete_dictionary_drafts($1) v", [
        JSON.stringify([
          { id: id(40), revision: published.detail.entry.revision },
        ]),
      ]),
      /Published/,
    );
    assert.equal(
      await deleteDictionaryDrafts(c, [await entry(30)], () => true),
      1,
    );
    for (const table of [
      "dictionary_entries",
      "dictionary_senses",
      "dictionary_inflections",
      "dictionary_pronunciations",
      "dictionary_examples",
      "dictionary_lexical_annotations",
      "dictionary_etymologies",
      "dictionary_learning_notes",
    ])
      assert.equal(
        await sql(
          pg,
          `select count(*)::int v from ${table} where ${table === "dictionary_entries" ? "id" : "entry_id"}=$1`,
          [id(30)],
        ),
        0,
        table,
      );
    assert.deepEqual(
      await sql(pg, "select get_dictionary_ai_snapshot($1) v", [id(40)]),
      published,
    );
    assert.deepEqual(
      await sql(
        pg,
        "select to_jsonb(r) v from dictionary_review_drafts r where id=$1",
        [review.id],
      ),
      review,
    );
    assert.deepEqual(
      await sql(
        pg,
        "select jsonb_agg(to_jsonb(h) order by revision) v from dictionary_published_revisions h where entry_id=$1",
        [id(40)],
      ),
      history,
    );
    assert.ok(
      await sql(
        pg,
        "select count(*)::int v from dictionary_audit where operation='DELETE'",
      ),
    );
  } finally {
    await pg.close();
  }
});
test("global publication preview/execution includes all kinds and drafts outside visible filter, retaining manual verification", async () => {
  const pg = await database();
  try {
    for (const [n, kind] of [
      [100, "word"],
      [110, "prefix"],
      [120, "root"],
    ])
      await save(pg, draft(n, kind));
    const c = client(pg);
    const filtered = await c.rpc("preview_dictionary_bulk_publish", {
      kind_filters: ["word"],
      query_text: "entry100",
    });
    assert.equal(filtered.data.total, 1);
    const global = await c.rpc("preview_dictionary_bulk_publish", {
      kind_filters: [],
      query_text: "",
    });
    assert.equal(global.data.total, 3);
    const denied = await c.rpc("publish_dictionary_bulk", {
      kind_filters: [],
      query_text: "",
      expected_signature: global.data.signature,
      content_verified: false,
    });
    assert.match(denied.error.message, /verif|查證/i);
    const applied = await c.rpc("publish_dictionary_bulk", {
      kind_filters: [],
      query_text: "",
      expected_signature: global.data.signature,
      content_verified: true,
    });
    assert.equal(applied.data.published_total, 3);
    assert.equal(
      await sql(
        pg,
        "select count(*)::int v from dictionary_entries where status='published'",
      ),
      3,
    );
  } finally {
    await pg.close();
  }
});
