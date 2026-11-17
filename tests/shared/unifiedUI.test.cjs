require("./loadStudy.cjs");
const test = require("node:test"),
  assert = require("node:assert/strict");
const {
  listAdminWork,
  adminPageSize,
} = require("../src/features/dictionary/adminQueries.ts");
const preferences = require("../src/lib/featurePreferences.ts");
const { translate } = require("../src/lib/i18n.ts");
function server(size = 6301) {
  const entries = Array.from({ length: size }, (_, i) => ({
    id: String(i),
    headword: String(i).padStart(6, "0"),
    work_status: ["red", "yellow", "green"][i % 3],
    kind: i % 2 ? "word" : "root",
  }));
  const calls = [];
  const client = {
    from() {
      throw Error("unexpected legacy fallback");
    },
    async rpc(name, args) {
      calls.push(args);
      assert.equal(name, "list_dictionary_admin_work");
      const scoped = entries.filter(
        (e) =>
          (!args.kind_filters.length || args.kind_filters.includes(e.kind)) &&
          e.headword.includes(args.query_text),
      );
      const stats = Object.fromEntries(
        ["red", "yellow", "green"].map((c) => [
          c,
          scoped.filter((e) => e.work_status === c).length,
        ]),
      );
      const filtered = scoped.filter(
        (e) => !args.work_filter || args.work_filter === e.work_status,
      );
      return {
        data: {
          items: filtered.slice(
            args.page_number * 100,
            args.page_number * 100 + 100,
          ),
          total: filtered.length,
          stats,
        },
      };
    },
  };
  return { entries, calls, client };
}
test("two-color union uses complete bounded server ordering, exact totals and the same query/type conditions across 6,301 rows", async () => {
  const { entries, calls, client } = server();
  const expected = entries.filter((e) =>
    ["red", "green"].includes(e.work_status),
  );
  const result = await listAdminWork(client, {
    kinds: [],
    statuses: [],
    query: "",
    work: ["red", "green"],
    page: 41,
  });
  assert.equal(result.total, expected.length);
  assert.deepEqual(result.items, expected.slice(4100, 4200));
  assert.equal(adminPageSize, 100);
  assert.ok(calls.length <= 64);
  assert.ok(
    calls.every((c) => c.work_filter === "" && c.status_filters.length === 0),
  );
  const filtered = await listAdminWork(client, {
    kinds: ["word"],
    statuses: [],
    query: "00",
    work: ["red", "yellow"],
    page: 1,
  });
  const expectedFiltered = entries.filter(
    (e) =>
      e.kind === "word" &&
      e.headword.includes("00") &&
      e.work_status !== "green",
  );
  assert.deepEqual(filtered.items, expectedFiltered.slice(100, 200));
  assert.equal(filtered.total, expectedFiltered.length);
});
test("none/all colors mean unrestricted, single color delegates; duplicate choices and empty/out-of-range results remain safe", async () => {
  const { calls, client } = server(12);
  for (const work of [[], ["red", "yellow", "green"]]) {
    const r = await listAdminWork(client, {
      kinds: [],
      statuses: [],
      query: "",
      page: 0,
      work,
    });
    assert.equal(r.total, 12);
    assert.equal(calls.at(-1).work_filter, "");
  }
  const single = await listAdminWork(client, {
    kinds: [],
    statuses: [],
    query: "",
    page: 0,
    work: ["red", "red"],
  });
  assert.equal(single.total, 4);
  assert.equal(calls.at(-1).work_filter, "red");
  const empty = await listAdminWork(client, {
    kinds: [],
    statuses: [],
    query: "absent",
    page: 0,
    work: ["red", "yellow"],
  });
  assert.equal(empty.total, 0);
  assert.deepEqual(empty.items, []);
  const last = await listAdminWork(client, {
    kinds: [],
    statuses: [],
    query: "",
    page: 100,
    work: ["red", "yellow"],
  });
  assert.deepEqual(last.items, []);
});
test("a changing result scope during union fetch surfaces retry instead of claiming a wrong total; network failures propagate", async () => {
  const { client } = server(600);
  let calls = 0;
  const original = client.rpc;
  client.rpc = async (...args) => {
    const r = await original(...args);
    if (++calls === 2) r.data.total++;
    return r;
  };
  await assert.rejects(
    listAdminWork(client, {
      kinds: [],
      statuses: [],
      query: "",
      page: 1,
      work: ["red", "yellow"],
    }),
    /changed/,
  );
  client.rpc = async () => ({ error: { code: "NETWORK", message: "offline" } });
  await assert.rejects(
    listAdminWork(client, {
      kinds: [],
      statuses: [],
      query: "",
      page: 0,
      work: ["red", "yellow"],
    }),
    /offline/,
  );
});
test("navigation preferences preserve old custom/recent order by mapping counter/draw to one tools feature, and hide only selected sidebar features", () => {
  const previous = { window: global.window, localStorage: global.localStorage };
  const values = new Map(),
    events = [];
  global.localStorage = {
    getItem: (k) => values.get(k) ?? null,
    setItem: (k, v) => values.set(k, v),
  };
  global.window = {
    localStorage: global.localStorage,
    dispatchEvent: (event) => events.push(event.type),
  };
  try {
    values.set(
      "nexus-custom-feature-order",
      JSON.stringify(["web", "counter", "notes", "draw", "study"]),
    );
    const order = preferences.getStoredCustomFeatureOrder();
    assert.deepEqual(order.slice(0, 4), ["web", "tools", "notes", "study"]);
    assert.equal(order.filter((id) => id === "tools").length, 1);
    values.set(
      "nexus-recent-features",
      JSON.stringify(["draw", "notes", "counter"]),
    );
    assert.deepEqual(preferences.getStoredRecentFeatureIds(), [
      "tools",
      "notes",
    ]);
    preferences.recordFeatureUsage("counter");
    assert.deepEqual(preferences.getStoredRecentFeatureIds(), [
      "tools",
      "notes",
    ]);
    assert.deepEqual(preferences.getHiddenFeatures(), []);
    preferences.setHiddenFeatures(["web", "tools"]);
    assert.deepEqual(preferences.getHiddenFeatures(), ["web", "tools"]);
    assert.deepEqual(preferences.getStoredCustomFeatureOrder(), order);
    assert.ok(preferences.DEFAULT_FEATURE_ITEMS.some((f) => f.id === "web"));
    assert.ok(
      !preferences.DEFAULT_FEATURE_ITEMS.some(
        (f) => f.id === "counter" || f.id === "draw",
      ),
    );
    preferences.setHiddenFeatures([]);
    assert.deepEqual(preferences.getHiddenFeatures(), []);
    assert.ok(events.includes("nexus-feature-order-changed"));
    values.set("nexus-hidden-features", "broken");
    assert.deepEqual(preferences.getHiddenFeatures(), []);
  } finally {
    global.window = previous.window;
    global.localStorage = previous.localStorage;
  }
});
test("shared navigation/collection labels cover both languages without exposing untranslated keys or obsolete dictionary naming", () => {
  for (const language of ["en", "zh-TW"])
    for (const key of [
      "navigation",
      "closeNavigation",
      "overview",
      "visibilityHelp",
      "feature.tools",
      "feature.dictionary",
      "create.study",
      "more",
      "rename",
      "deleteConfirm",
      "dictionaryPagination",
    ]) {
      const value = translate(language, "ui." + key, { name: "test" });
      assert.notEqual(value, "ui." + key);
      assert.ok(!value.includes("公共字典"));
    }
});
