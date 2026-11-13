"use client";
import Link from './DictionaryReadLink';
import {browseHref} from './browseRelations';
import type {PublishedDetail} from './reader';
const chip='inline-block rounded border border-[var(--color-border)] px-3 py-1 text-sm';
export function DictionaryConnections({data,from}:{data:PublishedDetail;from:string}){
 if(data.entry.kind==='word')return null;
 return <section className="space-y-3" aria-label="關聯瀏覽">
  <Link className={chip} href={browseHref('word',{component:data.entry.id},from)}>相關單字</Link>
  {data.senses.length>1&&data.senses.map((sense,index)=><Link key={sense.id} className={`${chip} ml-2`} href={browseHref('word',{component:data.entry.id,sense:sense.id},from)}>義項 {index+1} 相關單字</Link>)}
 </section>;
}
