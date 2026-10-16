import React from "react";
import { createRoot } from "react-dom/client";
import Library from "../../src/components/CreationTemplateLibrary";
import { CreationTemplateLibrary } from "../../src/features/creation/templateLibrary";
import { IndexedDBAdapter } from "../../src/infrastructure/storage/IndexedDBAdapter";
import { installCreationTemplate } from "../../src/features/creation/installTemplate";
const actor = new URLSearchParams(location.search).has("reader")
  ? "00000000-0000-4000-8000-000000900001"
  : "00000000-0000-4000-8000-000000900000";
async function api(method, args = {}) {
  const response = await fetch("/api", {
    method: "POST",
    headers: { "content-type": "application/json", "x-test-owner": actor },
    body: JSON.stringify({ method, args }),
  });
  const data = await response.json();
  if (!response.ok) throw Error(data.error);
  return data;
}
class TestLibrary extends CreationTemplateLibrary {
  capabilities() {
    return new URLSearchParams(location.search).has("no-cap")
      ? Promise.resolve(null)
      : api("capabilities");
  }
  owner() {
    return Promise.resolve(actor);
  }
  list(kind, filter, page, search) {
    return api("list", { kind, filter, page, search });
  }
  post(id) {
    return api("post", { id });
  }
  draft(id) {
    return api("draft", { id });
  }
  versions(id, page) {
    return api("versions", { id, page });
  }
  mutate(action, input) {
    return api("mutate", { action, input });
  }
  save(input) {
    return super.save(input);
  }
  reports() {
    return api("reports");
  }
}
const storage = new IndexedDBAdapter();
await storage.init();
storage.setWorkspaceOwner(actor);
window.libraryStorage = storage;
window.libraryApi = api;
const templates = [
  {
    id: "my-private",
    title: "私人結構",
    kind: "creative",
    creative_type: "character",
    character_data: {
      isTemplate: true,
      blocks_version: 1,
      basicBlock: { id: "basic", enabled: true },
      basic: { name: "DO NOT PUBLISH" },
      sections: [
        {
          id: "block",
          type: "group",
          title: "背景",
          contents: [
            {
              id: "story",
              type: "rich_text",
              title: "故事",
              richText: "PRIVATE STORY",
            },
          ],
        },
      ],
      tabs: [],
    },
  },
];
window.downloads = [];
createRoot(document.getElementById("root")).render(
  <div style={{ height: "100dvh" }} className="flex">
    <Library
      service={new TestLibrary()}
      templates={templates}
      onClose={() => {}}
      onDownload={async (data) => {
        if (window.failDownload) throw Error("Local download failed");
        await installCreationTemplate(storage, data, actor);
        window.downloads.push(data);
      }}
    />
  </div>,
);
