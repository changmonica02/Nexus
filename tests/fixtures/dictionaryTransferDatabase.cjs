require("../loadStudy.cjs");
const base = require("./retirementDatabase.cjs"),
  fs = require("node:fs");
const migration = "20261106032651_dictionary_exchange_safe_replacement.sql";
async function database() {
  const pg = await base.database();
  for (const key of ["official", "ipa", "page"]) await base.migrate(pg, key);
  await pg.exec("reset role");
  await pg.exec(fs.readFileSync("supabase/migrations/" + migration, "utf8"));
  await pg.exec("set role authenticated");
  return pg;
}
function client(pg) {
  const original = require("./persistentImportDatabase.cjs").client(pg);
  return {
    rpc: async (name, args = {}) => {
      const fields =
        name === "dictionary_exchange_transfer_capabilities"
          ? []
          : name === "apply_dictionary_safe_import_reviews"
            ? ["operations"]
            : name === "export_dictionary_exchange_page" &&
                "pending_only" in args
              ? [
                  "kind_filters",
                  "status_filters",
                  "query_text",
                  "after_id",
                  "expected_scope",
                  "pending_only",
                  "preview_only",
                ]
              : null;
      if (!fields) return original.rpc(name, args);
      try {
        return {
          data: await base.sql(
            pg,
            `select ${name}(${fields.map((f, i) => "$" + (i + 1) + (f === "after_id" ? "::text" : "")).join(",")}) v`,
            fields.map((f) =>
              f === "operations" ? JSON.stringify(args[f]) : (args[f] ?? null),
            ),
          ),
          error: null,
        };
      } catch (e) {
        return { error: { message: e.message, code: e.code } };
      }
    },
  };
}
module.exports = { ...base, database, client, migration };
