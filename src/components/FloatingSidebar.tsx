"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import ModalDialog from "./ModalDialog";
import { useLanguage } from "../lib/LanguageContext";

/** One modal drawer for every route. Its children stay mounted while closed. */
export default function FloatingSidebar({
  open,
  onClose,
  children,
  docked = false,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  docked?: boolean;
}) {
  const { t } = useLanguage();
  const [width, setWidth] = useState(300);
  const panelRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const saved = Number(window.localStorage.getItem("nexus:noteSidebarWidth"));
    if (Number.isFinite(saved) && saved >= 220 && saved <= 460) setWidth(saved);
  }, []);
  if (docked) return open ? (
    <aside ref={panelRef} data-note-sidebar="docked" aria-label={t("ui.navigation")}
      className="relative z-20 flex h-full min-h-0 shrink-0 bg-[var(--color-sidebar-bg)]"
      style={{ width }}>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{children}</div>
      <div role="separator" aria-label="調整筆記側邊欄寬度" aria-orientation="vertical" aria-valuemin={220} aria-valuemax={460} aria-valuenow={width} tabIndex={0}
        className="absolute inset-y-0 right-0 z-10 w-1.5 cursor-col-resize hover:bg-zinc-500/20"
        onPointerDown={event => {
          event.preventDefault();
          const startX = event.clientX, startWidth = panelRef.current?.getBoundingClientRect().width ?? width;
          event.currentTarget.setPointerCapture(event.pointerId);
          const target = event.currentTarget;
          const move = (moveEvent: PointerEvent) => setWidth(Math.max(220, Math.min(460, Math.round(startWidth + moveEvent.clientX - startX))));
          const stop = () => { target.removeEventListener("pointermove", move); target.removeEventListener("pointerup", stop); target.removeEventListener("pointercancel", stop); window.localStorage.setItem("nexus:noteSidebarWidth", String(Math.round(panelRef.current?.getBoundingClientRect().width ?? width))); };
          target.addEventListener("pointermove", move);
          target.addEventListener("pointerup", stop, { once: true });
          target.addEventListener("pointercancel", stop, { once: true });
        }}
        onKeyDown={event => { if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); setWidth(previous => { const next = Math.max(220, Math.min(460, previous + (event.key === "ArrowRight" ? 10 : -10))); window.localStorage.setItem("nexus:noteSidebarWidth", String(next)); return next; }); } }} />
    </aside>
  ) : null;
  return (
    <ModalDialog open={open} onDismiss={onClose} dismissOnBackdrop
      aria-label={t("ui.navigation")}
      className="m-0 h-dvh max-h-dvh w-[min(360px,100vw)] max-w-none border-0 bg-transparent p-0 text-[var(--color-text)] backdrop:bg-black/30"
    >
      <div className="flex h-full min-h-0 flex-col bg-[var(--color-sidebar-bg)] pb-[env(safe-area-inset-bottom)]">
        {children}
      </div>
    </ModalDialog>
  );
}
