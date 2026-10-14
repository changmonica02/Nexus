"use client";
import {useEffect,useRef,useState} from 'react';
import {getSupabase} from '../../infrastructure/supabase/client';
import {confirmDialog} from '../../lib/confirmDialog';
import {usePaginationLanguage} from '../../lib/LanguageContext';
import {DictionaryModal} from './DictionaryModal';
import {loadDictionaryJob,saveDictionaryJob} from './importSessionStore';
import {downloadDictionaryJSON} from './exchangeExport';
export interface BulkResult {total:number;ready:number;blocked:number;invalid:number;published:number;published_total:number;remaining:number;continuation:boolean;no_progress:boolean;attempted:number;batch_size:number;signature:string;issues:{id:string;headword:string;status:string;reason:string}[]}
interface PublicationJob {owner_id:string;result:BulkResult;kinds:string[];query:string;confirmed:boolean}
/** Existing token and authority remain the only publication pipeline. */
export async function continueDictionaryBulk(next:()=>Promise<BulkResult>,onProgress:(result:BulkResult)=>void|Promise<void>,signal?:AbortSignal){
 let latest:BulkResult|undefined;
 for(;;){if(signal?.aborted)return latest;const result=await next();latest=result;await onProgress(result);
  if(!result.continuation||result.remaining===0||result.no_progress)return result;
  if(result.attempted===0)throw Error('批次沒有進展，已停止；請重新預覽。');
 }
}
export function DictionaryBulkPublish({disabled,onPublished}:{disabled:boolean;onPublished:()=>Promise<void>}){
 const {t}=usePaginationLanguage();const [preview,setPreview]=useState<PublicationJob|null>(null),[saved,setSaved]=useState<PublicationJob|null>(null),[owner,setOwner]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');const controller=useRef<AbortController|null>(null);
 useEffect(()=>{let active=true;void getSupabase()!.auth.getUser().then(async({data,error})=>{if(error||!data.user)throw Error('Sign in again');const job=await loadDictionaryJob<PublicationJob>(data.user.id,'publish');if(active){setOwner(data.user.id);setSaved(job&&job.kinds.length===0&&!job.query?job:null);}}).catch(e=>{if(active)setError(String(e));});return()=>{active=false;controller.current?.abort();};},[]);
 const run=async(work:()=>Promise<void>)=>{setBusy(true);setError('');try{await work();}catch(e){setError(e instanceof Error?e.message:String(e));}finally{setBusy(false);}};
 async function inspect(){const {data,error}=await getSupabase()!.rpc('preview_dictionary_bulk_publish',{kind_filters:[],query_text:''});if(error)throw Error(error.message);const job={owner_id:owner,result:data,kinds:[],query:'',confirmed:false};await saveDictionaryJob(owner,'publish',job);setSaved(job);setPreview(job);}
 async function publish(){if(!preview)return;let job={...preview};
 if(!job.confirmed){if(!await confirmDialog({title:t('exchange.confirmPublish'),message:t('exchange.verifyPublish',{n:job.result.ready}),confirmLabel:t('exchange.confirmPublish')}))return;job.confirmed=true;await saveDictionaryJob(owner,'publish',job);setPreview(job);setSaved(job);}
 controller.current=new AbortController();try{await continueDictionaryBulk(async()=>{const {data,error}=await getSupabase()!.rpc('publish_dictionary_bulk',{kind_filters:[],query_text:'',expected_signature:job.result.signature,content_verified:true});if(error)throw Error(error.message);return data;},async result=>{job={...job,result};await saveDictionaryJob(owner,'publish',job);setSaved(job);setPreview(job);},controller.current.signal);}finally{await onPublished();}}
 async function report(){if(!preview)return;const rows:unknown[]=[];for(let page=0;;page++){const {data,error}=await getSupabase()!.rpc('dictionary_bulk_publish_report',{preview_id:preview.result.signature,page_number:page});if(error)throw Error(error.message);rows.push(...data.items);if(rows.length>=data.total)break;if(!data.items.length)throw Error('Invalid publication report page');}downloadDictionaryJSON({preview_id:preview.result.signature,scope:{kinds:preview.kinds,query:preview.query},items:rows},'dictionary-publish-results.json');}
 const button='rounded border px-3 py-2 text-sm disabled:opacity-40';
 return <><div className="flex flex-wrap gap-2"><button className={button} disabled={disabled||busy||!owner} onClick={()=>void run(inspect)}>{t('exchange.publishAll')}</button>{saved&&<button className={button} disabled={busy||!owner} onClick={()=>{setPreview(saved);setError('');}}>{t('exchange.resumePublish')}</button>}</div>{!preview&&error&&<p role="alert">{error}</p>}{preview&&<DictionaryModal title={t('exchange.publishPreview')} busy={busy} onClose={()=>{if(!busy){setPreview(null);setError('');}}}>
 <p>{t('exchange.draftScope')} · {preview.kinds.join(' / ')||t('exchange.all')} · {preview.query||t('exchange.all')}</p><p>{t('exchange.publishProgress',{total:preview.result.total,done:preview.result.published_total,remaining:preview.result.remaining,blocked:preview.result.blocked,invalid:preview.result.invalid})}</p><p className="text-sm">{t('exchange.publishHint',{n:preview.result.batch_size})}</p>
 {preview.result.issues.map(i=><p key={i.id}>{i.headword}: {i.status} · {i.reason}</p>)}{error&&<p role="alert">{error}</p>}
 <div className="flex flex-wrap gap-2"><button disabled={busy||!preview.result.ready} className={button} onClick={()=>void run(publish)}>{t(preview.confirmed?'exchange.resumePublish':'exchange.confirmPublish')}</button>{busy&&<button type="button" className={button} onClick={()=>controller.current?.abort()}>{t('exchange.pause')}</button>}<button disabled={busy} className={button} onClick={()=>void run(inspect)}>{t('exchange.repreview')}</button><button disabled={busy} className={button} onClick={()=>void run(report)}>{t('exchange.report')}</button></div>
 </DictionaryModal>}</>;
}
