"use client";
import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/** Print from a DOM copy. Editing state, including folded blocks, is untouched. */
export default function NoteExportPreview({ source, title, header, footer, pageNumbers, onClose, onSave }: {
  source: HTMLElement | null; title: string; header: string; footer: string;
  pageNumbers: boolean; onClose: () => void; onSave?: () => Promise<void>;
}) {
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const [margin, setMargin] = useState(15);
  const [printHeader, setPrintHeader] = useState(header);
  const [printFooter, setPrintFooter] = useState(footer);
  const [showPageNumbers, setShowPageNumbers] = useState(pageNumbers);
  const [pageCount, setPageCount] = useState(0);
  const [printing, setPrinting] = useState(false);
  const pagesRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const host = pagesRef.current;
    if (!host || !source) return;
    host.replaceChildren();
    const paperWidth = orientation === "portrait" ? 210 : 297;
    const paperHeight = orientation === "portrait" ? 297 : 210;
    const makePage = (number: number) => {
      const paper = document.createElement("section");
      paper.className = "nexus-export-paper";
      paper.setAttribute("aria-label", `第 ${number} 頁`);
      paper.style.width = `${paperWidth}mm`;
      paper.style.minHeight = `${paperHeight}mm`;
      paper.style.padding = `${margin}mm`;
      paper.style.setProperty("--export-height", `${paperHeight - margin * 2}mm`);
      const top = document.createElement("div"); top.className = "nexus-export-header"; top.textContent = printHeader || title;
      const body = document.createElement("div"); body.className = "nexus-export-body ProseMirror nexus-tiptap-editor";
      const bottom = document.createElement("div"); bottom.className = "nexus-export-footer";
      bottom.textContent = `${printFooter}${showPageNumbers ? `${printFooter ? " · " : ""}${number}` : ""}`;
      paper.append(top, body, bottom); host.append(paper);
      return body;
    };
    let number = 1, body = makePage(number), oversized = false;
    for (const original of Array.from(source.children)) {
      if (original.matches(".nexus-drag-handle, .nexus-print-hide")) continue;
      if (oversized) { body = makePage(++number); oversized = false; }
      const copy = original.cloneNode(true) as HTMLElement;
      copy.removeAttribute("contenteditable");
      if (copy instanceof HTMLDetailsElement) copy.open = true;
      copy.removeAttribute("hidden");
      copy.querySelectorAll<HTMLElement>("[contenteditable], .nexus-drag-handle, .nexus-column-divider").forEach(el => {
        if (el.matches(".nexus-drag-handle, .nexus-column-divider")) el.remove();
        else el.removeAttribute("contenteditable");
      });
      copy.querySelectorAll<HTMLDetailsElement>("details").forEach(el => { el.open = true; });
      copy.querySelectorAll<HTMLElement>("[hidden]").forEach(el => el.removeAttribute("hidden"));
      body.append(copy);
      if (body.scrollHeight > body.clientHeight + 2 && body.children.length > 1) {
        copy.remove(); body = makePage(++number); body.append(copy);
      }
      if (body.scrollHeight > body.clientHeight + 2) { body.style.height = "auto"; oversized = true; }
    }
    setPageCount(number);
  }, [source, title, printHeader, printFooter, showPageNumbers, orientation, margin]);
  return createPortal(<div className={`nexus-export-preview ${orientation}`} role="dialog" aria-modal="true" aria-label="筆記匯出預覽">
    <div className="nexus-export-controls nexus-print-hide">
      <strong className="mr-auto">匯出預覽 · {pageCount} 頁</strong>
      <label>紙張 <select aria-label="紙張方向" value={orientation} onChange={e => setOrientation(e.target.value as "portrait" | "landscape")}><option value="portrait">A4 直式</option><option value="landscape">A4 橫式</option></select></label>
      <label>邊界 <select aria-label="頁面邊界" value={margin} onChange={e => setMargin(Number(e.target.value))}><option value={10}>窄 10 mm</option><option value={15}>標準 15 mm</option><option value={20}>寬 20 mm</option></select></label>
      <label>頁首 <input aria-label="匯出頁首" value={printHeader} onChange={e => setPrintHeader(e.target.value)} /></label>
      <label>頁尾 <input aria-label="匯出頁尾" value={printFooter} onChange={e => setPrintFooter(e.target.value)} /></label>
      <label><input type="checkbox" checked={showPageNumbers} onChange={e => setShowPageNumbers(e.target.checked)} /> 頁碼</label>
      <button type="button" disabled={printing} onClick={async () => { setPrinting(true); try { await onSave?.(); window.print(); } finally { setPrinting(false); } }}>列印／儲存 PDF</button>
      <button type="button" onClick={onClose}>關閉</button>
    </div>
    <div ref={pagesRef} className="nexus-export-pages" />
  </div>, document.body);
}
