import type {SupabaseClient} from '@supabase/supabase-js';
export async function readCardDictionaryLink(client:Pick<SupabaseClient,'from'>,cardId:string):Promise<string|null>{
  const {data,error}=await client.from('study_card_dictionary_links').select('dictionary_entry_id').eq('card_id',cardId).maybeSingle();
  if(error)throw new Error('無法讀取百科連結。請確認網路及公共百科已啟用；仍可正常評分。');
  return data?.dictionary_entry_id??null;
}
export async function setCardDictionaryLink(client:Pick<SupabaseClient,'rpc'>,cardId:string,entryId:string|null):Promise<void>{
  const {error}=await client.rpc('set_study_dictionary_link',{card_uuid:cardId,word_uuid:entryId});
  if(error)throw new Error('連結未儲存。請確認網路、字卡已同步及百科功能已啟用，再重試。');
}
