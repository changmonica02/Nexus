"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import type { Editor } from "@tiptap/core";

export default function TableGridPicker({ editor, disabled }: { editor: Editor | null; disabled?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const [hover, setHover] = useState<{ r: number; c: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const updatePos = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    let left = rect.left;
    let top = rect.bottom + 6;
    const w = 260;
    if (left + w > window.innerWidth - 8) left = window.innerWidth - w - 8;
    if (top + 300 > window.innerHeight - 8) top = rect.top - 300 - 6;
    if (top < 8) top = 8;
    setPos({ top, left });
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    updatePos();
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (buttonRef.current && buttonRef.current.contains(t)) return;
      if (popupRef.current && popupRef.current.contains(t)) return;
      setIsOpen(false);
    };
    const onResize = () => updatePos();
    document.addEventListener("mousedown", handler);
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      document.removeEventListener("mousedown", handler);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [isOpen, updatePos]);

  const insertTable = (rows: number, cols: number) => {
    if (!editor) return;
    editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run();
    setIsOpen(false);
    setHover(null);
  };

  const rows = 8;
  const cols = 10;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        title="插入表格（自由選擇大小）"
        disabled={disabled}
        onMouseDown={(e) => { e.preventDefault(); setIsOpen((v) => !v); }}
        className="rounded flex items-center justify-center w-[30px] h-[30px] text-[12px] font-medium hover:bg-zinc-200 disabled:opacity-30"
        style={{ color: "var(--color-text)" }}
      >
        ⊞
      </button>
      {mounted && isOpen && createPortal(
        <div
          ref={popupRef}
          className="rounded-xl shadow-2xl z-[9999] p-3"
          style={{
            position: "fixed",
            top: pos.top,
            left: pos.left,
            width: 260,
            backgroundColor: "var(--color-bg)",
            border: "1px solid var(--color-border)",
          }}
          onMouseDown={(e) => e.preventDefault()}
        >
          <div className="text-xs font-medium mb-2 flex items-center justify-between">
            <span>插入表格</span>
            <span className="opacity-60 text-[11px]">{hover ? `${hover.r} × ${hover.c}` : "選擇大小"}</span>
          </div>
          <div className="grid gap-[2px] p-2 rounded bg-zinc-50" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
            {Array.from({ length: rows * cols }).map((_, idx) => {
              const r = Math.floor(idx / cols) + 1;
              const c = (idx % cols) + 1;
              const isHighlighted = hover ? r <= hover.r && c <= hover.c : false;
              return (
                <div
                  key={idx}
                  onMouseEnter={() => setHover({ r, c })}
                  onMouseDown={(e) => { e.preventDefault(); insertTable(r, c); }}
                  className={`aspect-square border rounded-sm cursor-pointer ${isHighlighted ? "bg-blue-500 border-blue-600" : "bg-white border-zinc-300 hover:bg-zinc-100"}`}
                />
              );
            })}
          </div>
          <div className="mt-2 text-[10px] opacity-60">點擊選擇行列，支援合併儲存格、平均欄寬列高等試算表功能</div>
        </div>,
        document.body
      )}
    </>
  );
}

