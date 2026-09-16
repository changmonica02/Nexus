import type { NovelChapter, Page } from "./types";

export const emptyNovelDocument = () => ({ type: "doc", content: [{ type: "paragraph" }] });

export function getNovelChapters(pages: Page[], novelId: string): NovelChapter[] {
  return pages.filter((page): page is NovelChapter => page.kind === "novel_chapter" && page.parent_id === novelId && page.deleted_at === null)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.id.localeCompare(b.id));
}

type Node = { type?: string; text?: string; attrs?: { level?: number }; content?: Node[] };
function textOf(node: Node): string {
  return node.text ?? (node.content || []).map(textOf).join("") + (["paragraph", "heading"].includes(node.type || "") ? "\n" : "");
}

/** Preserve every block, including any preface before the first H1. */
export function splitLegacyNovel(page: Page): Array<Pick<NovelChapter, "title" | "content_json" | "content_text">> {
  const chapters: Array<{ title: string; nodes: Node[] }> = [];
  const nodes = (page.content_json as Node)?.content || [];
  // Some imported legacy works only have plain text. Never clear that text
  // without first placing it in an editable chapter document.
  if (nodes.every((node) => node.type === "paragraph" && !node.content?.length) && page.content_text?.trim()) {
    return [{ title: "第1章", content_text: page.content_text, content_json: {
      type: "doc", content: page.content_text.split("\n").map((text) => ({
        type: "paragraph", ...(text ? { content: [{ type: "text", text }] } : {}),
      })),
    } }];
  }
  for (const node of nodes) {
    if (node.type === "heading" && node.attrs?.level === 1) {
      chapters.push({ title: textOf(node).trim() || `第${chapters.length + 1}章`, nodes: [] });
    } else {
      if (!chapters.length) chapters.push({ title: "序章", nodes: [] });
      chapters[chapters.length - 1].nodes.push(node);
    }
  }
  if (chapters.length === 1 && chapters[0].title === "序章") chapters[0].title = "第1章";
  return chapters.map(({ title, nodes }) => ({ title, content_json: { type: "doc", content: nodes.length ? nodes : [{ type: "paragraph" }] }, content_text: nodes.map(textOf).join("").trim() }));
}
