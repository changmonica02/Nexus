import type {DictionaryGrouping} from './grouping';
export interface Variant {variant:string;condition:string}
const format='nexus-variants-v1';
/** Unknown/legacy strings remain a single verbatim row; never infer relationships from spelling. */
export function parseVariants(value:string|null):Variant[]{
  if(value===null)return [];
  try {const parsed=JSON.parse(value);if(parsed.format===format&&Array.isArray(parsed.rows)&&parsed.rows.every((r:Variant)=>typeof r.variant==='string'&&typeof r.condition==='string'))return parsed.rows;}catch{}
  return [{variant:value,condition:''}];
}
export function serializeVariants(rows:Variant[]):string|null {return rows.length?JSON.stringify({format,rows}):null;}
export function VariantEditor({value,onChange}:{value:DictionaryGrouping['variant_group'];onChange:(value:string|null)=>void}){
  const rows=parseVariants(value);
  const input='min-w-0 w-full rounded border border-[var(--color-border)] bg-[var(--color-editor-bg)] p-2 text-sm';
  return <div className="min-w-0 space-y-2"><h4 className="text-sm">同字變體</h4>{rows.map((row,i)=><div key={i} className="grid min-w-0 grid-cols-[minmax(0,2fr)_minmax(0,3fr)_auto] gap-2">
    <input className={input} placeholder="變體" aria-label={`變體 ${i+1}`} value={row.variant} onChange={e=>onChange(serializeVariants(rows.map((r,n)=>n===i?{...r,variant:e.target.value}:r)))}/>
    <input className={input} placeholder="出現條件" aria-label={`出現條件 ${i+1}`} value={row.condition} onChange={e=>onChange(serializeVariants(rows.map((r,n)=>n===i?{...r,condition:e.target.value}:r)))}/>
    <button type="button" aria-label={`刪除變體 ${i+1}`} onClick={()=>onChange(serializeVariants(rows.filter((_,n)=>n!==i)))}>×</button>
  </div>)}<button type="button" aria-label="新增同字變體" className="rounded border px-3 py-1" onClick={()=>onChange(serializeVariants([...rows,{variant:'',condition:''}]))}>＋</button></div>;
}
