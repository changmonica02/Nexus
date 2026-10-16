require("./loadStudy.cjs");
const test = require("node:test"),
  assert = require("node:assert/strict");
const api = require("../src/lib/characterBlocks.ts");
const original = () => ({
  basic: {
    name: "Alice",
    alias: "A",
    age: "22",
    gender: "女",
    avatarUrl: "https://example.invalid/avatar.png",
    customFields: [{ id: "custom", key: "秘密", value: "保留原值" }],
  },
  sections: [
    {
      id: "legacy",
      type: "rich_text",
      title: "故事",
      richText: "不能丟失的內容",
      galleryAttachmentIds: ["attachment-1"],
    },
    {
      id: "group",
      type: "group",
      title: "組織",
      contents: [
        {
          id: "nested",
          type: "group",
          title: "子群",
          contents: [
            {
              id: "stats",
              type: "stats",
              title: "能力",
              stats: [{ label: "力量", value: 12, max: 20 }],
            },
          ],
        },
      ],
    },
  ],
  tabs: [
    {
      id: "tab",
      title: "補充",
      sections: [
        {
          id: "tab-text",
          type: "rich_text",
          title: "其他",
          richText: "另一頁",
        },
      ],
    },
  ],
});
test("legacy normalization preserves original snapshot, fields, photos, attachments, tabs and stable component IDs without mutation", () => {
  const source = original(),
    before = structuredClone(source),
    data = api.normalizeCharacterBlocks(source, "page");
  assert.deepEqual(source, before);
  assert.deepEqual(data.legacyCharacterSnapshot, source);
  assert.equal(data.basic.avatarUrl, source.basic.avatarUrl);
  assert.ok(data.sections.every((b) => b.type === "group"));
  const components = data.sections.flatMap((b) => b.contents);
  assert.equal(
    components.find((c) => c.id === "legacy").richText,
    source.sections[0].richText,
  );
  assert.deepEqual(
    components.find((c) => c.id === "legacy").galleryAttachmentIds,
    ["attachment-1"],
  );
  assert.equal(components.find((c) => c.id === "stats").stats[0].value, 12);
  assert.equal(data.tabs[0].sections[0].contents[0].richText, "另一頁");
  assert.ok(
    components.some((c) =>
      c.keyValues?.some((v) => v.key === "秘密" && v.value === "保留原值"),
    ),
  );
  api.validateCharacterBlocks(data);
  assert.deepEqual(api.normalizeCharacterBlocks(data, "other"), data);
});
test("cross-block move keeps IDs, sizes and data; empty source persists, basic block is never a valid destination", () => {
  let data = api.normalizeCharacterBlocks(original(), "page");
  const source = data.sections.find((b) =>
      b.contents.some((c) => c.id === "legacy"),
    ),
    target = data.sections.find((b) => b.id === "nested");
  source.contents[0].size = { span: 8, height: 320 };
  const old = structuredClone(source.contents[0]);
  data = api.moveCharacterComponent(data, "legacy", target.id, "stats");
  assert.deepEqual(data.sections.find((b) => b.id === source.id).contents, []);
  assert.deepEqual(
    data.sections.find((b) => b.id === target.id).contents[0],
    old,
  );
  assert.throws(
    () => api.moveCharacterComponent(data, "legacy", data.basicBlock.id),
    /目標/,
  );
  api.validateCharacterBlocks(data);
});
test("block sort preserves basic placement and each component; duplicate copies have deterministic collision recovery", () => {
  let data = api.normalizeCharacterBlocks(original(), "page"),
    before = structuredClone(data.basicBlock);
  const last = data.sections.at(-1);
  data = api.reorderCharacterBlock(data, last.id, data.sections[0].id);
  assert.equal(data.sections[0].id, last.id);
  assert.deepEqual(data.basicBlock, before);
  assert.equal(data.sections.flatMap((b) => b.contents).length, 3);
  const source = original();
  source.sections.push({
    ...source.sections[0],
    richText: "第二份同 ID 舊內容",
  });
  const one = api.normalizeCharacterBlocks(source, "page"),
    two = api.normalizeCharacterBlocks(source, "page");
  assert.deepEqual(one, two);
  api.validateCharacterBlocks(one);
  assert.equal(
    one.sections.flatMap((b) => b.contents).filter((c) => c.richText).length,
    2,
  );
  assert.deepEqual(one.legacyCharacterSnapshot, source);
});
test("component edit and resize do not change identity or fonts; validation rejects malformed size/IDs, no partial mutation", () => {
  const data = api.normalizeCharacterBlocks(original(), "page"),
    before = structuredClone(data),
    component = data.sections[0].contents[0];
  const changed = api.updateCharacterComponent(data, component.id, {
    ...component,
    size: { span: 12, height: 400 },
  });
  assert.deepEqual(data, before);
  assert.equal(changed.sections[0].contents[0].richText, component.richText);
  assert.equal(changed.sections[0].contents[0].id, component.id);
  api.validateCharacterBlocks(changed);
  assert.throws(
    () =>
      api.updateCharacterComponent(data, component.id, {
        ...component,
        id: "wrong",
      }),
    /ID/,
  );
  changed.sections[0].contents[0].size.span = 0;
  assert.throws(() => api.validateCharacterBlocks(changed), /尺寸/);
});
test("all existing content types can be added with unique IDs; explicit empty block remains valid", () => {
  const components = api.CHARACTER_COMPONENT_TYPES.map((t, i) =>
    api.newCharacterComponent(t.type, "component-" + i),
  );
  assert.equal(new Set(components.map((c) => c.id)).size, components.length);
  assert.equal(
    components.find((c) => c.type === "gallery").galleryAttachmentIds.length,
    0,
  );
  const data = {
    blocks_version: 1,
    basic: { name: "" },
    basicBlock: { id: "basic", enabled: false },
    sections: [
      { id: "empty", type: "group", title: "空白", contents: [] },
      { id: "full", type: "group", title: "組件", contents: components },
    ],
  };
  api.validateCharacterBlocks(data);
  assert.equal(api.characterBlocks(data).length, 2);
  assert.throws(() => api.newCharacterComponent("group"), /區塊/);
});

test('actual private workspace transaction rolls back a character/outbox failure and backup retains stable blocks and legacy snapshot',async()=>{
 require('fake-indexeddb/auto');const {deleteDB}=require('idb');const {IndexedDBAdapter}=require('../src/infrastructure/storage/IndexedDBAdapter.ts');
 await deleteDB('nexus');const storage=new IndexedDBAdapter();await storage.init();storage.setWorkspaceOwner('character-owner');
 const page={id:'character-page',title:'Alice',kind:'creative',creative_type:'character',workspace_owner_id:'character-owner',content_json:{},content_text:'',default_mode:'note',created_at:1,updated_at:1,revision:1,deleted_at:null,character_data:original(),attachment_ids:['old-attachment']};
 try{
 await storage.savePage(page);const next={...page,updated_at:2,revision:2,character_data:api.normalizeCharacterBlocks(page.character_data,page.id)};
 const put=IDBObjectStore.prototype.add;IDBObjectStore.prototype.add=function(...args){if(this.name==='workspace_outbox')throw Error('fixture outbox failed');return put.apply(this,args);};
 try{await assert.rejects(storage.savePage(next),/fixture outbox failed/);}finally{IDBObjectStore.prototype.add=put;}
 assert.deepEqual((await storage.getPage(page.id)).character_data,page.character_data);await storage.savePage(next);
 const backup=await storage.exportWorkspaceBackup();const saved=backup.pages.find(p=>p.id===page.id);assert.deepEqual(saved.character_data,next.character_data);assert.deepEqual(saved.attachment_ids,['old-attachment']);
 }finally{await storage.close();await deleteDB('nexus');}
});
