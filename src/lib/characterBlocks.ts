import type {
  CharacterProfileData,
  CharacterSection,
  CharacterComponentType,
} from "./types";
export const CHARACTER_COMPONENT_TYPES: {
  type: CharacterComponentType;
  label: string;
}[] = [
  { type: "key_value", label: "欄位" },
  { type: "rich_text", label: "長文" },
  { type: "tags", label: "標籤" },
  { type: "stats", label: "分數" },
  { type: "rating", label: "評分" },
  { type: "tendency", label: "偏向" },
  { type: "statistics", label: "統計" },
  { type: "relations", label: "關係" },
  { type: "radar", label: "雷達圖" },
  { type: "palette", label: "色票" },
  { type: "gallery", label: "相冊" },
  { type: "links", label: "連結" },
  { type: "music", label: "音樂" },
];
/** Pure lazy conversion: no page/attachment writes, no discarded legacy fields. */
export function normalizeCharacterBlocks(
  source: CharacterProfileData,
  documentId: string,
): CharacterProfileData {
  const data = structuredClone(source);
  if (data.blocks_version === 1) return data;
  const seen = new Set<string>();
  const identity = (value: string | undefined, path: string) => {
    let id = value || `legacy:${documentId}:${path}`;
    if (seen.has(id)) id = `legacy:${documentId}:${path}:${id}`;
    while (seen.has(id)) id += ":duplicate";
    seen.add(id);
    return id;
  };
  const groups = (
    sections: CharacterSection[],
    path: string,
  ): CharacterSection[] => {
    const result: CharacterSection[] = [];
    sections.forEach((section, index) => {
      const key = `${path}:${index}`,
        id = identity(section.id, key),
        node = {
          ...section,
          id,
          ...(id !== section.id ? { legacy_id: section.id } : {}),
        };
      if (node.type === "group") {
        const ordinary: CharacterSection[] = [],
          nested: CharacterSection[] = [];
        (node.contents ?? []).forEach((child, i) => {
          if (child.type === "group") nested.push(child);
          else {
            const childId = identity(child.id, `${key}:child:${i}`);
            ordinary.push({
              ...child,
              id: childId,
              ...(childId !== child.id ? { legacy_id: child.id } : {}),
            });
          }
        });
        result.push({ ...node, contents: ordinary });
        result.push(...groups(nested, `${key}:nested`));
      } else
        result.push({
          id: identity(`block:${id}`, key + ":block"),
          type: "group",
          title: node.title || "內容",
          contents: [node],
        });
    });
    return result;
  };
  const sections = groups(data.sections ?? [], "base");
  const legacyFields = [
    ["別名", data.basic?.alias],
    ["角色", data.basic?.role],
    ["所屬", data.basic?.affiliation],
    ["名言", data.basic?.quote],
    ...(data.basic?.customFields ?? []).map((f) => [f.key, f.value]),
  ].filter(([, value]) => !!value);
  if (legacyFields.length)
    sections.push({
      id: identity(`legacy-basic:${documentId}`, "legacy-basic"),
      type: "group",
      title: "原基本資料",
      contents: [
        {
          id: identity(
            `legacy-basic-content:${documentId}`,
            "legacy-basic-content",
          ),
          type: "key_value",
          title: "保留的基本資料",
          keyValues: legacyFields.map(([key, value]) => ({
            key: key ?? "",
            value: value ?? "",
          })),
        },
      ],
    });
  return {
    ...data,
    blocks_version: 1,
    basic: data.basic ?? { name: "" },
    basicBlock: { id: identity(data.basicBlock?.id ?? `basic:${documentId}`, "basic"), enabled: data.basicBlock?.enabled ?? true },
    sections,
    tabs: data.tabs?.map((tab, i) => ({
      ...tab,
      id: identity(tab.id, `tab:${i}:id`),
      sections: groups(tab.sections, `tab:${i}`),
    })),
    legacyCharacterSnapshot: structuredClone(source),
  };
}
export function characterBlocks(
  data: CharacterProfileData,
  tabId = "base",
): CharacterSection[] {
  return tabId === "base"
    ? data.sections
    : (data.tabs?.find((tab) => tab.id === tabId)?.sections ?? []);
}
export function replaceCharacterBlocks(
  data: CharacterProfileData,
  blocks: CharacterSection[],
  tabId = "base",
): CharacterProfileData {
  return tabId === "base"
    ? { ...data, sections: blocks }
    : {
        ...data,
        tabs: data.tabs?.map((tab) =>
          tab.id === tabId ? { ...tab, sections: blocks } : tab,
        ),
      };
}
export function moveCharacterComponent(
  data: CharacterProfileData,
  id: string,
  targetBlock: string,
  beforeId?: string,
  tabId = "base",
): CharacterProfileData {
  if (id === beforeId) return data;
  const blocks = characterBlocks(data, tabId),
    component = blocks
      .flatMap((b) => b.contents ?? [])
      .find((c) => c.id === id);
  if (!component || !blocks.some((b) => b.id === targetBlock))
    throw Error("找不到組件或目標區塊；原資料已保留。");
  const next = blocks.map((b) => ({
    ...b,
    contents: (b.contents ?? []).filter((c) => c.id !== id),
  }));
  const target = next.find((b) => b.id === targetBlock)!;
  const index = beforeId
    ? target.contents.findIndex((c) => c.id === beforeId)
    : -1;
  target.contents.splice(
    index < 0 ? target.contents.length : index,
    0,
    component,
  );
  return replaceCharacterBlocks(data, next, tabId);
}
export function reorderCharacterBlock(
  data: CharacterProfileData,
  id: string,
  beforeId?: string,
  tabId = "base",
): CharacterProfileData {
  if (id === beforeId) return data;
  const blocks = characterBlocks(data, tabId),
    block = blocks.find((b) => b.id === id);
  if (!block) throw Error("找不到區塊");
  const rest = blocks.filter((b) => b.id !== id),
    index = beforeId ? rest.findIndex((b) => b.id === beforeId) : -1;
  rest.splice(index < 0 ? rest.length : index, 0, block);
  return replaceCharacterBlocks(data, rest, tabId);
}
export function updateCharacterComponent(
  data: CharacterProfileData,
  id: string,
  value: CharacterSection,
  tabId = "base",
): CharacterProfileData {
  if (id !== value.id) throw Error("組件 ID 不可改變");
  return replaceCharacterBlocks(
    data,
    characterBlocks(data, tabId).map((b) => ({
      ...b,
      contents: b.contents?.map((c) => (c.id === id ? value : c)),
    })),
    tabId,
  );
}
export function newCharacterComponent(
  type: CharacterComponentType,
  id = crypto.randomUUID(),
): CharacterSection {
  if (type === "group") throw Error("請使用新增區塊");
  const result: CharacterSection = {
    id,
    type,
    title:
      CHARACTER_COMPONENT_TYPES.find((c) => c.type === type)?.label ?? "組件",
    size: { span: 4 },
  };
  if (type === "key_value") result.keyValues = [{ key: "欄位", value: "" }];
  if (type === "rich_text") result.richText = "";
  if (type === "tags") result.tags = [];
  if (type === "stats" || type === "radar")
    result.stats =
      type === "radar"
        ? [
            { label: "維度一", value: 0, max: 5 },
            { label: "維度二", value: 0, max: 5 },
            { label: "維度三", value: 0, max: 5 },
          ]
        : [{ label: "分數", value: 0, max: 100 }];
  if (type === "rating") result.ratings = [{ label: "評分", value: 0 }];
  if (type === "tendency")
    result.tendency = [{ left: "左", right: "右", value: 50 }];
  if (type === "statistics") result.statistics = [];
  if (type === "relations") result.relations = [];
  if (type === "palette") result.palette = [];
  if (type === "gallery") {
    result.gallery = [];
    result.galleryAttachmentIds = [];
  }
  if (type === "links") result.externalLinks = [];
  if (type === "music") result.music = [];
  return result;
}
export function validateCharacterBlocks(data: CharacterProfileData) {
  const ids = new Set<string>();
  const check = (id: string) => {
    if (!id || ids.has(id)) throw Error("區塊或組件 ID 重複／缺漏；未儲存。");
    ids.add(id);
  };
  if (data.basicBlock) check(data.basicBlock.id);
  for (const tab of data.tabs ?? []) check(tab.id);
  for (const blocks of [
    data.sections,
    ...(data.tabs ?? []).map((t) => t.sections),
  ])
    for (const block of blocks) {
      check(block.id);
      if (block.type !== "group") throw Error("無效區塊");
      for (const component of block.contents ?? []) {
        check(component.id);
        if (
          component.size &&
          (!Number.isInteger(component.size.span) ||
            component.size.span < 4 ||
            component.size.span > 12 ||
            (component.size.height !== undefined &&
              (!Number.isFinite(component.size.height) ||
                component.size.height < 120 ||
                component.size.height > 1600)))
        )
          throw Error("組件尺寸不合法");
      }
    }
  if (data.basicBlock?.enabled && typeof data.basic.name !== "string")
    throw Error("名字格式不合法");
}
