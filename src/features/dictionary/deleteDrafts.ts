import type {SupabaseClient} from '@supabase/supabase-js';
import type {DictionaryEntry} from './dictionary';
export async function deleteDictionaryDrafts(client:Pick<SupabaseClient,'rpc'>,entries:DictionaryEntry[],requestConfirmation:(message:string)=>boolean|Promise<boolean>):Promise<number|null>{
  if(!entries.length)return null;
  const published=entries.filter(e=>e.status!=='draft');
  if(published.length)throw new Error(`整批未刪除。以下詞條已發布，不能刪除：${published.map(e=>e.headword).join('、')}`);
  if(!await requestConfirmation(`永久刪除以下 ${entries.length} 筆草稿及其義項、構詞與內容？此操作無法復原。\n${entries.map(e=>e.headword).join('、')}`))return null;
  const {data,error}=await client.rpc('delete_dictionary_drafts',{targets:entries.map(e=>({id:e.id,revision:e.revision}))});
  if(error)throw new Error(`刪除失敗，整批未刪除：${error.message}`);
  return data as number;
}
