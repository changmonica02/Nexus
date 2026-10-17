const fs = require("node:fs");
const { PGlite } = process.env.NEXUS_TEST_POSTGRES_CONTAINER
  ? require("./postgresContainer.cjs")
  : require("@electric-sql/pglite");
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const owner = id(900000);
const files = [
  "20260922_study_fsrs.sql",
  "20260930_public_dictionary.sql",
  "20261001_dictionary_admin.sql",
  "20261002_dictionary_reader.sql",
  "20261004_dictionary_delete_draft_sense.sql",
  "20261005_dictionary_grouping.sql",
  "20261006_dictionary_prefix_sense_groups.sql",
  "20261007_dictionary_ai_roundtrip.sql",
  "20261010_dictionary_delete_drafts.sql",
  "20261011_dictionary_delete_draft_content.sql",
  "20261012_dictionary_retire_sources.sql",
  "20261013_dictionary_draft_pipeline.sql",
  "20261014_dictionary_revision_lifecycle.sql",
  "20261017_dictionary_entry_identity.sql",
  "20261018_dictionary_pronunciations.sql",
  "20261019_dictionary_admin_bulk_publish.sql",
  "20261020_dictionary_edit_inflections.sql",
  "20261021_dictionary_composition_shared.sql",
  "20261013084116_dictionary_bulk_exchange.sql",
];
async function database(options={}) {
  const pg = new PGlite();
  await pg.exec(
    `create schema auth;create role authenticated;create role anon;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth,public to authenticated,anon;`,
  );
  for (const f of files)
    await pg.exec(fs.readFileSync("supabase/migrations/" + f, "utf8"));
  if(!options.legacy)await pg.exec(fs.readFileSync("supabase/migrations/20261016060000_dictionary_retire_verification_state.sql","utf8"));
  if(!options.legacy&&!options.coreLegacy)await pg.exec(fs.readFileSync("supabase/migrations/20261017010000_dictionary_core_concept.sql","utf8"));
  await pg.query("insert into auth.users values($1),($2)", [owner, id(900001)]);
  await pg.query("insert into dictionary_admins values($1)", [owner]);
  await pg.exec("set role authenticated");
  await pg.query("select set_config('request.jwt.claim.sub',$1,false)", [
    owner,
  ]);
  return pg;
}
const sql = async (pg, q, args = []) => (await pg.query(q, args)).rows[0]?.v;
function client(pg) {
  const statements = {
    dictionary_admin_first_senses:["entry_ids"],
    get_dictionary_entry:["entry_uuid"],
    export_dictionary_exchange_page: [
      "kind_filters",
      "status_filters",
      "query_text",
      "after_id",
      "expected_scope",
    ],
    inspect_dictionary_exchange: ["drafts"],
    inspect_dictionary_import: ["drafts"],
    apply_dictionary_import_batch: ["operations"],
    apply_dictionary_import_operation: ["operation"],
    preview_dictionary_bulk_publish: ["kind_filters", "query_text"],
    publish_dictionary_bulk: [
      "kind_filters",
      "query_text",
      "expected_signature",
      "content_verified",
    ],
    dictionary_bulk_publish_report: ["preview_id", "page_number"],
  };
  return {
    rpc: async (name, args) => {
      const fields = statements[name];
      if (!fields) throw Error("Unexpected RPC " + name);
      try {
        return {
          data: await sql(
            pg,
            `select ${name}(${fields.map((_f, i) => "$" + (i + 1)).join(",")}) v`,
            fields.map((f) =>
              (typeof args[f] === "object" &&
                args[f] !== null &&
                !Array.isArray(args[f])) ||
              ["drafts", "operations"].includes(f)
                ? JSON.stringify(args[f])
                : args[f],
            ),
          ),
          error: null,
        };
      } catch (e) {
        return { error: { message: e.message, code:e.code } };
      }
    },
  };
}
const draft = (n, kind = "word") => ({
  entry_id: id(n),
  kind,
  headword: "entry" + n,
  senses: [
    {
      id: id(n + 1),
      part_of_speech: kind === "word" ? "verb" : null,
      gloss_zh_tw: "中文" + n,
    },
  ],
  relations: [],
  etymologies: [],
  learning_notes: [],
  examples: [],
  lexical_annotations: [],
  relation_hints: [],
});
module.exports = { database, id, owner, sql, client, draft };
