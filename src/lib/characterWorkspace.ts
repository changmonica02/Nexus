import { nanoid } from "nanoid";
import type { CharacterProfileData, CharacterSection } from "./types";

export function updateCharacterSection(
  sections: CharacterSection[],
  id: string,
  patch: Partial<CharacterSection>,
): CharacterSection[] {
  return sections.map((section) =>
    section.id === id
      ? { ...section, ...patch }
      : section.contents
        ? {
            ...section,
            contents: updateCharacterSection(section.contents, id, patch),
          }
        : section,
  );
}

export function deleteCharacterSection(
  sections: CharacterSection[],
  id: string,
): CharacterSection[] {
  return sections
    .filter((section) => section.id !== id)
    .map((section) =>
      section.contents
        ? { ...section, contents: deleteCharacterSection(section.contents, id) }
        : section,
    );
}

export function moveCharacterSection(
  sections: CharacterSection[],
  id: string,
  direction: -1 | 1,
): CharacterSection[] {
  const index = sections.findIndex((section) => section.id === id);
  if (index < 0)
    return sections.map((section) =>
      section.contents
        ? {
            ...section,
            contents: moveCharacterSection(section.contents, id, direction),
          }
        : section,
    );
  const target = index + direction;
  if (target < 0 || target >= sections.length) return sections;
  const next = [...sections];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

/** Only structural fields cross the template boundary. Never copy examples, media or values. */
export function snapshotCharacterTemplate(
  source: CharacterProfileData,
): CharacterProfileData {
  const structure = (s: CharacterSection): CharacterSection => {
    const next: CharacterSection = { id: s.id, type: s.type, title: s.title };
    if (s.size) next.size = structuredClone(s.size);
    if (s.contents) next.contents = s.contents.map(structure);
    if (s.statisticHeaders) next.statisticHeaders = { ...s.statisticHeaders };
    if (s.keyValues)
      next.keyValues = s.keyValues.map((item) => ({
        key: item.key,
        value: "",
      }));
    if (s.richText !== undefined) next.richText = "";
    if (s.tags) next.tags = [];
    if (s.stats)
      next.stats = s.stats.map((item) => ({ label: item.label, value: 0 }));
    if (s.ratings)
      next.ratings = s.ratings.map((item) => ({ label: item.label, value: 0 }));
    if (s.relations) next.relations = [];
    if (s.palette)
      next.palette = s.palette.map((item) => ({
        label: item.label,
        color: "",
      }));
    if (s.tendency)
      next.tendency = s.tendency.map((item) => ({
        left: item.left,
        right: item.right,
        value: 0,
      }));
    if (s.statistics) next.statistics = [];
    if (s.gallery) next.gallery = [];
    if (s.galleryAttachmentIds) next.galleryAttachmentIds = [];
    for (const key of ["externalLinks", "music"] as const)
      if (s[key])
        next[key] = s[key].map((item) => ({ label: item.label, url: "" }));
    return next;
  };
  return {
    isTemplate: true,
    blocks_version: source.blocks_version,
    basicBlock: source.basicBlock ? { ...source.basicBlock } : undefined,
    basic: { name: "", age: "", gender: "", race: "", avatarUrl: "" },
    sections: source.sections.map(structure),
    tabs: source.tabs?.map((tab) => ({
      id: tab.id,
      title: tab.title,
      sections: tab.sections.map(structure),
    })),
  };
}

export function instantiateCharacterTemplate(
  source: CharacterProfileData,
  sourceId?: string,
): CharacterProfileData {
  const clean = snapshotCharacterTemplate(source);
  const instantiate = (s: CharacterSection): CharacterSection => ({
    ...s,
    id: `sec_${nanoid()}`,
    template_node_id: s.id,
    ...(s.contents ? { contents: s.contents.map(instantiate) } : {}),
  });
  return {
    ...clean,
    isTemplate: false,
    resourceSource:source.resourceSource,
    templateSourceId: sourceId,
    world_id: null,
    basicBlock: clean.basicBlock
      ? { ...clean.basicBlock, id: `basic_${nanoid()}` }
      : undefined,
    templateBinding: sourceId ? { sourceId, baseline: clean } : undefined,
    sections: clean.sections.map(instantiate),
    tabs: clean.tabs?.map((t) => ({
      ...t,
      id: `tab_${nanoid()}`,
      template_node_id: t.id,
      sections: t.sections.map(instantiate),
    })),
  };
}
