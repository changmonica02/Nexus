"use client";
import FeatureIcon from "./FeatureIcon";
import { useMenuDismiss } from "./useMenuDismiss";
import {createPortal} from "react-dom";
import { useEffect, useRef, useState } from "react";

export interface PageMenuItem {
  id: string;
  icon?: string;
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?:boolean;
}

const MENU_WIDTH = 208;
const EDGE_MARGIN = 10;
const ITEM_HEIGHT = 42;

export default function PageItemMenu({ items, title }: { items: PageMenuItem[]; title: string }) {
  const [portalRoot,setPortalRoot]=useState<Element|null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const close=()=>{setIsOpen(false);buttonRef.current?.focus();};
  useMenuDismiss(isOpen,[buttonRef,menuRef],close);
  useEffect(()=>{if(isOpen)menuRef.current?.querySelector<HTMLButtonElement>('button')?.focus();},[isOpen]);

  const openMenu = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (!buttonRef.current) return;
    if (isOpen) { setIsOpen(false); return; }
    setPortalRoot(buttonRef.current.closest("dialog"));
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
      <button type="button" ref={buttonRef} aria-label={title} aria-expanded={isOpen} aria-haspopup="menu" onClick={openMenu} className="flex shrink-0 items-center justify-center w-11 h-11 hover:bg-zinc-300 rounded-md text-base transition-all text-zinc-500" title={title}>⋯</button>
      {isOpen && position && createPortal(
        <div ref={menuRef} role="menu" aria-label={title} onKeyDown={e=>{
          const keys=['ArrowDown','ArrowUp','Home','End'];if(!keys.includes(e.key))return;e.preventDefault();
          const buttons=Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('button')??[]);const index=buttons.indexOf(document.activeElement as HTMLButtonElement);
          buttons[e.key==='Home'?0:e.key==='End'?buttons.length-1:(index+(e.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length]?.focus();
        }} className="fixed rounded-xl overflow-hidden shadow-2xl z-[9998]" style={{ top: `${position.top}px`, left: `${position.left}px`, width: `${MENU_WIDTH}px`, backgroundColor: "var(--color-bg)", border: "1px solid var(--color-border)" }} onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
          {items.map((item) => (
            <button type="button" role="menuitem" disabled={item.disabled} key={item.id} onClick={() => { close(); item.onClick(); }} className={`w-full flex items-center gap-2.5 px-3.5 py-3 text-sm text-left transition-all ${item.danger ? "text-red-600 hover:bg-red-50" : "hover:bg-zinc-200"}`} style={{ color: item.danger ? undefined : "var(--color-text)" }}>
              <FeatureIcon feature={item.id}/><span>{item.label}</span>
            </button>
          ))}
        </div>, portalRoot ?? document.body
      )}
    </>
  );
}
