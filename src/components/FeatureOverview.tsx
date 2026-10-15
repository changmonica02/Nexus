"use client";
import type { Page } from "../lib/types";
import PageCollection, { type PageActions } from "./PageCollection";
import { useLanguage } from "../lib/LanguageContext";
export default function FeatureOverview({
  title,
  description,
  icon,
  actionLabel,
  pages,
  onCreate,
  onSelectPage,
  relatedLink,
  ...actions
}: PageActions & {
  title: string;
  description: string;
  icon: string;
  actionLabel: string;
  pages: Page[];
  onCreate: () => void;
  onSelectPage: (id: string) => void;
  relatedLink?: { href: string; label: string };
}) {
  const { t } = useLanguage();
  return (
    <main
      data-pull-refresh
      className="flex min-w-0 flex-1 overflow-y-auto bg-[var(--color-editor-bg)] text-[var(--color-text)]"
    >
      <section className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-10">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-2 text-3xl">{icon}</div>
            <h1 className="text-3xl font-semibold">{title}</h1>
            <p className="mt-2 text-sm opacity-60">{description}</p>
            {relatedLink && (
              <a
                href={relatedLink.href}
                className="mt-3 inline-block text-sm underline"
              >
                {relatedLink.label}
              </a>
            )}
          </div>
          <button
            type="button"
            onClick={onCreate}
            className="min-h-11 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm"
          >
            ＋ {actionLabel || t("ui.create")}
          </button>
        </div>
        <PageCollection
          pages={pages}
          onSelectPage={onSelectPage}
          icon={icon}
          {...actions}
        />
      </section>
    </main>
  );
}
