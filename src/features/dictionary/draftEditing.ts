import type {SupabaseClient} from '@supabase/supabase-js';
import type {Bundle} from './adminImport';
export function withoutSense(bundle:Bundle,id:string):Bundle {
  if(['dictionary_inflections','dictionary_pronunciations','dictionary_relations','dictionary_etymologies','dictionary_learning_notes','dictionary_examples','dictionary_lexical_annotations'].some(table=>bundle[table]?.some(row=>row.sense_id===id||row.target_sense_id===id)))throw new Error('此義項已被目前表單的構詞關聯、詞源或記憶內容引用，不能直接刪除。');
  return {...bundle,dictionary_senses:bundle.dictionary_senses.filter(row=>row.id!==id)};
}
export async function deleteDraftSense(client:Pick<SupabaseClient,'rpc'>,entryId:string,senseId:string,entryRevision:number,senseRevision:number):Promise<number>{
  const {data,error}=await client.rpc('delete_dictionary_draft_sense',{entry_uuid:entryId,sense_uuid:senseId,expected_entry_revision:entryRevision,expected_sense_revision:senseRevision});
  if(error){
    if(/pronunciations/i.test(error.message))throw new Error('此義項仍有讀音，請先刪除讀音或調整適用義項。');
    if(/examples|lexical annotations/i.test(error.message))throw new Error('此義項仍有例詞或字形／構詞提示，請先刪除這些內容。');
    if(/referenced/i.test(error.message))throw new Error('此義項已被構詞關聯、詞源或記憶內容引用，不能直接刪除；其他資料未改動。');
    if(/Revision conflict/i.test(error.message))throw new Error('資料已有其他修改，請重新載入確認後再刪除。');
    if(/await A3/i.test(error.message))throw new Error('已發布內容目前不能刪除義項。');
    throw new Error('未能確認刪除結果，請檢查連線與刪除功能 migration，再重新載入確認。');
  }
  return data as number;
}

export async function deleteDraftContent(client:Pick<SupabaseClient,'rpc'>,entryId:string,table:'dictionary_etymologies'|'dictionary_learning_notes'|'dictionary_examples'|'dictionary_lexical_annotations'|'dictionary_pronunciations',id:string,entryRevision:number,contentRevision:number):Promise<number>{
  const {data,error}=await client.rpc('delete_dictionary_draft_content',{entry_uuid:entryId,content_table:table,content_uuid:id,expected_entry_revision:entryRevision,expected_content_revision:contentRevision});
  if(error)throw new Error(`內容刪除失敗：${error.message}`);
  return data as number;
}
