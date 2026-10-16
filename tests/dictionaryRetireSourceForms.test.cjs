require("./loadStudy.cjs");
const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs");
const {
  database,
  sql,
  id,
  draft,
} = require("./fixtures/persistentImportDatabase.cjs");
const {
  mapDictionaryDraft,
} = require("../src/features/dictionary/draftPipeline.ts");
const migration =
  "supabase/migrations/20261016050000_dictionary_retire_source_forms.sql";
test(
  "retirement preserves structured IDs, active Review and import decisions; backup ACL, CAS, publication and rollback",
  { timeout: 90000 },
  async () => {
    const pg = await database();
    try {
      const d = draft(10);
      d.inflections = [
        {
          id: id(24),
          sense_id: id(11),
          form_kind: "past",
          form: "went",
          sort_order: 0,
        },
      ];
      await sql(pg, "select apply_dictionary_drafts($1,false,true) v", [
        JSON.stringify([mapDictionaryDraft(d)]),
      ]);
      await pg.exec("reset role");
      await pg.query(
        "insert into dictionary_lexical_annotations(id,entry_id,sense_id,kind,body) values($1,$2,$3,'source_forms','old raw'),($4,$2,$3,'relation_hint','keep hint')",
        [id(20), id(10), id(11), id(21)],
      );
      await pg.exec("set role authenticated");
      await sql(pg, "select publish_dictionary_entry($1,true) v", [id(10)]);
      const snapshot = await sql(
        pg,
        "select get_dictionary_ai_snapshot($1) v",
        [id(10)],
      );
      const r = await sql(
        pg,
        "select create_dictionary_review($1,$2,null,'manual',false) v",
        [id(10), JSON.stringify(snapshot)],
      );
      const item = {
        draft: { ...d, lexical_annotations: [{ id: id(20), body: "old raw" }] },
        status: "pending",
        issues: [
          {
            id: id(40),
            target: { section: "lexical_annotations" },
            selectedAction: "incoming",
          },
          { id: id(41), target: { section: "senses" }, selectedAction: "keep" },
        ],
      };
      await pg.exec("reset role");
      await pg.query(
        "insert into dictionary_import_review_items(id,proposal_key,entry_id,source,item,pending_count) values($1,'fixture',$2,'{}',$3,2)",
        [id(30), id(10), JSON.stringify(item)],
      );
      await pg.exec("reset role");
      await pg.exec(fs.readFileSync(migration, "utf8"));
      assert.equal(
        await sql(
          pg,
          "select count(*)::int v from dictionary_lexical_annotations where kind='source_forms'",
        ),
        0,
      );
      assert.equal(
        await sql(
          pg,
          "select count(*)::int v from dictionary_retirement_backup.source_forms",
        ),
        1,
      );
      assert.equal(
        await sql(
          pg,
          "select body v from dictionary_lexical_annotations where id=$1",
          [id(21)],
        ),
        "keep hint",
      );
      const next = await sql(
        pg,
        "select to_jsonb(r) v from dictionary_review_drafts r where id=$1",
        [r.id],
      );
      assert.equal(next.id, r.id);
      assert.equal(next.candidate.inflections[0].id, id(24));
      assert.equal(next.revision, r.revision + 1);
      assert.equal(next.candidate.annotations.length, 1);
      assert.equal(next.candidate.bundle.dictionary_senses[0].id, id(11));
      const pending = await sql(
        pg,
        "select to_jsonb(r) v from dictionary_import_review_items r where id=$1",
        [id(30)],
      );
      assert.equal(pending.pending_count, 1);
      assert.equal(pending.item.status, "stale");
      assert.equal(pending.item.issues[0].selectedAction, "keep");
      await pg.exec("begin");
      await pg.exec(
        fs
          .readFileSync(
            "docs/operations/DICTIONARY-SOURCE-FORMS-ROLLBACK.sql",
            "utf8",
          )
          .replace(/^begin;$/m, "")
          .replace(/^commit;$/m, ""),
      );
      assert.equal(
        await sql(
          pg,
          "select count(*)::int v from dictionary_lexical_annotations where kind='source_forms'",
        ),
        1,
      );
      await pg.exec("rollback");
      await pg.exec("set role authenticated");
      await assert.rejects(
        pg.query("select * from dictionary_retirement_backup.source_forms"),
        /permission denied/,
      );
      await assert.rejects(
        sql(pg, "select save_dictionary_review($1,$2,$3) v", [
          r.id,
          r.revision,
          JSON.stringify(next.candidate),
        ]),
        /revision conflict/,
      );
      const saved = await sql(pg, "select save_dictionary_review($1,$2,$3) v", [
        next.id,
        next.revision,
        JSON.stringify(next.candidate),
      ]);
      await assert.rejects(
        sql(pg, "select approve_dictionary_review($1,$2,false) v", [
          saved.id,
          saved.revision,
        ]),
        /verification/,
      );
      await sql(pg, "select approve_dictionary_review($1,$2,true) v", [
        saved.id,
        saved.revision,
      ]);
      assert.equal(
        await sql(
          pg,
          "select count(*)::int v from dictionary_senses where id=$1",
          [id(11)],
        ),
        1,
      );
      await pg.exec("reset role");
      await assert.rejects(
        pg.exec(
          fs.readFileSync(
            "docs/operations/DICTIONARY-SOURCE-FORMS-ROLLBACK.sql",
            "utf8",
          ),
        ),
        /manual reconciliation/,
      );
      await pg.exec("rollback");
      await assert.rejects(
        pg.query(
          "insert into dictionary_lexical_annotations(id,entry_id,kind,body) values($1,$2,'source_forms','cannot return')",
          [id(22), id(10)],
        ),
        /check constraint/,
      );
      await pg.exec("set role authenticated");
      await pg.query("select set_config('request.jwt.claim.sub',$1,false)", [
        id(900001),
      ]);
      await assert.rejects(
        sql(pg, "select save_dictionary_review($1,$2,$3) v", [
          next.id,
          next.revision,
          JSON.stringify(next.candidate),
        ]),
        /admin/,
      );
    } finally {
      await pg.close();
    }
  },
);

test("retired input fields fail explicitly instead of being silently imported or exported", async () => {
  const {
    parseAI,
    toAI,
  } = require("../src/features/dictionary/aiDictionary.ts");
  const {
    parseDictionaryCSV,
    dictionaryCSVHeaders,
  } = require("../src/features/dictionary/dictionaryCSV.ts");
  const {
    validateDictionaryDraft,
  } = require("../src/features/dictionary/draftPipeline.ts");
  assert.throws(
    () =>
      parseAI(
        JSON.stringify({
          format: "nexus-dictionary-ai",
          version: 1,
          entries: [{ type: "word", source_forms: [] }],
        }),
      ),
    /source_forms/,
  );
  await assert.rejects(
    parseDictionaryCSV(
      [...dictionaryCSVHeaders, "source_forms"].join(",") + "\n",
    ),
    /欄位/,
  );
  const old = {
    ...draft(60),
    lexical_annotations: [{ id: id(62), body: "old" }],
  };
  assert.ok(
    validateDictionaryDraft([old]).some(
      (x) => x.field === "lexical_annotations",
    ),
  );
  assert.throws(
    () =>
      toAI(
        {
          detail: {
            entry: {},
            lexical_annotations: [{ kind: "source_forms" }],
          },
        },
        new Map(),
      ),
    /淘汰/,
  );
});
