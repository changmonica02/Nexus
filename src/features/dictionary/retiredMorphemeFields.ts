/** Known retired exchange fields are ignored at the JSON boundary, never converted. */
const retired=new Set(['grouping','group_data','sense_groups','primary_category','variant_group']);
export function currentMorphemeFields<T>(value:T):T {
 if(Array.isArray(value))return value.map(currentMorphemeFields) as T;
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([key])=>!retired.has(key)&&!(key==='category'&&'gloss_zh_tw'in value)).map(([key,row])=>[key,currentMorphemeFields(row)])) as T;
 return value;
}
