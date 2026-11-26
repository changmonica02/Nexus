import React, { useEffect, useState } from "react";
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
  const [tasks, setTasks] = useState([]);
  const [owner, setOwner] = useState("life-browser-a");
  useEffect(() => {
    let active = true;
    const load = async () => {
      const pages = await storage.listPages();
      if (active) setTasks(pages);
    };
    window.reloadLifePages = load;
    void load();
    return () => { active = false; };
  }, [owner]);
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
          pages={tasks}
          onCreate={() => {}}
          onUpdate={(id, patch) => {
            setTasks(current => current.map(task => task.id === id ? { ...task, ...patch } : task));
          }}
          onDelete={() => {}}
          onSelectPage={() => {}}
        />
        <ConfirmDialog />
      </div>
    </LanguageProvider>
  );
}
createRoot(document.getElementById("root")).render(<App />);
