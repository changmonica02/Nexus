"use client";
import type { CharacterSection, CharacterStatisticItem } from "../lib/types";

export default function CharacterStatistics({
  section,
  editing,
  onChange,
}: {
  section: CharacterSection;
  editing: boolean;
  onChange: (patch: Partial<CharacterSection>) => void;
}) {
  const rows = section.statistics || [];

  const update = (index: number, patch: Partial<CharacterStatisticItem>) =>
    onChange({
      statistics: rows.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    });

  // 計算合計
  const totalCount = rows.reduce((sum, row) => {
    const c = row.count !== undefined ? row.count : (row.value !== undefined ? row.value : 0);
    return sum + (Number(c) || 0);
  }, 0);

  const totalWeight = rows.reduce((sum, row) => {
    const c = row.count !== undefined ? row.count : (row.value !== undefined ? row.value : 0);
    const w = row.unitWeight !== undefined ? row.unitWeight : 0;
    return sum + ((Number(c) || 0) * (Number(w) || 0));
  }, 0);

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[540px] text-left text-xs border-collapse">
        <thead>
          <tr className="border-b" style={{ borderColor: "var(--color-border)" }}>
            <th className="p-2 font-semibold w-1/4">項目</th>
            <th className="p-2 font-semibold w-1/3">介紹</th>
            <th className="p-2 font-semibold w-16 text-right">數量</th>
            <th className="p-2 font-semibold w-20 text-right">重量</th>
            <th className="p-2 font-semibold w-20 text-right">總重</th>
            {editing && <th className="w-8"><span className="sr-only">刪除</span></th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const count = row.count !== undefined ? row.count : (row.value !== undefined ? row.value : 0);
            const unitWeight = row.unitWeight !== undefined ? row.unitWeight : 0;
            const itemTotalWeight = Math.round((Number(count) * Number(unitWeight)) * 100) / 100;

            return (
              <tr key={index} className="border-t" style={{ borderColor: "var(--color-border)" }}>
                <td className="p-2">
                  {editing ? (
                    <input
                      aria-label={`項目 ${index + 1}`}
                      value={row.label}
                      placeholder={section.example?.statistics?.[index]?.label || "名稱"}
                      onChange={(event) => update(index, { label: event.target.value })}
                      className="w-full bg-transparent outline-none border-b border-dashed border-zinc-400 focus:border-blue-500"
                    />
                  ) : (
                    row.label || "—"
                  )}
                </td>
                <td className="p-2">
                  {editing ? (
                    <textarea
                      aria-label={`介紹 ${index + 1}`}
                      value={row.description}
                      placeholder={section.example?.statistics?.[index]?.description || "說明與特點"}
                      rows={2}
                      onChange={(event) => update(index, { description: event.target.value })}
                      className="w-full resize-y bg-transparent outline-none border-b border-dashed border-zinc-400 focus:border-blue-500"
                    />
                  ) : (
                    <p className="whitespace-pre-wrap">{row.description || "—"}</p>
                  )}
                </td>
                <td className="p-2 text-right">
                  {editing ? (
                    <input
                      aria-label={`數量 ${index + 1}`}
                      type="number"
                      step="any"
                      value={count}
                      onChange={(event) => update(index, { count: Number(event.target.value) || 0, value: Number(event.target.value) || 0 })}
                      className="w-16 text-right bg-transparent outline-none border-b border-dashed border-zinc-400 focus:border-blue-500"
                    />
                  ) : (
                    count
                  )}
                </td>
                <td className="p-2 text-right">
                  {editing ? (
                    <input
                      aria-label={`重量 ${index + 1}`}
                      type="number"
                      step="any"
                      value={unitWeight}
                      onChange={(event) => update(index, { unitWeight: Number(event.target.value) || 0 })}
                      className="w-16 text-right bg-transparent outline-none border-b border-dashed border-zinc-400 focus:border-blue-500"
                    />
                  ) : (
                    unitWeight
                  )}
                </td>
                <td className="p-2 text-right font-medium text-blue-600 dark:text-blue-400">
                  {itemTotalWeight}
                </td>
                {editing && (
                  <td className="p-2 text-center">
                    <button
                      aria-label={`刪除項目 ${index + 1}`}
                      onClick={() => onChange({ statistics: rows.filter((_, i) => i !== index) })}
                      className="text-red-500 hover:opacity-100 opacity-60 text-sm font-bold"
                    >
                      ×
                    </button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* 底部合計分割線與統計 */}
      <div className="mt-3 pt-2 border-t flex flex-wrap items-center justify-between gap-4 text-xs font-semibold" style={{ borderColor: "var(--color-border)" }}>
        <div className="opacity-60 select-none">—————（合計）</div>
        <div className="flex items-center gap-6">
          <div>
            <span className="opacity-60 mr-1.5">總數量:</span>
            <span className="font-bold font-mono text-sm">{totalCount}</span>
          </div>
          <div>
            <span className="opacity-60 mr-1.5">總重量:</span>
            <span className="font-bold font-mono text-sm text-blue-600 dark:text-blue-400">
              {Math.round(totalWeight * 100) / 100}
            </span>
          </div>
        </div>
      </div>

      {editing && (
        <button
          onClick={() =>
            onChange({
              statistics: [
                ...rows,
                { label: "", description: "", count: 1, unitWeight: 0, value: 1 },
              ],
            })
          }
          className="mt-3 text-xs text-blue-600 font-semibold hover:underline block"
        >
          ＋ 新增項目
        </button>
      )}
    </div>
  );
}
