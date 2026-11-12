import {validSemanticCategory,type SemanticDomainCode,type SemanticSubdomainCode} from './semanticDomains';
export type MorphemeSubtype='prefix'|'root'|'suffix';
export interface MorphemeVariant {id:string;form:string;condition:string}
export interface MorphemeSenseFields {
  semantic_domain?:SemanticDomainCode|null;
  semantic_subdomain?:SemanticSubdomainCode|null;
  /** null/missing: legacy or not yet assigned; []: explicitly no variants. */
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
export type LegacyVariantPlan={status:'none'|'current'|'manual';reason?:string}|{status:'ready';sense_id:string;rows:{form:string;condition:string}[]};
/** Inspect only: no IDs are allocated, no spelling matches are inferred, no source is changed. */
export function inspectLegacyVariants(senses:readonly ({id:string}&MorphemeSenseFields)[],raw:string|null|undefined):LegacyVariantPlan {
  if(senses.some(sense=>sense.variants!==undefined&&sense.variants!==null))return {status:'current'};
  if(raw==null)return {status:'none'};
  let value:unknown;try{value=JSON.parse(raw);}catch{return {status:'manual',reason:'unstructured_legacy_variants'};}
  if(!value||typeof value!=='object'||Array.isArray(value))return {status:'manual',reason:'unstructured_legacy_variants'};
  const group=value as Record<string,unknown>;
  if(group.format!=='nexus-variants-v1'||!Array.isArray(group.rows)||Object.keys(group).some(key=>!['format','rows'].includes(key)))return {status:'manual',reason:'unstructured_legacy_variants'};
  const rows:{form:string;condition:string}[]=[];
  for(const source of group.rows){
    if(!source||typeof source!=='object'||Array.isArray(source))return {status:'manual',reason:'invalid_legacy_variants'};
    const row=source as Record<string,unknown>;
    if(Object.keys(row).some(key=>!['variant','condition'].includes(key))||typeof row.variant!=='string'||!row.variant.trim()||typeof row.condition!=='string')return {status:'manual',reason:'invalid_legacy_variants'};
    rows.push({form:row.variant,condition:row.condition});
  }
  if(!rows.length)return {status:'none'};
  if(senses.length!==1)return {status:'manual',reason:'ambiguous_sense'};
  if(!uuid.test(senses[0].id))return {status:'manual',reason:'missing_stable_sense_id'};
  return {status:'ready',sense_id:senses[0].id,rows};
}
