"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { PageFormat } from "../lib/types";

type Props = {
  format: PageFormat;
  children: ReactNode;
  onAddPage?: () => void;
};

const PX_PER_MM = 3.779527559;
const A4_HEIGHT_MM = 297;
const A4_PAD_V_MM = 20;
const A4_PAD_H_MM = 18;
const A4_PAGE_HEIGHT_PX = A4_HEIGHT_MM * PX_PER_MM; // ~1122
const A4_PAD_V_PX = A4_PAD_V_MM * PX_PER_MM;
const A4_PAD_H_PX = A4_PAD_H_MM * PX_PER_MM;
const SLIDE_169_HEIGHT = 540;
const SLIDE_43_HEIGHT = 600;

export default function PageFormatView({ format, children }: Props) {
  const fmt = format || "flow";
  const isPaged = fmt !== "flow";
  const contentRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState(1);

  const getMetrics = () => {
    if (fmt === "a4") return { pageH: A4_PAGE_HEIGHT_PX, padV: A4_PAD_V_PX, padH: A4_PAD_H_PX, bg: "#f5f5f4", width: "210mm", pad: `${A4_PAD_V_MM}mm ${A4_PAD_H_MM}mm` };
    if (fmt === "16:9") return { pageH: SLIDE_169_HEIGHT, padV: 32, padH: 40, bg: "#0a0a0a", width: "960px", pad: "32px 40px" };
    if (fmt === "4:3") return { pageH: SLIDE_43_HEIGHT, padV: 32, padH: 40, bg: "#0a0a0a", width: "800px", pad: "32px 40px" };
    return { pageH: 900, padV: 24, padH: 24, bg: "#f5f5f4", width: "100%", pad: "24px" };
  };

  const metrics = getMetrics();
  const gap = 24;

  useEffect(() => {
    if (!isPaged) return;
    const el = contentRef.current;
    if (!el) return;
    const update = () => {
      const h = el.scrollHeight;
      const needed = Math.max(1, Math.ceil((h + 40) / metrics.pageH));
      setPages((prev) => (prev !== needed ? Math.min(needed, 50) : prev));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    const mo = new MutationObserver(update);
    mo.observe(el, { childList: true, subtree: true, characterData: true });
    return () => {
      ro.disconnect();
      mo.disconnect();
    };
  }, [isPaged, metrics.pageH, children]);

  // Fix 貼邊：確保區塊不在頁面邊緣，動態加入 margin
  useEffect(() => {
    if (!isPaged) return;
    const el = contentRef.current;
    if (!el) return;
    const pro = el.querySelector(".ProseMirror") as HTMLElement;
    if (!pro) return;

    const fixEdges = () => {
      const blocks = pro.querySelectorAll(":scope > *") as NodeListOf<HTMLElement>;
      blocks.forEach((block) => {
        // Reset previous adjustments to measure natural position
        block.style.marginTop = "";
        block.style.marginBottom = "";
      });

      // Second pass: check position relative to pages
      blocks.forEach((block) => {
        const offsetTop = block.offsetTop;
        const offsetInPage = offsetTop % (metrics.pageH + gap);
        // If block starts too close to page top edge (within 5px), push down by padV
        if (offsetInPage > 0 && offsetInPage < 10) {
          block.style.marginTop = `${metrics.padV}px`;
        }
        // If block ends too close to page bottom edge, push next block to next page by adding bottom margin
        const blockBottom = offsetTop + block.offsetHeight;
        const bottomInPage = blockBottom % (metrics.pageH + gap);
        const pageBottomThreshold = metrics.pageH - metrics.padV;
        if (bottomInPage > pageBottomThreshold && bottomInPage < metrics.pageH) {
          const needed = metrics.pageH - bottomInPage + metrics.padV + gap;
          block.style.marginBottom = `${needed}px`;
        }
        // Prevent horizontal overflow outside page
        if (block.scrollWidth > block.clientWidth) {
          block.style.maxWidth = "100%";
          block.style.overflowWrap = "break-word";
          block.style.wordBreak = "break-word";
        }
      });
    };

    // Use timeout to let ProseMirror paint
    const timeout = setTimeout(fixEdges, 100);
    const ro = new ResizeObserver(fixEdges);
    ro.observe(pro);
    return () => {
      clearTimeout(timeout);
      ro.disconnect();
    };
  }, [isPaged, pages, metrics.pageH, metrics.padV, gap, children]);

  if (fmt === "flow") {
    return <div className="nexus-format-flow flex-1 overflow-y-auto">{children}</div>;
  }

  const totalStackHeight = pages * (metrics.pageH + gap);

  return (
    <div className="flex-1 overflow-y-auto relative flex flex-col items-center" style={{ background: metrics.bg, padding: "24px" }}>
      <div
        className="relative"
        style={{
          width: fmt === "a4" ? "210mm" : fmt === "16:9" ? "960px" : fmt === "4:3" ? "800px" : "100%",
          maxWidth: "100%",
          minHeight: `${totalStackHeight}px`,
        }}
      >
        {/* Background pages */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          {Array.from({ length: pages }).map((_, i) => (
            <div
              key={i}
              className={fmt === "a4" ? "nexus-format-a4-page" : fmt === "16:9" ? "nexus-format-169-page" : fmt === "4:3" ? "nexus-format-43-page" : "nexus-format-flow"}
              style={{
                position: "absolute",
                top: `${i * (metrics.pageH + gap)}px`,
                left: 0,
                right: 0,
                height: `${metrics.pageH}px`,
                background: "white",
                boxShadow: fmt === "a4" ? "0 1px 3px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.08)" : "0 8px 32px rgba(0,0,0,0.4)",
                color: "#1a1a1a",
                overflow: "hidden",
              }}
            >
              <div className="absolute top-2 right-3 text-[9px] opacity-20 select-none">第 {i + 1} 頁 / 共 {pages} 頁</div>
            </div>
          ))}
        </div>

        {/* Content */}
        <div
          ref={contentRef}
          className="relative z-10 nexus-paged-content"
          style={{
            width: "100%",
            minHeight: `${metrics.pageH}px`,
            padding: metrics.pad,
            color: "#1a1a1a",
            background: "transparent",
            boxSizing: "border-box",
          }}
        >
          {children}
        </div>
      </div>

    </div>
  );
}

