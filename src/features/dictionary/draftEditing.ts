import type {SupabaseClient} from '@supabase/supabase-js';
import type {Bundle} from './adminImport';
export function withoutSense(bundle:Bundle,id:string):Bundle {
  if(['dictionary_relations','dictionary_etymologies','dictionary_learning_notes'].some(table=>bundle[table]?.some(row=>row.sense_id===id||row.target_sense_id===id)))throw new Error('此義項已被目前表單的構詞關聯、詞源或記憶內容引用，不能直接刪除。');
  return {...bundle,dictionary_senses:bundle.dictionary_senses.filter(row=>row.id!==id)};
}
export async function deleteDraftSense(client:Pick<SupabaseClient,'rpc'>,entryId:string,senseId:string,entryRevision:number,senseRevision:number):Promise<number>{
  const {data,error}=await client.rpc('delete_dictionary_draft_sense',{entry_uuid:entryId,sense_uuid:senseId,expected_entry_revision:entryRevision,expected_sense_revision:senseRevision});
  if(error){
    if(/referenced/i.test(error.message))throw new Error('此義項已被構詞關聯、詞源或記憶內容引用，不能直接刪除；其他資料未改動。');
    if(/Revision conflict/i.test(error.message))throw new Error('資料已有其他修改，請重新載入確認後再刪除。');
    if(/await A3/i.test(error.message))throw new Error('已發布內容目前不能刪除義項。');
    throw new Error('未能確認刪除結果，請檢查連線與刪除功能 migration，再重新載入確認。');
  }
  return data as number;
}
