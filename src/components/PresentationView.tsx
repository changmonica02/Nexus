"use client";
import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import type { Page, Slide, PresentationData, PresentationBlock, SlideLayout } from "../lib/types";
import { createSlide } from "../lib/presentation";
import { useLanguage } from "../lib/LanguageContext";
import ChartTypeMenu from "./ChartTypeMenu";
import ChartRenderer from "./ChartRenderer";

const LAYOUTS: { id: SlideLayout; label: string; icon: string }[] = [
  { id: "title", label: "標題", icon: "🔖" },
  { id: "title_content", label: "標題+內容", icon: "📄" },
  { id: "two_column", label: "兩欄", icon: "⬌" },
  { id: "chart", label: "圖表", icon: "📊" },
  { id: "canvas", label: "自由畫布", icon: "🎨" },
  { id: "toc", label: "目錄", icon: "📑" },
  { id: "quote", label: "引言", icon: "❝" },
];

function genId() { return `blk_${Math.random().toString(36).slice(2, 9)}`; }

const MIN_W = 5;
const MIN_H = 4;
type HandleDir = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

interface GuideLine {
  type: "vertical" | "horizontal";
  pos: number;
}

type Interaction =
  | {
      kind: "drag";
      ids: string[];
      startMX: number;
      startMY: number;
      cw: number;
      ch: number;
      groupOrigX: number;
      groupOrigY: number;
      groupW: number;
      groupH: number;
      orig: Record<string, { x: number; y: number; w: number; h?: number }>;
    }
  | { kind: "resize"; id: string; handle: HandleDir; startMX: number; startMY: number; orig: PresentationBlock; cw: number; ch: number }
  | { kind: "rotate"; id: string; cx: number; cy: number; origRot: number };

type AlignType = "left" | "right" | "top" | "bottom" | "hcenter" | "vcenter" | "hdistribute" | "vdistribute";

function rotateVec(x: number, y: number, deg: number) {
  const r = (deg * Math.PI) / 180;
  return { x: x * Math.cos(r) - y * Math.sin(r), y: x * Math.sin(r) + y * Math.cos(r) };
}

function BlockContent({ block, thumb }: { block: PresentationBlock; thumb?: boolean }) {
  if (block.type === "text") {
    const empty = !(block.text && block.text.trim());
    if (thumb) return <div style={{ fontSize: 7, opacity: empty ? 0.35 : 1, color: block.style?.color || "inherit", whiteSpace: "pre-wrap", overflow: "hidden" }}>{empty ? "文字方塊" : block.text!.slice(0, 30)}</div>;
    return empty
      ? <div className="pointer-events-none select-none text-zinc-400 dark:text-zinc-500 italic" style={{ opacity: 0.45 }}>文字方塊</div>
      : <div className="whitespace-pre-wrap break-words" style={{ fontWeight: block.style?.bold ? 700 : 400, color: block.style?.color || "inherit", textAlign: block.style?.textAlign }}>{block.text}</div>;
  }
  if (block.type === "chart" && block.chart) {
    if (thumb) return <div className="w-full h-full flex items-center justify-center" style={{ background: "#eef2ff", borderRadius: 3, fontSize: 8 }}>📊</div>;
    return <div className="w-full h-full overflow-hidden"><ChartRenderer chart={block.chart} width={200} height={120} /></div>;
  }
  if (block.type === "shape") return <div className="w-full h-full" style={{ background: block.style?.background || "#e0e7ff", borderRadius: 3 }} />;
  if (block.type === "diagram") {
    if (thumb) return <div className="w-full h-full" style={{ background: "#f4f4f5", borderRadius: 3 }} />;
    return <div className="text-[10px] font-mono p-1 bg-zinc-100 rounded">{block.diagramCode || "Mermaid"}</div>;
  }
  return null;
}

function SlideThumbnail({ slide, theme, active, idx, total, onClick, onContextMenu }: { slide: Slide; theme: string; active: boolean; idx: number; total: number; onClick: () => void; onContextMenu: (e: React.MouseEvent) => void }) {
  const blocks = [...(slide.blocks || [])].sort((a, b) => a.z - b.z);
  return (
    <div onClick={onClick} onContextMenu={onContextMenu} className={`group relative rounded-md border cursor-pointer transition-all ${active ? "border-blue-500 shadow-md" : "border-transparent hover:border-zinc-300"}`} style={{ background: theme === "dark" ? "#1e1e1e" : "white" }} title={`第 ${idx + 1} 張（右鍵更多操作）`}>
      <div className="absolute top-0.5 left-1 text-[8px] opacity-50 z-10">{idx + 1}</div>
      <div className="relative w-full overflow-hidden" style={{ aspectRatio: "16 / 9" }}>
        {blocks.map((b) => (
          <div key={b.id} data-thumb-pb={b.id} style={{ position: "absolute", left: `${b.x}%`, top: `${b.y}%`, width: `${b.w}%`, height: b.h ? `${b.h}%` : "auto", transform: `rotate(${b.rotation || 0}deg)`, padding: 1, overflow: "hidden", fontSize: b.style?.fontSize ? Math.max(5, b.style.fontSize * 0.32) : 7, color: theme === "dark" ? "#ddd" : "inherit", textAlign: b.style?.textAlign }}>
            <BlockContent block={b} thumb />
          </div>
        ))}
        {blocks.length === 0 && <div className="absolute inset-0 flex items-center justify-center" style={{ fontSize: 7, opacity: 0.3 }}>空白</div>}
      </div>
    </div>
  );
}

export default function PresentationView({
  page,
  onTitleChange,
  onUpdatePresentation,
}: {
  page: Page;
  onTitleChange: (title: string) => void;
  onUpdatePresentation: (data: PresentationData) => void;
}) {
  const data = (page.presentation_data || { theme: "minimal", slides: [] }) as PresentationData;
  const slides = data.slides || [];
  const [activeSlideId, setActiveSlideId] = useState<string>(slides[0]?.id || "");
  const activeSlide = useMemo(() => slides.find((s) => s.id === activeSlideId) || slides[0] || null, [slides, activeSlideId]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [moreMenuFor, setMoreMenuFor] = useState<string | null>(null);
  const [chartEditOpen, setChartEditOpen] = useState(false);
  const [chartTab, setChartTab] = useState<"data" | "type" | "style">("data");
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [textMenuOpen, setTextMenuOpen] = useState(false);
  const [layoutMenuOpen, setLayoutMenuOpen] = useState(false);
  const [chartMenuOpen, setChartMenuOpen] = useState(false);
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);
  const [activeGuides, setActiveGuides] = useState<GuideLine[]>([]);
  const [slideCtx, setSlideCtx] = useState<{ x: number; y: number; slideId: string } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const slideCtxRef = useRef<HTMLDivElement>(null);
  const textMenuRef = useRef<HTMLDivElement>(null);
  const chartMenuRef = useRef<HTMLDivElement>(null);
  const layoutMenuRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  const updateSlides = useCallback((newSlides: Slide[]) => { onUpdatePresentation({ ...data, slides: newSlides }); }, [data, onUpdatePresentation]);
  const updateActiveSlide = useCallback((patch: Partial<Slide>) => {
    if (!activeSlide) return;
    updateSlides(slides.map((s) => (s.id === activeSlide.id ? { ...s, ...patch } : s)));
  }, [activeSlide, slides, updateSlides]);
  const updateBlock = useCallback((blockId: string, patch: Partial<PresentationBlock>) => {
    if (!activeSlide) return;
    updateActiveSlide({ blocks: (activeSlide.blocks || []).map((b) => (b.id === blockId ? { ...b, ...patch } : b)) });
  }, [activeSlide, updateActiveSlide]);
  const updateBlocks = useCallback((ids: string[], fn: (b: PresentationBlock) => PresentationBlock) => {
    if (!activeSlide) return;
    const set = new Set(ids);
    updateActiveSlide({ blocks: (activeSlide.blocks || []).map((b) => (set.has(b.id) ? fn(b) : b)) });
  }, [activeSlide, updateActiveSlide]);

  // ---- 投影片操作 ----
  const handleAddSlide = (layout: SlideLayout = "canvas") => {
    const newSlide = createSlide(layout);
    const idx = slides.findIndex((s) => s.id === activeSlideId);
    const newSlides = [...slides];
    newSlides.splice(idx + 1, 0, newSlide);
    updateSlides(newSlides);
    setActiveSlideId(newSlide.id);
    setSelectedIds([]);
  };
  const handleDuplicateSlide = (slideId?: string) => {
    const target = slides.find((s) => s.id === (slideId || activeSlideId));
    if (!target) return;
    const copy: Slide = { ...target, id: `slide_${genId()}`, blocks: (target.blocks || []).map((b) => ({ ...b, id: genId() })) };
    const idx = slides.findIndex((s) => s.id === target.id);
    const newSlides = [...slides];
    newSlides.splice(idx + 1, 0, copy);
    updateSlides(newSlides);
    setActiveSlideId(copy.id);
  };
  const handleDeleteSlide = (slideId?: string) => {
    const targetId = slideId || activeSlideId;
    if (slides.length <= 1) return;
    const idx = slides.findIndex((s) => s.id === targetId);
    const newSlides = slides.filter((s) => s.id !== targetId);
    updateSlides(newSlides);
    if (activeSlideId === targetId) setActiveSlideId(newSlides[Math.max(0, idx - 1)].id);
    setSelectedIds([]);
  };

  // ---- 物件操作 ----
  const addBlock = (opts: Partial<PresentationBlock> & { type: PresentationBlock["type"] }) => {
    if (!activeSlide) return;
    const nb: PresentationBlock = { id: genId(), x: 20, y: 25, w: 50, h: 16, z: (activeSlide.blocks?.length || 0) + 10, ...opts } as PresentationBlock;
    updateActiveSlide({ blocks: [...(activeSlide.blocks || []), nb] });
    setSelectedIds([nb.id]);
  };
  const handleAddChart = () => {
    addBlock({ type: "chart", x: 15, y: 20, w: 50, h: 45, chart: { type: "bar", variant: "single", orientation: "vertical", data: [{ label: "A", value: 30 }, { label: "B", value: 50 }] } });
  };
  const handleDeleteBlocks = (ids: string[]) => {
    if (!activeSlide) return;
    const set = new Set(ids);
    updateActiveSlide({ blocks: (activeSlide.blocks || []).filter((b) => !set.has(b.id)) });
    setSelectedIds([]); setEditingBlockId(null); setChartEditOpen(false);
  };
  const handleDuplicateBlock = (id: string) => {
    if (!activeSlide) return;
    const src = (activeSlide.blocks || []).find((b) => b.id === id);
    if (!src) return;
    const copy: PresentationBlock = { ...src, id: genId(), x: Math.min(src.x + 4, 90), y: Math.min(src.y + 4, 90), z: (activeSlide.blocks?.length || 0) + 20 };
    updateActiveSlide({ blocks: [...(activeSlide.blocks || []), copy] });
    setSelectedIds([copy.id]);
  };
  const handleZOrder = (id: string, dir: "front" | "back") => {
    if (!activeSlide) return;
    const blocks = [...(activeSlide.blocks || [])].sort((a, b) => a.z - b.z);
    const idx = blocks.findIndex((b) => b.id === id);
    if (idx === -1) return;
    const [target] = blocks.splice(idx, 1);
    if (dir === "front") blocks.push(target); else blocks.unshift(target);
    // 歸一化：重新分配連續 z 值（間距 10），避免反覆操作導致數值無限增長
    updateActiveSlide({ blocks: blocks.map((b, i) => ({ ...b, z: (i + 1) * 10 })) });
  };

  // ---- 對齊 ----
  const handleAlign = (type: AlignType) => {
    if (!activeSlide || selectedIds.length < 2) return;
    const sel = (activeSlide.blocks || []).filter((b) => selectedIds.includes(b.id));
    if (sel.length < 2) return;
    const patch: Record<string, Partial<PresentationBlock>> = {};
    if (type === "left") { const m = Math.min(...sel.map((b) => b.x)); sel.forEach((b) => patch[b.id] = { x: m }); }
    else if (type === "right") { const m = Math.max(...sel.map((b) => b.x + b.w)); sel.forEach((b) => patch[b.id] = { x: m - b.w }); }
    else if (type === "top") { const m = Math.min(...sel.map((b) => b.y)); sel.forEach((b) => patch[b.id] = { y: m }); }
    else if (type === "bottom") { const m = Math.max(...sel.map((b) => b.y + (b.h || 0))); sel.forEach((b) => patch[b.id] = { y: m - (b.h || 0) }); }
    else if (type === "hcenter") { const m = sel.reduce((s, b) => s + b.x + b.w / 2, 0) / sel.length; sel.forEach((b) => patch[b.id] = { x: m - b.w / 2 }); }
    else if (type === "vcenter") { const m = sel.reduce((s, b) => s + b.y + (b.h || 0) / 2, 0) / sel.length; sel.forEach((b) => patch[b.id] = { y: m - (b.h || 0) / 2 }); }
    else if (type === "hdistribute" || type === "vdistribute") {
      if (sel.length < 3) return;
      const sorted = [...sel].sort((a, b) => (type === "hdistribute" ? a.x - b.x : a.y - b.y));
      const first = sorted[0], last = sorted[sorted.length - 1];
      const span = type === "hdistribute" ? last.x - first.x : last.y - first.y;
      const step = sorted.length > 1 ? span / (sorted.length - 1) : 0;
      sorted.forEach((b, i) => { patch[b.id] = type === "hdistribute" ? { x: first.x + step * i } : { y: first.y + step * i }; });
    }
    updateBlocks(selectedIds, (b) => ({ ...b, ...(patch[b.id] || {}) }));
  };

  // ---- 互動（Pointer Events + setPointerCapture：拖曳時所有 pointermove 直接送至被捕獲元素，最可靠）----
  const ptrRef = useRef<any>(null);
  const handlePointerMove = (e: React.PointerEvent) => {
    const it = ptrRef.current;
    if (!it) return;
    if (it.kind === "drag") {
      const dxPct = ((e.clientX - it.startMX) / it.cw) * 100;
      const dyPct = ((e.clientY - it.startMY) / it.ch) * 100;

      const rawGroupX = it.groupOrigX + dxPct;
      const rawGroupY = it.groupOrigY + dyPct;

      let snappedGroupX = rawGroupX;
      let snappedGroupY = rawGroupY;
      const newGuides: GuideLine[] = [];

      if (!e.altKey && activeSlide) {
        const snapThresholdX = (8 / it.cw) * 100;
        const snapThresholdY = (8 / it.ch) * 100;

        // Collect snap targets: Canvas centers and other blocks' edges and centers
        const otherBlocks = (activeSlide.blocks || []).filter((b) => !it.ids.includes(b.id));

        const xTargets: number[] = [50];
        const yTargets: number[] = [50];

        for (const ob of otherBlocks) {
          const obH = ob.h || MIN_H;
          xTargets.push(ob.x, ob.x + ob.w / 2, ob.x + ob.w);
          yTargets.push(ob.y, ob.y + obH / 2, ob.y + obH);
        }

        // X-axis snapping
        const xCandidates = [
          { pos: rawGroupX, offsetFromLeft: 0 },
          { pos: rawGroupX + it.groupW / 2, offsetFromLeft: it.groupW / 2 },
          { pos: rawGroupX + it.groupW, offsetFromLeft: it.groupW },
        ];

        let minDiffX = snapThresholdX;
        let bestSnapX: { snappedGroupLeft: number; guidePos: number } | null = null;

        for (const cand of xCandidates) {
          for (const target of xTargets) {
            const diff = Math.abs(cand.pos - target);
            if (diff < minDiffX) {
              minDiffX = diff;
              bestSnapX = {
                snappedGroupLeft: target - cand.offsetFromLeft,
                guidePos: target,
              };
            }
          }
        }

        if (bestSnapX) {
          snappedGroupX = bestSnapX.snappedGroupLeft;
          newGuides.push({ type: "vertical", pos: bestSnapX.guidePos });
        }

        // Y-axis snapping
        const yCandidates = [
          { pos: rawGroupY, offsetFromTop: 0 },
          { pos: rawGroupY + it.groupH / 2, offsetFromTop: it.groupH / 2 },
          { pos: rawGroupY + it.groupH, offsetFromTop: it.groupH },
        ];

        let minDiffY = snapThresholdY;
        let bestSnapY: { snappedGroupTop: number; guidePos: number } | null = null;

        for (const cand of yCandidates) {
          for (const target of yTargets) {
            const diff = Math.abs(cand.pos - target);
            if (diff < minDiffY) {
              minDiffY = diff;
              bestSnapY = {
                snappedGroupTop: target - cand.offsetFromTop,
                guidePos: target,
              };
            }
          }
        }

        if (bestSnapY) {
          snappedGroupY = bestSnapY.snappedGroupTop;
          newGuides.push({ type: "horizontal", pos: bestSnapY.guidePos });
        }
      }

      setActiveGuides(newGuides);

      let finalDx = snappedGroupX - it.groupOrigX;
      let finalDy = snappedGroupY - it.groupOrigY;

      // Keep within canvas bounds [0, 100]
      finalDx = Math.max(-it.groupOrigX, Math.min(100 - (it.groupOrigX + it.groupW), finalDx));
      finalDy = Math.max(-it.groupOrigY, Math.min(100 - (it.groupOrigY + it.groupH), finalDy));

      const patch: Record<string, Partial<PresentationBlock>> = {};
      for (const id of it.ids) {
        const o = it.orig[id];
        if (!o) continue;
        patch[id] = {
          x: o.x + finalDx,
          y: o.y + finalDy,
        };
      }
      updateBlocks(it.ids, (b) => ({ ...b, ...(patch[b.id] || {}) }));
    } else if (it.kind === "resize") {
      const orig = it.orig;
      const rot = orig.rotation || 0;
      let dxPx = e.clientX - it.startMX;
      let dyPx = e.clientY - it.startMY;
      if (rot) {
        const lv = rotateVec(dxPx, dyPx, -rot);
        dxPx = lv.x;
        dyPx = lv.y;
      }
      const dxPct = (dxPx / it.cw) * 100;
      const dyPct = (dyPx / it.ch) * 100;
      const origW = orig.w;
      const origH = orig.h || MIN_H;
      const hd = it.handle;

      let newW = origW;
      let newH = origH;
      let localCenterDx = 0;
      let localCenterDy = 0;

      if (hd.includes("e")) {
        newW = Math.max(MIN_W, origW + dxPct);
        localCenterDx = (newW - origW) / 2;
      } else if (hd.includes("w")) {
        newW = Math.max(MIN_W, origW - dxPct);
        localCenterDx = -(newW - origW) / 2;
      }

      if (hd.includes("s")) {
        newH = Math.max(MIN_H, origH + dyPct);
        localCenterDy = (newH - origH) / 2;
      } else if (hd.includes("n")) {
        newH = Math.max(MIN_H, origH - dyPct);
        localCenterDy = -(newH - origH) / 2;
      }

      const origCenterX = orig.x + origW / 2;
      const origCenterY = orig.y + origH / 2;

      const worldCenterShift = rot ? rotateVec(localCenterDx, localCenterDy, rot) : { x: localCenterDx, y: localCenterDy };

      const newCenterX = origCenterX + worldCenterShift.x;
      const newCenterY = origCenterY + worldCenterShift.y;

      let newX = newCenterX - newW / 2;
      let newY = newCenterY - newH / 2;

      newX = Math.max(0, Math.min(100 - newW, newX));
      newY = Math.max(0, Math.min(100 - newH, newY));

      updateBlock(orig.id, { x: newX, y: newY, w: newW, h: newH });
    } else if (it.kind === "rotate") {
      let angle = (Math.atan2(e.clientY - it.cy, e.clientX - it.cx) * 180) / Math.PI + 90;
      if (e.shiftKey) angle = Math.round(angle / 15) * 15;
      if (angle > 180) angle -= 360; if (angle < -180) angle += 360;
      updateBlock(it.id, { rotation: angle });
    }
  };
  const handlePointerUp = (e: React.PointerEvent) => {
    ptrRef.current = null;
    setActiveGuides([]);
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (editingBlockId) return;
      if ((e.key === "Delete" || e.key === "Backspace") && selectedIds.length > 0) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
        e.preventDefault(); handleDeleteBlocks(selectedIds);
      }
      if (e.key === "Escape") {
        setSelectedIds([]);
        setEditingBlockId(null);
        setChartEditOpen(false);
        setSlideCtx(null);
        setTextMenuOpen(false);
        setChartMenuOpen(false);
        setLayoutMenuOpen(false);
        setMoreMenuFor(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedIds, editingBlockId]);

  // 點擊周圍空白處自動關閉所有下拉選單與右鍵選單
  useEffect(() => {
    const handleDocumentMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (slideCtx && slideCtxRef.current && !slideCtxRef.current.contains(target)) {
        setSlideCtx(null);
      }
      if (textMenuOpen && textMenuRef.current && !textMenuRef.current.contains(target)) {
        setTextMenuOpen(false);
      }
      if (chartMenuOpen && chartMenuRef.current && !chartMenuRef.current.contains(target)) {
        setChartMenuOpen(false);
      }
      if (layoutMenuOpen && layoutMenuRef.current && !layoutMenuRef.current.contains(target)) {
        setLayoutMenuOpen(false);
      }
      if (moreMenuFor && moreMenuRef.current && !moreMenuRef.current.contains(target)) {
        setMoreMenuFor(null);
      }
    };
    document.addEventListener("mousedown", handleDocumentMouseDown);
    return () => document.removeEventListener("mousedown", handleDocumentMouseDown);
  }, [slideCtx, textMenuOpen, chartMenuOpen, layoutMenuOpen, moreMenuFor]);

  if (!page.presentation_data) return <div className="flex-1 flex items-center justify-center">簡報資料載入中...</div>;

  const sortedBlocks = [...(activeSlide?.blocks || [])].sort((a, b) => a.z - b.z);
  const selectedBlocks = (activeSlide?.blocks || []).filter((b) => selectedIds.includes(b.id));
  const singleSelected = selectedIds.length === 1 ? selectedBlocks[0] : null;
  const isDark = data.theme === "dark";

  let floatBarStyle: React.CSSProperties | null = null;
  if (selectedBlocks.length > 0) {
    const minX = Math.min(...selectedBlocks.map((b) => b.x));
    const maxX = Math.max(...selectedBlocks.map((b) => b.x + b.w));
    const minY = Math.min(...selectedBlocks.map((b) => b.y));
    floatBarStyle = { left: `${(minX + maxX) / 2}%`, top: `${Math.max(0, minY - 6)}%`, transform: "translate(-50%, -100%)" };
  }

  const HANDLE_POS: Record<HandleDir, React.CSSProperties> = {
    nw: { left: 0, top: 0, cursor: "nwse-resize" }, n: { left: "50%", top: 0, cursor: "ns-resize" }, ne: { left: "100%", top: 0, cursor: "nesw-resize" },
    e: { left: "100%", top: "50%", cursor: "ew-resize" }, se: { left: "100%", top: "100%", cursor: "nwse-resize" }, s: { left: "50%", top: "100%", cursor: "ns-resize" },
    sw: { left: 0, top: "100%", cursor: "nesw-resize" }, w: { left: 0, top: "50%", cursor: "ew-resize" },
  };
  const selBoxStyle = (b: PresentationBlock): React.CSSProperties => ({
    position: "absolute",
    left: `${b.x}%`, top: `${b.y}%`, width: `${b.w}%`, height: b.h ? `${b.h}%` : "auto",
    transform: `rotate(${b.rotation || 0}deg)`, transformOrigin: "center center",
  });

  return (
    <main className="flex flex-col flex-1 overflow-hidden" style={{ backgroundColor: "var(--color-editor-bg)" }}>
      {/* ===== 全寬上欄（加高） ===== */}
      <div className="shrink-0 border-b" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-sidebar-bg)" }}>
        <div className="flex items-center gap-2 px-4 py-6 flex-wrap">
          <input value={page.title} onChange={(e) => onTitleChange(e.target.value)} placeholder="簡報標題" className="bg-transparent font-semibold outline-none text-sm min-w-[120px]" />
          <span className="text-[10px] opacity-50">{slides.length} 張</span>
          <div className="h-5 w-px bg-zinc-300 mx-1" />
          {/* ＋ 文字（下拉選單） */}
          <div ref={textMenuRef} className="relative">
            <button onClick={() => { setTextMenuOpen(v => !v); setLayoutMenuOpen(false); setChartMenuOpen(false); }} className="rounded px-3 py-1.5 text-xs bg-zinc-800 text-white hover:bg-zinc-700">＋ 文字 ▾</button>
            {textMenuOpen && (
              <div className="absolute top-full left-0 mt-1 rounded-lg shadow-xl py-1 z-[10004] min-w-[160px]" style={{ backgroundColor: "var(--color-bg)", border: "1px solid var(--color-border)" }}>
                {([
                  { label: "標題", style: { fontSize: 32, bold: true }, text: "標題" },
                  { label: "標題 1", style: { fontSize: 28, bold: true }, text: "標題 1" },
                  { label: "標題 2", style: { fontSize: 24, bold: true }, text: "標題 2" },
                  { label: "標題 3", style: { fontSize: 20, bold: true }, text: "標題 3" },
                  { label: "標題 4", style: { fontSize: 18, bold: true }, text: "標題 4" },
                  { label: "一般文字", style: { fontSize: 16 }, text: "" },
                  { label: "區塊引述", style: { fontSize: 16 }, text: "引述內容" },
                  { sep: true },
                  { label: "📝 備註方塊", callout: "note", style: { fontSize: 16, background: "#f0f9ff" }, text: "備註內容" },
                  { label: "💡 資訊方塊", callout: "info", style: { fontSize: 16, background: "#f0f9ff" }, text: "資訊內容" },
                  { label: "⚠️ 警告方塊", callout: "warning", style: { fontSize: 16, background: "#fefce8" }, text: "警告內容" },
                  { label: "🔴 錯誤方塊", callout: "danger", style: { fontSize: 16, background: "#fef2f2" }, text: "錯誤內容" },
                  { label: "🟢 成功方塊", callout: "success", style: { fontSize: 16, background: "#f0fdf4" }, text: "成功內容" },
                  { label: "❓ 問題方塊", callout: "question", style: { fontSize: 16, background: "#faf5ff" }, text: "問題內容" },
                  { sep: true },
                  { label: "清单 / 項目符號", style: { fontSize: 16 }, text: "• 項目一\n• 項目二\n• 項目三" },
                  { label: "編號清單", style: { fontSize: 16 }, text: "1. 第一項\n2. 第二項\n3. 第三項" },
                  { label: "代辦清單", style: { fontSize: 16 }, text: "☐ 待辦事項\n☑ 完成事項" },
                ] as any[]).map((item, i) => item.sep
                  ? <div key={i} className="my-1 border-t" style={{ borderColor: "var(--color-border)" }} />
                  : <button key={i} onClick={() => { addBlock({ type: "text", w: 55, h: item.callout ? 18 : 14, text: item.text, style: item.style }); setTextMenuOpen(false); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-zinc-100">{item.label}</button>
                )}
              </div>
            )}
          </div>
          <div ref={chartMenuRef} className="relative">
            <button onClick={() => { setChartMenuOpen(v => !v); setTextMenuOpen(false); setLayoutMenuOpen(false); }} className="rounded px-3 py-1.5 text-xs border hover:bg-zinc-100">📊 圖表 ▾</button>
            {chartMenuOpen && (
              <div className="absolute top-full left-0 mt-1 rounded-lg shadow-xl py-1 z-[10004] min-w-[140px]" style={{ backgroundColor: "var(--color-bg)", border: "1px solid var(--color-border)" }}>
                {([
                  { label: "📊 長條圖", type: "bar" },
                  { label: "📈 折線圖", type: "line" },
                  { label: "🥧 圓餅圖", type: "pie" },
                  { label: "🍩 環圖", type: "donut" },
                  { label: "📅 甘特圖", type: "gantt" },
                  { label: "🔺 金字塔", type: "pyramid" },
                  { label: "🕸️ 雷達圖", type: "radar" },
                ] as { label: string; type: string }[]).map((ct) => (
                  <button key={ct.type} onClick={() => { addBlock({ type: "chart", x: 15, y: 15, w: 55, h: 50, chart: { type: ct.type as any, variant: "single", orientation: "vertical", data: [{ label: "A", value: 30 }, { label: "B", value: 50 }, { label: "C", value: 20 }] } }); setChartMenuOpen(false); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-zinc-100">{ct.label}</button>
                ))}
              </div>
            )}
          </div>
          {/* 版面配置（下拉選單，取代形狀） */}
          <div ref={layoutMenuRef} className="relative">
            <button onClick={() => { setLayoutMenuOpen(v => !v); setTextMenuOpen(false); setChartMenuOpen(false); }} className="rounded px-3 py-1.5 text-xs border hover:bg-zinc-100">📐 版面 ▾</button>
            {layoutMenuOpen && (
              <div className="absolute top-full left-0 mt-1 rounded-lg shadow-xl py-1 z-[10004] min-w-[160px]" style={{ backgroundColor: "var(--color-bg)", border: "1px solid var(--color-border)" }}>
                <button onClick={() => { addBlock({ type: "text", x: 5, y: 5, w: 90, h: 90, text: "", style: { fontSize: 16 } }); setLayoutMenuOpen(false); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-zinc-100">📑 目錄</button>
                <button onClick={() => { addBlock({ type: "chart", x: 5, y: 5, w: 90, h: 50, chart: { type: "text-columns", data: [{ label: "欄一", value: 0 }, { label: "欄二", value: 0 }] } }); setLayoutMenuOpen(false); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-zinc-100">📑 雙欄</button>
                <button onClick={() => { addBlock({ type: "chart", x: 5, y: 5, w: 90, h: 50, chart: { type: "text-columns", data: [{ label: "欄一", value: 0 }, { label: "欄二", value: 0 }, { label: "欄三", value: 0 }] } }); setLayoutMenuOpen(false); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-zinc-100">📑 三欄</button>
                <div className="my-1 border-t" style={{ borderColor: "var(--color-border)" }} />
                <button onClick={() => { addBlock({ type: "chart", x: 10, y: 10, w: 80, h: 60, chart: { type: "text-quote", data: [{ label: "引述", value: 0 }] } }); setLayoutMenuOpen(false); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-zinc-100">❝ 引言卡</button>
                <button onClick={() => { addBlock({ type: "chart", x: 10, y: 10, w: 80, h: 60, chart: { type: "timeline", data: [{ label: "事件一", value: 0 }, { label: "事件二", value: 0 }] } }); setLayoutMenuOpen(false); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-zinc-100">⏱️ 時間軸</button>
                <button onClick={() => { addBlock({ type: "chart", x: 10, y: 10, w: 80, h: 60, chart: { type: "text-list", data: [{ label: "項目一", value: 0 }, { label: "項目二", value: 0 }] } }); setLayoutMenuOpen(false); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-zinc-100">📋 文字清單</button>
              </div>
            )}
          </div>
          <div className="h-5 w-px bg-zinc-300 mx-1" />
          <span className="text-[10px] opacity-50">對齊</span>
          {([["left", "⤛"], ["hcenter", "↔"], ["right", "⤜"], ["top", "⤒"], ["vcenter", "⇕"], ["bottom", "⤓"]] as [AlignType, string][]).map(([t, ic]) => (
            <button key={t} disabled={selectedIds.length < 2} onClick={() => handleAlign(t)} className="rounded px-2 py-1.5 text-xs border hover:bg-zinc-100 disabled:opacity-25" title={t}>{ic}</button>
          ))}
          <button disabled={selectedIds.length < 3} onClick={() => handleAlign("hdistribute")} className="rounded px-2 py-1.5 text-xs border hover:bg-zinc-100 disabled:opacity-25" title="水平等距">⇆</button>
          <button disabled={selectedIds.length < 3} onClick={() => handleAlign("vdistribute")} className="rounded px-2 py-1.5 text-xs border hover:bg-zinc-100 disabled:opacity-25" title="垂直等距">⇅</button>
          <div className="h-5 w-px bg-zinc-300 mx-1" />
          <select value={data.theme} onChange={(e) => onUpdatePresentation({ ...data, theme: e.target.value as any })} className="rounded border px-2 py-1.5 text-xs bg-transparent">
            <option value="minimal">Minimal</option><option value="academic">Academic</option><option value="business">Business</option><option value="dark">Dark</option>
          </select>
          <div className="h-5 w-px bg-zinc-300 mx-1" />
          {/* 投影片縮圖與圖層開合控制按鈕 */}
          <button
            onClick={() => setLeftPanelOpen((v) => !v)}
            className={`rounded px-2.5 py-1.5 text-xs border transition-all ${leftPanelOpen ? "bg-zinc-800 text-white" : "hover:bg-zinc-100 opacity-70"}`}
            title="切換顯示/隱藏 投影片列表"
          >
            📑 投影片
          </button>
          <button
            onClick={() => setRightPanelOpen((v) => !v)}
            className={`rounded px-2.5 py-1.5 text-xs border transition-all ${rightPanelOpen ? "bg-zinc-800 text-white" : "hover:bg-zinc-100 opacity-70"}`}
            title="切換顯示/隱藏 圖層面板"
          >
            ☰ 圖層
          </button>
        </div>
      </div>

      {/* ===== 三欄 ===== */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左：縮圖列（即時鏡像）+ 底部新增投影片 */}
        <div className={`${leftPanelOpen ? "w-[180px]" : "w-0"} shrink-0 flex flex-col border-r overflow-hidden transition-all duration-200`} style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-sidebar-bg)" }}>
          <div className="px-3 py-2 text-[10px] font-semibold uppercase opacity-70 border-b flex items-center justify-between" style={{ borderColor: "var(--color-border)" }}>
            <span className="flex items-center gap-1">📑 投影片</span>
            <button onClick={() => setLeftPanelOpen(false)} className="hover:opacity-100 px-1.5 py-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs cursor-pointer" title="收合投影片列表">«</button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {slides.map((slide, idx) => (
              <SlideThumbnail key={slide.id} slide={slide} theme={data.theme} active={activeSlideId === slide.id} idx={idx} total={slides.length}
                onClick={() => { setActiveSlideId(slide.id); setSelectedIds([]); }}
                onContextMenu={(e) => { e.preventDefault(); setSlideCtx({ x: e.clientX, y: e.clientY, slideId: slide.id }); }} />
            ))}
          </div>
          <div className="p-2 border-t" style={{ borderColor: "var(--color-border)" }}>
            <button onClick={() => handleAddSlide()} className="w-full rounded-md bg-zinc-800 text-white text-base py-10 hover:bg-zinc-700">＋ 新增投影片</button>
          </div>
        </div>

        {/* 中：編輯畫布（置中） */}
        <div className="flex-1 overflow-auto p-8 flex items-center justify-center relative" style={{ backgroundColor: "#f5f5f4" }}>
          {/* 左側縮圖展開按鈕（當左側收合時在畫布邊緣顯示） */}
          {!leftPanelOpen && (
            <button
              onClick={() => setLeftPanelOpen(true)}
              className="absolute left-3 top-3 z-30 flex items-center gap-1.5 rounded-lg px-3 py-1.5 bg-white shadow-md border text-xs font-medium hover:bg-zinc-50 transition-all text-zinc-700 cursor-pointer"
              title="展開投影片列表"
            >
              📑 投影片 »
            </button>
          )}
          {/* 右側圖層展開按鈕（當右側收合時在畫布邊緣顯示） */}
          {!rightPanelOpen && (
            <button
              onClick={() => setRightPanelOpen(true)}
              className="absolute right-3 top-3 z-30 flex items-center gap-1.5 rounded-lg px-3 py-1.5 bg-white shadow-md border text-xs font-medium hover:bg-zinc-50 transition-all text-zinc-700 cursor-pointer"
              title="展開圖層面板"
            >
              « ☰ 圖層
            </button>
          )}
          <div ref={canvasRef} className="relative w-full max-w-[960px] aspect-[16/9] rounded-xl shadow-xl overflow-hidden select-none" style={{ backgroundColor: isDark ? "#1e1e1e" : "white", color: isDark ? "white" : "black" }}
            onMouseDown={(e) => { if (e.target === e.currentTarget) { setSelectedIds([]); setEditingBlockId(null); setChartEditOpen(false); } }}>
            {activeSlide?.title && <div className="text-[10px] opacity-25 absolute top-2 left-3 pointer-events-none">{slides.findIndex((s) => s.id === activeSlideId) + 1} / {slides.length} — {activeSlide.title}</div>}

            {/* 物件 */}
            {sortedBlocks.map((block) => {
              const selected = selectedIds.includes(block.id);
              const editing = editingBlockId === block.id;
              return (
                <div key={block.id} data-pb={block.id}
                  onPointerDown={(e) => {
                    if (editing) return;
                    e.stopPropagation();
                    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                    if (e.ctrlKey || e.metaKey) { setSelectedIds((p) => p.includes(block.id) ? p.filter((id) => id !== block.id) : [...p, block.id]); return; }
                    if (!selected) setSelectedIds([block.id]);
                    setChartEditOpen(false);
                    const cRect = canvasRef.current!.getBoundingClientRect();
                    const targetIds = (selected && selectedIds.length > 1) ? selectedIds : [block.id];
                    const origBlocks = (activeSlide?.blocks || []).filter((b) => targetIds.includes(b.id));
                    const minX = Math.min(...origBlocks.map((b) => b.x));
                    const minY = Math.min(...origBlocks.map((b) => b.y));
                    const maxX = Math.max(...origBlocks.map((b) => b.x + b.w));
                    const maxY = Math.max(...origBlocks.map((b) => b.y + (b.h || MIN_H)));
                    ptrRef.current = {
                      kind: "drag",
                      ids: targetIds,
                      startMX: e.clientX,
                      startMY: e.clientY,
                      cw: cRect.width,
                      ch: cRect.height,
                      groupOrigX: minX,
                      groupOrigY: minY,
                      groupW: maxX - minX,
                      groupH: maxY - minY,
                      orig: Object.fromEntries(origBlocks.map((b) => [b.id, { x: b.x, y: b.y, w: b.w, h: b.h }])),
                    };
                  }}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onDoubleClick={(e) => { e.stopPropagation(); if (block.type === "text") { setSelectedIds([block.id]); setEditingBlockId(block.id); } }}
                  style={{ ...selBoxStyle(block), zIndex: block.z, background: block.style?.background || "transparent", border: selected ? `1.5px dashed ${selectedIds.length > 1 ? "#22c55e" : "#3b82f6"}` : "1px solid transparent", borderRadius: 3, padding: 4, cursor: editing ? "text" : "move", fontSize: block.style?.fontSize ? `${block.style.fontSize}px` : "14px", color: block.style?.color || "inherit", textAlign: block.style?.textAlign || "left" }}>
                  {block.type === "text" && editing ? (
                    <textarea autoFocus value={block.text || ""} onChange={(e) => updateBlock(block.id, { text: e.target.value })} onBlur={() => setEditingBlockId(null)} onMouseDown={(e) => e.stopPropagation()} onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) setEditingBlockId(null); }} className="w-full h-full bg-transparent outline-none resize-none placeholder:text-zinc-400 placeholder:opacity-45 placeholder:italic" placeholder="文字方塊" />
                  ) : <BlockContent block={block} />}
                </div>
              );
            })}

            {/* 磁吸對齊輔助線 */}
            {activeGuides.map((guide, idx) =>
              guide.type === "vertical" ? (
                <div
                  key={`guide-v-${idx}-${guide.pos}`}
                  style={{
                    position: "absolute",
                    left: `${guide.pos}%`,
                    top: 0,
                    bottom: 0,
                    width: "1px",
                    backgroundColor: "#0ea5e9",
                    boxShadow: "0 0 3px rgba(14, 165, 233, 0.8)",
                    zIndex: 9998,
                    pointerEvents: "none",
                  }}
                />
              ) : (
                <div
                  key={`guide-h-${idx}-${guide.pos}`}
                  style={{
                    position: "absolute",
                    top: `${guide.pos}%`,
                    left: 0,
                    right: 0,
                    height: "1px",
                    backgroundColor: "#0ea5e9",
                    boxShadow: "0 0 3px rgba(14, 165, 233, 0.8)",
                    zIndex: 9998,
                    pointerEvents: "none",
                  }}
                />
              )
            )}

            {/* 8 方向伸縮把手與 4 邊緣感應條（隨物件旋轉同步旋轉與縮放） */}
            {singleSelected && !editingBlockId && (() => {
              const b = singleSelected;
              const h = b.h || MIN_H;
              const rot = b.rotation || 0;

              const handles: { hd: HandleDir; left: string; top: string; cursor: string }[] = [
                { hd: "nw", left: "0%", top: "0%", cursor: "nwse-resize" },
                { hd: "n", left: "50%", top: "0%", cursor: "ns-resize" },
                { hd: "ne", left: "100%", top: "0%", cursor: "nesw-resize" },
                { hd: "e", left: "100%", top: "50%", cursor: "ew-resize" },
                { hd: "se", left: "100%", top: "100%", cursor: "nwse-resize" },
                { hd: "s", left: "50%", top: "100%", cursor: "ns-resize" },
                { hd: "sw", left: "0%", top: "100%", cursor: "nesw-resize" },
                { hd: "w", left: "0%", top: "50%", cursor: "ew-resize" },
              ];

              const edgeBars: { hd: HandleDir; style: React.CSSProperties; cursor: string }[] = [
                // Top edge (上下伸縮)
                {
                  hd: "n",
                  cursor: "ns-resize",
                  style: { position: "absolute", left: 0, top: 0, width: "100%", height: 14, marginTop: -7 },
                },
                // Bottom edge (上下伸縮)
                {
                  hd: "s",
                  cursor: "ns-resize",
                  style: { position: "absolute", left: 0, top: "100%", width: "100%", height: 14, marginTop: -7 },
                },
                // Left edge (左右伸縮)
                {
                  hd: "w",
                  cursor: "ew-resize",
                  style: { position: "absolute", left: 0, top: 0, width: 14, height: "100%", marginLeft: -7 },
                },
                // Right edge (左右伸縮)
                {
                  hd: "e",
                  cursor: "ew-resize",
                  style: { position: "absolute", left: "100%", top: 0, width: 14, height: "100%", marginLeft: -7 },
                },
              ];

              return (
                <div
                  style={{
                    position: "absolute",
                    left: `${b.x}%`,
                    top: `${b.y}%`,
                    width: `${b.w}%`,
                    height: `${h}%`,
                    transform: `rotate(${rot}deg)`,
                    transformOrigin: "center center",
                    pointerEvents: "none",
                    zIndex: 10000,
                  }}
                >
                  {/* 4 條邊框感應條（大幅擴大上下左右伸縮的點擊與滑鼠辨識區域） */}
                  {edgeBars.map(({ hd, style, cursor }, i) => (
                    <div
                      key={`edge-${hd}-${i}`}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                        const cRect = canvasRef.current!.getBoundingClientRect();
                        ptrRef.current = {
                          kind: "resize",
                          id: b.id,
                          handle: hd,
                          startMX: e.clientX,
                          startMY: e.clientY,
                          orig: { ...b },
                          cw: cRect.width,
                          ch: cRect.height,
                        };
                      }}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                      style={{
                        ...style,
                        pointerEvents: "auto",
                        cursor,
                      }}
                    />
                  ))}

                  {/* 8 個控制點（大碰撞體積 22px + 10px 白底藍框控制圓點） */}
                  {handles.map(({ hd, left, top, cursor }) => (
                    <div
                      key={hd}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                        const cRect = canvasRef.current!.getBoundingClientRect();
                        ptrRef.current = {
                          kind: "resize",
                          id: b.id,
                          handle: hd,
                          startMX: e.clientX,
                          startMY: e.clientY,
                          orig: { ...b },
                          cw: cRect.width,
                          ch: cRect.height,
                        };
                      }}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                      style={{
                        position: "absolute",
                        left,
                        top,
                        width: 22,
                        height: 22,
                        marginLeft: -11,
                        marginTop: -11,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        pointerEvents: "auto",
                        cursor,
                      }}
                    >
                      <div
                        style={{
                          width: 10,
                          height: 10,
                          backgroundColor: "white",
                          border: "1.5px solid #2563eb",
                          borderRadius: "9999px",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.18)",
                          pointerEvents: "none",
                        }}
                      />
                    </div>
                  ))}

                  {/* 旋轉把手：獨立定位在物件正上方，連接線 + 圓點，隨物件同步旋轉 */}
                  <div
                    style={{
                      position: "absolute",
                      left: "50%",
                      top: -22,
                      width: 1,
                      height: 22,
                      backgroundColor: "#3b82f6",
                      pointerEvents: "none",
                    }}
                  />
                  <div
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                      const cr = canvasRef.current!.getBoundingClientRect();
                      const cx = cr.left + ((b.x + b.w / 2) / 100) * cr.width;
                      const cy = cr.top + ((b.y + (b.h || MIN_H) / 2) / 100) * cr.height;
                      ptrRef.current = { kind: "rotate", id: b.id, cx, cy, cw: cr.width, ch: cr.height };
                    }}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    title="拖曳旋轉物件（按住 Shift 鍵每 15° 吸附）"
                    style={{
                      position: "absolute",
                      left: "50%",
                      top: -26,
                      width: 24,
                      height: 24,
                      marginLeft: -12,
                      marginTop: -12,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      pointerEvents: "auto",
                      cursor: "grab",
                    }}
                  >
                    <div
                      style={{
                        width: 12,
                        height: 12,
                        backgroundColor: "#3b82f6",
                        borderRadius: "9999px",
                        border: "2px solid white",
                        boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
                        pointerEvents: "none",
                      }}
                    />
                  </div>
                </div>
              );
            })()}

            {/* 浮動工具列（複製/刪除/編輯圖表/更多） */}
            {floatBarStyle && (
              <div className="absolute z-[10001] flex items-center gap-2 rounded-lg shadow-lg px-3 py-3" style={{ ...floatBarStyle, backgroundColor: "var(--color-bg)", border: "1px solid var(--color-border)" }} onMouseDown={(e) => e.stopPropagation()}>
                {singleSelected && <button onClick={() => handleDuplicateBlock(singleSelected.id)} className="px-4 py-3 text-base rounded hover:bg-zinc-100" title="複製">⧉</button>}
                {singleSelected?.type === "chart" && (
                  <button onClick={() => setChartEditOpen((v) => !v)} className={`px-4 py-3 text-base rounded ${chartEditOpen ? "bg-zinc-200" : "hover:bg-zinc-100"}`} title="編輯圖表（如 Gamma）">📊 編輯圖表</button>
                )}
                <button onClick={() => handleDeleteBlocks(selectedIds)} className="px-4 py-3 text-base rounded hover:bg-red-50 text-red-600" title="刪除">🗑</button>
                <div ref={moreMenuRef} className="relative">
                  <button onClick={() => setMoreMenuFor(moreMenuFor ? null : "open")} className="px-4 py-3 text-base rounded hover:bg-zinc-100" title="更多">⋯</button>
                  {moreMenuFor && (
                    <div className="absolute top-full left-0 mt-1 rounded-lg shadow-xl py-1 min-w-[120px]" style={{ backgroundColor: "var(--color-bg)", border: "1px solid var(--color-border)" }} onMouseDown={(e) => e.stopPropagation()}>
                      <button onClick={() => { singleSelected && handleZOrder(singleSelected.id, "front"); setMoreMenuFor(null); }} disabled={!singleSelected} className="w-full text-left px-3 py-1.5 text-xs hover:bg-zinc-100 disabled:opacity-30">⬆ 置頂</button>
                      <button onClick={() => { singleSelected && handleZOrder(singleSelected.id, "back"); setMoreMenuFor(null); }} disabled={!singleSelected} className="w-full text-left px-3 py-1.5 text-xs hover:bg-zinc-100 disabled:opacity-30">⬇ 置底</button>
                      <div className="my-1 border-t" style={{ borderColor: "var(--color-border)" }} />
                      <button onClick={() => { singleSelected && updateBlock(singleSelected.id, { rotation: (singleSelected.rotation || 0) + 90 }); setMoreMenuFor(null); }} disabled={!singleSelected} className="w-full text-left px-3 py-1.5 text-xs hover:bg-zinc-100 disabled:opacity-30">↻ 旋轉 90°</button>
                      <button onClick={() => { singleSelected && updateBlock(singleSelected.id, { rotation: (singleSelected.rotation || 0) - 90 }); setMoreMenuFor(null); }} disabled={!singleSelected} className="w-full text-left px-3 py-1.5 text-xs hover:bg-zinc-100 disabled:opacity-30">↺ 旋轉 -90°</button>
                      <button onClick={() => { singleSelected && updateBlock(singleSelected.id, { rotation: 0 }); setMoreMenuFor(null); }} disabled={!singleSelected} className="w-full text-left px-3 py-1.5 text-xs hover:bg-zinc-100 disabled:opacity-30">⟲ 重設旋轉</button>
                    </div>
                  )}
                </div>
              </div>
            )}


            {/* 空畫布提示 */}
            {(!activeSlide?.blocks || activeSlide.blocks.length === 0) && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-sm opacity-30 text-center">點擊上欄「＋ 文字」開始<br />拖曳移動 / 拖角落縮放 / 上方圓點旋轉</div>
              </div>
            )}
          </div>
        </div>

        {/* 右：圖層 + 屬性 */}
        <div className={`${rightPanelOpen ? "w-[260px]" : "w-0"} shrink-0 border-l flex flex-col overflow-hidden transition-all duration-200`} style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-sidebar-bg)" }}>
          <div className="px-3 py-2 text-[10px] font-semibold uppercase opacity-70 border-b flex items-center justify-between" style={{ borderColor: "var(--color-border)" }}>
            <span className="flex items-center gap-1">☰ 圖層</span>
            <button onClick={() => setRightPanelOpen(false)} className="hover:opacity-100 px-1.5 py-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs cursor-pointer" title="收合圖層面板">»</button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {[...(activeSlide?.blocks || [])].sort((a, b) => b.z - a.z).map((block) => (
              <div key={block.id} draggable onDragStart={() => setDraggedBlockId(block.id)} onDragOver={(e) => e.preventDefault()} onDrop={() => { if (!draggedBlockId || draggedBlockId === block.id || !activeSlide) return; const sorted = [...(activeSlide.blocks || [])].sort((a, b) => a.z - b.z); const fromIdx = sorted.findIndex((b) => b.id === draggedBlockId); const toIdx = sorted.findIndex((b) => b.id === block.id); if (fromIdx === -1 || toIdx === -1) return; const [moved] = sorted.splice(fromIdx, 1); sorted.splice(toIdx, 0, moved); updateActiveSlide({ blocks: sorted.map((b, i) => ({ ...b, z: (i + 1) * 10 })) }); setDraggedBlockId(null); }} onClick={(e) => { if (e.ctrlKey || e.metaKey) setSelectedIds((p) => p.includes(block.id) ? p.filter((id) => id !== block.id) : [...p, block.id]); else setSelectedIds([block.id]); }} className={`flex items-center gap-2 p-2 rounded cursor-grab active:cursor-grabbing text-xs ${selectedIds.includes(block.id) ? "bg-white border border-blue-300 shadow-sm" : "hover:bg-white/60 border border-transparent"} ${draggedBlockId === block.id ? "opacity-40" : ""}`}>
                <span className="opacity-40 select-none">⠿</span>
                <span>{block.type === "text" ? "📝" : block.type === "chart" ? "📊" : block.type === "shape" ? "⬜" : "🖼️"}</span>
                <span className="flex-1 truncate">{block.text?.slice(0, 18) || (block.type === "text" ? "(空文字)" : block.type)}</span>
              </div>
            ))}
            {(!activeSlide?.blocks || activeSlide.blocks.length === 0) && <div className="text-xs opacity-40 p-2">尚無圖層</div>}
          </div>
        </div>
      </div>

      {/* 縮圖右鍵選單 */}
      {slideCtx && (
        <div ref={slideCtxRef} className="fixed z-[10003] rounded-lg shadow-xl py-1 min-w-[140px]" style={{ top: Math.min(slideCtx.y, window.innerHeight - 120), left: Math.min(slideCtx.x, window.innerWidth - 150), backgroundColor: "var(--color-bg)", border: "1px solid var(--color-border)" }} onMouseDown={(e) => e.stopPropagation()}>
          <button onClick={() => { handleDuplicateSlide(slideCtx.slideId); setSlideCtx(null); }} className="w-full text-left px-3 py-2 text-xs hover:bg-zinc-100">⧉ 複製投影片</button>
          <button onClick={() => { setActiveSlideId(slideCtx.slideId); handleAddSlide(); setSlideCtx(null); }} className="w-full text-left px-3 py-2 text-xs hover:bg-zinc-100">＋ 在此新增投影片</button>
          <div className="my-1 border-t" style={{ borderColor: "var(--color-border)" }} />
          <button onClick={() => { handleDeleteSlide(slideCtx.slideId); setSlideCtx(null); }} disabled={slides.length <= 1} className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 disabled:opacity-30">🗑 刪除投影片</button>
        </div>
      )}


      {/* 圖表編輯底部面板：上半部（類型｜設定｜預覽）+ 下半部（資料表格） */}
      {chartEditOpen && singleSelected?.type === "chart" && singleSelected.chart && (() => {
        const c = singleSelected.chart!;
        const upd = (patch: any) => updateBlock(singleSelected.id, { chart: { ...c, ...patch } as any });
        const chartTypes: { t: string; icon: string }[] = [
          { t: "bar", icon: "📊" }, { t: "line", icon: "📈" }, { t: "pie", icon: "🥧" }, { t: "donut", icon: "🍩" },
          { t: "gantt", icon: "📅" }, { t: "pyramid", icon: "🔺" }, { t: "radar", icon: "🕸️" },
          { t: "timeline", icon: "⏱️" }, { t: "text-columns", icon: "📑" }, { t: "text-list", icon: "📋" }, { t: "text-quote", icon: "❝" },
        ];
        return (
          <div className="shrink-0 border-t flex flex-col relative" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-sidebar-bg)" }}>
            {/* 關閉按鈕：固定在面板右側邊緣 */}
            <button onClick={() => setChartEditOpen(false)} className="absolute -top-3 right-3 z-10 w-7 h-7 rounded-full shadow-lg flex items-center justify-center text-sm" style={{ backgroundColor: "var(--color-bg)", border: "1px solid var(--color-border)" }}>✕</button>
            {/* 標題列 */}
            <div className="flex items-center px-4 py-1.5 border-b" style={{ borderColor: "var(--color-border)" }}>
              <span className="text-sm font-semibold">📊 編輯圖表</span>
            </div>
            {/* 上半部：類型｜設定｜預覽（三欄並排） */}
            <div className="flex gap-0 border-b" style={{ borderColor: "var(--color-border)" }}>
              {/* 1. 圖表類型 */}
              <div className="shrink-0 p-2 border-r overflow-y-auto" style={{ borderColor: "var(--color-border)", width: 120 }}>
                <div className="text-[10px] opacity-50 font-semibold mb-1">類型</div>
                <div className="grid grid-cols-2 gap-1">
                  {chartTypes.map(({ t, icon }) => (
                    <button key={t} onClick={() => upd({ type: t as any })} title={t}
                      className={`rounded p-1.5 text-lg text-center transition-all ${c.type === t ? "bg-blue-500 text-white" : "hover:bg-zinc-200"}`}>{icon}</button>
                  ))}
                </div>
              </div>
              {/* 2. 細項設定 */}
              <div className="flex-1 p-2 border-r overflow-y-auto" style={{ borderColor: "var(--color-border)" }}>
                <div className="text-[10px] opacity-50 font-semibold mb-1">圖表選項</div>
                <label className="flex items-center gap-1.5 mb-1 cursor-pointer"><input type="checkbox" checked={c.sortOrder === "desc"} onChange={(e) => upd({ sortOrder: e.target.checked ? "desc" : null })} className="accent-blue-500" /><span className="text-xs">由高到低排序</span></label>
                <label className="flex items-center gap-1.5 mb-1 cursor-pointer"><input type="checkbox" checked={c.showDataLabels ?? false} onChange={(e) => upd({ showDataLabels: e.target.checked })} className="accent-blue-500" /><span className="text-xs">資料標籤</span></label>
                <label className="flex items-center gap-1.5 mb-1 cursor-pointer"><input type="checkbox" checked={c.showGrid ?? true} onChange={(e) => upd({ showGrid: e.target.checked })} className="accent-blue-500" /><span className="text-xs">格線</span></label>
                <label className="flex items-center gap-1.5 mb-1 cursor-pointer"><input type="checkbox" checked={c.showTitleNumber ?? false} onChange={(e) => upd({ showTitleNumber: e.target.checked })} className="accent-blue-500" /><span className="text-xs">標題數字</span></label>
                <div className="text-[10px] opacity-50 font-semibold mb-1 mt-2">視覺效果</div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs opacity-60">方向</span>
                  <button onClick={() => upd({ orientation: c.orientation === "vertical" ? "horizontal" : "vertical" })} className="text-xs border rounded px-2 py-0.5 hover:bg-zinc-200">{c.orientation === "horizontal" ? "↔ 橫向" : "↕ 直向"}</button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs opacity-60">變體</span>
                  <select value={c.variant || "single"} onChange={(e) => upd({ variant: e.target.value as any })} className="text-xs border rounded px-1 py-0.5 bg-transparent"><option value="single">單一</option><option value="category">類別</option><option value="grouped">群組</option><option value="stacked">堆疊</option><option value="stacked-percent">比例</option></select>
                </div>
              </div>
              {/* 3. 預覽圖 */}
              <div className="shrink-0 p-2 flex items-center justify-center" style={{ width: 260 }}>
                <ChartRenderer chart={c} width={240} height={140} />
              </div>
            </div>
            {/* 下半部：資料表格 */}
            <div className="p-2" style={{ maxHeight: 140, overflowY: "auto" }}>
              <div className="flex gap-1 mb-1 text-[10px] opacity-50 font-semibold"><span className="flex-1">標籤</span><span className="w-20 text-center">數值</span><span className="w-8"></span></div>
              {(c.data || []).map((d, i) => (
                <div key={i} className="flex gap-1 mb-1">
                  <input value={d.label} onChange={(e) => { const nd = [...(c.data || [])]; nd[i] = { ...nd[i], label: e.target.value }; upd({ data: nd }); }} className="flex-1 border rounded px-2 py-1 text-xs" placeholder="標籤" />
                  <input type="number" value={d.value} onChange={(e) => { const nd = [...(c.data || [])]; nd[i] = { ...nd[i], value: Number(e.target.value) }; upd({ data: nd }); }} className="w-20 border rounded px-1 py-1 text-xs text-center" />
                  <button onClick={() => upd({ data: (c.data || []).filter((_, idx) => idx !== i) })} className="w-8 text-xs text-red-500 hover:bg-red-50 rounded">✕</button>
                </div>
              ))}
              <button onClick={() => upd({ data: [...(c.data || []), { label: "新", value: 10 }] })} className="text-xs border rounded px-3 py-1 mt-1 hover:bg-zinc-100">+ 新增列</button>
            </div>
          </div>
        );
      })()}

      {/* 備註列 */}
      <div className="shrink-0 border-t p-3 flex gap-2 items-start" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-sidebar-bg)" }}>
        <span className="text-xs opacity-60 mt-1">📝 備註</span>
        <input value={activeSlide?.notes || ""} onChange={(e) => activeSlide && updateActiveSlide({ notes: e.target.value })} placeholder="講者備註，觀眾看不到..." className="flex-1 bg-transparent outline-none text-sm" />
      </div>
    </main>
  );
}
