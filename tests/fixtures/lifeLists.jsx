import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { IndexedDBAdapter } from "../../src/infrastructure/storage/IndexedDBAdapter";
import TodoView from "../../src/components/TodoView";
import { LanguageProvider } from "../../src/lib/LanguageContext";
import ConfirmDialog from "../../src/components/ConfirmDialog";
const storage = new IndexedDBAdapter();
await storage.init();
storage.setWorkspaceOwner("life-browser-a");
window.lifeStorage = storage;
function App() {
  const [owner, setOwner] = useState("life-browser-a");
  window.switchLifeOwner = () => {
    const next = owner === "life-browser-a" ? "life-browser-b" : "life-browser-a";
    storage.setWorkspaceOwner(next);
    setOwner(next);
  };
  return (
    <LanguageProvider initialLanguage="zh-TW">
      <div className="flex h-dvh min-w-0 flex-col">
        <TodoView
          key={owner}
          storage={storage}
          pages={[]}
          onCreate={() => {}}
          onUpdate={() => {}}
          onDelete={() => {}}
          onSelectPage={() => {}}
        />
        <ConfirmDialog />
      </div>
    </LanguageProvider>
  );
}
createRoot(document.getElementById("root")).render(<App />);
