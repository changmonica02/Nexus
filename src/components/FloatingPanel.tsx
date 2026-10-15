"use client";
import { useEffect, useRef, type ReactNode } from "react";
/** Native modal supplies focus trapping, scroll isolation and an actual backdrop. */
export default function FloatingPanel({
  open,
  onClose,
  label,
  children,
  corner = false,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  children: ReactNode;
  corner?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open) {
      const trigger = document.activeElement as HTMLElement | null,
        dialog = ref.current;
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
      aria-label={label}
      onCancel={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className={
        corner
          ? "m-0 h-dvh max-h-dvh w-screen max-w-none border-0 bg-transparent p-0 text-[var(--color-text)] backdrop:bg-black/30"
          : "m-auto w-[min(94vw,420px)] max-h-[85dvh] overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-5 text-[var(--color-text)] backdrop:bg-black/30"
      }
    >
      {children}
    </dialog>
  );
}
