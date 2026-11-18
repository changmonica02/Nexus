const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
function load(path) {
  const output = ts.transpileModule(fs.readFileSync(path, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const api = {};
  new Function("exports", "require", output)(api, require);
  return api;
}
const { updateCharacterSection, deleteCharacterSection, moveCharacterSection, snapshotCharacterTemplate, instantiateCharacterTemplate } = load("src/lib/characterWorkspace.ts");
const { createBlankTemplate, createDnd5eTemplate, createCoc7eTemplate } = load("src/lib/characterTemplates.ts");

const mixed = () => [{ id: "block", type: "group", title: "背景", contents: [
  { id: "prose", type: "rich_text", title: "故事", richText: "第一行\n第二行" },
  { id: "short", type: "key_value", title: "外觀", keyValues: [{ key: "髮色", value: "銀白" }] },
] }, { id: "legacy", type: "rich_text", title: "舊版組件", richText: "保留" }];

test("mixed blocks edit and reorder only the selected sibling, preserving legacy data", () => {
  const source = mixed();
  const original = JSON.stringify(source);
  const updated = updateCharacterSection(source, "prose", { richText: "新內容" });
  assert.equal(updated[0].contents[0].richText, "新內容");
  assert.equal(updated[1].richText, "保留");
  const moved = moveCharacterSection(updated, "short", -1);
  assert.deepEqual(moved[0].contents.map((section) => section.id), ["short", "prose"]);
  assert.deepEqual(deleteCharacterSection(moved, "short")[0].contents.map((section) => section.id), ["prose"]);
  assert.deepEqual(deleteCharacterSection(moved, "block").map((section) => section.id), ["legacy"]);
  assert.equal(JSON.stringify(source), original);
});

test("templates preserve only structure and create independent blank characters", () => {
  const source = { basic: { name: "原角色", alias: "破曉之刃", gender: "男" }, world_id: "old-world", sections: mixed(),
    tabs: [{ id: "old-tab", title: "裝備", sections: [{ id: "stats", type: "statistics", title: "背包", statisticHeaders: { label: "物品", description: "介紹", value: "重量", unit: "單位" }, statistics: [{ label: "劍", description: "雙手劍", value: 2, unit: "公斤" }] }] }],
  };
  const snapshot = snapshotCharacterTemplate(source);
  const one = instantiateCharacterTemplate(snapshot, "template-id");
  const two = instantiateCharacterTemplate(snapshot, "template-id");
  assert.equal(one.basic.name, "");
  assert.equal(one.basic.alias, undefined);
  assert.equal(one.basicExamples, undefined);
  assert.equal(one.world_id, null);
  assert.equal(one.isTemplate, false);
  assert.equal(one.templateSourceId, "template-id");
  assert.equal(one.sections[0].contents[0].richText, "");
  assert.equal(one.sections[0].contents[0].example, undefined);
  assert.equal(one.sections[0].contents[1].keyValues[0].key, "髮色");
  assert.equal(one.sections[0].contents[1].keyValues[0].value, "");
  assert.equal(one.tabs[0].sections[0].statisticHeaders.value, "重量");
  assert.deepEqual(one.tabs[0].sections[0].statistics, []);
  assert.notEqual(one.tabs[0].id, two.tabs[0].id);
  assert.notEqual(one.sections[0].contents[0].id, two.sections[0].contents[0].id);
  one.sections[0].contents[0].richText = "自己的故事";
  assert.equal(two.sections[0].contents[0].richText, "");
  assert.equal(snapshot.sections[0].contents[0].richText, "");
  assert.equal(snapshot.isTemplate, true);
});

test("saving an instance as another template never leaks personal content", () => {
  const source = { basic: { name: "範例名", alias: "範例稱號" }, sections: mixed() };
  const instance = instantiateCharacterTemplate(snapshotCharacterTemplate(source));
  instance.basic.name = "新範例名";
  const resaved = snapshotCharacterTemplate(instance);
  assert.equal(resaved.basic.name, "");
  assert.equal(resaved.basic.alias, undefined);
  assert.equal(resaved.sections[0].contents[0].richText, "");
  assert.equal(resaved.sections[0].contents[1].keyValues[0].value, "");
});

test("built-in sheets have no invented character and use separate D&D and CoC structures", () => {
  const blank = createBlankTemplate();
  assert.deepEqual(blank.sections, []);
  assert.deepEqual(blank.tabs, []);
  assert.equal(blank.basic.name, "");
  const dnd = createDnd5eTemplate();
  const coc = createCoc7eTemplate();
  assert.equal(dnd.sections[1].contents[0].stats.length, 6);
  assert.equal(coc.sections[1].contents[0].stats.length, 8);
  assert.ok(dnd.tabs.some((tab) => tab.title === "法術"));
  assert.ok(coc.tabs.some((tab) => tab.title === "調查紀錄"));
  assert.equal(coc.basic.name, "");
});

 test("template allowlist excludes every private payload and retains source node mapping",()=>{
 const original={basic:{name:"secret",avatarUrl:"private-photo"},legacyCharacterSnapshot:{secret:1},sections:[{id:"gallery",type:"gallery",title:"Photos",gallery:["secret-url"],galleryAttachmentIds:["private-id"],example:{richText:"secret"}},{id:"values",type:"stats",title:"Stats",stats:[{label:"Strength",value:99,max:100}]}]};
 const clean=snapshotCharacterTemplate(original), instance=instantiateCharacterTemplate(original,"source");
 assert.ok(!JSON.stringify(clean).includes("secret"));assert.ok(!JSON.stringify(clean).includes("private"));
 assert.equal(clean.sections[1].stats[0].value,0);assert.equal(instance.sections[0].template_node_id,"gallery");
 assert.equal(instance.templateBinding.sourceId,"source");assert.deepEqual(instance.templateBinding.baseline,clean);
 assert.equal(original.sections[1].stats[0].value,99);
 });
