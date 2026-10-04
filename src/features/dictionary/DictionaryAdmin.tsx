"use client";

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {AIExport,AIImport} from './DictionaryAI';
import {DictionaryModal} from './DictionaryModal';
import {emptyGrouping,primaryCategories,prefixCategories,readGrouping,readSenseGroups,saveGroupedDraft,savePrefixDraft,type DictionaryGrouping,type SenseGroupMap} from './grouping';
import { getSupabase } from '../../infrastructure/supabase/client';
import { getDictionaryEntry, publishDictionaryEntry, type DictionaryDetail, type DictionaryEntry, type DictionarySense } from './dictionary';
import { applyBundle, parseDictionaryImport, type Bundle, type BundleResult } from './adminImport';
import {deleteDraftSense,withoutSense} from './draftEditing';
import {useUnsavedDraft} from './useUnsavedDraft';

const control='w-full min-w-0 rounded border border-[var(--color-border)] bg-[var(--color-editor-bg)] p-2 text-sm text-[var(--color-text)]';
const button='rounded border border-[var(--color-border)] bg-[var(--color-panel-bg)] px-3 py-2 text-sm text-[var(--color-text)] disabled:opacity-40';
const labels={word:'單字',prefix:'字首',root:'字根'};
type Row=Record<string,unknown>;
function Field({label,value,onChange,multiline=false}:{label:string;value:unknown;onChange:(v:string)=>void;multiline?:boolean}) {
  return <label className="block text-sm">{label}{multiline?<textarea className={control} rows={4} value={String(value??'')} onChange={e=>onChange(e.target.value)}/>:<input className={control} value={String(value??'')} onChange={e=>onChange(e.target.value)}/>}</label>;
}
function Verification({row,change}:{row:Row;change:(key:string,value:string)=>void}){
  return <><label className="block text-sm">查證狀態<select className={control} value={String(row.verification)} onChange={e=>change('verification',e.target.value)}>{Object.entries({unverified:'未查證',pending:'待審核',verified:'已查證',disputed:'有爭議'}).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label><Field label="查證說明（已查證必填）" value={row.verification_note} onChange={v=>change('verification_note',v)}/></>;
}
function clean(row:object):Row { const result={...row} as Row;for(const key of ['updated_at','published_at','status'])delete result[key];return result; }
export function DictionaryPreview({bundle,technical=true}:{bundle:Bundle;technical?:boolean}) {
  return <div className="space-y-4" aria-label="字典預覽">{Object.entries(bundle).map(([table,rows])=><section key={table}>
    <h3 className="font-semibold">{{dictionary_sources:'來源與授權',dictionary_entries:'詞條',dictionary_senses:'義項',dictionary_relations:'義項構詞關聯',dictionary_etymologies:'歷史詞源（以查證狀態為準）',dictionary_learning_notes:'學習拆解／記憶情境（不是歷史事實）'}[table]??table}</h3>
    {rows.map(row=><article key={String(row.id)} className="my-2 space-y-2 whitespace-pre-wrap break-words rounded border p-3 text-sm">
      {table==='dictionary_sources'?<><p>來源：{String(row.citation)}</p><p>授權：{String(row.license)}</p><details><summary>原始內容</summary><pre className="whitespace-pre-wrap break-words">{String(row.raw_text)}</pre></details></>:<>
        <p>{String(row.headword??row.gloss_zh_tw??row.body??'義項關聯')}</p>
        {!!row.part_of_speech&&<p>分類：{String(row.part_of_speech)}</p>}
        {!!row.verification&&<p>查證：{String(row.verification)} {String(row.verification_note??'')}</p>}
        {technical&&!!row.target_sense_id&&<p>目標義項：{String(row.target_sense_id)} · {String(row.relation_kind)}</p>}
        {row.kind==='mnemonic_scenario'&&<p>記憶情境，不是歷史事實</p>}
      </>}
      {technical&&<details><summary>穩定識別與資料欄位</summary><pre className="whitespace-pre-wrap break-words text-xs">{JSON.stringify(row,null,2)}</pre></details>}
    </article>)}
  </section>)}</div>;
}
export function DictionaryEditor({detail,entries,senses,onSaved,initialGrouping=emptyGrouping(),initialSenseGroups={},reviewDraft=false}:{reviewDraft?:boolean;initialSenseGroups?:SenseGroupMap;initialGrouping?:DictionaryGrouping;detail:DictionaryDetail;entries:DictionaryEntry[];senses:DictionarySense[];onSaved:(id:string)=>Promise<void>}) {
  const [bundle,setBundle]=useState<Bundle>(()=>({dictionary_entries:[clean(detail.entry)],dictionary_senses:detail.senses.map(clean),dictionary_relations:detail.relations.map(clean),dictionary_etymologies:detail.etymologies.map(clean),dictionary_learning_notes:detail.learning_notes.map(clean)}));
  const [grouping,setGrouping]=useState(initialGrouping);
  const [senseGroups,setSenseGroups]=useState(initialSenseGroups);
  const [citation,setCitation]=useState('');const [license,setLicense]=useState('');
  const [baseline,setBaseline]=useState(bundle);
  const [preview,setPreview]=useState(false);const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');
  const locked=detail.entry.status==='published';
  const dirty=!locked&&(detail.entry.revision===0||JSON.stringify(bundle)!==JSON.stringify(baseline)||!!citation||!!license||JSON.stringify(grouping)!==JSON.stringify(initialGrouping)||bundle.dictionary_senses.some(row=>(senseGroups[String(row.id)]??null)!==(initialSenseGroups[String(row.id)]??null)));
  useUnsavedDraft(dirty,busy);
  const change=(table:string,index:number,key:string,value:unknown)=>setBundle(b=>({...b,[table]:b[table].map((r,i)=>i===index?{...r,[key]:value}:r)}));
  const add=(table:string,values:Row)=>setBundle(b=>({...b,[table]:[...b[table],{id:crypto.randomUUID(),entry_id:detail.entry.id,source_id:detail.entry.source_id,...values}]}));
  const save=async()=>{
    setBusy(true);setMessage('');
    try{
      if(!citation.trim()||!license.trim())throw new Error('請填寫本次草稿的來源及授權說明');
      const sid=crypto.randomUUID();const next:Bundle={};
      for(const [t,rows]of Object.entries(bundle))next[t]=rows.map(r=>({...r,source_id:sid}));
      next.dictionary_sources=[{id:sid,citation,license,raw_text:JSON.stringify(bundle),verification:'unverified',verification_note:''}];
      if(detail.entry.kind==='word')await applyBundle(getSupabase()!,next,false,true);
      else {
        const normalized={...grouping,tags:[...new Set(grouping.tags.map(t=>t.trim()).filter(Boolean))]};
        if(detail.entry.kind==='prefix')await savePrefixDraft(getSupabase()!,next,normalized,senseGroups);
        else await saveGroupedDraft(getSupabase()!,next,normalized);
      }
      await onSaved(detail.entry.id);
    }catch(e){setMessage(e instanceof Error?e.message:String(e));}finally{setBusy(false);}
  };
  const publish=async()=>{setBusy(true);try{await publishDictionaryEntry(getSupabase()!,detail.entry.id);await onSaved(detail.entry.id);}catch(e){setMessage(String(e));}finally{setBusy(false);}};
  const removeSense=async(row:Row)=>{
    if(busy||locked)return;
    setMessage('');
    try{
      const next=withoutSense(bundle,String(row.id));
      const saved=baseline.dictionary_senses.find(s=>s.id===row.id&&Number(s.revision)>0);
      if(!saved){setBundle(next);return;}
      if(!window.confirm('永久刪除此已儲存的草稿義項？其他義項及構詞資料不會刪除。此操作立即儲存。'))return;
      setBusy(true);
      const revision=await deleteDraftSense(getSupabase()!,detail.entry.id,String(row.id),Number(baseline.dictionary_entries[0].revision),Number(saved.revision));
      setBundle({...next,dictionary_entries:next.dictionary_entries.map(e=>({...e,revision}))});
      setBaseline(b=>({...b,dictionary_entries:b.dictionary_entries.map(e=>({...e,revision})),dictionary_senses:b.dictionary_senses.filter(s=>s.id!==row.id)}));
      setMessage('義項已刪除。其他尚未儲存的修改仍保留在表單。');
    }catch(e){setMessage(e instanceof Error?e.message:String(e));}finally{setBusy(false);}
  };
  return <section className="space-y-4 rounded-xl border p-4">
    <Link href="/dictionary/admin" className="underline">← 公共字典管理</Link>
    <h2 className="font-semibold">{locked?'已發布 · 唯讀':'編輯草稿'}</h2>
    {locked&&<p>已發布內容改版及撤回等待 A3 決策。</p>}
    <fieldset disabled={busy||locked} className="space-y-4">
      <Field label={labels[detail.entry.kind]} value={bundle.dictionary_entries[0].headword} onChange={v=>change('dictionary_entries',0,'headword',v)}/>
      <section className="space-y-3"><h3 className="font-semibold">分類</h3>
        {detail.entry.kind==='word'?bundle.dictionary_senses.map((row,i)=><Field key={String(row.id)} label={`分類 · ${String(row.gloss_zh_tw)||`中文義項 ${i+1}`}`} value={row.part_of_speech} onChange={v=>change('dictionary_senses',i,'part_of_speech',v||null)}/>):<>
          {detail.entry.kind==='root'&&<label className="block text-sm">主要分類<select className={control} value={grouping.primary_category??''} onChange={e=>setGrouping(g=>({...g,primary_category:e.target.value||null}))}><option value="">未分類</option>{primaryCategories.map(c=><option key={c}>{c}</option>)}</select></label>}
          <Field label="標籤（以逗號分隔）" value={grouping.tags.join(',')} onChange={v=>setGrouping(g=>({...g,tags:v.split(/[,，]/)}))}/>
          <Field label="形態群／變體群（選填，例如 cap/cept/cip）" value={grouping.variant_group} onChange={v=>setGrouping(g=>({...g,variant_group:v||null}))}/>
        </>}
      </section>
      <section className="space-y-3"><h3 className="font-semibold">中文義項</h3>
      {bundle.dictionary_senses.map((row,i)=><div key={String(row.id)} className="space-y-2 rounded border p-3">
        <Field label={`繁體中文意思 ${i+1}`} value={row.gloss_zh_tw} onChange={v=>change('dictionary_senses',i,'gloss_zh_tw',v)}/>
        {detail.entry.kind==='prefix'&&<label className="block text-sm">主要分類<select className={control} aria-label={`中文義項 ${i+1} 的主要分類`} value={senseGroups[String(row.id)]??''} onChange={e=>setSenseGroups(g=>({...g,[String(row.id)]:e.target.value||null}))}><option value="">未分類</option>{prefixCategories.map(c=><option key={c}>{c}</option>)}</select></label>}
        <button type="button" className={button} onClick={()=>void removeSense(row)}>刪除義項</button>
      </div>)}
      <button className={button} onClick={()=>add('dictionary_senses',{part_of_speech:detail.entry.kind==='word'?'noun':null,gloss_zh_tw:''})}>新增義項</button></section>
      <section className="space-y-3"><h3 className="font-semibold">構詞關聯</h3>
        {!bundle.dictionary_senses.length&&<p className="text-sm opacity-70">先新增中文義項，再加入字首／字根。</p>}
        {bundle.dictionary_senses.map(s=><div key={String(s.id)} className="space-y-3 rounded border p-3">
          <p className="font-medium">{String(s.gloss_zh_tw)||'尚未填寫中文意思'}</p>
          {bundle.dictionary_relations.map((row,i)=>row.sense_id===s.id&&<div key={String(row.id)} className="space-y-2">
            <span className="block text-center opacity-60">＋</span>
            <label className="block text-sm">字首／字根<select className={control} value={String(row.target_sense_id??'')} onChange={e=>{const target=senses.find(s=>s.id===e.target.value);change('dictionary_relations',i,'target_entry_id',target?.entry_id??'');change('dictionary_relations',i,'target_sense_id',target?.id??'');}}><option value="">請選擇字首／字根與中文義</option>{senses.filter(s=>entries.some(e=>e.id===s.entry_id&&e.kind!=='word')).map(s=><option key={s.id} value={s.id}>{entries.find(e=>e.id===s.entry_id)?.headword}　{s.gloss_zh_tw}</option>)}</select></label>
            <label className="block text-sm">關聯種類<select className={control} value={String(row.relation_kind)} onChange={e=>change('dictionary_relations',i,'relation_kind',e.target.value)}><option value="learning_decomposition">學習用拆解</option><option value="historical_etymology">歷史詞源關聯</option></select></label>
            <Verification row={row} change={(key,value)=>change('dictionary_relations',i,key,value)}/>
          </div>)}
          <button className={button} disabled={detail.entry.kind!=='word'} onClick={()=>add('dictionary_relations',{sense_id:s.id,target_entry_id:'',target_sense_id:'',relation_kind:'learning_decomposition',verification:'unverified',verification_note:''})}>加入字首／字根</button>
        </div>)}
      </section>
      {([{table:'dictionary_etymologies',title:'歷史詞源',kind:null},{table:'dictionary_learning_notes',title:'記憶拆解',kind:'learning_decomposition'},{table:'dictionary_learning_notes',title:'記憶故事',kind:'mnemonic_scenario'}] as const).map(({table,title,kind})=><section key={title} className="space-y-3">
        <h3 className="font-semibold">{title}</h3>{kind&&<p className="text-sm opacity-70">輔助記憶，不是經查證的歷史事實。</p>}
        {bundle[table].map((row,i)=>(!kind||row.kind===kind)&&<div key={String(row.id)} className="space-y-2 rounded border p-3">
          {!!row.sense_id&&<p className="text-sm">{String(bundle.dictionary_senses.find(s=>s.id===row.sense_id)?.gloss_zh_tw??'')}</p>}
          <Field label="完整內容" multiline value={row.body} onChange={v=>change(table,i,'body',v)}/>
          {!kind&&<Verification row={row} change={(key,value)=>change(table,i,key,value)}/>}
        </div>)}
        <button className={button} onClick={()=>add(table,kind?{sense_id:null,body:'',kind}:{sense_id:null,body:'',verification:'unverified',verification_note:''})}>新增{title}</button>
      </section>)}
      <h3 className="font-semibold">來源與授權</h3>
      <Field label="本次草稿來源／作者" value={citation} onChange={setCitation}/><Field label="本次草稿授權說明" value={license} onChange={setLicense}/>
      <button className={button} onClick={save}>儲存整份草稿</button>
    </fieldset>
    <button className={button} onClick={()=>setPreview(!preview)}>切換完整預覽</button>
    {preview&&<DictionaryPreview bundle={bundle} technical={false}/>}
    {reviewDraft&&<p>這是已發布詞條的審核草稿；本版不提供取代發布，原 Published 保持不變。</p>}
    {!locked&&!reviewDraft&&detail.entry.revision>0&&<details><summary>首次發布</summary><p className="my-2 text-sm">只發布已儲存版本；尚未儲存的編輯不會發布。發布後暫不提供修改與撤回。</p><button className={button} disabled={busy||dirty} onClick={publish}>確認首次發布已儲存草稿</button></details>}
    {message&&<p role="alert">{message}</p>}
  </section>;
}

function Workspace({entryId,newKind}:{entryId?:string;newKind?:DictionaryEntry['kind']}){
  const [entries,setEntries]=useState<DictionaryEntry[]>([]),[senses,setSenses]=useState<DictionarySense[]>([]);
  const [detail,setDetail]=useState<DictionaryDetail|null>(()=>{
    if(!newKind)return null;
    const id=crypto.randomUUID(),source=crypto.randomUUID();
    return {entry:{id,kind:newKind,headword:'',source_id:source,status:'draft',published_at:null,revision:0,updated_at:''},senses:[{id:crypto.randomUUID(),entry_id:id,source_id:source,part_of_speech:newKind==='word'?'noun':null,gloss_zh_tw:'',revision:0,updated_at:''}],relations:[],etymologies:[],learning_notes:[]};
  }),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
  const [kind,setKind]=useState('all'),[query,setQuery]=useState('');
  const [candidate,setCandidate]=useState<Bundle|null>(null),[result,setResult]=useState<BundleResult|null>(null),[format,setFormat]=useState<'csv'|'md'|'json'|'ai'>('csv');
  const [fileText,setFileText]=useState('');
  const [selected,setSelected]=useState<string[]>([]);
  const [modal,setModal]=useState<'new'|'import'|'export'|null>(null),[createKind,setCreateKind]=useState<DictionaryEntry['kind']>('word');
  const [grouping,setGrouping]=useState<DictionaryGrouping>(emptyGrouping);
  const [senseGroups,setSenseGroups]=useState<SenseGroupMap>({});
  const [reviewDraft,setReviewDraft]=useState(false);
  const closeModal=()=>{if(!busy&&(!fileText||window.confirm('有尚未匯入的內容，確定關閉？'))){setModal(null);setFileText('');setCandidate(null);setResult(null);}};
  async function loadDetail(id:string){const d=await getDictionaryEntry(getSupabase()!,id);const g=d&&d.entry.kind!=='word'?await readGrouping(getSupabase()!,id):emptyGrouping();const sg=d?.entry.kind==='prefix'?await readSenseGroups(getSupabase()!,d.senses.map(s=>s.id)):{};const {data:meta,error}=await getSupabase()!.from('dictionary_ai_metadata').select('published_entry_id,component_order').eq('entry_id',id).maybeSingle();if(error)throw new Error(error.message);if(d&&meta?.component_order){const order:string[]=meta.component_order;d.relations.sort((a,b)=>(order.includes(a.id)?order.indexOf(a.id):999999)-(order.includes(b.id)?order.indexOf(b.id):999999));}return {d,g,sg,review:!!meta?.published_entry_id};}
  useUnsavedDraft(!detail&&!!fileText,busy);
  async function refresh(id?:string){const client=getSupabase()!;const [e,s]=await Promise.all([client.from('dictionary_entries').select('*').order('headword'),client.from('dictionary_senses').select('*')]);if(e.error||s.error)throw new Error(e.error?.message||s.error?.message);setEntries(e.data);setSenses(s.data);if(id){const {d,g,sg,review}=await loadDetail(id);setReviewDraft(review);setSenseGroups(sg);setGrouping(g);setDetail(d);window.history.replaceState(window.history.state,"",`/dictionary/admin?entry=${encodeURIComponent(id)}`);}}
  useEffect(()=>{let active=true;const client=getSupabase()!;Promise.all([client.from('dictionary_entries').select('*').order('headword'),client.from('dictionary_senses').select('*')]).then(([e,s])=>{if(!active)return;if(e.error||s.error)setMessage(e.error?.message||s.error?.message||'讀取失敗');else{setEntries(e.data);setSenses(s.data);}});return()=>{active=false;};},[]);
  async function action(work:()=>Promise<void>){setBusy(true);setMessage('');try{await work();}catch(e){setMessage(e instanceof Error?e.message:String(e));}finally{setBusy(false);}}
  useEffect(()=>{if(!entryId)return;let active=true;void loadDetail(entryId).then(({d,g,sg,review})=>{if(active){setReviewDraft(review);setSenseGroups(sg);setGrouping(g);setDetail(d);if(!d)setMessage('找不到此詞條。');}}).catch(e=>{if(active)setMessage(String(e));});return()=>{active=false;};},[entryId]);
  if(detail)return <DictionaryEditor key={`${detail.entry.id}:${detail.entry.revision}`} detail={detail} initialGrouping={grouping} initialSenseGroups={senseGroups} reviewDraft={reviewDraft} entries={entries} senses={senses} onSaved={refresh}/>;
  if(entryId)return <div><Link href="/dictionary/admin" className="underline">← 公共字典管理</Link><p role="status">{message||'正在讀取詞條…'}</p></div>;
  return <div className="space-y-5">
    <Link href="/dictionary" className="inline-block underline">← 字典首頁</Link>
    <div className="flex flex-wrap gap-2"><button className={button} onClick={()=>setModal('new')}>新增</button><button className={button} onClick={()=>{setMessage('');setModal('import');}}>匯入</button><button className={button} onClick={()=>setModal('export')}>匯出</button></div>
    {modal==='export'&&<DictionaryModal title="匯出 AI Dictionary JSON" onClose={closeModal} busy={busy}><AIExport initialKind={kind} query={query} selected={selected} onBusy={setBusy}/></DictionaryModal>}
    {modal==='new'&&<DictionaryModal title="新增詞條" onClose={closeModal}><label className="block text-sm">詞條類別<select className={control} value={createKind} onChange={e=>setCreateKind(e.target.value as DictionaryEntry['kind'])}>{Object.entries(labels).map(([k,l])=><option key={k} value={k}>{l}</option>)}</select></label><Link className={`${button} inline-block`} href={`/dictionary/admin?new=${createKind}`}>開始新增</Link></DictionaryModal>}
    <div className="flex gap-2"><input aria-label="搜尋管理詞條" placeholder="搜尋詞條" className={control} value={query} onChange={e=>setQuery(e.target.value)}/><select aria-label="詞條分類" className={control} value={kind} onChange={e=>setKind(e.target.value)}><option value="all">全部類別</option>{Object.entries(labels).map(([k,l])=><option key={k} value={k}>{l}</option>)}</select></div>
    <ul className="max-h-64 overflow-auto rounded border">{entries.filter(e=>(kind==='all'||e.kind===kind)&&e.headword.toLowerCase().includes(query.toLowerCase())).map(e=><li key={e.id} className="flex items-center gap-2 px-2"><input type="checkbox" aria-label={`勾選 ${e.headword}`} checked={selected.includes(e.id)} onChange={event=>setSelected(ids=>event.target.checked?[...ids,e.id]:ids.filter(id=>id!==e.id))}/><Link className="block w-full p-3 text-left hover:bg-[var(--color-panel-bg)]" href={`/dictionary/admin?entry=${encodeURIComponent(e.id)}`}>{e.headword} · {labels[e.kind]} · {e.status==='draft'?'草稿':'已發布'}</Link></li>)}</ul>
    <>{modal==='import'&&<DictionaryModal title="匯入字典" onClose={closeModal} busy={busy}><section className="space-y-3"><h2 className="font-semibold">匯入預覽（只建立草稿，不覆寫衝突內容）</h2>
      <details><summary>檔案格式</summary><p className="my-2 text-sm">JSON Bundle：頂層為物件，支援 dictionary_sources、dictionary_entries、dictionary_senses、dictionary_relations、dictionary_etymologies、dictionary_learning_notes 陣列。每筆須有穩定 UUID；不接受 status、SHA 或其他資料庫管理欄位。來源須含 citation、license、raw_text；詞條須含 kind、headword、source_id；義項須含 entry_id、gloss_zh_tw、source_id。關聯可指向本批或既有資料，預覽會驗證完整關聯及顯示疑似重複警告。</p><p className="my-2 break-words text-sm">CSV 欄名：entry_id,sense_id,headword,part_of_speech,gloss_zh_tw,citation,license。ID 使用固定 UUID；一列一義項，相同單字可共用 entry_id。</p><pre className="whitespace-pre-wrap text-xs">{'Markdown：\n---\nid: 內容 UUID\nentry_id: 既有詞條 UUID\nsense_id: 可省略的義項 UUID\nkind: historical_etymology / learning_decomposition / mnemonic_scenario\ncitation: 來源\nlicense: 授權說明\nverification: unverified（僅歷史詞源）\nverification_note: 查證說明\n---\n完整正文（原文保存）'}</pre><p className="text-xs">Frontmatter 使用單行 key: value，含特殊字元可用 JSON 雙引號字串。不接受未知欄位，不自動轉換舊百科筆記。</p></details>
      <fieldset disabled={busy} className="space-y-3">
      <select aria-label="匯入格式" className={control} value={format} onChange={e=>{setFormat(e.target.value as 'csv'|'md'|'json'|'ai');setCandidate(null);setResult(null);}}><option value="csv">CSV 單字／義項</option><option value="md">Markdown 詞源／記憶內容</option><option value="json">JSON Bundle</option><option value="ai">AI Dictionary JSON</option></select>
      <input aria-label="匯入檔案" type="file" accept=".csv,.md,.json" disabled={busy} onChange={e=>{const file=e.target.files?.[0];setCandidate(null);setResult(null);if(file)void action(async()=>{setFileText(await file.text());});}}/>
      <Field label="檔案內容（可貼上）" multiline value={fileText} onChange={v=>{setFileText(v);setCandidate(null);setResult(null);}}/>
      </fieldset>
      {format==='ai'?<AIImport key={fileText} raw={fileText} onBusy={setBusy} onSaved={()=>refresh()}/>:<>
      <button className={button} disabled={busy||!fileText} onClick={()=>action(async()=>{setCandidate(null);setResult(null);const parsed=await parseDictionaryImport(fileText,format as 'csv'|'md'|'json');setCandidate(parsed);setResult(await applyBundle(getSupabase()!,parsed,true));})}>驗證並預覽，不寫入</button>
      {candidate&&<DictionaryPreview bundle={candidate}/>}
      {!!result?.warnings?.length&&<aside role="status" className="rounded border border-amber-500 p-3 text-sm"><h3 className="font-semibold">疑似重複內容，請人工確認</h3><p>同類同拼寫詞條可能是同形異源，義項或正文相同也不一定是重複。本次不會自動合併或改寫不同 ID。每筆最多列出 5 個相似 ID。</p><ul className="mt-2 space-y-2">{result.warnings.map(w=><li key={`${w.table}:${w.id}`} className="break-all">{w.table==='dictionary_entries'?'同類同拼寫詞條':w.table==='dictionary_senses'?'同詞條、詞性與釋義':'同詞條義項的相同內容'}：{w.id}<br/>相似 ID：{w.similar_ids.join('、')}</li>)}</ul></aside>}
      {result&&<><p>預計新增 {result.inserted} 筆；跳過 {result.skipped} 筆。包含來源及關聯資料列。</p><button className={button} disabled={busy||!candidate} onClick={()=>action(async()=>{if(!window.confirm("確定匯入目前預覽的草稿？不會覆蓋既有衝突或已發布內容。"))return;const saved=await applyBundle(getSupabase()!,candidate!,false);setMessage(`匯入完成：新增 ${saved.inserted}，跳過 ${saved.skipped}`);setCandidate(null);setResult(null);setFileText('');await refresh();})}>確認匯入草稿</button></>}
    </>}
    </section>{message&&<p role="alert" className="whitespace-pre-wrap">{message}</p>}</DictionaryModal>}</>
    {modal!=='import'&&message&&<p role="alert" className="whitespace-pre-wrap">{message}</p>}
  </div>;
}
export default function DictionaryAdmin({entryId,newKind}:{entryId?:string;newKind?:DictionaryEntry['kind']}={}){
  const [access,setAccess]=useState<{owner:string;allowed:boolean}|null>(null),[error,setError]=useState('');
  const ownerRef=useRef<string|null>(null);
  useEffect(()=>{const client=getSupabase();if(!client)return;let generation=0;let mounted=true;
    const check=async()=>{const run=++generation;setAccess(null);const {data:{user},error:authError}=await client.auth.getUser();if(!mounted||run!==generation)return;if(authError||!user){setError('請先從 Nexus 登入。');return;}const {data,error}=await client.rpc('is_dictionary_admin');if(!mounted||run!==generation)return;if(error){setError('無法確認管理權限，請確認 M7-9／M7-10 migration 已套用。');return;}setError('');ownerRef.current=user.id;setAccess({owner:user.id,allowed:data===true});};
    void check();const {data:{subscription}}=client.auth.onAuthStateChange((event,session)=>{if(event==='INITIAL_SESSION'||event==='TOKEN_REFRESHED'||(session?.user.id===ownerRef.current))return;generation++;ownerRef.current=null;setAccess(null);setTimeout(()=>{if(mounted)void check();},0);});return()=>{mounted=false;generation++;subscription.unsubscribe();};},[]);
  return <main className="h-dvh overflow-y-auto" style={{color:'var(--color-text)',background:'var(--color-bg)'}}><div className="mx-auto max-w-5xl space-y-5 p-4 sm:p-6 [&_*]:border-[var(--color-border)]">{!access?.allowed&&<Link href="/dictionary" className="underline">← 字典首頁</Link>}<h1 className="text-2xl font-semibold">公共字典管理</h1><p className="text-sm">僅管理員可編輯。公共字典不會覆寫任何人的字卡或學習紀錄。</p>{!getSupabase()?<p>尚未設定 Supabase。</p>:error?<p role="alert">{error}</p>:access?.allowed?<Workspace key={`${access.owner}:${entryId??newKind??"list"}`} entryId={entryId} newKind={newKind}/>:access?<p>此帳號沒有公共字典管理權限。</p>:<p>確認管理權限中…</p>}</div></main>;
}
