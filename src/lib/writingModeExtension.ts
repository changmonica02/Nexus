"use client";
import { Extension } from "@tiptap/core";

export const WritingModeExtension = Extension.create({
  name: "writingMode",

  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading", "tableCell", "tableHeader", "column"],
        attributes: {
          writingMode: {
            default: null,
            parseHTML: (element) => element.style.writingMode || null,
            renderHTML: (attributes) => {
              if (!attributes.writingMode) return {};
              return { style: `writing-mode: ${attributes.writingMode}` };
            },
          },
          textOrientation: {
            default: null,
            parseHTML: (element) => element.style.textOrientation || null,
            renderHTML: (attributes) => {
              if (!attributes.textOrientation) return {};
              // writingMode already includes style, need to merge
              return {};
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      toggleWritingMode:
        () =>
        ({ state, chain }: any) => {
          const { $from } = state.selection;
          // Find current block with writingMode
          for (let d = $from.depth; d > 0; d--) {
            const node = $from.node(d);
            const type = node.type.name;
            if (["paragraph", "heading", "tableCell", "tableHeader", "column"].includes(type)) {
              const current = node.attrs.writingMode;
              const next = current === "vertical-rl" ? null : "vertical-rl";
              const pos = $from.before(d);
              return chain().updateAttributes(type, { writingMode: next }).run();
            }
          }
          // Fallback: try to set on paragraph
          const current = state.doc.resolve($from.pos).parent.attrs?.writingMode;
          const next = current === "vertical-rl" ? null : "vertical-rl";
          return chain().updateAttributes("paragraph", { writingMode: next }).run();
        },
      setWritingMode:
        (mode: string | null) =>
        ({ chain, state }: any) => {
          const { $from } = state.selection;
          for (let d = $from.depth; d > 0; d--) {
            const node = $from.node(d);
            const type = node.type.name;
            if (["paragraph", "heading", "tableCell", "tableHeader", "column"].includes(type)) {
              return chain().updateAttributes(type, { writingMode: mode }).run();
            }
          }
          return chain().updateAttributes("paragraph", { writingMode: mode }).run();
        },
    } as any;
  },
});

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    writingMode: {
      toggleWritingMode: () => ReturnType;
      setWritingMode: (mode: string | null) => ReturnType;
    };
  }
}
