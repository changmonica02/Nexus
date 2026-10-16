import React from "react";
import { createRoot } from "react-dom/client";
import { DictionaryWorkspace } from "../../src/features/dictionary/DictionaryAdmin";
import ConfirmDialogHost from "../../src/components/ConfirmDialog";
import { LanguageProvider } from "../../src/lib/LanguageContext";
const request = async (path, body) =>
  (
    await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    })
  ).json();
window.dictionaryClient = {
  auth: {
    getUser: async () => ({
      data: { user: { id: "00000000-0000-4000-8000-000000900000" } },
    }),
  },
  rpc: async (name, args = {}) => {
    if (name === "publish_dictionary_entry" && window.failPublish)
      return { error: { message: "fixture publication denied" } };
    return request("/rpc", { name, args });
  },
  from(table) {
    const filters = [];
    const q = {
      select() {
        return q;
      },
      eq(k, v) {
        filters.push([k, [v]]);
        return q;
      },
      in(k, v) {
        filters.push([k, v]);
        return q;
      },
      order() {
        return q;
      },
      async maybeSingle() {
        const r = await request("/table", { table, filters });
        return { ...r, data: r.data?.[0] ?? null };
      },
      then(resolve, reject) {
        return request("/table", { table, filters }).then(resolve, reject);
      },
    };
    return q;
  },
};
const params = new URLSearchParams(location.search);
createRoot(document.getElementById("root")).render(
  <LanguageProvider initialLanguage="zh-TW">
    <DictionaryWorkspace
      newKind={params.get("kind") || undefined}
      entryId={params.get("entry") || undefined}
    />
    <ConfirmDialogHost />
  </LanguageProvider>,
);
