import type { SupabaseClient } from "@supabase/supabase-js";
export type Bundle = Record<string, Record<string, unknown>[]>;
export interface BundleResult { inserted: number; updated: number; skipped: number; preview: boolean; warnings: {table:string;id:string;similar_ids:string[]}[] }
export async function applyBundle(client: Pick<SupabaseClient,"rpc">, bundle: Bundle, preview = true, edits = false): Promise<BundleResult> {
  const {data,error}=await client.rpc("apply_dictionary_bundle",{bundle,preview,allow_edits:edits});
  if(error) throw new Error(error.message);
  return data as BundleResult;
}
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function id(value:string,field:string) { if(!uuid.test(value))throw new Error(`${field} 必須為穩定 UUID`);return value; }
function required(row:Record<string,string>,field:string) { if(!row[field]?.trim())throw new Error(`缺少 ${field}`);return row[field]; }
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
  const allowed=['entry_id','sense_id','headword','part_of_speech','gloss_zh_tw','citation','license'];
  if(headers.length!==allowed.length||headers.some(h=>!allowed.includes(h)))throw new Error(`CSV 欄位必須為 ${allowed.join(',')}`);
  return rows.filter(r=>r.some(Boolean)).map((r,i)=>{if(r.length!==headers.length)throw new Error(`第 ${i+2} 列欄數不符`);return Object.fromEntries(headers.map((h,j)=>[h,r[j]]));});
}
async function source(raw:string,citation:string,license:string) {
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify([raw,citation,license]))))).map(v=>v.toString(16).padStart(2,'0')).join('');
  const sid=`${hash.slice(0,8)}-${hash.slice(8,12)}-5${hash.slice(13,16)}-a${hash.slice(17,20)}-${hash.slice(20,32)}`;
  return {id:sid,citation,license,raw_text:raw,verification:'unverified',verification_note:'',source_url:null,license_note:''};
}
/** Strict documented interchange, not a converter for legacy etymology notes. */
export async function parseDictionaryImport(raw:string,format:'csv'|'md'):Promise<Bundle> {
  const bundle:Bundle={dictionary_sources:[],dictionary_entries:[],dictionary_senses:[],dictionary_etymologies:[],dictionary_learning_notes:[]};
  if(format==='csv') {
    const entries=new Map<string,Record<string,unknown>>(),senses=new Set<string>();
    for(const [i,row] of parseCSV(raw).entries()) {
      try {
        for(const key of ['entry_id','sense_id','headword','part_of_speech','gloss_zh_tw','citation','license'])required(row,key);
        const eid=id(row.entry_id,'entry_id'),sid=id(row.sense_id,'sense_id');
        if(senses.has(sid))throw new Error(`重複 sense_id ${sid}`);senses.add(sid);
        const src=await source(raw,row.citation,row.license);
        if(!bundle.dictionary_sources.some(s=>s.id===src.id))bundle.dictionary_sources.push(src);
        const entry={id:eid,kind:'word',headword:row.headword,source_id:src.id};
        if(entries.has(eid)&&JSON.stringify(entries.get(eid))!==JSON.stringify(entry))throw new Error(`同一 entry_id 的單字或來源衝突`);
        entries.set(eid,entry);
        bundle.dictionary_senses.push({id:sid,entry_id:eid,part_of_speech:row.part_of_speech,gloss_zh_tw:row.gloss_zh_tw,source_id:src.id});
      }catch(error){throw new Error(`CSV 第 ${i+2} 列：${error instanceof Error?error.message:error}`);}
    }
    bundle.dictionary_entries=[...entries.values()];
    if(!bundle.dictionary_entries.length)throw new Error('CSV 沒有資料');
  }else{
    const match=raw.replace(/^\uFEFF/,'').match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]+)$/);
    if(!match)throw new Error('Markdown 需要 frontmatter 與正文');
    const meta:Record<string,string>={};
    for(const line of match[1].split(/\r?\n/)) {
      if(!line.trim())continue;
      const pair=line.match(/^([a-z_]+):\s*(.*)$/);if(!pair)throw new Error('僅接受單行 key: value；多行內容請放正文');
      if(Object.hasOwn(meta,pair[1]))throw new Error(`重複欄位 ${pair[1]}`);
      let value=pair[2];if(value.startsWith('"')){value=JSON.parse(value);if(typeof value!=='string')throw new Error('欄位須為文字');}
      meta[pair[1]]=value;
    }
    const allowed=['id','entry_id','sense_id','kind','citation','license','verification','verification_note'];
    if(Object.keys(meta).some(k=>!allowed.includes(k)))throw new Error('未知 Markdown 欄位，請保留原檔並人工確認');
    for(const key of ['id','entry_id','kind','citation','license'])required(meta,key);
    id(meta.id,'id');id(meta.entry_id,'entry_id');if(meta.sense_id)id(meta.sense_id,'sense_id');
    if(!['historical_etymology','learning_decomposition','mnemonic_scenario'].includes(meta.kind))throw new Error('未知內容種類');
    const src=await source(raw,meta.citation,meta.license);bundle.dictionary_sources.push(src);
    const record={id:meta.id,entry_id:meta.entry_id,sense_id:meta.sense_id||null,body:match[2],source_id:src.id};
    if(meta.kind==='historical_etymology') {
      const verification=meta.verification||'unverified';
      if(!['unverified','pending','verified','disputed'].includes(verification))throw new Error('未知查證狀態');
      if(verification==='verified'&&!meta.verification_note?.trim())throw new Error('已查證詞源必須填寫查證說明');
      bundle.dictionary_etymologies.push({...record,verification,verification_note:meta.verification_note||''});
    }else{
      if(meta.verification||meta.verification_note)throw new Error('記憶／構詞聯想不可標記成歷史查證');
      bundle.dictionary_learning_notes.push({...record,kind:meta.kind});
    }
  }
  return bundle;
}
