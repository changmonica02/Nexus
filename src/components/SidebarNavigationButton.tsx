"use client";
import { useEffect, useRef, type ButtonHTMLAttributes } from "react";
/** Delaying the filter avoids running navigation side effects before a double tap. */
export default function SidebarNavigationButton({
  onFilter,
  onOpen,
  immediate = false,
  ...props
}: Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "onClick" | "onDoubleClick"
> & { onFilter: () => void; onOpen: () => void; immediate?: boolean }) {
  const click = useRef<ReturnType<typeof setTimeout> | undefined>(undefined),
    hold = useRef<ReturnType<typeof setTimeout> | undefined>(undefined),
    held = useRef(false);
  const origin = useRef({ x: 0, y: 0 });
  const clear = () => {
    clearTimeout(click.current);
    clearTimeout(hold.current);
  };
  useEffect(
    () => () => {
      clearTimeout(click.current);
      clearTimeout(hold.current);
    },
    [],
  );
  const open = () => {
    if (held.current) return;
    clear();
    held.current = true;
    onOpen();
  };
  return (
    <button
      {...props}
      type="button"
      onClick={(e) => {
        if (held.current) {
          held.current = false;
          return;
        }
        clearTimeout(click.current);
        if (immediate) onFilter();
        else if (e.detail < 2) click.current = setTimeout(onFilter, 300);
      }}
      onDoubleClick={open}
      onKeyDown={(e) => {
        props.onKeyDown?.(e);
        if (e.key === "Enter") {
          e.preventDefault();
          held.current = false;
          open();
        }
      }}
      onPointerDown={(e) => {
        held.current = false;
        origin.current = { x: e.clientX, y: e.clientY };
        if (e.pointerType === "touch" || e.pointerType === "pen")
          hold.current = setTimeout(open, 600);
      }}
      onPointerMove={(e) => {
        if (
          Math.hypot(
            e.clientX - origin.current.x,
            e.clientY - origin.current.y,
          ) > 10
        )
          clearTimeout(hold.current);
      }}
      onPointerUp={() => clearTimeout(hold.current)}
      onPointerCancel={clear}
      onContextMenu={(e) => {
        e.preventDefault();
        open();
      }}
    />
  );
}
