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
  const move=(index:number,offset:number)=>{const next=[...segments],target=index+offset;if(target<0||target>=next.length)return;[next[index],next[target]]=[next[target],next[index]];onChange(next,relations);};
  return <div className="min-w-0 space-y-2" data-word-segments>
    <h3 className="font-semibold">{t('segments.title')}</h3>
    <output aria-label={t('segments.spelling')} className="block break-all text-xl">{wordSpelling(segments)}</output>
    {segments.map((segment,index)=>{const relation=relations.find(r=>r.id===segment.relation_id);return <div key={segment.id} data-segment-row className="min-w-0 space-y-2 border-b pb-2">
      <div className="grid min-w-0 gap-2 sm:grid-cols-2"><label className="text-sm">{t('segments.text')}<input className={control} enterKeyHint="done" aria-label={t('segments.text')+' '+(index+1)} value={segment.text} onChange={e=>update(segment.id,{text:e.target.value})}/></label><label className="text-sm">{t('segments.hint')}<input className={control} enterKeyHint="done" aria-label={t('segments.hint')+' '+(index+1)} value={segment.hint} onChange={e=>update(segment.id,{hint:e.target.value})}/></label></div>
      {relation&&<RelationTargetPicker entryId={String(relation.target_entry_id)} senseId={String(relation.target_sense_id)} excludeEntryId={entryId} onChange={(entry,sense)=>onChange(segments,relations.map(r=>r.id===relation.id?{...r,target_entry_id:entry,target_sense_id:sense}:r))}/>}
      <div className="flex flex-wrap gap-2 text-sm"><button type="button" className="min-h-11 px-2 underline" onClick={()=>setLinking(segment.id)}>{t('segments.link')}</button>{segment.relation_id&&<button type="button" className="min-h-11 px-2" onClick={()=>update(segment.id,{relation_id:null})}>{t('segments.unlink')}</button>}
        {segments.length>1&&<><button type="button" className="min-h-11 px-2" aria-label={t('segments.up')+' '+(index+1)} disabled={index===0} onClick={()=>move(index,-1)}>↑</button><button type="button" className="min-h-11 px-2" aria-label={t('segments.down')+' '+(index+1)} disabled={index===segments.length-1} onClick={()=>move(index,1)}>↓</button><button type="button" className="min-h-11 px-2" aria-label={t('segments.remove')+' '+(index+1)} onClick={()=>onChange(segments.filter(s=>s.id!==segment.id),relations)}>{t('segments.remove')}</button></>}
      </div>
    </div>;})}
    <button type="button" className="min-h-11 rounded border px-3 text-sm" onClick={()=>onChange([...segments,{id:crypto.randomUUID(),text:'',hint:'',relation_id:null}],relations)}>{t('segments.add')}</button>
    {linking&&<RelationSelectionDialog allowCreate={false} excludeEntryId={entryId} onClose={()=>setLinking(null)} onSelect={(entry,sense)=>{
      const existing=relations.find(r=>r.sense_id==null&&r.target_entry_id===entry&&r.target_sense_id===sense),id=existing?.id??crypto.randomUUID();
      onChange(segments.map(s=>s.id===linking?{...s,relation_id:String(id)}:s),existing?relations:[...relations,{id,entry_id:entryId,sense_id:null,target_entry_id:entry,target_sense_id:sense}]);setLinking(null);
    }}/>}
  </div>;
}
