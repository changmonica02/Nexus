require("../loadStudy.cjs");
const base = require("./dictionaryExchangeDatabase.cjs"),
  fs = require("node:fs");
const migration = "20261015020759_dictionary_persistent_import_review.sql";
async function database(options) {
  const db = await base.database(options);
  await db.exec("reset role");
  await db.exec(fs.readFileSync("supabase/migrations/" + migration, "utf8"));
  await db.exec("set role authenticated");
  return db;
}
function client(db) {
  const original = base.client(db);
  const fields = {
    dictionary_import_review_capabilities: [],
    stage_dictionary_import_reviews: ["proposals"],
    save_dictionary_import_review: [
      "review_item_id",
      "expected_revision",
      "review_item",
    ],
    decide_dictionary_import_review: [
      "review_item_id",
      "expected_revision",
      "issue_id",
      "decision",
    ],
    apply_dictionary_import_reviews: ["operations"],
    get_dictionary_import_reviews: ["entry_key", "page_number"],
    list_dictionary_admin_work: [
      "kind_filters",
      "status_filters",
      "query_text",
      "work_filter",
      "page_number",
    ],
  };
  return {
    rpc: async (name, args = {}) => {
      if (!fields[name]) return original.rpc(name, args);
      try {
        return {
          data: await base.sql(
            db,
            `select ${name}(${fields[name].map((_, i) => "$" + (i + 1)).join(",")}) v`,
            fields[name].map((k) =>
              ["proposals", "review_item", "operations"].includes(k)
                ? JSON.stringify(args[k])
                : args[k],
            ),
          ),
          error: null,
        };
      } catch (e) {
        return { error: { message: e.message } };
      }
    },
  };
}
module.exports = { ...base, database, client, migration };
