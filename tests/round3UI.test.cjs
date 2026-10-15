require("./loadStudy.cjs");
const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  ts = require("typescript");
require.extensions[".tsx"] = (m, f) =>
  m._compile(
    ts.transpileModule(fs.readFileSync(f, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
        jsx: ts.JsxEmit.ReactJSX,
      },
    }).outputText,
    f,
  );
const React = require("react"),
  { renderToStaticMarkup } = require("react-dom/server");
const { trashReturn } = require("../src/lib/workspaceReturn.ts");
const { translate } = require("../src/lib/i18n.ts");
test("trash return preserves local source/query/hash while rejecting external, malformed and recursive destinations", () => {
  for (const unsafe of [
    null,
    "https://evil.invalid",
    "//evil.invalid",
    "/\\evil.invalid",
    "/trash?from=/",
    "/trash/",
    "/\nevil.invalid",
  ])
    assert.equal(trashReturn(unsafe), "/");
  for (const path of [
    "/",
    "/study?deck=existing-id",
    "/dictionary/admin?entry=stable-id#sense-x",
  ])
    assert.equal(trashReturn(path), path);
});
test("green label is renamed without any date filter or changes to work status contracts", () => {
  assert.equal(translate("zh-TW", "persistent.green"), "🟢 新發布");
  assert.equal(translate("zh-TW", "persistent.red"), "🔴 待審核");
  assert.equal(translate("zh-TW", "persistent.yellow"), "🟡 有草稿");
  assert.equal(translate("zh-TW", "persistent.workFilter"), "狀態");
  const source = fs.readFileSync(
    "src/features/dictionary/adminQueries.ts",
    "utf8",
  );
  assert.ok(!source.includes("Date.now"));
});
test("folding section keeps editable children mounted and suppresses empty count decoration", () => {
  const Section =
    require("../src/features/dictionary/EditorSection.tsx").default;
  const html = renderToStaticMarkup(
    React.createElement(
      Section,
      { title: "詞形變化", count: 0 },
      React.createElement("input", { defaultValue: "stable form" }),
    ),
  );
  assert.ok(html.includes('<details open="">'));
  assert.ok(html.includes("stable form"));
  assert.ok(!html.includes("0 項"));
  assert.ok(html.includes("<summary"));
});
test("switching sorting methods uses default directions while existing persisted direction is not rewritten on mount", () => {
  const {
    defaultSortAscending,
  } = require("../src/components/CollectionControls.tsx");
  assert.equal(defaultSortAscending("title"), true);
  assert.equal(defaultSortAscending("kind"), true);
  assert.equal(defaultSortAscending("due_date"), true);
  assert.equal(defaultSortAscending("updated_at"), false);
  assert.equal(defaultSortAscending("created_at"), false);
  assert.equal(defaultSortAscending("size"), false);
  assert.equal(defaultSortAscending("custom"), true);
  const source = fs.readFileSync(
    "src/components/useCollectionPreferences.ts",
    "utf8",
  );
  assert.ok(source.includes("parsed.ascending"));
  assert.ok(source.includes("localStorage.setItem"));
});
test("daily editor no longer fetches or renders published history; backend history migrations remain intact", () => {
  const ui = fs.readFileSync(
    "src/features/dictionary/DictionaryAdmin.tsx",
    "utf8",
  );
  assert.ok(!ui.includes("from('dictionary_published_revisions')"));
  assert.ok(!ui.includes("Published 版本歷史"));
  assert.ok(ui.includes("base_revision!==detail.entry.revision"));
  assert.ok(ui.includes("'approve_dictionary_review'"));
  assert.ok(ui.includes("expected_revision:chosen.revision"));
  const files = fs.readdirSync("supabase/migrations");
  assert.ok(
    files.some((f) =>
      fs
        .readFileSync("supabase/migrations/" + f, "utf8")
        .includes("dictionary_published_revisions"),
    ),
  );
});
