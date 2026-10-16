require("./loadStudy.cjs");
const test = require("node:test"),
  assert = require("node:assert/strict");
const {
  dashboardGrouping,
  dashboardFeature,
  dashboardGroups,
} = require("../src/lib/dashboardGroups.ts");
const page = (id, kind = "note", extra = {}) => ({
  id,
  kind,
  title: id,
  updated_at: Number(id) || 10,
  content_text: "內容",
  ...extra,
});
test("first-use and invalid preference always ungrouped; grouping accepts only supported values", () => {
  for (const raw of [null, "", "all", "invalid"])
    assert.equal(dashboardGrouping(raw), "none");
  for (const raw of ["none", "folder", "feature"])
    assert.equal(dashboardGrouping(raw), raw);
});
test("all groupings retain each eligible top-level item once, no mutation of IDs/folders/type or hidden data", () => {
  const pages = [
      page("1", "note", { folder: "A" }),
      page("2", "study_set"),
      page("3", "creative", { creative_type: "world" }),
      page("4", "counter", { folder: "A" }),
      page("5", "draw"),
      page("6", "note", { parent_id: "1" }),
      page("7", "note", { deleted_at: 1 }),
    ],
    before = structuredClone(pages);
  for (const mode of ["none", "folder", "feature"]) {
    const groups = dashboardGroups(pages, mode, "", "updated_at", false);
    assert.deepEqual(groups.flatMap((g) => g.items.map((p) => p.id)).sort(), [
      "1",
      "2",
      "3",
      "4",
      "5",
    ]);
    assert.equal(
      new Set(groups.flatMap((g) => g.items.map((p) => p.id))).size,
      5,
    );
  }
  assert.deepEqual(pages, before);
  assert.equal(
    dashboardGroups(pages, "none", "", "updated_at", false).length,
    1,
  );
  const tools = dashboardGroups(pages, "feature", "", "updated_at", false).find(
    (g) => g.key === "tools",
  );
  assert.deepEqual(tools.items.map((p) => p.kind).sort(), ["counter", "draw"]);
});
test("feature grouping reuses creative/novel legacy semantics and existing function kinds", () => {
  assert.equal(
    dashboardFeature(page("novel", "creative", { creative_type: "novel" })),
    "novels",
  );
  assert.equal(
    dashboardFeature(page("world", "creative", { creative_type: "world" })),
    "creative",
  );
  assert.equal(
    dashboardFeature(
      page("character", "creative", { creative_type: "character" }),
    ),
    "creative",
  );
  for (const [kind, key] of [
    ["document", "documents"],
    ["presentation", "presentations"],
    ["study_set", "study"],
    ["todo", "calendar"],
    ["score", "score"],
    ["web", "web"],
    ["quick_note", "quicknotes"],
  ])
    assert.equal(dashboardFeature(page(kind, kind)), key);
});
test("search and both sort directions apply within every grouping; pinned first, no missing items", () => {
  const pages = [
    page("1", "note", { title: "Alpha", folder: "A", sort_order: 3 }),
    page("2", "note", { title: "alpha two", folder: "A", sort_order: 2 }),
    page("3", "note", { title: "Beta", sort_order: -1 }),
  ];
  for (const mode of ["none", "folder", "feature"]) {
    assert.deepEqual(
      dashboardGroups(pages, mode, " ALPHA ", "updated_at", false).flatMap(
        (g) => g.items.map((x) => x.id),
      ),
      ["2", "1"],
    );
    assert.deepEqual(
      dashboardGroups(pages, mode, "alpha", "custom", true).flatMap((g) =>
        g.items.map((x) => x.id),
      ),
      ["2", "1"],
    );
  }
  assert.equal(
    dashboardGroups(pages, "none", "", "updated_at", false)[0].items[0].id,
    "3",
  );
  assert.deepEqual(
    dashboardGroups(pages, "none", "not-found", "updated_at", true),
    [],
  );
});

test('new selection labels interpolate using the shared bilingual contract',()=>{
 const {translate}=require('../src/lib/i18n.ts');
 assert.equal(translate('zh-TW','dashboard.selectItem',{name:'Alpha'}),'選取 Alpha');
 assert.equal(translate('en','dashboard.selectItem',{name:'Alpha'}),'Select Alpha');
 assert.equal(translate('zh-TW','dashboard.selected',{n:2}),'已選 2 項');
 assert.equal(translate('en','dashboard.selected',{n:2}),'2 selected');
});
