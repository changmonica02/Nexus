/** Safe boundaries only: connected rowspan intervals must stay on one sheet. */
export function tableRowGroups(spans: readonly (readonly number[])[]): {from:number;to:number}[] {
  const groups:{from:number;to:number}[]=[];
  for(let from=0;from<spans.length;){
    let end=from;
    for(let row=from;row<=end;row++)for(const raw of spans[row]){
      const span=raw===0?spans.length-row:Number.isSafeInteger(raw)&&raw>0?raw:1;
      end=Math.max(end,Math.min(spans.length-1,row+span-1));
    }
    groups.push({from,to:end+1});from=end+1;
  }
  return groups;
}

/** Derived DOM fragments only. Unsupported tables are returned intact with a warning. */
export function splitExportTable(block:HTMLElement,referenceBody:HTMLElement):{blocks:HTMLElement[];warning:boolean} {
  const table=block instanceof HTMLTableElement?block:block.matches('.tableWrapper')?block.querySelector('table'):null;
  if(!table)return {blocks:[block],warning:false};
  if(table.querySelector('table')||table.tFoot||table.tBodies.length>1)return {blocks:[block],warning:true};
  const rows=Array.from(table.rows);
  let headerCount=table.tHead?.rows.length??0;
  if(!headerCount)for(const row of rows){if(row.cells.length&&Array.from(row.cells).every(c=>c.tagName==='TH'))headerCount++;else break;}
  const headers=rows.slice(0,headerCount),bodyRows=rows.slice(headerCount);
  if(!bodyRows.length)return {blocks:[block],warning:false};
  if(headers.some((row,index)=>Array.from(row.cells).some(c=>c.rowSpan===0||index+c.rowSpan>headerCount)))return {blocks:[block],warning:true};
  const measure=referenceBody.cloneNode(false) as HTMLElement;
  Object.assign(measure.style,{position:'fixed',left:'-100000px',top:'0',visibility:'hidden',width:`${referenceBody.clientWidth}px`,height:`${referenceBody.clientHeight}px`});
  measure.style.setProperty('--export-height',referenceBody.parentElement?.style.getPropertyValue('--export-height')??'267mm');
  referenceBody.parentElement!.append(measure);
  const blocks:HTMLElement[]=[];let warning=false;
  const make=()=>{
    const shell=block.cloneNode(true) as HTMLElement;
    const target=shell instanceof HTMLTableElement?shell:shell.querySelector('table')!;
    Array.from(target.rows).forEach(r=>r.remove());
    target.tHead?.remove();Array.from(target.tBodies).forEach(b=>b.remove());
    if(headers.length){const head=target.createTHead();head.dataset.exportRepeat='header';headers.forEach(r=>head.append(r.cloneNode(true)));}
    const body=target.createTBody();shell.dataset.exportTableFragment=String(blocks.length+1);
    measure.replaceChildren(shell);blocks.push(shell);return body;
  };
  try{
    let body=make(),groupsOnPage=0,oversized=false;
    const groups=tableRowGroups(bodyRows.map(row=>Array.from(row.cells,c=>c.rowSpan)));
    for(const group of groups){
      if(oversized){body=make();groupsOnPage=0;oversized=false;}
      const copies=bodyRows.slice(group.from,group.to).map(r=>r.cloneNode(true));
      body.append(...copies);
      if(measure.scrollHeight>measure.clientHeight+2&&groupsOnPage){copies.forEach(r=>r.parentNode?.removeChild(r));body=make();groupsOnPage=0;body.append(...copies);}
      if(measure.scrollHeight>measure.clientHeight+2){warning=true;oversized=true;}
      groupsOnPage++;
    }
    return {blocks,warning};
  }finally{measure.remove();}
}
