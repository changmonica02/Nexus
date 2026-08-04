"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Typography from "@tiptap/extension-typography";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { TableKit } from "@tiptap/extension-table";
import Image from "@tiptap/extension-image";
import { BlockMath, InlineMath } from "@tiptap/extension-mathematics";
import { DragHandle } from "@tiptap/extension-drag-handle";
import { NodeRange } from "@tiptap/extension-node-range";
import { TextStyleKit } from "@tiptap/extension-text-style";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import "katex/dist/katex.min.css";
import { Callout } from "../lib/calloutExtension";
import { createObsidianMathNodeView } from "../lib/obsidianMathNodeView";
import { ObsidianMathInput } from "../lib/obsidianMathInput";
import { PageBreak } from "../lib/pageBreakExtension";
import { MultiColumn, Column } from "../lib/multiColumnExtension";
import { WritingModeExtension } from "../lib/writingModeExtension";
import { StableBlockId } from "../lib/stableBlockIdExtension";
import { CellSelection, TableMap } from "prosemirror-tables";
import { useLanguage } from "../lib/LanguageContext";
import ToolbarDropdown from "./ToolbarDropdown";
import ColorPaletteButton from "./ColorPaletteButton";
import TableGridPicker from "./TableGridPicker";

interface TiptapEditorProps {
  content: any;
  onChange: (payload: { json: any; text: string }) => void;
  variant?: "rich" | "plain";
  toolbarTarget?: HTMLElement | null;
  onFocus?: () => void;
  pageNightAdapt?: boolean;
  onTogglePageNightAdapt?: () => void;
  showToolbar?: boolean;
  toolbarTab?: "home" | "insert" | "layout";
  margins?: any;
  onMarginsChange?: (margins: any) => void;
}

type ToolbarState = {
  bold: boolean; italic: boolean; underline: boolean; strike: boolean; code: boolean;
  h1: boolean; h2: boolean; h3: boolean;
  bulletList: boolean; orderedList: boolean; taskList: boolean;
  blockquote: boolean; codeBlock: boolean; link: boolean;
  table: boolean; callout: boolean; blockMath: boolean; inlineMath: boolean;
  multiColumn: boolean;
  textAlign: "left" | "center" | "right" | "justify";
  fontFamily: string | null; fontSize: string | null;
  color: string | null; highlight: boolean; highlightColor: string | null;
  canUndo: boolean; canRedo: boolean;
};

const emptyToolbarState: ToolbarState = {
  bold: false, italic: false, underline: false, strike: false, code: false,
  h1: false, h2: false, h3: false,
  bulletList: false, orderedList: false, taskList: false,
  blockquote: false, codeBlock: false, link: false,
  table: false, callout: false, blockMath: false, inlineMath: false,
  multiColumn: false,
  textAlign: "left", fontFamily: null, fontSize: null, color: null, highlight: false, highlightColor: null,
  canUndo: false, canRedo: false,
};

function TB({ label, title, active, disabled, onClick, icon }: { label?: string; title: string; active?: boolean; disabled?: boolean; onClick: () => void; icon?: React.ReactNode }) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      className="rounded flex items-center justify-center w-[30px] h-[30px] text-[12px] font-medium transition-all hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-30 leading-none"
      style={{ color: "var(--color-text)", backgroundColor: active ? "var(--color-border)" : "transparent" }}
    >
      {icon || label}
    </button>
  );
}
function Sep() { return <div className="mx-0.5 h-5 w-px bg-zinc-300 shrink-0" />; }

// 全域游標錨點：分頁模式下 block 被搬移到另一頁編輯器時，游標跨編輯器跟隨
// （每頁是獨立 TiptapEditor，游標無法直接轉移，用模組級變數記錄「最近游標所在 block」，
//   任一編輯器 setContent 後若發現該 block 在自己文件內 → 放置游標並聚焦）
let globalCursorAnchor: { id: string; offset: number; prefix?: string } | null = null;
// 依「block 文字前綴」在 doc 中定位（id 遺失時的跨頁 fallback）
function findPosByPrefix(doc: any, prefix: string, preferAfter = false): number {
  if (!prefix) return -1;
  const fullText = doc.textBetween(0, doc.content.size, "\n", " ");
  const idx = fullText.lastIndexOf(prefix);
  if (idx === -1) return -1;
  const targetChar = preferAfter ? idx + prefix.length : idx;
  let charAcc = 0, bestPos = -1, bestDiff = Infinity;
  doc.descendants((node: any, nodePos: number) => {
    if (node.isText) {
      const txt = node.text || "";
      const ns = charAcc, ne = charAcc + txt.length;
      charAcc = ne;
      if (targetChar >= ns && targetChar <= ne) {
        const candidate = nodePos + Math.max(0, targetChar - ns);
        const len = doc.textBetween(0, candidate, "\n", " ").length;
        const diff = Math.abs(len - targetChar);
        if (diff < bestDiff) { bestDiff = diff; bestPos = candidate; }
        return false;
      }
    } else if (node.isInline && !node.isText) {
      charAcc += 1;
    }
    return true;
  });
  return bestPos;
}

export default function TiptapEditor({ content, onChange, variant = "rich", toolbarTarget, onFocus, pageNightAdapt, onTogglePageNightAdapt, showToolbar = true, toolbarTab = "home", margins, onMarginsChange }: TiptapEditorProps) {
  const { t } = useLanguage();
  const ref = useRef<HTMLDivElement>(null);
  const editorRef = useRef<Editor | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [toolbarState, setToolbarState] = useState<ToolbarState>(emptyToolbarState);
  const [marginsPanelOpen, setMarginsPanelOpen] = useState(false);
  const [marginsPos, setMarginsPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const marginsBtnRef = useRef<HTMLButtonElement | null>(null);
  const marginsPanelRef = useRef<HTMLDivElement | null>(null);
  const updateMarginsPos = () => {
    if (!marginsBtnRef.current) return;
    const rect = marginsBtnRef.current.getBoundingClientRect();
    let left = rect.left;
    const w = 260;
    if (left + w > window.innerWidth - 8) left = window.innerWidth - w - 8;
    setMarginsPos({ top: rect.bottom + 6, left });
  };
  const MARGIN_PRESETS: Record<string, { top: number; right: number; bottom: number; left: number }> = {
    normal: { top: 20, right: 18, bottom: 20, left: 18 },
    narrow: { top: 12, right: 12, bottom: 12, left: 12 },
    wide: { top: 25, right: 25, bottom: 25, left: 25 },
    moderate: { top: 20, right: 15, bottom: 20, left: 15 },
  };
  const curMargins = margins || { top: 20, right: 18, bottom: 20, left: 18 };
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  // Table context menu state
  const [tableMenu, setTableMenu] = useState<{ x: number; y: number } | null>(null);
  const [textMenu, setTextMenu] = useState<{ x: number; y: number } | null>(null);
  const tableMenuRef = useRef<HTMLDivElement>(null);

  const refreshToolbarState = () => {
    const editor = editorRef.current;
    if (!editor) { setToolbarState(emptyToolbarState); return; }
    const alignAttrs = editor.getAttributes("paragraph");
    const textStyleAttrs = editor.getAttributes("textStyle");
    const highlightAttrs = editor.getAttributes("highlight");
    setToolbarState({
      bold: editor.isActive("bold"), italic: editor.isActive("italic"),
      underline: editor.isActive("underline"), strike: editor.isActive("strike"), code: editor.isActive("code"),
      h1: editor.isActive("heading", { level: 1 }), h2: editor.isActive("heading", { level: 2 }), h3: editor.isActive("heading", { level: 3 }),
      bulletList: editor.isActive("bulletList"), orderedList: editor.isActive("orderedList"), taskList: editor.isActive("taskList"),
      blockquote: editor.isActive("blockquote"), codeBlock: editor.isActive("codeBlock"),
      link: editor.isActive("link"), table: editor.isActive("table"), callout: editor.isActive("callout"),
      blockMath: editor.isActive("blockMath"), inlineMath: editor.isActive("inlineMath"),
      multiColumn: editor.isActive("multiColumn"),
      textAlign: variant === "rich" ? (alignAttrs.textAlign || "left") : "left",
      fontFamily: variant === "rich" ? (textStyleAttrs.fontFamily ?? null) : null,
      fontSize: variant === "rich" ? (textStyleAttrs.fontSize ?? null) : null,
      color: variant === "rich" ? (textStyleAttrs.color ?? null) : null,
      highlight: editor.isActive("highlight"),
      highlightColor: variant === "rich" ? (highlightAttrs.color ?? null) : null,
      canUndo: editor.can().undo(), canRedo: editor.can().redo(),
    });
  };

  useEffect(() => {
    if (!ref.current) return;
    const editor = new Editor({
      element: ref.current,
      extensions: [
        StarterKit.configure({ link: false, underline: false }),
        StableBlockId,
        Placeholder.configure({ placeholder: t("tiptap.placeholder") }),
        Typography,
        Link.configure({ openOnClick: false, autolink: true, linkOnPaste: true, HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" } }),
        Underline,
        TaskList,
        TaskItem.configure({ nested: true }),
        TableKit.configure({ table: { resizable: true } }),
        Image.configure({ inline: false, allowBase64: true }),
        Callout,
        PageBreak,
        Column,
        MultiColumn,
        WritingModeExtension,
        BlockMath.extend({ addNodeView() { return createObsidianMathNodeView(false); }, addInputRules() { return []; } }).configure({ katexOptions: { throwOnError: false } }),
        InlineMath.extend({ addNodeView() { return createObsidianMathNodeView(true); }, addInputRules() { return []; } }).configure({ katexOptions: { throwOnError: false } }),
        ObsidianMathInput,
        NodeRange,
        DragHandle.configure({ render: () => { const el = document.createElement("div"); el.classList.add("nexus-drag-handle"); el.innerHTML = "⠿"; return el; } }),
        ...(variant === "rich" ? [
          TextStyleKit.configure({ backgroundColor: false, lineHeight: false }),
          TextAlign.configure({ types: ["heading", "paragraph"] }),
          Highlight.configure({ multicolor: true }),
        ] : []),
      ],
      content: content || { type: "doc", content: [{ type: "paragraph" }] },
      editorProps: { attributes: { class: "nexus-tiptap-editor prose prose-zinc max-w-none focus:outline-none min-h-[400px] text-base" } },
      onCreate() { refreshToolbarState(); },
      onSelectionUpdate() { refreshToolbarState(); },
      onTransaction() { refreshToolbarState(); },
      onFocus() { onFocus?.(); },
      onUpdate({ editor }) { refreshToolbarState(); onChangeRef.current({ json: editor.getJSON(), text: editor.getText() }); },
    });
    editorRef.current = editor;
    setIsReady(true);
    refreshToolbarState();
    // 新 mount 時檢查全域錨點：分頁搬移把 block 送來本頁時，游標跟隨（延遲至其他 effect 設定 anchor 後）
    setTimeout(() => {
      const ed = editorRef.current;
      if (!ed || !globalCursorAnchor) return;
      const anchor = globalCursorAnchor;
      let found = -1;
      ed.state.doc.descendants((n: any, np: number) => {
        if (n.attrs && n.attrs.id === anchor.id) { found = np; return false; }
        return true;
      });
      if (found >= 0) {
        try {
          const block = ed.state.doc.nodeAt(found);
          if (block) {
            const s = found + 1, e = found + block.nodeSize - 1;
            const tp = posAtCharOffset(ed.state.doc, s, e, anchor.offset);
            ed.commands.setTextSelection(Math.min(Math.max(tp, s), Math.max(e, s)));
            ed.commands.focus();
            setTimeout(() => {
              (ed.view.dom as HTMLElement).closest?.("[data-page]")?.scrollIntoView?.({ behavior: "smooth", block: "center" });
            }, 30);
          }
        } catch { /* ignore */ }
      }
    }, 0);
    return () => { editor.destroy(); editorRef.current = null; setIsReady(false); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // IME composition 追蹤（中文輸入法期間不覆寫內容）
  const compositionRef = useRef(false);
  useEffect(() => {
    const dom = ref.current;
    if (!dom) return;
    const onStart = () => { compositionRef.current = true; };
    const onEnd = () => { compositionRef.current = false; };
    dom.addEventListener("compositionstart", onStart);
    dom.addEventListener("compositionend", onEnd);
    return () => {
      dom.removeEventListener("compositionstart", onStart);
      dom.removeEventListener("compositionend", onEnd);
    };
  }, []);

  // 在 block 內容範圍內，依「字元偏移」找出對應的 doc pos
  const posAtCharOffset = (doc: any, from: number, to: number, targetChar: number): number => {
    let acc = 0;
    let result = from;
    doc.nodesBetween(from, to, (node: any, nodePos: number) => {
      if (acc >= targetChar) return false;
      if (node.isText) {
        const len = (node.text || "").length;
        if (acc + len >= targetChar) {
          result = nodePos + (targetChar - acc);
          acc = targetChar;
          return false;
        }
        acc += len;
      } else if (node.isInline && !node.isText) {
        acc += 1;
        if (acc >= targetChar) result = nodePos + 1;
      }
      return true;
    });
    return result;
  };

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || !content) return;
    const currentJson = JSON.stringify(editor.getJSON());
    const targetJson = JSON.stringify(content);
    if (currentJson !== targetJson) {
      // IME composition 期間不覆寫（避免打斷中文輸入）
      if (editor.isFocused && compositionRef.current) return;
      // 游標保留（分頁重排修復）：block id + block 內字元偏移精確定位
      const { state } = editor;
      const sel = state.selection;
      let cursorPrefix = "";
      let cursorBlockId: string | null = null;
      let cursorBlockOffset = 0;
      if (sel && typeof sel.anchor === "number" && sel.anchor > 0) {
        const pos = Math.min(sel.anchor, state.doc.content.size);
        cursorPrefix = state.doc.textBetween(Math.max(0, pos - 300), pos, "\n", " ");
        try {
          const $pos = state.doc.resolve(pos);
          for (let d = $pos.depth; d > 0; d--) {
            const node = $pos.node(d);
            if (node.type.isBlock && node.attrs && typeof node.attrs.id === "string" && node.attrs.id) {
              cursorBlockId = node.attrs.id;
              const blockContentStart = $pos.start(d);
              cursorBlockOffset = state.doc.textBetween(blockContentStart, pos, "\n", " ").length;
              break;
            }
          }
        } catch { /* ignore */ }
      }
      // 更新全域游標錨點（供跨頁編輯器跟隨）
      // 只有聚焦中的編輯器才能更新錨點（避免其他頁的舊游標覆蓋）
      if (editor.isFocused) {
        if (cursorBlockId) {
          globalCursorAnchor = { id: cursorBlockId, offset: cursorBlockOffset, prefix: cursorPrefix };
        } else if (cursorPrefix) {
          // id 遺失（舊資料/新段落尚未補 id）→ 用前綴錨點
          globalCursorAnchor = { id: "", offset: cursorBlockOffset, prefix: cursorPrefix.slice(-60) };
        }
      }
      editor.commands.setContent(content, { emitUpdate: false });
      const newDoc = editor.state.doc;
      // 1) 全域錨點定位：block 可能在「這個編輯器」或「被搬到另一頁編輯器」
      const anchor = globalCursorAnchor;
      if (anchor) {
        let foundBlockPos = -1;
        if (anchor.id) {
          newDoc.descendants((node: any, nodePos: number) => {
            if (node.attrs && node.attrs.id === anchor.id) {
              foundBlockPos = nodePos;
              return false;
            }
            return true;
          });
        }
        if (foundBlockPos >= 0) {
          try {
            const block = newDoc.nodeAt(foundBlockPos);
            if (block) {
              const innerStart = foundBlockPos + 1;
              const innerEnd = foundBlockPos + block.nodeSize - 1;
              const targetPos = posAtCharOffset(newDoc, innerStart, innerEnd, anchor.offset);
              editor.commands.setTextSelection(Math.min(Math.max(targetPos, innerStart), Math.max(innerEnd, innerStart)));
              // block 在此編輯器內 → 聚焦（跨頁搬移時讓使用者可繼續打字）
              if (!editor.isFocused) editor.commands.focus();
              // 滾動到該頁（Word 行為：畫面跟隨游標）
              setTimeout(() => {
                (editor.view.dom as HTMLElement).closest?.("[data-page]")?.scrollIntoView?.({ behavior: "smooth", block: "center" });
              }, 30);
            } else {
              editor.commands.setTextSelection(foundBlockPos + 1);
            }
            refreshToolbarState();
            return;
          } catch { /* fallthrough */ }
        }
        // 錨點 block 不在這個編輯器（被搬到別頁）
        // 若有 prefix → 用前綴定位（id 遺失的跨頁 fallback）
        if (anchor.prefix) {
          const p = findPosByPrefix(newDoc, anchor.prefix, true);
          if (p > 0) {
            editor.commands.setTextSelection(p);
            if (!editor.isFocused) editor.commands.focus();
            setTimeout(() => {
              (editor.view.dom as HTMLElement).closest?.("[data-page]")?.scrollIntoView?.({ behavior: "smooth", block: "center" });
            }, 30);
            refreshToolbarState();
            return;
          }
        }
        refreshToolbarState();
        return;
      }
      // 2) 前綴定位 fallback（含 tail 遞減）
      if (cursorPrefix) {
        try {
          const restoreAt = (prefix: string): boolean => {
            const fullText = newDoc.textBetween(0, newDoc.content.size, "\n", " ");
            const idx = fullText.lastIndexOf(prefix);
            if (idx === -1) return false;
            // 游標應放在「前綴結尾」（原本游標在前綴之後），不是前綴開頭
            const targetChar = idx + prefix.length;
            let charAcc = 0;
            let bestPos = -1;
            let bestDiff = Infinity;
            newDoc.descendants((node: any, nodePos: number) => {
              if (node.isText) {
                const txt = node.text || "";
                const nodeStart = charAcc;
                const nodeEnd = charAcc + txt.length;
                charAcc = nodeEnd;
                if (targetChar >= nodeStart && targetChar <= nodeEnd) {
                  const candidate = nodePos + Math.max(0, targetChar - nodeStart);
                  const len = newDoc.textBetween(0, candidate, "\n", " ").length;
                  const diff = Math.abs(len - targetChar);
                  if (diff < bestDiff) { bestDiff = diff; bestPos = candidate; }
                  return false;
                }
              } else if (node.isInline && !node.isText) {
                charAcc += 1;
              }
              return true;
            });
            if (bestPos > 0) { editor.commands.setTextSelection(bestPos); return true; }
            return false;
          };
          if (!restoreAt(cursorPrefix)) {
            const tail = cursorPrefix.slice(-80);
            if (!restoreAt(tail)) restoreAt(cursorPrefix.slice(-30));
          }
        } catch { /* 保留失敗就維持預設 */ }
      }
      refreshToolbarState();
    }
  }, [content]);

  useEffect(() => {
    const handler = () => {
      editorRef.current?.chain().focus().setPageBreak().run();
    };
    window.addEventListener("nexus-insert-page-break", handler as any);
    return () => window.removeEventListener("nexus-insert-page-break", handler as any);
  }, []);

  // Right-click table context menu
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const cell = target.closest("td, th");
      const table = target.closest("table");
      // 表格右鍵（既有）
      if (cell && table) {
        e.preventDefault();
        setTextMenu(null);
        setTableMenu({ x: e.clientX, y: e.clientY });
        return;
      }
      // 需求2：框選文字右鍵 → 「建立頁面連結」
      const sel = window.getSelection();
      const hasSelection = sel && !sel.isCollapsed && sel.toString().trim().length > 0;
      if (hasSelection) {
        e.preventDefault();
        setTableMenu(null);
        setTextMenu({ x: e.clientX, y: e.clientY });
        return;
      }
      setTableMenu(null);
      setTextMenu(null);
    };
    const onClick = (e: MouseEvent) => {
      if (tableMenuRef.current && !tableMenuRef.current.contains(e.target as Node)) {
        setTableMenu(null);
      }
    };
    el.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("mousedown", onClick);
    return () => {
      el.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("mousedown", onClick);
    };
  }, []);

  const editor = editorRef.current;
  const disabled = !isReady || !editor;

  const handleInsertPageLink = () => {
    const ed = editorRef.current;
    if (!ed) return;
    const title = window.prompt(t("tiptap.pageLinkPrompt") || "輸入頁面標題（會以 [[標題]] 建立內部連結）：");
    if (title && title.trim()) {
      const { from, to } = ed.state.selection;
      if (from === to) {
        ed.chain().focus().insertContent(`[[${title.trim()}]]`).run();
      } else {
        ed.chain().focus().insertContentAt({ from, to }, `[[${title.trim()}]]`).run();
      }
    }
    setTextMenu(null);
  };

  const handleSetLink = () => {
    const ed = editorRef.current;
    if (!ed) return;
    const prevUrl = ed.getAttributes("link").href as string | undefined;
    if (ed.state.selection.empty && !prevUrl) { alert(t("tiptap.linkSelectFirst")); return; }
    const url = window.prompt(t("tiptap.linkPrompt"), prevUrl || "https://");
    if (url === null) return;
    if (url.trim() === "") { ed.chain().focus().extendMarkRange("link").unsetLink().run(); return; }
    ed.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  };
  const handleInsertImage = () => {
    const ed = editorRef.current;
    if (!ed) return;
    const url = window.prompt(t("tiptap.imagePrompt"), "https://");
    if (url && url.trim()) ed.chain().focus().setImage({ src: url.trim() }).run();
  };
  const handleInsertBlockMath = () => {
    const ed = editorRef.current;
    if (!ed) return;
    const pos = ed.state.selection.from;
    ed.chain().focus().insertContentAt(pos, { type: "blockMath", attrs: { latex: "" } }).setNodeSelection(pos).run();
  };
  const handleInsertInlineMath = () => {
    const ed = editorRef.current;
    if (!ed) return;
    const pos = ed.state.selection.from;
    ed.chain().focus().insertContentAt(pos, { type: "inlineMath", attrs: { latex: "" } }).setNodeSelection(pos).run();
  };
  const currentFontSize = parseInt(toolbarState.fontSize || "16", 10) || 16;
  const handleFontSizeChange = (newSize: number) => {
    const clamped = Math.max(8, Math.min(72, newSize));
    editorRef.current?.chain().focus().setFontSize(`${clamped}px`).run();
  };

  const getTableAndCell = () => {
    const ed = editorRef.current;
    if (!ed) return null;
    const { state } = ed;
    const $from = state.selection.$from;
    let tablePos = -1;
    let tableNode: any = null;
    for (let d = $from.depth; d > 0; d--) {
      const node = $from.node(d);
      if (node.type.name === 'table') { tableNode = node; tablePos = $from.before(d); break; }
    }
    if (!tableNode) return null;
    let cellPos = -1;
    for (let d = $from.depth; d > 0; d--) {
      const node = $from.node(d);
      if (node.type.name === 'tableCell' || node.type.name === 'tableHeader') {
        cellPos = $from.before(d);
        break;
      }
    }
    if (cellPos === -1) return null;
    return { ed, state, tableNode, tablePos, cellPos };
  };

  const mergeWith = (dir: 'up' | 'down' | 'left' | 'right') => {
    const info = getTableAndCell();
    if (!info) return;
    const { ed, state, tableNode, tablePos, cellPos } = info as any;
    try {
      const map = TableMap.get(tableNode);
      const tableStart = tablePos + 1;
      const rect = map.findCell(cellPos - tableStart);
      if (!rect) return;
      let targetIndex = -1;
      if (dir === 'up' && rect.top > 0) targetIndex = map.positionAt(rect.top - 1, rect.left, tableNode);
      if (dir === 'down' && rect.bottom < map.height) targetIndex = map.positionAt(rect.bottom, rect.left, tableNode);
      if (dir === 'left' && rect.left > 0) targetIndex = map.positionAt(rect.top, rect.left - 1, tableNode);
      if (dir === 'right' && rect.right < map.width) targetIndex = map.positionAt(rect.top, rect.right, tableNode);
      if (targetIndex === -1) return;
      const targetPos = tableStart + targetIndex;
      const $anchor = state.doc.resolve(targetPos);
      const $head = state.doc.resolve(cellPos);
      // @ts-ignore
      const sel = (CellSelection as any).create(state.doc, $anchor.pos, $head.pos);
      let tr = state.tr.setSelection(sel);
      ed.view.dispatch(tr);
      setTimeout(() => {
        (ed as any).chain().focus().mergeCells().run();
        setTableMenu(null);
      }, 20);
    } catch (e) {
      console.error('mergeWith error', e);
    }
  };

  const canAverage = (() => {
    try {
      const ed = editorRef.current;
      if (!ed) return false;
      const sel = (ed.state.selection as any);
      if (!sel || !sel.forEachCell) return false;
      let count = 0;
      sel.forEachCell(() => count++);
      return count > 1;
    } catch { return false; }
  })();

  // 需求2：框選文字右鍵 → 建立頁面連結
  // 邊界選單（Word 風格：預設＋自訂；Portal 跳出工具列）
  const marginsMenu = (typeof document !== "undefined") && marginsPanelOpen ? createPortal(
    <div
      ref={marginsPanelRef}
      className="rounded-xl shadow-2xl z-[10000] overflow-hidden p-2"
      style={{ position: "fixed", top: marginsPos.top, left: marginsPos.left, width: 260, backgroundColor: "var(--color-bg)", border: "1px solid var(--color-border)" }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <div className="px-2 py-1 text-[10px] font-semibold tracking-wider uppercase opacity-60">頁面邊界</div>
      {/* 預設選項 */}
      <div className="grid grid-cols-2 gap-1 mb-2">
        {(["normal", "narrow", "moderate", "wide"] as const).map((preset) => (
          <button
            key={preset}
            onClick={() => { onMarginsChange?.(MARGIN_PRESETS[preset]); setMarginsPanelOpen(false); }}
            className="rounded-md px-2 py-1.5 text-[11px] text-left hover:bg-zinc-100"
            style={{ border: "1px solid var(--color-border)", color: "var(--color-text)", backgroundColor: JSON.stringify(curMargins) === JSON.stringify(MARGIN_PRESETS[preset]) ? "var(--color-border)" : "transparent" }}
          >
            {preset === "normal" ? "一般" : preset === "narrow" ? "窄" : preset === "moderate" ? "適中" : "寬"}
          </button>
        ))}
      </div>
      {/* 自訂 4 欄 */}
      <div className="border-t pt-1.5" style={{ borderColor: "var(--color-border)" }}>
        <div className="px-1 pb-1 text-[9px] opacity-50">自訂邊界 (mm)</div>
        <div className="grid grid-cols-4 gap-1">
          {(["top", "right", "bottom", "left"] as const).map((k) => (
            <label key={k} className="flex flex-col items-center gap-0.5">
              <span className="text-[9px] opacity-60">{k === "top" ? "上" : k === "bottom" ? "下" : k === "left" ? "左" : "右"}</span>
              <input
                type="number"
                min={0}
                max={40}
                value={curMargins[k]}
                onChange={(e) => { const v = Math.max(0, Math.min(40, Number(e.target.value) || 0)); onMarginsChange?.({ ...curMargins, [k]: v }); }}
                className="w-full rounded px-1 py-1 text-[10px] text-center outline-none"
                style={{ border: "1px solid var(--color-border)", color: "var(--color-text)", background: "var(--color-bg)" }}
              />
            </label>
          ))}
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  const textContextMenu = textMenu ? createPortal(
    <div
      className="rounded-xl shadow-2xl z-[10000] overflow-hidden py-1"
      style={{
        position: "fixed",
        top: Math.min(textMenu.y, window.innerHeight - 120),
        left: Math.min(textMenu.x, window.innerWidth - 200),
        width: 190,
        backgroundColor: "var(--color-bg)",
        border: "1px solid var(--color-border)",
      }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <div className="px-3 py-1.5 text-[10px] font-semibold tracking-wider uppercase opacity-60">文字操作</div>
      <button onClick={handleInsertPageLink} className="w-full text-left px-3 py-2 text-xs hover:bg-zinc-100 flex items-center gap-2"><span>🔗</span> 建立頁面連結</button>
    </div>,
    document.body
  ) : null;

  const tableContextMenu = tableMenu && toolbarState.table ? createPortal(
    <div
      ref={tableMenuRef}
      className="rounded-xl shadow-2xl z-[10000] overflow-hidden py-1"
      style={{
        position: "fixed",
        top: Math.min(tableMenu.y, window.innerHeight - 340),
        left: Math.min(tableMenu.x, window.innerWidth - 220),
        width: 210,
        backgroundColor: "var(--color-bg)",
        border: "1px solid var(--color-border)",
      }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <div className="px-3 py-1.5 text-[10px] font-semibold tracking-wider uppercase opacity-60">儲存格操作（右鍵）</div>
      <button onClick={() => { (editorRef.current as any)?.chain().focus().addRowBefore().run(); setTableMenu(null); }} className="w-full text-left px-3 py-2 text-xs hover:bg-zinc-100 flex items-center gap-2"><span>⬆️</span> 在上方插入列</button>
      <button onClick={() => { editorRef.current?.chain().focus().addRowAfter().run(); setTableMenu(null); }} className="w-full text-left px-3 py-2 text-xs hover:bg-zinc-100 flex items-center gap-2"><span>⬇️</span> 在下方插入列</button>
      <button onClick={() => { (editorRef.current as any)?.chain().focus().addColumnBefore().run(); setTableMenu(null); }} className="w-full text-left px-3 py-2 text-xs hover:bg-zinc-100 flex items-center gap-2"><span>⬅️</span> 在左側插入欄</button>
      <button onClick={() => { editorRef.current?.chain().focus().addColumnAfter().run(); setTableMenu(null); }} className="w-full text-left px-3 py-2 text-xs hover:bg-zinc-100 flex items-center gap-2"><span>➡️</span> 在右側插入欄</button>
      <div className="border-t my-1" style={{ borderColor: "var(--color-border)" }} />
      <button onClick={() => { editorRef.current?.chain().focus().deleteRow().run(); setTableMenu(null); }} className="w-full text-left px-3 py-2 text-xs hover:bg-zinc-100 flex items-center gap-2"><span>🗑️</span> 刪除列</button>
      <button onClick={() => { editorRef.current?.chain().focus().deleteColumn().run(); setTableMenu(null); }} className="w-full text-left px-3 py-2 text-xs hover:bg-zinc-100 flex items-center gap-2"><span>🗑️</span> 刪除欄</button>
      <div className="border-t my-1" style={{ borderColor: "var(--color-border)" }} />
      <button onClick={() => { (editorRef.current as any)?.chain().focus().mergeCells().run(); setTableMenu(null); }} className="w-full text-left px-3 py-2 text-xs hover:bg-zinc-100 flex items-center gap-2"><span>🔗</span> 合併儲存格（需先選多格）</button>
      <button onClick={() => { mergeWith('up'); }} className="w-full text-left px-3 py-2 text-xs hover:bg-zinc-100 flex items-center gap-2"><span>⬆️</span> 與上方儲存格合併</button>
      <button onClick={() => { mergeWith('down'); }} className="w-full text-left px-3 py-2 text-xs hover:bg-zinc-100 flex items-center gap-2"><span>⬇️</span> 與下方儲存格合併</button>
      <button onClick={() => { mergeWith('left'); }} className="w-full text-left px-3 py-2 text-xs hover:bg-zinc-100 flex items-center gap-2"><span>⬅️</span> 與左側儲存格合併</button>
      <button onClick={() => { mergeWith('right'); }} className="w-full text-left px-3 py-2 text-xs hover:bg-zinc-100 flex items-center gap-2"><span>➡️</span> 與右側儲存格合併</button>
      <button onClick={() => { (editorRef.current as any)?.chain().focus().splitCell().run(); setTableMenu(null); }} className="w-full text-left px-3 py-2 text-xs hover:bg-zinc-100 flex items-center gap-2"><span>✂️</span> 拆分儲存格</button>
      <button onClick={() => { (editorRef.current as any)?.chain().focus().toggleHeaderRow().run(); setTableMenu(null); }} className="w-full text-left px-3 py-2 text-xs hover:bg-zinc-100 flex items-center gap-2"><span>📌</span> 切換標題列</button>
      <button onClick={() => { (editorRef.current as any)?.chain().focus().toggleHeaderColumn().run(); setTableMenu(null); }} className="w-full text-left px-3 py-2 text-xs hover:bg-zinc-100 flex items-center gap-2"><span>📌</span> 切換標題欄</button>
      <div className="border-t my-1" style={{ borderColor: "var(--color-border)" }} />
      <button onClick={() => {
        const ed = editorRef.current; if (!ed) return;
        const { state } = ed;
        const sel = state.selection as any;
        if (!sel || !sel.forEachCell) {
          setTableMenu(null);
          return;
        }
        const selectedCells: {pos:number, rect:any}[] = [];
        const tableInfo = (() => {
          const $from = state.selection.$from;
          let tablePos=-1; let tableNode:any=null;
          for (let d=$from.depth; d>0; d--) { const n=$from.node(d); if (n.type.name==='table'){ tableNode=n; tablePos=$from.before(d); break; } }
          return { tableNode, tablePos };
        })();
        if (!tableInfo?.tableNode) return;
        const map = (TableMap as any).get(tableInfo.tableNode);
        const tableStart = tableInfo.tablePos + 1;
        const selectedCols = new Set<number>();
        sel.forEachCell((cell:any, pos:number) => {
          const rect = map.findCell(pos - tableStart);
          if (rect) {
            for (let c = rect.left; c < rect.right; c++) selectedCols.add(c);
            selectedCells.push({pos, rect});
          }
        });
        if (selectedCols.size <= 1) {
          // Only one column selected, nothing to average
          setTableMenu(null);
          return;
        }
        // Calculate total width of selected columns from first row
        const firstRow = tableInfo.tableNode.firstChild;
        let totalWidth = 0;
        const colWidths: number[] = [];
        if (firstRow) {
          firstRow.forEach((cell:any, offset:number, idx:number) => {
            const cellRect = map.findCell(offset);
            if (!cellRect) return;
            const w = cell.attrs?.colwidth?.[0] || 100;
            for (let c = cellRect.left; c < cellRect.right; c++) {
              colWidths[c] = w;
            }
          });
          selectedCols.forEach((colIdx) => {
            totalWidth += colWidths[colIdx] || 100;
          });
        } else {
          totalWidth = selectedCols.size * 100;
        }
        const avgWidth = Math.max(40, Math.floor(totalWidth / selectedCols.size));
        // For all cells in table whose column is in selectedCols, set to avgWidth
        const allCells: {pos:number, left:number, right:number}[] = [];
        tableInfo.tableNode.descendants((node:any, pos:number) => {
          if (node.type.name === 'tableCell' || node.type.name === 'tableHeader') {
            const cellRect = map.findCell(pos);
            if (!cellRect) return true;
            // Check if this cell's column overlaps selected columns
            for (let c = cellRect.left; c < cellRect.right; c++) {
              if (selectedCols.has(c)) {
                allCells.push({pos: tableStart + pos, left: cellRect.left, right: cellRect.right});
                break;
              }
            }
          }
          return true;
        });
        // Deduplicate and reverse for safe setNodeMarkup
        const uniquePos = new Map<number, any>();
        allCells.forEach((c) => uniquePos.set(c.pos, c));
        const sorted = Array.from(uniquePos.values()).sort((a,b)=>b.pos-a.pos);
        let tr = state.tr;
        sorted.forEach(({pos, left, right}) => {
          const span = right - left;
          const existing = tr.doc.nodeAt(pos)?.attrs || {};
          // If cell spans multiple selected columns, width = avg*span, else avg
          const isMulti = right - left > 1;
          const newColWidth = isMulti ? Array.from({length: right-left}, () => avgWidth) : [avgWidth];
          try { tr = tr.setNodeMarkup(pos, undefined, { ...existing, colwidth: newColWidth }); } catch {}
        });
        ed.view.dispatch(tr); setTableMenu(null);
      }} className="w-full text-left px-3 py-2 text-xs hover:bg-zinc-100 flex items-center gap-2"><span>⇔</span> 平均分配欄寬（僅選取範圍）</button>
      <button onClick={() => { editorRef.current?.chain().focus().deleteTable().run(); setTableMenu(null); }} className="w-full text-left px-3 py-2 text-xs hover:bg-red-50 text-red-600 flex items-center gap-2"><span>✕</span> 刪除表格</button>
    </div>,
    document.body
  ) : null;

    // 需求3：工具列分三組（常用/插入/版面配置），由 toolbarTab 決定顯示哪組
  const homeTools = (
    <>
      <TB icon="↩" title={t("tiptap.undo") || "Undo"} disabled={disabled || !toolbarState.canUndo} onClick={() => editorRef.current?.chain().focus().undo().run()} />
      <TB icon="↪" title={t("tiptap.redo") || "Redo"} disabled={disabled || !toolbarState.canRedo} onClick={() => editorRef.current?.chain().focus().redo().run()} />
      <Sep />
      {variant === "rich" && (<>
        <select value={toolbarState.h1 ? "h1" : toolbarState.h2 ? "h2" : toolbarState.h3 ? "h3" : "normal"} disabled={disabled} title={t("tiptap.style") || "Style"}
          onChange={(e) => {
            const ed = editorRef.current; if (!ed) return; const v = e.target.value;
            if (v === "normal") { if (ed.isActive("heading")) ed.chain().focus().toggleHeading({ level: ed.getAttributes("heading").level || 1 }).run(); }
            else if (v === "h1") { if (!ed.isActive("heading", { level: 1 })) ed.chain().focus().toggleHeading({ level: 1 }).run(); }
            else if (v === "h2") { if (!ed.isActive("heading", { level: 2 })) ed.chain().focus().toggleHeading({ level: 2 }).run(); }
            else if (v === "h3") { if (!ed.isActive("heading", { level: 3 })) ed.chain().focus().toggleHeading({ level: 3 }).run(); }
          }}
          className="rounded px-1 py-0.5 text-[11px] bg-transparent disabled:cursor-not-allowed disabled:opacity-40 max-w-[80px]" style={{ border: "1px solid transparent", color: "var(--color-text)" }}>
          <option value="normal">{t("tiptap.style.normal") || "Normal"}</option>
          <option value="h1">{t("tiptap.h1") || "Heading 1"}</option>
          <option value="h2">{t("tiptap.h2") || "Heading 2"}</option>
          <option value="h3">{t("tiptap.h3") || "Heading 3"}</option>
        </select>
        <select value={toolbarState.fontFamily || ""} disabled={disabled} title={t("tiptap.fontFamily")}
          onChange={(e) => { const v = e.target.value; const c = editorRef.current?.chain().focus(); if (!c) return; if (v) c.setFontFamily(v).run(); else c.unsetFontFamily().run(); }}
          className="rounded px-1 py-0.5 text-[11px] bg-transparent disabled:cursor-not-allowed disabled:opacity-40 max-w-[100px]" style={{ border: "1px solid transparent", color: "var(--color-text)" }}>
          <option value="">{t("tiptap.fontFamily.default")}</option>
          <option value="Arial, sans-serif">Arial</option>
          <option value="Georgia, serif">Georgia</option>
          <option value="'Courier New', monospace">Courier New</option>
          <option value="'Times New Roman', serif">Times New Roman</option>
          <option value="'Noto Sans TC', sans-serif">Noto Sans TC</option>
        </select>
        <div className="flex items-center">
          <button type="button" title="-" disabled={disabled || currentFontSize <= 8} onMouseDown={(e) => { e.preventDefault(); handleFontSizeChange(currentFontSize - (currentFontSize <= 12 ? 1 : 2)); }} className="w-5 h-6 flex items-center justify-center text-[12px] hover:bg-zinc-200 rounded disabled:opacity-30" style={{ color: "var(--color-text)" }}>−</button>
          <input type="text" value={currentFontSize} disabled={disabled} onChange={(e) => { const val = parseInt(e.target.value, 10); if (!isNaN(val)) handleFontSizeChange(val); }} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleFontSizeChange(currentFontSize); } }} className="w-8 h-6 text-center text-[11px] bg-transparent outline-none disabled:opacity-40" style={{ color: "var(--color-text)" }} />
          <button type="button" title="+" disabled={disabled || currentFontSize >= 72} onMouseDown={(e) => { e.preventDefault(); handleFontSizeChange(currentFontSize + (currentFontSize >= 24 ? 4 : 2)); }} className="w-5 h-6 flex items-center justify-center text-[12px] hover:bg-zinc-200 rounded disabled:opacity-30" style={{ color: "var(--color-text)" }}>+</button>
        </div>
        <select
          value={toolbarState.textAlign}
          disabled={disabled}
          title="對齊方式"
          onChange={(e) => {
            const v = e.target.value as "left" | "center" | "right" | "justify";
            editorRef.current?.chain().focus().setTextAlign(v).run();
          }}
          className="rounded px-1 py-0.5 text-[11px] bg-transparent disabled:cursor-not-allowed disabled:opacity-40 max-w-[80px]"
          style={{ border: "1px solid transparent", color: "var(--color-text)" }}
        >
          <option value="left">向左對齊</option>
          <option value="center">置中</option>
          <option value="right">向右對齊</option>
          <option value="justify">兩端對齊</option>
        </select>
      </>)}
      <TB label="B" title={t("tiptap.bold")} active={toolbarState.bold} disabled={disabled} onClick={() => editorRef.current?.chain().focus().toggleBold().run()} />
      <TB label="I" title={t("tiptap.italic")} active={toolbarState.italic} disabled={disabled} onClick={() => editorRef.current?.chain().focus().toggleItalic().run()} />
      <TB icon={<span style={{ textDecoration: "underline" }}>U</span>} title={t("tiptap.underline")} active={toolbarState.underline} disabled={disabled} onClick={() => editorRef.current?.chain().focus().toggleUnderline().run()} />
      <TB icon={<span style={{ textDecoration: "line-through" }}>S</span>} title="Strikethrough" active={toolbarState.strike} disabled={disabled} onClick={() => editorRef.current?.chain().focus().toggleStrike().run()} />
      {variant === "rich" && (<>
        <ColorPaletteButton icon={<span className="text-[11px] font-bold leading-none">A</span>} title={t("tiptap.textColor")} currentColor={toolbarState.color || ""} onColorChange={(color: string) => { if (color) editorRef.current?.chain().focus().setColor(color).run(); else editorRef.current?.chain().focus().unsetColor().run(); }} disabled={disabled} />
        <ColorPaletteButton icon={<span className="text-[11px] leading-none">🖍</span>} title={t("tiptap.highlight")} currentColor={toolbarState.highlightColor || ""} onColorChange={(color: string) => { if (color) editorRef.current?.chain().focus().toggleHighlight({ color }).run(); else editorRef.current?.chain().focus().unsetHighlight().run(); }} disabled={disabled} />
      </>)}
      <Sep />
      <TB icon="•" title={t("tiptap.bulletList")} active={toolbarState.bulletList} disabled={disabled} onClick={() => editorRef.current?.chain().focus().toggleBulletList().run()} />
      <TB icon="1." title={t("tiptap.orderedList")} active={toolbarState.orderedList} disabled={disabled} onClick={() => editorRef.current?.chain().focus().toggleOrderedList().run()} />
      <TB icon="☑" title={t("tiptap.taskList")} active={toolbarState.taskList} disabled={disabled} onClick={() => editorRef.current?.chain().focus().toggleTaskList().run()} />
      {variant === "rich" && (<>
        <TB icon="⇤" title="Decrease indent" disabled={disabled} onClick={() => { const ed = editorRef.current; if (!ed) return; if (ed.isActive("listItem")) ed.chain().focus().liftListItem("listItem").run(); }} />
        <TB icon="⇥" title="Increase indent" disabled={disabled} onClick={() => { const ed = editorRef.current; if (!ed) return; if (ed.isActive("listItem")) ed.chain().focus().sinkListItem("listItem").run(); }} />
      </>)}
      <Sep />
      <TB icon="❝" title={t("tiptap.quote")} active={toolbarState.blockquote} disabled={disabled} onClick={() => editorRef.current?.chain().focus().toggleBlockquote().run()} />
      <TB icon="{ }" title={t("tiptap.codeBlock")} active={toolbarState.codeBlock} disabled={disabled} onClick={() => editorRef.current?.chain().focus().toggleCodeBlock().run()} />
      <Sep />
      <TB icon="Tx" title={t("tiptap.clear")} disabled={disabled} onClick={() => editorRef.current?.chain().focus().unsetAllMarks().clearNodes().run()} />
    </>
  );

  const insertTools = (
    <>
      <TableGridPicker editor={editorRef.current} disabled={disabled} />
      <TB icon="🔗" title={t("tiptap.link")} active={toolbarState.link} disabled={disabled} onClick={handleSetLink} />
      <TB icon="🖼" title={t("tiptap.image")} disabled={disabled} onClick={handleInsertImage} />
      <ToolbarDropdown label="" icon="➕" variant="inline" disabled={disabled}
        items={[
          { id: "insert-callout", icon: "💡", label: t("tiptap.label.callout"), onClick: () => editorRef.current?.chain().focus().setCallout("info").run() },
          { id: "insert-inline-math", icon: "x²", label: t("tiptap.label.inlineMath"), onClick: handleInsertInlineMath },
          { id: "insert-block-math", icon: "∑", label: t("tiptap.label.blockMath"), onClick: handleInsertBlockMath },
        ]} />
      {toolbarState.callout && (<TB icon="✕C" title={t("tiptap.callout")} disabled={disabled} onClick={() => editorRef.current?.chain().focus().unsetCallout().run()} />)}
      <Sep />
      <TB icon="⛶" title="插入分頁符（A4 分頁用）" disabled={disabled} onClick={() => (editorRef.current as any)?.chain().focus().setPageBreak().run()} />
    </>
  );

  const layoutTools = (
    <>
      {variant === "rich" && (<>
        <select
          value={toolbarState.multiColumn ? "2" : "1"}
          disabled={disabled}
          title="分欄"
          onChange={(e) => {
            const v = e.target.value;
            if (v === "1") (editorRef.current as any)?.chain().focus().unsetMultiColumn().run();
            else if (v === "2") (editorRef.current as any)?.chain().focus().setMultiColumn(2).run();
            else if (v === "3") (editorRef.current as any)?.chain().focus().setMultiColumn(3).run();
          }}
          className="rounded px-1 py-0.5 text-[11px] bg-transparent disabled:cursor-not-allowed disabled:opacity-40 max-w-[70px]"
          style={{ border: "1px solid transparent", color: "var(--color-text)" }}
        >
          <option value="1">單欄</option>
          <option value="2">2欄</option>
          <option value="3">3欄</option>
        </select>
        <button
          type="button"
          title="文字排列方向（點擊切換直/橫，主要用於儲存格）"
          disabled={disabled}
          onMouseDown={(e) => { e.preventDefault(); (editorRef.current as any)?.chain().focus().toggleWritingMode().run(); }}
          className="rounded w-6 h-6 flex items-center justify-center text-[11px] hover:bg-zinc-200 disabled:opacity-30"
          style={{ color: "var(--color-text)" }}
        >
          ↕️
        </button>
        <Sep />
      </>)}
      {onMarginsChange && (
        <>
          <Sep />
          <button
            ref={marginsBtnRef}
            type="button"
            title="頁面邊界（Word 版面配置→邊界）"
            disabled={disabled}
            onClick={() => { updateMarginsPos(); setMarginsPanelOpen((v) => !v); }}
            className="rounded flex items-center justify-center px-2 h-[30px] text-[11px] font-medium hover:bg-zinc-200 disabled:opacity-30 border"
            style={{ borderColor: "var(--color-border)", color: "var(--color-text)", backgroundColor: marginsPanelOpen ? "var(--color-border)" : "transparent" }}
          >
            ▦ 邊界
          </button>
        </>
      )}
    </>
  );

  const toolbarJSX = (
    <div className="relative flex flex-wrap items-center gap-0.5 px-3 py-1">
      {toolbarTab === "insert" ? insertTools : toolbarTab === "layout" ? layoutTools : homeTools}
    </div>
  );

  return (
    <>
      {showToolbar && (toolbarTarget ? createPortal(toolbarJSX, toolbarTarget) : toolbarJSX)}
      {marginsMenu}
      {textContextMenu}
      {tableContextMenu}
      <style>{`
        .nexus-tiptap-editor { margin-left: -56px; padding-left: 56px; }
        .nexus-paged-content .nexus-tiptap-editor { margin-left: 0 !important; padding-left: 0 !important; }
        .nexus-tiptap-editor ul:not([data-type="taskList"]) { list-style-type: disc; padding-left: 1.5rem; margin: 0.75rem 0; }
        .nexus-tiptap-editor ol { list-style-type: decimal; padding-left: 1.5rem; margin: 0.75rem 0; }
        .nexus-tiptap-editor li { margin: 0.25rem 0; padding-left: 0.25rem; }
        .nexus-tiptap-editor li p { margin: 0; }
        .nexus-tiptap-editor ul[data-type="taskList"] { list-style: none; padding-left: 0; margin: 0.75rem 0; }
        .nexus-tiptap-editor ul[data-type="taskList"] li { display: flex; align-items: flex-start; gap: 0.5rem; padding-left: 0; }
        .nexus-tiptap-editor ul[data-type="taskList"] li > label { flex-shrink: 0; margin-top: 0.2rem; user-select: none; }
        .nexus-tiptap-editor ul[data-type="taskList"] li > div { flex: 1 1 auto; }
        .nexus-tiptap-editor ul[data-type="taskList"] li[data-checked="true"] > div { opacity: 0.55; text-decoration: line-through; }
        .nexus-tiptap-editor a { color: var(--color-link, #2563eb); text-decoration: underline; text-underline-offset: 2px; cursor: pointer; }
        .nexus-tiptap-editor img { max-width: 100%; height: auto; border-radius: 0.5rem; margin: 1rem 0; }
        .nexus-callout { position: relative; border-radius: 0.6rem; margin: 1rem 0; padding: 0.75rem 1rem; }
        .nexus-callout-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.4rem; }
        .nexus-callout-icon-button { border: none; background: transparent; font-size: 1.1rem; cursor: pointer; padding: 0.15rem 0.3rem; border-radius: 0.4rem; }
        .nexus-callout-icon-button:hover { background: rgba(0,0,0,0.06); }
        .nexus-callout-variant-select { font-size: 0.7rem; border: 1px solid var(--color-border); border-radius: 0.4rem; padding: 0.1rem 0.3rem; background: transparent; color: inherit; opacity: 0.7; }
        .nexus-callout-icon-menu { position: absolute; top: 2.2rem; left: 0.75rem; z-index: 20; flex-wrap: wrap; gap: 0.25rem; max-width: 220px; padding: 0.5rem; border-radius: 0.6rem; background: var(--color-bg); border: 1px solid var(--color-border); box-shadow: 0 4px 14px rgba(0,0,0,0.12); }
        .nexus-callout-icon-choice { border: none; background: transparent; font-size: 1.05rem; cursor: pointer; padding: 0.2rem 0.35rem; border-radius: 0.35rem; }
        .nexus-callout-icon-choice:hover { background: rgba(0,0,0,0.06); }
        .nexus-callout-icon-remove { font-size: 0.7rem; width: 100%; text-align: left; opacity: 0.6; }
        .nexus-callout-content > *:last-child { margin-bottom: 0; }
        .nexus-tiptap-editor .tiptap-mathematics-render[data-type="block-math"] { display: block; margin: 1rem 0; padding: 0.75rem 1rem; border-radius: 0.6rem; overflow-x: auto; text-align: center; background: rgba(0,0,0,0.03); border: 1px solid var(--color-border); }
        .nexus-tiptap-editor .tiptap-mathematics-render[data-type="inline-math"] { display: inline-block; padding: 0 0.15rem; border-radius: 0.3rem; }
        .nexus-tiptap-editor .tiptap-mathematics-render--editable { cursor: pointer; }
        .nexus-tiptap-editor .tiptap-mathematics-render--editable:hover { background: rgba(37,99,235,0.06); }
        .nexus-tiptap-editor table { border-collapse: collapse; table-layout: fixed; width: 100%; margin: 1rem 0; overflow: hidden; }
        .nexus-tiptap-editor table td, .nexus-tiptap-editor table th { border: 1px solid var(--color-border); padding: 0.4rem 0.6rem; vertical-align: top; position: relative; min-width: 1em; }
        .nexus-tiptap-editor table th { background: rgba(0,0,0,0.04); font-weight: 600; text-align: left; }
        .nexus-tiptap-editor table td p, .nexus-tiptap-editor table th p { margin: 0; }
        .nexus-tiptap-editor table .selectedCell { background: rgba(37,99,235,0.08); }
        .nexus-tiptap-editor table .column-resize-handle { position: absolute; right: -2px; top: 0; bottom: 0; width: 4px; background-color: #2563eb; pointer-events: none; }
        .nexus-tiptap-editor .tableWrapper { overflow-x: auto; }
        .nexus-tiptap-editor .resize-cursor { cursor: col-resize; }
        .nexus-tiptap-editor blockquote { border-left: 3px solid var(--color-border); margin: 1rem 0; padding-left: 1rem; opacity: 0.8; }
        .nexus-tiptap-editor pre { border: 1px solid var(--color-border); border-radius: 0.75rem; margin: 1rem 0; padding: 0.9rem 1rem; overflow-x: auto; background: rgba(0,0,0,0.04); }
        .nexus-tiptap-editor code { border-radius: 0.35rem; padding: 0.1rem 0.3rem; background: rgba(0,0,0,0.06); font-size: 0.92em; }
        .nexus-tiptap-editor pre code { padding: 0; background: transparent; }
        .nexus-tiptap-editor h1 { font-size: 2rem; line-height: 1.2; font-weight: 700; margin: 1.4rem 0 0.7rem; }
        .nexus-tiptap-editor h2 { font-size: 1.5rem; line-height: 1.3; font-weight: 700; margin: 1.2rem 0 0.6rem; }
        .nexus-tiptap-editor h3 { font-size: 1.2rem; line-height: 1.35; font-weight: 650; margin: 1rem 0 0.5rem; }
        .nexus-drag-handle { position: absolute; display: flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 0.4rem; cursor: grab; color: var(--color-sidebar-text, #4a4a4a); background: transparent; font-size: 0.95rem; user-select: none; transition: background-color 0.12s ease, opacity 0.12s ease; }
        .nexus-drag-handle:hover { background: rgba(0,0,0,0.08); }
        .nexus-drag-handle:active { cursor: grabbing; background: rgba(0,0,0,0.14); }
        .nexus-page-break { border: none; border-top: 2px dashed #94a3b8; margin: 24px 0; position: relative; height: 2px; }
        .nexus-page-break::after { content: "分頁符"; position: absolute; top: -10px; left: 50%; transform: translateX(-50%); background: white; padding: 0 8px; font-size: 10px; color: #94a3b8; }
        .nexus-multi-column { display: grid; gap: 16px; margin: 1rem 0; padding: 0.5rem; border: 1px dashed var(--color-border); border-radius: 8px; }
        .nexus-column { min-width: 0; }
      `}</style>
      <div ref={ref} className="w-full min-h-[400px] outline-none text-base" style={{ color: "var(--color-text)", fontFamily: "inherit", lineHeight: "1.6" }} />
    </>
  );
}
