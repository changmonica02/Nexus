// Isolated UI data only. No Supabase project, secret, JWT or production network access.
import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Pagination} from '../../src/components/pagination/Pagination';
import {usePagedList} from '../../src/components/pagination/usePagedList';
import {DictionaryWorkspace} from '../../src/features/dictionary/DictionaryAdmin';
import DictionaryBrowser from '../../src/features/dictionary/DictionaryBrowser';
import {RelationSelectionDialog} from '../../src/features/dictionary/RelationTargetPicker';
import DictionaryLinkPicker from '../../src/features/dictionary/DictionaryLinkPicker';
import CardDictionaryPanel from '../../src/features/dictionary/CardDictionaryPanel';
import StudyLinkSuggestions from '../../src/features/dictionary/StudyLinkSuggestions';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const entries=Array.from({length:245},(_,i)=>({id:id(i+100),headword:'item'+String(i).padStart(3,'0'),kind:'word',status:'published',revision:1,published_at:'fixture'}));
const detail=e=>({entry:e,senses:[{id:id(Number(e.id.slice(-12))+1000),entry_id:e.id,part_of_speech:e.kind==='word'?'noun':null,gloss_zh_tw:'中文'+e.headword}],relations:[],related:[],etymologies:[],learning_notes:[],inflections:[]});
const cards=Array.from({length:25},(_,i)=>({id:'card'+i,front:'item'+String(i).padStart(3,'0'),back:'中文',official_pack_id:null}));
window.calls=[];window.failPage=null;window.failNext=false;
window.dictionaryClient={
 auth:{onAuthStateChange(cb){queueMicrotask(()=>cb('SIGNED_IN',{user:{id:id(1)}}));return {data:{subscription:{unsubscribe(){}}}}},getUser:async()=>({data:{user:{id:id(1)}}})},
 from(table){let rows=table==='dictionary_entries'?entries:[],count=false,range=[0,19];const q={select(_s,opts){count=!!opts?.count;return q;},eq(k,v){rows=rows.filter(r=>r[k]===v);return q;},in(k,v){rows=rows.filter(r=>v.includes(r[k]));return q;},ilike(k,v){rows=rows.filter(r=>r[k]?.includes(v.replaceAll('%','')));return q;},order(){return q;},range(a,b){range=[a,b];return q;},maybeSingle(){return Promise.resolve({data:null});},then(resolve,reject){const page=Math.floor(range[0]/100);window.calls.push({table,page,range});return new Promise((done,fail)=>setTimeout(()=>{if(window.failPage===page){fail(Error('fixture network failure'));return;}done({data:rows.slice(range[0],range[1]+1),count:count?rows.length:null});},40)).then(resolve,reject);}};return q;},
 async rpc(name,args={}){
 if(name==='is_dictionary_admin')return {data:true};
 if(name==='get_published_dictionary_entry'||name==='get_dictionary_entry'){const e=entries.find(e=>e.id===args.entry_uuid);return {data:e?detail(e):null};}
 if(name.startsWith('search_')){const page=args.page_number??0;window.calls.push({name,...args});const selected=entries.filter(e=>e.headword.includes(args.query_text??''));const items=selected.slice(page*20,page*20+20).map(e=>name==='search_dictionary_relation_targets'?{...e,senses:detail(e).senses}:name==='search_prefix_dictionary'?{...e,kind:'prefix',sense_id:detail(e).senses[0].id,gloss_zh_tw:'義項'}:e);return {data:{items,page,total:selected.length,has_more:(page+1)*20<selected.length}};}
 return {error:{message:'Unexpected fixture RPC '+name}};
 }
};
function Demo(){const [page,setPage]=useState(0),[query,setQuery]=useState('all'),[sort,setSort]=useState('ascending');
 const result=usePagedList(JSON.stringify([query,sort]),page,20,async p=>{window.calls.push({query,sort,page:p});await new Promise(r=>setTimeout(r,p===1?350:p===2?30:40));if(window.failNext){window.failNext=false;throw Error('載入失敗（測試）');}const total=query==='empty'?0:query==='short'?21:640;return {items:['row '+p],page:p,total};},setPage);
 return <section><label>篩選<select value={query} onChange={e=>{setQuery(e.target.value);setPage(0);}}><option>all</option><option>short</option><option>empty</option></select></label><label>排序<select value={sort} onChange={e=>setSort(e.target.value)}><option>ascending</option><option>descending</option></select></label><button onClick={()=>setQuery('short')}>縮減資料</button><div data-testid="rows">{result.data?.items.join()}</div>{result.loading&&<p role="status">讀取中</p>}{result.error&&<p role="alert">{result.error}<button onClick={result.retry}>重試</button></p>}<Pagination page={result.data?.page??0} total={result.data?.total} pageSize={20} loading={result.loading} disabled={!result.data} onPageChange={setPage}/></section>;
}
const mode=new URLSearchParams(location.search).get('fixture');
createRoot(document.getElementById('root')).render(<main className="mx-auto max-w-4xl space-y-3 p-4">{mode==='admin'?<DictionaryWorkspace/>:mode==='reader'||mode==='groups'?<DictionaryBrowser path={[]}/>:mode==='relations'?<RelationSelectionDialog onClose={()=>{}} onSelect={()=>{}}/>:mode==='links'?<DictionaryLinkPicker front="item" back="中文" onChange={()=>{}}/>:mode==='card'?<CardDictionaryPanel cardId="private-card" front="item"/>:mode==='suggestions'?<StudyLinkSuggestions cards={cards} onClose={()=>{}} onEdit={()=>{}} onLink={async()=>{}}/>:<Demo/>}</main>);
