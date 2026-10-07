"use client";
import {confirmDialog} from '../../../lib/confirmDialog';

import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {useMenuDismiss} from '../../../components/useMenuDismiss';
import type {Page} from '../../../lib/types';
import type {StudyRepository} from '../StudyRepository';
import {isLearned} from '../studySessions';
import {getSupabase} from '../../../infrastructure/supabase/client';
import {downloadOfficialPack,deleteOfficialPack,packDeleteMessage} from '../officialPacks';

export default function StudyHomeOverview({pages,repository,onCreate,onSelectPage,onChanged}:{pages:Page[];repository:StudyRepository;onCreate:()=>void;onSelectPage:(id:string)=>void;onChanged:()=>Promise<void>}) {
  const [progress,setProgress]=useState<Record<string,{learned:number;total:number}>>({}),[busy,setBusy]=useState<string|null>(null),[error,setError]=useState('');
  const [menu,setMenu]=useState<string|null>(null);
  useEffect(()=>{let active=true;const read=async()=>{const data=await Promise.all(pages.filter(p=>p.official_pack_id).map(async p=>{try{const s=await repository.readDeck(p.id),cards=s.cards.filter(c=>!c.deleted_at);return [p.id,{total:cards.length,learned:s.states.filter(isLearned).filter(s=>cards.some(c=>c.id===s.id)).length}] as const;}catch{return [p.id,null] as const;}}));if(active)setProgress(Object.fromEntries(data.filter((v):v is readonly [string,{total:number;learned:number}]=>v[1]!==null)));};void read();window.addEventListener('nexus-study-changed',read);return()=>{active=false;window.removeEventListener('nexus-study-changed',read);};},[pages,repository]);
  const menuRef=useRef<HTMLDivElement>(null);
  useMenuDismiss(!!menu,[menuRef],()=>setMenu(null));
  async function act(page:Page,remove=false){if(busy)return;if(remove&&!await confirmDialog(packDeleteMessage(page.title)))return;setMenu(null);setBusy(page.id);setError('');try{const client=getSupabase();if(!client)throw Error('請先登入並連線。');if(remove)await deleteOfficialPack(client,page.id);else await downloadOfficialPack(client,page.official_pack_id!);await onChanged();}catch(e){setError(String(e));}finally{setBusy(null);}}
  return <main className="flex-1 overflow-y-auto bg-[var(--color-editor-bg)] text-[var(--color-text)]"><div className="mx-auto max-w-5xl space-y-5 p-4 sm:p-8">
    <h1 className="text-2xl font-semibold">我的學習集</h1><Link href="/dictionary" className="inline-block underline">字典／百科</Link>
    <div className="flex flex-wrap gap-2"><button className="rounded-lg border px-4 py-2" onClick={onCreate}>＋新增學習集</button><Link className="rounded-lg border px-4 py-2" href="/study/official">官方單字集</Link></div>
    {error&&<p role="alert">{error}</p>}{!pages.length&&<p>尚未建立學習集。</p>}
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[...pages].sort((a,b)=>b.updated_at-a.updated_at).map(page=><article key={page.id} className="min-w-0 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
      <div className="flex items-start justify-between gap-2"><h2 className="min-w-0 break-words font-medium">{page.title||'未命名'}</h2>{page.official_pack_id&&<div ref={menu===page.id?menuRef:undefined} className="relative shrink-0"><button aria-label={`${page.title} 更多操作`} aria-expanded={menu===page.id} onClick={()=>setMenu(menu===page.id?null:page.id)}>⋯</button>{menu===page.id&&<div className="absolute right-0 z-10 w-48 space-y-2 rounded border bg-[var(--color-bg)] p-3 text-sm shadow-lg"><Link className="block" href={`/study/official/${page.official_pack_id}`}>查看官方資訊</Link><button className="block" disabled={!!busy} onClick={()=>void act(page)}>重新同步官方內容</button><button className="block" disabled={!!busy} onClick={()=>void act(page,true)}>刪除單字集</button></div>}</div>}</div>
      {page.official_pack_id&&<><p className="mt-2 text-xs opacity-70">官方單字集 · v{page.official_pack_version}</p><p className="mt-2 text-sm">{progress[page.id]?`已學 ${progress[page.id].learned} / ${progress[page.id].total} 字`:'學習進度同步中…'}</p></>}
      <button disabled={busy===page.id} className="mt-4 rounded border px-3 py-2 text-sm" onClick={()=>onSelectPage(page.id)}>{busy===page.id?'處理中…':page.official_pack_id?'繼續學習':'開啟學習集'}</button>
    </article>)}</div>
  </div></main>;
}
