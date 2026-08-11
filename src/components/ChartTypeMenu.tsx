"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import type { ChartData, ChartBaseType, BarVariant, ChartOrientation } from "../lib/types";

const BAR_VARIANTS: { id: BarVariant; label: string; desc: string }[] = [
  { id: "single", label: "長條圖", desc: "單一數列" },
  { id: "category", label: "類別長條圖", desc: "依類別分色" },
  { id: "grouped", label: "群組長條圖", desc: "多數列並排" },
  { id: "stacked", label: "堆疊長條圖", desc: "多數列堆疊" },
  { id: "stacked-percent", label: "堆疊比例長條圖", desc: "100% 堆疊" },
];

const DATA_CHARTS: { id: ChartBaseType; label: string; icon: string }[] = [
  { id: "line", label: "折線圖", icon: "📈" },
  { id: "pie", label: "圓餅圖", icon: "🥧" },
  { id: "donut", label: "環狀圖", icon: "⭕" },
  { id: "gantt", label: "甘特圖", icon: "📅" },
  { id: "pyramid", label: "金字塔", icon: "🔺" },
  { id: "radar", label: "雷達圖", icon: "🕸️" },
];

const TEXT_CHARTS: { id: ChartBaseType; label: string; icon: string; desc: string }[] = [
  { id: "timeline", label: "時間軸", icon: "⏱️", desc: "時間序列文字方塊" },
  { id: "text-columns", label: "文字欄", icon: "📄", desc: "兩欄文字方塊" },
  { id: "text-list", label: "文字清單", icon: "📝", desc: "條列文字方塊" },
  { id: "text-quote", label: "引言卡", icon: "❝", desc: "重點文字方塊" },
];

export default function ChartTypeMenu({ chart, onChange }: { chart?: ChartData; onChange: (chart: ChartData) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isBarOpen, setIsBarOpen] = useState(true);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 340 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const currentType = chart?.type || "bar";
  const currentVariant = chart?.variant || "single";
  const currentOrientation = chart?.orientation || "vertical";

  const updatePos = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const w = 340;
    let left = rect.left;
    let top = rect.bottom + 6;
    if (left + w > window.innerWidth - 8) left = window.innerWidth - w - 8;
    if (top + 420 > window.innerHeight - 8) top = rect.top - 420 - 6;
    if (top < 8) top = 8;
    setPos({ top, left, width: w });
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    updatePos();
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (buttonRef.current && buttonRef.current.contains(target)) return;
      if (popupRef.current && popupRef.current.contains(target)) return;
      setIsOpen(false);
    };
    const onResize = () => updatePos();
    document.addEventListener("mousedown", handler);
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      document.removeEventListener("mousedown", handler);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [isOpen, updatePos]);

  const createChart = (type: ChartBaseType, variant?: BarVariant, orientation?: ChartOrientation) => {
    const baseData = chart?.data && chart.data.length > 0 ? chart.data : [
      { label: "A", value: 30 },
      { label: "B", value: 50 },
      { label: "C", value: 20 },
    ];
    const newChart: ChartData = {
      type,
      variant: variant || (type === "bar" ? "single" : undefined),
      orientation: orientation || (type === "bar" ? currentOrientation : undefined),
      data: baseData as any,
    };
    onChange(newChart);
  };

  const toggleOrientation = () => {
    if (!chart || chart.type !== "bar") return;
    const newOri: ChartOrientation = currentOrientation === "vertical" ? "horizontal" : "vertical";
    onChange({ ...chart, orientation: newOri });
  };

  const labelForCurrent = () => {
    if (currentType === "bar") {
      const v = BAR_VARIANTS.find((b) => b.id === currentVariant);
      return `${v?.label || "長條圖"} (${currentOrientation === "vertical" ? "直" : "橫"})`;
    }
    const allCharts = [...DATA_CHARTS, ...TEXT_CHARTS];
    const o = allCharts.find((c) => c.id === currentType);
    return o?.label || currentType;
  };

  return (
    <div>
      <button ref={buttonRef} onClick={() => setIsOpen((v) => !v)} className="w-full flex items-center justify-between rounded-md border px-3 py-2 text-sm bg-white hover:bg-zinc-50" style={{ borderColor: "var(--color-border)" }}>
        <span className="flex items-center gap-2"><span>📊</span><span>{labelForCurrent()}</span></span>
        <span className="text-[10px] opacity-50">{isOpen ? "▲" : "▼"}</span>
      </button>

      {mounted && isOpen && createPortal(
        <div
          ref={popupRef}
          className="rounded-xl overflow-hidden shadow-2xl z-[9999] max-h-[420px] overflow-y-auto"
          style={{
            position: "fixed",
            top: pos.top,
            left: pos.left,
            width: pos.width,
            backgroundColor: "var(--color-bg)",
            border: "1px solid var(--color-border)",
          }}
          onMouseDown={(e) => e.preventDefault()}
        >
          <div className="p-2">
            <button onClick={() => setIsBarOpen((v) => !v)} className="w-full flex items-center justify-between px-2 py-1.5 text-xs font-semibold uppercase tracking-wider opacity-60 hover:opacity-100">
              <span>長條圖（可一鍵轉直/橫）</span>
              <span>{isBarOpen ? "−" : "+"}</span>
            </button>
            {isBarOpen && (
              <div className="space-y-1 mt-1">
                {BAR_VARIANTS.map((v) => (
                  <button key={v.id} onClick={() => createChart("bar", v.id, currentOrientation)} className={`w-full text-left rounded-md px-2.5 py-2 text-xs flex items-center justify-between border ${currentType === "bar" && currentVariant === v.id ? "bg-zinc-800 text-white border-zinc-800" : "bg-transparent hover:bg-zinc-100 border-zinc-200"}`}>
                    <span>
                      <span className="block font-medium">{v.label}</span>
                      <span className="block text-[10px] opacity-60">{v.desc}</span>
                    </span>
                    {currentType === "bar" && currentVariant === v.id && <span>✓</span>}
                  </button>
                ))}
                <button onClick={toggleOrientation} className="w-full rounded-md px-2.5 py-1.5 text-xs bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 flex items-center justify-center gap-1">
                  <span>↕️ 一鍵轉為{currentOrientation === "vertical" ? "橫條" : "直條"}</span>
                  <span className="text-[10px]">({currentOrientation === "vertical" ? "目前直式" : "目前橫式"})</span>
                </button>
              </div>
            )}
          </div>

          <div className="border-t mx-2" style={{ borderColor: "var(--color-border)" }} />

          <div className="px-3 pt-2 pb-1 text-[10px] font-bold tracking-wider text-zinc-500 uppercase bg-zinc-50">數據圖表</div>
          <div className="p-2 grid grid-cols-2 gap-1">
            {DATA_CHARTS.map((c) => (
              <button key={c.id} onClick={() => createChart(c.id)} className={`rounded-md px-2.5 py-2 text-xs text-left border flex items-center gap-2 ${currentType === c.id ? "bg-zinc-800 text-white border-zinc-800" : "bg-transparent hover:bg-zinc-100 border-zinc-200"}`}>
                <span>{c.icon}</span>
                <span className="font-medium">{c.label}</span>
                {currentType === c.id && <span className="ml-auto">✓</span>}
              </button>
            ))}
          </div>

          <div className="border-t mx-2 my-1" style={{ borderColor: "var(--color-border)" }} />

          <div className="px-3 pt-2 pb-1 text-[10px] font-bold tracking-wider text-zinc-500 uppercase bg-amber-50">文字圖表</div>
          <div className="p-2 grid grid-cols-2 gap-1">
            {TEXT_CHARTS.map((c) => (
              <button key={c.id} onClick={() => createChart(c.id)} className={`rounded-md px-2.5 py-2 text-xs text-left border flex flex-col items-start gap-0.5 ${currentType === c.id ? "bg-amber-100 text-amber-900 border-amber-300" : "bg-transparent hover:bg-amber-50 border-zinc-200"}`}>
                <span className="flex items-center gap-1.5"><span>{c.icon}</span><span className="font-medium">{c.label}</span>{currentType === c.id && <span>✓</span>}</span>
                <span className="text-[9px] opacity-60">{c.desc}</span>
              </button>
            ))}
          </div>

          <div className="p-2 text-[10px] opacity-50 border-t" style={{ borderColor: "var(--color-border)" }}>
            數據圖表：長條圖直/橫一鍵切換，群組/堆疊需系列欄位。文字圖表：時間軸、文字欄等簡易文字方塊。
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

