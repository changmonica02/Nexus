import katex from "katex";
import type { Editor } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";

export function createObsidianMathNodeView(isInline: boolean) {
  return ({
    node,
    getPos,
    editor,
  }: {
    node: ProseMirrorNode;
    getPos: () => number | undefined;
    editor: Editor;
  }) => {
    let currentNode = node;
    let isEditing = false;

    const wrapper = document.createElement(isInline ? "span" : "div");
    wrapper.className = isInline ? "nexus-math-inline" : "nexus-math-block";
    const preview = document.createElement(isInline ? "span" : "div");
    preview.className = "math-preview";
    const editEl: HTMLInputElement | HTMLTextAreaElement = isInline ? document.createElement("input") : document.createElement("textarea");
    editEl.className = "math-edit";
    if (isInline) (editEl as HTMLInputElement).type = "text";
    editEl.style.display = "none";
    wrapper.append(preview, editEl as unknown as Node);

    function renderKaTeX() {
      const latex = currentNode.attrs.latex || "";
      if (!latex) {
        preview.textContent = isInline ? "$" : "$$";
        preview.style.opacity = "0.35";
        return;
      }
      preview.innerHTML = "";
      try {
        katex.render(latex, preview, { displayMode: !isInline, throwOnError: false, strict: false });
        preview.style.opacity = "1";
        preview.style.color = "";
      } catch {
        preview.textContent = latex;
        preview.style.color = "#dc2626";
      }
    }

    function stripDelimiters(raw: string): string {
      let s = raw.trim();
      if (isInline) {
        if (s.startsWith("$")) s = s.slice(1);
        if (s.endsWith("$")) s = s.slice(0, -1);
      } else {
        if (s.startsWith("$$")) s = s.slice(2);
        if (s.endsWith("$$")) s = s.slice(0, -2);
      }
      return s.trim();
    }

    function autoSizeInput() {
      const el = editEl as HTMLInputElement;
      const measure = document.createElement("span");
      measure.style.cssText = "position:absolute;visibility:hidden;white-space:pre;font:13px/1.4 monospace;";
      measure.textContent = el.value || " ";
      document.body.appendChild(measure);
      el.style.width = Math.max(measure.offsetWidth + 16, 40) + "px";
      document.body.removeChild(measure);
    }

    function autoSizeTextarea() {
      const el = editEl as HTMLTextAreaElement;
      el.style.height = "auto";
      el.style.height = el.scrollHeight + "px";
    }

    function enterEdit(cursorAt: "start" | "end" | "all" = "all") {
      if (!editor.isEditable || isEditing) return;
      isEditing = true;
      const latex = currentNode.attrs.latex || "";
      const raw = isInline ? `$${latex}$` : `$$\n${latex}\n$$`;
      preview.style.display = "none";
      editEl.style.display = isInline ? "inline-block" : "block";
      editEl.value = raw;
      if (isInline) autoSizeInput();
      else autoSizeTextarea();
      setTimeout(() => {
        if ((editor as any).isDestroyed) return;
        editEl.focus();
        if (cursorAt === "start") {
          editEl.setSelectionRange(isInline ? 1 : 3, isInline ? 1 : 3);
        } else if (cursorAt === "end") {
          const len = editEl.value.length;
          const pos = isInline ? Math.max(len - 1, 0) : Math.max(len - 3, 0);
          editEl.setSelectionRange(pos, pos);
        } else {
          editEl.select();
        }
      }, 0);
    }

    function exitEdit(save: boolean) {
      if (!isEditing) return;
      isEditing = false;
      if (save) {
        const latex = stripDelimiters(editEl.value);
        const pos = typeof getPos === "function" ? getPos() : undefined;
        if (pos !== undefined) {
          if (latex === "") {
            const cmd = isInline ? "deleteInlineMath" : "deleteBlockMath";
            (editor.chain().focus() as any)[cmd]({ pos }).run();
            return;
          }
          if (latex !== currentNode.attrs.latex) {
            const cmd = isInline ? "updateInlineMath" : "updateBlockMath";
            (editor.chain().focus() as any)[cmd]({ latex, pos }).run();
          }
        }
      }
      editEl.style.display = "none";
      preview.style.display = isInline ? "inline-block" : "block";
      renderKaTeX();
    }

    function handleBoundaryArrow(direction: "left" | "right"): boolean {
      const pos = typeof getPos === "function" ? getPos() : undefined;
      if (pos === undefined) return false;
      const atStart = editEl.selectionStart === 0;
      const atEnd = editEl.selectionEnd === editEl.value.length;
      if (direction === "left" && atStart) {
        exitEdit(true);
        setTimeout(() => { if (!(editor as any).isDestroyed) editor.chain().focus().setTextSelection(pos).run(); }, 0);
        return true;
      }
      if (direction === "right" && atEnd) {
        exitEdit(true);
        setTimeout(() => {
          if ((editor as any).isDestroyed) return;
          const nextPos = pos + currentNode.nodeSize;
          editor.chain().focus().setTextSelection(nextPos).run();
        }, 0);
        return true;
      }
      return false;
    }

    preview.addEventListener("mousedown", (event) => { event.preventDefault(); });
    preview.addEventListener("click", (event) => { event.preventDefault(); event.stopPropagation(); enterEdit("all"); });
    editEl.addEventListener("blur", () => exitEdit(true));
    editEl.addEventListener("input", () => { if (isInline) autoSizeInput(); else autoSizeTextarea(); });
    editEl.addEventListener("keydown", (event: Event) => {
      const keyboardEvent = event as KeyboardEvent;
      if (keyboardEvent.key === "Escape") {
        event.preventDefault(); event.stopPropagation();
        exitEdit(false); editor.commands.focus(); return;
      }
      if (isInline && keyboardEvent.key === "Enter") { event.preventDefault(); (editEl as HTMLElement).blur(); return; }
      if (keyboardEvent.key === "ArrowLeft" && handleBoundaryArrow("left")) { event.preventDefault(); return; }
      if (keyboardEvent.key === "ArrowRight" && handleBoundaryArrow("right")) { event.preventDefault(); return; }
      if (!isInline) {
        const el = editEl as HTMLTextAreaElement;
        const lines = el.value.split("\n");
        const cursorLine = el.value.substring(0, el.selectionStart).split("\n").length - 1;
        if (keyboardEvent.key === "ArrowUp" && cursorLine === 0 && handleBoundaryArrow("left")) { event.preventDefault(); return; }
        if (keyboardEvent.key === "ArrowDown" && cursorLine === lines.length - 1 && handleBoundaryArrow("right")) { event.preventDefault(); return; }
      }
    });

    renderKaTeX();

    return {
      dom: wrapper,
      selectNode() {
        const pos = typeof getPos === "function" ? getPos() : undefined;
        if (pos === undefined) { enterEdit("all"); return; }
        const head = editor.state.selection.head;
        enterEdit(head <= pos ? "start" : "end");
      },
      deselectNode() { exitEdit(true); },
      stopEvent() { return isEditing; },
      ignoreMutation() { return true; },
      update(updatedNode: ProseMirrorNode) {
        if (updatedNode.type.name !== currentNode.type.name) return false;
        currentNode = updatedNode;
        if (!isEditing) renderKaTeX();
        return true;
      },
    };
  };
}
