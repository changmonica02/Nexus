"use client";

import { useEffect, useState } from 'react';
import { getSupabase } from '../../infrastructure/supabase/client';
import { getDictionaryEntry, publishDictionaryEntry, type DictionaryDetail, type DictionaryEntry, type DictionarySense } from './dictionary';
import { applyBundle, parseDictionaryImport, type Bundle, type BundleResult } from './adminImport';
import {deleteDraftSense,withoutSense} from './draftEditing';
import {useUnsavedDraft} from './useUnsavedDraft';

const control='w-full rounded border bg-transparent p-2 text-sm';
const button='rounded border px-3 py-2 text-sm disabled:opacity-40';
const labels={word:'單字',prefix:'字首',root:'字根'};
type Row=Record<string,unknown>;
function Field({label,value,onChange,multiline=false}:{label:string;value:unknown;onChange:(v:string)=>void;multiline?:boolean}) {
  return <label className="block text-sm">{label}{multiline?<textarea className={control} rows={4} value={String(value??'')} onChange={e=>onChange(e.target.value)}/>:<input className={control} value={String(value??'')} onChange={e=>onChange(e.target.value)}/>}</label>;
}
function clean(row:object):Row { const result={...row} as Row;for(const key of ['updated_at','published_at','status'])delete result[key];return result; }
export function DictionaryPreview({bundle}:{bundle:Bundle}) {
  return <div className="space-y-4" aria-label="字典預覽">{Object.entries(bundle).map(([table,rows])=><section key={table}>
    <h3 className="font-semibold">{{dictionary_sources:'來源與授權',dictionary_entries:'詞條',dictionary_senses:'義項',dictionary_relations:'義項構詞關聯',dictionary_etymologies:'歷史詞源（以查證狀態為準）',dictionary_learning_notes:'學習拆解／記憶情境（不是歷史事實）'}[table]??table}</h3>
    {rows.map(row=><article key={String(row.id)} className="my-2 space-y-2 whitespace-pre-wrap break-words rounded border p-3 text-sm">
      {table==='dictionary_sources'?<><p>來源：{String(row.citation)}</p><p>授權：{String(row.license)}</p><details><summary>原始內容</summary><pre className="whitespace-pre-wrap break-words">{String(row.raw_text)}</pre></details></>:<>
        <p>{String(row.headword??row.gloss_zh_tw??row.body??'義項關聯')}</p>
        {!!row.part_of_speech&&<p>詞性：{String(row.part_of_speech)}</p>}
        {!!row.verification&&<p>查證：{String(row.verification)} {String(row.verification_note??'')}</p>}
        {!!row.target_sense_id&&<p>目標義項：{String(row.target_sense_id)} · {String(row.relation_kind)}</p>}
        {row.kind==='mnemonic_scenario'&&<p>記憶情境，不是歷史事實</p>}
      </>}
      <details><summary>穩定識別與資料欄位</summary><pre className="whitespace-pre-wrap break-words text-xs">{JSON.stringify(row,null,2)}</pre></details>
    </article>)}
  </section>)}</div>;
}
export function DictionaryEditor({detail,entries,senses,onSaved}:{detail:DictionaryDetail;entries:DictionaryEntry[];senses:DictionarySense[];onSaved:(id:string)=>Promise<void>}) {
  const [bundle,setBundle]=useState<Bundle>(()=>({dictionary_entries:[clean(detail.entry)],dictionary_senses:detail.senses.map(clean),dictionary_relations:detail.relations.map(clean),dictionary_etymologies:detail.etymologies.map(clean),dictionary_learning_notes:detail.learning_notes.map(clean)}));
  const [citation,setCitation]=useState('');const [license,setLicense]=useState('');
  const [baseline,setBaseline]=useState(bundle);
  const [preview,setPreview]=useState(false);const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');
  const locked=detail.entry.status==='published';
  const dirty=!locked&&(detail.entry.revision===0||JSON.stringify(bundle)!==JSON.stringify(baseline)||!!citation||!!license);
  useUnsavedDraft(dirty,busy);
  const change=(table:string,index:number,key:string,value:unknown)=>setBundle(b=>({...b,[table]:b[table].map((r,i)=>i===index?{...r,[key]:value}:r)}));
  const add=(table:string,values:Row)=>setBundle(b=>({...b,[table]:[...b[table],{id:crypto.randomUUID(),entry_id:detail.entry.id,source_id:detail.entry.source_id,...values}]}));
  const save=async()=>{
    setBusy(true);setMessage('');
    try{
      if(!citation.trim()||!license.trim())throw new Error('請填寫本次修訂的來源及授權說明');
      const sid=crypto.randomUUID();const next:Bundle={};
      for(const [t,rows]of Object.entries(bundle))next[t]=rows.map(r=>({...r,source_id:sid}));
      next.dictionary_sources=[{id:sid,citation,license,raw_text:JSON.stringify(bundle),verification:'unverified',verification_note:''}];
      await applyBundle(getSupabase()!,next,false,true);await onSaved(detail.entry.id);
    }catch(e){setMessage(e instanceof Error?e.message:String(e));}finally{setBusy(false);}
  };
  const publish=async()=>{setBusy(true);try{await publishDictionaryEntry(getSupabase()!,detail.entry.id);await onSaved(detail.entry.id);}catch(e){setMessage(String(e));}finally{setBusy(false);}};
  const removeSense=async(row:Row)=>{
    if(busy||locked)return;
    setMessage('');
    try{
      const next=withoutSense(bundle,String(row.id));
      const saved=baseline.dictionary_senses.find(s=>s.id===row.id);
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
    <a href="/dictionary/admin" className="underline">← 公共字典管理</a>
    <h2 className="font-semibold">{locked?'已發布 · 唯讀':'編輯草稿'} · {detail.entry.id}</h2>
    {locked&&<p>已發布內容改版及撤回等待 A3 決策。</p>}
    <fieldset disabled={busy||locked} className="space-y-4">
      <Field label="英文詞條" value={bundle.dictionary_entries[0].headword} onChange={v=>change('dictionary_entries',0,'headword',v)}/>
      <h3>繁體中文義項（每個義項可指定詞性）</h3>
      {bundle.dictionary_senses.map((row,i)=><div key={String(row.id)} className="space-y-2 border p-3">
        <p className="text-xs break-all">義項 ID：{String(row.id)}</p>
        <Field label="詞性（單字必填）" value={row.part_of_speech} onChange={v=>change('dictionary_senses',i,'part_of_speech',v||null)}/>
        <Field label="繁體中文意思" value={row.gloss_zh_tw} onChange={v=>change('dictionary_senses',i,'gloss_zh_tw',v)}/>
        <button type="button" className={`${button} text-red-600`} onClick={()=>void removeSense(row)}>刪除義項</button>
      </div>)}
      <button className={button} onClick={()=>add('dictionary_senses',{part_of_speech:detail.entry.kind==='word'?'noun':null,gloss_zh_tw:''})}>新增義項</button>
      {(['dictionary_etymologies','dictionary_learning_notes','dictionary_relations'] as const).map(table=><section key={table} className="space-y-3">
        <h3 className="font-semibold">{table==='dictionary_etymologies'?'歷史詞源':table==='dictionary_learning_notes'?'學習拆解與記憶情境（不是歷史事實）':'Sense 級構詞關聯'}</h3>
        {bundle[table].map((row,i)=><div key={String(row.id)} className="space-y-2 border p-3">
          <label className="block">所屬義項<select className={control} value={String(row.sense_id??'')} onChange={e=>change(table,i,'sense_id',e.target.value||null)}><option value="">{table==='dictionary_relations'?'請選擇義項':'整個詞條'}</option>{bundle.dictionary_senses.map(s=><option key={String(s.id)} value={String(s.id)}>{String(s.gloss_zh_tw)||String(s.id)}</option>)}</select></label>
          {table==='dictionary_relations'?<>
            <label>目標字首／字根義項<select className={control} value={String(row.target_sense_id??'')} onChange={e=>{const target=senses.find(s=>s.id===e.target.value);change(table,i,'target_entry_id',target?.entry_id??'');change(table,i,'target_sense_id',target?.id??'');}}><option value="">請選擇</option>{senses.filter(s=>entries.some(e=>e.id===s.entry_id&&e.kind!=='word')).map(s=><option key={s.id} value={s.id}>{entries.find(e=>e.id===s.entry_id)?.headword} · {s.gloss_zh_tw}</option>)}</select></label>
            <label>關聯種類<select className={control} value={String(row.relation_kind)} onChange={e=>change(table,i,'relation_kind',e.target.value)}><option value="learning_decomposition">學習用拆解</option><option value="historical_etymology">歷史詞源關聯</option></select></label>
          </>:<Field label="完整內容" multiline value={row.body} onChange={v=>change(table,i,'body',v)}/>}
          {table==='dictionary_learning_notes'?<label>種類<select className={control} value={String(row.kind)} onChange={e=>change(table,i,'kind',e.target.value)}><option value="mnemonic_scenario">記憶情境</option><option value="learning_decomposition">學習用拆解</option></select></label>:<>
            <label>查證狀態<select className={control} value={String(row.verification)} onChange={e=>change(table,i,'verification',e.target.value)}>{Object.entries({unverified:'未查證',pending:'待審核',verified:'已查證',disputed:'有爭議'}).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
            <Field label="查證說明（已查證必填）" value={row.verification_note} onChange={v=>change(table,i,'verification_note',v)}/>
          </>}
        </div>)}
        <button className={button} disabled={table==='dictionary_relations'&&detail.entry.kind!=='word'} onClick={()=>add(table,table==='dictionary_relations'?{sense_id:null,target_entry_id:'',target_sense_id:'',relation_kind:'learning_decomposition',verification:'unverified',verification_note:''}:table==='dictionary_etymologies'?{sense_id:null,body:'',verification:'unverified',verification_note:''}:{sense_id:null,body:'',kind:'mnemonic_scenario'})}>新增{table==='dictionary_relations'?'關聯':'內容'}</button>
      </section>)}
      <Field label="本次修訂來源／作者" value={citation} onChange={setCitation}/><Field label="本次修訂授權說明" value={license} onChange={setLicense}/>
      <button className={button} onClick={save}>儲存整份草稿</button>
    </fieldset>
    <button className={button} onClick={()=>setPreview(!preview)}>切換完整預覽</button>
    {preview&&<DictionaryPreview bundle={bundle}/>}
    {!locked&&detail.entry.revision>0&&<details><summary>首次發布</summary><p className="my-2 text-sm">只發布已儲存版本；尚未儲存的編輯不會發布。發布後暫不提供修改與撤回。</p><button className={button} disabled={busy||dirty} onClick={publish}>確認首次發布已儲存草稿</button></details>}
    {message&&<p role="alert">{message}</p>}
  </section>;
}

function Workspace({entryId,newKind}:{entryId?:string;newKind?:DictionaryEntry['kind']}){
  const [entries,setEntries]=useState<DictionaryEntry[]>([]),[senses,setSenses]=useState<DictionarySense[]>([]);
  const [detail,setDetail]=useState<DictionaryDetail|null>(()=>newKind?{entry:{id:crypto.randomUUID(),kind:newKind,headword:'',source_id:crypto.randomUUID(),status:'draft',published_at:null,revision:0,updated_at:''},senses:[],relations:[],etymologies:[],learning_notes:[]}:null),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
  const [kind,setKind]=useState('all'),[query,setQuery]=useState('');
  const [candidate,setCandidate]=useState<Bundle|null>(null),[result,setResult]=useState<BundleResult|null>(null),[format,setFormat]=useState<'csv'|'md'>('csv');
  const [fileText,setFileText]=useState('');
  useUnsavedDraft(!detail&&!!fileText,busy);
  async function refresh(id?:string){const client=getSupabase()!;const [e,s]=await Promise.all([client.from('dictionary_entries').select('*').order('headword'),client.from('dictionary_senses').select('*')]);if(e.error||s.error)throw new Error(e.error?.message||s.error?.message);setEntries(e.data);setSenses(s.data);if(id){setDetail(await getDictionaryEntry(client,id));window.history.replaceState(window.history.state,"",`/dictionary/admin?entry=${encodeURIComponent(id)}`);}}
  useEffect(()=>{let active=true;const client=getSupabase()!;Promise.all([client.from('dictionary_entries').select('*').order('headword'),client.from('dictionary_senses').select('*')]).then(([e,s])=>{if(!active)return;if(e.error||s.error)setMessage(e.error?.message||s.error?.message||'讀取失敗');else{setEntries(e.data);setSenses(s.data);}});return()=>{active=false;};},[]);
  async function action(work:()=>Promise<void>){setBusy(true);setMessage('');try{await work();}catch(e){setMessage(e instanceof Error?e.message:String(e));}finally{setBusy(false);}}
  useEffect(()=>{if(!entryId)return;let active=true;void getDictionaryEntry(getSupabase()!,entryId).then(d=>{if(active){setDetail(d);if(!d)setMessage('找不到此詞條。');}}).catch(e=>{if(active)setMessage(String(e));});return()=>{active=false;};},[entryId]);
  if(detail)return <DictionaryEditor key={`${detail.entry.id}:${detail.entry.revision}`} detail={detail} entries={entries} senses={senses} onSaved={refresh}/>;
  if(entryId)return <div><a href="/dictionary/admin" className="underline">← 公共字典管理</a><p role="status">{message||'正在讀取詞條…'}</p></div>;
  return <div className="space-y-5">
    <div className="flex flex-wrap gap-2">{Object.entries(labels).map(([k,l])=><a className={button} key={k} href={`/dictionary/admin?new=${k}`}>新增{l}</a>)}</div>
    <div className="flex gap-2"><input aria-label="搜尋管理詞條" placeholder="搜尋詞條" className={control} value={query} onChange={e=>setQuery(e.target.value)}/><select aria-label="詞條分類" className={control} value={kind} onChange={e=>setKind(e.target.value)}><option value="all">全部類別</option>{Object.entries(labels).map(([k,l])=><option key={k} value={k}>{l}</option>)}</select></div>
    <ul className="max-h-64 overflow-auto rounded border">{entries.filter(e=>(kind==='all'||e.kind===kind)&&e.headword.toLowerCase().includes(query.toLowerCase())).map(e=><li key={e.id}><a className="block w-full p-2 text-left hover:bg-blue-500/10" href={`/dictionary/admin?entry=${encodeURIComponent(e.id)}`}>{e.headword} · {labels[e.kind]} · {e.status==='draft'?'草稿':'已發布'}</a></li>)}</ul>
    <section className="space-y-3 rounded-xl border p-4"><h2 className="font-semibold">匯入預覽（只建立草稿，不覆寫衝突內容）</h2>
      <details><summary>檔案格式</summary><p className="my-2 break-words text-sm">CSV 欄名：entry_id,sense_id,headword,part_of_speech,gloss_zh_tw,citation,license。ID 使用固定 UUID；一列一義項，相同單字可共用 entry_id。</p><pre className="whitespace-pre-wrap text-xs">{'Markdown：\n---\nid: 內容 UUID\nentry_id: 既有詞條 UUID\nsense_id: 可省略的義項 UUID\nkind: historical_etymology / learning_decomposition / mnemonic_scenario\ncitation: 來源\nlicense: 授權說明\nverification: unverified（僅歷史詞源）\nverification_note: 查證說明\n---\n完整正文（原文保存）'}</pre><p className="text-xs">Frontmatter 使用單行 key: value，含特殊字元可用 JSON 雙引號字串。不接受未知欄位，不自動轉換舊百科筆記。</p></details>
      <fieldset disabled={busy} className="space-y-3">
      <select aria-label="匯入格式" className={control} value={format} onChange={e=>{setFormat(e.target.value as 'csv'|'md');setCandidate(null);setResult(null);}}><option value="csv">CSV 單字／義項</option><option value="md">Markdown 詞源／記憶內容</option></select>
      <input aria-label="匯入檔案" type="file" accept=".csv,.md" disabled={busy} onChange={e=>{const file=e.target.files?.[0];setCandidate(null);setResult(null);if(file)void action(async()=>{setFileText(await file.text());});}}/>
      <Field label="檔案內容（可貼上）" multiline value={fileText} onChange={v=>{setFileText(v);setCandidate(null);setResult(null);}}/>
      </fieldset>
      <button className={button} disabled={busy||!fileText} onClick={()=>action(async()=>{setCandidate(null);setResult(null);const parsed=await parseDictionaryImport(fileText,format);setCandidate(parsed);setResult(await applyBundle(getSupabase()!,parsed,true));})}>驗證並預覽，不寫入</button>
      {candidate&&<DictionaryPreview bundle={candidate}/>}
      {!!result?.warnings?.length&&<aside role="status" className="rounded border border-amber-500 p-3 text-sm"><h3 className="font-semibold">疑似重複內容，請人工確認</h3><p>同類同拼寫詞條可能是同形異源，義項或正文相同也不一定是重複。本次不會自動合併或改寫不同 ID。每筆最多列出 5 個相似 ID。</p><ul className="mt-2 space-y-2">{result.warnings.map(w=><li key={`${w.table}:${w.id}`} className="break-all">{w.table==='dictionary_entries'?'同類同拼寫詞條':w.table==='dictionary_senses'?'同詞條、詞性與釋義':'同詞條義項的相同內容'}：{w.id}<br/>相似 ID：{w.similar_ids.join('、')}</li>)}</ul></aside>}
      {result&&<><p>預計新增 {result.inserted} 筆；跳過 {result.skipped} 筆。包含來源及關聯資料列。</p><button className={button} disabled={busy||!candidate} onClick={()=>action(async()=>{const saved=await applyBundle(getSupabase()!,candidate!,false);setMessage(`匯入完成：新增 ${saved.inserted}，跳過 ${saved.skipped}`);setCandidate(null);setResult(null);await refresh();})}>確認匯入草稿</button></>}
    </section>
    {message&&<p role="alert" className="whitespace-pre-wrap">{message}</p>}
  </div>;
}
export default function DictionaryAdmin({entryId,newKind}:{entryId?:string;newKind?:DictionaryEntry['kind']}={}){
  const [access,setAccess]=useState<{owner:string;allowed:boolean}|null>(null),[error,setError]=useState('');
  useEffect(()=>{const client=getSupabase();if(!client)return;let generation=0;let mounted=true;
    const check=async()=>{const run=++generation;setAccess(null);const {data:{user},error:authError}=await client.auth.getUser();if(!mounted||run!==generation)return;if(authError||!user){setError('請先從 Nexus 登入。');return;}const {data,error}=await client.rpc('is_dictionary_admin');if(!mounted||run!==generation)return;if(error){setError('無法確認管理權限，請確認 M7-9／M7-10 migration 已套用。');return;}setError('');setAccess({owner:user.id,allowed:data===true});};
    void check();const {data:{subscription}}=client.auth.onAuthStateChange(()=>{generation++;setAccess(null);setTimeout(()=>{if(mounted)void check();},0);});return()=>{mounted=false;generation++;subscription.unsubscribe();};},[]);
  return <main className="h-dvh overflow-y-auto" style={{color:'var(--color-text)',background:'var(--color-bg)'}}><div className="mx-auto max-w-5xl space-y-5 p-4"><a href="/dictionary" className="underline">← 公共字典總覽</a><h1 className="text-2xl font-semibold">公共字典管理</h1><p className="text-sm">僅管理員可編輯。公共字典不會覆寫任何人的字卡或學習紀錄。</p>{!getSupabase()?<p>尚未設定 Supabase。</p>:error?<p role="alert">{error}</p>:access?.allowed?<Workspace key={`${access.owner}:${entryId??newKind??"list"}`} entryId={entryId} newKind={newKind}/>:access?<p>此帳號沒有公共字典管理權限。</p>:<p>確認管理權限中…</p>}</div></main>;
}
