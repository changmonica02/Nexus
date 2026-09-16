"use client";
import { useWorkspaceDialog } from "./WorkspaceDialog";
import type { Page } from "../lib/types";

export default function CharacterTemplateManager({ templates, onClose, onCreate, onEdit, onRename, onDelete, onUse }: {
  templates: Page[]; onClose: () => void; onCreate: () => void; onEdit: (id: string) => void;
  onRename: (id: string, title: string) => void; onDelete: (id: string) => void; onUse: (id: string) => void;
}) {
  const { askText, askConfirm, dialog } = useWorkspaceDialog();
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
    {dialog}
    <section role="dialog" aria-modal="true" aria-labelledby="template-manager-title" onClick={(event) => event.stopPropagation()} className="max-h-[85dvh] w-full max-w-2xl overflow-y-auto rounded-2xl border p-5 shadow-xl" style={{ backgroundColor: "var(--color-bg)", borderColor: "var(--color-border)", color: "var(--color-text)" }}>
      <header className="mb-4 flex items-center justify-between"><h2 id="template-manager-title" className="text-lg font-bold">模板管理</h2><button aria-label="關閉模板管理" onClick={onClose}>×</button></header>
      <p className="mb-4 text-sm opacity-65">在模板中編輯區塊、分頁與範文。修改模板不會改動已建立的角色。</p>
      <button onClick={() => { onCreate(); onClose(); }} className="mb-4 rounded-lg bg-blue-600 px-3 py-2 text-sm text-white">＋ 建立空白模板</button>
      {!templates.length && <p className="py-8 text-center text-sm opacity-60">尚無自訂模板，也可從角色卡儲存目前組件與內容。</p>}
      <div className="space-y-3">{templates.map((template) => <article key={template.id} className="rounded-xl border p-4" style={{ borderColor: "var(--color-border)" }}>
        <h3 className="mb-3 font-semibold">{template.title}</h3>
        <div className="flex flex-wrap gap-4 text-xs">
          <button className="text-blue-600" onClick={() => { onUse(template.id); onClose(); }}>使用模板建立角色</button>
          <button onClick={() => { onEdit(template.id); onClose(); }}>編輯模板與範文</button>
          <button onClick={async () => { const title = (await askText("模板名稱", template.title))?.trim(); if (title) onRename(template.id, title); }}>重新命名</button>
          <button className="text-red-600" onClick={async () => { if (await askConfirm(`將模板「${template.title}」移至垃圾桶？已建立的角色不受影響。`)) onDelete(template.id); }}>刪除</button>
        </div>
      </article>)}</div>
    </section>
  </div>;
}
