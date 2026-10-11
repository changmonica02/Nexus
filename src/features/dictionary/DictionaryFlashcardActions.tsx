"use client";
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {getSupabase} from '../../infrastructure/supabase/client';
import {linkedPrivateCards,type LinkedPrivateCard} from './flashcardLinks';
export const linkedCardHref=(card:LinkedPrivateCard)=>`/study?deck=${encodeURIComponent(card.deck_id)}&card=${encodeURIComponent(card.id)}`;
export default function DictionaryFlashcardActions({entryId}:{entryId:string}){
 const [cards,setCards]=useState<LinkedPrivateCard[]>([]),[error,setError]=useState('');
 useEffect(()=>{let active=true,serial=0;const client=getSupabase();if(!client)return;const read=()=>{const generation=++serial;setCards([]);setError('');void linkedPrivateCards(client,entryId).then(rows=>{if(active&&generation===serial)setCards(rows);}).catch(()=>{if(active&&generation===serial)setError('暫時無法讀取自己的字卡；加入時會再次確認。');});};read();const {data}=client.auth.onAuthStateChange(()=>{if(active)read();});return()=>{active=false;data.subscription.unsubscribe();};},[entryId]);
 return <section className="flex min-w-0 flex-wrap items-center gap-3 text-sm" aria-label="加入私人字卡"><Link className="rounded border px-3 py-2" href={`/study?dictionary=${encodeURIComponent(entryId)}`}>加入字卡</Link>{cards.length>0&&<span>已有 {cards.length} 張字卡</span>}{cards.map(c=><Link key={c.id} className="max-w-full break-words underline" href={linkedCardHref(c)}>開啟：{c.front} · {c.back}</Link>)}{error&&<p>{error}</p>}</section>;
}
