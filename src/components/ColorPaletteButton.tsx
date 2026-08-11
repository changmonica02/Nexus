"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";

const COMMON_COLORS: string[] = [
  "#000000", "#434343", "#666666", "#999999", "#b7b7b7", "#cccccc", "#d9d9d9", "#efefef", "#f3f3f3", "#ffffff",
  "#980000", "#ff0000", "#ff9900", "#ffff00", "#00ff00", "#00ffff", "#4a86e8", "#0000ff", "#9900ff", "#ff00ff",
  "#e6b8af", "#f4cccc", "#fce5cd", "#fff2cc", "#d9ead3", "#d0e0e3", "#c9daf8", "#cfe2f3", "#d9d2e9", "#ead1dc",
  "#dd7e6b", "#ea9999", "#f9cb9c", "#ffe599", "#b6d7a8", "#a2c4c9", "#a4c2f4", "#9fc5e8", "#b4a7d6", "#d5a6bd",
  "#cc4125", "#e06666", "#f6b26b", "#ffd966", "#93c47d", "#76a5af", "#6d9eeb", "#6fa8dc", "#8e7cc3", "#c27ba0",
];

const STORAGE_KEY = "nexus-recent-colors";
const MAX_RECENT = 10;

function getRecentColors(): string[] {
  try {
    const raw: string | null = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as string[]).slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

function saveRecentColor(color: string): void {
  try {
    const recent: string[] = getRecentColors().filter((c: string) => c.toLowerCase() !== color.toLowerCase());
    recent.unshift(color);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
  } catch {
    /* ignore */
  }
}

interface ColorPaletteButtonProps {
  icon: React.ReactNode;
  title: string;
  currentColor: string;
  onColorChange: (color: string) => void;
  disabled?: boolean;
}

export default function ColorPaletteButton({ icon, title, currentColor, onColorChange, disabled }: ColorPaletteButtonProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [recentColors, setRecentColors] = useState<string[]>([]);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (isOpen) setRecentColors(getRecentColors());
  }, [isOpen]);

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    let left = rect.left;
    let top = rect.bottom + 8;
    // clamp to viewport
    const popupWidth = 248;
    if (left + popupWidth > window.innerWidth - 8) {
      left = window.innerWidth - popupWidth - 8;
    }
    if (top + 320 > window.innerHeight - 8) {
      top = rect.top - 320 - 8;
      if (top < 8) top = 8;
    }
    setPos({ top, left });
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (buttonRef.current && buttonRef.current.contains(target)) return;
      if (popupRef.current && popupRef.current.contains(target)) return;
      setIsOpen(false);
    };
    const handleResize = () => updatePosition();
    document.addEventListener("mousedown", handler);
    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleResize, true);
    return () => {
      document.removeEventListener("mousedown", handler);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleResize, true);
    };
  }, [isOpen, updatePosition]);

  const handleSelect = useCallback((color: string): void => {
    saveRecentColor(color);
    onColorChange(color);
    setIsOpen(false);
  }, [onColorChange]);

  const handleClear = useCallback((): void => {
    onColorChange("");
    setIsOpen(false);
  }, [onColorChange]);

  const handleCustomColor = useCallback((e: React.ChangeEvent<HTMLInputElement>): void => {
    handleSelect(e.target.value);
  }, [handleSelect]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        title={title}
        disabled={disabled}
        onMouseDown={(e: React.MouseEvent) => e.preventDefault()}
        onClick={() => setIsOpen((prev: boolean) => !prev)}
        className="rounded flex flex-col items-center justify-center w-[30px] h-[30px] transition-all hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
        style={{ color: "var(--color-text)" }}
      >
        {icon}
        <span className="block w-4 h-[3px] rounded-sm -mt-0.5" style={{ backgroundColor: currentColor || "var(--color-text)" }} />
      </button>

      {mounted && isOpen && createPortal(
        <div
          ref={popupRef}
          className="rounded-xl shadow-2xl z-[9999] p-2.5"
          style={{
            position: "fixed",
            top: pos.top,
            left: pos.left,
            width: 248,
            backgroundColor: "var(--color-bg)",
            border: "1px solid var(--color-border)",
          }}
          onMouseDown={(e: React.MouseEvent) => e.preventDefault()}
        >
          <div className="flex items-center gap-2 mb-2 pb-2" style={{ borderBottom: "1px solid var(--color-border)" }}>
            <div className="w-6 h-6 rounded border" style={{ backgroundColor: currentColor || "transparent", borderColor: "var(--color-border)" }} />
            <span className="text-[11px] font-mono opacity-60 flex-1">{currentColor || "none"}</span>
            <button onClick={handleClear} className="text-[10px] px-1.5 py-0.5 rounded hover:bg-zinc-200 opacity-60 hover:opacity-100">Clear</button>
          </div>
          <div className="mb-2">
            <div className="flex flex-wrap gap-[3px]">
              {COMMON_COLORS.map((color: string) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => handleSelect(color)}
                  className="w-5 h-5 rounded-sm border transition-all hover:scale-125"
                  style={{
                    backgroundColor: color,
                    borderColor: color.toLowerCase() === (currentColor || "").toLowerCase() ? "#2563eb" : "var(--color-border)",
                    boxShadow: color.toLowerCase() === (currentColor || "").toLowerCase() ? "0 0 0 1px #2563eb" : "none",
                  }}
                  title={color}
                />
              ))}
            </div>
          </div>
          {recentColors.length > 0 && (
            <div className="mb-2">
              <div className="text-[10px] opacity-50 mb-1">Recent</div>
              <div className="flex flex-wrap gap-[3px]">
                {recentColors.map((color: string, i: number) => (
                  <button
                    key={`${color}-${i}`}
                    type="button"
                    onClick={() => handleSelect(color)}
                    className="w-5 h-5 rounded-sm border transition-all hover:scale-125"
                    style={{ backgroundColor: color, borderColor: "var(--color-border)" }}
                    title={color}
                  />
                ))}
              </div>
            </div>
          )}
          <div className="pt-2" style={{ borderTop: "1px solid var(--color-border)" }}>
            <label className="flex items-center gap-2 cursor-pointer text-[11px] opacity-70 hover:opacity-100">
              <span>🎨</span>
              <span>Custom color</span>
              <input type="color" value={currentColor || "#000000"} onChange={handleCustomColor} className="w-6 h-5 rounded cursor-pointer border-0 p-0" />
            </label>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

