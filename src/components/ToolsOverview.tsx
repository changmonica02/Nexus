"use client";
import { useState } from "react";
import type { Page } from "../lib/types";
import { useLanguage } from "../lib/LanguageContext";
import PageCollection, { type PageActions } from "./PageCollection";
import FeatureIcon from "./FeatureIcon";
import CreationChoiceDialog from "./CreationChoiceDialog";
export default function ToolsOverview({
  pages,
  onOpen,
  onCreate,
  kind,
  onKind,
  ...actions
}: PageActions & {
  kind: "counter" | "draw";
  onKind: (kind: "counter" | "draw") => void;
  pages: Page[];
  onOpen: (id: string) => void;
  onCreate: (kind: "counter" | "draw") => void;
}) {
  const { t } = useLanguage(),
    [creating, setCreating] = useState(false);
  return (
    <main
      data-pull-refresh
      className="min-w-0 flex-1 overflow-y-auto bg-[var(--color-editor-bg)] text-[var(--color-text)]"
    >
      <section className="mx-auto max-w-5xl space-y-6 p-4 sm:p-8">
        <header className="flex items-center justify-between gap-3">
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <FeatureIcon feature="tools" />
            {t("ui.tools")}
          </h1>
          <button
            className="min-h-11 rounded-full bg-blue-600 px-5 py-2 text-sm text-white"
            onClick={() => setCreating(true)}
          >
            ＋ {t("ui.create")}
          </button>
        </header>
        <nav aria-label={t("ui.tools")} className="flex gap-2">
          {(["counter", "draw"] as const).map((value) => (
            <button
              type="button"
              key={value}
              aria-pressed={kind === value}
              onClick={() => onKind(value)}
              className="flex min-h-11 items-center gap-2 rounded-lg px-4 text-sm hover:bg-zinc-500/10"
              style={{
                background: kind === value ? "var(--color-border)" : undefined,
              }}
            >
              <FeatureIcon feature={value} />
              {t("ui.feature." + value)}
            </button>
          ))}
        </nav>
        <PageCollection
          viewStorageKey={"nexus-tools-" + kind + "-view"}
          pages={pages.filter((p) => p.kind === kind && !p.deleted_at)}
          onSelectPage={onOpen}
          {...actions}
        />
        {creating && (
          <CreationChoiceDialog
            title={t("ui.create")}
            options={(["counter", "draw"] as const).map((id) => ({
              id,
              label: t("ui.create." + id),
            }))}
            onChoose={(id) => {
              setCreating(false);
              onCreate(id as "counter" | "draw");
            }}
            onClose={() => setCreating(false)}
          />
        )}
      </section>
    </main>
  );
}
