import type { CSSProperties } from "react";
import type { PageFormat, PageMargins } from "../lib/types";
import { DEFAULT_PAGE_MARGINS } from "../lib/types";

type PreviewNode = {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  content?: PreviewNode[];
};

type PageDimensions = { widthMm: number; heightMm: number; aspectRatio: string };

function getPageDimensions(format: PageFormat): PageDimensions {
  if (format === "a4" || format === "paged") return { widthMm: 210, heightMm: 297, aspectRatio: "210 / 297" };
  if (format === "16:9") return { widthMm: 254, heightMm: 142.875, aspectRatio: "16 / 9" };
  if (format === "4:3") return { widthMm: 211.667, heightMm: 158.75, aspectRatio: "4 / 3" };
  return { widthMm: 217, heightMm: 297, aspectRatio: "210 / 297" };
}

function getText(node?: PreviewNode): string {
  if (!node) return "";
  if (node.type === "text") return node.text || "";
  return (node.content || []).map(getText).join("");
}

function getAttr(node: PreviewNode, key: string): string {
  const value = node.attrs?.[key];
  return typeof value === "string" ? value : "";
}

const baseTextStyle: CSSProperties = {
  color: "inherit",
  fontSize: "3px",
  lineHeight: 1.35,
  overflowWrap: "anywhere",
};

function PreviewBlock({ node }: { node: PreviewNode }) {
  const text = getText(node);
  const children = node.content || [];

  switch (node.type) {
    case "heading": {
      const level = Number(node.attrs?.level || 1);
      const fontSize = level === 1 ? "5px" : level === 2 ? "4.2px" : "3.6px";
      return <div style={{ ...baseTextStyle, fontSize, fontWeight: 700, lineHeight: 1.2, marginBottom: "2px" }}>{text}</div>;
    }
    case "paragraph":
      return <div style={{ ...baseTextStyle, marginBottom: "1.5px", minHeight: "3px" }}>{text}</div>;
    case "bulletList":
    case "orderedList":
    case "taskList": {
      const marker = node.type === "orderedList" ? "1." : node.type === "taskList" ? "☐" : "•";
      return (
        <div style={{ marginBottom: "1.5px", paddingLeft: "3px" }}>
          {children.slice(0, 12).map((item, index) => (
            <div key={`${item.type || "item"}-${index}`} style={{ ...baseTextStyle, display: "flex", gap: "1px" }}>
              <span>{node.type === "orderedList" ? `${index + 1}.` : marker}</span>
              <span>{getText(item)}</span>
            </div>
          ))}
        </div>
      );
    }
    case "codeBlock":
      return <div style={{ ...baseTextStyle, marginBottom: "2px", padding: "2px", borderRadius: "1px", background: "rgba(100,116,139,0.14)", fontFamily: "monospace", whiteSpace: "pre-wrap" }}>{text}</div>;
    case "blockquote":
      return <div style={{ ...baseTextStyle, marginBottom: "2px", paddingLeft: "2px", borderLeft: "1px solid #94a3b8", opacity: 0.8 }}>{text}</div>;
    case "lessonToc":
      return <div style={baseTextStyle}>目錄</div>;
    case "answerSpace":
      return <div style={{ height: `${Math.min(12, Number(node.attrs?.lines) || 4) * 4}px`, borderBottom: "1px solid #aaa" }} />;
    case "lessonBlock":
    case "callout":
      return <div style={{ ...baseTextStyle, marginBottom: "2px", padding: "2px", borderRadius: "1px", background: "rgba(59,130,246,0.12)" }}>{text}</div>;
    case "table":
      return (
        <div style={{ marginBottom: "2px", border: "0.5px solid rgba(100,116,139,0.55)" }}>
          {children.slice(0, 8).map((row, rowIndex) => (
            <div key={`row-${rowIndex}`} style={{ display: "flex", borderTop: rowIndex === 0 ? "none" : "0.5px solid rgba(100,116,139,0.45)" }}>
              {(row.content || []).slice(0, 5).map((cell, cellIndex) => (
                <span key={`cell-${cellIndex}`} style={{ ...baseTextStyle, flex: 1, minWidth: 0, padding: "1px", borderLeft: cellIndex === 0 ? "none" : "0.5px solid rgba(100,116,139,0.45)" }}>{getText(cell)}</span>
              ))}
            </div>
          ))}
        </div>
      );
    case "image": {
      const source = getAttr(node, "src");
      return source ? <div style={{ height: "18px", marginBottom: "2px", borderRadius: "1px", background: `center / cover no-repeat url(${JSON.stringify(source)})` }} /> : <div style={{ height: "12px", marginBottom: "2px", background: "rgba(100,116,139,0.18)" }} />;
    }
    case "horizontalRule":
      return <div style={{ height: "1px", margin: "2px 0", background: "rgba(100,116,139,0.6)" }} />;
    case "multiColumn":
      return (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.max(1, children.length)}, minmax(0, 1fr))`, gap: "2px", marginBottom: "2px" }}>
          {children.map((column, index) => <div key={`column-${index}`}>{(column.content || []).map((block, blockIndex) => <PreviewBlock key={`${block.type || "block"}-${blockIndex}`} node={block} />)}</div>)}
        </div>
      );
    case "inlineMath":
    case "blockMath":
      return <div style={{ ...baseTextStyle, marginBottom: "1.5px", fontFamily: "serif", fontStyle: "italic" }}>{getAttr(node, "latex") || text}</div>;
    case "pageBreak":
      return null;
    default:
      return text ? <div style={{ ...baseTextStyle, marginBottom: "1.5px" }}>{text}</div> : null;
  }
}

export default function PageThumbnail({
  blocks,
  format,
  margins,
  nightAdapt = false,
}: {
  blocks: PreviewNode[];
  format: PageFormat;
  margins?: PageMargins;
  nightAdapt?: boolean;
}) {
  const dimensions = getPageDimensions(format);
  const activeMargins = margins || DEFAULT_PAGE_MARGINS;
  const inset: CSSProperties = {
    top: `${Math.max(0, (activeMargins.top / dimensions.heightMm) * 100)}%`,
    right: `${Math.max(0, (activeMargins.right / dimensions.widthMm) * 100)}%`,
    bottom: `${Math.max(0, (activeMargins.bottom / dimensions.heightMm) * 100)}%`,
    left: `${Math.max(0, (activeMargins.left / dimensions.widthMm) * 100)}%`,
  };

  return (
    <div
      aria-hidden="true"
      className="relative w-full overflow-hidden rounded-sm"
      style={{ aspectRatio: dimensions.aspectRatio, background: nightAdapt ? "var(--color-editor-bg)" : "white", color: nightAdapt ? "var(--color-text)" : "#1a1a1a", border: "1px solid var(--color-border)", boxShadow: "0 1px 2px rgba(0,0,0,0.1)", pointerEvents: "none" }}
    >
      <div className="absolute overflow-hidden" style={inset}>
        {blocks.slice(0, 50).map((block, index) => <PreviewBlock key={`${getAttr(block, "id") || block.type || "block"}-${index}`} node={block} />)}
      </div>
    </div>
  );
}

