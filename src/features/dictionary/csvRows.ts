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
  // Only known, content-free retired metadata may be omitted from a CSV.
  // Unknown columns (even if empty) may be spelling mistakes and must not vanish.
  const ignored=new Set(['locale','note','verification_note']);
  if(allowed.some(h=>!headers.includes(h))||headers.some(h=>!allowed.includes(h)&&!ignored.has(h)))throw new Error(`CSV 欄位必須為 ${allowed.join(',')}；僅允許空白的 locale / note / verification_note 額外欄位；citation / license / source_id 已淘汰`);
  return rows.filter(r=>r.some(Boolean)).map((r,i)=>{
    if(r.length!==headers.length)throw new Error(`第 ${i+2} 列欄數不符`);
    for(let j=0;j<headers.length;j++)if(ignored.has(headers[j])&&r[j].trim())throw new Error(`第 ${i+2} 列：退休欄位 ${headers[j]} 仍有內容，為避免資料遺失請人工確認`);
    return Object.fromEntries(headers.flatMap((h,j)=>ignored.has(h)?[]:[[h==='mnemonic_story'?'core_concept':h,r[j]]]));
  });
}
