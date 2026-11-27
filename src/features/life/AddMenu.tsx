import { useEffect, useRef, useState } from "react";
import { Plus, ChevronDown } from "lucide-react";
import { control } from "./dashboard/styles";
export default function AddMenu({ items, label = "新增" }: { label?: string; items: { label: string; action: () => void }[] }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); } };
    document.addEventListener("pointerdown", outside); document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [open]);
  if (!items.length) return null;
  return <div ref={root} className="relative text-[var(--color-text)]">
    <button ref={trigger} type="button" className={control + " inline-flex items-center gap-2"} aria-expanded={open} onClick={() => setOpen(!open)}>
      <Plus size={16} aria-hidden="true"/>{label}<ChevronDown size={14} aria-hidden="true"/>
    </button>
    {open && <div className="absolute right-0 z-20 mt-1 grid w-44 max-w-[80vw] rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-1 shadow-lg">
      {items.map(item => <button key={item.label} className="min-h-11 rounded-lg px-3 text-left text-sm hover:bg-zinc-500/10" type="button"
        onClick={() => { setOpen(false); item.action(); }} onKeyDown={event => {
          if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
          event.preventDefault();
          const buttons = [...event.currentTarget.parentElement!.querySelectorAll("button")];
          const index = buttons.indexOf(event.currentTarget);
          buttons[event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : (index + (event.key === "ArrowUp" ? -1 : 1) + buttons.length) % buttons.length]?.focus();
        }}>{item.label}</button>)}
    </div>}
  </div>;
}
