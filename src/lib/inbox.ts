import { createClientBlockId } from "./blockId";
import type { Page } from "./types";

/** Markdown import ???.md / .markdown / .txt 檔?衍?標???*/
export function titleFromMarkdownFileName(fileName: string): string {
  const withoutExt = fileName.replace(/\.(md|markdown|txt)$/i, "").trim();
  return withoutExt || "Imported Markdown";
}

/** Quick Capture ?容?第一行、截?至 60 字?作為標???*/
export function titleFromCaptureText(text: string): string {
  const firstLine = text.split("\n")[0]?.trim() || "";
  const truncated = firstLine.length > 60 ? `${firstLine.slice(0, 60)}?` : firstLine;
  return truncated || "Quick capture";
}

/** ?Quick Capture 純?字???content_json，???空??為一?段??*/
export function captureTextToContentJson(text: string): object {
  const paragraphs = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (paragraphs.length === 0) {
    return { type: "doc", content: [{ type: "paragraph", attrs: { id: createClientBlockId() } }] };
  }

  return {
    type: "doc",
    content: paragraphs.map((line) => ({
      type: "paragraph",
      attrs: { id: createClientBlockId() },
      content: [{ type: "text", text: line }],
    })),
  };
}

/**
 * ?斷?否??Inbox ?面（System View，? 01-CANON 14.9 節）? * ??以既??folder / tags 欄?實?，???資?模??? */
export function isInboxPage(page: Page): boolean {
  return page.folder === "Inbox" || (page.tags || []).includes("inbox");
}