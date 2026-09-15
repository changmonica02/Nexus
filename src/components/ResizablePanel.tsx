"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export default function ResizablePanel({ side, defaultWidth, minWidth, maxWidth, collapsedWidth = 56, isCollapsed, overlay = false, children }: {
  side: "left" | "right"; defaultWidth: number; minWidth: number; maxWidth: number; collapsedWidth?: number; isCollapsed: boolean; overlay?: boolean; children: React.ReactNode;
}) {
  const [width, setWidth] = useState(defaultWidth);
  const [isDragging, setIsDragging] = useState(false);
  const dragStateRef = useRef<{ startX: number; startWidth: number } | null>(null);

  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    if (isCollapsed) return;
    event.preventDefault();
    dragStateRef.current = { startX: event.clientX, startWidth: width };
    setIsDragging(true);
  }, [width, isCollapsed]);

  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (event: MouseEvent) => {
      if (!dragStateRef.current) return;
      const delta = event.clientX - dragStateRef.current.startX;
      const directionalDelta = side === "left" ? delta : -delta;
      setWidth(Math.min(maxWidth, Math.max(minWidth, dragStateRef.current.startWidth + directionalDelta)));
    };
    const handleMouseUp = () => { setIsDragging(false); dragStateRef.current = null; };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => { document.removeEventListener("mousemove", handleMouseMove); document.removeEventListener("mouseup", handleMouseUp); };
  }, [isDragging, side, minWidth, maxWidth]);

  const effectiveWidth = isCollapsed ? collapsedWidth : width;

  return (
    <div data-side-panel={overlay ? "true" : undefined} className={`${overlay ? `fixed inset-y-0 ${side === "left" ? "left-0" : "right-0"} z-50 shadow-2xl` : "relative shrink-0"} flex transition-[width] duration-150 ${isCollapsed && collapsedWidth === 0 ? "overflow-hidden" : ""}`} style={{ width: `${effectiveWidth}px`, minWidth: `${effectiveWidth}px` }}>
      {!isCollapsed && side === "right" && (
        <div onMouseDown={handleMouseDown} className="absolute left-0 top-0 bottom-0 w-1.5 -translate-x-0.5 cursor-col-resize z-10 hover:bg-blue-400/40 transition-colors"
          style={{ backgroundColor: isDragging ? "rgba(37, 99, 235, 0.35)" : "transparent" }} />
      )}
      <div className="flex-1 min-w-0 min-h-0 flex flex-col">{children}</div>
      {!isCollapsed && side === "left" && (
        <div onMouseDown={handleMouseDown} className="absolute right-0 top-0 bottom-0 w-1.5 translate-x-0.5 cursor-col-resize z-10 hover:bg-blue-400/40 transition-colors"
          style={{ backgroundColor: isDragging ? "rgba(37, 99, 235, 0.35)" : "transparent" }} />
      )}
    </div>
  );
}
