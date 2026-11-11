"use client";
import type { ReactNode } from "react";
/** Native details keeps inputs mounted so folding never discards in-progress data. */
export default function EditorSection({
  title,
  count,
  children,
  actions,
  collapsible = true,
}: {
  title: string;
  count?: number;
  children: ReactNode;
  actions?: ReactNode;
  collapsible?: boolean;
}) {
  const heading=<><div className="min-w-0">{collapsible&&<span aria-hidden className="mr-2 text-xs">▾</span>}<h3 className="inline">{title}</h3>{!!count&&<span className="ml-2 text-xs font-normal opacity-50">{count}</span>}</div>{actions&&<span className="shrink-0" onClick={e=>{if(collapsible){e.preventDefault();e.stopPropagation();}}}>{actions}</span>}</>;
  const content=<div className="min-w-0 space-y-2 pb-2">{children}</div>;
  return (
    <section
      data-editor-section={title}
      className="min-w-0 py-2"
    >
      {collapsible?<details open>
        <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-2 py-1 font-medium">
          {heading}
        </summary>
        {content}
      </details>:<><div className="mb-2 flex min-h-11 items-center justify-between gap-2 font-medium">{heading}</div>{content}</>}
    </section>
  );
}
