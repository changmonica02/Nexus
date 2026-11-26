import { CalendarDays, ChevronDown, LayoutDashboard, ListChecks, ListTree, Timer, CalendarRange, Hourglass, Flame, Wallet } from "lucide-react";
import { useState, type KeyboardEvent } from "react";
import { lifeModules, type LifeModule } from "./dashboard/model";

const icons = { overview: LayoutDashboard, calendar: CalendarDays, schedule: CalendarRange, tasks: ListChecks, lists: ListTree, timer: Timer, milestones: Hourglass, habits: Flame, finance: Wallet };

export default function LifeNavigation({ enabled, active, title, label, open }: {
  enabled: LifeModule[]; active: LifeModule | "overview"; title: string;
  label: (tab: LifeModule | "overview") => string; open: (tab: LifeModule | "overview") => void;
}) {
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const groups = new Map<string, LifeModule[]>();
  for (const item of enabled) {
    const group = lifeModules[item].group;
    const members = groups.get(group);
    if (members) members.push(item);
    else groups.set(group, [item]);
  }
  const navigateTabs = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
    const tabs = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
    const index = tabs.indexOf(event.target as HTMLButtonElement);
    if (index < 0) return;
    event.preventDefault();
    const offset = event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1;
    const next = event.key === "Home" ? tabs[0] : event.key === "End" ? tabs.at(-1)
      : tabs[(index + offset + tabs.length) % tabs.length];
    next?.focus();
    next?.click();
  };
  const tab = (module: LifeModule | "overview") => {
    const Icon = icons[module];
    return <button key={module} type="button" role="tab" aria-controls="life-content" aria-selected={active === module}
      className={"flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-3 text-left text-sm hover:bg-zinc-500/10 md:w-full " +
        (active === module ? "bg-zinc-500/15 font-semibold" : "")} onClick={() => open(module)}>
      <Icon size={17} aria-hidden="true"/>{label(module)}
    </button>;
  };
  return <nav aria-label={title} className="shrink-0 border-b border-[var(--color-border)] bg-[var(--color-sidebar-bg)] md:w-44 md:overflow-auto md:border-r md:border-b-0">
    <div role="tablist" onKeyDown={navigateTabs} className="flex gap-1 overflow-x-auto p-2 md:hidden">{tab("overview")}{enabled.map(tab)}</div>
    <div role="tablist" onKeyDown={navigateTabs} className="hidden space-y-2 p-3 md:block">
      {tab("overview")}
      {[...groups].map(([group, modules]) => {
        const expanded = !collapsed.includes(group);
        return <div key={group} role="group" aria-label={group}>
          <button type="button" className="flex min-h-10 w-full items-center justify-between gap-1 px-3 text-left text-sm font-semibold"
            aria-expanded={expanded} onClick={() => setCollapsed(current => expanded ? [...current, group] : current.filter(item => item !== group))}>
            {group}<ChevronDown size={15} className={expanded ? "" : "-rotate-90"} aria-hidden="true"/>
          </button>
          {expanded && <div className="ml-2 space-y-1">{modules.map(tab)}</div>}
        </div>;
      })}
    </div>
  </nav>;
}
