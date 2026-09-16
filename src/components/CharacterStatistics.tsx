"use client";
import type { CharacterSection, CharacterStatisticItem } from "../lib/types";

const defaults = { label: "項目", description: "介紹", value: "統計", unit: "單位" };
export default function CharacterStatistics({ section, editing, onChange }: {
  section: CharacterSection; editing: boolean; onChange: (patch: Partial<CharacterSection>) => void;
}) {
  const headers = { ...defaults, ...section.statisticHeaders };
  const rows = section.statistics || [];
  const update = (index: number, patch: Partial<CharacterStatisticItem>) =>
    onChange({ statistics: rows.map((row, i) => i === index ? { ...row, ...patch } : row) });
  return <div className="overflow-x-auto">
    <table className="w-full min-w-[480px] text-left text-xs">
      <thead><tr>{(Object.keys(defaults) as Array<keyof typeof defaults>).map((key) => <th key={key} className="p-2 font-semibold">
        {editing ? <input aria-label={`統計${defaults[key]}欄標題`} value={headers[key]} onChange={(event) => onChange({ statisticHeaders: { ...headers, [key]: event.target.value } })} className="w-full min-w-0 border-b bg-transparent py-1" /> : headers[key]}
      </th>)}{editing && <th className="w-8"><span className="sr-only">刪除</span></th>}</tr></thead>
      <tbody>{rows.map((row, index) => <tr key={index} className="border-t" style={{ borderColor: "var(--color-border)" }}>
        <td className="w-1/4 p-2">{editing ? <input aria-label={`${headers.label} ${index + 1}`} value={row.label} placeholder={section.example?.statistics?.[index]?.label} onChange={(event) => update(index, { label: event.target.value })} className="w-full bg-transparent" /> : row.label || "—"}</td>
        <td className="w-1/2 p-2">{editing ? <textarea aria-label={`${headers.description} ${index + 1}`} value={row.description} placeholder={section.example?.statistics?.[index]?.description} rows={3} onChange={(event) => update(index, { description: event.target.value })} className="w-full resize-y bg-transparent" /> : <p className="whitespace-pre-wrap">{row.description || "—"}</p>}</td>
        <td className="p-2">{editing ? <input aria-label={`${headers.value} ${index + 1}`} type="number" step="any" value={row.value} onChange={(event) => update(index, { value: Number(event.target.value) || 0 })} className="w-20 bg-transparent" /> : row.value}</td>
        <td className="p-2">{editing ? <input aria-label={`${headers.unit} ${index + 1}`} value={row.unit || ""} onChange={(event) => update(index, { unit: event.target.value })} className="w-16 bg-transparent" /> : row.unit}</td>
        {editing && <td><button aria-label={`刪除統計項目 ${index + 1}`} onClick={() => onChange({ statistics: rows.filter((_, i) => i !== index) })}>×</button></td>}
      </tr>)}</tbody>
    </table>
    <div className="mt-3 text-right text-sm font-semibold">合計：{rows.reduce((sum, row) => sum + (Number(row.value) || 0), 0)}</div>
    {editing && <button onClick={() => onChange({ statistics: [...rows, { label: "", description: "", value: 0, unit: "" }] })} className="mt-2 text-xs text-blue-600">＋ 新增統計項目</button>}
  </div>;
}
