const {test}=require('node:test');
const assert=require('node:assert/strict');
const {build}=require('esbuild');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {indexedDB,IDBKeyRange}=require('fake-indexeddb');

test('published dictionary cache: offline replay, bounded count, no private records',async t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'nexus-dictionary-offline-'));
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const entry=path.join(dir,'reader.cjs');
  await build({entryPoints:['src/features/dictionary/reader.ts'],outfile:entry,bundle:true,platform:'node',format:'cjs'});
  const previous={indexedDB:global.indexedDB,IDBKeyRange:global.IDBKeyRange,navigator:global.navigator};
  Object.assign(global,{indexedDB,IDBKeyRange});
  Object.defineProperty(global,'navigator',{configurable:true,value:{onLine:true}});
  t.after(()=>{for(const [key,value] of Object.entries(previous)){if(value===undefined)delete global[key];else Object.defineProperty(global,key,{configurable:true,value});}});
  const {searchDictionary,readPublishedEntry}=require(entry);
  const id='11111111-1111-4111-8111-111111111111';
  const detail={entry:{id,kind:'word',headword:'example'},senses:[],relations:[],etymologies:[],learning_notes:[],related:[]};
  const client={rpc:async(name)=>({data:name==='get_published_dictionary_entry'?detail:{items:[{id,headword:'example',kind:'word'}],has_more:false,page:0,total:1},error:null})};
  assert.deepEqual((await searchDictionary(client,'all','example')).items[0].id,id);
  assert.equal((await readPublishedEntry(client,id)).entry.headword,'example');
  // Cache writes are deliberately non-blocking. Allow IDB transactions to finish.
  await new Promise(resolve=>setTimeout(resolve,35));
  Object.defineProperty(global,'navigator',{configurable:true,value:{onLine:false}});
  const unavailable={rpc:()=>{throw new Error('network must not be used offline');}};
  assert.equal((await readPublishedEntry(unavailable,id)).entry.headword,'example');
  assert.equal((await searchDictionary(unavailable,'all','example')).items.length,1);
  await assert.rejects(()=>readPublishedEntry(unavailable,'22222222-2222-4222-8222-222222222222'),/尚未離線保存/);
});
