import {validSemanticCategory,type SemanticDomainCode,type SemanticSubdomainCode} from './semanticDomains';
export type MorphemeSubtype='prefix'|'root'|'suffix';
export interface MorphemeVariant {id:string;form:string;condition:string}
export interface MorphemeSenseFields {
  semantic_domain?:SemanticDomainCode|null;
  semantic_subdomain?:SemanticSubdomainCode|null;
  /** null/missing: no variants supplied; []: explicitly no variants. No legacy fallback. */
  variants?:MorphemeVariant[]|null;
}
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function validateMorphemeSenseFields(row:Record<string,unknown>):string|null {
  if(!validSemanticCategory(row.semantic_domain,row.semantic_subdomain))return 'morpheme.invalidCategory';
  if(row.variants==null)return null;
  if(!Array.isArray(row.variants))return 'morpheme.invalidVariants';
  const ids=new Set<string>();
  for(const value of row.variants){
    if(!value||typeof value!=='object'||Array.isArray(value))return 'morpheme.invalidVariants';
    const variant=value as Record<string,unknown>;
    if(Object.keys(variant).some(key=>!['id','form','condition'].includes(key))||typeof variant.id!=='string'||!uuid.test(variant.id)||ids.has(variant.id.toLowerCase())||typeof variant.form!=='string'||!variant.form.trim()||typeof variant.condition!=='string')return 'morpheme.invalidVariants';
    ids.add(variant.id.toLowerCase());
  }
  return null;
}
/** Only additive null fields are comparison aliases; real values and [] remain content. */
export function normalizeMorphemeSense<T extends Record<string,unknown>>(row:T):T {
  const result={...row};for(const key of ['semantic_domain','semantic_subdomain','variants'])if(result[key]==null)delete result[key];return result;
}
export function removeMorphemeVariant(rows:readonly MorphemeVariant[],id:string):MorphemeVariant[] {
  if(!rows.some(row=>row.id===id))throw Error('morpheme.variantChanged');
  return rows.filter(row=>row.id!==id);
}
