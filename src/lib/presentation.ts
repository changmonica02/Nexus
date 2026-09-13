import { nanoid } from "nanoid";
import type { Page, Slide, PresentationData, ChartData } from "./types";

function getTextFromNode(node: any): string {
  if (!node) return "";
  if (node.type === "text") return node.text || "";
  if (Array.isArray(node.content)) return node.content.map(getTextFromNode).join("");
  return "";
}

function createEmptyDoc(text?: string): object {
  if (text) {
    return { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] };
  }
  return { type: "doc", content: [{ type: "paragraph" }] };
}

function createTextBlock(text: string, x: number, y: number, w: number, h: number, z: number): import("./types").PresentationBlock {
  return {
    id: `blk_${nanoid()}`,
    type: "text",
    x, y, w, h, z,
    text,
    content_json: createEmptyDoc(text),
    style: { fontSize: 16 },
  };
}

export function createEmptyPresentation(title?: string): PresentationData {
  const firstSlide: Slide = {
    id: `slide_${nanoid()}`,
    layout: "title",
    title: title || "Untitled Presentation",
    content_json: createEmptyDoc(),
    content_text: "",
    blocks: [
      createTextBlock(title || "Untitled Presentation", 10, 30, 80, 20, 1),
      createTextBlock("點擊新增文字區塊開始編輯", 10, 55, 80, 10, 2),
    ],
  };
  return {
    theme: "minimal",
    slides: [firstSlide],
  };
}

/**
 * Convert a Note/Document Page's content_json into slides
 * Hybrid approach: H1 = new slide, H2 = section within slide or new slide depending on density
 * Weak linkage: sourcePageId stored
 */
export function noteToPresentation(page: Page): PresentationData {
  const doc = (page.content_json as any) || { content: [] };
  const blocks: any[] = doc.content || [];

  const slides: Slide[] = [];
  let currentSlideBlocks: any[] = [];
  let currentTitle = page.title || "Slide";

  function flushCurrent() {
    if (currentSlideBlocks.length === 0 && slides.length > 0) return;
    const hasTable = currentSlideBlocks.some((b: any) => b.type === "table");
    const layout = hasTable ? "chart" : currentSlideBlocks.length === 0 ? "title" : "title_content";

    let chart: ChartData | undefined;
    if (hasTable) {
      const tableNode = currentSlideBlocks.find((b: any) => b.type === "table");
      if (tableNode) {
        const rows = (tableNode.content || []).map((r: any) => (r.content || []).map((c: any) => getTextFromNode(c).trim()));
        if (rows.length >= 2) {
          const data = rows.slice(1).map((r: string[]) => ({ label: r[0] || "", value: Number(r[1]) || 0 })).filter((d: any) => d.label);
          if (data.length > 0) chart = { type: "bar", variant: "single", orientation: "vertical", data };
        }
      }
    }

    // Convert Tiptap blocks to canvas PresentationBlocks for intuitive drag editing
    const textContent = currentSlideBlocks.map(getTextFromNode).join("\n\n");
    // M3 fix: 不再截斷至 200 字。slide 上顯示前幾個 block 的完整文字，
    // 完整內容保留在 speaker notes，避免靜默丟失長段落。
    const visibleBlocks = currentSlideBlocks.slice(0, 5);
    const slideBlocks: import("./types").PresentationBlock[] = [
      createTextBlock(currentTitle, 5, 5, 90, 12, 1),
      ...visibleBlocks.map((b: any, i: number) => {
        const txt = getTextFromNode(b);
        if (!txt) return null;
        return createTextBlock(txt, 5, 20 + i * 16, 90, 14, 10 + i);
      }).filter(Boolean) as import("./types").PresentationBlock[]
    ];

    const slide: Slide = {
      id: `slide_${nanoid()}`,
      layout: layout as any,
      title: currentTitle,
      content_json: { type: "doc", content: currentSlideBlocks.length > 0 ? currentSlideBlocks : [{ type: "paragraph" }] },
      content_text: textContent,
      chart,
      blocks: slideBlocks,
    };
    slides.push(slide);
    currentSlideBlocks = [];
  }

  for (const block of blocks) {
    if (block.type === "heading" && (block.attrs?.level === 1 || block.attrs?.level === 2)) {
      // If we already have content, flush previous slide
      if (currentSlideBlocks.length > 0 || slides.length === 0) {
        if (currentSlideBlocks.length > 0) flushCurrent();
        currentTitle = getTextFromNode(block) || `Slide ${slides.length + 1}`;
        // For H1, title is the slide title, not included in body. For H2, include as title and also maybe as content?
        // We'll not include the heading block itself in slide body to avoid duplication, unless it's H2 and we want it as section
        if (block.attrs?.level === 1) {
          continue; // skip adding H1 to body
        }
      }
    }
    currentSlideBlocks.push(block);
    // Auto split if too many blocks (avoid huge slides)
    if (currentSlideBlocks.length > 8) {
      flushCurrent();
      currentTitle = `Slide ${slides.length + 1}`;
    }
  }
  flushCurrent();

  // Ensure at least one slide
  if (slides.length === 0) {
    slides.push({
      id: `slide_${nanoid()}`,
      layout: "title_content",
      title: page.title || "Untitled",
      content_json: doc,
      content_text: page.content_text || "",
    });
  }

  // Generate TOC slide if more than 4 slides
  if (slides.length > 4) {
    const tocSlide: Slide = {
      id: `slide_${nanoid()}`,
      layout: "toc",
      title: "目錄",
      content_json: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: `包含 ${slides.length} 張投影片` }] }] },
      content_text: slides.map((s, i) => `${i + 1}. ${s.title}`).join("\n"),
    };
    slides.unshift(tocSlide);
  }

  return {
    theme: "minimal",
    slides,
    sourcePageId: page.id,
  };
}

export function createSlide(layout: Slide["layout"] = "title_content"): Slide {
  const title = layout === "title" ? "標題投影片" : `投影片`;
  return {
    id: `slide_${nanoid()}`,
    layout,
    title,
    content_json: createEmptyDoc(),
    content_text: "",
    blocks: [
      createTextBlock(title, 5, 5, 90, 12, 1),
      createTextBlock("點擊新增文字區塊開始編輯", 5, 25, 90, 15, 2),
    ],
  };
}

export function updateSlideContent(slide: Slide, json: any, text: string): Slide {
  return { ...slide, content_json: json, content_text: text };
}
