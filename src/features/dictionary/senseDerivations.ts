/** B2 Sense extensions: explicit identity and ownership, never infer from spelling. */
export type DerivationRow = {
  id:string;entry_id:string;sense_id:string;gloss_zh_tw:string;
  sort_order:number;revision?:number
};
export type BilingualExampleRow = {
  id:string;entry_id:string;sense_id:string|null;body:string;
  translation_zh_tw?:string|null;derivation_id?:string|null
};
export type SenseReference = {id:string};
export function validateSenseExtensions(
  senses:SenseReference[], derivations:DerivationRow[], examples:BilingualExampleRow[],
):string[]{
  const issues:string[]=[];
  const known=new Set(senses.map(x=>x.id));
  const identities=new Set<string>();
  for(const d of derivations){
    if(!known.has(d.sense_id))issues.push('衍生意思的所屬義項不存在');
    if(!d.gloss_zh_tw?.trim())issues.push('衍生意思不可空白');
    if(!Number.isSafeInteger(d.sort_order)||d.sort_order<0)issues.push('衍生意思排序無效');
    if(identities.has(d.id))issues.push('衍生意思 ID 重複');
    identities.add(d.id);
  }
  for(const example of examples){
    if(example.translation_zh_tw!=null&&typeof example.translation_zh_tw!=='string')issues.push('中文翻譯必須是文字');
    if(example.derivation_id==null||example.derivation_id==='')continue;
    const target=derivations.find(d=>d.id===example.derivation_id);
    if(!target||target.entry_id!==example.entry_id||target.sense_id!==example.sense_id){
      issues.push('例句的衍生意思必須屬於同一個單字與義項');
    }
  }
  return issues;
}
export function removeDerivationSafely<T extends DerivationRow>(
  derivations:T[], examples:BilingualExampleRow[], id:string,
):T[]{
  if(examples.some(example=>example.derivation_id===id)){
    throw new Error('此衍生意思已有例句，請先解除或重新指定例句關聯。');
  }
  return derivations.filter(item=>item.id!==id);
}
