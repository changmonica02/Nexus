import katex from "katex";
import type { Editor } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { closeHistory } from "@tiptap/pm/history";

const COMMON_MATH_SYMBOLS = [
  { label: "a/b", latex: "\\frac{a}{b}" },
  { label: "√x", latex: "\\sqrt{x}" },
  { label: "xⁿ", latex: "x^{n}" },
  { label: "xₙ", latex: "x_{n}" },
  { label: "∑", latex: "\\sum_{i=1}^{n} x_i" },
  { label: "∫", latex: "\\int_{a}^{b} f(x) dx" },
  { label: "lim", latex: "\\lim_{x \\to 0}" },
  { label: "α", latex: "\\alpha" },
  { label: "β", latex: "\\beta" },
  { label: "π", latex: "\\pi" },
  { label: "θ", latex: "\\theta" },
  { label: "∞", latex: "\\infty" },
  { label: "±", latex: "\\pm" },
  { label: "≠", latex: "\\neq" },
  { label: "≈", latex: "\\approx" },
  { label: "≤", latex: "\\le" },
  { label: "≥", latex: "\\ge" },
  { label: "×", latex: "\\times" },
  { label: "÷", latex: "\\div" },
  { label: "→", latex: "\\rightarrow" },
  { label: "[矩陣]", latex: "\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}" },
];

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
    wrapper.contentEditable = "false";

    // 預覽層 (KaTeX Rendered)
    const preview = document.createElement(isInline ? "span" : "div");
    preview.className = "math-preview";
    preview.title = "點擊編輯 LaTeX 公式";

    // 編輯層
    let editContainer: HTMLElement;
    let editInput: HTMLInputElement | HTMLTextAreaElement;
    let livePreviewEl: HTMLElement | null = null;

    if (isInline) {
      editContainer = document.createElement("span");
      editContainer.className = "math-edit-wrapper";
      editContainer.style.display = "none";

      const prefix = document.createElement("span");
      prefix.textContent = "$";
      prefix.style.opacity = "0.5";
      prefix.style.userSelect = "none";

      const input = document.createElement("input");
      input.type = "text";
      input.className = "math-edit-input";
      input.placeholder = "latex";

      const suffix = document.createElement("span");
      suffix.textContent = "$";
      suffix.style.opacity = "0.5";
      suffix.style.userSelect = "none";

      editContainer.append(prefix, input, suffix);
      editInput = input;
    } else {
      // 區塊公式編輯卡片
      editContainer = document.createElement("div");
      editContainer.className = "nexus-math-card";
      editContainer.style.display = "none";

      // 頂部標題
      const header = document.createElement("div");
      header.className = "nexus-math-card-header";
      header.innerHTML = `<span>∑ 編輯區塊公式 (LaTeX)</span><span style="font-size:11px;opacity:0.6;">Ctrl+Enter 完成 · Esc 取消</span>`;

      // 快捷符號按鈕列
      const symbolsBar = document.createElement("div");
      symbolsBar.className = "nexus-math-card-symbols";
      COMMON_MATH_SYMBOLS.forEach((sym) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "nexus-math-sym-btn";
        btn.textContent = sym.label;
        btn.title = `插入 ${sym.latex}`;
        btn.addEventListener("mousedown", (e) => {
          e.preventDefault();
          insertLatexSnippet(sym.latex);
        });
        symbolsBar.appendChild(btn);
      });

      // 輸入框 Textarea
      const textarea = document.createElement("textarea");
      textarea.className = "nexus-math-textarea";
      textarea.placeholder = "在此輸入 LaTeX 公式代碼，例如：\\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}";
      textarea.rows = 3;

      // 即時預覽區
      livePreviewEl = document.createElement("div");
      livePreviewEl.className = "nexus-math-live-preview";

      // 底部操作列
      const footer = document.createElement("div");
      footer.className = "nexus-math-card-footer";

      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "nexus-math-sym-btn";
      deleteBtn.style.color = "#ef4444";
      deleteBtn.style.marginRight = "auto";
      deleteBtn.textContent = "🗑️ 刪除";
      deleteBtn.addEventListener("click", () => {
        deleteThisNode();
      });

      const cancelBtn = document.createElement("button");
      cancelBtn.type = "button";
      cancelBtn.className = "nexus-math-sym-btn";
      cancelBtn.textContent = "✕ 取消";
      cancelBtn.addEventListener("click", () => {
        exitEdit(false);
      });

      const confirmBtn = document.createElement("button");
      confirmBtn.type = "button";
      confirmBtn.className = "nexus-math-sym-btn";
      confirmBtn.style.backgroundColor = "#3b82f6";
      confirmBtn.style.color = "#ffffff";
      confirmBtn.style.borderColor = "#2563eb";
      confirmBtn.style.fontWeight = "600";
      confirmBtn.style.padding = "3px 12px";
      confirmBtn.textContent = "✓ 完成";
      confirmBtn.addEventListener("click", () => {
        exitEdit(true);
      });

      footer.append(deleteBtn, cancelBtn, confirmBtn);
      editContainer.append(header, symbolsBar, textarea, livePreviewEl, footer);
      editInput = textarea;
    }

    wrapper.append(preview, editContainer);
    // Footer/symbol clicks must not blur and commit the source before their
    // click handlers run (in particular Cancel and Delete).
    editContainer.addEventListener("mousedown", event => {
      if ((event.target as HTMLElement).closest("button")) event.preventDefault();
    });

    function insertLatexSnippet(snippet: string) {
      const el = editInput;
      const start = el.selectionStart || 0;
      const end = el.selectionEnd || 0;
      const val = el.value;
      el.value = val.substring(0, start) + snippet + val.substring(end);
      el.selectionStart = el.selectionEnd = start + snippet.length;
      el.focus();
      updateLivePreview();
      if (isInline) autoSizeInput();
    }

    function updateLivePreview() {
      if (!livePreviewEl) return;
      const raw = editInput.value.trim();
      if (!raw) {
        livePreviewEl.innerHTML = `<span style="font-size:12px;opacity:0.4;font-style:italic;">即時預覽區域</span>`;
        return;
      }
      try {
        livePreviewEl.innerHTML = "";
        katex.render(raw, livePreviewEl, { displayMode: true, throwOnError: true });
      } catch (err: any) {
        livePreviewEl.textContent = err?.message || "LaTeX 語法錯誤";
      }
    }

    function renderKaTeX() {
      const latex = currentNode.attrs.latex || "";
      if (!latex.trim()) {
        if (isInline) {
          preview.innerHTML = `<span style="opacity:0.75;font-size:0.85em;padding:1px 5px;border:1px dashed #3b82f6;border-radius:4px;color:#3b82f6;background-color:rgba(59,130,246,0.06);">＋ 行內公式</span>`;
        } else {
          preview.innerHTML = `<div style="text-align:center;padding:12px;border:1px dashed #3b82f6;border-radius:8px;color:#3b82f6;background-color:rgba(59,130,246,0.04);cursor:pointer;font-size:13px;font-weight:500;">∑ 點擊輸入區塊公式 (LaTeX)</div>`;
        }
        preview.style.opacity = "1";
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
        if (s.startsWith("$") && s.endsWith("$") && s.length >= 2) s = s.slice(1, -1);
      } else {
        if (s.startsWith("$$") && s.endsWith("$$") && s.length >= 4) s = s.slice(2, -2);
      }
      return s.trim();
    }

    function autoSizeInput() {
      if (!isInline) return;
      const el = editInput as HTMLInputElement;
      const measure = document.createElement("span");
      measure.style.cssText = "position:absolute;visibility:hidden;white-space:pre;font:13px/1.4 monospace;";
      measure.textContent = el.value || "latex";
      document.body.appendChild(measure);
      el.style.width = Math.max(measure.offsetWidth + 16, 60) + "px";
      document.body.removeChild(measure);
    }

    function deleteThisNode() {
      const pos = typeof getPos === "function" ? getPos() : undefined;
      if (pos !== undefined && editor && !editor.isDestroyed) {
        const tr = editor.state.tr.delete(pos, pos + currentNode.nodeSize);
        editor.view.dispatch(closeHistory(tr));
      }
    }

    function enterEdit() {
      if (!editor.isEditable || isEditing) return;
      isEditing = true;
      const latex = currentNode.attrs.latex || "";
      editInput.value = latex;
      preview.style.display = "none";
      editContainer.style.display = isInline ? "inline-flex" : "flex";

      if (isInline) {
        autoSizeInput();
      } else {
        updateLivePreview();
      }

      setTimeout(() => {
        if (editor.isDestroyed) return;
        editInput.focus();
        editInput.select();
      }, 10);
    }

    function exitEdit(save: boolean) {
      if (!isEditing) return;
      isEditing = false;
      const val = editInput.value.trim();

      if (save) {
        const latex = stripDelimiters(val);
        if (!latex) { deleteThisNode(); return; }
        const pos = typeof getPos === "function" ? getPos() : undefined;
        if (pos !== undefined && editor && !editor.isDestroyed) {
          if (latex !== currentNode.attrs.latex) {
            const tr = editor.state.tr.setNodeMarkup(pos, undefined, {
              ...currentNode.attrs,
              latex,
            });
            editor.view.dispatch(closeHistory(tr));
          }
        }
      } else if (!String(currentNode.attrs.latex || "").trim()) { deleteThisNode(); return; }

      editContainer.style.display = "none";
      preview.style.display = isInline ? "inline-flex" : "flex";
      renderKaTeX();
    }

    function handleBoundaryArrow(direction: "left" | "right"): boolean {
      const pos = typeof getPos === "function" ? getPos() : undefined;
      if (pos === undefined) return false;
      const atStart = editInput.selectionStart === 0;
      const atEnd = editInput.selectionEnd === editInput.value.length;
      if (direction === "left" && atStart) {
        exitEdit(true);
        setTimeout(() => {
          if (!editor.isDestroyed) editor.chain().focus().setTextSelection(pos).run();
        }, 0);
        return true;
      }
      if (direction === "right" && atEnd) {
        exitEdit(true);
        setTimeout(() => {
          if (editor.isDestroyed) return;
          const nextPos = Math.min(pos + (editInput.value.trim() ? currentNode.nodeSize : 0), editor.state.doc.content.size);
          editor.chain().focus().setTextSelection(nextPos).run();
        }, 0);
        return true;
      }
      return false;
    }

    // 事件監聽
    preview.addEventListener("mousedown", (event) => {
      event.preventDefault();
    });
    preview.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      enterEdit();
    });

    // Leaving either kind of formula confirms it, matching Obsidian's
    // rendered-by-default behaviour. Clicking the preview is the only way
    // to re-open its full LaTeX source.
    editInput.addEventListener("blur", () => {
      exitEdit(true);
    });

    editInput.addEventListener("input", () => {
      if (isInline) autoSizeInput();
      else updateLivePreview();
    });

    editInput.addEventListener("keydown", (event: Event) => {
      const keyboardEvent = event as KeyboardEvent;
      if (keyboardEvent.isComposing) return;
      if (keyboardEvent.key === "Escape") {
        keyboardEvent.preventDefault();
        keyboardEvent.stopPropagation();
        exitEdit(false);
        editor.commands.focus();
        return;
      }

      if (isInline && keyboardEvent.key === "Enter") {
        keyboardEvent.preventDefault();
        exitEdit(true);
        editor.commands.focus();
        return;
      }

      if (!isInline && keyboardEvent.key === "Enter" && (keyboardEvent.ctrlKey || keyboardEvent.metaKey)) {
        keyboardEvent.preventDefault();
        exitEdit(true);
        editor.commands.focus();
        return;
      }

      if (keyboardEvent.key === "ArrowLeft" && handleBoundaryArrow("left")) {
        keyboardEvent.preventDefault();
        return;
      }
      if (keyboardEvent.key === "ArrowRight" && handleBoundaryArrow("right")) {
        keyboardEvent.preventDefault();
        return;
      }

      if (!isInline) {
        const el = editInput as HTMLTextAreaElement;
        const lines = el.value.split("\n");
        const cursorLine = el.value.substring(0, el.selectionStart).split("\n").length - 1;
        if (keyboardEvent.key === "ArrowUp" && cursorLine === 0 && handleBoundaryArrow("left")) {
          keyboardEvent.preventDefault();
          return;
        }
        if (keyboardEvent.key === "ArrowDown" && cursorLine === lines.length - 1 && handleBoundaryArrow("right")) {
          keyboardEvent.preventDefault();
          return;
        }
      }
    });

    renderKaTeX();

    return {
      dom: wrapper,
      selectNode() {
        // Keyboard entry edits the source; merely loading an unfocused note
        // keeps the rendered formula visible.
        wrapper.classList.add("is-selected");
        if (editor.isFocused) enterEdit();
      },
      deselectNode() {
        wrapper.classList.remove("is-selected");
        exitEdit(true);
      },
      stopEvent() {
        return isEditing;
      },
      ignoreMutation() {
        return true;
      },
      update(updatedNode: ProseMirrorNode) {
        if (updatedNode.type.name !== currentNode.type.name) return false;
        currentNode = updatedNode;
        if (!isEditing) renderKaTeX();
        return true;
      },
    };
  };
}
