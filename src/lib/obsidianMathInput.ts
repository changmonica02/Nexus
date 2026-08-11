import { Extension } from "@tiptap/core";
import { Plugin, PluginKey, TextSelection } from "@tiptap/pm/state";

function hasBoundaryWhitespaceOrEmpty(raw: string): boolean {
  if (raw.trim() === "") return true;
  return /^\s|\s$/.test(raw);
}

export const ObsidianMathInput = Extension.create({
  name: "obsidianMathInput",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("obsidianMathInput"),
        props: {
          handleTextInput(view, from, to, text) {
            if (text !== "$") return false;
            const { state } = view;
            const $from = state.doc.resolve(from);
            if ($from.parent.type.spec.code) return false;
            const textBefore = $from.parent.textBetween(Math.max(0, $from.parentOffset - 200), $from.parentOffset, null, "\ufffc");
            const fullText = textBefore + "$";

            const blockMatch = fullText.match(/\$\$([^$]+)\$\$$/);
            if (blockMatch && !hasBoundaryWhitespaceOrEmpty(blockMatch[1])) {
              const latex = blockMatch[1].trim();
              if (latex) {
                const nodeType = state.schema.nodes.blockMath;
                if (nodeType) {
                  const matchFrom = from - (blockMatch[0].length - 1);
                  const node = nodeType.create({ latex });
                  const tr = state.tr;
                  tr.replaceWith(matchFrom, from, node);
                  const afterNodePos = matchFrom + node.nodeSize;
                  const $pos = tr.doc.resolve(Math.min(afterNodePos, tr.doc.content.size));
                  tr.setSelection(TextSelection.near($pos));
                  view.dispatch(tr);
                  return true;
                }
              }
            }

            const inlineMatch = fullText.match(/\$([^$]+)\$$/);
            if (inlineMatch) {
              const matchStart = fullText.length - inlineMatch[0].length;
              const precedingChar = matchStart > 0 ? fullText[matchStart - 1] : "";
              if (precedingChar !== "$" && !hasBoundaryWhitespaceOrEmpty(inlineMatch[1])) {
                const latex = inlineMatch[1].trim();
                if (latex) {
                  const nodeType = state.schema.nodes.inlineMath;
                  if (nodeType) {
                    const matchFrom = from - (inlineMatch[0].length - 1);
                    const tr = state.tr;
                    const node = nodeType.create({ latex });
                    tr.replaceWith(matchFrom, from, node);
                    const afterNodePos = matchFrom + node.nodeSize;
                    const $pos = tr.doc.resolve(Math.min(afterNodePos, tr.doc.content.size));
                    tr.setSelection(TextSelection.near($pos));
                    view.dispatch(tr);
                    return true;
                  }
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
