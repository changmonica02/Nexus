"use client";
import { useState, useMemo, useRef, useEffect } from "react";
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

function genId() { return `blk_${Math.random().toString(36).slice(2,9)}`; }

export default function PresentationView({
  page,
  onTitleChange,
  onUpdatePresentation,
}: {
  page: Page;
  onTitleChange: (title: string) => void;
  onUpdatePresentation: (data: PresentationData) => void;
}) {
  const data = page.presentation_data || { theme: "minimal", slides: [] } as PresentationData;
  const slides = data.slides || [];
  const [activeSlideId, setActiveSlideId] = useState<string>(slides[0]?.id || "");
  const activeSlide = useMemo(() => slides.find((s) => s.id === activeSlideId) || slides[0] || null, [slides, activeSlideId]);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const updateSlides = (newSlides: Slide[]) => {
    onUpdatePresentation({ ...data, slides: newSlides });
  };

  const updateActiveSlide = (patch: Partial<Slide>) => {
    if (!activeSlide) return;
    const newSlides = slides.map((s) => (s.id === activeSlide.id ? { ...s, ...patch } : s));
    updateSlides(newSlides);
  };

  const updateBlock = (blockId: string, patch: Partial<PresentationBlock>) => {
    if (!activeSlide) return;
    const newBlocks = (activeSlide.blocks || []).map((b) => (b.id === blockId ? { ...b, ...patch } : b));
    updateActiveSlide({ blocks: newBlocks });
  };

  const handleAddSlide = (layout: SlideLayout = "title_content") => {
    const newSlide = createSlide(layout);
    const idx = slides.findIndex((s) => s.id === activeSlideId);
    const newSlides = [...slides];
    newSlides.splice(idx + 1, 0, newSlide);
    updateSlides(newSlides);
    setActiveSlideId(newSlide.id);
  };

  const handleAddTextBlock = () => {
    if (!activeSlide) return;
    const newBlock: PresentationBlock = {
      id: genId(),
      type: "text",
      x: 10 + Math.random()*20,
      y: 20 + Math.random()*30,
      w: 40,
      h: 12,
      z: (activeSlide.blocks?.length || 0) + 10,
      text: "文字區塊，雙擊編輯",
      style: { fontSize: 16 },
    };
    updateActiveSlide({ blocks: [...(activeSlide.blocks || []), newBlock] });
    setSelectedBlockId(newBlock.id);
  };

  const handleDeleteBlock = (id: string) => {
    if (!activeSlide) return;
    updateActiveSlide({ blocks: (activeSlide.blocks || []).filter((b) => b.id !== id) });
    setSelectedBlockId(null);
  };

  const handleBringFront = (id: string) => {
    if (!activeSlide) return;
    const blocks = [...(activeSlide.blocks || [])];
    const maxZ = Math.max(...blocks.map((b) => b.z), 0);
    updateBlock(id, { z: maxZ + 1 });
  };

  const handleSendBack = (id: string) => {
    if (!activeSlide) return;
    const blocks = [...(activeSlide.blocks || [])];
    const minZ = Math.min(...blocks.map((b) => b.z), 0);
    updateBlock(id, { z: minZ - 1 });
  };

  // Drag handling
  useEffect(() => {
    if (!dragState) return;
    const onMouseMove = (e: MouseEvent) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left - dragState.offsetX) / rect.width) * 100;
      const y = ((e.clientY - rect.top - dragState.offsetY) / rect.height) * 100;
      updateBlock(dragState.id, { x: Math.max(0, Math.min(85, x)), y: Math.max(0, Math.min(85, y)) });
    };
    const onMouseUp = () => setDragState(null);
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, [dragState, activeSlide]);

  if (!page.presentation_data) {
    return <div className="flex-1 flex items-center justify-center">簡報資料載入中...</div>;
  }

  const sortedBlocks = [...(activeSlide?.blocks || [])].sort((a, b) => a.z - b.z);
  const selectedBlock = activeSlide?.blocks?.find((b) => b.id === selectedBlockId) || null;

  return (
    <main className="flex flex-1 overflow-hidden" style={{ backgroundColor: "var(--color-editor-bg)" }}>
      {/* Left: Slide list */}
      <div className="w-[220px] shrink-0 flex flex-col border-r overflow-hidden" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-sidebar-bg)" }}>
        <div className="p-3 border-b flex items-center justify-between" style={{ borderColor: "var(--color-border)" }}>
          <input value={page.title} onChange={(e) => onTitleChange(e.target.value)} placeholder="簡報標題" className="flex-1 bg-transparent font-semibold outline-none text-sm" />
          <span className="text-[10px] opacity-50 ml-2">{slides.length} 張</span>
        </div>
        <div className="p-2">
          <button onClick={() => handleAddSlide("canvas")} className="w-full rounded-md bg-zinc-800 text-white text-xs py-2 hover:bg-zinc-700">+ 新增投影片</button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {slides.map((slide, idx) => (
            <div key={slide.id} onClick={() => setActiveSlideId(slide.id)} className={`group relative rounded-lg border p-2 cursor-pointer ${activeSlideId === slide.id ? "bg-white border-blue-400 shadow" : "bg-transparent hover:bg-white/60 border-transparent"}`}>
              <div className="flex items-center justify-between mb-1"><span className="text-[10px] opacity-50">{idx + 1}</span><span className="text-[10px]">{LAYOUTS.find((l) => l.id === slide.layout)?.icon}</span></div>
              <div className="text-xs font-medium truncate">{slide.title || "未命名"}</div>
              <div className="text-[10px] opacity-60 mt-1">{slide.blocks?.length || 0} 個圖層</div>
            </div>
          ))}
        </div>
      </div>

      {/* Center: Canvas */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top toolbar */}
        <div className="shrink-0 flex items-center gap-1.5 px-3 py-2 border-b flex-wrap" style={{ borderColor: "var(--color-border)" }}>
          <button onClick={handleAddTextBlock} className="rounded px-3 py-1.5 text-xs bg-zinc-800 text-white hover:bg-zinc-700">+ 文字區塊</button>
          <button onClick={() => { if (!activeSlide) return; const b: PresentationBlock = { id: genId(), type: "chart", x: 10, y: 20, w: 45, h: 40, z: 10, chart: { type: "bar", variant: "single", orientation: "vertical", data: [{label:"A",value:30},{label:"B",value:50}] } }; updateActiveSlide({ blocks: [...(activeSlide.blocks||[]), b] }); }} className="rounded px-2.5 py-1.5 text-xs border hover:bg-zinc-100">📊 圖表</button>
          <button onClick={() => { if (!activeSlide) return; const b: PresentationBlock = { id: genId(), type: "shape", x: 20, y: 30, w: 30, h: 20, z: 5, style: { background: "#e0e7ff" } }; updateActiveSlide({ blocks: [...(activeSlide.blocks||[]), b] }); }} className="rounded px-2.5 py-1.5 text-xs border hover:bg-zinc-100">⬜ 形狀</button>
          <div className="h-4 w-px bg-zinc-300 mx-1" />
          <span className="text-xs opacity-60">版型:</span>
          {LAYOUTS.slice(0,4).map((l) => (
            <button key={l.id} onClick={() => activeSlide && updateActiveSlide({ layout: l.id })} className={`rounded px-2 py-1 text-xs border ${activeSlide?.layout === l.id ? "bg-zinc-800 text-white" : "hover:bg-zinc-100"}`}>{l.icon}</button>
          ))}
          <select value={data.theme} onChange={(e) => onUpdatePresentation({ ...data, theme: e.target.value as any })} className="ml-2 rounded border px-2 py-1 text-xs bg-transparent">
            <option value="minimal">Minimal</option><option value="academic">Academic</option><option value="business">Business</option><option value="dark">Dark</option>
          </select>
        </div>

        {/* Canvas area */}
        <div className="flex-1 overflow-auto p-8 flex justify-center items-start" style={{ backgroundColor: "#f5f5f4" }}>
          <div ref={canvasRef} className="relative w-full max-w-[960px] aspect-[16/9] bg-white rounded-xl shadow-xl overflow-hidden select-none" style={{ backgroundColor: data.theme === "dark" ? "#1e1e1e" : "white", color: data.theme === "dark" ? "white" : "black" }}>
            {/* Slide background */}
            <div className="absolute inset-0 p-2">
              {activeSlide?.title && <div className="text-[10px] opacity-30 absolute top-2 left-3">投影片 {slides.findIndex((s)=>s.id===activeSlideId)+1} / {slides.length} — {activeSlide.title}</div>}
            </div>

            {/* Blocks */}
            {sortedBlocks.map((block) => (
              <div
                key={block.id}
                onMouseDown={(e) => {
                  if (editingBlockId === block.id) return;
                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  setDragState({ id: block.id, offsetX: e.clientX - rect.left, offsetY: e.clientY - rect.top });
                  setSelectedBlockId(block.id);
                  e.stopPropagation();
                }}
                onDoubleClick={() => setEditingBlockId(block.id)}
                style={{
                  position: "absolute",
                  left: `${block.x}%`,
                  top: `${block.y}%`,
                  width: `${block.w}%`,
                  height: block.h ? `${block.h}%` : "auto",
                  zIndex: block.z,
                  background: block.style?.background || (selectedBlockId === block.id ? "rgba(59,130,246,0.08)" : "transparent"),
                  border: selectedBlockId === block.id ? "1px solid #3b82f6" : "1px solid transparent",
                  borderRadius: "4px",
                  padding: "4px",
                  cursor: dragState?.id === block.id ? "grabbing" : "grab",
                  fontSize: block.style?.fontSize ? `${block.style.fontSize}px` : "14px",
                  color: block.style?.color || "inherit",
                  textAlign: block.style?.textAlign || "left",
                }}
                className="group"
              >
                {block.type === "text" && (
                  editingBlockId === block.id ? (
                    <textarea
                      autoFocus
                      value={block.text || ""}
                      onChange={(e) => updateBlock(block.id, { text: e.target.value })}
                      onBlur={() => setEditingBlockId(null)}
                      onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) setEditingBlockId(null); }}
                      className="w-full h-full bg-transparent outline-none resize-none"
                      placeholder="輸入文字..."
                    />
                  ) : (
                    <div className="whitespace-pre-wrap break-words pointer-events-none">{block.text || "文字區塊"}</div>
                  )
                )}
                {block.type === "chart" && block.chart && (
                  <div className="w-full h-full overflow-hidden">
                    <ChartRenderer chart={block.chart} width={200} height={100} />
                  </div>
                )}
                {block.type === "shape" && <div className="w-full h-full" style={{ background: block.style?.background || "#e0e7ff" }} />}
                {block.type === "diagram" && <div className="text-[10px] font-mono p-1 bg-zinc-100 rounded">{block.diagramCode || "Mermaid"}</div>}

                {selectedBlockId === block.id && (
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteBlock(block.id); }} className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100">×</button>
                )}
              </div>
            ))}

            {/* Canvas empty hint */}
            {(!activeSlide?.blocks || activeSlide.blocks.length === 0) && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-sm opacity-30 text-center">點擊「+ 文字區塊」開始<br/>像 Canva 一樣拖曳移動</div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom: Notes (user liked this concept) */}
        <div className="shrink-0 border-t p-3 flex gap-2 items-start" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-sidebar-bg)" }}>
          <span className="text-xs opacity-60 mt-1">📝 備註</span>
          <input value={activeSlide?.notes || ""} onChange={(e) => activeSlide && updateActiveSlide({ notes: e.target.value })} placeholder="講者備註，觀眾看不到..." className="flex-1 bg-transparent outline-none text-sm" />
        </div>
      </div>

      {/* Right: Layers & Properties */}
      <div className="w-[260px] shrink-0 border-l flex flex-col overflow-hidden" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-sidebar-bg)" }}>
        <div className="p-3 border-b" style={{ borderColor: "var(--color-border)" }}>
          <div className="text-xs font-semibold opacity-60 uppercase">圖層</div>
          <div className="text-[10px] opacity-40 mt-1">拖曳改變圖層關係，像 Canva</div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {[...(activeSlide?.blocks || [])].sort((a,b) => b.z - a.z).map((block) => (
            <div key={block.id} onClick={() => setSelectedBlockId(block.id)} className={`flex items-center gap-2 p-2 rounded cursor-pointer text-xs ${selectedBlockId === block.id ? "bg-white border border-blue-300 shadow-sm" : "hover:bg-white/60 border border-transparent"}`}>
              <span>{block.type === "text" ? "📝" : block.type === "chart" ? "📊" : block.type === "image" ? "🖼️" : "⬜"}</span>
              <span className="flex-1 truncate">{block.text?.slice(0,20) || block.type}</span>
              <span className="text-[9px] opacity-40">z{block.z}</span>
            </div>
          ))}
          {(!activeSlide?.blocks || activeSlide.blocks.length === 0) && <div className="text-xs opacity-40 p-2">尚無圖層，點擊「+ 文字區塊」</div>}
        </div>
        {selectedBlock && (
          <div className="p-3 border-t space-y-3 overflow-y-auto" style={{ borderColor: "var(--color-border)" }}>
            <div className="text-xs font-semibold opacity-60 uppercase">屬性</div>
            <div className="flex gap-1">
              <button onClick={() => handleBringFront(selectedBlock.id)} className="flex-1 text-[11px] border rounded px-2 py-1 hover:bg-white">置頂</button>
              <button onClick={() => handleSendBack(selectedBlock.id)} className="flex-1 text-[11px] border rounded px-2 py-1 hover:bg-white">置底</button>
              <button onClick={() => handleDeleteBlock(selectedBlock.id)} className="flex-1 text-[11px] border rounded px-2 py-1 bg-red-50 text-red-600 hover:bg-red-100">刪除</button>
            </div>
            {selectedBlock.type === "text" && (
              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  <button onClick={() => updateBlock(selectedBlock.id, { style: { ...selectedBlock.style, bold: !selectedBlock.style?.bold } })} className={`px-2 py-1 rounded border text-xs ${selectedBlock.style?.bold ? "bg-zinc-800 text-white" : "bg-white"}`}>B</button>
                  <select value={selectedBlock.style?.textAlign || "left"} onChange={(e) => updateBlock(selectedBlock.id, { style: { ...selectedBlock.style, textAlign: e.target.value as any } })} className="flex-1 border rounded px-1 py-1 text-xs">
                    <option value="left">靠左</option><option value="center">置中</option><option value="right">靠右</option>
                  </select>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] opacity-60">字級</span>
                  <input type="range" min={10} max={48} value={selectedBlock.style?.fontSize || 16} onChange={(e) => updateBlock(selectedBlock.id, { style: { ...selectedBlock.style, fontSize: Number(e.target.value) } })} className="flex-1" />
                  <span className="text-[10px] w-6">{selectedBlock.style?.fontSize || 16}</span>
                </div>
                <button onClick={() => setEditingBlockId(selectedBlock.id)} className="w-full border rounded px-2 py-1.5 text-xs hover:bg-white">✏️ 編輯文字（雙擊也可）</button>
              </div>
            )}
            {selectedBlock.type === "chart" && (
              <div className="space-y-3">
                <div>
                  <div className="text-[11px] opacity-60 mb-1">圖表類型（點擊開合）</div>
                  <ChartTypeMenu chart={selectedBlock.chart} onChange={(newChart) => updateBlock(selectedBlock.id, { chart: newChart })} />
                </div>
                <div>
                  <div className="text-[11px] opacity-60 mb-1">即時預覽</div>
                  <div className="border rounded bg-white p-2">
                    {selectedBlock.chart ? <ChartRenderer chart={selectedBlock.chart} width={220} height={120} /> : <div className="text-xs opacity-40">無圖表</div>}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] opacity-60 mb-1">圖表資料（支援多數列 series）</div>
                  {(selectedBlock.chart?.data || []).map((d, i) => (
                    <div key={i} className="flex gap-1 mb-1">
                      <input value={d.label} onChange={(e) => { const newData = [...(selectedBlock.chart?.data||[])]; newData[i] = { ...newData[i], label: e.target.value }; updateBlock(selectedBlock.id, { chart: { ...selectedBlock.chart!, data: newData } as any }); }} className="flex-1 border rounded px-1 py-0.5 text-[11px]" placeholder="標籤" />
                      <input value={d.series || ""} onChange={(e) => { const newData = [...(selectedBlock.chart?.data||[])]; newData[i] = { ...newData[i], series: e.target.value }; updateBlock(selectedBlock.id, { chart: { ...selectedBlock.chart!, data: newData } as any }); }} className="w-12 border rounded px-1 py-0.5 text-[10px]" placeholder="系列" />
                      <input type="number" value={d.value} onChange={(e) => { const newData = [...(selectedBlock.chart?.data||[])]; newData[i] = { ...newData[i], value: Number(e.target.value)}; updateBlock(selectedBlock.id, { chart: { ...selectedBlock.chart!, data: newData } as any }); }} className="w-14 border rounded px-1 py-0.5 text-[11px]" />
                      <button onClick={() => { const newData = (selectedBlock.chart?.data||[]).filter((_, idx) => idx !== i); updateBlock(selectedBlock.id, { chart: { ...selectedBlock.chart!, data: newData } as any }); }} className="text-[10px] px-1">×</button>
                    </div>
                  ))}
                  <div className="flex gap-1 mt-1">
                    <button onClick={() => { const newData = [...(selectedBlock.chart?.data||[]), { label: "新", value: 10 }]; updateBlock(selectedBlock.id, { chart: { ...selectedBlock.chart!, data: newData } as any }); }} className="flex-1 text-[11px] border rounded py-1 hover:bg-white">+ 單筆</button>
                    <button onClick={() => { const newData = [...(selectedBlock.chart?.data||[]), { label: `類別${(selectedBlock.chart?.data.length||0)+1}`, value: 10, series: "A" }, { label: `類別${(selectedBlock.chart?.data.length||0)+1}`, value: 20, series: "B" }]; updateBlock(selectedBlock.id, { chart: { ...selectedBlock.chart!, data: newData } as any, variant: "grouped" } as any); }} className="flex-1 text-[11px] border rounded py-1 hover:bg-white">+ 群組範例</button>
                  </div>
                  <div className="text-[10px] opacity-50 mt-2">群組/堆疊需填系列欄位，例如 Q1 A 10，Q1 B 20 即為群組長條</div>
                </div>
                <div>
                  <div className="text-[11px] opacity-60 mb-1">甘特圖專用（start/end）</div>
                  <div className="text-[10px] opacity-50">若類型為甘特圖，請用 start/end，例如 任務A start 0 end 5</div>
                  {(selectedBlock.chart?.data || []).slice(0,3).map((d,i)=>(
                    <div key={i} className="flex gap-1 mb-1">
                      <input value={d.label} readOnly className="flex-1 border rounded px-1 py-0.5 text-[10px] bg-zinc-100" />
                      <input type="number" value={(d as any).start ?? 0} onChange={(e)=>{ const nd=[...(selectedBlock.chart?.data||[])]; const curr=nd[i] as any; nd[i]={ label: curr.label, value: curr.value, start: Number(e.target.value), end: curr.end || 5, series: curr.series } as any; updateBlock(selectedBlock.id, { chart: { ...selectedBlock.chart!, data: nd } as any }); }} className="w-10 border rounded px-1 py-0.5 text-[10px]" placeholder="start" />
                      <input type="number" value={(d as any).end ?? d.value} onChange={(e)=>{ const nd=[...(selectedBlock.chart?.data||[])]; const curr=nd[i] as any; nd[i]={ label: curr.label, value: curr.value, start: curr.start || 0, end: Number(e.target.value), series: curr.series } as any; updateBlock(selectedBlock.id, { chart: { ...selectedBlock.chart!, data: nd } as any }); }} className="w-10 border rounded px-1 py-0.5 text-[10px]" placeholder="end" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
