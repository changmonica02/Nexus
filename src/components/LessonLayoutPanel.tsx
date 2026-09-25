"use client";
import { LESSON_PRESETS, type LessonLayout, type LessonEntry } from "../lib/lessonDocument";

export default function LessonLayoutPanel({ layout, onChange, entries, onNavigate, paged }: {
  layout: LessonLayout; onChange: (layout: LessonLayout) => void;
  entries: LessonEntry[]; onNavigate: (id: string) => void; paged: boolean;
}) {
  return <details className="nexus-print-hide shrink-0 border-b px-4 py-2 text-sm" style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}>
    <summary className="cursor-pointer font-medium">講義排版與目錄</summary>
    <div className="max-h-[40dvh] overflow-auto pt-3">
      <div className="flex flex-wrap items-center gap-3">
        <label>整份樣式 <select aria-label="整份樣式" className="rounded border bg-transparent p-1" value={layout.preset} onChange={(event) => { const preset = event.target.value as LessonLayout["preset"]; onChange({ ...layout, preset, ...LESSON_PRESETS[preset] }); }}><option value="original">原有樣式</option><option value="textbook">課本</option><option value="handout">講義</option></select></label>
        <label>正文字級 <input aria-label="正文字級" className="w-16 rounded border bg-transparent p-1" type="number" min={12} max={24} value={layout.fontSize} onChange={(e) => { if (e.target.value) onChange({ ...layout, fontSize: Math.min(24, Math.max(12, Number(e.target.value))) }); }} /></label>
        <label>行距 <select aria-label="整份行距" className="rounded border bg-transparent p-1" value={layout.lineHeight} onChange={(e) => onChange({ ...layout, lineHeight: Number(e.target.value) })}>{[1.2, 1.4, 1.6, 1.7, 1.8, 1.9, 2, 2.2, 2.5].map((n) => <option key={n}>{n}</option>)}</select></label>
        <label>標題比例 <input aria-label="標題比例" className="w-20 rounded border bg-transparent p-1" type="number" min={0.8} max={1.5} step={0.05} value={layout.headingScale} onChange={(e) => { if (e.target.value) onChange({ ...layout, headingScale: Math.min(1.5, Math.max(0.8, Number(e.target.value))) }); }} /></label>
      </div>
      <div className="mt-3 flex flex-wrap gap-3">
        <label>頁首 <input aria-label="頁首" maxLength={120} className="max-w-full rounded border bg-transparent p-1" value={layout.header} onChange={(e) => onChange({ ...layout, header: e.target.value })} /></label>
        <label>頁尾 <input aria-label="頁尾" maxLength={120} className="max-w-full rounded border bg-transparent p-1" value={layout.footer} onChange={(e) => onChange({ ...layout, footer: e.target.value })} /></label>
        {paged && <label className="flex items-center gap-1"><input type="checkbox" checked={layout.pageNumbers} onChange={(e) => onChange({ ...layout, pageNumbers: e.target.checked })} />顯示頁碼</label>}
      </div>
      <p className="my-2 text-xs opacity-60">整份樣式會套用到正文、標題、圖說及教學區塊；手動設定的文字字級仍會保留。{!paged && "流動筆記的頁首、頁尾顯示於全文開頭及結尾。"}</p>
      <nav aria-label="講義導航" className="mb-2 grid gap-1">
        {entries.length ? entries.map((entry, index) => <button key={`${entry.id}-${index}`} type="button" className="flex gap-2 rounded px-2 py-1 text-left hover:bg-zinc-500/10" style={{ paddingLeft: Math.max(0, entry.level - 1) * 12 + 8 }} onClick={() => onNavigate(entry.id)}><span className="min-w-0 flex-1 truncate">{entry.kind === "exercise" ? `練習 ${entry.number}：` : entry.kind === "example" ? `例題 ${entry.number}：` : entry.kind === "figure" ? `圖 ${entry.number}：` : ""}{entry.title}</span>{paged && <span className="shrink-0 opacity-50">第 {entry.page} 頁</span>}</button>) : <p className="text-xs opacity-60">使用標題樣式、例題或練習後，這裡會自動產生導航。</p>}
      </nav>
    </div>
  </details>;
}
