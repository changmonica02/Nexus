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
  return <div className="min-w-0 space-y-1"><div className="flex items-center justify-between gap-2"><h4 className="text-sm">同字變體</h4><button type="button" aria-label="新增同字變體" className="min-h-11 px-2 text-sm hover:bg-zinc-500/10" onClick={()=>onChange(serializeVariants([...rows,{variant:'',condition:''}]))}>＋新增變體</button></div>{rows.map((row,i)=><div key={i} className="grid min-w-0 grid-cols-[minmax(0,1fr)_44px] items-start gap-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)_44px]">
    <input className={input} placeholder="變體" aria-label={`變體 ${i+1}`} value={row.variant} onChange={e=>onChange(serializeVariants(rows.map((r,n)=>n===i?{...r,variant:e.target.value}:r)))}/>
    <input className={input+" col-start-1 sm:col-start-auto"} placeholder="出現條件" aria-label={`出現條件 ${i+1}`} value={row.condition} onChange={e=>onChange(serializeVariants(rows.map((r,n)=>n===i?{...r,condition:e.target.value}:r)))}/>
    <button className="col-start-2 row-start-1 min-h-11 sm:col-start-auto sm:row-start-auto" type="button" aria-label={`刪除變體 ${i+1}`} onClick={()=>onChange(serializeVariants(rows.filter((_,n)=>n!==i)))}>×</button>
  </div>)}</div>;
}
