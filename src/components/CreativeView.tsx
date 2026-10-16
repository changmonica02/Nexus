"use client";
import FeatureIcon from "./FeatureIcon";
import { useState } from "react";
import {isCreativeCharacterPage,type Page } from "../lib/types";
import { useLanguage } from "../lib/LanguageContext";
import CharacterTemplateManager from "./CharacterTemplateManager";
import CreationChoiceDialog from "./CreationChoiceDialog";
import PageCollection, { type PageActions } from "./PageCollection";
export default function CreativeView({
  pages,
  templates = [],
  onCreateCharacter,
  onCreateWorld,
  onSelectPage,
  onCreateTemplate,
  onRenameTemplate,
  ...actions
}: PageActions & {
  pages: Page[];
  templates?: Page[];
  onCreateCharacter: (id?: string) => void;
  onCreateWorld: () => void;
  onSelectPage: (id: string) => void;
  onCreateTemplate: () => void;
  onRenameTemplate: (id: string, title: string) => void;
}) {
  const { t } = useLanguage();
  const [choice, setChoice] = useState(false),
    [character, setCharacter] = useState(false),
    [manager, setManager] = useState(false);
  if (manager) return (
          <CharacterTemplateManager
            templates={templates}
            onClose={() => setManager(false)}
            onCreate={onCreateTemplate}
            onEdit={onSelectPage}
            onRename={onRenameTemplate}
            onDelete={(id) => actions.onDeletePage?.(id)}
            onUse={onCreateCharacter}
            onCopy={(id)=>actions.onDuplicatePage?.(id)}
          />
  );
  return (
    <main
      data-pull-refresh
      className="min-w-0 flex-1 overflow-y-auto bg-[var(--color-editor-bg)] text-[var(--color-text)]"
    >
      <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-8">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">
            <FeatureIcon feature="creative"/> {t("ui.feature.creative")}
          </h1>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setManager(true)}
              className="rounded border px-4 py-2 text-sm"
            >
              {t("ui.templates")}
            </button>
            <button
              type="button"
              onClick={() => setChoice(true)}
              className="min-h-11 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-medium text-white"
            >
              ＋ {t("ui.create")}
            </button>
          </div>
        </header>
        <PageCollection
          viewStorageKey="nexus_creative_view_mode"
          pages={pages.filter(
            (p) =>
              isCreativeCharacterPage(p) &&
              !p.deleted_at &&
              !p.character_data?.isTemplate,
          )}
          onSelectPage={onSelectPage}
          {...actions}
        />
        {choice && (
          <CreationChoiceDialog
            title={t("ui.create")}
            options={[
              { id: "world", label: t("ui.world") },
              { id: "character", label: t("ui.character") },
            ]}
            onChoose={(id) => {
              setChoice(false);
              if (id === "world") onCreateWorld();
              else setCharacter(true);
            }}
            onClose={() => setChoice(false)}
          />
        )}
        {character && (
          <CreationChoiceDialog
            title={t("ui.templates")}
            options={[
              { id: "blank", label: t("ui.blankCharacter") },
              { id: "dnd5e", label: "D&D 5e" },
              { id: "coc7e", label: "CoC 7e" },
              ...templates.map((p) => ({ id: p.id, label: p.title })),
            ]}
            onChoose={(id) => {
              setCharacter(false);
              onCreateCharacter(id);
            }}
            onClose={() => setCharacter(false)}
          />
        )}

      </div>
    </main>
  );
}
