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

type Interaction =
  | { kind: "drag"; ids: string[]; startMX: number; startMY: number; orig: Record<string, { x: number; y: number }> }
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
    if (thumb) return <div style={{ fontSize: 7, opacity: empty ? 0.35 : 1, color: block.style?.color || "inherit", whiteSpace: "pre-wrap", overflow: "hidden" }}>{empty ? "文字" : block.text!.slice(0, 30)}</div>;
    return empty
      ? <div className="pointer-events-none italic" style={{ opacity: 0.3 }}>點擊輸入文字</div>
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
  const [slideCtx, setSlideCtx] = useState<{ x: number; y: number; slideId: string } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const slideCtxRef = useRef<HTMLDivElement>(null);

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
  const handleAddTextBlock = () => {
    if (!activeSlide) return;
    const nb: PresentationBlock = { id: genId(), type: "text", x: 20, y: 30, w: 45, h: 14, z: (activeSlide.blocks?.length || 0) + 10, text: "", style: { fontSize: 18 } };
    updateActiveSlide({ blocks: [...(activeSlide.blocks || []), nb] });
    setSelectedIds([nb.id]);
  };
  const handleAddChart = () => {
    if (!activeSlide) return;
    const b: PresentationBlock = { id: genId(), type: "chart", x: 15, y: 20, w: 50, h: 45, z: 10, chart: { type: "bar", variant: "single", orientation: "vertical", data: [{ label: "A", value: 30 }, { label: "B", value: 50 }] } };
    updateActiveSlide({ blocks: [...(activeSlide.blocks || []), b] });
    setSelectedIds([b.id]);
  };
  const handleAddShape = () => {
    if (!activeSlide) return;
    const b: PresentationBlock = { id: genId(), type: "shape", x: 25, y: 30, w: 30, h: 25, z: 5, style: { background: "#e0e7ff" } };
    updateActiveSlide({ blocks: [...(activeSlide.blocks || []), b] });
    setSelectedIds([b.id]);
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
      for (const id of it.ids) {
        const o = it.orig[id];
        if (!o) continue;
        const newX = ((e.clientX - it.canvasLeft - it.grabOffsetX) / it.cw) * 100;
        const newY = ((e.clientY - it.canvasTop - it.grabOffsetY) / it.ch) * 100;
        updateBlock(id, {
          x: Math.max(0, Math.min(100 - (o.w || 0), newX)),
          y: Math.max(0, Math.min(100 - (o.h || 0), newY)),
        });
      }
    } else if (it.kind === "resize") {
      const orig = it.orig; const rot = orig.rotation || 0;
      let dxPx = e.clientX - it.startMX, dyPx = e.clientY - it.startMY;
      if (rot) { const lv = rotateVec(dxPx, dyPx, -rot); dxPx = lv.x; dyPx = lv.y; }
      const dxPct = (dxPx / it.cw) * 100, dyPct = (dyPx / it.ch) * 100;
      let { x, y, w, h } = orig; const hd = it.handle;
      if (hd.includes("e")) w = Math.max(MIN_W, orig.w + dxPct);
      if (hd.includes("s")) h = Math.max(MIN_H, (orig.h || MIN_H) + dyPct);
      if (hd.includes("w")) { const nw = Math.max(MIN_W, orig.w - dxPct); x = orig.x + (orig.w - nw); w = nw; }
      if (hd.includes("n")) { const nh = Math.max(MIN_H, (orig.h || MIN_H) - dyPct); y = orig.y + ((orig.h || MIN_H) - nh); h = nh; }
      // 邊界 clamp：物件保持在畫布內（0~100），避免邊緣超出被 overflow-hidden 裁切後無法選回
      x = Math.max(0, x); y = Math.max(0, y);
      w = Math.max(MIN_W, Math.min(w, 100 - x));
      h = Math.max(MIN_H, Math.min(h, 100 - y));
      updateBlock(orig.id, { x, y, w, h });
    } else if (it.kind === "rotate") {
      let angle = (Math.atan2(e.clientY - it.cy, e.clientX - it.cx) * 180) / Math.PI + 90;
      if (e.shiftKey) angle = Math.round(angle / 15) * 15;
      if (angle > 180) angle -= 360; if (angle < -180) angle += 360;
      updateBlock(it.id, { rotation: angle });
    }
  };
  const handlePointerUp = (e: React.PointerEvent) => {
    ptrRef.current = null;
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
      if (e.key === "Escape") { setSelectedIds([]); setEditingBlockId(null); setChartEditOpen(false); setSlideCtx(null); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedIds, editingBlockId]);

  // 關閉縮圖右鍵選單
  useEffect(() => {
    if (!slideCtx) return;
    const h = (e: MouseEvent) => { if (slideCtxRef.current && !slideCtxRef.current.contains(e.target as Node)) setSlideCtx(null); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [slideCtx]);

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
        <div className="flex items-center gap-2 px-4 py-3 flex-wrap">
          <input value={page.title} onChange={(e) => onTitleChange(e.target.value)} placeholder="簡報標題" className="bg-transparent font-semibold outline-none text-sm min-w-[120px]" />
          <span className="text-[10px] opacity-50">{slides.length} 張</span>
          <div className="h-5 w-px bg-zinc-300 mx-1" />
          <button onClick={handleAddTextBlock} className="rounded px-3 py-1.5 text-xs bg-zinc-800 text-white hover:bg-zinc-700">＋ 文字</button>
          <button onClick={handleAddChart} className="rounded px-3 py-1.5 text-xs border hover:bg-zinc-100">📊 圖表</button>
          <button onClick={handleAddShape} className="rounded px-3 py-1.5 text-xs border hover:bg-zinc-100">⬜ 形狀</button>
          <div className="h-5 w-px bg-zinc-300 mx-1" />
          <span className="text-[10px] opacity-50">對齊</span>
          {([["left", "⤛"], ["hcenter", "↔"], ["right", "⤜"], ["top", "⤒"], ["vcenter", "⇕"], ["bottom", "⤓"]] as [AlignType, string][]).map(([t, ic]) => (
            <button key={t} disabled={selectedIds.length < 2} onClick={() => handleAlign(t)} className="rounded px-2 py-1.5 text-xs border hover:bg-zinc-100 disabled:opacity-25" title={t}>{ic}</button>
          ))}
          <button disabled={selectedIds.length < 3} onClick={() => handleAlign("hdistribute")} className="rounded px-2 py-1.5 text-xs border hover:bg-zinc-100 disabled:opacity-25" title="水平等距">⇆</button>
          <button disabled={selectedIds.length < 3} onClick={() => handleAlign("vdistribute")} className="rounded px-2 py-1.5 text-xs border hover:bg-zinc-100 disabled:opacity-25" title="垂直等距">⇅</button>
          <div className="h-5 w-px bg-zinc-300 mx-1" />
          <span className="text-[10px] opacity-50">版型</span>
          {LAYOUTS.slice(0, 5).map((l) => (
            <button key={l.id} onClick={() => activeSlide && updateActiveSlide({ layout: l.id })} className={`rounded px-2 py-1.5 text-xs border ${activeSlide?.layout === l.id ? "bg-zinc-800 text-white" : "hover:bg-zinc-100"}`} title={l.label}>{l.icon}</button>
          ))}
          <select value={data.theme} onChange={(e) => onUpdatePresentation({ ...data, theme: e.target.value as any })} className="ml-1 rounded border px-2 py-1.5 text-xs bg-transparent">
            <option value="minimal">Minimal</option><option value="academic">Academic</option><option value="business">Business</option><option value="dark">Dark</option>
          </select>
        </div>
      </div>

      {/* ===== 三欄 ===== */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左：縮圖列（即時鏡像）+ 底部新增投影片 */}
        <div className="w-[180px] shrink-0 flex flex-col border-r overflow-hidden" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-sidebar-bg)" }}>
          <div className="px-3 py-2 text-[10px] font-semibold uppercase opacity-50 border-b" style={{ borderColor: "var(--color-border)" }}>投影片（右鍵更多操作）</div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {slides.map((slide, idx) => (
              <SlideThumbnail key={slide.id} slide={slide} theme={data.theme} active={activeSlideId === slide.id} idx={idx} total={slides.length}
                onClick={() => { setActiveSlideId(slide.id); setSelectedIds([]); }}
                onContextMenu={(e) => { e.preventDefault(); setSlideCtx({ x: e.clientX, y: e.clientY, slideId: slide.id }); }} />
            ))}
          </div>
          <div className="p-2 border-t" style={{ borderColor: "var(--color-border)" }}>
            <button onClick={() => handleAddSlide()} className="w-full rounded-md bg-zinc-800 text-white text-xs py-2 hover:bg-zinc-700">＋ 新增投影片</button>
          </div>
        </div>

        {/* 中：編輯畫布（置中） */}
        <div className="flex-1 overflow-auto p-8 flex items-center justify-center" style={{ backgroundColor: "#f5f5f4" }}>
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
                    const el = e.currentTarget as HTMLElement;
                    const rect = el.getBoundingClientRect();
                    const lx = e.clientX - rect.left, ly = e.clientY - rect.top;
                    const E = 9;
                    const L = lx < E, R = lx > rect.width - E, T = ly < E, B = ly > rect.height - E;
                    let handle: HandleDir | null = null;
                    if (L && T) handle = "nw"; else if (R && T) handle = "ne"; else if (L && B) handle = "sw"; else if (R && B) handle = "se";
                    else if (T) handle = "n"; else if (B) handle = "s"; else if (L) handle = "w"; else if (R) handle = "e";
                    const cRect = canvasRef.current!.getBoundingClientRect();
                    if (handle) {
                      ptrRef.current = { kind: "resize", id: block.id, handle, startMX: e.clientX, startMY: e.clientY, orig: { ...block }, cw: cRect.width, ch: cRect.height };
                    } else {
                      const targetIds = (selected && selectedIds.length > 1) ? selectedIds : [block.id];
                      const origBlocks = (selected && selectedIds.length > 1) ? selectedBlocks : [block];
                      ptrRef.current = { kind: "drag", ids: targetIds, grabOffsetX: lx, grabOffsetY: ly, canvasLeft: cRect.left, canvasTop: cRect.top, cw: cRect.width, ch: cRect.height, orig: Object.fromEntries(origBlocks.map((b) => [b.id, { x: b.x, y: b.y, w: b.w, h: b.h }])) };
                    }
                  }}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onDoubleClick={(e) => { e.stopPropagation(); if (block.type === "text") { setSelectedIds([block.id]); setEditingBlockId(block.id); } }}
                  style={{ ...selBoxStyle(block), zIndex: block.z, background: block.style?.background || "transparent", border: selected ? `1.5px dashed ${selectedIds.length > 1 ? "#22c55e" : "#3b82f6"}` : "1px solid transparent", borderRadius: 3, padding: 4, cursor: editing ? "text" : "move", fontSize: block.style?.fontSize ? `${block.style.fontSize}px` : "14px", color: block.style?.color || "inherit", textAlign: block.style?.textAlign || "left" }}>
                  {block.type === "text" && editing ? (
                    <textarea autoFocus value={block.text || ""} onChange={(e) => updateBlock(block.id, { text: e.target.value })} onBlur={() => setEditingBlockId(null)} onMouseDown={(e) => e.stopPropagation()} onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) setEditingBlockId(null); }} className="w-full h-full bg-transparent outline-none resize-none" placeholder="點擊輸入文字" />
                  ) : <BlockContent block={block} />}
                </div>
              );
            })}

            {/* 縮放圓點：獨立 10px 定位在物件邊角，純視覺（pointer-events:none），不覆蓋物件中心 → drag 不受阻 */}
            {singleSelected && !editingBlockId && (() => {
              const b = singleSelected; const h = b.h || MIN_H;
              return ([["nw", b.x, b.y], ["n", b.x + b.w / 2, b.y], ["ne", b.x + b.w, b.y], ["e", b.x + b.w, b.y + h / 2], ["se", b.x + b.w, b.y + h], ["s", b.x + b.w / 2, b.y + h], ["sw", b.x, b.y + h], ["w", b.x, b.y + h / 2]] as [HandleDir, number, number][]).map(([hd, cx, cy]) => (
                <div key={hd} style={{ position: "absolute", left: `${cx}%`, top: `${cy}%`, width: 10, height: 10, marginLeft: -5, marginTop: -5, background: "white", border: "1.5px solid #3b82f6", borderRadius: 9999, zIndex: 10000, pointerEvents: "none", cursor: HANDLE_POS[hd].cursor }} />
              ));
            })()}
            {/* 旋轉把手：獨立定位在物件正上方，不覆蓋物件本體，可點擊 */}
            {singleSelected && !editingBlockId && (
              <div onPointerDown={(e) => { e.stopPropagation(); (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); const cr = canvasRef.current!.getBoundingClientRect(); const b = singleSelected!; const cx = cr.left + (b.x + b.w / 2) / 100 * cr.width; const cy = cr.top + (b.y + (b.h || MIN_H) / 2) / 100 * cr.height; ptrRef.current = { kind: "rotate", id: b.id, cx, cy, cw: cr.width, ch: cr.height }; }}
                onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}
                style={{ position: "absolute", left: `${singleSelected.x + singleSelected.w / 2}%`, top: `calc(${singleSelected.y}% - 24px)`, width: 13, height: 13, marginLeft: -6.5, background: "white", border: "1.5px solid #3b82f6", borderRadius: 9999, zIndex: 10000, pointerEvents: "auto", cursor: "grab" }} />
            )}

            {/* 浮動工具列（複製/刪除/編輯圖表/更多） */}
            {floatBarStyle && (
              <div className="absolute z-[10001] flex items-center gap-0.5 rounded-lg shadow-lg px-1 py-1" style={{ ...floatBarStyle, backgroundColor: "var(--color-bg)", border: "1px solid var(--color-border)" }} onMouseDown={(e) => e.stopPropagation()}>
                {singleSelected && <button onClick={() => handleDuplicateBlock(singleSelected.id)} className="px-2 py-1 text-[11px] rounded hover:bg-zinc-100" title="複製">⧉</button>}
                {singleSelected?.type === "chart" && (
                  <button onClick={() => setChartEditOpen((v) => !v)} className={`px-2 py-1 text-[11px] rounded ${chartEditOpen ? "bg-zinc-200" : "hover:bg-zinc-100"}`} title="編輯圖表（如 Gamma）">📊 編輯圖表</button>
                )}
                <button onClick={() => handleDeleteBlocks(selectedIds)} className="px-2 py-1 text-[11px] rounded hover:bg-red-50 text-red-600" title="刪除">🗑</button>
                <div className="relative">
                  <button onClick={() => setMoreMenuFor(moreMenuFor ? null : "open")} className="px-2 py-1 text-[11px] rounded hover:bg-zinc-100" title="更多">⋯</button>
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

            {/* 圖表編輯面板（Gamma 風格浮動卡片） */}
            {chartEditOpen && singleSelected?.type === "chart" && singleSelected.chart && (
              <div className="absolute z-[10002] rounded-xl shadow-2xl p-3" style={{ top: "8px", right: "8px", width: 280, maxHeight: "84%", overflowY: "auto", backgroundColor: "var(--color-bg)", border: "1px solid var(--color-border)" }} onMouseDown={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold">編輯圖表</span>
                  <button onClick={() => setChartEditOpen(false)} className="text-xs opacity-60 hover:opacity-100">✕</button>
                </div>
                <div className="mb-2"><div className="text-[10px] opacity-60 mb-1">類型</div><ChartTypeMenu chart={singleSelected.chart} onChange={(c) => updateBlock(singleSelected.id, { chart: c })} /></div>
                <div className="mb-2 rounded p-1.5" style={{ background: "var(--color-sidebar-bg)" }}>{singleSelected.chart ? <ChartRenderer chart={singleSelected.chart} width={248} height={110} /> : null}</div>
                <div className="text-[10px] opacity-60 mb-1">資料</div>
                {(singleSelected.chart.data || []).map((d, i) => (
                  <div key={i} className="flex gap-1 mb-1">
                    <input value={d.label} onChange={(e) => { const nd = [...(singleSelected.chart?.data || [])]; nd[i] = { ...nd[i], label: e.target.value }; updateBlock(singleSelected.id, { chart: { ...singleSelected.chart!, data: nd } as any }); }} className="flex-1 border rounded px-1 py-0.5 text-[11px]" placeholder="標籤" />
                    <input value={d.series || ""} onChange={(e) => { const nd = [...(singleSelected.chart?.data || [])]; nd[i] = { ...nd[i], series: e.target.value }; updateBlock(singleSelected.id, { chart: { ...singleSelected.chart!, data: nd } as any }); }} className="w-12 border rounded px-1 py-0.5 text-[10px]" placeholder="系列" />
                    <input type="number" value={d.value} onChange={(e) => { const nd = [...(singleSelected.chart?.data || [])]; nd[i] = { ...nd[i], value: Number(e.target.value) }; updateBlock(singleSelected.id, { chart: { ...singleSelected.chart!, data: nd } as any }); }} className="w-14 border rounded px-1 py-0.5 text-[11px]" />
                    <button onClick={() => { const nd = (singleSelected.chart?.data || []).filter((_, idx) => idx !== i); updateBlock(singleSelected.id, { chart: { ...singleSelected.chart!, data: nd } as any }); }} className="text-[10px] px-1">×</button>
                  </div>
                ))}
                <button onClick={() => { const nd = [...(singleSelected.chart?.data || []), { label: "新", value: 10 }]; updateBlock(singleSelected.id, { chart: { ...singleSelected.chart!, data: nd } as any }); }} className="w-full text-[11px] border rounded py-1 hover:bg-zinc-100">+ 資料列</button>
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
        <div className="w-[260px] shrink-0 border-l flex flex-col overflow-hidden" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-sidebar-bg)" }}>
          <div className="px-3 py-2 text-[10px] font-semibold uppercase opacity-50 border-b" style={{ borderColor: "var(--color-border)" }}>圖層</div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {[...(activeSlide?.blocks || [])].sort((a, b) => b.z - a.z).map((block) => (
              <div key={block.id} onClick={(e) => { if (e.ctrlKey || e.metaKey) setSelectedIds((p) => p.includes(block.id) ? p.filter((id) => id !== block.id) : [...p, block.id]); else setSelectedIds([block.id]); }} className={`flex items-center gap-2 p-2 rounded cursor-pointer text-xs ${selectedIds.includes(block.id) ? "bg-white border border-blue-300 shadow-sm" : "hover:bg-white/60 border border-transparent"}`}>
                <span>{block.type === "text" ? "📝" : block.type === "chart" ? "📊" : block.type === "shape" ? "⬜" : "🖼️"}</span>
                <span className="flex-1 truncate">{block.text?.slice(0, 18) || (block.type === "text" ? "(空文字)" : block.type)}</span>
                <span className="text-[9px] opacity-40">z{block.z}</span>
              </div>
            ))}
            {(!activeSlide?.blocks || activeSlide.blocks.length === 0) && <div className="text-xs opacity-40 p-2">尚無圖層</div>}
          </div>
          {singleSelected && (
            <div className="p-3 border-t space-y-3 overflow-y-auto max-h-[45%]" style={{ borderColor: "var(--color-border)" }}>
              <div className="text-xs font-semibold opacity-60 uppercase">屬性</div>
              <div className="flex gap-1">
                <button onClick={() => handleZOrder(singleSelected.id, "front")} className="flex-1 text-[11px] border rounded px-2 py-1 hover:bg-white">置頂</button>
                <button onClick={() => handleZOrder(singleSelected.id, "back")} className="flex-1 text-[11px] border rounded px-2 py-1 hover:bg-white">置底</button>
                <button onClick={() => handleDuplicateBlock(singleSelected.id)} className="flex-1 text-[11px] border rounded px-2 py-1 hover:bg-white">複製</button>
              </div>
              {singleSelected.type === "text" && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1">
                    <button onClick={() => updateBlock(singleSelected.id, { style: { ...singleSelected.style, bold: !singleSelected.style?.bold } })} className={`px-2 py-1 rounded border text-xs ${singleSelected.style?.bold ? "bg-zinc-800 text-white" : "bg-white"}`} style={{ fontWeight: 700 }}>B</button>
                    <select value={singleSelected.style?.textAlign || "left"} onChange={(e) => updateBlock(singleSelected.id, { style: { ...singleSelected.style, textAlign: e.target.value as any } })} className="flex-1 border rounded px-1 py-1 text-xs"><option value="left">靠左</option><option value="center">置中</option><option value="right">靠右</option></select>
                  </div>
                  <div className="flex items-center gap-1"><span className="text-[10px] opacity-60">字級</span><input type="range" min={10} max={48} value={singleSelected.style?.fontSize || 16} onChange={(e) => updateBlock(singleSelected.id, { style: { ...singleSelected.style, fontSize: Number(e.target.value) } })} className="flex-1" /><span className="text-[10px] w-6">{singleSelected.style?.fontSize || 16}</span></div>
                  <div className="flex items-center gap-1"><span className="text-[10px] opacity-60">旋轉</span><input type="number" value={Math.round(singleSelected.rotation || 0)} onChange={(e) => updateBlock(singleSelected.id, { rotation: Number(e.target.value) })} className="w-16 border rounded px-1 py-0.5 text-xs" /><span className="text-[10px] opacity-60">°</span></div>
                  <button onClick={() => setEditingBlockId(singleSelected.id)} className="w-full border rounded px-2 py-1.5 text-xs hover:bg-white">✏️ 編輯文字</button>
                </div>
              )}
              {singleSelected.type === "chart" && (
                <button onClick={() => setChartEditOpen(true)} className="w-full border rounded px-2 py-1.5 text-xs hover:bg-white">📊 編輯圖表資料</button>
              )}
              {singleSelected.type === "shape" && (
                <div className="space-y-2"><div className="text-[11px] opacity-60">背景色</div><input type="color" value={singleSelected.style?.background || "#e0e7ff"} onChange={(e) => updateBlock(singleSelected.id, { style: { ...singleSelected.style, background: e.target.value } })} className="w-full h-8 rounded border" /></div>
              )}
            </div>
          )}
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

      {/* 備註列 */}
      <div className="shrink-0 border-t p-3 flex gap-2 items-start" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-sidebar-bg)" }}>
        <span className="text-xs opacity-60 mt-1">📝 備註</span>
        <input value={activeSlide?.notes || ""} onChange={(e) => activeSlide && updateActiveSlide({ notes: e.target.value })} placeholder="講者備註，觀眾看不到..." className="flex-1 bg-transparent outline-none text-sm" />
      </div>
    </main>
  );
}
