import type {SupabaseClient} from '@supabase/supabase-js';
import type {DictionaryEntry} from './dictionary';
/** Read before confirmation, then atomically compare the exact server snapshot. */
export async function deleteDictionaryEntry(client:Pick<SupabaseClient,'rpc'>,entry:DictionaryEntry,confirm:()=>Promise<boolean>,operation:{id:string;snapshot?:{detail:{entry:{revision:number}}}}){
 const {data:snapshot,error:readError}=operation.snapshot?{data:operation.snapshot as {detail:{entry:{revision:number}}},error:null}:await client.rpc('get_dictionary_ai_snapshot',{entry_uuid:entry.id});
 if(readError)throw Error(`無法確認詞條：${readError.message}`);
 if(!snapshot||snapshot.detail.entry.revision!==entry.revision)throw Error('詞條版本已變更，請重新開啟詞條後再刪除；本次沒有刪除。');
 if(!await confirm())return false;
 operation.snapshot=snapshot;
 const {data,error}=await client.rpc('delete_dictionary_entry',{entry_uuid:entry.id,expected_revision:entry.revision,expected_snapshot:snapshot,operation_uuid:operation.id});
 if(error)throw Error(`刪除失敗，請保留目前內容：${error.message}`);
 if(data?.deleted!==true||data.entry_id!==entry.id)throw Error('刪除結果未確認，請重新整理管理清單確認後再操作。');
 return true;
}
