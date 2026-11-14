export function parseCSVWithIgnored(text:string): {rows:Record<string,string>[];ignoredFields:string[]} {
  const rows:string[][]=[];let row:string[]=[],value="",quoted=false,closed=false;
  text=text.replace(/^\uFEFF/,"");
  for(let i=0;i<text.length;i++) {
    const c=text[i];
    if(quoted){if(c==='"'){if(text[i+1]==='"'){value+='"';i++;}else{quoted=false;closed=true;}}else value+=c;continue;}
    if(c==='"'){if(value||closed)throw new Error("CSV 引號格式錯誤");quoted=true;continue;}
    if(c===','||c==='\n'||c==='\r'){row.push(value);value="";closed=false;if(c!==','){if(c==='\r'&&text[i+1]==='\n')i++;rows.push(row);row=[];}continue;}
    if(closed)throw new Error("CSV 引號後有多餘內容");value+=c;
  }
  if(quoted)throw new Error("CSV 引號未關閉");
  if(value||row.length||closed){row.push(value);rows.push(row);}
  const headers=rows.shift();if(!headers||new Set(headers).size!==headers.length)throw new Error("CSV 缺少或重複欄名");
  const required=headers.includes('kind')?
    ['kind','entry_id','sense_id','headword','part_of_speech','gloss_zh_tw']:
    ['entry_id','sense_id','headword','part_of_speech','gloss_zh_tw'];
  const optional=headers.includes('kind')?
    ['semantic_domain','semantic_subdomain','etymology','example_words','relation_hint','core_concept']:[];
  const allowed=[...required,...optional];
  // Project only fields supported by the current format, even when a file
  // mixes historical and current headers (category, mnemonic_story, etc.).
  const ignoredFields=headers.filter(h=>!allowed.includes(h));
  if(required.some(h=>!headers.includes(h)))throw new Error(`CSV 缺少必要欄位；現行必要欄位為 ${required.join(',')}`);
  const imported=rows.filter(r=>r.some(Boolean)).map((r,i)=>{
    if(r.length!==headers.length)throw new Error(`第 ${i+2} 列欄數不符`);
    return Object.fromEntries(headers.flatMap((h,j)=>allowed.includes(h)?[[h,r[j]]]:[]));
  });
  return {rows:imported,ignoredFields};
}
/** Compatibility reader: current fields only. Preview callers should use
 * parseCSVWithIgnored to display exactly which input columns were skipped. */
export function parseCSV(text:string): Record<string,string>[] {
  return parseCSVWithIgnored(text).rows;
}
