import type { PublishedDetail } from './reader';
export interface StudyComposition { parts:{name:string;meaning:string}[]; concept:string|null }
/** Read-only projection of explicit, published relations. Never infer morphology. */
export function studyComposition(detail:PublishedDetail|null,front:string,answer:string):StudyComposition|null {
  if(!detail||detail.entry.status!=='published'||detail.entry.kind!=='word'||detail.entry.headword.trim().toLocaleLowerCase()!==front.trim().toLocaleLowerCase())return null;
  const scoped=(sense:string|null)=>sense===null||(detail.senses.length===1&&detail.senses[0].id===sense);
  const relations=detail.relations.filter(row=>scoped(row.sense_id));
  if(!relations.length)return null;
  const parts=[];
  for(const relation of relations){
    const target=detail.related.find(row=>row.id===relation.target_entry_id&&row.sense_id===relation.target_sense_id);
    if(!target?.headword.trim()||!target.gloss_zh_tw.trim()||target.id===detail.entry.id)return null;
    parts.push({name:target.headword.trim(),meaning:target.gloss_zh_tw.trim()});
  }
  const stored=detail.learning_notes.find(note=>note.kind==='core_concept'&&scoped(note.sense_id)&&note.body.trim())?.body.trim();
  const first=stored?.split(/\r?\n|(?<=[。！？])|(?<=[.!?])\s+/u)[0]?.trim();
  const concept=first&&first.replace(/\s+/g,'')!==answer.trim().replace(/\s+/g,'')?(first.length>160?first.slice(0,160)+'…':first):null;
  return {parts,concept};
}
