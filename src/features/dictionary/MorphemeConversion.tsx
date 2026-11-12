"use client";
import {useEffect,useRef,useState} from 'react';
import {getSupabase} from '../../infrastructure/supabase/client';
import {usePaginationLanguage} from '../../lib/LanguageContext';
import {confirmDialog} from '../../lib/confirmDialog';
import type {AISnapshot} from './aiDictionary';
interface Row {id:string;headword:string;kind:string;status:string;sense_count:number;has_review:boolean;already_prepared?:boolean;legacy_variants:string|null;legacy_category:string|null;snapshot:AISnapshot}
export default function MorphemeConversion({onBusy}:{onBusy:(busy:boolean)=>void}){
 const {language}=usePaginationLanguage(),en=language==='en',text=(zh:string,english:string)=>en?english:zh;
 const [page,setPage]=useState(0),[rows,setRows]=useState<Row[]>([]),[total,setTotal]=useState(0),[busy,setBusy]=useState(false),[error,setError]=useState(''),[loading,setLoading]=useState(true),[reload,setReload]=useState(0),[results,setResults]=useState<Record<string,string>>({});
 const active=useRef(false),operations=useRef(new Map<string,{id:string;snapshot:AISnapshot}>());
 useEffect(()=>{let live=true;setLoading(true);setRows([]);setError('');void Promise.resolve(getSupabase()!.rpc('preview_dictionary_morpheme_conversion',{page_number:page})).then(({data,error})=>{if(!live)return;if(error){setError(en?'Cannot read the conversion preview. Confirm the database update, then retry.':'無法讀取轉換預覽，請確認資料庫更新後重試。');return;}setRows(data.items);setTotal(data.total);}).catch(()=>{if(live)setError(en?'Preview unavailable. Retry when connected.':'預覽暫時無法讀取，請連線後重試。');}).finally(()=>{if(live)setLoading(false);});return()=>{live=false;};},[page,reload,en]);
 const prepare=async(selected:Row[])=>{
  if(active.current||loading||!selected.length)return;
  if(!await confirmDialog(text(`為 ${selected.length} 個詞條建立待整理草稿？不會更改已發布內容或覆蓋既有 Review。`,`Prepare drafts for ${selected.length} entries? Published content and existing Reviews remain unchanged.`)))return;
  active.current=true;setBusy(true);onBusy(true);setError('');
  try{for(const row of selected){let request=operations.current.get(row.id);if(!request){request={id:crypto.randomUUID(),snapshot:structuredClone(row.snapshot)};operations.current.set(row.id,request);}const {data,error}=await getSupabase()!.rpc('prepare_dictionary_morpheme_draft',{entry_uuid:row.id,expected_snapshot:request.snapshot,operation_uuid:request.id});if(error){if(error.message==='Conversion source changed; preview again')operations.current.delete(row.id);throw Error(error.message);}setResults(r=>({...r,[row.id]:({created:text('已建立待整理草稿','Draft prepared'),existing_review:text('既有 Review 保留','Existing Review retained'),existing_draft:text('既有草稿保留','Existing draft retained'),already_prepared:text('已整理，不重複建立','Already prepared')} as Record<string,string>)[data.status]+(data.manual_reason?' · '+text('保留原文，待人工歸屬','Original preserved; assign manually'):'')}));}}catch(e){setError(e instanceof Error&&/source changed|Stale|revision/i.test(e.message)?text('來源版本已變更，請重新預覽；不會覆蓋新內容。','The source changed. Preview again; newer content is protected.'):text('操作結果尚未確認，請保留此視窗並重試核對同一操作。','The operation result is unconfirmed. Keep this dialog and retry the same operation.'));}finally{active.current=false;setBusy(false);onBusy(false);}
 };
 const eligible=rows.filter(r=>r.status==='published'&&!r.has_review&&!r.already_prepared&&!results[r.id]);
 return <section className="min-w-0 space-y-3"><p>{text('無損草稿整理','Lossless draft preparation')} · {total} {text('個構詞','morphemes')}</p>
 <p className="text-sm opacity-70">{text('保留所有詞條、義項與關聯 ID。只將可唯一歸屬的變體放入義項草稿；舊分類與不明歸屬原文保留，不推測、不自動發布。','All entry, sense and relation IDs are retained. Only unambiguous variants are assigned to draft senses; legacy categories and ambiguous source text are retained without guessing or publication.')}</p>
 {rows.map(row=><div key={row.id} className="min-w-0 rounded border border-[var(--color-border)] p-2"><div className="flex min-w-0 flex-wrap items-center justify-between gap-2"><span className="break-words font-medium">{row.headword} · {row.sense_count} {text('義項','senses')}</span><button type="button" className="min-h-11 rounded border px-3" disabled={busy||loading||row.has_review||row.already_prepared||row.status!=='published'||!!results[row.id]} onClick={()=>void prepare([row])}>{text('建立待整理草稿','Prepare draft')}</button></div>
  <p className="text-sm">{results[row.id]??(row.already_prepared?text('已建立過待整理草稿，不重複建立','Already prepared; no duplicate draft'):row.has_review?text('已有 Review，完整保留','Existing Review retained'):row.status==='draft'?text('已有草稿，完整保留','Existing draft retained'):row.legacy_variants&&row.sense_count!==1?text('變體義項歸屬不明：保留原文','Variant sense assignment ambiguous: source retained'):text('可建立待整理草稿','Ready for draft preparation'))}</p>
  {row.legacy_category&&<p className="break-words text-sm opacity-70">{text('舊分類（待整理）','Legacy category (unassigned)')}：{row.legacy_category}</p>}
  {row.legacy_variants&&<details><summary className="min-h-11 cursor-pointer py-2">{text('原始變體資料','Original variants')}</summary><pre className="whitespace-pre-wrap break-all text-xs">{row.legacy_variants}</pre></details>}
 </div>)}
 {loading&&<p role="status">{text('正在讀取預覽…','Loading preview…')}</p>}
 {error&&<div role="alert" className="whitespace-pre-wrap">{error}<button type="button" className="ml-2 min-h-11 underline" disabled={busy||loading} onClick={()=>setReload(n=>n+1)}>{text('重新預覽','Preview again')}</button></div>}
 <div className="flex flex-wrap justify-between gap-2"><button type="button" className="min-h-11 rounded border px-3" disabled={busy||loading||!page} onClick={()=>setPage(n=>n-1)}>{text('上一頁','Previous')}</button><button type="button" className="min-h-11 rounded border px-3" disabled={busy||loading||(page+1)*100>=total} onClick={()=>setPage(n=>n+1)}>{text('下一頁','Next')}</button><button type="button" className="min-h-11 rounded border px-3" disabled={busy||loading||!eligible.length} onClick={()=>void prepare(eligible)}>{text('建立本頁待整理草稿','Prepare this page')} ({eligible.length})</button></div>
 </section>;
}
