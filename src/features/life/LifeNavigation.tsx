import { CalendarDays, HeartPulse, LayoutDashboard, ListTree, PanelLeftClose, PanelLeftOpen, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { LifeModule } from "./dashboard/model";

const entries = ["overview", "calendar", "health", "finance", "lists"] as const;
const icons = { overview: LayoutDashboard, calendar: CalendarDays, health: HeartPulse, finance: Wallet, lists: ListTree };
export default function LifeNavigation({ enabled, active, title, label, open }: {
  enabled: LifeModule[]; active: LifeModule | "overview"; title: string;
  label: (tab: LifeModule | "overview") => string; open: (tab: LifeModule | "overview") => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => { try { setCollapsed(localStorage.getItem("nexus-life-sidebar-collapsed") === "true"); } catch {} }, []);
  const [header,setHeader]=useState<HTMLElement|null>(null);
  useEffect(()=>{
    const frame=requestAnimationFrame(()=>setHeader(document.getElementById("life-header-navigation")));
    return ()=>cancelAnimationFrame(frame);
  },[]);
  useEffect(()=>{
    if(!expanded)return;
    const close=(event:KeyboardEvent)=>{if(event.key==="Escape")setExpanded(false);};
    const outside=(event:PointerEvent)=>{if(header&&!header.contains(event.target as Node))setExpanded(false);};
    document.addEventListener("keydown",close);
    document.addEventListener("pointerdown",outside);
    return ()=>{document.removeEventListener("keydown",close);document.removeEventListener("pointerdown",outside);};
  },[expanded,header]);
  const toggle=<button type="button" className="life-nav-toggle min-h-11 rounded-lg px-2 text-sm" aria-label="切換生活分頁"
    aria-expanded={expanded} onClick={()=>setExpanded(!expanded)}><span aria-hidden="true">▾</span></button>;
  const choices=<div role="tablist" aria-label={title} className="life-nav-items" onKeyDown={event => {
      if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
      const tabs = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
      const index = tabs.indexOf(event.target as HTMLButtonElement);
      if (index < 0) return;
      event.preventDefault();
      const next = event.key === "Home" ? tabs[0] : event.key === "End" ? tabs.at(-1) : tabs[(index + (event.key === "ArrowUp" ? -1 : 1) + tabs.length) % tabs.length];
      next?.focus(); next?.click();
    }}>
      {entries.filter(item => item === "overview" || enabled.includes(item) || item === "calendar" && enabled.some(id => ["schedule", "tasks", "habits", "milestones"].includes(id))).map(item => {
        const Icon = icons[item], name = item === "lists" ? "我的清單" : label(item);
        return <button key={item} type="button" role="tab" title={name} aria-label={name} aria-controls="life-content" aria-selected={active === item}
          className={"flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-left text-sm hover:bg-zinc-500/10 " + (active === item ? "bg-zinc-500/15 font-semibold" : "")}
          onClick={() => { open(item); setExpanded(false); }}><Icon size={18} className="shrink-0" aria-hidden="true"/><span className="life-nav-label">{name}</span></button>;
      })}
    </div>
  ;
  return <>
    {header ? createPortal(<div className="life-header-menu">{toggle}
      {expanded&&<div className="life-header-options">{choices}</div>}
    </div>,header) : null}
    <nav aria-label={title} className={"life-navigation "+(collapsed?"is-collapsed ":"")+(!header?"life-navigation-inline":"")}>
      {!header&&toggle}
      <button type="button" className="life-sidebar-toggle min-h-11 w-full rounded-lg p-3" aria-label={collapsed ? "展開生活側邊欄" : "收合生活側邊欄"}
        aria-expanded={!collapsed} onClick={() => { const next = !collapsed; setCollapsed(next); try { localStorage.setItem("nexus-life-sidebar-collapsed", String(next)); } catch {} }}>
        {collapsed ? <PanelLeftOpen size={18}/> : <PanelLeftClose size={18}/>}
      </button>
      <div className={expanded?"life-inline-open":undefined}>{choices}</div>
    </nav>
  </>;
}
