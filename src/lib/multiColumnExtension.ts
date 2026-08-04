"use client";
import { Node, mergeAttributes } from "@tiptap/core";

export const Column = Node.create({
  name: "column",
  group: "column",
  content: "block+",
  defining: true,
  isolating: false,

  parseHTML() {
    return [{ tag: 'div[data-type="column"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "column", class: "nexus-column", style: "min-width:0;" }), 0];
  },
});

export const MultiColumn = Node.create({
  name: "multiColumn",
  group: "block",
  content: "column{2,3}",
  defining: true,
  isolating: false,

  addAttributes() {
    return {
      cols: {
        default: 2,
        parseHTML: (el) => {
          const attr = el.getAttribute("data-cols");
          const n = attr ? parseInt(attr, 10) : 2;
          return isNaN(n) ? 2 : Math.min(3, Math.max(2, n));
        },
        renderHTML: (attrs) => ({ "data-cols": String(attrs.cols) }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="multiColumn"]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const cols = node.attrs.cols || 2;
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "multiColumn",
        "data-cols": String(cols),
        class: "nexus-multi-column",
        style: `display:grid; grid-template-columns: repeat(${cols}, minmax(0, 1fr)); gap: 16px; margin: 1rem 0; padding: 0.5rem; border: 1px dashed var(--color-border); border-radius: 8px;`,
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setMultiColumn:
        (cols: number = 2) =>
        ({ chain }: any) => {
          const c = Math.min(3, Math.max(2, cols));
          const columns = Array.from({ length: c }).map(() => ({
            type: "column",
            content: [{ type: "paragraph" }],
          }));
          return chain()
            .insertContent({
              type: "multiColumn",
              attrs: { cols: c },
              content: columns,
            })
            .run();
        },
      unsetMultiColumn:
        () =>
        ({ chain, state }: any) => {
          // Lift columns content to parent
          const { $from } = state.selection;
          let depth = $from.depth;
          for (let d = depth; d > 0; d--) {
            const node = $from.node(d);
            if (node.type.name === "multiColumn") {
              const pos = $from.before(d);
              const end = pos + node.nodeSize;
              // Replace multiColumn with its inner blocks flattened
              // Simplified: delete and insert paragraphs
              const content: any[] = [];
              node.forEach((colNode: any) => {
                colNode.forEach((block: any) => {
                  content.push(block.toJSON());
                });
              });
              return chain().deleteRange({ from: pos, to: end }).insertContentAt(pos, content).run();
            }
          }
          return false;
        },
    } as any;
  },
});

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    multiColumn: {
      setMultiColumn: (cols?: number) => ReturnType;
      unsetMultiColumn: () => ReturnType;
    };
  }
}
