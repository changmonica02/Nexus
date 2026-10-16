require("fake-indexeddb/auto");
require("./loadStudy.cjs");
const test = require("node:test"),
  assert = require("node:assert/strict");
const {
  mergeCharacterTemplate,
  withTemplateSnapshot,
  restoreTemplateSnapshot,
} = require("../src/lib/characterTemplateUpdate.ts");
const {
  instantiateCharacterTemplate,
} = require("../src/lib/characterWorkspace.ts");
const { normalizeCharacterBlocks } = require("../src/lib/characterBlocks.ts");
const {
  IndexedDBAdapter,
} = require("../src/infrastructure/storage/IndexedDBAdapter.ts");
const {
  applyTemplateUpdate,
  restoreCharacterTemplateUpdate,
} = require("../src/features/creation/applyTemplateUpdate.ts");
const source = () => ({
  blocks_version: 1,
  isTemplate: true,
  basicBlock: { id: "basic", enabled: true },
  basic: { name: "" },
  sections: [
    {
      id: "b1",
      type: "group",
      title: "背景",
      contents: [
        {
          id: "story",
          type: "rich_text",
          title: "故事",
          richText: "",
          size: { span: 4 },
        },
        { id: "gone", type: "rich_text", title: "舊故事", richText: "" },
      ],
    },
    {
      id: "b2",
      type: "group",
      title: "能力",
      contents: [
        {
          id: "score",
          type: "stats",
          title: "力量",
          stats: [{ label: "力量", value: 0 }],
        },
      ],
    },
  ],
  tabs: [],
});
const instance = () => {
  const d = instantiateCharacterTemplate(source(), "source");
  d.basic.name = "Alice";
  d.basic.avatarUrl = "private-photo";
  d.sections[0].contents[0].richText = "Private story";
  d.sections[0].contents[1].richText = "Must retain";
  d.sections[1].contents[0].stats[0].value = 19;
  return d;
};
let counter = 0;
const id = () => `new-${++counter}`;
test("three-way template merge adds blank nodes, applies unchanged names/layout/moves/order and retains removed/incompatible content with stable private IDs", () => {
  const old = instance(),
    before = structuredClone(old),
    up = source();
  up.sections[0].title = "新背景";
  up.sections[0].contents = [];
  up.sections[1].contents = [
    { ...up.sections[1].contents[0], type: "rich_text", richText: "" },
    {
      id: "story",
      type: "rich_text",
      title: "新故事",
      size: { span: 8 },
      richText: "",
    },
    { id: "added", type: "rich_text", title: "新空白", richText: "" },
  ];
  const result = mergeCharacterTemplate(old, "source", up, id),
    retained = result.data.sections.find((s) => s.retainedContent);
  assert.deepEqual(old, before);
  assert.equal(result.changed, true);
  assert.equal(result.data.basic.name, "Alice");
  assert.equal(result.data.basic.avatarUrl, "private-photo");
  assert.equal(result.data.sections[0].title, "新背景");
  const story = result.data.sections[1].contents.find(
    (c) => c.template_node_id === "story",
  );
  assert.equal(story.id, old.sections[0].contents[0].id);
  assert.equal(story.richText, "Private story");
  assert.equal(story.title, "新故事");
  assert.equal(story.size.span, 8);
  assert.equal(retained.contents.length, 2);
  assert.equal(
    retained.contents.find((c) => c.id === old.sections[0].contents[1].id)
      .richText,
    "Must retain",
  );
  assert.equal(
    retained.contents.find((c) => c.id === old.sections[1].contents[0].id)
      .stats[0].value,
    19,
  );
  assert.ok(retained.contents.every((c) => !c.template_node_id));
  assert.equal(
    result.data.sections[1].contents.find((c) => c.template_node_id === "added")
      .richText,
    "",
  );
  assert.equal(
    result.data.sections[1].contents.find((c) => c.template_node_id === "score")
      .type,
    "rich_text",
  );
  assert.equal(
    mergeCharacterTemplate(result.data, "source", up, id).changed,
    false,
    "same version is a no-op",
  );
});
test("personal names, dimensions, placement/order, fields and user deletions are never overwritten/resurrected", () => {
  const old = instance(),
    up = source();
  old.sections[0].title = "自己的背景";
  old.sections[0].contents[0].title = "自己的故事";
  old.sections[0].contents[0].size = { span: 12, height: 400 };
  const moved = old.sections[0].contents.shift();
  old.sections[1].contents.unshift(moved);
  old.sections[0].contents = []; // user deleted gone
  old.sections[1].contents.reverse();
  const ordering = old.sections[1].contents.map((c) => c.id);
  up.sections[0].title = "upstream title";
  up.sections[0].contents[0].title = "upstream story";
  up.sections[0].contents[0].size = { span: 8 };
  const result = mergeCharacterTemplate(old, "source", up, id);
  assert.equal(result.data.sections[0].title, "自己的背景");
  assert.deepEqual(
    result.data.sections[1].contents.map((c) => c.id),
    ordering,
  );
  const story = result.data.sections[1].contents.find(
    (c) => c.template_node_id === "story",
  );
  assert.equal(story.title, "自己的故事");
  assert.deepEqual(story.size, { span: 12, height: 400 });
  assert.equal(
    result.data.sections
      .flatMap((b) => b.contents)
      .filter((c) => c.template_node_id === "gone").length,
    0,
  );
});
test("source mismatch, missing old baseline, duplicate source IDs and incompatible hierarchy fail closed", () => {
  const d = instance();
  assert.throws(
    () => mergeCharacterTemplate(d, "different", source()),
    /source mismatch/,
  );
  const legacy = structuredClone(d);
  delete legacy.templateBinding;
  assert.throws(
    () => mergeCharacterTemplate(legacy, "source", source()),
    /Missing baseline/,
  );
  const duplicate = structuredClone(d);
  duplicate.sections[1].contents.push({
    ...duplicate.sections[0].contents[0],
    id: "another",
  });
  assert.throws(
    () => mergeCharacterTemplate(duplicate, "source", source()),
    /Ambiguous/,
  );
  const nested = source();
  nested.sections[0] = {
    id: "replacement",
    type: "group",
    title: "Replacement",
    contents: [
      { id: "b1", type: "rich_text", title: "Changed hierarchy", richText: "" },
    ],
  };
  assert.throws(
    () => mergeCharacterTemplate(d, "source", nested),
    /Incompatible hierarchy/,
  );
});
test("legacy lazy wrappers have a deterministic source mapping; snapshots restore all private content without recursive growth", () => {
  const original = {
    isTemplate: true,
    basic: { name: "" },
    sections: [{ id: "old", type: "rich_text", title: "Old", richText: "" }],
    tabs: [],
  };
  const d = instantiateCharacterTemplate(original, "source");
  d.sections[0].richText = "legacy content";
  const normal = normalizeCharacterBlocks(d, "role"),
    up = structuredClone(original);
  up.sections[0].title = "Updated";
  const result = mergeCharacterTemplate(normal, "source", up, id);
  assert.equal(result.data.sections[0].contents[0].title, "Updated");
  assert.equal(result.data.sections[0].contents[0].richText, "legacy content");
  const snap = withTemplateSnapshot(d, result.data, "source", 123);
  assert.deepEqual(snap.templateUpdateSnapshots[0].data, d);
  const restored = restoreTemplateSnapshot(
    snap,
    snap.templateUpdateSnapshots[0].id,
  );
  assert.equal(restored.sections[0].richText, "legacy content");
  assert.equal(restored.templateUpdateSnapshots.length, 2);
  assert.ok(
    restored.templateUpdateSnapshots.every(
      (s) => !s.data.templateUpdateSnapshots,
    ),
  );
});
test("source and destination CAS share the atomic page/outbox transaction; write failure fully rolls back and restore is durable", async () => {
  const storage = new IndexedDBAdapter();
  await storage.init();
  storage.setWorkspaceOwner("owner");
  const base = {
    kind: "creative",
    creative_type: "character",
    workspace_owner_id: "owner",
    content_json: {},
    content_text: "",
    default_mode: "note",
    created_at: 1,
    updated_at: 1,
    revision: 1,
    deleted_at: null,
    device_id: "test",
  };
  await storage.savePage({
    ...base,
    id: "role",
    title: "Alice",
    character_data: instance(),
    attachment_ids: ["private-photo"],
  });
  const up = source();
  up.sections[0].title = "Changed";
  await storage.savePage({
    ...base,
    id: "source",
    title: "Template",
    character_data: up,
  });
  const old = await storage.getPage("role");
  const { IDBObjectStore } = require("fake-indexeddb"),
    add = IDBObjectStore.prototype.add;
  IDBObjectStore.prototype.add = function (...args) {
    if (this.name === "workspace_outbox")
      throw Error("injected transaction failure");
    return add.apply(this, args);
  };
  try {
    await assert.rejects(
      applyTemplateUpdate(storage, "role", "source", 1, 1),
      /injected/,
    );
  } finally {
    IDBObjectStore.prototype.add = add;
  }
  assert.deepEqual(await storage.getPage("role"), old);
  const saved = await applyTemplateUpdate(storage, "role", "source", 1, 1);
  assert.equal(saved.character_data.sections[0].title, "Changed");
  assert.deepEqual(saved.attachment_ids, ["private-photo"]);
  assert.equal(saved.character_data.templateUpdateSnapshots.length, 1);
  await assert.rejects(
    applyTemplateUpdate(storage, "role", "source", 1, 1),
    /Revision conflict/,
  );
  const restored = await restoreCharacterTemplateUpdate(
    storage,
    "role",
    saved.character_data.templateUpdateSnapshots[0].id,
    2,
  );
  assert.equal(restored.character_data.sections[0].title, "背景");
  assert.equal(restored.character_data.basic.name, "Alice");
  // Directly exercise same-transaction guards against a source changed after preview.
  await assert.rejects(
    storage.savePageChecked(
      { ...restored, title: "forged" },
      restored.revision,
      { id: "source", revision: 999 },
    ),
    /Revision conflict/,
  );
  assert.equal((await storage.getPage("role")).title, "Alice");
  storage.setWorkspaceOwner("other");
  await assert.rejects(applyTemplateUpdate(storage, "role", "source", 3, 1));
  await storage.close();
  await require("idb").deleteDB("nexus");
});

test("blank creation stays entirely empty through legacy normalization", () => {
  const blank = instantiateCharacterTemplate({
    templateId: "blank",
    basic: { name: "" },
    sections: [],
    tabs: [],
  });
  const normalized = normalizeCharacterBlocks(blank, "blank-role");
  assert.equal(normalized.basicBlock.enabled, false);
  assert.deepEqual(normalized.sections, []);
  assert.deepEqual(normalized.tabs, []);
});

test("tabs and cross-tab block moves follow stable source IDs while local overrides remain protected", () => {
  const template = source();
  template.tabs = [
    {
      id: "tab1",
      title: "裝備",
      sections: [
        { id: "inventory", type: "group", title: "物品", contents: [] },
      ],
    },
  ];
  const local = instantiateCharacterTemplate(template, "source"),
    up = structuredClone(template);
  up.tabs[0].title = "新裝備";
  up.tabs[0].sections.push(up.sections.shift());
  up.tabs.push({
    id: "tab2",
    title: "新分頁",
    sections: [{ id: "extra", type: "group", title: "額外", contents: [] }],
  });
  const result = mergeCharacterTemplate(local, "source", up, id);
  assert.equal(result.data.tabs[0].title, "新裝備");
  assert.equal(
    result.data.tabs[0].sections.find((b) => b.template_node_id === "b1")
      .contents[0].id,
    local.sections[0].contents[0].id,
  );
  assert.equal(result.data.tabs[1].template_node_id, "tab2");
  assert.equal(result.data.tabs[1].sections[0].template_node_id, "extra");
});

test("same-transaction source guard catches a change between preflight and commit without touching role data or its snapshot history", async (t) => {
  const { IDBFactory } = require("fake-indexeddb");
  global.indexedDB = new IDBFactory();
  const storage = new IndexedDBAdapter();
  await storage.init();
  storage.setWorkspaceOwner("owner");
  t.after(async () => {
    await storage.close();
    await require("idb").deleteDB("nexus");
  });
  const base = {
    kind: "creative",
    creative_type: "character",
    workspace_owner_id: "owner",
    content_json: {},
    content_text: "",
    default_mode: "note",
    created_at: 1,
    updated_at: 1,
    revision: 1,
    deleted_at: null,
    device_id: "test",
  };
  const original = {
    ...base,
    id: "role",
    title: "Alice",
    character_data: instance(),
  };
  await storage.savePage(original);
  const up = source();
  up.sections[0].title = "new";
  await storage.savePage({
    ...base,
    id: "source",
    title: "Template",
    character_data: up,
  });
  const checked = storage.savePageChecked.bind(storage);
  storage.savePageChecked = async (page, revision, guard) => {
    const s = await storage.getPage("source");
    await storage.savePage({ ...s, revision: s.revision + 1 });
    return checked(page, revision, guard);
  };
  await assert.rejects(
    applyTemplateUpdate(storage, "role", "source", 1, 1),
    /Revision conflict/,
  );
  assert.deepEqual(await storage.getPage("role"), original);
});

test("snapshot-bearing role uses the unchanged workspace outbox, backup and second-device merge contracts", async (t) => {
  const { IDBFactory } = require("fake-indexeddb");
  global.indexedDB = new IDBFactory();
  const first = new IndexedDBAdapter();
  await first.init();
  first.setWorkspaceOwner("owner");
  t.after(() => first.close());
  const data = withTemplateSnapshot(
    instance(),
    mergeCharacterTemplate(instance(), "source", source()).data,
    "source",
  );
  const page = {
    id: "snapshot-role",
    title: "Alice",
    kind: "creative",
    creative_type: "character",
    workspace_owner_id: "owner",
    content_json: {},
    content_text: "",
    default_mode: "note",
    created_at: 1,
    updated_at: 1,
    revision: 1,
    deleted_at: null,
    device_id: "test",
    character_data: data,
  };
  await first.savePage(page);
  const pending = await first.getWorkspacePersistence().pending("owner");
  assert.deepEqual(pending[0].operations[0].value.character_data, data);
  const backup = await first.exportWorkspaceBackup();
  assert.deepEqual(
    backup.pages.find((p) => p.id === page.id).character_data,
    data,
  );
  global.indexedDB = new IDBFactory();
  const second = new IndexedDBAdapter();
  await second.init();
  second.setWorkspaceOwner("owner");
  t.after(async () => {
    await second.close();
    await require("idb").deleteDB("nexus");
  });
  await second
    .getWorkspacePersistence()
    .merge("owner", [
      {
        entity_type: "pages",
        entity_id: page.id,
        revision: 1,
        deleted_at: null,
        row: { ...page, owner_id: "owner" },
      },
    ]);
  assert.deepEqual((await second.getPage(page.id)).character_data, data);
  second.setWorkspaceOwner("other");
  assert.equal((await second.listPages()).length, 0);
  await assert.rejects(applyTemplateUpdate(second,page.id,"source",1,1),/Source unavailable/);
});
