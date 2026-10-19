"use client";
import type { ReactNode } from "react";
import ModalDialog from "./ModalDialog";
/** Native modal supplies focus trapping, scroll isolation and an actual backdrop. */
export default function FloatingPanel({
  open,
  onClose,
  label,
  children,
  corner = false,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  children: ReactNode;
  corner?: boolean;
  wide?: boolean;
}) {
  return (
    <ModalDialog open={open} onDismiss={onClose} dismissOnBackdrop={corner ? "surface" : true}
      aria-label={label}
      className={
        corner
          ? "m-0 h-dvh max-h-dvh w-screen max-w-none border-0 bg-transparent p-0 text-[var(--color-text)] backdrop:bg-black/30"
          : wide ? "m-auto w-[min(94vw,840px)] max-h-[90dvh] overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-5 text-[var(--color-text)] backdrop:bg-black/30" : "m-auto w-[min(94vw,420px)] max-h-[85dvh] overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-5 text-[var(--color-text)] backdrop:bg-black/30"
      }
    >
      {children}
    </ModalDialog>
  );
}
