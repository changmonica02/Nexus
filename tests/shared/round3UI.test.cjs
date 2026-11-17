require("../loadStudy.cjs");
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
const { trashReturn } = require("../../src/lib/workspaceReturn.ts");
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
test("folding section keeps editable children mounted and suppresses empty count decoration", () => {
  const Section =
    require("../../src/features/dictionary/EditorSection.tsx").default;
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
  } = require("../../src/components/CollectionControls.tsx");
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
