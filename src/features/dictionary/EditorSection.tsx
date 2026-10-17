"use client";
import type { ReactNode } from "react";
/** Native details keeps inputs mounted so folding never discards in-progress data. */
export default function EditorSection({
  title,
  count,
  children,
  actions,
}: {
  title: string;
  count?: number;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section
      data-editor-section={title}
      className="min-w-0 border-b border-[var(--color-border)] py-1"
    >
      <details open>
        <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-2 py-1 font-medium">
          <span className="min-w-0"><span aria-hidden className="mr-2 text-xs">▾</span><h3 className="inline">{title}</h3>
          {!!count && (
            <span className="ml-2 text-xs font-normal opacity-50">{count}</span>
          )}</span>
          {actions&&<span className="shrink-0" onClick={e=>{e.preventDefault();e.stopPropagation();}}>{actions}</span>}
        </summary>
        <div className="min-w-0 space-y-2 pb-2">{children}</div>
      </details>
    </section>
  );
}
