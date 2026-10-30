/** DOM-only export preparation. Never calls editor commands or persistence. */
export function copyExportBlock(original: Element): HTMLElement {
  const copy=original.cloneNode(true) as HTMLElement;
  copy.removeAttribute('contenteditable');
  copy.querySelectorAll('[contenteditable]').forEach(el=>el.removeAttribute('contenteditable'));
  copy.querySelectorAll('.nexus-drag-handle,.nexus-column-divider,.nexus-print-hide,.math-edit-wrapper,.nexus-math-card').forEach(el=>el.remove());
  for(const details of [copy,...copy.querySelectorAll('details')]){
    if(details instanceof HTMLDetailsElement){details.open=true;details.querySelectorAll('[hidden]').forEach(el=>el.removeAttribute('hidden'));}
  }
  copy.querySelectorAll<HTMLElement>('.math-preview').forEach(el=>{el.style.removeProperty('display');});
  return copy;
}

/** One bounded wait; all image listeners/timers are removed on completion or cancellation. */
export function waitForExportAssets(root:HTMLElement,signal:AbortSignal,timeoutMs=8000):Promise<boolean>{
  return new Promise(resolve=>{
    let pending=1,failed=false,done=false;
    const cleanup:(()=>void)[]=[];
    const timeout=setTimeout(()=>{failed=true;finish();},timeoutMs);
    const finish=()=>{if(done)return;done=true;clearTimeout(timeout);cleanup.forEach(fn=>fn());resolve(!failed&&!signal.aborted);};
    const complete=(ok:boolean)=>{if(done)return;failed ||= !ok;if(--pending===0)finish();};
    const abort=()=>finish();signal.addEventListener('abort',abort,{once:true});cleanup.push(()=>signal.removeEventListener('abort',abort));
    if(signal.aborted){finish();return;}
    for(const image of root.querySelectorAll('img')){
      // Lazy images outside the visible viewport must also be included in print.
      image.loading='eager';
      if(image.complete){failed ||= image.naturalWidth===0;continue;}
      pending++;
      const loaded=()=>complete(image.naturalWidth>0),error=()=>complete(false);
      image.addEventListener('load',loaded,{once:true});image.addEventListener('error',error,{once:true});
      cleanup.push(()=>{image.removeEventListener('load',loaded);image.removeEventListener('error',error);});
      if(image.complete){image.removeEventListener('load',loaded);image.removeEventListener('error',error);complete(image.naturalWidth>0);}
    }
    const fonts=root.ownerDocument.fonts;
    if(fonts)void fonts.ready.then(()=>complete(true),()=>complete(false));else complete(true);
  });
}


/** A reversible, explicitly selected output order; never changes editor columns. */
export function exportColumnBlocks(block:HTMLElement, sequential:boolean):HTMLElement[] {
  if(!sequential||!block.matches('[data-type="multiColumn"]'))return [block];
  // Live Tiptap NodeViews have a known contentDOM wrapper; serialized HTML does not.
  const first=block.firstElementChild;
  const container=block.childElementCount===1&&first?.classList.contains('nexus-multi-column')?first:block;
  const columns=Array.from(container.children);
  // Unknown children are retained instead of silently flattened away.
  if(!columns.length||columns.some(c=>!c.matches('[data-type="column"]')||Array.from(c.childNodes).some(n=>n.nodeType===Node.TEXT_NODE&&n.textContent?.trim()))||[block,container].some(el=>Array.from(el.childNodes).some(n=>n.nodeType===Node.TEXT_NODE&&n.textContent?.trim())))return [block];
  return columns.flatMap(column=>Array.from(column.children).flatMap(child=>exportColumnBlocks(child as HTMLElement,true)));
}

/** Work on attached copies at their final width, after fonts/images have loaded. */
export function fitExportContent(block:HTMLElement, availableWidth:number):boolean {
  let adjusted=false;
  const elements=(selector:string)=>[...(block.matches(selector)?[block]:[]),...block.querySelectorAll<HTMLElement>(selector)];
  for(const table of elements('table')){
    const width=table.getBoundingClientRect().width;
    const limit=Math.min(availableWidth,table.parentElement?.clientWidth||availableWidth);
    if(width<=limit+2)continue;
    table.style.width='100%';table.style.minWidth='0';table.style.tableLayout='fixed';
    table.querySelectorAll<HTMLElement>('col,th,td').forEach(cell=>{cell.removeAttribute('width');cell.style.removeProperty('width');cell.style.minWidth='0';});
    adjusted=true;
  }
  for(const display of elements('.katex-display')){
    const formula=display.querySelector<HTMLElement>('.katex');
    if(!formula)continue;
    const limit=Math.min(availableWidth,display.clientWidth||availableWidth);
    const width=Math.max(formula.scrollWidth,formula.getBoundingClientRect().width);
    if(width<=limit+2)continue;
    // Font-relative KaTeX layout participates in measurement (no clipped transform).
    const ratio=Math.max(.5,limit/width);
    display.style.fontSize=`${parseFloat(getComputedStyle(display).fontSize)*ratio}px`;
    display.dataset.exportMathScaled='true';adjusted=true;
  }
  return adjusted;
}
