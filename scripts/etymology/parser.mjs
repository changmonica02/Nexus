import {readdir, readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import yaml from 'js-yaml';

export const hash = value => createHash('sha256').update(value).digest('hex');
export const TABLES = ['sources','entries','senses','categories','entry_categories','words','word_senses','claims'];
const STATUSES = new Set(['prefix_meaning_reference_checked','sense_level_checked_not_word_exhaustive',
  'sense_checked_example_requires_individual_word_audit','meaning_only','draft_meaning_only',
  'etymology_checked_for_stated_claims','etymology_checked']);
const checked = status => ['etymology_checked','etymology_checked_for_stated_claims','sense_checked_example_requires_individual_word_audit'].includes(status);
const issue = (code,message) => Object.assign(new Error(message),{code});
const object = (value,label) => {
  if (!value || typeof value!=='object' || Array.isArray(value)) throw issue('INVALID_FIELD',`${label} 必須為物件`);
  return value;
};
const text = (value,label,allowEmpty=false) => {
  if (typeof value!=='string'||(!allowEmpty&&!value.trim())) throw issue('MISSING_FIELD',`${label} 必須為文字且不可缺少`);
  return value;
};
const list = (value,label) => {
  if (!Array.isArray(value)) throw issue('INVALID_FIELD',`${label} 必須為陣列`);
  return value;
};
const statusOf = value => {
  if (value!==undefined && !STATUSES.has(value)) throw issue('UNKNOWN_VERIFICATION',`未知查證狀態 ${String(value)}`);
  return value;
};

export function parseMarkdown(raw) {
  text(raw,'Markdown',true);
  if (raw.includes('\0')) throw issue('INVALID_ENCODING','Markdown 含 NUL，無法完整保存至 PostgreSQL text');
  const match=raw.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) {
    if (/^\uFEFF?---(?:\r?\n|$)/.test(raw)) throw issue('FRONTMATTER_UNCLOSED','frontmatter 缺少結束分隔線');
    return {frontmatter:null,body:raw};
  }
  let frontmatter;
  try {
    frontmatter=object(yaml.load(match[1],{schema:yaml.JSON_SCHEMA}),'frontmatter');
    JSON.stringify(frontmatter); // Reject cyclic YAML aliases before they reach jsonb persistence.
  }
  catch(error) { throw issue('INVALID_FRONTMATTER',error.message); }
  return {frontmatter,body:raw.slice(match[0].length)};
}

// Split only real H2 headings outside fenced code; archive tails are never reinterpreted.
export function bodySections(body) {
  const sections=[];let current={heading:'',body:''};let fence=null;
  for(const line of body.match(/[^\n]*\n|[^\n]+$/g)||[]) {
    const marker=line.match(/^\s{0,3}(`{3,}|~{3,})/);
    if(marker) {
      if(!fence) fence=marker[1];
      else if(marker[1][0]===fence[0]&&marker[1].length>=fence.length) fence=null;
    }
    const h=!fence&&line.match(/^## ([^\r\n]+)\r?\n?$/);
    if(h){sections.push(current);current={heading:h[1],body:''};}else current.body+=line;
  }
  sections.push(current);
  const archive=sections.findIndex(s=>s.heading==='舊版內容（留存供審計，不作為正式義項）');
  return archive<0?sections:sections.slice(0,archive);
}

export async function readBatch(directory) {
  const files=[];
  const walk=async(relative='')=>{
    for(const entry of (await readdir(join(directory,relative),{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name,'en'))) {
      const path=relative?`${relative}/${entry.name}`:entry.name;
      if(entry.isSymbolicLink()) throw issue('SYMLINK_NOT_READ',`不讀取 symbolic link：${path}`);
      if(entry.isDirectory())await walk(path);
      else if(entry.isFile()&&/\.md$/i.test(entry.name)) {
        const bytes=await readFile(join(directory,path));
        // Fatal UTF-8 decoding prevents replacement characters from silently corrupting originals.
        const raw=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes);
        files.push({path,raw,sha256:hash(bytes)});
      }
    }
  };
  await walk();return files;
}

export function compileBatch(files) {
  const catalog=Object.fromEntries(TABLES.map(table=>[table,[]]));
  const report={mode:'dry-run',status:'valid',imported:0,skipped:0,failed:0,pending_review:0,
    record_counts_available:true,database_writes:0,files:[],errors:[],review:[],counts:{}};
  const ids=new Set(),paths=new Set(),categories=new Map(),pendingLinks=[];
  if(!files.length) {
    report.status='blocked';report.record_counts_available=false;
    report.errors.push({path:'batch',code:'BATCH08_MISSING',message:'資料夾內沒有 Markdown'});
    return {catalog,report};
  }
  const unique=(id)=>{text(id,'id');if(ids.has(id))throw issue('DUPLICATE_ID',`重複 ID：${id}`);ids.add(id);};
  const review=(path,code,message)=>report.review.push({path,code,message});
  for(const file of [...files].sort((a,b)=>a.path.localeCompare(b.path,'en'))) {
    const {path,raw}=file;
    try {
      if(paths.has(path))throw issue('DUPLICATE_PATH',`重複來源路徑：${path}`);paths.add(path);
      const parsed=parseMarkdown(raw),d=parsed.frontmatter;
      const family=path.startsWith('prefixes/')?'prefix':path.startsWith('roots/')?'root':null;
      const word=path.startsWith('words/');
      const source_id=`batch08-source-${hash(path)}`;
      catalog.sources.push({id:source_id,path:`batch-08/${path}`,raw_markdown:raw,sha256:hash(Buffer.from(raw,'utf8')),
        metadata:{batch:'08',frontmatter:d,body:parsed.body,unstructured:!family&&!word,
          historical_scenes_policy:'未經獨立查證的歷史場景一律為記憶情境',parser_version:1}});
      if(!family&&!word) {
        review(path,'RAW_PRESERVED','原始筆記／審核文件完整保存，不產生推測的條目或義項。');
        report.files.push({path,status:'ready',source_id,structured:false});continue;
      }
      object(d,'frontmatter');unique(d.id);text(d.headword,'headword');statusOf(d.verification);
      if(word||d.senses===undefined)text(d.verification,'verification');
      const allowed=word?['id','kind','headword','definitions','morpheme_sense_ids','verification']
        :['id','kind','headword','display_forms','senses','verification'];
      for(const key of Object.keys(d))if(!allowed.includes(key))review(path,'UNMAPPED_FIELD',`frontmatter.${key} 完整保留於 metadata。`);
      const target=word?{entry_id:null,sense_id:null,word_id:d.id}:{entry_id:d.id,sense_id:null,word_id:null};
      const claim=(key,body,kind,verification='pending',note='',override=target)=>{
        if(!body.trim())return;
        const id=`batch08-claim-${hash(`${d.id}\0${key}`)}`;unique(id);
        catalog.claims.push({id,...override,kind,body,verification,verification_note:note,review_note:verification==='verified'?'':'原文未作完整詞源查證，請保留查證範圍。',source_id});
      };
      if(word) {
        if(d.kind!==undefined&&d.kind!=='word')throw issue('INVALID_KIND','words/ kind 必須是 word');
        const definitions=list(d.definitions,'definitions');if(!definitions.length)throw issue('MISSING_FIELD','definitions 不可為空');
        const definition=definitions.map((def,i)=>{object(def,`definitions[${i}]`);if(def.pos!==undefined)text(def.pos,'pos',true);
          for(const key of Object.keys(def))if(!['pos','meaning_zh'].includes(key))review(path,'UNMAPPED_FIELD',`definitions[${i}].${key} 保留於 metadata`);
          return `${def.pos?`${def.pos} `:''}${text(def.meaning_zh,'meaning_zh')}`;}).join('\n');
        catalog.words.push({id:d.id,lemma:d.headword,definition,source_id});
        for(const senseId of list(d.morpheme_sense_ids,'morpheme_sense_ids')) {
          text(senseId,'morpheme_sense_ids');
          if(pendingLinks.some(link=>link.word_id===d.id&&link.sense_id===senseId))throw issue('DUPLICATE_RELATION',`重複義項關聯 ${senseId}`);
          pendingLinks.push({word_id:d.id,sense_id:senseId,source_id,path});
        }
      } else {
        if(![family,'combining_form'].includes(d.kind))throw issue('INVALID_KIND',`${path} kind 與目錄分類不符`);
        catalog.entries.push({id:d.id,label:d.headword,family,kind:d.kind,variant_of:null,source_id});
        if(d.display_forms!==undefined)list(d.display_forms,'display_forms').forEach(value=>text(value,'display_forms'));
        if(d.senses===undefined)review(path,'NO_STABLE_SENSES','原稿未提供 senses / 穩定義項 ID；不從正文自行補建義項。');
        for(const sense of d.senses===undefined?[]:list(d.senses,'senses')) {
          object(sense,'sense');unique(sense.id);text(sense.meaning,'sense.meaning');text(sense.verification,'sense.verification');statusOf(sense.verification);
          const senseTarget={entry_id:null,sense_id:sense.id,word_id:null};
          catalog.senses.push({id:sense.id,entry_id:d.id,gloss:sense.meaning,source_id});
          const known=['id','label','meaning','categories','variants','usage_note','etymology_note','example_for_illustration','source','verification'];
          for(const key of Object.keys(sense))if(!known.includes(key))review(path,'UNMAPPED_FIELD',`${sense.id}.${key} 保留於 metadata。`);
          for(const key of ['label','usage_note','etymology_note','example_for_illustration','source'])if(sense[key]!==undefined)text(sense[key],key,true);
          for(const label of sense.categories===undefined?[]:list(sense.categories,'categories')) {
            text(label,'category');const id=`batch08-category-${hash(label)}`;
            if(!categories.has(id)){categories.set(id,{id,label,source_id});}
            if(!catalog.entry_categories.some(link=>link.entry_id===d.id&&link.category_id===id))catalog.entry_categories.push({entry_id:d.id,category_id:id});
          }
          if(sense.etymology_note) {
            const verified=checked(sense.verification)&&!!sense.source;
            claim(`${sense.id}:etymology`,sense.etymology_note,'historical_etymology',verified?'verified':'unverified',
              verified?`原資料狀態：${sense.verification}\n來源：${sense.source}\n僅限本義項說明，不含示意例詞。`:'',senseTarget);
          }
          const annotations=[];
          if(sense.variants!==undefined) {const variants=list(sense.variants,'variants');variants.forEach(v=>text(v,'variant'));if(variants.length)annotations.push(`原稿列出的條件變體：${variants.join('、')}`);}
          if(sense.usage_note)annotations.push(sense.usage_note);
          if(sense.example_for_illustration)annotations.push(`示意例詞（非正式單字關聯）：${sense.example_for_illustration}`);
          if(annotations.length)claim(`${sense.id}:annotations`,annotations.join('\n'),'learning_decomposition','pending','',senseTarget);
        }
      }
      const sections=bodySections(parsed.body),seenHeadings=new Set();
      const history=new Set(['詞源與構詞說明','詞源說明與證據','詞源與構詞核對','第三批詞源校訂']);
      const learning=new Set(['構詞分析（學習用）','核心概念','構詞與區分','使用與區分','字首適用性核對（第五批）']);
      for(const section of sections) {
        const h=section.heading;if(!h||!section.body.trim())continue;
        if(seenHeadings.has(h))throw issue('DUPLICATE_SECTION',`重複正文標題 ${h}`);seenHeadings.add(h);
        if(h==='完整記憶故事'||h==='原稿記憶說明')claim(`section:${h}`,section.body,'historical_scene','unverified');
        else if(history.has(h)) {
          const verified=checked(d.verification)&&/https?:\/\//.test(parsed.body);
          claim(`section:${h}`,section.body,'historical_etymology',verified?'verified':'pending',verified?`原資料狀態：${d.verification}；僅限此段明述說法，參考來源保留於原文。`:'');
        } else if(learning.has(h))claim(`section:${h}`,section.body,'learning_decomposition','pending');
      }
      // Unheaded and unrecognized prose is deliberately not promoted into historical claims.
      review(path,'SOURCE_AUDIT','完整正文、舊版內容與未映射欄位保留於來源；需依原稿界線人工審核。');
      report.files.push({path,status:'ready',source_id,id:d.id,structured:true});
    } catch(error) {
      report.errors.push({path,code:error.code||'INVALID_DOCUMENT',message:error.message});
      report.files.push({path,status:'failed'});
    }
  }
  catalog.categories=[...categories.values()];
  for(const link of pendingLinks) {
    const sense=catalog.senses.find(sense=>sense.id===link.sense_id);
    if(!sense)report.errors.push({path:link.path,code:'INVALID_SENSE_REFERENCE',message:`義項不存在：${link.sense_id}`});
    else catalog.word_senses.push({word_id:link.word_id,entry_id:sense.entry_id,sense_id:sense.id,source_id:link.source_id,
      relation_kind:'learning_decomposition',verification:'pending',verification_note:''});
    // The source ID list does not state whether each edge is historical: never infer that from word-level status.
  }
  report.counts=Object.fromEntries(TABLES.map(table=>[table,catalog[table].length]));
  report.pending_review=new Set(report.review.map(item=>item.path)).size;
  report.failed=new Set(report.errors.map(item=>item.path)).size;
  if(report.errors.length)report.status='invalid';
  return {catalog,report};
}
