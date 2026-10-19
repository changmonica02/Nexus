"use client";
import { useLayoutEffect, useState, type RefObject, type KeyboardEvent } from "react";

export function menuPosition(rect: Pick<DOMRect, "left" | "right" | "top" | "bottom">, viewport: { width: number; height: number }, requestedWidth: number, height: number, align: "left" | "right", gap = 6, edge = 8) {
  const width = Math.min(requestedWidth, Math.max(1, viewport.width - edge * 2));
  const left = Math.max(edge, Math.min(align === "right" ? rect.right - width : rect.left, viewport.width - width - edge));
  const top = rect.bottom + gap + height > viewport.height - edge ? Math.max(edge, rect.top - height - gap) : rect.bottom + gap;
  return { top, left, width };
}

export function useAnchoredMenu(open: boolean, anchor: RefObject<HTMLElement | null>, panel: RefObject<HTMLElement | null>, width: number, align: "left" | "right" = "left", focusFirst = false) {
  const [position, setPosition] = useState({ top: 0, left: 0, width });
  const [portalRoot, setPortalRoot] = useState<Element | null>(null);
  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
    if (!anchor.current) return;
    const next = menuPosition(anchor.current.getBoundingClientRect(), { width: window.innerWidth, height: window.innerHeight }, width,
      Math.min(panel.current?.scrollHeight || 300, 360, Math.max(1, window.innerHeight - 16)), align);
    setPosition(previous => previous.top === next.top && previous.left === next.left && previous.width === next.width ? previous : next);
    };
    setPortalRoot(anchor.current?.closest("dialog") ?? document.body);
    update();
    const observer = new ResizeObserver(update);
    if (anchor.current) observer.observe(anchor.current);
    if (panel.current) observer.observe(panel.current);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => { observer.disconnect(); window.removeEventListener("resize", update); window.removeEventListener("scroll", update, true); };
  }, [open, anchor, panel, width, align, portalRoot]);
  useLayoutEffect(() => { if (open && portalRoot && focusFirst) panel.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus(); }, [open, portalRoot, focusFirst, panel]);
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest("input,select,textarea,[contenteditable=true]")) return;
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    const buttons = Array.from(panel.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? []);
    if (!buttons.length) return;
    event.preventDefault();
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    buttons[event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : (index + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length]?.focus();
  };
  return { position, portalRoot, onKeyDown };
}
