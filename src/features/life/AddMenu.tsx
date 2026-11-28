import { Fragment, useEffect, useRef, useState } from "react";
import { Plus, ChevronDown } from "lucide-react";
import { control } from "./dashboard/styles";
export default function AddMenu({ items, label = "新增", iconOnly = false }: { label?: string; iconOnly?: boolean; items: { label: string; action: () => void; group?: string }[] }) {
  const [open, setOpen] = useState(false), [alignRight,setAlignRight]=useState(false);
  const root = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); } };
    const resize=()=>setOpen(false);
    document.addEventListener("pointerdown", outside); document.addEventListener("keydown", escape);window.addEventListener("resize",resize);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape);window.removeEventListener("resize",resize); };
  }, [open]);
  if (!items.length) return null;
  return <div ref={root} className="relative text-[var(--color-text)]">
    <button ref={trigger} type="button" className={control + " inline-flex items-center gap-2"} aria-label={label} aria-expanded={open} onClick={() => {setAlignRight((root.current?.getBoundingClientRect().left??0)+176>window.innerWidth-12);setOpen(!open);}}>
      <Plus size={16} aria-hidden="true"/>{!iconOnly&&<>{label}<ChevronDown size={14} aria-hidden="true"/></>}
    </button>
    {open && <div data-life-add-options className={"absolute z-20 mt-1 grid max-h-[55dvh] w-44 max-w-[80vw] overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-1 shadow-lg "+(alignRight?"right-0":"left-0")}>
      {items.map((item, index) => <Fragment key={item.label}>
        {item.group && item.group !== items[index - 1]?.group && <p className="px-3 pt-2 text-xs font-semibold opacity-70">{item.group}</p>}
        <button className="min-h-11 rounded-lg px-3 text-left text-sm hover:bg-zinc-500/10" type="button"
        onClick={() => { setOpen(false); item.action(); }} onKeyDown={event => {
          if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
          event.preventDefault();
          const buttons = [...event.currentTarget.parentElement!.querySelectorAll("button")];
          const index = buttons.indexOf(event.currentTarget);
          buttons[event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : (index + (event.key === "ArrowUp" ? -1 : 1) + buttons.length) % buttons.length]?.focus();
        }}>{item.label}</button></Fragment>)}
    </div>}
  </div>;
}
