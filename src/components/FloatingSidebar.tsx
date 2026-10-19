"use client";
import type { ReactNode } from "react";
import ModalDialog from "./ModalDialog";
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
  const { t } = useLanguage();
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
