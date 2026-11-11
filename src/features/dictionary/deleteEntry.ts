import type {SupabaseClient} from '@supabase/supabase-js';
import type {DictionaryEntry} from './dictionary';
export class DictionaryDeletionFailure extends Error {
 readonly diagnostic:{rpc:string;message:string;code:string;details:string;hint:string};
 readonly reason:string;
 constructor(rpc:string,error:{message?:string;code?:string;details?:string;hint?:string}){
  super(error.message??'Dictionary deletion failed');this.name='DictionaryDeletionFailure';
  this.diagnostic={rpc,message:this.message,code:error.code??'',details:error.details??'',hint:error.hint??''};
  this.reason=/Official study packs reference/.test(this.message)?'official':/Other entries reference/.test(this.message)?'relation':/active Review references|legacy Review references/.test(this.message)?'review':/still referenced/.test(this.message)||error.code==='23503'?'reference':/Entry changed|版本已變更/.test(this.message)?'stale':/admin required|permission denied/i.test(this.message)||error.code==='42501'?'permission':/no longer exists/.test(this.message)?'missing':/fetch|network|lost response|timeout/i.test(this.message)?'network':'unknown';
 }
}
export const deletionFailureText=(error:unknown,t:(key:string)=>string)=>error instanceof DictionaryDeletionFailure?t('deletion.'+error.reason):error instanceof Error?error.message:String(error);
/** Read before confirmation, then atomically compare the exact server snapshot. */
export async function deleteDictionaryEntry(client:Pick<SupabaseClient,'rpc'>,entry:DictionaryEntry,requestConfirmation:()=>Promise<boolean>,operation:{id:string;snapshot?:{detail:{entry:{revision:number}}}}){
 const {data:snapshot,error:readError}=operation.snapshot?{data:operation.snapshot as {detail:{entry:{revision:number}}},error:null}:await client.rpc('get_dictionary_ai_snapshot',{entry_uuid:entry.id});
 if(readError)throw new DictionaryDeletionFailure('get_dictionary_ai_snapshot',readError);
 if(!snapshot||snapshot.detail.entry.revision!==entry.revision)throw new DictionaryDeletionFailure('get_dictionary_ai_snapshot',{message:'詞條版本已變更，請重新開啟詞條後再刪除；本次沒有刪除。'});
 if(!await requestConfirmation())return false;
 operation.snapshot=snapshot;
 const {data,error}=await client.rpc('delete_dictionary_entry',{entry_uuid:entry.id,expected_revision:entry.revision,expected_snapshot:snapshot,operation_uuid:operation.id});
 if(error)throw new DictionaryDeletionFailure('delete_dictionary_entry',error);
 if(data?.deleted!==true||data.entry_id!==entry.id)throw Error('刪除結果未確認，請重新整理管理清單確認後再操作。');
 return true;
}
