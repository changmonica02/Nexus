import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import CharacterProfileView from "../../src/components/CharacterProfileView";
import CharacterTemplateUpdateControl from "../../src/components/CharacterTemplateUpdateControl";
import ConfirmDialogHost from "../../src/components/ConfirmDialog";
import { IndexedDBAdapter } from "../../src/infrastructure/storage/IndexedDBAdapter";
import { instantiateCharacterTemplate } from "../../src/lib/characterWorkspace";
const storage = new IndexedDBAdapter();
await storage.init();
storage.setWorkspaceOwner("owner");
const source = {
  isTemplate: true,
  blocks_version: 1,
  basicBlock: { id: "basic", enabled: true },
  basic: { name: "" },
  sections: [
    {
      id: "background",
      type: "group",
      title: "背景",
      contents: [
        { id: "story", type: "rich_text", title: "故事", richText: "" },
        { id: "removed", type: "rich_text", title: "將被移除", richText: "" },
      ],
    },
  ],
  tabs: [],
};
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
  device_id: "browser",
};
let page = await storage.getPage("role");
if (!page) {
  const data = instantiateCharacterTemplate(source, "template");
  data.basic.name = "Alice";
  data.sections[0].contents[0].richText = "私人故事";
  data.sections[0].contents[1].richText = "不可丟失";
  page = {
    ...base,
    id: "role",
    title: "Alice",
    character_data: data,
    attachment_ids: ["private-photo"],
  };
  await storage.savePage(page);
  const next = structuredClone(source);
  next.sections[0].title = "更新背景";
  next.sections[0].contents = [
    { id: "story", type: "rich_text", title: "新版故事", richText: "" },
    { id: "new", type: "rich_text", title: "新空白", richText: "" },
  ];
  await storage.savePage({
    ...base,
    id: "template",
    title: "來源模板",
    character_data: next,
  });
}
window.templateStorage = storage;
window.mutateSource = async () => {
  const s = await storage.getPage("template");
  await storage.savePage({
    ...s,
    revision: s.revision + 1,
    updated_at: Date.now(),
  });
};
window.failUpdate = false;
const originalAdd = IDBObjectStore.prototype.add;
IDBObjectStore.prototype.add = function (...args) {
  if (window.failUpdate && this.name === "workspace_outbox")
    throw Error("injected update failure");
  return originalAdd.apply(this, args);
};
function App() {
  const [current, setCurrent] = useState(page);
  return (
    <div style={{ height: "100dvh" }} className="flex">
      <CharacterProfileView
        page={current}
        onTitleChange={() => {}}
        onUpdateCharacterData={() => {
          throw Error("must commit");
        }}
        onCommitCharacterData={async (data) => {
          const p = await storage.getPage(current.id),
            next = { ...p, character_data: data, revision: p.revision + 1 };
          await storage.savePage(next);
          setCurrent(next);
        }}
        templateActions={
          <CharacterTemplateUpdateControl
            page={current}
            storage={storage}
            onBeforeRead={async () => {}}
            onApplied={setCurrent}
          />
        }
      />
      <ConfirmDialogHost />
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);
