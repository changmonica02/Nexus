import { Extension, Node, mergeAttributes, type JSONContent } from "@tiptap/core";
import { buildLessonIndex, LESSON_LABELS, type LessonEntry } from "./lessonDocument";

export const LESSON_INDEX_EVENT = "nexus-lesson-index";
export const LessonParagraph = Extension.create({
  name: "lessonParagraph",
  addGlobalAttributes() {
    return [{ types: ["paragraph"], attributes: { lessonStyle: {
      default: null,
      parseHTML: (element) => ["caption", "key"].includes(element.dataset.lessonStyle || "") ? element.dataset.lessonStyle : null,
      renderHTML: (attrs) => attrs.lessonStyle ? { "data-lesson-style": attrs.lessonStyle } : {},
    } } }];
  },
});

type LessonOptions = { getDocument: () => JSONContent | undefined; navigate: (id: string) => void };
export const LessonBlock = Node.create<LessonOptions>({
  name: "lessonBlock", group: "block", content: "block+", defining: true,
  addOptions: () => ({ getDocument: () => undefined, navigate: () => {} }),
  addAttributes: () => ({
    kind: { default: "example", parseHTML: (el) => el.dataset.lessonKind || "example", renderHTML: (attrs) => ({ "data-lesson-kind": attrs.kind }) },
    collapsed: { default: false, parseHTML: (el) => el.dataset.collapsed === "true", renderHTML: (attrs) => ({ "data-collapsed": String(attrs.collapsed) }) },
  }),
  parseHTML: () => [{ tag: 'section[data-type="lessonBlock"]', contentElement: ".lesson-block-body" }],
  renderHTML({ HTMLAttributes, node }) {
    return ["section", mergeAttributes(HTMLAttributes, { "data-type": "lessonBlock", class: "lesson-block" }), ["div", { class: "lesson-block-label", contenteditable: "false" }, LESSON_LABELS[node.attrs.kind] || "例題"], ["div", { class: "lesson-block-body" }, 0]];
  },
  addNodeView() {
    const options = this.options;
    return ({ node, editor, getPos }) => {
      let current = node;
      const dom = document.createElement("section");
      dom.className = "lesson-block";
      dom.dataset.type = "lessonBlock";
      const header = document.createElement("div");
      header.contentEditable = "false";
      header.className = "lesson-block-label";
      const label = document.createElement("span");
      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "lesson-answer-toggle nexus-print-hide";
      const content = document.createElement("div");
      content.className = "lesson-block-body";
      header.append(label, toggle);
      dom.append(header, content);
      const render = () => {
        const kind = current.attrs.kind;
        const entry = buildLessonIndex(options.getDocument() ?? editor.getJSON()).find((item) => item.id === current.attrs.id);
        dom.dataset.id = current.attrs.id || "";
        dom.dataset.lessonKind = kind;
        dom.dataset.collapsed = String(current.attrs.collapsed);
        label.textContent = `${LESSON_LABELS[kind] || "例題"}${entry?.number ? ` ${entry.number}` : ""}`;
        toggle.hidden = kind !== "answer";
        toggle.textContent = current.attrs.collapsed ? "展開解答" : "收合解答";
        toggle.setAttribute("aria-expanded", String(!current.attrs.collapsed));
        content.hidden = kind === "answer" && current.attrs.collapsed;
      };
      toggle.addEventListener("mousedown", (event) => event.preventDefault());
      toggle.addEventListener("click", () => {
        const pos = getPos();
        if (typeof pos === "number") editor.view.dispatch(editor.state.tr.setNodeMarkup(pos, undefined, { ...current.attrs, collapsed: !current.attrs.collapsed }));
      });
      editor.on("transaction", render);
      document.addEventListener(LESSON_INDEX_EVENT, render);
      render();
      return { dom, contentDOM: content, update(next) { if (next.type !== current.type) return false; current = next; render(); return true; }, stopEvent: (event) => header.contains(event.target as globalThis.Node), ignoreMutation: (mutation) => mutation.type !== "selection" && (mutation.target === content && mutation.type === "attributes" || !content.contains(mutation.target)), destroy() { editor.off("transaction", render); document.removeEventListener(LESSON_INDEX_EVENT, render); } };
    };
  },
});

export const AnswerSpace = Node.create({
  name: "answerSpace", group: "block", atom: true,
  addAttributes: () => ({ lines: { default: 4, parseHTML: (el) => Number(el.dataset.lines) || 4, renderHTML: (attrs) => ({ "data-lines": attrs.lines }) } }),
  parseHTML: () => [{ tag: 'div[data-type="answerSpace"]' }],
  renderHTML({ node, HTMLAttributes }) {
    const lines = Math.max(1, Math.min(12, Number(node.attrs.lines) || 4));
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "answerSpace", class: "lesson-answer-space", style: `height:${lines * 32}px`, "aria-label": `${lines} 行作答留白` }), ["span", { class: "nexus-print-hide" }, `${lines} 行作答留白`]];
  },
});

export const LessonToc = Node.create<LessonOptions>({
  name: "lessonToc", group: "block", atom: true,
  addOptions: () => ({ getDocument: () => undefined, navigate: () => {} }),
  parseHTML: () => [{ tag: 'nav[data-type="lessonToc"]' }],
  renderHTML: ({ HTMLAttributes }) => ["nav", mergeAttributes(HTMLAttributes, { "data-type": "lessonToc", class: "lesson-toc" }), "目錄"],
  addNodeView() {
    const options = this.options;
    return ({ editor }) => {
      const dom = document.createElement("nav");
      dom.className = "lesson-toc";
      dom.dataset.type = "lessonToc";
      dom.contentEditable = "false";
      dom.setAttribute("aria-label", "自動目錄");
      let previous = "";
      const render = () => {
        const entries = buildLessonIndex(options.getDocument() ?? editor.getJSON()).filter((item) => item.kind === "heading");
        const key = JSON.stringify(entries);
        if (key === previous) return;
        previous = key;
        const title = document.createElement("strong");
        title.textContent = "目錄";
        dom.replaceChildren(title);
        if (!entries.length) { const hint = document.createElement("p"); hint.textContent = "加入章標題或小節後，目錄會自動更新。"; dom.append(hint); }
        entries.forEach((entry: LessonEntry) => {
          const button = document.createElement("button");
          button.type = "button";
          button.style.paddingLeft = `${(entry.level - 1) * 16}px`;
          button.textContent = entry.title;
          button.addEventListener("click", () => options.navigate(entry.id));
          dom.append(button);
        });
      };
      editor.on("transaction", render);
      document.addEventListener(LESSON_INDEX_EVENT, render);
      render();
      return { dom, stopEvent: () => true, ignoreMutation: () => true, destroy() { editor.off("transaction", render); document.removeEventListener(LESSON_INDEX_EVENT, render); } };
    };
  },
});
