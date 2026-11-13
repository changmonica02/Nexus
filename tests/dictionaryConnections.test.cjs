require('./loadStudy.cjs');
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.tsx']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true,jsx:ts.JsxEmit.ReactJSX}}).outputText,filename);
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const {dictionaryReturn,browseHref,entryHref,searchRelations}=require('../src/features/dictionary/browseRelations.ts');
test('explicit dictionary return URLs preserve filters, page, sense and source chain; reject external navigation',()=>{
 const id='00000000-0000-4000-8000-000000000001';
 const list=browseHref('word',{component:id,sense:id},`/dictionary/${id}`)+'&q=test&page=2';
 const entry=entryHref(id,list,id),back=new URL(entry,'https://nexus.invalid').searchParams.get('from');
 assert.equal(dictionaryReturn(back),list);assert.equal(dictionaryReturn('//evil.example'),'/dictionary');assert.equal(dictionaryReturn('/dictionary/admin'),'/dictionary');
 assert.equal(dictionaryReturn(null,'/study'),'/study');assert.ok(entry.endsWith(`#sense-${id}`));
});
function client(rows,error=null){const calls=[];const chain={};for(const method of ['select','eq','ilike','order','range','limit'])chain[method]=(...args)=>{calls.push([method,...args]);return chain;};chain.then=(resolve)=>Promise.resolve({data:rows,error}).then(resolve);return {calls,from:table=>{calls.push(['from',table]);return chain;}};}
test('reverse component query keeps specific sense, published status, stable pagination and deduplicated entry projection',async()=>{
 const rows=Array.from({length:21},(_,i)=>({id:String(i),kind:'word',headword:'word'+i,senses:[{}]})),db=client(rows);
 const result=await searchRelations(db,'word','%_',2,{component:'prefix-id',sense:'sense-id'});
 assert.equal(result.items.length,20);assert.equal(result.has_more,true);assert.deepEqual(Object.keys(result.items[0]),['id','kind','headword']);
 assert.ok(db.calls.some(c=>c[0]==='select'&&c[1].includes('dictionary_relations_source_entry_fkey!inner')));
 for(const call of [['eq','status','published'],['eq','relations.target_entry_id','prefix-id'],['eq','relations.target_sense_id','sense-id'],['range',40,60],['ilike','headword','%\\%\\_%']])assert.ok(db.calls.some(c=>JSON.stringify(c)===JSON.stringify(call)),JSON.stringify(call));
 await assert.rejects(searchRelations(client(null,{message:'offline'}),'word','',0,{component:'x'}),/無法讀取/);
});
test('variant deep links use the current catalog search without a legacy table request',async()=>{
 const {loadBrowsePage}=require('../src/features/dictionary/readerNavigation.ts');const calls=[];
 await loadBrowsePage({rpc:async(name,args)=>{calls.push({name,args});return {data:{items:[],page:args.page_number,has_more:false,total:0}};}},'/dictionary?kind=root&variant=cept&page=2');
 assert.equal(calls[0].name,'search_dictionary_catalog');assert.equal(calls[0].args.query_text,'cept');assert.equal(calls[0].args.page_number,2);
});
