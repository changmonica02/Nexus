import { createClientBlockId } from "./blockId";
import type { Page } from "./types";

function getTextFromNode(node: any): string {
  if (!node) return "";
  if (node.type === "text") return node.text || "";
  if (Array.isArray(node.content)) return node.content.map(getTextFromNode).join("");
  return "";
}

function escapeMarkdownText(text: string): string { return text.replace(/\\/g, "\\\\"); }

function inlineNodesToMarkdown(nodes: any[] | undefined): string {
  if (!nodes || nodes.length === 0) return "";
  return nodes.map((node) => {
    if (node.type === "inlineMath") { const latex = typeof node.attrs?.latex === "string" ? node.attrs.latex : ""; return `$${latex}$`; }
    if (node.type === "pageBreak") return "\n--- PAGE BREAK ---\n";
    if (node.type !== "text") return getTextFromNode(node);
    let text = escapeMarkdownText(node.text || "");
    const marks = node.marks || [];
    for (const mark of marks) { if (mark.type === "code") text = `\`${text}\``; }
    for (const mark of marks) { if (mark.type === "bold") text = `**${text}**`; }
    for (const mark of marks) { if (mark.type === "italic") text = `*${text}*`; }
    for (const mark of marks) { if (mark.type === "link") text = `[${text}](${mark.attrs?.href || ""})`; }
    return text;
  }).join("");
}

function listItemToMarkdown(node: any, ordered: boolean, index: number): string {
  const prefix = ordered ? `${index + 1}.` : "- ";
  const content = node.content || [];
  const firstParagraph = content.find((child: any) => child.type === "paragraph");
  const firstLine = firstParagraph ? inlineNodesToMarkdown(firstParagraph.content) : getTextFromNode(node);
  if (!ordered && firstLine.startsWith("☐")) return `- [ ] ${firstLine.slice(2)}`;
  if (!ordered && firstLine.startsWith("☑")) return `- [x] ${firstLine.slice(2)}`;
  return `${prefix}${firstLine}`;
}

function taskItemToMarkdownLine(node: any): string {
  const checked = !!node.attrs?.checked;
  const content = node.content || [];
  const firstParagraph = content.find((child: any) => child.type === "paragraph");
  const firstLine = firstParagraph ? inlineNodesToMarkdown(firstParagraph.content) : getTextFromNode(node);
  return `- [${checked ? "x" : " "}] ${firstLine}`;
}

function tableCellToMarkdown(cell: any): string {
  const content = cell.content || [];
  const text = content.map((child: any) => inlineNodesToMarkdown(child.content)).join(" ");
  return text.replace(/\|/g, "\\|").trim();
}

function tableToMarkdown(node: any): string {
  const rows = (node.content || []).filter((row: any) => row.type === "tableRow");
  if (rows.length === 0) return "";
  const rowToCells = (row: any) => (row.content || []).map(tableCellToMarkdown);
  const headerCells = rowToCells(rows[0]);
  const bodyRows = rows.slice(1).map(rowToCells);
  return [`| ${headerCells.join(" | ")} |`, `| ${headerCells.map(() => "---").join(" | ")} |`, ...bodyRows.map((cells: string[]) => `| ${cells.join(" | ")} |`)].join("\n");
}

const CALLOUT_VARIANT_TO_TAG: Record<string, string> = { info: "INFO", warning: "WARNING", success: "SUCCESS", danger: "DANGER", note: "NOTE" };
const CALLOUT_TAG_TO_VARIANT: Record<string, string> = { INFO: "info", WARNING: "warning", SUCCESS: "success", DANGER: "danger", NOTE: "note", TIP: "info", CAUTION: "warning", IMPORTANT: "danger" };

function calloutToMarkdown(node: any): string {
  const variant = typeof node.attrs?.variant === "string" ? node.attrs.variant : "info";
  const tag = CALLOUT_VARIANT_TO_TAG[variant] || "INFO";
  const icon = typeof node.attrs?.icon === "string" ? node.attrs.icon : "";
  const header = icon ? `> [!${tag}] ${icon}` : `> [!${tag}]`;
  const inner = (node.content || []).map(nodeToMarkdown).filter((part: string) => part.trim().length > 0).join("\n\n");
  const bodyLines = inner.split("\n").map((line: string) => (line ? `> ${line}` : ">"));
  return [header, ...bodyLines].join("\n");
}

function nodeToMarkdown(node: any): string {
  if (!node) return "";
  switch (node.type) {
    case "heading": { const level = Math.max(1, Math.min(6, node.attrs?.level || 1)); return `${"#".repeat(level)} ${inlineNodesToMarkdown(node.content)}`; }
    case "paragraph": return inlineNodesToMarkdown(node.content);
    case "bulletList": return (node.content || []).map((item: any, index: number) => listItemToMarkdown(item, false, index)).join("\n");
    case "orderedList": return (node.content || []).map((item: any, index: number) => listItemToMarkdown(item, true, index)).join("\n");
    case "taskList": return (node.content || []).map((item: any) => taskItemToMarkdownLine(item)).join("\n");
    case "table": return tableToMarkdown(node);
    case "callout": return calloutToMarkdown(node);
    case "pageBreak": return "<!-- pagebreak -->";
    case "blockMath": { const latex = typeof node.attrs?.latex === "string" ? node.attrs.latex : ""; return `$$\n${latex}\n$$`; }
    case "blockquote": { const inner = (node.content || []).map(nodeToMarkdown).join("\n"); return inner.split("\n").map((line: string) => `> ${line}`).join("\n"); }
    case "codeBlock": return `\`\`\`\n${getTextFromNode(node)}\n\`\`\``;
    case "horizontalRule": return "---";
    case "image": { const src = node.attrs?.src || ""; const alt = node.attrs?.alt || ""; return `![${alt}](${src})`; }
    default: return getTextFromNode(node);
  }
}

export function pageToMarkdown(page: Page): string {
  const content = (page.content_json as any)?.content || [];
  const body = content.map(nodeToMarkdown).filter((part: string) => part.trim().length > 0).join("\n\n");
  return `# ${page.title?.trim() || "Untitled"}\n\n${body}\n`;
}

function textNode(text: string, marks?: any[]): any {
  if (!text) return null;
  return marks && marks.length > 0 ? { type: "text", text, marks } : { type: "text", text };
}

function parseInlineMarkdown(text: string): any[] {
  const nodes: any[] = [];
  let i = 0;
  while (i < text.length) {
    const rest = text.slice(i);
    const inlineMathMatch = rest.match(/^\$([^$\n]+)\$(?!\$)/);
    if (inlineMathMatch && !rest.startsWith("$$")) {
      nodes.push({ type: "inlineMath", attrs: { latex: inlineMathMatch[1].trim() } });
      i += inlineMathMatch[0].length; continue;
    }
    const codeMatch = rest.match(/`([^`]+)`/);
    if (codeMatch && codeMatch.index === 0) { nodes.push(textNode(codeMatch[1], [{ type: "code" }])); i += codeMatch[0].length; continue; }
    const linkMatch = rest.match(/^\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch) { nodes.push(textNode(linkMatch[1], [{ type: "link", attrs: { href: linkMatch[2], target: "_blank", rel: "noopener noreferrer" } }])); i += linkMatch[0].length; continue; }
    const boldMatch = rest.match(/^\*\*([^*]+)\*\*/);
    if (boldMatch) { nodes.push(textNode(boldMatch[1], [{ type: "bold" }])); i += boldMatch[0].length; continue; }
    const italicMatch = rest.match(/^\*([^*]+)\*/);
    if (italicMatch) { nodes.push(textNode(italicMatch[1], [{ type: "italic" }])); i += italicMatch[0].length; continue; }
    let next = text.length;
    for (const token of ["`", "[", "**", "*", "$"]) { const idx = text.indexOf(token, i + 1); if (idx !== -1) next = Math.min(next, idx); }
    const plain = text.slice(i, next);
    const node = textNode(plain);
    if (node) nodes.push(node);
    i = next;
  }
  return nodes.length > 0 ? nodes : [];
}

function paragraphNode(text: string): any {
  const content = parseInlineMarkdown(text);
  return content.length > 0 ? { type: "paragraph", content } : { type: "paragraph" };
}

function listItemNode(text: string): any { return { type: "listItem", content: [paragraphNode(text)] }; }

export function createMarkdownContent(markdown: string): object {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const content: any[] = [];
  let paragraphBuffer: string[] = [];
  type ListItemDraft = { text: string; checked?: boolean };
  let listBuffer: { kind: "bullet" | "ordered" | "task"; items: ListItemDraft[] } | null = null;
  let codeBuffer: string[] | null = null;

  function flushParagraph() { const text = paragraphBuffer.join(" ").trim(); if (text) content.push(paragraphNode(text)); paragraphBuffer = []; }
  function flushList() {
    if (!listBuffer) return;
    if (listBuffer.kind === "task") {
      content.push({ type: "taskList", content: listBuffer.items.map((item) => ({ type: "taskItem", attrs: { checked: !!item.checked }, content: [paragraphNode(item.text)] })) });
    } else {
      content.push({ type: listBuffer.kind === "ordered" ? "orderedList" : "bulletList", content: listBuffer.items.map((item) => listItemNode(item.text)) });
    }
    listBuffer = null;
  }

  let index = 0;
  while (index < lines.length) {
    const rawLine = lines[index];
    const line = rawLine.replace(/\s+$/g, "");
    if (codeBuffer) {
      if (/^```/.test(line.trim())) { content.push({ type: "codeBlock", content: [{ type: "text", text: codeBuffer.join("\n") }] }); codeBuffer = null; }
      else codeBuffer.push(rawLine);
      index += 1; continue;
    }
    if (/^```/.test(line.trim())) { flushParagraph(); flushList(); codeBuffer = []; index += 1; continue; }
    if (line.trim() === "$$") {
      flushParagraph(); flushList();
      const mathLines: string[] = [];
      let cursor = index + 1;
      while (cursor < lines.length && lines[cursor].trim() !== "$$") { mathLines.push(lines[cursor]); cursor += 1; }
      content.push({ type: "blockMath", attrs: { latex: mathLines.join("\n").trim() } });
      index = cursor < lines.length ? cursor + 1 : cursor; continue;
    }
    if (!line.trim()) { flushParagraph(); flushList(); index += 1; continue; }
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) { flushParagraph(); flushList(); content.push({ type: "heading", attrs: { level: headingMatch[1].length }, content: parseInlineMarkdown(headingMatch[2]) }); index += 1; continue; }
    const taskMatch = line.match(/^\s*[-*+]\s+\[([ xX])\]\s+(.*)$/);
    if (taskMatch) { flushParagraph(); if (!listBuffer || listBuffer.kind !== "task") { flushList(); listBuffer = { kind: "task", items: [] }; } listBuffer.items.push({ text: taskMatch[2], checked: taskMatch[1].toLowerCase() === "x" }); index += 1; continue; }
    const bulletMatch = line.match(/^\s*[-*+]\s+(.*)$/);
    if (bulletMatch) { flushParagraph(); if (!listBuffer || listBuffer.kind !== "bullet") { flushList(); listBuffer = { kind: "bullet", items: [] }; } listBuffer.items.push({ text: bulletMatch[1] }); index += 1; continue; }
    const orderedMatch = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (orderedMatch) { flushParagraph(); if (!listBuffer || listBuffer.kind !== "ordered") { flushList(); listBuffer = { kind: "ordered", items: [] }; } listBuffer.items.push({ text: orderedMatch[1] }); index += 1; continue; }
    if (/^<!--\s*pagebreak\s*-->$/.test(line.trim())) { flushParagraph(); flushList(); content.push({ type: "pageBreak" }); index += 1; continue; }
    const calloutHeaderMatch = line.match(/^>\s*\[!(\w+)\]\s*(.*)$/);
    if (calloutHeaderMatch) {
      flushParagraph(); flushList();
      const tag = calloutHeaderMatch[1].toUpperCase();
      const variant = CALLOUT_TAG_TO_VARIANT[tag] || "info";
      const icon = calloutHeaderMatch[2].trim();
      const innerLines: string[] = [];
      let cursor = index + 1;
      while (cursor < lines.length && /^>\s?/.test(lines[cursor])) { innerLines.push(lines[cursor].replace(/^>\s?/, "")); cursor += 1; }
      const innerContent = (createMarkdownContent(innerLines.join("\n")) as any).content || [{ type: "paragraph" }];
      content.push({ type: "callout", attrs: { variant, icon: icon || null }, content: innerContent });
      index = cursor; continue;
    }
    const quoteMatch = line.match(/^>\s?(.*)$/);
    if (quoteMatch) { flushParagraph(); flushList(); content.push({ type: "blockquote", content: [paragraphNode(quoteMatch[1])] }); index += 1; continue; }
    if (/^---+$/.test(line.trim())) { flushParagraph(); flushList(); content.push({ type: "horizontalRule" }); index += 1; continue; }
    flushList();
    paragraphBuffer.push(line.trim());
    index += 1;
  }
  if (codeBuffer) content.push({ type: "codeBlock", content: [{ type: "text", text: codeBuffer.join("\n") }] });
  flushParagraph();
  flushList();
  return { type: "doc", content: content.length > 0 ? content : [{ type: "paragraph", attrs: { id: createClientBlockId() } }] };
}

export function titleFromMarkdownFileName(fileName: string): string {
  const withoutExt = fileName.replace(/\.(md|markdown|txt)$/i, "").trim();
  return withoutExt || "Imported Markdown";
}
