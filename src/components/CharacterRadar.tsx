"use client";
import type { CharacterSection } from "../lib/types";

export default function CharacterRadar({ section, editing, onChange }: {
  section: CharacterSection; editing: boolean; onChange: (patch: Partial<CharacterSection>) => void;
}) {
  const stats = section.stats || [];
  const point = (index: number, ratio: number) => {
    const angle = index * Math.PI * 2 / stats.length - Math.PI / 2;
    return [160 + Math.cos(angle) * 102 * ratio, 160 + Math.sin(angle) * 102 * ratio];
  };
  return <div className="space-y-3">
    {stats.length >= 3 ? <svg viewBox="0 0 320 320" role="img" aria-label={`${section.title}：${stats.map((item) => `${item.label} ${item.value}/${item.max || 5}`).join("、")}`} className="mx-auto w-full max-w-80 overflow-visible">
      {[0.25, 0.5, 0.75, 1].map((ratio) => <polygon key={ratio} points={stats.map((_, index) => point(index, ratio).join(",")).join(" ")} fill="none" stroke="currentColor" opacity="0.18" />)}
      {stats.map((stat, index) => { const [x, y] = point(index, 1.24); const [endX, endY] = point(index, 1); return <g key={index}><line x1="160" y1="160" x2={endX} y2={endY} stroke="currentColor" opacity="0.18" /><text x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize="11" fill="currentColor">{stat.label}</text></g>; })}
      <polygon points={stats.map((stat, index) => point(index, Math.max(0, Math.min(1, stat.value / (stat.max || 5)))).join(",")).join(" ")} fill="#3b82f6" fillOpacity="0.25" stroke="#3b82f6" strokeWidth="2" />
    </svg> : <p className="text-xs opacity-60">新增至少三個維度以顯示雷達圖。</p>}
    {stats.map((stat, index) => <div key={index} className="flex flex-wrap items-center gap-2 text-xs">
      <input aria-label={`維度 ${index + 1} 名稱`} value={stat.label} disabled={!editing} onChange={(event) => onChange({ stats: stats.map((item, i) => i === index ? { ...item, label: event.target.value } : item) })} className="min-w-0 flex-1 rounded border bg-transparent p-2 disabled:border-0" />
      <input aria-label={`${stat.label}數值`} type="number" min={0} max={stat.max || 5} value={stat.value} disabled={!editing} onChange={(event) => onChange({ stats: stats.map((item, i) => i === index ? { ...item, value: Math.max(0, Math.min(item.max || 5, Number(event.target.value) || 0)) } : item) })} className="w-16 rounded border bg-transparent p-2 disabled:border-0" />
      <span>/</span><input aria-label={`${stat.label}上限`} type="number" min={1} value={stat.max || 5} disabled={!editing} onChange={(event) => { const max = Math.max(1, Number(event.target.value) || 1); onChange({ stats: stats.map((item, i) => i === index ? { ...item, max, value: Math.min(item.value, max) } : item) }); }} className="w-16 rounded border bg-transparent p-2 disabled:border-0" />
      {editing && <button aria-label={`刪除維度 ${stat.label}`} onClick={() => onChange({ stats: stats.filter((_, i) => i !== index) })}>×</button>}
    </div>)}
    {editing && <button onClick={() => onChange({ stats: [...stats, { label: "新維度", value: 0, max: 5 }] })} className="text-xs text-blue-600">＋ 新增維度</button>}
  </div>;
}
