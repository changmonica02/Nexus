import { Extension } from "@tiptap/core";
import { Plugin, PluginKey, TextSelection } from "@tiptap/pm/state";

function escapedAt(text: string, index: number) {
  let slashes = 0;
  while (index > 0 && text[--index] === "\\") slashes++;
  return slashes % 2 === 1;
}

export const ObsidianMathInput = Extension.create({
  name: "obsidianMathInput",

  addKeyboardShortcuts() {
    return {
      "Mod-m": () => {
        const { state, view } = this.editor;
        const nodeType = state.schema.nodes.inlineMath;
        if (!nodeType) return false;
        const { from, to } = state.selection;
        const selectedText = state.doc.textBetween(from, to, " ");
        const node = nodeType.create({ latex: selectedText || "" });
        const tr = state.tr.replaceWith(from, to, node);
        view.dispatch(tr);
        return true;
      },
      "Mod-Shift-m": () => {
        const { state, view } = this.editor;
        const nodeType = state.schema.nodes.blockMath;
        if (!nodeType) return false;
        const { from, to } = state.selection;
        const selectedText = state.doc.textBetween(from, to, "\n");
        const node = nodeType.create({ latex: selectedText || "" });
        const tr = state.tr.replaceWith(from, to, node);
        view.dispatch(tr);
        return true;
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("obsidianMathInput"),
        props: {
          handleKeyDown(view, event) {
            if (view.composing || event.isComposing) return false;
            if (event.key === "Enter" && !event.shiftKey && !event.ctrlKey && !event.metaKey) {
              const { state } = view;
              const { $from } = state.selection;
              if ($from.parent.type.spec.code) return false;
              const lineText = $from.parent.textContent.trim();

              // 輸入 $$ 按 Enter → 自動轉換為區塊公式
              if (lineText === "$$") {
                const nodeType = state.schema.nodes.blockMath;
                if (nodeType) {
                  event.preventDefault();
                  const startPos = $from.start();
                  const endPos = $from.end();
                  const node = nodeType.create({ latex: "" });
                  const tr = state.tr.replaceRangeWith(startPos, endPos, node);
                  view.dispatch(tr);
                  return true;
                }
              }
            }
            return false;
          },

          handleTextInput(view, from, to, text) {
            if (text !== "$" || view.composing) return false;
            const { state } = view;
            const $from = state.doc.resolve(from);
            if ($from.parent.type.spec.code || $from.marks().some(mark => mark.type.spec.code)) return false;
            const textBefore = $from.parent.textBetween(Math.max(0, $from.parentOffset - 300), $from.parentOffset, null, "\ufffc");
            const fullText = textBefore + "$";
            if (escapedAt(fullText, fullText.length - 1)) return false;

            // 1. 區塊公式 $$formula$$
            const blockMatch = fullText.match(/\$\$([^$]+)\$\$$/);
            if (blockMatch && !escapedAt(fullText, blockMatch.index!)) {
              const latex = blockMatch[1].trim();
              if (latex) {
                const nodeType = state.schema.nodes.blockMath;
                if (nodeType) {
                  const matchFrom = from - (blockMatch[0].length - 1);
                  const node = nodeType.create({ latex });
                  const tr = state.tr;
                  tr.replaceRangeWith(matchFrom, to, node);
                  const afterNodePos = matchFrom + node.nodeSize;
                  const $pos = tr.doc.resolve(Math.min(afterNodePos, tr.doc.content.size));
                  tr.setSelection(TextSelection.near($pos));
                  view.dispatch(tr);
                  return true;
                }
              }
            }

            // 2. 行內公式 $formula$ (過濾純數字如 $100$)
            const inlineMatch = fullText.match(/\$([^$\n]+)\$$/);
            if (inlineMatch) {
              const rawInner = inlineMatch[1].trim();
              const matchStart = fullText.length - inlineMatch[0].length;
              const precedingChar = matchStart > 0 ? fullText[matchStart - 1] : "";

              if (precedingChar !== "$" && rawInner.length > 0 && !escapedAt(fullText, matchStart)) {
                const latex = rawInner;
                const nodeType = state.schema.nodes.inlineMath;
                if (nodeType) {
                  const matchFrom = from - (inlineMatch[0].length - 1);
                  const tr = state.tr;
                  const node = nodeType.create({ latex });
                  tr.replaceWith(matchFrom, to, node);
                  const afterNodePos = matchFrom + node.nodeSize;
                  const $pos = tr.doc.resolve(Math.min(afterNodePos, tr.doc.content.size));
                  tr.setSelection(TextSelection.near($pos));
                  view.dispatch(tr);
                  return true;
                }
              }
            }

            return false;
          },
        },
      }),
    ];
  },
});

