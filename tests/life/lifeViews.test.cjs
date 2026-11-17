require("./loadStudy.cjs");
const test = require("node:test"),
  assert = require("node:assert/strict");
const {
  categoryPath,
  categoryScope,
  compareValues,
  compareDecimal,
  readViewPreferences,
  viewPreferenceKey,
  orderedFields,
  searchItem,
} = require("../src/features/life/listViewModel.ts");
test("view model: hierarchy scopes include descendants, stable IDs and archived fields remain distinct", () => {
  const categories = [
    { id: "a", title: "Cosmetics", parent_id: null },
    { id: "b", title: "Polish", parent_id: "a" },
    { id: "c", title: "Blue", parent_id: "b" },
    { id: "d", title: "Other", parent_id: null },
  ];
  assert.equal(categoryPath("c", categories), "Cosmetics → Polish → Blue");
  assert.deepEqual([...categoryScope("a", categories)], ["a", "b", "c"]);
  assert.equal(categoryScope("d", categories).size, 1);
  const fields = [
    { id: "one", name: "Renamed", type: "text" },
    { id: "old", name: "Hidden", type: "text", archived: true },
    { id: "two", name: "Number", type: "number" },
  ];
  assert.deepEqual(
    orderedFields(fields, ["two", "old", "one"]).map((f) => f.id),
    ["two", "one"],
  );
  assert.equal(searchItem({ title: "Item", values: { one: "kept", old: "secret" } }, "secret", fields), false);
  assert.equal(searchItem({ title: "Item", values: { one: "kept" } }, "kept", fields), true);
  // Malformed cached categories must not hang rendering.
  const cyclic = [
    { id: "a", title: "A", parent_id: "b" },
    { id: "b", title: "B", parent_id: "a" },
  ];
  assert.equal(categoryScope("a", cyclic).size, 2);
  assert.ok(categoryPath("a", cyclic));
});
test("typed sorting compares numeric and exact decimal money values without mixing currencies", () => {
  assert.ok(compareValues(2, 10, { type: "number" }) < 0);
  assert.ok(compareValues("2026-01-01", "2026-12-01", { type: "date" }) < 0);
  assert.ok(
    compareValues(
      { amount: "9007199254740993.01", currency: "TWD" },
      { amount: "9007199254740993.02", currency: "TWD" },
      { type: "money" },
    ) < 0,
  );
  assert.equal(compareDecimal("0.100", "0.1"), 0);
  assert.equal(compareDecimal("-0.00", "0"), 0);
  assert.ok(compareDecimal("-10.20", "-2.1") < 0);
  assert.ok(compareValues({ amount: "100", currency: "TWD" }, { amount: "1", currency: "USD" }, { type: "money" }) < 0);
  assert.ok(compareValues(null, "text") > 0);
});
test("versioned view preferences reject malformed input and partition accounts and lists", () => {
  assert.notEqual(viewPreferenceKey("a", "list"), viewPreferenceKey("b", "list"));
  assert.notEqual(viewPreferenceKey("a", "one"), viewPreferenceKey("a", "two"));
  const p = readViewPreferences(
    JSON.stringify({
      version: 1,
      view: "table",
      columnOrder: ["a", "a", "b"],
      hidden: ["b"],
      filters: { a: "value" },
      sorting: [{ id: "a", desc: true }],
      category: "root",
      collapsed: ["root"],
      page: 2,
      query: "find",
      group: "a",
    }),
  );
  assert.equal(p.view, "table");
  assert.deepEqual(p.columnOrder, ["a", "b"]);
  assert.equal(readViewPreferences(JSON.stringify(p)).page, 2);
  assert.equal(readViewPreferences("not json").view, "list");
  assert.equal(readViewPreferences('{"version":2,"view":"table"}').view, "list");
  assert.equal(readViewPreferences('{"version":1,"page":-3}').page, 0);
});
