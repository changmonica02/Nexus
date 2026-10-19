"use client";
import { useState } from "react";
import type { Page } from "../lib/types";
import { useLanguage } from "../lib/LanguageContext";
import type { PageActions } from "./PageCollection";
import FeatureOverview from "./FeatureOverview";
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
    <FeatureOverview title={t("ui.tools")} description="" feature="tools" actionLabel={t("ui.create")} onCreate={()=>setCreating(true)}
      pages={pages.filter(p=>p.kind===kind&&!p.deleted_at)} onSelectPage={onOpen} viewStorageKey={"nexus-tools-"+kind+"-view"} {...actions}
      beforeList={
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
      }>
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
    </FeatureOverview>
  );
}
