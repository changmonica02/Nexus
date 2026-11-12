"use client";
import {lazy,Suspense,useCallback,useEffect,useId,useRef,useState} from 'react';
import ModalDialog from '../../components/ModalDialog';
import {useLanguage} from '../../lib/LanguageContext';
import {getSupabase} from '../../infrastructure/supabase/client';
import StudyPronunciation from '../study/components/StudyPronunciation';
import {DictionaryArticle} from './DictionaryArticle';
import {DictionaryReadingNavigation} from './DictionaryReadLink';
import {readPublishedEntry,type PublishedDetail} from './reader';
import {loadBrowsePage,type BrowsePage} from './readerNavigation';
import {offline} from './publicCache';
import {useDictionaryAdminAccess} from './useDictionaryAdminAccess';
import {DictionaryModal} from './DictionaryModal';
import {navigateDictionary} from './useUnsavedDraft';
import { Pencil, Search, X } from 'lucide-react';
const DictionaryWorkspace=lazy(()=>import('./DictionaryAdmin').then(module=>({default:module.DictionaryWorkspace})));

type Visit={href:string;scroll:number};
type Reading={detail:PublishedDetail|null}|{list:BrowsePage};
/** Keep browsing in the current sheet; never navigate the learning page itself. */
function readingHref(href:string){
  const url=new URL(href,'https://nexus.invalid');
  if(url.origin!=='https://nexus.invalid'||!/^\/dictionary(?:\/[0-9a-f-]{36})?$/.test(url.pathname))return '/dictionary';
  url.searchParams.delete('from');
  return url.pathname+url.search+url.hash;
}
export default function CardDictionaryPanel({fixedEntryId,onOpenChange,rate=0.9}:{fixedEntryId?:string;onOpenChange:(open:boolean)=>void;rate?:number}){
  const {t}=useLanguage();
  const [open,setOpen]=useState(false);
  const trigger=useRef<HTMLButtonElement>(null),opened=useRef(false),marker=useRef<string|null>(null);
  const account=useRef<string|null|undefined>(undefined);
  const editorBackRef=useRef<null|(()=>void)>(null);
  const finish=useCallback(()=>{opened.current=false;setOpen(false);onOpenChange(false);},[onOpenChange]);
  const close=useCallback(()=>{
    if(marker.current&&history.state?.nexusStudyDictionary===marker.current)history.back();
    else finish();
  },[finish]);
  useEffect(()=>{
    // Run before generic draft URL guards so Back returns through the dirty prompt.
    const back=(event:PopStateEvent)=>{if(!opened.current||history.state?.nexusStudyDictionary===marker.current)return;if(editorBackRef.current){event.stopImmediatePropagation();history.pushState({...history.state,nexusStudyDictionary:marker.current},'',location.href);editorBackRef.current();}else finish();};
    window.addEventListener('popstate',back,true);
    const {data}=getSupabase()?.auth.onAuthStateChange((event,session)=>{const owner=session?.user.id??null;if(event==='SIGNED_OUT'||(account.current!==undefined&&account.current!==owner)){editorBackRef.current=null;close();}account.current=owner;})??{};
    return()=>{
      window.removeEventListener('popstate',back,true);data?.subscription.unsubscribe();
      if(opened.current){onOpenChange(false);if(marker.current&&history.state?.nexusStudyDictionary===marker.current)history.back();}
    };
  },[close,finish,onOpenChange]);
  return <div className="mt-5 border-t pt-4">
    <button ref={trigger} type="button" aria-haspopup="dialog" aria-expanded={open} className="min-h-11 w-full rounded-lg border px-4 py-3 font-medium" onClick={()=>{
      if(opened.current)return;
      marker.current=crypto.randomUUID();
      try{history.pushState({...history.state,nexusStudyDictionary:marker.current},'',location.href);}catch{marker.current=null;}
      opened.current=true;onOpenChange(true);setOpen(true);
    }}>{t('studyDictionary.open')}</button>
    {open&&<ReadingSheet initialHref={fixedEntryId?`/dictionary/${fixedEntryId}`:'/dictionary'} rate={rate} onClose={close} returnFocusRef={trigger} editorBackRef={editorBackRef}/>}
  </div>;
}
function ReadingSheet({initialHref,rate,onClose,returnFocusRef,editorBackRef}:{initialHref:string;rate:number;onClose:()=>void;returnFocusRef:React.RefObject<HTMLButtonElement|null>;editorBackRef:React.RefObject<null|(()=>void)>}){
  const {t}=useLanguage(),titleId=useId();
  const [navigation,setNavigation]=useState<{current:Visit;previous:Visit[]}>({current:{href:initialHref,scroll:0},previous:[]});
  const href=navigation.current.href,restoreScroll=navigation.current.scroll;
  // Keep the editor target stable while the reader refreshes in the background.
  const [editing,setEditing]=useState<{id:string;owner:string}|null>(null);
  const [drag,setDrag]=useState(0);
  const pointer=useRef<{id:number;x:number;y:number}|null>(null);
  const {access}=useDictionaryAdminAccess();
  const [version,setVersion]=useState(0),[result,setResult]=useState<{key:string;reading?:Reading;error?:string}|null>(null),[input,setInput]=useState('');
  const heading=useRef<HTMLHeadingElement>(null);
  const scroll=useRef<HTMLDivElement>(null),cache=useRef(new Map<string,Reading>());
  const key=JSON.stringify([href,version]);
  const url=new URL(href,'https://nexus.invalid'),entryId=url.pathname.split('/')[2];
  const current=result?.key===key?result:null;
  const detail=current?.reading&&'detail' in current.reading?current.reading.detail:null;
  const list=current?.reading&&'list' in current.reading?current.reading.list:null;
  const go=useCallback((next:string)=>{
    const target=readingHref(next),position=scroll.current?.scrollTop??0;
    setInput(new URL(target,'https://nexus.invalid').searchParams.get('q')??'');
    setNavigation(value=>({current:{href:target,scroll:0},previous:[...value.previous,{...value.current,scroll:position}].slice(-30)}));
  },[]);
  const previous=()=>{const last=navigation.previous.at(-1);if(!last)return;setInput(new URL(last.href,'https://nexus.invalid').searchParams.get('q')??'');setNavigation({current:last,previous:navigation.previous.slice(0,-1)});};
  const retry=()=>{cache.current.delete(href);setVersion(value=>value+1);};
  const refresh=useCallback(()=>{cache.current.clear();setVersion(value=>value+1);},[]);
  const finishEditor=useCallback(()=>{setEditing(null);refresh();},[refresh]);
  const closeEditor=useCallback(()=>navigateDictionary(finishEditor),[finishEditor]);
  const editingAllowed=!!editing&&!!access?.allowed&&editing.owner===access.owner;
  useEffect(()=>{editorBackRef.current=editingAllowed?closeEditor:null;return()=>{editorBackRef.current=null;};},[editingAllowed,closeEditor,editorBackRef]);
  useEffect(()=>{const online=()=>{cache.current.clear();setVersion(value=>value+1);};window.addEventListener('online',online);return()=>window.removeEventListener('online',online);},[]);
  useEffect(()=>{
    let active=true;
    const read=async()=>{
      const stored=cache.current.get(href);if(stored)return stored;
      const client=getSupabase();if(!client)throw Error(t('studyDictionary.unavailable'));
      let reading:Reading;
      if(entryId){const detail=await readPublishedEntry(client,entryId,version>0);reading={detail:detail?.entry.status==='published'?detail:null};}
      else reading={list:await loadBrowsePage(client,href)};
      if(active){if(cache.current.size>=30)cache.current.delete(cache.current.keys().next().value!);cache.current.set(href,reading);}
      return reading;
    };
    void read().then(reading=>{if(active)setResult({key,reading});}).catch(error=>{if(active)setResult({key,error:offline()?t('studyDictionary.offline'):error instanceof Error?error.message:String(error)});});
    return()=>{active=false;};
  },[href,entryId,key,t,version]);
  useEffect(()=>{
    if(!current?.reading||!scroll.current)return;
    // A delayed public read must not interrupt typing or an IME composition.
    const editingSearch=document.activeElement instanceof HTMLElement&&document.activeElement.id===titleId+'-query';
    if(!editingSearch)heading.current?.focus({preventScroll:true});
    const hash=new URL(href,'https://nexus.invalid').hash.slice(1);
    const target=hash?Array.from(scroll.current.querySelectorAll<HTMLElement>('[id]')).find(element=>element.id===hash):null;
    if(restoreScroll)scroll.current.scrollTop=restoreScroll;
    else if(target)scroll.current.scrollTop=target.offsetTop-scroll.current.offsetTop;
    else scroll.current.scrollTop=0;
  },[current?.reading,href,restoreScroll,titleId]);
  const searchParams=new URLSearchParams(url.search),kind=searchParams.get('kind')??'all';
  const search=(query:string,category=kind)=>{const params=new URLSearchParams({kind:category,q:query.trim()});go('/dictionary?'+params);};
  const cancelDrag=()=>{pointer.current=null;setDrag(0);};
  return <ModalDialog returnFocusRef={returnFocusRef} onDismiss={onClose} aria-labelledby={titleId} style={{transform:`translateY(${drag}px)`}} className="fixed inset-x-0 bottom-0 top-auto m-0 mx-auto h-[88dvh] max-h-[88dvh] w-full max-w-3xl overflow-hidden rounded-t-2xl border border-[var(--color-border)] bg-[var(--color-sidebar-bg)] p-0 text-[var(--color-text)] shadow-xl backdrop:bg-black/45">
    <div className="flex h-full min-w-0 flex-col pb-[env(safe-area-inset-bottom)]">
      <header className="z-10 shrink-0 space-y-2 border-b border-[var(--color-border)] px-4 py-3">
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
          <button type="button" aria-label={t('studyDictionary.previous')} disabled={!navigation.previous.length} onClick={previous} className="min-h-11 justify-self-start rounded-lg px-2 disabled:opacity-40">{t('ui.back')}</button>
          <button type="button" data-dictionary-drag-handle aria-label={t('studyDictionary.drag')} disabled={editingAllowed} className="grid min-h-11 min-w-20 place-items-center rounded-lg" style={{touchAction:'none'}}
            onPointerDown={event=>{if(event.button!==0)return;pointer.current={id:event.pointerId,x:event.clientX,y:event.clientY};event.currentTarget.setPointerCapture(event.pointerId);}}
            onPointerMove={event=>{const start=pointer.current;if(start?.id===event.pointerId)setDrag(Math.abs(event.clientX-start.x)<Math.max(16,event.clientY-start.y)?Math.max(0,event.clientY-start.y):0);}}
            onPointerCancel={cancelDrag}
            onPointerUp={event=>{const start=pointer.current;const dismiss=start?.id===event.pointerId&&event.clientY-start.y>=80&&Math.abs(event.clientX-start.x)<event.clientY-start.y;cancelDrag();if(dismiss&&!editingAllowed)onClose();}}
            onClick={event=>{if(event.detail===0&&!editingAllowed)onClose();}}><span aria-hidden className="h-1 w-12 rounded-full bg-current opacity-40"/></button>
          <button type="button" aria-label={t('studyDictionary.close')} onClick={onClose} className="grid min-h-11 min-w-11 justify-self-end place-items-center rounded-lg"><X size={20}/></button>
        </div>
        <form className="flex min-w-0 gap-2" onSubmit={event=>{event.preventDefault();search(String(new FormData(event.currentTarget).get('query')??input));}}>
          <label className="sr-only" htmlFor={titleId+'-query'}>{t('studyDictionary.query')}</label><input id={titleId+'-query'} name="query" value={input} onChange={event=>setInput(event.target.value)} maxLength={120} placeholder={t('studyDictionary.query')} className="min-h-11 min-w-0 flex-1 rounded-lg border bg-transparent px-3"/>
          <button type="submit" aria-label={t('studyDictionary.search')} className="grid min-h-11 min-w-11 place-items-center rounded-lg border"><Search size={20}/></button>
        </form>
      </header>
      <div ref={scroll} data-dictionary-scroll className="min-h-0 min-w-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 py-4 [overflow-wrap:anywhere]" style={{touchAction:'pan-y'}}>
        <div className="flex min-w-0 items-start justify-between gap-3"><h2 ref={heading} tabIndex={-1} id={titleId} lang={detail?'en':undefined} className="min-w-0 break-words text-xl font-semibold [overflow-wrap:anywhere]">{detail?.entry.headword??t(entryId?'studyDictionary.reading':'studyDictionary.search')}</h2>
        {detail&&access?.allowed&&<button type="button" aria-label={t('studyDictionary.edit')} className="grid min-h-11 min-w-11 shrink-0 place-items-center rounded-lg border" onClick={()=>setEditing({id:detail.entry.id,owner:access.owner})}><Pencil size={18}/></button>}</div>
        {detail&&<><p className="break-words text-sm [overflow-wrap:anywhere]">{[...detail.senses].sort((a,b)=>a.id.localeCompare(b.id)).find(sense=>sense.gloss_zh_tw.trim())?.gloss_zh_tw??t('studyDictionary.noMeaning')}</p><StudyPronunciation key={detail.entry.id} question={detail.entry.id} text={detail.entry.headword} direction="en-zh" frontVisible={false} automatic={false} rate={rate}/></>}
        {list&&<select aria-label={t('studyDictionary.kind')} value={kind} className="min-h-11 max-w-full rounded-lg border bg-[var(--color-sidebar-bg)] px-2" onChange={event=>search(input,event.target.value)}>{['all','word','prefix','root'].map(value=><option key={value} value={value}>{t('studyDictionary.'+value)}</option>)}</select>}
        {!current&&<p role="status">{t('common.loading')}</p>}
        {current?.error&&<div role="alert"><p>{current.error}</p><button type="button" className="min-h-11 underline" onClick={retry}>{t('studyDictionary.retry')}</button></div>}
        {current?.reading&&entryId&&!detail&&<div role="status"><p>{t('studyDictionary.missing')}</p><button type="button" className="min-h-11 underline" onClick={retry}>{t('studyDictionary.retry')}</button></div>}
        {detail&&<DictionaryReadingNavigation value={go}><DictionaryArticle data={detail} showHeading={false}/></DictionaryReadingNavigation>}
        {list&&<><p className="text-sm opacity-65">{t('studyDictionary.results',{query:searchParams.get('q')??''})}</p>{!list.items.length?<p role="status">{t('studyDictionary.empty')}</p>:<ul className="space-y-2">{list.items.map(item=><li key={item.sense_id??item.id}><button type="button" className="min-h-11 w-full break-words rounded-lg border p-3 text-left [overflow-wrap:anywhere]" onClick={()=>go(`/dictionary/${item.id}${item.sense_id?'#sense-'+item.sense_id:''}`)}>{item.headword}<span className="ml-2 text-xs opacity-65">{t('studyDictionary.'+item.kind)}</span>{item.gloss_zh_tw&&<p>{item.gloss_zh_tw}</p>}</button></li>)}</ul>}
        <nav aria-label={t('studyDictionary.pages')} className="flex flex-wrap justify-between gap-2">{[[-1,'studyDictionary.previousPage'],[1,'studyDictionary.nextPage']].map(([offset,label])=><button key={label} type="button" disabled={offset===-1?list.page===0:!list.has_more} className="min-h-11 rounded-lg border px-3 disabled:opacity-40" onClick={()=>{const params=new URLSearchParams(url.search);params.set('page',String(list.page+Number(offset)));go('/dictionary?'+params);}}>{t(String(label))}</button>)}</nav></>}
      </div>
      {editingAllowed&&editing&&<DictionaryModal title={t('studyDictionary.edit')} onClose={closeEditor} dismissOnBackdrop>
        <Suspense fallback={<p role="status">{t('common.loading')}</p>}><DictionaryWorkspace key={editing.owner+':'+editing.id} entryId={editing.id} embedded onCommitted={finishEditor}/></Suspense>
      </DictionaryModal>}
    </div>
  </ModalDialog>;
}
