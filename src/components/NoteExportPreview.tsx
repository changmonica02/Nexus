"use client";
import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLanguage } from "../lib/LanguageContext";
import { splitExportTable } from "../lib/noteTablePagination";
import { copyExportBlock, waitForExportAssets } from "../lib/noteExportLayout";

/** Print from a DOM copy. Editing state, including folded blocks, is untouched. */
export default function NoteExportPreview({ source, title, header, footer, pageNumbers, onClose, onSave }: {
  source: HTMLElement | null; title: string; header: string; footer: string;
  pageNumbers: boolean; onClose: () => void; onSave?: () => Promise<void>;
}) {
  const {t}=useLanguage();
  const [warnings,setWarnings]=useState<string[]>([]);
  const [error,setError]=useState(false);
  const [ready,setReady]=useState(false);
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
    const controller=new AbortController();
    setReady(false);setError(false);setWarnings([]);host.replaceChildren();
    void (async()=>{try {
    const issues=new Set<string>();
    const paperWidth = orientation === "portrait" ? 210 : 297;
    const paperHeight = orientation === "portrait" ? 297 : 210;
    const makePage = (number: number) => {
      const paper = document.createElement("section");
      paper.className = "nexus-export-paper";
      paper.setAttribute("aria-label", `${t("noteExport.page")} ${number}`);
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
    const copies=Array.from(source.children).filter(el=>!el.matches('.nexus-drag-handle,.nexus-print-hide')).map(copyExportBlock);
    // Keep copies attached at final width while assets load, without touching source.
    body.append(...copies);
    if(!await waitForExportAssets(host,controller.signal))issues.add('assets');
    if(controller.signal.aborted)return;
    body.replaceChildren();
    for (const original of copies) {
      if(original.matches('[data-type="page-break"]')){body=makePage(++number);body.parentElement!.dataset.exportManualBreak=original.dataset.id??'';oversized=false;continue;}
      if(original.querySelector('[data-type="page-break"]'))issues.add('overflow');
      if(oversized){body=makePage(++number);oversized=false;}
      const result=splitExportTable(original,body);if(result.warning)issues.add('table');
      for (const copy of result.blocks) {
      if (oversized) { body = makePage(++number); oversized = false; }
      body.append(copy);
      if (body.scrollHeight > body.clientHeight + 2 && body.children.length > 1) {
        copy.remove(); body = makePage(++number); body.append(copy);
      }
      if (body.scrollHeight > body.clientHeight + 2) { if(copy.matches('[data-type="multiColumn"]'))issues.add('columns');issues.add('overflow');body.style.height = "auto"; oversized = true; }
      if(copy.scrollWidth>body.clientWidth+2||Array.from(copy.querySelectorAll<HTMLElement>('pre,table,.katex-display,[data-type="multiColumn"]')).some(el=>el.scrollWidth>body.clientWidth+2))issues.add('overflow');
    }
      }
    if(controller.signal.aborted)return;
    for(const paper of host.children){const rect=paper.getBoundingClientRect();if(rect.height>rect.width*paperHeight/paperWidth+2)issues.add('overflow');}
    setPageCount(number);setWarnings([...issues]);setReady(true);
    }catch{if(!controller.signal.aborted){setError(true);setReady(false);}}})();
    return ()=>controller.abort();
  }, [source, title, printHeader, printFooter, showPageNumbers, orientation, margin,t]);
  return createPortal(<div className={`nexus-export-preview ${orientation}`} role="dialog" aria-modal="true" aria-label={t("noteExport.title")}>
    <div className="nexus-export-controls nexus-print-hide">
      <strong className="mr-auto">{t("noteExport.title")} · {pageCount} {t("noteExport.page")}</strong>
      <label>{t("noteExport.paper")} <select disabled={printing} aria-label={t("noteExport.orientation")} value={orientation} onChange={e => setOrientation(e.target.value as "portrait" | "landscape")}><option value="portrait">{t("noteExport.portrait")}</option><option value="landscape">{t("noteExport.landscape")}</option></select></label>
      <label>{t("noteExport.margin")} <select disabled={printing} aria-label={t("noteExport.marginLabel")} value={margin} onChange={e => setMargin(Number(e.target.value))}><option value={10}>{t("noteExport.narrow")}</option><option value={15}>{t("noteExport.standard")}</option><option value={20}>{t("noteExport.wide")}</option></select></label>
      <label>{t("noteExport.header")} <input disabled={printing} aria-label={t("noteExport.headerLabel")} value={printHeader} onChange={e => setPrintHeader(e.target.value)} /></label>
      <label>{t("noteExport.footer")} <input disabled={printing} aria-label={t("noteExport.footerLabel")} value={printFooter} onChange={e => setPrintFooter(e.target.value)} /></label>
      <label><input disabled={printing} type="checkbox" checked={showPageNumbers} onChange={e => setShowPageNumbers(e.target.checked)} /> {t("noteExport.numbers")}</label>
      <button type="button" disabled={printing||!ready} onClick={async () => { setPrinting(true); try { setError(false);await onSave?.(); window.print(); } catch { setError(true); } finally { setPrinting(false); } }}>{t("noteExport.print")}</button>
      <button type="button" disabled={printing} onClick={onClose}>{t("noteExport.close")}</button>
    </div>
    {!ready&&!error&&<p role="status" className="nexus-print-hide p-3">{t('noteExport.loading')}</p>}
    {(warnings.length>0||error)&&<div role="alert" className="nexus-print-hide p-3 text-amber-900 bg-amber-50">{warnings.map(key=><p key={key}>{t('noteExport.warning.'+key)}</p>)}{error&&<p>{t('noteExport.error')}</p>}</div>}
    <div ref={pagesRef} className="nexus-export-pages" />
  </div>, document.body);
}


