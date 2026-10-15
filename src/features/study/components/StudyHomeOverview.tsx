"use client";
import FeatureIcon from "../../../components/FeatureIcon";
import PageCollection,{type PageActions} from "../../../components/PageCollection";
import {useLanguage} from "../../../lib/LanguageContext";
import {confirmDialog} from '../../../lib/confirmDialog';

import {useEffect,useState} from 'react';
import Link from 'next/link';
import type {Page} from '../../../lib/types';
import type {StudyRepository} from '../StudyRepository';
import {isLearned} from '../studySessions';
import {getSupabase} from '../../../infrastructure/supabase/client';
import {downloadOfficialPack,deleteOfficialPack,packDeleteMessage} from '../officialPacks';

export default function StudyHomeOverview({pages,repository,onCreate,onSelectPage,onChanged,...actions}:PageActions&{pages:Page[];repository:StudyRepository;onCreate:()=>void;onSelectPage:(id:string)=>void;onChanged:()=>Promise<void>}) {
  const {t}=useLanguage();
  const [progress,setProgress]=useState<Record<string,{learned:number;total:number}>>({}),[busy,setBusy]=useState<string|null>(null),[error,setError]=useState('');
  useEffect(()=>{let active=true;const read=async()=>{const data=await Promise.all(pages.map(async p=>{try{const s=await repository.readDeck(p.id),cards=s.cards.filter(c=>!c.deleted_at);return [p.id,{total:cards.length,learned:s.states.filter(isLearned).filter(s=>cards.some(c=>c.id===s.id)).length}] as const;}catch{return [p.id,null] as const;}}));if(active)setProgress(Object.fromEntries(data.filter((v):v is readonly [string,{total:number;learned:number}]=>v[1]!==null)));};void read();window.addEventListener('nexus-study-changed',read);return()=>{active=false;window.removeEventListener('nexus-study-changed',read);};},[pages,repository]);
  async function act(page:Page,remove=false){if(busy)return;if(remove&&!await confirmDialog(packDeleteMessage(page.title)))return;setBusy(page.id);setError('');try{const client=getSupabase();if(!client)throw Error('請先登入並連線。');if(remove)await deleteOfficialPack(client,page.id);else await downloadOfficialPack(client,page.official_pack_id!);await onChanged();}catch(e){setError(String(e));}finally{setBusy(null);}}
  return <main className="flex-1 overflow-y-auto bg-[var(--color-editor-bg)] text-[var(--color-text)]"><div className="mx-auto max-w-5xl space-y-5 p-4 sm:p-8">
    <h1 className="text-2xl font-semibold"><FeatureIcon feature="study" className="mr-2"/>{t("ui.myStudySets")}</h1><Link href="/dictionary" className="inline-block underline">字典／百科</Link>
    <div className="flex flex-wrap gap-2"><button className="min-h-11 rounded-full bg-blue-600 px-5 py-2.5 text-white" onClick={onCreate}>＋{t("ui.create.study")}</button><Link className="rounded-lg border px-4 py-2" href="/study/official">官方單字集</Link></div>
    {error&&<p role="alert">{error}</p>}{!pages.length&&<p>尚未建立學習集。</p>}
    <PageCollection viewStorageKey="nexus-study-view" previews={Object.fromEntries(pages.map(page=>{const p=progress[page.id];return [page.id,`${page.official_pack_id?t('ui.officialVersion',{n:page.official_pack_version??0})+' · ':''}${p?`${p.learned} / ${p.total} ${t('ui.feature.study')}`:t('common.loading')}`];}))} pages={pages} onSelectPage={onSelectPage} {...actions} extraMenuItems={page=>page.official_pack_id?[
      {id:'info',disabled:!!busy,label:t('ui.officialInfo'),icon:'',onClick:()=>window.location.assign('/study/official/'+page.official_pack_id)},
      {id:'sync',disabled:!!busy,label:t('ui.syncOfficial'),icon:'',onClick:()=>void act(page)},
      {id:'delete',disabled:!!busy,label:t('ui.delete'),icon:'',danger:true,onClick:()=>void act(page,true)},
    ]:[]}/>
  </div></main>;
}
