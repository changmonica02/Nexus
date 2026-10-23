"use client";
import { Node, mergeAttributes } from "@tiptap/core";
/** Keeps nested blocks in content_json; open state is presentation only. */
export const FoldBlock = Node.create({
  name: "foldBlock", group: "block", content: "block+", defining: true,
  addAttributes() { return { title: { default: "摺疊內容", parseHTML: el => el.getAttribute("data-title") || "摺疊內容", renderHTML: attrs => ({ "data-title": attrs.title }) },
    open: { default: true, parseHTML: el => (el as HTMLDetailsElement).open, renderHTML: attrs => ({ ...(attrs.open ? { open: "" } : {}) }) } }; },
  parseHTML() { return [{ tag: 'details[data-type="fold-block"]', contentElement: 'div[data-fold-body]' }]; },
  renderHTML({ HTMLAttributes }) { return ["details", mergeAttributes(HTMLAttributes, { "data-type": "fold-block", class: "nexus-fold-block" }), ["summary", { contenteditable: "false" }, HTMLAttributes["data-title"] || "摺疊內容"], ["div", { "data-fold-body": "" }, 0]]; },
  addNodeView() { return ({ node, editor, getPos }) => {
    let current = node; const dom = document.createElement("details"), summary = document.createElement("summary"), contentDOM = document.createElement("div");
    dom.className = "nexus-fold-block"; dom.dataset.type = "fold-block"; summary.contentEditable = "false"; contentDOM.dataset.foldBody = "";
    dom.append(summary, contentDOM);
    const paint = () => { dom.open = current.attrs.open !== false; summary.textContent = current.attrs.title || "摺疊內容"; };
    dom.addEventListener("toggle", () => { if (!editor.isEditable || dom.open === (current.attrs.open !== false)) return;
      const pos = getPos(); if (typeof pos === "number" && !editor.isDestroyed) editor.view.dispatch(editor.state.tr.setNodeMarkup(pos, undefined, { ...current.attrs, open: dom.open })); });
    paint(); return { dom, contentDOM, update(next) { if (next.type !== current.type) return false; current = next; paint(); return true; },
      ignoreMutation(m) { return m.type === "attributes" && m.target === dom; } };
  }; },
});
