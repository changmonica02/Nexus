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
const { formatEditedTime, localDate } = require("../src/lib/editedTime.ts");
const { isCreativeCharacterPage, isNovelPage } = require("../src/lib/types.ts");
const React = require("react"),
  { renderToStaticMarkup } = require("react-dom/server"),
  { LanguageProvider } = require("../src/lib/LanguageContext.tsx");
const wrap = (child) =>
  React.createElement(LanguageProvider, { initialLanguage: "zh-TW" }, child);
test("shared time formatting: minute/hour/local calendar days through day three, day four YYYY/MM/DD, future and invalid values", () => {
  const previous = process.env.TZ;
  process.env.TZ = "Asia/Taipei";
  try {
    const now = new Date(2026, 9, 15, 12, 0).getTime();
    assert.equal(formatEditedTime(now - 5 * 60000, now, "zh-TW"), "5 分鐘前");
    assert.equal(formatEditedTime(now - 2 * 3600000, now, "zh-TW"), "2 小時前");
    for (const days of [1, 2, 3])
      assert.equal(
        formatEditedTime(now - days * 86400000, now, "zh-TW"),
        `${days} 天前`,
      );
    assert.equal(
      formatEditedTime(now - 4 * 86400000, now, "zh-TW"),
      "2026/10/11",
    );
    assert.equal(formatEditedTime(now + 30000, now, "zh-TW"), "剛剛");
    assert.equal(formatEditedTime(now + 86400000, now, "zh-TW"), "2026/10/16");
    assert.equal(formatEditedTime(NaN, now, "en"), "—");
    assert.equal(localDate(NaN), "—");
    assert.equal(localDate(Date.parse("2026-10-14T17:00:00Z")), "2026/10/15");
    assert.equal(formatEditedTime(now - 5 * 60000, now, "en"), "5 minutes ago");
  } finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
});
test("time cutoff follows local midnight rather than UTC and remains stable across a DST transition", () => {
  const previous = process.env.TZ;
  process.env.TZ = "America/New_York";
  try {
    const now = new Date(2026, 10, 3, 12, 0).getTime(),
      three = new Date(2026, 9, 31, 12, 0).getTime(),
      four = new Date(2026, 9, 30, 12, 0).getTime();
    assert.equal(formatEditedTime(three, now, "zh-TW"), "3 天前");
    assert.equal(formatEditedTime(four, now, "zh-TW"), "2026/10/30");
    const before = new Date(2026, 9, 15, 23, 59).getTime(),
      after = new Date(2026, 9, 16, 0, 1).getTime();
    assert.equal(formatEditedTime(before, after, "zh-TW"), "2 分鐘前");
  } finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
});
test("explicit creative types are authoritative; historical characters/worlds and missing-type novels stay disjoint without modifying records", () => {
  const data = [
    {
      id: "character",
      kind: "creative",
      creative_type: "character",
      character_data: { basic: { name: "角色😀" }, sections: [] },
    },
    {
      id: "world",
      kind: "creative",
      creative_type: "world",
      character_data: { basic: { name: "世界" }, sections: [] },
    },
    {
      id: "novel",
      kind: "creative",
      creative_type: "novel",
      character_data: { basic: { name: "" }, sections: [] },
      novel_settings: { chaptersEnabled: true },
    },
    {
      id: "legacy-novel",
      kind: "creative",
      content_json: { type: "doc" },
      novel_settings: { theme: "cream" },
    },
    {
      id: "legacy-character",
      kind: "creative",
      character_data: { basic: { name: "舊角色" }, sections: [] },
    },
    { id: "note", kind: "note" },
  ];
  const original = structuredClone(data);
  assert.deepEqual(
    data.filter(isCreativeCharacterPage).map((p) => p.id),
    ["character", "world", "legacy-character"],
  );
  assert.deepEqual(
    data.filter(isNovelPage).map((p) => p.id),
    ["novel", "legacy-novel"],
  );
  assert.deepEqual(data, original);
});
test("central icons match feature/page identities across overview/card/default icons, retaining user emoji text", () => {
  const {
    default: FeatureIcon,
    featureIcons,
    featureForPage,
  } = require("../src/components/FeatureIcon.tsx");
  const {
    default: Collection,
  } = require("../src/components/PageCollection.tsx");
  for (const key of [
    "notes",
    "study",
    "calendar",
    "creative",
    "novels",
    "tools",
    "score",
    "dictionary",
    "world",
    "character",
    "counter",
    "draw",
  ]) {
    assert.ok(featureIcons[key]);
    const html = renderToStaticMarkup(
      React.createElement(FeatureIcon, { feature: key }),
    );
    assert.ok(html.includes(`data-feature-icon="${key}"`));
    assert.ok(html.includes('stroke-width="1.75"'));
    assert.ok(html.includes('aria-hidden="true"'));
  }
  assert.equal(
    featureForPage({
      kind: "creative",
      creative_type: "novel",
      character_data: {},
    }),
    "novels",
  );
  const page = {
    id: "keep-id",
    kind: "note",
    title: "😀 自訂標題",
    content_text: "🌍 使用者內容",
    updated_at: 1,
    created_at: 1,
  };
  const html = renderToStaticMarkup(
    wrap(React.createElement(Collection, { pages: [page], onSelectPage() {} })),
  );
  assert.ok(html.includes("😀 自訂標題"));
  assert.ok(html.includes("🌍 使用者內容"));
  assert.ok(html.includes('data-feature-icon="note"'));
  assert.ok(html.includes('data-collection-row="cards"'));
});
test("one shared compact control includes mode icons and sort direction in the same menu, without a separate arrow button", () => {
  const Control = require("../src/components/CollectionControls.tsx").default;
  const html = renderToStaticMarkup(
    wrap(
      React.createElement(Control, {
        view: "list",
        onView() {},
        sort: "title",
        ascending: true,
        onSort() {},
      }),
    ),
  );
  assert.ok(html.includes('aria-haspopup="menu"'));
  assert.ok(!html.includes("<select"));
  assert.equal((html.match(/<button/g) || []).length, 3);
  assert.ok(html.includes('aria-pressed="true"'));
  assert.ok(!html.includes("rounded border"));
});
