"use client";
import {useState} from 'react';
import ModalDialog from '../../../components/ModalDialog';
import {useLanguage} from '../../../lib/LanguageContext';
import {getSupabase} from '../../../infrastructure/supabase/client';
import type {StudyRepository} from '../StudyRepository';
import {clearStudyDeck,studyErrorMessage} from '../studySync';

export default function ClearStudyHistoryDialog({repository,deckId,title,owner,onClose,onCleared,beforeClear}:{repository:StudyRepository;deckId:string;title:string;owner:string|null;onClose:()=>void;onCleared:()=>void;beforeClear:()=>Promise<void>}) {
  const {t}=useLanguage();
  const [name,setName]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  async function clear() {
    if(busy||name!==title)return;
    setBusy(true);setError('');
    try {
      const client=getSupabase();if(!client||!owner)throw Error('study.clearOnline');
      await beforeClear();await clearStudyDeck(repository,client,owner,deckId);onCleared();onClose();
    }catch(e){setError(studyErrorMessage(e,t));}
    finally{setBusy(false);}
  }
  return <ModalDialog busy={busy} onDismiss={onClose} aria-labelledby="clear-study-title" className="m-auto w-[min(94vw,32rem)] rounded-xl border bg-[var(--color-editor-bg)] p-5 text-[var(--color-text)] shadow-xl">
    <h2 id="clear-study-title" className="mb-3 text-lg font-semibold">{t('study.clearLearning')}</h2>
    <p className="mb-3 text-sm">{t('study.clearWarning')}</p>
    <p className="mb-3 text-sm">{t('study.clearScope')}</p>
    <label className="block text-sm">{t('study.clearName',{name:title})}<input autoFocus value={name} disabled={busy} onChange={e=>setName(e.target.value)} className="mt-2 min-h-11 w-full rounded border bg-transparent px-3"/></label>
    {error&&<p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
    <div className="mt-4 flex flex-wrap justify-end gap-2"><button disabled={busy} onClick={onClose} className="min-h-11 rounded border px-3">{t('common.cancel')}</button><button disabled={busy||name!==title} onClick={()=>void clear()} className="min-h-11 rounded border border-red-500 px-3 text-red-600 disabled:opacity-40">{t(busy?'study.clearing':'study.clearConfirm')}</button></div>
  </ModalDialog>;
}
