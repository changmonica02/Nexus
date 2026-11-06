import type { PublishedDetail } from './reader';
import {validateWordSegments} from './wordSegments';
export interface StudyComposition { parts:{name:string;meaning:string}[]; concept:string|null }
/** Read-only projection of explicit, published relations. Never infer morphology. */
export function studyComposition(detail:PublishedDetail|null,front:string):StudyComposition|null {
  if(!detail||detail.entry.status!=='published'||detail.entry.kind!=='word'||detail.entry.headword.trim().toLocaleLowerCase()!==front.trim().toLocaleLowerCase())return null;
  const scoped=(sense:string|null)=>sense===null||(detail.senses.length===1&&detail.senses[0].id===sense);
  const segments=detail.entry.word_segments;
  if(segments&&validateWordSegments(segments,detail.entry.headword,'word',detail.relations))return null;
  // A linked target's headword (ab-) is not the display spelling (ab). Never infer it.
  let offset=0;
  const parts=segments?.map(s=>{const name=front.trim().slice(offset,offset+s.text.length);offset+=s.text.length;return {name,meaning:s.hint};})??[{name:front,meaning:''}];
  const stored=detail.learning_notes.find(note=>note.kind==='core_concept'&&scoped(note.sense_id)&&note.body.trim())?.body.trim();
  const concept=stored??null;
  return {parts,concept};
}
