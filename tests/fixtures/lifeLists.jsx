import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { IndexedDBAdapter } from "../../src/infrastructure/storage/IndexedDBAdapter";
import ToolsOverview from "../../src/components/ToolsOverview";
import TodoView,{initialLifeView} from "../../src/components/TodoView";
import { LanguageProvider } from "../../src/lib/LanguageContext";
import ConfirmDialog from "../../src/components/ConfirmDialog";
const storage = new IndexedDBAdapter();
await storage.init();
storage.setWorkspaceOwner("life-browser-a");
window.lifeStorage = storage;
function App() {
  const [lifeState,setLifeState]=useState(initialLifeView);
  window.openLegacyLife=tab=>setLifeState(previous=>({...previous,tab}));
  const [mode,setMode]=useState("life"), [toolKind,setToolKind]=useState("counter");
  window.showLifeTools=()=>{setToolKind("timer");setMode("tools");};
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
    setOwner(next);setLifeState(initialLifeView());
  };
  return (
    <LanguageProvider initialLanguage="zh-TW">
      <div className="flex h-dvh min-w-0 flex-col">
        <header data-workspace-header className="flex h-14 shrink-0 items-center gap-3 border-b border-[var(--color-border)] px-3"><strong>Nexus</strong><button className="min-h-11" onClick={()=>setMode("life")}>生活</button><button className="min-h-11" onClick={()=>setMode("tools")}>工具</button></header>
        {mode==="tools"?<ToolsOverview storage={storage} pages={tasks} kind={toolKind} onKind={setToolKind} onCreate={()=>{}} onOpen={()=>{}}/>:<TodoView headerIntegrated
          key={owner}
          state={lifeState} onStateChange={setLifeState}
          storage={storage}
          pages={tasks}
          onAdoptTask={()=>void window.reloadLifePages()}
          onCreate={async (title,due,fields)=>{await storage.createPage({...fields,kind:"todo",title,due_date:due});await window.reloadLifePages();}}
          onUpdate={async (id,patch)=>{const task=tasks.find(row=>row.id===id);setTasks(current=>current.map(row=>row.id===id?{...row,...patch}:row));await storage.savePage({...task,...patch});}}
          onDelete={async id=>{await storage.deletePage(id);await window.reloadLifePages();}}
          onSelectPage={() => {}}
        />}
        <ConfirmDialog />
      </div>
    </LanguageProvider>
  );
}
createRoot(document.getElementById("root")).render(<App />);
