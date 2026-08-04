import { Node, mergeAttributes } from "@tiptap/core";

/**
 * PageBreak - manual page break node for A4 pagination
 * Renders as a horizontal dashed line with label, and can trigger visual page split in A4 view
 * D-157? Task 1 PageFormat engine
 */
export const PageBreak = Node.create({
  name: "pageBreak",
  group: "block",
  atom: true,
  selectable: false,
  draggable: false,

  addAttributes() {
    return {
      id: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="page-break"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "page-break", class: "nexus-page-break" })];
  },

  addCommands() {
    return {
      setPageBreak:
        () =>
        ({ chain }: any) => {
          return chain().insertContent({ type: this.name }).run();
        },
    } as any;
  },
});

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    pageBreak: {
      setPageBreak: () => ReturnType;
    };
  }
}