"use client";
import { useEffect, useRef, useState, useCallback } from "react";
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
  variant = "block",
  disabled,
}: {
  label: string;
  icon?: string;
  items: ToolbarDropdownItem[];
  variant?: "block" | "inline";
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 192 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const isInline = variant === "inline";
    const w = isInline ? 220 : 260;
    let left = rect.left;
    let top = rect.bottom + 6;
    if (left + w > window.innerWidth - 8) left = window.innerWidth - w - 8;
    if (top + 300 > window.innerHeight - 8) {
      top = rect.top - 300 - 6;
      if (top < 8) top = 8;
    }
    setPos({ top, left, width: w });
  }, [variant]);

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (buttonRef.current && buttonRef.current.contains(target)) return;
      if (popupRef.current && popupRef.current.contains(target)) return;
      setIsOpen(false);
    };
    const onResize = () => updatePosition();
    document.addEventListener("mousedown", handler);
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      document.removeEventListener("mousedown", handler);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [isOpen, updatePosition]);

  const isInline = variant === "inline";

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen((prev) => !prev)}
        disabled={disabled}
        className={
          isInline
            ? "flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
            : "w-full flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-all hover:bg-zinc-200 active:scale-[0.99]"
        }
        style={{
          border: "1px solid var(--color-border)",
          color: "var(--color-text)",
          backgroundColor: isOpen ? "var(--color-border)" : "transparent",
        }}
      >
        <span className="flex items-center gap-1.5">
          {icon && <span>{icon}</span>}
          <span>{label}</span>
        </span>
        <span className="opacity-50 text-[10px] ml-1">▾</span>
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
          onMouseDown={(e) => e.preventDefault()}
        >
          <div className="max-h-[360px] overflow-y-auto p-1">
            {items.map((item) => (
              <button
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
