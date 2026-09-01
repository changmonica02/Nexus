"use client";
import { useCallback, useEffect, useRef, useState } from "react";
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
  onChange: (payload: { json: any; text: string; cursor?: CursorAnchor }) => void;
  variant?: "rich" | "plain";
  toolbarTarget?: HTMLElement | null;
  onFocus?: () => void;
  pageNightAdapt?: boolean;
  onTogglePageNightAdapt?: () => void;
  showToolbar?: boolean;
  toolbarTab?: "home";
  // 2026-08-11：Google Docs 式選單列（第一列：檔案/編輯/檢視/插入/格式/工具）
  // 編輯器相關的「編輯/插入/格式」選單內容由 TiptapEditor portal 注入
  editToolbarTarget?: HTMLElement | null;
  insertToolbarTarget?: HTMLElement | null;
  formatToolbarTarget?: HTMLElement | null;
  showLineNumbers?: boolean;
  lineNumberStart?: number;
  paneId?: string;
  pageIndex?: number;
  focusRequest?: CursorAnchor & { targetPageIndex: number; revision: number };
  onFocusRequestHandled?: (revision: number) => void;
  margins?: any;
  onMarginsChange?: (margins: any) => void;
  /** 是否運作在分頁模式（PaginatedEditorView 底下）。分頁模式下，本頁找不到
   *  錨點 block 代表它已被搬到別頁，應讓那一頁自己用 block id 精準接手，
   *  而不是在本頁用文字前綴誤判「找到了」。 */
  paginated?: boolean;
}

interface CursorAnchor {
  id: string;
  offset: number;
  blockIndex: number;
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
      className="rounded flex items-center justify-center w-6 h-6 text-[12px] font-medium transition-colors hover:bg-zinc-200/70 disabled:cursor-not-allowed disabled:opacity-30 leading-none shrink-0"
      style={{ color: "var(--color-text)", backgroundColor: active ? "rgba(0,0,0,0.08)" : "transparent" }}
    >
      {icon || label}
    </button>
  );
}
function Sep() { return <div className="mx-0.5 h-4 w-px bg-zinc-300 shrink-0" />; }
function MenuSep() { return <div className="my-1 border-t" style={{ borderColor: "var(--color-border)" }} />; }

// 2026-08-11：Google Docs 式選單列的垂直選單項；執行後關閉選單
function MenuItem({ label, icon, active, disabled, onClick, danger }: {
  label: string; icon?: React.ReactNode; active?: boolean; disabled?: boolean; onClick: () => void; danger?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onMouseDown={(e) => { e.preventDefault(); if (!disabled) onClick(); window.dispatchEvent(new CustomEvent("nexus-close-menus")); }}
      className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left rounded-md transition-all hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40"
      style={{ color: danger ? "#dc2626" : "var(--color-text)", backgroundColor: active ? "var(--color-border)" : "transparent" }}
    >
      {icon && <span className="w-4 text-center shrink-0">{icon}</span>}
      <span>{label}</span>
    </button>
  );
}

// 全域游標錨點：分頁模式下 block 被搬移到另一頁編輯器時，游標跨編輯器跟隨
// （每頁是獨立 TiptapEditor，游標無法直接轉移，用模組級變數記錄「最近游標所在 block」，
//   任一編輯器 setContent 後若發現該 block 在自己文件內 → 放置游標並聚焦）
let globalCursorAnchor: { id: string; offset: number; prefix?: string; paneId?: string } | null = null;
// 主人機制：誰的 doc 握有 anchor block，誰就是游標主人（防止焦點被其他頁搶走）
let anchorOwnerEl: HTMLElement | null = null;
function canClaimCursorAnchor(editorEl: HTMLElement, anchor: NonNullable<typeof globalCursorAnchor>): boolean {
  if (!anchorOwnerEl || anchorOwnerEl === editorEl || !anchorOwnerEl.isConnected || !anchor.id) return true;
  return !Array.from(anchorOwnerEl.querySelectorAll<HTMLElement>("[data-id]")).some(
    (element) => element.dataset.id === anchor.id,
  );
}
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

// 在 block 內容範圍內，依「字元偏移」找出對應的 doc pos。
// 保持在 component 外，讓跨頁焦點交接 callback 不會因為每次 render 都
// 取得新的函式參考而重複執行。
function posAtCharOffset(doc: any, from: number, to: number, targetChar: number): number {
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
}

type LineNumber = { number: number; top: number };

function LineNumberGutter({ editorRootRef, startAt }: { editorRootRef: React.RefObject<HTMLDivElement | null>; startAt: number }) {
  const [lines, setLines] = useState<LineNumber[]>([]);

  const measure = useCallback(() => {
    const root = editorRootRef.current;
    if (!root || !root.isConnected) return;

    const rootRect = root.getBoundingClientRect();
    const candidates = Array.from(root.querySelectorAll<HTMLElement>(
      "p, h1, h2, h3, pre, hr, [data-type='page-break'], li, table tr",
    )).filter((element) => {
      // Paragraphs inside list/table cells belong to the list item or table
      // row, so counting them too would produce duplicate line labels.
      if (element.tagName === "P" && element.closest("li, td, th")) return false;
      if (["H1", "H2", "H3", "PRE", "HR"].includes(element.tagName) && element.closest("td, th")) return false;
      return true;
    });

    let nextNumber = startAt;
    const nextLines: LineNumber[] = [];
    for (const element of candidates) {
      const rect = element.getBoundingClientRect();
      if (rect.height === 0) continue;
      const top = Math.round(Math.max(0, rect.top - rootRect.top));

      if (element.tagName === "PRE") {
        const lineHeight = Number.parseFloat(getComputedStyle(element).lineHeight) || 22;
        const lineCount = Math.max(1, (element.textContent || "").split("\n").length);
        for (let index = 0; index < lineCount; index += 1) {
          nextLines.push({ number: nextNumber++, top: Math.round(top + index * lineHeight) });
        }
      } else {
        nextLines.push({ number: nextNumber++, top });
      }
    }

    // An empty document still has one editable line even before Tiptap inserts
    // its first paragraph into the DOM.
    if (nextLines.length === 0) nextLines.push({ number: startAt, top: 0 });
    setLines((previous) => (
      previous.length === nextLines.length && previous.every((line, index) => (
        line.number === nextLines[index].number && line.top === nextLines[index].top
      )) ? previous : nextLines
    ));
  }, [editorRootRef, startAt]);

  useEffect(() => {
    const root = editorRootRef.current;
    if (!root) return;
    let frame = 0;
    const scheduleMeasure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    const observer = new MutationObserver(scheduleMeasure);
    const resizeObserver = new ResizeObserver(scheduleMeasure);
    observer.observe(root, { childList: true, subtree: true, characterData: true });
    resizeObserver.observe(root);
    window.addEventListener("resize", scheduleMeasure);
    scheduleMeasure();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener("resize", scheduleMeasure);
    };
  }, [editorRootRef, measure]);

  return (
    <div aria-hidden="true" className="absolute inset-y-0 left-0 w-10 select-none border-r text-right text-[10px] leading-none opacity-45" style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}>
      {lines.map((line) => (
        <span key={`${line.number}-${line.top}`} className="absolute right-2" style={{ top: line.top }}>{line.number}</span>
      ))}
    </div>
  );
}

export default function TiptapEditor({ content, onChange, variant = "rich", toolbarTarget, onFocus, pageNightAdapt, onTogglePageNightAdapt, showToolbar = true, toolbarTab = "home", editToolbarTarget, insertToolbarTarget, formatToolbarTarget, showLineNumbers = false, lineNumberStart = 1, margins, onMarginsChange, paneId = "primary", pageIndex = 0, focusRequest, onFocusRequestHandled, paginated = false }: TiptapEditorProps) {
  const { t } = useLanguage();
  const ref = useRef<HTMLDivElement>(null);
  const editorRef = useRef<Editor | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [toolbarState, setToolbarState] = useState<ToolbarState>(emptyToolbarState);
  const [marginsPanelOpen, setMarginsPanelOpen] = useState(false);
  const handledFocusRevisionRef = useRef<number | null>(null);
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
      onFocus() {
        onFocus?.();
        // 使用者主動聚焦本頁 → 更新 anchor 與 owner（避免別頁搶焦點）
        try {
          const { state } = editor;
          const sel = state.selection;
          if (sel && typeof sel.anchor === "number" && sel.anchor > 0) {
            const pos = Math.min(sel.anchor, state.doc.content.size);
            const $pos = state.doc.resolve(pos);
            for (let d = $pos.depth; d > 0; d--) {
              const node = $pos.node(d);
              if (node.type.isBlock && node.attrs && typeof node.attrs.id === "string" && node.attrs.id) {
                const off = state.doc.textBetween($pos.start(d), pos, "\n", " ").length;
                globalCursorAnchor = { id: node.attrs.id, offset: off, paneId };
                anchorOwnerEl = editor.view.dom as HTMLElement;
                break;
              }
            }
          }
        } catch { /* ignore */ }
      },
      onUpdate({ editor }) {
        refreshToolbarState();
        const { state } = editor;
        const position = state.selection.anchor;
        let cursor: CursorAnchor | undefined;
        let blockIndex = -1;
        state.doc.forEach((node, offset, index) => {
          if (position >= offset && position <= offset + node.nodeSize) blockIndex = index;
        });
        const $pos = state.doc.resolve(Math.min(position, state.doc.content.size));
        for (let depth = $pos.depth; depth > 0; depth--) {
          const node = $pos.node(depth);
          if (node.type.isBlock && typeof node.attrs?.id === "string" && node.attrs.id) {
            cursor = {
              id: node.attrs.id,
              offset: state.doc.textBetween($pos.start(depth), position, "\n", " ").length,
              blockIndex,
            };
            break;
          }
        }
        onChangeRef.current({ json: editor.getJSON(), text: editor.getText(), cursor });
      },
    });
    editorRef.current = editor;
    setIsReady(true);
    refreshToolbarState();
    // 新 mount 時檢查全域錨點：分頁搬移把 block 送來本頁時，游標跟隨（延遲至其他 effect 設定 anchor 後）
    setTimeout(() => {
      const ed = editorRef.current;
      if (!ed || !globalCursorAnchor) return;
      const anchor = globalCursorAnchor;
      if (anchor.paneId !== paneId) return;
      let found = -1;
      ed.state.doc.descendants((n: any, np: number) => {
        if (n.attrs && n.attrs.id === anchor.id) { found = np; return false; }
        return true;
      });
      if (found >= 0 && canClaimCursorAnchor(ed.view.dom as HTMLElement, anchor)) {
        try {
          const block = ed.state.doc.nodeAt(found);
          if (block) {
            const s = found + 1, e = found + block.nodeSize - 1;
            const tp = posAtCharOffset(ed.state.doc, s, e, anchor.offset);
            anchorOwnerEl = ed.view.dom as HTMLElement;
            ed.commands.setTextSelection(Math.min(Math.max(tp, s), Math.max(e, s)));
            ed.commands.focus();
            setTimeout(() => {
              (ed.view.dom as HTMLElement).closest?.("[data-page]")?.scrollIntoView?.({ behavior: "smooth", block: "center" });
            }, 30);
          }
        } catch { /* ignore */ }
      }
    }, 0);
    return () => {
      if (anchorOwnerEl === (editor.view.dom as HTMLElement)) anchorOwnerEl = null;
      editor.destroy();
      editorRef.current = null;
      setIsReady(false);
    };
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

  // The paginated parent calculates the page containing a moved cursor block.
  // Apply each hand-off exactly once.  The target editor can already be mounted
  // with its old content, so this helper is also called immediately after a
  // content replacement below.
  const applyFocusRequest = useCallback((editor = editorRef.current): boolean => {
    if (!editor || !isReady || !focusRequest || focusRequest.targetPageIndex !== pageIndex) return false;
    if (handledFocusRevisionRef.current === focusRequest.revision) return false;

    let blockPos = -1;
    editor.state.doc.descendants((node: any, nodePos: number) => {
      if (node.attrs?.id === focusRequest.id) { blockPos = nodePos; return false; }
      return true;
    });
    const block = blockPos >= 0 ? editor.state.doc.nodeAt(blockPos) : null;
    if (!block) return false;

    const from = blockPos + 1;
    const to = blockPos + block.nodeSize - 1;
    const target = posAtCharOffset(editor.state.doc, from, to, focusRequest.offset);
    anchorOwnerEl = editor.view.dom as HTMLElement;
    editor.commands.setTextSelection(Math.min(Math.max(target, from), Math.max(to, from)));
    editor.commands.focus();
    handledFocusRevisionRef.current = focusRequest.revision;
    onFocusRequestHandled?.(focusRequest.revision);
    return true;
  }, [focusRequest, isReady, onFocusRequestHandled, pageIndex]);

  // The request effect covers a newly-mounted target page.  Existing target
  // pages are covered by the post-setContent call in the sync effect.
  useEffect(() => {
    applyFocusRequest();
  }, [applyFocusRequest]);

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
          globalCursorAnchor = { id: cursorBlockId, offset: cursorBlockOffset, prefix: cursorPrefix, paneId };
        } else if (cursorPrefix) {
          // id 遺失（舊資料/新段落尚未補 id）→ 用前綴錨點
          globalCursorAnchor = { id: "", offset: cursorBlockOffset, prefix: cursorPrefix.slice(-60), paneId };
        }
      }
      editor.commands.setContent(content, { emitUpdate: false });
      const newDoc = editor.state.doc;
      // If this editor was already mounted before the block crossed the page
      // boundary, it only contains the moved block after setContent().
      // Handling the request here prevents the focus effect from racing the
      // content synchronization step.
      if (applyFocusRequest(editor)) {
        refreshToolbarState();
        return;
      }
      // 1) 全域錨點定位：block 可能在「這個編輯器」或「被搬到另一頁編輯器」
      //    僅同 paneId（雙開分離）才接管
      const anchor = globalCursorAnchor && globalCursorAnchor.paneId === paneId ? globalCursorAnchor : null;
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
              if (!canClaimCursorAnchor(editor.view.dom as HTMLElement, anchor)) {
                // Sibling page effects can run before the previous owner has
                // received its new content. Retry after that owner relinquishes
                // the moved block instead of leaving focus at its page tail.
                setTimeout(() => {
                  const latestAnchor = globalCursorAnchor;
                  if (
                    !latestAnchor ||
                    latestAnchor.id !== anchor.id ||
                    latestAnchor.paneId !== paneId ||
                    !canClaimCursorAnchor(editor.view.dom as HTMLElement, latestAnchor)
                  ) return;

                  let retryPos = -1;
                  editor.state.doc.descendants((node: any, nodePos: number) => {
                    if (node.attrs?.id === latestAnchor.id) { retryPos = nodePos; return false; }
                    return true;
                  });
                  const retryBlock = retryPos >= 0 ? editor.state.doc.nodeAt(retryPos) : null;
                  if (!retryBlock) return;

                  const retryStart = retryPos + 1;
                  const retryEnd = retryPos + retryBlock.nodeSize - 1;
                  anchorOwnerEl = editor.view.dom as HTMLElement;
                  editor.commands.setTextSelection(posAtCharOffset(editor.state.doc, retryStart, retryEnd, latestAnchor.offset));
                  editor.commands.focus();
                }, 0);
                return;
              }
              anchorOwnerEl = editor.view.dom as HTMLElement;
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
        // 分頁模式下，交由 block 實際落腳的那一頁自己用 id 精準接手（它的
        // content-diff effect 會在 setContent 後用同一個 globalCursorAnchor
        // 找到這個 block）。這裡若仍用「文字前綴比對」在本頁復原，前綴文字
        // 幾乎都還完整存在於本頁——因為真正被搬走的往往只是 Enter 新分出的
        // 空段落，前綴剛好就是「移走前，本頁最後那段文字」——於是永遠會
        // 假性比對成功，把游標留在來源頁、搶在目標頁之前。這正是「游標一碰
        // 到第二頁，不管是斷行還是在尾端加行，都被拉回原行行首」的成因。
        // 非分頁模式（單一編輯器、沒有別頁可接手）才需要這個前綴 fallback。
        if (!paginated && anchor.prefix) {
          const p = findPosByPrefix(newDoc, anchor.prefix, true);
          if (p > 0) {
            if (!canClaimCursorAnchor(editor.view.dom as HTMLElement, anchor)) return;
            anchorOwnerEl = editor.view.dom as HTMLElement;
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
    const { from, to } = ed.state.selection;
    const selectedText = ed.state.doc.textBetween(from, to, "\n");
    ed.chain().focus().insertContent({ type: "blockMath", attrs: { latex: selectedText || "" } }).run();
  };
  const handleInsertInlineMath = () => {
    const ed = editorRef.current;
    if (!ed) return;
    const { from, to } = ed.state.selection;
    const selectedText = ed.state.doc.textBetween(from, to, " ");
    ed.chain().focus().insertContent({ type: "inlineMath", attrs: { latex: selectedText || "" } }).run();
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
      <TB icon="√x" title="插入行內公式 (Ctrl+M)" disabled={disabled} onClick={handleInsertInlineMath} />
      <TB icon="∑" title="插入區塊公式 (Ctrl+Shift+M)" disabled={disabled} onClick={handleInsertBlockMath} />
      <Sep />
      <TB icon="Tx" title={t("tiptap.clear")} disabled={disabled} onClick={() => editorRef.current?.chain().focus().unsetAllMarks().clearNodes().run()} />
    </>
  );

  // ============ 2026-08-11：Google Docs 式選單列內容（垂直選單） ============

  // 編輯（undo / redo / 清除格式）
  const editTools = (
    <>
      <MenuItem icon="↩" label={t("tiptap.undo") || "復原"} disabled={disabled || !toolbarState.canUndo} onClick={() => editorRef.current?.chain().focus().undo().run()} />
      <MenuItem icon="↪" label={t("tiptap.redo") || "重做"} disabled={disabled || !toolbarState.canRedo} onClick={() => editorRef.current?.chain().focus().redo().run()} />
      <MenuSep />
      <MenuItem icon="Tx" label={t("tiptap.clear") || "清除格式"} disabled={disabled} onClick={() => editorRef.current?.chain().focus().unsetAllMarks().clearNodes().run()} />
    </>
  );

  // 插入（表格 / 連結 / 圖片 / 提示框 / 公式 / 分頁符）
  const insertTools = (
    <>
      <div className="px-3 py-1 text-[10px] font-semibold tracking-wider uppercase opacity-50" style={{ color: "var(--color-text)" }}>表格</div>
      <div className="px-2 pb-1"><TableGridPicker editor={editorRef.current} disabled={disabled} /></div>
      <MenuSep />
      <MenuItem icon="🔗" label={t("tiptap.link") || "連結"} active={toolbarState.link} disabled={disabled} onClick={handleSetLink} />
      <MenuItem icon="🖼" label={t("tiptap.image") || "圖片"} disabled={disabled} onClick={handleInsertImage} />
      <MenuSep />
      <MenuItem icon="💡" label={t("tiptap.label.callout") || "提示框"} active={toolbarState.callout} disabled={disabled} onClick={() => {
        if (toolbarState.callout) editorRef.current?.chain().focus().unsetCallout().run();
        else editorRef.current?.chain().focus().setCallout("info").run();
      }} />
      <MenuItem icon="x²" label={t("tiptap.label.inlineMath") || "行內公式"} disabled={disabled} onClick={handleInsertInlineMath} />
      <MenuItem icon="∑" label={t("tiptap.label.blockMath") || "區塊公式"} disabled={disabled} onClick={handleInsertBlockMath} />
      <MenuSep />
      <MenuItem icon="⛶" label="分頁符" disabled={disabled} onClick={() => (editorRef.current as any)?.chain().focus().setPageBreak().run()} />
    </>
  );

  // 格式（樣式 / 字型 / 字級 / 文字樣式 / 顏色 / 對齊 / 分欄 / 直排 / 邊界 / 清單 / 引用 / 程式碼）
  const formatTools = (
    <>
      {variant === "rich" && (<>
        <div className="px-3 py-1 text-[10px] font-semibold tracking-wider uppercase opacity-50" style={{ color: "var(--color-text)" }}>樣式</div>
        <MenuItem icon="¶" label={t("tiptap.style.normal") || "內文"} active={!toolbarState.h1 && !toolbarState.h2 && !toolbarState.h3} disabled={disabled} onClick={() => { const ed = editorRef.current; if (!ed) return; if (ed.isActive("heading")) ed.chain().focus().toggleHeading({ level: (ed.getAttributes("heading").level || 1) }).run(); }} />
        <MenuItem icon="H1" label={t("tiptap.h1") || "標題 1"} active={toolbarState.h1} disabled={disabled} onClick={() => { const ed = editorRef.current; if (!ed) return; if (!ed.isActive("heading", { level: 1 })) ed.chain().focus().toggleHeading({ level: 1 }).run(); }} />
        <MenuItem icon="H2" label={t("tiptap.h2") || "標題 2"} active={toolbarState.h2} disabled={disabled} onClick={() => { const ed = editorRef.current; if (!ed) return; if (!ed.isActive("heading", { level: 2 })) ed.chain().focus().toggleHeading({ level: 2 }).run(); }} />
        <MenuItem icon="H3" label={t("tiptap.h3") || "標題 3"} active={toolbarState.h3} disabled={disabled} onClick={() => { const ed = editorRef.current; if (!ed) return; if (!ed.isActive("heading", { level: 3 })) ed.chain().focus().toggleHeading({ level: 3 }).run(); }} />
        <MenuSep />
        <div className="px-3 py-1 text-[10px] font-semibold tracking-wider uppercase opacity-50" style={{ color: "var(--color-text)" }}>字型 / 字級</div>
        <select
          value={toolbarState.fontFamily || ""}
          disabled={disabled}
          title={t("tiptap.fontFamily") || "字型"}
          onChange={(e) => { const v = e.target.value; const c = editorRef.current?.chain().focus(); if (!c) return; if (v) c.setFontFamily(v).run(); else c.unsetFontFamily().run(); }}
          className="w-[calc(100%-16px)] mx-2 rounded px-2 py-1.5 text-sm bg-transparent disabled:opacity-40"
          style={{ border: "1px solid var(--color-border)", color: "var(--color-text)" }}
        >
          <option value="">{t("tiptap.fontFamily.default") || "預設字型"}</option>
          <option value="Arial, sans-serif">Arial</option>
          <option value="Georgia, serif">Georgia</option>
          <option value="'Courier New', monospace">Courier New</option>
          <option value="'Times New Roman', serif">Times New Roman</option>
          <option value="'Noto Sans TC', sans-serif">Noto Sans TC</option>
        </select>
        <div className="flex items-center gap-2 px-3 py-1.5">
          <button type="button" title="−" disabled={disabled || currentFontSize <= 8} onMouseDown={(e) => { e.preventDefault(); handleFontSizeChange(currentFontSize - (currentFontSize <= 12 ? 1 : 2)); }} className="w-7 h-7 flex items-center justify-center text-sm hover:bg-zinc-200 rounded disabled:opacity-30" style={{ color: "var(--color-text)" }}>−</button>
          <input type="text" value={currentFontSize} disabled={disabled} onChange={(e) => { const val = parseInt(e.target.value, 10); if (!isNaN(val)) handleFontSizeChange(val); }} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleFontSizeChange(currentFontSize); } }} className="w-10 h-7 text-center text-sm bg-transparent outline-none disabled:opacity-40" style={{ color: "var(--color-text)" }} />
          <button type="button" title="+" disabled={disabled || currentFontSize >= 72} onMouseDown={(e) => { e.preventDefault(); handleFontSizeChange(currentFontSize + (currentFontSize >= 24 ? 4 : 2)); }} className="w-7 h-7 flex items-center justify-center text-sm hover:bg-zinc-200 rounded disabled:opacity-30" style={{ color: "var(--color-text)" }}>+</button>
          <span className="text-xs opacity-50">字級</span>
        </div>
        <MenuSep />
        <div className="px-3 py-1 text-[10px] font-semibold tracking-wider uppercase opacity-50" style={{ color: "var(--color-text)" }}>文字</div>
        <MenuItem icon={<b>B</b>} label={t("tiptap.bold") || "粗體"} active={toolbarState.bold} disabled={disabled} onClick={() => editorRef.current?.chain().focus().toggleBold().run()} />
        <MenuItem icon={<i>I</i>} label={t("tiptap.italic") || "斜體"} active={toolbarState.italic} disabled={disabled} onClick={() => editorRef.current?.chain().focus().toggleItalic().run()} />
        <MenuItem icon={<span style={{ textDecoration: "underline" }}>U</span>} label={t("tiptap.underline") || "底線"} active={toolbarState.underline} disabled={disabled} onClick={() => editorRef.current?.chain().focus().toggleUnderline().run()} />
        <MenuItem icon={<span style={{ textDecoration: "line-through" }}>S</span>} label="刪除線" active={toolbarState.strike} disabled={disabled} onClick={() => editorRef.current?.chain().focus().toggleStrike().run()} />
        <div className="flex items-center gap-1 px-3 py-1.5">
          <ColorPaletteButton icon={<span className="text-sm font-bold leading-none">A</span>} title={t("tiptap.textColor") || "文字顏色"} currentColor={toolbarState.color || ""} onColorChange={(color: string) => { if (color) editorRef.current?.chain().focus().setColor(color).run(); else editorRef.current?.chain().focus().unsetColor().run(); }} disabled={disabled} />
          <ColorPaletteButton icon={<span className="text-sm leading-none">🖍</span>} title={t("tiptap.highlight") || "螢光筆"} currentColor={toolbarState.highlightColor || ""} onColorChange={(color: string) => { if (color) editorRef.current?.chain().focus().toggleHighlight({ color }).run(); else editorRef.current?.chain().focus().unsetHighlight().run(); }} disabled={disabled} />
          <span className="text-xs opacity-50 ml-1">顏色 / 螢光筆</span>
        </div>
        <MenuSep />
        <div className="px-3 py-1 text-[10px] font-semibold tracking-wider uppercase opacity-50" style={{ color: "var(--color-text)" }}>版面</div>
        <MenuItem icon="⇤" label="向左對齊" active={toolbarState.textAlign === "left"} disabled={disabled} onClick={() => editorRef.current?.chain().focus().setTextAlign("left").run()} />
        <MenuItem icon="≣" label="置中對齊" active={toolbarState.textAlign === "center"} disabled={disabled} onClick={() => editorRef.current?.chain().focus().setTextAlign("center").run()} />
        <MenuItem icon="⇥" label="向右對齊" active={toolbarState.textAlign === "right"} disabled={disabled} onClick={() => editorRef.current?.chain().focus().setTextAlign("right").run()} />
        <MenuItem icon="☰" label="兩端對齊" active={toolbarState.textAlign === "justify"} disabled={disabled} onClick={() => editorRef.current?.chain().focus().setTextAlign("justify").run()} />
        <MenuSep />
        <MenuItem icon="▦" label="單欄" active={!toolbarState.multiColumn} disabled={disabled} onClick={() => (editorRef.current as any)?.chain().focus().unsetMultiColumn().run()} />
        <MenuItem icon="▥" label="2 欄" active={toolbarState.multiColumn} disabled={disabled} onClick={() => (editorRef.current as any)?.chain().focus().setMultiColumn(2).run()} />
        <MenuItem icon="▤" label="3 欄" active={toolbarState.multiColumn} disabled={disabled} onClick={() => (editorRef.current as any)?.chain().focus().setMultiColumn(3).run()} />
        <MenuItem icon="↕️" label="直排 / 橫排" disabled={disabled} onClick={() => (editorRef.current as any)?.chain().focus().toggleWritingMode().run()} />
        {onMarginsChange && (
          <div className="px-3 py-1.5">
            <button
              ref={marginsBtnRef}
              type="button"
              title="頁面邊界（Word 版面配置→邊界）"
              disabled={disabled}
              onClick={() => { updateMarginsPos(); setMarginsPanelOpen((v) => !v); }}
              className="w-full rounded flex items-center justify-center px-2 py-1.5 text-sm font-medium hover:bg-zinc-200 disabled:opacity-30 border"
              style={{ borderColor: "var(--color-border)", color: "var(--color-text)", backgroundColor: marginsPanelOpen ? "var(--color-border)" : "transparent" }}
            >
              ▦ 邊界
            </button>
          </div>
        )}
        <MenuSep />
        <div className="px-3 py-1 text-[10px] font-semibold tracking-wider uppercase opacity-50" style={{ color: "var(--color-text)" }}>清單與區塊</div>
        <MenuItem icon="•" label={t("tiptap.bulletList") || "項目符號清單"} active={toolbarState.bulletList} disabled={disabled} onClick={() => editorRef.current?.chain().focus().toggleBulletList().run()} />
        <MenuItem icon="1." label={t("tiptap.orderedList") || "編號清單"} active={toolbarState.orderedList} disabled={disabled} onClick={() => editorRef.current?.chain().focus().toggleOrderedList().run()} />
        <MenuItem icon="☑" label={t("tiptap.taskList") || "待辦清單"} active={toolbarState.taskList} disabled={disabled} onClick={() => editorRef.current?.chain().focus().toggleTaskList().run()} />
        <MenuItem icon="⇥" label="增加縮排" disabled={disabled} onClick={() => { const ed = editorRef.current; if (!ed) return; if (ed.isActive("listItem")) ed.chain().focus().sinkListItem("listItem").run(); }} />
        <MenuItem icon="⇤" label="減少縮排" disabled={disabled} onClick={() => { const ed = editorRef.current; if (!ed) return; if (ed.isActive("listItem")) ed.chain().focus().liftListItem("listItem").run(); }} />
        <MenuItem icon="❝" label={t("tiptap.quote") || "引用"} active={toolbarState.blockquote} disabled={disabled} onClick={() => editorRef.current?.chain().focus().toggleBlockquote().run()} />
        <MenuItem icon="{ }" label={t("tiptap.codeBlock") || "程式碼區塊"} active={toolbarState.codeBlock} disabled={disabled} onClick={() => editorRef.current?.chain().focus().toggleCodeBlock().run()} />
      </>)}
    </>
  );

  const renderToolbar = () => (
    <div className="relative flex flex-wrap items-center gap-0.5 px-3 py-1">
      {homeTools}
    </div>
  );

  return (
    <>
      {showToolbar && (toolbarTarget ? createPortal(renderToolbar(), toolbarTarget) : renderToolbar())}
      {showToolbar && editToolbarTarget && createPortal(<div className="flex flex-col items-stretch gap-0.5 p-1 min-w-[200px]">{editTools}</div>, editToolbarTarget)}
      {showToolbar && insertToolbarTarget && createPortal(<div className="flex flex-col items-stretch gap-0.5 p-1 min-w-[220px]">{insertTools}</div>, insertToolbarTarget)}
      {showToolbar && formatToolbarTarget && createPortal(<div className="flex flex-col items-stretch gap-0.5 p-1 min-w-[240px]">{formatTools}</div>, formatToolbarTarget)}
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
      <div className={`relative w-full min-h-[400px] ${showLineNumbers ? "pl-12" : ""}`}>
        {showLineNumbers && <LineNumberGutter editorRootRef={ref} startAt={lineNumberStart} />}
        <div ref={ref} className="w-full min-h-[400px] outline-none text-base" style={{ color: "var(--color-text)", fontFamily: "inherit", lineHeight: "1.6" }} />
      </div>
    </>
  );
}

