"use client";
import { useState } from "react";
import { useWorkspaceDialog } from "./WorkspaceDialog";
import type { Page } from "../lib/types";
import { snapshotCharacterTemplate } from "../lib/characterWorkspace";
import TemplateStructurePreview from "./TemplateStructurePreview";
import TemplateResourceStatus from "./TemplateResourceStatus";
import FloatingPanel from "./FloatingPanel";
import PageItemMenu from "./PageItemMenu";
import { SidebarToggle } from "./WorkspaceNavigation";
export default function CharacterTemplateManager({
  templates,
  onClose,
  onEdit,
  onRename,
  onDelete,
  onUse,
  onCopy,
  onOpenResource,
}: {
  templates: Page[];
  onClose: () => void;
  onCreate: () => void;
  onEdit: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onUse: (id: string) => void;
  onCopy: (id: string) => void;
  onOpenResource?: (id:string)=>void;
}) {
  const { askText, askConfirm, dialog } = useWorkspaceDialog();
  const [preview, setPreview] = useState<Page | null>(null);
  const clean = preview?.character_data
    ? snapshotCharacterTemplate(preview.character_data)
    : null;
  return (
    <main
      data-template-manager
      className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-8 bg-[var(--color-editor-bg)] text-[var(--color-text)]"
    >
      {dialog}
      <div className="mx-auto max-w-5xl space-y-4">
        <header className="flex flex-wrap items-center gap-3">
          <SidebarToggle />
          <button onClick={onClose}>← 返回創作</button>
          <h1 className="flex-1 text-xl font-semibold">私人角色卡模板</h1>
        </header>
        <p className="text-sm opacity-65">
          模板只保存區塊、欄位與排版；修改不會自動改動已建立的角色。
        </p>
        {!templates.length && (
          <p className="py-8 text-center opacity-60">
            尚無私人模板，可從角色卡的更多操作儲存結構。
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <article
              key={template.id}
              className="rounded-xl border border-[var(--color-border)] p-4"
            >
              <div className="flex items-center">
                <button
                  className="flex-1 text-left font-semibold"
                  onClick={() => setPreview(template)}
                >
                  {template.title}
                </button>
                <PageItemMenu
                  title={`模板操作 ${template.title}`}
                  items={[
                    {
                      id: "preview",
                      label: "預覽",
                      onClick: () => setPreview(template),
                    },
                    {
                      id: "edit",
                      label: "編輯結構",
                      onClick: () => onEdit(template.id),
                    },
                    {
                      id: "rename",
                      label: "重新命名",
                      onClick: () => {
                        void askText("模板名稱", template.title).then((t) => {
                          if (t?.trim()) onRename(template.id, t.trim());
                        });
                      },
                    },
                    {
                      id: "copy",
                      label: "複製",
                      onClick: () => onCopy(template.id),
                    },
                    {
                      id: "delete",
                      label: "刪除",
                      danger: true,
                      onClick: () => {
                        void askConfirm(
                          `將模板「${template.title}」移至垃圾桶？已建立角色不受影響。`,
                        ).then((ok) => {
                          if (ok) onDelete(template.id);
                        });
                      },
                    },
                  ]}
                />
              </div>
              {template.character_data?.resourceSource && onOpenResource && <TemplateResourceStatus source={template.character_data.resourceSource} onOpen={onOpenResource}/>}
              <button
                className="mt-3 text-sm text-blue-600"
                onClick={() => onUse(template.id)}
              >
                使用模板建立角色
              </button>
            </article>
          ))}
        </div>
      </div>
      {preview && clean && (
        <FloatingPanel
          open
          label={`預覽 ${preview.title}`}
          onClose={() => setPreview(null)}
        >
          <TemplateStructurePreview data={clean}/>
        </FloatingPanel>
      )}
    </main>
  );
}
