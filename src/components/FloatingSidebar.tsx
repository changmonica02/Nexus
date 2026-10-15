"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { useLanguage } from "../lib/LanguageContext";

/** One modal drawer for every route. Its children stay mounted while closed. */
export default function FloatingSidebar({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const { t } = useLanguage();
  useEffect(() => {
    const dialog = ref.current;
    if (open) {
      const trigger = document.activeElement as HTMLElement | null;
      dialog?.showModal();
      return () => {
        dialog?.close();
        trigger?.focus();
      };
    }
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-label={t("ui.navigation")}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="m-0 h-dvh max-h-dvh w-[min(360px,100vw)] max-w-none border-0 bg-transparent p-0 text-[var(--color-text)] backdrop:bg-black/30"
    >
      <div className="flex h-full min-h-0 flex-col bg-[var(--color-sidebar-bg)] pb-[env(safe-area-inset-bottom)]">
        {children}
      </div>
    </dialog>
  );
}
