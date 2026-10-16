import React from "react";
import { createRoot } from "react-dom/client";
import Dashboard from "../../src/components/Dashboard";
import { LanguageProvider } from "../../src/lib/LanguageContext";
import ConfirmDialogHost from "../../src/components/ConfirmDialog";
const stamp = Date.now();
window.actions = [];
const pages = [
  ["note", "筆記A", "Alpha"],
  ["study_set", "學習集B", "Beta"],
  ["creative", "世界觀C", "Alpha"],
  ["creative", "小說D", null],
  ["counter", "計數E", null],
  ["draw", "抽選F", "Beta"],
].map(([kind, title, folder], i) => ({
  id: String(i),
  kind,
  title,
  folder,
  updated_at: stamp - i * 1000,
  created_at: stamp,
  content_text: "內容",
  content_json: {},
  default_mode: "note",
  creative_type:
    kind === "creative" ? (i === 2 ? "world" : "novel") : undefined,
}));
createRoot(document.getElementById("root")).render(
  <LanguageProvider
    initialLanguage={
      new URLSearchParams(location.search).has("en") ? "en" : "zh-TW"
    }
  >
    <Dashboard
      pages={pages}
      onSelectPage={(id) => window.actions.push(["open", id])}
      onDeletePages={(ids) => window.actions.push(["delete", ids])}
      onPinPages={(ids) => window.actions.push(["pin", ids])}
      onSetFolder={(...args) => window.actions.push(["folder", ...args])}
      onReorderPages={(ids) => window.actions.push(["order", ids])}
      onRenamePage={(...args) => window.actions.push(["rename", ...args])}
      onDuplicatePage={(id) => window.actions.push(["copy", id])}
      onDeletePage={(id) => window.actions.push(["delete-one", id])}
    />
    <ConfirmDialogHost />
  </LanguageProvider>,
);
