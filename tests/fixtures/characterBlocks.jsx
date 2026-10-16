import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import CharacterTemplateManager from "../../src/components/CharacterTemplateManager";
import {
  snapshotCharacterTemplate,
  instantiateCharacterTemplate,
} from "../../src/lib/characterWorkspace";
import CharacterProfileView from "../../src/components/CharacterProfileView";
import { IndexedDBAdapter } from "../../src/infrastructure/storage/IndexedDBAdapter";
import ConfirmDialogHost from "../../src/components/ConfirmDialog";
const owner = "00000000-0000-4000-8000-000000000001",
  storage = new IndexedDBAdapter();
await storage.init();
storage.setWorkspaceOwner(owner);
let page = await storage.getPage("character");
if (!page) {
  page = {
    id: "character",
    kind: "creative",
    creative_type: "character",
    workspace_owner_id: owner,
    title: "Alice",
    content_json: {},
    content_text: "",
    default_mode: "note",
    created_at: 1,
    updated_at: 1,
    revision: 1,
    deleted_at: null,
    attachment_ids: ["old-photo"],
    character_data: {
      basic: {
        name: "Alice",
        age: "22",
        gender: "女",
        alias: "A",
        customFields: [{ id: "custom", key: "舊欄位", value: "不得遺失" }],
      },
      sections: [
        { id: "story", type: "rich_text", title: "故事", richText: "原故事" },
        { id: "group-empty", type: "group", title: "空白區塊", contents: [] },
        {
          id: "group-other",
          type: "group",
          title: "能力",
          contents: [
            {
              id: "stats",
              type: "stats",
              title: "分數",
              stats: [{ label: "力量", value: 12, max: 20 }],
            },
          ],
        },
      ],
      tabs: [
        {
          id: "old-tab",
          title: "舊補充頁",
          sections: [
            {
              id: "extra",
              type: "rich_text",
              title: "備註",
              richText: "保留分頁內容",
            },
          ],
        },
      ],
    },
  };
  await storage.savePage(page);
}
if (new URLSearchParams(location.search).has("template")) {
  page = {
    ...page,
    character_data: { ...page.character_data, isTemplate: true },
  };
}
window.characterStorage = storage;
window.failSave = false;
window.commits = 0;
function Manager() {
  const [items, setItems] = useState([
    {
      ...page,
      title: "私人模板",
      character_data: snapshotCharacterTemplate(page.character_data),
    },
  ]);
  window.instances = [];
  return (
    <CharacterTemplateManager
      templates={items}
      onClose={() => {}}
      onCreate={() => {}}
      onEdit={() => {}}
      onRename={async (id, title) => {
        const next = items.map((p) => (p.id === id ? { ...p, title } : p));
        await storage.savePage(next.find((p) => p.id === id));
        setItems(next);
      }}
      onCopy={async (id) => {
        const source = items.find((p) => p.id === id),
          next = {
            ...source,
            id: "copy-" + Date.now(),
            title: source.title + " copy",
            character_data: snapshotCharacterTemplate(source.character_data),
          };
        await storage.savePage(next);
        setItems([...items, next]);
      }}
      onDelete={async (id) => {
        const p = items.find((p) => p.id === id);
        await storage.deletePage(p.id);
        setItems(items.filter((p) => p.id !== id));
      }}
      onUse={(id) =>
        window.instances.push(
          instantiateCharacterTemplate(
            items.find((p) => p.id === id).character_data,
            id,
          ),
        )
      }
    />
  );
}
function App() {
  const [current, setCurrent] = useState(page);
  return (
    <div style={{ height: "100dvh" }} className="flex">
      <CharacterProfileView
        page={current}
        onTitleChange={() => {}}
        onUpdateCharacterData={() => {
          throw Error("Must use durable commit");
        }}
        onCommitCharacterData={async (data) => {
          if (window.failSave) throw Error("fixture storage failed");
          const latest = await storage.getPage(current.id),
            next = {
              ...latest,
              character_data: data,
              updated_at: Date.now(),
              revision: latest.revision + 1,
            };
          await storage.savePage(next);
          setCurrent(next);
          window.commits++;
        }}
      />
      <ConfirmDialogHost />
    </div>
  );
}
createRoot(document.getElementById("root")).render(
  new URLSearchParams(location.search).has("manager") ? <Manager /> : <App />,
);
