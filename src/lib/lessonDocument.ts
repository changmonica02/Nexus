import type { JSONContent } from "@tiptap/core";

export interface LessonLayout {
  preset: "original" | "textbook" | "handout";
  fontSize: number;
  lineHeight: number;
  headingScale: number;
  header: string;
  footer: string;
  pageNumbers: boolean;
}
export const LESSON_PRESETS: Record<LessonLayout["preset"], Pick<LessonLayout, "fontSize" | "lineHeight" | "headingScale">> = {
  original: { fontSize: 16, lineHeight: 1.6, headingScale: 1 },
  textbook: { fontSize: 17, lineHeight: 1.9, headingScale: 1.15 },
  handout: { fontSize: 16, lineHeight: 1.7, headingScale: 1 },
};
const clamp = (value: unknown, min: number, max: number, fallback: number) => typeof value === "number" && Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;
export function readLessonLayout(doc: JSONContent & { lessonLayout?: Partial<LessonLayout> } = {}): LessonLayout {
  const raw = doc.lessonLayout ?? {};
  const preset = raw.preset === "textbook" || raw.preset === "handout" ? raw.preset : "original";
  return { preset, fontSize: clamp(raw.fontSize, 12, 24, LESSON_PRESETS[preset].fontSize), lineHeight: clamp(raw.lineHeight, 1.2, 2.5, LESSON_PRESETS[preset].lineHeight), headingScale: clamp(raw.headingScale, 0.8, 1.5, LESSON_PRESETS[preset].headingScale), header: typeof raw.header === "string" ? raw.header.slice(0, 120) : "", footer: typeof raw.footer === "string" ? raw.footer.slice(0, 120) : "", pageNumbers: raw.pageNumbers !== false };
}
export const LESSON_LABELS: Record<string, string> = { definition: "定義", example: "例題", exercise: "練習", answer: "解答" };
export interface LessonEntry { id: string; title: string; level: number; page: number; kind: string; number?: number }
export function lessonText(node: JSONContent): string {
  return node.text ?? (node.content ?? []).map(lessonText).join("");
}
export function buildLessonIndex(doc: JSONContent): LessonEntry[] {
  const entries: LessonEntry[] = [];
  const counts: Record<string, number> = {};
  let page = 1;
  function visit(node: JSONContent) {
    if (node.type === "pageBreak") { page++; return; }
    const id = node.attrs?.id;
    const kind = node.type === "heading" ? "heading" : node.type === "lessonBlock" ? node.attrs?.kind : node.type === "paragraph" && node.attrs?.lessonStyle === "caption" ? "figure" : null;
    if (id && kind && kind !== "answer") {
      const numbered = kind === "example" || kind === "exercise" || kind === "figure";
      const number = numbered ? (counts[kind] = (counts[kind] ?? 0) + 1) : undefined;
      entries.push({ id, kind, page, level: node.type === "heading" ? node.attrs?.level ?? 1 : 0, number, title: lessonText(node).slice(0, 100) || LESSON_LABELS[kind] || "未命名標題" });
    }
    node.content?.forEach(visit);
  }
  visit(doc);
  return entries;
}

/** Preserve manual boundaries and every original block. Oversize blocks remain intact. */
export function paginateLessonBlocks(blocks: JSONContent[], heights: number[], capacity: number) {
  const output: JSONContent[] = [];
  let used = 0;
  let oversized = 0;
  for (let index = 0; index < blocks.length; index++) {
    const block = blocks[index];
    if (block.type === "pageBreak") { output.push(block); used = 0; continue; }
    const group = [block];
    let size = heights[index] ?? 0;
    // A run of headings stays with its first content block; captions stay with images.
    while ((group[group.length - 1].type === "heading" || (group[group.length - 1].type === "image" && blocks[index + 1]?.attrs?.lessonStyle === "caption")) && blocks[index + 1] && blocks[index + 1].type !== "pageBreak") {
      index++;
      group.push(blocks[index]);
      size += heights[index] ?? 0;
    }
    if (used > 0 && used + size > capacity) { output.push({ type: "pageBreak" }); used = 0; }
    if (size > capacity) oversized++;
    output.push(...group);
    used += size;
  }
  return { blocks: output, oversized };
}
