require('./loadStudy.cjs');
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.tsx']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true,jsx:ts.JsxEmit.ReactJSX}}).outputText,filename);
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const {parseVariants,serializeVariants,VariantEditor}=require('../src/features/dictionary/variants.tsx');
const {dictionaryReturn,browseHref,entryHref,searchRelations,resolveVariant}=require('../src/features/dictionary/browseRelations.ts');
test('variants preserve legacy text verbatim, unknown JSON and structured conditions without schema changes',()=>{
 for(const text of [' cap/cept/cip ','{"future":true}','[broken'])assert.deepEqual(parseVariants(text),[{variant:text,condition:''}]);
 const rows=[{variant:'cept',condition:'接續特定形式'},{variant:'cip',condition:''}];
 assert.deepEqual(parseVariants(serializeVariants(rows)),rows);assert.equal(serializeVariants([]),null);
 assert.deepEqual(parseVariants(null),[]);
});
test('variant editor has two placeholder inputs per row and immutable add/edit/delete callbacks',()=>{
 let value=serializeVariants([{variant:'cap',condition:'before x'}]);const render=()=>VariantEditor({value,onChange:v=>value=v});
 let tree=render(),row=tree.props.children[1][0];row.props.children[0].props.onChange({target:{value:'cept'}});
 assert.equal(parseVariants(value)[0].variant,'cept');assert.equal(parseVariants(value)[0].condition,'before x');
 tree=render();tree.props.children[2].props.onClick();assert.equal(parseVariants(value).length,2);
 tree=render();tree.props.children[1][0].props.children[2].props.onClick();assert.deepEqual(parseVariants(value),[{variant:'',condition:''}]);
 const html=renderToStaticMarkup(React.createElement(VariantEditor,{value,onChange:()=>{}}));
 assert.match(html,/placeholder="變體"/);assert.match(html,/placeholder="出現條件"/);assert.ok(!html.includes('<label'));assert.match(html,/minmax\(0,2fr\)/);
});
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
test('variant discovery uses existing grouping and exact published same-kind candidates, never creates entries',async()=>{
 const db=client([]);await searchRelations(db,'root','',0,{variant:'cept'});
 assert.ok(db.calls.some(c=>c[0]==='ilike'&&c[1]==='grouping.variant_group'));
 const matches=client([{id:'one',kind:'root',headword:'cept'},{id:'two',kind:'root',headword:'cept'}]);assert.equal((await resolveVariant(matches,'root','cept')).length,2);
 assert.ok(matches.calls.some(c=>c[0]==='ilike'&&c[2]==='cept'));assert.ok(matches.calls.some(c=>c[0]==='eq'&&c[1]==='status'&&c[2]==='published'));
 await assert.rejects(resolveVariant(client(null,{message:'offline'}),'root','cap'),/無法讀取/);
});
