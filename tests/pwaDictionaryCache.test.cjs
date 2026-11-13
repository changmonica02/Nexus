require('./loadStudy.cjs');
const {test,beforeEach,afterEach}=require('node:test');
const assert=require('node:assert/strict');
const {IDBFactory,IDBObjectStore}=require('fake-indexeddb');
const cache=require('../src/features/dictionary/publicCache.ts');
const reader=require('../src/features/dictionary/reader.ts');
const id='11111111-1111-4111-8111-111111111111', other='22222222-2222-4222-8222-222222222222';
const detail=headword=>({entry:{id,kind:'word',headword,status:'published'},senses:[],relations:[],etymologies:[],learning_notes:[],related:[]});
const page=(items=[])=>({items,has_more:false,page:0,total:items.length});
let previous;
beforeEach(()=>{previous={idb:global.indexedDB,navigator:Object.getOwnPropertyDescriptor(global,'navigator')};global.indexedDB=new IDBFactory();online(true);});
afterEach(()=>{if(previous.idb===undefined)delete global.indexedDB;else global.indexedDB=previous.idb;if(previous.navigator)Object.defineProperty(global,'navigator',previous.navigator);else delete global.navigator;});
function online(value){Object.defineProperty(global,'navigator',{configurable:true,value:{onLine:value}});}
const never={rpc:()=>{assert.fail('offline must not call RPC');}};
async function database(task){const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('nexus-public-dictionary',1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});try{return await new Promise((resolve,reject)=>{const tx=db.transaction('responses','readwrite');let result;task(tx.objectStore('responses'),v=>{result=v;});tx.oncomplete=()=>resolve(result);tx.onabort=()=>reject(tx.error);});}finally{db.close();}}
async function rows(){return database((s,result)=>{s.getAll().onsuccess=e=>result(e.target.result);});}

test('successful public reads are committed before returning; exact query/page/kind and inflection replay',async()=>{
 const calls=[];const client={rpc:async(name,args)=>{calls.push({name,args});return {data:name==='get_published_dictionary_entry'?detail('example'):page([{id,headword:'example',kind:'word'}]),error:null};}};
 await reader.readPublishedEntry(client,id);await reader.searchDictionary(client,'all','example');await reader.searchDictionaryWithInflections(client,'word','examples',1);
 online(false);
 assert.equal((await reader.readPublishedEntry(never,id)).entry.headword,'example');
 assert.equal((await reader.searchDictionary(never,'all','example')).items.length,1);
 assert.equal((await reader.searchDictionaryWithInflections(never,'word','examples',1)).items.length,1);
 for(const request of [()=>reader.readPublishedEntry(never,other),()=>reader.searchDictionary(never,'all','unread'),()=>reader.searchDictionary(never,'word','example'),()=>reader.searchDictionaryWithInflections(never,'word','examples',0)])await assert.rejects(request,/尚未離線保存.*連線/);
 assert.equal(calls.length,3);assert.equal((await rows()).length,3);
});
test('capacity is 100 responses, evicts oldest, cleans expired on write, keeps workspace DB untouched',async()=>{
 await cache.savePublicCache('init',{});
 const now=Date.now();await database(s=>{s.clear();for(let i=0;i<100;i++)s.put({key:'row'+i,data:{i},savedAt:now-1000+i});s.put({key:'expired',data:{},savedAt:now-31*86400000});});
 await cache.savePublicCache('latest',{current:true});const all=await rows();assert.equal(all.length,100);assert.ok(!all.some(r=>r.key==='row0'||r.key==='expired'));assert.ok(all.some(r=>r.key==='latest'));
 assert.deepEqual((await indexedDB.databases()).map(d=>d.name),['nexus-public-dictionary']);
});
test('30 day TTL is based on acquisition, not offline reads; exact expiry boundary is unavailable',async()=>{
 await cache.savePublicCache('old',{value:1});await database(s=>s.put({key:'old',data:{value:1},savedAt:Date.now()-30*86400000}));assert.equal(await cache.readPublicCache('old'),undefined);
 await cache.savePublicCache('fresh',{value:2});const before=(await rows()).find(r=>r.key==='fresh').savedAt;assert.deepEqual(await cache.readPublicCache('fresh'),{value:2});assert.equal((await rows()).find(r=>r.key==='fresh').savedAt,before);
});
for(const unavailable of ['withdrawn','deleted'])test('observed '+unavailable+' removes detail and dependent search/related caches',async()=>{
 const client={rpc:async()=>({data:detail('old'),error:null})};await reader.readPublishedEntry(client,id);await cache.savePublicCache('list',page([{id,headword:'old'}]));await cache.savePublicCache('related',{entry:{id:other},related:[{id,headword:'old'}]});await cache.savePublicCache('unrelated',page([{id:other}]));
 assert.equal(await reader.readPublishedEntry({rpc:async()=>({data:null,error:null})},id),null);
 online(false);await assert.rejects(()=>reader.readPublishedEntry(never,id),/尚未離線保存/);assert.equal(await cache.readPublicCache('list'),undefined);assert.equal(await cache.readPublicCache('related'),undefined);assert.ok(await cache.readPublicCache('unrelated'));
});
test('online changes refresh detail and discard stale dependent search; online errors never fall back',async()=>{
 let value=detail('old');const client={rpc:async()=>({data:value,error:null})};await reader.readPublishedEntry(client,id);await cache.savePublicCache('list',page([{id,headword:'old'}]));value=detail('new');await reader.readPublishedEntry(client,id);assert.equal(await cache.readPublicCache('list'),undefined);
 await assert.rejects(()=>reader.readPublishedEntry({rpc:async()=>({data:null,error:{message:'permission denied'}})},id),/無法讀取/);
 online(false);assert.equal((await reader.readPublishedEntry(never,id)).entry.headword,'new');
});
test('refresh of cached search replaces old results, including empty results',async()=>{
 const client=value=>({rpc:async()=>({data:value,error:null})});await reader.searchDictionary(client(page([{id}])),'all','example');await reader.searchDictionary(client(page()),'all','example');online(false);assert.equal((await reader.searchDictionary(never,'all','example')).items.length,0);
});
test('quota/serialization errors and abort after put success never hang or break online reading',{timeout:3000},async()=>{
 const original=IDBObjectStore.prototype.put;
 try{
  IDBObjectStore.prototype.put=function(){throw new DOMException('quota exhausted','QuotaExceededError');};
  assert.equal((await reader.readPublishedEntry({rpc:async()=>({data:detail('online'),error:null})},id)).entry.headword,'online');
  IDBObjectStore.prototype.put=function(...args){const r=original.apply(this,args);r.onsuccess=()=>this.transaction.abort();return r;};
  await cache.savePublicCache('aborted',{value:1});assert.equal(await cache.readPublicCache('aborted'),undefined);
 }finally{IDBObjectStore.prototype.put=original;}
 await cache.savePublicCache('uncloneable',{fn:()=>{}});assert.equal(await cache.readPublicCache('uncloneable'),undefined);
});
test('disabled IndexedDB stays optional online and gives a clear offline miss',async()=>{
 global.indexedDB={open(){throw new DOMException('disabled','SecurityError');}};assert.equal((await reader.readPublishedEntry({rpc:async()=>({data:detail('online'),error:null})},id)).entry.headword,'online');online(false);await assert.rejects(()=>reader.readPublishedEntry(never,id),/尚未離線保存/);
});
test('uncached categories/relations give connection hints without remote requests; direct neighbours skip offline',async()=>{
 const {searchRelations}=require('../src/features/dictionary/browseRelations.ts');
 const {readerNeighbours}=require('../src/features/dictionary/readerNavigation.ts');
 online(false);const client={rpc:never.rpc,from:()=>assert.fail('no table queries offline')};
 for(const task of [()=>searchRelations(client,'word','',0,{component:id})])await assert.rejects(task,/請連線後閱讀/);
 assert.deepEqual(await readerNeighbours(client,id,'example',null),{previous:null,next:null});
});
