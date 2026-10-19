"use client";
import { useEffect, useRef, type ComponentProps, type RefObject } from "react";

/** Shared native focus/escape lifecycle; content and dismissal policy stay with callers. */
export default function ModalDialog({ open = true, onDismiss, busy = false, dismissOnBackdrop = false, dialogRef, children, ...props }: Omit<ComponentProps<"dialog">, "ref" | "open"> & {
  open?: boolean; onDismiss: () => void; busy?: boolean; dismissOnBackdrop?: boolean | "surface";
  dialogRef?: RefObject<HTMLDialogElement | null>;
}) {
  const fallback = useRef<HTMLDialogElement>(null), ref = dialogRef ?? fallback;
  useEffect(() => {
    if (!open) return;
    const dialog = ref.current, trigger = document.activeElement as HTMLElement | null;
    if (!dialog?.open) dialog?.showModal();
    return () => {
      dialog?.close();
      queueMicrotask(() => { if (trigger?.isConnected) trigger.focus(); });
    };
  }, [open, ref]);
  return <dialog {...props} ref={ref} onCancel={event => {
    props.onCancel?.(event);
    if (event.defaultPrevented) return;
    event.preventDefault(); event.stopPropagation();
    if (!busy) onDismiss();
  }} onClick={event => {
    props.onClick?.(event);
    if (event.defaultPrevented || busy || !dismissOnBackdrop || event.target !== event.currentTarget) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (dismissOnBackdrop === "surface" || event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onDismiss();
  }}>{children}</dialog>;
}
