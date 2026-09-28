"use client";
import { useMenuDismiss } from "./useMenuDismiss";
import { useEffect, useRef, useState, useCallback, type ReactNode } from "react";
import { createPortal } from "react-dom";

export interface ToolbarDropdownItem {
  id: string;
  icon: string;
  label: string;
  onClick: () => void;
}

export default function ToolbarDropdown({
  label,
  icon,
  items,
  children,
  variant = "block",
  disabled,
}: {
  label: string;
  icon?: string;
  items?: ToolbarDropdownItem[];
  children?: ReactNode;
  variant?: "block" | "inline" | "menu";
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 192 });
  const [mounted, setMounted] = useState(false);
  useMenuDismiss(isOpen,[buttonRef,popupRef],()=>setIsOpen(false));

  useEffect(() => setMounted(true), []);

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const isInline = variant === "inline" || variant === "menu";
    const w = Math.min(isInline ? 220 : 260,Math.max(1,window.innerWidth-16));
    const height=Math.min(popupRef.current?.scrollHeight||300,360,Math.max(1,window.innerHeight-16));
    let left = rect.left;
    let top = rect.bottom + 6;
    if (left + w > window.innerWidth - 8) left = window.innerWidth - w - 8;
    if (top + height > window.innerHeight - 8) {
      top = rect.top - height - 6;
      if (top < 8) top = 8;
    }
    left=Math.max(8,left);
    setPos(previous=>previous.top===top&&previous.left===left&&previous.width===w?previous:{ top, left, width: w });
  }, [variant]);

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();
    // 2026-08-11：選單項執行後關閉（TiptapEditor MenuItem 觸發）
    const onMenuAction = () => setIsOpen(false);
    const onResize = () => updatePosition();
    const observer=new ResizeObserver(onResize);
    if(buttonRef.current?.parentElement)observer.observe(buttonRef.current.parentElement);


    window.addEventListener("nexus-close-menus", onMenuAction);
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);

    return () => {
      observer.disconnect();

      window.removeEventListener("nexus-close-menus", onMenuAction);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);

    };
  }, [isOpen, updatePosition]);

  const isInline = variant === "inline";
  const isMenu = variant === "menu";

  return (
    <>
      <button
        type="button"
        aria-expanded={isOpen}
        ref={buttonRef}
        onClick={() => setIsOpen((prev) => !prev)}
        disabled={disabled}
        className={
          isMenu
            ? "flex items-center gap-0.5 rounded px-2 py-1 text-[13px] transition-colors hover:bg-zinc-200/70 disabled:cursor-not-allowed disabled:opacity-40"
            : isInline
              ? "flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
              : "w-full flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-all hover:bg-zinc-200 active:scale-[0.99]"
        }
        style={{
          border: isMenu ? "none" : "1px solid var(--color-border)",
          color: "var(--color-text)",
          backgroundColor: isOpen ? (isMenu ? "rgba(0,0,0,0.07)" : "var(--color-border)") : "transparent",
        }}
      >
        <span className="flex items-center gap-1.5">
          {icon && <span>{icon}</span>}
          <span>{label}</span>
        </span>
        <span className={isMenu ? "opacity-40 text-[9px] ml-0.5" : "opacity-50 text-[10px] ml-1"}>▾</span>
      </button>
      {mounted && isOpen && createPortal(
        <div
          ref={popupRef}
          className="rounded-xl overflow-hidden shadow-2xl z-[9999]"
          style={{
            position: "fixed",
            top: pos.top,
            left: pos.left,
            width: pos.width,
            backgroundColor: "var(--color-bg)",
            border: "1px solid var(--color-border)",
          }}
          // Button-only menus keep the editor selection. Custom menu content
          // can include native selects, so it must retain its default mouse
          // behavior.
          onMouseDown={children ? undefined : (e) => e.preventDefault()}
        >
          <div className="max-h-[360px] overflow-y-auto p-1" style={{maxHeight:Math.max(1,Math.min(360,window.innerHeight-pos.top-8))}}>
            {children ?? items?.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => {
                  item.onClick();
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left rounded-md transition-all hover:bg-zinc-100"
                style={{ color: "var(--color-text)" }}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

