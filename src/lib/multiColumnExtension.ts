"use client";
import { Node, mergeAttributes } from "@tiptap/core";
import { TextSelection, type EditorState, type Transaction } from "@tiptap/pm/state";
import { Fragment } from "@tiptap/pm/model";

const clamp = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? Math.max(20, Math.min(80, Math.round(value))) : 50;

/** Place two existing top-level blocks side by side without recreating their content. */
export function createColumnsFromDrop(state: EditorState, sourcePos: number, targetPos: number): Transaction | null {
  if (sourcePos === targetPos || state.doc.resolve(sourcePos).depth !== 0 || state.doc.resolve(targetPos).depth !== 0) return null;
  const moved = state.doc.nodeAt(sourcePos), target = state.doc.nodeAt(targetPos);
  if (!moved || !target || ["multiColumn", "pageBreak"].includes(moved.type.name) || ["multiColumn", "pageBreak"].includes(target.type.name) || !state.schema.nodes.column || !state.schema.nodes.multiColumn) return null;
  const group = state.schema.nodes.multiColumn.create({ cols: 2, ratio: 50 }, [
    state.schema.nodes.column.create(null, target),
    state.schema.nodes.column.create(null, moved),
  ]);
  const tr = state.tr.delete(sourcePos, sourcePos + moved.nodeSize);
  const nextTargetPos = tr.mapping.map(targetPos);
  tr.replaceWith(nextTargetPos, nextTargetPos + target.nodeSize, group);
  let movedPos = -1;
  tr.doc.descendants((node, pos) => { if (node === moved) { movedPos = pos; return false; } return true; });
  if (movedPos >= 0) tr.setSelection(TextSelection.near(tr.doc.resolve(movedPos + 1)));
  return tr.scrollIntoView();
}

/** Move a top-level block into one existing column in one undoable transaction. */
export function moveTopLevelBlockIntoColumn(state: EditorState, sourcePos: number, groupPos: number, targetIndex: number): Transaction | null {
  if (state.doc.resolve(sourcePos).depth !== 0 || state.doc.resolve(groupPos).depth !== 0) return null;
  const moved = state.doc.nodeAt(sourcePos), group = state.doc.nodeAt(groupPos);
  if (!moved || !group || moved.type.name === "multiColumn" || group.type.name !== "multiColumn" || sourcePos === groupPos || targetIndex < 0 || targetIndex >= group.childCount) return null;
  const columns = Array.from({ length: group.childCount }, (_, index) => group.child(index));
  const destination = columns[targetIndex];
  const children = Array.from({ length: destination.childCount }, (_, index) => destination.child(index));
  if (children.length === 1 && children[0].type.name === "paragraph" && children[0].content.size === 0) children.length = 0;
  columns[targetIndex] = destination.copy(Fragment.fromArray([...children, moved]));
  const nextGroup = group.copy(Fragment.fromArray(columns));
  const tr = state.tr.delete(sourcePos, sourcePos + moved.nodeSize);
  const nextGroupPos = tr.mapping.map(groupPos);
  tr.replaceWith(nextGroupPos, nextGroupPos + group.nodeSize, nextGroup);
  let movedPos = -1;
  tr.doc.descendants((node, pos) => { if (node === moved) { movedPos = pos; return false; } return true; });
  if (movedPos >= 0) tr.setSelection(TextSelection.near(tr.doc.resolve(movedPos + 1)));
  return tr.scrollIntoView();
}
export const Column = Node.create({
  name: "column", group: "column", content: "block+", defining: true,
  parseHTML: () => [{ tag: 'div[data-type="column"]' }],
  renderHTML: ({ HTMLAttributes }) => ["div", mergeAttributes(HTMLAttributes, { "data-type": "column", class: "nexus-column" }), 0],
});

export const MultiColumn = Node.create({
  name: "multiColumn", group: "block", content: "column{2,3}", defining: true,
  addAttributes() { return {
    cols: { default: 2, parseHTML: el => Math.max(2, Math.min(3, Number(el.getAttribute("data-cols")) || 2)), renderHTML: attrs => ({ "data-cols": String(attrs.cols) }) },
    ratio: { default: 50, parseHTML: el => clamp(Number(el.getAttribute("data-ratio")) || 50), renderHTML: attrs => ({ "data-ratio": String(clamp(attrs.ratio)) }) },
  }; },
  parseHTML: () => [{ tag: 'div[data-type="multiColumn"]' }],
  renderHTML({ node, HTMLAttributes }) {
    const cols = node.attrs.cols === 3 ? 3 : 2, ratio = clamp(node.attrs.ratio);
    const columns = cols === 2 ? `minmax(0, ${ratio}fr) minmax(0, ${100-ratio}fr)` : "repeat(3, minmax(0, 1fr))";
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "multiColumn", "data-cols": String(cols), "data-ratio": String(ratio), class: "nexus-multi-column", style: `display:grid;grid-template-columns:${columns};gap:16px;min-width:0;` }), 0];
  },
  addNodeView() { return ({ node, getPos, editor }) => {
    let current = node;
    const dom = document.createElement("div"), contentDOM = document.createElement("div"), divider = document.createElement("div");
    dom.className = "nexus-multi-column-node"; dom.dataset.type = "multiColumn";
    contentDOM.className = "nexus-multi-column"; divider.className = "nexus-column-divider";
    divider.contentEditable = "false"; divider.setAttribute("role", "separator"); divider.setAttribute("aria-label", "調整雙欄寬度");
    divider.setAttribute("aria-orientation", "vertical"); divider.tabIndex = 0;
    dom.append(contentDOM, divider);
    const paint = (ratio = clamp(current.attrs.ratio)) => {
      const cols = current.attrs.cols === 3 ? 3 : 2;
      dom.dataset.cols = String(cols); dom.dataset.ratio = String(ratio);
      contentDOM.style.gridTemplateColumns = cols === 2 ? `minmax(0, ${ratio}fr) minmax(0, ${100-ratio}fr)` : "repeat(3,minmax(0,1fr))";
      divider.style.left = `calc(${ratio}% - 4px)`; divider.hidden = cols !== 2;
      divider.setAttribute("aria-valuenow", String(ratio));
    };
    const commit = (ratio: number) => { const pos = getPos(); if (typeof pos !== "number" || editor.isDestroyed) return;
      editor.view.dispatch(editor.state.tr.setNodeMarkup(pos, undefined, { ...current.attrs, ratio: clamp(ratio) })); };
    let dragging = false, nextRatio = clamp(node.attrs.ratio);
    divider.addEventListener("pointerdown", event => { if (!editor.isEditable || current.attrs.cols !== 2) return;
      event.preventDefault(); event.stopPropagation(); dragging = true; divider.setPointerCapture(event.pointerId); });
    divider.addEventListener("pointermove", event => { if (!dragging) return; const rect = contentDOM.getBoundingClientRect();
      nextRatio = clamp((event.clientX - rect.left) * 100 / Math.max(1,rect.width)); paint(nextRatio); });
    divider.addEventListener("pointerup", event => { if (!dragging) return; dragging = false; divider.releasePointerCapture(event.pointerId); commit(nextRatio); });
    divider.addEventListener("keydown", event => { if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault(); commit(clamp(current.attrs.ratio) + (event.key === "ArrowRight" ? 5 : -5)); });
    paint();
    return { dom, contentDOM, update(next) { if (next.type !== current.type) return false; current = next; paint(); return true; },
      ignoreMutation(mutation) { return mutation.type === "attributes" && (mutation.target === contentDOM || mutation.target === divider || mutation.target === dom); } };
  }; },
  addCommands() { return {
    setMultiColumn: (cols: number = 2) => ({ state, dispatch }: any) => {
      const count = cols === 3 ? 3 : 2, { $from } = state.selection;
      if ($from.depth < 1) return false;
      for (let d = $from.depth; d > 0; d--) if ($from.node(d).type.name === "multiColumn") return false;
      const from = $from.before(1), endPos = Math.max(from + 1, state.selection.to - 1), to = state.doc.resolve(endPos).after(1);
      const blocks = state.doc.slice(from, to).content;
      if (!blocks.childCount) return false;
      const columns = [state.schema.nodes.column.create(null, blocks), ...Array.from({ length: count-1 }, () => state.schema.nodes.column.create(null, state.schema.nodes.paragraph.create()))];
      const group = state.schema.nodes.multiColumn.create({ cols: count, ratio: 50 }, columns);
      if (dispatch) { const tr = state.tr.replaceWith(from, to, group); tr.setSelection(TextSelection.near(tr.doc.resolve(from+2))); dispatch(tr.scrollIntoView()); }
      return true;
    },
    unsetMultiColumn: () => ({ state, dispatch }: any) => {
      const { $from } = state.selection;
      for (let d = $from.depth; d > 0; d--) if ($from.node(d).type.name === "multiColumn") {
        const node = $from.node(d), from = $from.before(d), blocks = [] as any[];
        node.forEach((column: any) => column.forEach((block: any) => blocks.push(block)));
        if (dispatch) dispatch(state.tr.replaceWith(from, from + node.nodeSize, blocks).scrollIntoView());
        return true;
      }
      return false;
    },
    moveColumnBlock: (target: "left" | "right" | "out") => ({ state, dispatch }: any) => {
      const { $from } = state.selection;
      let groupDepth = -1;
      for (let d = $from.depth; d > 0; d--) if ($from.node(d).type.name === "multiColumn") { groupDepth = d; break; }
      if (groupDepth < 0 || $from.node(groupDepth + 1)?.type.name !== "column") return false;
      const group = $from.node(groupDepth), groupPos = $from.before(groupDepth);
      const sourceIndex = $from.index(groupDepth), blockIndex = $from.index(groupDepth + 1);
      const targetIndex = target === "left" ? 0 : 1;
      if (target !== "out" && (sourceIndex === targetIndex || targetIndex >= group.childCount)) return false;
      const columns = Array.from({ length: group.childCount }, (_, index) => group.child(index));
      const source = columns[sourceIndex], moved = source.child(blockIndex);
      const remaining = Array.from({ length: source.childCount }, (_, index) => source.child(index)).filter((_, index) => index !== blockIndex);
      if (!remaining.length) remaining.push(state.schema.nodes.paragraph.create());
      columns[sourceIndex] = source.copy(Fragment.fromArray(remaining));
      if (target !== "out") {
        const destination = columns[targetIndex];
        const children = Array.from({ length: destination.childCount }, (_, index) => destination.child(index));
        if (children.length === 1 && children[0].type.name === "paragraph" && children[0].content.size === 0) children.length = 0;
        children.push(moved);
        columns[targetIndex] = destination.copy(Fragment.fromArray(children));
      }
      if (dispatch) {
        const nextGroup = group.copy(Fragment.fromArray(columns));
        const tr = state.tr.replaceWith(groupPos, groupPos + group.nodeSize, target === "out" ? [nextGroup, moved] : nextGroup);
        let newPos = -1;
        tr.doc.descendants((node: any, pos: number) => { if (node === moved) { newPos = pos; return false; } return true; });
        if (newPos >= 0) tr.setSelection(TextSelection.near(tr.doc.resolve(newPos + 1)));
        dispatch(tr.scrollIntoView());
      }
      return true;
    },
  } as any; },
});
declare module "@tiptap/core" { interface Commands<ReturnType> { multiColumn: {
  setMultiColumn: (cols?: number) => ReturnType; unsetMultiColumn: () => ReturnType;
  moveColumnBlock: (target: "left" | "right" | "out") => ReturnType;
}; } }
