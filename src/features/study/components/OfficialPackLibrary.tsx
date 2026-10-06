"use client";
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {getSupabase} from '../../../infrastructure/supabase/client';
import {OFFICIAL_PACKS,OFFICIAL_SOURCE,listOfficialPacks,downloadOfficialPack,packAction,type OfficialPack} from '../officialPacks';
const button='rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm disabled:opacity-50';
export function OfficialPackCard({pack,busy,error,onDownload}:{pack:OfficialPack;busy:boolean;error:string;onDownload:()=>void}) {
  const info=OFFICIAL_PACKS.find(p=>p.id===pack.id);
  const action=packAction(pack,busy,!!error);
  return <article className="space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-panel-bg)] p-4">
    <Link href={`/study/official/${pack.id}`} className="block"><h2 className="text-lg font-semibold">{pack.name}</h2><p className="mt-1 text-sm opacity-70">{info?.description} · {info?.levels} 級</p></Link>
    <p>{pack.word_count} 字{pack.word_count===0?'（內容待匯入）':''}</p><p className="text-xs opacity-60">版本 {pack.version}</p>
    {action==='開啟'?<Link className={`${button} inline-block`} href={`/study?deck=${encodeURIComponent(pack.deck_id!)}`}>開啟</Link>:<button className={button} disabled={busy} onClick={onDownload}>{action}</button>}
    {error&&<p role="alert" className="text-sm">{error}</p>}
  </article>;
}
export default function OfficialPackLibrary({packId}:{packId?:string}) {
  const [packs,setPacks]=useState<OfficialPack[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
  const [busy,setBusy]=useState<string|null>(null),[failures,setFailures]=useState<Record<string,string>>({});
  async function load(){setLoading(true);setError('');try{const client=getSupabase();if(!client)throw Error('請先設定並登入 Nexus。');setPacks(await listOfficialPacks(client));}catch(e){setError(String(e));}finally{setLoading(false);}}
  useEffect(()=>{void load();},[]);
  async function download(id:string){if(busy)return;setBusy(id);setFailures(f=>({...f,[id]:''}));try{await downloadOfficialPack(getSupabase()!,id);setPacks(await listOfficialPacks(getSupabase()!));}catch(e){setFailures(f=>({...f,[id]:e instanceof Error?e.message:String(e)}));}finally{setBusy(null);}}
  const pack=packs.find(p=>p.id===packId),info=OFFICIAL_PACKS.find(p=>p.id===packId);
  return <main className="h-dvh overflow-y-auto bg-[var(--color-bg)] text-[var(--color-text)]"><div className="mx-auto max-w-5xl space-y-5 p-4 sm:p-8">
    <Link className="underline" href={packId?'/study/official':'/study'}>← {packId?'官方單字集':'我的學習集'}</Link>
    <h1 className="text-2xl font-semibold">{packId?pack?.name??'官方包詳情':'官方單字集'}</h1>
    {loading&&<p role="status">正在讀取…</p>}{error&&<div role="alert">{error}<button className={`${button} ml-2`} onClick={()=>void load()}>重試</button></div>}
    {!loading&&!error&&(packId?pack?<section className="space-y-4 rounded-xl border border-[var(--color-border)] p-4">
      <p>等級範圍：{info?.levels} 級 · {info?.description}</p><p>單字數量：{pack.word_count}{pack.word_count===0?'（內容待匯入）':''}</p><p>版本：{pack.version}</p>
      <h2 className="font-medium">官方來源說明</h2><p className="text-sm leading-6">{OFFICIAL_SOURCE}</p>
      <p className="text-sm">下載後使用自己的學習進度。更新只新增詞條，不重建既有卡片，也不自動移除卡片。</p>
      {packAction(pack)==='開啟'&&!failures[pack.id]?<Link className={`${button} inline-block`} href={`/study?deck=${encodeURIComponent(pack.deck_id!)}`}>開啟單字集</Link>:<button className={button} disabled={!!busy} onClick={()=>void download(pack.id)}>{busy===pack.id?'下載中…':failures[pack.id]?'重試':pack.deck_id?'更新':'下載單字集'}</button>}
      {failures[pack.id]&&<p role="alert">{failures[pack.id]}</p>}
    </section>:<p>找不到此官方單字集。</p>:<div className="grid gap-4 sm:grid-cols-3">{packs.map(p=><OfficialPackCard key={p.id} pack={p} busy={busy===p.id} error={failures[p.id]??''} onDownload={()=>void download(p.id)}/>)}</div>)}
  </div></main>;
}
