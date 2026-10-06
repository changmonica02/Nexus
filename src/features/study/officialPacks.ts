import type { SupabaseClient } from '@supabase/supabase-js';
export const OFFICIAL_PACKS = [
  {id:'gsat-1-2',name:'學測單字 1–2 級',description:'基礎',levels:'1–2'},
  {id:'gsat-3-4',name:'學測單字 3–4 級',description:'中階',levels:'3–4'},
  {id:'gsat-5-6',name:'學測單字 5–6 級',description:'進階',levels:'5–6'},
] as const;
export const OFFICIAL_SOURCE = 'Nexus 官方預設學習集，由管理員維護。正式單字清單及來源說明尚待匯入；各詞條的來源與授權以公共字典為準。';
export interface OfficialPack { id:string; name:string; version:number; word_count:number; deck_id:string|null; installed_version:number|null }
export function packAction(pack:OfficialPack,busy=false,error=false) {
  return busy?'下載中…':error?'重試':!pack.deck_id?'下載':pack.installed_version!==pack.version?'更新':'開啟';
}
export const packDeleteMessage=(name:string)=>`刪除「${name}」？\n\n這會移除此單字集與此單字集的學習進度。\n公共字典內容不會被刪除，你之後可以再次下載。`;
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
