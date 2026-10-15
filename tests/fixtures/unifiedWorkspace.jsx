import React from "react";
import { createRoot } from "react-dom/client";
import WorkspaceRoot from "../../src/components/WorkspaceRoot";
import DictionaryAdmin from "../../src/features/dictionary/DictionaryAdmin";
import ConfirmDialogHost from "../../src/components/ConfirmDialog";
import { IndexedDBAdapter } from "../../src/infrastructure/storage/IndexedDBAdapter";
const owner = "00000000-0000-4000-8000-000000000001";
const session = { user: { id: owner, email: "test@example.invalid" } };
const entries = Array.from({ length: 241 }, (_, i) => ({
  id: String(i).padStart(4, "0"),
  headword: "entry " + String(i).padStart(4, "0"),
  kind: i % 2 ? "word" : "root",
  status: i % 3 ? "published" : "draft",
  work_status: ["red", "yellow", "green"][i % 3],
  pending_count: i % 3 === 0 ? 1 : 0,
}));
window.rpcCalls = [];
window.dictionaryClient = {
  auth: {
    getSession: async () => ({ data: { session } }),
    getUser: async () => ({ data: { user: session.user } }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
  },
  rpc: async (name, args = {}) => {
    window.rpcCalls.push({ name, args });
    if (name === "is_dictionary_admin") return { data: true };
    if (name === "list_dictionary_admin_work") {
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
      const rows = scoped.filter(
        (e) => !args.work_filter || e.work_status === args.work_filter,
      );
      return {
        data: {
          items: rows.slice(
            args.page_number * 100,
            (args.page_number + 1) * 100,
          ),
          total: rows.length,
          stats,
        },
      };
    }
    if (name === "preview_dictionary_bulk_publish")
      return {
        data: {
          signature: "test",
          total: 0,
          ready: 0,
          published_total: 0,
          remaining: 0,
          blocked: 0,
          invalid: 0,
          batch_size: 25,
          issues: [],
        },
      };
    return {
      error: { code: "PGRST202", message: "Could not find the function" },
    };
  },
};
const storage = new IndexedDBAdapter();
await storage.init();
storage.setWorkspaceOwner(owner);
if (!(await storage.listPages()).length) {
  await storage.setLanguagePreference("zh-TW");
  for (const kind of [
    "note",
    "document",
    "presentation",
    "creative",
    "web",
    "counter",
    "draw",
    "study_set",
    "novel",
  ]) {
    const page = await storage.createPage({
      kind: kind === "novel" ? "creative" : kind,
      title: "Sample " + kind,
      format: "flow",
    });
    if (kind === "study_set") {
      const repository = storage.getStudyRepository();
      await repository.ensureDeck(page);
      await repository.addCards(page.id, [
        {
          front: "hello",
          back: "你好",
          dictionary_entry_id: "00000000-0000-4000-8000-000000000099",
        },
      ]);
      const before = await repository.readDeck(page.id);
      await repository.review(
        before.cards[0].id,
        before.states[0].head,
        before.cards[0].content_revision,
        3,
        "fixture-review",
        Date.now(),
      );
    }
    if (kind === "web")
      await storage.savePage({
        ...page,
        content_json: {
          intro: "Link introduction",
          links: [
            { id: "link", label: "Nexus", url: "https://example.invalid" },
          ],
        },
        content_text: "Link introduction",
      });
    if (kind === "creative")
      await storage.savePage({
        ...page,
        creative_type: "world",
        character_data: { basic: { name: "Sample world" }, sections: [] },
      });
  }
}
window.fixtureStorage = storage;
createRoot(document.getElementById("root")).render(
  <>
    <WorkspaceRoot>
      <DictionaryAdmin />
    </WorkspaceRoot>
    <ConfirmDialogHost />
  </>,
);
