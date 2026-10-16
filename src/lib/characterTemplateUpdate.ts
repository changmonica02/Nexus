import { nanoid } from "nanoid";
import type {
  CharacterProfileData,
  CharacterSection,
  CharacterPageTab,
} from "./types";
import {
  normalizeCharacterBlocks,
  validateCharacterBlocks,
} from "./characterBlocks";
import { snapshotCharacterTemplate } from "./characterWorkspace";
const equal = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);
const canonical = (data: CharacterProfileData, source: string) =>
  snapshotCharacterTemplate(
    normalizeCharacterBlocks(snapshotCharacterTemplate(data), source),
  );
type Location = { node: CharacterSection; parent: string; tab: string };
function index(data: CharacterProfileData, instance = false) {
  const nodes = new Map<string, Location>(),
    tabs = new Map<string, CharacterPageTab>();
  for (const tab of data.tabs ?? []) {
    const id = instance ? tab.template_node_id : tab.id;
    if (id) {
      if (tabs.has(id))
        throw Error("模板分頁來源重複，請先處理 / Ambiguous tab identity");
      tabs.set(id, tab);
    }
  }
  for (const [tab, sections] of [
    ["base", data.sections],
    ...(data.tabs ?? []).map((t) => [
      instance ? (t.template_node_id ?? `private:${t.id}`) : t.id,
      t.sections,
    ]),
  ] as [string, CharacterSection[]][]) {
    for (const block of sections) {
      // Earlier instances wrapped a lone source component lazily; this mapping is deterministic, not guessed from names.
      if (
        instance &&
        !block.template_node_id &&
        block.contents?.length === 1 &&
        block.id === `block:${block.contents[0].id}` &&
        block.contents[0].template_node_id
      )
        block.template_node_id = `block:${block.contents[0].template_node_id}`;
      const bid = instance ? block.template_node_id : block.id;
      if (bid) {
        if (nodes.has(bid))
          throw Error("模板節點來源重複，請先處理 / Ambiguous node identity");
        nodes.set(bid, { node: block, parent: tab, tab });
      }
      for (const c of block.contents ?? []) {
        const id = instance ? c.template_node_id : c.id;
        if (id) {
          if (nodes.has(id))
            throw Error("模板節點來源重複，請先處理 / Ambiguous node identity");
          nodes.set(id, { node: c, parent: bid ?? `private:${block.id}`, tab });
        }
      }
    }
  }
  return { nodes, tabs };
}
export interface TemplateUpdateSummary {
  added: number;
  retained: number;
  renamed: number;
  moved: number;
  preservedOverrides: number;
}
/** Pure, deterministic with an injected ID factory. Never writes source/template or drops filled values. */
export function mergeCharacterTemplate(
  current: CharacterProfileData,
  sourceId: string,
  incoming: CharacterProfileData,
  makeId: () => string = () => `sec_${nanoid()}`,
) {
  if (
    !current.templateBinding ||
    current.templateBinding.sourceId !== sourceId ||
    current.templateSourceId !== sourceId
  )
    throw Error(
      "缺少可靠基準或來源不一致；不會猜測舊資料。 / Missing baseline or source mismatch",
    );
  const result = normalizeCharacterBlocks(current, "instance"),
    base = canonical(current.templateBinding.baseline, sourceId),
    next = canonical(incoming, sourceId);
  validateCharacterBlocks(result);
  validateCharacterBlocks(base);
  validateCharacterBlocks(next);
  const before = index(base),
    after = index(next),
    local = index(result, true);
  if (
    before.tabs.has("base") ||
    after.tabs.has("base") ||
    before.nodes.has("base") ||
    after.nodes.has("base")
  )
    throw Error("保留的節點 ID 無法安全更新 / Reserved node identity");
  for (const [id, old] of before.nodes) {
    const fresh = after.nodes.get(id);
    if (fresh && (old.node.type === "group") !== (fresh.node.type === "group"))
      throw Error(
        "區塊／組件層級不相容，請先在來源保留舊節點並新增新節點。 / Incompatible hierarchy",
      );
  }
  const summary: TemplateUpdateSummary = {
    added: 0,
    retained: 0,
    renamed: 0,
    moved: 0,
    preservedOverrides: 0,
  };
  const used = new Set<string>();
  for (const item of index(result).nodes.values()) used.add(item.node.id);
  for (const t of result.tabs ?? []) used.add(t.id);
  if (result.basicBlock) used.add(result.basicBlock.id);
  const fresh = () => {
    let id = makeId();
    let attempts = 0;
    while (used.has(id)) {
      if (++attempts > 100) throw Error("無法產生唯一 ID");
      id = makeId();
    }
    used.add(id);
    return id;
  };
  const collections = () =>
    new Map<string, CharacterSection[]>([
      ["base", result.sections],
      ...(result.tabs ?? []).map(
        (t) =>
          [t.template_node_id ?? `private:${t.id}`, t.sections] as [
            string,
            CharacterSection[],
          ],
      ),
    ]);
  const originalGroupOrder = new Map(
    [...collections()].map(([id, blocks]) => [
      id,
      blocks.map((b) => b.template_node_id ?? `private:${b.id}`),
    ]),
  );
  const originalChildOrder = new Map(
    [...local.nodes]
      .filter(([, v]) => v.node.type === "group")
      .map(([id, v]) => [
        id,
        (v.node.contents ?? []).map(
          (c) => c.template_node_id ?? `private:${c.id}`,
        ),
      ]),
  );
  const baseGroups = (tab: string) =>
    [...before.nodes]
      .filter(([, l]) => l.node.type === "group" && l.tab === tab)
      .map(([id]) => id);
  const baseChildren = (block: string) =>
    [...before.nodes]
      .filter(([, l]) => l.node.type !== "group" && l.parent === block)
      .map(([id]) => id);
  const changeAttributes = (
    node: CharacterSection,
    old: CharacterSection | undefined,
    upstream: CharacterSection,
  ) => {
    for (const key of ["title", "size"] as const) {
      if (old && equal(node[key], old[key])) {
        if (!equal(node[key], upstream[key])) {
          if (key === "title") {
            node.title = upstream.title;
            summary.renamed++;
          } else node.size = structuredClone(upstream.size);
        }
      } else if (!equal(node[key], upstream[key])) summary.preservedOverrides++;
    }
  };
  for (const [id, t] of after.tabs) {
    const existing = local.tabs.get(id),
      old = before.tabs.get(id);
    if (existing) {
      if (old && existing.title === old.title) existing.title = t.title;
      else if (existing.title !== t.title) summary.preservedOverrides++;
    } else if (!old) {
      const created = {
        id: fresh(),
        template_node_id: id,
        title: t.title,
        sections: [],
      };
      (result.tabs ??= []).push(created);
      local.tabs.set(id, created);
    }
  }
  // Resolve destination blocks first; a block deliberately deleted by the user is not resurrected.
  for (const [id, target] of after.nodes) {
    if (target.node.type !== "group") continue;
    const existing = local.nodes.get(id),
      old = before.nodes.get(id);
    if (existing) {
      changeAttributes(existing.node, old?.node, target.node);
      if (
        old &&
        existing.parent === old.parent &&
        target.parent !== old.parent &&
        collections().has(target.parent)
      ) {
        for (const blocks of collections().values()) {
          const i = blocks.indexOf(existing.node);
          if (i >= 0) blocks.splice(i, 1);
        }
        collections().get(target.parent)!.push(existing.node);
        existing.parent = target.parent;
        existing.tab = target.tab;
        summary.moved++;
      }
    } else if (!old && collections().has(target.tab)) {
      const created = {
        ...structuredClone(target.node),
        id: fresh(),
        template_node_id: id,
        contents: [],
      };
      collections().get(target.tab)!.push(created);
      local.nodes.set(id, {
        node: created,
        parent: target.parent,
        tab: target.tab,
      });
      summary.added++;
    }
  }
  const detach = (node: CharacterSection) => {
    for (const blocks of collections().values())
      for (const b of blocks) {
        const at = b.contents?.indexOf(node) ?? -1;
        if (at >= 0) b.contents!.splice(at, 1);
      }
  };
  const retain = (node: CharacterSection) => {
    detach(node);
    let block = result.sections.find((b) => b.retainedContent);
    if (!block) {
      block = {
        id: fresh(),
        type: "group",
        title: "保留內容",
        retainedContent: true,
        contents: [],
      };
      result.sections.push(block);
    }
    const origin = node.template_node_id;
    delete node.template_node_id;
    node.retained_template_node_id = origin;
    (block.contents ??= []).push(node);
    summary.retained++;
  };
  const replaced = new Set<string>();
  for (const [id, l] of [...local.nodes]) {
    if (l.node.type === "group") continue;
    const old = before.nodes.get(id),
      upstream = after.nodes.get(id);
    if (old && (!upstream || old.node.type !== upstream.node.type)) {
      retain(l.node);
      local.nodes.delete(id);
      if (upstream) replaced.add(id);
    }
  }
  for (const [id, target] of after.nodes) {
    if (target.node.type === "group") continue;
    const destination = local.nodes.get(target.parent)?.node;
    const existing = local.nodes.get(id),
      old = before.nodes.get(id);
    if (!existing) {
      if ((!old || replaced.has(id)) && destination?.type === "group") {
        const created = {
          ...structuredClone(target.node),
          id: fresh(),
          template_node_id: id,
        };
        (destination.contents ??= []).push(created);
        local.nodes.set(id, {
          node: created,
          parent: target.parent,
          tab: target.tab,
        });
        summary.added++;
      }
      continue;
    }
    changeAttributes(existing.node, old?.node, target.node);
    if (
      old &&
      existing.parent === old.parent &&
      target.parent !== old.parent &&
      destination?.type === "group"
    ) {
      detach(existing.node);
      (destination.contents ??= []).push(existing.node);
      existing.parent = target.parent;
      existing.tab = target.tab;
      summary.moved++;
    } else if (
      old &&
      existing.parent !== old.parent &&
      target.parent !== existing.parent
    )
      summary.preservedOverrides++;
  }
  // Preserve personal ordering; only an unchanged baseline order accepts upstream reordering.
  for (const [tab, blocks] of collections()) {
    const expected = [...after.nodes]
      .filter(([, l]) => l.node.type === "group" && l.tab === tab)
      .map(([id]) => id);
    if (equal(originalGroupOrder.get(tab) ?? [], baseGroups(tab))) {
      const rank = (b: CharacterSection) => {
        const i = expected.indexOf(b.template_node_id ?? "");
        return i < 0 ? Number.MAX_SAFE_INTEGER : i;
      };
      blocks.sort((a, b) => rank(a) - rank(b));
    } else if (!equal(originalGroupOrder.get(tab), expected))
      summary.preservedOverrides++;
    for (const b of blocks) {
      if (!b.template_node_id) continue;
      const id = b.template_node_id;
      if (equal(originalChildOrder.get(id) ?? [], baseChildren(id))) {
        const ids = (after.nodes.get(id)?.node.contents ?? []).map((c) => c.id);
        const rank = (c: CharacterSection) => {
          const i = ids.indexOf(c.template_node_id ?? "");
          return i < 0 ? Number.MAX_SAFE_INTEGER : i;
        };
        b.contents?.sort((a, c) => rank(a) - rank(c));
      } else summary.preservedOverrides++;
    }
  }
  // A removed container stays available for personal/empty content, without remaining bound to a deleted source node.
  for (const [id, l] of local.nodes)
    if (l.node.type === "group" && !after.nodes.has(id)) {
      delete l.node.template_node_id;
      l.node.retained_template_node_id = id;
    }
  const priorTabOrder = (result.tabs ?? [])
    .filter((t) => before.tabs.has(t.template_node_id ?? ""))
    .map((t) => t.template_node_id);
  if (
    equal(priorTabOrder, [...before.tabs.keys()]) &&
    (result.tabs ?? []).every((t) => !!t.template_node_id)
  ) {
    const order = [...after.tabs.keys()];
    result.tabs?.sort((a, b) => {
      const ai = order.indexOf(a.template_node_id ?? ""),
        bi = order.indexOf(b.template_node_id ?? "");
      return (ai < 0 ? Infinity : ai) - (bi < 0 ? Infinity : bi);
    });
  }
  if (
    result.basicBlock &&
    base.basicBlock &&
    next.basicBlock &&
    result.basicBlock.enabled === base.basicBlock.enabled
  )
    result.basicBlock.enabled = next.basicBlock.enabled;
  result.templateBinding = { sourceId, baseline: next };
  result.templateSourceId = sourceId;
  if (incoming.resourceSource)
    result.resourceSource = structuredClone(incoming.resourceSource);
  validateCharacterBlocks(result);
  return {
    data: result,
    summary,
    changed:
      !equal(canonical(current.templateBinding.baseline, sourceId), next) ||
      !equal(current.resourceSource, incoming.resourceSource),
  };
}
export function withTemplateSnapshot(
  before: CharacterProfileData,
  updated: CharacterProfileData,
  sourceId: string,
  now = Date.now(),
  metadata?: { title: string; attachmentIds: string[] },
): CharacterProfileData {
  const snapshot = structuredClone(before);
  delete snapshot.templateUpdateSnapshots;
  return {
    ...updated,
    templateUpdateSnapshots: [
      ...(before.templateUpdateSnapshots ?? []),
      {
        id: `snapshot_${nanoid()}`,
        at: now,
        sourceId,
        ...metadata,
        data: snapshot,
      },
    ],
  };
}
export function restoreTemplateSnapshot(
  current: CharacterProfileData,
  id: string,
) {
  const snapshot = current.templateUpdateSnapshots?.find((s) => s.id === id);
  if (!snapshot) throw Error("找不到快照 / Snapshot not found");
  return withTemplateSnapshot(
    current,
    {
      ...structuredClone(snapshot.data),
      templateUpdateSnapshots: current.templateUpdateSnapshots,
    },
    snapshot.sourceId,
  );
}
