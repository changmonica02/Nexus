"use client";
import {useState} from 'react';
import {getSupabase} from '../../infrastructure/supabase/client';
import {confirmDialog} from '../../lib/confirmDialog';
import {DictionaryModal} from './DictionaryModal';
interface Result {total:number;ready:number;blocked:number;invalid:number;published:number;published_total:number;remaining:number;continuation:boolean;no_progress:boolean;attempted:number;batch_size:number;signature:string;issues:{id:string;headword:string;status:string;reason:string}[]}
/** One confirmation authorizes the frozen preview, not one RPC per Entry. Each request commits one server batch. */
export async function continueDictionaryBulk(next:()=>Promise<Result>,onProgress:(result:Result)=>void){
 for(;;){const result=await next();onProgress(result);
  if(!result.continuation||result.remaining===0||result.no_progress)return result;
  if(result.attempted===0)throw Error('批次沒有進展，已停止；請重新預覽。');
 }
}
export function DictionaryBulkPublish({kinds,query,disabled,onPublished}:{kinds:string[];query:string;disabled:boolean;onPublished:()=>Promise<void>}){
 const [preview,setPreview]=useState<{result:Result;kinds:string[];query:string}|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const run=async(work:()=>Promise<void>)=>{setBusy(true);setError('');try{await work();}catch(e){setError(e instanceof Error?e.message:String(e));}finally{setBusy(false);}};
 return <><button className="rounded border px-3 py-2 text-sm disabled:opacity-40" disabled={disabled||busy} onClick={()=>void run(async()=>{const {data,error}=await getSupabase()!.rpc('preview_dictionary_bulk_publish',{kind_filters:kinds,query_text:query});if(error)throw Error(error.message);setPreview({result:data,kinds:[...kinds],query});})}>發布符合目前條件的全部草稿</button>{!preview&&error&&<p role="alert">{error}</p>}{preview&&<DictionaryModal title="批次發布預覽" busy={busy} onClose={()=>{if(!busy){setPreview(null);setError('');}}}><p>只處理草稿 · 類型：{preview.kinds.join(' / ')||'全部'} · 搜尋：{preview.query||'全部'}</p><p>共 {preview.result.total} 筆 · 可發布 {preview.result.ready} · 阻擋 {preview.result.blocked} · 無效 {preview.result.invalid}</p><p>每批最多 {preview.result.batch_size} 筆，依構詞依賴順序繼續；未通過者保留草稿。以下最多顯示 100 筆原因。</p>{preview.result.issues.map(i=><p key={i.id}>{i.headword}：{i.status} · {i.reason}</p>)}{error&&<p role="alert">{error}</p>}<button disabled={busy||!preview.result.ready} className="rounded border p-2 disabled:opacity-40" onClick={()=>void run(async()=>{if(!await confirmDialog({title:'確認批次發布',message:`發布 ${preview.result.ready} 筆草稿？請確認所有內容及構詞依據已完成查證。阻擋或無效項目不會發布。`,confirmLabel:'發布'}))return;try{await continueDictionaryBulk(async()=>{const {data,error}=await getSupabase()!.rpc('publish_dictionary_bulk',{kind_filters:preview.kinds,query_text:preview.query,expected_signature:preview.result.signature,content_verified:true});if(error)throw Error(error.message);return data;},result=>setPreview({...preview,result}));}finally{await onPublished();}})}>{busy?'批次發布中…':preview.result.published_total>0?'繼續發布':'確認發布'}</button>{preview.result.published_total>0&&<p>已發布 {preview.result.published_total} 筆 · 尚待處理 {preview.result.remaining} 筆。</p>}</DictionaryModal>}</>;
}
