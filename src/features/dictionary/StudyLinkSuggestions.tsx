"use client";
import {useEffect,useState} from 'react';
import type {StudyCard} from '../study/studyFSRS';
import {getSupabase} from '../../infrastructure/supabase/client';
import {readCardDictionaryLink} from './cardDictionary';
import {suggestDictionaryLink} from './flashcardLinks';
import {DictionaryModal} from './DictionaryModal';
type Suggestion=Awaited<ReturnType<typeof suggestDictionaryLink>>;
export default function StudyLinkSuggestions({cards,onClose,onEdit,onLink}:{cards:StudyCard[];onClose:()=>void;onEdit:(card:StudyCard)=>void;onLink:(card:StudyCard,id:string)=>Promise<void>}){
 const [page,setPage]=useState(0),[rows,setRows]=useState<{card:StudyCard;suggestion:Suggestion}[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const eligible=cards.filter(c=>!c.dictionary_entry_id&&!c.official_pack_id);
 useEffect(()=>{let active=true;setBusy(true);setError('');setRows([]);void(async()=>{const c=getSupabase();if(!c)throw Error('需要登入與網路');const result=[];for(const card of eligible.slice(page*10,page*10+10)){if(await readCardDictionaryLink(c,card.id))continue;result.push({card,suggestion:await suggestDictionaryLink(c,card.front,card.back)});}if(active)setRows(result);})().catch(e=>{if(active)setError(String(e));}).finally(()=>{if(active)setBusy(false);});return()=>{active=false;};},[cards,page]);
 return <DictionaryModal title="建議字典連結" onClose={onClose} busy={busy}><div className="min-w-0 space-y-3"><p className="text-sm">每張卡由你確認，不會自動大量連結，也不會改寫私人答案。</p>{busy&&<p role="status">查詢中…</p>}{error&&<p role="alert">{error}</p>}{!busy&&!rows.length&&<p>本頁沒有需要補連結的字卡。</p>}{rows.map(({card,suggestion})=><article className="min-w-0 space-y-2 rounded border p-3" key={card.id}><h3 className="break-words font-semibold">{card.front} · {card.back}</h3><p>{suggestion.status==='high'?'高信心':suggestion.status==='multiple'?'多候選／需確認義項':'無候選'}</p>{suggestion.items.map(c=><p key={c.detail.entry.id} className="break-words text-sm">{c.detail.entry.headword} · {c.summary}</p>)}{suggestion.status==='high'&&<button className="rounded border p-2 text-sm" disabled={busy} onClick={()=>{setBusy(true);setError('');void onLink(card,suggestion.items[0].detail.entry.id).then(()=>setRows(rows=>rows.filter(r=>r.card.id!==card.id))).catch(e=>setError(String(e))).finally(()=>setBusy(false));}}>確認連結</button>}<button className="ml-2 rounded border p-2 text-sm" disabled={busy} onClick={()=>onEdit(card)}>選擇候選／手動搜尋</button></article>)}<div className="flex justify-between"><button disabled={busy||page===0} onClick={()=>setPage(p=>p-1)}>上一頁</button><button disabled={busy||(page+1)*10>=eligible.length} onClick={()=>setPage(p=>p+1)}>下一頁</button></div></div></DictionaryModal>;
}
