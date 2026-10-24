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
    let timeout:ReturnType<typeof setTimeout>|undefined;
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
    timeout=setTimeout(()=>{failed=true;finish();},timeoutMs);
    const fonts=root.ownerDocument.fonts;
    if(fonts)void fonts.ready.then(()=>complete(true),()=>complete(false));else complete(true);
  });
}
