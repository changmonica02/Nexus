import type {DictionarySense} from './dictionary';
export const inflectionLabels={past:'過去式',past_participle:'過去分詞',present_participle:'現在分詞',third_person_singular:'第三人稱單數',plural:'複數',comparative:'比較級',superlative:'最高級'};
export type InflectionKind=keyof typeof inflectionLabels;
export function inflectionKinds(pos:string|null|undefined):InflectionKind[]{
 const value=(pos??'').toLowerCase().trim();
 if(/^(v\.?|verb|動詞)$/.test(value))return ['past','past_participle','present_participle','third_person_singular'];
 if(/^(n\.?|noun|名詞)$/.test(value))return ['plural'];
 if(/^(adj\.?|adjective|形容詞|adv\.?|adverb|副詞)$/.test(value))return ['comparative','superlative'];
 return [];
}
export function availableInflections(senses:Pick<DictionarySense,'id'|'part_of_speech'>[],senseId:string|null){return [...new Set(senses.filter(s=>!senseId||s.id===senseId).flatMap(s=>inflectionKinds(s.part_of_speech)))];}
export function inflectionIdentity(r:Record<string,unknown>){return JSON.stringify([r.sense_id??null,r.form_kind,String(r.form??'').trim().toLowerCase()]);}
