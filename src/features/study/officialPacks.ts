import type { SupabaseClient } from '@supabase/supabase-js';
export const OFFICIAL_PACKS = [
  {id:'gsat-1-2',name:'學測單字 1–2 級',description:'基礎',levels:'1–2'},
  {id:'gsat-3-4',name:'學測單字 3–4 級',description:'中階',levels:'3–4'},
  {id:'gsat-5-6',name:'學測單字 5–6 級',description:'進階',levels:'5–6'},
  {id:'gsat-all',name:'學測單字全',description:'完整詞表（去重）',levels:'1–6'},
] as const;
export const OFFICIAL_SOURCE = '依據大學入學考試中心《高中英文參考詞彙表》（111 學年度起適用）分級；來源著作權屬財團法人大學入學考試中心基金會。僅供個人、非營利學習使用；若需營利使用或轉載，請先依來源規定取得授權。學習集詞條引用 Nexus 字典，後續詞義更新以字典內容為準。';
export interface OfficialPack { id:string; name:string; version:number; word_count:number; deck_id:string|null; installed_version:number|null }
export function packAction(pack:OfficialPack,busy=false,error=false) {
  return busy?'下載中…':error?'重試':!pack.deck_id?'下載':pack.installed_version!==pack.version?'更新':'開啟';
}
export const packDeleteMessage=(name:string)=>`刪除「${name}」？\n\n這會移除此單字集與此單字集的學習進度。\n字典內容不會被刪除，你之後可以再次下載。`;
export async function listOfficialPacks(client:Pick<SupabaseClient,'rpc'>):Promise<OfficialPack[]> {
  const {data,error}=await client.rpc('list_official_study_packs');
  if(error)throw new Error('無法讀取官方單字集，請確認已登入、網路及官方包 migration 已啟用。');
  return data as OfficialPack[];
}
export async function downloadOfficialPack(client:Pick<SupabaseClient,'rpc'>,id:string):Promise<string> {
  const {data,error}=await client.rpc('download_official_study_pack',{pack_id:id});
  if(error)throw new Error(`下載未完成，請重試：${error.message}`);
  return data as string;
}
export async function deleteOfficialPack(client:Pick<SupabaseClient,'rpc'>,deckId:string):Promise<void> {
  const {error}=await client.rpc('delete_official_study_pack',{deck_id:deckId});
  if(error)throw new Error(`刪除未完成，請連線後重試：${error.message}`);
}

/** Missing migration or offline: retain existing text editing, disable new source-dependent operations. */
export async function officialPrivateCardsAvailable(client:Pick<SupabaseClient,'rpc'>):Promise<boolean>{
 try{const {data,error}=await client.rpc('official_private_card_capabilities');return !error&&data?.version===1;}catch{return false;}
}
