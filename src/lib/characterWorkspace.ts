import { nanoid } from "nanoid";
import type { CharacterProfileData, CharacterSection } from "./types";

export function updateCharacterSection(sections: CharacterSection[], id: string, patch: Partial<CharacterSection>): CharacterSection[] {
  return sections.map((section) => section.id === id ? { ...section, ...patch } :
    section.contents ? { ...section, contents: updateCharacterSection(section.contents, id, patch) } : section);
}

export function deleteCharacterSection(sections: CharacterSection[], id: string): CharacterSection[] {
  return sections.filter((section) => section.id !== id).map((section) => section.contents ?
    { ...section, contents: deleteCharacterSection(section.contents, id) } : section);
}

export function moveCharacterSection(sections: CharacterSection[], id: string, direction: -1 | 1): CharacterSection[] {
  const index = sections.findIndex((section) => section.id === id);
  if (index < 0) return sections.map((section) => section.contents ?
    { ...section, contents: moveCharacterSection(section.contents, id, direction) } : section);
  const target = index + direction;
  if (target < 0 || target >= sections.length) return sections;
  const next = [...sections];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

/** Templates retain example text; each instance has fresh IDs and blank prose. */
export function instantiateCharacterTemplate(source: CharacterProfileData, sourceId?: string): CharacterProfileData {
  const data = structuredClone(source);
  const instantiate = (section: CharacterSection): CharacterSection => {
    const next = { ...section, id: `sec_${nanoid()}`, example: { ...section, contents: undefined, example: undefined } };
    if (section.contents) next.contents = section.contents.map(instantiate);
    if (section.keyValues) next.keyValues = section.keyValues.map((item) => ({ ...item, value: "" }));
    if (section.richText !== undefined) next.richText = "";
    if (section.tags) next.tags = [];
    if (section.statistics) next.statistics = section.statistics.map((item) => ({ ...item, label: "", description: "" }));
    if (section.relations) next.relations = section.relations.map((item) => ({ ...item, targetName: "", description: "" }));
    if (section.externalLinks) next.externalLinks = section.externalLinks.map((item) => ({ ...item, url: "" }));
    if (section.music) next.music = section.music.map((item) => ({ ...item, url: "" }));
    return next;
  };
  return {
    ...data, isTemplate: false, templateSourceId: sourceId, world_id: null,
    basicExamples: { ...data.basicExamples, ...data.basic },
    basic: { name: "", alias: "", gender: "", age: "", role: "", affiliation: "", quote: "", avatarUrl: "" },
    sections: data.sections.map(instantiate),
    tabs: data.tabs?.map((tab) => ({ ...tab, id: `tab_${nanoid()}`, sections: tab.sections.map(instantiate) })),
  };
}

/** Empty fields in an existing instance keep their previous example text. */
export function snapshotCharacterTemplate(source: CharacterProfileData): CharacterProfileData {
  const data = structuredClone(source);
  const snapshot = (section: CharacterSection): CharacterSection => {
    const next = { ...section, example: undefined };
    const example = section.example;
    if (section.contents) next.contents = section.contents.map(snapshot);
    if (example) {
      if (section.richText !== undefined) next.richText = section.richText || example.richText;
      if (section.keyValues) next.keyValues = section.keyValues.map((item, index) => ({ ...item, value: item.value || example.keyValues?.[index]?.value || "" }));
      if (section.tags && !section.tags.length) next.tags = example.tags || [];
      if (section.statistics) next.statistics = section.statistics.map((item, index) => ({ ...item,
        label: item.label || example.statistics?.[index]?.label || "",
        description: item.description || example.statistics?.[index]?.description || "",
      }));
      if (section.relations) next.relations = section.relations.map((item, index) => ({ ...item,
        targetName: item.targetName || example.relations?.[index]?.targetName || "",
        description: item.description || example.relations?.[index]?.description || "",
      }));
      for (const key of ["externalLinks", "music"] as const) {
        if (section[key]) next[key] = section[key].map((item, index) => ({ ...item, url: item.url || example[key]?.[index]?.url || "" }));
      }
    }
    return next;
  };
  const basic = { ...data.basic };
  for (const key of Object.keys(basic) as Array<keyof typeof basic>) {
    if (key !== "customFields") {
      (basic as any)[key] = basic[key] || data.basicExamples?.[key] || "";
    }
  }
  return { ...data, isTemplate: true, world_id: null, templateSourceId: undefined, basic, basicExamples: undefined,
    sections: data.sections.map(snapshot), tabs: data.tabs?.map((tab) => ({ ...tab, sections: tab.sections.map(snapshot) })) };
}
