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

export default function TiptapEditor({ content, onChange, variant = "rich", toolbarTarget, onFocus, pageNightAdapt, onTogglePageNightAdapt, showToolbar = true }: TiptapEditorProps) {
  const { t } = useLanguage();
  const ref = useRef<HTMLDivElement>(null);
  const editorRef = useRef<Editor | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [toolbarState, setToolbarState] = useState<ToolbarState>(emptyToolbarState);
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  // Table context menu state
  const [tableMenu, setTableMenu] = useState<{ x: number; y: number } | null>(null);
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
    return () => { editor.destroy(); editorRef.current = null; setIsReady(false); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || !content) return;
    const currentJson = JSON.stringify(editor.getJSON());
    const targetJson = JSON.stringify(content);
    if (currentJson !== targetJson) { editor.commands.setContent(content); refreshToolbarState(); }
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
      if (!cell) {
        setTableMenu(null);
        return;
      }
      // Only show if inside table
      const table = target.closest("table");
      if (!table) {
        setTableMenu(null);
        return;
      }
      e.preventDefault();
      setTableMenu({ x: e.clientX, y: e.clientY });
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

  const toolbarJSX = (
    <div className="flex flex-wrap items-center gap-0.5 px-3 py-1">
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
        <Sep />
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
      <TB icon="🔗" title={t("tiptap.link")} active={toolbarState.link} disabled={disabled} onClick={handleSetLink} />
      <TB icon="🖼" title={t("tiptap.image")} disabled={disabled} onClick={handleInsertImage} />
      {variant === "rich" && (<>
        <Sep />
        <div className="flex items-center gap-1 border rounded px-1.5 py-0.5" style={{ borderColor: "var(--color-border)" }}>
          <span className="text-[10px] opacity-60 mr-0.5">排版</span>
          <select
            value={toolbarState.textAlign}
            disabled={disabled}
            title="對齊方式"
            onChange={(e) => {
              const v = e.target.value as "left" | "center" | "right" | "justify";
              editorRef.current?.chain().focus().setTextAlign(v).run();
            }}
            className="rounded px-1 py-0.5 text-[11px] bg-transparent disabled:opacity-40 max-w-[80px]"
            style={{ border: "1px solid transparent", color: "var(--color-text)" }}
          >
            <option value="left">向左對齊</option>
            <option value="center">置中</option>
            <option value="right">向右對齊</option>
            <option value="justify">兩端對齊</option>
          </select>
          <div className="w-px h-4 bg-zinc-300 mx-0.5" />
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
            className="rounded px-1 py-0.5 text-[11px] bg-transparent disabled:opacity-40 max-w-[70px]"
            style={{ border: "1px solid transparent", color: "var(--color-text)" }}
          >
            <option value="1">單欄</option>
            <option value="2">2欄</option>
            <option value="3">3欄</option>
          </select>
          <div className="w-px h-4 bg-zinc-300 mx-0.5" />
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
        </div>
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
      <TableGridPicker editor={editorRef.current} disabled={disabled} />
      <ToolbarDropdown label="" icon="➕" variant="inline" disabled={disabled}
        items={[
          { id: "insert-quote", icon: "❝", label: t("tiptap.label.quote"), onClick: () => editorRef.current?.chain().focus().toggleBlockquote().run() },
          { id: "insert-code", icon: "{ }", label: t("tiptap.label.codeBlock"), onClick: () => editorRef.current?.chain().focus().toggleCodeBlock().run() },
          { id: "insert-callout", icon: "💡", label: t("tiptap.label.callout"), onClick: () => editorRef.current?.chain().focus().setCallout("info").run() },
          { id: "insert-inline-math", icon: "x²", label: t("tiptap.label.inlineMath"), onClick: handleInsertInlineMath },
          { id: "insert-block-math", icon: "∑", label: t("tiptap.label.blockMath"), onClick: handleInsertBlockMath },
        ]} />
      

      {toolbarState.callout && (<TB icon="✕C" title={t("tiptap.callout")} disabled={disabled} onClick={() => editorRef.current?.chain().focus().unsetCallout().run()} />)}
      <Sep />
      <TB icon="Tx" title={t("tiptap.clear")} disabled={disabled} onClick={() => editorRef.current?.chain().focus().unsetAllMarks().clearNodes().run()} />
      <Sep />
      <button
        type="button"
        title={pageNightAdapt ? "切換為原文字顏色（白底黑字）" : "切換為適配夜晚模式顏色"}
        disabled={disabled}
        onMouseDown={(e) => { e.preventDefault(); onTogglePageNightAdapt?.(); }}
        className="rounded flex items-center justify-center px-2 h-[30px] text-[11px] font-medium transition-all hover:bg-zinc-200 disabled:opacity-30 border"
        style={{ borderColor: "var(--color-border)", color: "var(--color-text)", backgroundColor: pageNightAdapt ? "var(--color-border)" : "transparent" }}
      >
        {pageNightAdapt ? "🌙 適配夜晚" : "☀️ 原文字顏色"}
      </button>
    </div>
  );

  return (
    <>
      {showToolbar && (toolbarTarget ? createPortal(toolbarJSX, toolbarTarget) : toolbarJSX)}
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
