"use client";
import { useMenuDismiss } from "./useMenuDismiss";
import { useRef, useState } from "react";

export interface PageMenuItem {
  id: string;
  icon: string;
  label: string;
  onClick: () => void;
  danger?: boolean;
}

const MENU_WIDTH = 208;
const EDGE_MARGIN = 10;
const ITEM_HEIGHT = 42;

export default function PageItemMenu({ items, title }: { items: PageMenuItem[]; title: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useMenuDismiss(isOpen,[buttonRef,menuRef],()=>setIsOpen(false));

  const openMenu = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (!buttonRef.current) return;
    if (isOpen) { setIsOpen(false); return; }
    const rect = buttonRef.current.getBoundingClientRect();
    const estimatedMenuHeight = items.length * ITEM_HEIGHT + 16;
    const openUpward = rect.bottom + estimatedMenuHeight > window.innerHeight - EDGE_MARGIN;
    const idealLeft = rect.right - MENU_WIDTH;
    const maxLeft = window.innerWidth - MENU_WIDTH - EDGE_MARGIN;
    const clampedLeft = Math.min(Math.max(EDGE_MARGIN, idealLeft), Math.max(EDGE_MARGIN, maxLeft));
    setPosition({
      top: openUpward ? Math.max(EDGE_MARGIN, rect.top - estimatedMenuHeight) : rect.bottom + 4,
      left: clampedLeft,
    });
    setIsOpen(true);
  };

  return (
    <>
      <button ref={buttonRef} onClick={openMenu} className="flex items-center justify-center w-9 h-9 hover:bg-zinc-300 rounded-md text-base transition-all text-zinc-500" title={title}>⋮</button>
      {isOpen && position && (
        <div ref={menuRef} className="fixed rounded-xl overflow-hidden shadow-2xl z-[9998]" style={{ top: `${position.top}px`, left: `${position.left}px`, width: `${MENU_WIDTH}px`, backgroundColor: "var(--color-bg)", border: "1px solid var(--color-border)" }} onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
          {items.map((item) => (
            <button key={item.id} onClick={() => { item.onClick(); setIsOpen(false); }} className={`w-full flex items-center gap-2.5 px-3.5 py-3 text-sm text-left transition-all ${item.danger ? "text-red-600 hover:bg-red-50" : "hover:bg-zinc-200"}`} style={{ color: item.danger ? undefined : "var(--color-text)" }}>
              <span>{item.icon}</span><span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}
