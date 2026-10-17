require("./loadStudy.cjs");
const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs");
const {
  database,
  id,
  sql,
} = require("./fixtures/persistentImportDatabase.cjs");
const {
  mergeCoreConcepts,
} = require("../src/features/dictionary/coreConcept.ts");
const migration =
  "supabase/migrations/20261017010000_dictionary_core_concept.sql";
test("core merge is stable, lossless, scope-specific and repeat-safe", () => {
  const rows = [
    {
      id: id(2),
      kind: "mnemonic_scenario",
      sense_id: id(9),
      body: "story\n原文",
    },
    {
      id: id(3),
      kind: "learning_decomposition",
      sense_id: id(9),
      body: "image",
    },
    { id: id(4), kind: "mnemonic_scenario", sense_id: null, body: "shared" },
  ];
  const merged = mergeCoreConcepts(rows);
  assert.equal(merged.length, 2);
  assert.equal(merged[0].body, "image\n\nstory\n原文");
  assert.equal(merged[0].id, id(3));
  assert.deepEqual(mergeCoreConcepts(merged), merged);
  assert.deepEqual(rows[0].body, "story\n原文");
});
test("new/legacy CSV, Bundle and AI preserve core content without old type selectors", async () => {
  const {
    parseDictionaryCSV,
    dictionaryCSVHeaders,
    exportDictionaryCSV,
  } = require("../src/features/dictionary/dictionaryCSV.ts");
  const {
    parseJSONBundle,
  } = require("../src/features/dictionary/adminImport.ts");
  const { parseAI } = require("../src/features/dictionary/aiDictionary.ts");
  const csv =
    dictionaryCSVHeaders.join(",") +
    "\n" +
    [
      "word",
      id(10),
      id(11),
      "test",
      "noun",
      "義",
      "",
      "",
      "",
      "",
      "image",
    ].join(",");
  const modern = (await parseDictionaryCSV(csv))[0],
    legacy = (
      await parseDictionaryCSV(csv.replace("core_concept", "mnemonic_story"))
    )[0];
  assert.equal(modern.learning_notes[0].body, legacy.learning_notes[0].body);
  assert.equal(legacy.learning_notes[0].kind, "core_concept");
  assert.ok(exportDictionaryCSV([modern]).includes("core_concept"));
  assert.ok(!exportDictionaryCSV([modern]).includes("mnemonic_story"));
  const bundle = parseJSONBundle(
    JSON.stringify({
      dictionary_learning_notes: [
        {
          id: id(20),
          entry_id: id(10),
          sense_id: id(11),
          kind: "learning_decomposition",
          body: "image",
        },
        {
          id: id(21),
          entry_id: id(10),
          sense_id: id(11),
          kind: "mnemonic_scenario",
          body: "story",
        },
      ],
    }),
  );
  assert.equal(bundle.dictionary_learning_notes.length, 1);
  assert.equal(bundle.dictionary_learning_notes[0].body, "image\n\nstory");
  const ai = parseAI(
    JSON.stringify({
      format: "nexus-dictionary-ai",
      version: 1,
      entries: [
        { type: "word", headword: "test", story: [{ text: "old story" }] },
      ],
    }),
  );
  assert.equal(ai.entries[0].core_concept[0].text, "old story");
  assert.equal("story" in ai.entries[0], false);
});
test(
  "core migration: published contents/sources, stable Entry/Sense, active Review, rollback, replay, manual approval and RLS",
  { timeout: 90000 },
  async () => {
    const pg = await database({ coreLegacy: true });
    try {
      const old = {
        origin: { row: 1, kind: "word" },
        bundle: {
          dictionary_entries: [
            { id: id(10), kind: "word", headword: "core-test" },
          ],
          dictionary_senses: [
            {
              id: id(11),
              entry_id: id(10),
              part_of_speech: "noun",
              gloss_zh_tw: "測試",
            },
          ],
          dictionary_learning_notes: [
            {
              id: id(12),
              entry_id: id(10),
              sense_id: id(11),
              kind: "learning_decomposition",
              body: "image",
            },
            {
              id: id(13),
              entry_id: id(10),
              sense_id: id(11),
              kind: "mnemonic_scenario",
              body: "story\n原文",
            },
            {
              id: id(14),
              entry_id: id(10),
              sense_id: null,
              kind: "mnemonic_scenario",
              body: "shared",
            },
          ],
        },
      };
      await sql(pg, "select apply_dictionary_drafts($1,false,true) v", [
        JSON.stringify([old]),
      ]);
      await sql(pg, "select publish_dictionary_entry($1,true) v", [id(10)]);
      const before = await sql(pg, "select get_dictionary_ai_snapshot($1) v", [
        id(10),
      ]);
      const review = await sql(
        pg,
        "select create_dictionary_review($1,$2,null,'manual',false) v",
        [id(10), JSON.stringify(before)],
      );
      await pg.exec("reset role");
      const script = fs.readFileSync(migration, "utf8");
      await pg.exec("begin");
      await pg.exec(script.replace(/^begin;$/m, "").replace(/^commit;$/m, ""));
      assert.equal(
        await sql(pg, "select count(*)::int v from dictionary_learning_notes"),
        2,
      );
      await pg.exec("rollback");
      assert.equal(
        await sql(pg, "select count(*)::int v from dictionary_learning_notes"),
        3,
      );
      await pg.exec(script);
      const after = await sql(
        pg,
        "select jsonb_agg(to_jsonb(n) order by id) v from dictionary_learning_notes n",
      );
      assert.equal(after.length, 2);
      assert.equal(after[0].body, "image\n\nstory\n原文");
      assert.equal(after[0].id, id(12));
      assert.equal(after[0].sense_id, id(11));
      assert.equal(after[0].kind, "core_concept");
      assert.equal(after[1].body, "shared");
      await pg.exec(script);
      assert.deepEqual(
        await sql(
          pg,
          "select jsonb_agg(to_jsonb(n) order by id) v from dictionary_learning_notes n",
        ),
        after,
      );
      assert.equal(
        await sql(
          pg,
          "select count(*)::int v from dictionary_core_backup.notes",
        ),
        3,
      );
      await pg.exec("set role authenticated");
      await assert.rejects(
        pg.query(
          "insert into dictionary_learning_notes(id,entry_id,sense_id,kind,body) values($1,$2,$3,'core_concept','must not duplicate')",
          [id(13), id(10), id(11)],
        ),
        /Merged legacy core ID/,
      );
      const current = await sql(pg, "select get_dictionary_ai_snapshot($1) v", [
        id(10),
      ]);
      assert.equal(current.detail.entry.id, id(10));
      assert.equal(current.detail.senses[0].id, id(11));
      await assert.rejects(
        pg.query("select * from dictionary_core_backup.notes"),
        /permission/,
      );
      await assert.rejects(
        pg.query("select dictionary_core_content('{}')"),
        /permission/,
      );
      const r = await sql(
        pg,
        "select to_jsonb(r) v from dictionary_review_drafts r where id=$1",
        [review.id],
      );
      assert.equal(r.revision, review.revision + 1);
      assert.equal(r.candidate.bundle.dictionary_learning_notes.length, 2);
      await assert.rejects(
        sql(pg, "select save_dictionary_review($1,$2,$3) v", [
          r.id,
          review.revision,
          JSON.stringify(r.candidate),
        ]),
        /revision/,
      );
      r.candidate.bundle.dictionary_learning_notes[0].body += " updated";
      const saved = await sql(pg, "select save_dictionary_review($1,$2,$3) v", [
        r.id,
        r.revision,
        JSON.stringify(r.candidate),
      ]);
      await assert.rejects(
        sql(pg, "select approve_dictionary_review($1,$2,false) v", [
          r.id,
          saved.revision,
        ]),
        /verification/,
      );
      await sql(pg, "select approve_dictionary_review($1,$2,true) v", [
        r.id,
        saved.revision,
      ]);
      const pub = await sql(pg, "select get_published_dictionary_entry($1) v", [
        id(10),
      ]);
      assert.equal(pub.learning_notes[0].body, "image\n\nstory\n原文 updated");
      const latest = await sql(pg, "select get_dictionary_ai_snapshot($1) v", [
        id(10),
      ]);
      const removal = await sql(
        pg,
        "select create_dictionary_review($1,$2,null,'manual',false) v",
        [id(10), JSON.stringify(latest)],
      );
      removal.candidate.bundle.dictionary_learning_notes =
        removal.candidate.bundle.dictionary_learning_notes.filter(
          (n) => n.id !== id(12),
        );
      const removalSaved = await sql(
        pg,
        "select save_dictionary_review($1,$2,$3) v",
        [removal.id, removal.revision, JSON.stringify(removal.candidate)],
      );
      await sql(pg, "select approve_dictionary_review($1,$2,true) v", [
        removal.id,
        removalSaved.revision,
      ]);
      assert.equal(
        await sql(
          pg,
          "select canonical_id v from dictionary_core_aliases where legacy_id=$1",
          [id(13)],
        ),
        null,
      );
      await pg.query("select set_config('request.jwt.claim.sub',$1,false)", [
        id(900001),
      ]);
      assert.deepEqual(
        (await pg.query("select * from dictionary_core_aliases")).rows,
        [],
      );
      await assert.rejects(
        pg.query("delete from dictionary_core_aliases"),
        /permission/,
      );
      await assert.rejects(
        sql(pg, "select apply_dictionary_drafts($1,false,true) v", [
          JSON.stringify([old]),
        ]),
        /admin/,
      );
    } finally {
      await pg.close();
    }
  },
);
