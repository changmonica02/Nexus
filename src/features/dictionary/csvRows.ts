export function parseCSV(text:string): Record<string,string>[] {
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
  const legacyStory=headers.includes('mnemonic_story');
  const allowed=headers.includes('kind')?['kind','entry_id','sense_id','headword','part_of_speech','gloss_zh_tw',...(headers.includes('category')?['category']:['semantic_domain','semantic_subdomain']),'etymology','example_words','relation_hint',legacyStory?'mnemonic_story':'core_concept']:['entry_id','sense_id','headword','part_of_speech','gloss_zh_tw'];
  // Compatibility is intentionally limited: only documented retired columns with no
  // content may be ignored. Nonempty retired metadata might be meaningful and must
  // never disappear during import; unknown columns require manual review.
  const emptyRetiredColumns=new Set(['grouping','group_data','sense_groups','primary_category','variant_group','citation','license','source_id']);
  const extras=headers.filter(h=>!allowed.includes(h));
  if(allowed.some(h=>!headers.includes(h))||extras.some(h=>!emptyRetiredColumns.has(h)))throw new Error(`CSV 欄位必須包含 ${allowed.join(',')}；未知欄位請人工確認`);
  return rows.filter(r=>r.some(Boolean)).map((r,i)=>{
    if(r.length!==headers.length)throw new Error(`第 ${i+2} 列欄數不符`);
    for(const h of extras)if(r[headers.indexOf(h)].trim())throw new Error(`第 ${i+2} 列：舊欄位 ${h} 含有內容，請備份並人工確認，不會自動略過`);
    return Object.fromEntries(headers.flatMap((h,j)=>allowed.includes(h)?[[h==='mnemonic_story'?'core_concept':h,r[j]]]:[]));
  });
}
