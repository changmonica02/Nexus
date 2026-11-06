"use client";
import {useState} from 'react';
import {usePaginationLanguage} from '../../lib/LanguageContext';
import {RelationSelectionDialog,RelationTargetPicker} from './RelationTargetPicker';
import {wordSpelling,type WordSegment} from './wordSegments';
type Row=Record<string,unknown>;
const control='min-h-11 w-full min-w-0 rounded border bg-transparent px-2';
export default function WordSegmentsEditor({entryId,segments,relations,onChange}:{entryId:string;segments:WordSegment[];relations:Row[];onChange:(segments:WordSegment[],relations:Row[])=>void}) {
  const {t}=usePaginationLanguage(),[linking,setLinking]=useState<string|null>(null);
  const update=(id:string,patch:Partial<WordSegment>)=>onChange(segments.map(s=>s.id===id?{...s,...patch}:s),relations);
  return <div className="min-w-0 space-y-2" data-word-segments>
    <h3 className="font-semibold">{t('segments.title')}</h3>
    <output aria-label={t('segments.spelling')} className="block break-all text-xl">{wordSpelling(segments)}</output>
    {segments.map((segment,index)=>{const relation=relations.find(r=>r.id===segment.relation_id);return <div key={segment.id} data-segment-row className="min-w-0">
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)_44px] items-center gap-2">
        <input className={control} placeholder={t('segments.text')} enterKeyHint="done" aria-label={t('segments.text')+' '+(index+1)} value={segment.text} onChange={e=>update(segment.id,{text:e.target.value})}/>
        <input className={control} placeholder={t('segments.hint')} enterKeyHint="done" aria-label={t('segments.hint')+' '+(index+1)} value={segment.hint} onChange={e=>update(segment.id,{hint:e.target.value})}/>
        <button type="button" className="min-h-11 rounded text-xl disabled:opacity-30" aria-label={t('segments.remove')+' '+(index+1)} disabled={segments.length===1} onClick={()=>onChange(segments.filter(s=>s.id!==segment.id),relations)}>×</button>
      </div>
      {relation?<RelationTargetPicker compact entryId={String(relation.target_entry_id)} senseId={String(relation.target_sense_id)} excludeEntryId={entryId} onUnlink={()=>update(segment.id,{relation_id:null})} onChange={(entry,sense)=>onChange(segments,relations.map(r=>r.id===relation.id?{...r,target_entry_id:entry,target_sense_id:sense}:r))}/>:<details className="min-w-0 text-sm"><summary className="cursor-pointer py-1 text-xs underline">{t('segments.link')}</summary><button type="button" className="min-h-11 px-2 underline" onClick={()=>setLinking(segment.id)}>{t('segments.link')}</button></details>}

    </div>;})}
    <button type="button" className="min-h-11 rounded border px-3 text-sm" onClick={()=>onChange([...segments,{id:crypto.randomUUID(),text:'',hint:'',relation_id:null}],relations)}>{t('segments.add')}</button>
    {linking&&<RelationSelectionDialog allowCreate={false} excludeEntryId={entryId} onClose={()=>setLinking(null)} onSelect={(entry,sense)=>{
      const existing=relations.find(r=>r.sense_id==null&&r.target_entry_id===entry&&r.target_sense_id===sense),id=existing?.id??crypto.randomUUID();
      onChange(segments.map(s=>s.id===linking?{...s,relation_id:String(id)}:s),existing?relations:[...relations,{id,entry_id:entryId,sense_id:null,target_entry_id:entry,target_sense_id:sense}]);setLinking(null);
    }}/>}
  </div>;
}
