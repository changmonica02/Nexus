"use client";
import { useAnchoredMenu } from "./useAnchoredMenu";
import FeatureIcon from "./FeatureIcon";
import { useMenuDismiss } from "./useMenuDismiss";
import {createPortal} from "react-dom";
import { useRef, useState } from "react";

export interface PageMenuItem {
  id: string;
  icon?: string;
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?:boolean;
}

const MENU_WIDTH = 208;

export default function PageItemMenu({ items, title }: { items: PageMenuItem[]; title: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const { position, portalRoot, onKeyDown } = useAnchoredMenu(isOpen, buttonRef, menuRef, MENU_WIDTH, "right", true);
  const close=()=>{setIsOpen(false);buttonRef.current?.focus();};
  useMenuDismiss(isOpen,[buttonRef,menuRef],close);

  const openMenu = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (!buttonRef.current) return;
    if (isOpen) { setIsOpen(false); return; }
    setIsOpen(true);
  };

  return (
    <>
      <button type="button" ref={buttonRef} aria-label={title} aria-expanded={isOpen} aria-haspopup="menu" onClick={openMenu} className="flex shrink-0 items-center justify-center w-11 h-11 hover:bg-zinc-300 rounded-md text-base transition-all text-zinc-500" title={title}>⋯</button>
      {isOpen && portalRoot && createPortal(
        <div ref={menuRef} role="menu" aria-label={title} onKeyDown={onKeyDown} className="fixed rounded-xl overflow-hidden shadow-2xl z-[9998]" style={{ top: `${position.top}px`, left: `${position.left}px`, width: `${position.width}px`, maxHeight: "min(360px, calc(100dvh - 16px))", overflowY: "auto", backgroundColor: "var(--color-bg)", border: "1px solid var(--color-border)" }} onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
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
