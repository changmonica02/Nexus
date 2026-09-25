const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const compiled = ts.transpileModule(fs.readFileSync("src/lib/novelChapters.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const api = {};
new Function("exports", compiled)(api);
const paragraph = (text) => ({ type: "paragraph", content: [{ type: "text", text }] });
const heading = (text, level = 1) => ({ type: "heading", attrs: { level }, content: [{ type: "text", text }] });

test("activation preserves preface, nested headings and rich blocks without mutating the original", () => {
  const image = { type: "image", attrs: { src: "attachment:test" } };
  const page = { content_json: { type: "doc", content: [paragraph("序言"), heading("第一章"), paragraph("正文"), heading("小節", 2), image, heading("第二章")] } };
  const original = JSON.stringify(page);
  const chapters = api.splitLegacyNovel(page);
  assert.deepEqual(chapters.map((chapter) => chapter.title), ["序章", "第一章", "第二章"]);
  assert.deepEqual(chapters[1].content_json.content, [paragraph("正文"), heading("小節", 2), image]);
  assert.equal(chapters[1].content_text, "正文\n小節");
  assert.deepEqual(chapters[2].content_json.content, [{ type: "paragraph" }]);
  assert.equal(JSON.stringify(page), original);
});

test("unstructured legacy works and plain-text imports keep their body", () => {
  assert.equal(api.splitLegacyNovel({ content_json: { content: [paragraph("完整正文")] } })[0].content_text, "完整正文");
  const imported = api.splitLegacyNovel({ content_json: {}, content_text: "甲\n乙" });
  assert.equal(imported[0].content_text, "甲\n乙");
  assert.deepEqual(imported[0].content_json.content, [paragraph("甲"), paragraph("乙")]);
  assert.deepEqual(api.splitLegacyNovel({ content_json: {} }), []);
});

test("chapter workspace isolates works, excludes deleted records and orders by stable IDs", () => {
  const chapter = { kind: "novel_chapter", parent_id: "work", deleted_at: null };
  const pages = [
    { ...chapter, id: "b", sort_order: 1 }, { ...chapter, id: "a", sort_order: 1 },
    { ...chapter, id: "first", sort_order: 0 }, { ...chapter, id: "deleted", deleted_at: 10 },
    { ...chapter, id: "other", parent_id: "other" }, { ...chapter, id: "note", kind: "note" },
  ];
  assert.deepEqual(api.getNovelChapters(pages, "work").map((item) => item.id), ["first", "a", "b"]);
  assert.equal(pages[0].id, "b");
  assert.deepEqual(api.getNovelChapters([], "work"), []);
});

test("workspace entry resolves a saved chapter to its parent and never opens orphan chapters", () => {
  const novel = { id: "work", kind: "creative", creative_type: "novel", deleted_at: null };
  const chapter = { id: "chapter", kind: "novel_chapter", parent_id: "work", deleted_at: null };
  const template = { id: "template", kind: "creative", character_data: { isTemplate: true }, deleted_at: null };
  assert.equal(api.getWorkspaceEntryPage([chapter, novel], "chapter").id, "work");
  assert.equal(api.getWorkspaceEntryPage([chapter, template, novel]).id, "work");
  assert.equal(api.getWorkspaceEntryPage([chapter, { ...novel, deleted_at: 10 }], "chapter"), null);
  assert.equal(api.getWorkspaceEntryPage([chapter]), null);
  assert.equal(api.getWorkspaceEntryPage([template], "template").id, "template");
});
