"use client";
import {Pagination} from '../../components/pagination/Pagination';
import {usePagedList} from '../../components/pagination/usePagedList';

import {useRef,useState} from 'react';
import type {StudyCard} from '../study/studyFSRS';
import {getSupabase} from '../../infrastructure/supabase/client';
import {suggestDictionaryLink} from './flashcardLinks';
import {DictionaryModal} from './DictionaryModal';
export default function StudyLinkSuggestions({cards,onClose,onEdit,onLink}:{cards:StudyCard[];onClose:()=>void;onEdit:(card:StudyCard)=>void;onLink:(card:StudyCard,id:string)=>Promise<void>}){
 const [page,setPage]=useState(0),[busy,setBusy]=useState(false),[error,setError]=useState(''),[linked,setLinked]=useState<string[]>([]);
 const source=cards.filter(c=>!c.deleted_at&&!c.dictionary_entry_id&&!c.official_pack_id&&!linked.includes(c.id));
 const sourceKey=JSON.stringify(source.map(c=>[c.id,c.front,c.back]));
 const cached=useRef<{key:string;cards:StudyCard[]}|null>(null);
 const listing=usePagedList(sourceKey,page,10,async p=>{
  const client=getSupabase();if(!client)throw Error('需要登入與網路');
  if(cached.current?.key!==sourceKey){const cloudLinked=new Set<string>();
   for(let i=0;i<source.length;i+=200){const {data,error}=await client.from('study_card_dictionary_links').select('card_id').in('card_id',source.slice(i,i+200).map(c=>c.id));if(error)throw Error(error.message);for(const row of data??[])cloudLinked.add(row.card_id);}
   cached.current={key:sourceKey,cards:source.filter(c=>!cloudLinked.has(c.id))};
  }
  const eligible=cached.current.cards;
  const items=await Promise.all(eligible.slice(p*10,p*10+10).map(async card=>({card,suggestion:await suggestDictionaryLink(client,card.front,card.back)})));
  return {items,total:eligible.length,page:p};
 },setPage);
 const rows=listing.data?.items??[];
 return <DictionaryModal title="建議字典連結" onClose={onClose} busy={busy}><div className="min-w-0 space-y-3"><p className="text-sm">每張卡由你確認，不會自動大量連結，也不會改寫私人答案。</p>{(busy||listing.loading)&&<p role="status">查詢中…</p>}{listing.error&&<p role="alert">{listing.error}<button onClick={()=>{cached.current=null;listing.retry();}}>重試</button></p>}{error&&<p role="alert">{error}</p>}{!busy&&!rows.length&&<p>本頁沒有需要補連結的字卡。</p>}{rows.map(({card,suggestion})=><article className="min-w-0 space-y-2 rounded border p-3" key={card.id}><h3 className="break-words font-semibold">{card.front} · {card.back}</h3><p>{suggestion.status==='high'?'高信心':suggestion.status==='multiple'?'多候選／需確認義項':'無候選'}</p>{suggestion.items.map(c=><p key={c.detail.entry.id} className="break-words text-sm">{c.detail.entry.headword} · {c.summary}</p>)}{suggestion.status==='high'&&<button className="rounded border p-2 text-sm" disabled={busy} onClick={()=>{setBusy(true);setError('');void onLink(card,suggestion.items[0].detail.entry.id).then(()=>setLinked(ids=>[...ids,card.id])).catch(e=>setError(String(e))).finally(()=>setBusy(false));}}>確認連結</button>}<button className="ml-2 rounded border p-2 text-sm" disabled={busy} onClick={()=>onEdit(card)}>選擇候選／手動搜尋</button></article>)}<Pagination page={listing.data?.page??0} total={listing.data?.total} pageSize={10} loading={listing.loading} disabled={busy||!listing.data} onPageChange={setPage}/></div></DictionaryModal>;
}
