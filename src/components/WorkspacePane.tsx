"use client";
import type { ComponentProps } from "react";
import type { Page } from "../lib/types";
import EditorPane from "./EditorPane";
import PresentationView from "./PresentationView";
import CharacterProfileView from "./CharacterProfileView";
import NovelReaderView from "./NovelReaderView";
import StudySetView from "../features/study/components/StudySetView";

type WithoutPage<T> = Omit<T, "page">;
export default function WorkspacePane({ page, editor, study, presentation, character, novel }: {
  page: Page | null;
  editor: WithoutPage<ComponentProps<typeof EditorPane>>;
  study: WithoutPage<ComponentProps<typeof StudySetView>>;
  presentation: WithoutPage<ComponentProps<typeof PresentationView>>;
  character: WithoutPage<ComponentProps<typeof CharacterProfileView>>;
  novel: WithoutPage<ComponentProps<typeof NovelReaderView>>;
}) {
  if (page?.kind === "study_set") return <StudySetView key={page.id} page={page} {...study} />;
  if (page?.kind === "presentation") return <PresentationView key={page.id} page={page} {...presentation} />;
  if (page?.kind === "creative") return page.creative_type === "character" || !!page.character_data
    ? <CharacterProfileView key={page.id} page={page} {...character} />
    : <NovelReaderView key={page.id} page={page} {...novel} />;
  return <EditorPane key={page?.id ?? "empty"} page={page} {...editor} />;
}
