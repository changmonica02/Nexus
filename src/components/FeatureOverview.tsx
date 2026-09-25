"use client";

import type { Page } from "../lib/types";

export default function FeatureOverview({
  title,
  description,
  icon,
  actionLabel,
  pages,
  onCreate,
  onSelectPage,
}: {
  title: string;
  description: string;
  icon: string;
  actionLabel: string;
  pages: Page[];
  onCreate: () => void;
  onSelectPage: (id: string) => void;
}) {
  const orderedPages = [...pages].sort((a, b) => b.updated_at - a.updated_at);

  return (
    <main data-pull-refresh className="flex flex-1 overflow-y-auto" style={{ backgroundColor: "var(--color-editor-bg)" }}>
      <section className="mx-auto w-full max-w-5xl px-6 py-10 sm:px-10">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-2 text-3xl">{icon}</div>
            <h1 className="text-3xl font-semibold" style={{ color: "var(--color-text)" }}>{title}</h1>
            <p className="mt-2 text-sm opacity-60" style={{ color: "var(--color-text)" }}>{description}</p>
          </div>
          <button type="button" onClick={onCreate} className="rounded-full px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-transform hover:-translate-y-0.5" style={{ backgroundColor: "#1a73e8" }}>
            + {actionLabel}
          </button>
        </div>

        {orderedPages.length === 0 ? (
          <div className="rounded-2xl border border-dashed px-6 py-16 text-center text-sm opacity-55" style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}>
            尚未建立任何項目
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {orderedPages.map((page) => (
              <button key={page.id} type="button" onClick={() => onSelectPage(page.id)} className="rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md" style={{ backgroundColor: "var(--color-bg)", borderColor: "var(--color-border)", color: "var(--color-text)" }}>
                <div className="mb-6 text-xl">{icon}</div>
                <div className="truncate font-medium">{page.title || "未命名"}</div>
                <div className="mt-1 text-xs opacity-50">最近編輯於 {new Date(page.updated_at).toLocaleDateString()}</div>
              </button>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
