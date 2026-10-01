import type {SupabaseClient} from '@supabase/supabase-js';
import type {Bundle} from './adminImport';
export const primaryCategories=['空間、位置與環境','動作、接觸與物理作用','移動、轉變與方向','物質、自然與元素','生命、身體與感官','情感、心理與意志','心智、溝通與學習','社會、法律與制度','時間、狀態、數量與邏輯'] as const;
export interface DictionaryGrouping {primary_category:string|null;tags:string[];variant_group:string|null}
export const emptyGrouping=():DictionaryGrouping=>({primary_category:null,tags:[],variant_group:null});
export async function readGrouping(client:Pick<SupabaseClient,'from'>,id:string):Promise<DictionaryGrouping>{
  const {data,error}=await client.from('dictionary_entry_groups').select('primary_category,tags,variant_group').eq('id',id).maybeSingle();
  if(error)throw new Error('無法讀取分類，請確認字典分類 migration 已套用。');
  return data??emptyGrouping();
}
export async function saveGroupedDraft(client:Pick<SupabaseClient,'rpc'>,bundle:Bundle,grouping:DictionaryGrouping){
  const {error}=await client.rpc('save_dictionary_grouped_draft',{bundle,group_data:grouping});
  if(error)throw new Error(error.message);
}
