import type {PublishedDetail} from './reader';
import {studyComposition} from './studyComposition';

export type BackExample={id:string;english:string;chinese:string|null};
export type BackDerivation={id:string;meaning:string;examples:BackExample[]};
export type BackSense={id:string;partOfSpeech:string|null;meaning:string;derivations:BackDerivation[];examples:BackExample[]};
export type BackDictionaryContent={
  segments:{name:string;meaning:string}[];
  mnemonic:string[];
  senses:BackSense[];
  etymologies:{id:string;body:string;source:string|null}[];
  notes:{id:string;body:string}[];
};
/** Published-only, read-only projection. Never changes private Card or FSRS state. */
export function studyDictionaryBack(detail:PublishedDetail|null,front:string):BackDictionaryContent|null{
  if(!detail||detail.entry.kind!=='word'||detail.entry.status!=='published')return null;
  if(detail.entry.headword.trim().toLocaleLowerCase()!==front.trim().toLocaleLowerCase())return null;
  const composition=studyComposition(detail,front);
  const known=new Set(detail.senses.map(x=>x.id));
  const examples=(detail.examples??[]).filter(x=>x.sense_id!==null&&known.has(x.sense_id))
    .sort((a,b)=>a.sort_order-b.sort_order||a.id.localeCompare(b.id));
  const normalized=(x:typeof examples[number]):BackExample=>({id:x.id,english:x.body,chinese:x.translation_zh_tw?.trim()||null});
  const senses=[...detail.senses].sort((a,b)=>a.id.localeCompare(b.id)).map(sense=>{
    const owned=examples.filter(e=>e.sense_id===sense.id);
    const derivations=(detail.derivations??[]).filter(d=>d.sense_id===sense.id)
      .sort((a,b)=>a.sort_order-b.sort_order||a.id.localeCompare(b.id))
      .map(d=>({id:d.id,meaning:d.gloss_zh_tw,examples:owned.filter(e=>e.derivation_id===d.id).map(normalized)}));
    const listed=new Set(derivations.map(d=>d.id));
    return {id:sense.id,partOfSpeech:sense.part_of_speech??null,meaning:sense.gloss_zh_tw,
      derivations,examples:owned.filter(e=>!e.derivation_id||!listed.has(e.derivation_id)).map(normalized)};
  });
  const mnemonic=detail.learning_notes.filter(n=>n.kind==='core_concept'&&n.body.trim())
    .map(n=>n.body.trim());
  const uniqueMnemonic=[...new Set(mnemonic)];
  return {
    segments:composition?.parts.filter(part=>part.name.trim()||part.meaning.trim())??[],
    mnemonic:uniqueMnemonic,
    senses,
    etymologies:detail.etymologies.filter(n=>n.body.trim()).map(n=>({id:n.id,body:n.body,source:n.data_source??null})),
    notes:(detail.public_notes??[]).filter(n=>n.body.trim()).map(n=>({id:n.id,body:n.body})),
  };
}
