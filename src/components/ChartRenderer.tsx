"use client";
import type { ChartData } from "../lib/types";

export default function ChartRenderer({ chart, width = 300, height = 160 }: { chart: ChartData; width?: number; height?: number }) {
  const data = chart.data || [];
  if (data.length === 0) return <div className="text-xs opacity-50">無資料</div>;

  const isHorizontal = chart.orientation === "horizontal";
  const type = chart.type;
  const variant = chart.variant || "single";

  // Helpers
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

  // Grouped data helper
  const groupByLabel = () => {
    const map = new Map<string, { label: string; values: { series: string; value: number }[] }>();
    data.forEach((d) => {
      const label = d.label;
      if (!map.has(label)) map.set(label, { label, values: [] });
      map.get(label)!.values.push({ series: d.series || "預設", value: d.value });
    });
    return Array.from(map.values());
  };

  // --- BAR CHARTS ---
  if (type === "bar") {
    if (variant === "grouped") {
      const groups = groupByLabel();
      const seriesSet = Array.from(new Set(data.map((d) => d.series || "預設")));
      return (
        <div className="w-full" style={{ height }}>
          <div className={`flex ${isHorizontal ? "flex-col" : "flex-row"} items-end gap-2 h-full`}>
            {groups.map((g, gi) => (
              <div key={gi} className={`flex ${isHorizontal ? "flex-col" : "flex-row"} gap-1 flex-1`}>
                {g.values.map((v, vi) => (
                  <div key={vi} className="flex flex-col items-center gap-1 flex-1">
                    <div className="w-full rounded-t" style={{ backgroundColor: colors[vi % colors.length], height: isHorizontal ? "12px" : `${Math.max(6, (v.value / maxValue) * (height - 40))}px`, width: isHorizontal ? `${Math.max(6, (v.value / maxValue) * 100)}%` : "100%" }} title={`${v.series}: ${v.value}`} />
                    {!isHorizontal && <span className="text-[8px] truncate">{g.label}</span>}
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-1 flex-wrap">
            {Array.from(new Set(data.map((d) => d.series || "預設"))).map((s, i) => (
              <span key={s} className="text-[9px] flex items-center gap-1"><span className="w-2 h-2 rounded" style={{ backgroundColor: colors[i % colors.length] }} />{s}</span>
            ))}
          </div>
        </div>
      );
    }
    if (variant === "stacked" || variant === "stacked-percent") {
      const groups = groupByLabel();
      return (
        <div className="w-full flex flex-col gap-2" style={{ height }}>
          {groups.map((g, gi) => {
            const total = g.values.reduce((sum, v) => sum + v.value, 0);
            return (
              <div key={gi} className="flex items-center gap-2">
                <span className="text-[10px] w-12 truncate">{g.label}</span>
                <div className={`flex ${isHorizontal ? "flex-row" : "flex-row"} flex-1 h-4 rounded overflow-hidden border`}>
                  {g.values.map((v, vi) => {
                    const percent = variant === "stacked-percent" ? (total ? (v.value / total) * 100 : 0) : (v.value / maxValue) * 100;
                    const widthPercent = variant === "stacked-percent" ? percent : (v.value / Math.max(...groups.map((gg) => gg.values.reduce((s, vv) => s + vv.value, 0)), 1)) * 100;
                    return <div key={vi} style={{ width: `${widthPercent}%`, backgroundColor: colors[vi % colors.length] }} title={`${v.series}: ${v.value}${variant === "stacked-percent" ? ` (${percent.toFixed(1)}%)` : ""}`} />;
                  })}
                </div>
                <span className="text-[9px] opacity-60">{variant === "stacked-percent" ? "100%" : total}</span>
              </div>
            );
          })}
        </div>
      );
    }
    // single / category
    return (
      <div className={`w-full flex ${isHorizontal ? "flex-col" : "flex-row items-end"} gap-2`} style={{ height }}>
        {data.map((d, i) => (
          <div key={i} className={`flex ${isHorizontal ? "flex-row items-center" : "flex-col items-center"} gap-1 flex-1`}>
            {isHorizontal ? (
              <>
                <span className="text-[10px] w-12 truncate text-right">{d.label}</span>
                <div className="h-4 rounded" style={{ width: `${Math.max(4, (d.value / maxValue) * 100)}%`, backgroundColor: colors[i % colors.length] }} title={`${d.value}`} />
                <span className="text-[9px] opacity-60">{d.value}</span>
              </>
            ) : (
              <>
                <div className="w-full rounded-t" style={{ height: `${Math.max(6, (d.value / maxValue) * (height - 30))}px`, backgroundColor: colors[i % colors.length] }} title={`${d.value}`} />
                <span className="text-[9px] truncate max-w-full">{d.label}</span>
              </>
            )}
          </div>
        ))}
      </div>
    );
  }

  // --- LINE CHART ---
  if (type === "line") {
    const points = data.map((d, i) => {
      const x = (i / Math.max(data.length - 1, 1)) * (width - 40) + 20;
      const y = height - 30 - (d.value / maxValue) * (height - 50);
      return `${x},${y}`;
    }).join(" ");
    return (
      <svg width={width} height={height} className="overflow-visible">
        <polyline fill="none" stroke="#3b82f6" strokeWidth="2" points={points} />
        {data.map((d, i) => {
          const x = (i / Math.max(data.length - 1, 1)) * (width - 40) + 20;
          const y = height - 30 - (d.value / maxValue) * (height - 50);
          return <circle key={i} cx={x} cy={y} r={3} fill="#3b82f6" />;
        })}
      </svg>
    );
  }

  // --- PIE / DONUT ---
  if (type === "pie" || type === "donut") {
    const total = data.reduce((s, d) => s + d.value, 0) || 1;
    const segments = data.reduce<{ datum: typeof data[number]; index: number; startAngle: number; endAngle: number }[]>((items, datum, index) => {
      const startAngle = items[index - 1]?.endAngle || 0;
      const endAngle = startAngle + (datum.value / total) * 360;
      items.push({ datum, index, startAngle, endAngle });
      return items;
    }, []);
    const cx = width / 2;
    const cy = height / 2;
    const r = Math.min(width, height) / 2 - 10;
    const innerR = type === "donut" ? r * 0.5 : 0;

    return (
      <div className="flex items-center gap-3">
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
          {segments.map(({ datum: d, index: i, startAngle, endAngle }) => {
            const angle = endAngle - startAngle;
            const largeArc = angle > 180 ? 1 : 0;
            const x1 = cx + r * Math.cos((Math.PI * startAngle) / 180);
            const y1 = cy + r * Math.sin((Math.PI * startAngle) / 180);
            const x2 = cx + r * Math.cos((Math.PI * endAngle) / 180);
            const y2 = cy + r * Math.sin((Math.PI * endAngle) / 180);
            const x3 = cx + innerR * Math.cos((Math.PI * endAngle) / 180);
            const y3 = cy + innerR * Math.sin((Math.PI * endAngle) / 180);
            const x4 = cx + innerR * Math.cos((Math.PI * startAngle) / 180);
            const y4 = cy + innerR * Math.sin((Math.PI * startAngle) / 180);
            const path = innerR > 0
              ? `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerR} ${innerR} 0 ${largeArc} 0 ${x4} ${y4} Z`
              : `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
            return <path key={i} d={path} fill={colors[i % colors.length]} stroke="white" strokeWidth={1} />;
          })}
        </svg>
        <div className="flex flex-col gap-1">
          {data.map((d, i) => (
            <span key={i} className="text-[10px] flex items-center gap-1"><span className="w-2 h-2 rounded" style={{ backgroundColor: colors[i % colors.length] }} />{d.label}: {d.value}</span>
          ))}
        </div>
      </div>
    );
  }

  // --- PYRAMID ---
  if (type === "pyramid") {
    return (
      <div className="w-full flex flex-col items-center gap-1" style={{ height }}>
        {data.map((d, i) => {
          const wPercent = 100 - (i / data.length) * 60;
          return (
            <div key={i} className="flex items-center justify-center text-white text-[10px] transition-all" style={{ width: `${wPercent}%`, height: `${height / data.length - 4}px`, backgroundColor: colors[i % colors.length], clipPath: "polygon(10% 0, 90% 0, 100% 100%, 0% 100%)" }} title={`${d.label}: ${d.value}`}>
              {d.label}
            </div>
          );
        })}
      </div>
    );
  }

  // --- GANTT ---
  if (type === "gantt") {
    const maxEnd = Math.max(...data.map((d) => d.end || d.value), 1);
    return (
      <div className="w-full space-y-2" style={{ height }}>
        {data.map((d, i) => {
          const start = d.start || 0;
          const end = d.end || d.value;
          const left = (start / maxEnd) * 100;
          const widthBar = ((end - start) / maxEnd) * 100;
          return (
            <div key={i} className="flex items-center gap-2 text-[10px]">
              <span className="w-16 truncate">{d.label}</span>
              <div className="flex-1 h-4 bg-zinc-100 rounded relative overflow-hidden">
                <div className="absolute h-full rounded" style={{ left: `${left}%`, width: `${widthBar}%`, backgroundColor: colors[i % colors.length] }} />
              </div>
              <span className="opacity-60">{d.start}→{d.end}</span>
            </div>
          );
        })}
      </div>
    );
  }

  // --- RADAR ---
  if (type === "radar") {
    const cx = width / 2;
    const cy = height / 2;
    const r = Math.min(width, height) / 2 - 20;
    const angleStep = (2 * Math.PI) / data.length;
    const points = data.map((d, i) => {
      const angle = i * angleStep - Math.PI / 2;
      const dist = (d.value / maxValue) * r;
      const x = cx + dist * Math.cos(angle);
      const y = cy + dist * Math.sin(angle);
      return `${x},${y}`;
    }).join(" ");
    return (
      <svg width={width} height={height}>
        {/* Grid */}
        {[0.25, 0.5, 0.75, 1].map((scale, idx) => (
          <polygon key={idx} points={data.map((_, i) => {
            const angle = i * angleStep - Math.PI / 2;
            const x = cx + r * scale * Math.cos(angle);
            const y = cy + r * scale * Math.sin(angle);
            return `${x},${y}`;
          }).join(" ")} fill="none" stroke="#e5e7eb" strokeWidth={0.5} />
        ))}
        {/* Axes */}
        {data.map((_, i) => {
          const angle = i * angleStep - Math.PI / 2;
          const x = cx + r * Math.cos(angle);
          const y = cy + r * Math.sin(angle);
          return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#e5e7eb" strokeWidth={0.5} />;
        })}
        <polygon points={points} fill="rgba(59,130,246,0.3)" stroke="#3b82f6" strokeWidth={2} />
        {data.map((d, i) => {
          const angle = i * angleStep - Math.PI / 2;
          const x = cx + (r + 12) * Math.cos(angle);
          const y = cy + (r + 12) * Math.sin(angle);
          return <text key={i} x={x} y={y} fontSize={9} textAnchor="middle" dominantBaseline="middle">{d.label}</text>;
        })}
      </svg>
    );
  }

  // --- TIMELINE (文字圖表：時間軸) ---
  if (type === "timeline") {
    return (
      <div className="w-full flex flex-col gap-2 relative" style={{ height }}>
        <div className="absolute left-3 top-0 bottom-0 w-px bg-zinc-300" />
        {data.map((d, i) => (
          <div key={i} className="flex gap-3 items-start relative">
            <div className="w-6 h-6 rounded-full bg-blue-500 border-2 border-white shadow flex items-center justify-center text-[8px] text-white shrink-0 z-10">{i+1}</div>
            <div className="flex-1 bg-white border rounded p-2 shadow-sm">
              <div className="text-xs font-medium">{d.label}</div>
              <div className="text-[10px] opacity-60">{d.value ? `值：${d.value}` : ""} {d.series || ""}</div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // --- TEXT COLUMNS ---
  if (type === "text-columns") {
    const mid = Math.ceil(data.length / 2);
    const left = data.slice(0, mid);
    const right = data.slice(mid);
    return (
      <div className="w-full grid grid-cols-2 gap-3 text-xs" style={{ height }}>
        <div className="space-y-2">
          {left.map((d, i) => (
            <div key={i} className="border rounded p-2 bg-white">
              <div className="font-medium">{d.label}</div>
              <div className="opacity-60 text-[10px]">{d.value} {d.series || ""}</div>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          {right.map((d, i) => (
            <div key={i} className="border rounded p-2 bg-white">
              <div className="font-medium">{d.label}</div>
              <div className="opacity-60 text-[10px]">{d.value} {d.series || ""}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // --- TEXT LIST / QUOTE ---
  if (type === "text-list" || type === "text-quote") {
    return (
      <div className="w-full space-y-2" style={{ height }}>
        {data.map((d, i) => (
          <div key={i} className={`border rounded p-2 ${type === "text-quote" ? "bg-amber-50 border-amber-200 italic" : "bg-white"}`}>
            <div className="text-xs font-medium flex items-center gap-2"><span>{type === "text-quote" ? "❝" : "•"}</span>{d.label}</div>
            <div className="text-[10px] opacity-60 mt-1">{d.value ? `— ${d.value}` : ""} {d.series || ""}</div>
          </div>
        ))}
      </div>
    );
  }

  return <div className="text-xs opacity-50">未支援的圖表類型: {type}</div>;
}
