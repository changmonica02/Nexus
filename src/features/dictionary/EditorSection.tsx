"use client";
import type { ReactNode } from "react";
/** Native details keeps inputs mounted so folding never discards in-progress data. */
export default function EditorSection({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: ReactNode;
}) {
  return (
    <section
      data-editor-section={title}
      className="min-w-0 border-b border-[var(--color-border)] py-2"
    >
      <details open>
        <summary className="min-h-11 cursor-pointer py-3 font-medium">
          <h3 className="inline">{title}</h3>
          {!!count && (
            <span className="ml-2 text-xs font-normal opacity-50">{count}</span>
          )}
        </summary>
        <div className="min-w-0 space-y-3 pb-3">{children}</div>
      </details>
    </section>
  );
}
